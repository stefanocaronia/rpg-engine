// The player's notes (D-371): free notes, a title and a text each, kept in the campaign but outside the game, in a folder with a dot at its top, which the saves
// leave as it is (SAV-2) and the master's tools never read.
import { join } from "node:path";
import { files } from "../core/store.ts";

/** The folder of what is the player's alone in a campaign. */
export const playerFolderName = ".player";

const notesFileName = "notes.json";

/** One of the player's notes. */
export interface Note
{
    id: string;
    title: string;
    text: string;
    /** When it was last written, in real time. */
    at: string;
}

/** The player's notes, the last written first; none when there are none, or when the file does not read. */
export function readNotes(root: string): Note[]
{
    const text = files().fresh(notesPath(root));

    if (text === undefined) {
        return [];
    }

    try {
        const read: unknown = JSON.parse(text);
        return (Array.isArray(read) ? read : []).filter(isNote).toSorted((one, other) => other.at.localeCompare(one.at));
    } catch {
        return [];
    }
}

/** Writes a note, new or changed, by its id. */
export function writeNote(root: string, note: Note): void
{
    saveNotes(root, [note, ...readNotes(root).filter((other) => other.id !== note.id)]);
}

/** Takes a note away by its id; whether there was one. */
export function removeNote(root: string, id: string): boolean
{
    const notes = readNotes(root);
    const kept = notes.filter((note) => note.id !== id);
    saveNotes(root, kept);
    return kept.length < notes.length;
}

function saveNotes(root: string, notes: Note[]): void
{
    files().write(notesPath(root), `${JSON.stringify(notes, null, 2)}\n`);
}

function notesPath(root: string): string
{
    return join(root, playerFolderName, notesFileName);
}

function isNote(value: unknown): value is Note
{
    const note = value as Partial<Note> | null;
    return note !== null && typeof note === "object" && typeof note.id === "string" && typeof note.title === "string" && typeof note.text === "string" && typeof note.at === "string";
}
