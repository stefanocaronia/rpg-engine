// What a fight asks the master to keep by hand, said when it happens (D-266): what breaks what someone keeps alive (EFF-14), the effects at a turn and at a rest
// (EFF-15), the counter that shields another (DAT-14), the open scene's log (SCN-10), the part of the open scene (MOD-5), the counters only change changes (CNT-7, CNT-8).
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { runCommandLine } from "../src/command-line.ts";
import type { Context } from "../src/core/context.ts";
import { inPlay, makeTempFolder, removeFolder, testContext } from "./support.ts";

let folder: string;
let context: Context;

beforeEach(async () => {
    folder = makeTempFolder();
    context = testContext(folder);
    await runCommandLine(["init", "--name", "Cripta", "--language", "it", "--system", "5e", "--difficulty", "normal", "--lethality", "dice"], context);
    inPlay(folder);
    await ok("write", "Sala", "--type", "place", "--set", "contains=[[Corrado]], [[Viola]], [[Malco]]");
    await ok("write", "Corrado", "--type", "character", "--set", "role=pc", "--set", "hp=24/24", "--set", "ac=18");
    await ok("write", "Viola", "--type", "character", "--set", "role=companion", "--set", "hp=24/24", "--set", "ac=13");
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
    await ok("scene", "open", "--title", "Il rito", "--type", "combat", "--with", "Corrado", "--with", "Viola", "--with", "Malco", "--creatures", "Ghoul=1");
    await ok("scene", "order", "--order", "Corrado", "--order", "Ghoul 1", "--order", "Viola", "--order", "Malco");
}

describe("what breaks what someone keeps alive (EFF-14)", () => {
    it("says it when the keeper loses hit points, on a page or a copy, with the whole damage and the rule to read", async () => {
        await fight();
        await ok("effect", "add", "Corrado", "Eroismo", "--for", "10 rounds", "--by", "[[Viola]]");
        expect(await ok("change", "Viola", "hp", "--by=-7", "--why", "artigli")).toBe("Viola: hp 24/24 → 17/24.\nViola keeps Eroismo (Corrado): lost 7 hp. Read rules Concentration.");
        await ok("effect", "add", "Ghoul 1", "Scudo della fede", "--for", "10m", "--by", "Ghoul 1");
        expect(await ok("change", "Ghoul 1", "hp", "--by=-30")).toContain("Ghoul 1 keeps Scudo della fede (Ghoul 1): lost 30 hp. Read rules Concentration.");
        // Healing breaks nothing, nor a loss of another counter.
        expect(await ok("change", "Viola", "hp", "--by", "3")).not.toContain("keeps");
        await ok("write", "Viola", "--set", "frecce=10");
        expect(await ok("change", "Viola", "frecce", "--by=-1")).not.toContain("keeps");
    });

    it("says it when the keeper takes a condition that breaks it, and when they are given one more to keep, but not the same on another target", async () => {
        await ok("effect", "add", "Corrado", "Benedizione", "--for", "1m", "--by", "[[Corrado]]");
        expect(await ok("effect", "add", "Viola", "Benedizione", "--for", "1m", "--by", "[[Corrado]]")).toBe("Viola: Benedizione until day 1, 23:01.");
        expect(await ok("effect", "add", "Viola", "Scudo della fede", "--for", "10m", "--by", "[[Corrado]]")).toBe(
            "Viola: Scudo della fede until day 1, 23:10. Corrado already keeps Benedizione (Corrado, Viola). Read rules Concentration.",
        );
        expect(await ok("effect", "add", "Corrado", "Paralyzed", "--for", "1m")).toContain(
            "Corrado: Paralyzed until day 1, 23:01. Corrado keeps Benedizione (Corrado, Viola) · Scudo della fede (Viola): now Paralyzed. Read rules Concentration.",
        );
        expect(await ok("effect", "add", "Viola", "Frightened", "--for", "1m")).not.toContain("keeps");
    });

    it("says nothing in a game system without it", async () => {
        const iron = makeTempFolder();
        const other = testContext(iron);

        try {
            await runCommandLine(["init", "--name", "Ferro", "--system", "ironsworn"], other);
            inPlay(iron);
            await runCommandLine(["write", "Kira", "--type", "character", "--set", "role=pc", "--set", "health=5/5"], other);
            await runCommandLine(["effect", "add", "Kira", "Vigilanza", "--by", "[[Kira]]"], other);
            expect((await runCommandLine(["change", "Kira", "health", "--by=-2"], other)).output).not.toContain("keeps");
        } finally {
            removeFolder(iron);
        }
    });
});

describe("the effects at a turn and at a rest (EFF-15)", () => {
    it("names the effects on who ends the turn and on who starts the next, with who keeps them, and nothing where none are", async () => {
        await fight();
        await ok("effect", "add", "Ghoul 1", "In fiamme");
        await ok("effect", "add", "Corrado", "Eroismo", "--for", "10 rounds", "--by", "[[Viola]]");
        expect(await ok("scene", "next")).toBe(
            "Round 1 · now Ghoul 1 (then Viola).\nEnd of Corrado's turn: Eroismo (by Viola). Start of Ghoul 1's turn: In fiamme. Read in their text what acts now.",
        );
        expect(await ok("scene", "next")).toBe("Round 1 · now Viola (then Malco).\nEnd of Ghoul 1's turn: In fiamme. Read in their text what acts now.");
        expect(await ok("scene", "next")).toBe("Round 1 · now Malco (then Corrado).");
    });

    it("names at a rest the effects without an end on who rests", async () => {
        await ok("effect", "add", "Corrado", "Febbre delle fogne");
        await ok("effect", "add", "Viola", "Benedetta", "--for", "1h");
        const rested = await ok("change", "--recipe", "short rest");
        expect(rested).toContain("Corrado: nothing changed. Still on Corrado, with no end: Febbre delle fogne. Read in their text whether a rest asks for something.");
        expect(rested).toContain("Viola: nothing changed.\n");
    });
});

describe("what shields a counter (DAT-14), and the counters only change changes (CNT-7, CNT-8)", () => {
    it("starts temporary hit points at 0 with change, refuses to rewrite them with write, and says they go first when hit points go down", async () => {
        expect(await ok("change", "Corrado", "temp-hp", "--to", "3")).toMatch(/^Corrado: temp-hp 0 → 3\.\n\ntemp-hp changed: Temporary Hit Points, from the rules of 5e:\n/);
        expect((await rpg("write", "Corrado", "--set", "temp-hp=5")).output).toContain('temp-hp is a counter: use change, page "Corrado", field temp-hp, to 5');
        expect(await ok("change", "Corrado", "hp", "--by=-7")).toBe(
            "Corrado: hp 24/24 → 17/24.\nCorrado has temp-hp 3, which goes first: if this was damage, give hp back what temp-hp takes and take it from temp-hp, with change. "
                + "Read rules Temporary Hit Points.",
        );
        await ok("change", "Corrado", "temp-hp", "--to", "0");
        expect(await ok("change", "Corrado", "hp", "--by=-1")).toBe("Corrado: hp 17/24 → 16/24.");
    });

    it("never starts at 0 a counter the system gives a maximum, as a copy's hit points", async () => {
        await ok("write", "Fuoco", "--type", "creature", "--set", "ac=19");
        await ok("scene", "open", "--title", "Palude", "--type", "combat", "--creatures", "Fuoco=1");
        expect((await rpg("change", "Fuoco 1", "hp", "--by=-1")).output).toContain('Fuoco 1 has no field "hp"');
    });
});

describe("the open scene's log (SCN-10) and its part (MOD-5)", () => {
    it("gives what happened in the open fight round by round, with every why, who left with their numbers, and that positions are not kept", async () => {
        await fight();
        await ok("roll", "1d20+4", "--who", "Corrado", "--why", "mazza contro il ghoul");
        await ok("change", "Ghoul 1", "hp", "--by=-6", "--why", "mazza di Corrado");
        await ok("scene", "next");
        await ok("effect", "add", "Corrado", "Paralyzed", "--for", "1m", "--why", "artigli del ghoul");
        await ok("scene", "leave", "--who", "Ghoul 1");
        const log = await ok("show", "Il rito");
        expect(log).toMatch(/^Il rito \(combat, open\) at Sala: what happened since it opened, from the log\.\n/);
        expect(log).toContain("- order: Corrado · Ghoul 1 · Viola · Malco\nRound 1:\n- Corrado: mazza contro il ghoul: ");
        expect(log).toContain("- Ghoul 1: hp 22/22 → 16/22 (mazza di Corrado)\n- Corrado: Paralyzed until round 11, Ghoul 1 (artigli del ghoul)\n- left: Ghoul 1 (hp 16/22)");
        expect(log).toMatch(/Where each one stands is not kept: leave it out of a recap, and ask the player only when it matters to their next move\.$/);
        expect(await ok("status")).toContain(". show Il rito for what happened so far");
    });

    it("gives with the instructions the part of the open scene's type, which a chat that starts in a fight would not get", async () => {
        expect(await ok("instructions")).not.toContain("Tell the turns in order");
        await fight();
        expect(await ok("instructions")).toContain("Tell the turns in order");
    });
});
