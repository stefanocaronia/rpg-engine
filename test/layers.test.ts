// The campaign's layers over the pages of its game system (MECCANICHE, SYS-11; D-564), on the fake system: a table of cases through the commands.
import { cpSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { readAdventureZip } from "../src/adventures/index.ts";
import { runCommandLine } from "../src/cli/command-line.ts";
import { makeSave } from "../src/commands/shared/campaign/saves.ts";
import type { Context } from "../src/core/context.ts";
import { layeredPage, type Page, systemOriginal } from "../src/pages/index.ts";
import { inPlay, makeTempFolder, readLogFile, removeFolder, testContext } from "./support.ts";

let folder: string;
let context: Context;
const houndLayer = "layers/fake/world/creatures/Bog Hound.md";
const houndSystem = join(import.meta.dirname, "systems", "fake", "world", "creatures", "Bog Hound.md");

beforeEach(async () => {
    folder = makeTempFolder();
    context = testContext(folder);
    await runCommandLine(["init", "--name", "Guadoscuro", "--language", "it", "--system", "fake", "--difficulty", "normal", "--lethality", "dice"], context);
    inPlay(folder);
    await ok("config", "harshness", "gentle");
    await ok("write", "Zanna", "--type", "character", "--set", "role=npc", "--set", "creature=[[Bog Hound]]");
});

afterEach(() => removeFolder(folder));

async function ok(...args: string[]): Promise<string>
{
    const result = await runCommandLine(args, context);
    expect(result.exitCode, result.output).toBe(0);
    return result.output;
}

async function refused(...args: string[]): Promise<string>
{
    const result = await runCommandLine(args, context);
    expect(result.exitCode, result.output).toBe(1);
    return result.output;
}

function layerText(path = houndLayer): string | undefined
{
    return existsSync(join(folder, path)) ? readFileSync(join(folder, path), "utf8") : undefined;
}

function handWrite(path: string, text: string): void
{
    mkdirSync(dirname(join(folder, path)), { recursive: true });
    writeFileSync(join(folder, path), text);
}

describe("SYS-11: write with layer changes a page of the system for the whole campaign", () => {
    it("writes only the field that changes, and what derives from the page reads it; the system's file never changes", async () => {
        const system = readFileSync(houndSystem, "utf8");
        const output = await ok("write", "Bog Hound", "--layer", "--set", "grit=12/12", "--set", "guard=7", "--why", "every hound of these fens is bigger");
        expect(output).toContain(`Updated Bog Hound (creature, ${houndLayer}): set grit; guard again as the system's.`);
        expect(output).toContain("Changed with it, since they read grit from Bog Hound: Zanna.");
        expect(output).toContain(`Bog Hound stays a creature of the system fake, with the campaign's layer ${houndLayer} over it: show Bog Hound says what it changes.`);
        expect(layerText()).toBe("---\ngrit: 12/12\n---\n");
        expect(readFileSync(houndSystem, "utf8")).toBe(system);
        expect(await ok("show", "Zanna")).toContain("grit: 12/12");
        expect(await ok("show", "Bog Hound")).toContain(
            `Bog Hound (creature of the system fake, read-only)\nThe campaign changes it with its layer ${houndLayer}: grit. write Bog Hound with layer and unset, or with empty text, gives back the system's; with reset, all of it.`,
        );
        // The master's work on the world: one hidden line.
        const line = readLogFile(folder).at(-1);
        expect(line).toMatchObject({ type: "page-updated", visibility: "hidden", data: { page: "Bog Hound", layer: houndLayer, why: "every hound of these fens is bigger" } });
    });

    it("gives back the system's value with unset, and removes the layer left empty", async () => {
        await ok("write", "Bog Hound", "--layer", "--set", "grit=12/12");
        const output = await ok("write", "Bog Hound", "--layer", "--unset", "grit");
        expect(output).toContain("removed grit");
        expect(output).toContain("The campaign's layer over Bog Hound is empty now, and its file is gone: Bog Hound reads as the system fake writes it again.");
        expect(layerText()).toBeUndefined();
        expect(await ok("show", "Zanna")).toContain("grit: 9/9");
        expect(await ok("show", "Bog Hound")).not.toContain("The campaign changes it");
        // The same value as the system's is no layer at all; a field the layer does not hold has nothing to give back.
        expect(await ok("write", "Bog Hound", "--layer", "--set", "grit=9/9")).toBe("Nothing changed on Bog Hound: it already reads like that.");
        expect(layerText()).toBeUndefined();
        expect(await refused("write", "Bog Hound", "--layer", "--unset", "guard")).toBe(
            "The campaign's layer over Bog Hound holds no guard to remove: it is the system's own, which a layer cannot remove; set another value instead. Nothing changed.",
        );
    });

    it("replaces a section by its name, adds one the page lacks, and takes the layer's own away with empty text", async () => {
        await ok("write", "Bog Hound#Bite", "--layer", "--text", "Three dice, at who stands beside it.");
        await ok("write", "Bog Hound#Howl", "--layer", "--text", "Every hound within a mile answers.");
        const shown = await ok("show", "Bog Hound");
        expect(shown).toContain("## Bite\n\nThree dice, at who stands beside it.");
        expect(shown).not.toContain("Two dice and three");
        expect(shown).toContain("## Howl\n\nEvery hound within a mile answers.");
        expect(shown).toContain("the sections Bite, Howl");
        // A page that derives from it shows the campaign's text.
        expect(await ok("show", "Zanna#Bite")).toContain("Three dice, at who stands beside it.");
        await ok("write", "Bog Hound#Bite", "--layer", "--text", "");
        expect(await ok("show", "Bog Hound")).toContain("## Bite\n\nTwo dice and three, at who stands beside it.");
        expect(await refused("write", "Bog Hound#Bite", "--layer", "--text", "")).toBe(
            `The campaign's layer over Bog Hound has no "Bite" of its own to remove: the system's text cannot be removed, only written over with another. Nothing changed.`,
        );
        await ok("write", "Bog Hound#Howl", "--layer", "--text", "");
        expect(layerText()).toBeUndefined();
    });

    it("writes the introduction, appended to the one the page shows, and leaves it out again when it is the system's", async () => {
        await ok("write", "Bog Hound", "--layer", "--append", "--text", "In these fens they hunt alone.");
        expect(layerText()).toBe("A long dog of the fens, grey as the reeds, that hunts in pairs.\n\nIn these fens they hunt alone.\n");
        expect(await ok("show", "Bog Hound")).toContain("the introduction");
        await ok("write", "Bog Hound", "--layer", "--text", "A long dog of the fens, grey as the reeds, that hunts in pairs.");
        expect(layerText()).toBeUndefined();
    });

    it("refuses without layer, naming this way, and refuses change, effect and move on the page as before", async () => {
        expect(await refused("write", "Bog Hound", "--set", "grit=12/12")).toContain('To change Bog Hound itself for the whole campaign, write it with layer: write "Bog Hound", layer, set grit=12/12. Nothing changed.');
        expect(await refused("change", "Bog Hound", "grit", "--by=-1")).toContain("read-only");
        expect(await refused("effect", "add", "Bog Hound", "Furia")).toContain("of the system fake");
        // Play spends nothing on the system's page: a use or an effect never goes in a layer.
        expect(await refused("change", "Herb Pouch", "uses", "--by=-1")).not.toContain("layer");
        expect(await refused("effect", "add", "Herb Pouch", "Bagnato")).not.toContain("layer");
        expect(layerText()).toBeUndefined();
    });

    it("refuses a layer on a page of the campaign, on a copy, with a type, and on fields a layer never changes", async () => {
        expect(await refused("write", "Zanna", "--layer", "--set", "grit=3/3")).toBe(
            "Zanna is a page of the campaign: write it without layer, which is only for a page of the game system, to change it for the whole campaign. Nothing changed.",
        );
        expect(await refused("write", "Bog Hound", "--layer", "--type", "character")).toBe(
            "A layer changes neither the type nor the name of Bog Hound, creature of the system fake: leave type out. Nothing changed.",
        );
        expect(await refused("write", "Bog Hound", "--layer", "--set", "tags=[fens]")).toBe(
            "tags cannot go in the campaign's layer over Bog Hound: tags is a field no page inherits (INH-8), and Bog Hound is a creature of the system fake, which is nowhere and derives only from the system. Nothing changed.",
        );
        expect(await refused("write", "Bog Hound", "--layer", "--set", "name=Cane")).toContain("a layer changes neither the name nor the type of Bog Hound");
        // A kind counted in stacks never gets uses (STK-1); an item that has them already may change them.
        expect(await refused("write", "Hardtack", "--layer", "--set", "uses=3/3")).toContain("uses of its own would make Hardtack, a kind counted in stacks, no kind");
        await ok("write", "Herb Pouch", "--layer", "--set", "uses=8/8");
        expect(await refused("write", "Nessuno", "--layer", "--set", "grit=1/1")).toContain("There is no page named Nessuno");
        expect(layerText()).toBeUndefined();
    });

    it("INH-10: refuses while copies of the page are in the open scene", async () => {
        await ok("scene", "open", "--title", "Bosco", "--type", "combat", "--creatures", "Bog Hound=2");
        expect(await refused("write", "Bog Hound", "--layer", "--set", "grit=12/12")).toBe(
            "Bog Hound has copies in the open scene, which read from it what they do not change: Bog Hound 1 (grit 9/9), Bog Hound 2 (grit 9/9). Change a copy; to change Bog Hound for all, close the scene first. Nothing changed.",
        );
        expect(await refused("write", "Bog Hound 1", "--layer", "--set", "grit=12/12")).toContain("is a copy in the open scene");
    });

    it("a kind stays a kind, counted in stacks, with a layer that changes its heft", async () => {
        await ok("write", "Hardtack", "--layer", "--set", "heft=0.4 kg");
        // A slash in a field the system declares text counts nothing (SYS-8).
        await ok("write", "Hardtack", "--layer", "--set", "lore=2/4");
        await ok("write", "Dispensa", "--type", "place", "--add", "contains=[[Hardtack]] 3");
        expect(await ok("show", "Dispensa")).toContain("[[Hardtack]] 3");
        expect(await ok("validate")).toBe("No problems.");
    });
});

describe("SYS-11: write with layer and reset takes the whole layer off", () => {
    it("removes the file with every field and text it changed, and what derives from the page reads the system's again", async () => {
        await ok("write", "Bog Hound", "--layer", "--set", "grit=12/12", "--set", "guard=9", "--text", "In these fens they hunt alone.");
        await ok("write", "Bog Hound#Bite", "--layer", "--text", "Three dice, at who stands beside it.");
        await ok("write", "Bog Hound#Howl", "--layer", "--text", "Every hound within a mile answers.");
        const output = await ok("write", "Bog Hound", "--layer", "--reset", "--why", "the player wants the book's hound");
        expect(output).toContain(`Updated Bog Hound (creature, ${houndLayer}): grit again as the system's; guard again as the system's.`);
        expect(output).toContain("Changed with it, since they read grit, guard, #Bite, #Howl, the introduction from Bog Hound: Zanna.");
        expect(output).toContain("The campaign's layer over Bog Hound is taken off, and its file is gone: Bog Hound reads as the system fake writes it again.");
        expect(layerText()).toBeUndefined();
        const shown = await ok("show", "Bog Hound");
        expect(shown).not.toContain("The campaign changes it");
        expect(shown).toContain("A long dog of the fens, grey as the reeds, that hunts in pairs.");
        expect(shown).toContain("## Bite\n\nTwo dice and three, at who stands beside it.");
        expect(shown).not.toContain("Howl");
        expect(await ok("show", "Zanna")).toContain("grit: 9/9");
        expect(readLogFile(folder).at(-1)).toMatchObject({ type: "page-updated", visibility: "hidden", data: { page: "Bog Hound", layer: houndLayer, reset: true, why: "the player wants the book's hound" } });
        expect(await ok("validate")).toBe("No problems.");
    });

    it("INH-11: a counter of the party that changes with it has its public line", async () => {
        await ok("write", "Lupa", "--type", "character", "--set", "role=companion", "--set", "creature=[[Bog Hound]]");
        await ok("write", "Bog Hound", "--layer", "--set", "grit=12/12");
        await ok("write", "Bog Hound", "--layer", "--reset");
        const lines = readLogFile(folder).slice(-2);
        expect(lines[0]).toMatchObject({ type: "page-updated", visibility: "hidden", data: { page: "Bog Hound", reset: true } });
        expect(lines[1]).toMatchObject({ type: "counter-changed", visibility: "public", data: { page: "Lupa", field: "grit", before: "12/12", after: "9/9" } });
    });

    it("refuses without layer, with anything to write, on a page without a layer, of the campaign, and on a copy; nothing changes", async () => {
        await ok("write", "Bog Hound", "--layer", "--set", "grit=12/12");
        expect(await refused("write", "Bog Hound", "--reset")).toBe(
            "reset goes with layer: it takes the campaign's whole layer off a page of the game system, which reads as the system writes it again. Nothing changed.",
        );
        expect(await refused("write", "Bog Hound", "--layer", "--reset", "--set", "guard=9", "--unset", "grit")).toBe(
            "reset takes the campaign's whole layer off Bog Hound, and nothing else: leave out set, unset. To give back one field or one section, leave reset out: unset for a field, empty text for a section. Nothing changed.",
        );
        expect(await refused("write", "Bog Hound#Bite", "--layer", "--reset")).toContain("leave out section.");
        expect(await refused("write", "Bog Hound", "--layer", "--reset", "--text", "")).toContain("leave out text.");
        expect(await refused("write", "Bog Hound", "--layer", "--reset", "--type", "creature")).toContain("leave out type.");
        expect(layerText()).toBe("---\ngrit: 12/12\n---\n");
        expect(await refused("write", "Fen Witch", "--layer", "--reset")).toBe("The campaign has no layer over Fen Witch to take off: it already reads as the system fake writes it. Nothing changed.");
        expect(await refused("write", "Zanna", "--layer", "--reset")).toContain("Zanna is a page of the campaign");
        expect(await refused("write", "Nessuno", "--layer", "--reset")).toContain("There is no page named Nessuno");
        await ok("scene", "open", "--title", "Bosco", "--type", "combat", "--creatures", "Fen Witch=1");
        expect(await refused("write", "Fen Witch 1", "--layer", "--reset")).toContain("is a copy in the open scene");
    });

    it("INH-10: refuses while copies in the open scene read the fields it gives, never for its text alone", async () => {
        await ok("write", "Bog Hound", "--layer", "--set", "grit=12/12");
        await ok("write", "Fen Witch", "--layer", "--text", "She trades in names, and in these fens in years.");
        await ok("scene", "open", "--title", "Bosco", "--type", "combat", "--creatures", "Bog Hound=1", "--creatures", "Fen Witch=1");
        expect(await refused("write", "Bog Hound", "--layer", "--reset")).toBe(
            "Bog Hound has copies in the open scene, which read from it what they do not change: Bog Hound 1 (grit 12/12). Change a copy; to change Bog Hound for all, close the scene first. Nothing changed.",
        );
        expect(layerText()).toBe("---\ngrit: 12/12\n---\n");
        await ok("write", "Fen Witch", "--layer", "--reset");
        expect(layerText("layers/fake/world/creatures/Fen Witch.md")).toBeUndefined();
    });

    it("takes off a layer written by hand that does not read, which the page shows no mark of", async () => {
        handWrite(houndLayer, "---\ngrit: [1\n---\n");
        expect(await ok("show", "Bog Hound")).not.toContain("The campaign changes it");
        expect(await ok("write", "Bog Hound", "--layer", "--reset")).toContain("The campaign's layer over Bog Hound is taken off");
        expect(layerText()).toBeUndefined();
        expect(await ok("validate")).toBe("No problems.");
    });
});

describe("SYS-11: the merge of a layer, with the system's translation (D-542)", () => {
    const page: Page = {
        name: "Bog Hound",
        type: "creature",
        path: "world/creatures/Bog Hound.md",
        fields: { Grit: "9/9", guard: 7 },
        body: "A long dog.\n\n## Bite\n\nTwo dice.",
        system: "fake",
        title: "Cane di palude",
        translated: "Un cane lungo.\n\n## Bite\n\nDue dadi.",
    };

    it.each([
        ["a field under the name the system gives it, the translation kept", { fields: { grit: "12/12" }, body: "" }, { Grit: "12/12", guard: 7 }, page.body, page.translated],
        ["a section the translation has, replaced in both", { fields: {}, body: "## Bite\n\nTre dadi." }, page.fields, "A long dog.\n\n## Bite\n\nTre dadi.", "Un cane lungo.\n\n## Bite\n\nTre dadi."],
        ["a section the translation lacks: the translation goes", { fields: {}, body: "## Howl\n\nUlula." }, page.fields, "A long dog.\n\n## Bite\n\nTwo dice.\n\n## Howl\n\nUlula.", undefined],
        ["the introduction, in both", { fields: {}, body: "Un cane solo." }, page.fields, "Un cane solo.\n\n## Bite\n\nTwo dice.", "Un cane solo.\n\n## Bite\n\nDue dadi."],
        ["a field no layer changes, read from the system all the same", { fields: { tags: ["x"], name: "Cane" }, body: "" }, page.fields, page.body, page.translated],
    ])("%s", (_, layer, fields, body, translated) => {
        const merged = layeredPage(page, layer, "layers/fake/world/creatures/Bog Hound.md");
        expect(merged.fields).toEqual(fields);
        expect(merged.body).toBe(body);
        expect(merged.translated).toBe(translated);
        expect(merged).toMatchObject({ name: "Bog Hound", system: "fake", title: "Cane di palude" });
        expect(systemOriginal(merged)).toBe(page);
    });
});

describe("SYS-11: the merged page is the system's wherever a rule reads it", () => {
    it("a vocation with a layer on one section keeps its table, and gives the campaign's text of that knack", async () => {
        await ok("write", "Lena", "--type", "character", "--set", "role=companion", "--set", "vocations=[[Scout]] 2");
        await ok("write", "Scout#Keen Eye", "--layer", "--text", "Notice with an edge, and in the dark too.");
        const shown = await ok("show", "Lena");
        expect(shown).toContain("knacks Keen Eye, Quiet Step");
        expect(shown).toContain("lore tracks");
        expect(await ok("show", "Lena#Keen Eye")).toContain("Notice with an edge, and in the dark too.");
    });

    it("a page the system puts in every sheet works out its formula as the layer writes it (DAT-13)", async () => {
        // The fake system with Bare Hands in every sheet's equipped too, whose parry the guard adds up (PRO-5).
        const systems = makeTempFolder();
        cpSync(join(import.meta.dirname, "systems", "fake"), join(systems, "fake"), { recursive: true });
        const yaml = join(systems, "fake", "system.yaml");
        writeFileSync(yaml, readFileSync(yaml, "utf8").replace("  kit: [Bare Hands]\n", "  kit: [Bare Hands]\n  equipped: [Bare Hands]\n"));
        context = { ...context, systemFolders: [systems, ...context.systemFolders] };
        await ok("write", "Gara", "--type", "character", ...["role=pc", "vocations=[[Warden]] 1", "might=3", "grace=5"].flatMap((field) => ["--set", field]));
        expect(await ok("show", "Gara")).toContain("guard 8");
        await ok("write", "Bare Hands", "--layer", "--set", "parry=1 + grace-bonus");
        expect(await ok("show", "Gara")).toContain("guard 10");
        await ok("write", "Bare Hands", "--layer", "--unset", "parry");
        expect(await ok("show", "Gara")).toContain("guard 8");
    });
});

describe("SYS-11: validate, the rules' version, saves and exports", () => {
    it("reports a layer over no page and one that does not read, and the commands go on", async () => {
        handWrite("layers/fake/world/creatures/Nessuno.md", "---\ngrit: 1/1\n---\n");
        handWrite(houndLayer, "---\ngrit: [1\n---\n");
        handWrite("layers/fake/world/items/Hardtack.md", "---\nuses: 2/2\ntags: [cibo]\n---\n");
        const output = await ok("validate");
        expect(output).toContain(
            "layers/fake/world/creatures/Nessuno.md: This layer lies over no page of the system fake, which has no page at that path in the rules the campaign plays: it changes nothing. Fix: move it to the path of the page it is for",
        );
        expect(output).toContain("A layer in layers/fake: The frontmatter of world/creatures/Bog Hound.md is not valid YAML");
        expect(output).toContain("layers/fake/world/items/Hardtack.md: The layer over Hardtack writes uses, tags, which a layer cannot change");
        expect(await ok("show", "Zanna")).toContain("grit: 9/9");
        expect(await ok("show", "Hardtack")).toContain("It also writes uses, tags, which a layer cannot change: validate says why.");
    });

    it("VER-3: a layer follows the page's path in the version of the rules the campaign plays", async () => {
        await ok("write", "Rushlight", "--layer", "--set", "heft=0.2 kg");
        expect(layerText("layers/fake/world/items/Rushlight.md")).toBe("---\nheft: 0.2 kg\n---\n");
        await ok("config", "ruleset", "second");
        const shown = await ok("show", "Rushlight");
        expect(shown).toContain("burns four hours under the second rules");
        expect(shown).toContain("heft: 0.2 kg");
    });

    it("a save holds the layers and a load brings them back", async () => {
        await ok("config", "saves", "free");
        await ok("write", "Bog Hound", "--layer", "--set", "grit=12/12");
        makeSave(folder, context, undefined, "con lo strato");
        await ok("write", "Bog Hound", "--layer", "--unset", "grit");
        expect(layerText()).toBeUndefined();
        await ok("save", "load", "1");
        expect(layerText()).toBe("---\ngrit: 12/12\n---\n");
        expect(await ok("show", "Zanna")).toContain("grit: 12/12");
    });

    it("ADV-8: an adventure exported carries the layers as they are now, at the page's path, and says so", async () => {
        await ok("write", "Bog Hound", "--layer", "--set", "grit=12/12");
        makeSave(folder, context, undefined, "session zero");
        await ok("write", "Bog Hound", "--layer", "--set", "grit=14/14");
        const output = await ok("package", "export");
        expect(output).toContain("and the campaign's layers over the game system as they are now (Bog Hound)");
        const read = readAdventureZip(readFileSync(join(folder, "exports", "Guadoscuro.adventure.zip")), "Guadoscuro.adventure.zip");
        expect(new TextDecoder().decode(read.layers["world/creatures/Bog Hound.md"])).toBe("---\ngrit: 14/14\n---\n");
    });
});
