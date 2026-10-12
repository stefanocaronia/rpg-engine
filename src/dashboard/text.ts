// The page's own words in the campaign's language (D-394): written in English in the code, each English phrase the key of its translation. The languages
// curated in the package are here; the others come later, translated on the fly. A phrase with no translation stays in English.
import { italian } from "./i18n/it.ts";

// The curated translations, by language code: each from the English phrase to its own.
const curated: Record<string, Record<string, string>> = { it: italian };

let phrases: Record<string, string> = {};

/** Sets the language of the page's words from the campaign's code; a regional code without its own translation reads its language's (pt-BR, pt). */
export function setLanguage(code: string | undefined): void
{
    const asked = (code ?? "en").toLowerCase();
    phrases = curated[asked] ?? curated[asked.split("-")[0]] ?? {};
}

/** The languages the page is written in: English, and the curated ones. */
export function pageLanguages(): string[]
{
    return ["en", ...Object.keys(curated)];
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
