import { existsSync, lstatSync } from "node:fs";
import { join } from "node:path";
import { z } from "zod";
import { packageFoldersIn } from "../core/files.ts";
import { type InstructionPart, readParts } from "../core/instruction-parts.ts";
import { files } from "../core/store.ts";
import { comparableText } from "../core/text.ts";
import { readYamlValues } from "../core/yaml-file.ts";

/** The file that makes a folder an extension of rpg-engine (D-427). */
export const extensionFileName = "extension.yaml";

// The longest about and part of the instructions an extension may give, in words (D-441).
const aboutWords = 40;
const partWords = 400;

/** The version of the API an extension's code is given (api.ts), which its package.json names: a package made for another is refused. */
export const extensionApi = 1;

/** An installed extension (D-28, D-427, D-428): an npm package with an extension.yaml, its parts of the instructions and, when it has some, its code. */
export interface Extension
{
    /** The package's name, as npm and campaign.yaml write it: @rpgengine/weather. */
    package: string;
    /** The name its commands start with: the package's without its scope, weather (D-63). */
    name: string;
    version: string;
    folder: string;
    title: string;
    /** The line the master reads in the list of extensions (D-28). */
    about: string;
    /** The language its texts are written in, as a code such as en. */
    language: string;
    attribution?: string;
    /** The game system it needs, when it needs one (D-163). */
    needs: { system?: string; };
    /** Its months in place of the core's, as extension.yaml writes them: the time module reads them (TIM-8). */
    calendar?: unknown;
    /** Its parts of the master's instructions, by name (D-121). */
    parts: Record<string, InstructionPart>;
    /** The file of its code, when it has some: the module whose default export gives its commands (D-428). */
    code?: string;
    /** Installed from a folder of this computer, which npm links: never verified, whatever its name (D-428). */
    linked: boolean;
}

const extensionSchema = z.object({
    title: z.string().trim().min(1),
    about: z.string().trim().min(1),
    language: z.string().regex(/^[a-z]{2,3}(-[A-Za-z0-9]{2,8})*$/, "use a language code such as en"),
    attribution: z.string().trim().min(1).optional(),
    needs: z.object({ system: z.string().trim().min(1).optional() }).strict().optional(),
    calendar: z.unknown().optional(),
}).strict();

const packageSchema = z.object({
    name: z.string().regex(/^(@[a-z0-9][a-z0-9._-]*\/)?[a-z0-9][a-z0-9._-]*$/, "an npm package name, such as @rpgengine/weather"),
    version: z.string().min(1),
    main: z.string().min(1).optional(),
    // What says it is a package for rpg-engine, of which kind, and for which version of the API (D-439).
    "rpg-engine": z.object({ kind: z.string(), api: z.number().optional() }).optional(),
});

/** The extensions installed in these folders, each a package folder, or a scope's folder of them as npm keeps them (@rpgengine/weather); the first by a name wins. */
export function installedExtensions(folders: string[]): { package: string; folder: string; }[]
{
    const found: { package: string; folder: string; }[] = [];

    for (const folder of packageFolders(folders)) {
        const name = packageName(folder);

        if (name !== undefined && !found.some((other) => other.package === name)) {
            found.push({ package: name, folder });
        }
    }

    return found;
}

/** The installed extension of this package, as npm or campaign.yaml names it, or by its name alone (weather); undefined when none is. It throws when it does not read. */
export function findExtension(folders: string[], wanted: string): Extension | undefined
{
    const named = (candidate: string): boolean => candidate === wanted.trim() || comparableText(shortName(candidate)) === comparableText(wanted.trim());
    const found = installedExtensions(folders).find((candidate) => named(candidate.package));
    return found === undefined ? undefined : readExtension(found.folder);
}

/** An extension from its folder: its package.json and its extension.yaml, refused with what is wrong (D-427). */
export function readExtension(folder: string): Extension
{
    const where = (file: string): string => join(folder, file);
    const manifest = packageSchema.safeParse(readJson(where("package.json")));

    if (!manifest.success) {
        throw new Error(`The extension in ${folder} cannot be read, because its package.json is not valid: ${z.prettifyError(manifest.error).replace(/\s+/g, " ")}`);
    }

    const owner = `The extension ${manifest.data.name}`;
    const marker = manifest.data["rpg-engine"];

    if (marker?.kind !== "extension" || marker.api !== extensionApi) {
        const made = marker?.kind !== "extension" ? 'its package.json does not say "rpg-engine": {"kind": "extension"}' : `it is made for the extension API ${marker.api ?? "none"}`;
        throw new Error(`${owner} cannot be used, because ${made}; this rpg-engine reads the API ${extensionApi}: install a version of it made for this one.`);
    }

    const declared = extensionSchema.safeParse(readYamlValues(where(extensionFileName), "what the extension is, such as title: ..."));

    if (!declared.success) {
        throw new Error(`${owner} cannot be read, because its ${extensionFileName} is not valid: ${z.prettifyError(declared.error).replace(/\s+/g, " ")}`);
    }

    const { title, about, language, attribution, needs, calendar } = declared.data;
    const parts = readParts(folder, owner);
    // What the master reads of it in every chat, kept short (D-441).
    const long = [["about", about, aboutWords] as const, ...Object.entries(parts).map(([name, part]) => [`instructions/${name}.md`, part.text, partWords] as const)]
        .find(([, text, most]) => words(text) > most);

    if (long !== undefined) {
        throw new Error(`${owner} cannot be used, because its ${long[0]} has ${words(long[1])} words, and ${long[2]} at most are read.`);
    }

    return {
        package: manifest.data.name,
        name: shortName(manifest.data.name),
        version: manifest.data.version,
        folder,
        title,
        about,
        language,
        ...(attribution === undefined ? {} : { attribution }),
        needs: needs ?? {},
        ...(calendar === undefined ? {} : { calendar }),
        parts,
        ...(manifest.data.main === undefined ? {} : { code: where(manifest.data.main) }),
        linked: lstatSync(folder).isSymbolicLink(),
    };
}

/** The name a package's commands start with: its name without the scope, weather for @rpgengine/weather. */
export function shortName(packageName: string): string
{
    return packageName.replace(/^@[^/]+\//, "");
}

/** The folders of packages with an extension.yaml in these folders, and in their scopes' folders; npm links a package installed from a folder. */
function packageFolders(folders: string[]): string[]
{
    return packageFoldersIn(folders).filter((candidate) => existsSync(join(candidate, extensionFileName)));
}

/** The name in a package's package.json; undefined when it has none that reads. */
function packageName(folder: string): string | undefined
{
    const parsed = packageSchema.safeParse(readJson(join(folder, "package.json")));
    return parsed.success ? parsed.data.name : undefined;
}

function readJson(path: string): unknown
{
    try {
        return JSON.parse(files().text(path) ?? "null") as unknown;
    } catch {
        return undefined;
    }
}

function words(text: string): number
{
    return text.split(/\s+/).filter((word) => word !== "").length;
}
