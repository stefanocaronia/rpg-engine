// The code of the campaign's extensions (D-63, D-428, D-436): its commands, what it does when time passes, and the API it reaches the game through.
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { parse, stringify } from "yaml";
import { z } from "zod";
import { campaignFileName, readTextSetting, requireCampaign } from "../campaign/index.ts";
import type { Context } from "../core/context.ts";
import { appendLogEntry } from "../core/log.ts";
import type { Problem } from "../core/problem.ts";
import { type Command, defineCommand } from "../core/registry.ts";
import { files } from "../core/store.ts";
import { rollDice } from "../dice/index.ts";
import type { Extension, ExtensionCode, ExtensionCommand, ExtensionEntry, Game, GameMoment } from "../extensions/index.ts";
import { environmentAt, isInParty, locate } from "../pages/index.ts";
import { formatGameDate, type GameDate } from "../time/index.ts";
import { campaignExtensions, runsCode } from "./game-extension-list.ts";
import { calendarDayOf, newDatedLogEntry, presentDate } from "./game-time.ts";
import { campaignWorld } from "./game-world.ts";

/** The folder of the campaign where an extension keeps its own files, its state among them (D-433, D-436). */
export const extensionsFolderName = "extensions";

/** The longest description a command of an extension may give the master, in words (D-441): it is read in every chat. */
const descriptionWords = 150;

/**
 * The commands of the campaign's extensions whose code may run (D-63, D-428, D-441), as commands of rpg-engine: each runs with the API of D-436 and gives the
 * master its text; by name, the package and version that give it, so that a server knows when another takes its place.
 */
export async function extensionCommands(root: string, context: Context, taken: string[]): Promise<{ commands: Command[]; sources: Record<string, string>; problems: Problem[]; }>
{
    const commands: Command[] = [];
    const sources: Record<string, string> = {};
    const problems: Problem[] = [];

    for (const extension of campaignExtensions(root, context).extensions) {
        try {
            const own: Command[] = [];

            for (const command of (await extensionCode(extension))?.commands ?? []) {
                own.push(asCommand(extension, command, [...taken, ...commands.map((other) => other.name), ...own.map((other) => other.name)]));
            }

            commands.push(...own);
            own.forEach((command) => (sources[command.name] = `${extension.package}@${extension.version}#${installs}`));
        } catch (error) {
            problems.push(codeProblem(extension, error));
        }
    }

    return { commands, sources, problems };
}

/** The names of an extension's commands, its code loaded and checked as the campaign would use it; it throws what keeps it from being used. */
export async function extensionCommandNames(extension: Extension, taken: string[]): Promise<string[]>
{
    const names: string[] = [];

    for (const command of (await extensionCode(extension))?.commands ?? []) {
        names.push(asCommand(extension, command, [...taken, ...names]).name);
    }

    return names;
}

/** Tells the loader npm has just installed: code installed again at the same version is read anew. */
export function packagesInstalled(): void
{
    installs += 1;
}

/** What keeps the code of the campaign's extensions from being used, for validate and status: it loads them. */
export async function extensionCodeProblems(root: string, context: Context, taken: string[]): Promise<Problem[]>
{
    return (await extensionCommands(root, context, taken)).problems;
}

/**
 * What the campaign's extensions say after time passed from one date to another, or as the game starts, when both are the same (D-436). The time has passed
 * whatever they do: one that fails says so in its line, never in place of the output.
 */
export async function timePassedLines(root: string, context: Context, from: GameDate, to: GameDate): Promise<string[]>
{
    const lines: string[] = [];

    for (const extension of campaignExtensions(root, context).extensions) {
        try {
            const code = await extensionCode(extension);

            if (code?.timePassed !== undefined) {
                lines.push(...await code.timePassed({ from: momentOf(root, context, from), to: momentOf(root, context, to) }, gameOf(root, context, extension)));
            }
        } catch (error) {
            // One line: the master reads it among others.
            const why = (error instanceof Error ? error.message : String(error)).split("\n")[0].replace(/[:.]$/, "");
            lines.push(`The extension ${extension.name} failed after the time passed: ${why}. The time did pass: do not advance again; validate says how to fix it.`);
        }
    }

    return lines;
}

/** A command of an extension as a command of rpg-engine, refused when its name is not the extension's or is taken, or its description is too long. */
function asCommand(extension: Extension, command: ExtensionCommand, taken: string[]): Command
{
    const name = command.name.trim();
    const words = command.description.split(/\s+/).length;

    if (name !== extension.name && !name.startsWith(`${extension.name}-`)) {
        throw new Error(`its command ${name} must be named ${extension.name}, or start with ${extension.name}-`);
    }

    if (taken.includes(name)) {
        throw new Error(`its command ${name} has the name of another command`);
    }

    if (words > descriptionWords) {
        throw new Error(`its command ${name} has a description of ${words} words, and ${descriptionWords} at most are read`);
    }

    return defineCommand({
        name,
        description: command.description,
        group: "game",
        input: command.input,
        readOnly: command.readOnly,
        positionals: command.positionals,
        async run(input, called)
        {
            const campaign = requireCampaign(called.folder);
            return { text: await command.run(input, gameOf(campaign, called, extension)) };
        },
        format: (result) => result.text,
    });
}

// The code of each extension, by its file and version, loaded once for the process: an import is never undone, a new version is another.
const loaded = new Map<string, Promise<ExtensionCode | undefined>>();
let installs = 0;

/**
 * The code of an extension, when it may run (D-441): its module's default export, given the kit. Where the engine itself runs from its source, as in the tests,
 * an extension that ships its source too is loaded from it.
 */
function extensionCode(extension: Extension): Promise<ExtensionCode | undefined>
{
    const source = join(extension.folder, "src", "index.ts");
    const entry = !runsCode(extension) ? undefined : import.meta.url.endsWith(".ts") && files().exists(source) ? source : extension.code;

    if (entry === undefined) {
        return Promise.resolve(undefined);
    }

    const url = `${pathToFileURL(entry).href}?v=${encodeURIComponent(extension.version)}&installs=${installs}`;
    const code = loaded.get(url) ?? import(url).then((module: { default?: unknown; }) => {
        if (typeof module.default !== "function") {
            throw new Error(`its code, ${entry}, has no default export that gives its commands`);
        }

        return (module.default as ExtensionEntry)({ z });
    });
    loaded.set(url, code);
    return code;
}

/** The game as an extension's code reaches it (D-436): the dice, the time, where the party is, its own state and the log; nothing else is written. */
function gameOf(root: string, context: Context, extension: Extension): Game
{
    const statePath = join(root, extensionsFolderName, extension.name, "state.yaml");
    return {
        roll: (notation) => {
            const rolled = rollDice(notation, { random: context.random });
            return { total: rolled.total, faces: rolled.faces, text: rolled.text };
        },
        now: () => {
            const now = presentDate(root);
            return now === undefined ? undefined : momentOf(root, context, now);
        },
        calendarDay: (day) => calendarDayOf(root, context, day),
        units: () => (readTextSetting(root, "units") === "imperial" ? "imperial" : "metric"),
        party: () => {
            const world = campaignWorld(root, context);
            const player = world.pages.find((page) => isInParty(page) && page.fields.role === "pc");
            return player === undefined
                ? undefined
                : {
                    places: locate(world, player).chain.filter((page) => page.type === "place").map((page) => page.name),
                    environment: Object.fromEntries(environmentAt(world, player).map(({ entry }) => [entry.name, entry.value])),
                };
        },
        state: {
            read: () => parse(files().text(statePath) ?? "null") as unknown,
            write: (value) => files().write(statePath, `# The state of the extension ${extension.package}, kept by its code.\n${stringify(value, { lineWidth: 0 })}`),
        },
        log: (text, visibility = "hidden") => appendLogEntry(root, newDatedLogEntry(root, context, "extension", visibility, { extension: extension.name, text })),
    };
}

/** A game date as the API gives it: as written, its day and minute, and its day of the calendar. */
function momentOf(root: string, context: Context, date: GameDate): GameMoment
{
    const calendar = calendarDayOf(root, context, date.day);
    return { date: formatGameDate(date), day: date.day, ...(date.minute === undefined ? {} : { minute: date.minute }), ...(calendar === undefined ? {} : { calendar }) };
}

function codeProblem(extension: Extension, error: unknown): Problem
{
    const why = error instanceof Error ? error.message : String(error);
    return { path: campaignFileName, message: `The code of the extension ${extension.package} cannot be used: ${why}. Its commands are left out.`, fix: `install it again, or another version, with package install ${extension.name}` };
}
