// The dying (D-454, DIE-1–DIE-3): at 0 hit points a party member takes the system's condition, damage there counts a failure, damage past it as large as the
// maximum kills at once, and hit points regained end it all.
import type { Context } from "../core/context.ts";
import { appendLogEntry } from "../core/log.ts";
import { comparableText, valueNamed } from "../core/text.ts";
import { readCounter } from "../counters/index.ts";
import { withEffect } from "../effects/index.ts";
import { findPage, type World, writePage } from "../pages/index.ts";
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
        const parts = [...reset.map((field) => `${field} ${counted(field)} → 0`), ...(ended ? [`${dying.condition} ended`] : [])];
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
        // Damage while there counts a failure (DIE-2); a critical hit counts two, which only the master knows.
        const after = Math.min(failures + 1, dying.fails.most);
        setNumbers(root, context, world, name, { [dying.fails.field]: after }, `damage at ${dying.value} ${dying.field}`);
        lines.push(`${dying.fails.field} ${failures} → ${after}: damage at ${dying.value} ${dying.field}; a critical hit counts two, so add one more with change.`);
    }

    // Reaching the value brings the condition (DIE-1), and what that breaks of what one keeps.
    if (change.before > dying.value && dying.condition !== undefined && addCondition(root, context, name, dying.condition)) {
        const keeping = keepingConditionNote(campaignWorld(root, context), readOpenScene(root).scene, system, name, dying.condition);
        lines.unshift(`${name} is ${dying.condition} while ${dying.field} is ${dying.value}.`, ...(keeping === "" ? [] : [keeping]));
    }

    return lines;
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
