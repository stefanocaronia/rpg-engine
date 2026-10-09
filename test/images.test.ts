// Pictures of pages (D-267): the formats a picture can have, the image command, what a page inherits and what validate finds missing.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { runCommandLine } from "../src/command-line.ts";
import type { Context } from "../src/core/context.ts";
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

    it("refuses an image field that is not a link", async () => {
        expect(await refused("write", "Ennio", "--set", "image=ennio.png")).toContain('"image" must be a link');
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
