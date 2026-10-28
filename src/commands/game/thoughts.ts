// The companions' diaries (D-497, DIA): what they set on paper of how they took the story, kept in the log; never the facts, which the log already tells.
import type { Context } from "../../core/context.ts";
import { type LogEntry, readLog } from "../../core/log.ts";
import { isInParty, type Page, pagesWithNameOrAlias, parsePageReference, type World } from "../../pages/index.ts";
import { textList } from "./knowledge.ts";
import { readOpenScene } from "./scene.ts";
import { agentVoices } from "./voices.ts";

/** The type of a diary's line in the log (DIA-1). */
export const thoughtsType = "thoughts";

/** How long a line of a diary may be, in characters (DIA-1). */
export const thoughtsLength = 200;

/** How many of their last lines a companion reads in view as (DIA-3). */
export const thoughtsShown = 3;

/** What a companion writes of themselves, as the character agent and the master read it (DIA-3). */
export const thoughtsRule = "how you took what happened, whom you trust or fear now, what you mean to do; never what happened (Lived keeps it), and nothing you hide from the others";

/** A line of a diary: whose, its game date, its text. */
export interface Thought
{
    page: Page;
    date?: string;
    text: string;
}

/** The lines of the diaries, oldest first (DIA-1); of one character when `page` is given. Lines of a page no longer there are left out. */
export function thoughtsIn(root: string, world: World, page?: Page): Thought[]
{
    return readLog(root).flatMap((entry) => {
        const thought = thoughtOf(world, entry);
        return thought === undefined || (page !== undefined && thought.page !== page) ? [] : [thought];
    });
}

/**
 * The line that says whose diary is due (DIA-2): one companion who lived a scene since their last line, the one whose last line is oldest; how, by the character
 * agent or by the master. Empty when it is no one's.
 */
export function diaryDueLine(root: string, context: Context, world: World): string
{
    const page = diaryDue(root, world);

    if (page === undefined) {
        return "";
    }

    const how = agentVoices(root, context) ? `ask their agent "Write your diary" and keep its Writes line with thoughts` : "write it yourself in their voice, with thoughts";
    return `Diary: ${page.name}'s is due: at this pause, before the story goes on, have them write a few lines on how they took what they lived: ${how}.`;
}

/** The companion whose diary is due (DIA-2), or none. */
function diaryDue(root: string, world: World): Page | undefined
{
    const log = readLog(root);
    const { scene } = readOpenScene(root);
    const opened = scene === undefined ? -1 : log.findLastIndex((entry) => entry.type === "scene-opened");
    const isPage = (page: Page) => (name: unknown): boolean => typeof name === "string" && pageOf(world, name) === page;
    const due = world.pages.filter((page) => page.type === "character" && page.fields.role === "companion" && page.system === undefined && isInParty(page)).flatMap((page) => {
        const last = log.findLastIndex((entry) => thoughtOf(world, entry)?.page === page);
        const lived = log.some((entry, index) => index > last && entry.type === "scene-closed" && [...textList(entry.data.with), ...textList(entry.data.left)].some(isPage(page)));
        const living = opened > last && (scene?.with ?? []).some(isPage(page));
        return lived || living ? [{ page, last }] : [];
    });
    // The oldest last line first; sort is stable, so the order of the pages decides a tie.
    return due.sort((one, other) => one.last - other.last)[0]?.page;
}

/** A line of the log as a line of a diary, or nothing when it is not one, or its page is gone. */
function thoughtOf(world: World, entry: LogEntry): Thought | undefined
{
    const page = entry.type === thoughtsType && typeof entry.data.page === "string" ? pageOf(world, entry.data.page) : undefined;
    return page === undefined || typeof entry.data.text !== "string" ? undefined : { page, ...(entry.date === undefined ? {} : { date: entry.date }), text: entry.data.text };
}

function pageOf(world: World, name: string): Page | undefined
{
    return pagesWithNameOrAlias(world, parsePageReference(name).name)[0];
}
