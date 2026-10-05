import { z } from "zod";
import { requireCampaign } from "../campaign/index.ts";
import type { Context } from "../core/context.ts";
import { appendLogEntry } from "../core/log.ts";
import type { Problem } from "../core/problem.ts";
import { defineCommand } from "../core/registry.ts";
import { comparableText, withArticle } from "../core/text.ts";
import { formatCounter, readCounter } from "../counters/index.ts";
import { readEffects } from "../effects/index.ts";
import { type Coin, formatAmount, namesCoins, readAmount } from "../money/index.ts";
import {
    baseValue,
    changedEnvironment,
    changedFields,
    checkFieldChange,
    derivedPages,
    environmentAt,
    type FieldChange,
    findPage,
    followersOf,
    formatEnvironmentEntry,
    holdsField,
    inheritedFields,
    introductionFollowersOf,
    introductionText,
    isCounterField,
    isEmptyField,
    isNeverInherited,
    isStandardField,
    keepersOf,
    linksIn,
    listFieldNames,
    loadWorld,
    misspelledFieldProblem,
    misspelledStandardField,
    newBaseProblem,
    newPageFields,
    ownFieldChange,
    type Page,
    pageNamed,
    type PageType,
    pageTypeNames,
    parsePageReference,
    playerConcerns,
    readEnvironment,
    readFieldValue,
    removedFieldName,
    sameAsBase,
    sectionFollowersOf,
    type TextMode,
    textParts,
    withPage,
    type World,
    writePage,
    writtenFieldName,
} from "../pages/index.ts";
import type { Scene } from "../scene/index.ts";
import { effectsField } from "./effect-layer.ts";
import { conditionNotes, consequencesNotes, eventFieldsProblem, fireEvents, heldNote, nowDueNote, plannedEventDateProblem } from "./game-events.ts";
import { campaignCoins } from "./game-money.ts";
import { checkNotCopied, copyChanges, copyLink, copyName, copyPage, readOpenScene, updateScene } from "./game-scene.ts";
import { newDatedLogEntry, readPresent } from "./game-time.ts";
import { followersNote, keepersNote, skippedPagesNote } from "./notes.ts";

/** What a write did, on a page or on a copy in the open scene. */
interface WriteResult
{
    page: string;
    type?: PageType;
    path: string;
    created: boolean;
    changed: boolean;
    set: string[];
    /** Fields given the value the page reads from a base, which it holds no more: "ac again as Lupo" (D-125). */
    again: string[];
    unset: string[];
    add: string[];
    remove: string[];
    section?: string;
    mode?: TextMode;
    /** For a copy in the open scene: the creature it copies. */
    copyOf?: string;
    /** The pages that changed with this one, and why (INH-11). */
    followers: string[];
    followersWhy: string;
    /** What else the master should know: pages that keep their own value, values a page keeps after its creature changed. */
    notes: string[];
    problems: string[];
}

// How the output names each way of writing text.
const textChanges = { replace: "wrote", append: "added to", remove: "removed" };

// Fields arrive as field=value strings from a command line, or as an object through MCP.
const fieldValues = z.union([z.array(z.string()), z.record(z.string(), z.unknown())]);

export const write = defineCommand({
    name: "write",
    description: "Create or change a page of the world. "
        + "The world's pages are written only with this command: use it as soon as something becomes true in the story, such as a new character, place or item, or a change. "
        + "Without a section it writes the introduction, the text before the first heading; with Page#Name it writes one section, or one secret written > [!secret] Name. "
        + "Add secret to create a missing one as a secret; empty text removes the section or secret. "
        + 'A list field changes one item at a time with add and remove; a place\'s environment, one line at a time, such as add environment="light: dark". '
        + "It also writes the fields of a copy in the open scene. Moving someone or something goes with move, what a character learns with reveal, conditions and forms with effect. "
        + 'Example: page Bruna, type character, set role=npc, text "A ferry keeper who knows every current of the river."',
    group: "game",
    positionals: ["page"],
    input: z.object({
        page: z.string().describe("name of the page, or of a copy in the open scene; Page#Name writes one section or one secret"),
        type: z.enum(pageTypeNames).optional().describe(`type of a new page: ${pageTypeNames.map((type) => (type === "place" ? "place (anywhere one can be, even a cart or a ship)" : type)).join(", ")}`),
        set: fieldValues.optional().describe('fields to set: field=value, repeatable, or an object such as {"role": "npc"}. A link is [[Page]], links are [[A]], [[B]], a list is [a, b]'),
        unset: z.array(z.string()).optional().describe("fields to remove, repeatable"),
        add: fieldValues.optional().describe("items to add to list fields: field=value, repeatable, such as factions=[[Barcaioli]], or an object"),
        remove: fieldValues.optional().describe("items to remove from list fields: field=value, repeatable, or an object"),
        text: z.string().optional().describe("text of the introduction, the part before the first heading; or of the section or secret given"),
        section: z.string().optional().describe("section or secret to write; a missing one is added at the end of the page, as a secret if secret is given; empty text removes it"),
        append: z.boolean().optional().describe("add the text at the end instead of replacing"),
        secret: z.boolean().optional().describe("with a section: create it, if missing, as a secret block > [!secret] Name"),
    }),

    run(input, context): WriteResult
    {
        const root = requireCampaign(context.folder);
        const reference = parsePageReference(input.page);

        if (input.section !== undefined && reference.section !== undefined) {
            throw new Error("Give the section either in the page name (Page#Section) or as section, not both.");
        }

        const section = input.section ?? reference.section;

        if ((section !== undefined || input.append) && input.text === undefined) {
            throw new Error("Give the text to write.");
        }

        const { coins, problem: coinsProblem } = campaignCoins(root);
        const fields: FieldChange = {
            set: input.set === undefined ? undefined : asAmounts(oneItemLists(readFields(input.set)), coins),
            unset: input.unset,
            add: input.add === undefined ? undefined : readListItems(input.add),
            remove: input.remove === undefined ? undefined : readListItems(input.remove),
        };
        const moneyNotes = moneyNotesOf(reference.name, fields.set, coins, coinsProblem);
        const world = loadWorld(root);
        const open = readOpenScene(root);
        const copy = copyName(world, open.scene, reference.name);

        if (open.scene !== undefined && copy !== undefined) {
            checkNoEffects(fields, copyPage(copy, open.scene.copies[copy]));
            const written = writeCopy(root, world, context, open.scene, copy, { type: input.type, text: input.text, section }, fields, coins);
            return { ...written, notes: [...written.notes, ...moneyNotes] };
        }

        const existing = findPage(world, reference.name);
        checkNoEffects(fields, existing);

        if (existing === undefined && input.type === undefined) {
            const copies = open.scene === undefined ? "" : ", nor a copy of that name in the open scene";
            const unreadable = open.problem === undefined ? "" : " The open scene in state.yaml cannot be read, so a copy in it cannot be written: validate shows how to fix it.";
            const aliased = pageNamed(world, reference.name);
            const alias = aliased === undefined ? "" : ` ${reference.name} is an alias of ${aliased.name}: to change that page, write ${aliased.name}.`;
            throw new Error(`There is no page named ${reference.name}${copies}.${alias} To create it, give its type: ${pageTypeNames.join(", ")}.${unreadable}`);
        }

        const type = existing?.type ?? input.type;
        conditionsAsList(existing, fields);
        checkFieldNames(type, fields);
        checkFieldChange(type, fields);
        environmentAsSet(world, existing, type, reference.name, fields);
        checkValues(fields);

        if (existing !== undefined) {
            if (changedFieldNames(fields).some(passesOn)) {
                checkNotCopied(world, open, existing);
            }

            checkCounters(world, existing, fields.set, coins);
            checkClearedCounters(world, existing, ownFieldChange(world, existing, fields), coins);
            checkLists(world, existing, fields);
        }

        checkBase(world, existing?.name ?? reference.name, type, fields.set);
        checkEventFields(world, existing, type, fields);
        const { page, created, changed, mode } = writePage(world, reference.name, input.type, { ...fields, text: input.text, section, append: input.append, secret: input.secret });

        if (changed) {
            const data = { page: page.name, type: page.type, ...fields, section, secret: input.secret, text: input.text, mode };
            appendLogEntry(root, newDatedLogEntry(root, context, created ? "page-created" : "page-updated", "hidden", data));
        }

        const now = withPage(world, existing, page);
        const followers = changed ? followersOfWrite(now, existing, page) : { pages: [], why: "" };

        if (changed && existing !== undefined) {
            const self: [Page, Page][] = changedNames(existing, page).some((field) => comparableText(field) === "creature") ? [[existing, page]] : [];
            logCounterChanges(root, context, world, now, [...self, ...followers.pages.map((follower): [Page, Page] => [follower, follower])], coins);
        }

        const notes = !changed ? [] : existing === undefined ? derivesFromNothingNote(now, page) : [...keepersNotes(now, existing, page), ...ownValuesNote(now, existing, page, coins)];
        const story = changed && changedFieldNames(fields).length > 0 ? storyNotes(root, context, world, now, existing, page) : [];
        const result = { page: page.name, type: page.type, path: page.path, created, changed, ...writtenNames(world, existing, fields, page), section, mode };
        return { ...result, followers: followers.pages.map((follower) => follower.name), followersWhy: followers.why, notes: [...story, ...notes, ...moneyNotes], problems: world.problems };
    },

    format(result)
    {
        const where = result.section === undefined ? "the introduction" : `"${result.section}"`;
        const changes = [
            result.set.length > 0 ? `set ${result.set.join(", ")}` : "",
            ...result.again,
            result.unset.length > 0 ? `removed ${result.unset.join(", ")}` : "",
            result.add.length > 0 ? `added to ${result.add.join(", ")}` : "",
            result.remove.length > 0 ? `removed from ${result.remove.join(", ")}` : "",
            result.mode === undefined ? "" : `${textChanges[result.mode]} ${where}`,
        ].filter((change) => change !== "");
        const summary = result.changed ? changeSummary(result, changes) : `Nothing changed on ${result.page}: it already reads like that.`;
        const followers = followersNote(result.followers, result.followersWhy, "write");
        return [[summary, followers, ...result.notes].filter((line) => line !== "").join("\n"), skippedPagesNote(result.problems)].filter((block) => block !== "").join("\n\n");
    },
});

/** Writes the fields of a copy in the open scene (INH-14): only what differs from its creature, never its text, the creature it copies or fixed fields. */
function writeCopy(root: string, world: World, context: Context, scene: Scene, name: string, input: { type?: PageType; text?: string; section?: string; }, requested: FieldChange, coins: Coin[] | undefined): WriteResult
{
    const creature = copyLink(scene.copies[name]);

    if (input.type !== undefined) {
        throw new Error(`${name} is a copy of ${creature} in the open scene, not a page: leave out type to write its fields, or give the new page another name.`);
    }

    if (input.text !== undefined || input.section !== undefined) {
        throw new Error(`${name} is a copy of ${creature} in the open scene: it has no text of its own, only fields that differ from its creature, such as set frightened=true. ${promotion(name, creature, "text")}`);
    }

    const names = changedFieldNames(requested);

    if (names.length === 0) {
        throw new Error(`Nothing to write on ${name}: give fields to set, unset, add or remove.`);
    }

    names.forEach((field) => checkCopyField(name, creature, field));
    checkFieldChange("creature", requested);
    checkValues(requested);
    const before = copyPage(name, scene.copies[name]);
    checkCounters(world, before, requested.set, coins);
    const change = ownFieldChange(world, before, requested);
    checkClearedCounters(world, before, change, coins);
    checkLists(world, before, requested);

    (requested.unset ?? []).forEach((field, index) => {
        if (!Object.hasOwn(before.fields, change.unset?.[index] ?? field)) {
            const base = baseValue(world, before, field);
            throw new Error(`${name} has no field "${field}" to remove${base === undefined ? "" : `: it reads ${base.name} from ${base.base.name}, and holds no value of its own`}.`);
        }
    });

    const own = copyChanges(scene.copies[name]);
    const written = changedFields(own, change);
    const virtual = copyPage(name, { creature, ...written });
    const touched = [...Object.keys(change.set ?? {}), ...Object.keys(change.add ?? {}), ...Object.keys(change.remove ?? {})];
    const after = Object.fromEntries(Object.entries(written).filter(([field]) => !touched.includes(field) || !sameAsBase(world, virtual, field)));
    const changed = [...new Set([...Object.keys(own), ...Object.keys(after)])].filter((field) => JSON.stringify(own[field]) !== JSON.stringify(after[field]));

    if (changed.length > 0) {
        updateScene(root, changed.map((field) => [["copies", name, field], after[field]]));
        appendLogEntry(root, newDatedLogEntry(root, context, "page-updated", "hidden", { page: name, copy: true, ...requested }));
    }

    const result = { page: name, type: before.type, path: "state.yaml", created: false, changed: changed.length > 0, ...writtenNames(world, before, requested, copyPage(name, { creature, ...after })) };
    return { ...result, copyOf: creature, followers: [], followersWhy: "", notes: [], problems: world.problems };
}

/** A copy holds only what it would otherwise read from its creature: not the creature it copies, nor fixed fields or relations (INH-8, INH-14). */
function checkCopyField(name: string, creature: string, field: string): void
{
    if (comparableText(field) === "creature") {
        throw new Error(`creature is what ${name} copies, and it does not change: to bring in another creature, add a copy of it with scene add.`);
    }

    if (isStandardField("creature", field) || misspelledStandardField("creature", field) !== undefined || isNeverInherited(field)) {
        throw new Error(`${field} is not a field a copy holds: a copy holds only what differs from its creature, ${creature}, such as a counter (conditions and forms go with effect). ${promotion(name, creature, field)}`);
    }
}

/** How a copy becomes a page of its own, to hold text, relations or a status: it leaves the scene and comes back as a character (D-110, INH-14). */
function promotion(name: string, creature: string, what: string): string
{
    return `To give it ${what} of its own, make it a character: show it to read its values, let it leave with scene leave, write ${name} as a character with creature=${creature} and those values, then bring it back with scene add.`;
}

/** Effects change only with the effect command, which works out when they end and says what they change (EFF-6). */
function checkNoEffects(change: FieldChange, page: Page | undefined): void
{
    // Effects that do not read can only be removed by hand, or with unset: effect will not write over them (EFF-12).
    const unreadable = page !== undefined && "problem" in readEffects(effectsField(page));
    const onlyUnset = Object.keys(change.set ?? {}).every((name) => comparableText(name) !== "effects") && [change.add, change.remove].every((items) => Object.keys(items ?? {}).every((name) => comparableText(name) !== "effects"));

    if (unreadable && onlyUnset) {
        return;
    }

    if (changedFieldNames(change).some((name) => comparableText(name) === "effects")) {
        throw new Error('effects change only with the effect command: action add with a name, for how long and the values it gives, such as name "Scudo della fede", for 10m, set ac=15; action end to take one away. Nothing changed.');
    }
}

/** A standard field written in another case, such as Status, would be a field the engine does not read: refused before any other check. */
function checkFieldNames(type: PageType | undefined, change: FieldChange): void
{
    const names = [...Object.keys(change.set ?? {}), ...Object.keys(change.add ?? {}), ...Object.keys(change.remove ?? {})];
    const problem = names.map((name) => misspelledFieldProblem(type, name)).find((found) => found !== undefined);

    if (problem !== undefined) {
        throw new Error(problem);
    }
}

/** A counter written as current/max changes only with change, which keeps its limits and logs why (D-92, INH-11). A value that is not a counter makes it something else: on a page that holds it alone, only after unset. */
function checkCounters(world: World, page: Page, set: Record<string, unknown> | undefined, coins: Coin[] | undefined): void
{
    const fields = inheritedFields(world, page);

    for (const [field, value] of Object.entries(set ?? {}).filter(([, candidate]) => !isEmptyField(candidate))) {
        const name = Object.keys(fields).find((key) => comparableText(key) === comparableText(field));
        const current = name === undefined || (isStandardField(page.type, name) && !isCounterField(page.type, name)) ? undefined : guarded(fields[name], coins);
        const next = current === undefined ? undefined : sameKind(current.kind, value, coins);
        const base = baseValue(world, page, field);

        if (name === undefined || current === undefined || next === current.text || (next === undefined && base !== undefined)) {
            continue;
        }

        throw new Error(guardedMessage(page, name, current.kind, next, holdsField(page, name) ? undefined : base?.base, base !== undefined));
    }
}

/** A value that changes only with change, as it is compared: a current/max counter (D-92) or money (MON-6); undefined for any other. */
function guarded(value: unknown, coins: Coin[] | undefined): { kind: "counter" | "money"; text: string; } | undefined
{
    const counter = readCounter(value);

    if (counter?.max !== undefined) {
        return { kind: "counter", text: String(formatCounter(counter)) };
    }

    const purse = coins === undefined ? undefined : readAmount(value, coins);
    return purse === undefined || coins === undefined ? undefined : { kind: "money", text: formatAmount(purse, coins) };
}

/** A new value read as the kind it would replace: any counter for a counter, coins for money; undefined when it is something else. */
function sameKind(kind: "counter" | "money", value: unknown, coins: Coin[] | undefined): string | undefined
{
    const counter = kind === "counter" ? readCounter(value) : undefined;
    const purse = kind === "money" && coins !== undefined ? readAmount(value, coins) : undefined;
    return counter !== undefined ? String(formatCounter(counter)) : purse !== undefined && coins !== undefined ? formatAmount(purse, coins) : undefined;
}

function guardedMessage(page: Page, field: string, kind: "counter" | "money", next: string | undefined, readFrom: Page | undefined, hasBase: boolean): string
{
    const what = kind === "counter" ? "a counter" : "money";
    const other = hasBase ? `To make it something else, set a value that is not ${what}.` : "To make it something else, unset it, then set it.";

    if (kind === "money") {
        const from = readFrom === undefined ? "" : `, which it reads from ${readFrom.name},`;
        const purse = next === undefined ? "sets the purse" : `"${next}" sets the purse`;
        return `${page.name}'s ${field}${from} changes only with change, page "${page.name}", field ${field}: spend pays, by adds coins, to ${purse}${readFrom === undefined ? "" : `, on ${page.name} only`}. ${other}`;
    }

    const use = `use change, page "${page.name}", field ${field}, to ${next ?? "a value"} (or by an amount)`;
    return readFrom === undefined ? `${field} is ${what}: ${use}. ${other}` : `${field} is ${what} that ${page.name} reads from ${readFrom.name}: ${use}, which writes it on ${page.name} only. ${other}`;
}

/**
 * Removing a counter that a base also holds as current/max would bring back the base's value with no line in the log: change does it, and logs it (INH-11).
 * `change` names the fields as the page writes them. The same field written twice in another case may lose one of the two: validate asks for it.
 */
function checkClearedCounters(world: World, page: Page, change: FieldChange, coins: Coin[] | undefined): void
{
    for (const own of (change.unset ?? []).filter((field) => Object.hasOwn(page.fields, field))) {
        const current = isStandardField(page.type, own) ? undefined : guarded(page.fields[own], coins);
        const base = baseValue(world, page, own);
        const fromBase = base === undefined ? undefined : guarded(base.value, coins);
        const alsoHeld = Object.keys(page.fields).some((other) => other !== own && comparableText(other) === comparableText(own) && !isEmptyField(page.fields[other]));

        if (!alsoHeld && base !== undefined && current !== undefined && fromBase?.kind === current.kind) {
            const value = current.kind === "counter" ? fromBase.text : `"${fromBase.text}"`;
            const start = current.kind === "counter" ? `${own} on ${page.name} is a counter: without it,` : `Without ${own},`;
            throw new Error(
                `${start} ${page.name} would read ${fromBase.text} from ${base.base.name}, with no line in the log. Use change, page "${page.name}", field ${own}, to ${value}: it takes the field off, and ${page.name} follows ${base.base.name} again.`,
            );
        }
    }
}

/** A character or creature derives only from another creature, never in a loop (INH-2, INH-3). */
function checkBase(world: World, name: string, type: PageType | undefined, set: Record<string, unknown> | undefined): void
{
    const link = set?.creature;
    const problem = typeof link === "string" ? newBaseProblem(world, { name, type }, link) : undefined;

    if (problem !== undefined) {
        throw new Error(`${problem} Nothing changed.`);
    }
}

/**
 * A planned event comes due at its date, so a write that sets its date or status cannot leave a date the engine does not read (D-100);
 * nor a clock or conditions that do not read (EVT-10).
 */
function checkEventFields(world: World, page: Page | undefined, type: PageType | undefined, change: FieldChange): void
{
    const changed = changedFieldNames(change);

    if (type !== "event" || !["date", "status", "clock", "when"].some((field) => changed.includes(field))) {
        return;
    }

    const fields = changedFields(page?.fields ?? newPageFields(type), change);
    const date = changed.includes("date") || changed.includes("status") ? plannedEventDateProblem(type, fields) : undefined;
    const problem = date ?? eventFieldsProblem(world, fields, changed);

    if (problem !== undefined) {
        throw new Error(problem);
    }
}

/**
 * What the write set off in the story: the events it made due or that wait for the date it gave them (EVT-4, EVT-5), conditions on pages that do not exist yet,
 * and the planned events and quests linked to what changed (D-117, EVT-7).
 */
function storyNotes(root: string, context: Context, before: World, after: World, existing: Page | undefined, page: Page): string[]
{
    const present = readPresent(root).date;
    const fired = fireEvents(root, context, before, after, present);
    const written = fired.world.pages.find((candidate) => candidate.path === page.path) ?? page;
    const conditions = page.type === "event" && JSON.stringify(existing?.fields.when) !== JSON.stringify(page.fields.when) ? conditionNotes(fired.world, page.fields.when) : [];
    const consequences = consequencesNotes(fired.world, existing, written, fired.due.map((event) => event.name), present);
    return [nowDueNote(fired.due), heldNote(fired.held), ...conditions, ...consequences].filter((note) => note !== "");
}

/**
 * A place's environment changes entry by entry (ENV-4): add puts a line in, or in place of the one with its name; remove takes one out by name; set gives them all,
 * each read as a line. The lines it ends with are set whole, or the field goes when none is left.
 */
function environmentAsSet(world: World, page: Page | undefined, type: PageType | undefined, name: string, change: FieldChange): void
{
    const add = change.add?.environment;
    const remove = change.remove?.environment;

    // On a character or an item environment would hold for nothing (ENV-6); taking it away is always allowed.
    if ((type === "character" || type === "item") && (change.set?.environment !== undefined || add !== undefined)) {
        throw new Error(`${name} is ${withArticle(type)}: an environment holds only on a place, for all it contains. What a thing does around itself, such as a lantern's light, is a field or an effect of its own.`);
    }

    if (type !== "place") {
        return;
    }

    if (change.set?.environment !== undefined) {
        const read = readEnvironment(change.set.environment);

        if ("problem" in read) {
            throw new Error(read.problem);
        }

        // Written back as lines, which Obsidian edits, whatever way they were given.
        change.set.environment = read.entries.map(formatEnvironmentEntry);
    }

    if (add === undefined && remove === undefined) {
        return;
    }

    checkOwnEntries(world, page, name, remove ?? []);
    const lines = changedEnvironment(page?.fields.environment, add ?? [], remove ?? [], page?.name ?? name);
    delete change.add?.environment;
    delete change.remove?.environment;

    if (lines.length > 0) {
        change.set = { ...change.set, environment: lines };
    } else if (page !== undefined && Object.hasOwn(page.fields, "environment")) {
        change.unset = [...(change.unset ?? []), "environment"];
    }
}

/** An entry to remove that the place does not write but reads from a place around it: removing it there would change it for all that place holds. */
function checkOwnEntries(world: World, page: Page | undefined, name: string, remove: unknown[]): void
{
    const own = page === undefined ? [] : readEnvironmentNames(page.fields.environment);

    for (const entry of remove.map((item) => String(item).split(":")[0].trim())) {
        const outer = page === undefined || own.some((other) => comparableText(other) === comparableText(entry)) ? undefined : environmentAt(world, page).find((found) => comparableText(found.entry.name) === comparableText(entry));

        if (outer !== undefined) {
            throw new Error(
                `${entry} holds in ${name} from ${outer.place.name}: to change it in ${name} only, add environment="${outer.entry.name}: …" on ${name}; to remove it everywhere ${outer.place.name} holds, write ${outer.place.name}, remove environment=${outer.entry.name}.`,
            );
        }
    }
}

/** The names a place's environment writes, as far as its lines read. */
function readEnvironmentNames(value: unknown): string[]
{
    const read = readEnvironment(value);
    return "entries" in read ? read.entries.map((entry) => entry.name) : [];
}

/** Adding a condition to an event that has one makes a list of the two, of which one is enough (EVT-3). */
function conditionsAsList(page: Page | undefined, change: FieldChange): void
{
    const current = page?.type === "event" ? page.fields.when : undefined;

    if (change.add?.when !== undefined && typeof current === "string" && current.trim() !== "" && change.set?.when === undefined) {
        change.set = { ...change.set, when: [current, ...change.add.when] };
        delete change.add.when;
    }
}

/**
 * The pages that change with a page a write changed (INH-11): all those deriving from it when it is new or derives from another creature now;
 * else those that read a field it changed, or show the section it wrote.
 */
function followersOfWrite(now: World, before: Page | undefined, after: Page): { pages: Page[]; why: string; }
{
    if (after.type !== "creature") {
        return { pages: [], why: "" };
    }

    const changed = [...new Set([...Object.keys(before?.fields ?? {}), ...Object.keys(after.fields)])].filter((field) => JSON.stringify(before?.fields[field]) !== JSON.stringify(after.fields[field]));

    if (before === undefined || changed.some((field) => comparableText(field) === "creature")) {
        return { pages: derivedPages(now, after), why: `since they derive from ${after.name}` };
    }

    const byField = changed.map((field) => ({ name: field, pages: followersOf(now, after, field) }));
    const bySection = changedParts(before.body, after.body).map((part) => ({ name: part === "" ? "a secret without a name" : `#${part}`, pages: part === "" ? derivedPages(now, after) : sectionFollowersOf(now, after, part) }));
    const byIntroduction = introductionText(before.body) === introductionText(after.body) ? [] : [{ name: "the introduction", pages: introductionFollowersOf(now, after) }];
    const reasons = [...byField, ...bySection, ...byIntroduction].filter((reason) => reason.pages.length > 0);
    const pages = new Set(reasons.flatMap((reason) => reason.pages));
    return { pages: now.pages.filter((page) => pages.has(page)), why: `since they read ${reasons.map((reason) => reason.name).join(", ")} from ${after.name}` };
}

/** The names of the sections and secrets that a text has with another text, gained or no longer has; "" when its secrets without a name changed, which every derived page shows. */
function changedParts(before: string, after: string): string[]
{
    const texts = (body: string): Map<string, string> => new Map(textParts(body).filter((part) => part.name !== "").map((part) => [comparableText(part.name), part.text]));
    const unnamed = (body: string): string => textParts(body).filter((part) => part.name === "").map((part) => part.text).join("\n");
    const old = texts(before);
    const now = texts(after);
    const names = new Map(textParts(`${before}\n\n${after}`).filter((part) => part.name !== "").map((part) => [comparableText(part.name), part.name]));
    const named = [...names].filter(([key]) => old.get(key) !== now.get(key)).map(([, name]) => name);
    return unnamed(before) === unnamed(after) ? named : [...named, ""];
}

/**
 * One public line for each counter that a write changed through inheritance on a page that concerns the player: a page that follows the base written,
 * or the page itself when its creature changes. Its name, the field, before and after (INH-10, INH-11). Each page comes as it was and as it is.
 */
function logCounterChanges(root: string, context: Context, world: World, now: World, pages: [Page, Page][], coins: Coin[] | undefined): void
{
    const concerns = playerConcerns(now);

    for (const [before, after] of pages.filter(([, page]) => concerns(page))) {
        const old = inheritedFields(world, before);

        for (const [field, value] of Object.entries(inheritedFields(now, after)).filter(([name]) => !isStandardField(after.type, name))) {
            const was = countedText(readField(old, field), coins);
            const is = countedText(value, coins);

            if (was !== undefined && is !== undefined && was !== is) {
                appendLogEntry(root, newDatedLogEntry(root, context, "counter-changed", "public", { page: after.name, field, before: was, after: is }));
            }
        }
    }
}

/** A counter or money as the log writes it; undefined for any other value. */
function countedText(value: unknown, coins: Coin[] | undefined): number | string | undefined
{
    const purse = coins === undefined ? undefined : readAmount(value, coins);
    const counter = readCounter(value);
    return purse !== undefined && coins !== undefined ? formatAmount(purse, coins) : counter === undefined ? undefined : formatCounter(counter);
}

/** Money given to set, written as the engine writes it (MON-2): from the coin worth most, by first names. */
function asAmounts(set: Record<string, unknown>, coins: Coin[] | undefined): Record<string, unknown>
{
    return Object.fromEntries(
        Object.entries(set).map(([field, value]) => {
            const purse = coins === undefined ? undefined : readAmount(value, coins);
            return [field, purse === undefined || coins === undefined ? value : formatAmount(purse, coins)];
        }),
    );
}

/** What a write should say about money: a value that names coins but does not read as money, and coins that cannot be read (MON-2, MON-8). */
function moneyNotesOf(page: string, set: Record<string, unknown> | undefined, coins: Coin[] | undefined, problem: Problem | undefined): string[]
{
    const texts = Object.entries(set ?? {}).filter(([, value]) => typeof value === "string") as [string, string][];
    const unread = coins === undefined ? [] : texts.filter(([, value]) => readAmount(value, coins) === undefined && namesCoins(value, coins));
    const notes = unread.map(([field, value]) => `${field} on ${page} is "${value}", which is not money: write the coins one after the other, such as ${field}=12 ${coins?.[0].name ?? ""}, to count them.`);
    const looksLikeMoney = texts.some(([, value]) => /\d+\s*\p{L}/u.test(value));
    return problem !== undefined && looksLikeMoney ? [...notes, `The campaign's coins cannot be read, so no money is counted: ${problem.message} To fix it, ${problem.fix}.`] : notes;
}

/** A page created with a name that characters or creatures give as their creature, though it is not one: they derive from nothing (INH-2). */
function derivesFromNothingNote(now: World, page: Page): string[]
{
    if (page.type === "creature") {
        return [];
    }

    const linking = now.pages.filter((other) => (other.type === "creature" || other.type === "character") && linksIn(other.fields.creature).some((name) => comparableText(name) === comparableText(page.name)));
    return linking.length === 0
        ? []
        : [`${linking.map((other) => other.name).join(", ")} name ${page.name} as their creature, but it is ${withArticle(page.type ?? "free page")}: they derive from nothing until creature links to a creature.`];
}

/** "Not changed, since they hold their own fiuto: Grigio (fiuto 2)": for each field a write changed on a base, the pages deriving from it that keep their own value. */
function keepersNotes(now: World, before: Page, after: Page): string[]
{
    if (after.type !== "creature") {
        return [];
    }

    return changedNames(before, after).flatMap((field) => {
        const keepers = keepersOf(now, after, field).map((keeper) => `${keeper.name} (${field} ${valueText(readField(inheritedFields(now, keeper), field))})`);
        const note = keepersNote(keepers, field);
        return note === "" ? [] : [note];
    });
}

/** After its creature changes, the values a page keeps that its new bases give otherwise: they may belong to the old one (D-125). */
function ownValuesNote(now: World, before: Page, after: Page, coins: Coin[] | undefined): string[]
{
    if (!changedNames(before, after).some((field) => comparableText(field) === "creature")) {
        return [];
    }

    const kept = Object.entries(after.fields).filter(([field, value]) => !isEmptyField(value) && !isNeverInherited(field)).flatMap(([field, value]) => {
        const base = baseValue(now, after, field);
        return base === undefined || JSON.stringify(base.value) === JSON.stringify(value) ? [] : [{ field, value, base }];
    });

    if (kept.length === 0) {
        return [];
    }

    // A current/max counter or money goes back to the base's value with change; anything else is removed.
    const back = kept.map(({ field, value, base }) => {
        const mine = guarded(value, coins);
        const theirs = guarded(base.value, coins);
        return mine !== undefined && mine.kind === theirs?.kind ? `change ${field} to ${mine.kind === "money" ? `"${theirs.text}"` : theirs.text}` : `unset ${field}`;
    });
    const listed = kept.map(({ field, value, base }) => `${field} ${valueText(value)} (${base.base.name} gives ${valueText(base.value)})`);
    return [`${after.name} keeps its own ${listed.join(", ")}. If they came from its old creature: ${back.join(", ")}.`];
}

/** The fields whose value a write changed on a page. */
function changedNames(before: Page, after: Page): string[]
{
    return [...new Set([...Object.keys(before.fields), ...Object.keys(after.fields)])].filter((field) => JSON.stringify(before.fields[field]) !== JSON.stringify(after.fields[field]));
}

/** The value a page reads for a field, written in any case. */
function readField(fields: Record<string, unknown>, field: string): unknown
{
    return Object.entries(fields).find(([name]) => comparableText(name) === comparableText(field))?.[1];
}

/** A value as the outputs show it: a list as its items, anything else as written. */
function valueText(value: unknown): string
{
    return Array.isArray(value) ? value.map(String).join(", ") : typeof value === "object" && value !== null ? JSON.stringify(value) : String(value);
}

/** Whether changing a field reaches the pages and copies deriving from a page: a field they inherit, or the creature it derives from. */
function passesOn(field: string): boolean
{
    return !isNeverInherited(field) || comparableText(field) === "creature";
}

function changedFieldNames(change: FieldChange): string[]
{
    return [...Object.keys(change.set ?? {}), ...(change.unset ?? []), ...Object.keys(change.add ?? {}), ...Object.keys(change.remove ?? {})];
}

/** A field is given a value: an empty one would count as missing (INH-6), and removing a field is unset, which checks what it would bring back. */
function checkValues(change: FieldChange): void
{
    const [empty] = Object.entries(change.set ?? {}).filter(([, value]) => isEmptyField(value));

    if (empty !== undefined) {
        throw new Error(`Give ${empty[0]} a value. To remove a field, use unset.`);
    }
}

/** Items are added to or removed from a list: one that the page reads as something else, itself or from a base, is set whole first (INH-7). */
function checkLists(world: World, page: Page, change: FieldChange): void
{
    const fields = inheritedFields(world, page);

    for (const field of [...Object.keys(change.add ?? {}), ...Object.keys(change.remove ?? {})].filter((name) => !Object.hasOwn(change.set ?? {}, name))) {
        const [name, value] = Object.entries(fields).find(([key]) => comparableText(key) === comparableText(field)) ?? [];

        if (name !== undefined && !Array.isArray(value)) {
            const base = holdsField(page, name) ? undefined : baseValue(world, page, name)?.base;
            const from = base === undefined ? "" : `, which ${page.name} reads from ${base.name}`;
            throw new Error(`${name} on ${page.name} is ${JSON.stringify(value)}${from}, not a list: items cannot be added to it or removed from it. To make it a list, set it whole, such as set ${name}=[a, b].`);
        }
    }
}

/**
 * The names of the fields a write changed, as the page writes them (INH-5). A value equal to the base's is not written (D-125): it is no change, unless the page
 * held another, which it holds no more ("ac again as Lupo").
 */
function writtenNames(world: World, page: Page | undefined, change: FieldChange, after: Page): { set: string[]; again: string[]; unset: string[]; add: string[]; remove: string[]; }
{
    const names = (fields: string[]): string[] => fields.map((field) => (page === undefined ? field : writtenFieldName(world, page, field)));
    const removed = (change.unset ?? []).map((field) => (page === undefined ? field : removedFieldName(page, field)));
    const [set, add, remove] = [Object.keys(change.set ?? {}), Object.keys(change.add ?? {}), Object.keys(change.remove ?? {})].map(names);
    const now = withPage(world, page, after);
    const base = (field: string): string | undefined => baseValue(now, after, field)?.base.name;
    // What the page held and holds no more, without being removed: it reads it from a base again. What it was given and does not hold: it reads it from a base all the same.
    const gone = page === undefined ? [] : Object.keys(page.fields).filter((field) => !isEmptyField(page.fields[field]) && !Object.hasOwn(after.fields, field) && !removed.includes(field) && base(field) !== undefined);
    const asBase = [...set, ...add, ...remove].filter((field, index, all) => all.indexOf(field) === index && !gone.includes(field) && !Object.hasOwn(after.fields, field) && base(field) !== undefined);
    const shown = (field: string): boolean => !gone.includes(field) && !asBase.includes(field);
    return {
        set: set.filter((field) => shown(field) && JSON.stringify(page?.fields[field]) !== JSON.stringify(after.fields[field])),
        again: [...gone.map((field) => `${field} again as ${base(field)}`), ...asBase.map((field) => `${field} as ${base(field)}`)],
        unset: removed,
        add: add.filter(shown),
        remove: remove.filter(shown),
    };
}

function changeSummary(result: WriteResult, changes: string[]): string
{
    const what = result.copyOf === undefined ? `${result.created ? "Created" : "Updated"} ${result.page} (${result.type ?? "free page"}, ${result.path})` : `Updated ${result.page} (copy of ${result.copyOf} in the open scene)`;
    return changes.length > 0 ? `${what}: ${changes.join("; ")}.` : `${what}.`;
}

/** Fields from field=value pairs, each value read as a link, links, a number, true or false, a list or text; or from an object, as they are. */
function readFields(fields: string[] | Record<string, unknown>): Record<string, unknown>
{
    if (!Array.isArray(fields)) {
        return Object.fromEntries(Object.entries(fields).map(([name, value]) => [name, listFromText(name, value)]));
    }

    // The same name twice would be lost in one object; the same field in another case is refused later, with the other changes.
    const entries = fields.map(readAssignment);
    const repeated = entries.find(([name], index) => entries.findIndex(([other]) => other === name) !== index);

    if (repeated !== undefined) {
        throw new Error(`The field ${repeated[0]} is given twice: give each field once.`);
    }

    return Object.fromEntries(entries);
}

/** Items for list fields: each value gives one item, or several when it is a list; the same field may come more than once. */
function readListItems(fields: string[] | Record<string, unknown>): Record<string, unknown[]>
{
    const items: Record<string, unknown[]> = {};

    for (const [name, given] of Array.isArray(fields) ? fields.map(readAssignment) : Object.entries(fields)) {
        const value = listFromText(name, given);
        items[name] = [...(items[name] ?? []), ...(Array.isArray(value) ? value : [value])];
    }

    return items;
}

/** A field that is always a list, given one item, such as contains=[[Locanda]] or tags=boss, holds a list of that one item; text with commas is left to the check that asks for a list. */
function oneItemLists(set: Record<string, unknown>): Record<string, unknown>
{
    const isList = (name: string): boolean => listFieldNames.some((field) => comparableText(field) === comparableText(name));
    return Object.fromEntries(Object.entries(set).map(([name, value]) => [name, isList(name) && typeof value === "string" && !value.includes(",") && value.trim() !== "" ? [value] : value]));
}

/** Text given through MCP to a field that is always a list, such as "[[A]], [[B]]", read as the command line reads it (D-136); any other value as it is. */
function listFromText(name: string, value: unknown): unknown
{
    return typeof value === "string" && listFieldNames.some((field) => comparableText(field) === comparableText(name)) ? readFieldValue(value) : value;
}

function readAssignment(assignment: string): [string, unknown]
{
    const separator = assignment.indexOf("=");
    const value = assignment.slice(separator + 1).trim();

    if (separator <= 0 || value === "") {
        throw new Error(`Write a field as field=value, not "${assignment}". To remove a field, use unset.`);
    }

    return [assignment.slice(0, separator).trim(), readFieldValue(value)];
}
