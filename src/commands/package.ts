import { z } from "zod";
import { changeExtensions, readTextSetting, requireCampaign } from "../campaign/index.ts";
import type { Context, PackageInfo } from "../core/context.ts";
import { appendLogEntry } from "../core/log.ts";
import { defineCommand } from "../core/registry.ts";
import { files } from "../core/store.ts";
import { comparableText } from "../core/text.ts";
import { type Extension, extensionApi, findExtension, installedExtensions, isLocalSpec, isTarball, isVerified, readExtension, shortName, verifiedScope } from "../extensions/index.ts";
import { chooseAnswer } from "./ask.ts";
import { listedExtensions, runsCode } from "./game-extension-list.ts";
import { extensionCommandNames, packagesInstalled } from "./game-extensions.ts";
import { campaignMode } from "./game-mode.ts";
import { newDatedLogEntry } from "./game-time.ts";
import { campaignWorld } from "./game-world.ts";

type PackageResult =
    | { kind: "list"; installed: Installed[]; missing: string[]; }
    | { kind: "available"; packages: Available[]; failed?: string; }
    | { kind: "installed"; extension: Extension; verified: boolean; commands: string[]; codeLeftOut: boolean; already: boolean; part?: string; tools: string; }
    | { kind: "removed"; name: string; }
    | { kind: "uninstalled"; name: string; wasUsed: boolean; };

/** A package on this computer, as list gives it to the master and to the dashboard; broken when it does not read (D-442). */
type Installed =
    | { name: string; package: string; version: string; title: string; about: string; verified: boolean; used: boolean; }
    | { name: string; package: string; broken: string; };

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
}

export const packageCommand = defineCommand({
    name: "package",
    description: "The packages of the campaign: extensions such as weather, from npm. "
        + "list says those on this computer and those the campaign uses; available, those npm has, and updates. install adds or updates one, on this computer and in the campaign, "
        + "only once the player wants it; one not published by RPG Engine (@rpgengine/…) is someone else's: the player is asked on their dashboard or in a form, or installs it from their terminal. "
        + "remove takes one out of the campaign; uninstall takes it off this computer. Example: package install weather.",
    group: "campaign",
    positionals: ["action", "name"],
    slow: true,
    input: z.object({
        action: z.enum(["list", "available", "install", "remove", "uninstall"]).describe("list, available, install, remove or uninstall"),
        name: z.string().optional().describe("the package: its name alone for one of ours, such as weather; another's npm name with its scope, or npm:name without one, its version if wanted; or a folder or a .tgz file on this computer"),
        "accept-risk": z.boolean().optional().describe("on the command line only: the player's own yes to a package not published by RPG Engine, at their own risk"),
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

        const name = input.name?.trim();

        if (name === undefined || name === "") {
            throw new Error(`Give the package to ${input.action}, such as package ${input.action} weather.`);
        }

        if (input.action === "install") {
            return await installed(root, context, name, context.terminal === true && input["accept-risk"] === true);
        }

        return input.action === "remove" ? removed(root, context, name) : await uninstalled(root, context, name);
    },

    format(result)
    {
        if (result.kind === "removed") {
            return `The campaign no longer uses ${result.name}: its commands and its parts of your instructions are gone; what it kept in the campaign stays, and comes back if it is installed again.`;
        }

        if (result.kind === "uninstalled") {
            return `${result.name} is off this computer${result.wasUsed ? ", and the campaign no longer uses it" : ""}: another campaign that lists it asks to install it again.`;
        }

        if (result.kind === "installed") {
            const { extension } = result;
            const what = `${extension.name} ${extension.version}${result.verified ? ", verified" : ", not verified: at the player's risk"}`;
            const said = [
                `${result.already ? `The campaign already uses ${what}` : `Installed ${what}, and the campaign uses it`}: ${extension.about}.`,
                result.codeLeftOut ? "Its code is not used: for now RPG Engine runs only its own packages' code, and its texts bring the rest." : "",
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
                return `${one.name} ${one.version}${one.verified ? "" : " (not verified)"}${by}${here}${one.description === undefined ? "" : `: ${one.description.replace(/\.$/, "")}`}`;
            });
            return `On npm: ${lines.length === 0 ? "none" : lines.join("; ")}.`;
        }

        const installedLines = result.installed.map((one) =>
            "broken" in one ? `${one.name} (broken: ${one.broken}; install it again)` : `${one.name} ${one.version}${one.verified ? "" : " (not verified)"}${one.used ? ", used by the campaign" : ""}`
        );
        return [
            `On this computer: ${installedLines.length === 0 ? "none" : installedLines.join("; ")}.`,
            result.missing.length === 0 ? "" : `The campaign lists, not installed here: ${result.missing.join(", ")}; install each with package install.`,
            "package available says those npm has, and updates.",
        ].filter((line) => line !== "").join("\n");
    },
});

/** The packages on this computer, and those the campaign lists and does not find there: at once, without npm (D-442). */
function listed(root: string, context: Context): PackageResult
{
    const used = Object.keys(listedExtensions(root));
    const here = installedExtensions(context.extensionFolders ?? []).map((found): Installed => {
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
            };
        } catch (error) {
            return { name: shortName(found.package), package: found.package, broken: error instanceof Error ? error.message : String(error) };
        }
    });
    return { kind: "list", installed: here, missing: used.filter((name) => !here.some((one) => one.package === name)) };
}

/** The extensions npm has for this rpg-engine's API, ours first, each with the version installed here and whether npm has a newer one (D-442). */
async function available(context: Context): Promise<PackageResult>
{
    const searched = context.packages === undefined ? { failed: "only the game's server and the command line reach npm" } : await context.packages.search();

    if ("failed" in searched) {
        return { kind: "available", packages: [], failed: searched.failed };
    }

    const here = installedExtensions(context.extensionFolders ?? []);
    const packages = searched.filter((one) => one.kind === "extension" && one.api === extensionApi).map((one): Available => {
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
            update: version !== undefined && newer(one.version, version),
        };
    });
    return { kind: "available", packages: packages.sort((first, second) => Number(second.verified) - Number(first.verified) || first.name.localeCompare(second.name)) };
}

/** Whether a version is newer than another, by its numbers: 0.2.0 after 0.1.10. */
function newer(version: string, than: string): boolean
{
    const numbers = (text: string): number[] => text.split(/[.+-]/).slice(0, 3).map((part) => Number.parseInt(part, 10) || 0);
    const [one, other] = [numbers(version), numbers(than)];
    const differs = one.findIndex((part, index) => part !== other[index]);
    return differs !== -1 && one[differs] > other[differs];
}

/** Installs a package on this computer and adds it to the campaign (D-27, D-428, D-441): ours, or another once the player wants it; an extension, for this game. */
async function installed(root: string, context: Context, name: string, acceptRisk: boolean): Promise<PackageResult>
{
    const packages = context.packages;

    if (packages === undefined) {
        throw new Error("Packages are installed only by the game's server or the command line, which reach npm.");
    }

    // A name alone is one of ours: weather is @rpgengine/weather, never a stranger's of that name, which is given as npm:weather.
    const spec = name.startsWith("npm:") ? name.slice(4) : isLocalSpec(name) || name.startsWith("@") ? name : `${verifiedScope}${name}`;
    const described = await packages.describe(spec);

    if ("failed" in described) {
        throw new Error(`${described.failed}. Nothing changed${spec === name ? "" : `: ${name} alone means ${spec}, one of RPG Engine's; another's is named with its scope, or as npm:${name} without one`}.`);
    }

    if (described.kind !== "extension") {
        throw new Error(
            described.kind === undefined
                ? `${described.name} is not a package for RPG Engine: its package.json does not say "rpg-engine": {"kind": "extension"}. Nothing changed.`
                : `${described.name} is a package of kind ${described.kind}: for now only extensions are installed this way. Nothing changed.`,
        );
    }

    if (described.api !== extensionApi) {
        throw new Error(`${described.name} ${described.version} is made for the extension API ${described.api ?? "none"}, and this RPG Engine reads the API ${extensionApi}: install a version made for it. Nothing changed.`);
    }

    const local = isLocalSpec(spec);
    const before = usable(context, described.name);

    if (!isVerified(described.name, local)) {
        // A file or a folder says what it holds, and when it takes the place of a copy from npm, which is one for the whole computer (D-452).
        const holds = local ? ` (${described.name} ${described.version}${described.author === undefined ? "" : `, by ${described.author}`})` : "";
        const replaces = local && before !== undefined && !before.linked ? ` It takes the place of ${before.package} ${before.version} from npm, in every campaign on this computer.` : "";
        await playerYes(context, local ? name : described.name, acceptRisk, local, holds, replaces);
    }

    // A copy from a file or a folder never stands for the one npm has: asked by its name, npm's comes back.
    const reinstall = before === undefined || before.version !== described.version || local || before.linked;

    if (reinstall) {
        const why = await packages.install(spec);

        if (why !== undefined) {
            throw new Error(`${described.name} could not be installed: ${why}. Nothing changed in the campaign.`);
        }

        // npm wrote there: what the call read of those folders is read again, and the code anew.
        (context.extensionFolders ?? []).forEach((folder) => files().refresh(folder));
        packagesInstalled();
    }

    const extension = usable(context, described.name);

    if (extension === undefined) {
        throw new Error(`${described.name} was installed, but RPG Engine cannot use it as an extension. Nothing changed in the campaign.`);
    }

    const system = readTextSetting(root, "system");

    if (extension.needs.system !== undefined && comparableText(extension.needs.system) !== comparableText(system ?? "")) {
        throw new Error(`${extension.name} is installed on this computer, but it is for the game system ${extension.needs.system}, and the campaign plays ${system ?? "none"}: the campaign does not use it.`);
    }

    const others = Object.keys(listedExtensions(root)).filter((other) => other !== extension.package && shortName(other) === extension.name);

    if (others.length > 0) {
        throw new Error(`The campaign uses ${others[0]}, with the same name, ${extension.name}: take it away with package remove ${others[0]} first. Nothing changed in the campaign.`);
    }

    // Its code is checked before the campaign lists it: a package that would not work is never added.
    const commands = runsCode(extension)
        ? await extensionCommandNames(extension, []).catch((error: unknown) => {
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

    return {
        kind: "installed",
        extension,
        verified,
        commands,
        codeLeftOut: extension.code !== undefined && !runsCode(extension),
        already,
        ...modePart(root, context, extension),
        tools: toolsNote(context),
    };
}

/**
 * The player's own yes to a package not ours (D-441): on the command line, --accept-risk they typed; in a chat, a button on their dashboard or in the host's
 * form, never the master's word. It throws when there is none.
 */
async function playerYes(context: Context, name: string, acceptRisk: boolean, local: boolean, holds = "", replaces = ""): Promise<void>
{
    const warning = local
        ? `${name}${holds} is ${isTarball(name) ? "a file" : "a folder"} of this computer, not a package published by RPG Engine: its code runs, it is never verified, and RPG Engine takes no responsibility for it.${replaces}`
        : `${name} is not published by RPG Engine: its texts are someone else's, and RPG Engine takes no responsibility for it.`;

    if (context.terminal === true) {
        if (!acceptRisk) {
            throw new Error(`${warning} To install it at your own risk: package install ${name} --accept-risk. Nothing changed.`);
        }

        return;
    }

    const answer = await chooseAnswer(context, `Install ${name}? ${warning}`, "A package not ours", ["Install it, at my risk", "Do not install it"]);

    if (answer === 0) {
        return;
    }

    if (answer === 1 || (typeof answer === "object" && answer !== null)) {
        throw new Error(`The player did not want ${name}. Nothing changed.`);
    }

    // Closed without an answer is no yes, never a reason to send the player to the terminal.
    if (answer === undefined) {
        throw new Error(`The player closed the question without a yes to ${name}. Nothing changed: ask again only if they bring it up.`);
    }

    throw new Error(`${warning} Only the player can say yes to it, and they cannot be asked here: tell them to install it from their terminal, in the campaign's folder, with rpg package install ${name} --accept-risk. Nothing changed.`);
}

/** The installed extension of this package, when it reads; undefined when it is missing or broken. */
function usable(context: Context, name: string): Extension | undefined
{
    try {
        return findExtension(context.extensionFolders ?? [], name);
    } catch {
        return undefined;
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
    const found = installedExtensions(context.extensionFolders ?? []).find((one) => one.package === name || comparableText(shortName(one.package)) === comparableText(name));

    if (found === undefined) {
        const here = installedExtensions(context.extensionFolders ?? []).map((one) => shortName(one.package));
        throw new Error(`${name} is not on this computer${here.length === 0 ? ": no package is" : `; these are: ${here.join(", ")}`}. Nothing changed.`);
    }

    if (packages === undefined) {
        throw new Error("Packages are uninstalled only by the game's server or the command line, which reach npm.");
    }

    const why = await packages.uninstall(found.package);

    if (why !== undefined) {
        throw new Error(`${found.package} could not be uninstalled: ${why}. Nothing changed.`);
    }

    (context.extensionFolders ?? []).forEach((folder) => files().refresh(folder));
    const listed = listedExtensions(root);
    const wasUsed = Object.hasOwn(listed, found.package);

    if (wasUsed) {
        changeExtensions(root, Object.fromEntries(Object.entries(listed).filter(([candidate]) => candidate !== found.package)));
    }

    appendLogEntry(root, newDatedLogEntry(root, context, "package-uninstalled", "public", { package: found.package }));
    return { kind: "uninstalled", name: shortName(found.package), wasUsed };
}
