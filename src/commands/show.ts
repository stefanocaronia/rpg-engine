import { z } from "zod";
import { requireCampaign } from "../campaign/index.ts";
import { defineCommand } from "../core/registry.ts";
import { comparableText, sameName, valueNamed, withArticle } from "../core/text.ts";
import {
    backlinks,
    baseChain,
    findPage,
    formatFields,
    inheritedByBase,
    inheritedFields,
    isPartyMember,
    locate,
    namesakes,
    type Page,
    pageNamed,
    pagesWithName,
    parsePageReference,
    readSection,
    secretNames,
    sectionTitles,
    systemLabel,
    systemPageNamed,
    textParts,
    type World,
} from "../pages/index.ts";
import { featureParts } from "../progression/index.ts";
import type { GameSystem } from "../systems/index.ts";
import { effectiveFields, effectsOf } from "./shared/effect-layer.ts";
import { surroundings, surroundingsText } from "./shared/environment.ts";
import { holdsItems, isFallen, lootAdvice } from "./shared/loot.ts";
import { skippedPagesNote } from "./shared/notes.ts";
import { firstInChat } from "./shared/parts.ts";
import { featureSource, progressionOf } from "./shared/progression.ts";
import { closedScenes, copyLink, copyPage, openSceneLog, readOpenScene } from "./shared/scene.ts";
import { sheetFieldNames, sheetGroup, sheetGroupNames, sheetLines } from "./shared/sheet.ts";
import { signedText, type WorkedField, workedFields, workedLine, workedParts } from "./shared/worked-out.ts";
import { campaignSystem, campaignWorld, missingSystemHint } from "./shared/world.ts";

// A list longer than this shows its first items only (D-468).
const listedItems = 8;

export const show = defineCommand({
    name: "show",
    description: "Show a page of the world, or one of its sections or secrets, with what it inherits from the pages it derives from. "
        + "It also says where the thing is and which pages link to it. Use it before describing anything that already exists, so that what you say matches what is written. "
        + "The player character and the companions show their sheet in groups, such as Abilities; Page#Group shows one group with how each number is made. "
        + 'Example: page "Old lighthouse#Cellar".',
    group: "game",
    readOnly: true,
    positionals: ["page"],
    input: z.object({
        page: z.string().describe("name of the page, or of a copy in the open scene; Page#Name shows one section or one secret, a group of a character's sheet, or one field whole"),
    }),

    run(input, context)
    {
        const root = requireCampaign(context.folder);
        const world = campaignWorld(root, context);
        const system = campaignSystem(root, context);
        const reference = parsePageReference(input.page);

        if (reference.section === "") {
            throw new Error("Give the title of the section after #, or leave out the # to see the whole page.");
        }

        // A scene that cannot be read shows no copies; validate reports it.
        const { scene } = readOpenScene(root);
        const copy = scene === undefined ? undefined : sameName(Object.keys(scene.copies), reference.name);
        // A renamed page answers to its old name too, among its aliases (D-417).
        const found = findPage(world, reference.name) ?? (copy === undefined ? pageNamed(world, reference.name) : undefined);
        const page = found ?? (scene !== undefined && copy !== undefined ? copyPage(copy, scene.copies[copy]) : undefined);

        // The open scene's title gives what happened in it so far (SCN-10).
        if (page === undefined && scene !== undefined && reference.section === undefined && sameName([scene.title], reference.name) !== undefined) {
            return { sceneLog: openSceneLog(root, scene) };
        }

        if (page === undefined) {
            // A scene's title is no page, as the last scenes status lists.
            const closed = closedScenes(root).find((other) => sameName([other.title], reference.name) !== undefined);
            const named = scene !== undefined && sameName([scene.title], reference.name) !== undefined
                ? ` ${scene.title} is the open scene, not a page: show it without a section for what happened so far.`
                : closed === undefined
                ? ""
                : ` ${closed.title} is a scene that closed, not a page (${closed.type}): ${closed.summary}`;
            throw new Error(`There is no page named ${reference.name}${scene === undefined ? "" : ", nor a copy of that name in the open scene"}.${named || " Look for it with the find command."}${missingSystemHint(world)}`);
        }

        const isCopy = found === undefined && scene !== undefined && copy !== undefined;
        // A section or a secret first, then a group of the sheet (DAT-2).
        const part = reference.section === undefined ? undefined : findPart(world, page, reference.section);
        const group = reference.section === undefined || part !== undefined ? undefined : sheetGroup(world, system, page, reference.section);

        // A field whole, as a long list that show cuts short (D-468).
        const field = reference.section === undefined || part !== undefined || group !== undefined ? undefined : sameName(Object.keys(page.fields), reference.section);

        if (field !== undefined) {
            return { fieldText: `${page.name}#${field}\n---\n${formatFields({ [field]: page.fields[field] })}\n---` };
        }

        if (reference.section !== undefined && part === undefined && group === undefined) {
            const groups = sheetGroupNames(world, system, page).length === 0 ? "" : ` The groups of its sheet are: ${sheetGroupNames(world, system, page).join(", ")}.`;
            throw new Error(`${page.name} has no section or secret "${reference.section}". ${partsOf(world, page)}${groups}`);
        }

        const { chain, alsoIn } = isCopy ? { chain: [], alsoIn: [] } : locate(world, page);
        const sheet = group?.lines ?? (reference.section === undefined ? sheetLines(world, system, page) : []);
        const inherited = inheritedByBase(world, page);
        return {
            page: page.name,
            type: page.type,
            path: page.path,
            system: page.system,
            hides: page.system === undefined && !isCopy && systemPageNamed(world, page.name) !== undefined ? world.system?.name : undefined,
            // Acolyte (background) beside the creature Acolyte: the name alone leads here (SYS-2).
            namesakes: isCopy || reference.section !== undefined ? [] : namesakes(world, page).map((other) => `${other.name}, ${other.system === undefined ? withArticle(other.type ?? "page") : systemLabel(other)}`),
            section: group?.name ?? reference.section,
            copyOf: isCopy ? copyLink(scene.copies[copy]) : undefined,
            scene: isCopy ? scene.title : undefined,
            alsoCopy: !isCopy && copy !== undefined,
            isIn: chain.map((holder) => holder.name),
            alsoIn: alsoIn.map((holder) => holder.name),
            around: page.type === "place" || page.type === "character" || isCopy ? surroundingsText(surroundings(world, isCopy ? scenePlace(world, scene.place) : page)) : "",
            sheet,
            featureHint: sheet.length === 0 || group !== undefined ? undefined : featureHint(world, page),
            onSheet: sheetFieldNames(world, system, page),
            fields: reference.section === undefined ? page.fields : undefined,
            covered: coveredValues(world, page),
            worked: reference.section === undefined ? workedFields(world, effectiveFields(world, page), true).map((worked) => ({ field: worked.field, line: workedLine(world, worked), repeats: repeatsRead(world, worked) })) : [],
            group: group !== undefined,
            systemName: world.system?.name,
            derivesFrom: baseChain(world, page).map(nameWithSystem),
            sectionFrom: part?.from,
            featureOf: part?.feature === true,
            inherited: reference.section === undefined
                ? inherited.map((group) => ({
                    from: nameWithSystem(group.base),
                    fields: group.fields,
                    text: [group.introduction, ...group.parts.map((piece) => piece.text)].filter((text) => text !== "").join("\n\n"),
                    // The parts with text of their own, as a race's traits under its Traits heading.
                    parts: group.parts.filter((piece) => piece.text.split("\n").slice(1).some((line) => line.trim() !== "")).map((piece) => piece.name),
                }))
                : [],
            text: group === undefined ? (part?.text ?? page.body) : "",
            linkedFrom: isCopy ? [] : backlinks(world, page).map((link) => ({ page: link.page.name, places: link.places })),
            problems: world.problems,
            loot: reference.section === undefined ? lootNote(world, system, page, chain) : undefined,
            // What the character knows is view's, once in a chat (D-530): show holds what they have not found out.
            knows: firstInChat(context, "show-knows") ? knowsNote : undefined,
        };
    },

    format(result)
    {
        if (result.sceneLog !== undefined) {
            return result.sceneLog;
        }

        if (result.fieldText !== undefined) {
            return result.fieldText;
        }

        const what = result.copyOf !== undefined
            ? `copy of ${result.copyOf} in the open scene "${result.scene}"`
            : result.system !== undefined
            ? `${result.type ?? "page"} of the system ${result.system}, read-only`
            : (result.type ?? "free page");
        const title = `${result.page}${result.section === undefined ? "" : `#${result.section}`} (${what})${result.system === undefined ? ` · ${result.path}` : ""}`;

        // A group of the sheet is its values, with what effects cover in them.
        if (result.group) {
            const values = [title, result.covered.length === 0 ? "" : `While they last: ${result.covered.join(", ")}`].filter((line) => line !== "").join("\n");
            return [values, result.sheet.join("\n"), result.knows ?? ""].filter((block) => block !== "").join("\n\n");
        }

        const header = [
            title,
            result.hides === undefined ? "" : `This page hides the system ${result.hides}'s ${result.page}: links to that name lead here.`,
            result.namesakes.length === 0 ? "" : `There is also ${result.namesakes.join("; ")}: show it by that name.`,
            result.alsoCopy ? `${result.page} is also a copy in the open scene: change and write refuse both until the scene closes, which removes the copy, or the page is renamed.` : "",
            result.isIn.length > 0 ? `Is in: ${result.isIn.join(" › ")}` : "",
            result.alsoIn.length > 0 ? `Also listed in: ${result.alsoIn.join(", ")}. A thing can be in one place only: move it where it is, such as move, page ${result.page}, to ${result.isIn[0]}.` : "",
            result.around === "" ? "" : `Around: ${result.around}`,
            result.derivesFrom.length > 0 ? `Derives from: ${result.derivesFrom.join(" › ")}` : "",
            result.sectionFrom === undefined
                ? ""
                : result.featureOf
                ? `A feature of ${result.page}, from ${result.sectionFrom}.`
                : `Inherited from ${result.sectionFrom}: ${result.page} has no section or secret of its own by this name.`,
            result.covered.length === 0 ? "" : `While they last: ${result.covered.join(", ")}`,
        ].filter((line) => line !== "").join("\n");
        // What a character's sheet shows is not said again with the fields as written (D-207).
        const onSheet = new Set(result.onSheet.map(comparableText));
        const offSheet = (fields: Record<string, unknown>): Record<string, unknown> => Object.fromEntries(Object.entries(fields).filter(([field]) => !onSheet.has(comparableText(field))));
        const sheet = [...result.sheet, ...(result.featureHint === undefined ? [] : [result.featureHint])].join("\n");
        const own = offSheet(result.fields ?? {});
        const fields = Object.keys(own).length > 0 ? `---\n${formatFields(cutLists(own, result.page))}\n---` : "";
        // A value that only repeats the one it comes from, as a creature's athletics its str-mod, is not said again.
        const workedLines = result.worked.filter((worked) => !worked.repeats && !onSheet.has(comparableText(worked.field))).map((worked) => worked.line);
        const worked = workedLines.length === 0 ? "" : `Worked out by the system ${result.systemName ?? ""}:\n${workedLines.join("\n")}`;
        const inheritedFields = result.inherited.map((group) => ({ from: group.from, fields: offSheet(group.fields) })).filter((group) => Object.keys(group.fields).length > 0)
            .map((group) => `Fields inherited from ${group.from}:\n${formatFields(group.fields)}`);
        // A character with a sheet names what its bases tell, such as its race's traits, instead of copying their text every time (DAT-2).
        const inheritedText = onSheet.size > 0
            ? result.inherited.filter((group) => group.parts.length > 0).map((group) => `From ${group.from}: ${group.parts.join(", ")}. show ${result.page}#${group.parts[0]} gives one.`)
            : result.inherited.filter((group) => group.text !== "").map((group) => `Text inherited from ${group.from}:\n\n${group.text}`);
        const links = result.linkedFrom.length > 0 ? `Linked from:\n${result.linkedFrom.map((link) => `- ${link.page}: ${link.places.join(", ")}`).join("\n")}` : "";
        const notes = [result.loot ?? "", result.knows ?? ""].filter((note) => note !== "").join("\n");
        return [header, sheet, fields, worked, ...inheritedFields, result.text, ...inheritedText, links, skippedPagesNote(result.problems), notes].filter((block) => block !== "").join("\n\n");
    },
});

/** What show says once in a chat, as play's rule on what the character knows left the instructions for it (D-530). */
const knowsNote = "When the player asks what their character knows, remembers or has seen, answer from view, never from show, which holds what they have not found out.";

/**
 * What lies on one dead or down, or in an item that holds something, is there to be found, and what is taken is the player's to say (D-530, Elena's tests of
 * 27 October, where the master put a fallen foe's coins in the character's pocket); none for what the party holds.
 */
function lootNote(world: World, system: GameSystem | undefined, page: Page, chain: Page[]): string | undefined
{
    if (isPartyMember(page) || chain.some(isPartyMember)) {
        return undefined;
    }

    return isFallen(world, system, page) || holdsItems(world, page) ? `What is on or in ${page.name} is there to be found: ${lootAdvice}` : undefined;
}

/** The fields with a list longer than `listedItems` cut to its first ones and how to see them all, as knows of a well-travelled character (D-468). */
function cutLists(fields: Record<string, unknown>, page: string): Record<string, unknown>
{
    return Object.fromEntries(
        Object.entries(fields).map(([field, value]) => [
            field,
            Array.isArray(value) && value.length > listedItems ? [...value.slice(0, listedItems), `and ${value.length - listedItems} more: show ${page}#${field}`] : value,
        ]),
    );
}

/** Whether a worked-out value only repeats the one value it is said to come from, as athletics -1 from str-mod -1. */
function repeatsRead(world: World, worked: WorkedField): boolean
{
    const parts = workedParts(world, worked.reads).split(", ");
    return parts.length === 1 && /^\S+ \S+$/.test(parts[0]) && parts[0].endsWith(` ${signedText(world, worked.field, worked.value)}`);
}

/** "Wolf (5e)": a page's name, with the game system it comes from (SYS-2). */
function nameWithSystem(page: Page): string
{
    return page.system === undefined ? page.name : `${page.name} (${page.system})`;
}

/** The place of the open scene, where its copies are (ENV-2); undefined when it has none, or none that exists. */
function scenePlace(world: World, place: string | undefined): Page | undefined
{
    return place === undefined ? undefined : pagesWithName(world, parsePageReference(place).name)[0];
}

/** "ac 15 (13 without)": the values the page's effects give, each with the one it reads without them (EFF-10). */
function coveredValues(world: World, page: Page): string[]
{
    const without = inheritedFields(world, page);
    const withThem = effectiveFields(world, page);
    const read = (fields: Record<string, unknown>, field: string): unknown => valueNamed(fields, field);
    const fields = [...new Set(effectsOf(page).flatMap((effect) => effect.values.map(([field]) => field)))];
    return fields.map((field) => `${field} ${String(read(withThem, field))} (${read(without, field) === undefined ? "none" : String(read(without, field))} without)`);
}

/** A section or secret of a page; when it has none by that name, the one of its nearest base that has it (INH-13); undefined when none has it. */
function findPart(world: World, page: Page, name: string): { text: string; from?: string; feature?: true; } | undefined
{
    const own = readSection(page.body, name);

    if (own !== undefined) {
        return { text: own };
    }

    const chain = baseChain(world, page);

    for (const [index, base] of chain.entries()) {
        const text = readSection(base.body, name);

        if (text !== undefined) {
            const nearer = new Set([page, ...chain.slice(0, index)].flatMap((holder) => textParts(holder.body).map((part) => comparableText(part.name))));
            const parts = textParts(text).filter((part, position) => position === 0 || part.name === "" || !nearer.has(comparableText(part.name)));
            return { text: parts.map((part) => part.text).join("\n\n"), from: base.name };
        }
    }

    // A feature the character's classes give, with the text of each page that tells it, in the order of the classes (PRO-4, D-224).
    const source = featureSource(progressionOf(world, effectiveFields(world, page)), name);
    const texts = (source?.pages ?? []).flatMap((giver) => {
        const text = source === undefined ? undefined : readSection(giver.body, source.title);
        return text === undefined ? [] : [{ from: giver.name, text }];
    });

    if (texts.length === 0) {
        return undefined;
    }

    const text = texts.length === 1 ? texts[0].text : texts.map((given) => `From ${given.from}:\n${given.text}`).join("\n\n");
    return { text, from: texts.map((given) => given.from).join(", "), feature: true };
}

/** "show Ettore#Rage gives the text of a feature.": said under a sheet that lists features (PRO-4). */
function featureHint(world: World, page: Page): string | undefined
{
    const [first] = progressionOf(world, effectiveFields(world, page))?.features ?? [];
    return first === undefined ? undefined : `show ${page.name}#${featureParts(first.name).name} gives the text of a feature.`;
}

/** Lists a page's sections and secrets, and those it shows from its bases, for an error message. */
function partsOf(world: World, page: Page): string
{
    const sections = sectionTitles(page.body);
    const secrets = secretNames(page.body);
    const inherited = inheritedByBase(world, page).filter((group) => group.parts.length > 0).map((group) => `from ${group.base.name}: ${group.parts.map((piece) => piece.name).join(", ")}`);
    const own = [sections.length > 0 ? `Its sections are: ${sections.join(", ")}.` : "", secrets.length > 0 ? `Its secrets are: ${secrets.join(", ")}.` : ""].filter((part) => part !== "");
    const all = [...own, inherited.length > 0 ? `It shows, ${inherited.join("; ")}.` : ""].filter((part) => part !== "");
    return all.length > 0 ? all.join(" ") : "It has no sections or secrets.";
}
