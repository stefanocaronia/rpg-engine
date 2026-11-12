// Installs a package, an extension, a game system or a language, and checks what npm put there; and the system a campaign plays when this computer lacks it
import { join } from "node:path";
import { changeExtensions, findCampaign, readTextSetting } from "../../campaign/index.ts";
import type { Context, PackageInfo } from "../../core/context.ts";
import { type Examples, neutralExamples } from "../../core/examples.ts";
import { appendLogEntry } from "../../core/log.ts";
import { apiProblem, ourSystems, packageApi } from "../../core/packages/declarations.ts";
import { Refusal } from "../../core/refusal.ts";
import { files, FileStore, withFiles } from "../../core/store.ts";
import { comparableText } from "../../core/text.ts";
import { type Extension, recordConsent, shortName } from "../../extensions/index.ts";
import { installedLanguages, languagePackProblems, readLanguagePack } from "../../languages/index.ts";
import { isLocalSpec, isVerified, verifiedScope } from "../../packages/index.ts";
import { campaignMode } from "../shared/campaign/mode.ts";
import { campaignWorld } from "../shared/campaign/world.ts";
import { campaignExamples } from "../shared/examples.ts";
import { loadCampaignCode, loadNewSystemCode, packageCommandNames, packagesInstalled } from "../shared/packages/code.ts";
import { listedExtensions, runsCode } from "../shared/packages/extensions.ts";
import { newDatedLogEntry } from "../shared/time/time.ts";
import { playerYes } from "./consent.ts";
import { installedAs, installedExtensionFolder, type InstalledLanguage, isSystemHere, languagesHere, systemsHere, unreadSystemWhy, usable } from "./here.ts";
import type { PackageResult } from "./result.ts";

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

/** Installs a package on this computer and adds it to the campaign (D-27, D-428, D-441): ours, or another once the player wants it; an extension, for this game. */
export async function installed(root: string, context: Context, name: string): Promise<PackageResult>
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
        const message = `${described.failed}. Nothing changed${asked === name ? "" : `: ${name} alone means ${asked}, one of RPG Engine's; another's is named with its scope, or as npm:${name} without one`}.`;
        throw isLocalSpec(asked)
            ? new Refusal(message, "not-on-computer", { name })
            : described.missing === true
            ? new Refusal(message, "not-found", { name })
            : new Refusal(message, "npm-failed", { name, why: described.failed });
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
        throw described.kind === undefined
            ? new Refusal(
                `${described.name} is not a package for RPG Engine: its package.json does not say "rpg-engine": {"kind": "extension"}, or {"kind": "system"} for a game system. Nothing changed.`,
                "not-ours",
                { name: described.name },
            )
            : new Refusal(`${described.name} is a package of kind ${described.kind}: for now extensions, game systems and adventures are installed this way. Nothing changed.`, "other-kind", {
                name: described.name,
            });
    }

    const unread = apiProblem(described.api, "extension");

    if (unread !== undefined) {
        throw apiRefusal(described, unread);
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
            throw new Refusal(`${described.name} could not be installed: ${why}. Nothing changed in the campaign.`, "install-failed", { name: described.name, why });
        }

        // npm wrote there: what the call read of those folders is read again, and the code anew.
        (context.extensionFolders ?? []).forEach((folder) => files().refresh(folder));
        packagesInstalled();
    }

    // By its whole name: another's skies is not ours, nor ours another's.
    const installed = installedAs(context, described.name);
    const extension = "extension" in installed ? installed.extension : undefined;

    // What npm installed is not what the player said yes to, or no extension: it goes off this computer again, and never runs.
    if (extension === undefined || extension.version !== described.version) {
        await packages.uninstall(described.name);
        (context.extensionFolders ?? []).forEach((folder) => files().refresh(folder));
        const why = extension !== undefined
            ? `it is the version ${extension.version}, not the ${described.version} the player said yes to`
            : "unread" in installed
            ? `its extension does not read: ${installed.unread}`
            : "no extension of that name is where npm put it";
        throw new Refusal(`npm installed ${described.name}, but ${why}: RPG Engine cannot use it, and took it off this computer again. Nothing changed in the campaign.`, "taken-off", {
            name: described.name,
            why,
        });
    }

    // The player's yes holds for this version and these files, on this computer: its code runs on the server and in the page (D-478, D-510).
    if (!isVerified(described.name, local) && !extension.linked) {
        recordConsent(extension.folder, extension.package, extension.version);
    }

    const system = readTextSetting(root, "system");

    if (extension.needs.system !== undefined && comparableText(extension.needs.system) !== comparableText(system ?? "")) {
        throw new Refusal(
            `${extension.name} is installed on this computer, but it is for the game system ${extension.needs.system}, and the campaign plays ${system ?? "none"}: the campaign does not use it.`,
            "other-system",
            { name: extension.name, system: extension.needs.system, plays: system ?? "" },
        );
    }

    // Its state, widgets and pictures go by its name, which the system's would share (D-514).
    if (comparableText(extension.name) === comparableText(system ?? "")) {
        throw new Refusal(
            `${extension.name} is installed on this computer, but it has the name of the game system the campaign plays: the campaign does not use it. Nothing changed in the campaign.`,
            "system-name",
            { name: extension.name },
        );
    }

    const others = Object.keys(listedExtensions(root)).filter((other) => other !== extension.package && shortName(other) === extension.name);

    if (others.length > 0) {
        throw new Refusal(`The campaign uses ${others[0]}, with the same name, ${extension.name}: take it away with package remove ${others[0]} first. Nothing changed in the campaign.`, "same-name", {
            name: extension.name,
            other: others[0],
        });
    }

    // Its code is checked before the campaign lists it: a package that would not work is never added.
    const commands = runsCode(extension)
        ? await packageCommandNames(extension, context).catch((error: unknown) => {
            const why = error instanceof Error ? error.message : String(error);
            throw new Refusal(`The code of ${extension.package} cannot be used: ${why}. Nothing changed in the campaign.`, "code-broken", { name: extension.package, why });
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

/** The npm names of ours a name alone may be, with its version if given: an extension's, then a game system's; a system of the engine's list first (D-513). */
function ourNames(name: string): [string, string]
{
    const names: [string, string] = [`${verifiedScope}${name}`, `${verifiedScope}system-${name}`];
    const bare = name.replace(/(?<=.)@[^@/]*$/, "");
    return ourSystems.some((system) => comparableText(system.name) === comparableText(bare)) ? [names[1], names[0]] : names;
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
        throw apiRefusal(described, unread);
    }

    const taken = systemsHere(root, context).find((one) => comparableText(one.name) === comparableText(named) && one.package !== described.name);

    if (taken !== undefined) {
        throw new Refusal(
            `There is already a game system named ${taken.name} on this computer${taken.package === undefined ? ", the engine's own" : `, from ${taken.package}`}: ${described.name} would take its name. Nothing changed.`,
            "system-taken",
            { name: described.name, system: taken.name },
        );
    }

    if (!isVerified(described.name, local)) {
        await playerYes(context, local ? name : `${described.name} ${described.version}`, described.name, local, local ? ` (${described.name} ${described.version})` : "");
    }

    const why = await (context.packages as NonNullable<Context["packages"]>).install(spec);

    if (why !== undefined) {
        throw new Refusal(`${described.name} could not be installed: ${why}. Nothing changed.`, "install-failed", { name: described.name, why });
    }

    [...context.systemFolders, ...(context.extensionFolders ?? [])].forEach((folder) => files().refresh(folder));
    const installed = installedExtensionFolder(context, described.name);

    // The player's yes holds for this version and these files: its code runs at the next start of the game's server (D-478, D-511).
    if (!isVerified(described.name, local) && !local && installed !== undefined) {
        recordConsent(installed, described.name, described.version);
    }

    const system = systemsHere(root, context).find((one) => one.package === described.name);

    if (system === undefined) {
        throw new Refusal(`${described.name} was installed, but ${unreadSystemWhy(installed, described.name)}. Uninstall it with package uninstall ${described.name}.`, "system-unread", {
            name: described.name,
        });
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

/**
 * Installs a language package on this computer (D-485 (3)): texts the dashboard shows, never code, so no yes is asked; refused, and taken off again, when its
 * phrases lose a {name} or turn the order of a text. It takes the place of another package of the same language.
 */
async function languageInstalled(root: string, context: Context, spec: string, described: PackageInfo): Promise<PackageResult>
{
    if (described.code === true || described.dependencies === true) {
        throw new Refusal(`${described.name} says it is a language, and brings code or needs other packages: a language package is texts only. Nothing changed.`, "language-code", {
            name: described.name,
        });
    }

    const before = installedLanguages(context.extensionFolders ?? []);
    const packages = context.packages as NonNullable<Context["packages"]>;
    const why = await packages.install(spec);

    if (why !== undefined) {
        throw new Refusal(`${described.name} could not be installed: ${why}. Nothing changed.`, "install-failed", { name: described.name, why });
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
        const why = checked.problems.join("; ");
        const message = `${described.name} cannot be used: ${why}. ${back === undefined ? "It was taken off this computer." : `Version ${back} stays.`}`;
        throw back === undefined ? new Refusal(message, "language-refused", { name: described.name, why }) : new Refusal(message, "language-kept", { name: described.name, why, version: back });
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

/** The dashboard's phrases, by their English, as its curated Italian lists them all; none where the built page is not here. */
function pagePhrases(context: Context): Record<string, string>
{
    try {
        return JSON.parse(files().text(join(context.pageFolder ?? "", "i18n", "it.json")) ?? "{}") as Record<string, string>;
    } catch {
        return {};
    }
}

/** A package made for an API this engine does not read: one newer than the engine, which an update of the engine reads, or one older, which a newer version of it fixes. */
function apiRefusal(described: PackageInfo, unread: string): Refusal
{
    const newer = described.api !== undefined && described.api > packageApi;
    return new Refusal(`${described.name} ${described.version} cannot be used, because ${unread}. Nothing changed.`, newer ? "engine-too-old" : "package-too-old", {
        name: described.name,
        version: described.version,
    });
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
