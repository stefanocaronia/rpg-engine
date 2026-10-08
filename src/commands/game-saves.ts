// The saves of a campaign as commands use them (D-54, D-55): which files a save holds, a save made at the end of a scene or when asked, and given back.
import { join, relative, resolve, sep } from "node:path";
import { readSettings, saveModes } from "../campaign/index.ts";
import type { Context } from "../core/context.ts";
import { appendLogEntry } from "../core/log.ts";
import { files, isInside } from "../core/store.ts";
import type { World } from "../pages/index.ts";
import { packFiles, readSaves, type Save, saveFileName, unpackFiles } from "../saves/index.ts";
import { formatGameDate } from "../time/index.ts";
import { newDatedLogEntry, readPresent } from "./game-time.ts";

/** The folder of the saves, at the top of the campaign. */
export const savesFolderName = ".saves";

export type SaveMode = (typeof saveModes)[number];

// The files of the AI host, which a save leaves as they are: the player's own text in AGENTS.md is not part of the game.
const hostFiles = ["AGENTS.md", "CLAUDE.md", "GEMINI.md"];
// The files the engine reads as text, which the store may already keep.
const textFile = /\.(md|ya?ml|jsonl?)$/i;

/** The campaign's mode of saves; checkpoint until the setup asks it (D-55). A campaign.yaml that cannot be read says so elsewhere. */
export function saveMode(root: string): SaveMode
{
    try {
        return readSettings(root).saves ?? "checkpoint";
    } catch {
        return "checkpoint";
    }
}

/** The saves of the campaign, in order. */
export function campaignSaves(root: string): Save[]
{
    return readSaves(files().entries(join(root, savesFolderName)).filter((entry) => !entry.isFolder).map((entry) => entry.name));
}

/** Whether the player character is dead: then no save is made, since going back is what one is for (SAV-3). */
export function isPlayerDead(world: World): boolean
{
    return world.pages.some((page) => page.type === "character" && page.fields.role === "pc" && page.fields.status === "dead");
}

/** Makes a save, numbered after the last and named by the game date and `label`, after its public line in the log, which it holds (SAV-3). */
export function makeSave(root: string, context: Context, label: string | undefined, why: string): Save
{
    const number = (campaignSaves(root).at(-1)?.number ?? 0) + 1;
    const date = readPresent(root).date;
    const file = saveFileName(number, [date === undefined ? undefined : formatGameDate(date), label]);
    appendLogEntry(root, newDatedLogEntry(root, context, "saved", "public", { save: number, label, why }));
    const held = Object.fromEntries(gameFiles(root).map((path) => [relative(root, path).split(sep).join("/"), fileBytes(path)]));
    files().writeBytes(join(root, savesFolderName, file), packFiles(held));
    return readSaves([file])[0];
}

/**
 * Gives the campaign back as a save holds it (SAV-5): its game files as they were, those made since removed, and the later saves removed; then a public line in
 * the log. A save that holds a file outside the game's is refused before anything is written. Returns the saves removed.
 */
export function loadSave(root: string, context: Context, save: Save): Save[]
{
    const held = unpackFiles(files().bytes(join(root, savesFolderName, save.file)) ?? new Uint8Array());
    const targets = Object.entries(held).map(([path, bytes]) => ({ path: resolve(root, ...path.split("/")), bytes }));
    const stranger = targets.find((target) => !isGameFile(root, target.path));

    if (stranger !== undefined) {
        throw new Error(`${save.file} holds ${relative(root, stranger.path)}, which is not one of the game's files: it was not made by rpg. Nothing changed.`);
    }

    const kept = new Set(targets.map((target) => target.path));

    for (const path of gameFiles(root).filter((candidate) => !kept.has(resolve(candidate)))) {
        files().remove(path);
    }

    for (const target of targets) {
        files().writeBytes(target.path, target.bytes);
    }

    const later = campaignSaves(root).filter((other) => other.number > save.number);

    for (const other of later) {
        files().remove(join(root, savesFolderName, other.file));
    }

    appendLogEntry(root, newDatedLogEntry(root, context, "save-loaded", "public", { save: save.number, label: save.label, removed: later.length === 0 ? undefined : later.map((other) => other.number) }));
    return later;
}

/** "3 - day 2, 06.10 - Scontro all'ossario": a save as outputs name it. */
export function saveText(save: Save): string
{
    return `${save.number} - ${save.label}`;
}

/** The files a save holds (SAV-2): every file of the campaign but those of the AI host and those under a name with a dot at its top, as .saves, .git, .obsidian. */
function gameFiles(root: string): string[]
{
    return files().entries(root).filter((entry) => isGameName(entry.name)).flatMap((entry) => {
        const path = join(root, entry.name);
        return entry.isFolder ? files().files(path, () => true) : [path];
    });
}

/** A file's bytes: those of a text the store already keeps, as the pages a command has read, without reading the disk again; any other's as they are. */
function fileBytes(path: string): Uint8Array
{
    return textFile.test(path) ? new TextEncoder().encode(files().text(path) ?? "") : (files().bytes(path) ?? new Uint8Array());
}

function isGameFile(root: string, path: string): boolean
{
    return isInside(root, path) && isGameName(relative(root, path).split(sep)[0]);
}

function isGameName(name: string): boolean
{
    return !name.startsWith(".") && !hostFiles.includes(name);
}
