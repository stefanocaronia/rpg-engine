// The extensions a campaign uses (D-27, D-28, D-427): those campaign.yaml lists, as installed, and their parts of the instructions over the system's (D-121).
import { join, resolve } from "node:path";
import { z } from "zod";
import { campaignFileName, readOneSetting, readTextSetting } from "../campaign/index.ts";
import type { Context } from "../core/context.ts";
import type { InstructionPart } from "../core/instruction-parts.ts";
import type { Problem } from "../core/problem.ts";
import { files, isInside } from "../core/store.ts";
import { comparableText } from "../core/text.ts";
import { type Extension, findExtension, isVerified } from "../extensions/index.ts";
import { isCoreField } from "../pages/index.ts";

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
        return z.record(z.string(), z.string()).safeParse(listed).data ?? {};
    } catch {
        return {};
    }
}

/** Whether an extension's code may run (D-441): ours, verified, or one the player installed from a folder of their own; never a stranger's from npm, for now. */
export function runsCode(extension: Extension): boolean
{
    return isVerified(extension.package, extension.linked) || extension.linked;
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

/** The fields of the core an extension declares among its fields or counters, which no extension may write (D-505). */
function coreFieldsOf(extension: Extension): string[]
{
    return [...Object.keys(extension.adds.fields ?? {}), ...Object.keys(extension.adds.counters ?? {})].filter(isCoreField);
}

function readCampaignExtensions(root: string, context: Context): CampaignExtensions
{
    const extensions: Extension[] = [];
    const problems: Problem[] = [];
    const system = readTextSetting(root, "system");

    for (const name of Object.keys(listedExtensions(root))) {
        let extension: Extension | undefined;

        try {
            extension = findExtension(context.extensionFolders ?? [], name);
        } catch (error) {
            problems.push({ path: campaignFileName, message: error instanceof Error ? error.message : String(error), fix: `install it again with package install ${name}` });
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
