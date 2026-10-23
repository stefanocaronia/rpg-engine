// The saves of a campaign as commands use them (D-54, D-55): which files a save holds, a save made at the end of a scene or when asked, and given back.
import { join, relative, resolve, sep } from "node:path";
import { campaignFileName, hostFileNames, readSettings, saveModes } from "../campaign/index.ts";
import type { Context } from "../core/context.ts";
import { filesIn } from "../core/files.ts";
import { appendLogEntry, logFileName, logLine, readLog } from "../core/log.ts";
import { files, isInside } from "../core/store.ts";
import { comparableText } from "../core/text.ts";
import { locate, playerCharacters, type World } from "../pages/index.ts";
import { packFiles, readSaves, type Save, saveFileName, unpackFiles } from "../saves/index.ts";
import { formatGameDate } from "../time/index.ts";
import { playerCharacter } from "./game-knowledge.ts";
import { newDatedLogEntry, readPresent } from "./game-time.ts";
import { campaignWorld } from "./game-world.ts";

/** The folder of the saves, at the top of the campaign. */
export const savesFolderName = ".saves";

/** The folder where an export writes its adventure's zip (ADV-7): no part of the game, so no save holds it. */
export const exportsFolderName = "exports";

export type SaveMode = (typeof saveModes)[number];

// The mark of a load under way, with the number of its save: while it is there, save load finishes it (SAV-5).
const loadingMarkName = "loading.txt";
// The mark of a load done, with its save: the chat that was going on remembers what is gone, and only a new chat goes on (SAV-5, D-361).
const newChatMarkName = "new chat.txt";

/** The points the campaign starts over from (D-361): the start of play, with the same character, or before session zero, to make one again. */
export const resetPoints = ["start", "session zero"] as const;

export type ResetPoint = (typeof resetPoints)[number];

/** What the master does once the game went back: this chat remembers what is gone, so a new one goes on (D-361). */
export const newChatText = "This chat remembers what is gone: ask the player to open a new chat (/clear in Claude Code, a new conversation elsewhere) and to write continua "
    + "there. Nothing goes on in this one.";
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
    const players = playerCharacters(world);
    return players.length > 0 && players.every((page) => page.fields.status === "dead");
}

/**
 * Whether the game may go back under saves checkpoint (SAV-3, D-480 (2)): every player character is dead, or one died since the last save while another lives,
 * for the table to choose.
 */
export function mayGoBack(root: string, world: World): boolean
{
    if (isPlayerDead(world)) {
        return true;
    }

    const dead = new Set(playerCharacters(world).filter((page) => page.fields.status === "dead").map((page) => comparableText(page.name)));
    const log = readLog(root);
    return log.slice(log.findLastIndex((entry) => entry.type === "saved") + 1).some((entry) => {
        const set = entry.data.set as Record<string, unknown> | undefined;
        return ["page-created", "page-updated"].includes(entry.type) && dead.has(comparableText(String(entry.data.page ?? ""))) && set?.status === "dead";
    });
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
    const place = partyPlace(root, context);
    const entry = newDatedLogEntry(root, context, "saved", "public", { save: number, label, why, ...(place === undefined ? {} : { place }) });
    const held = gameFileBytes(root);
    held[logFileName] = joinBytes(held[logFileName], new TextEncoder().encode(logLine(entry)));
    files().writeBytes(join(root, savesFolderName, file), packFiles(held));
    appendLogEntry(root, entry);
    return readSaves([file])[0];
}

/**
 * Gives the campaign back as a save holds it (SAV-5): its game files as they were, but campaign.yaml, its settings, as it is now (D-360), those made since
 * removed, and the later saves removed; then a public line in the log, and the mark that the chat going on must give way to a new one (D-361). What it removes or rewrites goes first into `before load NNN.zip`, never in place of an older one, so that a load can be undone by hand. A save that
 * cannot be read, holds a file outside the game's or no campaign.yaml is refused before anything is written; a load that stops halfway leaves its mark, and save
 * load finishes it. Returns the saves removed and the copy made, none when it finishes a load.
 */
export function loadSave(root: string, context: Context, save: Save): { removed: Save[]; copy?: string; }
{
    const settings = resolve(root, campaignFileName);
    const targets = Object.entries(readSave(root, save)).map(([path, bytes]) => ({ path: resolve(root, ...path.split("/")), bytes }))
        .map((target) => (target.path === settings ? { ...target, bytes: files().bytes(settings) ?? target.bytes } : target));
    const stranger = targets.find((target) => !isGameFile(root, target.path));

    if (stranger !== undefined) {
        throw new Error(`${save.file} holds ${relative(root, stranger.path)}, which is not one of the game's files: it was not made by rpg. Nothing changed; load another save.`);
    }

    if (!targets.some((target) => target.path === settings)) {
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
    files().writeBytes(join(folder, newChatMarkName), new TextEncoder().encode(saveText(save)));
    return { removed: later, copy };
}

/** The save the game went back to, until the player confirms a new chat: the chat that went on before remembers what is gone (D-361, D-362). */
export function wentBackTo(root: string): string | undefined
{
    const mark = files().bytes(join(root, savesFolderName, newChatMarkName));
    return mark === undefined ? undefined : new TextDecoder().decode(mark).trim();
}

/** The player confirmed a new chat: the game goes on in it (D-362). */
export function newChatBegun(root: string): void
{
    files().remove(join(root, savesFolderName, newChatMarkName));
}

/** Why each save was made, by its number, as its line in the log says: start, session zero, scene closed or asked. */
export function savesWhy(root: string): Map<number, string>
{
    return new Map(
        readLog(root).filter((entry) => entry.type === "saved").map((entry) => {
            const data = entry.data as { save?: unknown; why?: unknown; };
            return [Number(data.save), String(data.why ?? "")];
        }),
    );
}

/**
 * The save a reset goes back to (D-361): the one before session zero, or the start of play, else, in a campaign older than the start's save, the first one
 * made after session zero; undefined when there is none.
 */
export function resetSave(saves: Save[], why: Map<number, string>, to: ResetPoint): Save | undefined
{
    return to === "session zero"
        ? saves.find((save) => why.get(save.number) === "session zero")
        : (saves.find((save) => why.get(save.number) === "start") ?? saves.find((save) => why.get(save.number) !== "session zero"));
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

    // Under permadeath, starting over is there once a start was saved (D-359).
    if (mode === "permadeath") {
        return resetSave(campaignSaves(root), savesWhy(root), "start") === undefined
            ? [`${name} is dead, and with saves permadeath the game never goes back: offer the player a new character, if they want to go on.`]
            : [
                `${name} is dead, and with saves permadeath the game never goes back: offer the player a new character, or the campaign started over from its start, `
                + "if they want to go on; save reset only once they choose it.",
            ];
    }

    if (last === undefined) {
        return [`${name} is dead, and there is no save to go back to yet: offer the player a new character, if they want to go on.`];
    }

    const which = mode === "checkpoint" ? `the last save, ${saveText(last)}` : `a save, the last being ${saveText(last)} (save list gives every one)`;
    return [`${name} is dead. With saves ${mode}, offer the player to go back to ${which}, or a new character; save load only once they choose it.`];
}

/**
 * The death of a player character while another lives (D-480 (2)): the game goes back by itself only when they all die, so the table chooses, as the saves
 * allow: under permadeath the death stays.
 */
export function partyDeathNotes(root: string, name: string): string[]
{
    let mode: SaveMode;

    try {
        mode = saveMode(root);
    } catch {
        return [];
    }

    const last = campaignSaves(root).at(-1);

    if (mode === "permadeath" || last === undefined) {
        return [`${name} is dead, and the others go on${mode === "permadeath" ? ": with saves permadeath the death stays" : ""}; offer whoever played ${name} a new character, if they want one.`];
    }

    return [
        `${name} is dead while the others live: ask the table whether to go back to ${
            mode === "checkpoint" ? `the last save, ${saveText(last)}` : "a save (save list)"
        }, for everyone, or to keep the death and go on; save load only once they choose it.`,
    ];
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
 * The files a save holds (SAV-2), as the disk has them, not as a session last saw them: every file of the campaign but those of the AI hosts, the exports, and those
 * under a name with a dot at its top, as .saves, .git, .obsidian.
 */
function gameFiles(root: string): string[]
{
    return files().entries(root).filter((entry) => isGameName(entry.name)).flatMap((entry) => {
        const path = join(root, entry.name);
        return entry.isFolder ? filesIn(path, () => true) : [path];
    });
}

/** Whether a path is one of the game's files: in the campaign, not the host's nor under a name with a dot at its top (SAV-2). */
export function isGameFile(root: string, path: string): boolean
{
    return isInside(root, path) && isGameName(relative(root, path).split(sep)[0]);
}

/** Whether a name at the top of a campaign is the game's: not the host's, in any case, as Windows reads them, and not starting with a dot. */
function isGameName(name: string): boolean
{
    return !name.startsWith(".") && !hostNames.has(name.toLowerCase()) && name.toLowerCase() !== exportsFolderName;
}

function joinBytes(first: Uint8Array | undefined, second: Uint8Array): Uint8Array
{
    const joined = new Uint8Array((first?.length ?? 0) + second.length);
    joined.set(first ?? new Uint8Array(), 0);
    joined.set(second, first?.length ?? 0);
    return joined;
}

/** What loading may do under each mode of saves (D-55); reset, back to the start, in every mode (D-359). */
export function loadRule(mode: SaveMode): string
{
    switch (mode) {
        case "free":
            return "With saves free, load goes back to any of them when the player asks, and make saves when they ask.";
        case "checkpoint":
            return "With saves checkpoint, load goes back to the last one, and only once the player character is dead, if the player wants.";
        default:
            return "With saves permadeath, the game never goes back, but to its start with reset when the player wants to start over. "
                + "If something broke outside the story, the player may unzip a save from .saves by hand.";
    }
}

/** Why the mode of saves does not allow going back to a save (D-55): permadeath never, checkpoint only to the last and once the player character is dead; undefined when it may. */
export function loadRefusal(mode: SaveMode, saves: Save[], chosen: Save, dead: boolean): string | undefined
{
    if (mode === "permadeath") {
        return loadRule(mode);
    }

    if (mode === "checkpoint" && !dead) {
        return "With saves checkpoint, the game goes back only once the player character is dead, and they are alive: go on with the story.";
    }

    if (mode === "checkpoint" && chosen !== saves.at(-1)) {
        return `With saves checkpoint, the game goes back only to the last save, ${saveText(saves.at(-1) as Save)}.`;
    }

    return undefined;
}

/** The place the player character is in, the nearest that holds it, which a save keeps for its picture, as in a video game (D-359); undefined in none. */
function partyPlace(root: string, context: Context): string | undefined
{
    try {
        const world = campaignWorld(root, context);
        const character = playerCharacter(world);
        return character === undefined ? undefined : [character, ...locate(world, character).chain].find((holder) => holder.type === "place")?.name;
    } catch {
        // A world that does not read now never stops a save: it only has no place.
        return undefined;
    }
}
