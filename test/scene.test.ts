import { appendFileSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { runCommandLine } from "../src/command-line.ts";
import { scene } from "../src/commands/scene.ts";
import type { Context } from "../src/core/context.ts";
import { makeTempFolder, readLogFile, removeFolder, testContext } from "./support.ts";

let folder: string;
let context: Context;

beforeEach(async () => {
    folder = makeTempFolder();
    context = testContext(folder);
    await runCommandLine(["init", "--name", "Guadoscuro", "--language", "it", "--system", "5e"], context);
    await rpg("write", "Ennio", "--type", "character", "--set", "role=pc", "--set", "hp=12/12", "--set", "arrows=18");
    await rpg("write", "Lena", "--type", "character", "--set", "role=companion", "--set", "hp=7/7");
    await rpg("write", "Varro", "--type", "character", "--set", "role=npc");
    await rpg("write", "Livia", "--type", "character", "--set", "role=npc", "--set", "status=dead");
    await rpg("write", "Ossario", "--type", "place", "--add", "contains=[[Ennio]]", "--add", "contains=[[Lena]]");
    await rpg("write", "Cripta", "--type", "place", "--add", "contains=[[Ossario]]");
    await rpg("write", "Annegato", "--type", "creature", "--set", "hp=22/22", "--set", "uses=1/1");
    await rpg("write", "Lupo", "--type", "creature", "--set", "hp=11/11");
    await rpg("write", "Fuoco fatuo", "--type", "creature", "--text", "Una luce che inganna.");
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

function stateFile(): string
{
    return readFileSync(join(folder, "state.yaml"), "utf8");
}

describe("rpg scene", () => {
    it("opens a scene where the character is, with the party there and numbered copies with the creature's counters", async () => {
        await ok("advance", "--to", "day 2, 14:10");
        expect(await ok("scene", "open", "--title", "Scontro all'ossario", "--type", "combat", "--creatures", "Annegato=2")).toBe(
            "Scene opened, day 2, 14:10: Scontro all'ossario (combat) at Ossario. In it: Ennio: hp 12/12 · arrows 18; Lena: hp 7/7; Annegato 1: hp 22/22 · uses 1/1; Annegato 2: hp 22/22 · uses 1/1.",
        );
        expect(stateFile()).toContain(
            'scene:\n  title: Scontro all\'ossario\n  type: combat\n  place: "[[Ossario]]"\n  opened: day 2, 14:10\n  with:\n    - "[[Ennio]]"\n    - "[[Lena]]"\n  copies:\n    Annegato 1:\n      creature: "[[Annegato]]"\n      hp: 22/22',
        );
        const [opened, copies] = readLogFile(folder).slice(-2);
        expect(opened).toMatchObject({ type: "scene-opened", visibility: "public", data: { title: "Scontro all'ossario", type: "combat", place: "[[Ossario]]", with: ["[[Ennio]]", "[[Lena]]"] } });
        expect(opened.data.copies).toBeUndefined();
        expect(copies).toMatchObject({ type: "scene-changed", visibility: "hidden", data: { copies: { "Annegato 1": { hp: "22/22" } } } });
    });

    it("runs the turns, changes a copy's counters with change, and closes with a summary that keeps the enemies' numbers hidden", async () => {
        await ok("scene", "open", "--title", "Ossario", "--type", "combat", "--creatures", "Annegato=2");
        expect(await ok("scene", "order", "--order", "lena", "--order", "Annegato 1", "--order", "[[Ennio]]", "--order", "Annegato 2")).toBe("Order: Lena · Annegato 1 · Ennio · Annegato 2.\nRound 1 · now Lena (then Annegato 1).");
        expect(await ok("scene", "next")).toBe("Round 1 · now Annegato 1 (then Ennio).");
        await ok("scene", "next");
        await ok("scene", "next");
        expect(await ok("scene", "next")).toBe("Round 2 · now Lena (then Annegato 1).");

        expect(await ok("change", "annegato 1", "hp", "--by=-9", "--why", "freccia")).toBe("Annegato 1: hp 22/22 → 13/22.");
        expect(await ok("change", "Annegato 2", "hp", "--by=-30")).toBe("Annegato 2: hp 22/22 → 0/22: at 0, 8 beyond.");
        expect(await ok("change", "Lena", "hp", "--by=-2")).toBe("Lena: hp 7/7 → 5/7.");
        expect(readLogFile(folder).filter((entry) => entry.type === "counter-changed").map((entry) => [entry.data.page, entry.visibility, entry.data.copy])).toEqual([["Annegato 1", "hidden", true], ["Annegato 2", "hidden", true], [
            "Lena",
            "public",
            undefined,
        ]]);
        expect(readFileSync(join(folder, "world", "creatures", "Annegato.md"), "utf8")).toContain("hp: 22/22");
        expect(await ok("status")).toContain("Scene: Ossario (combat) at Ossario, with Ennio, Lena; round 2, Lena's turn; copies: Annegato 1: hp 13/22 · uses 1/1; Annegato 2: hp 0/22 · uses 1/1");

        expect(await ok("scene", "close", "--summary", "Gli annegati cadono; Lena è ferita.")).toBe(
            "Scene closed after 2 rounds: Ossario. Copies gone: Annegato 1: hp 13/22 · uses 1/1; Annegato 2: hp 0/22 · uses 1/1. Advance any time it took that you have not advanced yet.",
        );
        expect(stateFile()).not.toContain("scene:");
        const [copies, closed] = readLogFile(folder).slice(-2);
        expect(copies).toMatchObject({ type: "scene-changed", visibility: "hidden", data: { copies: { "Annegato 1": { hp: "13/22" } } } });
        expect(closed).toMatchObject({ type: "scene-closed", visibility: "public", data: { title: "Ossario", type: "combat", rounds: 2, summary: "Gli annegati cadono; Lena è ferita." } });
        expect(closed.data.copies).toBeUndefined();
        expect((await rpg("change", "Annegato 1", "hp", "--by=-1")).output).toBe("There is no page named Annegato 1. Look for it with the find command.");
    });

    it("plays a scene without turns, as in a game without initiative, and status remembers the last scenes", async () => {
        for (const [title, type] of [["Al guado", "social"], ["La palude", "travel"], ["Dal mugnaio", "social"], ["Il lupo", "combat"]]) {
            await ok("scene", "open", "--title", title, "--type", type);
            await ok("scene", "close", "--summary", `Finisce ${title}.`);
        }

        const status = await ok("status");
        expect(status).toContain("Last scenes: Il lupo (combat): Finisce Il lupo. · Dal mugnaio (social): Finisce Dal mugnaio. · La palude (travel): Finisce La palude.");
        expect(status).toContain("Scenes so far: 2 social, 1 combat, 1 travel");
        expect(await ok("scene", "open", "--title", "Sola", "--type", "rest", "--with", "Varro", "--place", "[[Cripta]]")).toBe("Scene opened: Sola (rest) at Cripta. In it: Varro.");
    });

    it("adds characters and creatures, numbering copies after those there, and puts newcomers last in the order", async () => {
        await ok("scene", "open", "--title", "Ossario", "--type", "combat", "--creatures", "Annegato");
        await ok("scene", "order", "--order", "Ennio", "--order", "Lena", "--order", "Annegato 1");
        expect(await ok("scene", "add", "--creatures", "Annegato=2", "--creatures", "[[Lupo]]", "--with", "Varro")).toBe(
            "Added to Ossario: Varro; Annegato 2: hp 22/22 · uses 1/1; Annegato 3: hp 22/22 · uses 1/1; Lupo 1: hp 11/11. They take their turns last: change the order with scene order if needed.",
        );
        expect(stateFile()).toContain("order:\n    - Ennio\n    - Lena\n    - Annegato 1\n    - Varro\n    - Annegato 2\n    - Annegato 3\n    - Lupo 1");
    });

    it("keeps the round and the turn when the order changes in a running scene, and leaves out who takes no turn", async () => {
        await ok("scene", "open", "--title", "Ossario", "--type", "combat", "--creatures", "Annegato=2");
        await ok("scene", "order", "--order", "Ennio", "--order", "Lena", "--order", "Annegato 1", "--order", "Annegato 2");

        for (let turn = 0; turn < 5; turn++) {
            await ok("scene", "next");
        }

        await ok("change", "Annegato 2", "hp", "--to", "0");
        expect(await ok("scene", "order", "--order", "Annegato 1", "--order", "Lena", "--order", "Ennio")).toBe("Order: Annegato 1 · Lena · Ennio. No turn: Annegato 2.\nRound 2 · now Lena (then Ennio).");
        expect(await ok("scene", "next")).toBe("Round 2 · now Ennio (then Annegato 1).");
        expect(await ok("scene", "next")).toBe("Round 3 · now Annegato 1 (then Lena).");
    });

    it("warns when a creature has no counters, and refuses to change the creature while its copies fight", async () => {
        const opened = await ok("scene", "open", "--title", "Palude", "--type", "combat", "--creatures", "Fuoco fatuo", "--creatures", "Annegato");
        expect(opened).toContain("\nFuoco fatuo has no counters, so its copies have none: to count what they lose, write them on the creature, such as hp=22/22, and bring the copies in again with scene add.");
        expect((await rpg("change", "Fuoco fatuo 1", "hp", "--by=-1")).output).toBe(
            'Fuoco fatuo 1 has no field "hp". It has no counters. A copy takes the counters written on its creature when it enters the scene: write the counter on the creature, then bring copies in again with scene add.',
        );

        const creature = await rpg("change", "Annegato", "hp", "--by=-3");
        expect(creature.exitCode).toBe(1);
        expect(creature.output).toBe("Annegato has copies in the open scene: Annegato 1 (hp 22/22 · uses 1/1). Change a copy; Annegato's page holds the counters each new copy starts with. Nothing changed.");
        expect(await ok("change", "Lupo", "hp", "--by=-1")).toBe("Lupo: hp 11/11 → 10/11.");
    });

    it("takes a single text or an object where it takes a list, as an MCP client may send them", () => {
        const opened = scene.run(scene.input.parse({ action: "open", title: "Ossario", type: "combat", with: "Lena", creatures: { Lupo: 2 } }), context);
        expect(scene.format(opened)).toBe("Scene opened: Ossario (combat) at Ossario. In it: Lena: hp 7/7; Lupo 1: hp 11/11; Lupo 2: hp 11/11.");
        expect(scene.format(scene.run(scene.input.parse({ action: "order", order: "Lena" }), context))).toBe("Order: Lena. No turn: Lupo 1, Lupo 2.\nRound 1 · now Lena.");
        expect(scene.format(scene.run(scene.input.parse({ action: "close", summary: "Fuggono.", creatures: {}, with: [] }), context))).toContain("Scene closed after 1 round: Ossario.");
    });

    it("says what is wrong, and how to fix it", async () => {
        const refusals: [string[], string][] = [
            [["scene", "next"], "No scene is open: open one with scene open, giving its title and type."],
            [["scene", "close", "--summary", "x"], "No scene is open: there is nothing to close."],
            [["scene", "open", "--title", "X"], "Give the scene a title and a type: combat, social, exploration, travel, rest, other."],
            [["scene", "open", "--title", "X", "--type", "fight"], 'Invalid input for "scene"'],
            [["scene", "open", "--title", "X", "--type", "combat", "--summary", "y"], "scene open does not take summary: it takes title, type, place, with, creatures."],
            [["scene", "open", "--title", "X", "--type", "combat", "--creatures", "Annegati=2"], "There is no creature named Annegati. The creatures are: Annegato, Fuoco fatuo, Lupo."],
            [["scene", "open", "--title", "X", "--type", "combat", "--creatures", "Varro"], "Varro is a character, not a creature: characters enter with with."],
            [["scene", "open", "--title", "X", "--type", "combat", "--creatures", "Annegato=0"], "Give how many Annegato enter as a whole number from 1 to 50, such as Annegato=2."],
            [["scene", "open", "--title", "X", "--type", "combat", "--creatures", "Annegato=due"], "Give how many Annegato enter"],
            [["scene", "open", "--title", "X", "--type", "combat", "--creatures", "Annegato=30", "--creatures", "Annegato=30"], "A scene takes at most 50 copies of Annegato; it has 0."],
            [["scene", "open", "--title", "X", "--type", "combat", "--with", "Livia"], "Livia is dead (status dead): set their status first, if they rise."],
            [["scene", "open", "--title", "X", "--type", "combat", "--with", "Annegato"], "Annegato is a creature, not a character: creatures enter as copies, with creatures, such as Annegato=1."],
            [["scene", "open", "--title", "X", "--type", "combat", "--with", "Nessuno"], "There is no page named Nessuno."],
            [["scene", "open", "--title", "X", "--type", "combat", "--place", "Ennio"], "Ennio is a character, not a place."],
        ];

        for (const [args, message] of refusals) {
            const result = await rpg(...args);
            expect(result.exitCode, args.join(" ")).toBe(1);
            expect(result.output, args.join(" ")).toContain(message);
        }

        await ok("scene", "open", "--title", "Ossario", "--type", "combat", "--creatures", "Annegato");
        const open: [string[], string][] = [
            [["scene", "open", "--title", "Altra", "--type", "social"], "A scene is open: Ossario. Close it first with scene close and a summary."],
            [["scene", "next"], "The scene has no order of turns: set it with scene order, after rolling for it if the game does."],
            [["scene", "order", "--order", "Ennio", "--order", "Varro"], "Varro is not in the scene. In it: Ennio, Lena, Annegato 1."],
            [["scene", "order", "--order", "Ennio", "--order", "ennio"], "Ennio is in the order twice: give each one once."],
            [["scene", "add", "--with", "Lena"], "Lena is already in the scene."],
            [["scene", "add"], "Give who enters the scene: with (characters) or creatures (such as Annegato=1)."],
            [["scene", "close"], "Give the scene a summary of one or two sentences: what happened, as the player saw it."],
            [["change", "Annegato 1", "creature", "--by=1"], "creature is the creature Annegato 1 copies, not a counter."],
            [["change", "Annegato 1", "mana", "--by=1"], 'Annegato 1 has no field "mana". Its counters: hp 22/22, uses 1/1.'],
        ];

        for (const [args, message] of open) {
            const result = await rpg(...args);
            expect(result.exitCode, args.join(" ")).toBe(1);
            expect(result.output, args.join(" ")).toContain(message);
        }
    });

    it("numbers copies past the pages that carry their names, such as a copy written as a character", async () => {
        await ok("write", "Annegato 1", "--type", "character", "--set", "creature=[[Annegato]]");
        expect(await ok("scene", "open", "--title", "X", "--type", "combat", "--creatures", "Annegato=2")).toContain("Annegato 2: hp 22/22 · uses 1/1; Annegato 3: hp 22/22 · uses 1/1.");
    });

    it("keeps comments and keys written by hand in the scene, and closes a scene that cannot be read", async () => {
        await ok("scene", "open", "--title", "Ossario", "--type", "combat", "--creatures", "Annegato");
        writeFileSync(join(folder, "state.yaml"), stateFile().replace("  copies:", "  # il capo è il primo\n  note: Annegato 1 è il capo\n  copies:"));
        await ok("change", "Annegato 1", "hp", "--by=-1");
        expect(stateFile()).toContain("  # il capo è il primo\n  note: Annegato 1 è il capo\n  copies:");
        expect(stateFile()).toContain("hp: 21/22");

        writeFileSync(join(folder, "state.yaml"), "scene:\n  type: duel\n");
        expect(await ok("validate")).toContain("- state.yaml: The open scene in state.yaml is not valid: title: Invalid input");
        expect((await rpg("scene", "next")).output).toContain("To fix it, close it with scene close and a summary, then open it again.");
        expect((await rpg("change", "Annegato 1", "hp", "--by=-1")).output).toContain("The open scene in state.yaml cannot be read: validate shows how to fix it.");
        expect(await ok("change", "Lena", "hp", "--by=-1")).toBe("Lena: hp 7/7 → 6/7.");
        expect(await ok("scene", "close", "--summary", "Si interrompe.")).toContain("The open scene could not be read (");
        expect(stateFile()).not.toContain("scene:");

        writeFileSync(join(folder, "state.yaml"), 'scene: ""\n');
        expect(await ok("scene", "open", "--title", "Y", "--type", "social")).toContain("Scene opened: Y (social)");
        writeFileSync(join(folder, "state.yaml"), 'scene:\n  title: X\n  type: combat\n  with: ["[[Nessuno]]"]\n');
        expect(await ok("validate")).toBe("1 problem:\n- state.yaml: The open scene links to [[Nessuno]], which does not exist. Fix: create that page, or close the scene and open it again.");
    });

    it("leaves out log lines written wrongly by hand, which validate reports", async () => {
        appendFileSync(join(folder, "log.jsonl"), '{"id":"x1","at":"2026-10-03T00:00:00Z","type":"scene-closed"}\n{"id":"x2","at":"2026-10-03T00:00:00Z","type":"scene-closed","data":{"title":"Vecchia"}}\n');
        const status = await ok("status");
        expect(status).not.toContain("Last scenes");
        expect(status).toContain("1 problem in the campaign");
        expect(await ok("validate")).toContain("- log.jsonl: line 11 is not an entry: it needs id, at, type and data.");
    });
});

describe("rpg scene, after the second review", () => {
    it("passes the turn on when its owner leaves the order, and starts a new round when no one after them is left", async () => {
        await ok("scene", "open", "--title", "Ossario", "--type", "combat", "--creatures", "Annegato=2");
        await ok("scene", "order", "--order", "Ennio", "--order", "Annegato 1", "--order", "Lena", "--order", "Annegato 2");
        await ok("scene", "next");
        expect(await ok("scene", "order", "--order", "Ennio", "--order", "Lena", "--order", "Annegato 2")).toBe("Order: Ennio · Lena · Annegato 2. No turn: Annegato 1.\nRound 1 · now Lena (then Annegato 2).");
        await ok("scene", "next");
        expect(await ok("scene", "order", "--order", "Ennio", "--order", "Lena")).toBe("Order: Ennio · Lena. No turn: Annegato 1, Annegato 2.\nRound 2 · now Ennio (then Lena).");
    });

    it("keeps the scene when the game date cannot be read, and writes state.yaml in blocks", async () => {
        await ok("scene", "open", "--title", "Guado", "--type", "exploration");
        expect(stateFile()).not.toContain("{");
        await ok("scene", "add", "--creatures", "Lupo=2");
        expect(stateFile()).toContain('  copies:\n    Lupo 1:\n      creature: "[[Lupo]]"\n      hp: 11/11\n');

        writeFileSync(join(folder, "state.yaml"), stateFile() + "date: 3\n");
        expect(await ok("status")).toContain("Scene: Guado (exploration)");
        const again = await rpg("scene", "open", "--title", "Nuova", "--type", "social");
        expect(again.output).toBe("A scene is open: Guado. Close it first with scene close and a summary.");

        writeFileSync(join(folder, "state.yaml"), "date: day 1, 18:00\n");
        await ok("scene", "open", "--title", "Breve", "--type", "rest");
        await ok("scene", "close", "--summary", "Riposano.");
        await ok("scene", "open", "--title", "Dopo", "--type", "social");
        expect(stateFile()).toContain("scene:\n  title: Dopo\n");
    });

    it("counts empty texts, lists and objects from MCP as left out", () => {
        const opened = scene.run(scene.input.parse({ action: "open", title: "Ossario", type: "combat", with: [], creatures: "", order: "" }), context);
        expect(scene.format(opened)).toBe("Scene opened: Ossario (combat) at Ossario. In it: Ennio: hp 12/12 · arrows 18; Lena: hp 7/7.");
        expect(() => scene.run(scene.input.parse({ action: "next", title: "", with: "", creatures: "", order: "", summary: "" }), context)).toThrow("The scene has no order of turns");
    });

    it("guards the creature, and closes with a title, when the scene cannot be read", async () => {
        await ok("scene", "open", "--title", "Ossario", "--type", "combat", "--creatures", "Annegato");
        writeFileSync(join(folder, "state.yaml"), stateFile().replace("type: combat", "type: duel"));
        expect((await rpg("change", "Annegato", "hp", "--by=-1")).output).toContain("Annegato is a creature, and the open scene, which may hold its copies, cannot be read:");
        await ok("scene", "close", "--summary", "Finita.");
        expect(readLogFile(folder).at(-1)).toMatchObject({ type: "scene-closed", data: { title: "Ossario", type: "other", summary: "Finita." } });
        expect(await ok("status")).toContain("Last scenes: Ossario (other): Finita.");
    });

    it("says how to write creatures on the command line, and refuses a name that is both a copy and a page", async () => {
        expect((await rpg("scene", "open", "--title", "A", "--type", "combat", "--creatures", '{"Annegato": 2}')).output).toBe('Write creatures as Name=count, such as Annegato=2: an object such as {"Annegato": 2} works only through MCP.');

        await ok("scene", "open", "--title", "Ossario", "--type", "combat", "--creatures", "Annegato=2");
        await ok("write", "Annegato 2", "--type", "character", "--set", "role=npc", "--set", "hp=7/7");
        expect((await rpg("change", "Annegato 2", "hp", "--by=-1")).output).toBe(
            "Annegato 2 is both a copy in the open scene and a page, so it is not clear which one to change. Close the scene, which removes the copy, or rename the page. Nothing changed.",
        );
        expect(await ok("validate")).toContain("- state.yaml: Annegato 2 is both a copy in the open scene and a page, so change cannot tell which one is meant. Fix: close the scene, which removes the copy, or rename the page.");
    });
});
