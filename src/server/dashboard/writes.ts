// What the page makes the engine write, always as the player's: their settings and saves, the packages and the library, rpg-engine itself, the campaign
// exported, a package's command (D-341, D-359, D-475, D-510); and what the Packages page reads of them.
import type { IncomingMessage, ServerResponse } from "node:http";
import { basename, join } from "node:path";
import { z } from "zod";
import { readAdventureZip } from "../../adventures/index.ts";
import { findCampaign, readSettings, readTextSetting, requireCampaign, settingNames } from "../../campaign/index.ts";
import { config, playerSettingNamed, playerSettings, setupSettingNamed } from "../../commands/config.ts";
import { adventureText, isInstalledPackage, packageCommand, YesRefused } from "../../commands/package.ts";
import { playerSaveNews, save } from "../../commands/save.ts";
import { installAdventure } from "../../commands/shared/adventures.ts";
import { libraryContents, libraryEntries, startLibraryReading, unquoted } from "../../commands/shared/library.ts";
import { campaignMode } from "../../commands/shared/mode.ts";
import { catalog } from "../../commands/shared/packages/catalog.ts";
import { packageCommands } from "../../commands/shared/packages/code.ts";
import { exportsFolderName, resetPoints } from "../../commands/shared/saves.ts";
import { campaignSystem, campaignWorld } from "../../commands/shared/world.ts";
import { type Context, packagesFolder } from "../../core/context.ts";
import { files, withFiles } from "../../core/store.ts";
import { comparableText } from "../../core/text.ts";
import { getVersion, isNewerVersion } from "../../core/version.ts";
import { extensionWords, findExtension } from "../../extensions/index.ts";
import { samePath } from "../../library/index.ts";
import { readableSystems } from "../../systems/index.ts";
import { mostSaid, readBody, readBytes, securityHeaders, send, sendJson } from "./files.ts";
import type { Served } from "./index.ts";

/** What the player does with a package on the page (D-475), or with the library (D-491 (13)). */
export type PackageAction = "add" | "update" | "remove" | "uninstall" | "library" | "engine";

/** Where a package's work on the page is: at work, or waiting for the player's yes in a window of their computer (D-478). */
export type PackagePhase = "working" | "yes";

// How long the catalog is kept before npm and GitHub are asked again.
const catalogLife = 10 * 60 * 1000;

// The version of rpg-engine this server runs, read as it starts: an update on disk comes only with a new chat (D-515 (3)).
const runningVersion = getVersion();

// The largest .zip the page sends for an adventure: far more than one holds, far less than the engine reads of a package.
const largestUpload = 100 * 1024 * 1024;

/**
 * Runs a command of a package the player may run from its page code (D-510, D-514): one the campaign's packages give with player, whose code runs; as the
 * player's, its output among what the master hears at their next call, quoted as another's words.
 */
export async function runForPlayer(request: IncomingMessage, response: ServerResponse, served: Served): Promise<void>
{
    const parsed = z.object({ command: z.string().trim().min(1).max(80), input: z.record(z.string(), z.unknown()).optional() }).strict().safeParse(await readBody(request));

    if (!parsed.success) {
        sendJson(response, 400, { error: "Send the command to run and its input: { command, input }." });
        return;
    }

    try {
        await served.session.ready();
        const context: Context = { ...served.context, actor: "player" };
        const { text, readOnly } = await withFiles(served.session, async () => {
            const root = requireCampaign(context.folder);
            const command = (await packageCommands(root, context, [])).commands.find((one) => one.name === parsed.data.command && one.forPlayer === true);

            if (command === undefined) {
                throw new Error(`No package of the campaign gives ${parsed.data.command} to the player: a page runs only the commands its package marks player.`);
            }

            const input = command.input.safeParse(parsed.data.input ?? {});

            if (!input.success) {
                throw new Error(`The input of ${command.name} is not valid: ${input.error.issues.map((issue) => `${issue.path.join(".") || "input"}: ${issue.message}`).join("; ")}.`);
            }

            return { text: command.format(await command.run(input.data, context)), readOnly: command.readOnly === true };
        });
        const quoted = text.split("\n").map((line) => `> ${line}`).join("\n");

        // A command that only reads tells the master nothing (D-514).
        if (readOnly) {
            sendJson(response, 200, { text });
            return;
        }

        served.events.push(`The player, on the dashboard, ran ${parsed.data.command}: it is already done, do not run it again. It said, as its package's words:\n${quoted}`);
        served.notify();
        sendJson(response, 200, { text });
    } catch (error) {
        sendJson(response, 400, { error: error instanceof Error ? error.message : String(error) });
    }
}

/**
 * One of the player's settings changed on the page (D-341): a value, or an item added to or taken off a list, as config takes it, with the player as who
 * changed it; the master hears of it at the head of their next call. A setting of the master's is refused.
 */
export async function changeSetting(request: IncomingMessage, response: ServerResponse, served: Served): Promise<void>
{
    const body = await readBody(request);
    const parsed = z.union([
        z.object({ setting: z.string(), value: z.string().trim().min(1).max(mostSaid) }).strict(),
        z.object({ setting: z.string(), add: z.string().trim().min(1).max(mostSaid) }).strict(),
        z.object({ setting: z.string(), remove: z.string().min(1).max(mostSaid) }).strict(),
    ]).safeParse(body);

    if (!parsed.success) {
        sendJson(response, 400, { error: "Send a setting of the player's with its value, { setting, value }, or an item to add to a list or take off it, { setting, add } or { setting, remove }." });
        return;
    }

    try {
        await served.session.ready();
        const change = parsed.data;
        const refused = withFiles(served.session, () => {
            const root = requireCampaign(served.context.folder);
            // In the setup, how companions come, the preparation and the name are the player's too (D-370).
            const setup = campaignMode(root, campaignWorld(root, served.context)) === "setup";

            // Where the page shows the extensions' widgets is the page's own: the master hears nothing of it (D-502).
            if (change.setting.trim() === "widgets" && !("add" in change)) {
                config.run(config.input.parse({ setting: "widgets", ...("value" in change ? { value: change.value } : { remove: [change.remove] }) }), { ...served.context, actor: "player" });
                return undefined;
            }

            const before = playerSettingNamed(root, served.context, change.setting) ?? (setup ? setupSettingNamed(root, change.setting) : undefined);

            if (before === undefined) {
                return (settingNames as string[]).includes(change.setting.trim())
                    ? { status: 403, error: `${change.setting} is the master's to change, in the chat.` }
                    : { status: 400, error: `There is no setting "${change.setting}": the player's are ${playerSettings(root, served.context).map((one) => one.name).join(", ")}.` };
            }

            const input = "value" in change ? { value: change.value } : "add" in change ? { add: [change.add] } : { remove: [change.remove] };
            config.run(config.input.parse({ setting: before.name, ...input }), { ...served.context, actor: "player" });

            if (!served.changed.has(before.name)) {
                served.changed.set(before.name, before);
            }

            return undefined;
        });

        if (refused === undefined) {
            sendJson(response, 202, {});
        } else {
            sendJson(response, refused.status, { error: refused.error });
        }
    } catch (error) {
        sendJson(response, 400, { error: error instanceof Error ? error.message : String(error) });
    }
}

/**
 * A save the player makes on the page, one they go back to, or the campaign started over from its first, as save does, with the player as who did it; the
 * mode of saves allows it or refuses it as in the chat, and starting over needs the campaign's name written. The master hears of it at their next call (D-359).
 */
export async function changeSaves(request: IncomingMessage, response: ServerResponse, served: Served): Promise<void>
{
    const parsed = z.union([
        z.object({ action: z.literal("make"), label: z.string().trim().max(80).optional() }).strict(),
        z.object({ action: z.literal("load"), save: z.number().int().positive() }).strict(),
        z.object({ action: z.literal("reset"), campaign: z.string().trim().max(mostSaid), to: z.enum(resetPoints).optional() }).strict(),
        z.object({ action: z.literal("new chat") }).strict(),
    ]).safeParse(await readBody(request));

    if (!parsed.success) {
        sendJson(response, 400, {
            error: "Send { action: make } with a label if you like, { action: load, save } with its number, or { action: reset, campaign } with the campaign's name, "
                + "to start it over, and to: start or session zero; or { action: new chat } once a new chat with the master is open after going back.",
        });
        return;
    }

    // Going back while the master waits for the player's answer would answer it in the game started over (D-361).
    if ((parsed.data.action === "load" || parsed.data.action === "reset") && served.asked !== undefined) {
        sendJson(response, 409, { error: "The master is asking you something: answer it first, then go back." });
        return;
    }

    try {
        await served.session.ready();
        const change = parsed.data;
        const news = await withFiles(served.session, async () => {
            const name = readSettings(requireCampaign(served.context.folder)).name;

            if (change.action === "reset" && comparableText(change.campaign) !== comparableText(name)) {
                throw new Error(`Write the campaign's name, ${name}, to start it over. Nothing changed.`);
            }

            const input = change.action === "make"
                ? { action: "make", ...(change.label === undefined || change.label === "" ? {} : { label: change.label }) }
                : change.action === "load"
                ? { action: "load", save: String(change.save) }
                : change.action === "new chat"
                ? { action: "new chat" }
                : { action: "reset", ...(change.to === undefined ? {} : { to: change.to }) };
            return playerSaveNews(await save.run(save.input.parse(input), { ...served.context, actor: "player" }));
        });
        served.events.push(news);
        sendJson(response, 202, {});
    } catch (error) {
        sendJson(response, 400, { error: error instanceof Error ? error.message : String(error) });
    }
}

/**
 * The packages as the page shows them (D-475): the game system, those on this computer with whether the campaign uses them, those it lists and lacks, what npm
 * has when asked, and the one the player is working on now.
 */
export async function packagesNow(response: ServerResponse, served: Served, npm: boolean): Promise<void>
{
    try {
        await served.session.ready();
        const shown = await withFiles(served.session, async () => {
            const root = requireCampaign(served.context.folder);
            const system = campaignSystem(root, served.context);
            const list = await packageCommand.run(packageCommand.input.parse({ action: "list" }), served.context);
            const available = npm ? await packageCommand.run(packageCommand.input.parse({ action: "available" }), served.context) : undefined;
            return {
                system: system === undefined ? null : { name: system.name, title: system.title },
                // The other systems of this computer, for a new campaign: a campaign's own is chosen in its setup (D-475).
                otherSystems: readableSystems(served.context.systemFolders).filter((other) => other.name !== system?.name).map((other) => ({ name: other.name, title: other.title })),
                ...(list.kind === "list" ? { installed: inLanguage(list.installed, served, readTextSetting(root, "language")), missing: list.missing, adventures: list.adventures, systems: list.systems, languages: list.languages } : {}),
                ...(available?.kind === "available" ? { available: available.packages, ...(available.failed === undefined ? {} : { failed: available.failed }) } : {}),
                ...(served.packageWork === undefined ? {} : { working: served.packageWork }),
            };
        });
        sendJson(response, 200, shown);
    } catch (error) {
        sendJson(response, 400, { error: error instanceof Error ? error.message : String(error) });
    }
}

/**
 * A package the player updates, takes out of the campaign or off this computer on the page (D-475, D-485), as package does with the player as who did it; the
 * master hears of it at the head of their next call. One not ours is updated with the player's yes in a window of their computer, never the page's click (D-478).
 */
export async function changePackage(request: IncomingMessage, response: ServerResponse, served: Served): Promise<void>
{
    const parsed = z.object({ action: z.enum(["update", "remove", "uninstall"]), name: z.string().trim().min(1).max(214) }).strict().safeParse(await readBody(request));

    if (!parsed.success) {
        sendJson(response, 400, { error: "Send what to do with which package: { action: update, remove or uninstall, name }." });
        return;
    }

    const { action, name } = parsed.data;

    // The page updates or takes away only what this computer has: it never brings a package new to it, nor its window, by these (D-510).
    if (!isInstalledPackage(served.context, name)) {
        sendJson(response, 400, { error: `${name} is not installed on this computer: add a package from the Packages page, where you choose it.` });
        return;
    }

    const done = action === "update" ? "updated" : action === "remove" ? "took out of the campaign" : "uninstalled";
    await packageWork(response, served, name, action, async (context) => {
        const result = await packageCommand.run(packageCommand.input.parse({ action: action === "update" ? "install" : action, name }), context);
        return { kind: result.kind, news: `The player, on the dashboard, ${done} ${name}: ${packageCommand.format(result)}` };
    });
}

/**
 * Something the player adds on the page (D-485 (1)): a .zip or a .tgz as the request's body, named by its X-File-Name, or { source }: a link, an npm name or a
 * folder of this computer. The engine tells the kind by what it holds; an adventure is read in memory, a .tgz kept in the player's data folder while npm installs it.
 */
export async function addPackage(request: IncomingMessage, response: ServerResponse, served: Served): Promise<void>
{
    const json = /^application\/json/i.test(String(request.headers["content-type"] ?? ""));
    const given = json ? z.object({ source: z.string().trim().min(1).max(2000) }).strict().safeParse(await readBody(request)) : undefined;
    const file = fileName(String(request.headers["x-file-name"] ?? "package.zip")).replace(/[\\/:*?"<>|\u0000-\u001f]/g, "").slice(0, 120) || "package.zip";
    const bytes = json ? undefined : await readBytes(request, largestUpload);

    if (given?.success === false) {
        sendJson(response, 400, { error: "Send what to add: { source }, a link, an npm name or a folder of this computer; or a .zip or a .tgz as the body." });
        return;
    }

    if (!json && bytes === undefined) {
        sendJson(response, 413, { error: `The file is more than ${largestUpload / 1024 / 1024} MB: no package is that big.` });
        return;
    }

    if (bytes !== undefined && !/\.(zip|tgz|tar\.gz)$/i.test(file)) {
        sendJson(response, 400, { error: `${file} is neither a .zip nor a .tgz: an adventure comes as a .zip, an extension, a game system or a language as a .tgz.` });
        return;
    }

    const source = given?.success === true ? given.data.source : file;
    await packageWork(response, served, source, "add", async (context) => {
        if (bytes !== undefined && /\.zip$/i.test(file)) {
            const root = requireCampaign(context.folder);
            const installed = installAdventure(root, context, readAdventureZip(bytes, file), file);
            return { kind: "adventure", news: `The player, on the dashboard, added an adventure: ${adventureText(installed)}` };
        }

        const kept = bytes === undefined ? undefined : join(served.context.home ?? packagesFolder(), "uploads", file);

        try {
            if (kept !== undefined && bytes !== undefined) {
                files().writeBytes(kept, bytes);
            }

            const result = await packageCommand.run(packageCommand.input.parse({ action: "install", name: kept ?? source }), context);
            return { kind: kindOf(result.kind), news: `The player, on the dashboard, added ${bytes === undefined ? source : file}: ${packageCommand.format(result)}` };
        } finally {
            if (kept !== undefined) {
                files().remove(kept);
            }
        }
    });
}

/**
 * This computer's library as the page shows it (D-491 (13)): each entry with its books read, being read and skipped, and whether the campaign uses it; and the
 * work under way, if any.
 */
export async function libraryNow(response: ServerResponse, served: Served): Promise<void>
{
    try {
        await served.session.ready();
        const entries = withFiles(served.session, () => libraryEntries(requireCampaign(served.context.folder), served.context));
        // Books still to read, as after the computer started again, are read now: the page counts them as they come.
        startLibraryReading(served.context);
        sendJson(response, 200, { entries, ...(served.packageWork === undefined ? {} : { working: served.packageWork }) });
    } catch (error) {
        sendJson(response, 400, { error: error instanceof Error ? error.message : String(error) });
    }
}

/**
 * A folder or a book of the library the player turns on in the campaign on the page, off, or takes off this computer (D-491 (13)), as config does with the
 * player as who did it: one new to the computer with their yes in a window of their computer, never the page's click (D-477); the books are never touched.
 * One work at a time, as the packages'.
 */
export async function changeLibrary(request: IncomingMessage, response: ServerResponse, served: Served): Promise<void>
{
    const parsed = z.object({ action: z.enum(["add", "remove", "forget"]), path: z.string().trim().min(1).max(1000) }).strict().safeParse(await readBody(request));

    if (!parsed.success) {
        sendJson(response, 400, { error: "Send what to do with which folder: { action: add, remove or forget, path }." });
        return;
    }

    const { action } = parsed.data;
    const path = unquoted(parsed.data.path);
    await packageWork(response, served, path, "library", async (context) => {
        const root = requireCampaign(context.folder);
        const before = libraryEntries(root, context).find((entry) => entry.used && samePath(entry.path, path)) !== undefined;
        const input = action === "add" ? { add: [path] } : { remove: [path], ...(action === "forget" ? { computer: true } : {}) };
        await config.run(config.input.parse({ setting: "library", ...input }), context);
        const after = libraryEntries(root, context).find((entry) => entry.used && samePath(entry.path, path)) !== undefined;
        // The master hears only of a change to this campaign's library.
        const news = before === after
            ? ""
            : after
            ? `The player, on the dashboard, turned on ${path} in the campaign's library: ${libraryContents(context, path)}. Before you rule on what they cover, `
                + "search them with rules, even when you know the system's rule."
            : `The player, on the dashboard, turned off ${path} in the campaign's library.`;
        return { kind: "library", news };
    });
}

/**
 * rpg-engine itself on the Packages page (D-515 (3)): its version, npm's latest and whether it is newer, and how it is installed, read at each look; its update,
 * from the page alone, globally with npm as it was installed, a development link or another install told and never touched; then how the chat takes it.
 */
export async function engineNow(request: IncomingMessage, response: ServerResponse, served: Served): Promise<void>
{
    const updater = served.context.engine;
    const version = runningVersion;

    // Where nothing updates it, as in the demo, its version alone.
    if (updater === undefined) {
        sendJson(response, request.method === "GET" ? 200 : 400, request.method === "GET" ? { version } : { error: "Only the game's server, started by the chat, updates rpg-engine." });
        return;
    }

    // What npm installed since this server started comes with a new chat: said apart, never as the version that runs.
    const onDisk = updater.onDisk();

    if (request.method === "GET") {
        const [latest, installed] = await Promise.all([updater.latest(), updater.installed()]);
        sendJson(response, 200, {
            version,
            ...(onDisk === version ? {} : { installed: onDisk }),
            ...("failed" in latest ? { failed: latest.failed } : { latest: latest.version, update: isNewerVersion(latest.version, onDisk) }),
            install: installed.how,
            ...("folder" in installed ? { folder: installed.folder } : {}),
            ...(served.packageWork === undefined ? {} : { working: served.packageWork }),
        });
        return;
    }

    const parsed = z.object({ action: z.literal("update") }).strict().safeParse(await readBody(request));

    if (!parsed.success) {
        sendJson(response, 400, { error: "Send what to do with rpg-engine: { action: update }." });
        return;
    }

    await packageWork(response, served, "rpg-engine", "engine", async () => {
        const latest = await updater.latest();

        if ("failed" in latest) {
            throw new Error(`${latest.failed}: update it once this computer is online. Nothing changed.`);
        }

        if (!isNewerVersion(latest.version, onDisk)) {
            throw new Error(onDisk === version ? `rpg-engine ${version} is npm's latest: there is nothing to update.` : `rpg-engine ${onDisk} is installed already: it comes with a new chat.`);
        }

        const installed = await updater.installed();

        if (installed.how !== "global") {
            throw new Error(
                installed.how === "link"
                    ? `rpg-engine here is a link to the folder ${installed.folder}, made by npm link for its development: update it there, with git pull and npm run build. Nothing changed.`
                    : `rpg-engine runs from ${installed.folder}, not from npm's global folder: update it the way it was installed. Nothing changed.`,
            );
        }

        const why = await updater.update(latest.version);

        if (why !== undefined) {
            throw new Error(`rpg-engine could not be updated: ${why}. Nothing changed.`);
        }

        // The chat goes on with the server it started, and so does this page: the new engine comes with a new chat, or the app opened again.
        const host = served.context.host?.() ?? "";
        const restart = /codex|claude-ai|claude desktop/i.test(host) ? "app" : "chat";
        return {
            kind: "engine-updated",
            news: `The player updated rpg-engine from ${version} to ${latest.version} on the dashboard: this chat goes on with ${version}, the new one comes with their next chat. Nothing to do now.`,
            answer: { version: latest.version, restart },
        };
    });
}

/** What the page may add (D-485, D-486), from npm and GitHub, read again at most every ten minutes, or when the page asks it fresh. */
export async function catalogNow(response: ServerResponse, served: Served, fresh: boolean): Promise<void>
{
    const kept = served.catalog;

    if (kept !== undefined && !fresh && served.context.now().getTime() - kept.at < catalogLife) {
        sendJson(response, 200, kept.catalog);
        return;
    }

    try {
        await served.session.ready();
        const read = await withFiles(served.session, () => catalog(requireCampaign(served.context.folder), served.context));
        served.catalog = { at: served.context.now().getTime(), catalog: read };
        sendJson(response, 200, read);
    } catch (error) {
        sendJson(response, 400, { error: error instanceof Error ? error.message : String(error) });
    }
}

/** The campaign exported as an adventure on the page (ADV-7), with the credits the player gives: the name of its file, which the page then downloads. */
export async function exportCampaign(request: IncomingMessage, response: ServerResponse, served: Served): Promise<void>
{
    const parsed = z.object({ author: z.string().trim().min(1).max(200).optional(), license: z.string().trim().min(1).max(200).optional() }).strict().safeParse(await readBody(request));

    if (!parsed.success) {
        sendJson(response, 400, { error: "Send the credits, if any: { author, license }." });
        return;
    }

    try {
        await served.session.ready();
        const result = await withFiles(served.session, () => packageCommand.run(packageCommand.input.parse({ action: "export", ...parsed.data }), { ...served.context, actor: "player" }));
        sendJson(response, 200, result.kind === "exported" ? { file: basename(result.file), pages: result.pages } : {});
    } catch (error) {
        sendJson(response, 400, { error: error instanceof Error ? error.message : String(error) });
    }
}

/** A zip of the campaign's exports/ folder, for the browser to save: by its name alone, never a path. */
export function exportedFile(response: ServerResponse, served: Served, name: string): void
{
    const root = findCampaign(served.context.folder);
    const path = root === undefined || basename(name) !== name || !/\.adventure\.zip$/i.test(name) ? undefined : join(root, exportsFolderName, name);
    const bytes = path === undefined ? undefined : files().bytes(path);

    if (bytes === undefined) {
        send(response, 404, "text/plain; charset=utf-8", "There is no such export: export the campaign again.");
        return;
    }

    response.writeHead(200, {
        ...securityHeaders,
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(name)}`,
        "Cache-Control": "no-store",
    });
    response.end(bytes);
}

/** The extensions on this computer with their title and about in the campaign's language, where their words give them (D-502). */
function inLanguage<Installed extends { package: string; title?: string; about?: string; }>(installed: Installed[], served: Served, language: string | undefined): Installed[]
{
    return installed.map((one) => {
        if (language === undefined || one.title === undefined) {
            return one;
        }

        try {
            const extension = findExtension(served.context.extensionFolders ?? [], one.package);
            const words = extension === undefined || extension.language.split("-")[0] === language.split("-")[0] ? undefined : extensionWords(extension.folder, language);
            return { ...one, ...(words?.title === undefined ? {} : { title: words.title }), ...(words?.about === undefined ? {} : { about: words.about }) };
        } catch {
            return one;
        }
    });
}

/**
 * One package's work on the page, one at a time (D-475): while it lasts, the page shows it and its phase, the player's yes waited for in a window of their
 * computer among them (D-478); then the master hears of it, and the page has the kind the engine recognized, or what went wrong, with a code when the yes was not given.
 */
async function packageWork(
    response: ServerResponse,
    served: Served,
    name: string,
    action: PackageAction,
    work: (context: Context) => Promise<{ kind: string; news: string; answer?: Record<string, unknown>; }>,
): Promise<void>
{
    if (served.packageWork !== undefined) {
        sendJson(response, 409, { error: `${served.packageWork.name} is still being worked on: wait for it, then try again.`, code: "busy" });
        return;
    }

    served.packageWork = { name, action, phase: "working" };
    served.notify();

    const phase = (now: PackagePhase): void => {
        if (served.packageWork !== undefined) {
            served.packageWork = { ...served.packageWork, phase: now };
            served.notify();
        }
    };

    const confirm = served.context.confirm;
    // The page's player is asked in a window of their computer only: never the host's form, which the page cannot show, and never the page's click (D-477).
    const context: Context = {
        ...served.context,
        actor: "player",
        player: undefined,
        // Never the terminal: a folder new to the library asks the yes in a window (D-477).
        terminal: undefined,
        // A no in a window holds for the session: a page, or a package's code in it, cannot make the window come back and back (D-510).
        declined: served.declined,
        ...(confirm === undefined ? {} : {
            confirm: {
                ask: async (title, text, signal, answers) => {
                    phase("yes");
                    return await confirm.ask(title, text, signal, answers).finally(() => phase("working"));
                },
            },
        }),
    };

    try {
        await served.session.ready();
        const done = await withFiles(served.session, () => work(context));

        if (done.news !== "") {
            served.events.push(done.news);
        }

        sendJson(response, 202, { kind: done.kind, ...done.answer });
    } catch (error) {
        sendJson(response, 400, { error: error instanceof Error ? error.message : String(error), ...(error instanceof YesRefused ? { code: error.code } : {}) });
    } finally {
        served.packageWork = undefined;
        served.notify();
    }
}

/** The kind of package a result of package install says it installed. */
function kindOf(result: string): string
{
    return result === "adventure-installed" ? "adventure" : result === "system-installed" ? "system" : result === "language-installed" ? "language" : "extension";
}

/** A file's name as the page sends it, encoded for a header; as it is when it does not decode. */
function fileName(header: string): string
{
    try {
        return decodeURIComponent(header);
    } catch {
        return header;
    }
}
