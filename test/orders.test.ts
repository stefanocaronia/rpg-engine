// The player's standing orders to the companions (D-38, D-563): kept by config as a list, lifted only by the player; status and the opening of a scene with a
// companion put them before the master, and view as before whoever voices a companion. The engine keeps them; it never applies them.
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { lastChoices } from "../src/campaign/index.ts";
import { runCommandLine } from "../src/cli/command-line.ts";
import { playerSettings, setupQuestions } from "../src/commands/config/dashboard.ts";
import type { Context } from "../src/core/context.ts";
import { inPlay, makeTempFolder, readLogFile, removeFolder, testContext } from "./support.ts";

let folder: string;
let home: string;
let context: Context;

async function ok(...args: string[]): Promise<string>
{
    const result = await runCommandLine(args, context);
    expect(result.exitCode, result.output).toBe(0);
    return result.output;
}

async function refused(...args: string[]): Promise<string>
{
    const result = await runCommandLine(args, context);
    expect(result.exitCode, result.output).not.toBe(0);
    return result.output;
}

const alive = "Lasciatene sempre uno vivo";
const children = "Mai toccare i bambini";

beforeEach(async () => {
    folder = makeTempFolder();
    home = makeTempFolder();
    context = { ...testContext(folder), home };
    await ok("init", "--name", "Prova", "--language", "it", "--system", "fake", "--difficulty", "normal", "--lethality", "dice");
});

afterEach(() => [folder, home].forEach(removeFolder));

describe("config orders (D-563 (1))", () => {
    it("adds an order in the player's words, with what it means to the master, and logs it; remove lifts it; none answers an empty list", async () => {
        const added = await ok("config", "orders", "--add", ` ${alive} `);
        expect(added).toContain(`orders: ${alive}
`);
        expect(added).toContain("Kept until the player lifts it; the lines and veils still come first. An order for this scene only stays in the scene; when unsure, ask in one bracket.");
        expect(readLogFile(folder).at(-1)).toMatchObject({ type: "config-changed", data: { setting: "orders", add: [` ${alive} `] } });
        await ok("config", "orders", "--add", children);
        expect(await refused("config", "orders", "none")).toContain(`"orders" holds ${alive}; ${children}: remove each one with remove`);
        const removed = await ok("config", "orders", "--remove", "lasciatene sempre uno vivo");
        expect(removed).toContain(`orders: ${children}
`);
        expect(removed).not.toContain("Kept until the player lifts it");
        await ok("config", "orders", "--remove", children);
        expect(await ok("config", "orders", "none")).toContain("orders: (none)");
    });

    it("takes at most 6 orders of 120 characters, refusing with how to make room or shorten it", async () => {
        expect(await refused("config", "orders", "--add", "a".repeat(121))).toContain(
            '"orders" takes items of at most 120 characters, and this one has 121: ask the player for a shorter one. Nothing changed.',
        );
        await ok("config", "orders", "--add", "a".repeat(120));

        for (const index of [2, 3, 4, 5, 6]) {
            await ok("config", "orders", "--add", `Ordine ${index}`);
        }

        expect(await refused("config", "orders", "--add", "Ordine 7")).toContain('"orders" holds at most 6 items, and has 6: remove one the player lifted first, or ask which to drop. Nothing changed.');
        // Removing and adding at once stays within it.
        await ok("config", "orders", "--remove", "Ordine 6", "--add", "Ordine 7");
        // Characters as a reader counts them.
        await ok("config", "orders", "--remove", "Ordine 7", "--add", "🐺".repeat(120));
    });

    it("is never asked by the setup, never missing in play, and never among the last choices a next campaign suggests (T-134)", async () => {
        await ok("config", "orders", "--add", alive);
        expect(lastChoices(home)).not.toHaveProperty("orders");
        expect(setupQuestions(folder, context, false).map((question) => question.name)).not.toContain("orders");
        expect(await ok("config")).not.toMatch(/orders: \(missing/);
        inPlay(folder);
        await ok("config", "orders", "--remove", alive);
        expect(await ok("status")).not.toContain("orders");
    });
});

describe("the orders before the master (D-563 (2))", () => {
    beforeEach(async () => {
        await ok("write", "Kira", "--type", "character", "--set", "role=pc");
        await ok("write", "Bran", "--type", "character", "--set", "role=companion");
        await ok("write", "Varro", "--type", "character", "--set", "role=npc");
        await ok("write", "Guado", "--type", "place", "--add", "contains=[[Kira]]", "--add", "contains=[[Bran]]", "--add", "contains=[[Varro]]");
    });

    const statusLine = `Standing orders, the player's to the companions (they follow them as their pages allow, and break one only in the open): "${alive}"; "${children}".`;

    it("status gives them in play, right after the companions, only when there are some", async () => {
        await ok("config", "orders", "--add", alive, "--add", children);
        // Before play, nothing: the setup has its own checklist.
        expect(await ok("status")).not.toContain("Standing orders");
        inPlay(folder);
        const lines = (await ok("status")).split("\n");
        const at = lines.indexOf(statusLine);
        expect(at).toBeGreaterThan(0);
        expect(lines[at - 1]).toMatch(/^Companions: Bran/);
        await ok("config", "orders", "--remove", alive, "--remove", children);
        expect(await ok("status")).not.toContain("Standing orders");
    });

    it("the opening of a scene with a companion says them; one without a companion, or with no orders, does not; adding a companion says them", async () => {
        inPlay(folder);
        const note = `Standing orders to the companions: "${alive}".`;
        expect(await ok("scene", "open", "--title", "Al guado", "--type", "social", "--with", "Kira", "--with", "Bran")).not.toContain("Standing orders");
        await ok("scene", "close", "--summary", "Niente.");
        await ok("config", "orders", "--add", alive);
        expect(await ok("scene", "open", "--title", "Agguato", "--type", "combat", "--with", "Kira", "--with", "Bran")).toContain(note);
        await ok("scene", "close", "--summary", "Niente.");
        expect(await ok("scene", "open", "--title", "Da solo", "--type", "social", "--with", "Kira", "--with", "Varro")).not.toContain("Standing orders");
        expect(await ok("scene", "add", "--with", "Bran")).toContain(note);
    });

    it("view as gives them to a companion, last, and to a player character played while its player is away; never to anyone else", async () => {
        inPlay(folder);
        await ok("config", "orders", "--add", alive, "--add", children);
        const said = `Your party's standing orders: "${alive}"; "${children}". Keep them; if your character would balk, say so in the open rather than break one silently.`;
        const bran = await ok("view", "--as", "Bran");
        expect(bran.endsWith(said)).toBe(true);
        expect(JSON.parse(await ok("view", "--as", "Bran", "--json"))).toMatchObject({ kind: "memory", orders: [alive, children] });
        expect(await ok("view", "--as", "Varro")).not.toContain("standing orders");
        expect(JSON.parse(await ok("view", "--as", "Varro", "--json"))).not.toHaveProperty("orders");
        // A lone player character's player is never away: the orders are theirs to give.
        expect(await ok("view", "--as", "Kira")).not.toContain("standing orders");
        await ok("write", "Ettore", "--type", "character", "--set", "role=pc");
        await ok("write", "Guado", "--add", "contains=[[Ettore]]");
        expect(await ok("view", "--as", "Kira")).toContain(said);
        // With none, nothing.
        await ok("config", "orders", "--remove", alive, "--remove", children);
        expect(await ok("view", "--as", "Bran")).not.toContain("standing orders");
    });
});

describe("the orders on the dashboard (D-563 (1))", () => {
    it("are among the player's settings, with their items, even before the first", async () => {
        const orders = () => playerSettings(folder, context).find((setting) => setting.name === "orders");
        expect(orders()).toMatchObject({ items: [], most: 120 });
        await ok("config", "orders", "--add", alive);
        expect(orders()).toMatchObject({ about: "the orders you give your companions, kept until you lift one", items: [alive], most: 120 });
    });
});
