import { join } from "node:path";
import { z } from "zod";
import { files } from "../core/store.ts";
import { readYamlValues } from "../core/yaml-file.ts";

/** The file that makes a package a language's (D-485 (3)): its code and its name. */
export const languageFileName = "language.yaml";

/** A language's translation made by hand, installed as a package: the dashboard's phrases, and maybe the Guide and a game system's words. */
export interface LanguagePack
{
    package: string;
    version: string;
    folder: string;
    /** The language's code, such as de or pt-PT. */
    code: string;
    /** Its name in the language itself: Deutsch. */
    name: string;
}

const codePattern = /^[a-z]{2,3}(-[A-Za-z0-9]{2,8})*$/;
const languageSchema = z.object({
    code: z.string().regex(codePattern, "a language's code, such as de or pt-PT").refine((code) => code.split("-")[0] !== "en", "English is the page's own"),
    name: z.string().trim().min(1),
    engine: z.string().optional(),
}).strict();
const phrasesSchema = z.record(z.string(), z.string());
// Characters that turn the order of a text, which could make it read otherwise than it is.
const turning = /[‪-‮⁦-⁩]/;

/** The language packages in these folders, as npm keeps them, in scopes' folders too; the first by a code wins. */
export function installedLanguages(folders: string[]): LanguagePack[]
{
    const found: LanguagePack[] = [];

    for (const folder of packageFolders(folders)) {
        try {
            const pack = readLanguagePack(folder);

            if (!found.some((other) => other.code === pack.code)) {
                found.push(pack);
            }
        } catch {
            // One that does not read is left out here: package install and list say why.
        }
    }

    return found;
}

/** The package for a language: its own code, else its base language's (pt for pt-BR); undefined when none is installed. */
export function languagePackFor(folders: string[], code: string): LanguagePack | undefined
{
    const packs = installedLanguages(folders);
    const wanted = code.toLowerCase();
    return packs.find((pack) => pack.code.toLowerCase() === wanted) ?? packs.find((pack) => pack.code.toLowerCase() === wanted.split("-")[0]);
}

/** A language package from its folder; it throws, saying what is wrong, when it does not read. */
export function readLanguagePack(folder: string): LanguagePack
{
    const manifest = JSON.parse(files().text(join(folder, "package.json")) ?? "{}") as { name?: unknown; version?: unknown; };
    const read = languageSchema.safeParse(readYamlValues(join(folder, languageFileName), 'a language package\'s code and name, such as "code: de"'));

    if (!read.success) {
        throw new Error(`${join(folder, languageFileName)}: ${read.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("; ")}.`);
    }

    return { package: String(manifest.name ?? ""), version: String(manifest.version ?? ""), folder, code: read.data.code, name: read.data.name };
}

/** The dashboard's phrases the package translates, by their English; none when it has none that reads. */
export function packPhrases(pack: LanguagePack): Record<string, string>
{
    const read = phrasesSchema.safeParse(JSON.parse(files().text(join(pack.folder, "phrases.json")) ?? "{}"));
    return read.success ? read.data : {};
}

/** The package's Guide, in markdown; undefined when it has none. */
export function packGuide(pack: LanguagePack): string | undefined
{
    return files().text(join(pack.folder, "guide.md"));
}

/** The folder of the package's words for a game system, as a system keeps them (systems/<name>/words/<code>.yaml); undefined when it has none. */
export function packSystemFolder(pack: LanguagePack, system: string): string | undefined
{
    const folder = join(pack.folder, "systems", system);
    return files().entries(join(folder, "words")).length > 0 ? folder : undefined;
}

/**
 * What keeps a language package from being used (D-485 (3)): phrases that are not text, a {name} lost or added against the English, characters that turn
 * the order of a text. The English phrases it does not translate are only counted, and come from the next source.
 */
export function languagePackProblems(pack: LanguagePack, english: string[]): { problems: string[]; missing: number; }
{
    const raw = JSON.parse(files().text(join(pack.folder, "phrases.json")) ?? "null") as unknown;

    if (!phrasesSchema.safeParse(raw).success) {
        return { problems: ["phrases.json is not an object from each English phrase to its translation"], missing: english.length };
    }

    const phrases = raw as Record<string, string>;
    const names = (text: string): string => [...text.matchAll(/\{(\w+)\}/g)].map((match) => match[1]).sort().join(",");
    const problems = Object.entries(phrases).flatMap(([phrase, translated]) => [
        ...(names(phrase) !== names(translated) ? [`"${translated}" has not the {names} of "${phrase}"`] : []),
        ...(turning.test(translated) ? [`"${translated}" has characters that turn the order of a text`] : []),
    ]);
    return { problems: problems.slice(0, 10), missing: english.filter((phrase) => !(phrase in phrases)).length };
}

/** The folders of packages with a language.yaml in these folders, and in their scopes' folders. */
function packageFolders(folders: string[]): string[]
{
    const children = (folder: string): string[] => files().entries(folder).filter((entry) => entry.isFolder).map((entry) => join(folder, entry.name)).sort();
    const candidates = folders.flatMap((folder) => children(folder).flatMap((child) => (child.split(/[\\/]/).at(-1)?.startsWith("@") === true ? children(child) : [child])));
    return candidates.filter((candidate) => files().exists(join(candidate, languageFileName)));
}
