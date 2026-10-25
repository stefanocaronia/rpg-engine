// Pictures of pages (D-267): the formats a picture can have, the image command, what a page inherits and what validate finds missing.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { runCommandLine } from "../src/command-line.ts";
import type { Context, PictureMaker } from "../src/core/context.ts";
import { FileStore, withFiles } from "../src/core/store.ts";
import { imageFileName, readImage } from "../src/images/index.ts";
import { paintedBrief } from "../src/pictures/index.ts";
import { inPlay, makeTempFolder, readLogFile, removeFolder, testContext } from "./support.ts";

const png = Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13]);
const jpeg = Uint8Array.from([0xff, 0xd8, 0xff, 0xe0, 0, 16]);
const webp = new TextEncoder().encode("RIFF\0\0\0\0WEBPVP8 ");
const svg = new TextEncoder().encode('<?xml version="1.0"?>\n<!-- an icon -->\n<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><path d="M0 0h512v512H0z"/></svg>');

let folder: string;
let pictures: string;
let context: Context;

beforeEach(async () => {
    folder = makeTempFolder();
    pictures = makeTempFolder();
    context = testContext(folder);
    await ok("init", "--name", "Guadoscuro", "--language", "it", "--system", "5e", "--difficulty", "normal", "--lethality", "dice");
    inPlay(folder);
    await ok("write", "Ennio", "--type", "character", "--set", "role=pc");
    await ok("write", "Lupo", "--type", "creature");
    await ok("write", "Bianco", "--type", "character", "--set", "role=npc", "--set", "creature=[[Lupo]]");
});

afterEach(() => {
    removeFolder(folder);
    removeFolder(pictures);
});

describe("readImage", () => {
    it("knows a picture by its bytes, whatever its extension", () => {
        const cases: [Uint8Array, string][] = [[png, "png"], [jpeg, "jpg"], [webp, "webp"], [svg, "svg"]];

        for (const [bytes, extension] of cases) {
            const path = picture("picture.bin", bytes);
            expect(withFiles(new FileStore(), () => readImage(path))).toEqual({ bytes, extension });
        }
    });

    it("refuses what is not a picture, a picture too large and a missing file, saying how to fix it", () => {
        const read = (path: string) => withFiles(new FileStore(), () => readImage(path));
        expect(read(picture("notes.png", new TextEncoder().encode("<html><body>no</body></html>")))).toEqual({ problem: "notes.png is not a PNG, JPEG, WebP or SVG picture: convert it to one of those, or give another file." });
        const large = new Uint8Array(6 * 1024 * 1024);
        large.set(png);
        expect(read(picture("large.png", large))).toEqual({ problem: "large.png is 6 MB, and a picture can be 5 MB at most: make it smaller (512 pixels a side are enough)." });
        expect(read(join(pictures, "none.png"))).toEqual({ problem: `There is no file at ${join(pictures, "none.png")}: give the full path of the picture.` });
    });

    it("reads the file name of an image field's link", () => {
        expect(imageFileName("[[ettore.webp]]")).toBe("ettore.webp");
        expect(imageFileName("[[Lupo grigio.png|il lupo]]")).toBe("Lupo grigio.png");
        expect(imageFileName("ettore.webp")).toBeUndefined();
        expect(imageFileName(undefined)).toBeUndefined();
    });
});

describe("image", () => {
    it("copies the picture into images, named after the page with the extension of its format, links it and logs it", async () => {
        const from = picture("ritratto.jpg", png);
        expect(await ok("image", "Ennio", from)).toBe(`Ennio's picture is now images/Ennio.png, copied from ${from}.`);
        expect(readFileSync(join(folder, "images", "Ennio.png"))).toEqual(Buffer.from(png));
        expect(page("characters/Ennio.md")).toContain('image: "[[Ennio.png]]"');
        expect(readLogFile(folder).at(-1)).toMatchObject({ type: "image-set", visibility: "public", data: { page: "Ennio", image: "images/Ennio.png" } });
        expect(await ok("validate")).toBe("No problems.");
    });

    it("takes a file already in images without copying it", async () => {
        mkdirSync(join(folder, "images"));
        writeFileSync(join(folder, "images", "Ennio.svg"), svg);
        expect(await ok("image", "Ennio", join(folder, "images", "Ennio.svg"))).toBe("Ennio's picture is now images/Ennio.svg.");
    });

    it("replaces the page's picture, and removes the old file unless another page links it", async () => {
        await ok("image", "Ennio", picture("a.png", png));
        await ok("image", "Ennio", picture("b.webp", webp));
        expect(existsSync(join(folder, "images", "Ennio.png"))).toBe(false);
        expect(page("characters/Ennio.md")).toContain('image: "[[Ennio.webp]]"');

        await ok("write", "Rosa", "--type", "character", "--set", "role=npc", "--set", "image=[[Ennio.webp]]");
        await ok("image", "Ennio", picture("c.png", png));
        expect(existsSync(join(folder, "images", "Ennio.webp"))).toBe(true);
    });

    it("shows the picture of the page it derives from, and goes back to it when its own is removed", async () => {
        await ok("image", "Lupo", picture("lupo.png", png));
        expect(await ok("image", "Bianco")).toBe("Bianco has no picture of its own: it shows the picture of Lupo.");
        expect(await ok("show", "Bianco")).toContain(`Fields inherited from Lupo:
image: "[[Lupo.png]]"`);

        await ok("image", "Bianco", picture("bianco.svg", svg));
        expect(await ok("image", "Bianco")).toBe("Bianco has no picture of its own any more: it shows the picture of Lupo.");
        expect(existsSync(join(folder, "images", "Bianco.svg"))).toBe(false);
        expect(page("characters/Bianco.md")).not.toContain("image");
        expect(readLogFile(folder).at(-1)).toMatchObject({ type: "image-removed", data: { page: "Bianco" } });
        expect(await ok("image", "Ennio")).toBe("Ennio has no picture of its own: it has none now.");
    });

    it("refuses what is not a picture, a page that does not exist and a page of the game system, changing nothing", async () => {
        expect(await refused("image", "Ennio", picture("notes.txt", new TextEncoder().encode("hello")))).toBe(
            "notes.txt is not a PNG, JPEG, WebP or SVG picture: convert it to one of those, or give another file. Nothing changed.",
        );
        expect(await refused("image", "Nessuno", picture("a.png", png))).toBe("There is no page Nessuno: write it first, or look for its name with find. Nothing changed.");
        // A creature of the game system: a creature of the campaign that derives from it takes the picture, and enters the scenes in its place (D-420).
        expect(await refused("image", "Goblin", picture("a.png", png))).toBe(
            'Goblin is a creature of the game system 5e: read-only. Write a creature of the campaign that derives from it: write "<name>", type creature, set creature=[[Goblin]]; '
                + 'give that its picture with image, and bring it into scenes in place of Goblin, as creatures "<name>"=2. Nothing changed.',
        );
        expect(await refused("image", "Dagger", picture("a.png", png))).toContain("Dagger is an item of the game system 5e: read-only. Give the picture to a page of the campaign that derives from it");
        expect(existsSync(join(folder, "images"))).toBe(false);
    });
});

describe("validate", () => {
    it("finds a page whose picture is in no images folder", async () => {
        await ok("write", "Rosa", "--type", "character", "--set", "role=npc", "--set", "image=[[rosa.png]]");
        expect(await ok("validate")).toBe(
            "1 problem:\n- world/characters/Rosa.md: image links rosa.png, which is in no images folder, of the campaign or of its game system. Fix: give Rosa its picture again with image, or write the name of a file in images/.",
        );
    });

    it("finds a picture in the game system's images folder, as a page derived from its creature shows it", async () => {
        await ok("write", "Grak", "--type", "character", "--set", "role=npc", "--set", "creature=[[Goblin]]");
        expect(await ok("image", "Grak")).toBe("Grak has no picture of its own: it shows the picture of Goblin.");
        await ok("write", "Rosa", "--type", "character", "--set", "role=npc", "--set", "image=[[goblin-head.svg]]");
        expect(await ok("validate")).toBe("No problems.");
    });

    it("refuses an image field that is not a link", async () => {
        expect(await refused("write", "Ennio", "--set", "image=ennio.png")).toContain('"image" must be a link');
    });
});

describe("pictures of places, quests, the party and those met made from words (D-308, D-408, D-420, PIC-1–PIC-4)", () => {
    /** A picture maker that never spends: ready or not, and its picture or a refusal; it keeps the briefs it was given. */
    function maker(ready: true | string, made?: string): PictureMaker & { briefs: string[]; }
    {
        const briefs: string[] = [];
        return {
            briefs,
            ready: () => (ready === true ? { ready: true } : { ready: false, why: ready }),
            make: (subject) => {
                briefs.push(paintedBrief(subject));
                return Promise.resolve(made === undefined ? { refused: "the generator's safety check refused it" } : { file: made, done: () => undefined });
            },
        };
    }

    beforeEach(async () => {
        await ok("write", "Guado", "--type", "place", "--add", "contains=[[Ennio]]");
        await ok("write", "Mulino", "--type", "place");
    });

    it("has a place's picture made only where the campaign wants pictures and this computer can, from what the party sees, never what the table keeps out", async () => {
        const made = maker(true, picture("made.png", png));
        context = { ...context, pictures: made };
        expect(await refused("image", "Guado", "--describe", "Un guado di pietre")).toContain("makes no pictures (pictures: not chosen)");
        await ok("config", "pictures", "new places");
        await ok("write", "Bisaccia", "--type", "item");
        expect(await refused("image", "Bisaccia", "--describe", "Una bisaccia")).toContain("describe makes pictures of places, quests, characters and creatures, and Bisaccia is an item");
        context = { ...context, pictures: maker("Codex is not logged in on this computer") };
        expect(await refused("image", "Guado", "--describe", "Un guado di pietre")).toContain("Codex is not logged in on this computer. If your own tools make pictures");
        context = { ...context, pictures: made };
        await ok("config", "lines", "--add", "ragni");
        expect(await ok("image", "Guado", "--describe", "Un guado di pietre sotto la pioggia")).toContain("Guado's picture is now images/Guado.png");
        expect(page("places/Guado.md")).toContain('image: "[[Guado.png]]"');
        expect(made.briefs[0]).toContain("Primary request: Guado, as adventurers see it arriving: Un guado di pietre sotto la pioggia");
        expect(made.briefs[0]).toContain("Never show: ragni");
        expect(readLogFile(folder).at(-1)).toMatchObject({ type: "image-set", visibility: "public", data: { page: "Guado" } });
        // A quest's picture: what the character knows of it, as the banner of its card (D-388).
        await ok("write", "Il guado", "--type", "quest", "--set", "status=open");
        expect(await ok("image", "Il guado", "--describe", "Pellegrini spariti al guado")).toContain("Il guado's picture is now images/Il guado.png");
        expect(made.briefs[1]).toContain("Asset type: wide low banner for a quest card of a tabletop role-playing game, landscape, 16:6");
        expect(made.briefs[1]).toContain("Primary request: the quest Il guado, as an emblem of what it is about: Pellegrini spariti al guado");
        expect(made.briefs[1]).toContain("Never show: ragni");
        // The portrait of one of the party, as the player described them, for the round token (D-408).
        // Exactly what the game says they are: the page they derive from, as their people, before the look described.
        await ok("write", "Nani delle colline", "--type", "creature");
        await ok("write", "Mira", "--type", "character", "--set", "role=companion", "--set", "creature=[[Nani delle colline]]");
        expect(await ok("image", "Mira", "--describe", "Una chierica dai capelli grigi, lo sguardo stanco")).toContain("Mira's picture is now images/Mira.png");
        expect(made.briefs[2]).toContain("Asset type: square portrait for the round token of a character of a tabletop role-playing game, 1:1");
        expect(made.briefs[2]).toContain("Primary request: a portrait of Mira, Nani delle colline");
        expect(made.briefs[2]).toContain(": Una chierica dai capelli grigi, lo sguardo stanco");
        expect(made.briefs[2]).toContain("first their people as this game world has them");
        expect(made.briefs[2]).toContain("Never show: ragni");
    });

    it("goes on without a picture the generator refuses, and never tries again by itself", async () => {
        await ok("config", "pictures", "on request");
        const made = maker(true);
        context = { ...context, pictures: made };
        expect(await refused("image", "Guado", "--describe", "Un altare insanguinato")).toContain("No picture of Guado: the generator's safety check refused it");
        expect(made.briefs).toHaveLength(1);
        expect(readLogFile(folder).at(-1)).toMatchObject({ type: "image-refused", visibility: "hidden", data: { page: "Guado" } });
    });

    it("in the MCP server, answers at once and the picture comes by itself", async () => {
        await ok("config", "pictures", "new places");
        context = { ...context, pictures: maker(true, picture("made.png", png)), files: new FileStore(context.systemFolders) };
        expect(await ok("image", "Guado", "--describe", "Un guado")).toContain("Guado's picture is being made");
        await new Promise((resolve) => setTimeout(resolve, 50));
        expect(page("places/Guado.md")).toContain("[[Guado.png]]");
    });

    it("asks the master to ask the player once where pictures can be made, then for the place the party is in without one", async () => {
        context = { ...context, pictures: maker(true) };
        expect(await ok("status")).toContain("Pictures: this computer can make the pictures of places, quests and those met");
        // new places and new places and quests, as campaigns wrote it before quests and then those met had pictures, are the value that took their place (D-388, D-420).
        await ok("config", "pictures", "new places");
        expect(await ok("config", "pictures")).toContain("pictures: new elements");
        await ok("config", "pictures", "new places and quests");
        expect(await ok("config", "pictures")).toContain("pictures: new elements");
        // Written by hand, as campaigns had it, it reads the same, and validate finds nothing wrong with it.
        const settings = join(folder, "campaign.yaml");

        for (const old of ["new places", "new places and quests"]) {
            writeFileSync(settings, readFileSync(settings, "utf8").replace(/^pictures: .*$/m, `pictures: ${old}`));
            expect(await ok("config", "pictures")).toContain("pictures: new elements");
            expect(await ok("validate")).not.toContain("pictures");
        }

        expect(await ok("status")).toContain("Guado has no picture: once you have told it, have one made with image, page Guado, describe");
        expect(await ok("move", "Ennio", "--to", "Mulino")).toContain("Mulino has no picture");
        // A quest that opens without a picture asks for one too, once (D-388).
        expect(await ok("write", "Il guado", "--type", "quest", "--set", "status=open")).toContain(
            "Il guado has no picture: have one made with image, page Il guado, describe the quest as the character knows it, never what they do not know.",
        );
        expect(await ok("write", "Il guado", "--set", "giver=Ennio")).not.toContain("has no picture");
        context = { ...context, pictures: maker("Codex is not installed on this computer") };
        await ok("config", "pictures", "none");
        expect(await ok("status")).not.toContain("picture");
        expect(await ok("write", "La torre", "--type", "quest", "--set", "status=open")).not.toContain("has no picture");
    });

    it("has the token of one met made from what the character sees, named and derived only as far as it knows them, one for each kind of creature", async () => {
        await ok("config", "pictures", "on request");
        const made = maker(true, picture("made.png", png));
        context = { ...context, pictures: made };
        await ok("write", "Brigante", "--type", "creature", "--set", "creature=[[Bandit]]");
        await ok("write", "Varro", "--type", "character", "--set", "role=npc", "--set", "creature=[[Brigante]]");
        // Not known: neither the name nor what they derive from reaches the brief, only what is seen.
        expect(await ok("image", "Varro", "--describe", "Un uomo incappucciato, la barba grigia")).toContain("Varro's picture is now images/Varro.png");
        expect(made.briefs[0]).toContain("Asset type: square portrait for the round token of a character");
        expect(made.briefs[0]).toContain("Primary request: a portrait of someone: Un uomo incappucciato, la barba grigia");
        expect(made.briefs[0]).not.toMatch(/Varro|Brigante|Bandit|Faithfulness/);
        expect(await ok("image", "Brigante", "--describe", "Un predone col volto coperto")).toContain("Brigante's picture is now images/Brigante.png");
        expect(made.briefs[1]).toContain("Asset type: square picture of a creature for the round token");
        expect(made.briefs[1]).toContain("a close-up of the head, its face or muzzle centred");
        expect(made.briefs[1]).toContain("Primary request: the head of a creature: Un predone col volto coperto");
        expect(made.briefs[1]).not.toMatch(/Brigante|Bandit/);
        // Known: by name, with what it knows they derive from.
        await ok("write", "Ennio", "--add", "knows=[[Varro]]", "--add", "knows=[[Brigante]]");
        await ok("image", "Varro", "--describe", "Il mugnaio");
        expect(made.briefs[2]).toContain("Primary request: a portrait of Varro, Brigante: Il mugnaio");
        expect(made.briefs[2]).not.toContain("Bandit");
        // A creature of the game system is never in knows: the brief names Brigante alone.
        await ok("image", "Brigante", "--describe", "Un predone");
        expect(made.briefs[3]).toContain("Primary request: the head of Brigante: Un predone");
        // A copy shows its creature's picture; a creature of the game system is read-only.
        await ok("scene", "open", "--title", "Agguato", "--type", "combat", "--with", "Ennio", "--creatures", "Brigante=2", "--creatures", "Goblin");
        expect(await refused("image", "Brigante 1", "--describe", "Un predone")).toBe(
            "Brigante 1 is a copy of Brigante in the scene, and shows its creature's picture, one for all its copies. Give it to Brigante: image Brigante, with file or describe. Nothing changed.",
        );
        expect(await refused("image", "Goblin 1", "--describe", "Un goblin")).toContain(
            'Goblin 1 is a copy of Goblin in the scene, and shows its creature\'s picture, one for all its copies. Goblin is a creature of the game system 5e: read-only. Write a creature of the campaign that derives from it: write "<name>", type creature, set creature=[[Goblin]]',
        );
    });

    it("shows a stranger's own picture by a name that tells nothing, never one of what they derive from nor the system's (D-420, VIEW-6)", async () => {
        await ok("write", "Brigante", "--type", "creature", "--set", "creature=[[Bandit]]");
        await ok("write", "Varro", "--type", "character", "--set", "role=npc", "--set", "creature=[[Brigante]]");
        await ok("write", "Oste", "--type", "character", "--set", "role=npc");
        await ok("image", "Brigante", picture("b.png", png));
        await ok("image", "Oste", picture("o.svg", svg));
        await ok(
            "scene",
            "open",
            "--title",
            "Rissa",
            "--type",
            "combat",
            "--with",
            "Ennio",
            "--with",
            "Varro",
            "--with",
            "Oste",
            "--creatures",
            "Brigante=2",
            "--creatures",
            "Goblin",
            "--seen",
            "Varro=uomo incappucciato",
            "--seen",
            "Oste=uomo col grembiule",
        );
        const scene = JSON.parse(await ok("view", "--json")).openScene;
        const hidden = (file: string) => ({ file: expect.stringMatching(new RegExp(`^[0-9a-f]{24}\\.${file}$`)), version: expect.any(Number) });
        expect(scene.who).toEqual([
            expect.objectContaining({ name: "Ennio", role: "pc" }),
            expect.not.objectContaining({ image: expect.anything() }),
            expect.objectContaining({ name: "uomo col grembiule", stranger: true, image: hidden("svg") }),
            expect.objectContaining({ name: "creature A", stranger: true, count: 2, image: hidden("png") }),
            expect.not.objectContaining({ image: expect.anything() }),
        ]);
        expect(scene.fighters.map((fighter: { image?: unknown; }) => fighter.image !== undefined)).toEqual([false, false, true, true, true, false]);
        // Neither the file's name nor anything else tells who they are.
        expect(JSON.stringify(scene)).not.toMatch(/Varro|Oste|Brigante|Goblin|Bandit/);
        // Their rolls, in view, show them as the scene does, the copies by their creature's, the system's none (D-421).
        await ok("config", "master-rolls", "in view");
        await ok("roll", "1d20+3", "--who", "Brigante 1", "--check", "Scimitarra");
        await ok("roll", "1d20", "--who", "Oste", "--check", "Furtività");
        await ok("roll", "1d20", "--who", "Goblin 1", "--check", "Furtività");
        const rolls = JSON.parse(await ok("view", "--json")).rolls.slice(-3);
        expect(rolls.map((roll: { who: string; image?: unknown; }) => [roll.who, roll.image])).toEqual([["creature", hidden("png")], ["uomo col grembiule", hidden("svg")], ["creature", undefined]]);
        expect(JSON.stringify(rolls)).not.toMatch(/Varro|Oste|Brigante|Goblin|Bandit/);
        // Known, they show it by its own name.
        await ok("write", "Ennio", "--add", "knows=[[Oste]]");
        expect(JSON.parse(await ok("view", "--json")).openScene.who[2]).toMatchObject({ name: "Oste", image: { file: "Oste.svg" } });
    });

    it("shows no face in the rolls of one no scene named, as one who acts out of sight (D-421)", async () => {
        await ok("write", "Duca", "--type", "character", "--set", "role=npc");
        await ok("image", "Duca", picture("d.svg", svg));
        await ok("roll", "1d20+5", "--who", "Duca", "--check", "Inganno", "--no-hidden");
        expect(JSON.parse(await ok("view", "--json")).rolls.at(-1)).toMatchObject({ who: "someone", stranger: true });
        expect(JSON.parse(await ok("view", "--json")).rolls.at(-1).image).toBeUndefined();
    });

    it("reminds the master, as one met without a picture enters a scene, to have theirs made from what the character sees", async () => {
        await ok("write", "Brigante", "--type", "creature", "--set", "creature=[[Bandit]]");
        await ok("write", "Varro", "--type", "character", "--set", "role=npc");
        await ok("write", "Lena", "--type", "character", "--set", "role=companion");
        await ok("config", "pictures", "on request");
        expect(await ok("scene", "open", "--title", "Agguato", "--type", "combat", "--with", "Ennio", "--with", "Lena", "--with", "Varro", "--creatures", "Brigante=2")).not.toContain("picture");
        await ok("scene", "close", "--summary", "Fuggiti.");
        await ok("config", "pictures", "new elements");
        const opened = await ok("scene", "open", "--title", "Agguato", "--type", "combat", "--with", "Ennio", "--with", "Lena", "--with", "Varro", "--creatures", "Brigante=2", "--creatures", "Goblin");
        // The party's portraits are made when the player asks (D-408); a kind of creature is named once, whatever its copies.
        expect(opened).toContain("No picture yet of Varro, Brigante: have each made with image, page and describe, what the character sees, never what it does not know.");
        expect(opened).toContain('Goblin is of the game system: for a picture, write a creature of the campaign from it, as write "<name>", type creature, set creature=[[Goblin]], and bring that in.');
        expect(opened).not.toMatch(/No picture yet of [^:]*(Ennio|Lena)/);
        await ok("image", "Varro", picture("varro.png", png));
        await ok("image", "Brigante", picture("brigante.png", png));
        await ok("write", "Oste", "--type", "character", "--set", "role=npc");
        const added = await ok("scene", "add", "--with", "Oste", "--creatures", "Brigante");
        expect(added).toContain("No picture yet of Oste: have each made");
        expect(added).not.toContain("Brigante:");
        expect(await ok("scene", "add", "--creatures", "Brigante")).not.toContain("picture");
    });
});

function picture(name: string, bytes: Uint8Array): string
{
    const path = join(pictures, name);
    writeFileSync(path, bytes);
    return path;
}

function page(path: string): string
{
    return readFileSync(join(folder, "world", path), "utf8");
}

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
