// Travel off the roads (D-259, TRV-12, TRV-13): a straight line across the regions of the map, each with its terrain, and the roads it crosses.
import { crossingAlong, distanceBetween, pointAlong } from "../../map/index.ts";
import { mapKey, type Page, pagesWithName, type Position, type World } from "../../pages/index.ts";
import type { GameSystem } from "../../systems/index.ts";
import { placedPosition, positionOf, regionAt, relationText } from "../shared/positions.ts";
import { lengthText, type Measures, type Roads, terrainFactor } from "../shared/roads.ts";

/** A leg of a straight line across country: the region it runs in, none in the open, its length in metres and the metres a minute at the pace there. */
export interface OpenLeg
{
    region?: Page;
    length: number;
    metresAMinute: number;
}

// The line is judged every this many metres: a region smaller than this may be missed, which the master can always say.
const sampleMetres = 250;

/**
 * The legs of a straight line from a point to another of a map, by its key (TRV-12, POS-8): where the smallest region that covers it changes, a new leg, at the
 * pace times its terrain.
 */
export function openLegs(world: World, system: GameSystem | undefined, from: Position, to: Position, metresAnHour: number, map = ""): OpenLeg[]
{
    const total = distanceBetween(from, to);
    const samples = Math.max(1, Math.ceil(total / sampleMetres));
    const legs: OpenLeg[] = [];

    for (let index = 0; index < samples; index++) {
        const region = regionAt(world, pointAlong(from, to, (index + 0.5) / samples), map)?.page;
        const last = legs.at(-1);

        if (last !== undefined && last.region === region) {
            last.length += total / samples;
        } else {
            legs.push({ region, length: total / samples, metresAMinute: (metresAnHour * (region === undefined ? 1 : terrainFactor(world, system, region))) / 60 });
        }
    }

    return total === 0 ? [] : legs;
}

/** " Straight across country it is 9 km north-east: travel to Torre, across.": the way off the roads, when both places have a position on one map (TRV-13, POS-8). */
export function acrossHint(world: World, from: Page, to: Page, measures: Measures): string
{
    const [start, end] = [positionOf(world, from), positionOf(world, to)];
    return start === undefined || end === undefined || mapKey(world, from) !== mapKey(world, to) ? "" : ` Straight across country it is ${relationText(start, end, measures)}: travel to ${to.name}, across.`;
}

/** "Strada vecchia, 3 km out": the roads of a map a straight line crosses, between stops with a position, each once, nearest first (TRV-13, POS-8). */
export function crossedRoads(world: World, roads: Roads, from: Position, to: Position, measures: Measures, map = ""): string[]
{
    const length = distanceBetween(from, to);
    const crossings = roads.stretches.flatMap((stretch) => {
        const [start, end] = [stretch.from, stretch.to].map((name) => {
            const page = pagesWithName(world, name)[0];
            return page === undefined || mapKey(world, page) !== map ? undefined : placedPosition(world, page);
        });
        const along = start === undefined || end === undefined ? undefined : crossingAlong(from, to, start, end);
        // A road that starts or ends where the line does is not crossed.
        return along === undefined || along * length < 50 || along * length > length - 50 ? [] : [{ road: stretch.road, metres: along * length }];
    }).sort((first, second) => first.metres - second.metres);
    return crossings.filter((crossing, index) => crossings.findIndex((other) => other.road === crossing.road) === index).map((crossing) => `${crossing.road}, ${lengthText(crossing.metres, measures)} out`);
}
