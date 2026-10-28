// Maps (D-320, POS-8): the main one, and those places hold, each with coordinates of its own or aligned with another place's map, under it or as its mirror.
// A page is on the map of the nearest place of its chain that holds one, as the engine works out where a thing is by climbing its containers.
import type { Problem } from "../core/problem.ts";
import { locate, type Page, pagesWithName, type World } from "./world.ts";

/** How a place holds its map: with coordinates of its own, or with those of another place's map, under it or as its mirror. */
export type MapField = { how: "own"; } | { how: "under" | "mirror"; of: string; };

/** How the map field is written, for messages. */
export const mapHelp = "own, for coordinates of its own, or under [[Place]] or mirror of [[Place]], for those of that place's map";

/** A place's map field as written (POS-8): own, under [[Place]] or mirror of [[Place]]; undefined for anything else. */
export function readMapField(value: unknown): MapField | undefined
{
    if (typeof value !== "string") {
        return undefined;
    }

    if (/^\s*own\s*$/i.test(value)) {
        return { how: "own" };
    }

    const match = /^\s*(under|mirror of)\s+\[\[([^\]|#]+)(?:[|#][^\]]*)?\]\]\s*$/i.exec(value);
    return match === null ? undefined : { how: match[1].toLowerCase() === "under" ? "under" : "mirror", of: match[2].trim() };
}

/** A map: the place that holds it, none for the main map; the key of its coordinates; and, when it shares another map's, how and with which place's map. */
export interface PlaceMap
{
    root?: Page;
    /** The root whose coordinates the map uses, by its file; "" for the main map's. */
    frame: string;
    aligned?: { how: "under" | "mirror"; of: Page; };
}

/** The map a page is on (POS-8): that of the nearest place of its chain, itself first, that holds one; else the main map. */
export function mapOf(world: World, page: Page): PlaceMap
{
    let byPage = known.get(world);

    if (byPage === undefined) {
        byPage = new Map();
        known.set(world, byPage);
    }

    let map = byPage.get(page.path);

    if (map === undefined) {
        const root = rootOf(world, page);
        map = root === undefined ? { frame: "" } : rootMap(world, root, new Set());
        byPage.set(page.path, map);
    }

    return map;
}

/** Which map a page is on, as a key: the file of the place that holds it, "" for the main map. Regions, terrain and the places near hold on one map (POS-6). */
export function mapKey(world: World, page: Page): string
{
    return mapOf(world, page).root?.path ?? "";
}

/** Whether two pages share their coordinates (POS-2, POS-4): positions are given and stops placed between them. */
export function sameFrame(world: World, first: Page, second: Page): boolean
{
    return mapOf(world, first).frame === mapOf(world, second).frame;
}

/** The places whose map field does not read, or names a place that is not there (POS-8). */
export function mapProblems(world: World): Problem[]
{
    return world.pages.filter((page) => page.type === "place" && page.system === undefined && page.fields.map !== undefined).flatMap((page): Problem[] => {
        const field = readMapField(page.fields.map);

        if (field === undefined || field.how === "own" || pagesWithName(world, field.of)[0]?.type === "place") {
            return [];
        }

        return [{ path: page.path, message: `${page.name}'s map is ${field.how === "under" ? "under" : "the mirror of"} ${field.of}, which is no place.`, fix: `write ${page.name}, set map to own, or name a place of the map it shares` }];
    });
}

const known = new WeakMap<World, Map<string, PlaceMap>>();

/** The nearest place of a page's chain, itself first, that holds a map. */
function rootOf(world: World, page: Page): Page | undefined
{
    return [page, ...locate(world, page).chain].find((holder) => holder.type === "place" && holder.system === undefined && readMapField(holder.fields.map) !== undefined);
}

/** The map a place holds: its own coordinates, or those of the map of the place it is under or mirrors; a broken or circular alignment keeps its own. */
function rootMap(world: World, root: Page, seen: Set<string>): PlaceMap
{
    const field = readMapField(root.fields.map);
    const of = field === undefined || field.how === "own" ? undefined : pagesWithName(world, field.of)[0];

    if (field === undefined || field.how === "own" || of === undefined || seen.has(root.path)) {
        return { root, frame: root.path };
    }

    seen.add(root.path);
    const target = rootOf(world, of);
    const frame = target === undefined ? "" : target === root ? root.path : rootMap(world, target, seen).frame;
    return { root, frame, aligned: { how: field.how, of } };
}
