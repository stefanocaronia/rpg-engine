// The map of a place in play (GRD-1–GRD-3, D-324): its grid from the page's text, who stands where on it as the place's `at` lists them, what of them is
// wrong, and the squares a move leaves and takes.
import { rememberedByText } from "../../core/memo.ts";
import type { Problem } from "../../core/problem.ts";
import { comparableText } from "../../core/text.ts";
import { builtIn, closedSquare, firstOpenSquare, type Grid, mapBlock, readGrid, readSquare, type Square, squareName } from "../../grid/index.ts";
import { squareKinds } from "../../map/index.ts";
import { environmentAt, links, locate, type MovePlan, type Page, pagesWithName, parsePageReference, type World, writePage } from "../../pages/index.ts";
import type { Scene } from "../../scene/index.ts";

/** Someone or something on a place's map (GRD-3): the entry of `at` as written, the page or the copy of the open scene it names, and its square. */
export interface Standing
{
    entry: string;
    name: string;
    page?: Page;
    copy?: string;
    square?: Square;
}

/** The map of a place (GRD-1): its grid, and what of it cannot be read; none for a page that is no place or has no map block. */
export function placeGrid(page: Page): { grid: Grid; problems: string[]; } | undefined
{
    return page.type === "place" ? readMap(page.body) : undefined;
}

/**
 * The grid as the place draws it (D-325): the walls of a cave or a mine as rock, unless the legend says otherwise; and how its ground looks: the legend's own
 * floor or ground, else a cave's rock, a building's floor where it has walls, a town's paving, the biome the place has or inherits, or plain ground.
 */
export function placeLook(world: World, place: Page, grid: Grid): { grid: Grid; ground: string; }
{
    const kindOf = (page: Page): string | undefined => (typeof page.fields.kind === "string" ? page.fields.kind.trim().toLowerCase() : undefined);
    const underground = ["cave", "mine"].includes(kindOf(place) ?? "");
    const named = (symbol: string): boolean => !builtInLook(grid, symbol);
    const features = grid.features.map((feature) => (feature.symbol === "#" && underground && !named("#") ? { ...feature, kind: "rock" } : feature));
    const floor = features.find((feature) => feature.symbol === ".")?.kind ?? "floor";
    const walled = grid.lines.some((line) => line.includes("#")) && features.find((feature) => feature.symbol === "#")?.kind === "wall";
    const town = [place, ...locate(world, place).chain].some((page) => ["city", "town", "village"].includes(kindOf(page) ?? ""));
    const biome = environmentAt(world, place).find(({ entry }) => comparableText(entry.name) === "biome")?.entry.value;
    const ground = named(".") && floor === "floor" ? "floor" : underground ? "cave" : !named(".") && walled ? "floor" : town ? "paving" : (biome ?? "plain");
    return { grid: { ...grid, features }, ground };
}

/** A word on a map just written (GRD-2): what of it does not read, and the kinds the dashboard does not draw, which it draws neutral. */
export function gridNotes(before: Page | undefined, after: Page): string[]
{
    const map = placeGrid(after);

    if (map === undefined || (before !== undefined && mapBlock(before.body) === mapBlock(after.body))) {
        return [];
    }

    const known = new Set<string>(squareKinds);
    const unknown = map.grid.features.filter((feature) => feature.kind !== "" && !known.has(feature.kind)).map((feature) => `${feature.symbol} ${feature.kind}`);
    const drawn = unknown.length === 0 ? [] : [`The map draws ${unknown.join(", ")} neutral: its kinds are ${squareKinds.join(", ")}.`];
    return [...map.problems.map((problem) => `${after.name}'s map: ${problem}`), ...drawn];
}

/** Who stands where in a place (GRD-3): its `at` entries, each with the page or the copy of the open scene it names, and its square when it gives one. */
export function standing(world: World, place: Page, scene: Scene | undefined): Standing[]
{
    return atEntries(place).map((entry) => {
        const match = /^(.*\S)\s+([A-Za-z]+\d+)$/.exec(entry.trim());
        const who = (match?.[1] ?? entry).trim();
        const square = match === null ? undefined : readSquare(match[2]);
        const linked = links(who)[0]?.page;
        const copy = linked === undefined ? Object.keys(scene?.copies ?? {}).find((name) => comparableText(name) === comparableText(who)) : undefined;
        const page = copy === undefined ? pagesWithName(world, parsePageReference(linked ?? who).name)[0] : undefined;
        return { entry, name: copy ?? page?.name ?? linked ?? who, ...(page === undefined ? {} : { page }), ...(copy === undefined ? {} : { copy }), ...(square === undefined ? {} : { square }) };
    });
}

/** The entry of `at` that puts someone on a square: a page by its link, a copy by its name. */
export function atEntry(who: { page?: Page; copy?: string; }, square: Square): string
{
    return `${who.copy ?? `[[${who.page?.name ?? ""}]]`} ${squareName(square)}`;
}

/** The entries of a place's `at`, as written. */
export function atEntries(place: Page): string[]
{
    const value = place.fields.at;
    return (Array.isArray(value) ? value : value === undefined || value === null ? [] : [value]).filter((entry): entry is string => typeof entry === "string");
}

/**
 * The squares a move changes (GRD-3), as edits of the places' `at`: who moves leaves every square they had; who enters a place with a map from a place one of its
 * squares leads to stands on that square. The edits come first, so that the destination stays the last page written (CON-4).
 */
export function withSquares(world: World, plan: MovePlan, destination: Page | undefined): MovePlan
{
    const leaving = world.pages.filter((place) => place.type === "place").flatMap((place) => {
        const remove = standing(world, place, undefined).filter((one) => one.page !== undefined && plan.moving.includes(one.page)).map((one) => one.entry);
        return remove.length === 0 ? [] : [{ holder: place, field: "at", remove, add: [] }];
    });
    const map = destination === undefined ? undefined : placeGrid(destination);
    const entering = map === undefined || destination === undefined ? [] : plan.moving.flatMap((page) => {
        const door = doorFrom(world, map.grid, page, destination);
        return door === undefined ? [] : [atEntry({ page }, door)];
    });
    const intoDestination = entering.length === 0 || destination === undefined ? [] : [{ holder: destination, field: "at", remove: [], add: entering }];
    return { ...plan, edits: [...leaving, ...plan.edits, ...intoDestination] };
}

/** A word to the master when, in a scene at a place with a map, some stand on no square of it (GRD-3): who, and how to put them there. */
export function offMapNote(world: World, place: Page | undefined, scene: Scene, names: string[]): string | undefined
{
    const map = place === undefined ? undefined : placeGrid(place);

    if (place === undefined || map === undefined) {
        return undefined;
    }

    const placed = new Set(standing(world, place, scene).filter((one) => one.square !== undefined).map((one) => comparableText(one.name)));
    const off = names.filter((name) => !placed.has(comparableText(name)));
    return off.length === 0 ? undefined : `${place.name} has a map: put ${off.join(", ")} on it, one at a time, such as page ${off[0]}, at ${squareName(firstOpenSquare(map.grid))}.`;
}

/** Takes copies of the open scene off the map of its place (GRD-3), as they leave, or the scene closes or goes elsewhere. */
export function clearCopies(world: World, scene: Scene, names: string[]): void
{
    const place = scene.place === undefined ? undefined : pagesWithName(world, parsePageReference(scene.place).name)[0];
    const gone = new Set(names.map(comparableText));
    const leaving = place === undefined ? [] : standing(world, place, scene).filter((one) => one.copy !== undefined && gone.has(comparableText(one.copy))).map((one) => one.entry);

    if (place !== undefined && leaving.length > 0) {
        const kept = atEntries(place).filter((entry) => !leaving.includes(entry));
        writePage(world, place.name, undefined, kept.length === 0 ? { unset: ["at"] } : { set: { at: kept } });
    }
}

/**
 * The square a page enters a place's map by (GRD-3): the open one that leads to where it comes from, the nearest of its containers first; none when no such
 * square leads there, or it comes from inside the place itself, as up from its cellar, or put down by one who is there.
 */
function doorFrom(world: World, grid: Grid, page: Page, place: Page): Square | undefined
{
    const holders = locate(world, page).chain;
    const inside = holders.findIndex((holder) => holder.path === place.path);
    const chain = (inside === -1 ? holders : holders.slice(0, inside)).map((holder) => comparableText(holder.name));
    const exits = grid.exits.filter((exit) => chain.includes(comparableText(exit.to)) && closedSquare(grid, exit.square) === undefined);
    return exits.sort((first, second) => chain.indexOf(comparableText(first.to)) - chain.indexOf(comparableText(second.to)))[0]?.square;
}

/** What is wrong with the places' maps and with who stands where on them (GRD-2, GRD-3), for validate. */
export function gridProblems(world: World, scene: Scene | undefined): Problem[]
{
    const scenePlace = scene?.place === undefined ? undefined : pagesWithName(world, parsePageReference(scene.place).name)[0];
    return world.pages.filter((page) => page.type === "place" && page.system === undefined).flatMap((place): Problem[] => {
        const map = placeGrid(place);
        const placed = standing(world, place, scenePlace === place ? scene : undefined);

        if (map === undefined) {
            return placed.length === 0 ? [] : [{ path: place.path, message: `${place.name} says who stands where, at, but has no map.`, fix: `write its map in a map block (GRD-1), or unset at` }];
        }

        const exits = map.grid.exits.filter((exit) => pagesWithName(world, exit.to)[0] === undefined).map((exit): Problem => ({
            path: place.path,
            message: `${place.name}'s map leads from ${squareName(exit.square)} to ${exit.to}, which is no page.`,
            fix: `write ${exit.to}, or the exit with the name of a place`,
        }));
        return [
            ...map.problems.map((message): Problem => ({ path: place.path, message: `${place.name}'s map: ${message}` })),
            ...exits,
            ...placed.flatMap((one) => standingProblem(world, place, map.grid, one)),
            ...twiceOn(place, placed),
        ];
    });
}

/** Whether a symbol every map has keeps its own name and drawing, the legend saying nothing of it. */
function builtInLook(grid: Grid, symbol: string): boolean
{
    const feature = grid.features.find((one) => one.symbol === symbol);
    const own = builtIn.find((one) => one.symbol === symbol);
    return feature !== undefined && own !== undefined && feature.name === own.name && feature.kind === own.kind;
}

const readMap = rememberedByText((text: string): { grid: Grid; problems: string[]; } | undefined => {
    const block = mapBlock(text);
    return block === undefined ? undefined : readGrid(block);
});

/** What is wrong with one entry of a place's `at` (GRD-3): no square, no one by that name, someone the place does not hold, a closed square. */
function standingProblem(world: World, place: Page, grid: Grid, one: Standing): Problem[]
{
    const fix = `move them there with move, at a square, or remove "${one.entry}" from ${place.name}'s at`;

    if (one.square === undefined) {
        return [{ path: place.path, message: `"${one.entry}", in ${place.name}'s at, gives no square.`, fix: `write it as [[Name]] C4` }];
    }

    if (one.page === undefined && one.copy === undefined) {
        return [{ path: place.path, message: `${one.name} stands on ${squareName(one.square)} in ${place.name}, but there is no page or copy of the open scene there by that name.`, fix }];
    }

    if (one.page !== undefined && locate(world, one.page).chain[0] !== place) {
        return [{ path: place.path, message: `${one.name} stands on ${squareName(one.square)} in ${place.name}, but is not in it.`, fix }];
    }

    const closed = closedSquare(grid, one.square);
    return closed === undefined ? [] : [{ path: place.path, message: `${one.name} stands on ${squareName(one.square)} in ${place.name}, but ${closed}.`, fix }];
}

/** Those who stand on more than one square of a place (GRD-3): each once, with their squares. */
function twiceOn(place: Page, placed: Standing[]): Problem[]
{
    const same = (one: Standing, other: Standing): boolean => (one.page !== undefined && one.page === other.page) || (one.copy !== undefined && one.copy === other.copy);
    return placed.filter((one, index) => placed.findIndex((other) => same(other, one)) === index).flatMap((one): Problem[] => {
        const squares = placed.flatMap((other) => (same(other, one) && other.square !== undefined ? [squareName(other.square)] : []));
        return squares.length < 2 ? [] : [{ path: place.path, message: `${one.name} stands on more than one square in ${place.name}: ${squares.join(", ")}.`, fix: "move them with move, at the one square they are on" }];
    });
}
