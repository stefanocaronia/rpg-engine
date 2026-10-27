// What one does in a turn (D-453; TRN-1–TRN-5), on the fake system: the move, the deed, the parry in any turn, the strikes within the deed and a flourish once
// a turn, counted by the engine. The 5e's legendary creatures and Thirsting Blade are in the 5e's repository.
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { runCommandLine } from "../src/command-line.ts";
import type { Context } from "../src/core/context.ts";
import { inPlay, makeTempFolder, removeFolder, testContext } from "./support.ts";

let folder: string;
let context: Context;

beforeEach(async () => {
    folder = makeTempFolder();
    context = testContext(folder);
    await ok("init", "--name", "Guadoscuro", "--language", "it", "--system", "fake", "--difficulty", "normal", "--lethality", "dice");
    inPlay(folder);
    // A Scout of rank 2, with a second deed and one more strike; a Warden, whose Steady Hand gives a flourish.
    await ok("write", "Ettore", "--type", "character", "--set", "role=pc", "--set", "vocations=[[Scout]] 2", "--set", "extra-strikes=1");
    await ok("write", "Vespa", "--type", "character", "--set", "role=companion", "--set", "vocations=[[Warden]] 1");
    await ok("scene", "open", "--title", "Cripta", "--type", "combat", "--with", "Ettore", "--with", "Vespa", "--creatures", "Bog Hound=1");
    await ok("scene", "order", "--order", "Ettore", "--order", "Vespa", "--order", "Bog Hound 1");
});

afterEach(() => removeFolder(folder));

describe("the uses of a turn", () => {
    it("counts the strikes within the deed, as many as the sheet gives, and one more deed only by what gives it (TRN-1, TRN-3, TRN-5)", async () => {
        expect(await use("Ettore", "strike")).toBe("Ettore: strike 1 of 2, its deed used.");
        expect(await use("Ettore", "strike")).toBe("Ettore: strike 2 of 2.");
        expect(await refused("Ettore", "strike")).toBe(
            "Ettore has used its deed until its next turn, with 2 strike of 2: what another use makes, as with move or parry, is marked as that use; "
                + "add by and what only for what gives one more, as a feature by its name. Nothing changed.",
        );
        // The second deed is the Scout's counter: spent with it, and refused once it is gone (TRN-5).
        expect(await use("Ettore", "strike", "Second Deed")).toBe("Ettore: strike 1 of 2, its deed used, by Second Deed; second-deed 1 → 0.");
        expect(await ok("show", "Ettore")).toContain("second-deed 0/1");
        await use("Ettore", "strike");
        expect((await runCommandLine(["scene", "use", "--who", "Ettore", "--uses", "strike", "--by", "Second Deed"], context)).output).toBe(
            "Ettore has second-deed 0: Second Deed gives nothing more until it comes back. Nothing changed.",
        );
        // A use's note, said as it is marked.
        expect(await use("Ettore", "parry")).toBe("Ettore: parry used. A parry spends the next deed.");
        expect(await refused("Ettore", "parry")).toContain("Ettore has used its parry until its next turn");
        // A note only when what it reads holds, as the charms one has bound: Vespa's move, below, has none.
        await ok("write", "Ettore", "--add", "bound=[[Iron Ring]]");
        expect(await use("Ettore", "move")).toBe("Ettore: move used. Bound charms rattle: a move is heard.");
    });

    it("keeps the deed to one's own turn, the parry to any, until one's turn comes again, and a flourish once a turn (TRN-2, TRN-4)", async () => {
        expect(await refused("Vespa", "deed")).toBe("It is Ettore's turn, not Vespa's: deed goes in its own turn; what one does in another's turn takes parry: mark that. Nothing changed.");
        expect(await use("Vespa", "parry")).toBe("Vespa: parry used. A parry spends the next deed.");
        expect(await use("Vespa", "flourish")).toBe("Vespa: flourish used.");
        expect(await refused("Vespa", "flourish")).toContain("Vespa has used its flourish until its next turn");
        expect(await refused("Ettore", "flourish")).toBe("Ettore has no flourish: it comes from what the sheet has, as a feature. Nothing changed.");
        await use("Ettore", "parry");
        await ok("scene", "next");
        // Vespa's turn: her parry and flourish are back; Ettore's parry waits for his turn.
        expect(await use("Vespa", "parry")).toBe("Vespa: parry used. A parry spends the next deed.");
        expect(await use("Vespa", "flourish")).toBe("Vespa: flourish used.");
        expect(await refused("Ettore", "parry")).toContain("Ettore has used its parry until its next turn");
        expect(await use("Vespa", "move")).toBe("Vespa: move used.");
    });

    it("gives the dashboard what who acts has used of the turn (TRN-4)", async () => {
        await use("Ettore", "strike");
        const marks = async (): Promise<unknown> => (JSON.parse(await ok("view", "--json")) as { openScene?: { marks?: unknown; }; }).openScene?.marks;
        expect(await marks()).toEqual([{ use: "move", used: false }, { use: "deed", used: true }, { use: "parry", used: false }]);
        await ok("scene", "next");
        expect(await marks()).toEqual([{ use: "move", used: false }, { use: "deed", used: false }, { use: "parry", used: false }]);
        // A foe's are the master's to tell (D-453).
        await ok("scene", "next");
        expect(await marks()).toBeUndefined();
    });

    it("asks for the order first and follows a rename (TRN-1, TRN-3)", async () => {
        await ok("scene", "close", "--summary", "Fine.");
        await ok("scene", "open", "--title", "Altra", "--type", "combat", "--with", "Ettore");
        expect((await runCommandLine(["scene", "use", "--who", "Ettore", "--uses", "parry"], context)).output).toBe(
            "The scene has no order of turns, so no turn to use: set it with scene order first, after rolling for it if the game does.",
        );
        await ok("scene", "order", "--order", "Ettore");
        await use("Ettore", "strike");
        await ok("rename", "Ettore", "Ruggero");
        expect(await use("Ruggero", "strike")).toBe("Ruggero: strike 2 of 2.");
        expect(await refused("Ruggero", "strike")).toContain("Ruggero has used its deed");
    });

    it("leaves unlimited the strikes a sheet does not work out, as a creature's, and refuses what the game does not name (TRN-1)", async () => {
        await ok("scene", "next");
        await ok("scene", "next");
        expect(await use("Bog Hound 1", "strike")).toBe("Bog Hound 1: strike 1, its deed used.");
        expect(await use("Bog Hound 1", "strike")).toBe("Bog Hound 1: strike 2.");
        expect(await refused("Bog Hound 1", "dance")).toBe("dance is no use of a turn in fake: give one of move, deed, strike, parry, flourish. Nothing changed.");
        expect((await runCommandLine(["scene", "use", "--who", "Lena", "--uses", "deed"], context)).output).toBe(
            "Lena is not in the scene Cripta: bring them in with scene add, or give one of Ettore, Vespa, Bog Hound 1.",
        );
    });
});

describe("what the turn's reminder names (playtests 05 and 05b)", () => {
    it("names the uses that stand alone, leaving the strikes and the flourish the master's to mark; marking the deed tells to mark the strikes", async () => {
        expect(await ok("scene", "next")).not.toContain("Mark with scene use what Vespa");
        await ok("scene", "next");
        expect(await ok("scene", "next")).toContain("Mark with scene use what Ettore uses of the turn, as it happens: move, deed, parry.");
        expect(await use("Ettore", "deed")).toBe("Ettore: deed used. If it is to attack, mark each strike instead, 2 for Ettore, which takes the deed.");
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
