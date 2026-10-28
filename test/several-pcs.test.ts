// More than one player character from the same computer (D-450, D-480, VIEW-12): the party is every player character and the companions, the view knows what any
// of them knows and says who, and one of them is in the foreground for the place, the map and the squares. A law on worlds made at random: the view knows a page
// if and only if one of the player characters does.
import fc from "fast-check";
import { readFileSync } from "node:fs";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { runCommandLine } from "../src/cli/command-line.ts";
import { knowledgeOf, knowsPage, playerKnowledge } from "../src/commands/game/knowledge.ts";
import { campaignWorld } from "../src/commands/game/world.ts";
import type { Context } from "../src/core/context.ts";
import { pageNamed } from "../src/pages/index.ts";
import { inPlay, makeTempFolder, removeFolder, testContext } from "./support.ts";

let folder: string;
let context: Context;

beforeEach(async () => {
    folder = makeTempFolder();
    context = testContext(folder);
    await ok("init", "--name", "Prova", "--language", "it", "--system", "fake", "--difficulty", "normal", "--lethality", "dice");
    inPlay(folder);
    await ok("advance", "--to", "day 1, 08:00");
    await ok("write", "Ettore", "--type", "character", "--set", "role=pc", "--set", "hp=12/12", "--text", "Un soldato.");
    await ok("write", "Bruna", "--type", "character", "--set", "role=pc", "--set", "hp=9/10", "--text", "Una ladra.");
    await ok("write", "Lena", "--type", "character", "--set", "role=companion");
    await ok("write", "Varro", "--type", "character", "--set", "role=npc", "--text", "Il mugnaio.");
    await ok("write", "Varro#Colpa", "--secret", "--text", "Ha ucciso il fratello.");
    await ok("write", "Locanda", "--type", "place", "--text", "Una locanda.", "--add", "contains=[[Ettore]]");
    await ok("write", "Torre", "--type", "place", "--text", "Una torre.", "--add", "contains=[[Bruna]]", "--add", "contains=[[Lena]]", "--add", "contains=[[Varro]]");
    await ok("write", "Lettera", "--type", "item", "--set", "document=letter", "--text", "Vieni da solo.");
    await ok("write", "Bruna", "--add", "inventory=[[Lettera]]");
});

afterEach(() => removeFolder(folder));

async function ok(...args: string[]): Promise<string>
{
    const result = await runCommandLine(args, context);
    expect(result.exitCode, result.output).toBe(0);
    return result.output;
}

async function json(...args: string[]): Promise<Record<string, unknown>>
{
    return JSON.parse(await ok(...args, "--json")) as Record<string, unknown>;
}

describe("the party of more than one player character (VIEW-12)", () => {
    it("gives every player character and the companions, each with their role and numbers, and one in the foreground", async () => {
        const view = await json("view");
        const party = view.party as { name: string; role: string; counters: { field: string; text: string; }[]; }[];
        // In the order of the pages, the living first; the first living in the foreground, when no scene says otherwise.
        expect(party.map((member) => [member.name, member.role])).toEqual([["Bruna", "pc"], ["Ettore", "pc"], ["Lena", "companion"]]);
        expect(party[0].counters.find((counter) => counter.field === "hp")?.text).toBe("9/10");
        expect(view.foreground).toBe("Bruna");
        expect((view.place as { name: string; }).name).toBe("Torre");
        // A lone player character's view says nothing of a foreground.
        await ok("write", "Bruna", "--set", "role=npc");
        expect((await json("view")).foreground).toBeUndefined();
    });

    it("puts in the foreground the one asked, whose turn it is, else one in the open scene; focus takes only a player character", async () => {
        await ok("scene", "open", "--title", "Alla locanda", "--type", "social", "--place", "Locanda", "--with", "Ettore");
        expect((await json("view")).foreground).toBe("Ettore");
        expect(((await json("view")).place as { name: string; }).name).toBe("Locanda");
        expect((await json("view", "--focus", "Bruna")).foreground).toBe("Bruna");
        await ok("scene", "close", "--summary", "Ettore beve.");
        await ok("move", "Ettore", "--to", "Torre");
        await ok("scene", "open", "--title", "Scontro", "--type", "combat", "--place", "Torre", "--with", "Bruna", "--with", "Ettore", "--with", "Varro");
        await ok("scene", "order", "--order", "Varro", "--order", "Ettore", "--order", "Bruna");
        // Varro first, then Ettore's turn, handed to him by name (D-480 (5)).
        expect(await ok("scene", "next")).toContain("now Ettore, a player character (then Bruna): stop here and hand Ettore the turn, by name, unless the player already said what Ettore does.");
        expect((await json("view")).foreground).toBe("Ettore");
        const wrong = await runCommandLine(["view", "--focus", "Varro"], context);
        expect(wrong.output).toContain("Varro is not a player character: give one of Bruna, Ettore.");
        expect((await runCommandLine(["view", "--focus", "Ettore", "--as", "Lena"], context)).output).toContain("Give as or focus, not both");
    });

    it("in a fight, each player character is of the party, with their numbers, never a stranger", async () => {
        await ok("move", "Ettore", "--to", "Torre");
        await ok("scene", "open", "--title", "Scontro", "--type", "combat", "--place", "Torre", "--with", "Ettore", "--with", "Bruna", "--with", "Varro");
        const scene = (await json("view")).openScene as { fighters?: { name: string; role: string; }[]; };
        const place = (await json("view")).place as { here: { name: string; role: string; }[]; };
        expect(place.here.filter((one) => one.role === "pc").map((one) => one.name).toSorted()).toEqual(["Bruna", "Ettore"]);
        expect((scene.fighters ?? []).filter((one) => one.role === "pc").map((one) => one.name).toSorted()).toEqual(["Bruna", "Ettore"]);
    });
});

describe("the commands that must know which player character (VIEW-12)", () => {
    it("travel and route without who or from refuse while the player characters are apart, with where each is; together, they go as one party", async () => {
        await ok("write", "Strada", "--type", "place", "--set", "stops=[[Locanda]], 2 km, [[Torre]]");
        const travel = await runCommandLine(["travel", "Locanda"], context);
        expect(travel.exitCode).not.toBe(0);
        expect(travel.output).toContain("The player characters are apart: Bruna, in Torre; Ettore, in Locanda. Give who, the characters who travel. Nothing changed.");
        expect((await runCommandLine(["route", "Locanda"], context)).output).toContain("Give from, the place to start from.");
        await ok("travel", "Torre", "--who", "Ettore");
        expect(await ok("route", "Locanda")).not.toContain("apart");
    });

    it("travel leaves out every player character who stays where the travellers start", async () => {
        await ok("move", "Ettore", "--to", "Torre");
        await ok("write", "Strada", "--type", "place", "--set", "stops=[[Locanda]], 2 km, [[Torre]]");
        expect(await ok("travel", "Locanda", "--who", "Lena")).toContain("Bruna and Ettore stay in Torre: who replaces the party");
    });

    it("scene open without with takes the party of its place, never the other player character's; without a place, it refuses while they are apart", async () => {
        expect(await ok("scene", "open", "--title", "Alla locanda", "--type", "social", "--place", "Locanda")).not.toContain("Moved into");
        expect((await json("view")).openScene).toMatchObject({ title: "Alla locanda" });
        expect(await ok("scene", "close", "--summary", "Ettore beve.")).toBeDefined();
        // With with and no place, the place of those named, while the player characters are apart.
        await ok("scene", "open", "--title", "Ettore beve", "--type", "social", "--with", "Ettore");
        expect((await json("view")).openScene).toMatchObject({ title: "Ettore beve" });
        await ok("scene", "close", "--summary", "Ettore beve ancora.");
        expect((await runCommandLine(["scene", "open", "--title", "Insieme", "--type", "social", "--with", "Ettore", "--with", "Bruna"], context)).output).toContain(
            "Ettore, in Locanda; Bruna, in Torre: a scene is in one place. Give place to bring the others there now, if they can be there at once;",
        );
        const apart = await runCommandLine(["scene", "open", "--title", "Dove?", "--type", "social"], context);
        expect(apart.output).toContain("The player characters are apart: Bruna, in Torre; Ettore, in Locanda. Give place, where the scene is, or with, who is in it.");
    });

    it("status says whom each companion is with, and what holds around each place of the player characters", async () => {
        await ok("write", "Torre", "--add", "environment=light: dark");
        await ok("write", "Locanda", "--add", "environment=light: bright");
        const status = await ok("status");
        expect(status).toContain("Lena, with Bruna");
        expect(status).toMatch(/Around Bruna: light: dark/);
        expect(status).toMatch(/Around Ettore: light: bright/);
        // Who else is there, where each of them is; the dead one's place no longer counts.
        await ok("write", "Oste", "--type", "character", "--set", "role=npc");
        await ok("write", "Locanda", "--add", "contains=[[Oste]]");
        expect(await ok("status")).toMatch(/Also there[^\n]*Oste[^\n]*Varro|Also there[^\n]*Varro[^\n]*Oste/);
        await ok("write", "Bruna", "--set", "status=dead");
        expect(await ok("status")).not.toMatch(/Also there[^\n]*Varro/);
    });
});

describe("the master's word for more than one player character (D-480)", () => {
    it("gives the party's part once in a chat, from instructions or when a second living one is written; none with one", async () => {
        const told = { ...context, told: new Set<string>() };
        const party = readFileSync(new URL("../instructions/party.md", import.meta.url), "utf8").trim().split("\n")[0];
        expect((await runCommandLine(["instructions"], told)).output).toContain(party);
        expect((await runCommandLine(["write", "Mira", "--type", "character", "--set", "role=pc"], told)).output).not.toContain(party);
        await ok("write", "Bruna", "--set", "role=npc");
        await ok("write", "Mira", "--set", "role=npc");
        expect((await runCommandLine(["instructions"], told)).output).not.toContain(party);
        expect((await runCommandLine(["write", "Bruna", "--set", "role=pc"], told)).output).toContain(party);
    });

    it("a dead one is no one's turn and rolls nothing; one back from the dead brings the party's part", async () => {
        const told = { ...context, told: new Set<string>() };
        await ok("move", "Ettore", "--to", "Torre");
        await ok("scene", "open", "--title", "Scontro", "--type", "combat", "--place", "Torre", "--with", "Bruna", "--with", "Ettore", "--with", "Varro");
        await ok("write", "Bruna", "--set", "status=dead");
        expect(await ok("scene", "order", "--order", "Bruna", "--order", "Varro", "--order", "Ettore")).not.toMatch(/now Bruna[^\n]*stop here/);
        await ok("scene", "close", "--summary", "Bruna cade.");
        // Ettore alone lives: whose roll it is goes without saying.
        expect((await runCommandLine(["ask", "--question", "Salti?", "--checks", "Athletics"], context)).output).not.toContain("Give who rolls");
        const party = readFileSync(new URL("../instructions/party.md", import.meta.url), "utf8").trim().split("\n")[0];
        expect((await runCommandLine(["write", "Bruna", "--set", "status=alive"], told)).output).toContain(party);
    });

    it("at the death of one while another lives, the table chooses whether to go back (D-480 (2))", async () => {
        // A scene's end makes the save the table may go back to.
        await ok("scene", "open", "--title", "Alla locanda", "--type", "social", "--place", "Locanda", "--with", "Ettore");
        await ok("scene", "close", "--summary", "Ettore beve.");
        expect(await ok("write", "Bruna", "--set", "status=dead")).toContain("Bruna is dead while the others live: ask the table now, before the scene's end saves and the death stays, whether to go back to the last save");
        // The table may go back to it, as the note says, until a save comes after the death.
        expect(await ok("save", "load")).toContain("Alla locanda");
        expect((await json("view")).party).toEqual(expect.arrayContaining([expect.objectContaining({ name: "Bruna", dead: false })]));
        await ok("write", "Bruna", "--set", "status=dead");
        expect(await ok("write", "Ettore", "--set", "status=dead")).toContain("Ettore is dead. With saves checkpoint, offer the player to go back");
        // One written dead from the start died in no story.
        expect(await ok("write", "Aldo", "--type", "character", "--set", "role=pc", "--set", "status=dead")).not.toContain("is dead");
    });
});

describe("what the player characters know together (VIEW-12, D-480 (1))", () => {
    it("knows what any of them knows, and says who, when not all of them do", async () => {
        // Varro is Bruna's: she is in the tower with him; Ettore never met him.
        await ok("scene", "open", "--title", "Alla torre", "--type", "social", "--place", "Torre", "--with", "Bruna", "--with", "Varro");
        await ok("reveal", "Varro#Colpa", "--to", "Bruna");
        await ok("scene", "close", "--summary", "Bruna parla con Varro.");
        expect(await ok("view", "Varro")).toBe(
            "Varro (character)\n\nIl mugnaio.\n\n> [!secret] Colpa\n> Ha ucciso il fratello.\n\nKnown to Bruna alone: Ettore plays as not knowing it, though all at the screen may read it.\n\nSecret Colpa: known to Bruna alone.",
        );
        expect(await ok("view", "Varro#Colpa")).toBe("Varro#Colpa\n\n> [!secret] Colpa\n> Ha ucciso il fratello.\n\nKnown to Bruna alone.");
        expect(await ok("view", "Lena#Nulla")).toBe("No player character knows anything of Lena called Nulla.");
        expect(await ok("view", "Varro", "--as", "Ettore")).toBe("Ettore does not know Varro.");
        const world = await json("view", "--world");
        const varro = (world.known as { name: string; knownBy?: string[]; }[]).find((entry) => entry.name === "Varro");
        expect(varro?.knownBy).toEqual(["Bruna"]);
        // The other player character is not among what they know: the party has them.
        expect((world.known as { name: string; }[]).map((entry) => entry.name)).not.toContain("Ettore");
        const letter = (world.documents as { name: string; carried: boolean; carrier?: string; knownBy?: string[]; }[])[0];
        expect(letter).toMatchObject({ name: "Lettera", carried: true, carrier: "Bruna", knownBy: ["Bruna"] });
        expect(await ok("view", "--world")).toContain("Document: Lettera (letter, carried by Bruna); known to Bruna alone");
    });

    it("gives the dashboard who found out each secret of the place and of a quest, when not all of them did (D-480 (7))", async () => {
        await ok("write", "Torre#Cripta", "--secret", "--text", "Sotto la torre c'è una cripta.");
        await ok("write", "Il mugnaio", "--type", "quest", "--set", "status=open", "--text", "Scoprire cosa nasconde Varro.");
        await ok("write", "Il mugnaio#Movente", "--secret", "--text", "Il fratello voleva il mulino.");
        await ok("reveal", "Torre#Cripta", "Il mugnaio", "Il mugnaio#Movente", "--to", "Bruna");
        await ok("reveal", "Il mugnaio", "--to", "Ettore");
        expect((await json("view", "--focus", "Bruna")).place).toMatchObject({ name: "Torre", knownBy: [{ secret: "Cripta", who: ["Bruna"] }] });
        const quest = ((await json("view", "--journal")).quests as { name: string; knownBy?: unknown; }[]).find((one) => one.name === "Il mugnaio");
        expect(quest?.knownBy).toEqual([{ secret: "Movente", who: ["Bruna"] }]);
        // Once both know it, nothing is said of who.
        await ok("reveal", "Torre#Cripta", "--to", "Ettore");
        expect((await json("view", "--focus", "Bruna")).place).not.toHaveProperty("knownBy");
    });

    it("a living player character played by its agent is played with prudence; a companion or a dead one is not (D-480 (4))", async () => {
        const away = "You play while your player is away: no big decision, nothing precious spent, no needless risk.";
        expect(await ok("view", "--as", "Ettore")).toContain(away);
        expect(await ok("view", "--as", "Lena")).not.toContain(away);
        await ok("write", "Ettore", "--set", "status=dead");
        expect(await ok("view", "--as", "Ettore")).not.toContain(away);
        // A lone living one's player is never away.
        expect(await ok("view", "--as", "Bruna")).not.toContain(away);
        // With no living one left unaware, who knows says no more.
        expect(await ok("view", "Lettera")).toBe("Lettera (item)\n\nVieni da solo.\n\nKnown to Bruna alone.");
    });

    it("a dead one knows what it knew at its death, never where it lies after", async () => {
        await ok("write", "Covo", "--type", "place", "--text", "Il covo del negromante.");
        await ok("write", "Bruna", "--set", "status=dead");
        await ok("move", "Bruna", "--to", "Covo");
        expect(await ok("view", "Covo")).toBe("No player character knows Covo.");
        expect(await ok("view")).toMatch(/\nBruna \(dead\), elsewhere: /);
        expect(await ok("view", "Lettera")).toBe("Lettera (item)\n\nVieni da solo.\n\nKnown to Bruna alone: Ettore plays as not knowing it, though all at the screen may read it.");
    });

    it("keeps what a dead player character knew", async () => {
        await ok("write", "Bruna", "--set", "status=dead");
        expect(await ok("view", "Lettera")).toBe("Lettera (item)\n\nVieni da solo.\n\nKnown to Bruna alone: Ettore plays as not knowing it, though all at the screen may read it.");
        expect(await ok("view")).toMatch(/^Ettore, in Locanda: hp 12\/12\nBruna \(dead\), in Torre: hp 9\/10\n/);
    });

    it("law: on worlds made at random, the view knows a page if and only if one of the player characters does", async () => {
        const names = ["Ettore", "Bruna", "Lena", "Varro", "Locanda", "Torre", "Lettera"];
        const world = campaignWorld(folder, context);
        fc.assert(
            fc.property(fc.array(fc.tuple(fc.constantFrom("Ettore", "Bruna"), fc.constantFrom(...names)), { maxLength: 8 }), fc.constantFrom("", "Ettore", "Bruna"), (known, dead) => {
                const pages = world.pages.map((page) => {
                    const links = known.filter(([who]) => who === page.name).map(([, what]) => `[[${what}]]`);
                    const fields = { ...page.fields, ...(links.length === 0 ? {} : { knows: links }), ...(page.name === dead ? { status: "dead" } : {}) };
                    return { ...page, fields };
                });
                const made = { ...world, pages };
                const union = playerKnowledge(folder, made);
                // A dead one beside a living one counts as at its death.
                const each = ["Ettore", "Bruna"].map((name) => knowledgeOf(folder, made, pageNamed(made, name)!, undefined, name === dead));
                return made.pages.every((page) => (union !== undefined && knowsPage(union, page)) === each.some((one) => knowsPage(one, page)));
            }),
            { numRuns: 50 },
        );
    });
});
