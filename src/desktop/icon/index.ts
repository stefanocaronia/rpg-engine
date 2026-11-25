// RPG Engine's icon on the desktop and in the system's menu: it opens the launcher as `rpg open` does, with no console, on Windows, macOS and Linux. The
// command line asks once a machine whether to put it there.
import { existsSync, lstatSync, rmSync } from "node:fs";
import { hostname } from "node:os";
import { basename, join } from "node:path";
import { fileURLToPath } from "node:url";
import { readDataFile, writeDataFile } from "../../core/data-file.ts";
import { linuxIcons } from "./linux.ts";
import { macIcons } from "./macos.ts";
import { windowsIcons } from "./windows.ts";

/** What the icon starts: Node with the arguments of `rpg open`, in a folder. */
export interface IconCommand
{
    readonly node: string;
    readonly args: readonly string[];
    readonly folder: string;
    /** The PATH it runs with on macOS and Linux: the one of the terminal that made it, which finds the hosts' programs where the desktop's own does not. */
    readonly path: string;
}

/** The folders the icon goes in: the desktop and the system's menu of applications; the tests give their own. */
export interface IconPlaces
{
    readonly desktop: string;
    readonly menu: string;
}

/**
 * Puts RPG Engine's icon on the desktop and in the menu, the system's own folders unless `places` gives others: the files made. It throws when the system
 * refuses, with what went wrong.
 */
export function makeIcons(platform: string, command: IconCommand, places?: IconPlaces): Promise<string[]>
{
    if (platform === "win32") {
        return windowsIcons(command, iconImage("ico"), places);
    }

    if (platform === "darwin") {
        return Promise.resolve(macIcons(command, iconImage("icns"), places));
    }

    return Promise.resolve(linuxIcons(command, iconImage("png"), places));
}

/** What the icon starts: the `rpg` running now, the same Node and script, as `rpg open`, in `folder`, the player's home, with this process's PATH. */
export function iconCommand(folder: string, path = process.env.PATH ?? ""): IconCommand
{
    return { node: process.execPath, args: [...process.execArgv, process.argv[1] ?? "", "open"], folder, path };
}

/** Whether the command line asked already on this machine whether to put the icon there: once a machine, since the data folder may be on several. */
export function iconAsked(home: string, machine = hostname()): boolean
{
    return iconNotes(home).asked.includes(machine);
}

/** Notes that the command line asked on this machine, whatever the answer. */
export function noteIconAsked(home: string, machine = hostname()): void
{
    const notes = iconNotes(home);

    if (!notes.asked.includes(machine)) {
        writeIconNotes(home, { ...notes, asked: [...notes.asked, machine] });
    }
}

/** Notes the icon made on this machine, its command and files, which asks no more there. */
export function noteIconMade(home: string, command: IconCommand, files: readonly string[], machine = hostname()): void
{
    const notes = iconNotes(home);
    const asked = notes.asked.includes(machine) ? notes.asked : [...notes.asked, machine];
    writeIconNotes(home, { asked, made: { ...notes.made, [machine]: { command: commandLine(command), files: [...files] } } });
}

/** Takes RPG Engine's icon off the desktop and the menu of this machine, the files noted when it was made: those it removed. */
export function removeIcons(home: string, machine = hostname()): string[]
{
    const notes = iconNotes(home);
    // Only RPG Engine's own files, by their names, and links too, whose target the player may have thrown away already.
    const removed = (notes.made[machine]?.files ?? []).filter((file) => iconNames.includes(basename(file)) && lstatSync(file, { throwIfNoEntry: false }) !== undefined);

    // On macOS the icon is an application, a folder.
    for (const file of removed) {
        rmSync(file, { recursive: true, force: true });
    }

    writeIconNotes(home, { ...notes, made: Object.fromEntries(Object.entries(notes.made).filter(([name]) => name !== machine)) });
    return removed;
}

/**
 * Whether the icon made on this machine runs another Node or script than `command`, which a Node manager or an update may have taken away, and is still
 * there: then it is made again. One the player removed stays removed.
 */
export function iconToRemake(home: string, command: IconCommand, machine = hostname(), exists: (path: string) => boolean = existsSync): boolean
{
    const made = iconNotes(home).made[machine];
    return made !== undefined && JSON.stringify(made.command) !== JSON.stringify(commandLine(command)) && made.files.some(exists);
}

/** What icon.json keeps: the machines asked, by their name, and the icon made on each. */
interface IconNotes
{
    readonly asked: readonly string[];
    readonly made: Readonly<Record<string, { readonly command: readonly string[]; readonly files: readonly string[]; }>>;
}

// The names of the files an icon is made of, on Windows, macOS and Linux: removing touches no other, whatever the notes say.
const iconNames = ["RPG Engine.lnk", "RPG Engine.app", "rpg-engine.desktop"];

/** The icon's image, beside the page's files: src/dashboard/assets and dist/dashboard/assets alike. */
function iconImage(kind: "ico" | "png" | "icns"): string
{
    return fileURLToPath(new URL(`../../dashboard/assets/icon.${kind}`, import.meta.url));
}

function commandLine(command: IconCommand): string[]
{
    return [command.node, ...command.args];
}

function notesFile(home: string): string
{
    return join(home, "icon.json");
}

function writeIconNotes(home: string, notes: IconNotes): void
{
    writeDataFile(notesFile(home), notes);
}

// The notes kept; none when the file is missing or cannot be read, which only asks again.
function iconNotes(home: string): IconNotes
{
    const texts = (value: unknown): string[] => (Array.isArray(value) ? value.filter((text): text is string => typeof text === "string") : []);
    const read = readDataFile(notesFile(home));
    const notes = typeof read === "object" && read !== null ? read as { asked?: unknown; made?: unknown; } : {};
    const made = typeof notes.made === "object" && notes.made !== null ? notes.made as Record<string, { command?: unknown; files?: unknown; } | null> : {};
    return { asked: texts(notes.asked), made: Object.fromEntries(Object.entries(made).map(([machine, icon]) => [machine, { command: texts(icon?.command), files: texts(icon?.files) }])) };
}
