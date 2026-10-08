// The saves of a campaign as commands use them (D-54, D-55): which files a save holds, a save made at the end of a scene or when asked, and given back.
import { join, relative, resolve, sep } from "node:path";
import { campaignFileName, hostFileNames, readSettings, saveModes } from "../campaign/index.ts";
import type { Context } from "../core/context.ts";
import { filesIn } from "../core/files.ts";
import { appendLogEntry, logFileName, logLine } from "../core/log.ts";
import { files, isInside } from "../core/store.ts";
import type { World } from "../pages/index.ts";
import { packFiles, readSaves, type Save, saveFileName, unpackFiles } from "../saves/index.ts";
import { formatGameDate } from "../time/index.ts";
import { newDatedLogEntry, readPresent } from "./game-time.ts";

/** The folder of the saves, at the top of the campaign. */
export const savesFolderName = ".saves";

export type SaveMode = (typeof saveModes)[number];

// The mark of a load under way, with the number of its save: while it is there, save load finishes it (SAV-5).
const loadingMarkName = "loading.txt";
const hostNames = new Set(hostFileNames.map((name) => name.toLowerCase()));

/** The campaign's mode of saves (SAV-1); checkpoint until the setup asks it. A campaign.yaml that cannot be read stops the command, with how to fix it. */
export function saveMode(root: string): SaveMode
{
    return readSettings(root).saves ?? "checkpoint";
}

/** The saves of the campaign, in order. */
export function campaignSaves(root: string): Save[]
{
    return readSaves(files().entries(join(root, savesFolderName)).filter((entry) => !entry.isFolder).map((entry) => entry.name));
}

/** Whether the player character is dead: every one the campaign has, when it has one. Then no save is made, since going back is what one is for (SAV-3). */
export function isPlayerDead(world: World): boolean
{
    const players = world.pages.filter((page) => page.type === "character" && page.fields.role === "pc");
    return players.length > 0 && players.every((page) => page.fields.status === "dead");
}

/** The save whose load stopped halfway, which save load finishes (SAV-5); undefined when none did. */
export function interruptedLoad(root: string): Save | undefined
{
    const mark = files().bytes(join(root, savesFolderName, loadingMarkName));
    const number = mark === undefined ? undefined : Number(new TextDecoder().decode(mark).trim());
    return campaignSaves(root).find((save) => save.number === number);
}

/**
 * Makes a save, numbered after the last and named by the game date and `label` (SAV-3, SAV-4): the game's files as the disk has them, with the public line of
 * the save already in the log; the line is written once the zip is. Fails, writing nothing, when the zip cannot be written.
 */
export function makeSave(root: string, context: Context, label: string | undefined, why: string): Save
{
    const number = (campaignSaves(root).at(-1)?.number ?? 0) + 1;
    const date = readPresent(root).date;
    const file = saveFileName(number, [date === undefined ? undefined : formatGameDate(date), label]);
    const entry = newDatedLogEntry(root, context, "saved", "public", { save: number, label, why });
    const held = gameFileBytes(root);
    held[logFileName] = joinBytes(held[logFileName], new TextEncoder().encode(logLine(entry)));
    files().writeBytes(join(root, savesFolderName, file), packFiles(held));
    appendLogEntry(root, entry);
    return readSaves([file])[0];
}

/**
 * Gives the campaign back as a save holds it (SAV-5): its game files as they were, those made since removed, and the later saves removed; then a public line in
 * the log. What it removes or rewrites goes first into `before load NNN.zip`, never in place of an older one, so that a load can be undone by hand. A save that
 * cannot be read, holds a file outside the game's or no campaign.yaml is refused before anything is written; a load that stops halfway leaves its mark, and save
 * load finishes it. Returns the saves removed and the copy made, none when it finishes a load.
 */
export function loadSave(root: string, context: Context, save: Save): { removed: Save[]; copy?: string; }
{
    const targets = Object.entries(readSave(root, save)).map(([path, bytes]) => ({ path: resolve(root, ...path.split("/")), bytes }));
    const stranger = targets.find((target) => !isGameFile(root, target.path));

    if (stranger !== undefined) {
        throw new Error(`${save.file} holds ${relative(root, stranger.path)}, which is not one of the game's files: it was not made by rpg. Nothing changed; load another save.`);
    }

    if (!targets.some((target) => target.path === resolve(root, campaignFileName))) {
        throw new Error(`${save.file} holds no ${campaignFileName}: it is not a whole save made by rpg. Nothing changed; load another save.`);
    }

    const folder = join(root, savesFolderName);
    const later = campaignSaves(root).filter((other) => other.number > save.number);
    const kept = new Set(targets.map((target) => target.path));

    const step = (path: string, work: () => void): void => {
        try {
            work();
        } catch (error) {
            const reason = error instanceof Error ? error.message : String(error);
            throw new Error(
                `Loading ${saveText(save)} stopped at ${relative(root, path)}: ${reason}. Close what holds that file, or let it be written, then call save load again: it finishes the load.`,
            );
        }
    };

    const copy = interruptedLoad(root) === undefined ? freeCopyName(root, save) : undefined;

    if (copy !== undefined) {
        step(join(folder, copy), () => files().writeBytes(join(folder, copy), packFiles(gameFileBytes(root))));
        step(join(folder, loadingMarkName), () => files().writeBytes(join(folder, loadingMarkName), new TextEncoder().encode(String(save.number))));
    }

    for (const path of gameFiles(root).filter((candidate) => !kept.has(resolve(candidate)))) {
        step(path, () => files().remove(path));
    }

    for (const target of targets) {
        step(target.path, () => files().writeBytes(target.path, target.bytes));
    }

    for (const other of later) {
        step(join(folder, other.file), () => files().remove(join(folder, other.file)));
    }

    appendLogEntry(root, newDatedLogEntry(root, context, "save-loaded", "public", { save: save.number, label: save.label, removed: later.length === 0 ? undefined : later.map((other) => other.number) }));
    files().remove(join(folder, loadingMarkName));
    return { removed: later, copy };
}

/** "before load 003.zip", or "before load 003 (2).zip" when that one is there: a copy before a load never takes the place of another. */
function freeCopyName(root: string, save: Save): string
{
    const taken = new Set(files().entries(join(root, savesFolderName)).map((entry) => entry.name.toLowerCase()));
    const base = `before load ${String(save.number).padStart(3, "0")}`;

    for (let count = 1;; count++) {
        const name = count === 1 ? `${base}.zip` : `${base} (${count}).zip`;

        if (!taken.has(name.toLowerCase())) {
            return name;
        }
    }
}

/** "3 - day 2, 06.10 - Scontro all'ossario": a save as outputs name it. */
export function saveText(save: Save): string
{
    return `${save.number} - ${save.label}`;
}

/**
 * What the death of the last living player character allows (D-55, SAV-7): the save it may go back to, as the mode says, so that the master offers only what
 * exists; none when campaign.yaml cannot be read, which other outputs say.
 */
export function deathNotes(root: string, name: string): string[]
{
    let mode: SaveMode;

    try {
        mode = saveMode(root);
    } catch {
        return [];
    }

    const last = campaignSaves(root).at(-1);

    if (mode === "permadeath") {
        return [`${name} is dead, and with saves permadeath the game never goes back: offer the player a new character, if they want to go on.`];
    }

    if (last === undefined) {
        return [`${name} is dead, and there is no save to go back to yet: offer the player a new character, if they want to go on.`];
    }

    const which = mode === "checkpoint" ? `the last save, ${saveText(last)}` : `a save, the last being ${saveText(last)} (save list gives every one)`;
    return [`${name} is dead. With saves ${mode}, offer the player to go back to ${which}, or a new character; save load only once they choose it.`];
}

/** The files a save holds, by their path inside it; refused, with what to do, when the zip cannot be read. */
function readSave(root: string, save: Save): Record<string, Uint8Array>
{
    try {
        return unpackFiles(files().bytes(join(root, savesFolderName, save.file)) ?? new Uint8Array());
    } catch (error) {
        throw new Error(`${save.file} cannot be read as a save (${error instanceof Error ? error.message : String(error)}): it is broken, or was not made by rpg. Nothing changed; load another save.`);
    }
}

/** The game's files with their bytes as the disk has them now, by their path inside a save. */
function gameFileBytes(root: string): Record<string, Uint8Array>
{
    return Object.fromEntries(gameFiles(root).map((path) => [relative(root, path).split(sep).join("/"), files().bytes(path) ?? new Uint8Array()]));
}

/**
 * The files a save holds (SAV-2), as the disk has them, not as a session last saw them: every file of the campaign but those of the AI hosts and those under a
 * name with a dot at its top, as .saves, .git, .obsidian.
 */
function gameFiles(root: string): string[]
{
    return files().entries(root).filter((entry) => isGameName(entry.name)).flatMap((entry) => {
        const path = join(root, entry.name);
        return entry.isFolder ? filesIn(path, () => true) : [path];
    });
}

function isGameFile(root: string, path: string): boolean
{
    return isInside(root, path) && isGameName(relative(root, path).split(sep)[0]);
}

/** Whether a name at the top of a campaign is the game's: not the host's, in any case, as Windows reads them, and not starting with a dot. */
function isGameName(name: string): boolean
{
    return !name.startsWith(".") && !hostNames.has(name.toLowerCase());
}

function joinBytes(first: Uint8Array | undefined, second: Uint8Array): Uint8Array
{
    const joined = new Uint8Array((first?.length ?? 0) + second.length);
    joined.set(first ?? new Uint8Array(), 0);
    joined.set(second, first?.length ?? 0);
    return joined;
}
