// The page's own words in the campaign's language (D-394): written in English in the code, each English phrase the key of its translation. The languages the
// package ships each have their file, i18n/<code>.json, which the page reads when the campaign takes it: Italian curated, the others made by
// test/i18n/translate.ts. A phrase with no translation stays in English.
import type { SystemWords } from "./data.ts";

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

// The languages written from right to left, shipped or translated on the fly: the page mirrors for them.
const rightToLeft = ["ar", "he", "fa", "ur", "ps", "sd", "ug", "yi", "dv", "ckb"];

/** How the page reads a language's file: the browser fetches it from the page's own folder. */
export type ReadPhrases = (language: string) => Promise<Record<string, string>>;

/** A language the package does not ship, as this computer has translated it so far (D-406): its phrases, whether it is translating, whether it can. */
export interface FlyingWords
{
    phrases: Record<string, string>;
    translating: boolean;
    can: boolean;
    missing: number;
}

/** How the page reads a language the package does not ship: the dashboard gives what this computer has translated. */
export type ReadWords = (language: string) => Promise<FlyingWords>;

let phrases: Record<string, string> = {};
// The game system's words in the campaign's language, as view gives them (D-403).
let system: SystemWords = { groups: {}, fields: {}, words: {} };
let current = "en";
// The language asked last: a file that arrives after another was asked is kept, but not shown.
let wanted = "en";
const read = new Map<string, Record<string, string>>();
// A language the package does not ship, as the dashboard last gave it (D-406); and the phrases the page lacked in it, which go to be translated first.
let flying: (Omit<FlyingWords, "phrases"> & { language: string; }) | undefined;
const lacked = new Set<string>();
const asked = new Set<string>();
let asking: ReturnType<typeof setTimeout> | undefined;

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

/**
 * Sets the language of the page's words from the campaign's code, reading a shipped language's file once; a language the package does not ship as this
 * computer has translated it so far, read again each time (D-406); English where there is nothing.
 */
export async function setLanguage(code: string | undefined, readPhrases: ReadPhrases = fetchPhrases, readWords: ReadWords = fetchWords): Promise<void>
{
    const language = pageLanguageOf(code);
    const own = (code ?? "en").toLowerCase();

    if (language === "en" && own.split("-")[0] !== "en") {
        wanted = own;
        const words = await readWords(own).catch(() => undefined);

        if (wanted === own) {
            flying = words === undefined ? undefined : { language: own, translating: words.translating, can: words.can, missing: words.missing };
            phrases = words?.phrases ?? {};
            current = Object.keys(phrases).length > 0 ? own : "en";
        }

        return;
    }

    flying = undefined;
    wanted = language;

    if (language !== "en" && !read.has(language)) {
        read.set(language, await readPhrases(language).catch(() => ({})));
    }

    if (wanted === language && current !== language) {
        phrases = read.get(language) ?? {};
        current = language;
    }
}

/** Sets the game system's words in the campaign's language; none, its English. */
export function setSystemWords(words: SystemWords | undefined): void
{
    system = words ?? { groups: {}, fields: {}, words: {} };
}

/** A group's name, a field's label or another word of the game system in the campaign's language; undefined where the system has none. */
export function systemWord(kind: "groups" | "fields" | "words" | "names", english: string): string | undefined
{
    const words = system[kind] ?? {};
    return Object.hasOwn(words, english) ? words[english] : undefined;
}

/**
 * A phrase of the page in its language, or a text of the game system in its words, each {name} filled from values; the English where it has none. In a
 * language written from right to left each value is isolated, so that a name, a number or a notation keeps its own order: +2, 1d20+5.
 */
export function t(phrase: string, values: Record<string, string | number> = {}): string
{
    const own = phrases[phrase] ?? systemWord("words", phrase);

    if (own === undefined) {
        askFirst(phrase);
    }

    return (own ?? phrase).replace(/\{(\w+)\}/g, (whole, name: string) => (name in values ? isolated(values[name]) : whole));
}

/** How the page stands in a language the package does not ship (D-406): being translated, translated, or out of reach of this computer; none for one it ships. */
export function pageTranslation(): { language: string; state: "translating" | "ready" | "unable"; } | undefined
{
    return flying === undefined ? undefined : { language: flying.language, state: !flying.can && flying.missing > 0 ? "unable" : flying.missing === 0 ? "ready" : "translating" };
}

/** How far an arrow key moves along choices, the way the page reads: 1 forward, -1 back, 0 for another key; up and down too, unless `across` alone. */
export function arrowStep(key: string, across = false): number
{
    const [forward, back] = pageDirection() === "rtl" ? ["ArrowLeft", "ArrowRight"] : ["ArrowRight", "ArrowLeft"];
    return key === forward || (!across && key === "ArrowDown") ? 1 : key === back || (!across && key === "ArrowUp") ? -1 : 0;
}

/** A name or a number set apart in a language written from right to left, so that it keeps its own order: Locanda del Guado, +2. */
export function isolated(value: string | number): string
{
    return pageDirection() === "rtl" ? `\u2068${value}\u2069` : String(value);
}

/** A text without case and accents, to compare or search: Città reads citta. */
export function foldedText(text: string): string
{
    return text.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
}

/** A text with its first letter capital, as a label at the start of a line: Day 3. */
export function capitalized(text: string): string
{
    return text.charAt(0).toUpperCase() + text.slice(1);
}

/** Which way the page's language is written: right to left for Arabic and Hebrew, left to right for the others. */
export function pageDirection(): "rtl" | "ltr"
{
    return rightToLeft.includes(current) ? "rtl" : "ltr";
}

/** A phrase of the page with things put in its {names}, such as links: its pieces in order, the words as strings; for a sentence whose order each language keeps. */
export function tParts<Part>(phrase: string, parts: Record<string, Part>): (string | Part)[]
{
    return (phrases[phrase] ?? phrase).split(/(\{\w+\})/).filter((piece) => piece !== "").map((piece) => {
        const name = /^\{(\w+)\}$/.exec(piece)?.[1];
        return name !== undefined && name in parts ? parts[name] : piece;
    });
}

/** A number as the page's language writes it, in Latin digits and without grouping, as the page's other numbers: 12,4 in Italian. */
export function numberText(value: number): string
{
    return new Intl.NumberFormat(current, { numberingSystem: "latn", useGrouping: false, maximumFractionDigits: 2 }).format(value);
}

/** A number of a unit of time as the page's language says it, in Latin digits: 3 minuti in Italian, 1 hour in English. */
export function timeText(value: number, unit: "day" | "hour" | "minute" | "second"): string
{
    return new Intl.NumberFormat(current, { numberingSystem: "latn", useGrouping: false, style: "unit", unit, unitDisplay: "long" }).format(value);
}

/** Names as the page's language lists them: Ettore e Lupa. */
export function listText(items: string[]): string
{
    return new Intl.ListFormat(current, { type: "conjunction" }).format(items);
}

/** Sends the phrases the page lacks in a language being translated, a moment after it lacked them, to be translated first (D-406). */
function askFirst(phrase: string): void
{
    if (flying?.translating !== true || asked.has(phrase)) {
        return;
    }

    lacked.add(phrase);
    asking ??= setTimeout(() => {
        asking = undefined;
        const first = [...lacked];
        lacked.clear();
        first.forEach((one) => asked.add(one));
        const body = JSON.stringify({ language: flying?.language, first });
        fetch("/api/words", { method: "POST", headers: { "content-type": "application/json" }, body }).catch(() => undefined);
    }, 300);
}

async function fetchWords(language: string): Promise<FlyingWords>
{
    const response = await fetch(`/api/words?language=${encodeURIComponent(language)}`);

    if (!response.ok) {
        throw new Error(`The dashboard gave no words for ${language}.`);
    }

    return await response.json() as FlyingWords;
}

async function fetchPhrases(language: string): Promise<Record<string, string>>
{
    const response = await fetch(`/i18n/${language}.json`);
    return response.ok ? await response.json() as Record<string, string> : {};
}
