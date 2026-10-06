// The files of a folder and of the folders inside it, listed one folder at a time (D-194).
import { mkdirSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { filesIn, foldersIn } from "../src/core/files.ts";
import { makeTempFolder, removeFolder } from "./support.ts";

let folder: string;

beforeEach(() => {
    folder = makeTempFolder();
});

afterEach(() => removeFolder(folder));

describe("the files of a folder", () => {
    it("lists the files whose names it takes, in the folders inside too, and the folders", () => {
        mkdirSync(join(folder, "a", "b"), { recursive: true });
        writeFileSync(join(folder, "uno.md"), "");
        writeFileSync(join(folder, "nota.txt"), "");
        writeFileSync(join(folder, "a", "b", "due.md"), "");
        const below = (paths: string[]): string[] => paths.map((path) => relative(folder, path).replaceAll("\\", "/")).sort();
        expect(below(filesIn(folder, (name) => name.endsWith(".md")))).toEqual(["a/b/due.md", "uno.md"]);
        expect(below(foldersIn(folder))).toEqual(["", "a", "a/b"]);
        expect(filesIn(join(folder, "nessuna"), () => true)).toEqual([]);
        expect(foldersIn(join(folder, "uno.md"))).toEqual([]);
    });
});
