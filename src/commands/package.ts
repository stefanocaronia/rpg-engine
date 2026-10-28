import { join } from "node:path";
import { z } from "zod";
import { changeExtensions, findCampaign, readTextSetting, requireCampaign } from "../campaign/index.ts";
import { plainText } from "../confirm/index.ts";
import { type Context, engineSystemsFolder, type PackageInfo } from "../core/context.ts";
import { type Examples, neutralExamples } from "../core/examples.ts";
import { installedFromFolder } from "../core/files.ts";
import { appendLogEntry } from "../core/log.ts";
import { apiProblem, ourSystems, readsApi } from "../core/package-declarations.ts";
import { defineCommand } from "../core/registry.ts";
import { files, FileStore, isInside, withFiles } from "../core/store.ts";
import { comparableText } from "../core/text.ts";
import { isNewerVersion } from "../core/version.ts";
import { dropConsent, type Extension, findExtension, installedExtensions, readExtension, recordConsent, shortName } from "../extensions/index.ts";
import { installedLanguages, languagePackProblems, readLanguagePack } from "../languages/index.ts";
import { isLocalSpec, issuesPage, isTarball, isVerified, verifiedScope } from "../packages/index.ts";
import { findSystem, readableSystems, systemFolders, systemHasCode, systemInFolder } from "../systems/index.ts";
import { type AdventureExported, type AdventureInstalled, exportAdventure, installAdventure, installedAdventures, isAdventureSpec, readAdventureSpec, removeAdventure, storyTouching } from "./shared/adventures.ts";
import { campaignExamples } from "./shared/examples.ts";
import { campaignMode } from "./shared/mode.ts";
import { loadCampaignCode, loadNewSystemCode, packageCommandNames, packagesInstalled } from "./shared/packages/code.ts";
import { listedExtensions, runsCode } from "./shared/packages/extensions.ts";
import { newDatedLogEntry } from "./shared/time.ts";
import { campaignWorld } from "./shared/world.ts";

type PackageResult =
    | { kind: "list"; installed: Installed[]; missing: string[]; adventures: { title: string; version: string; since?: string; removable: boolean; }[]; systems: InstalledSystem[]; languages: InstalledLanguage[]; }
    | { kind: "available"; packages: Available[]; failed?: string; }
    | { kind: "installed"; extension: Extension; verified: boolean; commands: string[]; codeLeftOut: boolean; already: boolean; part?: string; tools: string; }
    | { kind: "removed"; name: string; }
    | { kind: "uninstalled"; name: string; wasUsed: boolean; extension: boolean; }
    | { kind: "system-installed"; system: InstalledSystem; plays?: string; loaded?: { runs: true; } | { why: string; }; }
    | { kind: "language-installed"; language: InstalledLanguage; replaced?: string; missing: number; }
    | ({ kind: "adventure-installed"; } & AdventureInstalled)
    | { kind: "adventure-removed"; title: string; }
    | ({ kind: "exported"; } & AdventureExported);

/** A package on this computer, as list gives it to the master and to the dashboard; broken when it does not read (D-442); with where its problems are reported. */
type Installed =
    | { name: string; package: string; version: string; title: string; about: string; verified: boolean; used: boolean; issues?: string; }
    | { name: string; package: string; broken: string; issues?: string; };

/** The player's yes to a package not ours, not given (D-478): they said no or closed the question, or no window could be shown here. */
export class YesRefused extends Error
{
    readonly code: "declined" | "no-window";

    constructor(message: string, code: "declined" | "no-window")
    {
        super(message);
        this.code = code;
    }
}

/** A game system on this computer (D-485): shipped with the engine, or a package npm installed; the campaign plays one, chosen in its setup. */
export interface InstalledSystem
{
    name: string;
    title: string;
    version?: string;
    package?: string;
    verified: boolean;
    used: boolean;
    /** Whether it brings code, which runs from the next start of the game's server. */
    code: boolean;
    /** Where its problems are reported, as its package.json says: the engine's own for those shipped with it. */
    issues?: string;
}

/** A language package on this computer (D-485 (3)), for every campaign: one for each language. */
export interface InstalledLanguage
{
    code: string;
    name: string;
    package: string;
    version: string;
    verified: boolean;
    /** Where its problems are reported, as its package.json says. */
    issues?: string;
}

/** A package on npm for this rpg-engine, with the version installed here, if any, and whether it is newer (D-442). */
interface Available
{
    name: string;
    package: string;
    version: string;
    description?: string;
    author?: string;
    verified: boolean;
    installed?: string;
    update: boolean;
    /** Its latest version, which needs a newer rpg-engine (D-515 (2)). */
    newer?: { version: string; engine?: string; };
}

export const packageCommand = defineCommand({
    name: "package",
    description: "The packages of the campaign: extensions such as weather, from npm, and adventures, as a .zip, a folder or a link with adventure.yaml. "
        + "list says those on this computer and those the campaign uses; available, those npm has, and updates. install adds or updates one, on this computer and in the campaign, "
        + "only once the player wants it; one not published by RPG Engine (@rpgengine/…) is someone else's: the player is asked in the host's form, or in a window of their computer. "
        + "An adventure is installed when you bring its hook into the story, once the player wants it as the next. "
        + "remove takes one out of the campaign; uninstall takes it off this computer; export writes the campaign's world, as it was at its start, as an adventure. "
        + "Example: package install weather.",
    group: "campaign",
    positionals: ["action", "name"],
    slow: true,
    input: z.object({
        action: z.enum(["list", "available", "install", "remove", "uninstall", "export"]).describe("list, available, install, remove, uninstall or export"),
        name: z.string().optional().describe(
            "the package: its name alone for one of ours, such as weather; another's npm name with its scope, or npm:name without one, its version if wanted; a folder or a .tgz "
                + "file on this computer; an adventure's .zip, folder or https link; an adventure's title to remove it",
        ),
        author: z.string().min(1).optional().describe("export: who wrote the adventure, as the player wants it credited"),
        license: z.string().min(1).optional().describe("export: the licence the player gives it, such as CC BY 4.0; without one, all rights are reserved"),
    }),

    async run(input, context): Promise<PackageResult>
    {
        const root = requireCampaign(context.folder);

        if (input.action === "list") {
            return listed(root, context);
        }

        if (input.action === "available") {
            return await available(context);
        }

        if (input.action === "export") {
            return { kind: "exported", ...exportAdventure(root, context, { author: input.author, license: input.license }) };
        }

        const name = input.name?.trim();

        if (name === undefined || name === "") {
            throw new Error(`Give the package to ${input.action}, such as package ${input.action} weather.`);
        }

        if (input.action === "install") {
            return isAdventureSpec(name) ? await adventureInstalled(root, context, name) : await installed(root, context, name);
        }

        const adventure = installedAdventures(root).find((one) => comparableText(one.title) === comparableText(name));

        if (input.action === "remove" && adventure !== undefined) {
            removeAdventure(root, context, adventure);
            return { kind: "adventure-removed", title: adventure.title };
        }

        return input.action === "remove" ? removed(root, context, name) : await uninstalled(root, context, name);
    },

    format(result)
    {
        if (result.kind === "adventure-installed") {
            return adventureText(result);
        }

        if (result.kind === "adventure-removed") {
            return `${result.title} is out of the campaign, with the files it wrote.`;
        }

        if (result.kind === "exported") {
            return exportText(result);
        }

        if (result.kind === "language-installed") {
            const { language } = result;
            return [
                `Installed ${language.name} (${language.code}) ${language.version}, the dashboard's words made by hand${language.verified ? "" : ", by someone else"}, for every campaign on this computer.`,
                result.replaced === undefined ? "" : `It takes the place of ${result.replaced}.`,
                result.missing === 0 ? "" : `The ${result.missing} phrases it lacks stay as the dashboard has them, its own or translated on the fly.`,
            ].filter((line) => line !== "").join(" ");
        }

        if (result.kind === "system-installed") {
            const { system } = result;
            return [
                `Installed the game system ${system.name}${system.version === undefined ? "" : ` ${system.version}`}, ${system.title}${system.verified ? "" : ", not verified: at the player's risk"}.`,
                // In a setup with no system yet, the one just installed is chosen next (D-513 (1)).
                system.used
                    ? "The campaign plays it."
                    : result.plays === undefined
                    ? `The campaign has no system yet: if the player chose this one, set it with config, setting system, value ${system.name}.`
                    : `It is for a new campaign, chosen in its setup: this one plays ${result.plays}.`,
                !system.code ? "" : result.plays === undefined ? "Its code runs once config sets it." : codeText(result.loaded),
            ].filter((line) => line !== "").join(" ");
        }

        if (result.kind === "removed") {
            return `The campaign no longer uses ${result.name}: its commands and its parts of your instructions are gone; what it kept in the campaign stays, and comes back if it is installed again.`;
        }

        if (result.kind === "uninstalled") {
            return result.extension
                ? `${result.name} is off this computer${result.wasUsed ? ", and the campaign no longer uses it" : ""}: another campaign that lists it asks to install it again.`
                : `${result.name} is off this computer.`;
        }

        if (result.kind === "installed") {
            const { extension } = result;
            const what = `${extension.name} ${extension.version}${result.verified ? ", verified" : ", not verified: at the player's risk"}`;
            const said = [
                `${result.already ? `The campaign already uses ${what}` : `Installed ${what}, and the campaign uses it`}: ${extension.about}.`,
                result.codeLeftOut ? "Its code is not used: the player's yes holds for another version or other files; install it again for their yes." : "",
                result.commands.length === 0 ? "" : `Its commands: ${result.commands.join(", ")}.${result.tools === "" ? "" : ` ${result.tools}`}`,
                Object.keys(extension.parts).length === 0 ? "" : `Its parts of your instructions are given when they apply: ${Object.keys(extension.parts).join(", ")}.`,
            ].filter((line) => line !== "").join(" ");
            return result.part === undefined ? said : `${said}\n\nIts part for now:\n\n${result.part}`;
        }

        if (result.kind === "available") {
            if (result.failed !== undefined) {
                return `npm could not be asked: ${result.failed}.`;
            }

            const lines = result.packages.map((one) => {
                const here = one.installed === undefined ? "" : one.update ? `, installed ${one.installed}: an update` : ", installed";
                const by = one.author === undefined ? "" : ` by ${one.author}`;
                const newer = one.newer === undefined ? "" : ` (its ${one.newer.version} needs ${one.newer.engine === undefined ? "a newer rpg-engine" : `rpg-engine ${one.newer.engine}`})`;
                return `${one.name} ${one.version}${one.verified ? "" : " (not verified)"}${by}${here}${newer}${one.description === undefined ? "" : `: ${one.description.replace(/\.$/, "")}`}`;
            });
            return `On npm: ${lines.length === 0 ? "none" : lines.join("; ")}.`;
        }

        const installedLines = result.installed.map((one) =>
            "broken" in one ? `${one.name} (broken: ${one.broken}; install it again)` : `${one.name} ${one.version}${one.verified ? "" : " (not verified)"}${one.used ? ", used by the campaign" : ""}`
        );
        return [
            `On this computer: ${installedLines.length === 0 ? "none" : installedLines.join("; ")}.`,
            result.missing.length === 0 ? "" : `The campaign lists, not installed here: ${result.missing.join(", ")}; install each with package install.`,
            result.adventures.length === 0 ? "" : `Its adventures: ${result.adventures.map((one) => `${one.title} ${one.version}${one.since === undefined ? "" : `, since ${one.since}`}`).join("; ")}.`,
            "package available says those npm has, and updates.",
        ].filter((line) => line !== "").join("\n");
    },
});

/** The packages on this computer, and those the campaign lists and does not find there: at once, without npm (D-442). */
function listed(root: string, context: Context): PackageResult
{
    const used = Object.keys(listedExtensions(root));
    const here = installedExtensions(context.extensionFolders ?? []).map((found): Installed => {
        const issues = issuesOf(found.folder);

        try {
            const extension = readExtension(found.folder);
            return {
                name: extension.name,
                package: extension.package,
                version: extension.version,
                title: extension.title,
                about: extension.about,
                verified: isVerified(extension.package, extension.linked),
                used: used.includes(extension.package),
                ...issues,
            };
        } catch (error) {
            return { name: shortName(found.package), package: found.package, broken: error instanceof Error ? error.message : String(error), ...issues };
        }
    });
    const adventures = installedAdventures(root).map((one) => ({ title: one.title, version: one.version, ...(one.since === undefined ? {} : { since: one.since }), removable: storyTouching(root, one) === undefined }));
    return { kind: "list", installed: here, missing: used.filter((name) => !here.some((one) => one.package === name)), adventures, systems: systemsHere(root, context), languages: languagesHere(context) };
}

/** The extensions npm has for this rpg-engine's API, ours first, each with the version installed here and whether npm has a newer one (D-442). */
async function available(context: Context): Promise<PackageResult>
{
    const searched = context.packages === undefined ? { failed: "only the game's server and the command line reach npm" } : await context.packages.search();

    if ("failed" in searched) {
        return { kind: "available", packages: [], failed: searched.failed };
    }

    const here = installedExtensions(context.extensionFolders ?? []);
    const packages = searched.filter((one) => one.kind === "extension" && readsApi(one.api, "extension")).map((one): Available => {
        const installed = here.find((found) => found.package === one.name);
        const copy = installed === undefined ? undefined : usable(context, one.name);
        const version = copy?.version;
        return {
            name: shortName(one.name),
            package: one.name,
            version: one.version,
            ...(one.description === undefined ? {} : { description: one.description }),
            ...(one.author === undefined ? {} : { author: one.author }),
            // What npm has is ours by its scope; the copy here is not, when a file or a folder of this computer took its place (D-452).
            verified: isVerified(one.name, copy?.linked ?? false),
            ...(installed === undefined ? {} : { installed: version ?? "broken" }),
            update: version !== undefined && isNewerVersion(one.version, version),
            ...(one.newer === undefined ? {} : { newer: one.newer }),
        };
    });
    return { kind: "available", packages: packages.sort((first, second) => Number(second.verified) - Number(first.verified) || first.name.localeCompare(second.name)) };
}

/** The npm names of ours a name alone may be, with its version if given: an extension's, then a game system's; a system of the engine's list first (D-513). */
function ourNames(name: string): [string, string]
{
    const names: [string, string] = [`${verifiedScope}${name}`, `${verifiedScope}system-${name}`];
    const bare = name.replace(/(?<=.)@[^@/]*$/, "");
    return ourSystems.some((system) => comparableText(system.name) === comparableText(bare)) ? [names[1], names[0]] : names;
}

/** Installs a package on this computer and adds it to the campaign (D-27, D-428, D-441): ours, or another once the player wants it; an extension, for this game. */
async function installed(root: string, context: Context, name: string): Promise<PackageResult>
{
    const packages = context.packages;

    if (packages === undefined) {
        throw new Error("Packages are installed only by the game's server or the command line, which reach npm.");
    }

    // A name alone is one of ours: weather is @rpgengine/weather, never a stranger's of that name, which is given as npm:weather; or our game system's, as 5e
    // is @rpgengine/system-5e (D-513).
    const [first, second] = name.startsWith("npm:") ? [name.slice(4)] : isLocalSpec(name) || name.startsWith("@") ? [name] : ourNames(name);
    const tried = await packages.describe(first);
    const other = second !== undefined && "failed" in tried && tried.missing === true ? await packages.describe(second) : undefined;
    const [asked, described] = second !== undefined && other !== undefined && !("failed" in other && other.missing === true) ? [second, other] : [first, tried];

    if ("failed" in described) {
        throw new Error(`${described.failed}. Nothing changed${asked === name ? "" : `: ${name} alone means ${asked}, one of RPG Engine's; another's is named with its scope, or as npm:${name} without one`}.`);
    }

    // npm is given the version described, which the player's yes was for: by its name alone, npm would keep the exact version it saved before.
    const spec = isLocalSpec(asked) ? asked : `${described.name}@${described.version}`;

    if (described.kind === "system") {
        return await systemInstalled(root, context, spec, name, described);
    }

    if (described.kind === "language") {
        return await languageInstalled(root, context, spec, described);
    }

    if (described.kind !== "extension") {
        throw new Error(
            described.kind === undefined
                ? `${described.name} is not a package for RPG Engine: its package.json does not say "rpg-engine": {"kind": "extension"}, or {"kind": "system"} for a game system. Nothing changed.`
                : `${described.name} is a package of kind ${described.kind}: for now extensions, game systems and adventures are installed this way. Nothing changed.`,
        );
    }

    const unread = apiProblem(described.api, "extension");

    if (unread !== undefined) {
        throw new Error(`${described.name} ${described.version} cannot be used, because ${unread}. Nothing changed.`);
    }

    const local = isLocalSpec(spec);
    const before = usable(context, described.name);

    if (!isVerified(described.name, local)) {
        // A file or a folder says what it holds, and when it takes the place of a copy from npm, which is one for the whole computer (D-452).
        const holds = local ? ` (${described.name} ${described.version}${described.author === undefined ? "" : `, by ${described.author}`})` : "";
        const replaces = local && before !== undefined && !before.linked ? ` It takes the place of ${before.package} ${before.version} from npm, in every campaign on this computer.` : "";
        await playerYes(context, local ? name : `${described.name} ${described.version}`, described.name, local, holds, replaces);
    }

    // A copy from a file or a folder never stands for the one npm has: asked by its name, npm's comes back.
    // Another's whose code may not run is installed again before its yes is kept: the yes goes to npm's files, never to files changed since (D-478, D-510).
    const reinstall = before === undefined || before.version !== described.version || local || before.linked || (!isVerified(described.name, local) && !runsCode(before));

    if (reinstall) {
        const why = await packages.install(spec);

        if (why !== undefined) {
            throw new Error(`${described.name} could not be installed: ${why}. Nothing changed in the campaign.`);
        }

        // npm wrote there: what the call read of those folders is read again, and the code anew.
        (context.extensionFolders ?? []).forEach((folder) => files().refresh(folder));
        packagesInstalled();
    }

    // By its whole name: another's skies is not ours, nor ours another's.
    const extension = usable(context, described.name, true);

    // What npm installed is not what the player said yes to, or no extension: it goes off this computer again, and never runs.
    if (extension === undefined || extension.version !== described.version) {
        await packages.uninstall(described.name);
        (context.extensionFolders ?? []).forEach((folder) => files().refresh(folder));
        throw new Error(`npm installed ${described.name}, but not as the extension ${described.version} the player said yes to: RPG Engine cannot use it, and took it off this computer again. Nothing changed in the campaign.`);
    }

    // The player's yes holds for this version and these files, on this computer: its code runs on the server and in the page (D-478, D-510).
    if (!isVerified(described.name, local) && !extension.linked) {
        recordConsent(extension.folder, extension.package, extension.version);
    }

    const system = readTextSetting(root, "system");

    if (extension.needs.system !== undefined && comparableText(extension.needs.system) !== comparableText(system ?? "")) {
        throw new Error(`${extension.name} is installed on this computer, but it is for the game system ${extension.needs.system}, and the campaign plays ${system ?? "none"}: the campaign does not use it.`);
    }

    // Its state, widgets and pictures go by its name, which the system's would share (D-514).
    if (comparableText(extension.name) === comparableText(system ?? "")) {
        throw new Error(`${extension.name} is installed on this computer, but it has the name of the game system the campaign plays: the campaign does not use it. Nothing changed in the campaign.`);
    }

    const others = Object.keys(listedExtensions(root)).filter((other) => other !== extension.package && shortName(other) === extension.name);

    if (others.length > 0) {
        throw new Error(`The campaign uses ${others[0]}, with the same name, ${extension.name}: take it away with package remove ${others[0]} first. Nothing changed in the campaign.`);
    }

    // Its code is checked before the campaign lists it: a package that would not work is never added.
    const commands = runsCode(extension)
        ? await packageCommandNames(extension, context, []).catch((error: unknown) => {
            throw new Error(`The code of ${extension.package} cannot be used: ${error instanceof Error ? error.message : String(error)}. Nothing changed in the campaign.`);
        })
        : [];
    const listedBefore = listedExtensions(root);
    const already = listedBefore[extension.package] === extension.version && !reinstall;
    const verified = isVerified(extension.package, extension.linked);

    if (listedBefore[extension.package] !== extension.version) {
        changeExtensions(root, { ...listedBefore, [extension.package]: extension.version });
        appendLogEntry(root, newDatedLogEntry(root, context, "package-installed", "public", { package: extension.package, version: extension.version, verified }));
    }

    // The campaign's code anew, the new one's included: their hooks are called at the next change, never skipped (D-514).
    await loadCampaignCode(context);

    return {
        kind: "installed",
        extension,
        verified,
        commands,
        codeLeftOut: (extension.code !== undefined || extension.page !== undefined) && !runsCode(extension),
        already,
        ...modePart(root, context, extension),
        tools: toolsNote(context),
    };
}

/**
 * Installs a game system on this computer (D-485), for a new campaign: the campaign keeps the one its setup chose. One not ours only with the player's yes,
 * as an extension (D-441, D-478); a system that does not read is no system, whatever npm installed.
 */
async function systemInstalled(root: string, context: Context, spec: string, name: string, described: PackageInfo): Promise<PackageResult>
{
    const local = isLocalSpec(spec);
    const named = shortName(described.name).replace(/^system-/, "");
    const unread = apiProblem(described.api, "system");

    if (unread !== undefined) {
        throw new Error(`${described.name} ${described.version} cannot be used, because ${unread}. Nothing changed.`);
    }

    const taken = systemsHere(root, context).find((one) => comparableText(one.name) === comparableText(named) && one.package !== described.name);

    if (taken !== undefined) {
        throw new Error(`There is already a game system named ${taken.name} on this computer${taken.package === undefined ? ", the engine's own" : `, from ${taken.package}`}: ${described.name} would take its name. Nothing changed.`);
    }

    if (!isVerified(described.name, local)) {
        await playerYes(context, local ? name : `${described.name} ${described.version}`, described.name, local, local ? ` (${described.name} ${described.version})` : "");
    }

    const why = await (context.packages as NonNullable<Context["packages"]>).install(spec);

    if (why !== undefined) {
        throw new Error(`${described.name} could not be installed: ${why}. Nothing changed.`);
    }

    [...context.systemFolders, ...(context.extensionFolders ?? [])].forEach((folder) => files().refresh(folder));
    const installed = installedExtensionFolder(context, described.name);

    // The player's yes holds for this version and these files: its code runs at the next start of the game's server (D-478, D-511).
    if (!isVerified(described.name, local) && !local && installed !== undefined) {
        recordConsent(installed, described.name, described.version);
    }

    const system = systemsHere(root, context).find((one) => one.package === described.name);

    if (system === undefined) {
        throw new Error(`${described.name} was installed, but ${unreadSystemWhy(installed, described.name)}. Uninstall it with package uninstall ${described.name}.`);
    }

    appendLogEntry(root, newDatedLogEntry(root, context, "package-installed", "public", { package: described.name, version: described.version, verified: system.verified, kind: "system" }));
    const plays = readTextSetting(root, "system");
    const loaded = system.used && system.code ? await loadedNow(context, system.name) : undefined;
    return { kind: "system-installed", system, ...(plays === undefined ? {} : { plays }), ...(loaded === undefined ? {} : { loaded }) };
}

/** The code of the system the campaign plays, installed now, loaded at once when the process has none of it yet, as config system does (D-513 (1)). */
async function loadedNow(context: Context, name: string): Promise<{ runs: true; } | { why: string; } | undefined>
{
    // A version the process has already loaded runs until it starts again.
    const code = context.systemCode;

    if (code === undefined || Object.hasOwn(code, name)) {
        return undefined;
    }

    await loadNewSystemCode(context);
    const loaded = code[name];
    return loaded === undefined ? undefined : "code" in loaded ? { runs: true } : { why: "refused" in loaded ? `it ${loaded.refused}` : loaded.problem };
}

/** When the code of the system just installed runs, for the campaign that plays it. */
function codeText(loaded: { runs: true; } | { why: string; } | undefined): string
{
    return loaded === undefined ? "Its code runs from the next start of the game's server." : "runs" in loaded ? "Its code runs from now." : `Its code does not run: ${loaded.why.replace(/\.$/, "")}.`;
}

/** The game systems on this computer, those shipped with the engine first, with the package each came in when npm installed it (D-485). */
function systemsHere(root: string, context: Context): InstalledSystem[]
{
    const plays = readTextSetting(root, "system") ?? "";
    const folders = systemFolders(context.systemFolders);
    return readableSystems(context.systemFolders).map((system): InstalledSystem => {
        const manifest = packageOf(folders.find((one) => one.name === system.name)?.folder ?? system.folder);
        // The engine's own have no package of their own here; one npm installed is ours only by our scope, and never from a folder (D-441).
        const shipped = isInside(engineSystemsFolder, system.folder);
        const linked = installedFromFolder(system.folder);
        return {
            name: system.name,
            title: system.title,
            ...(manifest === undefined ? {} : { version: manifest.version }),
            ...(manifest === undefined || shipped ? {} : { package: manifest.name }),
            verified: shipped || (manifest !== undefined && isVerified(manifest.name, linked)),
            used: comparableText(system.name) === comparableText(plays),
            code: systemHasCode(system.folder),
            // The engine's own are reported where the engine is: its package.json is in the folder above its systems.
            ...issuesOf(shipped ? join(engineSystemsFolder, "..") : system.folder),
        };
    });
}

/** Where the package in this folder takes reports of its problems, as its package.json says; nothing when it says none or has none that reads. */
function issuesOf(folder: string): { issues?: string; }
{
    try {
        const issues = issuesPage(JSON.parse(files().text(join(folder, "package.json")) ?? "") as { bugs?: unknown; repository?: unknown; });
        return issues === undefined ? {} : { issues };
    } catch {
        return {};
    }
}

/** The name and the version a package.json in this folder gives; undefined when it has none that reads. */
function packageOf(folder: string): { name: string; version: string; } | undefined
{
    try {
        const read = JSON.parse(files().text(join(folder, "package.json")) ?? "") as { name?: unknown; version?: unknown; };
        return typeof read.name === "string" && typeof read.version === "string" ? { name: read.name, version: read.version } : undefined;
    } catch {
        return undefined;
    }
}

/**
 * Installs a language package on this computer (D-485 (3)): texts the dashboard shows, never code, so no yes is asked; refused, and taken off again, when its
 * phrases lose a {name} or turn the order of a text. It takes the place of another package of the same language.
 */
async function languageInstalled(root: string, context: Context, spec: string, described: PackageInfo): Promise<PackageResult>
{
    if (described.code === true || described.dependencies === true) {
        throw new Error(`${described.name} says it is a language, and brings code or needs other packages: a language package is texts only. Nothing changed.`);
    }

    const before = installedLanguages(context.extensionFolders ?? []);
    const packages = context.packages as NonNullable<Context["packages"]>;
    const why = await packages.install(spec);

    if (why !== undefined) {
        throw new Error(`${described.name} could not be installed: ${why}. Nothing changed.`);
    }

    (context.extensionFolders ?? []).forEach((folder) => files().refresh(folder));
    const folder = installedExtensionFolder(context, described.name);
    let checked: { problems: string[]; missing: number; };
    let pack: ReturnType<typeof readLanguagePack>;

    try {
        pack = readLanguagePack(folder ?? "");
        checked = languagePackProblems(pack, Object.keys(pagePhrases(context)));
    } catch (error) {
        checked = { problems: [error instanceof Error ? error.message : String(error)], missing: 0 };
        pack = { package: described.name, version: described.version, folder: folder ?? "", code: "", name: described.name };
    }

    if (checked.problems.length > 0) {
        await packages.uninstall(described.name);
        // An update refused leaves the version that was there before.
        const earlier = before.find((one) => one.package === described.name);
        const back = earlier === undefined || isLocalSpec(spec) ? undefined : await packages.install(`${earlier.package}@${earlier.version}`).then((why) => (why === undefined ? earlier.version : undefined));
        (context.extensionFolders ?? []).forEach((one) => files().refresh(one));
        throw new Error(`${described.name} cannot be used: ${checked.problems.join("; ")}. ${back === undefined ? "It was taken off this computer." : `Version ${back} stays.`}`);
    }

    // One language, one package: the one before for the same code goes (D-485 (3)).
    const replaced = before.find((one) => one.code.toLowerCase() === pack.code.toLowerCase() && one.package !== described.name);

    if (replaced !== undefined) {
        await packages.uninstall(replaced.package);
        (context.extensionFolders ?? []).forEach((one) => files().refresh(one));
    }

    const language = languagesHere(context).find((one) => one.package === described.name) as InstalledLanguage;
    appendLogEntry(root, newDatedLogEntry(root, context, "package-installed", "public", { package: described.name, version: described.version, verified: language.verified, kind: "language" }));
    return { kind: "language-installed", language, ...(replaced === undefined ? {} : { replaced: replaced.package }), missing: checked.missing };
}

/** The language packages on this computer, one for each language (D-485 (3)). */
function languagesHere(context: Context): InstalledLanguage[]
{
    return installedLanguages(context.extensionFolders ?? []).map((pack) => ({
        code: pack.code,
        name: pack.name,
        package: pack.package,
        version: pack.version,
        verified: isVerified(pack.package, installedFromFolder(pack.folder)),
        ...issuesOf(pack.folder),
    }));
}

/**
 * Installs the game system the campaign in this context's folder plays, when it is one of ours that is not on this computer, as package install does, from
 * npm's cache when the registry does not answer, then loads its code (SYS-10, D-514 (3)); once for each system, as `tried` keeps them. The line that says
 * so to the master, or why it could not; undefined when there is no campaign or nothing to install, and for a system not ours, which asks the player's yes.
 */
export async function installCampaignSystem(context: Context, tried: Set<string>): Promise<string | undefined>
{
    const packages = context.packages;
    return packages === undefined ? undefined : await withFiles(context.files ?? new FileStore(context.systemFolders), async () => {
        const root = findCampaign(context.folder);
        const name = root === undefined ? undefined : readTextSetting(root, "system");
        const ours = name === undefined ? undefined : ourSystems.find((one) => comparableText(one.name) === comparableText(name.trim()));

        // Each system is looked for once: one here stays, as package uninstall keeps the one the campaign plays.
        if (root === undefined || ours === undefined || tried.has(ours.name)) {
            return undefined;
        }

        tried.add(ours.name);

        if (isSystemHere(context, ours.name)) {
            return undefined;
        }

        let result: PackageResult;

        try {
            // As package install, which loads the code of the system the campaign plays.
            result = await installed(root, context, ours.package);
        } catch (error) {
            // npm's why, without what package install adds for the master, and without its period: the master tells the player, and the player chooses (D-514 (3)).
            const why = (error instanceof Error ? error.message : String(error)).replace(/^\S+ could not be installed: /, "").replace(/\s*Nothing changed[^.]*\.$/, "").replace(/\.$/, "");
            return `The campaign's game system, ${ours.name}, is not on this computer, and could not be installed: ${why}. Tell the player off-game, in brackets and in a table's words, `
                + `that this computer lacks the ${ours.name} rules and could not download them: once it is online, you install them with package install ${ours.name}, no yes needed. `
                + "Until then you play without its pages and the sheet's worked-out numbers, or wait, as the player chooses.";
        }

        const version = result.kind === "system-installed" && result.system.version !== undefined ? ` ${result.system.version}` : "";
        return `The campaign's game system, ${ours.name}, was not on this computer: RPG Engine installed it, ${ours.package}${version}, one of its own. Its pages and rules are there from now.`
            + namesNote(root, context, ours.name);
    });
}

/**
 * The names of a system just installed in the chat, which the host's list of tools may not have yet (D-518): its counter, its rest and its coins, those that
 * are not the neutral ones; nothing when it names none of them.
 */
function namesNote(root: string, context: Context, system: string): string
{
    let examples: Examples;

    try {
        examples = campaignExamples(root, context);
    } catch {
        return "";
    }

    const own = (name: keyof Examples): string | undefined => (examples[name] === neutralExamples[name] ? undefined : examples[name]);
    const coins = [own("coin"), own("smallCoin")].filter((coin) => coin !== undefined).join(" and ");
    const counter = own("counter");
    const names = [counter === undefined ? undefined : `${counter} for damage`, own("rest"), coins === "" ? undefined : coins].filter((name) => name !== undefined);
    return names.length === 0 ? "" : ` The commands' descriptions may keep neutral examples until a new chat: in ${system} use its own names, such as ${names.join(", ")}.`;
}

/** Whether a game system by this name is on this computer; one whose system.yaml does not read is there too, and validate says why. */
function isSystemHere(context: Context, name: string): boolean
{
    try {
        return findSystem(context.systemFolders, name) !== undefined;
    } catch {
        return true;
    }
}

/** Whether a package is on this computer, by its name as package takes it: an extension, a game system or a language npm installed (D-510). */
export function isInstalledPackage(context: Context, name: string): boolean
{
    const asked = name.startsWith("npm:") ? name.slice(4) : name.startsWith("@") ? name : `${verifiedScope}${name}`;
    return [asked, name].some((one) => installedExtensionFolder(context, one) !== undefined);
}

/** The folder npm installed a package in, among the extensions' folders; undefined when it is not there. */
function installedExtensionFolder(context: Context, name: string): string | undefined
{
    return (context.extensionFolders ?? []).map((folder) => join(folder, ...name.split("/"))).find((folder) => files().exists(join(folder, "package.json")));
}

/** The dashboard's phrases, by their English, as its curated Italian lists them all; none where the built page is not here. */
function pagePhrases(context: Context): Record<string, string>
{
    try {
        return JSON.parse(files().text(join(context.pageFolder ?? "", "i18n", "it.json")) ?? "{}") as Record<string, string>;
    } catch {
        return {};
    }
}

/**
 * The player's own yes to a package not ours (D-441, D-478), where the master cannot give it with its own tools: the host's form first, never the dashboard's
 * page, whose click a local program can forge; else a window of their operating system; else none, and it throws.
 */
async function playerYes(context: Context, name: string, pack: string, local: boolean, holds = "", replaces = ""): Promise<void>
{
    // A no in a window holds for the package npm describes, however it was written, until the server starts again (D-510).
    if (context.declined?.has(pack) === true) {
        throw new YesRefused(`The player said no to ${pack} in this session: it is not asked again until the game's server starts again. Nothing changed.`, "declined");
    }

    // Said in plain words, the fixed text before the name its author chose; and where the request comes from (D-510). The package's own words cut short, so
    // that a window, which shows so much at most, never loses the warning to them.
    const clean = (text: string, most: number): string => plainText(text.replace(/\s+/g, " "), most);
    [name, holds] = [clean(name, 120), holds.trim() === "" ? "" : ` ${clean(holds, 160)}`];
    const from = context.actor === "player" ? "the dashboard" : context.host === undefined ? "the command line" : "the chat";
    const can = "Its code runs on this computer with your permissions, and in the dashboard, where it can see the whole campaign, its secrets included, and press buttons and speak to the master for you.";
    const warning = local
        ? `Not verified by RPG Engine: ${name}${holds}, ${isTarball(name) ? "a file" : "a folder"} of this computer, asked from ${from}. ${can} RPG Engine takes no responsibility for it.${replaces}`
        : `Not verified by RPG Engine: ${name}, asked from ${from}. ${can} Install it only if you trust who made it.`;
    const question = `Install ${name}? ${warning}`;
    const title = "A package not ours";
    const answer = context.player === undefined ? "unavailable" : await context.player.choose(question, title, ["Install it, at my risk", "Do not install it"], context.signal);

    if (answer === 0) {
        return;
    }

    if (answer === 1 || (typeof answer === "object" && answer !== null)) {
        throw new YesRefused(`The player did not want ${name}. Nothing changed.`, "declined");
    }

    // Closed without an answer is no yes, never a reason to ask again some other way.
    if (answer === undefined) {
        throw new YesRefused(`The player closed the question without a yes to ${name}. Nothing changed: ask again only if they bring it up.`, "declined");
    }

    const window = context.confirm === undefined ? "none" : await context.confirm.ask(title, question, context.signal);

    if (window === "yes") {
        return;
    }

    if (window === "no") {
        context.declined?.add(pack);
        throw new YesRefused(`The player did not want ${name}. Nothing changed.`, "declined");
    }

    throw new YesRefused(
        `${warning} Only the player can say yes to it, in the host's form or in a window of their computer, and neither can be shown here (no desktop, as over SSH; `
            + `on Linux zenity or kdialog shows it): install it where one can be. Nothing changed.`,
        "no-window",
    );
}

/** The installed extension of this package, when it reads; undefined when it is missing or broken. */
function usable(context: Context, name: string, whole = false): Extension | undefined
{
    try {
        const found = whole ? installedExtensions(context.extensionFolders ?? []).find((one) => one.package === name) : undefined;
        return whole ? (found === undefined ? undefined : readExtension(found.folder)) : findExtension(context.extensionFolders ?? [], name);
    } catch {
        return undefined;
    }
}

/** Why a system npm installed is not among those that read: its system.yaml does not, or it has none. */
function unreadSystemWhy(folder: string | undefined, name: string): string
{
    if (folder === undefined || !files().exists(join(folder, "system.yaml"))) {
        return "it has no system.yaml: it is no game system";
    }

    try {
        systemInFolder(folder, shortName(name).replace(/^system-/, ""));
        return "it does not read as a game system";
    } catch (error) {
        return `its system.yaml does not read: ${error instanceof Error ? error.message : String(error)}`;
    }
}

/** The extension's part of the instructions for the mode the campaign is in, which the chat going on has not been given. */
function modePart(root: string, context: Context, extension: Extension): { part?: string; }
{
    const mode = campaignMode(root, campaignWorld(root, context)).replace(" ", "-");
    const part = extension.parts[mode]?.text;
    return part === undefined ? {} : { part };
}

/** When the master can call the new commands: on the command line at once; in a chat, as the app in use hears new tools. */
function toolsNote(context: Context): string
{
    const host = context.host?.() ?? "";

    if (context.host === undefined) {
        return "";
    }

    if (/codex/i.test(host)) {
        return "Codex sees them only once it is closed and opened again: tell the player.";
    }

    if (/claude-ai|claude desktop/i.test(host)) {
        return "This app sees them only once it is closed and opened again: tell the player.";
    }

    return "They are yours from the player's next message.";
}

/** Takes an extension out of the campaign; it stays on this computer, for other campaigns. */
function removed(root: string, context: Context, name: string): PackageResult
{
    const listed = listedExtensions(root);
    const found = Object.keys(listed).find((candidate) => candidate === name || comparableText(shortName(candidate)) === comparableText(name));

    if (found === undefined) {
        const names = Object.keys(listed).map(shortName);
        throw new Error(`The campaign does not use ${name}${names.length === 0 ? ": it uses no package" : `; it uses ${names.join(", ")}`}. Nothing changed.`);
    }

    const rest = Object.fromEntries(Object.entries(listed).filter(([candidate]) => candidate !== found));
    changeExtensions(root, rest);
    appendLogEntry(root, newDatedLogEntry(root, context, "package-removed", "public", { package: found }));
    return { kind: "removed", name: shortName(found) };
}

/** Takes a package off this computer with npm, and out of the campaign when it uses it (D-442); other campaigns that list it ask to install it again. */
async function uninstalled(root: string, context: Context, name: string): Promise<PackageResult>
{
    const packages = context.packages;
    const system = systemsHere(root, context).find((one) => one.package !== undefined && (one.package === name || comparableText(one.name) === comparableText(name)));

    if (system?.used === true) {
        throw new Error(`The campaign plays ${system.name}: it stays on this computer. Nothing changed.`);
    }

    const other = system?.package ?? languagesHere(context).find((one) => one.package === name || comparableText(one.code) === comparableText(name))?.package;
    const found = other === undefined
        ? installedExtensions(context.extensionFolders ?? []).find((one) => one.package === name || comparableText(shortName(one.package)) === comparableText(name))
        : { package: other };

    // A package that reads as nothing, as a system whose system.yaml is broken, is still npm's to take away by its folder.
    if (found === undefined && packages !== undefined && (context.extensionFolders ?? []).some((folder) => name.startsWith("@") && files().entries(join(folder, ...name.split("/"))).length > 0)) {
        const why = await packages.uninstall(name);

        if (why !== undefined) {
            throw new Error(`${name} could not be taken off this computer: ${why}. Nothing changed.`);
        }

        return { kind: "uninstalled", name, wasUsed: false, extension: false };
    }

    if (found === undefined) {
        const here = installedExtensions(context.extensionFolders ?? []).map((one) => shortName(one.package));
        throw new Error(`${name} is not on this computer${here.length === 0 ? ": no package is" : `; these are: ${here.join(", ")}`}. Nothing changed.`);
    }

    if (packages === undefined) {
        throw new Error("Packages are uninstalled only by the game's server or the command line, which reach npm.");
    }

    const folder = installedExtensionFolder(context, found.package);
    const why = await packages.uninstall(found.package);

    if (why !== undefined) {
        throw new Error(`${found.package} could not be uninstalled: ${why}. Nothing changed.`);
    }

    // Off this computer, its yes goes with it: installed again, it is asked again.
    if (folder !== undefined) {
        dropConsent(folder, found.package);
    }

    [...context.systemFolders, ...(context.extensionFolders ?? [])].forEach((folder) => files().refresh(folder));
    const listed = listedExtensions(root);
    const wasUsed = Object.hasOwn(listed, found.package);

    if (wasUsed) {
        changeExtensions(root, Object.fromEntries(Object.entries(listed).filter(([candidate]) => candidate !== found.package)));
    }

    appendLogEntry(root, newDatedLogEntry(root, context, "package-uninstalled", "public", { package: found.package }));
    return { kind: "uninstalled", name: shortName(found.package), wasUsed, extension: other === undefined };
}

/** Installs an adventure from a .zip, a folder or a link (D-483): no npm, no code, and the same refusals wherever it comes from. */
async function adventureInstalled(root: string, context: Context, spec: string): Promise<PackageResult>
{
    const adventure = await readAdventureSpec(spec, context);
    return { kind: "adventure-installed", ...installAdventure(root, context, adventure, spec) };
}

/** What the master hears of an adventure installed (D-483 (5)): what it is in a few lines, then what to read and where it starts, never its text. */
export function adventureText(result: AdventureInstalled): string
{
    const { manifest } = result;
    const by = manifest.author === undefined ? "" : ` by ${manifest.author}`;
    const rights = manifest.license ?? "all rights reserved";
    const counts = Object.entries(result.counts).map(([kind, count]) => `${count} ${kind}`).join(", ");
    const levels = manifest.levels === undefined ? undefined : manifest.levels.from === manifest.levels.to ? `level ${manifest.levels.from}` : `levels ${manifest.levels.from}-${manifest.levels.to}`;
    const start = result.start === undefined
        ? ""
        : result.start.placed
        ? ` It starts in [[${result.start.name}]].`
        : ` It starts in [[${result.start.name}]], in no place of the world yet: write it into the place that holds it, or give it a position, and a road from where it is reached.`;
    const read = manifest.opening === undefined ? "Read its places and quests" : `Show [[${manifest.opening}]] and the pages it says to read first`;
    return [
        `${result.already ? "The campaign already has" : "Installed"} the adventure ${manifest.title} ${manifest.version}${by} (${rights}): ${manifest.about.replace(/\.$/, "")}. ${counts}.`,
        levels === undefined ? "" : `It is written for ${levels}: adapt it to the party's.`,
        manifest.content.length === 0 ? "" : `Its content: ${manifest.content.join(", ")}; keep to the player's lines and veils.`,
        result.firstDate === undefined
            ? ""
            : result.shift === 0
            ? `Its first date: [[${result.firstDate.page}]], on ${result.firstDate.date}.`
            : `Its dates moved ${result.shift} days: the first, [[${result.firstDate.page}]], on ${result.firstDate.date}.`,
        result.textDates === 0 ? "" : result.textDates === 1 ? "1 date in its text stays as written: count it from today." : `${result.textDates} dates in its text stay as written: count them from today.`,
        result.shadows.length === 0 ? "" : `Its pages take the place of the game system's: ${result.shadows.join(", ")}.`,
        result.covers.length === 0 ? "" : `Its rules take the place of the game system's: ${result.covers.join(", ")}.`,
        result.ignored.length === 0 ? "" : `Left out, no part of an adventure: ${result.ignored.join(", ")}.`,
        `${read} before you narrate.${start} Bring a hook into the story: the adventure begins when the player takes it.`,
    ].filter((line) => line !== "").join(" ");
}

/** What the master hears of an export (ADV-7): the file, what it came from and what stayed out. */
function exportText(result: AdventureExported): string
{
    const out = [
        result.leftOut.characters.length === 0 ? "" : `the player characters (${result.leftOut.characters.join(", ")})`,
        result.leftOut.adventures.length === 0 ? "" : `the adventures it installed (${result.leftOut.adventures.join(", ")})`,
    ].filter((part) => part !== "");
    return [
        `Wrote ${result.file}: ${result.pages} pages, from ${result.from}${out.length === 0 ? "" : `, without ${out.join(" and ")}`}.`,
        result.opening === undefined
            ? "It has no opening page: one tagged opening, with the situation, the hooks, what happens if no one steps in and the pages to read first, and its start, makes it ready."
            : `Its opening is [[${result.opening}]].`,
        result.sourced === undefined
            ? "The player shares it as a file, and only what they have the right to share."
            : `${result.sourced.length} of its pages come from the player's own documents (source:): ${result.sourced.slice(0, 5).join(", ")}${result.sourced.length > 5 ? "…" : ""}. `
                + "So it says personal use only. Ask the player whether they may share it: only with the document's own license, or their rights to it; if so, export again with that license.",
    ].join(" ");
}
