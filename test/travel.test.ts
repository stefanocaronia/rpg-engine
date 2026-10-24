// Roads and travel (MECCANICHE, ROA-1–ROA-7, TRV-1–TRV-11): the cases of the table, through the commands.
import fc from "fast-check";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { runCommandLine } from "../src/command-line.ts";
import type { Context } from "../src/core/context.ts";
import { readDuration } from "../src/time/index.ts";
import { inPlay, makeTempFolder, readLogFile, removeFolder, testContext } from "./support.ts";

let folder: string;
let context: Context;

// Guadoscuro –12– Bivio –8– Ponte; Bivio –24– Rocca; Ponte –30, difficult– Rocca; Rocca –50– Capitale; Ponte ≈18, river≈ Porto. Ettore and Lena at the Locanda.
beforeEach(async () => {
    folder = makeTempFolder();
    context = testContext(folder);
    await runCommandLine(["init", "--name", "Valle", "--language", "it", "--system", "5e", "--difficulty", "normal", "--lethality", "dice"], context);
    inPlay(folder);
    await ok("write", "Ettore", "--type", "character", "--set", "role=pc");
    await ok("write", "Lena", "--type", "character", "--set", "role=companion");
    await ok("write", "Locanda", "--type", "place", "--add", "contains=[[Ettore]]", "--add", "contains=[[Lena]]");
    await ok("write", "Guadoscuro", "--type", "place", "--add", "contains=[[Locanda]]");

    for (const place of ["Bivio", "Ponte", "Rocca", "Capitale", "Porto"]) {
        await ok("write", place, "--type", "place");
    }

    await ok("write", "Strada vecchia", "--type", "place", "--set", "stops=[[Guadoscuro]], 12 km, [[Bivio]], 8 km, [[Ponte]]");
    await ok("write", "Sentiero dei colli", "--type", "place", "--set", "stops=[[Bivio]], 24 km, [[Rocca]]");
    await ok("write", "Mulattiera", "--type", "place", "--set", "stops=[[Ponte]], 30 km, [[Rocca]]", "--add", "environment=terrain: difficult");
    await ok("write", "Via del Re", "--type", "place", "--set", "stops=[[Rocca]], 50 km, [[Capitale]]");
    await ok("write", "Fiume Nero", "--type", "place", "--set", "kind=river", "--set", "stops=[[Ponte]], 18 km, [[Porto]]");
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

function state(): string
{
    return readFileSync(join(folder, "state.yaml"), "utf8");
}

describe("roads (ROA-1–ROA-7)", () => {
    it("ROA-1, ROA-6: write takes stops from the command line, split at the commas, and refuses what does not read, with the reason", async () => {
        expect(readFileSync(join(folder, "world/places/Strada vecchia.md"), "utf8")).toBe('---\nstops:\n  - "[[Guadoscuro]]"\n  - 12 km\n  - "[[Bivio]]"\n  - 8 km\n  - "[[Ponte]]"\n---\n');
        expect(await refused("write", "Strada nuova", "--type", "place", "--set", "stops=[[Guadoscuro]], 5 miles, [[Rocca]]")).toContain(
            '"stops" has "5 miles" where the length of a stretch goes: write in km or m, such as 8 km, 1.5 km or 500 m',
        );
        expect(await refused("write", "Strada nuova", "--type", "place", "--set", "stops=[[Guadoscuro]], 5 km")).toContain("must start and end with a stop");
    });

    it("ROA-4, ROA-7: validate reports a stop that is not a place, and a missing one, whose stretches lead nowhere", async () => {
        await ok("write", "Strada storta", "--type", "place", "--set", "stops=[[Ettore]], 2 km, [[Nessuno]], 3 km, [[Rocca]]");
        const output = await ok("validate");
        expect(output).toContain("Strada storta has Ettore among its stops, but it is a character, not a place of the campaign: the stretches to it lead nowhere.");
        expect(output).toContain("stops links to [[Nessuno]], which does not exist.");
        expect(await ok("route", "Rocca", "--from", "Ponte")).toContain("Ponte → Bivio → Rocca");
    });
});

describe("rpg route (TRV-4, TRV-5)", () => {
    it("TRV-5: the quickest way from where the party is, by its roads, with the distance and the time at the game's pace", async () => {
        expect(await ok("route", "Rocca")).toBe("Guadoscuro → Bivio → Rocca, 36 km by Strada vecchia (12 km) and Sentiero dei colli (24 km).\nAt a normal pace (4.5 km an hour): 8h of travel.");
    });

    it("TRV-1, TRV-5: another pace or a speed, from another place, in days at the day's hours", async () => {
        expect(await ok("route", "Capitale", "--from", "Bivio", "--pace", "slow")).toBe(
            "Bivio → Rocca → Capitale, 74 km by Sentiero dei colli (24 km) and Via del Re (50 km).\nAt a slow pace (3 km an hour): 24h 40m of travel, 4 days at 8 h a day.",
        );
        expect(await ok("route", "Capitale", "--from", "Rocca", "--pace", "5 km")).toBe("Rocca → Capitale, 50 km by Via del Re.\nAt 5 km an hour: 10h of travel, 2 days at 8 h a day.");
        expect(await refused("route", "Rocca", "--pace", "di corsa")).toContain('"di corsa" is not a pace: give one of the paces of the game (fast, normal, slow) or the distance of an hour in metric');
    });

    it("TRV-3, TRV-4: difficult terrain halves a pace, so the quickest way may be the longer one", async () => {
        expect(await ok("route", "Rocca", "--from", "Ponte")).toBe("Ponte → Bivio → Rocca, 32 km by Strada vecchia (8 km) and Sentiero dei colli (24 km).\nAt a normal pace (4.5 km an hour): 7h 7m of travel.");
        await ok("write", "Mulattiera", "--remove", "environment=terrain");
        expect(await ok("route", "Rocca", "--from", "Ponte")).toBe("Ponte → Rocca, 30 km by Mulattiera.\nAt a normal pace (4.5 km an hour): 6h 40m of travel.");
    });

    it("TRV-3: the terrain of a region around the road counts, as its environment does", async () => {
        await ok("write", "Brughiera", "--type", "place", "--add", "environment=terrain: difficult", "--add", "contains=[[Via del Re]]");
        expect(await ok("route", "Capitale", "--from", "Rocca")).toContain("At a normal pace (4.5 km an hour): 22h 13m of travel, 3 days at 8 h a day.");
    });

    it("D-262: in imperial, with the game's mile", async () => {
        await ok("config", "units", "imperial");
        expect(await ok("route", "Rocca")).toBe("Guadoscuro → Bivio → Rocca, 24 miles by Strada vecchia (8 miles) and Sentiero dei colli (16 miles).\nAt a normal pace (3 miles an hour): 8h of travel.");
    });

    it("ROA-5: one spot needs no road; a place no road reaches says how to make one", async () => {
        await ok("write", "Cappella", "--type", "place");
        await ok("write", "Guadoscuro", "--add", "contains=[[Cappella]]");
        expect(await ok("route", "Cappella")).toBe("Ettore and Cappella are one spot for a journey, in Guadoscuro: no road to travel, move is enough.");
        await ok("write", "Torre", "--type", "place");
        expect(await ok("route", "Torre")).toContain("No road reaches Torre: none of Torre is a stop of a road. Write one, a place with stops");
    });

    it("TRV-4: a way only by river says so, on foot", async () => {
        expect(await ok("route", "Porto")).toBe(
            "No way leads to Porto on foot: the roads that join them include Fiume Nero, a river travelled only in a vehicle with category waterborne vehicle, such as an item that derives from [[Galley]], which brings it with its speed.",
        );
    });
});

describe("rpg travel (TRV-6–TRV-11)", () => {
    it("TRV-7, TRV-11: on arrival the party is in the destination, the time has passed, and the log has each step", async () => {
        const output = await ok("travel", "Rocca");
        expect(output).toBe(
            "Ettore and Lena travel to Rocca, at a normal pace (4.5 km an hour): Guadoscuro → Bivio → Rocca, 36 km by Strada vecchia (12 km) and Sentiero dei colli (24 km).\n"
                + "Passed Bivio (day 3, 10:40).\nArrived at day 3, 16:00: now in Rocca.",
        );
        expect(await ok("show", "Lena")).toContain("Is in: Rocca");
        const lines = readLogFile(folder).filter((entry) => ["moved", "time-advanced"].includes(entry.type)).map((entry) => `${entry.type} ${JSON.stringify(entry.data)}`);
        expect(lines.slice(-6)).toEqual([
            'moved {"pages":["Ettore","Lena"],"from":{"Ettore":"Locanda","Lena":"Locanda"},"to":"Strada vecchia"}',
            'time-advanced {"from":"day 3, 08:00","to":"day 3, 10:40","requested":"2h 40m","why":"travel to Rocca"}',
            'moved {"pages":["Ettore","Lena"],"from":{"Ettore":"Strada vecchia","Lena":"Strada vecchia"},"to":"Bivio"}',
            'moved {"pages":["Ettore","Lena"],"from":{"Ettore":"Bivio","Lena":"Bivio"},"to":"Sentiero dei colli"}',
            'time-advanced {"from":"day 3, 10:40","to":"day 3, 16:00","requested":"5h 20m","why":"travel to Rocca"}',
            'moved {"pages":["Ettore","Lena"],"from":{"Ettore":"Sentiero dei colli","Lena":"Sentiero dei colli"},"to":"Rocca"}',
        ]);
    });

    it("TRV-7, TRV-9: an event at a stop stops the journey there, one at a date stops it on the road; travel again goes on from there", async () => {
        await ok("write", "Il mercante", "--type", "event", "--set", "when=party in [[Bivio]]");
        await ok("write", "Agguato", "--type", "event", "--set", "date=day 3, 13:00");
        expect(await ok("travel", "Capitale")).toContain(
            "Stopped at Bivio at day 3, 10:40: an event came due, below. 74 km left to Capitale, 16h 27m of travel, 3 days at 8 h a day. 5h 20m of travel left today. To go on: travel to Capitale.\nNow due: Il mercante (day 3, 10:40), since party in Bivio.",
        );
        expect(await ok("travel", "Capitale")).toContain(
            "Stopped on Sentiero dei colli, 10.5 km past Bivio, toward Rocca, at day 3, 13:00: an event came due, below. 63.5 km left to Capitale, 14h 7m of travel, 2 days at 8 h a day. 3h of travel left today.",
        );
        expect(state()).toContain(
            'journey:\n  who:\n    - "[[Ettore]]"\n    - "[[Lena]]"\n  to: "[[Capitale]]"\n  road: "[[Sentiero dei colli]]"\n  stretch: 1\n  from: "[[Bivio]]"\n  toward: "[[Rocca]]"\n  done: 10500 m\n  pace: normal\n  last: day 3, 13:00\n  travelled: 5h\n',
        );
        expect(await ok("status")).toContain("Journey: to Capitale, on Sentiero dei colli, 10.5 km past Bivio, toward Rocca; 5h of travel since the last rest. To go on: travel to Capitale.");
        expect(await ok("route", "Guadoscuro")).toContain("Sentiero dei colli, 10.5 km past Bivio → Bivio → Guadoscuro, 22.5 km");
        expect(await ok("travel", "Capitale")).toContain("Sentiero dei colli, 10.5 km past Bivio → Rocca → Capitale, 63.5 km");
    });

    it("TRV-8: at the end of the day's hours the journey stops, says to camp or march on, and goes on the next day; hours march on today", async () => {
        await ok("travel", "Capitale");
        expect(await ok("travel", "Capitale")).toContain(
            "They already travelled 8h today, the day's 8 h: camp for the night, or go on with hours, such as hours 10 (beyond 8 h: rules Forced March). Nothing changed.",
        );
        await ok("advance", "--to", "day 4, 07:00");
        expect(await ok("travel", "Capitale")).toContain(
            "Stopped on Via del Re, 36 km past Rocca, toward Capitale, at day 4, 15:00, after 8h of travel today: camp for the night, or go on with hours, such as hours 10 (beyond 8 h: rules Forced March). 14 km left to Capitale, 3h 7m of travel.",
        );
        expect(await ok("travel", "Capitale", "--hours", "12")).toContain("Arrived at day 4, 18:07: now in Capitale.");
        expect(await ok("status")).not.toContain("Journey:");
    });

    it("TRV-2, TRV-6: in a boat on a river, the boat travels with those aboard, at its speed and the current's downstream; upstream at its speed", async () => {
        await ok("write", "Chiatta", "--type", "item", "--set", "item=[[Keelboat]]");
        await ok("move", "Chiatta", "--to", "Ponte");
        await ok("move", "Ettore", "Lena", "--to", "Chiatta");
        expect(await ok("travel", "Porto")).toBe("Ettore and Lena travel to Porto, in Chiatta, at its speed: Ponte → Porto, 18 km by Fiume Nero.\nArrived at day 3, 11:00: now in Porto.");
        expect(await ok("show", "Ettore")).toContain("Is in: Chiatta › Porto");
        expect(await ok("route", "Ponte")).toBe("Porto → Ponte, 18 km by Fiume Nero.\nIn Chiatta, at its speed: 12h of travel.");
        expect(await ok("route", "Rocca")).toContain("No way leads to Rocca in Chiatta: the roads that join them include Mulattiera, a road");
    });

    it("TRV-6: some on a cart and some on foot go together at the pace of who walks, the cart with those aboard (playtest 05)", async () => {
        await ok("write", "Carro", "--type", "item", "--set", "item=[[Cart]]");
        await ok("write", "Locanda", "--add", "contains=[[Carro]]");
        const walking = await ok("route", "Rocca");
        await ok("move", "Lena", "--to", "Carro");
        expect(await ok("route", "Rocca")).toBe(walking);
        expect(await ok("travel", "Rocca")).toContain("Ettore and Lena travel to Rocca, at a normal pace");
        expect(await ok("show", "Lena")).toContain("Is in: Carro › Rocca");
        expect(await ok("show", "Ettore")).toContain("Is in: Rocca");
    });

    it("TRV-6: a mixed party stopped in the open goes on together, and who rides in what a traveller carries stays with them", async () => {
        await ok("write", "Carro", "--type", "item", "--set", "item=[[Cart]]");
        await ok("write", "Locanda", "--add", "contains=[[Carro]]");
        await ok("move", "Lena", "--to", "Carro");
        await ok("write", "Rocca", "--set", "position=20 km E of [[Guadoscuro]]");
        await ok("travel", "--toward", "west");
        await ok("advance", "--by", "10h");
        expect(await ok("travel", "--toward", "west", "--distance", "9 km")).toContain("Ettore and Lena travel west");
        await ok("write", "Gatto", "--type", "character", "--set", "role=companion");
        await ok("write", "Zaino", "--type", "item", "--set", "item=[[Backpack]]", "--add", "contains=[[Gatto]]");
        await ok("write", "Ettore", "--add", "inventory=[[Zaino]]");
        expect(await ok("route", "Guadoscuro", "--across")).not.toContain("Zaino");
        await ok("travel", "Guadoscuro", "--across");
        expect(await ok("show", "Gatto")).toContain("Is in: Zaino › Ettore");
    });

    it("TRV-6: some aboard a boat and some not, or a scene other than travel, are refused before anything changes", async () => {
        await ok("write", "Chiatta", "--type", "item", "--set", "item=[[Keelboat]]");
        await ok("write", "Locanda", "--add", "contains=[[Chiatta]]");
        await ok("move", "Lena", "--to", "Chiatta");
        expect(await refused("travel", "Rocca")).toBe(
            "Lena is in Chiatta, which goes only on the kinds of road made for it, and the others are not: move them all into it, or all out of it. Nothing changed.",
        );
        await ok("move", "Lena", "--to", "Locanda");
        await ok("scene", "open", "--title", "Rissa", "--type", "combat", "--place", "Locanda");
        expect(await refused("travel", "Rocca")).toBe("A combat scene is open, Rissa: close it before the journey, or open a travel scene. Nothing changed.");
    });

    it("TRV-9: a party moved onto a road by hand has no place along it, and travel says what to give", async () => {
        await ok("move", "Ettore", "Lena", "--to", "Sentiero dei colli");
        expect(await refused("travel", "Rocca")).toBe("Ettore is on Sentiero dei colli, but no journey says where along it: move them to the stop they last passed or the nearest one (Bivio, Rocca). Nothing changed.");
    });

    it("TRV-6: who without the player character where the travellers start says the character stays (playtest 05)", async () => {
        expect(await ok("travel", "Bivio", "--who", "Lena")).toContain("Ettore stays in Locanda: who replaces the party; to go together, leave who out, or name the party too.");
    });

    it("TRV-6: who names the travellers, a hireling too, and leaves the others where they are", async () => {
        await ok("write", "Bruno", "--type", "character", "--set", "role=npc");
        await ok("write", "Locanda", "--add", "contains=[[Bruno]]");
        expect(await ok("travel", "Bivio", "--who", "Ettore", "--who", "Bruno")).toContain("Ettore and Bruno travel to Bivio");
        expect(await ok("show", "Lena")).toContain("Is in: Locanda › Guadoscuro");
        expect(await ok("show", "Bruno")).toContain("Is in: Bivio");
    });
});

describe("what a review found (TRV-7–TRV-9)", () => {
    it("TRV-7: an event due right as the party reaches a stop stops the journey there, and is said", async () => {
        await ok("write", "Agguato", "--type", "event", "--set", "date=day 3, 10:40");
        const output = await ok("travel", "Rocca");
        expect(output).toContain("Stopped at Bivio at day 3, 10:40: an event came due, below.");
        expect(output).toContain("Due: Agguato (day 3, 10:40).");
    });

    it("TRV-8: the hours of travel start again only after a night's rest, not at midnight; hours given hold until then; fewer hours are no forced march", async () => {
        await ok("advance", "--to", "day 3, 18:00");
        expect(await ok("travel", "Capitale")).toContain("at day 4, 02:00, after 8h of travel today");
        expect(await ok("travel", "Capitale")).toContain("They already travelled 8h today, the day's 8 h");
        await ok("advance", "--to", "day 4, 10:00");
        expect(await ok("travel", "Capitale", "--hours", "1")).toContain("after 1h of travel today: camp for the night, or go on with hours, such as hours 3.");
        await ok("advance", "--by", "1h");
        expect(await ok("travel", "Capitale")).toContain("They already travelled 1h today, the day's 1 h");
    });

    it("TRV-9: one journey at a time: another group cannot travel while the party is stopped on a road", async () => {
        await ok("write", "Agguato", "--type", "event", "--set", "date=day 3, 09:00");
        await ok("travel", "Rocca");
        await ok("write", "Bruna", "--type", "character", "--set", "role=npc");
        await ok("write", "Bivio", "--add", "contains=[[Bruna]]");
        expect(await refused("travel", "Ponte", "--who", "Bruna")).toBe(
            "Ettore, Lena stopped on a journey between places, and rpg keeps one journey at a time: move Bruna with move, or bring that journey to a place first. Nothing changed.",
        );
        expect(await ok("travel", "Rocca")).toContain("Arrived");
    });

    it("TRV-9: on a road through the same two stops twice, the journey goes on from the right stretch", async () => {
        await ok("write", "Cappio", "--type", "place", "--set", "stops=[[Bivio]], 9 km, [[Ponte]], 4.5 km, [[Bivio]]");
        await ok("move", "Ettore", "Lena", "--to", "Ponte");
        await ok("write", "Sosta", "--type", "event", "--set", "date=day 3, 08:30");
        expect(await ok("travel", "Bivio")).toContain("Stopped on Cappio, 2.3 km past Ponte, toward Bivio, at day 3, 08:30");
        expect(await ok("route", "Bivio")).toContain("Cappio, 2.3 km past Ponte → Bivio, 2.3 km by Cappio.");
    });
});

describe("the laws of travel (TRV-7–TRV-9)", () => {
    it("TRV-7–TRV-9: travelling day by day arrives where one journey would, after the same stops, with the time of each stretch passed once", async () => {
        await fc.assert(
            fc.asyncProperty(fc.array(fc.integer({ min: 1, max: 40 }), { minLength: 1, maxLength: 4 }), fc.integer({ min: 2, max: 12 }), async (lengths, hours) => {
                const run = makeTempFolder();

                try {
                    const runContext = testContext(run);

                    const call = async (...args: string[]): Promise<string> => {
                        const result = await runCommandLine(args, runContext);
                        expect(result.exitCode, result.output).toBe(0);
                        return result.output;
                    };

                    await call("init", "--name", "Legge", "--system", "5e");
                    inPlay(run);
                    const stops = lengths.map((_, index) => `T${index + 1}`);
                    writeFileSync(join(run, "world/characters/Ettore.md"), "---\nrole: pc\n---\n");
                    writeFileSync(join(run, "world/places/T0.md"), '---\ncontains:\n  - "[[Ettore]]"\n---\n');
                    stops.forEach((stop) => writeFileSync(join(run, `world/places/${stop}.md`), ""));
                    const written = ["[[T0]]", ...lengths.flatMap((length, index) => [`${length} km`, `[[${stops[index]}]]`])].map((item) => `  - "${item}"`).join("\n");
                    writeFileSync(join(run, "world/places/Strada.md"), `---\nstops:\n${written}\n---\n`);
                    await call("advance", "--to", "day 1, 06:00");
                    const last = stops.at(-1) as string;
                    const passed: string[] = [];

                    for (let day = 1; day < 40; day++) {
                        const output = await call("travel", last, "--hours", String(hours));
                        passed.push(...[...output.matchAll(/(T\d+) \(day/g)].map((match) => match[1]));

                        if (output.includes("Arrived")) {
                            break;
                        }

                        passed.push(...[...output.matchAll(/Stopped at (T\d+) at/g)].map((match) => match[1]));
                        await call("advance", "--to", `day ${day + 1}, 06:00`);
                    }

                    const minutes = readLogFile(run).filter((entry) => entry.type === "time-advanced" && entry.data.why === `travel to ${last}`).map((entry) => readDuration(String(entry.data.requested)) ?? 0);
                    const exact = lengths.map((length) => (length * 60) / 4.5);
                    expect([...new Set(passed)]).toEqual(stops.slice(0, -1));
                    expect(Math.abs(minutes.reduce((sum, value) => sum + value, 0) - exact.reduce((sum, value) => sum + value, 0))).toBeLessThanOrEqual(minutes.length);
                    expect(await call("show", "Ettore")).toContain(`Is in: ${last}`);
                } finally {
                    removeFolder(run);
                }
            }),
            { numRuns: 8 },
        );
    }, 300000);
});

describe("a system without paces (TRV-1)", () => {
    it("TRV-1: travel asks for a speed", async () => {
        await ok("config", "system", "ironsworn");
        expect(await refused("travel", "Rocca")).toContain("The game system gives no pace for travel: give pace as the distance of an hour in metric, such as 4.5 km or 4.5 km/h.");
        expect(await ok("route", "Rocca", "--pace", "4 km")).toBe("Guadoscuro → Bivio → Rocca, 36 km by Strada vecchia (12 km) and Sentiero dei colli (24 km).\nAt 4 km an hour: 9h of travel, 2 days at 8 h a day.");
    });
});
