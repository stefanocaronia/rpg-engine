// Where the player character is and the open scene, as data for the dashboard (VIEW-6, D-310): what the player may see of them, as the character knows them.
import type { Context } from "../core/context.ts";
import { formatStep } from "../core/length.ts";
import { files } from "../core/store.ts";
import { comparableText } from "../core/text.ts";
import { readCounter } from "../counters/index.ts";
import type { Effect, EffectEnd } from "../effects/index.ts";
import { type Grid, reachable, type Square, squareName, squaresApart, withoutMapBlock } from "../grid/index.ts";
import { hiddenImageName } from "../images/index.ts";
import { environmentAt, isPlayerCharacter, locate, type Page, pagesWithName, pagesWithNameOrAlias, parsePageReference, placesAround, type World } from "../pages/index.ts";
import type { Scene } from "../scene/index.ts";
import type { GameSystem, GridRules } from "../systems/index.ts";
import { effectsOf } from "./effect-layer.ts";
import { conditionMark, effectParts, keptEffects, type SeenEffect } from "./game-effects.ts";
import { isTurnOf, movedThisTurn, sideOf, walkingSpeed } from "./game-grid-moves.ts";
import { placeGrid, placeLook, type Standing, standing } from "./game-grids.ts";
import { imageFile, ownImage, shownImage } from "./game-images.ts";
import { type Knowledge, knownText, knowsPage } from "./game-knowledge.ts";
import { type Measures, measuresOf } from "./game-roads.ts";
import { copyPage, readOpenScene } from "./game-scene.ts";
import { turnMarks } from "./game-turn-uses.ts";
import { campaignSystem } from "./game-world.ts";
import { pageCounters } from "./page-counters.ts";
import { tokenIcon } from "./sheet.ts";

/** Someone at the place or in the scene as the player sees them: a name, or someone; their role and picture; for copies of a creature, how many. */
export interface ShownPerson
{
    name: string;
    role: "pc" | "companion" | "other";
    image?: { file: string; version: number; };
    /** The icon on the token of one of the party, as their class (D-414). */
    icon?: string;
    /** In a fight, marked by the master as attacking the party (D-415). */
    hostile?: true;
    /** Someone the character does not know, shown without a name. */
    stranger?: true;
    /** How many copies of a creature, in the open scene. */
    count?: number;
    /** What is on them (D-419): the party's effects with their end, of others only the conditions anyone sees (D-314). */
    effects?: SeenEffect[];
    /** A condition keeps them from acting (D-314). */
    inactive?: true;
    /** At 0, as Combat tells it (D-314): one of the party at the system's dying point, another when a foe's counter in words says down. */
    down?: true;
    dead?: true;
}

/** Where the player character is, as it knows it (VIEW-6). */
export interface ShownPlace
{
    name: string;
    image?: { file: string; version: number; };
    /** The places that hold it, the outermost first, of those the character knows. */
    within: string[];
    /** What holds there, nearest first: the environment's entries, then the places' effects with their end; each with its place, when the character knows it. */
    around: ({ name: string; value: string; place?: string; } | { effect: string; end?: EffectEnd; place?: string; })[];
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
    /** The icon on the token of one of the party, as their class (D-414). */
    icon?: string;
    /** In a fight, marked by the master as attacking the party (D-415). */
    hostile?: true;
    stranger?: true;
    health?: string;
    /** How hard a foe heard in words is hit: low in the lower half of the system's words, down at the last. */
    wound?: "low" | "down";
    effects: SeenEffect[];
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
    /** Which side of the death saves it counts, by the system's names (D-461): the successes or the failures. */
    side?: "successes" | "failures";
    /** Of the successes, what the system calls one whose counter is full, as Stable. */
    full?: string;
    /** The short word of its marks, as Successes. */
    mark?: string;
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
    /** What who acts has used of the turn (TRN-4). */
    marks?: { use: string; used: boolean; }[];
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
    const placed = (holder: Page): { place?: string; } => (known(holder) === undefined ? {} : { place: holder.name });
    const around = [
        ...environmentAt(world, place).map(({ entry, place: holder }) => ({ name: entry.name, value: entry.value, ...placed(holder) })),
        ...placesAround(world, place).flatMap((holder) => effectsOf(holder).map((effect) => ({ effect: effect.name, ...(effect.end === undefined ? {} : { end: effect.end }), ...placed(holder) }))),
    ];
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
        // The party first, the player character in the foreground at its head (VIEW-12).
        here: [...partyFirst(sight).filter((page) => present.includes(page)), ...present.filter((page) => !sight.party.includes(page))].map((page) => ({
            ...person(sight, page),
            ...hostileMark(readOpenScene(sight.root).scene, page.name),
            ...stateOf(sight, page),
        })),
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
    const self = standings.find((one): one is Standing & { square: Square; } => one.page === sight.knowledge.pc && one.square !== undefined);
    const at = standings.flatMap((one): ShownGrid["at"] => {
        const square = one.square === undefined ? undefined : squareName(one.square);

        if (square === undefined) {
            return [];
        }

        const measured = { square, ...(system?.grid === undefined ? {} : measuredFrom(sight, system.grid, measures, here, self, one)) };

        if (one.copy !== undefined && here !== undefined) {
            const copy = here.copies[one.copy];
            const creature = knownPage(sight, copy?.creature);
            const image = creature === undefined ? strangerPicture(sight, copy?.creature) : picture(sight, creature);
            const state = copy === undefined ? {} : stateOf(sight, copyPage(one.copy, copy));
            return [
                creature === undefined
                    ? { name: strangerName(here, one.copy), role: "other", stranger: true, ...(image === undefined ? {} : { image }), ...hostileMark(here, one.copy), ...state, ...measured }
                    : { name: one.copy, role: "other", ...(image === undefined ? {} : { image }), ...hostileMark(here, one.copy), ...state, ...measured },
            ];
        }

        const page = one.page;

        if (page === undefined || page.type !== "character" || page.fields.status === "dead") {
            return [];
        }

        if (sight.party.includes(page) || knowsPage(sight.knowledge, page)) {
            return [{ ...person(sight, page), ...hostileMark(here, page.name), ...stateOf(sight, page), ...measured }];
        }

        const image = strangerPicture(sight, page.name);
        return inScene.has(comparableText(page.name))
            ? [{ name: seenName(here, page.name), role: "other", stranger: true, ...(image === undefined ? {} : { image }), ...hostileMark(here, page.name), ...strangerState(sight, here, page), ...measured }]
            : [];
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
        const name = parsePageReference(link).name;
        const page = knownPage(sight, link);
        const hostile = hostileMark(scene, name);
        const written = pagesWithName(sight.world, name)[0];
        const state = written === undefined ? {} : strangerState(sight, scene, written);
        const image = strangerPicture(sight, name);
        return page === undefined
            ? { name: seenName(scene, name), role: "other" as const, stranger: true as const, ...(image === undefined ? {} : { image }), ...hostile, ...state }
            : { ...person(sight, page), ...hostile, ...stateOf(sight, page) };
    });
    const creatures = [...new Set(Object.values(scene.copies).map((copy) => copy.creature))].map((creature) => {
        const count = Object.values(scene.copies).filter((copy) => copy.creature === creature).length;
        const page = knownPage(sight, creature);
        // A kind the character does not know by the letter its copies have in the scene, as creature B, with more kinds (D-331).
        const first = Object.keys(scene.copies).find((copy) => scene.copies[copy].creature === creature);
        const name = first === undefined ? "creature" : strangerName(scene, first).replace(/\s*\d+$/, "");
        // A kind is hostile when one of its copies is.
        const hostile = Object.keys(scene.copies).some((copy) => scene.copies[copy].creature === creature && hostileMark(scene, copy).hostile === true) ? { hostile: true as const } : {};
        // A kind of one copy shows its state; of more, each shows its own on the map and in Combat.
        const state = count === 1 && first !== undefined ? stateOf(sight, copyPage(first, scene.copies[first])) : {};
        const image = strangerPicture(sight, creature);
        return page === undefined
            ? { name, role: "other" as const, stranger: true as const, ...(image === undefined ? {} : { image }), count, ...hostile, ...state }
            : { ...person(sight, page), count, ...hostile, ...state };
    });
    const turnName = (name: string): string => shownTurn(sight, scene, name);
    // What who acts has used of the turn, as marks beside them, for the party alone: a foe's are the master's to tell (TRN-4, D-453).
    const acting = scene.turn;
    const ours = acting !== undefined && sight.party.some((page) => comparableText(page.name) === comparableText(acting));
    const marks = ours ? turnMarks(campaignSystem(sight.root, sight.context), scene, acting) : [];
    return {
        title: scene.title,
        type: scene.type,
        ...(scene.opened === undefined ? {} : { since: scene.opened }),
        ...(scene.now === undefined ? {} : { now: scene.now }),
        ...(place === undefined ? {} : { place: place.name }),
        who: [...characters, ...creatures],
        ...(scene.order === undefined ? {} : { order: scene.order.map(turnName) }),
        ...(scene.turn === undefined ? {} : { turn: turnName(scene.turn) }),
        // The round only where the game has rounds (D-314 (3)): Ironsworn has none.
        ...(scene.round === undefined || campaignSystem(sight.root, sight.context)?.roundSeconds === undefined ? {} : { round: scene.round }),
        ...(marks.length === 0 ? {} : { marks }),
        ...(scene.type === "combat" ? { fighters: fightersOf(sight, scene) } : {}),
    };
}

/**
 * Who is in the open scene, by the words the page gives them (D-416): a character by name when the character knows them, else by what it sees of them, else
 * someone; a copy by its name when it knows its creature, else by what it sees of its kind and its number, else creature 1. Without the one left out, as whose view
 * a character agent's is (VIEW-10).
 */
export function sceneNames(sight: PlaceSight, leftOut?: Page): string[]
{
    const { scene } = readOpenScene(sight.root);
    const characters = scene === undefined ? [] : scene.with.map((link) => parsePageReference(link).name).filter((name) => leftOut === undefined || pagesWithName(sight.world, name)[0] !== leftOut);
    const names = scene === undefined ? [] : [...characters, ...Object.keys(scene.copies)];
    return scene === undefined ? [] : names.map((name) => shownTurn(sight, scene, name));
}

/** Everyone in a fight, in the order of the turns when there is one, else the characters then the copies; those the view cannot name are left out. */
function fightersOf(sight: PlaceSight, scene: Scene): Fighter[]
{
    const names = scene.order ?? [...scene.with.map((link) => parsePageReference(link).name), ...Object.keys(scene.copies)];
    return names.flatMap((name) => {
        const fighter = fighterOf(sight, scene, name);
        return fighter === undefined ? [] : [fighter];
    });
}

/** One in the fight (D-314): a copy as the character knows its creature, a character as it knows them; the party in full, the others by what anyone sees. */
function fighterOf(sight: PlaceSight, scene: Pick<Scene, "type" | "copies" | "gone" | "hostile" | "seen">, name: string): Fighter | undefined
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
    const shown = !stranger ? page.name : copy === undefined ? seenName(scene, page.name) : strangerName(scene, copy[0]);
    const image = stranger ? strangerPicture(sight, copy === undefined ? page.name : copy[1].creature) : picture(sight, creature ?? page);
    const effects = shownEffects(sight, system, page, party);
    const health = healthOf(sight.world, system, page, party);
    const keeps = party ? keptEffects(sight.world, readOpenScene(sight.root).scene, page.name) : [];
    const dying = party ? dyingOf(sight.world, system, page) : undefined;
    const icon = party ? tokenIcon(sight.world, system, page) : undefined;
    return {
        name: shown,
        role: partyRole(sight, page),
        ...(image === undefined ? {} : { image }),
        ...(icon === undefined ? {} : { icon }),
        ...(stranger ? { stranger: true as const } : {}),
        ...hostileMark(scene, name),
        ...(health === undefined ? {} : { health: health.word }),
        ...(health?.wound === undefined ? {} : { wound: health.wound }),
        effects,
        ...(keepsFromActing(system, effects) ? { inactive: true as const } : {}),
        ...(keeps.length === 0 ? {} : { keeps }),
        ...(dying === undefined ? {} : { dying }),
    };
}

/**
 * The panel of the dying of someone of the party (D-310 (7), D-314): at the value of the counter the system names, as hp 0, the counters it shows, with their
 * limits, or below it in a game whose counter goes below; none above it, nor for the dead.
 */
export function dyingOf(world: World, system: GameSystem | undefined, page: Page): DyingCounter[] | undefined
{
    const counters = pageCounters(world, page);
    const dying = system?.dying;
    const value = readCounter(counters[dying?.field ?? ""])?.value;

    if (dying === undefined || page.fields.status === "dead" || value === undefined || value > dying.value) {
        return undefined;
    }

    // Each counter by its side, as the system names them (D-461).
    return (["successes", "failures"] as const).flatMap((side) => {
        const field = dying.show[side];
        const full = side === "successes" && dying.stable !== undefined ? { full: dying.stable } : {};
        const mark = dying.marks[side] === undefined ? {} : { mark: dying.marks[side] };
        return field === undefined ? [] : [{ field, value: readCounter(counters[field] ?? page.fields[field])?.value ?? 0, ...limitOf(system?.thresholds ?? [], field), side, ...full, ...mark }];
    });
}

/** An effect on someone of the party as the player sees it: an end at someone's turn names them as the character knows them (VIEW-4), as creature 2. */
export function seenEffect(sight: PlaceSight, effect: Effect): SeenEffect
{
    const end = effect.end;
    const system = campaignSystem(sight.root, sight.context);

    if (end === undefined || !("turn" in end)) {
        return effectParts(sight.world, system, effect);
    }

    const scene = readOpenScene(sight.root).scene ?? { copies: {} };
    return effectParts(sight.world, system, { ...effect, end: { ...end, turn: shownTurn(sight, scene, end.turn) } });
}

/**
 * The state a token shows (D-419): what is on them, whether a condition keeps them from acting, whether they are at 0 as Combat tells it, or dead; the party in
 * full, the others by what anyone sees (D-314).
 */
function stateOf(sight: PlaceSight, page: Page): Pick<ShownPerson, "effects" | "inactive" | "down" | "dead">
{
    const system = campaignSystem(sight.root, sight.context);
    const party = sight.party.includes(page);
    const effects = shownEffects(sight, system, page, party);
    const dead = page.fields.status === "dead";
    const down = !dead && (party ? dyingOf(sight.world, system, page) !== undefined : healthOf(sight.world, system, page, false)?.wound === "down");
    return {
        ...(effects.length === 0 ? {} : { effects }),
        ...(keepsFromActing(system, effects) ? { inactive: true as const } : {}),
        ...(down ? { down: true as const } : {}),
        ...(dead ? { dead: true as const } : {}),
    };
}

/** The state of a character in the scene the character does not know (D-419): as anyone sees it when the master said what it sees of them, none for someone. */
function strangerState(sight: PlaceSight, scene: Pick<Scene, "seen"> | undefined, page: Page): Pick<ShownPerson, "effects" | "inactive" | "down" | "dead">
{
    return scene === undefined || seenOf(scene, page.name) === undefined ? {} : stateOf(sight, page);
}

/** What is on someone as the player sees it (D-314, D-419): the party's effects as their line gives them, with their end; of the others only the conditions anyone sees. */
function shownEffects(sight: PlaceSight, system: GameSystem | undefined, page: Page, party: boolean): SeenEffect[]
{
    return effectsOf(page).flatMap((effect) => {
        const mark = conditionMark(system, effect.name);
        return party ? [seenEffect(sight, effect)] : mark.condition === true ? [{ name: effect.name, text: effect.name, ...mark }] : [];
    });
}

/** Whether one of these effects is a condition the system says keeps from acting (D-314). */
function keepsFromActing(system: GameSystem | undefined, effects: SeenEffect[]): boolean
{
    const inactive = new Set((system?.combat?.inactive ?? []).map(comparableText));
    return effects.some((effect) => inactive.has(comparableText(effect.name)));
}

/**
 * Someone's counter in a fight as the player may know it (D-238, D-314): a foe's in the system's words when it gives them, as the 5e's hit points; else as it
 * is, as Ironsworn's progress track (D-314 (7)).
 */
function healthOf(world: World, system: GameSystem | undefined, page: Page, party: boolean): { word: string; wound?: "low" | "down"; } | undefined
{
    const track = system?.combat === undefined ? undefined : readCounter(pageCounters(world, page)[system.combat.track]);
    const words = party ? [] : system?.combat?.inWords ?? [];

    if (track === undefined) {
        return undefined;
    }

    if (words.length === 0) {
        return { word: `${track.value}${track.max === undefined ? "" : `/${track.max}`}` };
    }

    const index = healthIndex(words.length, track.value, track.max);
    const wound = index === words.length - 1 ? "down" : index > 0 && index >= words.length / 2 ? "low" : undefined;
    return { word: words[index], ...(wound === undefined ? {} : { wound }) };
}

/** Which of so many words a counter is heard in: the first full, the last at 0 or less, those between at equal shares of what is lost, as half or less the third of four. */
function healthIndex(count: number, value: number, most: number | undefined): number
{
    if (value <= 0) {
        return count - 1;
    }

    const between = count - 2;

    if (most === undefined || value >= most || between === 0) {
        return 0;
    }

    return 1 + Math.min(between - 1, Math.floor(((most - value) * between) / most));
}

/** The limit a threshold of the system gives a counter, as death-failures 3. */
function limitOf(thresholds: { field: string; value?: number; }[], field: string): { limit?: number; }
{
    const limit = thresholds.find((threshold) => comparableText(threshold.field) === comparableText(field))?.value;
    return limit === undefined ? {} : { limit };
}

/** The mark of one the master says attacks the party, in a fight (D-415); nothing for anyone else, or outside a fight. */
function hostileMark(scene: Pick<Scene, "type" | "hostile"> | undefined, name: string): { hostile?: true; }
{
    const hostile = scene?.type === "combat" && (scene.hostile ?? []).some((one) => comparableText(one) === comparableText(parsePageReference(name).name));
    return hostile ? { hostile: true } : {};
}

/** Someone's role as the view gives it: a player character or a companion of the party, or other. */
function partyRole(sight: PlaceSight, page: Page): "pc" | "companion" | "other"
{
    return !sight.party.includes(page) ? "other" : isPlayerCharacter(page) ? "pc" : "companion";
}

/** The party, the player character in the foreground first (VIEW-12). */
function partyFirst(sight: PlaceSight): Page[]
{
    return [...sight.party.filter((page) => page === sight.knowledge.pc), ...sight.party.filter((page) => page !== sight.knowledge.pc)];
}

/** Someone the character knows, with their picture and their role. */
function person(sight: PlaceSight, page: Page): ShownPerson
{
    const role = partyRole(sight, page);
    const image = picture(sight, page);
    // Only the party's: what the others are, the character may not know.
    const icon = role === "other" ? undefined : tokenIcon(sight.world, campaignSystem(sight.root, sight.context), page);
    return { name: page.name, role, ...(image === undefined ? {} : { image }), ...(icon === undefined ? {} : { icon }) };
}

/** A page's picture, its own or from a base the character knows (D-267, D-277). */
function picture(sight: PlaceSight, page: Page): { file: string; version: number; } | undefined
{
    return shownImage(sight.root, sight.context, sight.world, page, (base) => knowsPage(sight.knowledge, base));
}

/**
 * The picture of one the character does not know, by their name or a copy's creature (D-420): the page's own, of the campaign, made from what is seen; never
 * one from a page it derives from, nor a game system's, which would tell what it is.
 */
function strangerPicture(sight: PlaceSight, name: string | undefined): { file: string; version: number; } | undefined
{
    return strangerImage(sight.root, sight.context, sight.world, name);
}

/** The picture of one the character does not know, as strangerPicture gives it, for the scene and for the rolls (D-420, D-421). */
export function strangerImage(root: string, context: Context, world: World, name: string | undefined): { file: string; version: number; } | undefined
{
    // A roll keeps a renamed page by its old name, among its aliases (D-417).
    const page = name === undefined ? undefined : pagesWithNameOrAlias(world, parsePageReference(name).name)[0];
    const file = page === undefined || page.system !== undefined ? undefined : imageFile(root, context, ownImage(page));
    // By a name of its bytes: the file's own is the page's, which the character does not know.
    const hidden = file === undefined ? undefined : hiddenImageName(file);
    return file === undefined || hidden === undefined ? undefined : { file: hidden, version: Math.trunc(files().modified(file) ?? 0) };
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
function shownTurn(sight: PlaceSight, scene: Pick<Scene, "copies" | "gone" | "seen">, name: string): string
{
    const copy = Object.entries(scene.copies).find(([copyName]) => comparableText(copyName) === comparableText(name));

    if (copy === undefined) {
        return knownPage(sight, name)?.name ?? seenName(scene, name);
    }

    return knownPage(sight, copy[1].creature) === undefined ? strangerName(scene, copy[0]) : copy[0];
}

/**
 * The name the player hears for a copy of a creature its character does not know (D-325, D-331, D-416): what the master said the character sees of its kind and
 * its number, brigante 2; else creature 1, and with more kinds of creature in the scene a letter for each kind, in the order of their names and counting those
 * that left, so that it never changes: creature A1, creature B1.
 */
function strangerName(scene: Pick<Scene, "copies" | "gone" | "seen">, copy: string): string
{
    const all = { ...scene.gone, ...scene.copies };
    const kindOf = (name: string): string | undefined => (all[name] === undefined ? undefined : comparableText(parsePageReference(all[name].creature).name));
    const kinds = [...new Set(Object.keys(all).map(kindOf).filter((kind) => kind !== undefined))].sort();
    const kind = kindOf(copy);
    const number = /\d+$/.exec(copy)?.[0] ?? "";
    const seen = kind === undefined ? undefined : seenOf(scene, kind);

    if (seen !== undefined) {
        return `${seen} ${number}`.trim();
    }

    const letter = kinds.length > 1 && kind !== undefined ? String.fromCharCode(65 + kinds.indexOf(kind)) : "";
    return `creature ${letter}${number}`.trim();
}

/** What the character sees of a character it does not know by name, as the master said (D-416); someone when the master said nothing. */
function seenName(scene: Pick<Scene, "seen"> | undefined, name: string): string
{
    return (scene === undefined ? undefined : seenOf(scene, name)) ?? "someone";
}

/** What the master said the character sees of a character or a kind of creature, by its name. */
function seenOf(scene: Pick<Scene, "seen">, name: string): string | undefined
{
    return Object.entries(scene.seen ?? {}).find(([key]) => comparableText(key) === comparableText(parsePageReference(name).name))?.[1];
}
