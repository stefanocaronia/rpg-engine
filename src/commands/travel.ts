import { z } from "zod";
import { requireCampaign } from "../campaign/index.ts";
import type { Context } from "../core/context.ts";
import { readLength } from "../core/length.ts";
import { defineCommand } from "../core/registry.ts";
import { directionHelp, directionName, distanceBetween, pointAlong, pointFrom, readDirection, type Start } from "../map/index.ts";
import { environmentAt, locate, type Page, pageNamed, parsePageReference, playerCharacters, type Position, type World } from "../pages/index.ts";
import type { GameSystem } from "../systems/index.ts";
import { addDuration, formatGameDate, type GameDate, minutesBetween } from "../time/index.ts";
import { aroundLead, passedLines, passTime, type TimePassed } from "./game-advance.ts";
import { timePassedLines } from "./game-extensions.ts";
import { type Journey, journeyPoint, journeyStart, moversMap, moversNamed, moversPosition, type OnRoad, readJourney, ridersOf, sameMovers, saveJourney, travelledSinceRest } from "./game-journey.ts";
import { mapKey, mapOf } from "./game-maps.ts";
import { movePages } from "./game-moves.ts";
import { acrossHint, crossedRoads, openLegs } from "./game-open.ts";
import { nearPlaces, pointText, positionOf, regionAt } from "./game-positions.ts";
import {
    dayHours,
    durationText,
    type Going,
    goingText,
    hoursText,
    isVehicleOnly,
    kindOf,
    lengthText,
    type Measures,
    measuresOf,
    moversOf,
    noWayText,
    paceOf,
    partyLead,
    type Roads,
    roadsOf,
    sameSpot,
    speedOf,
    stepEnd,
    stopOf,
    travellingParty,
    unknownOnRoad,
    wayFor,
    wayText,
} from "./game-roads.ts";
import { readOpenScene } from "./game-scene.ts";
import { presentDate } from "./game-time.ts";
import { campaignSystem, campaignWorld, missingSystemHint } from "./game-world.ts";

// A list, or one text, as an MCP client may send it.
const textList = z.union([z.string(), z.array(z.string())]);

/** Where a stopped journey is: on a road, at a point in the open, or at a place. */
type Spot = { on: OnRoad; } | { at: Position; } | { place: string; };

/** A leg of a journey (TRV-7, TRV-12): where the movers go first, a road, a region or the open (null), how far and how fast, where they arrive after it, and where they are along it. */
interface Leg
{
    into?: Page | null;
    length: number;
    metresAMinute: number;
    then?: Page;
    /** The stop said as passed when they reach `then` before the end. */
    passes?: string;
    at(covered: number): Spot;
}

/** What a travel is about to do: its legs, how it is told, where it goes, the hours of its day, and for a journey off the roads where it starts. */
interface Plan
{
    legs: Leg[];
    goal: { to?: Page; heading?: string; across: boolean; };
    way: string;
    going: string;
    pace?: string;
    hours: number;
    from?: Position;
    /** Off the roads, the map it goes on (POS-8); undefined for the main one. */
    map?: Page;
    /** By road, the passages between maps on the way (ROA-8). */
    passages?: string[];
}

/** How a travel ended (TRV-7, TRV-12): at a place, at the end of a distance in the open, at an event, at the end of the day's travel, or before it began. */
type Ending =
    | { kind: "arrived"; chain: string[]; }
    | { kind: "reached"; }
    | { kind: "event" | "day"; where: string; left: string; }
    | { kind: "spent"; };

/** What travel did, as its output tells it (TRV-10, TRV-13). */
interface TravelResult
{
    who: string;
    goal: string;
    call: string;
    way: string;
    going: string;
    /** The stops passed on the way, with the date. */
    reached: string[];
    date: string;
    travelled: number;
    hours: number;
    /** What is left of the day's hours, in minutes. */
    hoursLeft: number;
    /** The rule that says what travelling beyond the day's hours does. */
    beyond?: string;
    ending: Ending;
    /** Off the roads, what is around where they stopped (TRV-13). */
    around: string[];
    time?: TimePassed;
    notes: string[];
}

export const travel = defineCommand({
    name: "travel",
    description: "Make a journey: whenever the party goes somewhere, use it instead of advance and move. "
        + "By road it takes the quickest way, in the vehicle the party is in if any; off the roads, across and toward go through the regions and their terrain. "
        + "It moves the travellers and lets the time pass, stopping on arrival, at an event that comes due and at the end of the day's travel; travel again goes on from there. "
        + "When others go with the party, name in who everyone who goes, the party too: companions, hirelings, mounts; a vehicle goes with those in it. "
        + "Example: to Rocca; or to Torre, across; or toward west, distance 12 km.",
    group: "game",
    positionals: ["to"],
    input: z.object({
        to: z.string().optional().describe("where to: a place; by road, or straight across country with across"),
        across: z.boolean().optional().describe("go to the place straight across country, off the roads; both need a position"),
        toward: z.string().optional().describe("off the roads, one way to go instead of a place: a point of the compass, such as west or NNE"),
        distance: z.string().optional().describe("with toward, how far, such as 12 km; if left out, until the day's travel ends"),
        who: textList.optional().describe("who travels; if left out, the party where the player character is, with the vehicle they are in; given, when the player characters are apart"),
        pace: z.string().optional().describe("one of the game's paces, such as fast or slow, or a speed, such as 4.5 km; if left out, the game's usual pace, or the one the journey had"),
        hours: z.union([z.number(), z.string()]).optional().describe(
            "the hours of travel today, when they differ from the game's: more for a forced march, 24 for a ship with its crew, 8 for a boat the party rows",
        ),
    }),

    async run(input, context): Promise<TravelResult>
    {
        const root = requireCampaign(context.folder);
        let world = campaignWorld(root, context);
        const system = campaignSystem(root, context);
        const now = presentDate(root);

        if (now === undefined) {
            throw new Error('The game has no date yet: set it with advance, such as to "day 1, 08:00". Nothing changed.');
        }

        const { scene } = readOpenScene(root);

        if (scene !== undefined && scene.type !== "travel") {
            throw new Error(`A ${scene.type} scene is open, ${scene.title}: close it before the journey, or open a travel scene. Nothing changed.`);
        }

        const roads = roadsOf(world);
        const measures = measuresOf(root, system);
        const journey = readJourney(root);
        const travellers = travellersOf(world, input.who, journey);
        const staying = input.who === undefined ? "" : stayingNote(world, travellers);
        const { movers, vehicle } = moversOf(world, system, travellers);
        const riders = ridersOf(world, movers);
        const ownJourney = journey !== undefined && sameMovers(world, journey, movers) ? journey : undefined;
        checkOtherJourney(world, roads, journey, movers);
        const before = travelledSinceRest(ownJourney, now);
        // Hours given hold until the next rest (TRV-8).
        const given = readHours(input.hours) ?? (before > 0 ? ownJourney?.hours : undefined);
        const setting = { world, system, roads, measures, movers, vehicle, journey: ownJourney, hours: given };
        const plan = input.toward !== undefined || input.across === true ? openPlan(setting, input) : roadPlan(setting, input);
        const goal = plan.goal.to === undefined ? `${plan.goal.heading}` : `to ${plan.goal.to.name}${plan.goal.across ? ", across" : ""}`;
        const call = plan.goal.to === undefined ? `travel toward ${plan.goal.heading}` : `travel to ${plan.goal.to.name}${plan.goal.across ? ", across" : ""}`;
        // A forced march is the walkers' rule, past the game's hours: a vehicle that goes only by water has none.
        const marching = (vehicle === undefined || !isVehicleOnly(world, system, vehicle)) && plan.hours >= (system?.travel?.hours ?? 8);
        const told = { who: namesText(travellers), goal, call, way: plan.way, going: plan.going, hours: plan.hours, beyond: marching ? system?.travel?.beyond : undefined };

        if (before >= plan.hours * 60) {
            return { ...told, reached: [], date: formatGameDate(now), travelled: before, hoursLeft: 0, ending: { kind: "spent" }, around: [], notes: [] };
        }

        const why = plan.goal.to === undefined ? `travel ${plan.goal.heading}` : `travel to ${plan.goal.to.name}`;
        const walked = walk(root, context, world, movers, plan, now, plan.hours * 60 - before, why);
        world = walked.world;
        const { stop, here, covered, date } = walked;
        const travelled = before + minutesBetween(now, date);
        const kept: Journey = { movers: movers.map((page) => page.name), riders, pace: plan.pace, last: date, travelled, hours: given };
        const point = stop === undefined ? (here !== undefined && "at" in here ? here.at : undefined) : "at" in stop.spot ? stop.spot.at : undefined;
        const total = { metres: plan.legs.reduce((sum, leg) => sum + leg.length, 0), minutes: plan.legs.reduce((sum, leg) => sum + leg.length / leg.metresAMinute, 0) };
        const headingLeft = plan.goal.heading !== undefined && input.distance !== undefined ? total.metres - covered.metres : undefined;
        const onRoad = stop !== undefined && "on" in stop.spot ? stop.spot.on : undefined;
        // Where it stopped in the open, and on which map (POS-8).
        const open = { at: point, map: point === undefined ? undefined : plan.map?.name };
        saveJourney(root, stop === undefined ? { ...kept, ...open } : { ...kept, to: plan.goal.to?.name, heading: plan.goal.heading, left: headingLeft, on: onRoad, ...open });
        const ending: Ending = stop === undefined
            ? plan.goal.to === undefined ? { kind: "reached" } : { kind: "arrived", chain: [plan.goal.to, ...locate(world, plan.goal.to).chain].map((page) => page.name) }
            : { kind: stop.kind, where: spotText(world, stop.spot, date, measures, plan.map?.path), left: leftText(plan, total, covered, headingLeft, measures) };
        const around = point === undefined || plan.from === undefined ? [] : aroundLines(world, roads, plan.from, point, measures, plan.map?.path);
        const merged = mergedTimes(walked.times);
        // What holds around the player character where the journey ended, not where the last hour passed (ENV-5).
        const extensionLines = merged === undefined ? [] : await timePassedLines(root, context, now, addDuration(now, merged.passed));
        const time = merged === undefined ? undefined : { ...merged, around: merged.passed >= 60 ? aroundLead(world) : undefined, extensionLines };
        // A passage's conditions are its page's text, the master's to judge (ROA-8).
        const passages = (plan.passages ?? []).map((name) => `The way goes through ${name}, a passage to another map: read its page for when and how it opens.`);
        return {
            ...told,
            reached: walked.reached,
            date: formatGameDate(date),
            travelled,
            hoursLeft: Math.max(0, plan.hours * 60 - travelled),
            ending,
            around,
            time,
            notes: [...passages, ...walked.notes, ...(staying === "" ? [] : [staying])],
        };
    },

    format(result)
    {
        const head = `${result.who} ${result.ending.kind === "spent" ? "would travel" : "travel"} ${result.goal}, ${result.going}: ${result.way}.`;
        const passed = result.reached.length === 0 ? "" : `Passed ${result.reached.join(", ")}.`;
        const then = ` Then go on: ${result.call}.`;
        const done = result.ending.kind === "arrived" || result.ending.kind === "reached";
        return [head, passed, endingText(result), ...result.around, ...result.notes, ...(result.time === undefined ? [] : passedLines(result.time, done ? "" : then))]
            .filter((line) => line !== "")
            .join("\n");
    },
});

/** What both plans read: the hours are those given for the day, if any. */
interface Setting
{
    world: World;
    system: GameSystem | undefined;
    roads: Roads;
    measures: Measures;
    movers: Page[];
    vehicle?: Page;
    journey?: Journey;
    hours?: number;
}

/** What walking a plan's legs did (TRV-7): where it stopped and why, if before the end, where the movers are, how far and how long, the times passed. */
interface Walked
{
    stop?: { kind: "event" | "day"; spot: Spot; };
    here?: Spot;
    reached: string[];
    covered: { metres: number; minutes: number; };
    times: TimePassed[];
    notes: string[];
    world: World;
    date: GameDate;
}

/**
 * Walks a plan's legs (TRV-7): the movers go into each leg's road or region, the time passes, and they go into where it leads. It stops at an event a move or the
 * time made due, also one due right as a leg ends, and when the day's minutes `left` end. Minutes are counted on the whole way, so that rounding never adds up.
 */
function walk(root: string, context: Context, start: World, movers: Page[], plan: Plan, now: GameDate, left: number, why: string): Walked
{
    let world = start;
    let date = now;
    let minutesLeft = left;
    let exactSoFar = 0;
    let wholeSoFar = 0;
    let covered = { metres: 0, minutes: 0 };
    let here: Spot | undefined;
    const times: TimePassed[] = [];
    const notes: string[] = [];
    const reached: string[] = [];
    // Each move and passing of time writes pages anew: pages are found again by their file in the world as it is now.
    const current = (page: Page): Page => world.pages.find((other) => other.path === page.path) ?? page;

    const goInto = (place: Page | null): string[] => {
        const fresh = movers.map(current);

        if (fresh.every((mover) => locate(world, mover).chain[0]?.path === place?.path)) {
            return [];
        }

        const done = movePages(root, context, world, fresh, place === null ? undefined : current(place));
        world = done.world;
        notes.push(...done.notes);
        return done.due;
    };

    const walked = (stop?: Walked["stop"]): Walked => ({ stop, here, reached, covered, times, notes, world, date });

    for (const [index, leg] of plan.legs.entries()) {
        const last = index === plan.legs.length - 1;

        if (minutesLeft <= 0) {
            return walked({ kind: "day", spot: here ?? leg.at(0) });
        }

        if (leg.into !== undefined && goInto(leg.into).length > 0) {
            return walked({ kind: "event", spot: leg.at(0) });
        }

        const exact = leg.length / leg.metresAMinute;
        const planned = Math.max(0, Math.round(exactSoFar + exact) - wholeSoFar);
        const wanted = Math.min(planned, minutesLeft);
        const passed = wanted > 0 ? passTime(root, context, world, date, wanted, why, hoursText(wanted)) : undefined;
        const minutes = passed?.passed ?? 0;

        if (passed !== undefined) {
            times.push(passed);
            date = addDuration(date, minutes);
            minutesLeft -= minutes;
            world = campaignWorld(root, context);
        }

        if (minutes < planned) {
            covered = { metres: covered.metres + leg.length * (minutes / planned), minutes: covered.minutes + exact * (minutes / planned) };
            return walked({ kind: minutes < wanted ? "event" : "day", spot: leg.at(leg.length * (minutes / planned)) });
        }

        exactSoFar += exact;
        wholeSoFar += planned;
        covered = { metres: covered.metres + leg.length, minutes: covered.minutes + exact };
        here = leg.then === undefined ? leg.at(leg.length) : { place: leg.then.name };
        const due = leg.then === undefined ? [] : goInto(leg.then);

        if (!last && (due.length > 0 || (passed?.due.length ?? 0) > 0)) {
            return walked({ kind: "event", spot: here });
        }

        if (!last && leg.passes !== undefined) {
            reached.push(`${leg.passes} (${formatGameDate(date)})`);
        }
    }

    return walked();
}

/**
 * One journey at a time (TRV-9): another group stopped between places, on a road or in the open, would lose where it is; refused, with what to do instead.
 */
function checkOtherJourney(world: World, roads: Roads, journey: Journey | undefined, movers: Page[]): void
{
    if (journey === undefined || sameMovers(world, journey, movers)) {
        return;
    }

    const others = moversNamed(world, journey);
    const stopped = journeyStart(world, roads, journey, others) !== undefined || journeyPoint(world, journey, others) !== undefined;

    if (stopped && (journey.to !== undefined || journey.heading !== undefined || journey.at !== undefined)) {
        throw new Error(
            `${others.map((page) => page.name).join(", ")} stopped on a journey between places, and rpg keeps one journey at a time: move ${
                movers.map((page) => page.name).join(", ")
            } with move, or bring that journey to a place first. Nothing changed.`,
        );
    }
}

/** A journey by road (TRV-4, TRV-7): from where the journey stopped, or the nearest stop, by the quickest way, stop by stop, and into the destination at last. */
function roadPlan(setting: Setting, input: { to?: string; pace?: string; }): Plan
{
    const { world, system, roads, measures, movers, vehicle, journey } = setting;

    if (input.to === undefined || input.to.trim() === "") {
        throw new Error("Give where to, a place; or, off the roads, toward with a point of the compass. Nothing changed.");
    }

    const destination = placeNamed(world, input.to);
    const onRoad = journey === undefined ? undefined : journeyStart(world, roads, journey, movers);
    const start = startOf(world, roads, movers[0], destination, onRoad);
    const arrival = stopOf(world, roads, destination) as Page;
    const going: Going = { pace: paceOf(system, input.pace ?? (onRoad === undefined ? undefined : journey?.pace), vehicle), vehicle };
    const way = wayFor(world, system, roads, start, arrival, going);

    if (way === undefined) {
        throw new Error(`${noWayText(world, system, roads, start, arrival, going)}${acrossHint(world, movers[0], destination, measures)} Nothing changed.`);
    }

    const speed = speedOf(world, system, roads, going);
    const legs: Leg[] = way.steps.map((step, index) => {
        const road = roads.pages.get(step.stretch.road) as Page;
        const ends = { road: road.name, index: step.stretch.index, from: step.forward ? step.stretch.from : step.stretch.to, toward: stepEnd(step) };
        const begin = step.stretch.length - step.length;
        const last = index === way.steps.length - 1;
        return {
            into: road,
            length: step.length,
            metresAMinute: speed(step.stretch, step.forward) ?? 1,
            then: last ? destination : (pageNamed(world, ends.toward) as Page),
            passes: last ? undefined : ends.toward,
            at: (done: number): Spot => ({ on: { ...ends, done: begin + done } }),
        };
    });
    const from = "stop" in start ? start.stop : `${start.stretch.road}, ${lengthText(start.done, measures)} past ${start.stretch.from}`;
    const passages = [...new Set(legs.flatMap((leg) => (leg.into !== null && leg.into !== undefined && kindOf(system, leg.into).name === "portal" ? [leg.into.name] : [])))];
    return {
        legs: legs.length > 0 ? legs : [{ length: 0, metresAMinute: 1, then: destination, at: () => ({ place: destination.name }) }],
        goal: { to: destination, across: false },
        way: wayText(way, from, measures),
        going: goingText(world, system, going, measures),
        pace: going.pace?.name ?? input.pace,
        hours: dayHours(system, roads, way, going, setting.hours),
        passages,
    };
}

/**
 * A journey off the roads (TRV-12): from where the movers are on the map, straight to a place with a position, or one way for a distance or until the day's
 * travel ends, through the regions with their terrain, at the pace, never in a vehicle that goes only by water.
 */
function openPlan(setting: Setting, input: { to?: string; across?: boolean; toward?: string; distance?: string; pace?: string; }): Plan
{
    const { world, system, roads, measures, movers, vehicle, journey } = setting;

    if (input.toward !== undefined && input.to !== undefined) {
        throw new Error("Give to, a place, or toward, a way to go, not both: to Torre with across goes straight there, toward west goes that way. Nothing changed.");
    }

    if (input.toward === undefined && (input.to === undefined || input.to.trim() === "")) {
        throw new Error("across goes straight to a place: give to, such as to Torre, across. Nothing changed.");
    }

    if (vehicle !== undefined && isVehicleOnly(world, system, vehicle)) {
        throw new Error(`${vehicle.name} goes only on the kinds of road made for it: off the roads they go on foot, out of it. Nothing changed.`);
    }

    const from = moversPosition(world, roads, journey, movers);

    if (from === undefined && locate(world, movers[0]).chain.length === 0) {
        throw new Error(`${movers[0].name} is in no place, and no journey says where: move them to a place first, such as the one they last left. Nothing changed.`);
    }

    if (from === undefined) {
        throw new Error(`${movers[0].name} is where the map has no position: give one to the place they are in, such as write <place>, set position="12 km NE of [[<a place with one>]]". Nothing changed.`);
    }

    const pace = paceOf(system, input.pace ?? journey?.pace, undefined) as NonNullable<Going["pace"]>;
    const hours = setting.hours ?? system?.travel?.hours ?? 8;
    const destination = input.to === undefined ? undefined : placeNamed(world, input.to);
    // Off the roads one stays on the map one is on: to another, a passage leads (POS-8, ROA-8).
    const map = moversMap(world, journey, movers);

    if (destination !== undefined && mapKey(world, destination) !== (map?.path ?? "")) {
        const where = (root: Page | undefined): string => (root === undefined ? "the main map" : `the map of ${root.name}`);
        throw new Error(
            `${destination.name} is on ${where(mapOf(world, destination).root)}, ${movers[0].name} on ${where(map)}: across country one stays on one map. Go through a passage, a road of kind portal, or move them. Nothing changed.`,
        );
    }

    // Already there only inside the destination: a region holds places kilometres apart, so being in the region is not being at them.
    if (destination !== undefined && movers[0] !== undefined && [movers[0], ...locate(world, movers[0]).chain].includes(destination)) {
        throw new Error(`${movers[0].name} is already in ${destination.name}: no journey, use move for a place inside it. Nothing changed.`);
    }

    const { target, bounded } = destination === undefined ? headingTarget(from, input.toward ?? "", input.distance, journey, pace.speed) : { target: destinationPosition(world, destination), bounded: true };
    const length = distanceBetween(from, target);
    const legs = openLegs(world, system, from, target, pace.speed, map?.path);
    let start = 0;
    const steps: Leg[] = legs.map((leg, index) => {
        const offset = start;
        start += leg.length;
        return {
            into: leg.region ?? null,
            length: leg.length,
            metresAMinute: leg.metresAMinute,
            then: index === legs.length - 1 ? destination : undefined,
            at: (done: number): Spot => ({ at: pointAlong(from, target, length === 0 ? 1 : (offset + done) / length) }),
        };
    });
    const through = legs.map((leg) => `${leg.region?.name ?? "the open"} (${lengthText(leg.length, measures)})`).join(", ") || "nothing";
    const time = durationText(legs.reduce((sum, leg) => sum + leg.length / leg.metresAMinute, 0), hours);
    const heading = input.toward === undefined ? undefined : directionName(readDirection(input.toward) ?? 0);
    const way = destination === undefined
        ? `${heading} from ${pointText(world, from, measures, map?.path)}, ${bounded ? `${lengthText(length, measures)} through ${through}; ${time}` : "until the day's travel ends"}`
        : `straight from ${pointText(world, from, measures, map?.path)} to ${destination.name}, ${lengthText(length, measures)} through ${through}; ${time}`;
    return {
        legs: steps.length > 0 ? steps : [{ length: 0, metresAMinute: 1, then: destination, at: () => ({ at: target }) }],
        goal: { to: destination, heading, across: true },
        way,
        going: goingText(world, system, { pace }, measures),
        pace: pace.name ?? input.pace,
        hours,
        from,
        ...(map === undefined ? {} : { map }),
    };
}

/**
 * Where a journey one way ends (TRV-12): at the distance given, at what its journey still has to go that way, or, unbounded, past where the day's travel can
 * take it.
 */
function headingTarget(from: Position, toward: string, distance: string | undefined, journey: Journey | undefined, metresAnHour: number): { target: Position; bounded: boolean; }
{
    const degrees = readDirection(toward);

    if (degrees === undefined) {
        throw new Error(`"${toward}" is not a way to go: give ${directionHelp}. Nothing changed.`);
    }

    const given = distance === undefined ? undefined : readLength(distance);

    if (distance !== undefined && given === undefined) {
        throw new Error(`"${distance}" is not a distance: write it in km or m, such as 12 km. Nothing changed.`);
    }

    const sameWay = journey?.heading !== undefined && readDirection(journey.heading) === degrees ? journey.left : undefined;
    const metres = given ?? sameWay;
    // Without a distance, farther than a whole day's travel could go: the day's hours stop it.
    return { target: pointFrom(from, degrees, metres ?? metresAnHour * 24), bounded: metres !== undefined };
}

/** A place's position, for a journey straight to it; refused, with how to give one, when it has none. */
function destinationPosition(world: World, destination: Page): Position
{
    const position = positionOf(world, destination);

    if (position === undefined) {
        throw new Error(`${destination.name} has no position on the map: give it one, such as write ${destination.name}, set position="12 km NE of [[<a place with one>]]". Nothing changed.`);
    }

    return position;
}

/**
 * What is around a point in the open of a map (TRV-13, POS-8): the region and its terrain, the places near, the roads crossed on the way, and how to make the
 * spot a place.
 */
function aroundLines(world: World, roads: Roads, from: Position, point: Position, measures: Measures, map = ""): string[]
{
    const region = regionAt(world, point, map)?.page;
    const terrain = region === undefined ? undefined : environmentAt(world, region).find(({ entry }) => entry.name.toLowerCase() === "terrain")?.entry.value;
    const crossed = crossedRoads(world, roads, from, point, measures, map);
    return [
        region === undefined ? "In the open, in no region." : `In ${region.name}${terrain === undefined ? "" : `, terrain ${terrain}`}.`,
        `Near: ${nearPlaces(world, point, measures, map).join(" · ") || "no place with a position"}.`,
        crossed.length === 0 ? "" : `Crossed: ${crossed.join(" · ")}.`,
        "No place is written here: to make it one, such as a camp, write <name>, type place, here.",
    ].filter((line) => line !== "");
}

/** The travellers (TRV-6): the characters named, or the party where the player character is; in the open, those of its journey. */
/** "Corrado stays in Roccalba: …": who travels leaves out the player character where they start, which who may not have meant (playtest 05). */
function stayingNote(world: World, travellers: Page[]): string
{
    const placeOf = (page: Page): Page | undefined => locate(world, page).chain.find((holder) => holder.type === "place");
    const start = travellers[0] === undefined ? undefined : placeOf(travellers[0]);
    // Every player character left behind where they start (VIEW-12).
    const players = playerCharacters(world);
    const living = players.filter((pc) => pc.fields.status !== "dead");
    const staying = (living.length > 0 ? living : players.slice(0, 1)).filter((pc) => !travellers.includes(pc) && start !== undefined && placeOf(pc)?.path === start.path);

    if (start === undefined || staying.length === 0) {
        return "";
    }

    return `${staying.map((pc) => pc.name).join(" and ")} ${staying.length === 1 ? "stays" : "stay"} in ${start.name}: who replaces the party; to go together, leave who out, or name the party too.`;
}

function travellersOf(world: World, who: string | string[] | undefined, journey: Journey | undefined): Page[]
{
    const names = (typeof who === "string" ? [who] : (who ?? [])).filter((name) => name.trim() !== "");

    if (names.length === 0) {
        const party = travellingParty(world, partyLead(world, journey?.movers ?? [], "Give who, the characters who travel."), journey?.movers ?? []);

        if (party.length === 0) {
            throw new Error("There is no player character to travel: give who, the characters who travel. Nothing changed.");
        }

        return party;
    }

    return names.map((name) => {
        const page = pageNamed(world, parsePageReference(name).name);

        if (page?.type !== "character") {
            throw new Error(`${page === undefined ? `There is no page named ${name}` : `${page.name} is not a character`}: who travels are characters; a vehicle goes with those in it. Nothing changed.`);
        }

        return page;
    }).filter((page, index, all) => all.indexOf(page) === index);
}

/** A place by name or alias, where a journey goes. */
function placeNamed(world: World, name: string): Page
{
    const page = pageNamed(world, parsePageReference(name).name);

    if (page === undefined) {
        throw new Error(`There is no page named ${parsePageReference(name).name}. Look for it with find.${missingSystemHint(world)} Nothing changed.`);
    }

    if (page.type !== "place") {
        throw new Error(`${page.name} is not a place: a journey goes to a place. Nothing changed.`);
    }

    return page;
}

/** Where the travel starts (ROA-5, TRV-9): where the journey stopped on its road, else the nearest stop of where the movers are; refused when none, or already there. */
function startOf(world: World, roads: Roads, mover: Page, destination: Page, onRoad: Start | undefined): Start
{
    if (onRoad !== undefined) {
        return onRoad;
    }

    const lost = unknownOnRoad(world, roads, mover);

    if (lost !== undefined) {
        throw new Error(`${lost.replace("give from,", "move them to")} Nothing changed.`);
    }

    const departure = stopOf(world, roads, mover);
    const arrival = stopOf(world, roads, destination);

    for (const [page, stop] of [[mover, departure], [destination, arrival]] as const) {
        if (stop === undefined) {
            const chain = [page, ...locate(world, page).chain].filter((holder) => holder.type === "place").map((holder) => holder.name);
            const where = chain.length === 0 ? `${page.name} is in the open` : `none of ${chain.join(" › ")} is a stop of a road`;
            throw new Error(`No road reaches ${page.name}: ${where}. Write one, a place with stops; or go off the roads, with across or toward. Nothing changed.`);
        }
    }

    const spot = sameSpot(world, departure as Page, arrival as Page);

    if (spot !== undefined) {
        throw new Error(`${mover.name} and ${destination.name} are one spot for a journey, in ${spot.name}: no road to travel, use move. Nothing changed.`);
    }

    return { stop: (departure as Page).name };
}

function readHours(value: number | string | undefined): number | undefined
{
    if (value === undefined || (typeof value === "string" && value.trim() === "")) {
        return undefined;
    }

    const hours = Number(typeof value === "string" ? value.trim().replace(/\s*h$/i, "") : value);

    if (!Number.isFinite(hours) || hours <= 0 || hours > 24) {
        throw new Error(`"${value}" is not a number of hours up to 24, such as hours 10. Nothing changed.`);
    }

    return hours;
}

/** "on Sentiero dei colli, 8 km past Bivio, toward Ponte, at day 3, 13:00"; "at Bivio at day 3, 10:30"; "in Brughiera Nera, 3 km west of Torre, at day 5, 16:00". */
function spotText(world: World, spot: Spot, date: GameDate, measures: Measures, map = ""): string
{
    if ("on" in spot) {
        return `on ${spot.on.road}, ${lengthText(spot.on.done, measures)} past ${spot.on.from}, toward ${spot.on.toward}, at ${formatGameDate(date)}`;
    }

    if ("place" in spot) {
        return `at ${spot.place} at ${formatGameDate(date)}`;
    }

    const region = regionAt(world, spot.at, map)?.page.name;
    const point = pointText(world, spot.at, measures, map);
    return `${region === undefined ? "in the open" : `in ${region}`}, ${point.includes(" of ") ? point : `at ${point}`}, at ${formatGameDate(date)}`;
}

/** "16 km left to Rocca, 3h 20m of travel"; "4 km left west"; nothing for a way with no end. */
function leftText(plan: Plan, total: { metres: number; minutes: number; }, covered: { metres: number; minutes: number; }, headingLeft: number | undefined, measures: Measures): string
{
    const metres = Math.max(0, total.metres - covered.metres);

    if (plan.goal.to === undefined) {
        return headingLeft === undefined ? "" : `${lengthText(Math.max(0, headingLeft), measures)} left ${plan.goal.heading}`;
    }

    return `${lengthText(metres, measures)} left to ${plan.goal.to.name}, ${durationText(Math.max(0, total.minutes - covered.minutes), plan.hours)}`;
}

/** How the travel ended (TRV-10), with what is left and how to go on. */
function endingText(result: TravelResult): string
{
    const goOn = `To go on: ${result.call}.`;
    const beyond = result.beyond === undefined ? "" : ` (beyond ${result.hours} h: rules ${result.beyond})`;
    const camp = `camp for the night, or go on with hours, such as hours ${Math.min(24, result.hours + 2)}${beyond}`;
    const left = (text: string): string => (text === "" ? "" : ` ${text}.`);

    switch (result.ending.kind) {
        case "arrived":
            return `Arrived at ${result.date}: now in ${result.ending.chain.join(" › ")}.`;
        case "reached":
            return `Went as far as asked, at ${result.date}.`;
        case "spent":
            return `They already travelled ${hoursText(result.travelled)} today, the day's ${result.hours} h: ${camp}. Nothing changed.`;
        case "day":
            return `Stopped ${result.ending.where}, after ${hoursText(result.travelled)} of travel today: ${camp}.${left(result.ending.left)} ${goOn}`;
        case "event":
            return `Stopped ${result.ending.where}: an event came due, below.${left(result.ending.left)} ${hoursText(result.hoursLeft)} of travel left today. ${goOn}`;
    }
}

/** The times of a travel's legs as one passing of time: from the first to the last, with every event due, every effect ended and every clock of the new days. */
function mergedTimes(times: TimePassed[]): TimePassed | undefined
{
    const [first, last] = [times[0], times.at(-1)];

    if (first === undefined || last === undefined) {
        return undefined;
    }

    return {
        ...last,
        from: first.from,
        passed: times.reduce((sum, time) => sum + time.passed, 0),
        wanted: times.reduce((sum, time) => sum + time.wanted, 0),
        due: [...new Set(times.flatMap((time) => time.due))],
        stillDue: first.stillDue,
        ended: times.flatMap((time) => time.ended),
        newDays: times.reduce((sum, time) => sum + time.newDays, 0),
        clocks: [...new Set(times.flatMap((time) => time.clocks))],
        newDayPart: times.map((time) => time.newDayPart).find((part) => part !== "") ?? "",
        // What the party used up at every midnight of every leg (UPK-1).
        upkeep: times.flatMap((time) => time.upkeep ?? []),
    };
}

function namesText(pages: Page[]): string
{
    const names = pages.map((page) => page.name);
    return names.length === 1 ? names[0] : `${names.slice(0, -1).join(", ")} and ${names.at(-1)}`;
}
