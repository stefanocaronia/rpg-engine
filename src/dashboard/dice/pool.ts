// The dice the tray throws by itself (D-284, D-337): as a notation, which of a kind count, and as the chat writes them. Pure, for the tray and its tests.
import type { ThrownDie } from "../data.ts";

/** Which dice of a kind count (D-337, D-397): the highest one alone or the lowest one alone, however many were thrown, as advantage keeps one of two. */
export type Keep = "highest" | "lowest";

// The dice of the tray, by their sides, from the top of its column: 100 is the d%, thrown as its tens and its units; the d20, the most thrown, is the nearest
// to the button.
export const trayDice = [100, 4, 6, 8, 10, 12, 20];

/** Whether the tray can throw these dice by itself: kinds it has, all counting or with the highest or the lowest one alone kept, as one of two dropped, and a
 * number; never a reroll, an explosion or more dice kept or dropped, which the engine alone makes, so that a check asking one keeps its button by hand (D-339,
 * D-380, D-397). */
export function trayThrows(dice: string): boolean
{
    const terms = dice.toLowerCase().replace(/\s+/g, "").replaceAll("−", "-").match(/[+-]?[^+-]+/g) ?? [];
    return terms.some((term) => term.includes("d")) && terms.every((term) => {
        const die = /^\+?(\d*)d(\d+|%)(k[hl]1?|d[hl]1?)?$/.exec(term);
        const kept = die?.[3] === undefined || die[3].startsWith("k") || die[1] === "2";
        return /^[+-]?\d+$/.test(term) || (die !== null && kept && trayDice.includes(die[2] === "%" ? 100 : Number(die[2])));
    });
}

/** A die's name, as the tray shows it: d20, and d% for the percentile. */
export function dieName(sides: number): string
{
    return sides === 100 ? "d%" : `d${sides}`;
}

/** The kinds' choices of which count, for those of two dice or more alone, but the d%. */
export function keptOf(pool: number[], keeps: Partial<Record<number, Keep>>): Partial<Record<number, Keep>>
{
    return Object.fromEntries(Object.entries(keeps).filter(([sides, keep]) => keep !== undefined && Number(sides) !== 100 && pool.filter((chosen) => chosen === Number(sides)).length >= 2));
}

/** The dice chosen as a notation, the biggest first, with which count and the modifier: 2d20kh1+1d6+3, 4d6dl1. */
export function notation(pool: number[], modifier: number, keeps: Partial<Record<number, Keep>>): string
{
    const kinds = [...new Set(pool)].sort((first, second) => second - first);
    const dice = kinds.map((sides) => {
        const count = pool.filter((chosen) => chosen === sides).length;
        const keep = keeps[sides];
        const kept = keep === undefined ? "" : keep === "highest" ? "kh1" : "kl1";
        return `${count}${dieName(sides)}${kept}`;
    }).join("+");
    return modifier === 0 ? dice : `${dice}${modifier > 0 ? "+" : "-"}${Math.abs(modifier)}`;
}

/** The dice thrown with the one that does not count dropped, for each kind whose highest or lowest count: the lowest or the highest of its faces. */
export function withDropped(dice: ThrownDie[], keeps: Partial<Record<number, Keep>>): ThrownDie[]
{
    const dropped = new Set(
        Object.entries(keeps).flatMap(([sides, keep]) => {
            const ofKind = dice.map((die, index) => ({ die, index })).filter(({ die }) => die.sides === Number(sides));
            const sorted = ofKind.toSorted((first, second) => (keep === "highest" ? first.die.value - second.die.value : second.die.value - first.die.value));
            // All but the last, the highest for the highest kept, the lowest for the lowest.
            return sorted.length < 2 ? [] : sorted.slice(0, -1).map(({ index }) => index);
        }),
    );
    return dice.map((die, index) => (dropped.has(index) ? { ...die, dropped: true } : die));
}

/**
 * The dice thrown with those a notation does not count dropped, as the system writes a better or a worse roll: 2d20kl1 keeps the lowest d20, 2d20dl1 drops it,
 * 4d6kh3 keeps the three highest; a kind it says nothing of counts whole.
 */
export function droppedBy(dice: ThrownDie[], written: string): ThrownDie[]
{
    const dropped = new Set(
        [...written.toLowerCase().matchAll(/\d*d(\d+)([kd])([hl])(\d*)/g)].flatMap(([, sides, rule, which, count]) => {
            const ofKind = dice.map((die, index) => ({ die, index })).filter(({ die }) => die.sides === Number(sides)).toSorted((first, second) => first.die.value - second.die.value);
            const many = Math.min(ofKind.length, count === "" ? 1 : Number(count));
            // From the lowest up: keeping the highest drops all but the top ones, dropping the lowest drops the bottom ones.
            const gone = rule === "k" ? (which === "h" ? ofKind.slice(0, ofKind.length - many) : ofKind.slice(many)) : which === "l" ? ofKind.slice(0, many) : ofKind.slice(ofKind.length - many);
            return gone.map(({ index }) => index);
        }),
    );
    return dice.map((die, index) => (dropped.has(index) ? { ...die, dropped: true } : die));
}

/** The total of dice thrown: the faces that count, the dropped ones left out, and the number added. */
export function keptTotal(dice: ThrownDie[], modifier: number): number
{
    return dice.reduce((sum, die) => sum + (die.dropped === true ? 0 : die.value), modifier);
}

/** The dice doubled, as a critical hit's damage: each die twice, never the number added. */
export function doubled(pool: number[]): number[]
{
    return pool.flatMap((sides) => [sides, sides]);
}

/** The dice thrown as the chat writes them: each kind's faces in brackets, a dropped one in parentheses, the biggest first, then the modifier. */
export function diceText(dice: ThrownDie[], modifier: number): string
{
    const kinds = [...new Set(dice.map((die) => die.sides))].sort((first, second) => Number(second) - Number(first));
    const faces = kinds.map((sides) => `[${dice.filter((die) => die.sides === sides).map((die) => (die.dropped === true ? `(${die.value})` : String(die.value))).join(", ")}]`).join(" + ");
    return modifier === 0 ? faces : `${faces} ${modifier > 0 ? "+" : "−"} ${Math.abs(modifier)}`;
}
