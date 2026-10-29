// Labels from the names of the fields, in English (D-273): "hit-dice-d8" reads "hit dice d8", "str-save" "STR save"; names in the campaign's language come later.
import { isolated, numberText, systemWord, t, timeText } from "./text.ts";

// The dice the page has a picture of: the d% as 100, the coin as 2.
const drawnDice = [2, 4, 6, 8, 10, 12, 20, 100];

/** A field's name as a label: its words apart, in capitals the short names, as ac, hp, or str which the system names Strength; age stays a word. */
export function fieldLabel(field: string, fields: ReadonlySet<string> = new Set()): string
{
    return systemWord("fields", field) ?? words(field).map((word) => (isShortName(word, fields) ? word.toUpperCase() : word)).join(" ");
}

/** A field's name in full, as a roll says it: the system's long name where its label is short, as Charisma for CHA; else its label. */
export function rollLabel(field: string, fields: ReadonlySet<string> = new Set()): string
{
    return systemWord("names", field) ?? phraseLabel(fieldLabel(field, fields));
}

/**
 * The dice of a notation, by their sides, with how many of each, in the order they come: 2d20kh1+5 is two d20, 1d20+1d4+3 a d20 and a d4, d% a d% (100), 4dF
 * four dF; numbers alone are not dice.
 */
export function diceIn(notation: string): { sides: number | "F"; count: number; }[]
{
    const dice: { sides: number | "F"; count: number; }[] = [];

    for (const [, count, sides] of notation.matchAll(/(\d*)d(\d+|%|F)/gi)) {
        const kind = sides === "%" ? 100 : sides.toUpperCase() === "F" ? "F" : Number(sides);
        const known = dice.find((die) => die.sides === kind);
        const many = count === "" ? 1 : Number(count);

        if (known === undefined) {
            dice.push({ sides: kind, count: many });
        } else {
            known.count += many;
        }
    }

    return dice;
}

/** The die the page draws for a die of these sides (D-284): the seven of the tray and the coin, a d3 and a dF as the d6 they are thrown with; none for a d30. */
export function drawnDie(sides: number | "F"): number | undefined
{
    const drawn = sides === "F" || sides === 3 ? 6 : sides;
    return drawnDice.includes(drawn) ? drawn : undefined;
}

/**
 * The dice of a notation as the page draws them (D-284): of one kind, its die once or twice, or once with how many past two, as 8d6; of more kinds, the first die
 * of the first two, the notation beside saying the rest. Dice the page does not draw are left out.
 */
export function drawnDiceOf(notation: string): { sides: number[]; count?: number; faded?: true; }
{
    const kinds = diceIn(notation).flatMap((kind) => {
        const sides = drawnDie(kind.sides);
        return sides === undefined ? [] : [{ sides, count: kind.count }];
    });

    if (kinds.length !== 1) {
        return { sides: kinds.slice(0, 2).map((kind) => kind.sides) };
    }

    const [{ sides, count }] = kinds;
    // Of two dice, one kept or one dropped: the other is drawn faded, as on the plate (D-297).
    const oneOfTwo = count === 2 && /\d*d(?:\d+|%|F)(?:k[hl]1|d[hl]1)(?![\d])/i.test(notation);
    return count <= 2 ? { sides: Array.from({ length: count }, () => sides), ...(oneOfTwo ? { faded: true as const } : {}) } : { sides: [sides], count };
}

/** An item of a list as the page shows it: a short name in capitals, as WIS; any other with its first letter a capital, as Light hammer. */
export function itemLabel(item: string, fields: ReadonlySet<string> = new Set()): string
{
    const word = item.trim();
    return systemWord("words", word) ?? systemWord("fields", word) ?? (isShortName(word.toLowerCase(), fields) ? word.toUpperCase() : phraseLabel(word));
}

/** A label of a sheet's line as a phrase, its first letter a capital: "sleight of hand" reads "Sleight of hand"; "STR save" stays as it is. */
export function phraseLabel(label: string): string
{
    return label.charAt(0).toUpperCase() + label.slice(1);
}

/** A button's label as a check: "Tiro: Atletica (1d20+5)" is the check Atletica with its dice (ASK-3); any other label is an answer, or the change of mind. */
export function checkOf(label: string, title: string): { check: string; dice: string; } | undefined
{
    const match = /^(.+?): (.+) \(([^()]+)\)$/.exec(label);
    return match === null || match[1] !== title ? undefined : { check: match[2], dice: match[3] };
}

/** Whether two notations are the same dice and number, as the tray and a check write them: 1d20+2 and 1d20 + 2, 1d20−1 and 1d20-1, 1d20+0 and 1d20. */
export function sameDice(first: string, second: string): boolean
{
    return plainDice(first) === plainDice(second);
}

/** The labels of a group's values by field: a last word they all share, such as save in str-save and dex-save, is left out. */
export function groupLabels(groupFields: string[], fields: ReadonlySet<string> = new Set()): Map<string, string>
{
    const lasts = new Set(groupFields.map((field) => words(field).at(-1)));
    const shared = groupFields.length > 1 && lasts.size === 1 && groupFields.every((field) => words(field).length > 1);
    return new Map(groupFields.map((field) => [field, fieldLabel(shared ? words(field).slice(0, -1).join("-") : field, fields)]));
}

/** "wis-mod +3, Insight in skill-proficiencies" as "WIS mod +3, Insight in skill proficiencies": the names of fields in a text, as labels. */
export function readableIds(text: string, fields: ReadonlySet<string> = new Set()): string
{
    return text.replace(/\b[a-z][a-z0-9]*(?:-[a-z0-9]+)+\b/g, (field) => fieldLabel(field, fields));
}

/** A number with its sign: +2, −1. */
export function signed(value: number): string
{
    return value < 0 ? `−${-value}` : `+${value}`;
}

/** The number added at the end of a notation, as the 5 of 2d20kh1+5; none, 0. */
export function notationModifier(notation: string): number
{
    const match = /([+-]\d+)$/.exec(notation.replace(/\s+/g, ""));
    return match === null ? 0 : Number(match[1]);
}

/**
 * A number as it reads in the page's language: −1 with a minus sign rather than a hyphen, 4,2 m with the Italian comma; a field whose kind is duration, as 3m
 * of the engine, in words: 3 minuti.
 */
export function shownText(text: string, kind?: string): string
{
    const time = kind === "duration" ? durationText(text) : undefined;

    if (time !== undefined) {
        return time;
    }

    // A number then a word of the system, as a weapon's 1d6+2 bludgeoning, says the word in the campaign's language (playtest 15).
    const tail = /^(.*\d)\s+(\D+)$/.exec(text);
    const tailWord = tail === null ? undefined : systemWord("words", tail[2]);
    const said = systemWord("words", text) ?? (tail === null || tailWord === undefined ? text : `${tail[1]} ${tailWord}`);
    // A decimal as the engine writes it, at most two digits, with the language's mark and its digits kept: 1.000 written by hand is a thousand, never 1.
    const mark = numberText(1.5).replace(/\d/g, "");
    return said.replace(/(?<![\w.])(\d+)\.(\d{1,2})(?![\w.])/g, `$1${mark}$2`).replace(/(^|[\s(])-(?=\d)/g, "$1−");
}

/** Dice as they read: 1d20−1 with a minus sign rather than a hyphen. */
export function shownNotation(notation: string): string
{
    return notation.replace(/-(?=\d)/g, "−");
}

/** "Ettore Lanza" as "EL", for a token without a picture. */
export function initials(name: string): string
{
    return name.split(/\s+/).filter((word) => word !== "").slice(0, 2).map((word) => word.charAt(0).toUpperCase()).join("");
}

/** A hue from a name, the same every time: the colour of a token without a picture. */
export function nameHue(name: string): number
{
    return [...name].reduce((hash, character) => (hash * 31 + (character.codePointAt(0) ?? 0)) % 360, 7);
}

/** A duration as the engine writes it, 1h 30m or 30s, in the page's words: 1 ora 30 minuti; undefined for any other text. */
function durationText(text: string): string | undefined
{
    const units = { d: "day", h: "hour", m: "minute", s: "second" } as const;
    const parts = text.split(" ").map((part) => /^(\d+)([dhms])$/.exec(part));
    const order = parts.map((part) => (part === null ? -1 : "dhms".indexOf(part[2])));

    if (parts.some((part) => part === null) || order.some((place, index) => index > 0 && place <= order[index - 1])) {
        return undefined;
    }

    // Isolated by its first letter: words of a language written from right to left keep its order inside a number's box, which reads left to right.
    return isolated(parts.map((part) => (part === null ? "" : timeText(Number(part[1]), units[part[2] as keyof typeof units]))).join(" "));
}

function words(field: string): string[]
{
    return field.split("-").filter((word) => word !== "");
}

/**
 * Whether a word of a field's name is short for a name, so in capitals: a field of two letters, as ac, two letters without a vowel, as hp, or one of three the
 * system names in full, as str for Strength; a word of three it does not, as age, is a word.
 */
function isShortName(word: string, fields: ReadonlySet<string>): boolean
{
    return (/^[a-z]{2}$/.test(word) && fields.has(word)) || /^[b-df-hj-np-tv-z]{2}$/.test(word) || (/^[a-z]{3}$/.test(word) && systemWord("names", word) !== undefined);
}

/** Dice written one way: of two dice dropping the lowest as keeping the highest, k as kh, 1d100 as 1d%, and the numbers added summed, as 1d20+2+1 is 1d20+3. */
function plainDice(notation: string): string
{
    const text = notation.toLowerCase().replace(/\s+/g, "").replaceAll("−", "-").replace(/\b2d(\d+)dl1/g, "2d$1kh1").replace(/\b2d(\d+)dh1/g, "2d$1kl1").replace(/(d(?:\d+|%))k(?=\d)/g, "$1kh")
        .replace(/d100\b/g, "d%");
    const terms = text.match(/[+-]?[^+-]+/g) ?? [];
    const sum = terms.filter((term) => !term.includes("d")).reduce((total, term) => total + Number(term), 0);
    return `${terms.filter((term) => term.includes("d")).join("")}${sum === 0 ? "" : sum > 0 ? `+${sum}` : String(sum)}`;
}

/** A moment in real time, as a save or a note was written, as a game says it: today or yesterday, else the day, with the year only when it is not this one; whole in full. */
export function realTimeLabel(at: string, now = new Date()): { short: string; full: string; } | undefined
{
    const date = new Date(at);

    if (Number.isNaN(date.getTime())) {
        return undefined;
    }

    const language = document.documentElement.lang || undefined;
    const time = new Intl.DateTimeFormat(undefined, { timeStyle: "short" }).format(date);
    const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
    const daysAgo = date.toDateString() === now.toDateString() ? 0 : date.toDateString() === yesterday.toDateString() ? -1 : undefined;
    const day = daysAgo === undefined
        ? new Intl.DateTimeFormat(language, { month: "short", day: "numeric", ...(date.getFullYear() === now.getFullYear() ? {} : { year: "numeric" }) }).format(date)
        : new Intl.RelativeTimeFormat(language, { numeric: "auto" }).format(daysAgo, "day");
    return { short: `${day}, ${time}`, full: new Intl.DateTimeFormat(language, { dateStyle: "full", timeStyle: "short" }).format(date) };
}

/** The name the page writes for someone the character does not know (D-331): Creature B2 for "creature B2", Someone for "someone", in the page's language. */
export function strangerLabel(name: string): string
{
    const creature = /^creature(?: (\w+))?$/.exec(name);

    if (creature !== null) {
        return creature[1] === undefined ? t("Creature") : t("Creature {mark}", { mark: creature[1] });
    }

    return name === "someone" ? t("Someone") : `${name[0]?.toUpperCase() ?? ""}${name.slice(1)}`;
}

/** A type of scene in the page's language: combat, social, exploration… */
export function sceneTypeLabel(type: string): string
{
    const labels: Record<string, string> = {
        combat: t("combat"),
        social: t("social"),
        exploration: t("exploration"),
        travel: t("travel"),
        rest: t("rest"),
        challenge: t("challenge"),
        other: t("other"),
    };
    return labels[type] ?? type;
}

/** A setting by its name, in the page's language: Difficulty; a game system's own from its name. */
export function settingLabel(name: string): string
{
    const labels: Record<string, string> = {
        difficulty: t("Difficulty"),
        lethality: t("Lethality"),
        saves: t("Saves"),
        rigor: t("Rigor"),
        ruleset: t("Ruleset"),
        mentor: t("Mentor"),
        learned: t("Learned"),
        prose: t("Prose"),
        story: t("Stories"),
        author: t("Write like"),
        style: t("In your words"),
        dice: t("Dice"),
        "master-rolls": t("Master's rolls"),
        units: t("Units"),
        voices: t("Character voices"),
        pictures: t("Pictures"),
        effort: t("Master's thinking"),
        lines: t("Lines"),
        veils: t("Veils"),
        language: t("Language"),
        companions: t("Companions"),
        preparation: t("Preparation"),
        name: t("Name"),
        premise: t("Premise"),
        system: t("Game system"),
    };
    return labels[name] ?? phraseLabel(systemWord("words", name) ?? fieldLabel(name));
}

/** A game system's name as the top of the page shows it, in its words when it gives one, as libero for free; else its name, as 5e (D-521). */
export function systemNameLabel(name: string): string
{
    return systemWord("words", name) ?? name;
}

/** What a game system is, as its system.yaml titles it, in its words when it has them: The fifth edition from the SRD 5.1. */
export function systemTitleLabel(title: string): string
{
    return phraseLabel(systemWord("words", title) ?? title);
}

/** A value of a setting, in the page's language: Normal, On request; a game system's own from its words. */
export function valueLabel(value: string): string
{
    const labels: Record<string, string> = {
        story: t("Story"),
        easy: t("Easy"),
        normal: t("Normal"),
        hard: t("Hard"),
        brutal: t("Brutal"),
        narrative: t("Narrative"),
        epic: t("Epic"),
        dice: t("Dice"),
        permadeath: t("Permadeath"),
        checkpoint: t("Checkpoint"),
        free: t("Free"),
        smooth: t("Smooth"),
        rules: t("Rules"),
        simulation: t("Simulation"),
        off: t("Off"),
        hints: t("Hints"),
        tutorial: t("Tutorial"),
        digital: t("Digital"),
        physical: t("Physical"),
        metric: t("Metric"),
        imperial: t("Imperial"),
        none: t("None"),
        low: t("Low"),
        medium: t("Medium"),
        high: t("High"),
        app: t("Your app decides"),
        "on request": t("On request"),
        "new elements": t("New places, quests and those you meet"),
        "made with the player": t("Made with the player"),
        "made by the master": t("Made by the master"),
        "met in play": t("Met in play"),
        plain: t("Plain"),
        literary: t("Literary"),
        pulp: t("Pulp"),
        wry: t("Wry"),
        situations: t("Situations"),
        arcs: t("Arcs"),
        episodes: t("Episodes"),
        mystery: t("Mystery"),
        "on the fly": t("On the fly"),
        "all at the start": t("All at the start"),
        auto: t("Sometimes"),
        master: t("The master"),
        important: t("Main characters"),
        always: t("Everyone"),
        "behind the screen": t("Behind the screen"),
        "in view": t("In view"),
    };
    return labels[value] ?? itemLabel(value);
}
