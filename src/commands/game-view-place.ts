// Where the player character is and the open scene, as data for the dashboard (VIEW-6, D-310): what the player may see of them, as the character knows them.
import type { Context } from "../core/context.ts";
import { formatStep } from "../core/length.ts";
import { comparableText } from "../core/text.ts";
import { readCounter } from "../counters/index.ts";
import type { Effect } from "../effects/index.ts";
import { type Grid, reachable, type Square, squareName, squaresApart, withoutMapBlock } from "../grid/index.ts";
import { environmentAt, formatEnvironmentEntry, locate, type Page, pagesWithName, parsePageReference, placesAround, type World } from "../pages/index.ts";
import type { Scene } from "../scene/index.ts";
import type { GameSystem, GridRules } from "../systems/index.ts";
import { effectsOf } from "./effect-layer.ts";
import { effectParts, effectText, keptEffects } from "./game-effects.ts";
import { isTurnOf, movedThisTurn, sideOf, walkingSpeed } from "./game-grid-moves.ts";
import { placeGrid, placeLook, type Standing, standing } from "./game-grids.ts";
import { shownImage } from "./game-images.ts";
import { type Knowledge, knownText, knowsPage } from "./game-knowledge.ts";
import { type Measures, measuresOf } from "./game-roads.ts";
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
    /** Who stands where: the side of what they fill, when more than a square, and how far from the player character, in the player's units (GRD-4, D-328). */
    at: (ShownPerson & { square: string; side?: number; distance?: string; })[];
    /** On the player character's turn in a fight, the squares it can still reach with what is left of its speed (D-328). */
    reach?: string[];
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
    const system = campaignSystem(sight.root, sight.context);
    const measures = measuresOf(sight.root, system);
    const standings = standing(sight.world, place, here);
    const self = standings.find((one): one is Standing & { square: Square; } => one.page === sight.party[0] && one.square !== undefined);
    const at = standings.flatMap((one): ShownGrid["at"] => {
        const square = one.square === undefined ? undefined : squareName(one.square);

        if (square === undefined) {
            return [];
        }

        const measured = { square, ...(system?.grid === undefined ? {} : measuredFrom(sight, system.grid, measures, here, self, one)) };

        if (one.copy !== undefined && here !== undefined) {
            const creature = knownPage(sight, here.copies[one.copy]?.creature);
            const image = creature === undefined ? undefined : picture(sight, creature);
            return [
                creature === undefined
                    ? { name: strangerName(here, one.copy), role: "other", stranger: true, ...measured }
                    : { name: one.copy, role: "other", ...(image === undefined ? {} : { image }), ...measured },
            ];
        }

        const page = one.page;

        if (page === undefined || page.type !== "character" || page.fields.status === "dead") {
            return [];
        }

        if (sight.party.includes(page) || knowsPage(sight.knowledge, page)) {
            return [{ ...person(sight, page), ...measured }];
        }

        return inScene.has(comparableText(page.name)) ? [{ name: "someone", role: "other", stranger: true, ...measured }] : [];
    });
    const reach = system?.grid === undefined || here === undefined || self === undefined || !isTurnOf(here, self.name) ? [] : reachOf(sight, system.grid, measures, here, self, { ...grid, lines });
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
        exits: grid.exits.filter((exit) => !hidden.has(grid.lines[exit.square.row]?.[exit.square.column] ?? "")).map(
            (exit) => {
                const to = knownPage(sight, exit.to);
                return { square: squareName(exit.square), ...(to === undefined ? {} : { to: to.name }) };
            },
        ),
        at,
        ...(reach.length === 0 ? {} : { reach }),
    };
}

/** How big one on the map is, when more than a square, and how far from the player character, in the player's units (GRD-4, D-328). */
function measuredFrom(sight: PlaceSight, rules: GridRules, measures: Measures, scene: Scene | undefined, self: Standing & { square: Square; } | undefined, one: Standing): { side?: number; distance?: string; }
{
    const side = sideOf(sight.world, rules, scene, one);
    const apart = self === undefined || one === self || one.square === undefined
        ? undefined
        : squaresApart({ square: self.square, side: sideOf(sight.world, rules, scene, self) }, { square: one.square, side }, rules);
    // On the player character's own square no distance: the page says they are next to it.
    return { ...(side > 1 ? { side } : {}), ...(apart === undefined || apart === 0 ? {} : { distance: formatStep(apart * rules.square, measures.units, measures.imperial) }) };
}

/**
 * The squares the player character can still reach on its turn in a fight (D-328), with what is left of its speed, on the map as the player sees it: what is
 * hidden counts as what lies under it, so that the way round a trap never gives it away (GRD-6).
 */
function reachOf(sight: PlaceSight, rules: GridRules, measures: Measures, scene: Scene, self: Standing & { square: Square; }, grid: Grid): string[]
{
    const speed = walkingSpeed(sight.world, rules, measures, scene, self).metres;
    const left = speed === undefined ? 0 : speed / rules.square - movedThisTurn(scene);
    return left <= 0 ? [] : reachable(grid, self.square, left + 1e-9, rules).filter((one) => one.cost > 0).map((one) => squareName(one.square));
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
        // A kind the character does not know by the letter its copies have in the scene, as creature B, with more kinds (D-331).
        const first = Object.keys(scene.copies).find((copy) => scene.copies[copy].creature === creature);
        const name = first === undefined ? "creature" : strangerName(scene, first).replace(/\s*\d+$/, "");
        return page === undefined ? { name, role: "other" as const, stranger: true as const, count } : { ...person(sight, page), count };
    });
    const turnName = (name: string): string => shownTurn(sight, scene, name);
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
function fighterOf(sight: PlaceSight, scene: Pick<Scene, "copies" | "gone">, name: string): Fighter | undefined
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
    const shown = !stranger ? page.name : copy === undefined ? "someone" : strangerName(scene, copy[0]);
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

    const scene = readOpenScene(sight.root).scene ?? { copies: {} };
    return effectParts(sight.world, { ...effect, end: { ...end, turn: shownTurn(sight, scene, end.turn) } });
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
function shownTurn(sight: PlaceSight, scene: Pick<Scene, "copies" | "gone">, name: string): string
{
    const copy = Object.entries(scene.copies).find(([copyName]) => comparableText(copyName) === comparableText(name));

    if (copy === undefined) {
        return knownPage(sight, name)?.name ?? "someone";
    }

    return knownPage(sight, copy[1].creature) === undefined ? strangerName(scene, copy[0]) : copy[0];
}

/**
 * The name the player hears for a copy of a creature its character does not know (D-325, D-331): creature 1; with more kinds of creature in the scene, a letter
 * for each kind, in the order of their names and counting those that left, so that it never changes: creature A1, creature B1.
 */
function strangerName(scene: Pick<Scene, "copies" | "gone">, copy: string): string
{
    const all = { ...scene.gone, ...scene.copies };
    const kindOf = (name: string): string | undefined => (all[name] === undefined ? undefined : comparableText(parsePageReference(all[name].creature).name));
    const kinds = [...new Set(Object.keys(all).map(kindOf).filter((kind) => kind !== undefined))].sort();
    const kind = kindOf(copy);
    const letter = kinds.length > 1 && kind !== undefined ? String.fromCharCode(65 + kinds.indexOf(kind)) : "";
    return `creature ${letter}${/\d+$/.exec(copy)?.[0] ?? ""}`.trim();
}
