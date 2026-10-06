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
import { effectiveFields, effectsOf } from "./effect-layer.ts";
import { surroundings, surroundingsText } from "./game-environment.ts";
import { copyLink, copyPage, readOpenScene } from "./game-scene.ts";
import { campaignWorld, missingSystemHint } from "./game-world.ts";
import { skippedPagesNote } from "./notes.ts";

export const show = defineCommand({
    name: "show",
    description: "Show a page of the world, or one of its sections or secrets, with what it inherits from the pages it derives from. "
        + "It also says where the thing is and which pages link to it, and shows a copy in the open scene too. "
        + "Use it before describing anything that already exists, so that what you say matches what is written. "
        + 'Example: page "Old lighthouse"; or page "Old lighthouse#Cellar" for one section.',
    group: "game",
    readOnly: true,
    positionals: ["page"],
    input: z.object({
        page: z.string().describe("name of the page, or of a copy in the open scene; Page#Name shows one section or one secret"),
    }),

    run(input, context)
    {
        const root = requireCampaign(context.folder);
        const world = campaignWorld(root, context);
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
        const part = reference.section === undefined ? undefined : readPart(world, page, reference.section);
        const { chain, alsoIn } = isCopy ? { chain: [], alsoIn: [] } : locate(world, page);
        const inherited = inheritedByBase(world, page);
        return {
            page: page.name,
            type: page.type,
            path: page.path,
            system: page.system,
            hides: page.system === undefined && !isCopy && systemPageNamed(world, page.name) !== undefined ? world.system?.name : undefined,
            section: reference.section,
            copyOf: isCopy ? copyLink(scene.copies[copy]) : undefined,
            scene: isCopy ? scene.title : undefined,
            alsoCopy: !isCopy && copy !== undefined,
            isIn: chain.map((holder) => holder.name),
            alsoIn: alsoIn.map((holder) => holder.name),
            around: page.type === "place" || page.type === "character" || isCopy ? surroundingsText(surroundings(world, isCopy ? scenePlace(world, scene.place) : page)) : "",
            fields: reference.section === undefined ? page.fields : undefined,
            covered: coveredValues(world, page),
            derivesFrom: baseChain(world, page).map(nameWithSystem),
            sectionFrom: part?.from,
            inherited: reference.section === undefined
                ? inherited.map((group) => ({ from: nameWithSystem(group.base), fields: group.fields, text: [group.introduction, ...group.parts.map((piece) => piece.text)].filter((text) => text !== "").join("\n\n") }))
                : [],
            text: part?.text ?? page.body,
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
        const header = [
            `${result.page}${result.section === undefined ? "" : `#${result.section}`} (${what})${result.system === undefined ? ` · ${result.path}` : ""}`,
            result.hides === undefined ? "" : `This page hides the system ${result.hides}'s ${result.page}: links to that name lead here.`,
            result.alsoCopy ? `${result.page} is also a copy in the open scene: change and write refuse both until the scene closes, which removes the copy, or the page is renamed.` : "",
            result.isIn.length > 0 ? `Is in: ${result.isIn.join(" › ")}` : "",
            result.alsoIn.length > 0 ? `Also listed in: ${result.alsoIn.join(", ")}. A thing can be in one place only: move it where it is, such as move, page ${result.page}, to ${result.isIn[0]}.` : "",
            result.around === "" ? "" : `Around: ${result.around}`,
            result.derivesFrom.length > 0 ? `Derives from: ${result.derivesFrom.join(" › ")}` : "",
            result.sectionFrom === undefined ? "" : `Inherited from ${result.sectionFrom}: ${result.page} has no section or secret of its own by this name.`,
            result.covered.length === 0 ? "" : `While they last: ${result.covered.join(", ")}`,
        ].filter((line) => line !== "").join("\n");
        const fields = result.fields !== undefined && Object.keys(result.fields).length > 0 ? `---\n${formatFields(result.fields)}\n---` : "";
        const inheritedFields = result.inherited.filter((group) => Object.keys(group.fields).length > 0).map((group) => `Fields inherited from ${group.from}:\n${formatFields(group.fields)}`);
        const inheritedText = result.inherited.filter((group) => group.text !== "").map((group) => `Text inherited from ${group.from}:\n\n${group.text}`);
        const links = result.linkedFrom.length > 0 ? `Linked from:\n${result.linkedFrom.map((link) => `- ${link.page}: ${link.places.join(", ")}`).join("\n")}` : "";
        return [header, fields, ...inheritedFields, result.text, ...inheritedText, links, skippedPagesNote(result.problems)].filter((block) => block !== "").join("\n\n");
    },
});

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

/** A section or secret of a page; when it has none by that name, the one of its nearest base that has it (INH-13). */
function readPart(world: World, page: Page, name: string): { text: string; from?: string; }
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

    throw new Error(`${page.name} has no section or secret "${name}". ${partsOf(world, page)}`);
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
