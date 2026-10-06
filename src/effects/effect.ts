import { comparableText } from "../core/text.ts";

/**
 * When an effect ends (EFF-2): at a game date, written as the time module reads it; at the start of someone's turn in a round of the scene;
 * when the scene ends; or at an occasion of the game system, such as long rest, which only its recipe brings (DAT-5).
 */
export type EffectEnd = { date: string; } | { round: number; turn: string; } | { scene: true; } | { occasion: string; };

/** An effect on whoever has it (D-123, D-132): its name, who keeps it alive (D-138), the values it gives for a while, and when it ends, if it does. */
export interface Effect
{
    name: string;
    /** Who keeps it alive, such as a character concentrating on it, as written: a link to a page, or the name of a copy. */
    by?: string;
    /** Temporary values, by field, as written: [["ac", "15"]]. */
    values: [string, string][];
    end?: EffectEnd;
}

// "Scudo della fede (by: [[Lena]], ac: 15) until day 2, 14:20": a name, values in brackets, an end; the brackets and the end may be missing.
const linePattern = /^(.+?)(?:\s+\(([^()]*)\))?(?:\s+until\s+(.+))?$/i;
const roundPattern = /^round\s+(\d{1,9})\s*,\s*(.+)$/i;
const roundsPattern = /^(\d{1,4})\s*rounds?$/i;
const sceneEnd = "scene end";

/** The effect a line of the effects field writes (EFF-1); or why it is not one. */
export function readEffect(line: string): { effect: Effect; } | { problem: string; }
{
    const match = linePattern.exec(line.trim());

    if (match === null) {
        return { problem: `"${line}" is not an effect: write its name, then its values in brackets and its end, such as Scudo della fede (ac: 15) until day 2, 14:20.` };
    }

    const [, written, valuesText, endText] = match;
    const values = valuesText === undefined ? [] : readValues(valuesText);
    // Brackets without values belong to the name, as in Forma (orso).
    const name = values === undefined ? `${written} (${valuesText})` : written;

    if (/\buntil\b/i.test(name)) {
        return { problem: `"${line}" has "until" in its name: write the end after the name and the values, such as ${name.replace(/\s*\(?\s*\buntil\b.*$/i, "")} until day 2, 14:20.` };
    }

    const pairs = values ?? [];
    const keeper = pairs.find(([field]) => comparableText(field) === "by");
    const effect: Effect = { name, ...(keeper === undefined ? {} : { by: keeper[1] }), values: pairs.filter((pair) => pair !== keeper) };
    return endText === undefined ? { effect } : withEnd(effect, endText);
}

/**
 * The effects a field holds: one line, or a list of lines; an empty field holds none. Names are unique on a page (EFF-1).
 * A line written in Obsidian without quotes, which YAML reads as "name (field": "value) until …", is read as the line it was.
 */
export function readEffects(value: unknown): { effects: Effect[]; } | { problem: string; }
{
    if (value === undefined || value === null || (typeof value === "string" && value.trim() === "")) {
        return { effects: [] };
    }

    const lines = (Array.isArray(value) ? value : [value]).map(asLine);

    if (lines.some((line) => line === undefined)) {
        return { problem: "effects must be a list of lines of text, such as Scudo della fede (ac: 15) until day 2, 14:20." };
    }

    const effects: Effect[] = [];

    for (const line of (lines as string[]).filter((text) => text.trim() !== "")) {
        const read = readEffect(line);

        if ("problem" in read) {
            return read;
        }

        if (effects.some((effect) => sameName(effect.name, read.effect.name))) {
            return { problem: `The effect ${read.effect.name} is written twice: keep one.` };
        }

        effects.push(read.effect);
    }

    return { effects };
}

/** An effect as its line is written (EFF-1), with who keeps it first among its values. */
export function formatEffect(effect: Effect): string
{
    const pairs: [string, string][] = [...(effect.by === undefined ? [] : [["by", effect.by] as [string, string]]), ...effect.values];
    const values = pairs.length === 0 ? "" : ` (${pairs.map(([field, value]) => `${field}: ${value}`).join(", ")})`;
    return `${effect.name}${values}${effect.end === undefined ? "" : ` until ${formatEnd(effect.end)}`}`;
}

/** An end as written: day 2, 14:20, round 12, Ennio, scene end, or long rest. */
export function formatEnd(end: EffectEnd): string
{
    return "date" in end ? end.date : "round" in end ? `round ${end.round}, ${end.turn}` : "occasion" in end ? end.occasion : sceneEnd;
}

/** How many rounds a duration such as 3 rounds or 1 round gives; undefined for anything else. */
export function readRounds(text: string): number | undefined
{
    const match = roundsPattern.exec(text.trim());
    const rounds = match === null ? 0 : Number(match[1]);
    return rounds > 0 ? rounds : undefined;
}

/** Whether a duration is the scene itself: the effect ends when the scene does. */
export function isSceneDuration(text: string): boolean
{
    return comparableText(text.trim()) === "scene";
}

/** The effects with one added, as the newest: an effect with the same name is replaced (EFF-3, EFF-4). */
export function withEffect(effects: Effect[], effect: Effect): Effect[]
{
    return [...effects.filter((other) => !sameName(other.name, effect.name)), effect];
}

/** Who keeps an effect alive, by name: [[Lena]] and Lena are the same; undefined when no one does. */
export function keeperOf(effect: Effect): string | undefined
{
    return effect.by === undefined ? undefined : pageName(effect.by);
}

/** The effect with this name, ignoring case and how accents are written. */
export function effectNamed(effects: Effect[], name: string): Effect | undefined
{
    return effects.find((effect) => sameName(effect.name, name));
}

/** Whether an effect counted in rounds has ended when the turn passes to `turn` in `round` (EFF-9): at its turn in its round, at the start of its round when that one is no longer in the order, a round later anyway. */
export function endsAtTurn(end: { round: number; turn: string; }, round: number, turn: string, order: string[]): boolean
{
    if (round !== end.round) {
        return round > end.round;
    }

    return sameName(turn, end.turn) || !order.some((name) => sameName(name, end.turn));
}

function withEnd(effect: Effect, endText: string): { effect: Effect; } | { problem: string; }
{
    const text = endText.trim();

    if (comparableText(text) === sceneEnd) {
        return { effect: { ...effect, end: { scene: true } } };
    }

    const round = roundPattern.exec(text);

    if (round === null) {
        // A date always has a number in it; an end without one is an occasion, such as long rest (DAT-5).
        return { effect: { ...effect, end: /\d/.test(text) ? { date: text } : { occasion: text } } };
    }

    return Number(round[1]) < 1 ? { problem: `"${endText}" is not an end: rounds start from 1.` } : { effect: { ...effect, end: { round: Number(round[1]), turn: pageName(round[2]) } } };
}

/** "ac: 15, speed: 40 ft" as pairs; undefined when the text is not written as values. */
function readValues(text: string): [string, string][] | undefined
{
    const pairs = text.split(/\s*,\s*(?=[^,:]+:)/).map((part) => {
        const separator = part.indexOf(":");
        return separator <= 0 ? undefined : ([part.slice(0, separator).trim(), part.slice(separator + 1).trim()] as [string, string]);
    });
    return pairs.length === 0 || pairs.some((pair) => pair === undefined || pair[0] === "" || pair[1] === "") ? undefined : (pairs as [string, string][]);
}

/** An item of the effects field as a line: text, or the map YAML makes of a line written without quotes. */
function asLine(item: unknown): string | undefined
{
    if (typeof item === "string") {
        return item;
    }

    const entries = item !== null && typeof item === "object" && !Array.isArray(item) ? Object.entries(item) : [];
    return entries.length === 1 && typeof entries[0][1] !== "object" ? `${entries[0][0]}: ${String(entries[0][1])}` : undefined;
}

/** A name as a link or a turn writes it: [[Annegato 1]] and Annegato 1 are the same. */
function pageName(text: string): string
{
    return text.trim().replace(/^\[\[(.*?)(?:\|.*)?\]\]$/, "$1").trim();
}

function sameName(first: string, second: string): boolean
{
    return comparableText(first.trim()) === comparableText(second.trim());
}
