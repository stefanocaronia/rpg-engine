// The languages the player may choose for the game (D-394): every language the master can play in, each named in its own words and in the page's by the
// browser; a code not listed can still be written. Those the page is written in come first.
import { pageLanguages } from "./text.ts";

// The languages of the list, by code: ISO 639-1, with the regional variants that read differently.
const codes = [
    "af",
    "am",
    "ar",
    "az",
    "be",
    "bg",
    "bn",
    "bs",
    "ca",
    "cs",
    "cy",
    "da",
    "de",
    "el",
    "en",
    "eo",
    "es",
    "et",
    "eu",
    "fa",
    "fi",
    "fil",
    "fr",
    "ga",
    "gd",
    "gl",
    "gu",
    "ha",
    "he",
    "hi",
    "hr",
    "hu",
    "hy",
    "id",
    "ig",
    "is",
    "it",
    "ja",
    "jv",
    "ka",
    "kk",
    "km",
    "kn",
    "ko",
    "ku",
    "ky",
    "la",
    "lb",
    "lo",
    "lt",
    "lv",
    "mg",
    "mi",
    "mk",
    "ml",
    "mn",
    "mr",
    "ms",
    "mt",
    "my",
    "nb",
    "ne",
    "nl",
    "nn",
    "pa",
    "pl",
    "ps",
    "pt",
    "pt-BR",
    "ro",
    "ru",
    "rw",
    "sd",
    "si",
    "sk",
    "sl",
    "so",
    "sq",
    "sr",
    "sv",
    "sw",
    "ta",
    "te",
    "tg",
    "th",
    "tk",
    "tr",
    "tt",
    "ug",
    "uk",
    "ur",
    "uz",
    "vi",
    "xh",
    "yi",
    "yo",
    "zh",
    "zh-TW",
    "zu",
];

/** A language of the list: its code, its name in its own words, and in the page's language when that reads differently. */
export interface Language
{
    code: string;
    own: string;
    here?: string;
    /** Whether the page itself is written in it. */
    page: boolean;
}

/** Every language of the list the browser can name, those of the page first, the others in the order of their names in the page's language. */
export function languages(pageLanguage: string): Language[]
{
    const known = codes.flatMap((code) => languageOf(code, pageLanguage) ?? []);
    const order = new Intl.Collator(pageLanguage).compare;
    const byName = (first: Language, second: Language): number => order(first.here ?? first.own, second.here ?? second.own);
    return [...known.filter((language) => language.page).sort(byName), ...known.filter((language) => !language.page).sort(byName)];
}

/** A language by its code, named; undefined for a code that names no language the browser knows. */
export function languageOf(code: string, pageLanguage: string): Language | undefined
{
    const own = languageName(code, code);

    if (own === undefined) {
        return undefined;
    }

    const here = languageName(code, pageLanguage);
    const page = pageLanguages().some((one) => one === code.toLowerCase() || one === code.toLowerCase().split("-")[0]);
    return { code, own: capitalized(own, code), ...(here === undefined || here.toLowerCase() === own.toLowerCase() ? {} : { here }), page };
}

/** Whether a language matches what the player wrote: by its names or its code, case and accents aside. */
export function matches(language: Language, typed: string): boolean
{
    const wanted = plain(typed);
    return wanted === "" || [language.own, language.here ?? "", language.code].some((name) => plain(name).includes(wanted));
}

/** A language's name in a language, as the browser writes it; undefined where the browser has none. */
export function languageName(code: string, inLanguage: string): string | undefined
{
    try {
        // Without its data the browser names it in its own language, not in the one asked.
        return Intl.DisplayNames.supportedLocalesOf([inLanguage]).length === 0 ? undefined : new Intl.DisplayNames([inLanguage], { type: "language", fallback: "none" }).of(code);
    } catch {
        return undefined;
    }
}

/** A name with its first letter a capital, as a list writes it, in the case its own language has. */
function capitalized(name: string, code: string): string
{
    return name.charAt(0).toLocaleUpperCase(code) + name.slice(1);
}

function plain(text: string): string
{
    return text.normalize("NFD").replace(/\p{Mn}/gu, "").toLowerCase().trim();
}
