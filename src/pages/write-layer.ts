// Writing the campaign's layer over a page of its game system (SYS-11): only what differs from the system, and no layer left empty.
import { join } from "node:path";
import { files } from "../core/store.ts";
import { comparableText, sameName, valueNamed } from "../core/text.ts";
import { changedFields, changeFields, joinPageFile, readFields, splitPageFile } from "./file.ts";
import { isNeverInherited } from "./inheritance.ts";
import { layerParts, layersFolderName, layerTakes, systemOriginal } from "./layers.ts";
import { introductionText, partContent, readSection, repeatedNames, sectionTitles, writeText } from "./markdown.ts";
import { systemLabel } from "./system-pages.ts";
import type { Page, World } from "./world.ts";
import type { PageChange } from "./write-page.ts";

/** What a write did to a layer: its file, whether it changed or went, and the fields set, given back to the system's value, or removed. */
export interface LayerWrite
{
    path: string;
    changed: boolean;
    /** Whether the layer was left empty, and its file removed. */
    removed: boolean;
    set: string[];
    /** Fields given the system's own value, which the layer holds no more (INH-9). */
    again: string[];
    unset: string[];
}

/**
 * Writes the campaign's layer over a page of its game system (SYS-11): the change is read on the page as the campaign has it, and the layer keeps only what then differs
 * from the system. unset, or an empty text, takes the layer's own value or section away, and the page reads the system's again. The system's files never change.
 */
export function writeLayer(world: World, page: Page, change: PageChange): LayerWrite
{
    if (page.system === undefined) {
        throw new Error(`${page.name} is a page of the campaign: write it without layer. A layer changes a page of the game system for the whole campaign. Nothing changed.`);
    }

    const original = systemOriginal(page);
    const path = page.layer?.path ?? `${layersFolderName}/${page.system}/${original.path}`;
    const fullPath = join(world.root, path);
    const before = files().fresh(fullPath);
    const file = splitPageFile(before ?? "");
    const held = readFields(file.frontmatter, path);
    const fields = layerFields(world, page, original, held, change);
    const frontmatter = fields.set.length + fields.unsetKeys.length === 0 ? file.frontmatter : changeFields(file.frontmatter, { set: fields.values, unset: fields.unsetKeys }, path);
    const body = change.text === undefined ? file.body : withoutIdleSections(layerText(page, original, file.body, change as PageChange & { text: string; }), original.body);
    checkNamedOnce(page, file.body, body);
    const empty = (frontmatter ?? "").trim() === "" && body.trim() === "";
    const text = joinPageFile({ frontmatter, body });
    const changed = empty ? before !== undefined : text !== (before === undefined ? undefined : joinPageFile(file));

    if (empty && before !== undefined) {
        files().remove(fullPath);
    } else if (changed) {
        files().write(fullPath, text);
    }

    return { path, changed, removed: empty && before !== undefined, set: fields.set, again: fields.again, unset: fields.unset };
}

/**
 * Takes the campaign's whole layer off a page of its game system (SYS-11): its file goes, one that does not read too, and the page reads as the system writes it
 * again. Refused when the page has none.
 */
export function removeLayer(world: World, page: Page): LayerWrite
{
    if (page.system === undefined) {
        throw new Error(`${page.name} is a page of the campaign, which has no layer: a layer changes a page of the game system for the whole campaign. Nothing changed.`);
    }

    const path = page.layer?.path ?? `${layersFolderName}/${page.system}/${systemOriginal(page).path}`;
    const fullPath = join(world.root, path);

    if (files().fresh(fullPath) === undefined) {
        throw new Error(`The campaign has no layer over ${page.name} to take off: it already reads as the system ${page.system} writes it. Nothing changed.`);
    }

    files().remove(fullPath);
    return { path, changed: true, removed: true, set: [], again: page.layer?.fields ?? [], unset: [] };
}

/** The fields a change gives the layer: those that differ from the system's go in, those equal to it come out, unset takes the layer's own away. */
function layerFields(world: World, page: Page, original: Page, held: Record<string, unknown>, change: PageChange): { values: Record<string, unknown>; unsetKeys: string[]; set: string[]; again: string[]; unset: string[]; }
{
    const lists = Object.fromEntries(
        [...Object.keys(change.add ?? {}), ...Object.keys(change.remove ?? {})].map((field) => {
            const current = valueNamed(page.fields, field);
            const list = changedFields({ [field]: current ?? [] }, { add: pick(change.add, field), remove: pick(change.remove, field) })[field];
            return [field, list];
        }),
    );
    const given = { ...change.set, ...lists };
    const values: Record<string, unknown> = {};
    const unsetKeys: string[] = [];
    const [set, again, unset]: string[][] = [[], [], []];

    for (const [field, value] of Object.entries(given)) {
        checkLayerField(world, page, original, field, value);
        const system = sameName(Object.keys(original.fields), field);
        const own = sameName(Object.keys(held), field);
        const key = own ?? system ?? field;

        if (system !== undefined && JSON.stringify(original.fields[system]) === JSON.stringify(value)) {
            again.push(field);

            if (own !== undefined) {
                unsetKeys.push(own);
            }

            continue;
        }

        set.push(field);
        values[key] = value;
    }

    for (const field of change.unset ?? []) {
        const own = sameName(Object.keys(held), field);

        if (own === undefined) {
            const system = valueNamed(original.fields, field) === undefined ? "" : `: it is the system's own, which a layer cannot remove; set another value instead`;
            throw new Error(`The campaign's layer over ${page.name} holds no ${field} to remove${system}. Nothing changed.`);
        }

        unset.push(field);
        unsetKeys.push(own);
    }

    return { values, unsetKeys, set, again, unset };
}

/** Refuses what a layer never changes (SYS-11): the name, the type, a field never inherited (INH-8), and a counter of uses on an item that is a kind (STK-1). */
function checkLayerField(world: World, page: Page, original: Page, field: string, value: unknown): void
{
    if (layerTakes(original, field, value, world.system?.fields)) {
        return;
    }

    const why = ["name", "type"].includes(comparableText(field))
        ? `a layer changes neither the name nor the type of ${page.name}`
        : isNeverInherited(field)
        ? `${field} is a field no page inherits (INH-8), and ${page.name} is ${systemLabel(page)}, which is nowhere and derives only from the system`
        : `uses of its own would make ${page.name}, a kind counted in stacks, no kind: one with uses is an item of the campaign that derives from it, with item=[[${page.name}]]`;
    throw new Error(`${field} cannot go in the campaign's layer over ${page.name}: ${why}. Nothing changed.`);
}

/** The layer's text after a change: a section or the introduction equal to the system's comes out, an empty one takes the layer's own away. */
function layerText(page: Page, original: Page, body: string, change: PageChange & { text: string; }): string
{
    const section = change.section;
    const own = section === undefined ? introductionText(body) : partContent(body, section)?.content;
    const system = section === undefined ? introductionText(original.body) : partContent(original.body, section);
    const shown = section === undefined ? introductionText(page.body) : partContent(page.body, section)?.content;
    const content = change.append === true ? [shown ?? "", change.text.trim()].filter((part) => part !== "").join("\n\n") : change.text.trim();
    const where = section === undefined ? "the introduction" : `"${section}"`;
    const systemText = typeof system === "string" ? system : system?.content;

    if (content === "" || content === systemText) {
        if (own === undefined || own === "") {
            const under = section === undefined ? [] : layerParts(body).filter((part) => part.content !== "" && comparableText(part.under ?? "") === comparableText(section)).map((part) => part.name);
            const remedy = content !== ""
                ? ""
                : under.length > 0
                ? `: what the layer writes under it, ${under.join(", ")}, goes by its own name`
                : systemText !== undefined && systemText !== ""
                ? `: the system's text cannot be removed, only written over with another`
                : "";
            throw new Error(content === "" ? `The campaign's layer over ${page.name} has no ${where} of its own to remove${remedy}. Nothing changed.` : `${where} of ${page.name} already reads like that. Nothing changed.`);
        }

        // A section loses its own text alone: what the layer writes under it stays, and a heading left with nothing goes with the idle ones.
        return section === undefined ? writeText(body, "", { mode: "replace" }) : writeText(body, "", { section, mode: partContent(body, section)?.secret === true ? "remove" : "replace" });
    }

    const secret = change.secret === true || (typeof system === "object" && system.secret);
    return writeText(body, content, { mode: "replace", ...(section === undefined ? {} : { section, secret: own === undefined && secret }) });
}

/** Refuses a text that gives the layer a section or secret it already holds, as a heading of one written before: Page#Name finds one place. */
function checkNamedOnce(page: Page, before: string, after: string): void
{
    const already = repeatedNames(before).map(comparableText);
    const [repeated] = repeatedNames(after).filter((name) => !already.includes(comparableText(name)));

    if (repeated !== undefined) {
        throw new Error(
            `The campaign's layer over ${page.name} would hold "${repeated}" twice, and each section is written once: to change it, write ${page.name}#${repeated} with layer; for a new one, pick another name. Nothing changed.`,
        );
    }
}

/**
 * A layer's text without the sections that give nothing (SYS-11): the text of one that says what the system's says comes out, and a heading left with no text,
 * no section under it and no secret goes, from the last, so that the one it was written under goes with it.
 */
function withoutIdleSections(body: string, system: string): string
{
    let text = body;

    for (const name of [...sectionTitles(body)].reverse()) {
        const own = partContent(text, name);

        if (own === undefined || own.secret) {
            continue;
        }

        if (own.content !== "" && own.content === partContent(system, name)?.content) {
            text = writeText(text, "", { section: name, mode: "replace" });
        }

        // Its heading alone: no text, no section under it, no secret.
        if (readSection(text, name)?.includes("\n") === false) {
            text = writeText(text, "", { section: name, mode: "remove" });
        }
    }

    return text;
}

function pick(lists: Record<string, unknown[]> | undefined, field: string): Record<string, unknown[]> | undefined
{
    return lists?.[field] === undefined ? undefined : { [field]: lists[field] };
}
