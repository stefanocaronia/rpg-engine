// The page's own words in the campaign's language (D-394): written in English in the code, each English phrase the key of its translation. The languages the
// package ships each have their file, i18n/<code>.json, which the page reads when the campaign takes it: Italian curated, the others made by
// test/i18n/translate.ts. A phrase with no translation stays in English.

/** The languages the package ships the page's words in, besides English, by code. */
export const shippedLanguages = [
    "ar",
    "cs",
    "da",
    "de",
    "el",
    "es",
    "fi",
    "fr",
    "he",
    "hi",
    "hu",
    "is",
    "it",
    "ja",
    "ko",
    "nb",
    "nl",
    "pl",
    "pt",
    "ro",
    "ru",
    "sv",
    "tr",
    "uk",
    "zh",
];

// Codes the page reads as another it ships: Norwegian as Bokmål.
const aliases: Record<string, string> = { no: "nb" };

/** How the page reads a language's file: the browser fetches it from the page's own folder. */
export type ReadPhrases = (language: string) => Promise<Record<string, string>>;

let phrases: Record<string, string> = {};
let current = "en";
// The language asked last: a file that arrives after another was asked is kept, but not shown.
let wanted = "en";
const read = new Map<string, Record<string, string>>();

/** The language the page writes in for a campaign's code: its own when shipped, else its base language's (pt-BR, pt), else English. */
export function pageLanguageOf(code: string | undefined): string
{
    const asked = (code ?? "en").toLowerCase();
    const base = asked.split("-")[0];
    return [asked, base, aliases[base] ?? ""].find((one) => shippedLanguages.includes(one)) ?? "en";
}

/** The languages the page is written in: English, and those shipped. */
export function pageLanguages(): string[]
{
    return ["en", ...shippedLanguages];
}

/** Sets the language of the page's words from the campaign's code, reading its file once; English where it is not shipped or its file does not read. */
export async function setLanguage(code: string | undefined, readPhrases: ReadPhrases = fetchPhrases): Promise<void>
{
    const language = pageLanguageOf(code);
    wanted = language;

    if (language !== "en" && !read.has(language)) {
        read.set(language, await readPhrases(language).catch(() => ({})));
    }

    if (wanted === language && current !== language) {
        phrases = read.get(language) ?? {};
        current = language;
    }
}

/** A phrase of the page in its language, each {name} in it filled from values; the English phrase where it has no translation. */
export function t(phrase: string, values: Record<string, string | number> = {}): string
{
    return (phrases[phrase] ?? phrase).replace(/\{(\w+)\}/g, (whole, name: string) => (name in values ? String(values[name]) : whole));
}

/** A phrase of the page with things put in its {names}, such as links: its pieces in order, the words as strings; for a sentence whose order each language keeps. */
export function tParts<Part>(phrase: string, parts: Record<string, Part>): (string | Part)[]
{
    return (phrases[phrase] ?? phrase).split(/(\{\w+\})/).filter((piece) => piece !== "").map((piece) => {
        const name = /^\{(\w+)\}$/.exec(piece)?.[1];
        return name !== undefined && name in parts ? parts[name] : piece;
    });
}

async function fetchPhrases(language: string): Promise<Record<string, string>>
{
    const response = await fetch(`/i18n/${language}.json`);
    return response.ok ? await response.json() as Record<string, string> : {};
}
