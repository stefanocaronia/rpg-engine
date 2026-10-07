// The laws of containers and moves (MECCANICHE, CON-1–CON-4, CON-7, CON-12), on worlds made at random with rings, doubles and entries a container cannot hold, against a model.
import fc from "fast-check";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { runCommandLine } from "../src/command-line.ts";
import { changedFields, locate, type Page, type PageType, planMove, type World } from "../src/pages/index.ts";
import { makeTempFolder, removeFolder, testContext } from "./support.ts";

const pageTypes: Record<string, PageType> = {
    Regione: "place",
    Palude: "place",
    Cripta: "place",
    Ossario: "place",
    Ennio: "character",
    Lena: "character",
    Varro: "character",
    Zaino: "item",
    Lanterna: "item",
    Diario: "item",
    Storia: "topic",
};
const names = Object.keys(pageTypes);
const movable = names.filter((name) => pageTypes[name] !== "topic");
// The model of CON-1 (D-150, D-156), written as a table.
const holds: Partial<Record<PageType, PageType[]>> = { place: ["place", "character", "item"], character: ["item"], item: ["item", "character"] };
const fieldOf: Partial<Record<PageType, string>> = { place: "contains", character: "inventory", item: "contains" };

// An entry written in one of the ways a link can be: as the engine writes it, in another case, with the folder, with a label.
const entries = fc.tuple(fc.constantFrom(...names), fc.nat({ max: 3 })).map(([name, way]) => {
    const folder = `${pageTypes[name]}s`;
    return [`[[${name}]]`, `[[${name.toLowerCase()}]]`, `[[${folder}/${name}.md]]`, `[[${name}|${name.toLowerCase()}]]`][way];
});
const worlds = fc.tuple(...names.map(() => fc.array(entries, { maxLength: 3 }))).map((lists): World => ({
    root: "",
    problems: [],
    pages: names.map((name, index): Page => {
        const field = fieldOf[pageTypes[name]];
        return { name, type: pageTypes[name], path: `world/${pageTypes[name]}s/${name}.md`, fields: field === undefined || lists[index].length === 0 ? {} : { [field]: lists[index] }, body: "" };
    }),
}));
const moves = fc.record({ subjects: fc.subarray(movable, { minLength: 1, maxLength: 3 }), destination: fc.constantFrom(...names) });
// The same worlds, where each character has some of the items equipped, held or not (CON-12).
const characters = names.filter((name) => pageTypes[name] === "character");
const items = names.filter((name) => pageTypes[name] === "item");
const equippedWorlds = fc.tuple(worlds, fc.tuple(...characters.map(() => fc.subarray(items)))).map(([world, lists]): World => ({
    ...world,
    pages: world.pages.map((page) => {
        const equipped = lists[characters.indexOf(page.name)] ?? [];
        return equipped.length === 0 ? page : { ...page, fields: { ...page.fields, equipped: equipped.map((item) => `[[${item}]]`) } };
    }),
}));

describe("the laws of containers and moves, on worlds made at random", () => {
    it("CON-1, CON-3: a page is in the first container that lists it and can hold it, climbing up to a page already seen, as the model says", () => {
        fc.assert(
            fc.property(worlds, (world) => {
                for (const page of world.pages) {
                    expect(locate(world, page).chain.map((holder) => holder.name), page.name).toEqual(chainByModel(world, page.name));
                }
            }),
            { numRuns: 1000 },
        );
    });

    it("CON-4: a move is refused just when the model refuses it; after one, each page moved is only in the destination, and the others keep their place", () => {
        fc.assert(
            fc.property(worlds, moves, (world, { subjects, destination }) => {
                const pages = subjects.map((name) => pageNamed(world, name));
                const target = pageNamed(world, destination);
                const refusal = refusalByModel(world, subjects, destination);
                let plan: ReturnType<typeof planMove> | undefined;

                try {
                    plan = planMove(world, pages, target);
                } catch (error) {
                    expect(refusal, String(error)).not.toBeUndefined();
                    return;
                }

                expect(refusal).toBeUndefined();
                const after = applied(world, plan);

                for (const name of subjects) {
                    expect(holdersByModel(after, name), name).toEqual([destination]);
                }

                for (const page of world.pages.filter((candidate) => !subjects.includes(candidate.name))) {
                    const before = chainByModel(world, page.name);
                    const first = before.findIndex((holder) => subjects.includes(holder));
                    const expected = first === -1 ? before : [...before.slice(0, first + 1), destination, ...chainByModel(after, destination)];
                    expect(chainByModel(after, page.name), page.name).toEqual(untilRepeated(expected, page.name));
                }

                // CON-4: moving again changes nothing.
                expect(planMove(after, subjects.map((name) => pageNamed(after, name)), pageNamed(after, destination)).edits).toEqual([]);
            }),
            { numRuns: 2000 },
        );
    });

    it("CON-12: after a move, a character has equipped no more what moved away from it, or what was inside it, but keeps what moves with it; the others keep theirs", () => {
        fc.assert(
            fc.property(equippedWorlds, moves, (world, { subjects, destination }) => {
                let plan: ReturnType<typeof planMove>;

                try {
                    plan = planMove(world, subjects.map((name) => pageNamed(world, name)), pageNamed(world, destination));
                } catch {
                    return;
                }

                const after = applied(world, plan);
                const moved = plan.moving.map((page) => page.name);
                const around = [destination, ...chainByModel(world, destination)];

                for (const character of characters) {
                    const before = equippedOf(world, character);

                    // What moves with the character, inside a moving page that is the character or held by it, stays with it.
                    const gone = (item: string): boolean => {
                        const chain = chainByModel(world, item);
                        const nearest = chain.findIndex((holder) => moved.includes(holder));
                        const carried = moved.includes(item) || nearest !== -1;
                        const withIt = !moved.includes(item) && nearest !== -1 && chain.slice(0, nearest + 1).includes(character);
                        return carried && !around.includes(character) && !withIt;
                    };

                    expect(equippedOf(after, character), character).toEqual(before.filter((item) => !gone(item)));
                }
            }),
            { numRuns: 2000 },
        );
    });

    it("CON-3: from a world without rings, no run of moves makes one", () => {
        fc.assert(
            fc.property(worlds.filter((world) => !hasRing(world)), fc.array(moves, { maxLength: 5 }), (start, run) => {
                let world = start;

                for (const { subjects, destination } of run) {
                    try {
                        world = applied(world, planMove(world, subjects.map((name) => pageNamed(world, name)), pageNamed(world, destination)));
                    } catch {
                        continue;
                    }

                    expect(hasRing(world)).toBe(false);
                }
            }),
            { numRuns: 1000 },
        );
    });

    it("CON-7: write refuses to add a page to a container just when move refuses to move it there", async () => {
        const folders: string[] = [];
        const pairs = fc.tuple(fc.constantFrom(...names), fc.constantFrom("Regione", "Lena", "Diario", "Varro", "Zaino", "Storia"));

        try {
            await fc.assert(
                fc.asyncProperty(pairs, async ([holder, thing]) => {
                    const [byWrite, byMove] = [await smallCampaign(folders), await smallCampaign(folders)];
                    // Zaino is in Ennio: write refuses it anywhere else, as move does not; the rest is the same rule.
                    const elsewhere = thing === "Zaino" && holder !== "Ennio";
                    const field = fieldOf[pageTypes[holder]] ?? "contains";
                    const written = await runCommandLine(["write", holder, "--add", `${field}=[[${thing}]]`], testContext(byWrite));
                    const moved = await runCommandLine(["move", thing, "--to", holder], testContext(byMove));
                    expect(written.exitCode === 1, `${written.output} / ${moved.output}`).toBe(moved.exitCode === 1 || elsewhere);
                }),
                { numRuns: 40 },
            );
        } finally {
            folders.forEach(removeFolder);
        }
    }, 120000);
});

/** A campaign whose pages hold one another in a line, Regione › Palude › Cripta › Ossario › Ennio › Zaino › Lanterna, the others nowhere. */
async function smallCampaign(folders: string[]): Promise<string>
{
    const folder = makeTempFolder();
    folders.push(folder);
    await runCommandLine(["init", "--name", "Prova", "--language", "it", "--system", "5e", "--difficulty", "normal", "--lethality", "dice"], testContext(folder));
    const held: Record<string, string> = { Regione: "Palude", Palude: "Cripta", Cripta: "Ossario", Ossario: "Ennio", Ennio: "Zaino", Zaino: "Lanterna" };

    for (const name of names) {
        const type = pageTypes[name];
        const field = fieldOf[type];
        const fields = [type === "character" ? "role: npc" : "", field !== undefined && held[name] !== undefined ? `${field}: ["[[${held[name]}]]"]` : ""].filter((line) => line !== "");
        mkdirSync(join(folder, "world", `${type}s`), { recursive: true });
        writeFileSync(join(folder, "world", `${type}s`, `${name}.md`), fields.length === 0 ? "" : `---\n${fields.join("\n")}\n---\n`);
    }

    return folder;
}

/** The world after a planned move, with its lists changed as the plan says: what goes first, what comes after; a list left empty goes. */
function applied(world: World, plan: ReturnType<typeof planMove>): World
{
    let pages = world.pages;

    for (const { holder, field, remove, add } of plan.edits) {
        const removed = remove.length === 0 ? holder.fields : changedFields(holder.fields, { remove: { [field]: remove } });
        const emptied = add.length === 0 && Array.isArray(removed[field]) && removed[field].length === 0 ? Object.fromEntries(Object.entries(removed).filter(([name]) => name !== field)) : removed;
        const fields = add.length === 0 ? emptied : changedFields(emptied, { add: { [field]: add } });
        pages = pages.map((page) => (page.path === holder.path ? { ...page, fields } : page));
    }

    return { ...world, pages };
}

function pageNamed(world: World, name: string): Page
{
    const found = world.pages.find((page) => page.name === name);

    if (found === undefined) {
        throw new Error(`No page ${name} in the test world.`);
    }

    return found;
}

/** What a character has equipped, by name, in order. */
function equippedOf(world: World, name: string): string[]
{
    const value = pageNamed(world, name).fields.equipped;
    return Array.isArray(value) ? value.map(targetOf).filter((item): item is string => item !== undefined) : [];
}

/** The name an entry points to, read the model's way: the text between [[ and ]], without a label, a folder or .md. */
function targetOf(entry: unknown): string | undefined
{
    const match = typeof entry === "string" ? /^\[\[([^|\]]+)(?:\|[^\]]*)?\]\]$/.exec(entry) : null;
    const target = match?.[1].split("/").at(-1)?.replace(/\.md$/, "");
    return names.find((name) => name.toLowerCase() === target?.toLowerCase());
}

/** The pages whose own field lists a page and that can hold it, in the world's order, itself left out (CON-1). */
function holdersByModel(world: World, name: string): string[]
{
    const type = pageTypes[name];
    return world.pages.filter((holder) => {
        const field = holder.type === undefined ? undefined : fieldOf[holder.type];
        const listed = field === undefined || !Array.isArray(holder.fields[field]) ? [] : (holder.fields[field] as unknown[]).map(targetOf);
        return holder.name !== name && listed.includes(name) && (holds[holder.type ?? "topic"] ?? []).includes(type);
    }).map((holder) => holder.name);
}

/** Where a page is: the first holder, its first holder, and so on, stopping before a page already seen. */
function chainByModel(world: World, name: string): string[]
{
    const chain: string[] = [];

    for (let holder = holdersByModel(world, name)[0]; holder !== undefined && holder !== name && !chain.includes(holder); holder = holdersByModel(world, holder)[0]) {
        chain.push(holder);
    }

    return chain;
}

/** Why the model refuses a move: a destination that cannot hold a page, or a page that is the destination or holds it. */
function refusalByModel(world: World, subjects: string[], destination: string): string | undefined
{
    const cannot = subjects.find((name) => !(holds[pageTypes[destination]] ?? []).includes(pageTypes[name]));
    const ring = subjects.find((name) => name === destination || chainByModel(world, destination).includes(name));
    return cannot ?? ring;
}

/** A chain as locate climbs it: up to the page itself or to a page already in it. */
function untilRepeated(chain: string[], name: string): string[]
{
    const end = chain.findIndex((holder, index) => holder === name || chain.indexOf(holder) !== index);
    return end === -1 ? chain : chain.slice(0, end);
}

/** Whether a page is inside itself through others. */
function hasRing(world: World): boolean
{
    return names.some((name) => {
        const seen: string[] = [];

        for (let holder = holdersByModel(world, name)[0]; holder !== undefined && !seen.includes(holder); holder = holdersByModel(world, holder)[0]) {
            if (holder === name) {
                return true;
            }

            seen.push(holder);
        }

        return false;
    });
}
