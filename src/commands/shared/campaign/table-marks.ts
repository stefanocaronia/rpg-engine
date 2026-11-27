// The marks the master writes in the story at the table's own chat (D-585, D-586): the page draws there what the engine knows, so the master never writes
// its numbers. A clock is on the table when its event names it for the player with clock-name; the event's own title, often the master's plan, never shows.
import { comparableText } from "../../../core/text.ts";
import { readCounter } from "../../../counters/index.ts";
import type { Page } from "../../../pages/index.ts";

/** An event's clock as the player may see it: its value, its maximum and the name written for them; none for a clock behind the screen, or one that does not read. */
export function clockOnTable(page: Page): { value: number; max: number; name: string; } | undefined
{
    const clock = readCounter(page.fields.clock);
    const name = page.fields["clock-name"];

    if (page.type !== "event" || clock?.max === undefined || clock.max < 1 || typeof name !== "string" || name.trim() === "") {
        return undefined;
    }

    return { value: clock.value, max: clock.max, name: name.trim() };
}

/** Whether a field's name is an event's clock or the name written for it. */
export function isClockField(field: string): boolean
{
    return ["clock", "clock-name"].includes(comparableText(field.trim()));
}

/** At the table, what the master writes for a clock on the table: its mark, where the page draws it. */
export function clockMarkNote(page: string): string
{
    return `In the story write [clock ${page}] wherever you show this clock: the page draws it there by its name, so never write its numbers yourself.`;
}

/** At the table, what the master writes for the order of the turns: its mark, where the page draws it. */
export function turnsMarkNote(): string
{
    return "In the story write [turns] where the order matters: the page draws the order there, with who acts now, so never list it yourself.";
}
