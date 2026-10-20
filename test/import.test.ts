// The importer (D-483 (10), D-484, D-489): the player's document read by a helper outside the chat piece after piece, the starts proposed, the world set at the
// one chosen, the pictures its pages show and the license the document gives kept, and an adventure that package install takes.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { beforeEach, describe, expect, it } from "vitest";
import { parse } from "yaml";
import { runCommandLine } from "../src/command-line.ts";
import type { Context, DocumentReader } from "../src/core/context.ts";
import { openLicense } from "../src/importer/index.ts";
import { tinyPdf } from "./pdf-fixture.ts";
import { makeTempFolder, readLogFile, testContext } from "./support.ts";

let folder: string;
let context: Context;
const rpg = (...args: string[]) => runCommandLine(args, context);
const work = () => join(folder, ".imports", "The King");

/** A helper that writes what each brief asks, as a model would, and keeps the briefs; it fails once when told to. */
function fakeReader(options: { starts?: number; license?: string; failOnce?: boolean; } = {}): DocumentReader & { briefs: string[]; }
{
    const briefs: string[] = [];
    let failed = false;

    const put = (root: string, path: string, text: string): void => {
        mkdirSync(dirname(join(root, path)), { recursive: true });
        writeFileSync(join(root, path), text);
    };

    return {
        briefs,
        ready: () => true,
        read: (root, brief) => {
            briefs.push(brief);

            if (options.failOnce === true && !failed) {
                failed = true;
                return Promise.resolve({ failed: "Claude failed: overloaded" });
            }

            if (brief.includes("piece 1 of")) {
                put(root, "adventure/world/characters/Dravot.md", "---\nrole: npc\naliases: [Dan]\nimage: '[[p002-1.png]]'\nsource: 'The King, p. 2'\n---\n\nA loafer.\n");
                put(root, "adventure/world/places/Kafiristan.md", "---\nsource: 'The King, p. 2'\n---\n\nA country beyond the passes.\n");
                put(root, "notes/notes.md", "Piece 1: the Square.");
            }

            if (brief.includes("This is the last piece")) {
                const starts = Array.from({ length: options.starts ?? 3 }, (_, index) => `## ${index + 1}. Start ${index + 1}\nPlay Dravot.\nBack cover: two men.\nReader: chapter ${index + 1}.`);
                put(root, "notes/starts.md", `${starts.join("\n\n")}\n`);
            }

            if (brief.includes("Last, write the adventure's opening")) {
                put(root, "adventure/world/topics/Opening.md", "---\ntags: [opening]\n---\n\n> [!secret] Opening\n> Two men at the border.\n");
                // The book's own title: the import's stays, which status knows it by.
                put(root, "adventure/adventure.yaml", "title: The Man Who Would Be King\nabout: Two loafers would be kings.\nauthor: Rudyard Kipling\nstart: '[[Kafiristan]]'\nopening: Opening\n");
                put(root, "notes/source.yaml", `title: The Man Who Would Be King\nauthor: Rudyard Kipling\nlicense: ${options.license ?? "public domain"}\n`);
                put(root, "notes/invented.md", "- the name of the pass\n");
            }

            return Promise.resolve({ said: "done" });
        },
    };
}

/** A PDF long enough for two pieces, its second page with a picture. */
function book(): string
{
    const file = join(makeTempFolder(), "king.pdf");
    const words = "word ".repeat(500);
    writeFileSync(file, tinyPdf(Array.from({ length: 20 }, (_, index) => ({ text: `Page ${index + 1} ${words}`, ...(index === 1 ? { picture: "own" as const } : {}) }))));
    return file;
}

beforeEach(async () => {
    folder = makeTempFolder();
    context = testContext(folder);
    await rpg("init", "--name", "Prova", "--language", "it", "--system", "5e");
});

describe("import of the player's document (D-489)", () => {
    it("reads a book piece after piece outside the chat, then gives the master the starts to propose", async () => {
        const reader = fakeReader();
        context.reader = reader;
        const result = await rpg("import", book(), "--title", "The King");
        expect(result.exitCode).toBe(0);
        expect(readFileSync(join(work(), "document", "01.md"), "utf8")).toMatch(/^\[p\. 1\]\n\nPage 1 /);
        expect(existsSync(join(work(), "document", "pictures", "p002-1.png"))).toBe(true);
        expect(readFileSync(join(work(), "document", "01.md"), "utf8")).toContain("[p. 2]");
        expect(readFileSync(join(work(), "document", "01.md"), "utf8")).toContain("[picture: p002-1.png]");
        expect(readFileSync(join(work(), "document", "02.md"), "utf8")).toMatch(/^\[p\. 14\]/);
        expect(reader.briefs).toHaveLength(2);
        expect(reader.briefs[0]).toContain("## Import");
        expect(reader.briefs[0]).toContain("## Pages");
        expect(reader.briefs[0]).toContain('document/01.md, piece 1 of 2 of "The King"');
        expect(reader.briefs[0]).toContain("No pages yet.");
        // The second run knows what the first wrote, by its names.
        expect(reader.briefs[1]).toContain("- characters: Dravot (Dan)");
        expect(reader.briefs[1]).toContain("This is the last piece");
        expect(result.output).toContain("The King is read (1 characters, 1 places). Ask the player whether they have read it");
        expect(result.output).toContain("1. Start 1\nPlay Dravot.\nBack cover: two men.\nReader: chapter 1.");
        expect((await rpg("status")).output).toContain("Import of The King: its starting points are ready, call import to see them.");
        expect(readLogFile(folder).at(-1)).toMatchObject({ type: "import-started", data: { title: "The King", pieces: 2 } });
    });

    it("sets the world at the start chosen, folder by folder, then the opening; keeps the pictures its pages show, the license, and installs", async () => {
        const reader = fakeReader();
        context.reader = reader;
        await rpg("import", book(), "--title", "The King");
        expect((await rpg("import", "--start", "5")).output).toContain("There is no starting point 5: choose one of 1, 2, 3.");
        await rpg("import", "--start", "2");
        // The command line waits for the runs only when import is called again.
        const done = await rpg("import");
        expect(reader.briefs.slice(2).map((brief) => /adventure\/world\/(\w+)\/ as the world stands|Last, write the adventure's opening/.exec(brief)?.[1] ?? "opening")).toEqual([
            "characters",
            "places",
            "opening",
        ]);
        expect(reader.briefs[2]).toContain("The player chose to start at 2. Start 2:");
        expect(done.output).toContain("The King is ready: 1 characters, 1 places, 1 topics, in .imports");
        expect(done.output).toContain("Tell the player what was invented to fill the gaps:\n- the name of the pass");
        expect(existsSync(join(work(), "adventure", "images", "p002-1.png"))).toBe(true);
        const manifest = parse(readFileSync(join(work(), "adventure", "adventure.yaml"), "utf8")) as Record<string, unknown>;
        expect(manifest).toMatchObject({ title: "The King", version: "1.0.0", language: "it", license: "public domain", author: "Rudyard Kipling" });
        expect((await rpg("status")).output).toContain("Imported and not installed: The King");
        const installed = await rpg("package", "install", join(work(), "adventure"));
        expect(installed.exitCode).toBe(0);
        expect(existsSync(join(folder, "world", "characters", "The King", "Dravot.md"))).toBe(true);
        expect((await rpg("status")).output).not.toContain("Imported and not installed");
    });

    it("keeps a document of no open license to the player, and starts a module at its own start without asking", async () => {
        context.reader = fakeReader({ starts: 1, license: "All rights reserved" });
        const result = await rpg("import", book(), "--title", "The King");
        expect(result.output).toContain("The King is ready");
        expect(parse(readFileSync(join(work(), "adventure", "adventure.yaml"), "utf8"))).toMatchObject({ license: "personal use only" });
    });

    it("names an open license as an adventure carries it, and no license that forbids adapting", () => {
        expect(["CC BY-NC-SA 4.0", "CC-BY-NC-SA-3.0", "CC BY-SA 3.0", "CC BY 4.0", "CC BY-NC-ND 4.0", "CC0 1.0", "All rights reserved"].map(openLicense)).toEqual([
            "CC BY-NC-SA 4.0",
            "CC BY-NC-SA 3.0",
            "CC BY-SA 3.0",
            "CC BY 4.0",
            undefined,
            "public domain",
            undefined,
        ]);
    });

    it("goes on from where a failed run stopped, and drops an import with what it wrote", async () => {
        context.reader = fakeReader({ failOnce: true });
        const stopped = await rpg("import", book(), "--title", "The King");
        expect(stopped.output).toContain("The import of The King stopped: Claude failed: overloaded. Call import to try again from there.");
        expect((await rpg("import", book())).output).toContain("The import of The King is under way: finish it, or drop it with cancel");
        expect((await rpg("import")).output).toContain("The King is read");
        expect((await rpg("import", "--cancel")).output).toBe("The import of The King is dropped, with what it wrote.");
        expect(existsSync(work())).toBe(false);
    });

    it("refuses without a helper, and a document it cannot read", async () => {
        context.reader = { ready: () => false, read: () => Promise.resolve({ failed: "never" }) };
        expect((await rpg("import", book())).output).toContain("No helper on this computer reads documents: the import needs Claude Code or Codex");
        context.reader = fakeReader();
        const scan = join(makeTempFolder(), "scan.pdf");
        writeFileSync(scan, tinyPdf([{ text: "" }]));
        expect((await rpg("import", scan)).output).toContain("scan.pdf has no text the engine can read: a scan is pictures of pages");
    });
});

describe("free play, without a game system (D-307, D-489 (7))", () => {
    it("keeps a sheet of words, with no number to check", async () => {
        const free = makeTempFolder();
        context = testContext(free);
        await rpg("init", "--name", "Libero", "--language", "it", "--system", "free");
        context = testContext(free);
        await rpg("write", "Ettore", "--type", "character", "--set", "role=pc", "--set", "concept=un marinaio senza nave", "--set", "abilities=[vela, il coltello lungo]");
        expect((await rpg("show", "Ettore")).output).toContain("Character: concept un marinaio senza nave · abilities vela, il coltello lungo");
        expect((await rpg("validate")).output).toBe("No problems.");
    });
});
