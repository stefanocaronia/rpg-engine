// The campaign's layers over the pages of its game system (SYS-11, D-564): a file at the page's path under layers/<system>/, holding only what changes.
import { join } from "node:path";
import type { FieldKind } from "../core/field-kind.ts";
import { frozen } from "../core/frozen.ts";
import { comparableText } from "../core/text.ts";
import { isNeverInherited } from "./inheritance.ts";
import { introductionText, partContent, sectionAbove, textParts, writeText } from "./markdown.ts";
import { kindIn } from "./system-pages.ts";
import type { Page } from "./world.ts";

/** The folder of a campaign that holds its layers, one folder for each game system. */
export const layersFolderName = "layers";

/** What a campaign's layer changed on a page of its game system (SYS-11), for show and validate. */
export interface LayerMark
{
    /** The layer's file, from the campaign folder, such as layers/5e/world/creatures/Goblin.md. */
    path: string;
    /** The fields the layer gives the page, as it names them. */
    fields: string[];
    /** The sections and secrets the layer writes, replaced or added. */
    sections: string[];
    /** Whether the layer writes the introduction. */
    introduction: boolean;
    /** Fields written by hand that a layer cannot change, which the page reads from the system all the same: the type, the name, those never inherited (INH-8) and a kind's counters (STK-1). */
    ignored: string[];
}

/** The folder of the layers a campaign in `root` writes over the pages of a game system. */
export function layerFolder(root: string, system: string): string
{
    return join(root, layersFolderName, system);
}

/**
 * The pages of a game system with the campaign's layers over them (SYS-11), and the layers that lie over no page. `layers` are read from the layers' folder of the
 * system, with their paths from it, the same as the pages' from the system's; `prefix` is that folder from the campaign, for the mark. A page without a layer stays
 * the very object it was.
 */
export function layeredPages(pages: Page[], layers: Page[], prefix: string, declared?: Record<string, FieldKind>): { pages: Page[]; stray: string[]; }
{
    const byPath = new Map(layers.map((layer) => [comparableText(layer.path), layer]));
    const used = new Set<Page>();
    const merged = pages.map((page) => {
        const layer = byPath.get(comparableText(page.path));

        if (layer === undefined) {
            return page;
        }

        used.add(layer);
        return layeredPage(page, layer, `${prefix}/${layer.path}`, declared);
    });
    const stray = layers.filter((layer) => !used.has(layer)).map((layer) => `${prefix}/${layer.path}`);
    return { pages: merged, stray };
}

/**
 * A page of the game system with a layer over it: the layer's fields take the place of the page's, the text of a section of the layer that of the section with its name,
 * at any level, or the section is added, inside the one the layer writes it under when the page has that one; and its introduction, when it has one, that of the
 * page's. A heading with no text of its own takes nothing away. The translated text changes the same way where it has the section, else it goes, so that the
 * campaign's text is never hidden. The page stays the system's.
 */
export function layeredPage(page: Page, layer: { fields: Record<string, unknown>; body: string; }, path: string, declared?: Record<string, FieldKind>): Page
{
    const ignored = Object.entries(layer.fields).filter(([field, value]) => !layerTakes(page, field, value, declared)).map(([field]) => field);
    const given = Object.entries(layer.fields).filter(([field]) => !ignored.includes(field));
    const fields = { ...page.fields };

    for (const [field, value] of given) {
        // Under the name the system gives the field, as INH-5 compares names.
        const key = Object.keys(page.fields).find((own) => comparableText(own) === comparableText(field)) ?? field;
        fields[key] = value;
    }

    const parts = layerParts(layer.body);
    const introduction = introductionText(layer.body);
    let body = page.body;
    let translated = page.translated;

    for (const part of parts) {
        const there = partContent(body, part.name) !== undefined;

        // A heading without text only says where the sections under it go: the page's text under that name stays, and with nothing under it it is no section.
        if (part.content === "" && (there || !parts.some((other) => comparableText(other.under ?? "") === comparableText(part.name)))) {
            continue;
        }

        body = writeText(body, part.content, { section: part.name, mode: "replace", secret: part.secret && !there, under: part.under });
        translated = translated === undefined || partContent(translated, part.name) === undefined
            ? undefined
            : writeText(translated, part.content, { section: part.name, mode: "replace", secret: false });
    }

    if (introduction !== "") {
        body = writeText(body, introduction, { mode: "replace" });
        translated = translated === undefined ? undefined : writeText(translated, introduction, { mode: "replace" });
    }

    const sections = parts.filter((part) => part.content !== "").map((part) => part.name);
    const layered: LayerMark = { path, fields: given.map(([field]) => field), sections, introduction: introduction !== "", ignored };
    const merged: Page = { ...page, fields, body, translated, layer: layered };

    // A translation the layer could not follow goes, so that the campaign's text is never hidden.
    if (translated === undefined) {
        delete merged.translated;
    }

    originals.set(merged, page);
    return frozen(merged);
}

/** The page of the game system as the system writes it, under the campaign's layer; the page itself when it has none. */
export function systemOriginal(page: Page): Page
{
    return originals.get(page) ?? page;
}

/**
 * Whether a layer may give a page of the game system this field (SYS-11): never its name or type, a field never inherited (INH-8), which would put it somewhere or
 * make it known, nor a counter of uses to an item that has none, which would make a kind no kind (STK-1); a field the system `declared` uncounted is no counter.
 */
export function layerTakes(page: Page, field: string, value: unknown, declared?: Record<string, FieldKind>): boolean
{
    if (["name", "type"].includes(comparableText(field)) || isNeverInherited(field)) {
        return false;
    }

    const counted = (name: string, given: unknown): boolean => isUses(given) && [undefined, "counter"].includes(kindIn(declared, name));
    return page.type !== "item" || !counted(field, value) || Object.entries(page.fields).some(([name, given]) => counted(name, given));
}

/** The sections and secrets of a layer's text, in order: each with its own text, none for a heading that only holds others, whether it is a secret, and the section it is written under. */
export function layerParts(body: string): { name: string; content: string; secret: boolean; under?: string; }[]
{
    return textParts(body).filter((part) => part.name !== "").flatMap((part) => {
        const own = partContent(body, part.name);
        const under = own === undefined || own.secret ? undefined : sectionAbove(body, part.name);
        return own === undefined ? [] : [{ name: part.name, ...own, ...(under === undefined ? {} : { under }) }];
    });
}

const originals = new WeakMap<Page, Page>();

// A counter with a maximum, as uses: 3/3, which an item that is a kind never has (STK-1).
const usesPattern = /^\s*-?\d+\s*\/\s*\d+\s*$/;

function isUses(value: unknown): boolean
{
    return typeof value === "string" && usesPattern.test(value);
}
