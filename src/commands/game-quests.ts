// An open quest whose goals are all ticked (D-239): whether its story has ended is the master's to say; status, write and scene close ask it, as the playtests showed
// the master leaving such a quest open for evenings, so the story's reward, a new level with milestones included, never came.
import { everyGoalTicked, type Page } from "../pages/index.ts";

// What the master does with such a quest.
const advice = "if the story has ended it, write status done";

/** What status says beside an open quest whose goals are all ticked, such as "Ritrovare gli scomparsi (every goal ticked: …)". */
export function openQuestText(page: Page): string
{
    return isTickedOpenQuest(page) ? `${page.name} (every goal ticked: ${advice})` : page.name;
}

/** What write says when it leaves an open quest with every goal ticked that was not so before, as when its last goal is ticked. */
export function tickedQuestNotes(existing: Page | undefined, page: Page): string[]
{
    return isTickedOpenQuest(page) && !isTickedOpenQuest(existing) ? [tickedQuestNote(page)] : [];
}

/** What scene close says of each open quest whose goals are all ticked, and write of the one it leaves so. */
export function tickedQuestNote(page: Page): string
{
    return `Every goal of ${page.name} is ticked and it is still open: ${advice}.`;
}

/**
 * What write says when it makes a quest (D-367): what the player's journal shows of it, so that the master writes it there, once for each quest. Kept in the
 * output, never in the instructions, since only who writes a quest needs it.
 */
export function newQuestNotes(existing: Page | undefined, page: Page): string[]
{
    return existing === undefined && page.type === "quest"
        ? [
            "The player's journal shows a quest the character knows: its goals as - [ ] lines in its text, - [x] once done; a counter field as a bar, such as clues: 0/5; "
            + "clock: 0/6 as a clock; deadline: a game date, counting down; giver and place as links; kind: main for the story's main quest.",
        ]
        : [];
}

/** Whether a page is an open quest whose goals are all ticked. */
export function isTickedOpenQuest(page: Page | undefined): boolean
{
    return page?.type === "quest" && page.fields.status === "open" && everyGoalTicked(page.body);
}
