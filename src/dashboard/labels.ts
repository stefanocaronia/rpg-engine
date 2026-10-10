// Labels from the names of the fields, in English (D-273): "hit-dice-d8" reads "hit dice d8", "str-save" "STR save"; names in the campaign's language come later.

// The dice the page has a picture of: the d% as 100, the coin as 2.
const drawnDice = [2, 4, 6, 8, 10, 12, 20, 100];

/** A field's name as a label: its words apart, in capitals the short ones that name a field, such as str or ac, and those of two letters without a vowel, such as hp. */
export function fieldLabel(field: string, fields: ReadonlySet<string> = new Set()): string
{
    return words(field).map((word) => (isShortName(word, fields) ? word.toUpperCase() : word)).join(" ");
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

/** An item of a list as the page shows it: the short name of a field in capitals, as WIS; any other with its first letter a capital, as Light hammer. */
export function itemLabel(item: string, fields: ReadonlySet<string> = new Set()): string
{
    const word = item.trim();
    return isShortName(word.toLowerCase(), fields) ? word.toUpperCase() : phraseLabel(word);
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
    const plain = (notation: string): string => notation.toLowerCase().replace(/\s+/g, "").replaceAll("−", "-").replace(/[+-]0$/, "");
    return plain(first) === plain(second);
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

/** A number as it reads: −1 with a minus sign rather than a hyphen. */
export function shownText(text: string): string
{
    return text.replace(/(^|[\s(])-(?=\d)/g, "$1−");
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

function words(field: string): string[]
{
    return field.split("-").filter((word) => word !== "");
}

function isShortName(word: string, fields: ReadonlySet<string>): boolean
{
    return (/^[a-z]{2,3}$/.test(word) && fields.has(word)) || /^[b-df-hj-np-tv-z]{2}$/.test(word);
}
