// What a write tells the master about the story, quests, links, thresholds and counts written inside text
import type { Context } from "../../core/context.ts";
import { comparableText, valueNamed, withArticle } from "../../core/text.ts";
import { containerFieldOf, countedText as countInText, declaredKind, type FieldChange, linksIn, namesakes, type Page, pagesWithName, readEntry, systemLabel, systemPageNamed, textsIn, type World } from "../../pages/index.ts";
import type { GameSystem } from "../../systems/index.ts";
import { situationPart } from "../shared/campaign/parts.ts";
import { foreignSystemLanguage } from "../shared/campaign/world.ts";
import { effectiveFields } from "../shared/sheet/effect-layer.ts";
import { thresholdNotes } from "../shared/sheet/thresholds.ts";
import { conditionNotes, consequencesNotes, fireEvents, heldNote, nowDueNote } from "../shared/time/events.ts";
import { readPresent } from "../shared/time/time.ts";

/**
 * What the write set off in the story: the events it made due or that wait for the date it gave them (EVT-4, EVT-5), conditions on pages that do not exist yet,
 * and the planned events and quests linked to what changed (D-117, EVT-7).
 */
export function storyNotes(root: string, context: Context, before: World, after: World, existing: Page | undefined, page: Page): string[]
{
    const present = readPresent(root).date;
    const fired = fireEvents(root, context, before, after, present);
    const written = fired.world.pages.find((candidate) => candidate.path === page.path) ?? page;
    const conditions = page.type === "event" && JSON.stringify(existing?.fields.when) !== JSON.stringify(page.fields.when) ? conditionNotes(fired.world, page.fields.when) : [];
    const consequences = consequencesNotes(fired.world, existing, written, fired.due.map((event) => event.name), present);
    return [nowDueNote(fired.due), heldNote(fired.held), ...conditions, ...consequences].filter((note) => note !== "");
}

/** The part quest-ends when a quest is done or failed, such as the experience the story gives (D-233), once in a chat (D-97). */
export function questEndNotes(context: Context, system: GameSystem | undefined, existing: Page | undefined, page: Page): string[]
{
    if (!questEnds(existing, page)) {
        return [];
    }

    const part = situationPart("quest-ends", context, system);
    return part === "" ? [] : [`${page.name} is ${String(page.fields.status)}. ${part}`];
}

/** Whether this write ends a quest: done or failed now, and not before. */
export function questEnds(existing: Page | undefined, page: Page): boolean
{
    const ended = (candidate: Page | undefined): boolean => ["done", "failed"].includes(String(candidate?.fields.status));
    return page.type === "quest" && ended(page) && !ended(existing);
}

/**
 * What a write should say of the links it gave in fields the game system declares, such as spells (D-216): those to pages that do not exist yet, which the world
 * gets with write, and those to a page that shares its name with another, as Shield the item beside Shield (spell). A campaign played in another language is
 * told the system's. The core's fields, as contains or knows, link ahead to pages still to write.
 */
export function linkNotes(world: World, change: FieldChange): string[]
{
    // The base a creature or an item derives from too, as item=[[Spada lunga]] for Longsword.
    const told = (field: string): boolean => declaredKind(world, field) !== undefined || ["creature", "item"].includes(comparableText(field));
    const given = [...Object.entries(change.set ?? {}), ...Object.entries(change.add ?? {})].filter(([field]) => told(field)).flatMap(([, value]) => linksIn(value));
    const names = [...new Set(given)];
    const exists = (name: string): Page | undefined => pagesWithName(world, name)[0] ?? systemPageNamed(world, name);
    const missing = names.filter((name) => exists(name) === undefined);
    const system = world.system;
    const foreign = foreignSystemLanguage(world);
    const language = system === undefined || foreign === undefined ? "" : ` The system ${system.name} names its pages in ${foreign}: find looks them up.`;
    const absent = missing.length === 0
        ? []
        : [`No page for ${missing.map((name) => `[[${name}]]`).join(", ")} yet: create ${missing.length === 1 ? "it" : "them"} with write if ${
            missing.length === 1 ? "it belongs" : "they belong"
        } to this world, or link a page that exists.${language}`];
    const twins = names.flatMap((name) => {
        const page = exists(name);
        const others = page === undefined ? [] : namesakes(world, page);
        return page === undefined || others.length === 0 ? [] : [`[[${name}]] is ${page.system === undefined ? withArticle(page.type ?? "page") : systemLabel(page)}; there is also ${others.map((other) => other.name).join(", ")}.`];
    });
    return [...absent, ...twins];
}

/** "torce 7" written in an inventory: a count inside a text, which nothing counts, and how goods are counted instead (STK-10). */
export function countedTextNotes(existing: Page | undefined, page: Page): string[]
{
    const field = containerFieldOf(page.type);
    const before = field === undefined ? [] : textsIn(existing?.fields[field]).map((entry) => entry.trim());
    const added = field === undefined ? [] : textsIn(page.fields[field]).filter((entry) => !before.includes(entry.trim()));
    return added.filter((entry) => readEntry(entry).shape === "text" && countInText(entry) !== undefined).map((entry) =>
        `"${entry}" is a count inside a text, which nothing counts: goods are a stack, a kind and how many. The system's kinds go by their English names, as find shows them: `
        + `write the one it has with your word as its label, such as [[Torch|torcia]] 3; only what the system lacks becomes a kind of the campaign, made first with write "<name>", type item.`
    );
}

/** The thresholds the fields a write gives touch on the player character or a companion, as change says them (DAT-3): exhaustion written with write shows its rule. */
export function writtenThresholdNotes(root: string, system: GameSystem | undefined, before: World, after: World, existing: Page | undefined, page: Page, set: Record<string, unknown>): string[]
{
    const read = (fields: Record<string, unknown>, field: string): unknown => valueNamed(fields, field);
    const was = existing === undefined ? {} : effectiveFields(before, existing);
    const is = effectiveFields(after, page);
    return Object.keys(set).flatMap((field) => {
        const [from, to] = [read(was, field), read(is, field)];
        return String(from) === String(to) ? [] : thresholdNotes(root, system, field, { before: from, after: to, amount: {} });
    });
}
