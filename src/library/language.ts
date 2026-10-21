// The language a book is written in (LIB-7), for the master to search it with its words: by the little words each language repeats, or by its script.

// The words each language writes most, and the others least.
const commonWords: Record<string, string[]> = {
    en: ["the", "and", "of", "to", "is", "that", "with", "for", "you", "your", "are", "this", "it", "on"],
    it: ["il", "di", "che", "la", "per", "un", "una", "del", "della", "non", "sono", "con", "gli", "nel"],
    fr: ["le", "les", "des", "et", "est", "une", "du", "pour", "que", "qui", "dans", "vous", "au", "sur"],
    de: ["der", "die", "und", "das", "ist", "nicht", "mit", "ein", "eine", "den", "zu", "sie", "auf", "sich"],
    es: ["el", "los", "las", "que", "y", "una", "por", "para", "con", "del", "es", "se", "su", "al"],
    pt: ["o", "os", "as", "que", "uma", "para", "com", "não", "do", "da", "dos", "em", "se", "ao"],
    nl: ["de", "het", "en", "een", "van", "is", "dat", "niet", "met", "voor", "zijn", "je", "op", "aan"],
};

// The scripts that tell a language alone, as the dashboard's languages write them.
const scripts: [string, RegExp][] = [
    ["ja", /[぀-ヿ]/gu],
    ["ko", /[가-힯]/gu],
    ["zh", /[一-鿿]/gu],
    ["el", /[Ͱ-Ͽ]/gu],
    ["he", /[֐-׿]/gu],
    ["ar", /[؀-ۿ]/gu],
];

// How much of a book is looked at, and the fewest little words that tell its language.
const lookedAt = 200_000;
const fewestWords = 20;

/** A book's language as a code, such as it, from its text; undefined when the text does not tell. */
export function bookLanguage(text: string): string | undefined
{
    const sample = text.slice(0, lookedAt);
    const letters = sample.match(/\p{L}/gu)?.length ?? 0;
    const script = scripts.find(([, pattern]) => (sample.match(pattern)?.length ?? 0) > letters / 4);

    if (script !== undefined) {
        return script[0];
    }

    const counts = new Map<string, number>();

    for (const word of sample.toLowerCase().match(/\p{L}+/gu) ?? []) {
        counts.set(word, (counts.get(word) ?? 0) + 1);
    }

    const [best, hits] = Object.entries(commonWords)
        .map(([language, words]): [string, number] => [language, words.reduce((sum, word) => sum + (counts.get(word) ?? 0), 0)])
        .sort((first, second) => second[1] - first[1])[0] ?? ["", 0];
    return hits >= fewestWords ? best : undefined;
}
