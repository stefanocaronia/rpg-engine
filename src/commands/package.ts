import { z } from "zod";
import { changeExtensions, readTextSetting, requireCampaign } from "../campaign/index.ts";
import type { Context, PackageInfo } from "../core/context.ts";
import { appendLogEntry } from "../core/log.ts";
import { defineCommand } from "../core/registry.ts";
import { files } from "../core/store.ts";
import { comparableText } from "../core/text.ts";
import { type Extension, extensionApi, findExtension, installedExtensions, isFolderSpec, isVerified, readExtension, shortName, verifiedScope } from "../extensions/index.ts";
import { chooseAnswer } from "./ask.ts";
import { listedExtensions, runsCode } from "./game-extension-list.ts";
import { extensionCommandNames, packagesInstalled } from "./game-extensions.ts";
import { campaignMode } from "./game-mode.ts";
import { newDatedLogEntry } from "./game-time.ts";
import { campaignWorld } from "./game-world.ts";

type PackageResult =
    | { kind: "list"; installed: Listed[]; listedMissing: string[]; available: PackageInfo[]; searchFailed?: string; }
    | { kind: "installed"; extension: Extension; verified: boolean; commands: string[]; codeLeftOut: boolean; already: boolean; part?: string; tools: string; }
    | { kind: "removed"; name: string; };

/** A package on this computer as package list gives it; broken when it does not read. */
type Listed = { name: string; version: string; verified: boolean; used: boolean; } | { name: string; broken: string; };

export const packageCommand = defineCommand({
    name: "package",
    description: "Install, list or remove the packages of the campaign: extensions such as weather, from npm. "
        + "list says those on this computer, those the campaign uses and those npm has. install adds one to this computer and to the campaign, only once the player wants it; "
        + "one not published by RPG Engine (@rpgengine/…) is someone else's: the player is asked on their dashboard or in a form, or installs it from their terminal. "
        + "remove takes one out of the campaign. Example: package install weather.",
    group: "campaign",
    positionals: ["action", "name"],
    slow: true,
    input: z.object({
        action: z.enum(["list", "install", "remove"]).describe("list, install or remove"),
        name: z.string().optional().describe("the package: its name alone for one of ours, such as weather; another's npm name with its scope, or npm:name without one, its version if wanted; or a folder on this computer"),
        "accept-risk": z.boolean().optional().describe("on the command line only: the player's own yes to a package not published by RPG Engine, at their own risk"),
    }),

    async run(input, context): Promise<PackageResult>
    {
        const root = requireCampaign(context.folder);

        if (input.action === "list") {
            return await listed(root, context);
        }

        const name = input.name?.trim();

        if (name === undefined || name === "") {
            throw new Error(`Give the package to ${input.action}, such as package ${input.action} weather.`);
        }

        return input.action === "install" ? await installed(root, context, name, context.terminal === true && input["accept-risk"] === true) : removed(root, context, name);
    },

    format(result)
    {
        if (result.kind === "removed") {
            return `The campaign no longer uses ${result.name}: its commands and its parts of your instructions are gone; what it kept in the campaign stays, and comes back if it is installed again.`;
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

        const installedLines = result.installed.map((one) =>
            "broken" in one ? `${one.name} (broken: ${one.broken}; install it again)` : `${one.name} ${one.version}${one.verified ? "" : " (not verified)"}${one.used ? ", used by the campaign" : ""}`
        );
        const available = result.available.map((one) => `${shortName(one.name)} ${one.version}${one.name.startsWith(verifiedScope) ? "" : " (not verified)"}${one.description === undefined ? "" : `: ${one.description}`}`);
        return [
            `On this computer: ${installedLines.length === 0 ? "none" : installedLines.join("; ")}.`,
            result.listedMissing.length === 0 ? "" : `The campaign lists, not installed here: ${result.listedMissing.join(", ")}; install each with package install.`,
            result.searchFailed === undefined ? `On npm: ${available.length === 0 ? "none more" : available.join("; ")}.` : `npm could not be asked: ${result.searchFailed}.`,
        ].filter((line) => line !== "").join("\n");
    },
});

/** The packages on this computer, those the campaign lists and does not find, and those npm has besides, for this rpg-engine. */
async function listed(root: string, context: Context): Promise<PackageResult>
{
    const used = Object.keys(listedExtensions(root));
    const here = installedExtensions(context.extensionFolders ?? []).map((found): Listed => {
        try {
            const extension = readExtension(found.folder);
            return { name: extension.name, version: extension.version, verified: isVerified(extension.package, extension.linked), used: used.includes(extension.package) };
        } catch (error) {
            return { name: shortName(found.package), broken: error instanceof Error ? error.message : String(error) };
        }
    });
    const searched = context.packages === undefined ? { failed: "only the game's server and the command line reach npm" } : await context.packages.search();
    const isHere = (name: string): boolean => here.some((one) => one.name === shortName(name));
    return {
        kind: "list",
        installed: here,
        listedMissing: used.filter((name) => !isHere(name)),
        available: "failed" in searched ? [] : searched.filter((one) => !isHere(one.name) && one.kind === "extension" && one.api === extensionApi),
        ...("failed" in searched ? { searchFailed: searched.failed } : {}),
    };
}

/** Installs a package on this computer and adds it to the campaign (D-27, D-428, D-441): ours, or another once the player wants it; an extension, for this game. */
async function installed(root: string, context: Context, name: string, acceptRisk: boolean): Promise<PackageResult>
{
    const packages = context.packages;

    if (packages === undefined) {
        throw new Error("Packages are installed only by the game's server or the command line, which reach npm.");
    }

    // A name alone is one of ours: weather is @rpgengine/weather, never a stranger's of that name, which is given as npm:weather.
    const spec = name.startsWith("npm:") ? name.slice(4) : isFolderSpec(name) || name.startsWith("@") ? name : `${verifiedScope}${name}`;
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

    const folderSpec = isFolderSpec(spec);

    if (!isVerified(described.name, folderSpec)) {
        await playerYes(context, folderSpec ? name : described.name, acceptRisk, folderSpec);
    }

    const before = usable(context, described.name);
    const reinstall = before === undefined || before.version !== described.version || folderSpec;

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
async function playerYes(context: Context, name: string, acceptRisk: boolean, fromFolder: boolean): Promise<void>
{
    const warning = fromFolder
        ? `${name} is a folder of this computer, not a package published by RPG Engine: it is never verified, and RPG Engine takes no responsibility for it.`
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
