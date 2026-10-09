// Labels from the names of the fields, in English (D-273): "hit-dice-d8" reads "hit dice d8", "str-save" "STR save"; names in the campaign's language come later.

/** A field's name as a label: its words apart, in capitals the short ones that name a field, such as str or ac, and those of two letters without a vowel, such as hp. */
export function fieldLabel(field: string, fields: ReadonlySet<string> = new Set()): string
{
    return words(field).map((word) => (isShortName(word, fields) ? word.toUpperCase() : word)).join(" ");
}

/** The labels of a group's values by field: a last word they all share, such as save in str-save and dex-save, is left out. */
export function groupLabels(groupFields: string[], fields: ReadonlySet<string> = new Set()): Map<string, string>
{
    const lasts = new Set(groupFields.map((field) => words(field).at(-1)));
    const shared = groupFields.length > 1 && lasts.size === 1 && groupFields.every((field) => words(field).length > 1);
    return new Map(groupFields.map((field) => [field, fieldLabel(shared ? words(field).slice(0, -1).join("-") : field, fields)]));
}

/** A number as it reads: −1 with a minus sign rather than a hyphen. */
export function shownText(text: string): string
{
    return text.replace(/(^|[\s(])-(?=\d)/g, "$1−");
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
