// Stacks in play (D-429, STK-4–STK-12), as change, move and trade use them: the stack a holder means, the stacks a command writes, their lines in the log and the kinds
// that leave equipped when no longer carried.
import type { Context } from "../../core/context.ts";
import { appendLogEntry } from "../../core/log.ts";
import { comparableText } from "../../core/text.ts";
import { applyMove, carriesKind, concernsPlayer, containerFieldOf, entryPage, type HeldStack, heldStacks, links, locate, type MovePlan, MoveStopped, ownStack, type Page, type Stack, stackName, type World } from "../../pages/index.ts";
import { newDatedLogEntry } from "./time.ts";

/** A stack that changes: in which container, of which kind, from how many to how many, written with which label (STK-12). */
export interface StackStep
{
    container: Page;
    kind: Page;
    before: number;
    after: number;
    label?: string;
}

/**
 * The stack of a kind that a holder means (STK-4): its own, else the one inside the items it holds. Refused when it has none, or keeps it in more than one of them; `call`
 * says how to name the container instead, one inside the holder or, when the holder has none, the place or item it is in that has some, as the shop a merchant is in.
 * `count` is how many were asked, for the stack a write would add.
 */
export function heldStack(world: World, holder: Page, kind: Page, call: (container: Page, inside: boolean) => string, count = 1): HeldStack
{
    const found = heldStacks(world, holder, kind);

    if (found.length === 0) {
        const around = locate(world, holder).chain[0];
        const there = around === undefined ? [] : heldStacks(world, around, kind);

        if (around !== undefined && there.length === 1) {
            const has = there[0].container === around ? "has" : `has inside ${there[0].container.name}`;
            throw new Error(`${holder.name} has no ${kind.name}, but ${around.name}, where ${holder.name} is, ${has} ${there[0].stack.count}: ${call(there[0].container, false)}. Nothing changed.`);
        }

        const field = containerFieldOf(holder.type) ?? "contains";
        throw new Error(
            `${holder.name} has no ${kind.name}, in ${field} or inside what it holds. If the story gives some, write ${holder.name}, add ${field}="[[${kind.name}]] ${count}". Nothing changed.`,
        );
    }

    if (found.length > 1) {
        const where = found.map((held) => `${held.container.name} (${held.stack.count})`).join(", ");
        throw new Error(`${holder.name} keeps ${kind.name} in more than one place: ${where}. Name the one, such as ${call(found[0].container, true)}. Nothing changed.`);
    }

    return found[0];
}

/** The edits that write stack steps (STK-6), one for each container, in the order of the steps: the origins before the destinations. */
export function stackEdits(steps: StackStep[]): MovePlan["edits"]
{
    const edits: MovePlan["edits"] = [];

    for (const step of steps) {
        const field = containerFieldOf(step.container.type) ?? "contains";
        const edit = edits.find((candidate) => candidate.holder === step.container);
        const stack = { kind: step.kind.name, count: step.after, ...(step.label === undefined ? {} : { label: step.label }) };

        if (edit === undefined) {
            edits.push({ holder: step.container, field, remove: [], add: [], stacks: [stack] });
        } else {
            edit.stacks = [...(edit.stacks ?? []).filter((other) => comparableText(other.kind) !== comparableText(stack.kind)), stack];
        }
    }

    return edits;
}

/** Pieces of a kind that go from a stack to a container (STK-6, STK-7). */
export interface StackMove
{
    kind: Page;
    from: HeldStack;
    to: Page;
    count: number;
}

/**
 * The steps that move pieces (STK-4, STK-6): each origin goes down, and the destination's own stack goes up, or a new entry at the end of its list, with the label of the
 * entry the pieces come from. Steps on the same stack add up; the origins come before the destinations, which are written last (STK-9).
 */
export function stackMoveSteps(world: World, moves: StackMove[]): StackStep[]
{
    const steps: StackStep[] = [];

    // A stack keeps its own label; a new one takes the label of the entry its pieces come from (STK-4).
    const step = (container: Page, kind: Page, start: Stack | undefined, by: number, label?: string): void => {
        const known = steps.find((candidate) => candidate.container === container && candidate.kind === kind);

        if (known !== undefined) {
            known.after += by;
            return;
        }

        const shown = start === undefined ? label : start.label;
        const before = start?.count ?? 0;
        steps.push({ container, kind, before, after: before + by, ...(shown === undefined ? {} : { label: shown }) });
    };

    for (const move of moves) {
        step(move.from.container, move.kind, move.from.stack, -move.count);
    }

    for (const move of moves) {
        step(move.to, move.kind, ownStack(world, move.to, move.kind), move.count, move.from.stack.label);
    }

    return steps;
}

/** Writes stack steps (STK-9), with their lines in the log and the kinds no longer carried taken out of equipped; returns the world after it and the lines that tell it. */
export function writeStacks(root: string, context: Context, world: World, steps: StackStep[], why?: string, asked: Record<string, unknown> = {}): { world: World; notes: string[]; }
{
    const changed = steps.filter((step) => step.before !== step.after);

    if (changed.length === 0) {
        return { world, notes: [] };
    }

    const written = applyLogged(root, context, world, { edits: stackEdits(changed), moving: [] }, changed, why, asked);
    const gone = changed.filter((step) => step.after === 0).map((step) => step.kind);
    const unequipped = gone.length === 0 ? { world: written, notes: [] } : unequipKinds(written, gone);
    return { world: unequipped.world, notes: [changed.map(stackStepText).join("; ") + ".", ...unequipped.notes] };
}

/** One line in the log for each stack that changed (STK-12): public when its container concerns the player, as a counter's (CNT-10); `asked` is how, as spend 1. */
export function logStackSteps(root: string, context: Context, world: World, steps: StackStep[], why: string | undefined, asked: Record<string, unknown> = {}): void
{
    for (const step of steps.filter((candidate) => candidate.before !== candidate.after)) {
        const data = { page: step.container.name, field: step.label ?? step.kind.name, kind: step.kind.name, stack: true, before: step.before, after: step.after, ...asked, why };
        appendLogEntry(root, newDatedLogEntry(root, context, "counter-changed", concernsPlayer(world, step.container) ? "public" : "hidden", data));
    }
}

/**
 * Takes out of equipped the kinds a character no longer carries after stacks changed (STK-11), and says so: "Gara has Dagger equipped no more." Returns the world as
 * written.
 */
export function unequipKinds(world: World, kinds: Page[]): { world: World; notes: string[]; }
{
    const edits: MovePlan["edits"] = world.pages.filter((page) => page.type === "character").flatMap((character) => {
        const value = character.fields.equipped;
        const entries = (Array.isArray(value) ? value : value === undefined || value === null ? [] : [value]).map(String);
        const gone = entries.filter((entry) =>
            links(entry).some((link) => {
                const page = entryPage(world, link.page);
                return page !== undefined && kinds.some((kind) => samePage(kind, page)) && !carriesKind(world, character, page);
            })
        );
        return gone.length === 0 ? [] : [{ holder: character, field: "equipped", remove: gone, add: [] }];
    });

    if (edits.length === 0) {
        return { world, notes: [] };
    }

    const after = applyMove(world, { edits, moving: [] });
    return { world: after, notes: edits.map((edit) => `${edit.holder.name} has ${edit.remove.map((entry) => links(entry)[0]?.page ?? entry).join(", ")} equipped no more.`) };
}

/** "Ettore: Torch 7 → 6": a stack step as the outputs tell it (STK-12), with where it went when it is gone. */
export function stackStepText(step: StackStep): string
{
    const name = step.label ?? step.kind.name;
    const gone = step.after === 0 ? `, gone from ${step.container.name}` : "";
    return `${step.container.name}: ${name} ${step.before} → ${step.after}${gone}`;
}

/** What change did to a stack (STK-5), as change tells a counter's step. */
export interface StackChange
{
    page: string;
    field: string;
    before: string;
    after: string;
    note: string;
    changed: boolean;
    due: never[];
    followers: never[];
    keepers: never[];
    thresholds: never[];
    reminders: string[];
}

/**
 * Changes a holder's stack of a kind (STK-5): by and spend as a counter without a maximum (CNT-3, CNT-4), to with a whole number from 0 up; at 0 the entry goes, and
 * a kind no longer carried leaves equipped (STK-11).
 */
export function changeStack(
    root: string,
    context: Context,
    world: World,
    holder: Page,
    kind: Page,
    input: { by?: number | string; spend?: number | string; to?: number | string; why?: string; },
): StackChange
{
    const given = (["by", "spend", "to"] as const).filter((parameter) => input[parameter] !== undefined);

    if (given.length !== 1) {
        throw new Error(`Give one of by, spend or to, as a number of pieces, such as change ${holder.name}, ${kind.name}, spend 1. Nothing changed.`);
    }

    const parameter = given[0];
    const amount = piecesOf(input[parameter], parameter, holder, kind);
    const held = heldStack(world, holder, kind, (container) => `change ${container.name}, ${kind.name}, ${parameter} ${amount}`, Math.max(1, amount));
    const name = stackName(held.stack);
    const before = held.stack.count;

    if (parameter === "spend" && amount > before) {
        throw new Error(`${holder.name} has ${before} ${name}: cannot spend ${amount}. Nothing changed.`);
    }

    const after = parameter === "to" ? amount : parameter === "spend" ? before - amount : Math.max(0, before + amount);
    const beyond = parameter === "by" && before + amount < 0 ? -(before + amount) : 0;
    const inside = held.container === holder ? "" : `in ${held.container.name}`;
    const short = beyond === 0 ? "" : `stopped at 0, ${beyond} short`;

    if (after === before) {
        return {
            page: holder.name,
            field: name,
            before: String(before),
            after: String(after),
            note: [inside, short].filter((part) => part !== "").join("; "),
            changed: false,
            due: [],
            followers: [],
            keepers: [],
            thresholds: [],
            reminders: [],
        };
    }

    const steps = [{ container: held.container, kind, before, after, ...(held.stack.label === undefined ? {} : { label: held.stack.label }) }];
    const written = applyMove(world, { edits: stackEdits(steps), moving: [] });
    logStackSteps(root, context, world, steps, input.why?.trim() === "" ? undefined : input.why, { [parameter]: amount, ...(beyond === 0 ? {} : { beyond }) });
    const unequipped = after === 0 ? unequipKinds(written, [kind]).notes : [];
    const gone = after === 0 ? `gone from ${held.container.name}` : "";
    return {
        page: holder.name,
        field: name,
        before: String(before),
        after: String(after),
        note: [inside, short, gone].filter((part) => part !== "").join("; "),
        changed: true,
        due: [],
        followers: [],
        keepers: [],
        thresholds: [],
        reminders: unequipped,
    };
}

/**
 * Writes a plan with stack steps in it, and their lines in the log (STK-12): stopped halfway, the lines of the stacks already written are still logged, then the stop is
 * said (STK-9).
 */
function applyLogged(root: string, context: Context, world: World, plan: MovePlan, steps: StackStep[], why?: string, asked: Record<string, unknown> = {}): World
{
    try {
        const after = applyMove(world, plan);
        logStackSteps(root, context, world, steps, why, asked);
        return after;
    } catch (error) {
        if (error instanceof MoveStopped) {
            logStackSteps(root, context, world, steps.filter((step) => error.written.includes(step.container.path)), why, asked);
        }

        throw error;
    }
}

/** A number of pieces as change takes it: a whole number, above 0 to spend, from 0 up to set; by may be below 0. */
function piecesOf(value: number | string | undefined, parameter: "by" | "spend" | "to", holder: Page, kind: Page): number
{
    const number = typeof value === "number" ? value : /^\s*[+-]?\d+\s*$/.test(String(value)) ? Number(value) : Number.NaN;
    const example = parameter === "by" ? "by -1" : parameter === "spend" ? "spend 1" : "to 5";

    if (!Number.isSafeInteger(number) || (parameter === "spend" && number <= 0) || (parameter === "to" && number < 0)) {
        const what = parameter === "spend" ? "a whole number above 0" : parameter === "to" ? "a whole number from 0 up" : "a whole number";
        throw new Error(`${kind.name} is a stack on ${holder.name}, counted in pieces: give ${parameter} ${what}, such as change ${holder.name}, ${kind.name}, ${example}. Nothing changed.`);
    }

    return number;
}

/** Whether two pages are the same one, as read in two worlds. */
function samePage(first: Page, second: Page): boolean
{
    return first.path === second.path && first.system === second.system;
}
