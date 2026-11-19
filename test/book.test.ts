// The campaign's story told as a book (T-227): a chapter of prose for each closed scene, written by the master, out of the saves, and left out once a load
// undid its scene; the Journal's view gives the chapters the story holds.
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { runCommandLine } from "../src/cli/command-line.ts";
import type { Context } from "../src/core/context.ts";
import { unpackFiles } from "../src/saves/index.ts";
import { inPlay, makeTempFolder, removeFolder, testContext } from "./support.ts";

let folder: string;
let context: Context;

beforeEach(async () => {
    folder = makeTempFolder();
    context = testContext(folder);
    await ok("init", "--name", "Prova", "--system", "fake", "--language", "it", "--difficulty", "normal", "--lethality", "dice");
    inPlay(folder);
    await ok("write", "Iselde", "--type", "character", "--set", "role=pc");
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

async function scene(title: string, summary: string): Promise<string>
{
    await ok("scene", "open", "--title", title, "--type", "social");
    return ok("scene", "close", "--summary", summary);
}

async function book(): Promise<{ number: number; title: string; text: string; }[]>
{
    return JSON.parse(await ok("view", "--journal", "--json")).book;
}

describe("book", () => {
    it("asks for each closed scene's chapter and lists those still to write", async () => {
        expect(await ok("book")).toBe("No scene has closed yet: the book's first chapter comes with the first scene's end.");
        expect(await scene("Il porto", "Iselde arriva a Varra sotto la pioggia.")).toContain("Chapter 1 of the book waits for its prose: write it with book");
        await scene("Il faro", "Il vecchio aveva ragione: qualcuno è salito prima di loro.");
        await ok("scene", "open", "--title", "La lanterna", "--type", "exploration");

        const list = await ok("book");
        expect(list).toMatch(/^The book has 0 of 2 closed chapters\. To write, in order/);
        expect(list).toMatch(/\n1 «Il porto»: Iselde arriva a Varra sotto la pioggia\. \(chats: day \d{4}-\d{2}-\d{2}, from \d{2}:\d{2}:\d{2}, until \d{2}:\d{2}:\d{2}\)/);
        expect(list).toContain("\n2 «Il faro»");
        expect(await refused("book", "3", "--text", "…")).toContain("Chapter 3 is the scene still open: write it once the scene closes. Nothing written.");
        expect(await refused("book", "9", "--text", "…")).toContain("There is no chapter 9: the story has 3.");
    });

    it("writes a chapter in markdown under book/, reads it back, retitles it and takes it out", async () => {
        await scene("Il porto", "Iselde arriva a Varra.");
        await scene("Il faro", "Salgono al faro.");

        const text = "Pioveva da tre giorni, e Varra ne portava il peso.\r\n\r\n*Non tornerò*, pensò Iselde.\r\n\r\n***\r\n\r\nIl porto taceva.";
        expect(await ok("book", "1", "--text", text)).toBe("Chapter 1 «Il porto» written, 18 words: the player reads it in the Journal, under Story. Still to write: 2.");
        const file = readFileSync(join(folder, "book", "001.md"), "utf8");
        expect(file).toMatch(/^---\nchapter: 1\ntitle: Il porto\nscene: \S+\n---\n\nPioveva da tre giorni/);
        expect(file).not.toContain("\r");

        expect(await ok("book", "1")).toBe(`Chapter 1 «Il porto»:\n\n${text.replace(/\r\n/g, "\n")}`);
        expect(await ok("book", "2")).toMatch(/^Chapter 2 is not written yet\.\n2 «Il faro»: Salgono al faro\./);
        await ok("book", "1", "--title", "Sotto la pioggia");
        expect(await book()).toEqual([{ number: 1, title: "Sotto la pioggia", text: text.replace(/\r\n/g, "\n") }]);
        expect(await ok("view", "--journal")).toContain("The book: 1 chapter written; book reads one.");

        expect(await ok("book", "1", "--text", "")).toBe("Chapter 1 taken out of the book.");
        expect(existsSync(join(folder, "book", "001.md"))).toBe(false);
        expect(await book()).toEqual([]);
        expect(await ok("book")).toContain("The book has 0 of 2 closed chapters.");
    });

    it("keeps the book out of the saves and leaves out the chapters of the scenes a load undid", async () => {
        await ok("config", "saves", "free");
        await scene("Il porto", "Iselde arriva a Varra.");
        await ok("book", "1", "--text", "Il porto, com'era.");
        await ok("save", "make", "--label", "dopo il porto");
        await scene("Il faro", "Salgono al faro.");
        await ok("book", "2", "--text", "Il faro, com'era.");
        expect((await book()).map((chapter) => chapter.number)).toEqual([1, 2]);

        const saves = readdirSync(join(folder, ".saves")).filter((file) => file.endsWith(".zip"));
        expect(saves.flatMap((file) => Object.keys(unpackFiles(readFileSync(join(folder, ".saves", file)))).filter((path) => path.startsWith("book/")))).toEqual([]);

        // Loading the save made after the first scene: the second scene is undone, and its chapter with it, though its file stays until written again.
        const made = saves.find((file) => file.includes("dopo il porto")) ?? "";
        await ok("save", "load", String(Number.parseInt(made, 10)));
        expect((await book()).map((chapter) => chapter.number)).toEqual([1]);
        expect(existsSync(join(folder, "book", "002.md"))).toBe(true);

        // Another second scene: the old chapter is not its, until the master writes the new one in its place.
        await scene("La locanda", "Restano a Varra.");
        expect(await ok("book")).toContain("\n2 «La locanda»");
        // A book left behind, by a chat closed before its chapter was written, is told by status at the next session.
        expect(await ok("status")).toContain("The book lacks chapter 2, of scenes closed: write it with book before the story goes on; book lists them with their chats.");
        await ok("book", "2", "--text", "La locanda.");
        expect(await book()).toEqual([{ number: 1, title: "Il porto", text: "Il porto, com'era." }, { number: 2, title: "La locanda", text: "La locanda." }]);
    });
});
