// The campaign's story told as a book (T-227): a chapter of prose for each closed scene, written by the master into book/, out of the saves. A chapter belongs
// to its scene by the log line that opened it: one whose scene a load undid, or that a reset took away, is left out until the master writes it again.
import { join } from "node:path";
import { parse, stringify } from "yaml";
import { bookFolderName } from "../../../campaign/index.ts";
import { readLog } from "../../../core/log.ts";
import { files } from "../../../core/store.ts";

/** A scene of the story as a chapter of the book: its number, as the journal counts them, its title and summary, its game date, when it ran in real time, and the log line that opened it. */
export interface SceneChapter
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

/** How the master writes a chapter (T-227): told once in a chat, by the first scene that closes or the first call of book. */
export const chapterCraft = "How to write a chapter: as a chapter of a novel, never a summary or a report. In the campaign's language, third person with an outside narrator, in the prose style the player chose: "
    + "its voice binds the book, its limits on length and its endings in play do not. Pick up where the last chapter left off (book with its number reads it back), without retelling it. "
    + "Tell it in scenes: places, gestures, silences, and people's words as dialogue where they mattered; summary only for roads and time passing. "
    + "The player character does and says only what the player played: their words may be put better, never a deed, a line or a choice of yours added. "
    + "Only what the player saw and learned: no secret, no hidden roll, nothing you planned, no conclusion they did not reach. No game words: no rolls, points, turns, nor a condition by its game name. "
    + "As long as the scene deserves, from about 500 words for a short one to 2000 for a great one; end on an image or a line, never on a question to the player. A chapter may take a title of its own. "
    + "Paragraphs apart by a blank line, *italics* where a voice or a thought needs them, *** alone on a line for a break within the chapter.";

/** The scenes of the story in order, by the public lines of the log, as the journal numbers them: a scene closed with no line that opened it is one too. */
export function sceneChapters(root: string): SceneChapter[]
{
    const chapters: SceneChapter[] = [];
    let open: SceneChapter | undefined;

    for (const entry of readLog(root).filter((line) => line.visibility === "public")) {
        if (entry.type !== "scene-opened" && entry.type !== "scene-closed") {
            continue;
        }

        const scene = entry.type === "scene-opened" ? undefined : open;
        const chapter = scene ?? {
            number: chapters.length + 1,
            title: String(entry.data.title ?? ""),
            ...(entry.date === undefined ? {} : { date: entry.date }),
            from: entry.at,
            scene: entry.id,
        };

        if (scene === undefined) {
            chapters.push(chapter);
        }

        if (entry.type === "scene-opened") {
            open = chapter;
            continue;
        }

        const summary = typeof entry.data.summary === "string" ? entry.data.summary.trim() : "";
        Object.assign(chapter, { to: entry.at }, summary === "" ? {} : { summary });
        open = undefined;
    }

    return chapters;
}

/** The chapters of the book whose scenes are in the story as it stands, in order. */
export function campaignBook(root: string): BookChapter[]
{
    const scenes = new Map(sceneChapters(root).map((scene) => [scene.number, scene.scene]));
    return writtenChapters(root)
        .filter((chapter) => scenes.get(chapter.number) === chapter.scene)
        .sort((one, other) => one.number - other.number)
        .map(({ number, title, text }) => ({ number, title, text }));
}

/** Writes a scene's chapter, in place of the one it had. */
export function writeChapter(root: string, scene: SceneChapter, title: string, text: string): void
{
    const head = stringify({ chapter: scene.number, title, scene: scene.scene }, { lineWidth: 0 });
    files().write(chapterPath(root, scene.number), `---\n${head}---\n\n${text}\n`);
}

/** Takes a chapter out of the book; nothing when it has none. */
export function removeChapter(root: string, number: number): void
{
    const path = chapterPath(root, number);

    if (files().exists(path)) {
        files().remove(path);
    }
}

function chapterPath(root: string, number: number): string
{
    return join(root, bookFolderName, `${String(number).padStart(3, "0")}.md`);
}

/** The chapters written in the book folder, each with the scene it was written for; a file that does not read as one is left out. */
function writtenChapters(root: string): (BookChapter & { scene: string; })[]
{
    return files().files(join(root, bookFolderName), (name) => /^\d+\.md$/.test(name)).flatMap((path) => {
        const read = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/.exec(files().text(path) ?? "");

        try {
            const head = read === null ? undefined : (parse(read[1]) as Record<string, unknown> | null);

            if (read === null || head === null || head === undefined || typeof head.chapter !== "number" || typeof head.scene !== "string") {
                return [];
            }

            return [{ number: head.chapter, title: typeof head.title === "string" ? head.title : "", text: read[2].trim(), scene: head.scene }];
        } catch {
            return [];
        }
    });
}

/** What status says of a book left behind, by a chat closed or a computer turned off: the closed chapters still to write, once the book has begun (T-227). */
export function bookBehind(root: string): string | undefined
{
    const written = campaignBook(root);

    if (written.length === 0) {
        return undefined;
    }

    const missing = sceneChapters(root).filter((scene) => scene.to !== undefined && !written.some((chapter) => chapter.number === scene.number)).map((scene) => scene.number);
    const list = missing.length > 10 ? `${missing.slice(0, 10).join(", ")}…` : missing.join(", ");
    return missing.length === 0
        ? undefined
        : `The book lacks ${missing.length === 1 ? "chapter" : "chapters"} ${list}, of scenes closed: write ${missing.length === 1 ? "it" : "them"} with book before the story goes on; book lists them with their chats.`;
}
