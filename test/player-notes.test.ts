// The player's notes (D-371): kept in .player/notes.json, the last written first; a file that does not read is never written over.
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { readNotes, removeNote, writeNote } from "../src/player-notes/index.ts";
import { makeTempFolder, removeFolder } from "./support.ts";

let root: string;

beforeEach(() => {
    root = makeTempFolder();
});

afterEach(() => {
    removeFolder(root);
});

describe("the player's notes (D-371)", () => {
    it("are none without a file, and come the last written first, changed in place and taken away by id", () => {
        expect(readNotes(root)).toEqual([]);
        writeNote(root, { id: "a", title: "Varro", text: "Mente.", at: "2026-10-11T10:00:00.000Z" });
        writeNote(root, { id: "b", title: "", text: "La cripta?", at: "2026-10-11T12:00:00.000Z" });
        writeNote(root, { id: "a", title: "Varro", text: "Mente sul vino.", at: "2026-10-11T09:00:00.000Z" });
        expect(readNotes(root).map((note) => [note.id, note.text])).toEqual([["b", "La cripta?"], ["a", "Mente sul vino."]]);
        expect(removeNote(root, "b")).toBe(true);
        expect(removeNote(root, "b")).toBe(false);
        expect(readNotes(root).map((note) => note.id)).toEqual(["a"]);
    });

    it("stop at a file that does not read, or holds a note without its parts, and never write over it", () => {
        const file = join(root, ".player", "notes.json");
        mkdirSync(join(root, ".player"));
        const broken = '[{"id": "a", "title": "Varro", "text": "Mente.", "at": "2026-10-11T10:00:00.000Z"},]';
        writeFileSync(file, broken);
        const unread = "Your notes in .player/notes.json do not read: fix the file by hand, or move it away to start again. Nothing changed.";
        expect(() => readNotes(root)).toThrow(unread.replace("/", process.platform === "win32" ? "\\" : "/"));
        expect(() => writeNote(root, { id: "b", title: "", text: "Nuova.", at: "2026-10-11T11:00:00.000Z" })).toThrow(/do not read/);
        expect(readFileSync(file, "utf8")).toBe(broken);
        writeFileSync(file, JSON.stringify([{ id: "a", title: "Varro", text: "Mente." }]));
        expect(() => removeNote(root, "a")).toThrow(/do not read/);
    });
});
