// The engine's marks in the master's words at the table's own chat, resolved once their message is complete (D-586): what each clock on the table and the
// turns stood for then, from the campaign as it is, kept with the message so that it keeps those values. A mark that stands for nothing gets no data, and the
// page shows nothing there. A roll's mark needs none: the chat holds the roll itself.
import { clockOnTable } from "../../commands/shared/campaign/table-marks.ts";
import { campaignWorld } from "../../commands/shared/campaign/world.ts";
import { playerScene } from "../../commands/view/view.ts";
import type { Context } from "../../core/context.ts";
import { comparableText } from "../../core/text.ts";
import type { MarkedClock, MarkedTurns, StoryMarks } from "../dashboard/index.ts";

/** What a message's marks stand for, none where it has none that resolve, and the marks that stand for nothing, as written. */
export interface ResolvedMarks
{
    marks?: StoryMarks;
    unresolved: string[];
}

/** The marks of clocks and of the turns in a master's message, resolved from the campaign at `root` as it is now. */
export function storyMarks(root: string, context: Context, text: string): ResolvedMarks
{
    const found = marksIn(text);

    if (found.clocks.length === 0 && !found.turns) {
        return { unresolved: [] };
    }

    const clocks = found.clocks.map((page) => ({ page, clock: clockNamed(root, context, page) }));
    const turns = found.turns ? turnsNow(root, context) : undefined;
    const resolved = clocks.flatMap(({ clock }) => (clock === undefined ? [] : [clock]));
    const marks: StoryMarks = { ...(resolved.length === 0 ? {} : { clocks: resolved }), ...(turns === undefined ? {} : { turns }) };
    const unresolved = [...clocks.filter(({ clock }) => clock === undefined).map(({ page }) => `[clock ${page}]`), ...(found.turns && turns === undefined ? ["[turns]"] : [])];
    return { ...(Object.keys(marks).length === 0 ? {} : { marks }), unresolved };
}

// A mark as the page reads it: its word in any case, any space around it and what it names, a colon after the word, a backslash before each bracket. A clock
// is named by its event's page, spaces and all; the turns name nothing.
const markPattern = /\\?\[\s*(clock|turns)(?:(?:\s*:\s*|\s+)([^[\]\\]*?))?\s*:?\s*\\?\]/gi;

/** The clocks a text marks, each once by its page as first written, and whether it marks the turns. */
function marksIn(text: string): { clocks: string[]; turns: boolean; }
{
    const clocks = new Map<string, string>();
    let turns = false;

    for (const [, word, named = ""] of text.matchAll(markPattern)) {
        const page = named.replace(/\s+/g, " ").trim();

        if (word.toLowerCase() === "turns" && page === "") {
            turns = true;
        } else if (word.toLowerCase() === "clock" && page !== "" && !clocks.has(comparableText(page))) {
            clocks.set(comparableText(page), page);
        }
    }

    return { clocks: [...clocks.values()], turns };
}

/** The clock of the event `page` names, where it is on the table. */
function clockNamed(root: string, context: Context, page: string): MarkedClock | undefined
{
    const event = campaignWorld(root, context).pages.find((one) => one.type === "event" && comparableText(one.name) === comparableText(page));
    const clock = event === undefined ? undefined : clockOnTable(event);
    return clock === undefined ? undefined : { page, ...clock };
}

/** The open scene's turns as the player's view names them; none without an order of turns. */
function turnsNow(root: string, context: Context): MarkedTurns | undefined
{
    const scene = playerScene(root, context);

    if (scene?.order === undefined || scene.order.length === 0 || scene.turn === undefined) {
        return undefined;
    }

    return { order: scene.order, turn: scene.turn, ...(scene.round === undefined ? {} : { round: scene.round }) };
}
