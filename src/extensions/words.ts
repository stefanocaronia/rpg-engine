// An extension's words in the languages it ships (D-502): beside its extension.yaml, words/<code>.yaml gives its title and its line in the Packages page, and
// the names of the fields it adds to the game system, and any word or phrase its widgets write, by the English as its code writes it. The core hands them on: a word the list lacks stays as written.
import { join } from "node:path";
import { z } from "zod";
import { files } from "../core/store.ts";
import { readYamlValues } from "../core/yaml-file.ts";

/** An extension's words in one language: its title and about, the names of the fields it adds to the game system, and its other words and phrases by the text its code writes. */
export interface ExtensionWords
{
    title?: string;
    about?: string;
    fields?: Record<string, string>;
    words: Record<string, string>;
}

const wordsSchema = z.object({
    title: z.string().trim().min(1).optional(),
    about: z.string().trim().min(1).optional(),
    fields: z.record(z.string().min(1), z.string().min(1)).optional(),
    words: z.record(z.string().min(1), z.string().min(1)).optional(),
}, { error: "write its title, its about, the names of its fields and its words, each from the text the code writes to the language's own, such as {words: {Weather: Meteo}}" }).strict();

/** The words of the extension in this folder for a language, or for its base language (pt for pt-BR); undefined when it has none in it. It throws when they do not read. */
export function extensionWords(folder: string, language: string): ExtensionWords | undefined
{
    const file = [language, language.split("-")[0]].map((code) => join(folder, "words", `${code.toLowerCase()}.yaml`)).find((path) => files().exists(path));

    if (file === undefined) {
        return undefined;
    }

    const parsed = wordsSchema.safeParse(readYamlValues(file, 'the extension\'s words in a language, such as "words: {Weather: Meteo}"'));

    if (!parsed.success) {
        throw new Error(`The words of the extension in ${file} cannot be read: ${parsed.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("; ")}. Fix the file.`);
    }

    const { title, about, fields, words = {} } = parsed.data;
    return { ...(title === undefined ? {} : { title }), ...(about === undefined ? {} : { about }), ...(fields === undefined ? {} : { fields }), words };
}

/**
 * A text in the words' language: the whole text as the list gives it, else with its first letter's case aside, the translation's first letter taken to the
 * text's case, so that "Rain" and "rain" need one entry; the text as written where the list lacks it.
 */
export function wordIn(words: ExtensionWords | undefined, text: string): string
{
    const list = words?.words ?? {};

    if (Object.hasOwn(list, text)) {
        return list[text];
    }

    const first = text.charAt(0);
    const other = first === first.toLowerCase() ? first.toUpperCase() : first.toLowerCase();
    const found = list[`${other}${text.slice(1)}`];

    if (found === undefined) {
        return text;
    }

    const head = found.charAt(0);
    return `${first === first.toUpperCase() && first !== first.toLowerCase() ? head.toUpperCase() : head.toLowerCase()}${found.slice(1)}`;
}
