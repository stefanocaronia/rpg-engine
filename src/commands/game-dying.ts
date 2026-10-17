// The dying (D-454, D-460, DIE-1–DIE-5): at 0 hit points a party member takes the system's condition and rolls its death saves, damage there counts a failure, damage past it as large as the
// maximum kills at once, and hit points regained end it all.
import { readSettings } from "../campaign/index.ts";
import type { Context, SaveAsked } from "../core/context.ts";
import { appendLogEntry } from "../core/log.ts";
import { comparableText, valueNamed } from "../core/text.ts";
import { formatCounter, readCounter } from "../counters/index.ts";
import { rollDice, type ThrownDie } from "../dice/index.ts";
import { withEffect } from "../effects/index.ts";
import { findPage, isPartyMember, type Page, pagesWithName, type World, writePage } from "../pages/index.ts";
import type { GameSystem } from "../systems/index.ts";
import { effectiveFields, effectsOf } from "./effect-layer.ts";
import { saveEffects } from "./game-effects.ts";
import { keepingConditionNote } from "./game-reminders.ts";
import { readOpenScene } from "./game-scene.ts";
import { newDatedLogEntry } from "./game-time.ts";
import { campaignWorld } from "./game-world.ts";

/** How a party member's counter moved: from and to, what it lost to damage, and its maximum. */
export interface DyingChange
{
    before: number;
    after: number;
    lost: number;
    max?: number;
}

/**
 * What the dying rule does after a party member's counter changed (DIE-1–DIE-3), written with its lines in the log: the condition when it reaches the value;
 * a failure for damage taken there, or all of them when what goes past is as large as the maximum; the counters back to 0 and the condition ended when it
 * rises above it. The lines that say it.
 */
export function dyingAfter(root: string, context: Context, system: GameSystem, name: string, change: DyingChange): string[]
{
    const dying = system.dying;
    const world = campaignWorld(root, context);
    const page = findPage(world, name);

    if (page === undefined || dying?.fails === undefined) {
        return [];
    }

    const fields = effectiveFields(world, page);
    const counted = (field: string): number => readCounter(valueNamed(fields, field))?.value ?? 0;

    // Above the value again: the counters back to 0, the condition ended (DIE-3).
    if (change.after > dying.value && change.before <= dying.value) {
        const reset = dying.show.filter((field) => counted(field) !== 0);
        setNumbers(root, context, world, name, Object.fromEntries(reset.map((field) => [field, 0])), `${dying.field} above ${dying.value}`);
        const ended = dying.condition !== undefined && endCondition(root, context, name, dying.condition);
        const stable = dying.save?.stable !== undefined && endCondition(root, context, name, dying.save.stable);
        const parts = [...reset.map((field) => `${field} ${counted(field)} → 0`), ...(ended ? [`${dying.condition} ended`] : []), ...(stable ? [`${dying.save?.stable} ended`] : [])];
        return parts.length === 0 ? [] : [`${name} is no longer dying: ${parts.join(", ")}.`];
    }

    if (change.after > dying.value) {
        return [];
    }

    const lines: string[] = [];
    const failures = counted(dying.fails.field);
    const past = change.lost - Math.max(change.before - dying.value, 0);

    // Damage past the value as large as the maximum kills at once (DIE-2).
    if (change.lost > 0 && change.max !== undefined && past >= change.max) {
        setNumbers(root, context, world, name, { [dying.fails.field]: dying.fails.most }, "instant death");
        lines.push(`${name} dies at once: ${past} past ${dying.value} is at least the maximum, ${change.max}; ${dying.fails.field} ${failures} → ${dying.fails.most}. Read rules ${dying.rules}.`);
    } else if (change.lost > 0 && change.before <= dying.value) {
        // Damage while there counts a failure (DIE-2); a critical hit counts two, which only the master knows. One stable is dying again (DIE-6).
        const after = Math.min(failures + 1, dying.fails.most);
        const save = dying.save;
        const wasStable = save !== undefined && counted(save.succeeds.field) >= save.succeeds.most;
        setNumbers(root, context, world, name, { [dying.fails.field]: after, ...(wasStable ? { [save.succeeds.field]: 0 } : {}) }, `damage at ${dying.value} ${dying.field}`);
        const unstable = wasStable && save.stable !== undefined && endCondition(root, context, name, save.stable);
        const again = wasStable ? ` ${name} is no longer stable: ${save.succeeds.field} ${save.succeeds.most} → 0${unstable ? `, ${save.stable} ended` : ""}; its death saves start again.` : "";
        lines.push(`${dying.fails.field} ${failures} → ${after}: damage at ${dying.value} ${dying.field}; a critical hit counts two, so add one more with change.${again}`);
    }

    // Reaching the value brings the condition (DIE-1), and what that breaks of what one keeps.
    if (change.before > dying.value && dying.condition !== undefined && addCondition(root, context, name, dying.condition)) {
        const keeping = keepingConditionNote(campaignWorld(root, context), readOpenScene(root).scene, system, name, dying.condition);
        lines.unshift(`${name} is ${dying.condition} while ${dying.field} is ${dying.value}.`, ...(keeping === "" ? [] : [keeping]));
    }

    return lines;
}

/** Whether a party member is dying now (DIE-4): its counter at the dying value, neither stable by its successes nor dead by its failures. */
export function isDying(world: World, system: GameSystem | undefined, page: Page): boolean
{
    const dying = system?.dying;

    if (dying?.save === undefined || dying.fails === undefined || !isPartyMember(page)) {
        return false;
    }

    const fields = effectiveFields(world, page);
    const counter = readCounter(valueNamed(fields, dying.field));
    const counted = (field: string): number => readCounter(valueNamed(fields, field))?.value ?? 0;
    return counter !== undefined && counter.value <= dying.value && counted(dying.save.succeeds.field) < dying.save.succeeds.most && counted(dying.fails.field) < dying.fails.most;
}

/**
 * The start of a dying party member's turn (DIE-5, D-460): the player character's death save is the player's moment, rolled with a button; anyone else's the
 * engine rolls now and writes, for the master to tell as the mentor setting asks. What the master reads; nothing for one who is not dying.
 */
export function dyingTurn(root: string, context: Context, system: GameSystem | undefined, page: Page): string
{
    const save = system?.dying?.save;

    if (save === undefined || !isDying(campaignWorld(root, context), system, page)) {
        return "";
    }

    const rules = save.rules === undefined ? "" : ` Read rules ${save.rules}.`;

    if (isPlayerCharacter(page)) {
        return `${page.name} is dying: the turn starts with their death save, the player's to roll: ask them, with ask, a check of ${save.dice}; the engine writes its outcome.${rules}`;
    }

    const rolled = rollDice(save.dice, { random: context.random });
    appendLogEntry(root, newDatedLogEntry(root, context, "roll", "public", { notation: rolled.notation, total: rolled.total, result: rolled.text, why: "death save", who: page.name, physical: false, dice: rolled.dice }));
    const lines = savedFrom(root, context, system, page.name, rolled);
    return `${page.name} is dying: the engine rolled its death save, ${rolled.text}. ${lines.join(" ")} ${tellingOf(readSettings(root).mentor)}${rules}`;
}

/** The death save the player rolled for their character, with ask or roll (DIE-4): its lines; none for anyone else, whose saves the engine rolls (DIE-5). */
export function deathSave(root: string, context: Context, system: GameSystem | undefined, name: string, roll: { notation: string; total: number; dice: ThrownDie[]; }): string[]
{
    // A name two pages share names no one: a free label of the roll, as roll takes it.
    const pages = pagesWithName(campaignWorld(root, context), name);
    return pages.length !== 1 || !isPlayerCharacter(pages[0]) ? [] : savedFrom(root, context, system, name, roll);
}

/**
 * The death save a question asks of a dying player character (DIE-4, D-460): every check its dice, as Tiro contro la morte 1d20; with its counters as they
 * stand, for the page to draw the moment. Undefined for any other question.
 */
export function deathSaveAsked(root: string, context: Context, system: GameSystem | undefined, who: string, notations: string[]): SaveAsked | undefined
{
    const dying = system?.dying;
    const save = dying?.save;
    const world = campaignWorld(root, context);
    const pages = pagesWithName(world, who);
    const page = pages.length === 1 ? pages[0] : undefined;
    const ofSave = (notation: string): boolean => save !== undefined && isSaveRoll(save.dice, notation);

    if (dying?.fails === undefined || save === undefined || page === undefined || !isPlayerCharacter(page) || !isDying(world, system, page)) {
        return undefined;
    }

    if (notations.length === 0 || !notations.every(ofSave)) {
        return undefined;
    }

    const fields = effectiveFields(world, page);
    const counted = (field: string): number => readCounter(valueNamed(fields, field))?.value ?? 0;
    return {
        sides: Number(save.dice.slice(2)),
        atLeast: save.atLeast,
        successes: { field: save.succeeds.field, value: counted(save.succeeds.field), most: save.succeeds.most },
        failures: { field: dying.fails.field, value: counted(dying.fails.field), most: dying.fails.most },
        ...(save.lowest === undefined ? {} : { lowest: save.lowest }),
        ...(save.highest === undefined ? {} : { highest: save.highest }),
    };
}

/** How the master tells a companion's death save (D-460): with the mentor off, the story alone, never naming it; else the roll in brackets, explained once in the tutorial. */
function tellingOf(mentor: string | undefined): string
{
    return mentor === "off"
        ? "Tell it in the story alone: never name the save or its roll."
        : `Tell it in a sentence, the roll in brackets${mentor === "tutorial" ? ", and the first time what a death save is" : ""}.`;
}

function isPlayerCharacter(page: Page): boolean
{
    return comparableText(String(page.fields.role ?? "")) === "pc";
}

/**
 * Whether a roll is a death save (DIE-4, playtest 08): the save's dice and maybe more dice, as a d4 of Bless, never a number added, as the sheet's initiative
 * or a skill adds.
 */
function isSaveRoll(dice: string, notation: string): boolean
{
    const compact = notation.toLowerCase().replace(/\s+/g, "");
    return compact.startsWith(dice) && compact.slice(dice.length).split(/(?=[+-])/).filter((term) => term !== "").every((term) => /^[+-]\d*d\d+$/.test(term));
}

/**
 * A death save rolled for a dying party member (DIE-4): a total at least the save's is a success, else a failure, as many as the save says on the die's lowest
 * face; its highest face brings the counter back, which ends the dying (DIE-3). The lines that say it; none when who rolled is not dying, or the dice are not
 * the save's.
 */
function savedFrom(root: string, context: Context, system: GameSystem | undefined, name: string, roll: { notation: string; total: number; dice: ThrownDie[]; }): string[]
{
    const dying = system?.dying;
    const save = dying?.save;
    const world = campaignWorld(root, context);
    const page = findPage(world, name);
    const sides = Number(save?.dice.slice(2));
    const natural = roll.dice.find((die) => die.sides === sides && die.dropped !== true)?.value;

    if (system === undefined || dying?.fails === undefined || save === undefined || page === undefined || !isDying(world, system, page) || natural === undefined) {
        return [];
    }

    if (!isSaveRoll(save.dice, roll.notation)) {
        return [];
    }

    const fields = effectiveFields(world, page);
    const counted = (field: string): number => readCounter(valueNamed(fields, field))?.value ?? 0;

    if (save.highest !== undefined && natural === sides) {
        const own = readCounter(valueNamed(page.fields, save.highest.field));

        if (own !== undefined) {
            const after = formatCounter({ ...own, value: save.highest.value });
            writePage(world, name, undefined, { set: { [save.highest.field]: after } });
            appendLogEntry(root, newDatedLogEntry(root, context, "counter-changed", "public", { page: name, field: save.highest.field, before: formatCounter(own), after, why: "death save" }));
            const back = dyingAfter(root, context, system, name, { before: dying.value, after: save.highest.value, lost: 0 });
            return [`${name}'s death save: ${natural}, the highest face: ${save.highest.field} ${formatCounter(own)} → ${after}.`, ...back];
        }
    }

    if (roll.total >= save.atLeast) {
        const before = counted(save.succeeds.field);
        const after = Math.min(before + 1, save.succeeds.most);
        setNumbers(root, context, world, name, { [save.succeeds.field]: after }, "death save");

        // The last success makes it stable, with the system's effect for it (DIE-6).
        if (after >= save.succeeds.most && save.stable !== undefined) {
            addCondition(root, context, name, save.stable);
        }

        const stable = after >= save.succeeds.most ? ` ${name} is stable: no more death saves, still ${dying.condition ?? "dying"} until it regains ${dying.field}.` : "";
        return [`${name}'s death save: ${roll.total}, a success; ${save.succeeds.field} ${before} → ${after}.${stable}`];
    }

    const before = counted(dying.fails.field);
    const lowest = natural === 1 ? (save.lowest ?? 1) : 1;
    const after = Math.min(before + lowest, dying.fails.most);
    setNumbers(root, context, world, name, { [dying.fails.field]: after }, "death save");
    const dead = after >= dying.fails.most ? ` ${name} dies: a moment of its own in the story.` : "";
    return [`${name}'s death save: ${roll.total}, ${lowest > 1 ? `the lowest face, ${lowest} failures` : "a failure"}; ${dying.fails.field} ${before} → ${after}.${dead}`];
}

/**
 * The effect of one made stable, given by the master as a companion's Medicine or a healer's kit stabilizes them (DIE-6): its successes full, its failures
 * gone, no more death saves. The line that says it; none for another effect, or one not dying.
 */
export function stabilized(root: string, context: Context, system: GameSystem | undefined, name: string, effect: string): string[]
{
    const dying = system?.dying;
    const save = dying?.save;

    if (dying?.fails === undefined || save?.stable === undefined || comparableText(effect) !== comparableText(save.stable)) {
        return [];
    }

    const world = campaignWorld(root, context);
    const page = findPage(world, name);

    if (page === undefined || !isDying(world, system, page)) {
        return [];
    }

    const fields = effectiveFields(world, page);
    const counted = (field: string): number => readCounter(valueNamed(fields, field))?.value ?? 0;
    const successes = counted(save.succeeds.field);
    const failures = counted(dying.fails.field);
    setNumbers(root, context, world, name, { [save.succeeds.field]: save.succeeds.most, [dying.fails.field]: 0 }, `${save.stable} given`);
    return [
        `${name} is stable: ${save.succeeds.field} ${successes} → ${save.succeeds.most}, ${dying.fails.field} ${failures} → 0; no more death saves, still ${dying.condition ?? "down"} until it regains ${dying.field}.`,
    ];
}

/** Writes plain numbers on a page, each with its line in the log. */
function setNumbers(root: string, context: Context, world: World, name: string, values: Record<string, number>, why: string): void
{
    const page = findPage(world, name);

    if (page === undefined || Object.keys(values).length === 0) {
        return;
    }

    const before = effectiveFields(world, page);
    writePage(world, name, undefined, { set: values });

    for (const [field, after] of Object.entries(values)) {
        const was = String(readCounter(valueNamed(before, field))?.value ?? 0);
        appendLogEntry(root, newDatedLogEntry(root, context, "counter-changed", "public", { page: name, field, before: was, after: String(after), why }));
    }
}

/** Adds the condition without an end, unless the page has it; whether it added it. */
function addCondition(root: string, context: Context, name: string, condition: string): boolean
{
    const world = campaignWorld(root, context);
    const page = findPage(world, name);

    if (page === undefined || effectsOf(page).some((effect) => comparableText(effect.name) === comparableText(condition))) {
        return false;
    }

    saveEffects(root, context, world, { page, copy: false }, withEffect(effectsOf(page), { name: condition, values: [] }));
    appendLogEntry(root, newDatedLogEntry(root, context, "effect-added", "public", { page: name, effect: condition }));
    return true;
}

/** Ends the condition when the page has it; whether it ended it. */
function endCondition(root: string, context: Context, name: string, condition: string): boolean
{
    const world = campaignWorld(root, context);
    const page = findPage(world, name);
    const effects = page === undefined ? [] : effectsOf(page);

    if (page === undefined || !effects.some((effect) => comparableText(effect.name) === comparableText(condition))) {
        return false;
    }

    saveEffects(root, context, world, { page, copy: false }, effects.filter((effect) => comparableText(effect.name) !== comparableText(condition)));
    appendLogEntry(root, newDatedLogEntry(root, context, "effect-ended", "public", { page: name, effect: condition, why: "hit points regained" }));
    return true;
}
