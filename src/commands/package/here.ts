// What is on this computer: the game systems, languages and extensions npm installed, and where each takes reports of its problems
import { join } from "node:path";
import { readTextSetting } from "../../campaign/index.ts";
import { type Context, engineSystemsFolder } from "../../core/context.ts";
import { installedFromFolder } from "../../core/files.ts";
import { files, isInside } from "../../core/store.ts";
import { comparableText } from "../../core/text.ts";
import { type Extension, findExtension, installedExtensions, readExtension, shortName } from "../../extensions/index.ts";
import { installedLanguages } from "../../languages/index.ts";
import { isPackageName, issuesPage, isVerified, verifiedScope } from "../../packages/index.ts";
import { findSystem, readableSystems, systemFolders, systemHasCode, systemInFolder, systemWords } from "../../systems/index.ts";

/** A game system on this computer (D-485): shipped with the engine, or a package npm installed; the campaign plays one, chosen in its setup. */
export interface InstalledSystem
{
    name: string;
    title: string;
    version?: string;
    package?: string;
    verified: boolean;
    used: boolean;
    /** Whether it brings code, which runs from the next start of the game's server. */
    code: boolean;
    /** Where its problems are reported, as its package.json says: the engine's own for those shipped with it. */
    issues?: string;
}

/** A language package on this computer (D-485 (3)), for every campaign: one for each language. */
export interface InstalledLanguage
{
    code: string;
    name: string;
    package: string;
    version: string;
    verified: boolean;
    /** Where its problems are reported, as its package.json says. */
    issues?: string;
}

/** Whether a package is on this computer, by its name as package takes it: an extension, a game system or a language npm installed (D-510). */
export function isInstalledPackage(context: Context, name: string): boolean
{
    const asked = name.startsWith("npm:") ? name.slice(4) : name.startsWith("@") ? name : `${verifiedScope}${name}`;
    // An npm name only, never a path that climbs to npm's own folder (D-510).
    return [asked, name].some((one) => isPackageName(one) && installedExtensionFolder(context, one) !== undefined);
}

/** The game systems on this computer, those shipped with the engine first, with the package each came in when npm installed it (D-485). */
export function systemsHere(root: string, context: Context): InstalledSystem[]
{
    const plays = readTextSetting(root, "system") ?? "";
    const language = readTextSetting(root, "language");
    const folders = systemFolders(context.systemFolders);
    return readableSystems(context.systemFolders).map((system): InstalledSystem => {
        const manifest = packageOf(folders.find((one) => one.name === system.name)?.folder ?? system.folder);
        // The engine's own have no package of their own here; one npm installed is ours only by our scope, and never from a folder (D-441).
        const shipped = isInside(engineSystemsFolder, system.folder);
        const linked = installedFromFolder(system.folder);
        return {
            name: system.name,
            title: language === undefined ? system.title : titleIn(system.folder, system.title, language),
            ...(manifest === undefined ? {} : { version: manifest.version }),
            ...(manifest === undefined || shipped ? {} : { package: manifest.name }),
            verified: shipped || (manifest !== undefined && isVerified(manifest.name, linked)),
            used: comparableText(system.name) === comparableText(plays),
            code: systemHasCode(system.folder),
            // The engine's own are reported where the engine is: its package.json is in the folder above its systems.
            ...issuesOf(shipped ? join(engineSystemsFolder, "..") : system.folder),
        };
    });
}

/** The language packages on this computer, one for each language (D-485 (3)). */
export function languagesHere(context: Context): InstalledLanguage[]
{
    return installedLanguages(context.extensionFolders ?? []).map((pack) => ({
        code: pack.code,
        name: pack.name,
        package: pack.package,
        version: pack.version,
        verified: isVerified(pack.package, installedFromFolder(pack.folder)),
        ...issuesOf(pack.folder),
    }));
}

/** Whether a game system by this name is on this computer; one whose system.yaml does not read is there too, and validate says why. */
export function isSystemHere(context: Context, name: string): boolean
{
    try {
        return findSystem(context.systemFolders, name) !== undefined;
    } catch {
        return true;
    }
}

/** The folder npm installed a package in, among the extensions' folders; undefined when it is not there. */
export function installedExtensionFolder(context: Context, name: string): string | undefined
{
    return (context.extensionFolders ?? []).map((folder) => join(folder, ...name.split("/"))).find((folder) => files().exists(join(folder, "package.json")));
}

/** The installed extension of this package, when it reads; undefined when it is missing or broken. */
export function usable(context: Context, name: string): Extension | undefined
{
    try {
        return findExtension(context.extensionFolders ?? [], name);
    } catch {
        return undefined;
    }
}

/** The extension npm installed by this whole name, or why it is none: not there under that name, or not read, with what is wrong. */
export function installedAs(context: Context, name: string): { extension: Extension; } | { unread: string; } | { missing: true; }
{
    const found = installedExtensions(context.extensionFolders ?? []).find((one) => one.package === name);

    if (found === undefined) {
        return { missing: true };
    }

    try {
        return { extension: readExtension(found.folder) };
    } catch (error) {
        return { unread: error instanceof Error ? error.message : String(error) };
    }
}

/** Why a system npm installed is not among those that read: its system.yaml does not, or it has none. */
export function unreadSystemWhy(folder: string | undefined, name: string): string
{
    if (folder === undefined || !files().exists(join(folder, "system.yaml"))) {
        return "it has no system.yaml: it is no game system";
    }

    try {
        systemInFolder(folder, shortName(name).replace(/^system-/, ""));
        return "it does not read as a game system";
    } catch (error) {
        return `its system.yaml does not read: ${error instanceof Error ? error.message : String(error)}`;
    }
}

/** A system's title in the campaign's language, as its own words give it; as it is where they do not, or do not read. */
function titleIn(folder: string, title: string, language: string): string
{
    try {
        return systemWords(folder, language)?.words[title] ?? title;
    } catch {
        return title;
    }
}

/** Where the package in this folder takes reports of its problems, as its package.json says; nothing when it says none or has none that reads. */
export function issuesOf(folder: string): { issues?: string; }
{
    try {
        const issues = issuesPage(JSON.parse(files().text(join(folder, "package.json")) ?? "") as { bugs?: unknown; repository?: unknown; });
        return issues === undefined ? {} : { issues };
    } catch {
        return {};
    }
}

/** The name and the version a package.json in this folder gives; undefined when it has none that reads. */
function packageOf(folder: string): { name: string; version: string; } | undefined
{
    try {
        const read = JSON.parse(files().text(join(folder, "package.json")) ?? "") as { name?: unknown; version?: unknown; };
        return typeof read.name === "string" && typeof read.version === "string" ? { name: read.name, version: read.version } : undefined;
    } catch {
        return undefined;
    }
}
