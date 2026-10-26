import { existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { z } from "zod";
import { installedFromFolder, packageFoldersIn, realPath } from "../core/files.ts";
import { type InstructionPart, readParts } from "../core/instruction-parts.ts";
import { apiProblem, type DeclaredWidget, declaredWidgets, type FigureSize, packagePartsIssues, packagePartsShape } from "../core/package-declarations.ts";
import { files, isInside } from "../core/store.ts";
import { comparableText } from "../core/text.ts";
import { readYamlValues } from "../core/yaml-file.ts";

/** The file that makes a folder an extension of rpg-engine (D-427). */
export const extensionFileName = "extension.yaml";

// The longest about and part of the instructions an extension may give, in words (D-441).
const aboutWords = 40;
const partWords = 400;

/** What an extension may add to the campaign's game system in extension.yaml, written as campaign.yaml writes it (CAM-2, D-505). */
export const systemAdditionNames = ["fields", "tables", "computed", "counters", "recipes", "values", "condition-icons"] as const;

/** What an extension adds to the game system, by key, as extension.yaml writes it: the system checks it when it is read with it (CAM-3). */
export type SystemAdditions = Partial<Record<(typeof systemAdditionNames)[number], Record<string, unknown>>>;

/**
 * A package that brings its code to a campaign (D-513, D-514): one of its extensions, or its game system; the same contract and the same parts, the kind
 * deciding only its role.
 */
export interface CodePackage
{
    kind: "extension" | "system";
    /** The package's name, as npm and campaign.yaml write it: @rpgengine/weather. */
    package: string;
    /** The name its commands and widgets start with (D-63): an extension's package's without its scope, weather; a system's as the campaign plays it, 5e. */
    name: string;
    version: string;
    folder: string;
    title: string;
    /** The language its texts are written in, as a code such as en. */
    language: string;
    /** Its icons by name, each the path of an SVG drawn on 24 by 24, as the dashboard strokes it (D-502). */
    icons: Record<string, string>;
    /** Its widgets on the dashboard, in the order written, each where it puts itself (D-502). */
    widgets: DeclaredWidget[];
    /** The file of its code for the dashboard's page, when it has some: the module whose default export draws its figures (D-510). */
    page?: string;
    /** The figures its page code draws, by name, with the room each takes on a wide screen; mirror, turned right to left, as it holds no words (D-510). */
    figures: Record<string, FigureSize>;
    /** Installed from a folder of this computer, which npm links: never verified, whatever its name (D-428). */
    linked: boolean;
}

/** An installed extension (D-28, D-427, D-428): an npm package with an extension.yaml, its parts of the instructions and, when it has some, its code. */
export interface Extension extends CodePackage
{
    kind: "extension";
    /** The line the master reads in the list of extensions (D-28). */
    about: string;
    attribution?: string;
    /** The game system it needs, when it needs one (D-163). */
    needs: { system?: string; };
    /** Its months in place of the core's, as extension.yaml writes them: the time module reads them (TIM-8). */
    calendar?: unknown;
    /** What it adds to the game system, under the campaign's own additions (CAM-2). */
    adds: SystemAdditions;
    /** Its parts of the master's instructions, by name (D-121). */
    parts: Record<string, InstructionPart>;
    /** The file of its code, when it has some: the module whose default export gives its commands (D-428). */
    code?: string;
}

/** An addition to the game system, which the system checks as it reads it (CAM-3). */
const addition = z.record(z.string(), z.unknown(), { error: "give it as a map by name, as campaign.yaml does" }).optional();

const extensionSchema = z.object({
    title: z.string().trim().min(1),
    about: z.string().trim().min(1),
    language: z.string().regex(/^[a-z]{2,3}(-[A-Za-z0-9]{2,8})*$/, "use a language code such as en"),
    attribution: z.string().trim().min(1).optional(),
    needs: z.object({ system: z.string().trim().min(1).optional() }).strict().optional(),
    calendar: z.unknown().optional(),
    ...packagePartsShape,
    fields: addition,
    tables: addition,
    computed: addition,
    counters: addition,
    recipes: addition,
    values: addition,
    // The drawings of effects by their names, over the system's (D-516).
    "condition-icons": addition,
}).strict().superRefine((declared, check) => {
    for (const issue of packagePartsIssues(declared, "an extension")) {
        check.addIssue({ code: "custom", ...issue });
    }
});

const packageSchema = z.object({
    name: z.string().regex(/^(@[a-z0-9][a-z0-9._-]*\/)?[a-z0-9][a-z0-9._-]*$/, "an npm package name, such as @rpgengine/weather"),
    version: z.string().min(1),
    main: z.string().min(1).optional(),
    // What says it is a package for rpg-engine, of which kind, and for which version of the API (D-439).
    "rpg-engine": z.object({ kind: z.string(), api: z.number().optional(), page: z.string().min(1).optional() }).optional(),
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

    if (marker?.kind !== "extension") {
        throw new Error(`${owner} cannot be used, because its package.json does not say "rpg-engine": {"kind": "extension"}: install a version of it made for rpg-engine.`);
    }

    const unread = apiProblem(marker.api, "extension");

    if (unread !== undefined) {
        throw new Error(`${owner} cannot be used, because ${unread}.`);
    }

    const declared = extensionSchema.safeParse(readYamlValues(where(extensionFileName), "what the extension is, such as title: ..."));

    if (!declared.success) {
        throw new Error(`${owner} cannot be read, because its ${extensionFileName} is not valid: ${z.prettifyError(declared.error).replace(/\s+/g, " ")}`);
    }

    const { title, about, language, attribution, needs, calendar, icons, widgets, figures } = declared.data;

    // Its page code is a file of its own, by real paths, links included (D-510).
    if (marker.page !== undefined && !isInside(realPath(folder), realPath(resolve(folder, marker.page)))) {
        throw new Error(`${owner} cannot be used, because its page, ${marker.page}, is not inside its package: name a file of its own, such as dist/page.js.`);
    }

    const adds: SystemAdditions = Object.fromEntries(systemAdditionNames.flatMap((key) => (declared.data[key] === undefined ? [] : [[key, declared.data[key]]])));
    const parts = readParts(folder, owner);
    // What the master reads of it in every chat, kept short (D-441).
    const long = [["about", about, aboutWords] as const, ...Object.entries(parts).map(([name, part]) => [`instructions/${name}.md`, part.text, partWords] as const)]
        .find(([, text, most]) => words(text) > most);

    if (long !== undefined) {
        throw new Error(`${owner} cannot be used, because its ${long[0]} has ${words(long[1])} words, and ${long[2]} at most are read.`);
    }

    return {
        kind: "extension",
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
        adds,
        icons: icons ?? {},
        widgets: declaredWidgets(widgets),
        parts,
        ...(manifest.data.main === undefined ? {} : { code: where(manifest.data.main) }),
        ...(marker.page === undefined ? {} : { page: where(marker.page) }),
        figures: figures ?? {},
        linked: installedFromFolder(folder),
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
