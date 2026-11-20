// The campaign's story told as a book (T-227): chapters of prose written by the master into book/, out of the saves, each telling the closed scenes since the one
// before, ended where the story turns. A chapter holds its scenes by the log lines that opened them: one whose scenes a load undid, or that a reset took away, is
// left out, with those after it, until the master writes it again.
import { join } from "node:path";
import { parse, stringify } from "yaml";
import { bookFolderName } from "../../../campaign/index.ts";
import { readLog } from "../../../core/log.ts";
import { files } from "../../../core/store.ts";

/** A scene of the story: its number, as the journal counts them, its title and summary, its game date, when it ran in real time, and the log line that opened it. */
export interface StoryScene
{
    number: number;
    title: string;
    summary?: string;
    date?: string;
    from: string;
    /** When it closed; none while it is open. */
    to?: string;
    scene: string;
}

/** A chapter of the book as the player reads it. */
export interface BookChapter
{
    number: number;
    title: string;
    text: string;
}

/** A chapter with the scenes it tells, by their numbers, first and last. */
export interface WrittenChapter extends BookChapter
{
    first: number;
    last: number;
}

/** How many closed scenes may wait for their chapter before the master is told to write it now. */
export const scenesPerChapter = 4;

/** How the master writes a chapter (T-227): told once in a chat, by the first scene that closes or the first call of book. */
export const chapterCraft = "How to write a chapter: as a chapter of a novel, never a summary or a report. In the campaign's language, third person with an outside narrator, in the prose style the player chose: "
    + "its voice binds the book, its limits on length and its endings in play do not. A chapter tells the scenes closed since the last one, ended where the story turns: a goal reached or lost, a place left, a night passed. "
    + "Pick up where the last chapter left off (book with its number reads it back), without retelling it. "
    + "Tell it in scenes: places, gestures, silences, and people's words as dialogue where they mattered; summary only for roads and time passing. "
    + "The player character does and says only what the player played: their words may be put better, never a deed, a line or a choice of yours added. "
    + "Only what the player saw and learned: no secret, no hidden roll, nothing you planned, no conclusion they did not reach. No game words: no rolls, points, turns, nor a condition by its game name. "
    + "As long as its scenes deserve, from about 1500 words to 4000: a short scene a page of it, a great one most of it; end on an image or a line, never on a question to the player. "
    + "Paragraphs apart by a blank line, *italics* where a voice or a thought needs them, *** alone on a line for a break within the chapter.";

/** The scenes of the story in order, by the public lines of the log, as the journal numbers them: a scene closed with no line that opened it is one too. */
export function storyScenes(root: string): StoryScene[]
{
    const scenes: StoryScene[] = [];
    let open: StoryScene | undefined;

    for (const entry of readLog(root).filter((line) => line.visibility === "public")) {
        if (entry.type !== "scene-opened" && entry.type !== "scene-closed") {
            continue;
        }

        const known = entry.type === "scene-opened" ? undefined : open;
        const scene = known ?? {
            number: scenes.length + 1,
            title: String(entry.data.title ?? ""),
            ...(entry.date === undefined ? {} : { date: entry.date }),
            from: entry.at,
            scene: entry.id,
        };

        if (known === undefined) {
            scenes.push(scene);
        }

        if (entry.type === "scene-opened") {
            open = scene;
            continue;
        }

        const summary = typeof entry.data.summary === "string" ? entry.data.summary.trim() : "";
        Object.assign(scene, { to: entry.at }, summary === "" ? {} : { summary });
        open = undefined;
    }

    return scenes;
}

/** The chapters of the book whose scenes are in the story as it stands, in order: each going on from the one before, the first from the first scene. */
export function campaignBook(root: string): WrittenChapter[]
{
    const scenes = storyScenes(root);
    const book: WrittenChapter[] = [];

    for (const chapter of writtenChapters(root).sort((one, other) => one.number - other.number)) {
        const told = scenes.slice(chapter.first - 1, chapter.last);
        const follows = chapter.number === book.length + 1 && chapter.first === (book.at(-1)?.last ?? 0) + 1;

        if (!follows || told.length !== chapter.scenes.length || told.some((scene, index) => scene.scene !== chapter.scenes[index] || scene.to === undefined)) {
            break;
        }

        book.push({ number: chapter.number, title: chapter.title, text: chapter.text, first: chapter.first, last: chapter.last });
    }

    return book;
}

/** The closed scenes no chapter tells yet, in order: those the next chapter is for. */
export function untoldScenes(root: string, book: WrittenChapter[] = campaignBook(root)): StoryScene[]
{
    const told = book.at(-1)?.last ?? 0;
    return storyScenes(root).filter((scene) => scene.number > told && scene.to !== undefined);
}

/** Writes a chapter telling these scenes, in place of the one with its number. */
export function writeChapter(root: string, number: number, scenes: StoryScene[], title: string, text: string): void
{
    const head = stringify({ chapter: number, title, scenes: scenes.map((scene) => scene.scene) }, { lineWidth: 0 });
    files().write(chapterPath(root, number), `---\n${head}---\n\n${text}\n`);
}

/** Takes a chapter out of the book; nothing when it has none. */
export function removeChapter(root: string, number: number): void
{
    const path = chapterPath(root, number);

    if (files().exists(path)) {
        files().remove(path);
    }
}

/** What status says of a book left behind, by a chat closed or a computer turned off: the scenes waiting too long for their chapter, once the book has begun. */
export function bookBehind(root: string): string | undefined
{
    const book = campaignBook(root);
    const untold = untoldScenes(root, book);
    return book.length === 0 || untold.length < scenesPerChapter ? undefined : `The book is behind: ${scenesText(untold)} wait for their chapter. Write it with book before the story goes on; book lists them with their chats.`;
}

/** Scenes by their numbers, as «scene 4» or «scenes 4–7». */
export function scenesText(scenes: { number: number; }[]): string
{
    const first = scenes[0]?.number;
    const last = scenes.at(-1)?.number;
    return first === last ? `scene ${first}` : `scenes ${first}–${last}`;
}

function chapterPath(root: string, number: number): string
{
    return join(root, bookFolderName, `${String(number).padStart(3, "0")}.md`);
}

/** The chapters written in the book folder, each with the scenes it tells, after the scenes before it; a file that does not read as one is left out. */
function writtenChapters(root: string): (BookChapter & { first: number; last: number; scenes: string[]; })[]
{
    const read = files().files(join(root, bookFolderName), (name) => /^\d+\.md$/.test(name)).flatMap((path) => {
        const parts = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/.exec(files().text(path) ?? "");

        try {
            const head = parts === null ? undefined : (parse(parts[1]) as Record<string, unknown> | null);
            const scenes = Array.isArray(head?.scenes) ? head.scenes.filter((scene): scene is string => typeof scene === "string") : [];

            if (parts === null || head === null || head === undefined || typeof head.chapter !== "number" || scenes.length === 0) {
                return [];
            }

            return [{ number: head.chapter, title: typeof head.title === "string" ? head.title : "", text: parts[2].trim(), scenes }];
        } catch {
            return [];
        }
    }).sort((one, other) => one.number - other.number);

    // Each chapter goes on from the scenes of those before it.
    let told = 0;
    return read.map((chapter) => {
        const first = told + 1;
        told += chapter.scenes.length;
        return { ...chapter, first, last: told };
    });
}
