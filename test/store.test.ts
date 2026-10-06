// The store of a call (D-137, D-194): each file read once and kept frozen, what a call writes kept, and the store of the running command reached with files().
import { appendFileSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { files, FileStore, withFiles } from "../src/core/store.ts";
import { makeTempFolder, removeFolder } from "./support.ts";

let folder: string;

beforeEach(() => {
    folder = makeTempFolder();
});

afterEach(() => removeFolder(folder));

describe("the store of a call", () => {
    it("reads a file once, and keeps what it reads as frozen, by kind of reading", () => {
        const path = join(folder, "a.md");
        writeFileSync(path, "uno");
        const store = new FileStore();
        let parsed = 0;
        const read = (): { text: string; } | undefined => store.read(path, "test", (text) => (parsed++, { text }));
        expect(read()).toEqual({ text: "uno" });
        writeFileSync(path, "due");
        expect(store.text(path)).toBe("uno");
        expect(read()).toEqual({ text: "uno" });
        expect(parsed).toBe(1);
        expect(Object.isFrozen(read())).toBe(true);
        expect(store.read(path, "other", (text) => text.length)).toBe(3);
        expect(new FileStore().text(path)).toBe("due");
    });

    it("says a file is missing, and fails a reading that failed again the same way", () => {
        const store = new FileStore();
        expect(store.text(join(folder, "nessuno.md"))).toBeUndefined();
        expect(store.exists(join(folder, "nessuno.md"))).toBe(false);
        writeFileSync(join(folder, "rotto.md"), "x");
        let tries = 0;
        const broken = (): unknown =>
            store.read(join(folder, "rotto.md"), "test", () => {
                tries++;
                throw new Error("not valid");
            });
        expect(broken).toThrow("not valid");
        expect(broken).toThrow("not valid");
        expect(tries).toBe(1);
    });

    it("keeps what it writes, appends and removes, in the listings too", () => {
        mkdirSync(join(folder, "world", "places"), { recursive: true });
        writeFileSync(join(folder, "world", "places", "Mulino.md"), "mulino");
        const store = new FileStore();
        const pages = (): string[] => store.files(join(folder, "world"), (name) => name.endsWith(".md")).map((path) => path.slice(folder.length + 1).replaceAll("\\", "/"));
        expect(pages()).toEqual(["world/places/Mulino.md"]);
        store.write(join(folder, "world", "characters", "Ennio.md"), "ennio");
        expect(readFileSync(join(folder, "world", "characters", "Ennio.md"), "utf8")).toBe("ennio");
        expect(store.text(join(folder, "world", "characters", "Ennio.md"))).toBe("ennio");
        expect(pages().sort()).toEqual(["world/characters/Ennio.md", "world/places/Mulino.md"]);
        store.remove(join(folder, "world", "places", "Mulino.md"));
        expect(pages()).toEqual(["world/characters/Ennio.md"]);
        expect(store.exists(join(folder, "world", "places", "Mulino.md"))).toBe(false);
        expect(store.text(join(folder, "log.jsonl"))).toBeUndefined();
        store.append(join(folder, "log.jsonl"), "a\n");
        store.append(join(folder, "log.jsonl"), "b\n");
        expect(store.text(join(folder, "log.jsonl"))).toBe("a\nb\n");
    });

    it("reads a file appended to before it was read as the file is", () => {
        writeFileSync(join(folder, "log.jsonl"), "a\n");
        const store = new FileStore();
        store.append(join(folder, "log.jsonl"), "b\n");
        appendFileSync(join(folder, "log.jsonl"), "c\n");
        expect(store.text(join(folder, "log.jsonl"))).toBe("a\nb\nc\n");
    });

    it("is the store of the running command, kept by a command run inside it, and a new one outside", () => {
        writeFileSync(join(folder, "a.md"), "uno");
        const store = new FileStore();
        withFiles(store, () => {
            expect(files()).toBe(store);
            withFiles(new FileStore(), () => expect(files()).toBe(store));
        });
        expect(files()).not.toBe(store);
        expect(files()).not.toBe(files());
    });
});
