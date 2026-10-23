// What the World section shows besides the map (VIEW-11, D-276): the pages the player character knows, each as it knows it, and the calendar with the deadlines
// it knows and the days of its scenes.
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { runCommandLine } from "../src/command-line.ts";
import { view, type ViewResult } from "../src/commands/view.ts";
import type { Context } from "../src/core/context.ts";
import { inPlay, makeTempFolder, removeFolder, testContext } from "./support.ts";

let folder: string;
let context: Context;

beforeEach(async () => {
    folder = makeTempFolder();
    context = testContext(folder);
    await runCommandLine(["init", "--name", "Prova", "--language", "it", "--system", "5e", "--difficulty", "normal", "--lethality", "dice"], context);
    inPlay(folder);
    await ok("write", "Kira", "--type", "character", "--set", "role=pc", "--text", "Una cacciatrice.");
    await ok("write", "Bran", "--type", "character", "--set", "role=companion", "--text", "Un arciere taciturno.\n\nViene dai monti.");
    await ok("write", "Guado", "--type", "place", "--set", "kind=village", "--text", "Un villaggio sul fiume.", "--add", "contains=[[Kira]]", "--add", "contains=[[Bran]]");
    await ok("write", "Valle", "--type", "place", "--add", "contains=[[Guado]]");
    await ok("write", "Zaino", "--type", "item", "--set", "item=[[Backpack]]");
    await ok("write", "Medaglione", "--type", "item", "--text", "Il medaglione della madre di Kira.");
    await ok("write", "Kira", "--add", "inventory=[[Zaino]]", "--add", "inventory=[[Medaglione]]");
    await ok("write", "Varro", "--type", "character", "--set", "role=npc", "--text", "Il mugnaio.");
    await ok("write", "Varro#Colpa", "--secret", "--text", "Ha ucciso il fratello.");
    await ok("write", "Strega", "--type", "character", "--set", "role=npc", "--text", "Vive nel bosco.");
    await ok("write", "Gilda dei Mugnai", "--type", "faction", "--text", "I mugnai della valle.");
    await ok("write", "Kira", "--add", "knows=[[Varro]]", "--add", "knows=[[Gilda dei Mugnai]]");
    await ok("write", "Il mostro del fiume", "--type", "quest", "--set", "status=open", "--set", "kind=main", "--set", "deadline=day 4, 06:00", "--text", "Cacciarlo.");
    await ok("write", "La gilda", "--type", "quest", "--set", "status=open", "--set", "deadline=day 2, 12:00", "--text", "Parlare coi mugnai.");
    await ok("write", "Il segreto", "--type", "quest", "--set", "status=planned", "--set", "deadline=day 3", "--text", "Non ancora.");
});

afterEach(() => removeFolder(folder));

async function ok(...args: string[]): Promise<string>
{
    const result = await runCommandLine(args, context);
    expect(result.exitCode, result.output).toBe(0);
    return result.output;
}

function world(): Extract<ViewResult, { kind: "world"; }>
{
    const result = view.run({ world: true }, context) as ViewResult;

    if (result.kind !== "world") {
        throw new Error(`view world gave ${result.kind}`);
    }

    return result;
}

describe("what the World section shows (VIEW-11)", () => {
    it("lists the pages the character knows as it knows them, never itself, its quests, the system's, a plain item or a page it does not know", () => {
        const known = world().known;
        expect(known.map((entry) => entry.name)).toEqual(["Bran", "Gilda dei Mugnai", "Guado", "Medaglione", "Valle", "Varro"]);
        expect(known.find((entry) => entry.name === "Bran")).toEqual({ name: "Bran", type: "character", summary: "Un arciere taciturno.", companion: true });
        expect(known.find((entry) => entry.name === "Guado")).toEqual({ name: "Guado", type: "place", kind: "village", within: ["Valle"], summary: "Un villaggio sul fiume." });
        // A secret it did not discover never shows (VIEW-3).
        expect(JSON.stringify(known)).not.toContain("fratello");
    });

    it("lists a free page it knows; never an item whose sections say nothing, nor a place's kind of spaces", async () => {
        writeFileSync(join(folder, "world", "Storia del regno.md"), "Il regno nacque dal fiume.\n");
        await ok("write", "Anello", "--type", "item", "--text", "## Note\n\n%% del master %%");
        await ok("write", "Kira", "--add", "knows=[[Storia del regno]]", "--add", "inventory=[[Anello]]");
        writeFileSync(join(folder, "world", "places", "Valle.md"), '---\nkind: "  "\ncontains:\n  - "[[Guado]]"\n---\n');
        const known = world().known;
        expect(known.find((entry) => entry.name === "Storia del regno")).toEqual({ name: "Storia del regno", type: "page", summary: "Il regno nacque dal fiume." });
        expect(known.map((entry) => entry.name)).not.toContain("Anello");
        expect(known.find((entry) => entry.name === "Valle")?.kind).toBeUndefined();
    });

    it("VIEW-3: writes a link to a page it does not know as its words, so that no name tells the page exists; a map's block is no summary", async () => {
        await ok("write", "Gilda dei Mugnai", "--text", "Fondata da [[Strega|una donna del bosco]] e da [[Varro|il mugnaio]]; ne parla [[Strega]], e ![[stemma.png]].");
        await ok("write", "Guado", "--text", "```map\nHHH\n```\n\nUn villaggio sul fiume.");
        const known = world().known;
        expect(known.find((entry) => entry.name === "Gilda dei Mugnai")?.summary).toBe("Fondata da una donna del bosco e da [[Varro|il mugnaio]]; ne parla Strega, e ![[stemma.png]].");
        expect(known.find((entry) => entry.name === "Guado")?.summary).toBe("Un villaggio sul fiume.");
        expect(await ok("view", "Gilda dei Mugnai")).not.toContain("[[Strega");
    });

    it("lists the documents it carries, then those it read, each with its text as it knows it, and leaves them out of the pages", async () => {
        await ok("write", "Lettera di Lidia", "--type", "item", "--set", "document=letter", "--text", "Una lettera piegata in quattro.");
        await ok("write", "Lettera di Lidia#Contenuto", "--secret", "--text", "Ti aspetto al mulino.");
        await ok("write", "Avviso", "--type", "item", "--set", "document=notice", "--text", "Taglia sul mostro del fiume: 50 monete.");
        await ok("write", "Diario nascosto", "--type", "item", "--set", "document=diary", "--text", "Un diario.");
        await ok("write", "Kira", "--add", "inventory=[[Lettera di Lidia]]", "--add", "knows=[[Avviso]]");
        expect(world().documents).toEqual([
            { name: "Lettera di Lidia", document: "letter", text: "Una lettera piegata in quattro.", carried: true },
            { name: "Avviso", document: "notice", text: "Taglia sul mostro del fiume: 50 monete.", carried: false },
        ]);
        await ok("reveal", "Lettera di Lidia#Contenuto", "--to", "Kira");
        expect(world().documents[0].text).toContain("Ti aspetto al mulino.");
        expect(world().known.map((entry) => entry.name)).not.toContain("Lettera di Lidia");
    });

    it("gives the deadlines of the open quests it knows, the soonest first, and today without a calendar", async () => {
        await ok("advance", "--to", "day 1, 18:00");
        const { calendar } = world();
        expect(calendar).toMatchObject({ now: "day 1, 18:00", today: 1 });
        expect(calendar.months).toBeUndefined();
        expect(calendar.deadlines).toEqual([
            { quest: "La gilda", main: false, date: "day 2, 12:00", day: 2, minutes: 18 * 60 },
            { quest: "Il mostro del fiume", main: true, date: "day 4, 06:00", day: 4, minutes: 60 * 60 },
        ]);
    });

    it("orders the deadlines of one day by their hour before the game has a date, and never gives a planned quest's, even one it knows", async () => {
        await ok("write", "La gilda", "--set", "deadline=day 4, 18:00");
        await ok("write", "Il mostro del fiume", "--set", "deadline=day 4, 06:00");
        await ok("write", "Kira", "--add", "knows=[[Il segreto]]");
        expect(world().calendar.deadlines.map((deadline) => deadline.quest)).toEqual(["Il mostro del fiume", "La gilda"]);
    });

    it("gives the months and today's day of the calendar when the story has a start (TIM-8), and the days of the scenes", async () => {
        await ok("advance", "--to", "day 1, 18:00");
        await ok("config", "calendar-start", "30 April 1491");
        await ok("scene", "open", "--title", "Al mulino", "--type", "social", "--place", "Guado");
        await ok("scene", "close", "--summary", "Varro tace.");
        await ok("advance", "--by", "1d");
        await ok("scene", "open", "--title", "Il guado", "--type", "travel");
        const { calendar } = world();
        expect(calendar.months?.map((month) => month.name)).toHaveLength(12);
        expect(calendar.date).toEqual({ day: 1, month: 4, season: "spring", year: 1491 });
        expect(calendar.scenes).toEqual([{ day: 1, number: 1, title: "Al mulino", place: "Guado" }, { day: 2, number: 2, title: "Il guado", place: "Guado" }]);
    });

    it("reads in the chat as a line for each page and each deadline", async () => {
        const text = (await ok("view", "--world")).split("\n");
        expect(text).toContain("- Guado (village, in Valle): Un villaggio sul fiume.");
        expect(text).toContain("- Bran (companion): Un arciere taciturno.");
        expect(text).toContain("Deadline of La gilda: day 2, 12:00");
        await ok("write", "Avviso", "--type", "item", "--set", "document=notice", "--text", "Una taglia.");
        await ok("write", "Kira", "--add", "inventory=[[Avviso]]");
        expect((await ok("view", "--world")).split("\n")).toContain("Document: Avviso (notice, carried)");
    });

    it("goes alone", async () => {
        expect((await runCommandLine(["view", "--world", "--map"], context)).output).toContain("Give world alone");
        expect((await runCommandLine(["view", "--world", "--as", "Varro"], context)).output).toContain("Give as alone or with page");
    });
});
