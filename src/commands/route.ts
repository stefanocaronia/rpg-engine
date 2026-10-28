import { z } from "zod";
import { requireCampaign } from "../campaign/index.ts";
import { defineCommand } from "../core/registry.ts";
import type { Start } from "../map/index.ts";
import { distanceBetween } from "../map/index.ts";
import { locate, mapKey, type Page, pageNamed, parsePageReference, type Position, type World } from "../pages/index.ts";
import type { GameSystem } from "../systems/index.ts";
import { journeyStart, moversPosition, readJourney } from "./game-journey.ts";
import { acrossHint, openLegs } from "./game-open.ts";
import { pointText, positionOf } from "./game-positions.ts";
import { dayHours, durationText, type Going, goingText, lengthText, type Measures, measuresOf, moversOf, noWayText, paceOf, partyLead, roadsOf, sameSpot, stopOf, travellingParty, unknownOnRoad, wayFor, wayText } from "./game-roads.ts";
import { campaignSystem, campaignWorld, missingSystemHint } from "./game-world.ts";

/** What route found, as its output tells it (TRV-5). */
type RouteResult =
    | { kind: "way"; way: string; going: string; time: string; then?: string; }
    | { kind: "there"; text: string; }
    | { kind: "none"; text: string; };

export const route = defineCommand({
    name: "route",
    description: "How far a place is by road, and how long the journey takes: the stops and roads of the quickest way, the distance and the days, at the party's pace or another. "
        + "With across, straight across country, through the regions and their terrain. It moves no one and lets no time pass: to make the journey, use travel. "
        + "Example: to Rocca, from Guadoscuro, pace fast; or to Torre, across.",
    group: "game",
    readOnly: true,
    positionals: ["to"],
    input: z.object({
        to: z.string().describe("where to: a place"),
        from: z.string().optional().describe("where from: a place, or a character; if left out, where the party is, or where its journey stopped; given, when the player characters are apart"),
        pace: z.string().optional().describe("one of the game's paces, such as fast, or a speed, such as 4.5 km; if left out, the game's usual pace"),
        across: z.boolean().optional().describe("straight across country, off the roads, when both places have a position"),
    }),

    run(input, context): RouteResult
    {
        const root = requireCampaign(context.folder);
        const world = campaignWorld(root, context);
        const system = campaignSystem(root, context);
        const roads = roadsOf(world);
        const measures = measuresOf(root, system);
        const destination = placeNamed(world, input.to, "where to");
        const travellers = input.from === undefined ? travellingParty(world, partyLead(world, readJourney(root)?.movers ?? [], "Give from, the place to start from."), readJourney(root)?.movers ?? []) : [];
        const origin = input.from === undefined ? travellers[0] : placeNamed(world, input.from, "where from", true);

        if (origin === undefined) {
            throw new Error("There is no player character to start from: give from, a place.");
        }

        const { movers, vehicle } = travellers.length === 0 ? { movers: [origin], vehicle: undefined } : moversOf(world, system, travellers);
        const journey = input.from === undefined ? readJourney(root) : undefined;
        const onRoad = journey === undefined ? undefined : journeyStart(world, roads, journey, movers);
        const departure = stopOf(world, roads, origin);
        const arrival = stopOf(world, roads, destination);

        if (input.across === true) {
            return acrossRoute(world, system, measures, journey === undefined ? positionOf(world, origin) : moversPosition(world, roads, journey, movers), origin, destination, input.pace);
        }

        const lost = onRoad === undefined ? unknownOnRoad(world, roads, origin) : undefined;

        if (lost !== undefined) {
            return { kind: "none", text: lost };
        }

        if (onRoad === undefined && departure === undefined) {
            return { kind: "none", text: `${offRoadText(world, origin)}${acrossHint(world, origin, destination, measures)}` };
        }

        if (arrival === undefined) {
            return { kind: "none", text: `${offRoadText(world, destination)}${acrossHint(world, origin, destination, measures)}` };
        }

        const spot = onRoad === undefined && departure !== undefined ? sameSpot(world, departure, arrival) : undefined;

        if (spot !== undefined) {
            return { kind: "there", text: `${origin.name} and ${destination.name} are one spot for a journey, in ${spot.name}: no road to travel, move is enough.` };
        }

        const going: Going = { pace: paceOf(system, input.pace, vehicle), vehicle };
        const start: Start = onRoad ?? { stop: departure?.name ?? "" };
        const way = wayFor(world, system, roads, start, arrival, going);

        if (way === undefined) {
            return { kind: "none", text: `${noWayText(world, system, roads, start, arrival, going)}${acrossHint(world, origin, destination, measures)}` };
        }

        const from = "stop" in start ? start.stop : `${start.stretch.road}, ${lengthText(start.done, measures)} past ${start.stretch.from}`;
        const down = arrival === destination ? "" : `, then into ${destination.name}`;
        return { kind: "way", way: `${wayText(way, from, measures)}${down}`, going: goingText(world, system, going, measures), time: durationText(way.minutes, dayHours(system, roads, way, going, undefined)) };
    },

    format(result)
    {
        return result.kind === "way" ? [`${result.way}.`, `${result.going[0].toUpperCase()}${result.going.slice(1)}: ${result.time}.`, result.then ?? ""].filter((line) => line !== "").join("\n") : result.text;
    },
});

/** The way straight across country (TRV-12): the regions it goes through, the distance and the time at the pace; or why there is none, with how to give a position. */
function acrossRoute(world: World, system: GameSystem | undefined, measures: Measures, from: Position | undefined, origin: Page, destination: Page, pace: string | undefined): RouteResult
{
    const to = positionOf(world, destination);
    const missing = from === undefined ? origin : to === undefined ? destination : undefined;

    if (from === undefined || to === undefined) {
        return { kind: "none", text: `${missing?.name} has no position on the map: give it one, such as write ${missing?.name}, set position="12 km NE of [[<a place with one>]]".` };
    }

    // Across country one stays on one map (POS-8): to another, a passage leads.
    const map = mapKey(world, origin);

    if (mapKey(world, destination) !== map) {
        return { kind: "none", text: `${destination.name} is on another map than ${origin.name}: across country one stays on one map. A passage, a road of kind portal, leads from one to the other.` };
    }

    const going: Going = { pace: paceOf(system, pace, undefined) };
    const legs = openLegs(world, system, from, to, going.pace?.speed ?? 0, map);
    const through = legs.map((leg) => `${leg.region?.name ?? "the open"} (${lengthText(leg.length, measures)})`).join(", ");
    const minutes = legs.reduce((sum, leg) => sum + leg.length / leg.metresAMinute, 0);
    const way = `Straight from ${pointText(world, from, measures, map)} to ${destination.name}, ${lengthText(distanceBetween(from, to), measures)} through ${through || "nothing"}`;
    return { kind: "way", way, going: goingText(world, system, going, measures), time: durationText(minutes, system?.travel?.hours ?? 8), then: `To go: travel to ${destination.name}, across.` };
}

/** A place by name or alias, for where a journey goes or starts; a character too, where it starts, for the place it is in. */
function placeNamed(world: World, name: string, role: string, characterToo = false): Page
{
    const reference = parsePageReference(name);
    const page = pageNamed(world, reference.name);

    if (page === undefined) {
        throw new Error(`There is no page named ${reference.name}, ${role}. Look for it with find.${missingSystemHint(world)}`);
    }

    if (page.type !== "place" && !(characterToo && page.type === "character")) {
        throw new Error(`${page.name} is not a place: give a place ${role}${characterToo ? ", or a character" : ""}.`);
    }

    return page;
}

/** Why a place has no road (ROA-5): no place of its chain is a stop. */
function offRoadText(world: World, page: Page): string
{
    const chain = [page, ...locate(world, page).chain].filter((holder) => holder.type === "place").map((holder) => holder.name);
    return `No road reaches ${page.name}: none of ${chain.join(" › ")} is a stop of a road. Write one, a place with stops, such as write "Strada del passo", type place, set stops=[[A]], 8 km, [[${chain.at(-1) ?? page.name}]].`;
}
