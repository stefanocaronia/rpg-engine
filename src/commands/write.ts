import { z } from "zod";
import { requireCampaign } from "../campaign/index.ts";
import type { Context } from "../core/context.ts";
import { fieldsRead, listItemNames, numberOf } from "../core/formula.ts";
import { appendLogEntry } from "../core/log.ts";
import type { Problem } from "../core/problem.ts";
import { defineCommand } from "../core/registry.ts";
import { comparableText, sameName, valueNamed, withArticle } from "../core/text.ts";
import { formatCounter, readCounter } from "../counters/index.ts";
import { readEffects } from "../effects/index.ts";
import { type Coin, formatAmount, namesCoins, readAmount } from "../money/index.ts";
import {
    alwaysInList,
    baseFieldOf,
    baseValue,
    changedEnvironment,
    changedFields,
    checkFieldChange,
    concernsPlayer,
    declaredKind,
    derivedPages,
    environmentAt,
    equippedNotes,
    type FieldChange,
    findPage,
    followersOf,
    formatEnvironmentEntry,
    hidingMessage,
    holdsField,
    inheritedFields,
    introductionFollowersOf,
    introductionText,
    isCounterField,
    isDeclaredUncounted,
    isEmptyField,
    isNeverInherited,
    isPartyMember,
    isStandardField,
    keepersOf,
    linksIn,
    listFieldNames,
    misspelledFieldProblem,
    misspelledStandardField,
    namesakes,
    newBaseProblem,
    newPageFields,
    ownFieldChange,
    type Page,
    pageNamed,
    pagesWithName,
    type PageType,
    pageTypeNames,
    parsePageReference,
    readEnvironment,
    readFieldValue,
    readOnlyMessage,
    removedFieldName,
    sameAsBase,
    sectionFollowersOf,
    systemKnowsReason,
    systemLabel,
    systemPageNamed,
    type TextMode,
    textParts,
    withPage,
    type World,
    writePage,
    writtenFieldName,
} from "../pages/index.ts";
import { featureParts, mergedFeatures } from "../progression/index.ts";
import type { Scene } from "../scene/index.ts";
import type { GameSystem } from "../systems/index.ts";
import { effectiveFields, effectsField } from "./effect-layer.ts";
import { conditionNotes, consequencesNotes, eventFieldsProblem, fireEvents, heldNote, nowDueNote, plannedEventDateProblem } from "./game-events.ts";
import { experienceOf, leastNotes, newLevelNotes } from "./game-experience.ts";
import { gridNotes } from "./game-grids.ts";
import { hereFields, hereOf, placeHere, positionToWrite, writeOrigin } from "./game-here.ts";
import { campaignCoins } from "./game-money.ts";
import { mapLookNotes, shortRoadNotes } from "./game-positions.ts";
import { newQuestNotes, tickedQuestNotes } from "./game-quests.ts";
import { deathNotes, isPlayerDead } from "./game-saves.ts";
import { checkNotCopied, copyChanges, copyLink, copyName, copyPage, readOpenScene, updateScene } from "./game-scene.ts";
import { thresholdNotes } from "./game-thresholds.ts";
import { newDatedLogEntry, readPresent } from "./game-time.ts";
import { campaignSystem, campaignWorld, foreignSystemLanguage, leftOutNote, missingSystemHint, systemBaseHint, systemProblems, systemSearchHint } from "./game-world.ts";
import { followersNote, keepersNote, skippedPagesNote } from "./notes.ts";
import { partText, situationPart } from "./parts.ts";
import { givenItems, progressionOf } from "./progression.ts";
import { checkListValues, joiningNotes } from "./sheet.ts";
import { computedField, counterLimits, hasSheet, isUse, itemLines, maximumHint, maximumSources, missingUses, signedText, startingAtZero, workedMaximum, workedParts } from "./worked-out.ts";

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
    /** For a page whose type changed: what it was, and where (D-159). */
    was?: string;
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
        + "The introduction and sections are what the player reads once their character knows the page: what the character has not found out goes in a secret. "
        + 'A list field changes one item at a time with add and remove; a place\'s environment, one line at a time, such as add environment="light: dark". '
        + 'A place\'s position on the map is given from a place that has one, such as set position="12 km NE of [[Guadoscuro]]"; a region has a radius, such as set radius=10 km. '
        + 'A place that holds a map of its own, as another plane, has set map=own, or map="under [[Guadoscuro]]" or "mirror of [[Guadoscuro]]" for the underdark or a plane that mirrors the land; a passage between maps is a road with kind=portal. '
        + "It also writes the fields of a copy in the open scene. Moving someone or something goes with move, what a character learns with reveal, conditions and forms with effect. "
        + 'Example: page Bruna, type character, set role=npc, text "A ferry keeper who knows every current of the river."',
    group: "game",
    positionals: ["page"],
    input: z.object({
        page: z.string().describe("name of the page, or of a copy in the open scene; Page#Name writes one section or one secret"),
        type: z.enum(pageTypeNames).optional().describe(`type of a new page, or the new type of one that exists: ${pageTypeNames.map(typeText).join(", ")}`),
        set: fieldValues.optional().describe('fields to set: field=value, repeatable, or an object such as {"role": "npc"}. A link is [[Page]], links are [[A]], [[B]], a list is [a, b]'),
        unset: z.array(z.string()).optional().describe("fields to remove, repeatable"),
        add: fieldValues.optional().describe("items to add to list fields: field=value, repeatable, such as factions=[[Barcaioli]], or an object"),
        remove: fieldValues.optional().describe("items to remove from list fields: field=value, repeatable, or an object"),
        text: z.string().optional().describe("text of the introduction, the part before the first heading; or of the section or secret given"),
        section: z.string().optional().describe("section or secret to write; a missing one is added at the end of the page, as a secret if secret is given; empty text removes it"),
        append: z.boolean().optional().describe("add the text at the end instead of replacing"),
        secret: z.boolean().optional().describe("with a section: create it, if missing, as a secret block > [!secret] Name"),
        here: z.boolean().optional().describe("a new place where the journey stopped: on a road it becomes a stop there, in the open it takes the point; those who travel go into it"),
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

        const { coins, problem: coinsProblem } = campaignCoins(root, context);
        const world = campaignWorld(root, context);
        const system = campaignSystem(root, context);
        const open = readOpenScene(root);
        const copy = copyName(world, open.scene, reference.name);
        // A field the game system works out is never written, on a page or a copy: the rest is (FOR-7, D-200).
        const target = open.scene !== undefined && copy !== undefined ? copyPage(copy, open.scene.copies[copy]) : findPage(world, reference.name);
        const given = input.set === undefined ? undefined : withoutComputed(world, target, oneItemLists(world, readFields(input.set), input.type ?? target?.type), reference.name, input.type);
        const added = listsWithoutComputed(world, target, input.add === undefined ? undefined : readListItems(input.add));
        const removed = listsWithoutComputed(world, target, input.remove === undefined ? undefined : readListItems(input.remove));
        let fields: FieldChange = {
            set: given === undefined || Object.keys(given.set).length === 0 ? undefined : asAmounts(world, given.set, coins),
            unset: input.unset,
            add: added.lists,
            remove: removed.lists,
        };
        const computedNotes = [given?.note, added.note, removed.note].filter((note) => note !== undefined);

        // Only fields the system works out, and nothing else to write: said as such.
        if (computedNotes.length > 0 && [fields.set, fields.add, fields.remove, input.type, input.unset, input.text].every((part) => part === undefined)) {
            throw new Error(`${computedNotes.join(" ")} Nothing changed.`);
        }

        const moneyNotes = [...computedNotes, ...moneyNotesOf(world, reference.name, fields.set, coins, coinsProblem)];

        if (open.scene !== undefined && copy !== undefined) {
            checkNoEffects(fields, copyPage(copy, open.scene.copies[copy]));
            const written = writeCopy(root, world, context, open.scene, copy, { type: input.type, text: input.text, section }, fields, coins);
            return { ...written, notes: [...written.notes, ...moneyNotes] };
        }

        const existing = findPage(world, reference.name);

        // The campaign only reads the pages of its game system, and never hides one with a page of its own (SYS-4, SYS-6).
        if (existing?.system !== undefined) {
            const given = givenFields(fields.set, baseFieldOf(input.type ?? existing.type));
            throw new Error(input.type === undefined || alwaysInList(world, existing) !== undefined ? readOnlyMessage(existing, given, world) : hidingMessage(existing, input.type, given));
        }

        checkNoEffects(fields, existing);

        if (existing === undefined && input.type === undefined) {
            const copies = open.scene === undefined ? "" : ", nor a copy of that name in the open scene";
            const unreadable = open.problem === undefined ? "" : " The open scene in state.yaml cannot be read, so a copy in it cannot be written: validate shows how to fix it.";
            const aliased = pageNamed(world, reference.name);
            // An alias of a page of the system leads to a page that is read-only (SYS-6).
            const readOnly = aliased?.system === undefined ? "" : ` ${readOnlyMessage(aliased).replace(/ Nothing changed\.$/, "")}`;
            const alias = aliased === undefined ? "" : readOnly !== "" ? ` ${reference.name} is an alias of ${aliased.name}.${readOnly}` : ` ${reference.name} is an alias of ${aliased.name}: to change that page, write ${aliased.name}.`;
            throw new Error(`There is no page named ${reference.name}${copies}.${alias} To create it, give its type: ${pageTypeNames.join(", ")}.${unreadable}${missingSystemHint(world) || systemSearchHint(world)}`);
        }

        const type = input.type ?? existing?.type;
        // A place written where the journey stopped, and a position given as relations, turned into the coordinates to write (TRV-14, POS-2).
        const here = input.here === true ? hereOf(root, world, reference.name, existing, type, fields) : undefined;
        const positioned = type === "place" ? positionToWrite(world, reference.name, here === undefined ? fields : hereFields(here, fields)) : { change: fields, placed: { notes: [] } };
        fields = positioned.change;
        conditionsAsList(existing, fields);
        checkFieldNames(type, fields);
        checkFieldChange(type, fields);
        environmentAsSet(world, existing, type, reference.name, fields);
        checkValues(fields);
        checkListValues(system, fields.set ?? {});
        checkListValues(system, fields.add ?? {});
        checkKnows(world, fields);

        if (existing !== undefined) {
            if (changedFieldNames(fields).some(passesOn)) {
                checkNotCopied(world, open, existing);
            }

            checkCounters(world, existing, fields.set, coins);
            checkUses(world, system, existing, fields.set);
            checkClearedCounters(world, existing, ownFieldChange(world, existing, fields), coins);
            checkLists(world, existing, fields);
        }

        checkBase(world, existing?.name ?? reference.name, type, fields.set);
        checkEventFields(world, existing, type, fields);
        const written = writePage(world, reference.name, input.type, { ...fields, text: input.text, section, append: input.append, secret: input.secret });
        const { created, changed, mode, retyped } = written;

        if (changed) {
            const data = { page: written.page.name, type: written.page.type, was: retyped?.type, ...fields, section, secret: input.secret, text: input.text, mode };
            appendLogEntry(root, newDatedLogEntry(root, context, created ? "page-created" : "page-updated", "hidden", data));
        }

        // The maximum of a counter follows what the game system works out from the page as it is now (FOR-6).
        // While what campaign.yaml adds does not read, the maxima are not judged by the system alone (CAM-3).
        const additionsRead = systemProblems(root, context).length === 0;
        const limits = changed && additionsRead ? workedLimitsChange(system, world, existing, withPage(world, existing, written.page), written.page) : { set: {}, unset: [], notes: [] };
        const worked = Object.keys(limits.set).length > 0 || limits.unset.length > 0;
        const page = worked ? writePage(withPage(world, existing, written.page), written.page.name, undefined, { set: limits.set, unset: limits.unset }).page : written.page;

        if (page !== written.page) {
            appendLogEntry(root, newDatedLogEntry(root, context, "page-updated", "hidden", { page: page.name, set: limits.set, unset: limits.unset, why: "worked out by the game system" }));
        }

        const placed = positioned.placed.origin === undefined ? withPage(world, existing, page) : writeOrigin(root, context, withPage(world, existing, page), positioned.placed.origin);
        const hereDone = here === undefined || !changed ? undefined : placeHere(root, context, placed, page, here);
        const now = hereDone?.world ?? placed;
        const followers = changed ? followersOfWrite(now, existing, page) : { pages: [], why: "" };

        if (changed && existing !== undefined) {
            const self: [Page, Page][] = changedNames(existing, page).some((field) => comparableText(field) === baseFieldOf(page.type)) ? [[existing, page]] : [];
            logCounterChanges(root, context, world, now, [...self, ...followers.pages.map((follower): [Page, Page] => [follower, follower])], coins);
        }

        const notes = !changed ? [] : existing === undefined ? [...derivesFromNothingNote(now, page), ...noBaseNote(now, page)] : [...keepersNotes(now, existing, page), ...ownValuesNote(now, existing, page, coins)];
        const dropped = changed ? droppedFromBaseNotes(now, page, fields.set) : [];
        const story = changed && changedFieldNames(fields).length > 0 ? storyNotes(root, context, world, now, existing, page) : [];
        const was = retyped === undefined ? undefined : `${retyped.type ?? "free page"} (${retyped.path})`;
        const result = { page: page.name, type: page.type, path: page.path, created, changed, ...writtenNames(world, existing, fields, page), section, mode, was };
        // Said when the character joins the party, here or by being created in it; then status says it until the sheet is whole (DAT-2).
        const joined = changed && (created || existing?.fields.role !== page.fields.role);
        const sheet = joined ? joiningNotes(system, now, page) : [];
        const gained = changed && existing !== undefined ? progressionNotes(context, system, world, now, existing, page, Object.keys(fields.set ?? {})) : [];
        const thresholds = changed && isPartyMember(page) ? writtenThresholdNotes(root, system, world, now, existing, page, fields.set ?? {}) : [];
        // Points that reach a level the classes have not, or fall short of the level's (PRO-6); a field the settings leave out (DAT-10).
        const [before, after] = [existing === undefined ? undefined : experienceOf(world, effectiveFields(world, existing)), experienceOf(now, effectiveFields(now, page))];
        const companion = page.fields.role === "companion";
        const levelUp = (): string => situationPart("level-up", context, system);
        const levels = changed && isPartyMember(page) ? [...newLevelNotes(page.name, before, after, companion, levelUp), ...leastNotes(page.name, before, after)] : [];
        const leftOut = changed ? changedFieldNames(fields).flatMap((field) => leftOutNote(root, context, field) ?? []) : [];
        const quest = changed ? [...questEndNotes(context, system, existing, page), ...tickedQuestNotes(existing, page), ...newQuestNotes(existing, page)] : [];
        const twice = changed && page.type === "character" ? givenListNotes(now, page, changedFieldNames(fields)) : [];
        const shadows = changed && section !== undefined ? featureSectionNotes(now, page, section) : [];
        const links = changed ? linkNotes(now, fields) : [];
        // What a character has equipped and does not carry, as after its armor left its inventory (CON-12); what a formula reads of two items (PRO-5).
        const carried = changed && page.type === "character" && changedFieldNames(fields).some((field) => ["inventory", "equipped"].includes(comparableText(field))) ? equippedNotes(now, page) : [];
        const firsts = changed && page.type === "character" ? firstItemNotes(world, now, existing, page) : [];
        const map = changed
            ? [
                ...positioned.placed.notes,
                ...(hereDone?.notes ?? []),
                ...(["stops", "position"].some((field) => changedFieldNames(fields).includes(field)) ? shortRoadNotes(now, page) : []),
                ...mapLookNotes(world, existing, now, page),
                ...(page.type === "place" ? gridNotes(existing, page) : []),
            ]
            : [];
        // The death of the last living player character: what the saves allow, said at once (SAV-7).
        const death = changed && isPlayerDead(now) && !isPlayerDead(world) ? deathNotes(root, page.name) : [];
        return {
            ...result,
            followers: followers.pages.map((follower) => follower.name),
            followersWhy: followers.why,
            notes: [...story, ...notes, ...dropped, ...limits.notes, ...gained, ...thresholds, ...levels, ...leftOut, ...quest, ...twice, ...shadows, ...links, ...carried, ...firsts, ...map, ...sheet, ...death, ...moneyNotes],
            problems: world.problems,
        };
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
            result.was === undefined ? "" : `was ${withArticle(result.was)}`,
        ].filter((change) => change !== "");
        const summary = result.changed ? changeSummary(result, changes) : `Nothing changed on ${result.page}: it already reads like that.`;
        const followers = followersNote(result.followers, result.followersWhy, "write");
        return [[summary, followers, ...result.notes].filter((line) => line !== "").join("\n"), skippedPagesNote(result.problems)].filter((block) => block !== "").join("\n\n");
    },
});

/** A type as the parameter names it, with what tells a place from an item (D-155, D-156). */
function typeText(type: PageType): string
{
    return type === "place" ? "place (a room, a house, a ship, a region)" : type === "item" ? "item (a thing, even one with someone inside, such as a cart)" : type;
}

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
        throw new Error('effects change only with the effect command: action add with a name, for how long and the values it gives, such as name "Scudo della fede", for 10m, set bonus-ac=2; action end to take one away. Nothing changed.');
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
        const name = sameName(Object.keys(fields), field);
        const declared = name !== undefined && startingAtZero(world, name) !== undefined;
        const current = name === undefined || (isStandardField(page.type, name) && !isCounterField(page.type, name)) || isDeclaredUncounted(world, name) ? undefined : guarded(fields[name], coins, declared);
        const next = current === undefined ? undefined : sameKind(current.kind, value, coins);
        const base = baseValue(world, page, field);

        if (name === undefined || current === undefined || next === current.text || (next === undefined && base !== undefined)) {
            continue;
        }

        const hint = current.kind === "counter" ? maximumHint(world, effectiveFields(world, page), name) : undefined;
        throw new Error(hint === undefined ? guardedMessage(page, name, current.kind, next, holdsField(page, name) ? undefined : base?.base, base !== undefined) : workedCounterMessage(page, name, hint));
    }
}

/**
 * A use of the system that the character does not get, as a warlock's spell-slots on a wizard or slots on a warlock, is never written by hand (DAT-9): only on who
 * keeps the sheet and has the system's lists, and never for one the sheet asks to write, as hp.
 */
function checkUses(world: World, system: GameSystem | undefined, page: Page, set: Record<string, unknown> | undefined): void
{
    const list = world.system?.progression?.list;
    const after: Page = { ...page, fields: { ...page.fields, ...set } };
    const fields = inheritedFields(world, after);
    const classes = list === undefined ? undefined : valueNamed(fields, list);

    if (list === undefined || isEmptyField(classes) || !hasSheet(world, after)) {
        return;
    }

    const asked = new Set((system?.sheet ?? []).flatMap((group) => group.entries.filter((entry) => !entry.optional).map((entry) => comparableText(entry.field))));

    for (const field of Object.keys(set ?? {}).filter((name) => isUse(world, name) && !asked.has(comparableText(name)))) {
        const counted = Object.keys(world.system?.formulas?.counters ?? {}).some((name) => comparableText(name) === comparableText(field));
        const { max } = counterLimits(world, fields, field);

        if (counted && (max === undefined || max <= 0)) {
            const sources = maximumSources(world, field, fields);
            const whence = sources.length === 0 ? `the tables of its ${list}` : sources.join(", ");
            throw new Error(`${field} is a use the system ${world.system?.name ?? ""} gives from ${whence}, and ${page.name} has none of it: it is not written by hand. Nothing changed.`);
        }
    }
}

/**
 * A value that changes only with change, as it is compared: a current/max counter (D-92), a number the game system declares a counter with no maximum (CNT-7, D-266), or money
 * (MON-6); undefined for any other.
 */
function guarded(value: unknown, coins: Coin[] | undefined, declared: boolean): { kind: "counter" | "money"; text: string; } | undefined
{
    const counter = readCounter(value);

    if (counter !== undefined && (counter.max !== undefined || declared)) {
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

/** "hp is a counter whose maximum the game system works out": what to change instead, the current value with change and the maximum through what it comes from (D-226). */
function workedCounterMessage(page: Page, field: string, hint: { made: string; raise?: string; }): string
{
    const raise = hint.raise === undefined ? "" : `; to raise the maximum, write ${hint.raise}`;
    return `${field} is a counter whose maximum the game system works out: ${hint.made}. Change its current value with change, page "${page.name}", field ${field}${raise}. Nothing changed.`;
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
        const current = isStandardField(page.type, own) || isDeclaredUncounted(world, own) ? undefined : guarded(page.fields[own], coins, false);
        const base = baseValue(world, page, own);
        const fromBase = base === undefined ? undefined : guarded(base.value, coins, false);
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

/** knows lists pages and secrets of the campaign: a page of the game system, which anyone may know, never (SYS-2). */
function checkKnows(world: World, change: FieldChange): void
{
    const known = [...linksIn(change.set?.knows), ...linksIn(change.add?.knows)].map((name) => systemPageNamed(world, name)).find((page) => page !== undefined && findPage(world, page.name) === page);

    if (known !== undefined) {
        throw new Error(`${known.name} is ${systemLabel(known)}, ${systemKnowsReason(known)}: knows lists pages and secrets of the campaign. Nothing changed.`);
    }
}

/** A character or creature derives only from a creature, an item only from an item, never in a loop (INH-2, INH-3). */
function checkBase(world: World, name: string, type: PageType | undefined, set: Record<string, unknown> | undefined): void
{
    const field = baseFieldOf(type);
    const link = field === undefined ? undefined : set?.[field];
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
    if (!isBaseType(after.type)) {
        return { pages: [], why: "" };
    }

    const changed = [...new Set([...Object.keys(before?.fields ?? {}), ...Object.keys(after.fields)])].filter((field) => JSON.stringify(before?.fields[field]) !== JSON.stringify(after.fields[field]));

    if (before === undefined || changed.some((field) => comparableText(field) === baseFieldOf(after.type))) {
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
    for (const [before, after] of pages.filter(([, page]) => concernsPlayer(now, page))) {
        const old = inheritedFields(world, before);

        for (const [field, value] of Object.entries(inheritedFields(now, after)).filter(([name]) => !isStandardField(after.type, name) && !isDeclaredUncounted(now, name))) {
            const was = countedText(valueNamed(old, field), coins);
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

/** Money given to set, written as the engine writes it (MON-2): from the coin worth most, by first names. A field the game system declares is never money (SYS-8). */
function asAmounts(world: World, set: Record<string, unknown>, coins: Coin[] | undefined): Record<string, unknown>
{
    return Object.fromEntries(
        Object.entries(set).map(([field, value]) => {
            const purse = coins === undefined || declaredKind(world, field) !== undefined ? undefined : readAmount(value, coins);
            return [field, purse === undefined || coins === undefined ? value : formatAmount(purse, coins)];
        }),
    );
}

/** What a write should say about money: a value that names coins but does not read as money, and coins that cannot be read (MON-2, MON-8). */
function moneyNotesOf(world: World, page: string, set: Record<string, unknown> | undefined, coins: Coin[] | undefined, problem: Problem | undefined): string[]
{
    // A field the game system declares is never money (SYS-8).
    const texts = Object.entries(set ?? {}).filter(([field, value]) => typeof value === "string" && declaredKind(world, field) === undefined) as [string, string][];
    const unread = coins === undefined ? [] : texts.filter(([, value]) => readAmount(value, coins) === undefined && namesCoins(value, coins));
    const notes = unread.map(([field, value]) => `${field} on ${page} is "${value}", which is not money: write the coins one after the other, such as ${field}=12 ${coins?.[0].name ?? ""}, to count them.`);
    const looksLikeMoney = texts.some(([, value]) => /\d+\s*\p{L}/u.test(value));
    return problem !== undefined && looksLikeMoney ? [...notes, `The campaign's coins cannot be read, so no money is counted: ${problem.message} To fix it, ${problem.fix}.`] : notes;
}

/**
 * A list written whole that leaves out items the page read from a base, as an elf's Perception from its race: said, since the page no longer reads them (INH-7).
 */
function droppedFromBaseNotes(now: World, page: Page, set: Record<string, unknown> | undefined): string[]
{
    return Object.entries(set ?? {}).filter(([, value]) => Array.isArray(value)).flatMap(([field, value]) => {
        const base = baseValue(now, page, field);

        if (base === undefined || !Array.isArray(base.value)) {
            return [];
        }

        const held = new Set(listItemNames(value).map(comparableText));
        const missing = listItemNames(base.value).filter((name) => !held.has(comparableText(name)));
        const them = missing.length === 1 ? "it" : "them";
        return missing.length === 0 ? [] : [`${field} on ${page.name} leaves out ${missing.join(", ")}, which it read from ${base.base.name}: if the character keeps ${them}, add ${them}, such as add ${field}=${missing[0]}.`];
    });
}

/** A page created with a name that other pages give as their creature or item, though it is not one: they derive from nothing (INH-2). */
function derivesFromNothingNote(now: World, page: Page): string[]
{
    return (["creature", "item"] as const).filter((field) => field !== page.type).flatMap((field) => {
        const linking = now.pages.filter((other) => baseFieldOf(other.type) === field && linksIn(other.fields[field]).some((name) => comparableText(name) === comparableText(page.name)));
        return linking.length === 0
            ? []
            : [`${linking.map((other) => other.name).join(", ")} name ${page.name} as their ${field}, but it is ${withArticle(page.type ?? "free page")}: they derive from nothing until ${field} links to ${withArticle(field)}.`];
    });
}

/**
 * For a creature or an item created without a base, when the game system has pages of its type: it may be a kind of one of them (D-165, SYS-7).
 * When another field already links to one, the field to use instead.
 */
function noBaseNote(now: World, page: Page): string[]
{
    const field = baseFieldOf(page.type);

    if (page.type === "character" || field === undefined || !isEmptyField(page.fields[field])) {
        return [];
    }

    // Only a free field links to its base by mistake: a field the system declares, such as magic, links to something else (D-164).
    const free = Object.entries(page.fields).filter(([name]) => declaredKind(now, name) === undefined);
    const elsewhere = free.flatMap(([name, value]) => linksIn(value).map((link) => ({ name, page: systemPageNamed(now, link) }))).find((link) => link.page?.type === field);

    if (elsewhere?.page !== undefined) {
        const linked = elsewhere.page;
        const system = linked.system ?? "";
        return [
            `${page.name} links to ${linked.name}, ${withArticle(field)} of the system ${system}, in ${elsewhere.name}: if it is a kind of it, the field is ${field}, `
            + `such as write "${page.name}", set ${field}=[[${linked.name}]], unset ${elsewhere.name}.`,
        ];
    }

    // A story item, such as a letter, writes no field of the system: it is no kind of one of its items.
    if (page.type === "item" && !Object.keys(page.fields).some((name) => declaredKind(now, name) !== undefined)) {
        return [];
    }

    const hint = systemBaseHint(now, field, field);
    return hint === "" ? [] : [`${page.name} derives from no ${field}:${hint.replace(" If it", " if it")}`];
}

/**
 * What a write should say of the links it gave in fields the game system declares, such as spells (D-216): those to pages that do not exist yet, which the world
 * gets with write, and those to a page that shares its name with another, as Shield the item beside Shield (spell). A campaign played in another language is
 * told the system's. The core's fields, as contains or knows, link ahead to pages still to write.
 */
function linkNotes(world: World, change: FieldChange): string[]
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

/**
 * When the items of a list give a field another formula reads, as two armors in equipped or Unarmored Defense from two classes, the formula reads the first
 * (PRO-5): said when a write makes it so.
 */
function firstItemNotes(before: World, after: World, existing: Page | undefined, page: Page): string[]
{
    const computed = after.system?.formulas?.computed ?? [];
    return Object.entries(after.system?.itemFormulas ?? {}).flatMap(([list, names]) =>
        names.flatMap((field) => {
            const readers = computed.filter(([, formula]) => fieldsRead(formula).some((name) => comparableText(name) === comparableText(field))).map(([name]) => name);
            const giving = (world: World, fields: Record<string, unknown>): string[] => itemLines(world, fields, list, [field]).map((line) => line.item);
            const is = readers.length === 0 ? [] : giving(after, effectiveFields(after, page));
            const was = is.length < 2 || existing === undefined ? [] : giving(before, effectiveFields(before, existing));

            if (is.length < 2 || (was.length === is.length && was.every((name, index) => comparableText(name) === comparableText(is[index])))) {
                return [];
            }

            return [`${readers.join(", ")} ${readers.length === 1 ? "reads" : "read"} ${field} from ${is[0]}, the first in ${page.name}'s ${list} that gives it, not from ${is.slice(1).join(", ")}.`];
        })
    );
}

/** "hp=15/15": the fields a refused write gave, for the call to make instead, without the base field, which that call gives. */
function givenFields(set: Record<string, unknown> | undefined, baseField: string | undefined): string[]
{
    return Object.entries(set ?? {})
        .filter(([field]) => comparableText(field) !== baseField)
        .map(([field, value]) => `${field}=${Array.isArray(value) ? `[${value.map(String).join(", ")}]` : String(value)}`);
}

/** Whether pages of this type can be bases: creatures and items (INH-1). */
function isBaseType(type: PageType | undefined): boolean
{
    return type === "creature" || type === "item";
}

/** "Not changed, since they hold their own fiuto: Grigio (fiuto 2)": for each field a write changed on a base, the pages deriving from it that keep their own value. */
function keepersNotes(now: World, before: Page, after: Page): string[]
{
    if (!isBaseType(after.type)) {
        return [];
    }

    return changedNames(before, after).flatMap((field) => {
        const keepers = keepersOf(now, after, field).map((keeper) => `${keeper.name} (${field} ${valueText(valueNamed(inheritedFields(now, keeper), field))})`);
        const note = keepersNote(keepers, field);
        return note === "" ? [] : [note];
    });
}

/** After its creature changes, the values a page keeps that its new bases give otherwise: they may belong to the old one (D-125). */
function ownValuesNote(now: World, before: Page, after: Page, coins: Coin[] | undefined): string[]
{
    const field = baseFieldOf(after.type);

    if (field === undefined || !changedNames(before, after).some((name) => comparableText(name) === field)) {
        return [];
    }

    const kept = Object.entries(after.fields).filter(([name, value]) => !isEmptyField(value) && !isNeverInherited(name)).flatMap(([name, value]) => {
        const base = baseValue(now, after, name);
        return base === undefined || JSON.stringify(base.value) === JSON.stringify(value) ? [] : [{ field: name, value, base }];
    });

    if (kept.length === 0) {
        return [];
    }

    // A current/max counter or money goes back to the base's value with change; anything else is removed.
    const back = kept.map(({ field, value, base }) => {
        const mine = guarded(value, coins, false);
        const theirs = guarded(base.value, coins, false);
        return mine !== undefined && mine.kind === theirs?.kind ? `change ${field} to ${mine.kind === "money" ? `"${theirs.text}"` : theirs.text}` : `unset ${field}`;
    });
    const listed = kept.map(({ field, value, base }) => `${field} ${valueText(value)} (${base.base.name} gives ${valueText(base.value)})`);
    return [`${after.name} keeps its own ${listed.join(", ")}. If they came from its old ${field}: ${back.join(", ")}.`];
}

/** The fields whose value a write changed on a page. */
function changedNames(before: Page, after: Page): string[]
{
    return [...new Set([...Object.keys(before.fields), ...Object.keys(after.fields)])].filter((field) => JSON.stringify(before.fields[field]) !== JSON.stringify(after.fields[field]));
}

/** The value a page reads for a field, written in any case. */

/** A value as the outputs show it: a list as its items, anything else as written. */
function valueText(value: unknown): string
{
    return Array.isArray(value) ? value.map(String).join(", ") : typeof value === "object" && value !== null ? JSON.stringify(value) : String(value);
}

/** Whether changing a field reaches the pages and copies deriving from a page: a field they inherit, or the creature or item it derives from. */
function passesOn(field: string): boolean
{
    return !isNeverInherited(field) || comparableText(field) === "creature" || comparableText(field) === "item";
}

function changedFieldNames(change: FieldChange): string[]
{
    return [...Object.keys(change.set ?? {}), ...(change.unset ?? []), ...Object.keys(change.add ?? {}), ...Object.keys(change.remove ?? {})];
}

/** "hp, ac again as Wolf": fields grouped by the base they are read from. */
function byBase(fields: string[], base: (field: string) => string | undefined, how: string): string[]
{
    return [...new Set(fields.map(base))].map((name) => `${fields.filter((field) => base(field) === name).join(", ")} ${how} ${name ?? ""}`);
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
        again: [...byBase(gone, base, "again as"), ...byBase(asBase, base, "as")],
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

/**
 * The fields given to set without those the game system works out on the page as the write leaves it, a copy in the open scene or a page that gets its base in
 * the same write included (FOR-7), with a note that gives the values the system works out and what they come from.
 */
function withoutComputed(world: World, target: Page | undefined, set: Record<string, unknown>, name: string, type: PageType | undefined): { set: Record<string, unknown>; note?: string; }
{
    const after: Page = { ...(target ?? { name, path: "", body: "" }), type: type ?? target?.type, fields: { ...(target?.fields ?? {}), ...set } };
    const fields = effectiveFields(world, after);
    const computed = Object.entries(set).flatMap(([field, given]) => {
        const found = computedField(world, field, fields);
        return found === undefined ? [] : [{ ...found, given }];
    });

    if (computed.length === 0) {
        return { set };
    }

    const kept = Object.fromEntries(Object.entries(set).filter(([field]) => !computed.some((found) => comparableText(found.name) === comparableText(field))));
    const values = computed.map((found) => {
        const value = signedText(world, found.name, found.value);
        return `${found.name} ${value}${numberOf(found.given) === found.value ? ", as you gave it" : ` (you gave ${String(found.given)})`}`;
    });
    const sources = [...new Set(computed.flatMap((found) => found.from))];
    const bonuses = sources.filter((field) => declaredKind(world, field) === "bonus");
    const bonus = bonuses.length === 0 ? "" : ` A bonus such as ${bonuses[0]} comes from an effect, for what gives one, such as a magic item.`;
    const note = `Not written, the system ${world.system?.name ?? ""} works ${computed.length === 1 ? "it" : "them"} out: ${values.join("; ")}. They come from ${sources.join(", ")}.${bonus}`;
    return { set: kept, note };
}

/** The items given to add or remove without the fields the game system works out on the page, which no list change writes (FOR-7, D-200), with a note. */
function listsWithoutComputed(world: World, target: Page | undefined, lists: Record<string, unknown[]> | undefined): { lists?: Record<string, unknown[]>; note?: string; }
{
    if (lists === undefined || target === undefined) {
        return { lists };
    }

    const fields = effectiveFields(world, target);
    const computed = Object.keys(lists).flatMap((field) => computedField(world, field, fields) ?? []);

    if (computed.length === 0) {
        return { lists };
    }

    const kept = Object.fromEntries(Object.entries(lists).filter(([field]) => !computed.some((found) => comparableText(found.name) === comparableText(field))));
    const values = computed.map((found) => `${found.name} ${signedText(world, found.name, found.value)}`).join("; ");
    const sources = [...new Set(computed.flatMap((found) => found.from))].join(", ");
    return {
        lists: Object.keys(kept).length === 0 ? undefined : kept,
        note: `Not written, the system ${world.system?.name ?? ""} works ${computed.length === 1 ? "it" : "them"} out: ${values}. ${computed.length === 1 ? "It comes" : "They come"} from ${sources}.`,
    };
}

/** The part quest-ends when a quest is done or failed, such as the experience the story gives (D-233), once in a chat (D-97). */
function questEndNotes(context: Context, system: GameSystem | undefined, existing: Page | undefined, page: Page): string[]
{
    const ended = (candidate: Page | undefined): boolean => ["done", "failed"].includes(String(candidate?.fields.status));

    if (page.type !== "quest" || !ended(page) || ended(existing)) {
        return [];
    }

    const part = situationPart("quest-ends", context, system);
    return part === "" ? [] : [`${page.name} is ${String(page.fields.status)}. ${part}`];
}

/** Items written in a list where the parts of the classes already put them, as a domain's spell in prepared: always there, they do not count with the rest (PRO-7). */
function givenListNotes(world: World, page: Page, changed: string[]): string[]
{
    const progression = progressionOf(world, effectiveFields(world, page));
    return changed.flatMap((field) => {
        const written = listItemNames(valueNamed(page.fields, field));
        const twice = givenItems(progression, field).filter((item) => sameName(written, item.name) !== undefined);
        const pages = [...new Set(twice.map((item) => item.page.name))].join(" and ");
        return twice.length === 0
            ? []
            : [`${twice.map((item) => item.name).join(", ")} ${twice.length === 1 ? "is" : "are"} always in ${field}, from ${pages}, and not counted with the rest: write ${page.name}, remove ${field}=${
                twice[0].name
            }, to choose another in its place.`];
    });
}

/** A section of a character with the name of a feature its classes give: show gives it in place of the feature's text (PRO-4). */
function featureSectionNotes(world: World, page: Page, section: string): string[]
{
    const feature = progressionOf(world, effectiveFields(world, page))?.features.find((candidate) => sameFeature(candidate.name, section));
    return feature === undefined ? [] : [`show ${page.name}#${section} now gives this section, not the text of the feature ${featureParts(feature.name).name} its classes give.`];
}

/**
 * What a change of classes gives or takes (PRO-4): the features of the rows it reaches, new, gained again or with a new value, those no longer had, the values of
 * the rows and of the formulas of the classes' pages that change, and, when a class rises, the system's note for a new level (D-226), unless the same write sets
 * a field it names, as hp-base. Nothing when the classes give the same.
 */
function progressionNotes(context: Context, system: GameSystem | undefined, before: World, after: World, existing: Page, page: Page, set: string[]): string[]
{
    const was = progressionOf(before, effectiveFields(before, existing));
    const is = progressionOf(after, effectiveFields(after, page));
    const gains = rowGains(was, is);
    const lost = (was?.features ?? []).map((feature) => feature.name).filter((name) => !(is?.features ?? []).some((other) => sameFeature(other.name, name)));
    // The maximum of a use the rows give is said with the counters (FOR-6).
    const counters = Object.keys(after.system?.formulas?.counters ?? {});

    const valueOf = (progression: typeof was, field: string): string | undefined => {
        const found = progression?.values.find((value) => comparableText(value.field) === comparableText(field));
        return found === undefined ? undefined : signedText(after, found.field, found.value);
    };

    const fields = [...new Set([...(was?.values ?? []), ...(is?.values ?? [])].map((value) => value.field))].filter((field) => !counters.some((counter) => comparableText(counter) === comparableText(field)));
    const values = fields.flatMap((field) => {
        const [from, to] = [valueOf(was, field), valueOf(is, field)];
        return from === to ? [] : [`${field} ${from ?? "none"} → ${to ?? "none"}`];
    });
    // What the formulas of the classes' pages give, as the prepared spells of a new level (PRO-5).
    const [then, now] = [effectiveFields(before, existing), effectiveFields(after, page)];
    const formulaValues = (after.system?.itemFormulas?.[after.system.progression?.list ?? ""] ?? []).flatMap((field) => {
        const [from, to] = [valueNamed(then, field), valueNamed(now, field)];
        const text = (value: unknown): string => (value === undefined ? "none" : typeof value === "number" ? signedText(after, field, value) : String(value));
        return text(from) === text(to) ? [] : [`${field} ${text(from)} → ${text(to)}`];
    });
    const shown = gains.fresh[0] ?? gains.better[0]?.name;
    const parts = [
        gains.fresh.length === 0 ? "" : `${gains.fresh.join(", ")} ${gains.fresh.length === 1 ? "is" : "are"} new`,
        gains.again.length === 0 ? "" : `${gains.again.join(", ")} again`,
        gains.better.map((feature) => feature.text).join(", "),
        lost.length === 0 ? "" : `no longer ${lost.join(", ")}`,
        [...values, ...formulaValues].join(", "),
    ].filter((part) => part !== "");
    const hint = shown === undefined ? "" : ` show ${page.name}#${featureParts(shown).name} gives a feature's text.`;
    const levelUp = partText("level-up", system);
    // A new level is one more in all: a class changed for another of a lower level is none.
    const levels = (progression: typeof was): number => (progression?.from ?? []).reduce((total, item) => total + (item.level ?? 0), 0);
    // Not said when the same write sets a field the note names, as hp-base: it is already done.
    const named = new Set((levelUp?.match(/[\p{L}\p{N}-]+/gu) ?? []).map(comparableText));
    const done = set.some((field) => named.has(comparableText(field)));
    // The part level-up, once in a chat (D-97).
    const risen = levelUp !== undefined && levels(is) > levels(was) && !done ? situationPart("level-up", context, system) : "";
    // A value that ends in a period, such as +10 ft., ends the line.
    const said = parts.length === 0 ? [] : [`What ${page.name}'s ${is?.lists[0] ?? was?.lists[0] ?? "classes"} give: ${parts.join("; ").replace(/\.$/, "")}.${hint}`];
    return [...said, ...(risen === "" ? [] : [risen])];
}

/**
 * The features the rows and parts give now that they did not before, each name once (PRO-3): new to the character, gained again, as a later Ability Score
 * Improvement, or with a new value, as "Bardic Inspiration (d6 → d8)".
 */
function rowGains(was: ReturnType<typeof progressionOf>, is: ReturnType<typeof progressionOf>): { fresh: string[]; again: string[]; better: { name: string; text: string; }[]; }
{
    const key = (gain: { name: string; level: number; page: Page; }): string => `${gain.page.path}|${gain.level}|${comparableText(gain.name)}`;
    const old = new Set((was?.gains ?? []).map(key));
    const had = was?.features ?? [];
    const result = { fresh: [] as string[], again: [] as string[], better: [] as { name: string; text: string; }[] };

    for (const gain of mergedFeatures((is?.gains ?? []).filter((candidate) => !old.has(key(candidate))))) {
        const before = had.find((feature) => sameFeature(feature.name, gain.name))?.name;
        const [then, now] = [featureParts(before ?? "").value, featureParts(gain.name).value];

        if (before === undefined) {
            result.fresh.push(gain.name);
        } else if (now !== undefined && then !== undefined && comparableText(now) !== comparableText(then)) {
            result.better.push({ name: gain.name, text: `${featureParts(gain.name).name} (${then.slice(1, -1)} → ${now.slice(1, -1)})` });
        } else {
            result.again.push(featureParts(gain.name).name);
        }
    }

    return result;
}

/** Whether two names are the same feature, with or without a value in parentheses (PRO-3). */
function sameFeature(first: string, second: string): boolean
{
    return comparableText(featureParts(first).name) === comparableText(featureParts(second).name);
}

/** The thresholds the fields a write gives touch on the player character or a companion, as change says them (DAT-3): exhaustion written with write shows its rule. */
function writtenThresholdNotes(root: string, system: GameSystem | undefined, before: World, after: World, existing: Page | undefined, page: Page, set: Record<string, unknown>): string[]
{
    const read = (fields: Record<string, unknown>, field: string): unknown => valueNamed(fields, field);
    const was = existing === undefined ? {} : effectiveFields(before, existing);
    const is = effectiveFields(after, page);
    return Object.keys(set).flatMap((field) => {
        const [from, to] = [read(was, field), read(is, field)];
        return String(from) === String(to) ? [] : thresholdNotes(root, system, field, { before: from, after: to, amount: {} });
    });
}

/**
 * The counters of a page whose written maximum is not what the game system works out from the page without its effects, set to it, and a note (FOR-6). A use
 * that only the lists give and that the page no longer has, with a maximum of 0 or none where it had one, is taken off (DAT-9).
 */
function workedLimitsChange(system: GameSystem | undefined, before: World, existing: Page | undefined, world: World, page: Page): { set: Record<string, unknown>; unset: string[]; notes: string[]; }
{
    const fields = inheritedFields(world, page);
    const old = existing === undefined ? undefined : inheritedFields(before, existing);
    const changes = Object.keys(world.system?.formulas?.counters ?? {}).flatMap((field) => {
        const key = sameName(Object.keys(page.fields), field);
        const counter = key === undefined ? undefined : readCounter(page.fields[key]);
        const { max } = counterLimits(world, fields, field);
        const had = old === undefined || max !== undefined ? undefined : counterLimits(before, old, field).max;
        const limit = max ?? (had === undefined ? undefined : 0);

        if (key === undefined || counter === undefined || limit === undefined || counter.max === limit) {
            return [];
        }

        // Of a use, what was spent stays spent, as a table counts it: a maximum that grows by 3 gives 3 more; one that falls only caps the current, as the SRD does,
        // but for what an effect allows above the written maximum (FOR-6, D-228). Any other counter keeps its current, which reads no higher than the maximum.
        const grows = counter.max !== undefined && limit > counter.max;
        const capped = counter.max !== undefined && counter.value <= counter.max ? Math.max(0, Math.min(counter.value, limit)) : counter.value;
        const value = !isUse(world, key) || counter.max === undefined ? counter.value : grows ? counter.value + limit - counter.max : capped;
        return [{ key, before: counter.max, value: formatCounter({ value, max: limit }), reads: formatCounter({ value: Math.min(value, limit), max: limit }), max: limit, lost: max === undefined }];
    });
    // Only a use that the lists give, such as rages from the classes, never one the sheet asks to write, as hp: it stays at any maximum.
    const asked = new Set((system?.sheet ?? []).flatMap((group) => group.entries.filter((entry) => !entry.optional).map((entry) => comparableText(entry.field))));

    // A maximum from a class's row, with no formula, has no sources: the lists give it.
    const givenByLists = (field: string): boolean => {
        const sources = maximumSources(world, field, fields);
        return !asked.has(comparableText(field)) && (sources.length === 0 || sources.some((name) => declaredKind(world, name) === "list"));
    };

    // A use whose maximum has no value now, where it had one, as the slots of a caster who is one no more, is no longer the character's either.
    const gone = changes.filter((change) => change.max <= 0 && isUse(world, change.key) && !asked.has(comparableText(change.key)) && (change.lost || givenByLists(change.key)));
    const kept = changes.filter((change) => !gone.includes(change));
    // "hp 10/17 (max 10 → 17: hp-base 10, level 2, con-mod +2)": what the maximum comes from, so that a written maximum is not taken for the dice.
    const said = kept.map((change) => {
        const parts = workedParts(world, workedMaximum(world, fields, change.key)?.reads ?? []);
        return `${change.key} ${change.reads} (max ${change.before ?? "none"} → ${change.max}${parts === "" ? "" : `: ${parts}`})`;
    });
    // A use the page gets, such as a new level's channel-divinity, is written full on who keeps the sheet (DAT-9, D-225).
    const added = hasSheet(world, page) ? missingUses(world, fields).map((use) => ({ key: use.field, value: formatCounter({ value: use.max, max: use.max }) })) : [];
    const name = world.system?.name ?? "";
    const notes = [
        said.length === 0 ? "" : `${said.join(", ")}: worked out by the system ${name}.`,
        added.length === 0 ? "" : `${page.name} has ${added.map((use) => `${use.key} ${use.value}`).join(", ")}, full: uses of the system ${name} that come back with a rest.`,
        gone.length === 0 ? "" : `${page.name} no longer has ${gone.map((change) => change.key).join(", ")}: the system ${name} gives no uses of ${gone.length === 1 ? "it" : "them"} now.`,
    ];
    return {
        set: Object.fromEntries([...kept, ...added].map((change) => [change.key, change.value])),
        unset: gone.map((change) => change.key),
        notes: notes.filter((note) => note !== ""),
    };
}

/**
 * A field that is always a list, or that the game system declares one, given one item, such as contains=[[Locanda]] or tags=boss, holds a list of that one item;
 * text with commas is left to the checks that ask for a list, but a road's stops, links and lengths taking turns, which are split at the commas (ROA-6).
 */
function oneItemLists(world: World, set: Record<string, unknown>, type: PageType | undefined): Record<string, unknown>
{
    const isList = (name: string): boolean => listFieldNames.some((field) => comparableText(field) === comparableText(name)) || declaredKind(world, name) === "list";

    const listOf = (name: string, value: unknown): unknown => {
        if (typeof value !== "string" || !isList(name) || value.trim() === "") {
            return value;
        }

        return comparableText(name) === "stops" && type === "place" ? value.split(",").map((item) => item.trim()) : value.includes(",") ? value : [value];
    };

    return Object.fromEntries(Object.entries(set).map(([name, value]) => [name, listOf(name, value)]));
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
