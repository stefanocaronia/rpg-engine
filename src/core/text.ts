/** A name as it is compared: any case, and accents written either way (NFC), so that "Città" from any system matches "città". */
export function comparableText(text: string): string
{
    return text.normalize("NFC").toLowerCase();
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
