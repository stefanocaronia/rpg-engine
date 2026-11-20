// The campaign's story told as a book (T-227): chapters of prose written by the master where the story turns, each telling the closed scenes since the last,
// out of the saves, and left out once a load undid their scenes; the Journal's view gives the chapters the story holds.
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

async function book(): Promise<{ number: number; title: string; text: string; first: number; last: number; }[]>
{
    return JSON.parse(await ok("view", "--journal", "--json")).book;
}

describe("book", () => {
    it("names the closed scenes waiting for the next chapter, firmly once they are many, and lists them with their chats", async () => {
        expect(await ok("book")).toMatch(/^The book has no chapter yet, and no closed scene waits for one/);
        expect(await scene("Il porto", "Iselde arriva a Varra sotto la pioggia.")).toContain("\nThe book: scene 1 waits for the next chapter; if the story turned here");
        expect(await scene("Il faro", "Il vecchio aveva ragione: qualcuno è salito prima di loro.")).toContain("\nThe book: scenes 1–2 wait for the next chapter; if the story turned here");
        await scene("La scala", "Trecento gradini.");
        expect(await scene("La lanterna", "La lanterna è spenta da anni.")).toContain("\nThe book: scenes 1–4 wait for the next chapter; write it now with book.");
        await ok("scene", "open", "--title", "Il ritorno", "--type", "exploration");

        const list = await ok("book");
        expect(list).toMatch(/^The book has 0 chapters; scenes 1–4 wait for the next\. Tell them in chapters/);
        expect(list).toMatch(/\n1 «Il porto»: Iselde arriva a Varra sotto la pioggia\. \(chats: day \d{4}-\d{2}-\d{2}, from \d{2}:\d{2}:\d{2}, until \d{2}:\d{2}:\d{2}\)/);
        expect(list).toContain("\n4 «La lanterna»");
        expect(list).not.toContain("Il ritorno");
        expect(await refused("book", "--through", "5", "--text", "…")).toContain("Scene 5 is not one still untold: give through between 1 and 4. Nothing written.");
        expect(await refused("book", "3", "--text", "…")).toContain("There is no chapter 3: the book has 0, and the next is 1. Nothing written.");
    });

    it("writes a chapter of the scenes since the last, through one when asked, reads it back, writes it again and takes the last out", async () => {
        await scene("Il porto", "Iselde arriva a Varra.");
        await scene("Il faro", "Salgono al faro.");
        await scene("La lanterna", "La lanterna è spenta.");

        const text = "Pioveva da tre giorni, e Varra ne portava il peso.\r\n\r\n*Non tornerò*, pensò Iselde.\r\n\r\n***\r\n\r\nIl faro taceva.";
        expect(await ok("book", "--through", "2", "--title", "Sotto la pioggia", "--text", text))
            .toBe("Chapter 1 «Sotto la pioggia», scenes 1–2, written, 18 words: the player reads it in the Journal, under Story. Still untold: 1 closed scene, for the next chapter.");
        const file = readFileSync(join(folder, "book", "001.md"), "utf8");
        expect(file).toMatch(/^---\nchapter: 1\ntitle: Sotto la pioggia\nscenes:\n {2}- \S+\n {2}- \S+\n---\n\nPioveva da tre giorni/);
        expect(file).not.toContain("\r");

        const prose = text.replace(/\r\n/g, "\n");
        expect(await ok("book", "1")).toBe(`Chapter 1 «Sotto la pioggia», scenes 1–2:\n\n${prose}`);
        expect(await ok("book", "--text", "La lanterna.")).toContain("Chapter 2 «La lanterna», scene 3, written, 2 words");
        expect(await ok("book")).toMatch(/^The book has 2 chapters, and no closed scene waits for one/);

        // Chapter 1 retitled keeps its scenes and its prose; a chapter is taken out only as the last.
        await ok("book", "1", "--title", "Varra");
        expect(await book()).toEqual([{ number: 1, title: "Varra", text: prose, first: 1, last: 2 }, { number: 2, title: "La lanterna", text: "La lanterna.", first: 3, last: 3 }]);
        expect(await ok("view", "--journal")).toContain("The book: 2 chapters written; book reads one.");
        expect(await refused("book", "1", "--text", "")).toContain("Chapter 1 has chapters after it: write it again, or take out the last first. Nothing written.");
        expect(await ok("book", "2", "--text", "")).toBe("Chapter 2 taken out of the book: its scenes wait for a chapter again.");
        expect(existsSync(join(folder, "book", "002.md"))).toBe(false);
        expect(await ok("book")).toContain("The book has 1 chapter; scene 3 waits for the next.");
    });

    it("keeps the book out of the saves and leaves out the chapters of the scenes a load undid", async () => {
        await ok("config", "saves", "free");
        await scene("Il porto", "Iselde arriva a Varra.");
        await ok("book", "--text", "Il porto, com'era.");
        await ok("save", "make", "--label", "dopo il porto");
        await scene("Il faro", "Salgono al faro.");
        await ok("book", "--text", "Il faro, com'era.");
        expect((await book()).map((chapter) => chapter.number)).toEqual([1, 2]);

        const saves = readdirSync(join(folder, ".saves")).filter((file) => file.endsWith(".zip"));
        expect(saves.flatMap((file) => Object.keys(unpackFiles(readFileSync(join(folder, ".saves", file)))).filter((path) => path.startsWith("book/")))).toEqual([]);

        // Loading the save made after the first scene: the second scene is undone, and its chapter with it, though its file stays until written again.
        const made = saves.find((file) => file.includes("dopo il porto")) ?? "";
        await ok("save", "load", String(Number.parseInt(made, 10)));
        expect((await book()).map((chapter) => chapter.number)).toEqual([1]);
        expect(existsSync(join(folder, "book", "002.md"))).toBe(true);

        // Other scenes after it: the old chapter is not theirs, until the master writes the new one in its place.
        for (const title of ["La locanda", "La notte", "Il mercato", "La partenza"]) {
            await scene(title, "Restano a Varra.");
        }

        expect(await ok("book")).toContain("\n2 «La locanda»");
        // A book left behind, by a chat closed before its chapter was written, is told by status at the next session.
        expect(await ok("status")).toContain("The book is behind: scenes 2–5 wait for their chapter. Write it with book before the story goes on; book lists them with their chats.");
        await ok("book", "--text", "La locanda.");
        expect(await book()).toEqual([{ number: 1, title: "Il porto", text: "Il porto, com'era.", first: 1, last: 1 }, { number: 2, title: "La locanda", text: "La locanda.", first: 2, last: 5 }]);
        expect(await ok("status")).not.toContain("The book is behind");
    });
});
