// Moving pages (MECCANICHE, CON-1–CON-10): the cases of the table, through the commands.
import { chmodSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { runCommandLine } from "../src/command-line.ts";
import { move } from "../src/commands/move.ts";
import type { Context } from "../src/core/context.ts";
import { makeTempFolder, readLogFile, removeFolder, testContext } from "./support.ts";

let folder: string;
let context: Context;

beforeEach(async () => {
    folder = makeTempFolder();
    context = testContext(folder);
    await runCommandLine(["init", "--name", "Guadoscuro", "--language", "it", "--system", "5e", "--difficulty", "normal", "--lethality", "dice"], context);
    await ok("write", "Ennio", "--type", "character", "--set", "role=pc");
    await ok("write", "Lena", "--type", "character", "--set", "role=companion");
    await ok("write", "Livia", "--type", "character", "--set", "role=companion", "--set", "status=dead");
    await ok("write", "Varro", "--type", "character", "--set", "role=npc");
    await ok("write", "Rosa", "--type", "character", "--set", "role=npc", "--set", "aliases=[la figlia del mugnaio]");
    await ok("write", "Lanterna", "--type", "item");
    await ok("write", "Zaino", "--type", "item", "--add", "contains=[[Lanterna]]");
    await ok("write", "Storia", "--type", "topic");
    await ok("write", "Ossario", "--type", "place", "--add", "contains=[[Ennio]]", "--add", "contains=[[Lena]]", "--add", "contains=[[Zaino]]");
    await ok("write", "Laboratorio", "--type", "place", "--add", "contains=[[Varro]]");
    await ok("write", "Cripta", "--type", "place", "--add", "contains=[[Ossario]]", "--add", "contains=[[Laboratorio]]");
    await ok("write", "Mulino", "--type", "place", "--add", "contains=[[Cripta]]");
    await ok("write", "Palude", "--type", "place", "--add", "contains=[[Mulino]]");
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

async function refused(...args: string[]): Promise<string>
{
    const result = await rpg(...args);
    expect(result.exitCode, result.output).toBe(1);
    return result.output;
}

function page(path: string): string
{
    return readFileSync(join(folder, "world", path), "utf8");
}

function writeByHand(path: string, text: string): void
{
    writeFileSync(join(folder, "world", path), text);
}

describe("rpg move (CON-4)", () => {
    it("CON-4, CON-8: moves several pages in one call; each is only in its new container, and the output says where they are and who else is there", async () => {
        expect(await ok("move", "Ennio", "Lena", "--to", "Laboratorio")).toBe("Moved Ennio, Lena: now in Laboratorio › Cripta › Mulino › Palude. There: Varro.");
        expect(page("places/Ossario.md")).toBe('---\ncontains:\n  - "[[Zaino]]"\n---\n');
        expect(page("places/Laboratorio.md")).toBe('---\ncontains:\n  - "[[Varro]]"\n  - "[[Ennio]]"\n  - "[[Lena]]"\n---\n');
        expect(await ok("show", "Lena")).toContain("Is in: Laboratorio › Cripta › Mulino › Palude");
    });

    it("CON-1, CON-4: an item goes into a character's inventory or into an item, and the chain climbs them", async () => {
        expect(await ok("move", "Lanterna", "--to", "Ennio")).toBe("Moved Lanterna: now in Ennio › Ossario › Cripta › Mulino › Palude.");
        expect(page("items/Zaino.md")).toBe("\n");
        expect(page("characters/Ennio.md")).toContain('inventory:\n  - "[[Lanterna]]"');
        expect(await ok("move", "Lanterna", "--to", "Zaino")).toBe("Moved Lanterna: now in Zaino › Ossario › Cripta › Mulino › Palude.");
        expect(await ok("move", "Zaino", "--to", "Lena")).toBe("Moved Zaino: now in Lena › Ossario › Cripta › Mulino › Palude.");
        expect(await ok("show", "Lanterna")).toContain("Is in: Zaino › Lena › Ossario");
    });

    it("CON-1: refuses what a container cannot hold, and a page whose type holds nothing, and writes nothing", async () => {
        expect(await refused("move", "Laboratorio", "--to", "Zaino")).toBe(
            "Zaino is an item: a place goes only into a place. For a world inside a thing, such as a lamp's, write a place with a link to Zaino. Nothing moved.",
        );
        expect(await refused("move", "Ennio", "--to", "Lena")).toBe("Lena is a character, who carries only items: to be with them, Ennio goes where Lena is. Nothing moved.");
        expect(await refused("move", "Laboratorio", "--to", "Varro")).toBe("Varro is a character: a place goes only into a place. Nothing moved.");
        expect(await refused("move", "Lanterna", "--to", "Storia")).toBe("Storia is a topic, which holds nothing: Lanterna goes into a place, a character or an item. Nothing moved.");
        expect(await refused("move", "Ennio", "--to", "Storia")).toBe("Storia is a topic, which holds nothing: Ennio goes into a place or an item. Nothing moved.");
        expect(await refused("move", "Mulino", "--to", "Storia")).toBe("Storia is a topic, which holds nothing: Mulino goes into a place. Nothing moved.");
        expect(await refused("move", "Storia", "--to", "Ossario")).toBe("Storia is a topic, which is nowhere: only places, characters and items are inside something. Nothing moved.");
        await ok("write", "Annegato", "--type", "creature", "--set", "hp=22/22");
        expect(await refused("move", "Annegato", "--to", "Ossario")).toBe(
            "Annegato is a creature, a kind: its copies enter a scene with scene, creatures; one in particular is a character with creature [[Annegato]]. Nothing moved.",
        );
        expect(await refused("move", "Lanterna", "Laboratorio", "--to", "Zaino")).toContain("Zaino is an item: a place goes only into a place.");
        expect(page("items/Zaino.md")).toBe('---\ncontains:\n  - "[[Lanterna]]"\n---\n');
        expect(await ok("move", "Ennio", "--to", "Zaino")).toBe("Moved Ennio: now in Zaino › Ossario › Cripta › Mulino › Palude.");
    });

    it("CON-3: refuses a ring: a container into itself or into what it holds", async () => {
        expect(await refused("move", "Mulino", "--to", "Ossario")).toBe("Mulino cannot go into Ossario, which is inside it: a thing is never inside itself. Nothing moved.");
        expect(await refused("move", "Cripta", "--to", "Cripta")).toBe("Cripta cannot go into itself: a thing is never inside itself. Nothing moved.");
        expect(await refused("move", "Lanterna", "Zaino", "--to", "Lanterna")).toBe("Lanterna cannot go into itself: a thing is never inside itself. Nothing moved.");
        await ok("move", "Lanterna", "--to", "Ossario");
        expect(await refused("move", "Zaino", "Ossario", "--to", "Zaino")).toBe("Zaino cannot go into itself: a thing is never inside itself. Nothing moved.");
    });

    it("CON-2, CON-4: takes out every entry that points to the page, however written and from every container; the destination keeps one", async () => {
        writeByHand("places/Ossario.md", '---\ncontains: ["[[ennio]]", "[[characters/Ennio.md|il ragazzo]]", "[[Lena]]"]\n---\n');
        writeByHand("places/Mulino.md", '---\ncontains: ["[[Cripta]]", "[[Ennio]]"]\n---\n');
        writeByHand("places/Laboratorio.md", '---\ncontains: ["[[Varro]]", "[[Ennio]]", "[[ENNIO]]"]\n---\n');
        expect(await ok("move", "Ennio", "--to", "Laboratorio")).toBe("Moved Ennio: now in Laboratorio › Cripta › Mulino › Palude. There: Varro.");
        expect(page("places/Ossario.md")).toBe('---\ncontains: ["[[Lena]]"]\n---\n');
        expect(page("places/Mulino.md")).toBe('---\ncontains: ["[[Cripta]]"]\n---\n');
        expect(page("places/Laboratorio.md")).toBe('---\ncontains: ["[[Varro]]", "[[Ennio]]"]\n---\n');
        expect(await ok("validate")).not.toContain("Ennio");
    });

    it("CON-4: says nothing changed when a page is already only there, and moving it again writes no file", async () => {
        expect(await ok("move", "Ennio", "--to", "[[Ossario]]")).toBe("Nothing changed: Ennio is already in Ossario.");
        await ok("move", "Ennio", "Varro", "--to", "Ossario");
        const before = page("places/Ossario.md");
        expect(await ok("move", "Varro", "Ennio", "--to", "Ossario")).toBe("Nothing changed: Varro, Ennio are already in Ossario.");
        expect(page("places/Ossario.md")).toBe(before);
        expect(await ok("move", "Ennio", "Zaino", "--to", "Laboratorio")).toBe("Moved Ennio, Zaino: now in Laboratorio › Cripta › Mulino › Palude.");
    });

    it("CON-4: finds pages by alias; refuses copies in the scene, pages that do not exist and a list to change written as text, writing nothing then", async () => {
        expect(await ok("move", "la figlia del mugnaio", "--to", "Mulino")).toBe("Moved Rosa: now in Mulino › Palude.");
        await ok("write", "Annegato", "--type", "creature", "--set", "hp=22/22");
        await ok("scene", "open", "--title", "Scontro", "--type", "combat", "--creatures", "Annegato=1");
        expect(await refused("move", "Annegato 1", "--to", "Mulino")).toBe("Annegato 1 is a copy in the open scene, which has no place of its own: it is where the scene is, and one that goes leaves with scene leave. Nothing moved.");
        expect(await refused("move", "Lanterna", "--to", "annegato 1")).toBe("Annegato 1 is a copy in the open scene, which holds nothing: give a place, a character or an item. Nothing moved.");
        expect(await refused("move", "Nessuno", "--to", "Mulino")).toBe(
            "There is no page named Nessuno. Look for it with find, or create it with write and its type: character, place, faction, quest, item, event, topic, creature. Nothing moved.",
        );
        expect(await refused("move", "Ossario#Note", "--to", "Mulino")).toBe("Give Ossario without #Note: whole pages move. Nothing moved.");

        writeByHand("places/Mulino.md", '---\ncontains: "[[Cripta]], [[Lanterna]]"\n---\n');
        expect(await refused("move", "Lanterna", "--to", "Ossario")).toBe('contains on Mulino is "[[Cripta]], [[Lanterna]]", not a list: write it as one first, such as write Mulino, set contains=[[A]], [[B]]. Nothing moved.');
        expect(page("items/Zaino.md")).toBe('---\ncontains:\n  - "[[Lanterna]]"\n---\n');
    });

    it("CON-5: a condition fires once, judged on the whole move; what links to a page that moved is noted, but for a living member of the party", async () => {
        await ok("write", "I dormienti", "--type", "event", "--set", "when=party in [[Laboratorio]]");
        await ok("write", "La fuga", "--type", "event", "--set", "by=[[Varro]]");
        await ok("write", "Un funerale", "--type", "quest", "--set", "status=open", "--text", "Seppellire [[Livia]] e avvisare [[Ennio]].");
        const moved = await ok("move", "Ennio", "Lena", "--to", "Laboratorio");
        expect(moved).toContain("\nNow due: I dormienti, since party in Laboratorio.");
        expect(moved).not.toContain("Linked to");
        expect(readLogFile(folder).filter((entry) => entry.type === "event-due")).toHaveLength(1);
        expect(await ok("move", "Varro", "--to", "Ossario")).toContain("\nLinked to Varro: La fuga. If one no longer goes as planned, write it: its status, date or by.");
        expect(await ok("move", "Livia", "--to", "Ossario")).toContain("\nLinked to Livia: Un funerale (quest, open).");
    });

    it("CON-6: the open scene goes with the party when all of it moves to one place; when only some move, it says scene leave", async () => {
        await ok("write", "Annegato", "--type", "creature", "--set", "hp=22/22");
        await ok("scene", "open", "--title", "Scontro all'ossario", "--type", "combat", "--creatures", "Annegato=1");
        expect(await ok("move", "Ennio", "--to", "Laboratorio")).toBe(
            "Moved Ennio: now in Laboratorio › Cripta › Mulino › Palude. There: Varro.\nEnnio left Ossario, where the open scene is: if they left the scene, scene leave, who Ennio.",
        );
        expect(readFileSync(join(folder, "state.yaml"), "utf8")).toContain('place: "[[Ossario]]"');
        expect(await ok("move", "Lena", "--to", "Laboratorio")).toBe(
            "Moved Lena: now in Laboratorio › Cripta › Mulino › Palude. There: Ennio, Varro.\nThe open scene, Scontro all'ossario, goes with them: now at Laboratorio, with Annegato 1. Close it if it ended in Ossario; scene leave whoever stays behind.",
        );
        expect(readFileSync(join(folder, "state.yaml"), "utf8")).toContain('place: "[[Laboratorio]]"');
        expect(readLogFile(folder).at(-1)).toMatchObject({ type: "scene-changed", visibility: "hidden", data: { title: "Scontro all'ossario", place: "[[Laboratorio]]" } });
        expect(await ok("move", "Varro", "--to", "Ossario")).not.toContain("scene");
    });

    it("CON-6: the scene follows the living party only when it moved, all of it, out of the scene's place", async () => {
        await ok("write", "Annegato", "--type", "creature", "--set", "hp=22/22");
        await ok("scene", "open", "--title", "Nella cripta", "--type", "exploration", "--place", "Cripta", "--creatures", "Annegato=2");
        expect(await ok("move", "Ennio", "--to", "Cripta")).toBe("Moved Ennio: now in Cripta › Mulino › Palude.");
        expect(await ok("move", "Ennio", "Lanterna", "--to", "Mulino")).toBe("Moved Ennio, Lanterna: now in Mulino › Palude.\nEnnio left Cripta, where the open scene is: if they left the scene, scene leave, who Ennio.");
        expect(await ok("move", "Ennio", "--to", "Cripta")).toBe("Moved Ennio: now in Cripta › Mulino › Palude.");
        await ok("write", "Lena", "--set", "status=dead");
        expect(await ok("move", "Ennio", "--to", "Palude")).toBe(
            "Moved Ennio: now in Palude.\nThe open scene, Nella cripta, goes with them: now at Palude, with Annegato 1, Annegato 2. Close it if it ended in Cripta; scene leave whoever stays behind.",
        );
        writeByHand("places/Palude.md", '---\ncontains: ["[[Mulino]]"]\n---\n');
        writeByHand("places/Laboratorio.md", '---\ncontains: ["[[Ennio]]"]\n---\n');
        expect(await ok("move", "Varro", "--to", "Laboratorio")).toBe("Moved Varro: now in Laboratorio › Cripta › Mulino › Palude. There: Ennio.");
        expect(readFileSync(join(folder, "state.yaml"), "utf8")).toContain('place: "[[Palude]]"');
        expect(await ok("move", "Ennio", "--to", "Palude")).toBe("Moved Ennio: now in Palude.");
    });

    it("CON-6: a member of the scene whose page is gone does not stop the move", async () => {
        await ok("scene", "open", "--title", "All'ossario", "--type", "exploration");
        rmSync(join(folder, "world", "characters", "Lena.md"));
        expect(await ok("move", "Ennio", "--to", "Mulino")).toBe(
            "Moved Ennio: now in Mulino › Palude.\nThe open scene, All'ossario, goes with them: now at Mulino. Close it if it ended in Ossario; scene leave whoever stays behind.",
        );
    });

    it("CON-6, CON-9: a ship with the party aboard takes the scene along, its line is public, and who is there shows the dead", async () => {
        await ok("write", "Mare", "--type", "place");
        await ok("write", "Porto", "--type", "place");
        await ok("write", "Nave", "--type", "place");
        await ok("move", "Nave", "--to", "Mare");
        await ok("move", "Ennio", "Lena", "--to", "Nave");
        await ok("move", "Livia", "--to", "Porto");
        await ok("scene", "open", "--title", "Tempesta", "--type", "challenge", "--place", "Mare");
        expect(await ok("move", "Nave", "--to", "Porto")).toBe(
            "Moved Nave: now in Porto. There: Livia (dead).\nThe open scene, Tempesta, goes with them: now at Porto. Close it if it ended in Mare; scene leave whoever stays behind.",
        );
        expect(readLogFile(folder).filter((entry) => entry.type === "moved").at(-1)).toMatchObject({ visibility: "public", data: { pages: ["Nave"], from: { Nave: "Mare" }, to: "Porto" } });
        expect(await ok("status")).not.toContain("in the files");
    });

    it("CON-1, CON-6 (D-156): a cart, an item, carries the party, and the scene follows them to the place the cart is in", async () => {
        await ok("write", "Strada", "--type", "place");
        await ok("write", "Carro", "--type", "item");
        await ok("move", "Carro", "--to", "Strada");
        await ok("scene", "open", "--title", "Partenza", "--type", "social");
        expect(await ok("move", "Ennio", "Lena", "--to", "Carro")).toBe(
            "Moved Ennio, Lena: now in Carro › Strada.\nThe open scene, Partenza, goes with them: now at Strada. Close it if it ended in Ossario; scene leave whoever stays behind.",
        );
        expect(await ok("show", "Lena")).toContain("Is in: Carro › Strada");
        expect(await ok("move", "Carro", "--to", "Mulino")).toBe("Moved Carro: now in Mulino › Palude.\nThe open scene, Partenza, goes with them: now at Mulino. Close it if it ended in Strada; scene leave whoever stays behind.");
    });

    it("CON-6: a scene without a place takes the one where all the party went", async () => {
        writeByHand("places/Ossario.md", '---\ncontains: ["[[Zaino]]"]\n---\n');
        await ok("scene", "open", "--title", "Nel buio", "--type", "exploration");
        expect(readFileSync(join(folder, "state.yaml"), "utf8")).not.toContain("place:");
        expect(await ok("move", "Ennio", "--to", "Mulino")).toBe("Moved Ennio: now in Mulino › Palude.");
        expect(await ok("move", "Lena", "--to", "Mulino")).toBe(
            "Moved Lena: now in Mulino › Palude. There: Ennio.\nThe open scene, Nel buio, goes with them: now at Mulino. Close it if it ended; scene leave whoever stays behind.",
        );
    });

    it("CON-9: one public line for the pages that concern the player, before or after, one hidden for the others, with where each was", async () => {
        await ok("move", "Zaino", "--to", "Ennio");
        await ok("move", "Lanterna", "Rosa", "--to", "Laboratorio");
        const [publicLine, hiddenLine] = readLogFile(folder).filter((entry) => entry.type === "moved").slice(-2);
        expect(publicLine).toMatchObject({ visibility: "public", data: { pages: ["Lanterna"], from: { Lanterna: "Zaino" }, to: "Laboratorio" } });
        expect(hiddenLine).toMatchObject({ visibility: "hidden", data: { pages: ["Rosa"], from: { Rosa: null }, to: "Laboratorio" } });
        expect(readLogFile(folder).filter((entry) => entry.type === "moved")[0]).toMatchObject({ visibility: "public", data: { pages: ["Zaino"], from: { Zaino: "Ossario" }, to: "Ennio" } });
    });

    it("CON-4: takes one text or a list, as MCP sends them, without blank names or the same page twice", async () => {
        const run = (input: { page: string | string[]; to: string; }) => move.format(move.run(input, context));
        expect(() => move.run({ page: [" "], to: "Ossario" }, context)).toThrow("Give what moves, such as page Ettore.");
        expect(run({ page: "Lanterna", to: "Lena" })).toBe("Moved Lanterna: now in Lena › Ossario › Cripta › Mulino › Palude.");
        expect(run({ page: ["Ennio", "ennio", "[[Ennio]]", ""], to: "Laboratorio" })).toBe("Moved Ennio: now in Laboratorio › Cripta › Mulino › Palude. There: Varro.");
        expect(run({ page: ["Ennio", "Lena", "Varro"], to: "Laboratorio" })).toBe("Moved Lena: now in Laboratorio › Cripta › Mulino › Palude. Already there: Ennio, Varro.");
    });

    it("CON-4: a page listed in the destination and elsewhere moves; entries written with text, a section or as text go; others stay", async () => {
        writeByHand("places/Mulino.md", '---\ncontains: ["[[Cripta]]", "[[Ennio]]", "[[Lena]]"]\n---\n');
        expect(await ok("move", "Ennio", "Lena", "--to", "Ossario")).toBe("Moved Ennio, Lena: now in Ossario › Cripta › Mulino › Palude.");
        expect(page("places/Mulino.md")).toBe('---\ncontains: ["[[Cripta]]"]\n---\n');
        writeByHand("places/Ossario.md", '---\ncontains: ["[[Ennio]]", "[[Ennio]] (dorme)", "il ragazzo [[Ennio]]", "[[Ennio#Note]]", "[[Lena]]", 42]\n---\n');
        await ok("move", "Ennio", "--to", "Laboratorio");
        expect(page("places/Ossario.md")).toBe('---\ncontains: ["[[Lena]]", 42]\n---\n');
        writeByHand("places/Mulino.md", '---\ncontains: ["[[Cripta]]", "[[Lena]]"]\n---\n');
        expect(await ok("move", "Lena", "Varro", "--to", "Ossario")).toBe("Moved Lena, Varro: now in Ossario › Cripta › Mulino › Palude.");
        expect(readLogFile(folder).filter((entry) => entry.type === "moved").slice(-2).map((entry) => [entry.visibility, entry.data.pages])).toEqual([["public", ["Lena"]], ["hidden", ["Varro"]]]);
        await ok("move", "Lena", "--to", "Laboratorio");
        expect(readLogFile(folder).at(-1)).toMatchObject({ type: "moved", visibility: "public", data: { pages: ["Lena"] } });
    });

    it("CON-4: refuses an entry that links the page with more, and a destination listed as text; leaves such entries alone when they are not about the page", async () => {
        writeByHand("places/Ossario.md", '---\ncontains: ["[[Ennio]] e [[Lena]]", "[[Zaino]]"]\n---\n');
        writeByHand("places/Rovine.md", '---\ncontains: "[[Statua]]"\n---\n');
        expect(await refused("move", "Ennio", "--to", "Laboratorio")).toBe('contains on Ossario has an entry with more than one link, "[[Ennio]] e [[Lena]]": write one link for each entry first. Nothing moved.');
        expect(await ok("move", "Zaino", "--to", "Laboratorio")).toBe("Moved Zaino: now in Laboratorio › Cripta › Mulino › Palude.");
        expect(page("places/Ossario.md")).toBe('---\ncontains: ["[[Ennio]] e [[Lena]]"]\n---\n');
        expect(await refused("move", "Lanterna", "--to", "Rovine")).toBe('contains on Rovine is "[[Statua]]", not a list: write it as one first, such as write Rovine, set contains=[[A]], [[B]]. Nothing moved.');
    });

    it("CON-1: a free page neither holds nor is held", async () => {
        writeFileSync(join(folder, "world", "Nota.md"), "Una nota.\n");
        expect(await refused("move", "Lanterna", "--to", "Nota")).toBe("Nota is a free page, which holds nothing: Lanterna goes into a place, a character or an item. Nothing moved.");
        expect(await refused("move", "Nota", "--to", "Ossario")).toBe("Nota is a free page, which is nowhere: only places, characters and items are inside something. Nothing moved.");
    });

    it("CON-8: names the files that could not be read, after what it says", async () => {
        writeFileSync(join(folder, "world", "places", "Rotto.md"), "---\nnome: [aperto\n---\n");
        expect(await ok("move", "Ennio", "--to", "Ossario")).toMatch(/^Nothing changed: Ennio is already in Ossario\.\n\nThese files could not be read as pages and were left out:\n- The frontmatter of world\/places\/Rotto\.md/);
        expect(await ok("move", "Varro", "--to", "Ossario")).toMatch(/^Moved Varro: now in Ossario › Cripta › Mulino › Palude\. There: Ennio, Lena\.\n\nThese files could not be read/);
    });

    it("takes the pages as a list on the command line, before the options, and its help says so", async () => {
        expect(await ok("move", "--help")).toContain("rpg move <page>... [options]");
        expect(await refused("move", "--to", "Mulino", "Ennio")).toBe("Unexpected argument: Ennio. Give the page before the options, and repeat an option for each of its values, such as --to A --to B.");
        expect(await ok("move", "Ennio", "Lena", "Zaino", "--to", "Mulino")).toBe("Moved Ennio, Lena, Zaino: now in Mulino › Palude.");
        expect(await refused("move", "Ennio, Lena", "--to", "Ossario")).toBe("There is no page named Ennio, Lena. For more than one, give a list, such as page [Ennio, Lena]. Nothing moved.");
    });

    it("CON-4: a page only written twice in the destination does not move: the double goes, and nothing else happens", async () => {
        await ok("write", "La fuga", "--type", "event", "--set", "by=[[Varro]]");
        writeByHand("places/Laboratorio.md", '---\ncontains: ["[[Varro]]", "[[varro]]"]\n---\n');
        const lines = readLogFile(folder).length;
        expect(await ok("move", "Varro", "--to", "Laboratorio")).toBe("Nothing changed: Varro is already in Laboratorio.");
        expect(page("places/Laboratorio.md")).toBe('---\ncontains: ["[[Varro]]"]\n---\n');
        expect(readLogFile(folder)).toHaveLength(lines);
    });

    it("CON-4: a file that cannot be written halfway says what was written, and the same move again finishes it", async () => {
        await ok("write", "I dormienti", "--type", "event", "--set", "when=party in [[Laboratorio]]");
        const laboratory = join(folder, "world", "places", "Laboratorio.md");
        chmodSync(laboratory, 0o444);
        const halfway = await refused("move", "Ennio", "Lena", "--to", "Laboratorio");
        chmodSync(laboratory, 0o644);
        expect(halfway).toMatch(/^world\/places\/Laboratorio\.md could not be written \(.+\)\. Written already: Ossario: fix it, then run the same move again, which finishes it\.$/);
        expect(await ok("move", "Ennio", "Lena", "--to", "Laboratorio")).toContain("Moved Ennio, Lena: now in Laboratorio › Cripta › Mulino › Palude. There: Varro.\nNow due: I dormienti");
    });
});

describe("containers in write and validate (CON-7, CON-10)", () => {
    it("CON-7: write refuses what move refuses, and points to move for a thing that is elsewhere", async () => {
        expect(await refused("write", "Zaino", "--add", "contains=[[Laboratorio]]")).toBe(
            "Zaino is an item: a place goes only into a place. For a world inside a thing, such as a lamp's, write a place with a link to Zaino.",
        );
        expect(await refused("write", "Zaino", "--add", "contains=[[Ennio]]")).toBe("Ennio is already in Ossario: a thing can be in one place only. To move it, use move, page Ennio, to Zaino.");
        expect(await refused("write", "Ennio", "--add", "contains=[[Lanterna]]")).toBe("Ennio is a character: what it holds goes in inventory, not contains.");
        expect(await refused("write", "Storia", "--add", "contains=[[Lanterna]]")).toBe(
            "Storia is a topic, which holds nothing, so contains would put nothing anywhere. A place holds places, characters and items; a character carries items; an item holds items.",
        );
        expect(await refused("write", "Ossario", "--add", "contains=[[Mulino]]")).toBe("Ossario cannot hold Mulino, which holds Ossario: a thing is never inside itself.");
        expect(await refused("write", "Ossario", "--add", "contains=[[Ossario]]")).toBe("Ossario cannot hold Ossario, which is itself: a thing is never inside itself.");
        expect(await refused("write", "Laboratorio", "--add", "contains=[[Ennio]]")).toBe("Ennio is already in Ossario: a thing can be in one place only. To move it, use move, page Ennio, to Laboratorio.");
        expect(await refused("write", "Torre", "--type", "place", "--set", "contains=[[Ennio]]")).toBe(
            "Ennio is already in Ossario: a thing can be in one place only. To move it, create Torre without it, then move, page Ennio, to Torre.",
        );
    });

    it("CON-7 (D-159): write changes a page's type, moving its file, when it still fits where it is and what it holds still fits in it", async () => {
        await ok("write", "Carro", "--type", "item", "--text", "Un carro coperto.");
        await ok("move", "Carro", "--to", "Ossario");
        expect(await ok("write", "Carro", "--type", "place")).toBe("Updated Carro (place, world/places/Carro.md): was an item (world/items/Carro.md).");
        expect(page("places/Carro.md")).toBe("Un carro coperto.\n");
        expect(await ok("show", "Carro")).toContain("Carro (place) · world/places/Carro.md\nIs in: Ossario › Cripta › Mulino › Palude");
        expect(await refused("write", "Cripta", "--type", "item")).toBe("Cripta holds Ossario, which an item does not hold there: move them out first, then change its type.");
        expect(await refused("write", "Ennio", "--type", "place", "--add", "inventory=[[Lanterna]]")).toBe("Ennio is a place: what it holds goes in contains, not inventory.");
        await ok("move", "Zaino", "--to", "Ennio");
        expect(await refused("write", "Zaino", "--type", "place")).toBe("Zaino is in Ennio, which holds no place: move it where a place can be first, then change its type.");
        await ok("write", "Lupo", "--type", "creature");
        await ok("write", "Bianco", "--type", "character", "--set", "creature=[[Lupo]]");
        expect(await refused("write", "Lupo", "--type", "item")).toBe("Lupo is the creature that Bianco derives from: as an item it would leave them deriving from nothing. Give them another creature first.");
        expect(await ok("validate")).toBe("No problems.");
    });

    it("CON-7: write checks only the entries it adds, removes an entry however written, and adds none twice", async () => {
        writeByHand("places/Pozzo.md", '---\ncontains: ["[[Pozzo]]"]\n---\n');
        await ok("write", "Ossario", "--add", "contains=[[Pozzo]]");
        await ok("write", "Ossario", "--add", "contains=[[Rosa]]");
        writeByHand("places/Ossario.md", '---\ncontains: ["[[ennio]]", "[[Lena]]"]\n---\n');
        expect(await ok("write", "Ossario", "--remove", "contains=[[Ennio]]")).toBe("Updated Ossario (place, world/places/Ossario.md): removed from contains.");
        expect(page("places/Ossario.md")).toBe('---\ncontains: ["[[Lena]]"]\n---\n');
        expect(await ok("write", "Ossario", "--add", "contains=[[lena]]")).toBe("Nothing changed on Ossario: it already reads like that.");
    });

    it("CON-10: validate finds a page listing itself, a ring, what a container cannot hold, and container fields a type does not use", async () => {
        writeByHand("places/Pozzo.md", '---\ncontains: ["[[Pozzo]]"]\n---\n');
        writeByHand("places/Torre.md", '---\ncontains: ["[[Scala]]"]\n---\n');
        writeByHand("places/Scala.md", '---\ncontains: ["[[Torre]]"]\n---\n');
        writeByHand("items/Zaino.md", '---\ncontains: ["[[Lanterna]]", "[[Rosa]]", "[[Laboratorio]]"]\n---\n');
        writeByHand("characters/Varro.md", '---\nrole: npc\ncontains: ["[[Storia]]"]\n---\n');
        writeByHand("topics/Storia.md", '---\ninventory: ["[[Lanterna]]"]\n---\n');
        const output = await ok("validate");
        expect(output).toContain("- world/places/Pozzo.md: Pozzo lists itself in contains: a thing is never inside itself. Fix: write Pozzo, remove contains=[[Pozzo]].");
        expect(output).toContain("- world/places/Scala.md: Scala is inside itself: Scala › Torre › Scala. Fix: move one of them out of the others, such as move Scala, to a place outside.");
        expect(output).toContain("- world/places/Torre.md: Torre is inside itself: Torre › Scala › Torre.");
        expect(output).toContain(
            "- world/items/Zaino.md: Zaino lists Laboratorio in contains, but an item holds items and characters, and Laboratorio is a place. Fix: move Laboratorio, to a container that holds it, such as a place; or write Zaino, remove contains=[[Laboratorio]].",
        );
        expect(output).toContain("- world/characters/Varro.md: Varro lists things in contains, but a character holds them in inventory. Fix: move each thing it lists into Varro, then write Varro, unset contains.");
        expect(output).toContain(
            "- world/topics/Storia.md: Storia is a topic, which holds nothing, so its inventory puts nothing anywhere. Fix: move each thing it lists into a place, a character or an item, then write Storia, unset inventory.",
        );
        expect(await ok("show", "Rosa")).toContain("Is in: Zaino › Ossario");
        expect(await ok("show", "Laboratorio")).toContain("Is in: Cripta › Mulino › Palude");
        expect(await ok("write", "Varro", "--remove", "contains=[[Storia]]")).toBe("Updated Varro (character, world/characters/Varro.md): removed from contains.");
    });
});
