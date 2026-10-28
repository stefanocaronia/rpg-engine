// The thresholds of a game system (D-184, DAT-3): the rule that a counter of the player character or of a companion touches when it changes.
import { readTextSetting } from "../../campaign/index.ts";
import { comparableText } from "../../core/text.ts";
import { readCounterText } from "../../counters/index.ts";
import type { GameSystem } from "../../systems/index.ts";
import { houseRules, ruleBlock, ruleTitled } from "./rules.ts";

/**
 * The notes of the thresholds that a change of a field touches: it reaches the value, even going beyond it, takes more while at it, leaves it, or goes past it,
 * as in "hp is at 0, 7 beyond: read rules "Dropping to 0 Hit Points"."; a value an effect gives says so. A threshold without a value gives its rule's text at
 * every change, a house rule first (DAT-6).
 */
export function thresholdNotes(
    root: string,
    system: GameSystem | undefined,
    field: string,
    change: { before: unknown; after: unknown; amount: { beyond?: number; }; },
    effect?: string,
): string[]
{
    if (system === undefined) {
        return [];
    }

    const before = readCounterText(String(change.before))?.value;
    const after = readCounterText(String(change.after))?.value;
    const beyond = Math.abs(change.amount.beyond ?? 0);
    const where = effect === undefined ? "" : ` in ${effect}`;

    return system.thresholds.filter((threshold) => comparableText(threshold.field) === comparableText(field)).flatMap((threshold) => {
        const read = `read rules "${threshold.rule}"`;

        if (threshold.value === undefined) {
            const rule = ruleTitled(root, system, threshold.rule);
            const source = rule?.source === houseRules ? "the house rules" : `the rules of ${system.name}`;
            return [rule === undefined ? `${field} changed: ${read}.` : `${field} changed: ${threshold.rule}, from ${source}:\n${ruleBlock(rule)}`];
        }

        if (before === undefined || after === undefined) {
            return [];
        }

        // Which side of the value a number is on: below, at it, or above.
        const side = (value: number): number => Math.sign(value - (threshold.value ?? 0));

        if (side(after) === 0 && side(before) !== 0) {
            return [`${field} is at ${threshold.value}${where}${beyond > 0 ? `, ${beyond} beyond` : ""}: ${read}.`];
        }

        if (side(after) === 0) {
            return beyond > 0 ? [`${field} is at ${threshold.value}${where} and took ${beyond} more: ${read}.`] : [];
        }

        if (side(before) === 0) {
            return [`${field} is no longer at ${threshold.value}${where}: ${read}.`];
        }

        return side(before) === side(after) ? [] : [`${field} went past ${threshold.value}${where}, from ${before} to ${after}: ${read}.`];
    });
}

/**
 * What a fall means, when the player character's own counter reaches the system's down value from above it (D-530): the lethality the player chose, and the
 * write that names what the saves allow after a death.
 */
export function fallNotes(root: string, system: GameSystem | undefined, name: string, field: string, change: { before: unknown; after: unknown; }): string[]
{
    const down = system?.down;
    const before = readCounterText(String(change.before))?.value;
    const after = readCounterText(String(change.after))?.value;

    if (down === undefined || comparableText(down.field) !== comparableText(field) || before === undefined || after === undefined || before <= down.value || after > down.value) {
        return [];
    }

    const lethality = readTextSetting(root, "lethality");
    const death = "If they die, write status=dead: it says what the saves allow.";
    const meanings: Record<string, string> = {
        narrative: "with lethality narrative, the character never dies of it.",
        epic: `with lethality epic, the character dies only when it matters. ${death}`,
        dice: `with lethality dice, the dice decide, as the rules say. ${death}`,
    };
    const meaning = lethality === undefined || !Object.hasOwn(meanings, lethality) ? `lethality is not set: agree with the player what a fall means, and set it with config. ${death}` : meanings[lethality];
    return [`${name} is down: ${meaning}`];
}
