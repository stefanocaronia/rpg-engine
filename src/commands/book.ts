import { z } from "zod";
import { requireCampaign } from "../campaign/index.ts";
import type { Context } from "../core/context.ts";
import { appendLogEntry } from "../core/log.ts";
import { defineCommand } from "../core/registry.ts";
import { campaignBook, chapterCraft, removeChapter, scenesText, type StoryScene, storyScenes, untoldScenes, writeChapter } from "./shared/campaign/book.ts";
import { firstInChat } from "./shared/campaign/parts.ts";
import { newDatedLogEntry } from "./shared/time/time.ts";

// How many scenes still untold a list shows, the first; the others are counted.
const listedScenes = 20;
// The longest chapter the book takes, in characters.
const chapterLength = 80_000;

export const book = defineCommand({
    name: "book",
    description: "The campaign's story told as a book, which the player reads in the dashboard's Journal: chapters of a novel, never summaries, each telling the scenes closed since the last one, "
        + "ended where the story turns. With nothing, it lists the closed scenes no chapter tells yet, which is how a campaign begun without the book gets the story so far; "
        + "text writes the next chapter, of those scenes or of those through one; with chapter alone, it reads one back, so that the voice holds from one to the next, and with text it writes it again; "
        + "empty text takes the last out. The first call in a chat says how to write them.",
    group: "game",
    positionals: ["chapter"],
    input: z.object({
        chapter: z.coerce.number().int().positive().optional().describe("the number of a chapter written, to read, write again or retitle; the next chapter if left out"),
        title: z.string().optional().describe("the chapter's title, its first scene's if left out"),
        text: z.string().optional().describe("the chapter's prose, in markdown; empty to take the last chapter out"),
        through: z.coerce.number().int().positive().optional().describe("for the next chapter, the number of its last scene, when it tells only the first of the scenes still untold"),
    }),

    run(input, context)
    {
        const root = requireCampaign(context.folder);
        const written = campaignBook(root);
        const untold = untoldScenes(root, written);
        const craft = firstInChat(context, "book") ? chapterCraft : undefined;
        const next = written.length + 1;

        if (input.through !== undefined && input.chapter !== undefined && input.chapter !== next) {
            throw new Error(`through is for the next chapter, ${next}: chapter ${input.chapter} keeps its scenes. Nothing written.`);
        }

        if (input.chapter === undefined && input.title === undefined && input.text === undefined) {
            return { kind: "list" as const, written: written.length, untold, craft };
        }

        if (input.chapter === undefined || input.chapter === next) {
            return writeNext(root, context, next, chapterScenes(untold, input.through), input.title, input.text);
        }

        const before = written.find((chapter) => chapter.number === input.chapter);

        if (before === undefined) {
            throw new Error(`There is no chapter ${input.chapter}: the book has ${written.length}, and the next is ${next}. Nothing written.`);
        }

        if (input.text === undefined && input.title === undefined) {
            return { kind: "read" as const, chapter: before, craft };
        }

        if (input.text !== undefined && input.text.trim() === "") {
            if (before.number !== written.length) {
                throw new Error(`Chapter ${before.number} has chapters after it: write it again, or take out the last first. Nothing written.`);
            }

            removeChapter(root, before.number);
            appendLogEntry(root, newDatedLogEntry(root, context, "book-chapter", "hidden", { chapter: before.number, removed: true }));
            return { kind: "removed" as const, number: before.number };
        }

        const scenes = storyScenes(root).slice(before.first - 1, before.last);
        const text = proseOf(input.text ?? before.text);
        const title = input.title?.trim() || before.title;
        writeChapter(root, before.number, scenes, title, text);
        return logged(root, context, { number: before.number, title, text, scenes, untold: untold.length });
    },

    format(result)
    {
        const craft = "craft" in result && result.craft !== undefined ? `\n\n${result.craft}` : "";

        if (result.kind === "list") {
            if (result.untold.length === 0) {
                return `${result.written === 0 ? "The book has no chapter yet" : `The book has ${result.written} ${result.written === 1 ? "chapter" : "chapters"}`}, and no closed scene waits for one: `
                    + `the next chapter comes when the story turns, at a scene's end.${craft}`;
            }

            const lines = result.untold.slice(0, listedScenes).map(sceneLine);
            const more = result.untold.length > listedScenes ? `\nAnd ${result.untold.length - listedScenes} more after them.` : "";
            return `The book has ${result.written} ${result.written === 1 ? "chapter" : "chapters"}; ${scenesText(result.untold)} ${result.untold.length === 1 ? "waits" : "wait"} for the next. `
                + `Tell them in chapters, each ending where the story turns (through gives a chapter's last scene), each from its chats first, then its summary and the pages:\n${lines.join("\n")}${more}${craft}`;
        }

        if (result.kind === "read") {
            return `Chapter ${result.chapter.number} «${result.chapter.title}», ${scenesText([{ number: result.chapter.first }, { number: result.chapter.last }])}:\n\n${result.chapter.text}${craft}`;
        }

        if (result.kind === "removed") {
            return `Chapter ${result.number} taken out of the book: its scenes wait for a chapter again.`;
        }

        const left = result.untold === 0 ? "" : ` Still untold: ${result.untold} closed ${result.untold === 1 ? "scene" : "scenes"}, for the next chapter.`;
        return `Chapter ${result.number} «${result.title}», ${scenesText(result.scenes)}, written, ${result.words} words: the player reads it in the Journal, under Story.${left}${craft}`;
    },
});

/** The next chapter, telling these scenes. */
function writeNext(root: string, context: Context, number: number, scenes: StoryScene[], title: string | undefined, text: string | undefined)
{
    if (text === undefined || text.trim() === "") {
        throw new Error(`Chapter ${number} is not written yet: give its text, the prose of ${scenesText(scenes)}. Nothing written.`);
    }

    const prose = proseOf(text);
    const named = title?.trim() || scenes[0].title;
    writeChapter(root, number, scenes, named, prose);
    return logged(root, context, { number, title: named, text: prose, scenes, untold: untoldScenes(root).length });
}

/** The scenes the next chapter tells: the untold ones, or those through one; stops the command when there are none. */
function chapterScenes(untold: StoryScene[], through: number | undefined): StoryScene[]
{
    if (untold.length === 0) {
        throw new Error("No closed scene waits for a chapter: the next comes when the story turns, at a scene's end. Nothing written.");
    }

    if (through === undefined) {
        return untold;
    }

    const last = untold.findIndex((scene) => scene.number === through);

    if (last === -1) {
        throw new Error(`Scene ${through} is not one still untold: give through between ${untold[0].number} and ${untold.at(-1)?.number}. Nothing written.`);
    }

    return untold.slice(0, last + 1);
}

/** A chapter's prose as the book keeps it; stops the command when it is too long. */
function proseOf(text: string): string
{
    const prose = text.replace(/\r\n?/g, "\n").trim().normalize("NFC");

    if (prose.length > chapterLength) {
        throw new Error(`This chapter is ${prose.length} characters, the book takes ${chapterLength}: end it sooner, with through. Nothing written.`);
    }

    return prose;
}

/** A chapter written, in the log, with its length. */
function logged(
    root: string,
    context: Context,
    chapter: { number: number; title: string; text: string; scenes: StoryScene[]; untold: number; },
)
{
    const words = chapter.text.split(/\s+/).filter((word) => word !== "").length;
    appendLogEntry(root, newDatedLogEntry(root, context, "book-chapter", "hidden", { chapter: chapter.number, title: chapter.title, scenes: chapter.scenes.map((scene) => scene.number), words }));
    return { kind: "written" as const, number: chapter.number, title: chapter.title, scenes: chapter.scenes, words, untold: chapter.untold };
}

/** A scene still untold: its title and game date, its summary, and when it ran in real time, for chats to read it. */
function sceneLine(scene: StoryScene): string
{
    const date = scene.date === undefined ? "" : `, ${scene.date}`;
    const summary = scene.summary === undefined ? "" : `: ${scene.summary}`;
    const otherDay = scene.to !== undefined && scene.to.slice(0, 10) !== scene.from.slice(0, 10) ? ` of ${scene.to.slice(0, 10)}` : "";
    const until = scene.to === undefined ? "" : `, until ${scene.to.slice(11, 19)}${otherDay}`;
    return `${scene.number} «${scene.title}»${date}${summary} (chats: day ${scene.from.slice(0, 10)}, from ${scene.from.slice(11, 19)}${until})`;
}
