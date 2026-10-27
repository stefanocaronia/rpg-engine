// A game system's words in the languages it ships (D-403): beside its system.yaml, words/<code>.yaml gives what the dashboard shows of the system in that
// language: its groups, its fields' labels, any other word or text it writes, and its headline. The core knows no game's words: it only hands them on.
import { existsSync } from "node:fs";
import { join } from "node:path";
import { z } from "zod";
import { readYamlValues } from "../core/yaml-file.ts";

/** A system's words in one language: its groups by their names, its fields' labels by their ids, other words and texts by their English, and its headline. */
export interface SystemWords
{
    groups: Record<string, string>;
    fields: Record<string, string>;
    words: Record<string, string>;
    /** The whole name of a field whose label is short, as a roll tells it: Charisma for cha, Charisma saving throw for cha-save. */
    names?: Record<string, string>;
    headline?: string;
}

const named = z.record(z.string().min(1), z.string().min(1));
const wordsSchema = z.object({ groups: named.optional(), fields: named.optional(), words: named.optional(), names: named.optional(), headline: z.string().min(1).optional() }, {
    error: "write it as groups, fields and words, each from the English to the language's own, and the headline, such as {groups: {Skills: Abilità}, fields: {str: FOR}}",
}).strict();

/** The words of the system in this folder for a language, or for its base language (pt for pt-BR); undefined when the system has none in it. */
export function systemWords(folder: string, language: string): SystemWords | undefined
{
    const file = [language, language.split("-")[0]].map((code) => join(folder, "words", `${code.toLowerCase()}.yaml`)).find((path) => existsSync(path));

    if (file === undefined) {
        return undefined;
    }

    const parsed = wordsSchema.safeParse(readYamlValues(file, 'the system\'s words in a language, such as "groups: {Skills: Abilità}"'));

    if (!parsed.success) {
        throw new Error(`The words of the game system in ${file} cannot be read: ${parsed.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("; ")}. Fix the file.`);
    }

    const { groups = {}, fields = {}, words = {}, names, headline } = parsed.data;
    return { groups, fields, words, ...(names === undefined ? {} : { names }), ...(headline === undefined ? {} : { headline }) };
}

/** The words of a system for a language from its folders in order, its own then its version's (VER-3): a later folder's names win; undefined when none has any. */
export function layeredSystemWords(folders: string[], language: string): SystemWords | undefined
{
    const found = folders.map((folder) => systemWords(folder, language)).filter((words) => words !== undefined);
    return found.length === 0 ? undefined : found.reduce((below, over) => ({
        groups: { ...below.groups, ...over.groups },
        fields: { ...below.fields, ...over.fields },
        words: { ...below.words, ...over.words },
        ...(below.names === undefined && over.names === undefined ? {} : { names: { ...below.names, ...over.names } }),
        ...((over.headline ?? below.headline) === undefined ? {} : { headline: over.headline ?? below.headline }),
    }));
}
