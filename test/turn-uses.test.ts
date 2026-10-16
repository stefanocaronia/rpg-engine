// What one does in a turn (D-453; TRN-1–TRN-4): the action, the bonus action, the reaction, the attacks of an action and Sneak Attack, counted by the engine.
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { runCommandLine } from "../src/command-line.ts";
import type { Context } from "../src/core/context.ts";
import { inPlay, makeTempFolder, removeFolder, testContext } from "./support.ts";

let folder: string;
let context: Context;

beforeEach(async () => {
    folder = makeTempFolder();
    context = testContext(folder);
    await ok("init", "--name", "Guadoscuro", "--language", "it", "--system", "5e", "--difficulty", "normal", "--lethality", "dice");
    inPlay(folder);
    await ok("write", "Ettore", "--type", "character", "--set", "role=pc", "--set", "classes=[[Fighter]] 5", "--set", "hp-base=44");
    await ok("write", "Vespa", "--type", "character", "--set", "role=companion", "--set", "classes=[[Rogue]] 1", "--set", "hp-base=8");
    await ok("scene", "open", "--title", "Cripta", "--type", "combat", "--with", "Ettore", "--with", "Vespa", "--creatures", "Skeleton=1");
    await ok("scene", "order", "--order", "Ettore", "--order", "Vespa", "--order", "Skeleton 1");
});

afterEach(() => removeFolder(folder));

describe("the uses of a turn", () => {
    it("counts the attacks within the action, as many as the sheet gives, and one more action only by what gives it (TRN-1, TRN-3)", async () => {
        expect(await ok("show", "Ettore")).toContain("extra-attacks 1");
        expect(await use("Ettore", "attack")).toBe("Ettore: attack 1 of 2, its action used.");
        expect(await use("Ettore", "attack")).toBe("Ettore: attack 2 of 2.");
        expect(await refused("Ettore", "attack")).toBe(
            "Ettore has used its action until its next turn, with 2 attack of 2: an attack that another use makes, as with a bonus action or a reaction, is marked as that use; "
                + 'add by and what only for what gives one more, as by "Action Surge". Nothing changed.',
        );
        expect(await use("Ettore", "attack", "Action Surge")).toBe("Ettore: attack 1 of 2, its action used, by Action Surge.");
        expect(await use("Ettore", "bonus action")).toBe("Ettore: bonus action used.");
        expect(await refused("Ettore", "bonus action")).toContain("Ettore has used its bonus action until its next turn");
    });

    it("keeps the action to one's own turn, the reaction to any, until one's turn comes again, and Sneak Attack once a turn (TRN-2, TRN-4)", async () => {
        expect(await refused("Vespa", "action")).toBe("It is Ettore's turn, not Vespa's: action goes in its own turn; what one does in another's turn, as a readied action, takes reaction: mark that. Nothing changed.");
        expect(await use("Vespa", "reaction")).toBe("Vespa: reaction used.");
        expect(await use("Vespa", "sneak attack")).toBe("Vespa: sneak attack used.");
        expect(await refused("Vespa", "sneak attack")).toContain("Vespa has used its sneak attack until its next turn");
        expect(await refused("Ettore", "sneak attack")).toBe("Ettore has no sneak attack: it comes from what the sheet has, as a feature. Nothing changed.");
        await use("Ettore", "reaction");
        await ok("scene", "next");
        // Vespa's turn: her reaction and Sneak Attack are back; Ettore's reaction waits for his turn.
        expect(await use("Vespa", "reaction")).toBe("Vespa: reaction used.");
        expect(await use("Vespa", "sneak attack")).toBe("Vespa: sneak attack used.");
        expect(await refused("Ettore", "reaction")).toContain("Ettore has used its reaction until its next turn");
    });

    it("gives the dashboard what who acts has used of the turn (TRN-4)", async () => {
        await use("Ettore", "attack");
        const marks = async (): Promise<unknown> => (JSON.parse(await ok("view", "--json")) as { openScene?: { marks?: unknown; }; }).openScene?.marks;
        expect(await marks()).toEqual([{ use: "action", used: true }, { use: "bonus action", used: false }, { use: "reaction", used: false }]);
        await ok("scene", "next");
        expect(await marks()).toEqual([{ use: "action", used: false }, { use: "bonus action", used: false }, { use: "reaction", used: false }]);
    });

    it("asks for the order first, follows a rename, and counts Thirsting Blade as Extra Attack (TRN-1, TRN-3)", async () => {
        await ok("scene", "close", "--summary", "Fine.");
        await ok("scene", "open", "--title", "Altra", "--type", "combat", "--with", "Ettore");
        expect((await runCommandLine(["scene", "use", "--who", "Ettore", "--uses", "reaction"], context)).output).toBe(
            "The scene has no order of turns, so no turn to use: set it with scene order first, after rolling for it if the game does.",
        );
        await ok("scene", "order", "--order", "Ettore");
        await use("Ettore", "attack");
        await ok("rename", "Ettore", "Ruggero");
        expect(await use("Ruggero", "attack")).toBe("Ruggero: attack 2 of 2.");
        expect(await refused("Ruggero", "attack")).toContain("Ruggero has used its action");
        await ok("write", "Corvo", "--type", "character", "--set", "role=companion", "--set", "classes=[[Warlock]] 5", "--set", "hp-base=30", "--add", "invocations=Thirsting Blade");
        expect(await ok("show", "Corvo")).toContain("extra-attacks 1");
    });

    it("leaves unlimited the attacks a sheet does not work out, as a creature's, and refuses what the game does not name (TRN-1)", async () => {
        await ok("scene", "next");
        await ok("scene", "next");
        expect(await use("Skeleton 1", "attack")).toBe("Skeleton 1: attack 1, its action used.");
        expect(await use("Skeleton 1", "attack")).toBe("Skeleton 1: attack 2.");
        expect(await refused("Skeleton 1", "dance")).toBe("dance is no use of a turn in 5e: give one of action, bonus action, reaction, attack, sneak attack. Nothing changed.");
        expect((await runCommandLine(["scene", "use", "--who", "Lena", "--uses", "action"], context)).output).toBe(
            "Lena is not in the scene Cripta: bring them in with scene add, or give one of Ettore, Vespa, Skeleton 1.",
        );
    });
});

async function use(who: string, uses: string, by?: string): Promise<string>
{
    return ok("scene", "use", "--who", who, "--uses", uses, ...(by === undefined ? [] : ["--by", by]));
}

async function refused(who: string, uses: string): Promise<string>
{
    const result = await runCommandLine(["scene", "use", "--who", who, "--uses", uses], context);
    expect(result.exitCode).toBe(1);
    return result.output;
}

async function ok(...args: string[]): Promise<string>
{
    const result = await runCommandLine(args, context);
    expect(result.exitCode, result.output).toBe(0);
    return result.output;
}
