// The write command
import { z } from "zod";
import { requireCampaign } from "../../campaign/index.ts";
import type { Context } from "../../core/context.ts";
import { appendLogEntry } from "../../core/log.ts";
import { defineCommand } from "../../core/registry.ts";
import { comparableText, valueNamed, withArticle } from "../../core/text.ts";
import { formatCounter, readCounter } from "../../counters/index.ts";
import type { Coin } from "../../money/index.ts";
import {
    alwaysInList,
    baseFieldOf,
    baseValue,
    changedFields,
    checkFieldChange,
    concernsPlayer,
    equippedNotes,
    type FieldChange,
    findPage,
    goodsFieldProblems,
    hidingMessage,
    isNeverInherited,
    isPartyMember,
    isPlayerCharacter,
    isStandardField,
    misspelledStandardField,
    ownFieldChange,
    type Page,
    pageNamed,
    type PageType,
    pageTypeNames,
    parsePageReference,
    readOnlyMessage,
    sameAsBase,
    type TextMode,
    withPage,
    type World,
    writePage,
} from "../../pages/index.ts";
import type { Scene } from "../../scene/index.ts";
import { questPictureNote } from "../shared/campaign/images.ts";
import { campaignCoins } from "../shared/campaign/money.ts";
import { adventurePart, nextAdventureLead, partyPart, situationPart } from "../shared/campaign/parts.ts";
import { adventureUnderWay, logQuestChange, newQuestNotes, tickedQuestNotes } from "../shared/campaign/quests.ts";
import { deathNotes, isPlayerDead, partyDeathNotes } from "../shared/campaign/saves.ts";
import { campaignSystem, campaignWorld, leftOutNote, missingSystemHint, systemProblems, systemSearchHint } from "../shared/campaign/world.ts";
import { diaryDueLine } from "../shared/characters/thoughts.ts";
import { fieldValues } from "../shared/inputs.ts";
import { followersNote, skippedPagesNote } from "../shared/notes.ts";
import { gridNotes } from "../shared/places/grids.ts";
import { mapLookNotes, shortRoadNotes } from "../shared/places/positions.ts";
import { copyChanges, copyLink, copyName, copyPage, readOpenScene, updateScene } from "../shared/scene/scene.ts";
import { bondNotes } from "../shared/sheet/bonds.ts";
import { effectiveFields } from "../shared/sheet/effect-layer.ts";
import { experienceOf, leastNotes, levelWay, newLevelNotes, settleChoices } from "../shared/sheet/experience.ts";
import { joiningNotes } from "../shared/sheet/sheet.ts";
import { newDatedLogEntry } from "../shared/time/time.ts";
import { changedFieldNames, checkClearedCounters, checkCounters, checkFieldWrite, checkLists, checkNoEffects, checkValues } from "./checks.ts";
import { hereFields, hereOf, placeHere, positionToWrite, writeOrigin } from "./here.ts";
import { baseNotesOrWeight, changedNames, droppedFromBaseNotes, followersOfWrite, keepersNotes, logCounterChanges, ownValuesNote, writtenNames } from "./inheritance.ts";
import { asAmounts, listsWithoutComputed, moneyNotesOf, oneItemLists, readFields, readListItems, withoutComputed } from "./input.ts";
import { writeCampaignLayer } from "./layer.ts";
import { countedTextNotes, linkNotes, questEndNotes, questEnds, storyNotes, writtenThresholdNotes } from "./notes.ts";
import { featureSectionNotes, firstItemNotes, givenListNotes, progressionNotes, workedLimitsChange } from "./progression.ts";

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

export const write = defineCommand({
    name: "write",
    description: "Create or change a page of the world. "
        + "Pages are written only with this command: use it as soon as something becomes true in the story, such as a new character, place or item, or a change. "
        + "The introduction and sections are what the player reads once their character knows the page: what the character has not found out goes in a secret. "
        + 'A list field changes one item at a time with add and remove; a place\'s environment one line at a time, such as add environment="light: dark". '
        + 'A place\'s position is given from a place that has one, such as set position="12 km NE of [[Guadoscuro]]"; a region has a radius, such as set radius=10 km. '
        + 'A place with a map of its own, as another plane, has set map=own; map="under [[Guadoscuro]]" for the underdark, "mirror of [[Guadoscuro]]" for a plane that mirrors the land; '
        + "a passage between maps is a road with kind=portal. Moving someone or something goes with move, what a character learns with reveal, conditions and forms with effect. "
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
        layer: z.boolean().optional().describe("change a page of the game system for the whole campaign, in a layer that holds only what differs; unset or empty text gives back the system's"),
        why: z.string().optional().describe("what the change is for, kept in the master's log"),
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

        const why = input.why?.trim() === "" ? undefined : input.why;
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

        if (input.layer === true) {
            const layered = writeCampaignLayer(root, context, world, open, { name: reference.name, type: input.type, text: input.text, section, append: input.append, secret: input.secret, why, copy }, fields, coins);
            return { ...layered, created: false, add: [], remove: [], notes: [...layered.notes, ...moneyNotes], problems: world.problems };
        }

        if (open.scene !== undefined && copy !== undefined) {
            checkNoEffects(fields, copyPage(copy, open.scene.copies[copy]));
            const written = writeCopy(root, world, context, open.scene, copy, { type: input.type, text: input.text, section, why }, fields, coins);
            return { ...written, notes: [...written.notes, ...moneyNotes] };
        }

        const existing = findPage(world, reference.name);

        // The campaign only reads the pages of its game system, and never hides one with a page of its own (SYS-4, SYS-6).
        if (existing?.system !== undefined) {
            const given = givenFields(fields.set, baseFieldOf(input.type ?? existing.type));
            throw new Error(input.type === undefined || alwaysInList(world, existing) !== undefined ? readOnlyMessage(existing, given, world, true) : hidingMessage(existing, input.type, given));
        }

        checkNoEffects(fields, existing);

        if (existing === undefined && input.type === undefined) {
            const copies = open.scene === undefined ? "" : ", nor a copy of that name in the open scene";
            const unreadable = open.problem === undefined ? "" : " The open scene in state.yaml cannot be read, so a copy in it cannot be written: validate shows how to fix it.";
            const aliased = pageNamed(world, reference.name);
            // An alias of a page of the system leads to a page that is read-only (SYS-6).
            const readOnly = aliased?.system === undefined ? "" : ` ${readOnlyMessage(aliased, [], undefined, true).replace(/ Nothing changed\.$/, "")}`;
            const alias = aliased === undefined ? "" : readOnly !== "" ? ` ${reference.name} is an alias of ${aliased.name}.${readOnly}` : ` ${reference.name} is an alias of ${aliased.name}: to change that page, write ${aliased.name}.`;
            throw new Error(`There is no page named ${reference.name}${copies}.${alias} To create it, give its type: ${pageTypeNames.join(", ")}.${unreadable}${missingSystemHint(world) || systemSearchHint(world)}`);
        }

        const type = input.type ?? existing?.type;
        // A place written where the journey stopped, and a position given as relations, turned into the coordinates to write (TRV-14, POS-2).
        const here = input.here === true ? hereOf(root, world, reference.name, existing, type, fields) : undefined;
        const positioned = type === "place" ? positionToWrite(world, reference.name, here === undefined ? fields : hereFields(here, fields)) : { change: fields, placed: { notes: [] } };
        fields = positioned.change;
        checkFieldWrite(world, system, open, coins, { existing, name: reference.name, type }, fields);
        const written = writePage(world, reference.name, input.type, { ...fields, text: input.text, section, append: input.append, secret: input.secret });
        const { created, changed, mode, retyped } = written;

        if (changed) {
            const data = { page: written.page.name, type: written.page.type, was: retyped?.type, ...fields, section, secret: input.secret, text: input.text, mode, why };
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

        const notes = !changed
            ? []
            : existing === undefined
            ? baseNotesOrWeight(system, now, page)
            : [...keepersNotes(now, existing, page), ...ownValuesNote(now, existing, page, coins)];
        const dropped = changed ? [...droppedFromBaseNotes(now, page, fields.set), ...bondNotes(now, system, existing, page)] : [];
        const story = changed && changedFieldNames(fields).length > 0 ? storyNotes(root, context, world, now, existing, page) : [];
        const was = retyped === undefined ? undefined : `${retyped.type ?? "free page"} (${retyped.path})`;
        const result = { page: page.name, type: page.type, path: page.path, created, changed, ...writtenNames(world, existing, fields, page), section, mode, was };
        // Said when the character joins the party, here or by being created in it; then status says it until the sheet is whole (DAT-2).
        const joined = changed && (created || existing?.fields.role !== page.fields.role);
        const sheet = joined ? joiningNotes(system, now, page, context) : [];
        const gained = changed && existing !== undefined ? progressionNotes(context, system, world, now, existing, page, Object.keys(fields.set ?? {})) : [];
        const thresholds = changed && isPartyMember(page) ? writtenThresholdNotes(root, system, world, now, existing, page, fields.set ?? {}) : [];
        // Points that reach a level the classes have not, or fall short of the level's (PRO-6); a field the settings leave out (DAT-10).
        const [before, after] = [existing === undefined ? undefined : experienceOf(world, effectiveFields(world, existing)), experienceOf(now, effectiveFields(now, page))];
        const companion = page.fields.role === "companion";
        const levelUp = (): string => situationPart("level-up", context, system);

        if (changed && isPartyMember(page)) {
            settleChoices(root, page.name, before, after);
        }

        const levels = changed && isPartyMember(page) ? [...newLevelNotes(page.name, before, after, companion, levelUp, levelWay(root, context, page.name)), ...leastNotes(page.name, before, after)] : [];
        const leftOut = changed ? changedFieldNames(fields).flatMap((field) => leftOutNote(root, context, field) ?? []) : [];
        const opened = newQuestNotes(existing, page);
        const picture = opened.length === 0 ? undefined : questPictureNote(root, context, now, page);
        // A quest that ends is a time to write a diary (DIA-2).
        const diary = changed && questEnds(existing, page) ? diaryDueLine(root, context, now) : "";
        // The last quest ended: the next adventure is to build (D-530 (8)).
        const next = changed && questEnds(existing, page) && !adventureUnderWay(now) ? adventurePart(nextAdventureLead(root), context, system) : "";
        const quest = changed
            ? [...questEndNotes(context, system, existing, page), ...(diary === "" ? [] : [diary]), ...(next === "" ? [] : [next]), ...tickedQuestNotes(existing, page), ...opened, ...(picture === undefined ? [] : [picture])]
            : [];

        // The story tells a quest taken, done or failed (D-369).
        if (changed) {
            logQuestChange(root, context, existing, page);
        }

        const twice = changed && page.type === "character" ? givenListNotes(now, page, changedFieldNames(fields)) : [];
        const shadows = changed && section !== undefined ? featureSectionNotes(now, page, section) : [];
        const links = changed ? linkNotes(now, fields) : [];
        // What a character has equipped and does not carry, as after its armor left its inventory (CON-12); what a formula reads of two items (PRO-5).
        const carried = changed && page.type === "character" && changedFieldNames(fields).some((field) => ["inventory", "equipped"].includes(comparableText(field))) ? equippedNotes(now, page) : [];
        const firsts = changed && page.type === "character" ? firstItemNotes(world, now, existing, page) : [];
        // A count inside a text, or a field named as goods, as torches: 7: what a stack counts (STK-10, STK-13).
        const counts = changed ? [...countedTextNotes(existing, page), ...goodsFieldProblems(now, page, changedFieldNames(fields)).map((problem) => `${problem.message} Fix: ${problem.fix}.`)] : [];
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
        const died = changed && existing !== undefined && isPlayerCharacter(page) && page.fields.status === "dead" && existing.fields.status !== "dead";
        const death = changed && isPlayerDead(now) && !isPlayerDead(world) ? deathNotes(root, page.name) : died ? partyDeathNotes(root, page.name) : [];
        // A second living player character: how to run the table for them, once in a chat (D-480).
        // Or one back from the dead (Elena, 24 October).
        const risen = changed && existing?.fields.status === "dead" && page.fields.status !== "dead";
        const partyInstructions = (joined || risen) && isPlayerCharacter(page) ? partyPart(context, system, now) : "";
        return {
            ...result,
            followers: followers.pages.map((follower) => follower.name),
            followersWhy: followers.why,
            notes: [
                ...story,
                ...notes,
                ...dropped,
                ...limits.notes,
                ...gained,
                ...thresholds,
                ...levels,
                ...leftOut,
                ...quest,
                ...twice,
                ...shadows,
                ...links,
                ...carried,
                ...firsts,
                ...counts,
                ...map,
                ...sheet,
                ...death,
                ...moneyNotes,
                ...(partyInstructions === "" ? [] : [partyInstructions]),
            ],
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

/**
 * Sets fields on a page for a package's code, as write --set does (D-511, D-514): the same checks; a counter the page holds changes only with game.change, and
 * one the system declares that the page lacks yet is written, with its counter-changed line; a field the system works out left out, the maxima worked out again. In the log, counter-changed for a counter, public when the page concerns the player, and
 * page-updated for the other fields; nothing for a value that stays. It throws what write refuses, with how to fix it, and writes nothing.
 */
export function writePackageFields(root: string, context: Context, world: World, page: Page, values: Record<string, number | string>, why: string): void
{
    const { coins } = campaignCoins(root, context);
    const system = campaignSystem(root, context);

    if (page.system !== undefined) {
        throw new Error(readOnlyMessage(page, Object.keys(values), world));
    }

    const kept = Object.fromEntries(
        Object.entries(values).map(([field, value]) => {
            const own = readCounter(valueNamed(page.fields, field));
            return [field, typeof value !== "number" || own?.max === undefined ? value : formatCounter({ ...own, value })];
        }),
    );
    const given = withoutComputed(world, page, oneItemLists(world, kept, page.type), page.name, undefined);

    if (Object.keys(given.set).length === 0) {
        throw new Error(`${given.note ?? "Give the fields to set."} Nothing changed.`);
    }

    const positioned = page.type === "place" ? positionToWrite(world, page.name, { set: asAmounts(world, given.set, coins) }) : { change: { set: asAmounts(world, given.set, coins) }, placed: { notes: [] } };
    const fields = positioned.change;
    checkNoEffects(fields, page);
    checkFieldWrite(world, system, readOpenScene(root), coins, { existing: page, name: page.name, type: page.type }, fields);
    const before = effectiveFields(world, page);
    const written = writePage(world, page.name, undefined, fields);

    if (!written.changed) {
        return;
    }

    const now = withPage(world, page, written.page);
    const limits = systemProblems(root, context).length === 0 ? workedLimitsChange(system, world, page, now, written.page) : { set: {}, unset: [] };
    const after = Object.keys(limits.set).length > 0 || limits.unset.length > 0 ? writePage(now, page.name, undefined, { set: limits.set, unset: limits.unset }).page : written.page;
    const counters = Object.keys(fields.set ?? {}).filter((field) => readCounter(valueNamed(page.fields, field)) !== undefined || valueNamed(system?.fields ?? {}, field) === "counter");
    const others = Object.fromEntries(Object.entries(fields.set ?? {}).filter(([field, value]) => !counters.includes(field) && valueNamed(page.fields, field) !== value));
    const visibility = concernsPlayer(world, page) ? "public" : "hidden";

    const shown = (value: unknown): string => {
        const counter = readCounter(value);
        return value === undefined ? "0" : counter === undefined ? String(value) : String(formatCounter(counter));
    };

    for (const field of counters) {
        const [was, is] = [shown(valueNamed(before, field)), shown(valueNamed(effectiveFields(withPage(world, page, after), after), field))];

        if (was !== is) {
            appendLogEntry(root, newDatedLogEntry(root, context, "counter-changed", visibility, { page: page.name, field, before: was, after: is, why }));
        }
    }

    if (Object.keys(others).length > 0) {
        appendLogEntry(root, newDatedLogEntry(root, context, "page-updated", "hidden", { page: page.name, type: page.type, set: others, why }));
    }

    if (positioned.placed.origin !== undefined) {
        writeOrigin(root, context, withPage(world, page, after), positioned.placed.origin);
    }
}

/** A type as the parameter names it, with what tells a place from an item (D-155, D-156). */
function typeText(type: PageType): string
{
    return type === "place"
        ? "place (a room, a house, a ship, a region)"
        : type === "item"
        ? "item (a thing, even one with someone inside, such as a cart; one with words or a drawing to read again, such as a letter, a notice or a map, has document=letter, notice, map…)"
        : type;
}

/** Writes the fields of a copy in the open scene (INH-14): only what differs from its creature, never its text, the creature it copies or fixed fields. */
function writeCopy(root: string, world: World, context: Context, scene: Scene, name: string, input: { type?: PageType; text?: string; section?: string; why?: string; }, requested: FieldChange, coins: Coin[] | undefined): WriteResult
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
        appendLogEntry(root, newDatedLogEntry(root, context, "page-updated", "hidden", { page: name, copy: true, ...requested, why: input.why }));
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

/** "hp=15/15": the fields a refused write gave, for the call to make instead, without the base field, which that call gives. */
function givenFields(set: Record<string, unknown> | undefined, baseField: string | undefined): string[]
{
    return Object.entries(set ?? {})
        .filter(([field]) => comparableText(field) !== baseField)
        .map(([field, value]) => `${field}=${Array.isArray(value) ? `[${value.map(String).join(", ")}]` : String(value)}`);
}

function changeSummary(result: WriteResult, changes: string[]): string
{
    const what = result.copyOf === undefined ? `${result.created ? "Created" : "Updated"} ${result.page} (${result.type ?? "free page"}, ${result.path})` : `Updated ${result.page} (copy of ${result.copyOf} in the open scene)`;
    return changes.length > 0 ? `${what}: ${changes.join("; ")}.` : `${what}.`;
}
