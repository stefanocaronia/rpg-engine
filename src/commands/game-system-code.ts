// The glue between the engine and a game system's code (D-448): the game its hooks may read and change, and where the commands call them. A hook comes after
// the engine's own writes, each with its line in the log; one that fails, or code that is not loaded, is a line for the master, and the change stands.
import { readTextSetting } from "../campaign/index.ts";
import type { Context, SaveAsked } from "../core/context.ts";
import { appendLogEntry } from "../core/log.ts";
import { comparableText, valueNamed } from "../core/text.ts";
import { formatCounter, readCounter } from "../counters/index.ts";
import { rollDice } from "../dice/index.ts";
import { withEffect } from "../effects/index.ts";
import { concernsPlayer, isPartyMember, isPlayerCharacter, type Page, pagesWithName, type World, writePage } from "../pages/index.ts";
import type { CounterChange, GameSystem, RollMade, SystemGame, SystemHooks, SystemPage, SystemReader } from "../systems/index.ts";
import { effectiveFields, effectsOf } from "./effect-layer.ts";
import { saveEffects } from "./game-effects.ts";
import { behindTheScreen, sealHiddenRoll } from "./game-master-rolls.ts";
import { keepingConditionNote } from "./game-reminders.ts";
import { readOpenScene } from "./game-scene.ts";
import { newDatedLogEntry } from "./game-time.ts";
import { campaignSystem, campaignWorld } from "./game-world.ts";

/** What a system's code said after a command's change, and apart why it did not run or failed, which the caller adds to its notes, never deciding by it. */
export interface SystemSaid
{
    lines: string[];
    problem?: string;
}

/** All a system's code said, its problem last. */
export function allSaid(said: SystemSaid): string[]
{
    return said.problem === undefined ? said.lines : [...said.lines, said.problem];
}

/** After a counter of a page changed, as by change or the hit dice: the system's lines. */
export function systemCounterChanged(root: string, context: Context, change: CounterChange): SystemSaid
{
    return called(root, context, "this change", (hooks, game) => hooks.counterChanged?.(change, game) ?? []);
}

/** As someone's turn starts in a scene: the system's lines. */
export function systemTurnStarted(root: string, context: Context, who: string): SystemSaid
{
    return called(root, context, "this turn began", (hooks, game) => hooks.turnStarted?.({ who }, game) ?? []);
}

/** After a roll for someone was logged, never a hidden one: the system's lines. */
export function systemRolled(root: string, context: Context, roll: RollMade): SystemSaid
{
    return called(root, context, "this roll", (hooks, game) => hooks.rolled?.(roll, game) ?? []);
}

/** After an effect was added to a page, never to a copy: the system's lines. */
export function systemEffectAdded(root: string, context: Context, added: { page: string; effect: string; }): SystemSaid
{
    return called(root, context, "this effect", (hooks, game) => hooks.effectAdded?.(added, game) ?? []);
}

/** What the page draws of a question, as a death save, by the system's code; undefined when it says nothing, fails or is not there: ask asks as always. */
export function systemAsking(root: string, context: Context, question: { who: string; notations: string[]; }): SaveAsked | undefined
{
    const hooks = loadedHooks(campaignSystem(root, context), context);

    try {
        return typeof hooks === "string" || hooks === undefined ? undefined : hooks.asking?.(question, reader(root, context));
    } catch {
        return undefined;
    }
}

/** A hook called with the game: its lines; when the code is not loaded or fails, apart, a line that says so and what to do, the engine's change made all the same. */
function called(root: string, context: Context, after: string, call: (hooks: SystemHooks, game: SystemGame) => string[]): SystemSaid
{
    const system = campaignSystem(root, context);
    const hooks = loadedHooks(system, context);
    const byHand = "meanwhile apply its rules yourself, as its pages say";

    if (typeof hooks === "string") {
        return { lines: [], problem: `The system ${system?.name}'s code ${hooks}, so nothing of it followed ${after}; ${byHand}.` };
    }

    if (hooks === undefined) {
        return { lines: [] };
    }

    try {
        const lines = call(hooks, game(root, context));
        return Array.isArray(lines) ? { lines } : { lines: [], problem: `The system ${system?.name} gave no lines after ${after}: its hooks give a list. It is done all the same; ${byHand}.` };
    } catch (error) {
        const why = (error instanceof Error ? error.message : String(error)).split("\n")[0].replace(/[:.]$/, "");
        return { lines: [], problem: `The system ${system?.name} failed after ${after}: ${why}. It is done all the same; ${byHand}.` };
    }
}

/** The hooks of the campaign's system; why not, when it has code that is not loaded or could not load; undefined when it brings none. */
function loadedHooks(system: GameSystem | undefined, context: Context): SystemHooks | string | undefined
{
    if (system?.code !== true) {
        return undefined;
    }

    const loaded = context.systemCode?.[system.name];

    if (loaded === undefined) {
        return "is not loaded: start the MCP server again (/mcp in Claude Code), or open a new chat";
    }

    if ("refused" in loaded) {
        return loaded.refused;
    }

    return "problem" in loaded ? `cannot load (${loaded.problem}): install rpg-engine again, or run npm run build in its repository, then start the MCP server again` : (loaded.hooks as SystemHooks);
}

/** The game as a system's code reads it. */
function reader(root: string, context: Context): SystemReader
{
    return {
        page: (name) => {
            const world = campaignWorld(root, context);
            const found = pagesWithName(world, name);
            return found.length === 1 ? systemPage(world, found[0]) : undefined;
        },
        setting: (name) => readTextSetting(root, name),
        sameName: (one, other) => comparableText(one) === comparableText(other),
    };
}

/** The game as a system's code reads and changes it: each write with its line in the log, as the engine shows that page to the player. */
function game(root: string, context: Context): SystemGame
{
    return {
        ...reader(root, context),
        set: (name, values, why) => {
            const world = campaignWorld(root, context);
            const page = uniquePage(world, name);

            if (page !== undefined) {
                setFields(root, context, world, page, values, why);
            }
        },
        addEffect: (name, effect, why) => addEffect(root, context, name, effect, why),
        endEffect: (name, effect, why) => endEffect(root, context, name, effect, why),
        roll: (notation, by) => {
            const rolled = rollDice(notation, { random: context.random });
            // For anyone outside the party, hidden as the master-rolls setting says (D-287).
            const hidden = behindTheScreen(root, context, by.who);
            const entry = newDatedLogEntry(root, context, "roll", hidden ? "hidden" : "public", { notation: rolled.notation, total: rolled.total, result: rolled.text, why: by.why, who: by.who, physical: false, dice: rolled.dice });

            if (hidden) {
                sealHiddenRoll(entry, rolled.text, context);
            }

            appendLogEntry(root, entry);
            return { total: rolled.total, dice: rolled.dice, text: rolled.text };
        },
    };
}

/** A page as a system's code reads it: in the party or not, the player's or not, its counters with what its effects give, its effects. */
export function systemPage(world: World, page: Page): SystemPage
{
    const fields = effectiveFields(world, page);
    return {
        name: page.name,
        party: isPartyMember(page),
        pc: isPlayerCharacter(page),
        counter: (field) => {
            const counter = readCounter(valueNamed(fields, field));
            return counter === undefined ? undefined : { value: counter.value, ...(counter.max === undefined ? {} : { max: counter.max }) };
        },
        has: (effect) => effectsOf(page).some((one) => comparableText(one.name) === comparableText(effect)),
    };
}

/** The page by a name only it has. */
function uniquePage(world: World, name: string): Page | undefined
{
    const found = pagesWithName(world, name);
    return found.length === 1 ? found[0] : undefined;
}

/**
 * Sets fields on a page, numbers or text, a counter only numbers, keeping its maximum, each with its line in the log, public when the page concerns the player:
 * for a system's code and an extension's (D-505).
 */
export function setFields(root: string, context: Context, world: World, page: Page, values: Record<string, number | string>, why: string): void
{
    if (Object.keys(values).length === 0) {
        return;
    }

    // A counter takes numbers alone: text in it would read as no counter at all.
    const worded = Object.entries(values).find(([field, value]) => typeof value === "string" && valueNamed(world.system?.fields ?? {}, field) === "counter");

    if (worded !== undefined) {
        throw new Error(`${worded[0]} is a counter: give it a number, not ${worded[1]}. Nothing changed.`);
    }

    const before = effectiveFields(world, page);
    const written = Object.fromEntries(
        Object.entries(values).map(([field, value]) => {
            const own = readCounter(valueNamed(page.fields, field));
            return [field, typeof value !== "number" || own?.max === undefined ? value : formatCounter({ ...own, value })];
        }),
    );
    writePage(world, page.name, undefined, { set: written });
    const visibility = concernsPlayer(world, page) ? "public" : "hidden";

    for (const [field, after] of Object.entries(written)) {
        const was = valueNamed(before, field);
        const counter = readCounter(was);
        const shown = was === undefined ? (typeof after === "number" ? "0" : "none") : counter === undefined ? String(was) : formatCounter(counter);
        // A counter whose maximum the system works out, which the page does not write, reads with it after too.
        const now = typeof after === "number" && counter?.max !== undefined ? formatCounter({ value: after, max: counter.max }) : after;
        appendLogEntry(root, newDatedLogEntry(root, context, "counter-changed", visibility, { page: page.name, field, before: String(shown), after: String(now), why }));
    }
}

/** Adds an effect without end: the engine's notes on what it breaks of what one keeps; undefined when the page has it already. */
function addEffect(root: string, context: Context, name: string, effect: string, why: string): string[] | undefined
{
    const world = campaignWorld(root, context);
    const page = uniquePage(world, name);

    if (page === undefined || effectsOf(page).some((one) => comparableText(one.name) === comparableText(effect))) {
        return undefined;
    }

    const system = campaignSystem(root, context);
    const keeping = keepingConditionNote(world, readOpenScene(root).scene, system, page.name, effect);
    saveEffects(root, context, world, { page, copy: false }, withEffect(effectsOf(page), { name: effect, values: [] }));
    appendLogEntry(root, newDatedLogEntry(root, context, "effect-added", concernsPlayer(world, page) ? "public" : "hidden", { page: page.name, effect, why }));
    return keeping === "" ? [] : [keeping];
}

/** Ends an effect; whether the page had it. */
function endEffect(root: string, context: Context, name: string, effect: string, why: string): boolean
{
    const world = campaignWorld(root, context);
    const page = uniquePage(world, name);
    const effects = page === undefined ? [] : effectsOf(page);

    if (page === undefined || !effects.some((one) => comparableText(one.name) === comparableText(effect))) {
        return false;
    }

    saveEffects(root, context, world, { page, copy: false }, effects.filter((one) => comparableText(one.name) !== comparableText(effect)));
    appendLogEntry(root, newDatedLogEntry(root, context, "effect-ended", concernsPlayer(world, page) ? "public" : "hidden", { page: page.name, effect, why }));
    return true;
}
