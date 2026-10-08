// An open quest whose goals are all ticked (D-239): whether its story has ended is the master's to say, and status and write ask it, as the playtests showed
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
    return isTickedOpenQuest(page) && !isTickedOpenQuest(existing) ? [`Every goal of ${page.name} is ticked and it is still open: ${advice}.`] : [];
}

/** Whether a page is an open quest whose goals are all ticked. */
export function isTickedOpenQuest(page: Page | undefined): boolean
{
    return page?.type === "quest" && page.fields.status === "open" && everyGoalTicked(page.body);
}
