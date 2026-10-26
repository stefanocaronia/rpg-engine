// The code of the campaign's extensions (D-63, D-428, D-436): its commands, what it does when time passes, and the API it reaches the game through.
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { parse, stringify } from "yaml";
import { z } from "zod";
import { campaignFileName, readTextSetting, requireCampaign } from "../campaign/index.ts";
import type { CardAsked, Context } from "../core/context.ts";
import { realPath } from "../core/files.ts";
import { type Formula, parseFormula } from "../core/formula.ts";
import { appendLogEntry } from "../core/log.ts";
import type { Problem } from "../core/problem.ts";
import { type Command, defineCommand } from "../core/registry.ts";
import { files } from "../core/store.ts";
import { sameName, valueNamed } from "../core/text.ts";
import { rollDice } from "../dice/index.ts";
import { type ExtensionWords, extensionWords, wordIn } from "../extensions/index.ts";
import type { Asked, AskedRoll, ButtonWords, Extension, ExtensionCode, ExtensionCommand, ExtensionEntry, Game, GameMoment, GamePage, GameView, Rolled, RollFor, WidgetText, WidgetValue } from "../extensions/index.ts";
import { environmentAt, isCoreField, isInParty, isPlayerCharacter, locate, type Page, pagesWithNameOrAlias, playerCharacters, type World } from "../pages/index.ts";
import { findSystem } from "../systems/index.ts";
import { formatGameDate, type GameDate } from "../time/index.ts";
import { askedRoll, type AskResult, type Button, isCheckDice, type Told, tonesOf } from "./ask.ts";
import { effectiveFields } from "./effect-layer.ts";
import { campaignExtensions, runsCode } from "./game-extension-list.ts";
import { behindTheScreen, sealHiddenRoll } from "./game-master-rolls.ts";
import { readOpenScene } from "./game-scene.ts";
import { setFields, systemPage } from "./game-system-code.ts";
import { calendarDayOf, newDatedLogEntry, presentDate } from "./game-time.ts";
import { widgetCard } from "./game-widgets.ts";
import { campaignWorld, extensionLayer, playedLayers } from "./game-world.ts";
import { formulaValue } from "./worked-out.ts";

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
        waitsForPlayer: command.needsPlayer,
        forPlayer: command.player === true,
        async run(input, called)
        {
            const campaign = requireCampaign(called.folder);
            const asked: { card?: CardAsked; } = {};

            try {
                return { text: await command.run(input, gameOf(campaign, called, extension, asked)) };
            } finally {
                // The card of its last question, as it is after the dice, read once the call ends, however it ends (D-507).
                if (asked.card !== undefined) {
                    called.page?.cardEnded?.(asked.card);
                }
            }
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
export function extensionCode(extension: Extension): Promise<ExtensionCode | undefined>
{
    const source = join(extension.folder, "src", "index.ts");
    const entry = !runsCode(extension) ? undefined : import.meta.url.endsWith(".ts") && files().exists(source) ? source : extension.code;

    if (entry === undefined) {
        return Promise.resolve(undefined);
    }

    // By its real path, as Node would resolve it: a package linked from a folder of the player's is read from that folder, its own settings beside it.
    const url = `${pathToFileURL(realPath(entry)).href}?v=${encodeURIComponent(extension.version)}&installs=${installs}`;
    const code = loaded.get(url) ?? import(url).then((module: { default?: unknown; }) => {
        if (typeof module.default !== "function") {
            throw new Error(`its code, ${entry}, has no default export that gives its commands`);
        }

        return (module.default as ExtensionEntry)({ z });
    });
    loaded.set(url, code);
    return code;
}

/**
 * The game as an extension's code reaches it (D-436, D-505): what a widget reads, the dice, asking the player, its own state, the fields it adds and the log;
 * nothing else is written, and nothing once the call is stopped (ASK-9).
 */
function gameOf(root: string, context: Context, extension: Extension, asked: { card?: CardAsked; } = {}): Game
{
    const view = gameViewOf(root, context, extension);

    const live = (): void => {
        if (context.signal?.aborted === true) {
            throw new Error("The call was stopped: nothing more is written.");
        }
    };

    return {
        ...view,
        roll: (notation, by) => {
            if (by !== undefined) {
                live();
                return rollFor(root, context, notation, by, (text) => extensionText(root, extension, text));
            }

            const rolled = rollDice(notation, { random: context.random });
            return { total: rolled.total, faces: rolled.faces, text: rolled.text };
        },
        set: (page, values, why) => {
            live();
            setOwnFields(root, context, extension, page, values, why);
        },
        ask: async (wanted) => {
            live();
            const { who, question, check, notation } = wanted;
            const told = toldOf(root, context, extension, wanted);
            asked.card = told.card ?? asked.card;
            return askedOf(await askedRoll(root, context, askedQuestion(extensionText(root, extension, question), check, notation), [{ label: check.trim(), notation }], who, told));
        },
        state: {
            read: view.state.read,
            write: (value) => {
                live();
                files().write(statePath(root, extension), `# The state of the extension ${extension.package}, kept by its code.\n${stringify(value, { lineWidth: 0 })}`);
            },
        },
        log: (text, visibility = "hidden") => {
            live();
            appendLogEntry(root, newDatedLogEntry(root, context, "extension", visibility, { extension: extension.name, text }));
        },
    };
}

/** The game as a widget of an extension reads it (D-502, D-505): the time, where the party is and who is in it, a page, the scene and the extension's state. */
export function gameViewOf(root: string, context: Context, extension: Extension): GameView
{
    return {
        now: () => {
            const now = presentDate(root);
            return now === undefined ? undefined : momentOf(root, context, now);
        },
        calendarDay: (day) => calendarDayOf(root, context, day),
        units: () => (readTextSetting(root, "units") === "imperial" ? "imperial" : "metric"),
        party: () => {
            const world = campaignWorld(root, context);
            const player = playerCharacters(world).find(isInParty);
            return player === undefined
                ? undefined
                : {
                    places: locate(world, player).chain.filter((page) => page.type === "place").map((page) => page.name),
                    environment: Object.fromEntries(environmentAt(world, player).map(({ entry }) => [entry.name, entry.value])),
                    members: world.pages.filter(isInParty).map((page) => ({ name: page.name, pc: isPlayerCharacter(page) })),
                };
        },
        page: (name) => {
            const world = campaignWorld(root, context);
            const found = pagesWithNameOrAlias(world, name);
            return found.length === 1 ? gamePage(world, found[0]) : undefined;
        },
        scene: () => {
            const scene = readOpenScene(root).scene;
            return scene === undefined ? undefined : {
                title: scene.title,
                ...(scene.opened === undefined ? {} : { opened: scene.opened }),
                ...(scene.round === undefined ? {} : { round: scene.round }),
                ...(scene.turn === undefined ? {} : { turn: scene.turn }),
            };
        },
        state: { read: () => parse(files().text(statePath(root, extension)) ?? "null") as unknown },
    };
}

/** A game date as the API gives it: as written, its day and minute, and its day of the calendar. */
function momentOf(root: string, context: Context, date: GameDate): GameMoment
{
    const calendar = calendarDayOf(root, context, date.day);
    return { date: formatGameDate(date), day: date.day, ...(date.minute === undefined ? {} : { minute: date.minute }), ...(calendar === undefined ? {} : { calendar }) };
}

function statePath(root: string, extension: Extension): string
{
    return join(root, extensionsFolderName, extension.name, "state.yaml");
}

/** A page as an extension reads it (D-505): as a system's code does, with its fields as show gives them, effects and what the system works out included. */
function gamePage(world: World, page: Page): GamePage
{
    const fields = effectiveFields(world, page);
    return {
        ...systemPage(world, page),
        value: (field) => plainValue(valueNamed(fields, field)),
        formula: (text) => {
            let formula: Formula;

            try {
                formula = parseFormula(text);
            } catch (error) {
                throw new Error(`The formula ${text} does not read: ${error instanceof Error ? error.message : String(error)} Write it as the game system's computed fields are written.`);
            }

            return formulaValue(world, fields, formula);
        },
    };
}

/** A field's value as the API gives it: a number, text, or a list as text; undefined for anything else, as a map. */
function plainValue(value: unknown): number | string | string[] | undefined
{
    if (typeof value === "number" || typeof value === "string") {
        return value;
    }

    if (typeof value === "boolean") {
        return String(value);
    }

    return Array.isArray(value) ? value.map((item) => (typeof item === "object" && item !== null ? JSON.stringify(item) : String(item))) : undefined;
}

/**
 * Sets on a page only the fields an extension adds to the game system, as fields or counters, under their own names (D-505): another is refused with the names
 * of its own, as one the core, the system, an extension below it or the campaign declares too, so that no package reaches what another keeps, such as hit
 * points; and all of them while its additions are left out (CAM-3).
 */
function setOwnFields(root: string, context: Context, extension: Extension, name: string, values: Record<string, number | string>, why: string): void
{
    const { kept, refused } = playedLayers(root, context);
    const layer = extensionLayer(extension.name);

    if (refused.includes(layer)) {
        throw new Error(`What the extension ${extension.name} adds to the game system does not read, so the campaign plays without it and it sets none of its fields: validate says why. Nothing changed.`);
    }

    const below = kept.filter((other, index) => other.from === campaignFileName || index < kept.findIndex((mine) => mine.from === layer));
    const taken = [...Object.keys(findSystem(context.systemFolders, readTextSetting(root, "system") ?? "")?.fields ?? {}), ...below.flatMap((other) => declaredFields(other.data))];
    const declared = declaredFields(extension.adds);
    const own = declared.filter((field, index) => sameName(declared.slice(0, index), field) === undefined && sameName(taken, field) === undefined && !isCoreField(field));
    const others = Object.keys(values).filter((field) => sameName(own, field) === undefined);
    const odd = Object.entries(values).find(([, value]) => typeof value !== "string" && (typeof value !== "number" || !Number.isFinite(value)));

    if (others.length > 0) {
        const its = own.length === 0 ? "it adds none in its extension.yaml" : `its own are ${own.join(", ")}`;
        throw new Error(`The extension ${extension.name} sets only the fields it adds to the game system, and ${others.join(", ")} is not one of them: ${its}. Add it to fields or counters in its extension.yaml. Nothing changed.`);
    }

    if (odd !== undefined) {
        throw new Error(`The extension ${extension.name} gave ${odd[0]} the value ${String(odd[1])}: give a number or text. Nothing changed.`);
    }

    const world = campaignWorld(root, context);
    const found = pagesWithNameOrAlias(world, name);

    if (found.length !== 1) {
        throw new Error(`${found.length === 0 ? `No page alone is named ${name}` : `${found.length} pages are named ${name}`}: give the name of one page of the campaign. Nothing changed.`);
    }

    // Each under the name its extension.yaml gives it, whatever the case it came in.
    setFields(root, context, world, found[0], Object.fromEntries(Object.entries(values).map(([field, value]) => [sameName(own, field) ?? field, value])), why);
}

/** The fields and counters a layer of additions declares. */
function declaredFields(data: { fields?: unknown; counters?: unknown; }): string[]
{
    const names = (map: unknown): string[] => (typeof map === "object" && map !== null && !Array.isArray(map) ? Object.keys(map) : []);
    return [...names(data.fields), ...names(data.counters)];
}

/**
 * A roll for who, as the master's for them (D-287, D-505): a line in the log, in view for the party and behind the screen for anyone else as master-rolls says;
 * the player's physical dice, given as their faces, always in view.
 */
function rollFor(root: string, context: Context, notation: string, by: RollFor, words: (text: WidgetText) => string): Rolled
{
    const rolled = rollDice(notation, by.values === undefined ? { random: context.random } : { values: by.values });
    const physical = by.values !== undefined;
    const hidden = !physical && behindTheScreen(root, context, by.who);
    const checked = by.check === undefined ? {} : { check: by.check };
    const says = by.says === undefined ? {} : { says: words(by.says(rolled.faces)) };
    const tones = tonesOf(by.tones?.(rolled.faces), rolled.faces);
    const entry = newDatedLogEntry(root, context, "roll", hidden ? "hidden" : "public", {
        notation: rolled.notation,
        total: rolled.total,
        result: rolled.text,
        ...says,
        ...tones,
        why: by.why,
        who: by.who,
        ...checked,
        physical,
        dice: rolled.dice,
    });

    if (hidden) {
        sealHiddenRoll(entry, rolled.text, context);
    }

    appendLogEntry(root, entry);
    return { total: rolled.total, faces: rolled.faces, text: rolled.text, id: entry.id, hidden };
}

/**
 * What a roll an extension asks tells the page in its own words (D-507): its buttons and its rule translated, what its faces mean and how they turned out, and
 * the card of its widget, refused when the extension has no widget by that name.
 */
function toldOf(root: string, context: Context, extension: Extension, wanted: AskedRoll): Told
{
    const words = (text: WidgetText): string => extensionText(root, extension, text);
    const button = (given: ButtonWords): Button => (typeof given === "object" && "label" in given ? { name: words(given.label), note: words(given.note) } : { name: words(given) });
    const { roll, decline, rule, card, says, tones } = wanted;

    if (card !== undefined && !extension.widgets.some((widget) => widget.name === card.widget)) {
        const its = extension.widgets.length === 0 ? "it declares none in its extension.yaml" : `its own are ${extension.widgets.map((widget) => widget.name).join(", ")}`;
        throw new Error(`The extension ${extension.name} asks in the card of a widget ${card.widget} it does not have: ${its}. Nothing was asked.`);
    }

    return {
        ...(roll === undefined ? {} : { roll: button(roll) }),
        ...(decline === undefined ? {} : { decline: decline === false ? false : button(decline) }),
        ...(rule === undefined ? {} : { rule: words(rule) }),
        ...(card === undefined ? {} : { card: { widget: `${extension.name}.${card.widget}`, key: card.key, shows: () => widgetCard(root, context, extension, card.widget, card.key) } }),
        ...(says === undefined ? {} : { says: (faces: number[]) => words(says(faces)) }),
        ...(tones === undefined ? {} : { tones }),
    };
}

/** Words of an extension in the campaign's language, by its words as a widget's are, with their {names} filled; as written where its words lack them. */
function extensionText(root: string, extension: Extension, text: WidgetText): string
{
    let words: ExtensionWords | undefined;

    try {
        words = extensionWords(extension.folder, readTextSetting(root, "language") ?? extension.language);
    } catch {
        // Words that do not read leave the text as written, as validate says.
    }

    const { text: written, values } = typeof text === "string" ? { text, values: {} as Record<string, WidgetValue> } : text;
    return wordIn(words, written).replace(/\{(\w+)\}/g, (whole, name: string) => (Object.hasOwn(values, name) ? valueText(values[name]) : whole));
}

/** A value as plain text in a line of the log. */
function valueText(value: WidgetValue): string
{
    const unit = (given: string | undefined): string => (given === undefined ? "" : ` ${given}`);
    return typeof value === "number" || typeof value === "string" ? String(value) : "number" in value ? `${value.number}${unit(value.unit)}` : `${value.from}–${value.to}${unit(value.unit)}`;
}

/** The question of a roll asked, refused without words, a check's name or dice (ASK-2). */
function askedQuestion(question: string, check: string, notation: string): string
{
    if (question.trim() === "" || check.trim() === "" || !isCheckDice(notation)) {
        const dice = isCheckDice(notation) ? "" : `: ${notation} are no dice`;
        throw new Error(`Give ask the question, what is at stake either way, the check's name, such as Stealth, and its dice, such as 1d20+5${dice}. Nothing was asked.`);
    }

    return question.trim();
}

/** What ask answered, as an extension's code gets it. */
function askedOf(result: AskResult): Asked
{
    switch (result.kind) {
        case "roll":
            return { rolled: { id: result.id, total: result.total, faces: result.faces, text: result.text } };
        case "changed":
            return { declined: true };
        case "said":
            return { said: result.words };
        default:
            return { inWords: "asked" in result ? result.asked : "", physical: result.kind === "physical" || result.kind === "dice in words" };
    }
}

function codeProblem(extension: Extension, error: unknown): Problem
{
    const why = error instanceof Error ? error.message : String(error);
    return { path: campaignFileName, message: `The code of the extension ${extension.package} cannot be used: ${why}. Its commands are left out.`, fix: `install it again, or another version, with package install ${extension.name}` };
}
