// The extensions a campaign uses (D-27, D-28, D-427): those campaign.yaml lists, as installed, and their parts of the instructions over the system's (D-121).
import { basename, join, resolve } from "node:path";
import { z } from "zod";
import { campaignFileName, readOneSetting, readTextSetting } from "../../../campaign/index.ts";
import { packageCodeMayRun } from "../../../core/consents.ts";
import type { Context } from "../../../core/context.ts";
import type { InstructionPart } from "../../../core/instruction-parts.ts";
import type { FigureSize } from "../../../core/package-api.ts";
import { updateEngine } from "../../../core/package-declarations.ts";
import type { Problem } from "../../../core/problem.ts";
import { files, isInside } from "../../../core/store.ts";
import { comparableText } from "../../../core/text.ts";
import { type CodePackage, type Extension, type ExtensionWords, extensionWords, findExtension, hasConsent } from "../../../extensions/index.ts";
import { isVerified } from "../../../packages/index.ts";
import { isCoreField } from "../../../pages/index.ts";
import { type GameSystem, layeredSystemWords, systemApiProblem, systemContentFolders, systemPageModule, systemWords } from "../../../systems/index.ts";

/** The extensions the campaign uses, and what keeps one from being used, with how to fix it. */
export interface CampaignExtensions
{
    extensions: Extension[];
    problems: Problem[];
}

/**
 * The extensions campaign.yaml lists (D-27), each as installed on this computer, in the order written: the nearest layer last. One not installed, that does not
 * read, that needs another game system or has the name of another is left out, with its problem: the campaign plays without it.
 */
export function campaignExtensions(root: string, context: Context): CampaignExtensions
{
    return files().remember(`extensions ${resolve(root)}`, extensionSources(root, context), () => readCampaignExtensions(root, context));
}

/** What the campaign's extensions are read from: campaign.yaml and the folders of the installed packages, which `package` refreshes after npm (D-436). */
export function extensionSources(root: string, context: Context): (path: string) => boolean
{
    const settings = resolve(join(root, campaignFileName));
    const folders = (context.extensionFolders ?? []).map((folder) => resolve(folder));
    return (path) => path === settings || folders.some((folder) => path === folder || isInside(folder, path) || isInside(path, folder));
}

/** The packages campaign.yaml lists as extensions, with the version each was added with: none when it lists none or the list does not read. */
export function listedExtensions(root: string): Record<string, string>
{
    try {
        const listed = readOneSetting(root, "extensions");
        // A version written as a number, as 1.0, is the version all the same.
        return z.record(z.string(), z.union([z.string(), z.number().transform(String)])).safeParse(listed).data ?? {};
    } catch {
        return {};
    }
}

/**
 * Whether a package's code may run, on the server and in the dashboard's page alike (D-441, D-478, D-510): ours, verified; a system the engine ships; one the
 * player installed from a folder or a file of their own; or another's that the player said yes to, at this version and with these files.
 */
export function runsCode(code: CodePackage): boolean
{
    return code.kind === "system" ? packageCodeMayRun(code.folder) : isVerified(code.package, code.linked) || code.linked || hasConsent(code.folder, code.package, code.version);
}

/**
 * A package's words in a language, or its base language, by the English its code writes (D-502): an extension's words/, a game system's words section of its
 * own; undefined when it has none in it. It throws when they do not read.
 */
export function packageWords(code: CodePackage, language: string): ExtensionWords | undefined
{
    if (code.kind === "extension") {
        return extensionWords(code.folder, language);
    }

    const words = systemWords(code.folder, language);
    return words === undefined ? undefined : { words: words.words };
}

/** The code of a package of the campaign for the dashboard's page (D-510, D-511): whose it is, its module's file and address, and its figures. */
export interface PageModule
{
    package: string;
    kind: "system" | "extension";
    version: string;
    file: string;
    address: string;
    figures: Record<string, FigureSize>;
    /** Its words in the campaign's language, by their English, for its page code's own words; none when it is written in that language. */
    words?: Record<string, string>;
}

/**
 * The page modules of the campaign's packages whose code runs (D-510, D-511): its game system's, then its extensions', in the order campaign.yaml lists them.
 * A system the engine ships, or one of ours, runs; another's as an extension's does, after the player's yes.
 */
export function campaignPageModules(root: string, context: Context, system: GameSystem | undefined): PageModule[]
{
    const own = system === undefined ? undefined : systemPageModule(system.folder);
    const language = readTextSetting(root, "language");
    // A system made for an API this engine does not read brings no code, in the page either.
    const systems = own === undefined || system === undefined || !packageCodeMayRun(system.folder) || systemApiProblem(system.folder) !== undefined
        ? []
        : [{
            package: own.package,
            kind: "system" as const,
            version: own.version,
            file: own.file,
            address: pageAddress(own.package, own.version, own.file),
            figures: system.figures,
            ...wordsIn(language, system.language, () => layeredSystemWords(systemContentFolders(system), language ?? "")?.words),
        }];
    const extensions = campaignExtensions(root, context).extensions.flatMap((extension) =>
        extension.page === undefined || !runsCode(extension)
            ? []
            : [{
                package: extension.package,
                kind: "extension" as const,
                version: extension.version,
                file: extension.page,
                address: pageAddress(extension.package, extension.version, extension.page),
                figures: extension.figures,
                ...wordsIn(language, extension.language, () => extensionWords(extension.folder, language ?? "")?.words),
            }]
    );
    return [...systems, ...extensions];
}

/** A package's words in the campaign's language, when it is written in another; none when they are not there or do not read, which validate says. */
function wordsIn(language: string | undefined, own: string, read: () => Record<string, string> | undefined): { words?: Record<string, string>; }
{
    if (language === undefined || language.split("-")[0] === own.split("-")[0]) {
        return {};
    }

    try {
        const words = read();
        return words === undefined || Object.keys(words).length === 0 ? {} : { words };
    } catch {
        return {};
    }
}

/** The address the dashboard serves a package's page module at: by the package's name and version, its folder's files beside it. */
export function pageAddress(name: string, version: string, file: string): string
{
    return `/pkg/${encodeURIComponent(name)}/${encodeURIComponent(version)}/${encodeURIComponent(basename(file))}`;
}

/**
 * The parts of the instructions of the system and of the extensions above it, each part layered as D-121 says, under a title of the extension's own (D-441): an
 * extension adds to a part, or takes its place when it is verified.
 */
export function layeredParts(parts: Record<string, InstructionPart>, extensions: Extension[]): Record<string, InstructionPart>
{
    const layered = { ...parts };

    for (const extension of extensions) {
        const title = `### ${extension.name.charAt(0).toUpperCase()}${extension.name.slice(1)} (extension)`;

        for (const [name, part] of Object.entries(extension.parts)) {
            const below = layered[name];
            const text = `${title}\n\n${part.text}`;
            const replaces = part.replace && isVerified(extension.package, extension.linked);
            layered[name] = replaces || below === undefined ? { text, replace: replaces } : { text: `${below.text}\n\n${text}`, replace: below.replace };
        }
    }

    return layered;
}

/** The extensions for status (D-28): each with its line, for the master to know what it brings. */
export function extensionsLine(root: string, context: Context): string
{
    const { extensions } = campaignExtensions(root, context);
    return extensions.length === 0 ? "" : `Extensions: ${extensions.map((extension) => `${extension.name} (${extension.about})`).join("; ")}.`;
}

/** The fields of the core an extension declares among its fields or counters, which no extension may declare (D-505). */
function coreFieldsOf(extension: Extension): string[]
{
    return [...Object.keys(extension.adds.fields ?? {}), ...Object.keys(extension.adds.counters ?? {})].filter(isCoreField);
}

function readCampaignExtensions(root: string, context: Context): CampaignExtensions
{
    const extensions: Extension[] = [];
    const problems: Problem[] = [];
    const system = readTextSetting(root, "system");

    // A list written by hand, or a map that does not read, would leave the campaign without its extensions in silence.
    if (extensionsUnread(root)) {
        problems.push({
            path: campaignFileName,
            message: 'extensions in campaign.yaml does not read: it is a map of each package and its version, such as "@rpgengine/weather": "0.2.3"; the campaign plays without them.',
            fix: "add each with package install",
        });
    }

    for (const name of Object.keys(listedExtensions(root))) {
        let extension: Extension | undefined;

        try {
            extension = findExtension(context.extensionFolders ?? [], name);
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            // One made for a newer API waits for the engine, never for itself.
            problems.push({ path: campaignFileName, message, ...(message.includes(updateEngine) ? {} : { fix: `install it again with package install ${name}` }) });
            continue;
        }

        if (extension === undefined) {
            problems.push({ path: campaignFileName, message: `The extension ${name} is not installed on this computer: the campaign plays without it.`, fix: `install it with package install ${name}` });
        } else if (extension.needs.system !== undefined && comparableText(extension.needs.system) !== comparableText(system ?? "")) {
            problems.push({
                path: campaignFileName,
                message: `The extension ${name} needs the game system ${extension.needs.system}, and the campaign plays ${system ?? "none"}: it is left out.`,
                fix: `take it away with package remove ${extension.name}`,
            });
        } else if (comparableText(extension.name) === comparableText(system ?? "")) {
            // Its state, widgets and pictures go by its name, which the system's would share (D-514).
            problems.push({
                path: campaignFileName,
                message: `The extension ${name} has the name of the game system the campaign plays, ${system ?? ""}: it is left out.`,
                fix: `take it away with package remove ${extension.package}`,
            });
        } else if (coreFieldsOf(extension).length > 0) {
            problems.push({
                path: campaignFileName,
                message: `The extension ${name} declares ${coreFieldsOf(extension).join(", ")}, which the engine's own pages hold: it is left out.`,
                fix: `install another version of it with package install ${extension.name}, or take it away with package remove ${extension.name}`,
            });
        } else if (extensions.some((other) => other.name === extension.name)) {
            problems.push({
                path: campaignFileName,
                message: `The extensions ${extensions.find((other) => other.name === extension.name)?.package ?? ""} and ${extension.package} have the same name, ${extension.name}: the second is left out.`,
                fix: `take one away with package remove ${extension.package}`,
            });
        } else {
            extensions.push(extension);
        }
    }

    return { extensions, problems };
}

/** Whether campaign.yaml writes extensions that do not read as a map of package and version, as a list. */
function extensionsUnread(root: string): boolean
{
    try {
        const written = readOneSetting(root, "extensions");
        const none = written === undefined || written === null || (typeof written === "object" && !Array.isArray(written) && Object.keys(written).length === 0);
        return !none && Object.keys(listedExtensions(root)).length === 0;
    } catch {
        return false;
    }
}
