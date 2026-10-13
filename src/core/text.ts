import { rememberedByText } from "./memo.ts";

/** A name as it is compared: any case, accents written either way (NFC) and a curly apostrophe as a straight one (SYS-5), so that "Città" from any system matches "città". */
export function comparableText(text: string): string
{
    // Names come back at every call: a short text is remembered.
    return text.length > 200 ? comparable(text) : rememberedComparable(text);
}

const rememberedComparable = rememberedByText(comparable);

function comparable(text: string): string
{
    return text.normalize("NFC").toLowerCase().replace(/[‘’]/g, "'");
}

/** The first sentence of a text, up to its first ". ", as the help and the commands' reference give a command's description. */
export function firstSentence(text: string): string
{
    const end = text.indexOf(". ");
    return end === -1 ? text : text.slice(0, end + 1);
}

/** A noun with its article, as messages write it: "a character", "an item". */
export function withArticle(noun: string): string
{
    return /^[aeiou]/i.test(noun) ? `an ${noun}` : `a ${noun}`;
}

/** The name in `names` that `name` writes, ignoring case, how accents are written and the spaces around it; undefined when none does. */
export function sameName(names: string[], name: string): string | undefined
{
    return names.find((candidate) => comparableText(candidate) === comparableText(name.trim()));
}

/** The value a record holds under a name, as names are compared (INH-5); undefined when it holds none. */
export function valueNamed(record: Record<string, unknown>, name: string): unknown
{
    const key = sameName(Object.keys(record), name);
    return key === undefined ? undefined : record[key];
}

/** The page a link's target names: [[folder/Page.md]], and [[Page\|label]] as written in tables, name Page. */
export function linkTargetName(target: string): string
{
    return (target.replace(/\\$/, "").split("/").at(-1) ?? "").replace(/\.md$/i, "").trim();
}
