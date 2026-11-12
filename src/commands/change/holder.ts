// What holds a counter (a page or a copy in the scene) and how a step is written on it: log, followers, events, thresholds
import type { Context } from "../../core/context.ts";
import { appendLogEntry, type LogEntry } from "../../core/log.ts";
import { comparableText } from "../../core/text.ts";
import { formatCounter, readCounter, readCounterText } from "../../counters/index.ts";
import { baseValue, concernsPlayer, followersOf, inheritedFields, isCounterField, isPartyMember, isPlayerCharacter, keepersOf, ownField, type Page, withPage, type World, writePage } from "../../pages/index.ts";
import type { GameSystem } from "../../systems/index.ts";
import { situationPart } from "../shared/campaign/parts.ts";
import { followersNote, keepersNote } from "../shared/notes.ts";
import { saveEffects } from "../shared/scene/effects.ts";
import { keepingLossNote, shieldNotes } from "../shared/scene/reminders.ts";
import { checkNotCopied, checkNotSystemPage, pageOrCopy, readOpenScene, updateScene } from "../shared/scene/scene.ts";
import { effectGiving, effectiveFields, effectsOf, withValue } from "../shared/sheet/effect-layer.ts";
import { experienceOf, levelWay, newLevelNotes, settleChoices } from "../shared/sheet/experience.ts";
import { fallNotes, thresholdNotes } from "../shared/sheet/thresholds.ts";
import { counterLimits } from "../shared/sheet/worked-out.ts";
import { fireEvents, nowDueNote } from "../shared/time/events.ts";
import { newDatedLogEntry, readPresent } from "../shared/time/time.ts";
import type { Step } from "./amounts.ts";

/** What holds a counter: a page, or a copy in the open scene, seen as a page that derives from its creature (INH-14). */
export interface CounterHolder
{
    page: Page;
    kind: "page" | "copy";
    /** Writes fields as the page names them, undefined removing one so that the page reads it from its base again (INH-9): the page as written, undefined for a copy. */
    write(fields: Record<string, number | string | undefined>): Page | undefined;
    visibility: LogEntry["visibility"];
}

/** What a step did to a counter or to money. */
export interface StepOutcome
{
    page: string;
    field: string;
    before: string;
    after: string;
    total?: string;
    /** "in Forma d'orso; at max; again as Lupo": the effect it changed on, the limit it reached, the base whose value the page reads again. */
    note: string;
    effect?: string;
    again?: string;
    changed: boolean;
    due: ReturnType<typeof fireEvents>["due"];
    followers: string[];
    keepers: string[];
    thresholds: string[];
    /** What the change may break that someone keeps alive, and what shields the counter it lowered (EFF-14, DAT-14). */
    reminders: string[];
}

/** What holds the counter, given by name or as a link: a copy in the open scene first, then a page of the campaign; the field asked names the example. */
export function holderNamed(root: string, world: World, name: string, field?: string): CounterHolder
{
    const open = readOpenScene(root);
    const found = pageOrCopy(world, open, name, (page) => `a counter is a field of the page, such as page ${page}${field === undefined ? "" : `, field ${field}`}`);
    const copy = found.copy;

    if (copy !== undefined) {
        const write = (fields: Record<string, number | string | undefined>): undefined => {
            updateScene(root, Object.entries(fields).map(([field, value]) => [["copies", copy, field], value]));
            return undefined;
        };

        return { page: found.page, kind: "copy", write, visibility: "hidden" };
    }

    checkNotSystemPage(world, open, found.page);
    checkNotCopied(world, open, found.page);
    return pageHolder(world, found.page);
}

/** A page as what holds its counters: written with write, its lines in the log public when it concerns the player. */
export function pageHolder(world: World, page: Page): CounterHolder
{
    return {
        page,
        kind: "page",
        write: (fields) => {
            const set = Object.fromEntries(Object.entries(fields).filter(([, value]) => value !== undefined));
            const unset = Object.keys(fields).filter((field) => fields[field] === undefined);
            return writePage(world, page.name, undefined, { set: Object.keys(set).length === 0 ? undefined : set, unset: unset.length === 0 ? undefined : unset }).page;
        },
        visibility: concernsPlayer(world, page) ? "public" : "hidden",
    };
}

/**
 * Writes a step: on the effect that gives the field (EFF-7), else on the page, from which the field goes when it comes back to its base's value (INH-9); with
 * its line in the log and those of the pages that read it from this one (INH-10), the events it sets off (EVT-4) and the thresholds it touches (DAT-3).
 * Returns the world as written, for a next step.
 */
export function applyStep(
    root: string,
    context: Context,
    world: World,
    holder: CounterHolder,
    field: string,
    step: Step,
    why: string | undefined,
    system: GameSystem | undefined,
): { outcome: StepOutcome; world: World; }
{
    const page = holder.page.name;
    checkClock(holder.page, field, step.after);
    const written = ownField(holder.page, field) ?? field;
    // A value an effect gives changes on the effect, under which the page keeps its own (EFF-7).
    const layer = effectGiving(holder.page, field);
    // A maximum written by hand that is not the system's is put right even when the value reads the same, as validate's fix asks (FOR-6).
    const workedMax = holder.kind === "page" && counterLimits(world, inheritedFields(world, holder.page), field).max !== undefined;
    const stale = layer === undefined && workedMax && Object.hasOwn(holder.page.fields, written) && String(holder.page.fields[written]) !== String(storedCounter(world, holder, field, step.after));
    const changed = String(step.after) !== String(step.before) || stale;
    const base = layer === undefined ? baseValue(world, holder.page, field) : undefined;
    const backToBase = changed && base !== undefined && step.same(base.value);
    const followers = changed && holder.kind === "page" && layer === undefined ? followersOf(world, holder.page, field) : [];
    const keepers = changed && holder.kind === "page" && layer === undefined ? keepersOf(world, holder.page, field).map((keeper) => `${keeper.name} (${field} ${String(counterOf(world, keeper, field))})`) : [];

    let after: Page | undefined;

    if (changed) {
        // Back to the base's value, the field goes in every spelling the page wrote it, so that the page reads the base's (INH-5, INH-9).
        const spellings = Object.keys(holder.page.fields).filter((name) => comparableText(name) === comparableText(field));

        if (layer === undefined) {
            after = holder.write(backToBase ? Object.fromEntries(spellings.map((name) => [name, undefined])) : { [written]: storedCounter(world, holder, field, step.after) });
        } else {
            const effects = effectsOf(holder.page).map((effect) => (effect.name === layer.name ? withValue(effect, field, String(step.after)) : effect));
            after = saveEffects(root, context, world, { page: holder.page, copy: holder.kind === "copy" }, effects);
        }

        const data = { page, copy: holder.kind === "copy" ? true : undefined, field, effect: layer?.name, before: step.before, after: step.after, ...step.amount, why };
        appendLogEntry(root, newDatedLogEntry(root, context, "counter-changed", holder.visibility, data));
        logFollowers(root, world, context, followers, { field, before: step.before, after: step.after });
    }

    const again = backToBase ? base?.base.name : undefined;
    const note = [layer === undefined ? "" : `in ${layer.name}`, step.note, again === undefined ? "" : `again as ${again}`].filter((part) => part !== "").join("; ");
    const updated = after === undefined ? world : withPage(world, holder.page, after);
    // Only an event's clock sets anything off when it changes (EVT-4).
    const due = after !== undefined && layer === undefined && isCounterField(after.type, field) ? fireEvents(root, context, world, updated, readPresent(root).date).due : [];
    // The rules a counter of the player character or a companion touches (DAT-3): never for a copy, nor for a page that is not in the party.
    const touched = changed || (step.amount.beyond ?? 0) !== 0;
    const party = holder.kind === "page" && isPartyMember(holder.page);
    // Points that reach a new level are said with the rule to read (PRO-6).
    const companion = holder.page.fields.role === "companion";
    const levelUp = (): string => situationPart("level-up", context, system);
    const [levelBefore, levelAfter] = [experienceOf(world, effectiveFields(world, holder.page)), after === undefined ? undefined : experienceOf(updated, effectiveFields(updated, after))];

    if (changed && party) {
        settleChoices(root, holder.page.name, levelBefore, levelAfter);
    }

    const levels = changed && party && after !== undefined ? newLevelNotes(page, levelBefore, levelAfter, companion, levelUp, levelWay(root, context, holder.page.name)) : [];
    // The player character's own counter, never a form's, falling to the system's down value: what lethality makes of it (D-530).
    const fall = changed && holder.kind === "page" && layer === undefined && isPlayerCharacter(holder.page) ? fallNotes(root, system, page, field, step) : [];
    const thresholds = [...(touched && party ? thresholdNotes(root, system, field, step, layer?.name) : []), ...fall, ...levels];
    // What the loss may break that someone keeps alive, on anyone, and what shields the counter that went down (EFF-14, DAT-14).
    const lost = touched ? lostBy(step) : 0;
    // What goes past 0 in an effect that gives the counter, as a beast form, may carry over to the page's own (D-454).
    const beyond = Math.abs(Number(step.amount.beyond ?? 0));
    const carried = layer !== undefined && lost > 0 && beyond > 0 && readCounterText(String(step.after))?.value === 0
        ? `${beyond} went past 0 in ${layer.name}: when it ends so, what goes past may carry over to ${page}'s own ${field}, as its text says.`
        : "";
    const reminders = [keepingLossNote(world, readOpenScene(root).scene, system, page, field, lost), ...shieldNotes(world, system, holder.page, field, lost, fellBy(step)), carried].filter((note) => note !== "");
    const outcome = {
        page,
        field,
        before: String(step.before),
        after: String(step.after),
        total: step.total,
        note,
        effect: layer?.name,
        again,
        changed,
        due,
        followers: followers.map((follower) => follower.name),
        keepers,
        thresholds,
        reminders,
    };
    return { outcome, world: updated };
}

/** A counter as the page keeps it: with the maximum the game system works out from the page without its effects, which the reading puts back (FOR-6). */
function storedCounter(world: World, holder: CounterHolder, field: string, value: number | string): number | string
{
    const counter = readCounter(value);
    const { max } = holder.kind === "page" ? counterLimits(world, inheritedFields(world, holder.page), field) : {};
    return counter === undefined || max === undefined ? value : formatCounter({ value: counter.value, max });
}

/** An event's clock keeps a maximum of at least 1, as write asks (EVT-2). */
function checkClock(page: Page, field: string, after: number | string): void
{
    const counter = readCounter(after);

    if (isCounterField(page.type, field) && (counter?.max === undefined || counter.max < 1)) {
        throw new Error(`A clock needs a maximum of at least 1, such as 0/4: ${after} is not one. Nothing changed.`);
    }
}

/** How much a step took away: the whole of a negative by, even past a limit, as damage is taken; otherwise what the value went down. */
function lostBy(step: Step): number
{
    const by = step.amount.by;
    return typeof by === "number" ? Math.max(0, -by) : fellBy(step);
}

/** How far a step's counter went down, which stops at its least. */
function fellBy(step: Step): number
{
    const before = readCounter(step.before)?.value;
    const after = readCounter(step.after)?.value;
    return before === undefined || after === undefined ? 0 : Math.max(0, before - after);
}

/** One public line for each page that changed with a base and concerns the player, with its own name only and no why: the base and the other pages may be secret (INH-10, D-93). */
function logFollowers(root: string, world: World, context: Context, followers: Page[], change: { field: string; before: number | string; after: number | string; }): void
{
    for (const follower of followers.filter((page) => concernsPlayer(world, page))) {
        appendLogEntry(root, newDatedLogEntry(root, context, "counter-changed", "public", { page: follower.name, ...change }));
    }
}

/** The value a page reads for a field, written in any case. */
function counterOf(world: World, page: Page, field: string): unknown
{
    return Object.entries(inheritedFields(world, page)).find(([name]) => comparableText(name) === comparableText(field))?.[1];
}

/** What else a step says: the thresholds it touches, the events it sets off, the pages that changed with it, and those that keep their own. */
export function stepNotes(step: StepOutcome): string[]
{
    const followers = followersNote(step.followers, `since they read ${step.field} from ${step.page}`, "change", `${step.field} ${step.after}`);
    return [...step.thresholds, ...step.reminders, nowDueNote(step.due), followers, keepersNote(step.keepers, step.field)].filter((note) => note !== "");
}
