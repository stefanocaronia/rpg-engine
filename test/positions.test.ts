// Positions, regions and travel off the roads (MECCANICHE, POS-1–POS-6, TRV-12–TRV-15): the cases of the table, through the commands.
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { runCommandLine } from "../src/cli/command-line.ts";
import type { Context } from "../src/core/context.ts";
import { fromLabel } from "../src/dashboard/game-words.ts";
import { lengthText } from "../src/dashboard/world/map.ts";
import { inPlay, makeTempFolder, removeFolder, testContext } from "./support.ts";

let folder: string;
let context: Context;

// Guadoscuro at the centre; Strada vecchia: Guadoscuro –12– Bivio –8– Rocca, Rocca 20 km east, so Bivio is 12 km east; Torre 10 km north of Bivio; the
// Brughiera, difficult terrain, 6 km around a point 8 km NNE of Bivio, covers Torre. Ettore and Lena at the Locanda in Guadoscuro.
beforeEach(async () => {
    folder = makeTempFolder();
    context = testContext(folder);
    await runCommandLine(["init", "--name", "Valle", "--language", "it", "--system", "fake", "--difficulty", "normal", "--lethality", "dice"], context);
    inPlay(folder);
    await ok("write", "Ettore", "--type", "character", "--set", "role=pc");
    await ok("write", "Lena", "--type", "character", "--set", "role=companion");
    await ok("write", "Locanda", "--type", "place", "--add", "contains=[[Ettore]]", "--add", "contains=[[Lena]]");
    await ok("write", "Guadoscuro", "--type", "place", "--add", "contains=[[Locanda]]");
    await ok("write", "Bivio", "--type", "place");
    await ok("write", "Rocca", "--type", "place");
    await ok("write", "Strada vecchia", "--type", "place", "--set", "stops=[[Guadoscuro]], 12 km, [[Bivio]], 8 km, [[Rocca]]");
    await ok("advance", "--to", "day 3, 08:00");
});

afterEach(() => removeFolder(folder));

function rpg(...args: string[])
{
    return runCommandLine(args, context);
}

async function ok(...args: string[]): Promise<string>
{
    const result = await rpg(...args);
    expect(result.exitCode, result.output).toBe(0);
    return result.output;
}

async function refused(...args: string[]): Promise<string>
{
    const result = await rpg(...args);
    expect(result.exitCode, result.output).toBe(1);
    return result.output;
}

function page(path: string): string
{
    return readFileSync(join(folder, "world", path), "utf8");
}

function state(): string
{
    return readFileSync(join(folder, "state.yaml"), "utf8");
}

async function placeTheMap(): Promise<void>
{
    await ok("write", "Rocca", "--set", "position=20 km E of [[Guadoscuro]]");
    await ok("write", "Torre", "--type", "place", "--set", "position=10 km N of [[Bivio]]");
    await ok("write", "Brughiera", "--type", "place", "--set", "position=8 km NNE of [[Bivio]]", "--set", "radius=6 km", "--add", "environment=terrain: difficult");
}

describe("positions (POS-1–POS-5)", () => {
    it("POS-2: a relation gives coordinates; the first place named becomes the map's centre, written too", async () => {
        expect(await ok("write", "Rocca", "--set", "position=20 km E of [[Guadoscuro]]")).toBe(
            [
                "Updated Rocca (place, world/places/Rocca.md): set position.",
                "Guadoscuro is now the centre of the map, at 0 km E, 0 km N: every other position is given from a place that has one.",
                "For the dashboard's map, give Rocca a kind, as set kind=village: city, town, village, castle, tower, ruin, temple, shrine, inn, farm, mill, port, bridge, ford, crossroads, cave, mine, peak, camp.",
            ].join("\n"),
        );
        expect(page("places/Rocca.md")).toBe("---\nposition: 20 km E, 0 km N\n---\n");
        expect(page("places/Guadoscuro.md")).toContain("position: 0 km E, 0 km N");
        await ok("write", "Pozzo", "--type", "place", "--set", "position=3 km south-west of [[Rocca]]");
        expect(page("places/Pozzo.md")).toBe("---\nposition: 17.88 km E, 2.12 km S\n---\n");
        await ok("write", "Cava", "--type", "place", "--set", "position=8.5 km W, 3 km N");
        expect(page("places/Cava.md")).toBe("---\nposition: 8.5 km W, 3 km N\n---\n");
    });

    it("POS-2: several relations give the middle of their points, saying how far apart they were; a place without a position is refused once the map has one", async () => {
        await ok("write", "Rocca", "--set", "position=20 km E of [[Guadoscuro]]");
        expect(await ok("write", "Mulino", "--type", "place", "--set", 'position=["10 km E of [[Guadoscuro]]", "11 km W of [[Rocca]]"]')).toContain(
            "The relations given are up to 1 km apart: Mulino is at their middle.",
        );
        expect(page("places/Mulino.md")).toBe("---\nposition: 9.5 km E, 0 km N\n---\n");
        await ok("write", "Fonte", "--type", "place");
        expect(await refused("write", "Pieve", "--type", "place", "--set", "position=2 km N of [[Fonte]]")).toBe(
            "Fonte has no position yet: give it one first, relative to a place that has one, such as Guadoscuro, Mulino, Rocca, then write Pieve. Nothing changed.",
        );
        expect(await refused("write", "Pieve", "--type", "place", "--set", "position=2 km up of [[Rocca]]")).toContain(
            '"2 km up of [[Rocca]]" is not a position: the direction must be one of the 16 points of the compass',
        );
        expect(await refused("write", "Pieve", "--type", "place", "--set", "position=2 miles N of [[Rocca]]")).toContain("is not a position: write a distance, a direction and a place");
        expect(await refused("write", "Rocca", "--set", "position=2 km N of [[Rocca]]")).toContain("Rocca cannot be placed from itself");
    });

    it("POS-4: a stop with no position is on the line between its road's stops that have one; validate takes a written one by hand that does not read", async () => {
        await placeTheMap();
        expect(await ok("route", "Torre", "--from", "Bivio", "--across")).toContain("Straight from Bivio to Torre, 10 km through the open (2.3 km), Brughiera (7.8 km).\nAt a steady pace (4.5 km an hour): 3h 57m of travel.");
        await ok("write", "Fonte", "--type", "place");
        await ok("write", "Fonte", "--set", "radius=10 km");
        expect(await refused("write", "Fonte", "--set", "radius=10 miles")).toContain('"radius" must be a length in km or m, such as 10 km.');
    });

    it("POS-5: a road shorter than the straight line between two of its stops with a position is said by write and validate", async () => {
        expect(await ok("write", "Rocca", "--set", "position=25 km E of [[Guadoscuro]]")).toContain(
            "Strada vecchia is 20 km from Guadoscuro to Rocca, shorter than the 25 km between them in a straight line: a length or a position is wrong.",
        );
        expect(await ok("validate")).toContain("Strada vecchia is 20 km from Guadoscuro to Rocca, shorter than the 25 km between them in a straight line");
    });
});

describe("travel off the roads (TRV-12, TRV-13)", () => {
    it("TRV-12, POS-6: across goes straight to a place, at half the pace in a region of difficult terrain, through the open and the region", async () => {
        await placeTheMap();
        expect(await ok("route", "Torre")).toContain(
            'No road reaches Torre: none of Torre is a stop of a road. Write one, a place with stops, such as write "Strada del passo", type place, set stops=[[A]], 8 km, [[Torre]]. Straight across country it is 15.6 km north-east: travel to Torre, across.',
        );
        expect(await ok("travel", "Torre", "--across")).toBe(
            "Ettore and Lena travel to Torre, across, at a steady pace (4.5 km an hour): straight from Guadoscuro to Torre, 15.6 km through the open (11.9 km), Brughiera (3.7 km); 4h 18m of travel.\n"
                + "Arrived at day 3, 12:18: now in Torre.",
        );
        expect(await refused("travel", "Torre", "--across")).toBe("Ettore is already in Torre: no journey, use move for a place inside it. Nothing changed.");
    });

    it("TRV-12, TRV-13: toward goes one way for a distance; at the end it says the region, what is near, the roads crossed, and how to write a place there", async () => {
        await placeTheMap();
        await ok("move", "Ettore", "Lena", "--to", "Torre");
        expect(await ok("travel", "--toward", "S", "--distance", "12 km")).toBe(
            "Ettore and Lena travel south, at a steady pace (4.5 km an hour): south from Torre, 12 km through Brughiera (7.8 km), the open (4.3 km); 4h 23m of travel.\n"
                + "Went as far as asked, at day 3, 12:23.\nIn the open, in no region.\nNear: Bivio, 2 km north.\nCrossed: Strada vecchia, 10 km out.\nNo place is written here: to make it one, such as a camp, write <name>, type place, here.",
        );
        expect(await ok("show", "Ettore")).not.toContain("Is in:");
        expect(await ok("status")).toContain("Journey: stopped in the open, 2 km south of Bivio.");
        expect(await ok("view")).toContain("Ettore, in the open");
        // A companion never put anywhere is in no place too, but not in the open with the party.
        await ok("write", "Mira", "--type", "character", "--set", "role=companion");
        expect(await ok("travel", "--toward", "S", "--distance", "1 km")).toContain("Ettore and Lena travel south");
    });

    it("TRV-8, TRV-12: toward without a distance goes until the day's travel ends, and travel toward again goes on from the point the next day", async () => {
        await placeTheMap();
        expect(await ok("travel", "--toward", "west")).toContain("Stopped in the open, 36 km west of Guadoscuro, at day 3, 16:00, after 8h of travel today: camp for the night");
        expect(state()).toContain("heading: west\n");
        expect(state()).toContain("at: 36 km W, 0 km N\n");
        await ok("advance", "--to", "day 4, 08:00");
        expect(await ok("travel", "--toward", "west", "--distance", "9 km")).toContain("Went as far as asked, at day 4, 10:00.");
        expect(state()).toContain("at: 45 km W, 0 km N\n");
    });

    it("TRV-12: refused with to and toward together, in a boat, from where the map has no position, toward a place without one", async () => {
        await placeTheMap();
        expect(await refused("travel", "Torre", "--toward", "N")).toContain("Give to, a place, or toward, a way to go, not both");
        expect(await refused("travel", "--toward", "up")).toContain('"up" is not a way to go: give one of the 16 points of the compass');
        await ok("write", "Fonte", "--type", "place");
        expect(await refused("travel", "Fonte", "--across")).toContain("Fonte has no position on the map: give it one, such as write Fonte, set position=");
        await ok("move", "Ettore", "Lena", "--to", "Fonte");
        expect(await refused("travel", "Torre", "--across")).toContain("Ettore is where the map has no position: give one to the place they are in");
        await ok("write", "Chiatta", "--type", "item", "--set", "item=[[Barge]]");
        await ok("move", "Chiatta", "--to", "Guadoscuro");
        await ok("move", "Ettore", "Lena", "--to", "Chiatta");
        expect(await refused("travel", "Torre", "--across")).toBe("Chiatta goes only on the kinds of road made for it: off the roads they go on foot, out of it. Nothing changed.");
    });
});

describe("what playtest 03 found (TRV-12)", () => {
    it("TRV-12: stopped in the open inside a region, across goes on to a place in that region, which they are not at yet", async () => {
        await placeTheMap();
        await ok("write", "Tempesta", "--type", "event", "--set", "date=day 3, 11:00");
        expect(await ok("travel", "Torre", "--across")).toContain("Stopped in Brughiera, 2.9 km south-west of Torre");
        expect(await ok("travel", "Torre", "--across")).toContain("Arrived at day 3, 12:18: now in Torre.");
    });
});

describe("a place where the party is (TRV-14)", () => {
    it("TRV-14: stopped on a road, the new place becomes a stop splitting the stretch; the party goes into it and the journey goes on from it", async () => {
        await ok("write", "Agguato", "--type", "event", "--set", "date=day 3, 10:00");
        expect(await ok("travel", "Rocca")).toContain("Stopped on Strada vecchia, 9 km past Guadoscuro, toward Bivio, at day 3, 10:00");
        expect(await ok("write", "Osteria", "--type", "place", "--here")).toContain(
            "Osteria is now a stop of Strada vecchia: [[Guadoscuro]], 9 km, [[Osteria]], 3 km, [[Bivio]], 8 km, [[Rocca]].\nEttore, Lena are now in Osteria, in Strada vecchia; the journey goes on from there.",
        );
        expect(await ok("show", "Lena")).toContain("Is in: Osteria › Strada vecchia");
        expect(await ok("route", "Rocca")).toContain("Osteria → Bivio → Rocca, 11 km by Strada vecchia.");
        expect(await ok("travel", "Rocca")).toContain("Arrived at day 3, 12:27: now in Rocca.");
    });

    it("TRV-14: stopped on a stretch under 200 m, the place splits it to the metre, never at an end", async () => {
        await ok("write", "Agguato", "--type", "event", "--set", "date=day 3, 10:00");
        await ok("travel", "Rocca");
        // The first stretch made short by hand, the journey halfway along it.
        const road = join(folder, "world", "places", "Strada vecchia.md");
        writeFileSync(road, readFileSync(road, "utf8").replace("12 km", "60 m"));
        const state = join(folder, "state.yaml");
        writeFileSync(state, readFileSync(state, "utf8").replace(/done: .*/, "done: 30 m"));
        expect(await ok("write", "Osteria", "--type", "place", "--here")).toContain("Osteria is now a stop of Strada vecchia: [[Guadoscuro]], 30 m, [[Osteria]], 30 m, [[Bivio]]");
    });

    it("TRV-14: stopped in the open, the new place takes the point, in the region that covers it; without a journey stopped, here is refused", async () => {
        await placeTheMap();
        expect(await refused("write", "Accampamento", "--type", "place", "--here")).toContain("here is where a journey stopped, on a road or in the open, and none did");
        await ok("write", "Tempesta", "--type", "event", "--set", "date=day 3, 11:00");
        expect(await ok("travel", "Torre", "--across")).toContain(
            "Stopped in Brughiera, 2.9 km south-west of Torre, at day 3, 11:00: an event came due, below. 2.9 km left to Torre, 1h 18m of travel. 5h of travel left today. To go on: travel to Torre, across.\n"
                + "In Brughiera, terrain difficult.\nNear: Torre, 2.9 km north-east.\nNo place is written here",
        );
        expect(await ok("status")).toContain("Journey: to Torre, in Brughiera, 2.9 km south-west of Torre; 3h of travel since the last rest. To go on: travel to Torre, across.");
        expect(await ok("write", "Accampamento", "--type", "place", "--here")).toContain("Ettore, Lena are now in Accampamento, in Brughiera; the journey goes on from there.");
        expect(page("places/Accampamento.md")).toBe('---\nposition: 9.75 km E, 8.12 km N\ncontains:\n  - "[[Ettore]]"\n  - "[[Lena]]"\n---\n');
        expect(page("places/Brughiera.md")).toContain('contains:\n  - "[[Accampamento]]"');
        expect(await ok("travel", "Torre", "--across")).toContain("straight from Accampamento to Torre, 2.9 km through Brughiera (2.9 km); 1h 18m of travel.\nArrived at day 3, 12:18: now in Torre.");
    });
});

describe("move and journeys (TRV-15)", () => {
    it("TRV-15: move between two stops says that a journey goes with travel", async () => {
        expect(await ok("move", "Ettore", "Lena", "--to", "Rocca")).toContain(
            "Guadoscuro and Rocca are joined by roads: a journey goes with travel, which lets the time pass and moves them stop by stop (route to Rocca says how long). If the time has passed already, advance it.",
        );
        expect(await ok("move", "Ettore", "--to", "Rocca")).not.toContain("joined by roads");
    });
});

describe("the world map as the character knows it (VIEW-7, D-316, D-318)", () => {
    it("REV-3: reveal says when a place the character now knows has no point on the map, and from which place to give it one, as a found map brings (D-319)", async () => {
        await placeTheMap();
        await ok("write", "Fonte", "--type", "place");
        await ok("write", "Cantina", "--type", "place");
        await ok("write", "Guadoscuro", "--add", "contains=[[Cantina]]");
        // The cellar is in Guadoscuro, drawn on the map; Rocca has its own point; a road is drawn by its stops; the spring has none.
        expect(await ok("reveal", "Fonte", "Cantina", "Rocca", "Strada vecchia")).toBe(
            'Ettore now knows Fonte, Cantina, Rocca, Strada vecchia. Fonte has no position, so the map does not show it yet: give one from a place that has one, such as write Fonte, set position="12 km NE of [[Guadoscuro]]".',
        );
        expect(await ok("reveal", "Cantina", "--to", "Lena")).toBe("Lena now knows Cantina.");
    });

    it("POS-7: write reminds a kind when a place first comes on the map without one, and a biome when a place becomes a region without one", async () => {
        expect(await ok("write", "Rocca", "--set", "position=20 km E of [[Guadoscuro]]", "--set", "kind=castle")).not.toContain("give Rocca a kind");
        expect(await ok("write", "Torre", "--type", "place", "--set", "position=10 km N of [[Bivio]]")).toContain("give Torre a kind, as set kind=village:");
        expect(await ok("write", "Torre", "--set", "position=11 km N of [[Bivio]]")).not.toContain("a kind");
        // A region is an area: a biome, never a kind.
        const region = await ok("write", "Brughiera", "--type", "place", "--set", "position=8 km NNE of [[Bivio]]", "--set", "radius=6 km");
        expect(region).not.toContain("a kind");
        expect(region).toContain('For the map, give Brughiera\'s environment a biome, as add environment="biome: forest": forest, swamp, moor, hills, mountains, plains, desert, snow, water; what it holds shares it.');
        expect(await ok("write", "Palude", "--type", "place", "--set", "position=5 km S of [[Rocca]]", "--set", "radius=3 km", "--add", "environment=biome: swamp")).not.toContain("a biome");
    });

    it("gives the places and regions it knows, nearest first, with kind, biome and where they are; a road through a stop it does not know as a point without a name", async () => {
        await placeTheMap();
        await ok("write", "Guadoscuro", "--set", "kind=village");
        await ok("write", "Brughiera", "--add", "environment=biome: moor");
        await ok("write", "Ettore", "--add", "knows=[[Rocca]]", "--add", "knows=[[Strada vecchia]]", "--add", "knows=[[Brughiera]]");
        const map = JSON.parse(await ok("view", "--map", "--json"));
        expect(map.places.map((place: { name: string; }) => place.name)).toEqual(["Guadoscuro", "Brughiera", "Rocca", "Locanda"]);
        expect(map.places[0]).toEqual({ name: "Guadoscuro", kind: "village", x: 0, y: 0, within: [], from: { km: 0 } });
        // Where a place is from the party, as data the page writes in its language (D-403): English here.
        expect(map.places[2].from).toEqual({ km: 20, direction: "east" });
        expect([map.places[0], map.places[2]].map((place) => fromLabel(place.from, (km) => `${km} km`))).toEqual(["Here", "20 km east"]);
        expect(map.places[1]).toMatchObject({ name: "Brughiera", radius: 6, biome: "moor", terrain: "difficult" });
        // The Locanda has no point of its own: it is drawn in Guadoscuro.
        expect(map.places[3]).toEqual({ name: "Locanda", within: ["Guadoscuro"] });
        expect(map.roads).toEqual([{ name: "Strada vecchia", kind: "road", points: [{ name: "Guadoscuro", x: 0, y: 0, km: 0 }, { x: 12, y: 0, km: 12 }, { name: "Rocca", x: 20, y: 0, km: 8 }] }]);
        expect(map.party).toEqual({ x: 0, y: 0, place: "Guadoscuro" });
        expect(JSON.stringify(map)).not.toMatch(/Bivio|Torre/);
        expect(await ok("view", "--map")).toBe(
            [
                "Places on the map, nearest first, from where the party is (Guadoscuro):",
                "- Guadoscuro (village): here",
                "- Rocca: 20 km east",
                "Regions: Brughiera (moor).",
            ].join("\n"),
        );
        expect((await rpg("view", "Rocca", "--map")).output).toBe("Give map alone: it is the world map, apart from the page, the diary and the rolls.");
        // Below a km or a mile, in metres or feet, a system without its own foot counting the true one, in the chat and on the page alike (D-403).
        await ok("write", "Fonte", "--type", "place", "--set", "position=60 m N of [[Guadoscuro]]");
        await ok("write", "Ettore", "--add", "knows=[[Fonte]]");
        const near = JSON.parse(await ok("view", "--map", "--json"));
        const fonte = near.places.find((place: { name: string; }) => place.name === "Fonte");
        expect(await ok("view", "--map")).toContain("- Fonte: 60 m north");
        expect(fromLabel(fonte.from, (km) => lengthText(km, near.unit))).toBe("60 m north");
        await ok("config", "units", "imperial");
        const imperial = JSON.parse(await ok("view", "--map", "--json"));
        expect(await ok("view", "--map")).toContain("- Fonte: 197 feet north");
        expect(fromLabel(imperial.places.find((place: { name: string; }) => place.name === "Fonte").from, (km) => lengthText(km, imperial.unit))).toBe("197 feet north");
    });

    it("draws a known road only up to its last known stop, with a beginning toward the next; the trail goes along the roads it took", async () => {
        await placeTheMap();
        await ok("write", "Ettore", "--add", "knows=[[Strada vecchia]]");
        let map = JSON.parse(await ok("view", "--map", "--json"));
        // Neither Bivio nor Rocca is known: 3 km of the road toward Bivio, no more.
        expect(map.roads).toEqual([{ name: "Strada vecchia", kind: "road", points: [{ name: "Guadoscuro", x: 0, y: 0, km: 0 }], after: { x: 3, y: 0 } }]);
        expect(JSON.stringify(map)).not.toMatch(/Bivio|Rocca/);
        expect(map.trail).toEqual([]);
        await ok("travel", "Rocca");
        map = JSON.parse(await ok("view", "--map", "--json"));
        expect(map.trail).toEqual([{ x: 0, y: 0 }, { x: 12, y: 0 }, { x: 20, y: 0 }]);
        expect(map.party).toEqual({ x: 20, y: 0, place: "Rocca" });
    });

    it("leaves out of the trail a place that has no point but its region's: the party was somewhere in it, not at its centre", async () => {
        await placeTheMap();
        await ok("write", "Cerchio", "--type", "place");
        await ok("write", "Brughiera", "--add", "contains=[[Cerchio]]");
        await ok("move", "Ettore", "--to", "Cerchio");
        await ok("move", "Ettore", "--to", "Guadoscuro");
        expect(JSON.parse(await ok("view", "--map", "--json")).trail).toEqual([{ x: 0, y: 0 }]);
    });
});

describe("the maps (POS-8, ROA-8, D-320)", () => {
    // Under the main map, the Sottosuolo: the city 3 km south of Guadoscuro, in caverns that lie right under the meadows around Guadoscuro.
    async function underground(): Promise<void>
    {
        await placeTheMap();
        await ok("write", "Prati", "--type", "place", "--set", "position=0 km E, 0 km N", "--set", "radius=6 km", "--add", "environment=terrain: difficult", "--add", "contains=[[Guadoscuro]]");
        await ok("write", "Sottosuolo", "--type", "place", "--set", "map=under [[Guadoscuro]]");
        await ok("write", "Caverne", "--type", "place");
        await ok("write", "Sottosuolo", "--add", "contains=[[Caverne]]");
        await ok("write", "Caverne", "--set", "position=3 km S of [[Guadoscuro]]", "--set", "radius=6 km");
        await ok("write", "Città", "--type", "place");
        await ok("write", "Caverne", "--add", "contains=[[Città]]");
        await ok("write", "Città", "--set", "position=3 km S of [[Guadoscuro]]");
    }

    it("POS-8: a map of its own has its own centre, and positions come from places of one map's coordinates; a place nothing holds is told where to go", async () => {
        await placeTheMap();
        await ok("write", "Inferi", "--type", "place", "--set", "map=own");
        await ok("write", "Dite", "--type", "place");
        await ok("write", "Stige", "--type", "place");
        await ok("write", "Inferi", "--add", "contains=[[Dite]]", "--add", "contains=[[Stige]]");
        expect(await ok("write", "Stige", "--set", "position=5 km N of [[Dite]]")).toContain("Dite is now the centre of the map, at 0 km E, 0 km N");
        expect(await refused("write", "Stige", "--set", "position=5 km N of [[Rocca]]")).toBe(
            "Stige is on the map of Inferi, Rocca on the main map: give its position from a place of its map, or of one with the same coordinates. Nothing changed.",
        );
        expect(await ok("write", "Fiume ardente", "--type", "place", "--set", "position=2 km E of [[Stige]]")).toContain(
            "Fiume ardente has its position on the map of Inferi, but nothing holds it there yet: put it in, such as write Inferi, add contains=[[Fiume ardente]].",
        );
        expect(await refused("write", "Dite", "--set", "map=sotto [[Guadoscuro]]")).toContain('"map" must be own, for coordinates of its own, or under [[Place]] or mirror of [[Place]]');
    });

    it("POS-8, TRV-12: off the roads under the map, the regions are the map's own, and the journey keeps the map it stopped on; across country one stays on one map", async () => {
        await underground();
        await ok("move", "Ettore", "Lena", "--to", "Città");
        const output = await ok("travel", "--toward", "east", "--distance", "2 km");
        // The caverns, not the meadows above them.
        expect(output).toContain("In Caverne.");
        expect(output).not.toContain("Prati");
        expect(state()).toContain('map: "[[Sottosuolo]]"');
        expect(await ok("status")).toContain("in Caverne");
        expect(await refused("travel", "Rocca", "--across")).toBe(
            "Rocca is on the main map, Ettore on the map of Sottosuolo: across country one stays on one map. Go through a passage, a road of kind portal, or move them. Nothing changed.",
        );
    });

    it("ROA-8: a passage joins two maps, the journey says it goes through it; another road between maps is a problem", async () => {
        await underground();
        await ok("write", "Scala del Drago", "--type", "place", "--set", "kind=portal", "--set", "stops=[[Guadoscuro]], 500 m, [[Città]]");
        expect(await ok("travel", "Città")).toContain("The way goes through Scala del Drago, a passage to another map: read its page for when and how it opens.");
        expect(await ok("validate")).not.toContain("Scala del Drago");
        await ok("write", "Galleria", "--type", "place", "--set", "stops=[[Rocca]], 4 km, [[Città]]");
        expect(await ok("validate")).toContain("Galleria joins places of different maps, as only a passage does.");
    });

    it("VIEW-7: the maps the character knows, each place and point with its map, the distance from the party only on its map", async () => {
        await underground();
        await ok("write", "Scala del Drago", "--type", "place", "--set", "kind=portal", "--set", "stops=[[Guadoscuro]], 500 m, [[Città]]");
        await ok("reveal", "Sottosuolo", "Città", "Scala del Drago");
        const map = JSON.parse(await ok("view", "--map", "--json"));
        expect(map.maps).toEqual([{ name: "Valle", main: true }, { name: "Sottosuolo", under: "Valle" }]);
        expect(map.places.find((place: { name: string; }) => place.name === "Città")).toEqual({ name: "Città", x: 0, y: -3, map: "Sottosuolo", within: ["Sottosuolo"] });
        expect(map.roads.find((road: { name: string; }) => road.name === "Scala del Drago").points).toEqual([{ name: "Guadoscuro", x: 0, y: 0, km: 0 }, { name: "Città", x: 0, y: -3, map: "Sottosuolo", km: 0.5 }]);
        expect(await ok("view", "--map")).toContain("On the map of Sottosuolo: Città.");
    });
});
