// Where the player character is and the open scene, as data for the dashboard (VIEW-6, D-310): what the player may see of them, as the character knows them.
import type { Context } from "../core/context.ts";
import { comparableText } from "../core/text.ts";
import { readCounter } from "../counters/index.ts";
import type { Effect } from "../effects/index.ts";
import { type Grid, squareName, withoutMapBlock } from "../grid/index.ts";
import { environmentAt, formatEnvironmentEntry, locate, type Page, pagesWithName, parsePageReference, placesAround, type World } from "../pages/index.ts";
import type { GameSystem } from "../systems/index.ts";
import { effectsOf } from "./effect-layer.ts";
import { effectParts, effectText, keptEffects } from "./game-effects.ts";
import { placeGrid, placeLook, standing } from "./game-grids.ts";
import { shownImage } from "./game-images.ts";
import { type Knowledge, knownText, knowsPage } from "./game-knowledge.ts";
import { copyPage, readOpenScene } from "./game-scene.ts";
import { campaignSystem } from "./game-world.ts";
import { pageCounters } from "./page-counters.ts";

/** Someone at the place or in the scene as the player sees them: a name, or someone; their role and picture; for copies of a creature, how many. */
export interface ShownPerson
{
    name: string;
    role: "pc" | "companion" | "other";
    image?: { file: string; version: number; };
    /** Someone the character does not know, shown without a name. */
    stranger?: true;
    /** How many copies of a creature, in the open scene. */
    count?: number;
}

/** Where the player character is, as it knows it (VIEW-6). */
export interface ShownPlace
{
    name: string;
    image?: { file: string; version: number; };
    /** The places that hold it, the outermost first, of those the character knows. */
    within: string[];
    /** What holds there, nearest first: the environment, then the places' effects; each with its place, when the character knows it. */
    around: { text: string; place?: string; }[];
    /** Its text as the character knows it (VIEW-3). */
    text: string;
    /** The party and the characters the character knows who are there; never someone it does not know, who would give themselves away. */
    here: ShownPerson[];
    /** Its map, when it has one (GRD-6). */
    map?: ShownGrid;
}

/**
 * The map of the place where the party is (GRD-6, D-323): its squares as written, its legend, where its squares lead, the places the character does not know
 * left unnamed, and who stands where as the scene and VIEW-4 name them.
 */
export interface ShownGrid
{
    columns: number;
    rows: number;
    lines: string[];
    /** Each symbol of the map, those every map has too, by the kind it is drawn as; never one not found yet. */
    legend: { symbol: string; name: string; kind: string; blocks?: true; difficult?: true; }[];
    /** How its ground looks (D-325): floor, cave, paving, a biome, or plain. */
    ground: string;
    exits: { square: string; to?: string; }[];
    at: (ShownPerson & { square: string; })[];
}

/**
 * Someone in a fight as the player sees them (D-314): their counter, the party's as numbers and a foe's in words, or none; what is on them, the party's as their
 * line gives it, with its end, for others only the conditions anyone sees, by name; whether they cannot act; what they keep alive; the panel of the dying.
 */
export interface Fighter
{
    name: string;
    role: "pc" | "companion" | "other";
    image?: { file: string; version: number; };
    stranger?: true;
    health?: string;
    effects: { name: string; end?: string; text: string; }[];
    inactive?: true;
    keeps?: string[];
    dying?: DyingCounter[];
}

/** A counter of the panel of the dying (D-314): its value, and the limit the system's thresholds give it. */
export interface DyingCounter
{
    field: string;
    value: number;
    limit?: number;
}

/** The open scene as the player sees it (VIEW-6): who is in it as in VIEW-4, and the order of the turns. */
export interface ShownScene
{
    title: string;
    type: string;
    /** The game date it opened. */
    since?: string;
    /** What is happening now, as the master wrote it for the player (SCN-11). */
    now?: string;
    place?: string;
    who: ShownPerson[];
    order?: string[];
    turn?: string;
    round?: number;
    /** In a fight, each one in it, in the order of the turns when there is one (D-314). */
    fighters?: Fighter[];
}

/** What the view reads to show the place and the scene: the campaign, the world, what the character knows, and who the party are. */
export interface PlaceSight
{
    root: string;
    context: Context;
    world: World;
    knowledge: Knowledge;
    party: Page[];
}

/** Where the player character is, as it knows it; none when it is in no place it knows, as in the open on a journey. */
export function shownPlace(sight: PlaceSight): ShownPlace | undefined
{
    const { world, knowledge } = sight;
    const places = locate(world, knowledge.pc).chain.filter((holder) => holder.type === "place" && knowsPage(knowledge, holder));
    const place = places[0];

    if (place === undefined) {
        return undefined;
    }

    const known = (holder: Page): string | undefined => (knowsPage(knowledge, holder) ? holder.name : undefined);
    const around = [
        ...environmentAt(world, place).map(({ entry, place: holder }) => ({ text: formatEnvironmentEntry(entry), place: known(holder) })),
        ...placesAround(world, place).flatMap((holder) => effectsOf(holder).map((effect) => ({ text: effectText(effect), place: known(holder) }))),
    ].map((item) => (item.place === undefined ? { text: item.text } : { text: item.text, place: item.place }));
    const present = world.pages.filter((page) =>
        page.type === "character" && page.fields.status !== "dead" && locate(world, page).chain[0] === place
        && (sight.party.includes(page) || knowsPage(knowledge, page))
    );
    const image = picture(sight, place);
    const grid = placeGrid(place)?.grid;
    const text = knownText(world, knowledge, place);
    return {
        name: place.name,
        ...(image === undefined ? {} : { image }),
        within: places.slice(1).map((holder) => holder.name).reverse(),
        around,
        // The map block is drawn, not read.
        text: grid === undefined ? text : withoutMapBlock(text),
        // The party first, the player character at its head.
        here: [...sight.party.filter((page) => present.includes(page)), ...present.filter((page) => !sight.party.includes(page))].map((page) => person(sight, page)),
        ...(grid === undefined ? {} : { map: shownGrid(sight, place, grid) }),
    };
}

/**
 * A place's map as the player sees it (GRD-6): who stands where, the party and the characters the character knows by name, the others of the open scene as
 * someone, its copies as the scene names them; a character it does not know outside the scene is not shown, as in VIEW-6.
 */
function shownGrid(sight: PlaceSight, place: Page, written: Grid): ShownGrid
{
    const { grid, ground } = placeLook(sight.world, place, written);
    // What is not found yet looks like what lies under it: a hidden door like the wall, anything else like the floor (GRD-6).
    const hidden = new Map(grid.features.filter((feature) => feature.hidden).map((feature) => [feature.symbol, ["door", "open-door", "secret-door", "opening", "window"].includes(feature.kind) ? "#" : "."]));
    const lines = grid.lines.map((line) => [...line].map((symbol) => hidden.get(symbol) ?? symbol).join(""));
    const used = new Set(lines.join(""));
    const scene = readOpenScene(sight.root).scene;
    const here = scene?.place !== undefined && comparableText(parsePageReference(scene.place).name) === comparableText(place.name) ? scene : undefined;
    const inScene = new Set((here?.with ?? []).map((link) => comparableText(parsePageReference(link).name)));
    const at = standing(sight.world, place, here).flatMap((one): ShownGrid["at"] => {
        const square = one.square === undefined ? undefined : squareName(one.square);

        if (square === undefined) {
            return [];
        }

        if (one.copy !== undefined && here !== undefined) {
            const creature = knownPage(sight, here.copies[one.copy]?.creature);
            const image = creature === undefined ? undefined : picture(sight, creature);
            return [
                creature === undefined
                    ? { name: `creature ${/\d+$/.exec(one.copy)?.[0] ?? ""}`.trim(), role: "other", stranger: true, square }
                    : { name: one.copy, role: "other", ...(image === undefined ? {} : { image }), square },
            ];
        }

        const page = one.page;

        if (page === undefined || page.type !== "character" || page.fields.status === "dead") {
            return [];
        }

        if (sight.party.includes(page) || knowsPage(sight.knowledge, page)) {
            return [{ ...person(sight, page), square }];
        }

        return inScene.has(comparableText(page.name)) ? [{ name: "someone", role: "other", stranger: true, square }] : [];
    });
    return {
        columns: grid.columns,
        rows: grid.rows,
        lines,
        legend: grid.features.filter((feature) => !feature.hidden && used.has(feature.symbol)).map((feature) => ({
            symbol: feature.symbol,
            name: feature.name,
            kind: feature.kind,
            ...(feature.blocks ? { blocks: true as const } : {}),
            ...(feature.difficult ? { difficult: true as const } : {}),
        })),
        ground,
        exits: grid.exits.filter((exit) => !hidden.has(lines[exit.square.row]?.[exit.square.column] ?? "") && !grid.features.some((feature) => feature.hidden && feature.symbol === written.lines[exit.square.row]?.[exit.square.column])).map(
            (exit) => {
                const to = knownPage(sight, exit.to);
                return { square: squareName(exit.square), ...(to === undefined ? {} : { to: to.name }) };
            },
        ),
        at,
    };
}

/** The open scene as the player sees it; none when no scene is open, or it cannot be read. */
export function shownScene(sight: PlaceSight): ShownScene | undefined
{
    const { scene } = readOpenScene(sight.root);

    if (scene === undefined) {
        return undefined;
    }

    const place = knownPage(sight, scene.place);
    const characters = scene.with.map((link) => {
        const page = knownPage(sight, link);
        return page === undefined ? { name: "someone", role: "other" as const, stranger: true as const } : person(sight, page);
    });
    const creatures = [...new Set(Object.values(scene.copies).map((copy) => copy.creature))].map((creature) => {
        const count = Object.values(scene.copies).filter((copy) => copy.creature === creature).length;
        const page = knownPage(sight, creature);
        return page === undefined ? { name: "creature", role: "other" as const, stranger: true as const, count } : { ...person(sight, page), count };
    });
    const turnName = (name: string): string => shownTurn(sight, scene.copies, name);
    return {
        title: scene.title,
        type: scene.type,
        ...(scene.opened === undefined ? {} : { since: scene.opened }),
        ...(scene.now === undefined ? {} : { now: scene.now }),
        ...(place === undefined ? {} : { place: place.name }),
        who: [...characters, ...creatures],
        ...(scene.order === undefined ? {} : { order: scene.order.map(turnName) }),
        ...(scene.turn === undefined ? {} : { turn: turnName(scene.turn) }),
        ...(scene.round === undefined ? {} : { round: scene.round }),
        ...(scene.type === "combat" ? { fighters: fightersOf(sight, scene) } : {}),
    };
}

/** Everyone in a fight, in the order of the turns when there is one, else the characters then the copies; those the view cannot name are left out. */
function fightersOf(sight: PlaceSight, scene: { with: string[]; copies: Record<string, { creature: string; }>; order?: string[]; }): Fighter[]
{
    const names = scene.order ?? [...scene.with.map((link) => parsePageReference(link).name), ...Object.keys(scene.copies)];
    return names.flatMap((name) => {
        const fighter = fighterOf(sight, scene, name);
        return fighter === undefined ? [] : [fighter];
    });
}

/** One in the fight (D-314): a copy as the character knows its creature, a character as it knows them; the party in full, the others by what anyone sees. */
function fighterOf(sight: PlaceSight, scene: { copies: Record<string, { creature: string; }>; }, name: string): Fighter | undefined
{
    const system = campaignSystem(sight.root, sight.context);
    const copy = Object.entries(scene.copies).find(([copyName]) => comparableText(copyName) === comparableText(name));
    const page = copy === undefined ? pagesWithName(sight.world, parsePageReference(name).name)[0] : copyPage(copy[0], copy[1]);

    if (page === undefined) {
        return undefined;
    }

    const party = sight.party.includes(page);
    // A copy is named when the character knows its creature; a character when it knows them.
    const creature = copy === undefined ? undefined : knownPage(sight, copy[1].creature);
    const stranger = copy === undefined ? !party && !knowsPage(sight.knowledge, page) : creature === undefined;
    const shown = !stranger ? page.name : copy === undefined ? "someone" : `creature ${/\d+$/.exec(copy[0])?.[0] ?? ""}`.trim();
    const image = stranger ? undefined : picture(sight, creature ?? page);
    const counters = pageCounters(sight.world, page);
    const track = system?.combat === undefined ? undefined : readCounter(counters[system.combat.track]);
    const conditions = new Set((system?.conditions ?? []).map(comparableText));
    const effects = effectsOf(page).filter((effect) => party || conditions.has(comparableText(effect.name)));
    const inactive = new Set((system?.combat?.inactive ?? []).map(comparableText));
    const health = track === undefined ? undefined : party ? `${track.value}${track.max === undefined ? "" : `/${track.max}`}` : system?.combat?.inWords ? healthWord(track.value, track.max) : undefined;
    const keeps = party ? keptEffects(sight.world, readOpenScene(sight.root).scene, page.name) : [];
    const dying = party ? dyingOf(sight.world, system, page) : undefined;
    return {
        name: shown,
        role: page === sight.knowledge.pc ? "pc" : party ? "companion" : "other",
        ...(image === undefined ? {} : { image }),
        ...(stranger ? { stranger: true as const } : {}),
        ...(health === undefined ? {} : { health }),
        effects: effects.map((effect) => (party ? seenEffect(sight, effect) : { name: effect.name, text: effect.name })),
        ...(effects.some((effect) => inactive.has(comparableText(effect.name))) ? { inactive: true as const } : {}),
        ...(keeps.length === 0 ? {} : { keeps }),
        ...(dying === undefined ? {} : { dying }),
    };
}

/**
 * The panel of the dying of someone of the party (D-310 (7), D-314): at the value of the counter the system names, as hp 0, the counters it shows, with their
 * limits; none at any other value, nor for the dead.
 */
export function dyingOf(world: World, system: GameSystem | undefined, page: Page): DyingCounter[] | undefined
{
    const counters = pageCounters(world, page);
    const dying = system?.dying;

    if (dying === undefined || page.fields.status === "dead" || readCounter(counters[dying.field])?.value !== dying.value) {
        return undefined;
    }

    return dying.show.map((field) => ({ field, value: readCounter(counters[field] ?? page.fields[field])?.value ?? 0, ...limitOf(system?.thresholds ?? [], field) }));
}

/** An effect on someone of the party as the player sees it: an end at someone's turn names them as the character knows them (VIEW-4), as creature 2. */
export function seenEffect(sight: PlaceSight, effect: Effect): { name: string; end?: string; text: string; }
{
    const end = effect.end;

    if (end === undefined || !("turn" in end)) {
        return effectParts(sight.world, effect);
    }

    const copies = readOpenScene(sight.root).scene?.copies ?? {};
    return effectParts(sight.world, { ...effect, end: { ...end, turn: shownTurn(sight, copies, end.turn) } });
}

/** A foe's counter as the player may hear it (D-238, D-314): unhurt, hurt, bloodied at half or less, down at none. */
function healthWord(value: number, most: number | undefined): string
{
    if (value <= 0) {
        return "down";
    }

    if (most === undefined || value >= most) {
        return "unhurt";
    }

    return value * 2 <= most ? "bloodied" : "hurt";
}

/** The limit a threshold of the system gives a counter, as death-failures 3. */
function limitOf(thresholds: { field: string; value?: number; }[], field: string): { limit?: number; }
{
    const limit = thresholds.find((threshold) => comparableText(threshold.field) === comparableText(field))?.value;
    return limit === undefined ? {} : { limit };
}

/** Someone the character knows, with their picture and their role. */
function person(sight: PlaceSight, page: Page): ShownPerson
{
    const role = page === sight.knowledge.pc ? "pc" : sight.party.includes(page) ? "companion" : "other";
    const image = picture(sight, page);
    return { name: page.name, role, ...(image === undefined ? {} : { image }) };
}

/** A page's picture, its own or from a base the character knows (D-267, D-277). */
function picture(sight: PlaceSight, page: Page): { file: string; version: number; } | undefined
{
    return shownImage(sight.root, sight.context, sight.world, page, (base) => knowsPage(sight.knowledge, base));
}

/** The page the character knows by a link or a name, of the campaign or of the system. */
function knownPage(sight: PlaceSight, name: string | undefined): Page | undefined
{
    if (name === undefined) {
        return undefined;
    }

    const page = pagesWithName(sight.world, parsePageReference(name).name)[0];
    return page !== undefined && knowsPage(sight.knowledge, page) ? page : undefined;
}

/** Whose turn it is, as the character knows them: a character it knows by name, a copy by its own name when it knows the creature, else creature and its number. */
function shownTurn(sight: PlaceSight, copies: Record<string, { creature: string; }>, name: string): string
{
    const copy = Object.entries(copies).find(([copyName]) => comparableText(copyName) === comparableText(name));

    if (copy === undefined) {
        return knownPage(sight, name)?.name ?? "someone";
    }

    return knownPage(sight, copy[1].creature) === undefined ? `creature ${/\d+$/.exec(copy[0])?.[0] ?? ""}`.trim() : copy[0];
}
