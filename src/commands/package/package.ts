// The package command: lists, asks npm, installs, removes, uninstalls and exports, and says what it did
import { z } from "zod";
import { requireCampaign } from "../../campaign/index.ts";
import type { Context } from "../../core/context.ts";
import { readsApi } from "../../core/packages/declarations.ts";
import { defineCommand } from "../../core/registry.ts";
import { comparableText } from "../../core/text.ts";
import { isNewerVersion } from "../../core/version.ts";
import { installedExtensions, readExtension, shortName } from "../../extensions/index.ts";
import { isVerified } from "../../packages/index.ts";
import { type AdventureExported, type AdventureInstalled, exportAdventure, installAdventure, installedAdventures, isAdventureSpec, readAdventureSpec, removeAdventure, storyTouching } from "../shared/books/adventures.ts";
import { listedExtensions } from "../shared/packages/extensions.ts";
import { issuesOf, languagesHere, systemsHere, usable } from "./here.ts";
import { installed } from "./install.ts";
import type { Available, Installed, PackageResult } from "./result.ts";
import { removed, uninstalled } from "./uninstall.ts";

export const packageCommand = defineCommand({
    name: "package",
    description: "The packages of the campaign: extensions such as weather, from npm, and adventures, as a .zip, a folder or a link with adventure.yaml. "
        + "list says those on this computer and those the campaign uses; available, those npm has, and updates; RPG Engine itself is updated by the player on the dashboard's Packages page, never by you. install adds or updates one, on this computer and in the campaign, "
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

/** When the code of the system just installed runs, for the campaign that plays it. */
function codeText(loaded: { runs: true; } | { why: string; } | undefined): string
{
    return loaded === undefined ? "Its code runs from the next start of the game's server." : "runs" in loaded ? "Its code runs from now." : `Its code does not run: ${loaded.why.replace(/\.$/, "")}.`;
}

/** Installs an adventure from a .zip, a folder or a link (D-483): no npm, no code, and the same refusals wherever it comes from. */
async function adventureInstalled(root: string, context: Context, spec: string): Promise<PackageResult>
{
    const adventure = await readAdventureSpec(spec, context);
    return { kind: "adventure-installed", ...installAdventure(root, context, adventure, spec) };
}

/** What the master hears of an export (ADV-7): the file, what it came from and what stayed out. */
function exportText(result: AdventureExported): string
{
    const out = [
        result.leftOut.characters.length === 0 ? "" : `the player characters (${result.leftOut.characters.join(", ")})`,
        result.leftOut.adventures.length === 0 ? "" : `the adventures it installed (${result.leftOut.adventures.join(", ")})`,
        // An adventure plays the system as it ships (SYS-11).
        result.leftOut.layers.length === 0 ? "" : `the campaign's layers over pages of the system (${result.leftOut.layers.join(", ")}), which play as the system writes them`,
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
