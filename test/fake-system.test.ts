// The fake system of the core's tests (D-513 (3), D-514): its shapes, other than the 5e's, read by the core as data; its code and its page module run.
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { runCommandLine } from "../src/cli/command-line.ts";
import { campaignPageModules } from "../src/commands/game/extension-list.ts";
import { campaignWidgets } from "../src/commands/game/widgets.ts";
import type { Context } from "../src/core/context.ts";
import { fieldLabel } from "../src/dashboard/labels.ts";
import { setSystemWords, systemWord } from "../src/dashboard/text.ts";
import { findSystem } from "../src/systems/index.ts";
import { inPlay, makeTempFolder, removeFolder, testContext, testSystemCode, testSystemFolders } from "./support.ts";

let folder: string;
let context: Context;

beforeEach(async () => {
    folder = makeTempFolder();
    context = testContext(folder);
    await ok("init", "--name", "Fenmoor", "--language", "en", "--system", "fake", "--difficulty", "normal", "--lethality", "dice");
    await ok("config", "harshness", "gentle");
    inPlay(folder);
    const fields = ["role=pc", "calling=ferrywoman", "vocations=[[Warden]] 2, [[Scout]] 1", "might=5", "grace=3", "wit=4", "skilled=[wit]", "resolve=1/3", "renown=12", "stride=8 m"];
    await ok("write", "Tamsin", "--type", "character", ...fields.flatMap((field) => ["--set", field]));
});

afterEach(() => removeFolder(folder));

describe("the fake system's sheet", () => {
    it("works out its numbers from a table, floor, has, count, best and sum over the vocations' pages, with a mark on what a list marks", async () => {
        await ok("validate");
        const sheet = await ok("view", "Tamsin");
        // Might 5 gives +1 by the table; grit 6 + 3 × rank 3 + 1; a Warden's stamina die is a d6, a Scout's a d4.
        expect(sheet).toContain("might 5 (+1) · grace 3 (+0) · wit 4 (+0) · skilled wit");
        expect(sheet).toContain("grit 16/16");
        expect(sheet).toContain("stamina-d6 2/2 · stamina-d4 1/1");
        // The guard of the first vocation that gives one, the Warden's 1 + might bonus; notice half of wit and rank, and 2 for being skilled in wit, marked.
        expect(sheet).toContain("guard 8 · notice 5 ● · speed 8 m");
        // The knacks of each vocation's table up to its rank, by the sections its page has, and one written by hand after them, all counted (PRO-3).
        expect(sheet).toContain("knacks Steady Hand, Iron Lung, Keen Eye · knack-count 3");
        await ok("write", "Odo", "--type", "character", "--set", "role=companion", "--set", "vocations=[[Warden]] 1", "--add", "knacks=Quiet Step");
        expect(await ok("view", "Odo")).toContain("knacks Steady Hand, Quiet Step · knack-count 2");
    });

    it("rolls its numbers with two dice, with an edge or against the odds by its own dice and names, which cancel out", async () => {
        // A Scout's Keen Eye gives notice an edge; Dazed takes it away again, and makes grace worse.
        expect(await dice("notice")).toBe("3d6kh2");
        expect(await dice("grace")).toBe("2d6");
        await ok("effect", "add", "Tamsin", "Dazed");
        expect(await dice("notice")).toBe("2d6");
        expect(await dice("grace")).toBe("3d6kl2");
        expect(await dice("might")).toBe("2d6");
    });
});

describe("the fake system's counters and money", () => {
    it("gives change in coins that are not decimal, as an innkeeper does", async () => {
        await ok("write", "Tamsin", "--set", "money=1 crown");
        await ok("change", "Tamsin", "money", "--by=-7 shilling");
        expect(await ok("view", "Tamsin")).toContain("13 shilling");
    });

    it("names its own coins in what trade refuses (D-518)", async () => {
        await ok("write", "Tamsin", "--set", "money=1 crown");
        await ok("write", "Ugo", "--type", "character", "--set", "role=npc", "--set", "money=1 crown");
        const refused = async (...args: string[]): Promise<string> => (await runCommandLine(args, context)).output;
        expect(await refused("trade", "Tamsin", "--with", "Ugo")).toBe('Give what Tamsin gives, gives, and what it gets, gets, such as gives "2 crown", gets "Torch 5". Nothing changed.');
        expect(await refused("trade", "Tamsin", "--with", "Ugo", "--gives", "1 crown", "--gives", "2 shilling")).toBe('Give the money Tamsin hands over as one amount, such as "2 crown 5 shilling". Nothing changed.');
    });

    it("lets its ward take harm before grit, and keeps resolve within a minimum below 0", async () => {
        await ok("write", "Tamsin", "--set", "ward=3");
        expect(await ok("change", "Tamsin", "grit", "--by=-5", "--damage", "fire")).toContain("Tamsin: grit 16/16 → 14/16: ward 3 → 0 first.");
        expect(await ok("view", "Tamsin")).toContain("grit 14/16 · ward 0");
        const broken = await ok("change", "Tamsin", "resolve", "--by=-9");
        expect(broken).toContain("Breaking");
        expect(await ok("view", "Tamsin")).toContain("resolve -3/3");
    });

    it("spends stamina dice of its own names in a breather, each with the might bonus, back to grit", async () => {
        await ok("change", "Tamsin", "grit", "--by=-12");
        // Two d6 showing 4, each with might +1: 10 grit back.
        await ok("change", "Tamsin", "stamina-d6", "--spend", "2", "--recipe", "breather");
        expect(await ok("view", "Tamsin")).toContain("grit 14/16 · resolve 1/3 · stamina-d6 0/2 · stamina-d4 1/1");
        // A night's sleep brings back half the rank in dice, at least one, and all grit.
        await ok("change", "--recipe", "night's sleep");
        expect(await ok("view", "Tamsin")).toContain("grit 16/16 · resolve 1/3 · stamina-d6 1/2");
    });
});

describe("the fake system's down point, one side counted", () => {
    it("is Down at 0 grit by its code, fades at each of its turns, and its widget on them shows that side alone (D-516)", async () => {
        expect(testSystemCode.fake).toHaveProperty("code");
        expect(await ok("change", "Tamsin", "grit", "--to=0")).toContain("Tamsin falls: one fading at the start of each of their turns, 3 and they are gone. Read rules Falling.");
        await ok("scene", "open", "--title", "The causeway", "--type", "combat", "--with", "Tamsin", "--creatures", "Bog Hound=1");
        await ok("scene", "order", "--order", "Bog Hound 1", "--order", "Tamsin");
        expect(await ok("scene", "next")).toContain("Tamsin fades: fading 1/3.");
        const overview = JSON.parse(await ok("view", "--json"));
        expect(overview.party[0].down).toBe(true);
        expect(overview.openScene.fighters[1].down).toBe(true);
        const down = (await campaignWidgets(folder, context)).find((widget) => widget.id === "fake.down");
        expect(down?.people?.Tamsin?.parts).toEqual([{ lead: "Down", tone: "bad" }, { track: { label: "Fading", value: 1, max: 3, tone: "bad", stage: "end", field: "fading" } }]);
    });

    it("brings back who is Down with two dice of 10 or more, and clears the fading when Steadied", async () => {
        await ok("write", "Tamsin", "--set", "fading=2");
        await ok("change", "Tamsin", "grit", "--to=0");
        expect(await ok("effect", "add", "Tamsin", "Steadied")).toContain("Tamsin is steadied: fading 0.");
        const rolled = await runCommandLine(["roll", "2d6", "--who", "Tamsin", "--why", "to rise"], { ...context, random: () => 6 });
        expect(rolled.output).toContain("Tamsin rallies: grit 1, fading 0.");
        // Its change of grit, from inside the hook, calls no hook again (D-514).
        expect(rolled.output).not.toContain("rises");
        expect(await ok("view", "Tamsin")).toContain("grit 1/16");
    });
});

describe("the fake system's words", () => {
    it("give the page the labels of its sheet in the campaign's language, and leave one it lacks to its English name", async () => {
        await ok("config", "language", "it");
        const words = JSON.parse(await ok("view", "--json")).words;
        expect(words.fields).toMatchObject({ grit: "Tempra", might: "Forza" });
        expect(words.fields).not.toHaveProperty("notice");
        setSystemWords(words);

        try {
            expect([fieldLabel("grit"), fieldLabel("notice"), fieldLabel("might-bonus")]).toEqual(["Tempra", "notice", "might bonus"]);
            // A group the system words, which the sheet titles its card with; one it does not, none, and the card keeps its name.
            expect([systemWord("groups", "Struggle"), systemWord("groups", "Fading")]).toEqual(["Lotta", undefined]);
        } finally {
            setSystemWords(undefined);
        }
    });
});

describe("the fake system's verbs (D-514)", () => {
    it("gives the dashboard its own verb beside the engine's, for the rites of the sheet", async () => {
        await ok("write", "Tamsin", "--set", "rites=[Rite of Mist]");
        const overview = JSON.parse(await ok("view", "--json")) as { verbs?: Record<string, { says: string; }>; };
        expect(Object.keys(overview.verbs ?? {})).toEqual(["invoke"]);
        expect(overview.verbs?.invoke.says).toBe("I invoke {item}.");
        const page = JSON.parse(await ok("view", "Tamsin", "--json")) as { actions?: Record<string, string[]>; };
        expect(page.actions?.rites).toEqual(["invoke", "use"]);
    });
});

describe("the fake system's page module", () => {
    it("is given to the dashboard with the system's words for it, and draws its card on the sheet and its own page as a tab", async () => {
        await ok("config", "language", "it");
        const system = findSystem(testSystemFolders, "fake");
        const [module] = campaignPageModules(folder, context, system);
        expect(module).toMatchObject({ package: "@rpgengine/system-fake", kind: "system", version: "1.0.0", address: "/pkg/%40rpgengine%2Fsystem-fake/1.0.0/page.js" });
        expect(module.words).toMatchObject({ Fading: "Svanisce", Almanac: "Almanacco" });
        const loaded = (await import(pathToFileURL(join(system?.folder ?? "", "page", "page.js")).href) as { default: PageCode; }).default;
        expect(loaded.cards.fading.page).toBe("sheet");
        expect(loaded.cards.fading.draw({ who: "Tamsin" }).props.children).toBe("Tamsin: nothing yet");
        // With what its widget gives for who it shows (D-514).
        expect(loaded.cards.fading.draw({ who: "Tamsin", data: { who: "Tamsin", fading: 2 } }).props.children).toBe("Tamsin: Tamsin faded 2");
        expect(loaded.pages.almanac.widget).toBe("rally");
        expect(loaded.pages.almanac.nav).toBe("tab");
    });
});

/** The page module of the fake system, as far as these tests read it. */
interface PageCode
{
    cards: Record<string, { page: string; draw(props: { who?: string; data?: unknown; }): { props: { children: unknown; }; }; }>;
    pages: Record<string, { nav?: string; widget?: string; }>;
}

/** The dice of a value's free roll on the sheet, without its number. */
async function dice(field: string): Promise<string | undefined>
{
    const sheet = JSON.parse(await ok("view", "Tamsin", "--json")).sheet as { values: { field: string; roll?: { notation: string; }; }[]; }[];
    return sheet.flatMap((group) => group.values).find((value) => value.field === field)?.roll?.notation.replace(/[+-]\d+$/, "");
}

async function ok(...args: string[]): Promise<string>
{
    const result = await runCommandLine(args, context);
    expect(result.exitCode, result.output).toBe(0);
    return result.output;
}
