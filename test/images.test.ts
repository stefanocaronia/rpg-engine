// Pictures of pages (D-267): the formats a picture can have, the image command, what a page inherits and what validate finds missing.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { runCommandLine } from "../src/command-line.ts";
import type { Context, PictureMaker } from "../src/core/context.ts";
import { FileStore, withFiles } from "../src/core/store.ts";
import { imageFileName, readImage } from "../src/images/index.ts";
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
        expect(await refused("image", "Nessuno", picture("a.png", png))).toBe("There is no page Nessuno: write it first, or look for its name with find.");
        expect(await refused("image", "Goblin", picture("a.png", png))).toBe(
            'Goblin is a creature of the game system 5e: read-only. Give the picture to a page of the campaign that derives from it, such as one made with write "Grak", type character, set creature=[[Goblin]]; then image Grak with the file. Nothing changed.',
        );
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

describe("pictures of places made from words (D-308, PIC-1–PIC-4)", () => {
    /** A picture maker that never spends: ready or not, and its picture or a refusal; it keeps the briefs it was given. */
    function maker(ready: true | string, made?: string): PictureMaker & { briefs: string[]; }
    {
        const briefs: string[] = [];
        return {
            briefs,
            ready: () => (ready === true ? { ready: true } : { ready: false, why: ready }),
            make: (brief) => {
                briefs.push(brief);
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
        expect(await refused("image", "Ennio", "--describe", "Un uomo")).toContain("describe makes pictures of places");
        context = { ...context, pictures: maker("Codex is not logged in on this computer") };
        expect(await refused("image", "Guado", "--describe", "Un guado di pietre")).toContain("Codex is not logged in on this computer. If your own tools make pictures");
        context = { ...context, pictures: made };
        await ok("config", "lines", "--add", "ragni");
        expect(await ok("image", "Guado", "--describe", "Un guado di pietre sotto la pioggia")).toContain("Guado's picture is now images/Guado.png");
        expect(page("places/Guado.md")).toContain('image: "[[Guado.png]]"');
        expect(made.briefs[0]).toContain("Primary request: Guado, as adventurers see it arriving: Un guado di pietre sotto la pioggia");
        expect(made.briefs[0]).toContain("Never show: ragni");
        expect(readLogFile(folder).at(-1)).toMatchObject({ type: "image-set", visibility: "public", data: { page: "Guado" } });
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
        expect(await ok("status")).toContain("Pictures: this computer can make the places' pictures");
        await ok("config", "pictures", "new places");
        expect(await ok("status")).toContain("Guado has no picture: once you have told it, have one made with image, page Guado, describe");
        expect(await ok("move", "Ennio", "--to", "Mulino")).toContain("Mulino has no picture");
        context = { ...context, pictures: maker("Codex is not installed on this computer") };
        await ok("config", "pictures", "none");
        expect(await ok("status")).not.toContain("picture");
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
