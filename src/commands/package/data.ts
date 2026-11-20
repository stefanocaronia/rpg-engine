// Packages of data alone: an adventure, a theme or a language, from an https link, a .zip or a folder of this computer, read once into its files and told by
// the file at its top. No npm and no code, so no player's yes; packages with code come from npm.
import { basename, join, relative, resolve, sep } from "node:path";
import { largestAdventure, manifestFileName, readAdventureEntries } from "../../adventures/index.ts";
import { packageEntries, type PackageEntry, topFile, unzipFiles, zipListing } from "../../core/archive.ts";
import type { Context } from "../../core/context.ts";
import { filesIn } from "../../core/files.ts";
import { Refusal } from "../../core/refusal.ts";
import { files } from "../../core/store.ts";
import { languageFileName } from "../../languages/index.ts";
import { themeFileName } from "../../themes/index.ts";
import { installAdventure } from "../shared/books/adventures.ts";
import { largestDataZip } from "../shared/packages/unpacked.ts";
import { dataLanguageInstalled } from "./language.ts";
import type { PackageResult } from "./result.ts";
import { themeInstalled } from "./theme.ts";

/** What a package of data alone is, by the file at its top. */
export type DataKind = "adventure" | "theme" | "language";

/** A package of data alone, read whole: what it is, what it was given as, and its files from its top. */
export interface DataPackage
{
    kind: DataKind;
    label: string;
    /** Where it came from, as a later update must: a GitHub repository's link, another link, a .zip's or a folder's path. */
    source: string;
    entries: PackageEntry[];
}

// The file at the top of each kind, the first found telling what it is.
const topFiles: Record<DataKind, string> = { adventure: manifestFileName, theme: themeFileName, language: languageFileName };
// The documents a master imports, never a package: their pages are written by the master (D-483 (10)).
const documentPattern = /\.(pdf|docx?|odt|rtf|txt|md|epub)$/i;

/**
 * Whether what was given to package install is a package of data alone: a .zip, an https link, or a folder with adventure.yaml, theme.yaml, or language.yaml
 * and no package.json for RPG Engine, which npm installs; a document says it is imported instead.
 */
export function isDataSpec(spec: string): boolean
{
    if (documentPattern.test(spec)) {
        throw new Refusal(
            `${spec} is a document, not a package: make an adventure from it with import; package install takes only what has adventure.yaml, theme.yaml or language.yaml. Nothing changed.`,
            "document",
            { name: spec },
        );
    }

    if (/\.zip$/i.test(spec) || /^https:\/\//i.test(spec)) {
        return true;
    }

    const folder = resolve(spec);
    const has = (name: string): boolean => files().exists(join(folder, name));
    return has(manifestFileName) || has(themeFileName) || (has(languageFileName) && !isNpmPackage(folder));
}

/** The package of data a .zip, a folder or an https link gives: a GitHub repository is read as the zip of its default branch, or of the branch or tag its link names. */
export async function readDataSpec(spec: string, context: Context): Promise<DataPackage>
{
    if (/^https:\/\//i.test(spec)) {
        if (context.download === undefined) {
            throw new Error("Only the game's server and the command line download a package: give a .zip or a folder of this computer.");
        }

        const repository = gitHubRepository(spec);
        // Its kind is known only once it is read: the most an adventure may weigh, and a theme's or a language's .zip refused before it is unpacked.
        const bytes = await context.download(repository?.zip ?? spec, largestAdventure, context.signal);
        return zipDataPackage(bytes, spec, repository?.link ?? spec);
    }

    const path = resolve(spec);

    if (/\.zip$/i.test(spec)) {
        const bytes = files().bytes(path);

        if (bytes === undefined) {
            throw new Refusal(`There is no file ${path}: give the path of the package's .zip. Nothing changed.`, "not-on-computer", { name: path });
        }

        return zipDataPackage(bytes, basename(path), path);
    }

    const found = filesIn(path, () => true).map((one): [string, Uint8Array] => [relative(path, one).split(sep).join("/"), files().bytes(one) ?? new Uint8Array()]);
    return { ...dataPackageOf(path, found), source: path };
}

/**
 * A GitHub repository's link, as the catalog gives it, and the address of its zip: of its default branch, or of the branch or tag after /tree/, each part of
 * the name written as an address writes it. Undefined for a link that is not a repository's.
 */
export function gitHubRepository(link: string): { link: string; zip: string; } | undefined
{
    const found = /^https:\/\/github\.com\/([^/#?]+)\/([^/#?]+?)(?:\.git)?(?:\/tree\/([^#?]+?))?\/?(?:[#?].*)?$/i.exec(link.trim());

    if (found === null) {
        return undefined;
    }

    const part = (text: string): string => encodeURIComponent(plainPart(text));
    const reference = found[3] === undefined ? "HEAD" : found[3].split("/").map(part).join("/");
    return { link: `https://github.com/${found[1]}/${found[2]}`, zip: `https://codeload.github.com/${part(found[1])}/${part(found[2])}/zip/${reference}` };
}

/**
 * The package of data a .zip holds, at its top or inside one folder there, as GitHub zips a repository; it throws, saying why, when it is refused. Its names are
 * read first: a theme's or a language's .zip that unpacks to more than they may is refused before any file is unpacked.
 */
export function zipDataPackage(bytes: Uint8Array, label: string, source: string): DataPackage
{
    const listed = zipListing(bytes, label);
    const { kind } = dataPackageOf(label, listed.map(([name]): [string, Uint8Array] => [name, new Uint8Array()]));
    const unpacks = listed.reduce((total, [, size]) => total + size, 0);

    if (kind !== "adventure" && Math.max(unpacks, bytes.length) > largestDataZip) {
        const why = `its .zip unpacks to ${Math.ceil(Math.max(unpacks, bytes.length) / 1024 / 1024)} MB, more than the ${largestDataZip / 1024 / 1024} MB a ${kind} may`;
        throw new Refusal(`${label} cannot be used: ${why}. Nothing changed.`, `${kind}-refused`, { name: label, why });
    }

    return { ...dataPackageOf(label, unzipFiles(bytes, label, kind === "adventure" ? largestAdventure : largestDataZip, kind === "adventure" ? "an adventure" : `a ${kind}`)), source };
}

/** Installs a package of data alone, as the file at its top says it is: an adventure in the campaign, a theme or a language for every campaign on this computer. */
export async function installDataPackage(root: string, context: Context, data: DataPackage, from: string): Promise<PackageResult>
{
    if (data.kind === "adventure") {
        return { kind: "adventure-installed", ...installAdventure(root, context, readAdventureEntries(data.label, data.entries), from) };
    }

    return data.kind === "theme" ? themeInstalled(root, context, data) : await dataLanguageInstalled(root, context, data);
}

/** A part of an address as written, its %20 and such read back: a link copied from a browser or typed by hand gives the same. */
function plainPart(text: string): string
{
    try {
        return decodeURIComponent(text);
    } catch {
        return text;
    }
}

/** A package's files, their paths checked, told by the file at their top; refused when none of the three is there. */
function dataPackageOf(label: string, found: [string, Uint8Array][]): Omit<DataPackage, "source">
{
    const entries = packageEntries(label, found, "the package", Object.values(topFiles));
    const kind = (Object.keys(topFiles) as DataKind[]).find((one) => topFile(entries, topFiles[one]) !== undefined);

    if (kind === undefined) {
        throw new Refusal(
            `${label} has no ${Object.values(topFiles).join(", ")} at its top: it is no adventure, theme or language. A document or a folder of notes is imported by the master, `
                + "who writes its pages. Nothing changed.",
            "not-package",
            { name: label },
        );
    }

    return { kind, label, entries };
}

/** Whether a folder is a package for npm: its package.json says what it is for RPG Engine. */
function isNpmPackage(folder: string): boolean
{
    try {
        return Object.hasOwn(JSON.parse(files().text(join(folder, "package.json")) ?? "{}") as object, "rpg-engine");
    } catch {
        return false;
    }
}
