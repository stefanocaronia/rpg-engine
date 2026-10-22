// The importer (D-483 (10), D-484, D-489): the player's document read by a helper outside the chat piece after piece, the starts proposed, the world set at the
// one chosen, the pictures its pages show and the license the document gives kept, and an adventure that package install takes.
import { existsSync, mkdirSync, readFileSync, utimesSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { beforeEach, describe, expect, it } from "vitest";
import { parse } from "yaml";
import { runCommandLine } from "../src/command-line.ts";
import { importShown } from "../src/commands/import.ts";
import type { Context, DocumentReader } from "../src/core/context.ts";
import { FileStore } from "../src/core/store.ts";
import { openLicense } from "../src/importer/index.ts";
import { tinyPdf } from "./pdf-fixture.ts";
import { makeTempFolder, readLogFile, testContext } from "./support.ts";

let folder: string;
let context: Context;
const rpg = (...args: string[]) => runCommandLine(args, context);
const work = () => join(folder, ".imports", "The King");

/**
 * A helper that writes what each brief asks, as a model would, and keeps the briefs; it fails once, writes a manifest the check refuses (once or always), or
 * waits until it is stopped, when told to.
 */
function fakeReader(options: { starts?: number; license?: string; failOnce?: boolean; badManifest?: "once" | "always"; waits?: boolean; } = {}): DocumentReader & { briefs: string[]; }
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
        read: (root, brief, _writable, signal) => {
            briefs.push(brief);

            if (options.waits === true) {
                return new Promise((done) => signal?.addEventListener("abort", () => done({ failed: "stopped" })));
            }

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
                put(root, "notes/style.yaml", "author: Rudyard Kipling\nstory: arcs\n");
            }

            if (brief.includes("Last, write the adventure's opening")) {
                put(root, "adventure/world/topics/Opening.md", "---\ntags: [opening]\n---\n\n> [!secret] Opening\n> Two men at the border.\n");
                // The book's own title: the import's stays, which status knows it by.
                const bad = options.badManifest === "always" || (options.badManifest === "once" && !brief.includes("failed the engine's check"));
                const about = bad ? "word ".repeat(60).trim() : "Two loafers would be kings.";
                put(root, "adventure/adventure.yaml", `title: The Man Who Would Be King\nabout: ${about}\nauthor: Rudyard Kipling\nstart: '[[Kafiristan]]'\nopening: Opening\n`);
                put(root, "notes/source.yaml", `title: The Man Who Would Be King\nauthor: Rudyard Kipling\nlicense: ${options.license ?? "public domain"}\n`);
                put(root, "notes/invented.md", "- the name of the pass\n");
                put(root, "notes/start.yaml", "date: 14 April 1885\n");
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
        // The reading done within the call: the player still hears whose plan read it (D-493).
        expect(result.output).toContain("their own Claude Code or Codex reads it");
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
        await rpg("import", "--start", "2", "--character", "Dravot");
        // The command line waits for the runs only when import is called again.
        const done = await rpg("import");
        expect(reader.briefs.slice(2).map((brief) => /adventure\/world\/(\w+)\/ as the world stands|Last, write the adventure's opening/.exec(brief)?.[1] ?? "opening")).toEqual([
            "characters",
            "places",
            "opening",
        ]);
        expect(reader.briefs[2]).toContain("The player chose to start at 2. Start 2:");
        // Who the player plays is theirs: nothing written decides what they do (playtest 18).
        expect(reader.briefs[2]).toContain("The player plays Dravot. On their page keep their past, bonds, nature and plans");
        expect(done.output).toContain("The King is ready: 1 characters, 1 places, 1 topics, in .imports");
        expect(done.output).toContain("Tell the player what was invented to fill the gaps:\n- the name of the pass");
        expect(existsSync(join(work(), "adventure", "images", "p002-1.png"))).toBe(true);
        // The book leaves the campaign, but for the pictures its pages show, copied into the adventure (LIB-8).
        expect(existsSync(join(work(), "document", "01.md"))).toBe(false);
        expect(existsSync(join(work(), "document", "pictures"))).toBe(false);
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

    it("without a helper, gives the master the document a piece at each call, to write its pages in the chat (D-489 (1))", async () => {
        context.reader = { ready: () => false, read: () => Promise.resolve({ failed: "never" }) };
        const first = await rpg("import", book(), "--title", "The King");
        expect(first.output).toMatch(/^Importing The King here in the chat, piece 1 of 2: write its pages with write/);
        expect(first.output).not.toContain("under the terms of their account");
        expect(first.output).toContain("Then call import for the next piece.");
        expect(first.output).toContain("## Import");
        expect(first.output).toContain("[p. 1]\n\nPage 1 ");
        expect((await rpg("status")).output).toContain("Import of The King in the chat: 1 of 2 pieces read; call import for the next.");
        const last = await rpg("import");
        expect(last.output).toContain("piece 2 of 2");
        expect(last.output).toContain("This is the last piece. For a book, ask the player whether they have read it");
        expect(existsSync(join(work(), "document", "01.md")) || existsSync(join(work(), "document", "02.md"))).toBe(false);
        // Its pages are the world's already: nothing to install.
        expect((await rpg("status")).output).not.toContain("Import");
    });

    it("refuses a document it cannot read", async () => {
        context.reader = fakeReader();
        const scan = join(makeTempFolder(), "scan.pdf");
        writeFileSync(scan, tinyPdf([{ text: "" }]));
        expect((await rpg("import", scan)).output).toContain("scan.pdf has no text the engine can read: a scan is pictures of pages");
    });
});

describe("an import that goes wrong (D-489, Matteo's review of 20 October)", () => {
    it("writes the opening again once with what the check found, and stops when it fails again", async () => {
        const reader = fakeReader({ starts: 1, badManifest: "once" });
        context.reader = reader;
        expect((await rpg("import", book(), "--title", "The King")).output).toContain("The King is ready");
        expect(reader.briefs.at(-1)).toContain("The adventure you wrote failed the engine's check");

        const stubborn = join(makeTempFolder(), "c");
        context = testContext(stubborn);
        await rpg("init", stubborn, "--name", "Prova", "--language", "it", "--system", "5e");
        context = testContext(stubborn);
        context.reader = fakeReader({ starts: 1, badManifest: "always" });
        const stopped = await rpg("import", book(), "--title", "The King");
        expect(stopped.output).toContain("stopped: the adventure is not right: ");
        expect(stopped.output).toContain("Call import to write its opening again, or cancel.");
    });

    it("reads the last piece again when the reading gave no starting point", async () => {
        context.reader = fakeReader({ starts: 0 });
        expect((await rpg("import", book(), "--title", "The King")).output).toContain(
            "stopped: the reading gave no starting points (notes/starts.md): call import to read the last piece again.",
        );
    });

    it("stops the helper when it is dropped, in the MCP server, and its folder never comes back", async () => {
        context.files = new FileStore();
        context.reader = { ...fakeReader({ waits: true }), program: () => "Codex" };
        const started = (await rpg("import", book(), "--title", "The King")).output;
        expect(started).toContain("Importing The King: piece 1 of 2 being read");
        // Whose plan reads it, and under whose terms, said once as it begins (D-493).
        expect(started).toContain("their own Codex reads it, on their plan and its limits, and that the whole document goes to OpenAI under the terms of their account, its choice on training included");
        expect((await rpg("import")).output).not.toContain("under the terms of their account");
        expect((await rpg("status")).output).toContain("Import of The King: reading, 0 of 2 done.");
        expect((await rpg("import", "--cancel")).output).toBe("The import of The King is dropped, with what it wrote.");
        await new Promise((done) => setTimeout(done, 50));
        expect(existsSync(work())).toBe(false);
    });

    it("leaves an import to the live process that runs it, and tells one whose mark was broken by hand", async () => {
        context.reader = fakeReader({ waits: true });
        context.files = new FileStore();
        await rpg("import", book(), "--title", "The King");
        await rpg("import", "--cancel");
        context.files = undefined;
        context.reader = fakeReader();
        mkdirSync(work(), { recursive: true });
        writeFileSync(join(work(), "import.yaml"), "title: [unclosed");
        expect((await rpg("status")).output).toContain("Import of The King stopped: call import to try again.");
        expect((await rpg("import")).output).toContain("its import.yaml was changed by hand and does not read: drop it with cancel");
        expect((await rpg("import", "--cancel")).exitCode).toBe(0);

        // Another live process holds it: this one does not read the same piece.
        const reader = fakeReader();
        context.reader = reader;
        await rpg("import", book(), "--title", "The King");
        const state = readFileSync(join(work(), "import.yaml"), "utf8");
        writeFileSync(join(work(), "import.yaml"), state.replace(/phase: choosing\n/, "phase: reading\n").replace(/done: \d+/, "done: 0"));
        writeFileSync(join(work(), ".running"), String(process.ppid));
        const before = reader.briefs.length;
        await rpg("import");
        expect(reader.briefs.length).toBe(before);
    });

    it("credits a Creative Commons document in the manifest", async () => {
        context.reader = fakeReader({ starts: 1, license: "CC BY 4.0, https://example.org/king" });
        await rpg("import", book(), "--title", "The King");
        expect(parse(readFileSync(join(work(), "adventure", "adventure.yaml"), "utf8"))).toMatchObject({
            license: "CC BY 4.0",
            attribution: '"The Man Who Would Be King" by Rudyard Kipling, CC BY 4.0; adapted as an adventure.',
        });
    });
});

describe("the narration as the book is told (Stefano, 21 October)", () => {
    it("writes like the book's author when the player chose nothing of how the master writes, and tells the master to say so", async () => {
        context.reader = fakeReader({ starts: 1 });
        const done = await rpg("import", book(), "--title", "The King");
        expect(done.output).toContain("You now write like Rudyard Kipling, story arcs, as the book is told: tell the player, who changes it in Settings.");
        // The book's date is the campaign's first day, in its setup (Stefano, 21 October).
        expect(done.output).toContain("The story starts on 14 April 1885, as the book's: calendar-start is set to it.");
        expect(readFileSync(join(folder, "campaign.yaml"), "utf8")).toContain("calendar-start: 14 April 1885");
        expect(readFileSync(join(folder, "campaign.yaml"), "utf8")).toMatch(/author: Rudyard Kipling[\s\S]*story: arcs|story: arcs[\s\S]*author: Rudyard Kipling/);
    });

    it("asks instead when the player chose how the master writes", async () => {
        await rpg("config", "prose", "literary");
        context.reader = fakeReader({ starts: 1 });
        const done = await rpg("import", book(), "--title", "The King");
        expect(done.output).toContain("The player chose how you write: ask whether to write like Rudyard Kipling, story arcs, as the book is told");
        expect(readFileSync(join(folder, "campaign.yaml"), "utf8")).not.toContain("Kipling");
    });
});

describe("the import as the dashboard tells it (D-491 (11))", () => {
    it("tells the document being opened and its pages read from their pictures while the master waits, then advises text", async () => {
        context.reader = fakeReader();
        const scan = join(makeTempFolder(), "scan.pdf");
        writeFileSync(scan, tinyPdf([{ text: "The road north is long and the river is wide." }, { text: "@<=?%:6 &0H?5H%6 :0<865&=H8: <0=?=0H <?2H%:6" }]));
        const seen: unknown[] = [];

        context.ocr = (_pdf, pages, _signal, onPage) => {
            seen.push(importShown(folder));
            onPage?.(new Map([[pages[0] ?? 2, "The ferryman"]]));
            seen.push(importShown(folder));
            return Promise.resolve(new Map(pages.map((page) => [page, "The ferryman asks a coin of each traveller who crosses the river."])));
        };

        const started = await rpg("import", scan, "--title", "The King");
        expect(seen).toEqual([{ title: "The King", step: "opening" }, { title: "The King", step: "pictures", done: 1, of: 1 }]);
        expect(started.output).toContain("1 of its pages were read from their pictures, slowly and with a few mistakes: tell the player that a text file, or a PDF whose text can be selected, reads better.");
        expect(existsSync(join(folder, ".imports", "opening.yaml"))).toBe(false);
    });

    it("makes no import of a document stopped or dropped while it is opened, and opens one document at a time", async () => {
        context.reader = fakeReader();
        const scan = join(makeTempFolder(), "scan.pdf");
        writeFileSync(scan, tinyPdf([{ text: "@<=?%:6 &0H?5H%6 :0<865&=H8: <0=?=0H <?2H%:6" }]));
        const page = new Map([[1, "The ferryman asks a coin of each traveller who crosses the river."]]);
        // Stopped with Esc while the OCR reads.
        const stop = new AbortController();
        context.signal = stop.signal;

        context.ocr = () => {
            stop.abort();
            return Promise.resolve(page);
        };

        expect((await rpg("import", scan, "--title", "The King")).output).toContain("The import of The King was stopped before it began. Nothing changed.");
        context.signal = undefined;

        // Dropped with cancel while the OCR reads; another document waits for it.
        context.ocr = async () => {
            expect((await rpg("import", book(), "--title", "Other")).output).toContain("The import of The King is under way");
            expect((await rpg("import", "--cancel")).output).toContain("The import of The King is dropped");
            return page;
        };

        expect((await rpg("import", scan, "--title", "The King")).output).toContain("was stopped before it began");
        expect(existsSync(work())).toBe(false);
        expect(importShown(folder)).toBeUndefined();
        expect(readLogFile(folder).some((entry) => entry.type === "import-started")).toBe(false);
    });

    it("says an import waits when nothing runs it for a while, as after the computer started again", async () => {
        mkdirSync(work(), { recursive: true });
        writeFileSync(join(work(), "import.yaml"), "title: The King\ndocument: king.pdf\npieces: 4\nphase: reading\ndone: 1\n");
        expect(importShown(folder)).toEqual({ title: "The King", step: "reading", done: 1, of: 4 });
        utimesSync(join(work(), "import.yaml"), new Date(Date.now() - 120_000), new Date(Date.now() - 120_000));
        expect(importShown(folder)).toEqual({ title: "The King", step: "waiting" });
    });

    it("tells how far the reading and the writing are, the start the player chooses, and an import stopped", async () => {
        expect(importShown(folder)).toBeUndefined();
        context.reader = fakeReader({ failOnce: true });
        await rpg("import", book(), "--title", "The King");
        expect(importShown(folder)).toEqual({ title: "The King", step: "stopped" });
        await rpg("import");
        expect(importShown(folder)).toEqual({ title: "The King", step: "choosing" });
        expect((await rpg("view", "--json")).output).toContain('"importing"');
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
