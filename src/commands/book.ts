import { z } from "zod";
import { requireCampaign } from "../campaign/index.ts";
import { appendLogEntry } from "../core/log.ts";
import { defineCommand } from "../core/registry.ts";
import { campaignBook, chapterCraft, removeChapter, type SceneChapter, sceneChapters, writeChapter } from "./shared/campaign/book.ts";
import { firstInChat } from "./shared/campaign/parts.ts";
import { newDatedLogEntry } from "./shared/time/time.ts";

// How many chapters still to write a list shows, the first; the others are counted.
const listedChapters = 20;
// The longest chapter the book takes, in characters.
const chapterLength = 60_000;

export const book = defineCommand({
    name: "book",
    description: "The campaign's story told as a book, which the player reads in the dashboard's Journal: a novel's chapter, never a summary, for each closed scene, by its number. "
        + "Write each once its scene closes. With nothing, it lists the closed chapters still to write, which is how a campaign begun without the book gets the story so far; "
        + "with chapter alone, it reads one back, so that the voice holds from one to the next; empty text takes it out. The first call in a chat says how to write them.",
    group: "game",
    positionals: ["chapter"],
    input: z.object({
        chapter: z.coerce.number().int().positive().optional().describe("the chapter's number, its scene's as the journal counts them"),
        title: z.string().optional().describe("the chapter's title, its scene's if left out"),
        text: z.string().optional().describe("the chapter's prose, in markdown; empty to take it out"),
    }),

    run(input, context)
    {
        const root = requireCampaign(context.folder);
        const scenes = sceneChapters(root);
        const written = campaignBook(root);
        const craft = firstInChat(context, "book") ? chapterCraft : undefined;
        const unwritten = (scene: SceneChapter): boolean => scene.to !== undefined && !written.some((chapter) => chapter.number === scene.number);

        if (input.chapter === undefined) {
            if (input.title !== undefined || input.text !== undefined) {
                throw new Error("Give chapter, the number of the chapter to write: book alone lists those still to write. Nothing written.");
            }

            return { kind: "list" as const, written: written.length, closed: scenes.filter((scene) => scene.to !== undefined).length, missing: scenes.filter(unwritten), craft };
        }

        const scene = closedScene(scenes, input.chapter);
        const before = written.find((chapter) => chapter.number === scene.number);

        if (input.text === undefined && input.title === undefined) {
            return { kind: "read" as const, scene, chapter: before, craft };
        }

        const text = (input.text ?? before?.text ?? "").replace(/\r\n?/g, "\n").trim().normalize("NFC");

        if (input.text !== undefined && text === "") {
            if (before !== undefined) {
                removeChapter(root, scene.number);
                appendLogEntry(root, newDatedLogEntry(root, context, "book-chapter", "hidden", { chapter: scene.number, removed: true }));
            }

            return { kind: "removed" as const, scene, had: before !== undefined };
        }

        if (text === "") {
            throw new Error(`Chapter ${scene.number} is not written yet: give its text with the title. Nothing written.`);
        }

        if (text.length > chapterLength) {
            throw new Error(`This chapter is ${text.length} characters, the book takes ${chapterLength}: tell the scene shorter. Nothing written.`);
        }

        const title = input.title?.trim() || before?.title || scene.title;
        writeChapter(root, scene, title, text);
        const words = text.split(/\s+/).filter((word) => word !== "").length;
        appendLogEntry(root, newDatedLogEntry(root, context, "book-chapter", "hidden", { chapter: scene.number, title, words }));
        return { kind: "written" as const, scene, title, words, left: scenes.filter((other) => other.number !== scene.number && unwritten(other)).map((other) => other.number) };
    },

    format(result)
    {
        const craft = "craft" in result && result.craft !== undefined ? `\n\n${result.craft}` : "";

        if (result.kind === "list") {
            if (result.closed === 0) {
                return `No scene has closed yet: the book's first chapter comes with the first scene's end.${craft}`;
            }

            if (result.missing.length === 0) {
                return `The book has every closed chapter, ${result.written}: write the next when its scene closes.${craft}`;
            }

            const lines = result.missing.slice(0, listedChapters).map(missingLine);
            const more = result.missing.length > listedChapters ? `\nAnd ${result.missing.length - listedChapters} more after them.` : "";
            return `The book has ${result.written} of ${result.closed} closed chapters. To write, in order, each from its chats first, then its summary and the pages:\n${lines.join("\n")}${more}${craft}`;
        }

        if (result.kind === "read") {
            return result.chapter === undefined
                ? `Chapter ${result.scene.number} is not written yet.\n${missingLine(result.scene)}${craft}`
                : `Chapter ${result.scene.number} «${result.chapter.title}»:\n\n${result.chapter.text}${craft}`;
        }

        if (result.kind === "removed") {
            return result.had ? `Chapter ${result.scene.number} taken out of the book.` : `Chapter ${result.scene.number} was not in the book: nothing changed.`;
        }

        const shown = result.left.slice(0, listedChapters).join(", ");
        const left = result.left.length === 0 ? "" : ` Still to write: ${shown}${result.left.length > listedChapters ? "…" : ""}.`;
        return `Chapter ${result.scene.number} «${result.title}» written, ${result.words} words: the player reads it in the Journal, under Story.${left}`;
    },
});

/** The closed scene that is a chapter's; stops the command for any other number. */
function closedScene(scenes: SceneChapter[], number: number): SceneChapter
{
    const scene = scenes.find((one) => one.number === number);

    if (scene === undefined) {
        throw new Error(`There is no chapter ${number}: the story has ${scenes.length}. book alone lists those still to write. Nothing written.`);
    }

    if (scene.to === undefined) {
        throw new Error(`Chapter ${number} is the scene still open: write it once the scene closes. Nothing written.`);
    }

    return scene;
}

/** A chapter to write: its title and game date, its summary, and when it ran in real time, for chats to read it. */
function missingLine(scene: SceneChapter): string
{
    const date = scene.date === undefined ? "" : `, ${scene.date}`;
    const summary = scene.summary === undefined ? "" : `: ${scene.summary}`;
    const otherDay = scene.to !== undefined && scene.to.slice(0, 10) !== scene.from.slice(0, 10) ? ` of ${scene.to.slice(0, 10)}` : "";
    const until = scene.to === undefined ? "" : `, until ${scene.to.slice(11, 19)}${otherDay}`;
    return `${scene.number} «${scene.title}»${date}${summary} (chats: day ${scene.from.slice(0, 10)}, from ${scene.from.slice(11, 19)}${until})`;
}
