// The saves (MECCANICHE, SAV-1–SAV-6; D-54, D-55): the module on files and names made at random, a table of what each mode of saves allows, and a law on runs of
// writes, saves and loads: loading gives back exactly the game's files of then.
import fc from "fast-check";
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { runCommandLine } from "../src/cli/command-line.ts";
import { makeSave } from "../src/commands/game/saves.ts";
import type { Context } from "../src/core/context.ts";
import { packFiles, readSaves, saveFileName, unpackFiles } from "../src/saves/index.ts";
import { inPlay, makeTempFolder, readLogFile, removeFolder, testContext } from "./support.ts";

const runs = { numRuns: 500 };

describe("the laws of the saves module, on files and names made at random", () => {
    it("SAV-2: a zip gives back every file it was made of, byte for byte, whatever its path and content", () => {
        const paths = fc.array(fc.constantFrom("world", "characters", "Città d'Oro", "rules", "mappa.png", "Kira.md", "ü"), { minLength: 1, maxLength: 3 }).map((parts) => parts.join("/"));
        fc.assert(
            fc.property(fc.dictionary(paths, fc.uint8Array({ maxLength: 200 }), { maxKeys: 6 }), (files) => {
                const prefixes = Object.keys(files).some((path) => Object.keys(files).some((other) => other.startsWith(`${path}/`)));
                fc.pre(!prefixes);
                expect(unpackFiles(packFiles(files))).toEqual(files);
            }),
            runs,
        );
    });

    it("SAV-4: a save's name keeps its number and what names it, without what a file name cannot hold", () => {
        fc.assert(
            fc.property(fc.integer({ min: 1, max: 5000 }), fc.array(fc.option(fc.string({ maxLength: 30 }), { nil: undefined }), { maxLength: 3 }), (number, parts) => {
                const file = saveFileName(number, parts);
                const [read] = readSaves([file]);
                expect(read.number).toBe(number);
                expect(read.file).toBe(file);
                expect(file).not.toMatch(/[\\/:*?"<>|\u0000-\u001f]/);
            }),
            runs,
        );
        expect(saveFileName(3, ["day 2, 06:10", "Scontro all'ossario"])).toBe("003 - day 2, 06.10 - Scontro all'ossario.zip");
        expect(saveFileName(12, [undefined, " "])).toBe("012 - save.zip");
        expect(readSaves(["010 - b.zip", "notes.txt", "002 - a.zip"]).map((save) => save.number)).toEqual([2, 10]);
    });
});

let folder: string;
let context: Context;

beforeEach(async () => {
    folder = makeTempFolder();
    context = testContext(folder);
    await runCommandLine(["init", "--name", "Prova", "--language", "it", "--system", "free", "--difficulty", "normal", "--lethality", "dice"], context);
    inPlay(folder);
    await rpg("write", "Kira", "--type", "character", "--set", "role=pc", "--set", "health=5/5");
});

afterEach(() => removeFolder(folder));

function rpg(...args: string[])
{
    return runCommandLine(args, context);
}

async function ok(...args: string[]): Promise<string>
{
    const result = await rpg(...args);
    expect(result.exitCode, result.output).toBe(0);
    return result.output;
}

/** A scene opened and closed: a save at its end (SAV-3). */
async function scene(title: string): Promise<string>
{
    await ok("scene", "open", "--title", title, "--type", "social");
    return ok("scene", "close", "--summary", "Fatto.");
}

// The table of cases (SAV-5, D-55): each mode, with the player character alive or dead, loading the last save or an earlier one, making one on request, and
// starting over.
const table: [string, "alive" | "dead", string, "done" | "refused"][] = [
    ["free", "alive", "load last", "done"],
    ["free", "alive", "load 1", "done"],
    ["free", "dead", "load 1", "done"],
    ["free", "alive", "make", "done"],
    ["checkpoint", "alive", "load last", "refused"],
    ["checkpoint", "dead", "load last", "done"],
    ["checkpoint", "dead", "load 1", "refused"],
    ["checkpoint", "alive", "make", "refused"],
    ["permadeath", "dead", "load last", "refused"],
    ["permadeath", "alive", "load 1", "refused"],
    ["permadeath", "alive", "make", "refused"],
    // Starting over, back to the first save, in every mode (D-359).
    ["free", "alive", "reset", "done"],
    ["checkpoint", "alive", "reset", "done"],
    ["permadeath", "alive", "reset", "done"],
    ["permadeath", "dead", "reset", "done"],
];

describe("the table of cases of the saves", () => {
    it("SAV-5: each mode loads and saves on request just as D-55 says, and a refusal writes nothing", async () => {
        await scene("Uno");
        await scene("Due");

        for (const [mode, player, asked, expected] of table) {
            await ok("config", "saves", mode);
            writeFileSync(join(folder, "world", "characters", "Kira.md"), `---\nrole: pc\nhealth: 5/5\n${player === "dead" ? "status: dead\n" : ""}---\n`);
            const before = gameFiles(folder);
            const [action, save] = asked.split(" ");
            const result = await rpg("save", action, ...(save === undefined ? [] : [save]));
            expect(result.exitCode === 0 ? "done" : "refused", `${mode} ${player} ${asked}: ${result.output}`).toBe(expected);

            if (expected === "refused") {
                expect(gameFiles(folder), `${mode} ${player} ${asked}`).toEqual(before);
            }

            // Back to two saves, the first and the second scene's, for the next case.
            for (const name of readdirSync(join(folder, ".saves")).filter((file) => !/^00[12] /.test(file))) {
                rmSync(join(folder, ".saves", name));
            }

            if (readdirSync(join(folder, ".saves")).length < 2) {
                await ok("config", "saves", "free");
                writeFileSync(join(folder, "world", "characters", "Kira.md"), "---\nrole: pc\nhealth: 5/5\n---\n");
                await scene("Due");
            }
        }
    });

    it("SAV-3: the end of a scene saves, unless the player character is dead; list names the saves and what loading may do", async () => {
        expect(await scene("Al guado")).toMatch(/\nSaved: 1 - Al guado\.$/);
        expect(readLogFile(folder).at(-1)).toMatchObject({ type: "saved", visibility: "public", data: { save: 1, label: "Al guado", why: "scene closed" } });
        await ok("advance", "--to", "day 1, 18:00");
        expect(await scene("Alla locanda")).toMatch(/\nSaved: 2 - day 1, 18\.00 - Alla locanda\.$/);
        expect(await ok("save")).toBe(
            "Saves: 1 - Al guado · 2 - day 1, 18.00 - Alla locanda.\nWith saves checkpoint, load goes back to the last one, and only once the player character is dead, if the player wants.",
        );

        await ok("write", "Kira", "--set", "status=dead");
        expect(await scene("La caduta")).toMatch(/\nNo save: the player character is dead\. If the player wants to go back, save load, as the campaign's saves setting allows\.$/);
        expect(await ok("save", "load")).toBe(
            "Back to 2 - day 1, 18.00 - Alla locanda: the campaign's files are as they were then, and what happened since is gone from the game. "
                + "What the load replaced is in .saves/before load 002.zip, to undo it by hand. This chat remembers what is gone: ask the player to open a new chat "
                + "(/clear in Claude Code, a new conversation elsewhere) and to write continua there. Nothing goes on in this one.",
        );
        expect(readFileSync(join(folder, "world", "characters", "Kira.md"), "utf8")).not.toContain("dead");
        expect(readLogFile(folder).at(-1)).toMatchObject({ type: "save-loaded", visibility: "public", data: { save: 2 } });
    });

    it("SAV-2, SAV-5: loading leaves the host's files, the folders with a dot and the saves before as they are, and removes the later saves", async () => {
        await ok("config", "saves", "free");
        await scene("Uno");
        writeFileSync(join(folder, "AGENTS.md"), "il mio testo");
        mkdirSync(join(folder, ".obsidian"), { recursive: true });
        writeFileSync(join(folder, ".obsidian", "app.json"), "{}");
        await ok("write", "Bran", "--type", "character", "--set", "role=npc");
        await ok("save", "make", "--label", "prima del duello");
        await scene("Tre");
        expect(await ok("save", "load", "1")).toContain("The later saves are gone: 2, 3.");
        expect(existsSync(join(folder, "world", "characters", "Bran.md"))).toBe(false);
        expect(readFileSync(join(folder, "AGENTS.md"), "utf8")).toBe("il mio testo");
        expect(readFileSync(join(folder, ".obsidian", "app.json"), "utf8")).toBe("{}");
        // What the load replaced waits in a zip of its own, to undo it by hand; the mark says the chat going on must give way to a new one (D-361).
        expect(readdirSync(join(folder, ".saves"))).toEqual(["001 - Uno.zip", "before load 001.zip", "new chat.txt"]);
        expect((await rpg("save", "load", "7")).output).toBe('There is no save "7": give its number or last. Saves: 1 - Uno.');
        expect((await rpg("save", "list", "1")).output).toBe("save list does not take save: only load does.");
    });

    it("SAV-5 (D-359, D-361): reset goes back to the start of play in every mode, or to before session zero; with none it says when they are saved", async () => {
        expect((await rpg("save", "reset")).output).toBe(
            "There are no saves yet: the start is saved when the campaign enters play, and the end of each scene makes one. Nothing changed.",
        );
        // A campaign in play before the start was saved: its first save is where it starts over.
        await scene("Uno");
        await ok("write", "Bran", "--type", "character", "--set", "role=npc");
        await scene("Due");
        await ok("config", "saves", "permadeath");
        expect(await ok("save", "reset")).toBe(
            "Back to the start, 1 - Uno: the campaign starts over from there with the same character, what happened since gone from the game, every later save too. "
                + `What the reset replaced is in .saves/before load 001.zip, to undo it by hand. This chat remembers what is gone: ask the player to open a new chat (/clear in Claude Code, a new conversation elsewhere) and to write continua there. Nothing goes on in this one.`,
        );
        expect(existsSync(join(folder, "world", "characters", "Bran.md"))).toBe(false);
        expect(readdirSync(join(folder, ".saves"))).toEqual(["001 - Uno.zip", "before load 001.zip", "new chat.txt"]);
        expect(readLogFile(folder).at(-1)).toMatchObject({ type: "save-loaded", data: { save: 1, removed: [2] } });
        expect((await rpg("save", "reset", "--to", "session zero")).output).toBe(
            "There is no save before session zero: this campaign was first saved after it. Start over with reset, to start. Nothing changed.",
        );
        expect((await rpg("save", "reset", "1")).output).toBe("save reset does not take save: only load does.");
        expect((await rpg("save", "load", "1", "--to", "start")).output).toBe("save load does not take to: only reset does.");
    });

    it("SAV-5 (D-360): going back leaves campaign.yaml as it is now: the settings, the player's and the master's", async () => {
        await ok("config", "saves", "free");
        await scene("Uno");
        await ok("config", "difficulty", "hard");
        await ok("config", "lines", "--add", "ragni");
        await ok("config", "precedents", "--add", "Nebbia: svantaggio");
        const settings = readFileSync(join(folder, "campaign.yaml"), "utf8");
        await ok("save", "load", "1");
        expect(readFileSync(join(folder, "campaign.yaml"), "utf8")).toBe(settings);
        // Starting over too, under any mode the player has now.
        await ok("config", "saves", "permadeath");
        await ok("save", "reset");
        expect(readFileSync(join(folder, "campaign.yaml"), "utf8")).toMatch(/^saves: permadeath$/m);
    });

    it("SAV-5 (D-361): a reset never takes the place of a load that stopped halfway", async () => {
        await scene("Uno");
        await scene("Due");
        writeFileSync(join(folder, ".saves", "loading.txt"), "2");
        expect((await rpg("save", "reset")).output).toBe("A load to 2 - Due stopped halfway: save load finishes it first, then reset. Nothing changed.");
    });

    it("SAV-3 (D-359): a save keeps the place the player character was in, the nearest that holds them", async () => {
        await ok("write", "Rifugio", "--type", "place", "--add", "contains=[[Kira]]");
        await scene("Uno");
        expect(readLogFile(folder).at(-1)).toMatchObject({ type: "saved", data: { save: 1, label: "Uno", why: "scene closed", place: "Rifugio" } });
    });

    it("SAV-5: refuses a save that holds files outside the game's, before writing anything", async () => {
        await ok("config", "saves", "free");
        mkdirSync(join(folder, ".saves"));
        writeFileSync(join(folder, ".saves", "001 - strano.zip"), packFiles({ "AGENTS.md": new TextEncoder().encode("altro") }));
        const before = gameFiles(folder);
        expect((await rpg("save", "load", "1")).output).toBe("001 - strano.zip holds AGENTS.md, which is not one of the game's files: it was not made by rpg. Nothing changed; load another save.");
        expect(gameFiles(folder)).toEqual(before);
    });
});

describe("the death of the player character (SAV-7)", () => {
    it("names the save the mode allows going back to, once the last living player character dies", async () => {
        await ok("write", "Lia", "--type", "character", "--set", "role=pc");

        const dies = async (mode: string): Promise<string> => {
            await ok("config", "saves", mode);
            await ok("write", "Kira", "--set", "status=alive");
            await ok("write", "Lia", "--set", "status=dead");
            return ok("write", "Kira", "--set", "status=dead");
        };

        expect(await dies("checkpoint")).toContain("Kira is dead, and there is no save to go back to yet: offer the player a new character, if they want to go on.");
        // Under permadeath, starting over only once a start was saved.
        expect(await dies("permadeath")).toContain("Kira is dead, and with saves permadeath the game never goes back: offer the player a new character, if they want to go on.");
        await ok("write", "Kira", "--set", "status=alive");
        await scene("Al guado");
        expect(await dies("checkpoint")).toContain("Kira is dead. With saves checkpoint, offer the player to go back to the last save, 1 - Al guado, or a new character; save load only once they choose it.");
        expect(await dies("free")).toContain("offer the player to go back to a save, the last being 1 - Al guado (save list gives every one), or a new character;");
        expect(await dies("permadeath")).toContain(
            "Kira is dead, and with saves permadeath the game never goes back: offer the player a new character, or the campaign started over from its start, if they want to go on;",
        );
        // While another player character lives, the death stays under permadeath, and the table chooses otherwise (D-480 (2)).
        await ok("write", "Lia", "--set", "status=alive");
        await ok("write", "Kira", "--set", "status=alive");
        expect(await ok("write", "Kira", "--set", "status=dead")).toContain("Kira is dead, and the others go on: with saves permadeath the death stays;");
        await ok("config", "saves", "checkpoint");
        await ok("write", "Kira", "--set", "status=alive");
        expect(await ok("write", "Kira", "--set", "status=dead")).toContain(
            "Kira is dead while the others live: ask the table now, before the scene's end saves and the death stays, whether to go back to the last save, 1 - Al guado, for everyone, or to keep the death and go on,",
        );
    });
});

describe("the saves, after a review", () => {
    it("SAV-2: a link to a folder outside the campaign is no part of the game, so no save holds it (review of 20 October)", async () => {
        const outside = makeTempFolder();
        writeFileSync(join(outside, "manuale.txt"), "the player's own book");
        symlinkSync(outside, join(folder, "library"), "junction");
        makeSave(folder, context, undefined, "asked");
        const zip = readdirSync(join(folder, ".saves")).find((name) => name.endsWith(".zip")) as string;
        expect(Object.keys(unpackFiles(readFileSync(join(folder, ".saves", zip)))).filter((path) => path.startsWith("library"))).toEqual([]);
        expect(existsSync(join(outside, "manuale.txt"))).toBe(true);
    });

    it("SAV-5: a load that stops halfway leaves its mark, status says so, and save load finishes it in any mode", async () => {
        await scene("Uno");
        await ok("write", "Ossario", "--type", "place", "--text", "Ossa.");
        await ok("write", "Lia", "--type", "character", "--set", "role=pc", "--set", "status=dead");
        // A folder where the save has a file: the load stops there. Lia, dead, is the only player character left.
        rmSync(join(folder, "world", "characters", "Kira.md"));
        mkdirSync(join(folder, "world", "characters", "Kira.md"));
        const stopped = await rpg("save", "load");
        expect(stopped.output).toMatch(/^Loading 1 - Uno stopped at world.characters.Kira\.md: .+\. Close what holds that file, or let it be written, then call save load again: it finishes the load\.$/);
        expect(await ok("status")).toContain("The load of save 1 stopped halfway: call save load to finish it, before anything else.");
        rmSync(join(folder, "world", "characters", "Kira.md"), { recursive: true });
        // Kira is alive again in the log restored, which checkpoint would refuse: the load that began is finished all the same.
        expect(await ok("save", "load")).toMatch(/^The load that had stopped halfway is finished\. Back to 1 - Uno:/);
        expect(readFileSync(join(folder, "world", "characters", "Kira.md"), "utf8")).not.toContain("dead");
        expect(existsSync(join(folder, "world", "places", "Ossario.md"))).toBe(false);
        expect(await ok("status")).not.toContain("stopped halfway");
    });

    it("SAV-5: refuses a save without campaign.yaml, or that cannot be read, and two saves with one number", async () => {
        await ok("config", "saves", "free");
        await scene("Uno");
        writeFileSync(join(folder, ".saves", "002 - mondo.zip"), packFiles({ "world/characters/Kira.md": new TextEncoder().encode("---\nrole: pc\n---\n") }));
        writeFileSync(join(folder, ".saves", "003 - rotto.zip"), "non è uno zip");
        const before = gameFiles(folder);
        expect((await rpg("save", "load", "2")).output).toBe("002 - mondo.zip holds no campaign.yaml: it is not a whole save made by rpg. Nothing changed; load another save.");
        expect((await rpg("save", "load", "3")).output).toMatch(/^003 - rotto\.zip cannot be read as a save \(.+\): it is broken, or was not made by rpg\. Nothing changed; load another save\.$/);
        writeFileSync(join(folder, ".saves", "001 - Uno - Copia.zip"), readFileSync(join(folder, ".saves", "001 - Uno.zip")));
        expect((await rpg("save", "load", "1")).output).toBe("Two saves have the number 1: 001 - Uno - Copia.zip and 001 - Uno.zip. Rename or remove the one that is a copy, in .saves. Nothing changed.");
        expect(gameFiles(folder)).toEqual(before);
    });

    it("SAV-3: a save that cannot be written never stops the close, nor leaves a line saying it was made", async () => {
        writeFileSync(join(folder, ".saves"), "un file, non una cartella");
        expect(await scene("Uno")).toMatch(/\nNo save: it could not be written \(.+\)\. Make \.saves a folder that can be written; the next scene's end saves again\.$/);
        expect(readLogFile(folder).map((entry) => entry.type)).not.toContain("saved");
        expect(readLogFile(folder).at(-1)?.type).toBe("scene-closed");
    });

    it("SAV-3: a new player character after a dead one saves again", async () => {
        await ok("write", "Kira", "--set", "status=dead");
        await ok("write", "Lia", "--type", "character", "--set", "role=pc");
        expect(await scene("Uno")).toMatch(/\nSaved: 1 - Uno\.$/);
    });

    it("SAV-1: a campaign.yaml that cannot be read stops save with how to fix it, instead of a mode it does not have", async () => {
        writeFileSync(join(folder, "campaign.yaml"), `${readFileSync(join(folder, "campaign.yaml"), "utf8")}lines: [ragni\n`);
        const result = await rpg("save");
        expect(result.exitCode).toBe(1);
        expect(result.output).toContain("campaign.yaml");
        expect(result.output).not.toContain("checkpoint");
    });

    it("SAV-2: keeps every byte, the host's files in any case and the files of the player, which a load puts aside in a zip of their own", async () => {
        await ok("config", "saves", "free");
        mkdirSync(join(folder, "Appunti"));
        writeFileSync(join(folder, "Appunti", "latin.md"), new Uint8Array([67, 105, 116, 116, 224, 10]));
        await ok("save", "make", "--label", "prima\tdel\nduello");
        writeFileSync(join(folder, "agents.md"), "il mio testo");
        writeFileSync(join(folder, "CLAUDE.local.md"), "le mie istruzioni");
        writeFileSync(join(folder, "Appunti", "idee.md"), "un'idea");
        expect(await ok("save", "list")).toContain("1 - prima del duello");
        await ok("save", "load", "last");
        expect([...readFileSync(join(folder, "Appunti", "latin.md"))]).toEqual([67, 105, 116, 116, 224, 10]);
        expect(readFileSync(join(folder, "agents.md"), "utf8")).toBe("il mio testo");
        expect(readFileSync(join(folder, "CLAUDE.local.md"), "utf8")).toBe("le mie istruzioni");
        expect(existsSync(join(folder, "Appunti", "idee.md"))).toBe(false);
        expect(new TextDecoder().decode(unpackFiles(readFileSync(join(folder, ".saves", "before load 001.zip")))["Appunti/idee.md"])).toBe("un'idea");
        // A second load of the same save keeps the first copy, and names its own.
        expect(await ok("save", "load", "1")).toContain("What the load replaced is in .saves/before load 001 (2).zip, to undo it by hand.");
        expect(new TextDecoder().decode(unpackFiles(readFileSync(join(folder, ".saves", "before load 001.zip")))["Appunti/idee.md"])).toBe("un'idea");
    });
});

// A run of steps in free mode: pages written, a counter changed, a file added or removed by hand, a save made, a save loaded.
type Step = { kind: "write"; name: string; } | { kind: "change"; } | { kind: "hand"; name: string; remove: boolean; } | { kind: "make"; } | { kind: "load"; index: number; };
const steps: fc.Arbitrary<Step> = fc.oneof(
    fc.record({ kind: fc.constant("write" as const), name: fc.constantFrom("Bran", "Lena", "Città d'Oro") }),
    fc.record({ kind: fc.constant("change" as const) }),
    fc.record({ kind: fc.constant("hand" as const), name: fc.constantFrom("mappa.png", "note.md"), remove: fc.boolean() }),
    fc.record({ kind: fc.constant("make" as const) }),
    fc.record({ kind: fc.constant("load" as const), index: fc.nat(5) }),
);

describe("the laws of the saves, on runs made at random", () => {
    it("SAV-2–SAV-5: loading a save gives back exactly the game's files of when it was made, but the log's line about it, and removes the later saves", async () => {
        await ok("config", "saves", "free");
        const start = gameFiles(folder);

        await fc.assert(
            fc.asyncProperty(fc.array(steps, { minLength: 1, maxLength: 8 }), async (run) => {
                restore(folder, start);
                rmSync(join(folder, ".saves"), { recursive: true, force: true });
                const made: Record<string, string>[] = [];

                for (const step of run) {
                    if (step.kind === "write") {
                        await ok("write", step.name, "--type", "character", "--set", "role=npc", "--text", `Scritto al passo ${made.length}.`);
                    } else if (step.kind === "change") {
                        await rpg("change", "Kira", "health", "--by=-1");
                    } else if (step.kind === "hand") {
                        const path = join(folder, "world", step.name);
                        step.remove ? rmSync(path, { force: true }) : writeFileSync(path, step.name.endsWith(".png") ? new Uint8Array([137, 80, 78, 71, 0, 255]) : "a mano");
                    } else if (step.kind === "make") {
                        await ok("save", "make");
                        made.push(gameFiles(folder));
                    } else if (made.length > 0) {
                        const index = step.index % made.length;
                        await ok("save", "load", String(index + 1));
                        const now = gameFiles(folder);
                        expect({ ...now, "log.jsonl": "" }).toEqual({ ...made[index], "log.jsonl": "" });
                        const text = (files: Record<string, string>): string => Buffer.from(files["log.jsonl"], "base64").toString("utf8");
                        expect(text(now).startsWith(text(made[index]))).toBe(true);
                        expect(readLogFile(folder).at(-1)).toMatchObject({ type: "save-loaded", data: { save: index + 1 } });
                        made.splice(index + 1);
                        expect(readdirSync(join(folder, ".saves")).filter((file) => /^\d/.test(file)).length).toBe(made.length);
                    }
                }
            }),
            { numRuns: 25 },
        );
    }, 120000);
});

/** The game's files of a campaign, by path, with their content as text in base64: what a save holds (SAV-2). */
function gameFiles(root: string): Record<string, string>
{
    const found: Record<string, string> = {};

    const visit = (path: string): void => {
        for (const entry of readdirSync(path, { withFileTypes: true })) {
            const full = join(path, entry.name);
            const top = relative(root, full).split(sep)[0];

            if (top.startsWith(".") || ["AGENTS.md", "CLAUDE.md"].includes(top)) {
                continue;
            }

            entry.isDirectory() ? visit(full) : (found[relative(root, full).split(sep).join("/")] = readFileSync(full).toString("base64"));
        }
    };

    visit(root);
    return found;
}

/** Puts back the game's files of a campaign as `files` holds them, removing the others. */
function restore(root: string, files: Record<string, string>): void
{
    for (const path of Object.keys(gameFiles(root)).filter((path) => !(path in files))) {
        rmSync(join(root, path));
    }

    for (const [path, content] of Object.entries(files)) {
        mkdirSync(join(root, path, ".."), { recursive: true });
        writeFileSync(join(root, path), Buffer.from(content, "base64"));
    }
}
