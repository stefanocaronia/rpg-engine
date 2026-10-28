// The store of a call (D-137, D-194): each file read once and kept frozen, what a call writes kept, and the store of the running command reached with files().
import { appendFileSync, existsSync, mkdirSync, readFileSync, utimesSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { files, FileStore, isInside, withFiles } from "../src/core/store.ts";
import { makeTempFolder, removeFolder } from "./support.ts";

let folder: string;

beforeEach(() => {
    folder = makeTempFolder();
});

afterEach(() => removeFolder(folder));

describe("the files of the installed game systems (D-194)", () => {
    it("keeps them from one call to the next while they do not change, and reads again one that changed or is too new to trust", () => {
        const path = join(folder, "Wolf.md");
        const old = (Date.now() - 60_000) / 1000;
        writeFileSync(path, "uno");
        utimesSync(path, old, old);
        let parsed = 0;
        const read = (store: FileStore): unknown => store.read(path, "test", (text) => (parsed++, text));
        expect(read(new FileStore([folder]))).toBe("uno");
        expect(read(new FileStore([folder]))).toBe("uno");
        expect(parsed).toBe(1);
        // Rewritten with the same size: its time of change says it.
        writeFileSync(path, "due");
        expect(read(new FileStore([folder]))).toBe("due");
        // Rewritten again at once: too close to its reading to trust, so read again.
        writeFileSync(path, "tre");
        expect(read(new FileStore([folder]))).toBe("tre");
        // A store without the systems' folders reads the disk, as before.
        expect(new FileStore().text(path)).toBe("tre");
    });
});

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
        expect(store.read(join(folder, "nessuno.md"), "test", (text) => text.length)).toBeUndefined();
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
        expect(existsSync(join(folder, "world", "places", "Mulino.md"))).toBe(false);
        store.append(join(folder, "world", "places", "Note.md"), "nota\n");
        expect(pages().sort()).toEqual(["world/characters/Ennio.md", "world/places/Note.md"]);
        expect(store.text(join(folder, "log.jsonl"))).toBeUndefined();
        store.append(join(folder, "log.jsonl"), "a\n");
        store.append(join(folder, "log.jsonl"), "b\n");
        expect(store.text(join(folder, "log.jsonl"))).toBe("a\nb\n");
    });

    it("lists a folder's files as a new store would after its writes: the nearer first, then by path", () => {
        mkdirSync(join(folder, "images", "sub"), { recursive: true });
        writeFileSync(join(folder, "images", "sub", "x.png"), "sub");
        writeFileSync(join(folder, "images", "b.png"), "b");
        const store = new FileStore();
        const listed = (from: FileStore): string[] => from.files(join(folder, "images"), () => true);
        expect(listed(store)).toEqual([join(folder, "images", "b.png"), join(folder, "images", "sub", "x.png")]);
        store.write(join(folder, "images", "x.png"), "x");
        store.write(join(folder, "images", "A.png"), "a");
        expect(listed(store)).toEqual(listed(new FileStore()));
        expect(listed(store)).toEqual([join(folder, "images", "A.png"), join(folder, "images", "b.png"), join(folder, "images", "x.png"), join(folder, "images", "sub", "x.png")]);
    });

    it("lists a folder once, as it was when first listed", () => {
        writeFileSync(join(folder, "a.md"), "uno");
        const store = new FileStore();
        const listed = (): number => store.files(folder, (name) => name.endsWith(".md")).length;
        expect(listed()).toBe(1);
        writeFileSync(join(folder, "b.md"), "due");
        expect(listed()).toBe(1);
        expect(new FileStore().files(folder, (name) => name.endsWith(".md")).length).toBe(2);
    });

    it("remembers a value until a file it is built from changes", () => {
        const store = new FileStore();
        let builds = 0;
        const value = (): object => store.remember("pages", (path) => isInside(join(folder, "world"), path), () => ({ build: ++builds }));
        const first = value();
        store.append(join(folder, "log.jsonl"), "{}\n");
        expect(value()).toBe(first);
        store.write(join(folder, "world", "Ennio.md"), "ennio");
        expect(value()).not.toBe(first);
        expect(builds).toBe(2);
    });

    it("reads a file appended to before it was read as the file is", () => {
        writeFileSync(join(folder, "log.jsonl"), "a\n");
        const store = new FileStore();
        store.append(join(folder, "log.jsonl"), "b\n");
        appendFileSync(join(folder, "log.jsonl"), "c\n");
        expect(store.text(join(folder, "log.jsonl"))).toBe("a\nb\nc\n");
    });

    it("tells a path inside a folder from the folder itself and from the paths beside and above it", () => {
        expect(isInside(folder, join(folder, "world", "a.md"))).toBe(true);
        expect(isInside(folder, join(folder, "..appunti", "a.md"))).toBe(true);
        expect(isInside(folder, folder)).toBe(false);
        expect(isInside(join(folder, "world"), join(folder, "world2", "a.md"))).toBe(false);
        expect(isInside(join(folder, "world"), folder)).toBe(false);
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
