// The catalog of the packages one may add (D-485, D-486): what npm has for this rpg-engine, extensions, game systems and languages, and the adventures
// GitHub has by their topic, each with what the player needs to trust it and whether it is here already.
import { join } from "node:path";
import { readManifest } from "../adventures/index.ts";
import type { Context, PackageInfo } from "../core/context.ts";
import { files } from "../core/store.ts";
import { comparableText } from "../core/text.ts";
import { isNewerVersion } from "../core/version.ts";
import { extensionApi, installedExtensions, isVerified, readExtension, shortName } from "../extensions/index.ts";
import { installedLanguages } from "../languages/index.ts";
import { systemFolders } from "../systems/index.ts";
import { installedAdventures } from "./game-adventures.ts";

/** The kinds of packages the catalog lists. */
export type CatalogKind = "system" | "adventure" | "extension" | "language";

/** A package one may add, as the page lists it (D-486 (3)). */
export interface CatalogEntry
{
    kind: CatalogKind;
    title: string;
    description?: string;
    author?: string;
    version?: string;
    verified: boolean;
    /** Whether it brings code that runs, which asks the player's yes in a window of their computer when it is not ours (D-478). */
    code: boolean;
    /** What the player adds it by: an npm name or a GitHub link. */
    source: string;
    /** The version here, when it is installed. */
    installed?: string;
    update: boolean;
    /** An adventure's levels, length and language, as its adventure.yaml says. */
    levels?: string;
    length?: string;
    language?: string;
    stars?: number;
}

/** The catalog, and the source that did not answer, if any: the rest is listed all the same. */
export interface Catalog
{
    entries: CatalogEntry[];
    failed: { npm?: string; github?: string; };
}

/** The topic a GitHub repository carries to be found as an adventure (D-485 (4)). */
export const adventureTopic = "rpg-engine-adventure";

// How many repositories are read, each with its adventure.yaml: GitHub answers without a login only so many times an hour.
const mostAdventures = 30;
const kinds = new Set<string>(["system", "extension", "language"]);

/** What npm and GitHub offer now, ours first, then by title; each source asked once, side by side. */
export async function catalog(root: string, context: Context): Promise<Catalog>
{
    const [npm, github] = await Promise.all([npmEntries(root, context), githubEntries(root, context)]);
    const entries = [...npm.entries, ...github.entries].sort((first, second) => Number(second.verified) - Number(first.verified) || first.title.localeCompare(second.title));
    return { entries, failed: { ...(npm.failed === undefined ? {} : { npm: npm.failed }), ...(github.failed === undefined ? {} : { github: github.failed }) } };
}

async function npmEntries(root: string, context: Context): Promise<{ entries: CatalogEntry[]; failed?: string; }>
{
    const searched = context.packages === undefined ? { failed: "only the game's server and the command line reach npm" } : await context.packages.search();

    if ("failed" in searched) {
        return { entries: [], failed: searched.failed };
    }

    const listed = searched.filter((one) => kinds.has(one.kind ?? "") && (one.kind !== "extension" || one.api === extensionApi));
    return { entries: listed.map((one) => npmEntry(one, installedVersion(root, context, one))) };
}

function npmEntry(found: PackageInfo, installed: string | undefined): CatalogEntry
{
    const ours = isVerified(found.name, false);
    return {
        kind: found.kind as CatalogKind,
        title: shortName(found.name).replace(/^system-/, ""),
        ...(found.description === undefined ? {} : { description: found.description }),
        ...(found.author === undefined ? {} : { author: found.author }),
        version: found.version,
        verified: ours,
        code: found.code === true,
        // Ours by its name alone, as package install reads it; another's by its npm name, never mistaken for one of ours.
        source: ours ? shortName(found.name) : found.name.startsWith("@") ? found.name : `npm:${found.name}`,
        ...(installed === undefined ? {} : { installed }),
        update: installed !== undefined && isNewerVersion(found.version, installed),
    };
}

/** The version of this npm package installed here: an extension's, or a game system's. */
function installedVersion(root: string, context: Context, found: PackageInfo): string | undefined
{
    if (found.kind === "extension") {
        const here = installedExtensions(context.extensionFolders ?? []).find((one) => one.package === found.name);

        try {
            return here === undefined ? undefined : readExtension(here.folder).version;
        } catch {
            return "broken";
        }
    }

    if (found.kind === "language") {
        return installedLanguages(context.extensionFolders ?? []).find((one) => one.package === found.name)?.version;
    }

    // A system npm installed, by its package's own version.
    const folder = systemFolders(context.systemFolders).find((one) => packageNameIn(one.folder) === found.name)?.folder;
    return folder === undefined ? undefined : packageVersionIn(folder);
}

function packageNameIn(folder: string): string | undefined
{
    return packageIn(folder)?.name;
}

function packageVersionIn(folder: string): string | undefined
{
    return packageIn(folder)?.version;
}

function packageIn(folder: string): { name?: string; version?: string; } | undefined
{
    try {
        return JSON.parse(files().text(join(folder, "package.json")) ?? "") as { name?: string; version?: string; };
    } catch {
        return undefined;
    }
}

/** The adventures GitHub has by their topic, each read from its adventure.yaml; a repository without one that reads is left out. */
async function githubEntries(root: string, context: Context): Promise<{ entries: CatalogEntry[]; failed?: string; }>
{
    if (context.download === undefined) {
        return { entries: [], failed: "only the game's server and the command line reach GitHub" };
    }

    const download = context.download;
    let repositories: { full_name: string; default_branch: string; description?: string | null; owner?: { login?: string; }; stargazers_count?: number; html_url: string; }[];

    try {
        const found = JSON.parse(
            new TextDecoder().decode(await download(`https://api.github.com/search/repositories?q=topic:${adventureTopic}&sort=stars&per_page=${mostAdventures}`, 2 * 1024 * 1024, context.signal)),
        ) as { items?: typeof repositories; };
        repositories = found.items ?? [];
    } catch (error) {
        return { entries: [], failed: `GitHub could not be asked: ${error instanceof Error ? error.message : String(error)}` };
    }

    const here = installedAdventures(root);
    const read = await Promise.all(repositories.map(async (repository): Promise<CatalogEntry | undefined> => {
        try {
            const text = new TextDecoder().decode(await download(`https://raw.githubusercontent.com/${repository.full_name}/${repository.default_branch}/adventure.yaml`, 64 * 1024, context.signal));
            const manifest = readManifest(text, repository.full_name);
            const installed = here.find((one) => comparableText(one.title) === comparableText(manifest.title))?.version;
            const levels = manifest.levels === undefined ? undefined : manifest.levels.from === manifest.levels.to ? String(manifest.levels.from) : `${manifest.levels.from}-${manifest.levels.to}`;
            return {
                kind: "adventure",
                title: manifest.title,
                description: manifest.about,
                author: manifest.author ?? repository.owner?.login,
                version: manifest.version,
                verified: false,
                code: false,
                source: repository.html_url,
                ...(installed === undefined ? {} : { installed }),
                update: installed !== undefined && isNewerVersion(manifest.version, installed),
                ...(levels === undefined ? {} : { levels }),
                ...(manifest.length === undefined ? {} : { length: manifest.length }),
                language: manifest.language,
                ...(repository.stargazers_count === undefined ? {} : { stars: repository.stargazers_count }),
            };
        } catch {
            return undefined;
        }
    }));
    return { entries: read.filter((one) => one !== undefined) };
}
