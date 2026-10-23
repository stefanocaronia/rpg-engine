import { appendFileSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { runCommandLine } from "../src/command-line.ts";
import { scene } from "../src/commands/scene.ts";
import type { Context } from "../src/core/context.ts";
import { fightGuidance, inPlay, makeTempFolder, playerStop, playerTurn, quietTurn, readLogFile, removeFolder, systemPageCount, testContext } from "./support.ts";

let folder: string;
let context: Context;

beforeEach(async () => {
    folder = makeTempFolder();
    context = testContext(folder);
    await runCommandLine(["init", "--name", "Guadoscuro", "--language", "it", "--system", "5e", "--difficulty", "normal", "--lethality", "dice"], context);
    inPlay(folder);
    await rpg("write", "Ennio", "--type", "character", "--set", "role=pc", "--set", "hp=12/12", "--add", "inventory=[[Arrows]] 18");
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
    it("says that the title of a closed scene is no page when show is given it, and gives the open one's log (SCN-10)", async () => {
        await ok("scene", "open", "--title", "Al molo", "--type", "exploration");
        expect(await ok("show", "Al molo")).toBe([
            "Al molo (exploration, open) at Ossario: what happened since it opened, from the log.",
            "Nothing yet.",
            "Where each one stands is not kept: leave it out of a recap, and ask the player only when it matters to their next move.",
        ].join("\n"));
        expect((await rpg("show", "Al molo#Il pontile")).output).toContain("Al molo is the open scene, not a page: show it without a section for what happened so far.");
        await ok("scene", "close", "--summary", "Arrivati al molo.");
        expect((await rpg("show", "al molo")).output).toBe("There is no page named al molo. Al molo is a scene that closed, not a page (exploration): Arrivati al molo.");
        expect((await rpg("show", "Altrove")).output).toBe("There is no page named Altrove. Look for it with the find command.");
    });

    it("never takes the scene away when its close cannot find a page: the close stops with the scene still open", async () => {
        await ok("scene", "open", "--title", "Ossario", "--type", "combat", "--creatures", "Lupo=1");
        writeFileSync(join(folder, "world", "Lena.md"), "Un'altra Lena.\n");
        expect((await rpg("scene", "close", "--summary", "Fine.")).exitCode).toBe(1);
        expect(stateFile()).toContain("scene:");
    });

    it("opens a scene where the character is, with the party there and numbered copies with the creature's counters", async () => {
        await ok("advance", "--to", "day 2, 14:10");
        expect(await ok("scene", "open", "--title", "Scontro all'ossario", "--type", "combat", "--creatures", "Annegato=2")).toBe(
            `Scene opened, day 2, 14:10: Scontro all'ossario (combat) at Ossario. In it: Ennio: hp 12/12; Lena: hp 7/7; Annegato 1: hp 22/22 · uses 1/1; Annegato 2: hp 22/22 · uses 1/1.\n${fightGuidance}`,
        );
        expect(stateFile()).toContain(
            'scene:\n  title: Scontro all\'ossario\n  type: combat\n  place: "[[Ossario]]"\n  opened: day 2, 14:10\n  with:\n    - "[[Ennio]]"\n    - "[[Lena]]"\n  copies:\n    Annegato 1:\n      creature: "[[Annegato]]"\n    Annegato 2:\n      creature: "[[Annegato]]"\n',
        );
        const [opened, copies] = readLogFile(folder).slice(-2);
        expect(opened).toMatchObject({ type: "scene-opened", visibility: "public", data: { title: "Scontro all'ossario", type: "combat", place: "[[Ossario]]", with: ["[[Ennio]]", "[[Lena]]"] } });
        expect(opened.data.copies).toBeUndefined();
        expect(copies).toMatchObject({ type: "scene-changed", visibility: "hidden", data: { copies: { "Annegato 1": { creature: "[[Annegato]]" } } } });
        expect((copies.data.copies as Record<string, Record<string, unknown>>)["Annegato 1"].hp).toBeUndefined();
    });

    it("runs the turns, changes a copy's counters with change, and closes with a summary that keeps the enemies' numbers hidden", async () => {
        await ok("scene", "open", "--title", "Ossario", "--type", "combat", "--creatures", "Annegato=2");
        expect(await ok("scene", "order", "--order", "lena", "--order", "Annegato 1", "--order", "[[Ennio]]", "--order", "Annegato 2")).toBe(
            `Order: Lena · Annegato 1 · Ennio · Annegato 2.\nRound 1 · now Lena (then Annegato 1).\n${quietTurn}`,
        );
        expect(await ok("scene", "next")).toBe(`Round 1 · now Annegato 1 (then Ennio).\n${quietTurn}`);
        await ok("scene", "next");
        await ok("scene", "next");
        expect(await ok("scene", "next")).toBe(`Round 2 · now Lena (then Annegato 1).\n${quietTurn}`);

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
            "Scene closed after 2 rounds: Ossario. Copies gone: Annegato 1: hp 13/22 · uses 1/1; Annegato 2: hp 0/22 · uses 1/1. Advance any time it took that you have not advanced yet; write on their pages what it changed for good, such as a fire put out or a door broken."
                // A creature of the campaign written without its experience points is named, not left out in silence (DAT-11).
                + "\nxp: Annegato 2 counts nothing, with no xp-value on Annegato: write it, such as write Annegato, set xp-value=…, and share it. Leave out what the party summoned; "
                + "count those overcome another way and what the story rewards, as you judge, and tell the player only what each gained."
                + "\nSaved: 1 - Ossario.",
        );
        expect(stateFile()).not.toContain("scene:");
        // The close, then the save it makes (SAV-3).
        const [copies, closed, saved] = readLogFile(folder).slice(-3);
        expect(copies).toMatchObject({ type: "scene-changed", visibility: "hidden", data: { copies: { "Annegato 1": { hp: "13/22" } } } });
        expect(closed).toMatchObject({ type: "scene-closed", visibility: "public", data: { title: "Ossario", type: "combat", rounds: 2, summary: "Gli annegati cadono; Lena è ferita." } });
        expect(saved).toMatchObject({ type: "saved", visibility: "public", data: { save: 1, label: "Ossario", why: "scene closed" } });
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
        expect(await ok("scene", "next")).toBe(`Round 2 · now Ennio${playerTurn} (then Annegato 1)${playerStop}\nMark with scene use what Ennio uses of the turn, as it happens: action, bonus action, reaction.`);
        expect(await ok("scene", "next")).toBe(`Round 3 · now Annegato 1 (then Lena).\n${quietTurn}`);
    });

    it("reads from the creature what a copy did not change, even a counter written after the copy entered, and refuses to change the creature while its copies fight", async () => {
        await ok("scene", "open", "--title", "Palude", "--type", "combat", "--creatures", "Fuoco fatuo", "--creatures", "Annegato");
        expect((await rpg("change", "Fuoco fatuo 1", "hp", "--by=-1")).output).toBe(
            'Fuoco fatuo 1 has no field "hp". It has no counters. To add one to Fuoco fatuo 1 alone, use write, such as set hp=12/12. To give it to every Fuoco fatuo, write it on Fuoco fatuo once the scene is closed.',
        );
        expect((await rpg("write", "Fuoco fatuo", "--set", "hp=5/5")).output).toBe(
            "Fuoco fatuo has copies in the open scene, which read from it what they do not change: Fuoco fatuo 1. Change a copy; to change Fuoco fatuo for all, close the scene first. Nothing changed.",
        );
        writeFileSync(join(folder, "world", "creatures", "Fuoco fatuo.md"), "---\nhp: 5/5\ndifesa: 12\n---\n\nUna luce che inganna.\n");
        expect(await ok("change", "Fuoco fatuo 1", "hp", "--by=-2")).toBe("Fuoco fatuo 1: hp 5/5 → 3/5.");
        expect(await ok("change", "Fuoco fatuo 1", "difesa", "--by=-2")).toBe("Fuoco fatuo 1: difesa 12 → 10.");
        expect(stateFile()).toContain('    Fuoco fatuo 1:\n      creature: "[[Fuoco fatuo]]"\n      hp: 3/5\n      difesa: 10\n');
        expect(await ok("status")).toContain("copies: Fuoco fatuo 1: hp 3/5 · difesa 10; Annegato 1: hp 22/22 · uses 1/1");

        const creature = await rpg("change", "Annegato", "hp", "--by=-3");
        expect(creature.exitCode).toBe(1);
        expect(creature.output).toBe("Annegato has copies in the open scene, which read from it what they do not change: Annegato 1 (hp 22/22 · uses 1/1). Change a copy; to change Annegato for all, close the scene first. Nothing changed.");
        expect(await ok("change", "Lupo", "hp", "--by=-1")).toBe("Lupo: hp 11/11 → 10/11.");
    });

    it("takes a single text or an object where it takes a list, as an MCP client may send them", async () => {
        const opened = await scene.run(scene.input.parse({ action: "open", title: "Ossario", type: "combat", with: "Lena", creatures: { Lupo: 2 } }), context);
        expect(scene.format(opened)).toBe(`Scene opened: Ossario (combat) at Ossario. In it: Lena: hp 7/7; Lupo 1: hp 11/11; Lupo 2: hp 11/11.\n${fightGuidance}`);
        expect(scene.format(await scene.run(scene.input.parse({ action: "order", order: "Lena" }), context))).toBe(
            `Order: Lena. No turn: Lupo 1, Lupo 2.\nRound 1 · now Lena.\n${quietTurn}`,
        );
        expect(scene.format(await scene.run(scene.input.parse({ action: "close", summary: "Fuggono.", creatures: {}, with: [] }), context))).toContain("Scene closed after 1 round: Ossario.");
    });

    it("takes links separated by commas in one text as their list, as a model may send them (SCN-8)", async () => {
        const opened = await scene.run(scene.input.parse({ action: "open", title: "Al molo", type: "social", with: "[[Ennio]], [[Lena]], [[Varro]]" }), context);
        expect(scene.format(opened)).toContain("In it: Ennio: hp 12/12; Lena: hp 7/7; Varro.");
        expect(await ok("scene", "order", "--order", "[[Varro]], [[Ennio]]")).toContain("Order: Varro · Ennio. No turn: Lena.");
        expect(await ok("scene", "leave", "--who", "[[Lena]],[[Varro]]")).toContain("Lena, Varro left the scene.");
    });

    it("gives in the open scene's log why a page was written, and keeps it for a copy too", async () => {
        await ok("scene", "open", "--title", "Al molo", "--type", "combat", "--creatures", "Lupo=1");
        await ok("write", "Varro", "--set", "attitude=wary", "--why", "ha visto il lupo");
        await ok("write", "Lupo 1", "--set", "frightened=true", "--why", "il fuoco");
        expect(readLogFile(folder).at(-1)).toMatchObject({ type: "page-updated", visibility: "hidden", data: { page: "Lupo 1", copy: true, why: "il fuoco" } });
        expect(await ok("show", "Al molo")).toContain("wrote Varro (ha visto il lupo)");
    });

    it("says what is wrong, and how to fix it", async () => {
        const refusals: [string[], string][] = [
            [["scene", "next"], "No scene is open: open one with scene open, giving its title and type."],
            [["scene", "close", "--summary", "x"], "No scene is open: there is nothing to close."],
            [["scene", "open", "--title", "X"], "Give the scene a title and a type: combat, social, exploration, travel, rest, challenge, other."],
            [["scene", "open", "--title", "X", "--type", "fight"], 'Invalid input for "scene"'],
            [["scene", "open", "--title", "X", "--type", "combat", "--summary", "y"], "scene open does not take summary: it takes title, type, place, with, creatures, now, seen."],
            [
                ["scene", "open", "--title", "X", "--type", "combat", "--creatures", "Annegati=2"],
                `There is no creature named Annegati. The campaign's creatures are: Annegato, Fuoco fatuo, Lupo. The system 5e has ${systemPageCount("5e", "creatures")} creatures, named in English`,
            ],
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
            [["scene", "add"], "Give who enters the scene: with (characters) or creatures (such as Annegato=1); or seen, what the character sees of who is already in it."],
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

describe("rpg scene now (SCN-11, D-310)", () => {
    it("keeps the line of what is happening now, given at open or with now, for the player's view, logged in public and out of the diary", async () => {
        await ok("scene", "open", "--title", "Nell'ossario", "--type", "combat", "--now", "Gli annegati escono dall'acqua", "--creatures", "Annegato=1");
        expect(JSON.parse(await ok("view", "--json")).openScene.now).toBe("Gli annegati escono dall'acqua");
        // Who is in it, and a scene the story has left to close (playtest 19).
        const told = await ok("scene", "now", "--now", "  Lena è a terra  ");
        expect(told).toMatch(/^Nell'ossario, with .*Annegato 1: the player's dashboard now shows "Lena è a terra"\. If the story has moved elsewhere or to other people/);
        expect(JSON.parse(await ok("view", "--json")).openScene.now).toBe("Lena è a terra");
        expect(readLogFile(folder).at(-1)).toMatchObject({ type: "scene-now", visibility: "public", data: { title: "Nell'ossario", now: "Lena è a terra" } });
        expect(JSON.parse(await ok("view", "--json")).diary.join(" ")).not.toContain("Lena è a terra");
        expect(await ok("show", "Nell'ossario")).toContain("now: Lena è a terra");
    });

    it("refuses now without its line, and on the other actions", async () => {
        await ok("scene", "open", "--title", "Nell'ossario", "--type", "social");
        expect((await rpg("scene", "now")).output).toContain("Give now");
        expect((await rpg("scene", "next", "--now", "x")).output).toContain("does not take now");
    });
});

describe("rpg scene, after the second review", () => {
    it("passes the turn on when its owner leaves the order, and starts a new round when no one after them is left", async () => {
        await ok("scene", "open", "--title", "Ossario", "--type", "combat", "--creatures", "Annegato=2");
        await ok("scene", "order", "--order", "Ennio", "--order", "Annegato 1", "--order", "Lena", "--order", "Annegato 2");
        await ok("scene", "next");
        expect(await ok("scene", "order", "--order", "Ennio", "--order", "Lena", "--order", "Annegato 2")).toBe(
            `Order: Ennio · Lena · Annegato 2. No turn: Annegato 1.\nRound 1 · now Lena (then Annegato 2).\n${quietTurn}`,
        );
        await ok("scene", "next");
        expect(await ok("scene", "order", "--order", "Ennio", "--order", "Lena")).toBe(
            `Order: Ennio · Lena. No turn: Annegato 1, Annegato 2.\nRound 2 · now Ennio${playerTurn} (then Lena)${playerStop}\nMark with scene use what Ennio uses of the turn, as it happens: action, bonus action, reaction.`,
        );
    });

    it("keeps the scene when the game date cannot be read, and writes state.yaml in blocks", async () => {
        await ok("scene", "open", "--title", "Guado", "--type", "exploration");
        expect(stateFile()).not.toContain("{");
        await ok("scene", "add", "--creatures", "Lupo=2");
        expect(stateFile()).toContain('  copies:\n    Lupo 1:\n      creature: "[[Lupo]]"\n    Lupo 2:\n      creature: "[[Lupo]]"\n');

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

    it("counts empty texts, lists and objects from MCP as left out", async () => {
        const opened = await scene.run(scene.input.parse({ action: "open", title: "Ossario", type: "combat", with: [], creatures: "", order: "" }), context);
        expect(scene.format(opened)).toBe(`Scene opened: Ossario (combat) at Ossario. In it: Ennio: hp 12/12; Lena: hp 7/7.\n${fightGuidance}`);
        expect(() => scene.run(scene.input.parse({ action: "next", title: "", with: "", creatures: "", order: "", summary: "" }), context)).toThrow("The scene has no order of turns");
    });

    it("guards the creature, and closes with a title, when the scene cannot be read", async () => {
        await ok("scene", "open", "--title", "Ossario", "--type", "combat", "--creatures", "Annegato");
        writeFileSync(join(folder, "state.yaml"), stateFile().replace("type: combat", "type: duel"));
        expect((await rpg("change", "Annegato", "hp", "--by=-1")).output).toContain("Annegato is a creature, and the open scene, which may hold its copies, cannot be read:");
        await ok("scene", "close", "--summary", "Finita.");
        expect(readLogFile(folder).at(-2)).toMatchObject({ type: "scene-closed", data: { title: "Ossario", type: "other", summary: "Finita." } });
        expect(await ok("status")).toContain("Last scenes: Ossario (other): Finita.");
    });

    it("says how to write creatures on the command line, and refuses a name that is both a copy and a page", async () => {
        expect((await rpg("scene", "open", "--title", "A", "--type", "combat", "--creatures", '{"Annegato": 2}')).output).toBe('Write creatures as Name=count, such as Annegato=2: an object such as {"Annegato": 2} works only through MCP.');

        await ok("scene", "open", "--title", "Ossario", "--type", "combat", "--creatures", "Annegato=2");
        expect((await rpg("write", "Annegato 2", "--type", "character", "--set", "role=npc")).output).toBe(
            "Annegato 2 is a copy of [[Annegato]] in the open scene, not a page: leave out type to write its fields, or give the new page another name.",
        );
        writeFileSync(join(folder, "world", "characters", "Annegato 2.md"), "---\nrole: npc\nhp: 7/7\n---\n");
        const clash = "Annegato 2 is both a copy in the open scene and a page, so it is not clear which one is meant. Close the scene, which removes the copy, or rename the page. Nothing changed.";
        expect((await rpg("change", "Annegato 2", "hp", "--by=-1")).output).toBe(clash);
        expect((await rpg("write", "Annegato 2", "--set", "nota=x")).output).toBe(clash);
        expect(await ok("show", "Annegato 2")).toContain("Annegato 2 is also a copy in the open scene: change and write refuse both until the scene closes, which removes the copy, or the page is renamed.");
        expect(await ok("validate")).toContain("- state.yaml: Annegato 2 is both a copy in the open scene and a page, so change cannot tell which one is meant. Fix: close the scene, which removes the copy, or rename the page.");
    });
});

describe("rpg scene leave, and the reminder in advance", () => {
    it("takes out a copy with its numbers and a character, and passes on the turn of who leaves", async () => {
        await ok("scene", "open", "--title", "Ossario", "--type", "combat", "--creatures", "Annegato=2");
        await ok("scene", "order", "--order", "Ennio", "--order", "Annegato 1", "--order", "Lena", "--order", "Annegato 2");
        await ok("scene", "next");
        await ok("change", "Annegato 1", "hp", "--by=-18");
        expect(await ok("scene", "leave", "--who", "annegato 1")).toBe(
            `Annegato 1 (hp 4/22 · uses 1/1) left the scene.\nRound 1 · now Lena (then Annegato 2).\n${quietTurn}`,
        );
        // Out of the copies, kept as it left for what overcoming it gives at the close (DAT-11).
        expect(stateFile()).not.toMatch(/ {2}copies:\n(?: {4}.*\n| {6}.*\n)* {4}Annegato 1:/);
        expect(stateFile()).toContain("  left:\n    - Annegato 1\n  gone:\n    Annegato 1:\n");
        expect(readLogFile(folder).at(-1)).toMatchObject({ type: "scene-changed", visibility: "hidden", data: { left: ["Annegato 1"], copies: { "Annegato 1": { hp: "4/22" } } } });

        expect(await ok("scene", "leave", "--who", "[[Lena]]", "--who", "Annegato 2")).toBe(
            `Lena, Annegato 2 (hp 22/22 · uses 1/1) left the scene.\nRound 2 · now Ennio${playerTurn}${playerStop}\nMark with scene use what Ennio uses of the turn, as it happens: action, bonus action, reaction.`,
        );
        expect(stateFile()).not.toContain("copies:");
        expect(stateFile()).toContain('with:\n    - "[[Ennio]]"\n');
        expect(readFileSync(join(folder, "world", "places", "Ossario.md"), "utf8")).toContain("[[Lena]]");
        expect(await ok("scene", "leave", "--who", "Ennio")).toBe("Ennio left the scene.\nNo one takes turns now.");
        // The copies that left end with the scene, with their wounds said, so that one that may come back gets a page (D-246).
        expect(await ok("scene", "close", "--summary", "Fuggiti.")).toContain(
            "\nLeft during the scene: Annegato 1: hp 4/22 · uses 1/1; Annegato 2: hp 22/22 · uses 1/1. A copy ends with its scene: if one may come back, give it a page now, with its wounds.",
        );
    });

    it("says who is not in the scene", async () => {
        await ok("scene", "open", "--title", "Ossario", "--type", "social");
        const refusals: [string[], string][] = [
            [["scene", "leave"], 'Give who leaves the scene, such as who "Annegato 2".'],
            [["scene", "leave", "--who", "Varro"], "Varro is not in the scene. In it: Ennio, Lena."],
            [["scene", "add", "--who", "Varro"], "scene add does not take who: it takes with, creatures, seen."],
        ];

        for (const [args, message] of refusals) {
            const result = await rpg(...args);
            expect(result.exitCode, args.join(" ")).toBe(1);
            expect(result.output, args.join(" ")).toContain(message);
        }
    });

    it("reminds of an open scene when an hour or more passes, and only then", async () => {
        await ok("advance", "--to", "day 1, 18:00");
        await ok("scene", "open", "--title", "Alla locanda", "--type", "social");
        expect(await ok("advance", "--by", "30m")).toBe("day 1, 18:00 → day 1, 18:30.");
        // A companion in the open scene has lived something new: their diary is due on the new day (DIA-2).
        expect(await ok("advance", "--by", "8h")).toBe([
            "day 1, 18:30 → day 2, 02:30.",
            "A scene is still open: Alla locanda (since day 1, 18:00). Close it if this time ends it.",
            "Diary: Lena lived something new since their last lines; at a pause, tonight or at dawn they may write a few: write it yourself in their voice, with thoughts.",
        ].join("\n"));
        await ok("scene", "close", "--summary", "Ennio dorme.");
        expect(await ok("advance", "--by", "2h")).toBe("day 2, 02:30 → day 2, 04:30.");
    });
});

describe("rpg scene, numbers and the log after leave", () => {
    it("never gives a number twice in a scene, and the log keeps who left: the characters in the public line, the copies in a hidden one", async () => {
        await ok("scene", "open", "--title", "Ossario", "--type", "combat", "--creatures", "Annegato");
        await ok("scene", "leave", "--who", "Annegato 1");
        expect(readLogFile(folder).at(-1)).toMatchObject({ type: "scene-changed", visibility: "hidden", data: { left: ["Annegato 1"] } });
        expect(await ok("scene", "add", "--creatures", "Annegato")).toBe("Added to Ossario: Annegato 2: hp 22/22 · uses 1/1.");
        await ok("scene", "leave", "--who", "Lena");
        await ok("scene", "close", "--summary", "Fuggono.");
        const closed = readLogFile(folder).at(-2);
        expect(closed).toMatchObject({ type: "scene-closed", visibility: "public", data: { with: ["[[Ennio]]"], left: ["Lena"] } });
        expect(JSON.stringify(closed)).not.toContain("Annegato 1");
    });
});

describe("the party where the scene is (D-152, CON-6)", () => {
    it("brings into the scene's place the party with the character, on open and on add, and the conditions on the place fire", async () => {
        await ok("write", "Mulino", "--type", "place", "--add", "environment=light: dim");
        await ok("write", "I dormienti si alzano", "--type", "event", "--set", "when=party in [[Mulino]]");
        const opened = await ok("scene", "open", "--title", "Il mulino", "--type", "exploration", "--place", "[[Mulino]]");
        expect(opened).toContain("Scene opened: Il mulino (exploration) at Mulino. In it: Ennio: hp 12/12; Lena: hp 7/7.\nMoved into Mulino: Ennio, Lena.\nNow due: I dormienti si alzano");
        expect(opened).toContain("\nHere: light: dim (Mulino).");
        expect(await ok("show", "Ennio")).toContain("Is in: Mulino");
        expect(readFileSync(join(folder, "world", "places", "Ossario.md"), "utf8")).not.toContain("Ennio");
        expect(readLogFile(folder).find((entry) => entry.type === "moved")).toMatchObject({ visibility: "public", data: { pages: ["Ennio", "Lena"], from: { Ennio: "Ossario", Lena: "Ossario" }, to: "Mulino" } });
        expect(await ok("status")).not.toContain("in the files");

        await ok("scene", "close", "--summary", "Niente.");
        await ok("scene", "open", "--title", "All'ossario", "--type", "social", "--place", "Ossario", "--with", "Varro");
        expect(await ok("scene", "add", "--with", "Ennio")).toBe("Added to All'ossario: Ennio: hp 12/12.\nMoved into Ossario: Ennio.");
        expect(await ok("show", "Ennio")).toContain("Is in: Ossario › Cripta");
        expect(await ok("show", "Lena")).toContain("Is in: Mulino");
    });

    it("moves no one in a travel scene, and status gives the calls when a change by hand put the party elsewhere", async () => {
        await ok("write", "Strada", "--type", "place");
        expect(await ok("scene", "open", "--title", "In viaggio", "--type", "travel", "--place", "Strada")).toBe("Scene opened: In viaggio (travel) at Strada. In it: Ennio: hp 12/12; Lena: hp 7/7.");
        expect(await ok("show", "Ennio")).toContain("Is in: Ossario");
        expect(await ok("status")).not.toContain("in the files");
        await ok("scene", "close", "--summary", "In marcia.");

        await ok("scene", "open", "--title", "All'ossario", "--type", "exploration");
        writeFileSync(join(folder, "world", "places", "Ossario.md"), '---\ncontains: ["[[Lena]]"]\n---\n');
        writeFileSync(join(folder, "world", "places", "Strada.md"), '---\ncontains: ["[[Ennio]]"]\n---\n');
        expect(await ok("status")).toContain(
            "Scene: All'ossario (exploration) at Ossario, with Ennio, Lena; in the files Ennio is in Strada: if they are in Ossario, move, page Ennio, to Ossario; if they left the scene, scene leave, who Ennio",
        );
    });
});
