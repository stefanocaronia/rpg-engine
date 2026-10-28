// The laws of planned events (MECCANICHE, EVT-1–EVT-4), checked on thousands of worlds made at random, against a model written another way (D-118).
import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { eventsToFire, isDue, plannedEvents, worldFacts } from "../src/commands/game/events.ts";
import type { Page, World } from "../src/pages/index.ts";
import { type GameDate, minutesBetween, readGameDate } from "../src/time/index.ts";
import { readTriggers, triggerHolds } from "../src/triggers/index.ts";

const runs = { numRuns: 2000 };
const places = ["Ossario", "Cripta", "Mulino"];
const people: [string, string][] = [["Ennio", "pc"], ["Lena", "companion"], ["Bruno", "npc"], ["Varro", "npc"]];
const items = ["Lanterna", "Diario"];
const events = ["Fuga", "Rogo", "Marcia", "Rito"];
const conditions = [
    "party in [[Ossario]]",
    "party in [[Cripta]]",
    "[[Lanterna]] in party",
    "[[Diario]] in [[Cripta]]",
    "[[Cripta]] in party",
    "[[Varro]] dead",
    "[[Lena]] alive",
    "[[Varro]] in [[Mulino]]",
    "[[Lena]] in party",
    "[[Fuga]] happened",
    "[[Rito]] planned",
    "[[Ossario]] dead",
    "[[Nessuno]] dead",
    "[[Nessuno]] in [[Ossario]]",
    "[[Ossario]] in [[Nessuno]]",
];

/** A world as data: who holds whom, the statuses of characters and places, the fields of the events, and a free page that may share a name. */
interface Spec
{
    holder: Record<string, string | undefined>;
    status: Record<string, string | undefined>;
    event: Record<string, { status?: string; when?: string | string[]; clock?: string; date?: string; }>;
    roleOfItems?: string;
    duplicate?: string;
}

const holderOf = (candidates: string[]): fc.Arbitrary<string | undefined> => fc.option(fc.constantFrom(...candidates), { nil: undefined });
const eventFields = fc.record(
    {
        status: fc.constantFrom("planned", "", "happened", "cancelled"),
        when: fc.oneof(fc.constantFrom(...conditions), fc.subarray(conditions, { maxLength: 3 }), fc.constant("Varro dead")),
        clock: fc.constantFrom("0/2", "1/2", "2/2", "3/2", "0/1", "1/1", "tre", "0/0"),
        date: fc.constantFrom("day 1", "day 1, 18:00", "day 2, 06:00", "day 9", "la prima notte"),
    },
    { requiredKeys: [] },
);
const specs: fc.Arbitrary<Spec> = fc.record({
    places: fc.tuple(fc.constant(undefined), holderOf(places.slice(0, 1)), holderOf(places.slice(0, 2))),
    people: fc.tuple(...people.map(() => holderOf(places))),
    items: fc.tuple(...items.map(() => holderOf([...places, ...people.map(([name]) => name)]))),
    status: fc.tuple(...[...people, ...places].map(() => fc.constantFrom<string | undefined>("alive", "dead", undefined))),
    event: fc.tuple(...events.map(() => eventFields)),
    roleOfItems: fc.option(fc.constant("companion"), { nil: undefined }),
    duplicate: fc.option(fc.constantFrom("Fuga", "Rito", "Lena", "Varro", "Cripta", "Ossario"), { nil: undefined }),
}).map((drawn) => ({
    holder: Object.fromEntries([...places.map((name, index) => [name, drawn.places[index]]), ...people.map(([name], index) => [name, drawn.people[index]]), ...items.map((name, index) => [name, drawn.items[index]])]),
    status: Object.fromEntries([...people.map(([name]) => name), ...places].map((name, index) => [name, drawn.status[index]])),
    event: Object.fromEntries(events.map((name, index) => [name, drawn.event[index]])),
    roleOfItems: drawn.roleOfItems,
    duplicate: drawn.duplicate,
}));

// One change, as a command makes it: someone or something moves where it can be (CON-1), a status changes, or an event's fields do.
const changes = fc.oneof(
    fc.record({ move: fc.constantFrom(...people.map(([name]) => name)), to: holderOf(places) }),
    fc.record({ move: fc.constantFrom(...items), to: holderOf([...places, "Ennio", "Lena"]) }),
    fc.record({ character: fc.constantFrom(...people.map(([name]) => name)), status: fc.constantFrom<string | undefined>("alive", "dead", undefined) }),
    fc.record({ event: fc.constantFrom(...events), fields: eventFields }),
);
const nows = fc.constantFrom<GameDate | undefined>(undefined, { day: 1, minute: 18 * 60 }, { day: 2, minute: 6 * 60 }, { day: 3 });

describe("the laws of planned events, on worlds made at random", () => {
    it("EVT-3: a condition holds as the model says, the party, containers and statuses gathered another way", () => {
        fc.assert(
            fc.property(specs, (spec) => {
                const facts = worldFacts(worldOf(spec));

                for (const text of conditions) {
                    const read = readTriggers(text);
                    expect("triggers" in read && triggerHolds(read.triggers[0], facts), text).toBe(holdsByModel(spec, text));
                }
            }),
            runs,
        );
    });

    it("EVT-1: an event is due when its date has come; without a date it can read, or before the game has one, when its clock is full or a condition holds", () => {
        fc.assert(
            fc.property(specs, nows, (spec, now) => {
                const world = worldOf(spec);
                const facts = worldFacts(world);

                for (const event of plannedEvents(world)) {
                    expect(isDue(event, now, facts), event.page.name).toBe(dueByModel(spec, event.page.name, now));
                }

                expect(plannedEvents(world).map((event) => event.page.name).sort()).toEqual(events.filter((name) => isPlannedByModel(spec, name)).sort());
            }),
            runs,
        );
    });

    it("EVT-4: an event fires once, when a change sets it off and it was neither set off nor due before; a date still to come given by the change waits", () => {
        fc.assert(
            fc.property(specs, changes, nows, (spec, change, now) => {
                const after = applied(spec, change);
                const { fired, held } = eventsToFire(worldOf(spec), worldOf(after), now);
                // Due before, an event already came; set off before with the same date, it waits for that date.
                const cameOrWaits = (name: string): boolean => isPlannedByModel(spec, name) && (dueByModel(spec, name, now) || (setOffByModel(spec, name) && spec.event[name].date === after.event[name].date));
                const comes = events.filter((name) => isUnique(after, name) && isPlannedByModel(after, name) && setOffByModel(after, name) && !cameOrWaits(name));

                const comesLater = (name: string): boolean => {
                    const date = readGameDate(after.event[name].date);
                    return now !== undefined && date !== undefined && minutesBetween(now, date) > 0;
                };

                const waits = comes.filter((name) => comesLater(name) && spec.event[name].date !== after.event[name].date);
                const expected = comes.filter((name) => !waits.includes(name)).map((name) => ({ name, date: now !== undefined && (readGameDate(after.event[name].date) === undefined || comesLater(name)) ? formatted(now) : undefined }));
                expect(fired.map((found) => ({ name: found.event.page.name, date: found.date }))).toEqual(expect.arrayContaining(expected));
                expect(fired).toHaveLength(expected.length);
                expect(held.map((event) => event.page.name).sort()).toEqual(waits.sort());
            }),
            runs,
        );
    });

    it("EVT-4: nothing fires without a change", () => {
        fc.assert(
            fc.property(specs, nows, (spec, now) => {
                expect(eventsToFire(worldOf(spec), worldOf(spec), now)).toEqual({ fired: [], held: [] });
            }),
            runs,
        );
    });

    it("EVT-1, EVT-4: with a game date, a run of changes fires an event at most once while it waits to be played, and once fired it stays due", () => {
        fc.assert(
            fc.property(specs, fc.array(changes, { maxLength: 6 }), nows.filter((now) => now !== undefined), (start, steps, now) => {
                let spec = start;
                const firedOnce = new Set<string>();

                for (const step of steps) {
                    // The run never touches an event's own fields once it fired: only the master playing it would.
                    const next = "event" in step && firedOnce.has(step.event) ? spec : applied(spec, step);
                    const { fired } = eventsToFire(worldOf(spec), worldOf(next), now);
                    spec = next;

                    for (const { event, date } of fired) {
                        expect(firedOnce.has(event.page.name), event.page.name).toBe(false);
                        firedOnce.add(event.page.name);
                        spec = applied(spec, { event: event.page.name, fields: { ...spec.event[event.page.name], date: date ?? spec.event[event.page.name].date } });
                    }

                    for (const name of firedOnce) {
                        expect(dueByModel(spec, name, now), name).toBe(true);
                    }
                }
            }),
            { numRuns: 500 },
        );
    });
});

describe("the cost of planned events (EVT-11)", () => {
    it("works out what is due and what fires in a world of thousands of pages in well under a second", () => {
        const pages: Page[] = [];
        const listed = new Map<string, string[]>();

        const hold = (holder: string, name: string): void => {
            listed.set(holder, [...(listed.get(holder) ?? []), `[[${name}]]`]);
        };

        for (let index = 1; index < 1000; index++) {
            hold(`Luogo ${Math.floor((index - 1) / 4)}`, `Luogo ${index}`);
        }

        for (let index = 0; index < 2000; index++) {
            hold(`Luogo ${index % 1000}`, `Png ${index}`);
        }

        hold("Luogo 999", "Ennio");
        pages.push(...Array.from({ length: 1000 }, (_, index): Page => ({ name: `Luogo ${index}`, type: "place", path: `world/places/${index}.md`, fields: { contains: listed.get(`Luogo ${index}`) ?? [] }, body: "" })));
        pages.push(...Array.from({ length: 2000 }, (_, index): Page => ({ name: `Png ${index}`, type: "character", path: `world/characters/${index}.md`, fields: { role: "npc" }, body: "" })));
        pages.push({ name: "Ennio", type: "character", path: "world/characters/Ennio.md", fields: { role: "pc" }, body: "" });
        pages.push(...Array.from({ length: 400 }, (_, index): Page => ({
            name: `Evento ${index}`,
            type: "event",
            path: `world/events/${index}.md`,
            fields: { when: index % 2 === 0 ? `party in [[Luogo ${index}]]` : `[[Png ${index}]] dead`, clock: "0/4", by: `[[Png ${index}]]` },
            body: "",
        })));
        const before: World = { root: "", pages, problems: [] };
        const after: World = { ...before, pages: pages.map((page) => (page.name === "Png 1" ? { ...page, fields: { ...page.fields, status: "dead" } } : page)) };
        const started = performance.now();
        const { fired } = eventsToFire(before, after, { day: 1, minute: 0 });
        const facts = worldFacts(after);
        plannedEvents(after).filter((event) => isDue(event, { day: 1, minute: 0 }, facts));
        expect(fired.map((found) => found.event.page.name)).toEqual(["Evento 1"]);
        expect(performance.now() - started).toBeLessThan(1000);
    });
});

/** The world of pages a spec describes: each holder lists what it holds, in contains or inventory. */
function worldOf(spec: Spec): World
{
    const held = (holder: string): string[] => Object.keys(spec.holder).filter((name) => spec.holder[name] === holder).map((name) => `[[${name}]]`);
    const withList = (field: string, links: string[]): Record<string, unknown> => (links.length === 0 ? {} : { [field]: links });
    const withStatus = (name: string): Record<string, unknown> => (spec.status[name] === undefined ? {} : { status: spec.status[name] });
    const pages: Page[] = [
        ...places.map((name): Page => ({ name, type: "place", path: `world/places/${name}.md`, fields: { ...withStatus(name), ...withList("contains", held(name)) }, body: "" })),
        ...people.map(([name, role]): Page => ({ name, type: "character", path: `world/characters/${name}.md`, fields: { role, ...withStatus(name), ...withList("inventory", held(name)) }, body: "" })),
        ...items.map((name): Page => ({ name, type: "item", path: `world/items/${name}.md`, fields: spec.roleOfItems === undefined ? {} : { role: spec.roleOfItems }, body: "" })),
        ...events.map((name): Page => ({ name, type: "event", path: `world/events/${name}.md`, fields: { ...spec.event[name] }, body: "" })),
        ...(spec.duplicate === undefined ? [] : [{ name: spec.duplicate, type: "topic" as const, path: `world/topics/${spec.duplicate}.md`, fields: {}, body: "" }]),
    ];
    return { root: "", pages, problems: [] };
}

function applied(spec: Spec, change: { move: string; to?: string; } | { character: string; status?: string; } | { event: string; fields: Spec["event"][string]; }): Spec
{
    if ("move" in change) {
        // Nothing goes inside itself or inside what it holds: such a move is left out.
        const inside = (container: string | undefined): boolean => container !== undefined && (container === change.move || inside(spec.holder[container]));
        return inside(change.to) ? spec : { ...spec, holder: { ...spec.holder, [change.move]: change.to } };
    }

    if ("character" in change) {
        return { ...spec, status: { ...spec.status, [change.character]: change.status } };
    }

    return { ...spec, event: { ...spec.event, [change.event]: change.fields } };
}

function isUnique(spec: Spec, name: string): boolean
{
    return spec.duplicate !== name && [...places, ...people.map(([person]) => person), ...items, ...events].includes(name);
}

/** Everything inside a container, gathered downwards from what it holds. */
function insideOf(spec: Spec, container: string): Set<string>
{
    const found = new Set<string>();

    for (let added = true; added;) {
        added = false;

        for (const [name, holder] of Object.entries(spec.holder)) {
            if (holder !== undefined && (holder === container || found.has(holder)) && !found.has(name)) {
                found.add(name);
                added = true;
            }
        }
    }

    return found;
}

/** The living party; a member whose name another page shares is no single page, so nothing is inside them and they are inside nothing. */
function partyOf(spec: Spec): string[]
{
    return people.filter(([name, role]) => (role === "pc" || role === "companion") && spec.status[name] !== "dead").map(([name]) => name);
}

function holdsByModel(spec: Spec, text: string): boolean
{
    const name = (link: string): string => link.slice(2, -2);
    const [first, word, second] = text.split(" ");

    if (word === "in") {
        const party = partyOf(spec);
        const members = party.filter((member) => isUnique(spec, member));

        if (first === "party") {
            return isUnique(spec, name(second)) && members.some((member) => insideOf(spec, name(second)).has(member));
        }

        if (second === "party") {
            return isUnique(spec, name(first)) && (party.includes(name(first)) || party.some((member) => insideOf(spec, member).has(name(first))));
        }

        return isUnique(spec, name(second)) && isUnique(spec, name(first)) && insideOf(spec, name(second)).has(name(first));
    }

    const page = name(first);

    if (!isUnique(spec, page)) {
        return false;
    }

    if (people.some(([person]) => person === page)) {
        return (spec.status[page] ?? "alive") === word;
    }

    return events.includes(page) && ((spec.event[page].status ?? "") === "" ? "planned" : spec.event[page].status) === word;
}

function isPlannedByModel(spec: Spec, name: string): boolean
{
    return spec.event[name].status === undefined || spec.event[name].status === "" || spec.event[name].status === "planned";
}

/** What sets an event off: a clock written current/max, with a maximum of at least 1, at its maximum or beyond; or one of its conditions, when they all read. */
function setOffByModel(spec: Spec, name: string): boolean
{
    const { clock, when } = spec.event[name];
    const [value, max] = (clock ?? "").split("/").map(Number);
    const full = clock !== undefined && /^\d+\/\d+$/.test(clock) && max >= 1 && value >= max;
    const texts = when === undefined ? [] : Array.isArray(when) ? when : [when];
    const readable = texts.every((text) => conditions.includes(text));
    return full || (readable && texts.some((text) => holdsByModel(spec, text)));
}

function dueByModel(spec: Spec, name: string, now: GameDate | undefined): boolean
{
    if (!isPlannedByModel(spec, name)) {
        return false;
    }

    const date = readGameDate(spec.event[name].date);
    return date === undefined || now === undefined ? setOffByModel(spec, name) : minutesBetween(now, date) <= 0;
}

function formatted(date: GameDate): string
{
    return date.minute === undefined ? `day ${date.day}` : `day ${date.day}, ${String(Math.floor(date.minute / 60)).padStart(2, "0")}:${String(date.minute % 60).padStart(2, "0")}`;
}
