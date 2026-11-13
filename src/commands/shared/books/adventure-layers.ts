// The layers an adventure carries over the pages of the game system it needs (ADV-8, SYS-11): which of the campaign's an export takes, where an install puts them and
// which it leaves out, and which go with the adventure when it is taken out.
import { basename, join, relative, sep } from "node:path";
import type { AdventureFiles } from "../../../adventures/index.ts";
import type { Context } from "../../../core/context.ts";
import { Refusal } from "../../../core/refusal.ts";
import { files } from "../../../core/store.ts";
import { comparableText, textPrint } from "../../../core/text.ts";
import { introductionText, layerFolder, layerParts, layersFolderName, layerTakes, type Page, type PageType, pageWithPath, readFields, splitPageFile, systemOriginal, type World, worldFolderName } from "../../../pages/index.ts";
import { followersOfWrite, logCounterChanges } from "../../write/inheritance.ts";
import { campaignCoins } from "../campaign/money.ts";
import { campaignWorld } from "../campaign/world.ts";
import { checkNotCopied, readOpenScene } from "../scene/scene.ts";

/** A page of the game system a layer changed, or changes no more, as the master hears it. */
export interface LayeredPage
{
    page: string;
    type?: PageType;
}

/** A layer of the adventure that did not come in, since the campaign has its own over the page: what it would have given. */
export interface LayerKept
{
    page: string;
    fields: string[];
    sections: string[];
    introduction: boolean;
}

/** What an adventure's layers did in the campaign (ADV-8). */
export interface LayersInstalled
{
    /** The pages of the game system they change now. */
    changed: LayeredPage[];
    /** Those left out, over a page the campaign has its own layer on. */
    kept: LayerKept[];
    /** Those left out, over no page of the system in the rules the campaign plays, by their file. */
    stray: string[];
}

/** Why a layer of the campaign stays out of an export: over no page, not read, writing what a layer never changes, or brought by an adventure and not changed since. */
export interface LayerLeftOut
{
    name: string;
    why: "no-page" | "unread" | "forbidden" | "adventure";
}

/** The campaign's layers an export carries, by their path in the .zip, with the pages they change, those from the player's documents, and those that stay out. */
export interface LayersExported
{
    carried: Record<string, Uint8Array>;
    pages: string[];
    sourced: string[];
    leftOut: LayerLeftOut[];
}

/** The layers of an install worked out before a file is written. */
export interface LayersPlan
{
    writes: { path: string; bytes: Uint8Array; }[];
    /** Every layer the adventure has in the campaign, written now or already there the same, by its file, with the print of its text: what taking it out compares. */
    prints: Record<string, string>;
    /** The pages of the system the layers written now change, as they were, each with the fields its layer gives. */
    changed: { page: Page; fields: string[]; }[];
    kept: LayerKept[];
    stray: string[];
    problems: string[];
}

/** The layers that go with an adventure taken out, the pages of the system they lay over as they were, and those changed since, which stay. */
export interface LayersRemoval
{
    paths: string[];
    changed: Page[];
    kept: string[];
}

/** The layers a line of the log says an adventure brought, by their file, each with the print of its text. */
export function layerPrints(value: unknown): Record<string, string>
{
    return value === null || typeof value !== "object" || Array.isArray(value) ? {} : Object.fromEntries(Object.entries(value).filter((entry): entry is [string, string] => typeof entry[1] === "string"));
}

/**
 * The campaign's layers as they are now, for an export (ADV-8): each over a page of the system goes, at the page's path; one over no page, one that does not read or
 * writes what a layer never changes, and one an installed adventure brought and no one changed since stay out, by name. `brought` are the layers of the adventures installed.
 */
export function layersToExport(root: string, world: World, system: string, brought: Record<string, string>[]): LayersExported
{
    const byLayer = new Map((world.system?.pages ?? []).flatMap((page): [string, Page][] => (page.layer === undefined ? [] : [[page.layer.path, page]])));
    const exported: LayersExported = { carried: {}, pages: [], sourced: [], leftOut: [] };

    for (const [path, bytes] of layerFiles(root, system)) {
        const file = `${layersFolderName}/${system}/${path}`;
        const page = byLayer.get(file);
        const name = page?.name ?? basename(path, ".md");
        const layer = readOrProblem(file, bytes);

        if (page === undefined || typeof layer === "string") {
            exported.leftOut.push({ name, why: typeof layer === "string" ? "unread" : "no-page" });
        } else if ((page.layer?.ignored.length ?? 0) > 0) {
            exported.leftOut.push({ name, why: "forbidden" });
        } else if (isBrought(brought, file, bytes)) {
            exported.leftOut.push({ name, why: "adventure" });
        } else if (!givesNothing(layer)) {
            exported.carried[`${layersFolderName}/${system}/${systemOriginal(page).path}`] = bytes;
            exported.pages.push(name);
            // From the player's documents when the layer says so, or the page under it does.
            exported.sourced.push(...(layer.fields.source !== undefined || systemOriginal(page).fields.source !== undefined ? [name] : []));
        }
    }

    return exported;
}

/**
 * Where each layer of an adventure goes (ADV-8): at its page's path in the campaign's layers. One over a page the campaign has its own layer on stays out, with what it
 * would have given, unless the two are the same; one over no page of the rules the campaign plays stays out; one that does not read, or writes what a layer never
 * changes, is a problem.
 */
export function planLayers(root: string, world: World, adventure: AdventureFiles): LayersPlan
{
    const system = world.system?.name ?? adventure.manifest.needs.system ?? "";
    const there = layerFiles(root, system);
    const own = new Map([...there.keys()].map((path) => [comparableText(path), path]));
    // As the world lays a layer over a page: by their paths, compared as names are.
    const under = new Map((world.system?.pages ?? []).map((page) => [comparableText(page.path), page]));
    const plan: LayersPlan = { writes: [], prints: {}, changed: [], kept: [], stray: [], problems: [] };
    const targets = new Set<string>();

    for (const path of Object.keys(adventure.layers).sort()) {
        const bytes = adventure.layers[path];
        const file = `${layersFolderName}/${system}/${path}`;
        const layer = readOrProblem(file, bytes);
        const page = under.get(comparableText(path));

        if (typeof layer === "string") {
            plan.problems.push(`its layer over ${page?.name ?? basename(path, ".md")} does not read: ${layer}`);
            continue;
        }

        // A file that gives nothing is no layer, as write leaves none.
        if (givesNothing(layer)) {
            continue;
        }

        const forbidden = Object.entries(layer.fields).filter(([field, value]) => !layerTakes(page === undefined ? pageless : systemOriginal(page), field, value, world.system?.fields)).map(([field]) => field);

        if (forbidden.length > 0) {
            plan.problems.push(`its layer over ${page?.name ?? basename(path, ".md")} writes ${forbidden.join(", ")}`);
            continue;
        }

        if (page === undefined) {
            plan.stray.push(file);
            continue;
        }

        const held = own.get(comparableText(path));
        const target = `${layersFolderName}/${system}/${held ?? systemOriginal(page).path}`;

        // Two files whose names differ only as names are compared, such as by an apostrophe.
        if (targets.has(target)) {
            plan.problems.push(`two of its layers lie over ${page.name}`);
            continue;
        }

        targets.add(target);

        // The same as the campaign's by its print, which is what taking the adventure out compares.
        if (held !== undefined && printOf(there.get(held) ?? new Uint8Array()) !== printOf(bytes)) {
            plan.kept.push({ page: page.name, fields: Object.keys(layer.fields), sections: layer.sections, introduction: layer.introduction });
            continue;
        }

        plan.prints[target] = printOf(bytes);

        if (held === undefined) {
            plan.writes.push({ path: target, bytes });
            plan.changed.push({ page, fields: Object.keys(layer.fields) });
        }
    }

    return plan;
}

/**
 * The layers that go with an adventure taken out (ADV-8): those still as it wrote them. One changed since, with write or by hand, stays the campaign's, by the name of
 * its page; one already gone is skipped; one another adventure of the campaign brought the same stays with that one. `others` are the layers of the other adventures.
 */
export function layersToRemove(root: string, world: World, brought: Record<string, string>, others: Record<string, string>[]): LayersRemoval
{
    const byLayer = new Map((world.system?.pages ?? []).flatMap((page): [string, Page][] => (page.layer === undefined ? [] : [[comparableText(page.layer.path), page]])));
    const removal: LayersRemoval = { paths: [], changed: [], kept: [] };

    for (const [file, print] of Object.entries(brought)) {
        const bytes = files().bytes(join(root, ...file.split("/")));
        const page = byLayer.get(comparableText(file));

        if (bytes === undefined) {
            continue;
        }

        if (printOf(bytes) !== print) {
            removal.kept.push(page?.name ?? basename(file, ".md"));
        } else if (!isBrought(others, file, bytes)) {
            removal.paths.push(file);
            removal.changed.push(...(page === undefined ? [] : [page]));
        }
    }

    return removal;
}

/**
 * Refuses to bring an adventure in, or take it out, while the open scene holds copies of a page whose fields its layers change (INH-10), as write with layer does.
 * Said without the page and its copies: the player reads it too, adding an adventure on the dashboard, and the remedy is the same.
 */
export function checkLayersNotCopied(root: string, world: World, title: string, doing: "installed" | "taken out", pages: Page[]): void
{
    const open = readOpenScene(root);

    for (const page of pages) {
        try {
            checkNotCopied(world, open, page);
        } catch (error) {
            if (!(error instanceof Refusal) || error.code !== "copies-in-scene") {
                throw error;
            }

            throw new Refusal(
                `${title} cannot be ${doing} now: its layers change a page of the game system that has copies in the open scene, which read from it what they do not change. `
                    + `Close the scene first, then give the same command again. Nothing changed.`,
                "adventure-copies",
                { name: title },
            );
        }
    }
}

/**
 * One public line for each counter of the player's party that changed with the pages of the system an adventure's layers came over, or went from (INH-11), as write
 * with layer writes them. `before` is the world as it was, and `pages` those pages in it; a page that was not there then, as one the adventure brings, changed nothing.
 */
export function logLayerCounters(root: string, context: Context, before: World, pages: Page[]): void
{
    if (pages.length === 0) {
        return;
    }

    const now = campaignWorld(root, context);
    const followers = new Set(pages.flatMap((page) => {
        const after = now.system?.pages.find((one) => one.path === page.path);
        return after === undefined ? [] : followersOfWrite(now, page, after).pages;
    }));
    const changed = now.pages.filter((page) => followers.has(page)).flatMap((page): [Page, Page][] => {
        const was = pageWithPath(before, page.path);
        return was === undefined ? [] : [[was, page]];
    });
    logCounterChanges(root, context, before, now, changed, campaignCoins(root, context).coins);
}

/** The pages of the system as the master hears them changed: each by its name, with its type. */
export function changedPages(pages: Page[]): LayeredPage[]
{
    return pages.map((page) => ({ page: page.name, ...(page.type === undefined ? {} : { type: page.type }) }));
}

// A page of no type with no fields, for a layer over no page: only what no layer ever changes is refused of it.
const pageless: Page = { name: "", path: "", fields: {}, body: "" };

/** The campaign's layers over the pages of a game system as their files are now, in order, by their path from the system's layers' folder, such as world/creatures/Goblin.md. */
function layerFiles(root: string, system: string): Map<string, Uint8Array>
{
    const folder = layerFolder(root, system);
    const found = files().files(join(folder, worldFolderName), (name) => /\.md$/i.test(name)).map((file): [string, Uint8Array] => [relative(folder, file).split(sep).join("/"), files().bytes(file) ?? new Uint8Array()]);
    return new Map(found.sort(([first], [second]) => (first < second ? -1 : 1)));
}

/** What a layer's file gives: its fields, its sections and whether it writes the introduction. */
interface LayerRead
{
    fields: Record<string, unknown>;
    sections: string[];
    introduction: boolean;
}

/** What a layer's file gives; it throws, naming the file, when its frontmatter does not read. */
function readLayer(file: string, bytes: Uint8Array): LayerRead
{
    const text = splitPageFile(new TextDecoder().decode(bytes));
    return { fields: readFields(text.frontmatter, file), sections: layerParts(text.body).map((part) => part.name), introduction: introductionText(text.body) !== "" };
}

/** What a layer's file gives, or why it does not read. */
function readOrProblem(file: string, bytes: Uint8Array): LayerRead | string
{
    try {
        return readLayer(file, bytes);
    } catch (error) {
        return error instanceof Error ? error.message : String(error);
    }
}

function givesNothing(layer: LayerRead): boolean
{
    return Object.keys(layer.fields).length === 0 && layer.sections.length === 0 && !layer.introduction;
}

/** Whether one of these adventures brought the layer in this file as it is now: the same file, as names are compared, with the same print. */
function isBrought(brought: Record<string, string>[], file: string, bytes: Uint8Array): boolean
{
    const print = printOf(bytes);
    return brought.some((layers) => Object.entries(layers).some(([path, known]) => comparableText(path) === comparableText(file) && known === print));
}

/** The print of a layer's file, by which one changed since it was written is told. */
function printOf(bytes: Uint8Array): string
{
    return textPrint(new TextDecoder().decode(bytes));
}
