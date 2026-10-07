import { z } from "zod";
import { requireCampaign } from "../campaign/index.ts";
import { defineCommand } from "../core/registry.ts";
import { comparableText, sameName } from "../core/text.ts";
import {
    backlinks,
    baseChain,
    findPage,
    formatFields,
    inheritedByBase,
    inheritedFields,
    locate,
    type Page,
    pagesWithName,
    parsePageReference,
    readSection,
    secretNames,
    sectionTitles,
    systemPageNamed,
    textParts,
    type World,
} from "../pages/index.ts";
import { featureParts } from "../progression/index.ts";
import { effectiveFields, effectsOf } from "./effect-layer.ts";
import { surroundings, surroundingsText } from "./game-environment.ts";
import { copyLink, copyPage, readOpenScene } from "./game-scene.ts";
import { campaignSystem, campaignWorld, missingSystemHint } from "./game-world.ts";
import { skippedPagesNote } from "./notes.ts";
import { featureSource, progressionOf } from "./progression.ts";
import { sheetFieldNames, sheetGroup, sheetGroupNames, sheetLines } from "./sheet.ts";
import { signedText, type WorkedField, workedFields, workedLine, workedParts } from "./worked-out.ts";

export const show = defineCommand({
    name: "show",
    description: "Show a page of the world, or one of its sections or secrets, with what it inherits from the pages it derives from. "
        + "It also says where the thing is and which pages link to it, and shows a copy in the open scene too. "
        + "Use it before describing anything that already exists, so that what you say matches what is written. "
        + "The player character and the companions show the sheet of the game system in groups, such as Abilities; Page#Group shows one group with how each number is made. "
        + 'Example: page "Old lighthouse"; or page "Old lighthouse#Cellar" for one section.',
    group: "game",
    readOnly: true,
    positionals: ["page"],
    input: z.object({
        page: z.string().describe("name of the page, or of a copy in the open scene; Page#Name shows one section or one secret, or a group of a character's sheet"),
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
        const found = findPage(world, reference.name);
        const page = found ?? (scene !== undefined && copy !== undefined ? copyPage(copy, scene.copies[copy]) : undefined);

        if (page === undefined) {
            throw new Error(`There is no page named ${reference.name}${scene === undefined ? "" : ", nor a copy of that name in the open scene"}. Look for it with the find command.${missingSystemHint(world)}`);
        }

        const isCopy = found === undefined && scene !== undefined && copy !== undefined;
        // A section or a secret first, then a group of the sheet (DAT-2).
        const part = reference.section === undefined ? undefined : findPart(world, page, reference.section);
        const group = reference.section === undefined || part !== undefined ? undefined : sheetGroup(world, system, page, reference.section);

        if (reference.section !== undefined && part === undefined && group === undefined) {
            const groups = sheetGroupNames(system, page).length === 0 ? "" : ` The groups of its sheet are: ${sheetGroupNames(system, page).join(", ")}.`;
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
        };
    },

    format(result)
    {
        const what = result.copyOf !== undefined
            ? `copy of ${result.copyOf} in the open scene "${result.scene}"`
            : result.system !== undefined
            ? `${result.type ?? "page"} of the system ${result.system}, read-only`
            : (result.type ?? "free page");
        const title = `${result.page}${result.section === undefined ? "" : `#${result.section}`} (${what})${result.system === undefined ? ` · ${result.path}` : ""}`;

        // A group of the sheet is its values, with what effects cover in them.
        if (result.group) {
            return [[title, result.covered.length === 0 ? "" : `While they last: ${result.covered.join(", ")}`].filter((line) => line !== "").join("\n"), result.sheet.join("\n")].join("\n\n");
        }

        const header = [
            title,
            result.hides === undefined ? "" : `This page hides the system ${result.hides}'s ${result.page}: links to that name lead here.`,
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
        const fields = Object.keys(own).length > 0 ? `---\n${formatFields(own)}\n---` : "";
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
        return [header, sheet, fields, worked, ...inheritedFields, result.text, ...inheritedText, links, skippedPagesNote(result.problems)].filter((block) => block !== "").join("\n\n");
    },
});

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
    const read = (fields: Record<string, unknown>, field: string): unknown => Object.entries(fields).find(([name]) => comparableText(name) === comparableText(field))?.[1];
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

    // A feature the character's classes give, with the text of the page that tells it (PRO-4).
    const source = featureSource(progressionOf(world, effectiveFields(world, page)), name);
    const text = source === undefined ? undefined : readSection(source.page.body, source.title);
    return source === undefined || text === undefined ? undefined : { text, from: source.page.name, feature: true };
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
