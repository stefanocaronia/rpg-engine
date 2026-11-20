// A language as a package of data alone: unpacked for every campaign on this computer, checked as a language from npm is, one package for each language;
// and what both kinds share, the page's phrases to check against and taking one off.
import { join, resolve } from "node:path";
import type { Context } from "../../core/context.ts";
import { appendLogEntry } from "../../core/log.ts";
import { Refusal } from "../../core/refusal.ts";
import { files } from "../../core/store.ts";
import { installedLanguages, languageFileName, type LanguagePack, languagePackProblems, readLanguagePack } from "../../languages/index.ts";
import { dataLanguagesFolder, isDataLanguage, keptFiles, languageFolders, placeTrial, writeTrial } from "../shared/packages/unpacked.ts";
import { newDatedLogEntry } from "../shared/time/time.ts";
import type { DataPackage } from "./data.ts";
import { languagesHere } from "./here.ts";
import type { PackageResult } from "./result.ts";

// The files at a language's top it uses, as their readers name them; and its licence.
const topFiles = [languageFileName, "phrases.json", "guide.md"];
const licence = /^(licen[cs]e|copying)(\.(md|txt))?$/i;

/**
 * Installs a language of data alone for every campaign on this computer, in the folder of its code: texts the dashboard shows, never code, so no yes is asked;
 * refused whole when its phrases lose a {name} or turn the order of a text. It takes the place of another package of the same language, from npm too.
 */
export async function dataLanguageInstalled(root: string, context: Context, data: DataPackage): Promise<PackageResult>
{
    const folder = dataLanguagesFolder(context);

    if (folder === undefined) {
        throw new Error("Languages are installed only by the game's server or the command line, which keep them for every campaign on this computer.");
    }

    const kept = keptFiles(data.label, data.entries, isLanguageFile, "language-refused", "a language").map(([parts, bytes]): [string[], Uint8Array] => [writtenPath(parts), bytes]);
    // Checked where it is written, in a folder of its own that no list reads, then put where its code puts it.
    const trial = writeTrial(folder, context, kept, data.source);

    try {
        const checked = checkedPack(context, trial);
        const why = checked.problems.map((problem) => problem.replaceAll(trial, data.label)).join("; ");

        if (checked.pack === undefined || why !== "") {
            throw new Refusal(`${data.label} cannot be used: ${why}. Nothing changed.`, "language-refused", { name: data.label, why });
        }

        const code = checked.pack.code;
        const target = join(folder, code);
        // One language, one package: those before for the same code go, npm's first, as npm may fail to take one off; then the new one takes its place.
        const others = installedLanguages(languageFolders(context)).filter((one) => one.code.toLowerCase() === code.toLowerCase());

        for (const other of others.filter((one) => !isDataLanguage(context, one))) {
            await takeOffLanguage(context, other);
        }

        placeTrial(trial, target, context);
        others.filter((one) => isDataLanguage(context, one) && files().modified(one.folder) !== undefined && !isSameFolder(one.folder, target)).forEach((one) => files().removeFolder(one.folder));
        const language = languagesHere(context).find((one) => one.unpacked === true && one.code.toLowerCase() === code.toLowerCase());

        if (language === undefined) {
            throw new Error(`${data.label} was unpacked in ${target}, and does not read there: install it again.`);
        }

        const replaced = others.find((one) => one.package !== language.package);
        appendLogEntry(root, newDatedLogEntry(root, context, "package-installed", "public", { package: language.package, version: language.version, verified: false, kind: "language" }));
        return { kind: "language-installed", language, ...(replaced === undefined ? {} : { replaced: replaced.package }), missing: checked.missing };
    } finally {
        files().removeFolder(trial);
    }
}

/** Takes a language of data alone off this computer. */
export function dataLanguageUninstalled(root: string, context: Context, found: LanguagePack): PackageResult
{
    files().removeFolder(found.folder);
    appendLogEntry(root, newDatedLogEntry(root, context, "package-uninstalled", "public", { package: found.package, kind: "language" }));
    return { kind: "uninstalled", name: found.name, wasUsed: false, extension: false };
}

/** Takes a language package off this computer, as it came: one of data alone by its folder, one of npm's with npm, refused when npm cannot. */
export async function takeOffLanguage(context: Context, pack: LanguagePack): Promise<void>
{
    if (isDataLanguage(context, pack)) {
        files().removeFolder(pack.folder);
        return;
    }

    if (context.packages === undefined) {
        throw new Error(`${pack.package}, the language ${pack.name} from npm, is on this computer, and only the game's server and the command line, which reach npm, take it off.`);
    }

    const why = await context.packages.uninstall(pack.package);
    (context.extensionFolders ?? []).forEach((folder) => files().refresh(folder));

    if (why !== undefined) {
        throw new Refusal(
            `${pack.package}, the language ${pack.name} on this computer, could not be taken off to make room for the new one: ${why}. Close what may be using its files, `
                + "such as another game's server or an editor, and install again. Nothing changed.",
            "uninstall-failed",
            { name: pack.package, why },
        );
    }
}

/** The dashboard's phrases, by their English, as its curated Italian lists them all; none where the built page is not here. */
export function pagePhrases(context: Context): Record<string, string>
{
    try {
        return JSON.parse(files().text(join(context.pageFolder ?? "", "i18n", "it.json")) ?? "{}") as Record<string, string>;
    } catch {
        return {};
    }
}

/** A language package read from its folder and checked against the page's phrases: what keeps it from being used, and the phrases it lacks. */
function checkedPack(context: Context, folder: string): { pack?: LanguagePack; problems: string[]; missing: number; }
{
    try {
        const pack = readLanguagePack(folder);
        return { pack, ...languagePackProblems(pack, Object.keys(pagePhrases(context))) };
    } catch (error) {
        return { problems: [error instanceof Error ? error.message : String(error)], missing: 0 };
    }
}

/** Whether two paths are the same folder, as the disk of this computer tells names apart. */
function isSameFolder(first: string, second: string): boolean
{
    const plain = (path: string): string => (process.platform === "win32" || process.platform === "darwin" ? resolve(path).toLowerCase() : resolve(path));
    return plain(first) === plain(second);
}

/** Whether a path of a package is a file a language uses: its language.yaml, phrases, Guide and licence at its top, a game system's words under systems/. */
function isLanguageFile(parts: string[]): boolean
{
    if (parts.length === 1) {
        return topFiles.includes(parts[0].toLowerCase()) || licence.test(parts[0]);
    }

    return parts.length === 4 && parts[0].toLowerCase() === "systems" && parts[2].toLowerCase() === "words" && /\.yaml$/i.test(parts[3]);
}

/** A language's file where its readers look for it: the names they read written as they read them. */
function writtenPath(parts: string[]): string[]
{
    return parts.length === 1 ? [topFiles.find((one) => one === parts[0].toLowerCase()) ?? parts[0]] : ["systems", parts[1], "words", parts[3]];
}
