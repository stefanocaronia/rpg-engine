// Roads in play (D-256, D-260, D-262): the roads of the world as stretches, the stop a journey starts or ends at, how fast one goes on each stretch, the quickest
// way, and the measures in the player's units.
import { readTextSetting, unitSystems } from "../campaign/index.ts";
import { formatLength, formatSpeed, type ImperialUnits, readSpeed, speedHelp, trueImperialUnits, type UnitSystem } from "../core/length.ts";
import type { Problem } from "../core/problem.ts";
import { comparableText, sameName } from "../core/text.ts";
import { quickestWay, type Speed, type Start, type Step, type Stretch, stretchesOf, type Way } from "../map/index.ts";
import { environmentAt, isEmptyField, isInParty, locate, type Page, pagesWithName, readStops, type World } from "../pages/index.ts";
import type { GameSystem, TravelKind } from "../systems/index.ts";
import { effectiveFields } from "./effect-layer.ts";
import { mapKey } from "./game-maps.ts";

/** The roads of the world (ROA-4): their stretches, in the order of the pages and of their stops; the page of each road by its name; the names of the stops. */
export interface Roads
{
    stretches: Stretch[];
    pages: Map<string, Page>;
    stops: Set<string>;
}

/** How the travellers go (TRV-1, TRV-2, TRV-6): at a pace, a speed of metres an hour with its name when the system gives it, and in a vehicle, when they are in one. */
export interface Going
{
    pace?: { name?: string; speed: number; };
    vehicle?: Page;
}

/** How the story measures (D-262): the campaign's units, and what the game's mile and foot are worth. */
export interface Measures
{
    units: UnitSystem;
    imperial: ImperialUnits;
}

/** The roads of the world (ROA-1, ROA-4): every place of the campaign with stops that read; a stretch counts only between two places of the campaign. */
export function roadsOf(world: World): Roads
{
    let roads = known.get(world);

    if (roads === undefined) {
        roads = readRoads(world);
        known.set(world, roads);
    }

    return roads;
}

const known = new WeakMap<World, Roads>();

/**
 * Who travels when no one is named (TRV-6): the living members of the party who are in the same place as the player character, the character first; in no place,
 * those in the same vehicle, or else those of the journey that stopped in the open, on foot or in its vehicles, never one who was simply never put anywhere.
 */
export function travellingParty(world: World, character: Page | undefined, journeyMovers: string[]): Page[]
{
    if (character === undefined) {
        return [];
    }

    const place = placeOf(world, character);
    const outerOf = (page: Page): Page => locate(world, page).chain.at(-1) ?? page;
    const moving = (page: Page): boolean => journeyMovers.some((name) => comparableText(name) === comparableText(page.name));
    const outer = outerOf(character);

    const together = (page: Page): boolean => {
        if (place !== undefined) {
            return placeOf(world, page) === place;
        }

        // In the open, a mixed party is the walkers and the vehicles of its journey (playtest 05).
        return outerOf(page) === outer || moving(outerOf(page));
    };

    return [character, ...world.pages.filter((page) => page !== character && isInParty(page) && together(page))];
}

/**
 * What moves for the travellers (TRV-6): the vehicle they are all in, the outermost item that holds them below a place, or themselves. When only some are in a
 * vehicle, or in different ones, each vehicle goes with those on foot, at their pace. Refused when they are in different places, or beside a boat that goes only by water.
 */
export function moversOf(world: World, system: GameSystem | undefined, travellers: Page[]): { movers: Page[]; vehicle?: Page; }
{
    const places = new Set(travellers.map((page) => placeOf(world, page)));
    // Who rides in what another traveller carries, as a cat in a pack, goes with them.
    const going = travellers.filter((page) => !locate(world, page).chain.some((holder) => travellers.includes(holder)));
    const vehicles = going.map((page) => vehicleOf(world, system, page));

    if (places.size > 1) {
        throw new Error(`${travellers.map((page) => page.name).join(", ")} are not in the same place: a journey starts from one place. Move them together first, or travel with each apart. Nothing changed.`);
    }

    const vehicle = vehicles[0];

    if (vehicle !== undefined && vehicles.every((other) => other === vehicle)) {
        return { movers: [vehicle], vehicle };
    }

    // A cart with the old man aboard and the others walking beside it: all go together, at the pace of who walks (playtest 05).
    const movers = going.map((page, index) => vehicles[index] ?? page);
    const afloat = vehicles.find((other) => other !== undefined && isVehicleOnly(world, system, other));

    if (afloat !== undefined) {
        const aboard = going.filter((_, index) => vehicles[index] === afloat).map((page) => page.name);
        throw new Error(`${aboard.join(", ")} ${aboard.length === 1 ? "is" : "are"} in ${afloat.name}, which goes only on the kinds of road made for it, and the others are not: move them all into it, or all out of it. Nothing changed.`);
    }

    return { movers: movers.filter((page, index) => movers.indexOf(page) === index) };
}

/**
 * The vehicle a page is in (TRV-6): the outermost of the items that hold it, when what holds that is a place or nothing; none in what a character carries.
 * Refused when that item is no vehicle of the game, as a barrel with a thief in it.
 */
function vehicleOf(world: World, system: GameSystem | undefined, page: Page): Page | undefined
{
    const chain = locate(world, page).chain;
    const items = chain.findIndex((holder) => holder.type !== "item");
    const inner = items === -1 ? chain : chain.slice(0, items);
    const above = chain[inner.length];
    const outer = inner.at(-1);

    if (outer === undefined || (above !== undefined && above.type !== "place")) {
        return undefined;
    }

    if (!isVehicle(world, system, outer)) {
        const declared = system?.travel?.vehicles[0];
        const remedy = declared === undefined ? "declare what is a vehicle with travel.vehicles in campaign.yaml" : `give ${outer.name} ${declared.field} ${declared.value}, or derive it from an item that has it`;
        throw new Error(`${page.name} is in ${outer.name}, which is no vehicle of this game: move them out, leave them out of who, or ${remedy}. Nothing changed.`);
    }

    return outer;
}

/** The stop a journey starts from or ends at (ROA-5): the nearest page of the chain of `page`, itself first, that is a stop of a road. */
export function stopOf(world: World, roads: Roads, page: Page): Page | undefined
{
    return [page, ...locate(world, page).chain].find((holder) => roads.stops.has(holder.name));
}

/** The outer of two places that are one spot for a journey (ROA-5): the same, or one inside the other; undefined when they are not. */
export function sameSpot(world: World, first: Page, second: Page): Page | undefined
{
    return first === second || locate(world, first).chain.includes(second) ? second : locate(world, second).chain.includes(first) ? first : undefined;
}

/**
 * Why a page is on a road, when no journey says where along it (TRV-9): the road holds it, as after a move by hand; undefined when its place is no road.
 * Its stops are what to give as where it starts.
 */
export function unknownOnRoad(world: World, roads: Roads, page: Page): string | undefined
{
    const place = placeOf(world, page);
    const road = place === undefined ? undefined : roads.pages.get(place.name);

    if (road === undefined) {
        return undefined;
    }

    const stops = [...new Set(roads.stretches.filter((stretch) => stretch.road === road.name).flatMap((stretch) => [stretch.from, stretch.to]))];
    return `${page.name} is on ${road.name}, but no journey says where along it: give from, the stop they last passed or the nearest one (${stops.join(", ")}).`;
}

/** The kind of a road (ROA-2), as its `kind` names it, road when it has none; and what the system says of it, nothing for a kind it does not know. */
export function kindOf(system: GameSystem | undefined, road: Page): { name: string; kind?: TravelKind; }
{
    const name = typeof road.fields.kind === "string" && !isEmptyField(road.fields.kind) ? road.fields.kind.trim() : "road";
    return { name, kind: system?.travel?.kinds.find((kind) => comparableText(kind.name) === comparableText(name)) };
}

/**
 * How many metres a minute one goes along each stretch (TRV-2, TRV-3): in a vehicle on a kind it travels, at its speed, with the current going downstream; at the
 * pace on the others, with the road's terrain, but not in a vehicle that only travels other kinds. Undefined where one cannot go.
 */
export function speedOf(world: World, system: GameSystem | undefined, roads: Roads, going: Going): Speed
{
    const vehicleOnly = going.vehicle !== undefined && isVehicleOnly(world, system, going.vehicle);

    return (stretch, forward) => {
        const road = roads.pages.get(stretch.road);

        if (road === undefined) {
            return undefined;
        }

        const { kind } = kindOf(system, road);

        if (kind?.vehicle !== undefined) {
            const speed = going.vehicle === undefined || !carries(world, going.vehicle, kind) ? undefined : vehicleSpeed(world, going.vehicle, kind);
            const current = forward ? (readSpeed(road.fields.current) ?? kind.current ?? 0) : 0;
            return speed === undefined ? undefined : (speed + current) / 60;
        }

        return vehicleOnly || going.pace === undefined ? undefined : (going.pace.speed * terrainFactor(world, system, road)) / 60;
    };
}

/** The quickest way from a start to a stop for those who go so (TRV-4). */
export function wayFor(world: World, system: GameSystem | undefined, roads: Roads, start: Start, goal: Page, going: Going): Way | undefined
{
    return quickestWay(roads.stretches, start, goal.name, speedOf(world, system, roads, going));
}

/**
 * Why no way leads to the goal for those who go so (TRV-4): the kinds of road a way would need, when one exists for another way of going, such as by river in a
 * vehicle; else that no road joins them.
 */
export function noWayText(world: World, system: GameSystem | undefined, roads: Roads, start: Start, goal: Page, going: Going): string
{
    const any = quickestWay(roads.stretches, start, goal.name, () => 1);

    if (any === undefined) {
        return `No road leads to ${goal.name} from there: write one, a place with stops, such as write "Strada del passo", type place, set stops=[[A]], 8 km, [[${goal.name}]].`;
    }

    const usable = speedOf(world, system, roads, going);
    const needed = [...new Set(any.steps.filter((step) => usable(step.stretch, step.forward) === undefined).map((step) => kindText(world, system, roads.pages.get(step.stretch.road))))];
    const how = going.vehicle === undefined ? "on foot" : `in ${going.vehicle.name}`;
    return `No way leads to ${goal.name} ${how}: the roads that join them include ${needed.join(", ")}.`;
}

/** The pace or speed those who go use (TRV-1): one of the system's paces by name, or a speed; without either, the system's own. Refused when it is neither, or when there is none. */
export function paceOf(system: GameSystem | undefined, written: string | undefined, vehicle: Page | undefined): Going["pace"]
{
    const paces = system?.travel?.paces ?? {};

    if (written !== undefined && written.trim() !== "") {
        const name = sameName(Object.keys(paces), written.trim());
        const speed = name === undefined ? readSpeed(written) : paces[name];

        if (speed === undefined) {
            const known = Object.keys(paces).length === 0 ? "" : `one of the paces of the game (${Object.keys(paces).join(", ")}) or `;
            throw new Error(`"${written}" is not a pace: give ${known}${speedHelp}.`);
        }

        return { name, speed };
    }

    const own = system?.travel?.pace;

    if (own !== undefined && paces[own] !== undefined) {
        return { name: own, speed: paces[own] };
    }

    if (vehicle === undefined) {
        throw new Error(`The game system gives no pace for travel: give pace as ${speedHelp}.`);
    }

    return undefined;
}

/** The hours one travels in a day (TRV-8): those given, else those of the kind of the first stretch in a vehicle, else the system's, else 8. */
export function dayHours(system: GameSystem | undefined, roads: Roads, way: Way, going: Going, given: number | undefined): number
{
    const first = way.steps[0] === undefined ? undefined : roads.pages.get(way.steps[0].stretch.road);
    const kind = going.vehicle === undefined || first === undefined ? undefined : kindOf(system, first).kind;
    return given ?? kind?.hours ?? system?.travel?.hours ?? 8;
}

/** The measures of the story (D-262): the campaign's units, metric when it has none, with the system's mile and foot, else the true ones. */
export function measuresOf(root: string, system: GameSystem | undefined): Measures
{
    const written = readTextSetting(root, "units");
    const units = unitSystems.find((name) => written !== undefined && comparableText(name) === comparableText(written)) ?? "metric";
    return { units, imperial: system?.imperial ?? trueImperialUnits };
}

export function lengthText(metres: number, measures: Measures): string
{
    return formatLength(metres, measures.units, measures.imperial);
}

/** "at a normal pace (3 miles an hour)", "at 4.5 km an hour", "in Chiatta, at its speed": how they go, for outputs. */
export function goingText(world: World, system: GameSystem | undefined, going: Going, measures: Measures): string
{
    if (going.vehicle !== undefined && (going.pace === undefined || isVehicleOnly(world, system, going.vehicle))) {
        return `in ${going.vehicle.name}, at its speed`;
    }

    const speed = going.pace === undefined ? "" : formatSpeed(going.pace.speed, measures.units, measures.imperial);
    const pace = going.pace?.name === undefined ? `at ${speed}` : `at a ${going.pace.name} pace (${speed})`;
    return going.vehicle === undefined ? pace : `in ${going.vehicle.name}, ${pace}`;
}

/** The stop a step ends at. */
export function stepEnd(step: Step): string
{
    return step.forward ? step.stretch.to : step.stretch.from;
}

/** "Guadoscuro → Bivio → Rocca, 36 km by Strada vecchia (12 km) and Sentiero dei colli (24 km)": a way from where it starts, with its roads in order. */
export function wayText(way: Way, from: string, measures: Measures): string
{
    const legs: { road: string; length: number; }[] = [];

    for (const step of way.steps) {
        const last = legs.at(-1);

        if (last?.road === step.stretch.road) {
            last.length += step.length;
        } else {
            legs.push({ road: step.stretch.road, length: step.length });
        }
    }

    const roads = legs.map((leg) => (legs.length === 1 ? leg.road : `${leg.road} (${lengthText(leg.length, measures)})`));
    const by = roads.length === 1 ? roads[0] : `${roads.slice(0, -1).join(", ")} and ${roads.at(-1)}`;
    return `${[from, ...way.steps.map(stepEnd)].join(" → ")}, ${lengthText(way.length, measures)} by ${by}`;
}

/** "7h 30m of travel", and when it takes more than a day's hours, "2 days at 8 h a day". */
export function durationText(minutes: number, hours: number): string
{
    const days = Math.ceil(minutes / (hours * 60) - 1e-9);
    return `${hoursText(Math.round(minutes))} of travel${days > 1 ? `, ${days} days at ${hours} h a day` : ""}`;
}

/** A time in hours and minutes, never days, as travel counts it: 24h 40m, 45m. */
export function hoursText(minutes: number): string
{
    const [hours, rest] = [Math.floor(minutes / 60), minutes % 60];
    return [hours > 0 ? `${hours}h` : "", rest > 0 || hours === 0 ? `${rest}m` : ""].filter((part) => part !== "").join(" ");
}

/** A road whose kind the system does not know (ROA-2, ROA-7): it is travelled as a road, which may not be what the campaign meant. Nothing without travel in the system. */
export function roadProblems(world: World, system: GameSystem | undefined): Problem[]
{
    const kinds = system?.travel?.kinds ?? [];

    if (kinds.length === 0) {
        return [];
    }

    return [...roadsOf(world).pages.values()].flatMap((road) => {
        const { name, kind } = kindOf(system, road);
        // A road and a passage between maps are the engine's own kinds (ROA-2, ROA-8).
        return kind !== undefined || name === "road" || name === "portal"
            ? []
            : [{
                path: road.path,
                message: `${road.name} has kind ${name}, which the game system does not know: it is travelled as a road.`,
                fix: `write ${road.name}, set kind to one of ${kinds.map((known) => known.name).join(", ")}, or add the kind to the campaign with config travel`,
            }];
    });
}

/** The roads between places of different maps that are not passages (ROA-8): a road stays on one map, a passage joins two. */
export function passageProblems(world: World, system: GameSystem | undefined): Problem[]
{
    return [...roadsOf(world).pages.values()].flatMap((road) => {
        const stops = roadsOf(world).stretches.filter((stretch) => stretch.road === road.name).flatMap((stretch) => [stretch.from, stretch.to]);
        const maps = new Set(stops.map((name) => pagesWithName(world, name)[0]).filter((page) => page !== undefined).map((page) => mapKey(world, page)));
        return maps.size < 2 || kindOf(system, road).name === "portal"
            ? []
            : [{ path: road.path, message: `${road.name} joins places of different maps, as only a passage does.`, fix: `write ${road.name}, set kind=portal, if it is one; else move its stops onto one map` }];
    });
}

/** The nearest place of a page's chain, itself first. */
function placeOf(world: World, page: Page): Page | undefined
{
    return [page, ...locate(world, page).chain].find((holder) => holder.type === "place");
}

function readRoads(world: World): Roads
{
    const stretches: Stretch[] = [];
    const pages = new Map<string, Page>();
    const stops = new Set<string>();

    const placeNamed = (name: string): Page | undefined => {
        const found = pagesWithName(world, name);
        return found.length === 1 && found[0].type === "place" && found[0].system === undefined ? found[0] : undefined;
    };

    for (const road of world.pages.filter((page) => page.type === "place" && page.system === undefined && !isEmptyField(page.fields.stops))) {
        const read = readStops(road.fields.stops);

        if ("problem" in read) {
            continue;
        }

        const names = read.stops.map((name) => placeNamed(name)?.name ?? "");
        const own = stretchesOf(road.name, names, read.lengths).filter((stretch) => stretch.from !== "" && stretch.to !== "");
        pages.set(road.name, road);
        stretches.push(...own);
        own.forEach((stretch) => stops.add(stretch.from).add(stretch.to));
    }

    return { stretches, pages, stops };
}

/** Whether a vehicle travels only the kinds of road that are travelled in it, as a boat (TRV-2): some kind names it; a cart, which none names, goes at the pace. */
export function isVehicleOnly(world: World, system: GameSystem | undefined, vehicle: Page): boolean
{
    return (system?.travel?.kinds ?? []).some((kind) => carries(world, vehicle, kind));
}

/** Whether an item is a vehicle of the game (TRV-6): it has a field at a value travel.vehicles declares, or is what a kind of road is travelled in. */
function isVehicle(world: World, system: GameSystem | undefined, item: Page): boolean
{
    return (system?.travel?.vehicles ?? []).some((match) => hasValue(world, item, match)) || isVehicleOnly(world, system, item);
}

/** Whether a vehicle is one a kind of road is travelled in (TRV-2): it has the field with the value the system names. */
function carries(world: World, vehicle: Page | undefined, kind: TravelKind): boolean
{
    return vehicle !== undefined && kind.vehicle !== undefined && hasValue(world, vehicle, kind.vehicle);
}

/** Whether a page has a field at a value, as its own or as what it derives from has it. */
function hasValue(world: World, page: Page, match: { field: string; value: string; }): boolean
{
    const fields = effectiveFields(world, page);
    const field = sameName(Object.keys(fields), match.field);
    const value = field === undefined ? undefined : fields[field];
    return typeof value === "string" && comparableText(value) === comparableText(match.value);
}

function vehicleSpeed(world: World, vehicle: Page, kind: TravelKind): number | undefined
{
    const fields = effectiveFields(world, vehicle);
    const field = kind.vehicle === undefined ? undefined : sameName(Object.keys(fields), kind.vehicle.speed);
    return field === undefined ? undefined : readSpeed(fields[field]);
}

/** What the terrain of a road or a region does to a pace (TRV-3, TRV-12): the factor the system gives the value of the terrain entry of its environment, 1 for any other. */
export function terrainFactor(world: World, system: GameSystem | undefined, road: Page): number
{
    const terrain = environmentAt(world, road).find(({ entry }) => comparableText(entry.name) === "terrain")?.entry.value;
    const factors = system?.travel?.terrain ?? {};
    const value = terrain === undefined ? undefined : sameName(Object.keys(factors), terrain);
    return value === undefined ? 1 : factors[value];
}

/** "Fiume Nero, a river travelled in a waterborne vehicle, such as one that derives from [[Keelboat]]": a road and what it needs. */
function kindText(world: World, system: GameSystem | undefined, road: Page | undefined): string
{
    if (road === undefined) {
        return "a road";
    }

    const { name, kind } = kindOf(system, road);

    if (kind?.vehicle === undefined) {
        return `${road.name}, a ${name}`;
    }

    // A vehicle of the system to derive from, which has the field and a speed: writing the field alone left the master stuck (playtest 14).
    const needed = kind.vehicle;
    const model = (world.system?.pages ?? []).find((page) => carries(world, page, kind));
    const like = model === undefined ? `, with ${needed.speed} too` : `, such as an item that derives from [[${model.name}]], which brings it with its ${needed.speed}`;
    return `${road.name}, a ${name} travelled only in a vehicle with ${needed.field} ${needed.value}${like}`;
}
