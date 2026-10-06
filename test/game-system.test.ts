// The game systems installed beside the engine (SYS-1): which they are, nearest folder first, and what each declares.
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { findSystem, installedSystems } from "../src/systems/index.ts";
import { makeTempFolder, removeFolder } from "./support.ts";

let near: string;
let far: string;

beforeEach(() => {
    near = makeTempFolder();
    far = makeTempFolder();
});

afterEach(() => {
    removeFolder(near);
    removeFolder(far);
});

function system(folder: string, name: string, yaml: string): void
{
    mkdirSync(join(folder, name), { recursive: true });
    writeFileSync(join(folder, name, "system.yaml"), yaml);
}

describe("installed systems", () => {
    it("reads each folder with a system.yaml, in order, the nearest folder winning a name, and skips files, folders without one and folders that are not there", () => {
        system(far, "zeta", "title: the last\nlanguage: en\n");
        system(far, "Alfa", "title: the far alfa\nlanguage: it\n");
        system(near, "alfa", "title: the near alfa\nlanguage: en-GB\nfields:\n  hp: counter\n  cr: text\n");
        mkdirSync(join(near, "empty"));
        writeFileSync(join(near, "notes.txt"), "not a system");

        const systems = installedSystems([near, join(near, "missing"), far]);
        expect(systems.map((found) => found.name)).toEqual(["alfa", "zeta"]);
        expect(systems[0]).toEqual({ name: "alfa", folder: join(near, "alfa"), title: "the near alfa", language: "en-GB", attribution: undefined, fields: { hp: "counter", cr: "text" } });
        expect(systems[1].fields).toEqual({});
    });

    it("finds a system by its name in any case, with spaces around it", () => {
        system(near, "5e", "title: the fifth edition\nlanguage: en\nattribution: From the SRD.\n");
        expect(findSystem([near], " 5E ")?.attribution).toBe("From the SRD.");
        expect(findSystem([near], "4e")).toBeUndefined();
    });

    it("refuses a system.yaml that does not say what the system is, with the file and why", () => {
        system(near, "rotto", "title: a broken one\nlanguage: Italiano\n");
        expect(() => installedSystems([near])).toThrow(`The game system rotto cannot be read, because ${join(near, "rotto", "system.yaml")} is not valid`);
        system(near, "rotto", "title: a broken one\nlanguage: it\nfields:\n  hp: dice\n");
        expect(() => installedSystems([near])).toThrow("fields.hp");
        system(near, "rotto", "title: a broken one\nlanguage: it-\n");
        expect(() => installedSystems([near])).toThrow("cannot be read");
    });
});
