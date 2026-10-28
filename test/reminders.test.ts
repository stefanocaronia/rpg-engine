// What a fight asks the master to keep by hand, said when it happens (D-266): what breaks what someone keeps alive (EFF-14), the effects at a turn and at a rest
// (EFF-15), the counter that shields another (DAT-14), the open scene's log (SCN-10), the part of the open scene (MOD-5), the counters only change changes (CNT-7, CNT-8).
import { appendFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { runCommandLine } from "../src/command-line.ts";
import type { Context } from "../src/core/context.ts";
import { inPlay, makeTempFolder, quietTurn, removeFolder, testContext } from "./support.ts";

let folder: string;
let context: Context;

beforeEach(async () => {
    folder = makeTempFolder();
    context = testContext(folder);
    await runCommandLine(["init", "--name", "Cripta", "--language", "it", "--system", "fake", "--difficulty", "normal", "--lethality", "dice"], context);
    inPlay(folder);
    await ok("write", "Sala", "--type", "place", "--set", "contains=[[Corrado]], [[Viola]], [[Malco]]");
    await ok("write", "Corrado", "--type", "character", "--set", "role=pc", "--set", "grit=24/24", "--set", "guard=18");
    await ok("write", "Viola", "--type", "character", "--set", "role=companion", "--set", "grit=24/24", "--set", "guard=13");
    await ok("write", "Malco", "--type", "character", "--set", "role=npc", "--set", "creature=[[Cult Fanatic]]");
    await ok("advance", "--to", "day 1, 23:00");
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

async function fight(): Promise<void>
{
    await ok("scene", "open", "--title", "Il rito", "--type", "combat", "--with", "Corrado", "--with", "Viola", "--with", "Malco", "--creatures", "Bog Hound=1");
    await ok("scene", "order", "--order", "Corrado", "--order", "Bog Hound 1", "--order", "Viola", "--order", "Malco");
}

describe("what breaks what someone keeps alive (EFF-14)", () => {
    it("says it when the keeper loses hit points, on a page or a copy, with the whole damage and the rule to read", async () => {
        await fight();
        await ok("effect", "add", "Corrado", "Eroismo", "--for", "10 rounds", "--by", "[[Viola]]");
        expect(await ok("change", "Viola", "grit", "--by=-7", "--why", "artigli")).toBe("Viola: grit 24/24 → 17/24.\nViola keeps Eroismo (Corrado): lost 7 grit. Read rules Holding.");
        await ok("effect", "add", "Bog Hound 1", "Scudo della fede", "--for", "10m", "--by", "Bog Hound 1");
        expect(await ok("change", "Bog Hound 1", "grit", "--by=-30")).toContain("Bog Hound 1 keeps Scudo della fede (Bog Hound 1): lost 30 grit. Read rules Holding.");
        // Healing breaks nothing, nor a loss of another counter.
        expect(await ok("change", "Viola", "grit", "--by", "3")).not.toContain("keeps");
        await ok("write", "Viola", "--set", "frecce=10");
        expect(await ok("change", "Viola", "frecce", "--by=-1")).not.toContain("keeps");
    });

    it("says it when the keeper takes a condition that breaks it, and when they are given one more to keep, but not the same on another target", async () => {
        await ok("effect", "add", "Corrado", "Benedizione", "--for", "1m", "--by", "[[Corrado]]");
        expect(await ok("effect", "add", "Viola", "Benedizione", "--for", "1m", "--by", "[[Corrado]]")).toBe("Viola: Benedizione until day 1, 23:01.");
        expect(await ok("effect", "add", "Viola", "Scudo della fede", "--for", "10m", "--by", "[[Corrado]]")).toBe(
            "Viola: Scudo della fede until day 1, 23:10. Corrado already keeps Benedizione (Corrado, Viola). Read rules Holding.",
        );
        expect(await ok("effect", "add", "Corrado", "Pinned", "--for", "1m")).toContain(
            "Corrado: Pinned until day 1, 23:01. Corrado keeps Benedizione (Corrado, Viola) · Scudo della fede (Viola): now Pinned, which breaks it, whatever else asks for a save: effect end, by [[Corrado]]. Read rules Holding.",
        );
        expect(await ok("effect", "add", "Viola", "Dazed", "--for", "1m")).not.toContain("keeps");
    });

    it("says nothing in a game system without it", async () => {
        const free = makeTempFolder();
        const other = testContext(free);

        try {
            await runCommandLine(["init", "--name", "Ferro", "--system", "free"], other);
            inPlay(free);
            await runCommandLine(["write", "Kira", "--type", "character", "--set", "role=pc", "--set", "health=5/5"], other);
            await runCommandLine(["effect", "add", "Kira", "Vigilanza", "--by", "[[Kira]]"], other);
            expect((await runCommandLine(["change", "Kira", "health", "--by=-2"], other)).output).not.toContain("keeps");
        } finally {
            removeFolder(free);
        }
    });
});

describe("the effects at a turn and at a rest (EFF-15)", () => {
    it("names the effects on who ends the turn and on who starts the next, with who keeps them, and nothing where none are", async () => {
        await fight();
        await ok("effect", "add", "Bog Hound 1", "In fiamme");
        await ok("effect", "add", "Corrado", "Eroismo", "--for", "10 rounds", "--by", "[[Viola]]");
        expect(await ok("scene", "next")).toBe(
            `Round 1 · now Bog Hound 1 (then Viola).\nEnd of Corrado's turn: Eroismo (by Viola). Start of Bog Hound 1's turn: In fiamme. Read in their text what acts now. ${quietTurn}`,
        );
        expect(await ok("scene", "next")).toBe(
            `Round 1 · now Viola (then Malco).\nEnd of Bog Hound 1's turn: In fiamme. Read in their text what acts now. ${quietTurn}`,
        );
        expect(await ok("scene", "next")).toBe(`Round 1 · now Malco (then Corrado).\n${quietTurn}`);
    });

    it("names at a rest the effects without an end on who rests", async () => {
        await ok("effect", "add", "Corrado", "Febbre delle fogne");
        await ok("effect", "add", "Viola", "Benedetta", "--for", "1h");
        const rested = await ok("change", "--recipe", "breather");
        expect(rested).toContain("Corrado: nothing changed. Still on Corrado, with no end: Febbre delle fogne. Read in their text whether a rest asks for something.");
        expect(rested).toContain("Viola: nothing changed.\n");
    });
});

describe("what shields a counter (DAT-14), and the counters only change changes (CNT-7, CNT-8)", () => {
    it("starts temporary hit points at 0 with change, refuses to rewrite them with write, and says they go first when hit points go down", async () => {
        expect(await ok("change", "Corrado", "ward", "--to", "3")).toBe('Corrado: ward 0 → 3.\nward is no longer at 0: read rules "Wards".');
        expect((await rpg("write", "Corrado", "--set", "ward=5")).output).toContain('ward is a counter: use change, page "Corrado", field ward, to 5');
        expect(await ok("change", "Corrado", "grit", "--by=-7")).toBe(
            "Corrado: grit 24/24 → 17/24.\nCorrado has ward 3, which goes first: if this was damage, ward takes 3 of it: change ward by -3 and grit by +3. Read rules Wards.",
        );
        // What hit points lost past 0 is no hit point to give back: at 5 with 10 temporary, 20 leaves 0 (review of 17 October).
        await ok("change", "Corrado", "grit", "--to", "5");
        await ok("change", "Corrado", "ward", "--to", "10");
        expect(await ok("change", "Corrado", "grit", "--by=-20")).toContain("ward takes 10 of it: change ward by -10; grit stays as it is.");
        await ok("change", "Corrado", "grit", "--to", "17");
        await ok("change", "Corrado", "ward", "--to", "0");
        expect(await ok("change", "Corrado", "grit", "--by=-1")).toBe("Corrado: grit 17/24 → 16/24.");
    });

    it("says what breaks a kept effect when the damage goes to the shield first", async () => {
        await ok("effect", "add", "Viola", "Eroismo", "--for", "1m", "--by", "[[Corrado]]");
        await ok("change", "Corrado", "ward", "--to", "3");
        expect(await ok("change", "Corrado", "ward", "--by=-3")).toContain("Corrado keeps Eroismo (Viola): lost 3 ward. Read rules Holding.");
    });

    it("starts a counter at 0 only on a character, a quest or a copy that no page derives from, and lets write change a stat block's hit points", async () => {
        expect((await rpg("change", "Sala", "xp", "--by", "100")).output).toContain('Sala has no field "xp"');
        await ok("write", "Bog Hound nero", "--type", "creature", "--set", "creature=[[Bog Hound]]");
        expect((await rpg("change", "Bog Hound", "ward", "--to", "5")).exitCode).toBe(1);
        expect((await rpg("change", "Bog Hound nero", "ward", "--to", "5")).exitCode).toBe(1);
        await ok("write", "Fuoco", "--type", "creature", "--set", "grit=30", "--set", "guard=13");
        expect(await ok("write", "Fuoco", "--set", "grit=35")).toContain("grit");
    });

    it("never starts at 0 a counter the system gives a maximum, as a copy's hit points", async () => {
        await ok("write", "Fuoco", "--type", "creature", "--set", "guard=19");
        await ok("scene", "open", "--title", "Palude", "--type", "combat", "--creatures", "Fuoco=1");
        expect((await rpg("change", "Fuoco 1", "grit", "--by=-1")).output).toContain('Fuoco 1 has no field "grit"');
    });
});

describe("the open scene's log (SCN-10) and its part (MOD-5)", () => {
    it("gives what happened in the open fight round by round, with every why, who left with their numbers, and that positions are not kept", async () => {
        await fight();
        await ok("roll", "1d20+4", "--who", "Corrado", "--why", "mazza contro il cane");
        await ok("change", "Bog Hound 1", "grit", "--by=-6", "--why", "mazza di Corrado");
        await ok("scene", "next");
        await ok("effect", "add", "Corrado", "Pinned", "--for", "1m", "--why", "denti del cane");
        await ok("scene", "leave", "--who", "Bog Hound 1");
        const log = await ok("show", "Il rito");
        expect(log).toMatch(/^Il rito \(combat, open\) at Sala: what happened since it opened, from the log\.\n/);
        expect(log).toContain("- order: Corrado · Bog Hound 1 · Viola · Malco\nRound 1:\n- Corrado: mazza contro il cane: ");
        expect(log).toContain("- Bog Hound 1: grit 9/9 → 3/9 (mazza di Corrado)\n- Corrado: Pinned until round 7, Bog Hound 1 (denti del cane)\n- left: Bog Hound 1 (grit 3/9)");
        expect(log).toMatch(/Where each one stands is not kept: leave it out of a recap, and ask the player only when it matters to their next move\.$/);
        expect(await ok("status")).toContain(". show Il rito for what happened so far");
    });

    it("puts what follows a leave in the round the turn moved to, and leaves out lines written by hand without what they need", async () => {
        await ok("scene", "open", "--title", "Rito", "--type", "combat", "--with", "Corrado", "--with", "Viola", "--creatures", "Bog Hound=1");
        await ok("scene", "order", "--order", "Corrado", "--order", "Viola", "--order", "Bog Hound 1");
        await ok("scene", "next");
        await ok("scene", "next");
        await ok("scene", "leave", "--who", "Bog Hound 1");
        await ok("roll", "1d20+5", "--who", "Corrado", "--why", "attacco nel round 2");
        appendFileSync(join(folder, "log.jsonl"), '{"id":"x","at":"2026-10-09T00:00:00Z","type":"roll","by":"master","visibility":"hidden","data":{}}\n');
        const log = await ok("show", "Rito");
        expect(log).toContain("- left: Bog Hound 1\nRound 2:\n- Corrado: attacco nel round 2: ");
        expect(log).not.toContain("undefined");
    });

    it("gives with the instructions the part of the open scene's type, which a chat that starts in a fight would not get", async () => {
        expect(await ok("instructions")).not.toContain("Tell the turns in order");
        await fight();
        expect(await ok("instructions")).toContain("Tell the turns in order");
    });
});
