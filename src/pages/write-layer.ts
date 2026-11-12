// Writing the campaign's layer over a page of its game system (SYS-11): only what differs from the system, and no layer left empty.
import { join } from "node:path";
import { files } from "../core/store.ts";
import { comparableText, sameName, valueNamed } from "../core/text.ts";
import { changedFields, changeFields, joinPageFile, readFields, splitPageFile } from "./file.ts";
import { isNeverInherited } from "./inheritance.ts";
import { layersFolderName, layerTakes, systemOriginal } from "./layers.ts";
import { introductionText, partContent, writeText } from "./markdown.ts";
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
    const body = change.text === undefined ? file.body : layerText(page, original, file.body, change as PageChange & { text: string; });
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
            const remedy = content === "" && systemText !== undefined && systemText !== "" ? `: the system's text cannot be removed, only written over with another` : "";
            throw new Error(content === "" ? `The campaign's layer over ${page.name} has no ${where} of its own to remove${remedy}. Nothing changed.` : `${where} of ${page.name} already reads like that. Nothing changed.`);
        }

        return section === undefined ? writeText(body, "", { mode: "replace" }) : writeText(body, "", { section, mode: "remove" });
    }

    const secret = change.secret === true || (typeof system === "object" && system.secret);
    return writeText(body, content, { mode: "replace", ...(section === undefined ? {} : { section, secret: own === undefined && secret }) });
}

function pick(lists: Record<string, unknown[]> | undefined, field: string): Record<string, unknown[]> | undefined
{
    return lists?.[field] === undefined ? undefined : { [field]: lists[field] };
}
