// The catalog of the packages one may add (D-485, D-486): what npm has for this rpg-engine, extensions, game systems and languages, and the packages of data
// alone GitHub has by their topic, adventures, themes and languages, each with what the player needs to trust it and whether it is here already.
import { join } from "node:path";
import { parse } from "yaml";
import { type AdventureManifest, readManifest } from "../../../adventures/index.ts";
import type { Context, PackageInfo } from "../../../core/context.ts";
import { ourSystems, readsApi } from "../../../core/packages/declarations.ts";
import { files } from "../../../core/store.ts";
import { comparableText } from "../../../core/text.ts";
import { isNewerVersion, newerEngineAsked } from "../../../core/version.ts";
import { installedExtensions, readExtension, shortName } from "../../../extensions/index.ts";
import { installedLanguages, type LanguagePack } from "../../../languages/index.ts";
import { isVerified } from "../../../packages/index.ts";
import { systemFolders } from "../../../systems/index.ts";
import type { InstalledTheme } from "../../../themes/index.ts";
import { type InstalledAdventure, installedAdventures } from "../books/adventures.ts";
import { isDataLanguage, isSameSource, languageFolders, themesHere, unpackedSource } from "./unpacked.ts";

/** The kinds of packages the catalog lists. */
export type CatalogKind = "system" | "adventure" | "extension" | "language" | "theme";

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
    /** The version here, when it is installed; empty for a theme installed without one. */
    installed?: string;
    update: boolean;
    /** Its latest version, when it needs a newer rpg-engine than this one, which version offers the newest it reads (D-515 (2)): with the first engine that reads it. */
    newer?: { version: string; engine?: string; };
    /** The game system an extension is made for, as its package.json says (D-548). */
    system?: string;
    /** An adventure's levels, length and language, as its adventure.yaml says; a language's code. */
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

/** A game system one may install for a campaign (D-513 (1)): its name, as package install takes it, what it is, and whether it is ours. */
export interface InstallableSystem
{
    name: string;
    title: string;
    verified: boolean;
}

// How long the setup waits for npm before it offers ours alone.
const systemsWait = 5000;

/** The game systems npm has that this computer has not, ours first, with ours from the engine's list beside them, npm answering in time or not (D-513 (1)). */
export async function installableSystems(context: Context): Promise<InstallableSystem[]>
{
    let timer: NodeJS.Timeout | undefined;
    const late = new Promise<{ failed: string; }>((done) => (timer = setTimeout(() => done({ failed: "npm took too long" }), systemsWait)));
    const searched = context.packages === undefined ? { failed: "no npm here" } : await Promise.race([context.packages.search().catch(() => ({ failed: "npm failed" })), late]);
    clearTimeout(timer);
    const npm = "failed" in searched ? [] : searched.filter((one) => one.kind === "system" && readsApi(one.api, "system"));
    // Ours by their name alone, as package install takes it; another's by its npm name.
    const found = npm.map((one): InstallableSystem => {
        const title = ourSystems.find((system) => system.package === one.name)?.title ?? one.description ?? shortName(one.name);
        return isVerified(one.name, false)
            ? { name: shortName(one.name).replace(/^system-/, ""), title, verified: true }
            : { name: one.name.startsWith("@") ? one.name : `npm:${one.name}`, title, verified: false };
    });
    const installedName = (system: InstallableSystem): string => comparableText(shortName(system.name.replace(/^npm:/, "")).replace(/^system-/, ""));
    // Ours from the engine's list always, as npm's search may not find one yet; npm's own entry first, by name.
    const engines = ourSystems.map((ours): InstallableSystem => ({ name: ours.name, title: ours.title, verified: true }));
    const listed = [...found, ...engines.filter((ours) => !found.some((one) => one.verified && installedName(one) === installedName(ours)))];
    const here = systemFolders(context.systemFolders).map((one) => comparableText(one.name));
    return listed.filter((system) => !here.includes(installedName(system))).sort((first, second) => Number(second.verified) - Number(first.verified) || first.name.localeCompare(second.name));
}

/** The topic a GitHub repository carries to be found, by the kind of package of data alone it is (D-485 (4)), and the file at its top that says what it is. */
const githubTopics = [
    { kind: "adventure", topic: "rpg-engine-adventure", file: "adventure.yaml" },
    { kind: "theme", topic: "rpg-engine-theme", file: "theme.yaml" },
    { kind: "language", topic: "rpg-engine-language", file: "language.yaml" },
] as const;

// How many repositories of each topic are read, each with the file at its top: GitHub answers a search without a login only so many times an hour.
const mostRepositories = 20;
const kinds = new Set<string>(["system", "extension", "language"]);

/** What npm and GitHub offer now, ours first, then by title; each source asked once, side by side. */
export async function catalog(root: string, context: Context): Promise<Catalog>
{
    const [npm, github] = await Promise.all([npmEntries(context), githubEntries(root, context)]);
    const entries = [...npm.entries, ...github.entries].sort((first, second) => Number(second.verified) - Number(first.verified) || first.title.localeCompare(second.title));
    return { entries, failed: { ...(npm.failed === undefined ? {} : { npm: npm.failed }), ...(github.failed === undefined ? {} : { github: github.failed }) } };
}

async function npmEntries(context: Context): Promise<{ entries: CatalogEntry[]; failed?: string; }>
{
    const searched = context.packages === undefined ? { failed: "only the game's server and the command line reach npm" } : await context.packages.search();

    if ("failed" in searched) {
        return { entries: [], failed: searched.failed };
    }

    // A package made for an API this engine does not read is not offered (D-515).
    const listed = searched.filter((one) => kinds.has(one.kind ?? "") && (one.kind === "language" || readsApi(one.api, one.kind === "system" ? "system" : "extension")));
    return { entries: listed.map((one) => npmEntry(one, installedVersion(context, one))) };
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
        ...(found.newer === undefined ? {} : { newer: found.newer }),
        ...(found.kind === "extension" && found.system !== undefined ? { system: found.system } : {}),
    };
}

/** The version of this npm package installed here: an extension's, or a game system's. */
function installedVersion(context: Context, found: PackageInfo): string | undefined
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
        return installedLanguages(languageFolders(context)).find((one) => one.package === found.name)?.version;
    }

    // A system npm installed, by its package's own version.
    const folder = systemFolders(context.systemFolders).find((one) => packageIn(one.folder)?.name === found.name)?.folder;
    return folder === undefined ? undefined : packageIn(folder)?.version;
}

function packageIn(folder: string): { name?: string; version?: string; } | undefined
{
    try {
        return JSON.parse(files().text(join(folder, "package.json")) ?? "") as { name?: string; version?: string; };
    } catch {
        return undefined;
    }
}

/** A repository GitHub found by its topic. */
interface Repository
{
    full_name: string;
    default_branch: string;
    description?: string | null;
    owner?: { login?: string; };
    stargazers_count?: number;
    html_url: string;
}

/** What this computer has of the packages GitHub may offer, to say which are here and which are newer. */
interface Here
{
    adventures: InstalledAdventure[];
    themes: InstalledTheme[];
    languages: LanguagePack[];
}

/**
 * The adventures, themes and languages GitHub has by their topics, the three searches side by side, each repository read from the file at its top; one without
 * one that reads is left out, and a search that fails leaves the others listed.
 */
async function githubEntries(root: string, context: Context): Promise<{ entries: CatalogEntry[]; failed?: string; }>
{
    const download = context.download;

    if (download === undefined) {
        return { entries: [], failed: "only the game's server and the command line reach GitHub" };
    }

    const searched = await Promise.all(githubTopics.map(async (topic): Promise<{ topic: (typeof githubTopics)[number]; repositories: Repository[]; failed?: string; }> => {
        try {
            const url = `https://api.github.com/search/repositories?q=topic:${topic.topic}&sort=stars&per_page=${mostRepositories}`;
            const found = JSON.parse(new TextDecoder().decode(await download(url, 2 * 1024 * 1024, context.signal))) as { items?: Repository[]; };
            return { topic, repositories: found.items ?? [] };
        } catch (error) {
            // The reason without the long address, so that three searches refused alike read as one.
            const why = (error instanceof Error ? error.message : String(error)).replace(/^https:\/\/\S+ /, "").replace(/: check the address.*$/, "");
            return { topic, repositories: [], failed: why };
        }
    }));
    const here: Here = { adventures: installedAdventures(root), themes: themesHere(context), languages: installedLanguages(languageFolders(context)).filter((one) => isDataLanguage(context, one)) };
    const read = await Promise.all(searched.flatMap(({ topic, repositories }) =>
        repositories.map(async (repository): Promise<CatalogEntry | undefined> => {
            try {
                const raw = `https://raw.githubusercontent.com/${repository.full_name}/${repository.default_branch}/${topic.file}`;
                const text = new TextDecoder().decode(await download(raw, 64 * 1024, context.signal));
                return topic.kind === "adventure"
                    ? adventureEntry(repository, readManifest(text, repository.full_name), here)
                    : topic.kind === "theme"
                    ? themeEntry(repository, text, here)
                    : languageEntry(repository, text, here);
            } catch {
                return undefined;
            }
        })
    ));
    const reasons = [...new Set(searched.flatMap((one) => (one.failed === undefined ? [] : [one.failed])))];
    const failed = reasons.map((why) => `GitHub could not be asked for its ${searched.filter((one) => one.failed === why).map((one) => `${one.topic.kind}s`).join(" and ")}: ${why}`);
    return { entries: read.filter((one) => one !== undefined), ...(failed.length === 0 ? {} : { failed: failed.join("; ") }) };
}

/** An adventure GitHub has, as its adventure.yaml says. */
function adventureEntry(repository: Repository, manifest: AdventureManifest, here: Here): CatalogEntry
{
    const installed = here.adventures.find((one) => comparableText(one.title) === comparableText(manifest.title))?.version;
    const levels = manifest.levels === undefined ? undefined : manifest.levels.from === manifest.levels.to ? String(manifest.levels.from) : `${manifest.levels.from}-${manifest.levels.to}`;
    const author = manifest.author ?? repository.owner?.login;
    return {
        ...githubEntry("adventure", repository, manifest.title, manifest.version, installed),
        description: manifest.about,
        ...(author === undefined ? {} : { author }),
        ...(levels === undefined ? {} : { levels }),
        ...(manifest.length === undefined ? {} : { length: manifest.length }),
        language: manifest.language,
    };
}

/**
 * A theme GitHub has, by the name, version and engine its theme.yaml gives; here only when it was installed from this repository, never one linked for its
 * author, which nothing updates. Its checks are made as it is installed.
 */
function themeEntry(repository: Repository, text: string, here: Here): CatalogEntry | undefined
{
    const read = parse(text) as { name?: unknown; version?: unknown; engine?: unknown; } | null;

    if (typeof read?.name !== "string" || read.name.trim() === "") {
        return undefined;
    }

    const name = read.name;
    const found = here.themes.find((one) => one.linked !== true && isSameSource(unpackedSource(one.entry), repository.html_url));
    return readableEntry(githubEntry("theme", repository, name, versionOf(read.version), found === undefined ? undefined : (found.theme?.version ?? "")), read.engine);
}

/** A language GitHub has, by the code, name, version and engine its language.yaml gives: here only when it was installed from this repository, never npm's. */
function languageEntry(repository: Repository, text: string, here: Here): CatalogEntry | undefined
{
    const read = parse(text) as { code?: unknown; name?: unknown; version?: unknown; engine?: unknown; } | null;

    if (typeof read?.code !== "string" || typeof read.name !== "string") {
        return undefined;
    }

    const code = read.code;
    const installed = here.languages.find((one) => isSameSource(unpackedSource(one.folder), repository.html_url))?.version;
    return readableEntry({ ...githubEntry("language", repository, read.name, versionOf(read.version), installed), language: code }, read.engine);
}

/**
 * A theme or a language as this engine reads it, by the lowest rpg-engine its file asks (D-515 (2)): one that asks a newer engine is no update, and says the
 * engine its version needs; not offered when it is not here, as npm's that no version of reads, since adding it would be refused.
 */
function readableEntry(entry: CatalogEntry, asked: unknown): CatalogEntry | undefined
{
    const engine = newerEngineAsked(asked);

    if (engine === undefined) {
        return entry;
    }

    if (entry.installed === undefined) {
        return undefined;
    }

    const { version, ...rest } = entry;
    const newer = version !== undefined && (entry.installed === "" || isNewerVersion(version, entry.installed));
    return { ...rest, ...(entry.installed === "" ? {} : { version: entry.installed }), update: false, ...(newer ? { newer: { version, engine } } : {}) };
}

/** What every package GitHub has gives: never verified, never code, added by its link; its version here, and whether GitHub's is newer: only when both are known. */
function githubEntry(kind: CatalogKind, repository: Repository, title: string, version: string | undefined, installed: string | undefined): CatalogEntry
{
    return {
        kind,
        title,
        ...(typeof repository.description === "string" ? { description: repository.description } : {}),
        ...(repository.owner?.login === undefined ? {} : { author: repository.owner.login }),
        ...(version === undefined ? {} : { version }),
        verified: false,
        code: false,
        source: repository.html_url,
        ...(installed === undefined ? {} : { installed }),
        update: installed !== undefined && installed !== "" && version !== undefined && isNewerVersion(version, installed),
        ...(repository.stargazers_count === undefined ? {} : { stars: repository.stargazers_count }),
    };
}

/** A version as a YAML file may write it, 1.0 a number; undefined when it gives none. */
function versionOf(value: unknown): string | undefined
{
    return typeof value === "string" || typeof value === "number" ? String(value) : undefined;
}
