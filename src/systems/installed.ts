// Finds the installed systems, by folder and by name, read with a campaign's layers
import { installedFromFolder, npmPackageName } from "../core/files.ts";
import { comparableText } from "../core/text.ts";
import { campaignDataNames, type SystemLayer } from "./campaign-data.ts";
import { type SystemFolder, systemFolders } from "./folders.ts";
import type { GameSystem } from "./game-system.ts";
import { readSystem } from "./read.ts";

/** The systems installed in these folders, nearest folder first: each folder in them with a system.yaml. A name found twice is the nearest one. */
export function installedSystems(folders: string[]): GameSystem[]
{
    const systems: GameSystem[] = [];

    for (const found of systemFolders(folders)) {
        if (!systems.some((system) => comparableText(system.name) === comparableText(found.name))) {
            systems.push(readInstalled(found));
        }
    }

    return systems;
}

/** The installed game systems that read, for a list of them: one whose system.yaml does not read stops no list, and the campaign that plays it hears why. */
export function readableSystems(folders: string[]): GameSystem[]
{
    return systemFolders(folders).flatMap((found, index, all) => {
        if (all.slice(0, index).some((before) => comparableText(before.name) === comparableText(found.name))) {
            return [];
        }

        try {
            return [readSystem(found.folder, found.name)];
        } catch {
            return [];
        }
    });
}

/**
 * The installed system with the layers over it, in order, the nearest to the campaign last and winning (CAM-2); a layer with which it does not read is left out,
 * with why, and the others stay (CAM-3). Undefined as a system when none is installed by that name.
 */
export function findCampaignSystem(folders: string[], name: string, layers: SystemLayer[], ruleset?: string): { system?: GameSystem; refused: { from: string; problem: string; }[]; }
{
    const found = systemFolders(folders).find((candidate) => comparableText(candidate.name) === comparableText(name.trim()));
    const given = layers.filter((layer) => campaignDataNames.some((key) => layer.data[key] !== undefined && layer.data[key] !== null));

    if (found === undefined) {
        return { refused: [] };
    }

    try {
        return { system: readSystem(found.folder, found.name, given, ruleset), refused: [] };
    } catch {
        // One layer at a time, to leave out only those that do not read.
    }

    const kept: SystemLayer[] = [];
    const refused: { from: string; problem: string; }[] = [];

    for (const layer of given) {
        try {
            readSystem(found.folder, found.name, [...kept, layer], ruleset);
            kept.push(layer);
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            refused.push({ from: layer.from, problem: message.replace(/^The game system .*? cannot be read, because .*? is not valid:\s*/s, "") });
        }
    }

    return { system: readInstalled(found, kept, ruleset), refused };
}

/**
 * The installed system with this name, ignoring case, from the nearest folder that has it, with the version of its rules asked, else its first (VER-2); undefined
 * when none is. Only its own system.yaml is read, and its version's.
 */
export function findSystem(folders: string[], name: string, ruleset?: string): GameSystem | undefined
{
    const found = systemFolders(folders).find((candidate) => comparableText(candidate.name) === comparableText(name.trim()));
    return found === undefined ? undefined : readInstalled(found, [], ruleset);
}

/** The game system in this folder by the name a campaign gives it, as installed, without a version of its rules; it throws when its system.yaml does not read. */
export function systemInFolder(folder: string, name: string): GameSystem
{
    return readSystem(folder, name);
}

/** The folders a system's pages, rules, words, pictures and instructions come from, in order: its own, then its version's, which wins by name (VER-3). */
export function systemContentFolders(system: { folder: string; version?: { folder: string; }; }): string[]
{
    return system.version === undefined ? [system.folder] : [system.folder, system.version.folder];
}

/** An installed system read; one npm installed that does not read says how to get its files back, which are npm's and not the player's to fix. */
function readInstalled(found: SystemFolder, layers: SystemLayer[] = [], ruleset?: string): GameSystem
{
    try {
        return readSystem(found.folder, found.name, layers, ruleset);
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        const fromNpm = npmPackageName(found.folder);
        throw fromNpm === undefined || installedFromFolder(found.folder)
            ? error
            : new Error(`${message.replace(/\.?$/, ".")} It came from npm: install it again with package install ${fromNpm}, which brings its files back.`);
    }
}
