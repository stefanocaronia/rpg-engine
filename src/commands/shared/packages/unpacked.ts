// Where the packages of data alone live on this computer, for every campaign: themes and languages unpacked by the engine, apart from npm's packages.
import { dirname, join } from "node:path";
import { refuseTwice } from "../../../core/archive-paths.ts";
import type { PackageEntry } from "../../../core/archive.ts";
import type { Context } from "../../../core/context.ts";
import { Refusal } from "../../../core/refusal.ts";
import { files, isInside } from "../../../core/store.ts";
import { comparableText } from "../../../core/text.ts";
import { installedLanguages, type LanguagePack } from "../../../languages/index.ts";
import { type InstalledTheme, installedThemes } from "../../../themes/index.ts";

/** The most the files a theme or a language keeps may weigh, all together: faces and pictures, or phrases and a Guide. */
export const largestUnpacked = 20 * 1024 * 1024;

/** The most the .zip of a theme or a language may unpack to, before what it keeps is chosen. */
export const largestDataZip = 50 * 1024 * 1024;

// The file beside a theme's or a language's own where it came from: a dot, so that no package brings one of its own.
const sourceFileName = ".source";
// How long a folder being unpacked may lie before it is taken for one an install left behind.
const staleAfter = 60 * 60 * 1000;

/** The folder of the themes installed on their own; undefined where nothing installs them. */
export function themesFolder(context: Context): string | undefined
{
    return context.unpacked === undefined ? undefined : join(context.unpacked, "themes");
}

/** The folder of the languages installed as data alone; undefined where nothing installs them. */
export function dataLanguagesFolder(context: Context): string | undefined
{
    return context.unpacked === undefined ? undefined : join(context.unpacked, "languages");
}

/** The folders languages are read from: npm's packages first, then those of data alone. */
export function languageFolders(context: Context): string[]
{
    const data = dataLanguagesFolder(context);
    return [...(context.extensionFolders ?? []), ...(data === undefined ? [] : [data])];
}

/** The themes installed on this computer, those refused included with why. */
export function themesHere(context: Context): InstalledTheme[]
{
    const folder = themesFolder(context);
    return folder === undefined ? [] : installedThemes(folder);
}

/** An installed theme by its id or its name; undefined when there is none. */
export function findTheme(context: Context, name: string): InstalledTheme | undefined
{
    return themesHere(context).find((one) => one.id === name.trim() || (one.theme !== undefined && comparableText(one.theme.name) === comparableText(name)));
}

/** A theme or a language of data alone, as a name finds it. */
export type Unpacked = { kind: "theme"; theme: InstalledTheme; } | { kind: "language"; pack: LanguagePack; };

/**
 * The theme or the language of data alone a name finds: theme:<id or name> and language:<code or name> name one kind alone; an npm name, @scope/name or
 * npm:name, none. Without a prefix a theme first, then a language; undefined when none is here.
 */
export function findUnpacked(context: Context, name: string): Unpacked | undefined
{
    const prefixed = /^(theme|language):(.+)$/i.exec(name.trim());
    const kind = prefixed?.[1].toLowerCase();
    const asked = prefixed?.[2] ?? name;

    if (prefixed === null && /^(@|npm:)/i.test(name.trim())) {
        return undefined;
    }

    const theme = kind === "language" ? undefined : findTheme(context, asked);
    const pack = kind === "theme" || theme !== undefined ? undefined : findDataLanguage(context, asked);
    return theme !== undefined ? { kind: "theme", theme } : pack !== undefined ? { kind: "language", pack } : undefined;
}

/** How a theme or a language of data alone is named to be told from an npm package of the same name: theme:<id>, language:<code>. */
export function unpackedName(found: Unpacked): string
{
    return found.kind === "theme" ? `theme:${found.theme.id}` : `language:${found.pack.code}`;
}

/** Where a theme or a language of data alone came from, as it was installed: a GitHub repository's link, another link, a .zip's or a folder's path. */
export function unpackedSource(folder: string): string | undefined
{
    return files().text(join(folder, sourceFileName))?.trim() || undefined;
}

/** Whether a link a catalog gives is where a package here came from: GitHub's links are the same in any case, with or without a slash at their end. */
export function isSameSource(recorded: string | undefined, link: string): boolean
{
    const plain = (text: string): string => text.trim().replace(/(\.git)?\/*$/i, "").toLowerCase();
    return recorded !== undefined && plain(recorded) === plain(link);
}

/** Whether a language package is one of data alone, unpacked by the engine rather than installed by npm. */
export function isDataLanguage(context: Context, pack: LanguagePack): boolean
{
    const folder = dataLanguagesFolder(context);
    return folder !== undefined && isInside(folder, pack.folder);
}

/** A language of data alone by its code, its name or its package's name; undefined when there is none. */
export function findDataLanguage(context: Context, name: string): LanguagePack | undefined
{
    const wanted = comparableText(name);
    return installedLanguages(languageFolders(context)).find((pack) => isDataLanguage(context, pack) && [pack.code, pack.name, pack.package].some((one) => comparableText(one) === wanted));
}

/** The files of a package of data a theme or a language keeps, those `keep` takes; refused, with `code`, when they weigh more than `what` may, or come twice. */
export function keptFiles(label: string, entries: PackageEntry[], keep: (parts: string[]) => boolean, code: string, what: string): PackageEntry[]
{
    const kept = entries.filter(([parts]) => keep(parts));
    refuseTwice(label, kept.map(([parts]) => parts.join("/")));
    const size = kept.reduce((total, [, bytes]) => total + bytes.length, 0);

    if (size > largestUnpacked) {
        const why = `its files weigh ${Math.ceil(size / 1024 / 1024)} MB, more than the ${largestUnpacked / 1024 / 1024} MB ${what} may`;
        throw new Refusal(`${label} cannot be used: ${why}. Nothing changed.`, code, { name: label, why });
    }

    return kept;
}

/**
 * Writes a package's files, with where it came from, into a folder of its own beside those installed, which no list reads, for it to be checked there; the
 * folders an install left behind more than an hour ago go first.
 */
export function writeTrial(folder: string, context: Context, entries: PackageEntry[], source: string): string
{
    const now = context.now().getTime();

    for (const entry of files().entries(folder)) {
        const path = join(folder, entry.name);

        if (entry.isFolder && /^\.(installing|replaced)-/.test(entry.name) && now - (files().modified(path) ?? now) > staleAfter) {
            files().removeFolder(path);
        }
    }

    const trial = join(folder, `.installing-${context.newId()}`);

    for (const [parts, bytes] of entries) {
        files().writeBytes(join(trial, ...parts), bytes);
    }

    files().write(join(trial, sourceFileName), `${source}\n`);
    return trial;
}

/** Puts a folder checked in place of the one there, each move in one step: the one before is set aside, then taken away once the new one is there. */
export function placeTrial(trial: string, target: string, context: Context): void
{
    const aside = join(dirname(target), `.replaced-${context.newId()}`);
    const before = files().modified(target) !== undefined;

    if (before) {
        moveFolder(target, aside);
    }

    try {
        moveFolder(trial, target);
    } catch (error) {
        if (before) {
            moveFolder(aside, target);
        }

        throw error;
    }

    files().removeFolder(aside);
}

// How many times a folder is moved before giving up, a tenth of a second apart: an antivirus or an open window may hold it for a moment.
const moveTries = 10;

/** Moves a folder, trying again while something holds it; refused, with what to do, when it stays held. */
function moveFolder(from: string, to: string): void
{
    for (let tried = 1;; tried++) {
        try {
            files().move(from, to);
            return;
        } catch (error) {
            const code = (error as NodeJS.ErrnoException).code;

            if ((code !== "EPERM" && code !== "EBUSY" && code !== "EACCES") || tried === moveTries) {
                const why = error instanceof Error ? error.message : String(error);
                throw new Refusal(`${from} could not be moved: ${why}. Close what is using that folder, such as a window open on it, and install it again. Nothing changed.`, "folder-held", {
                    name: from,
                    why,
                });
            }

            Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 100);
        }
    }
}
