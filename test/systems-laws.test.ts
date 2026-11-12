// The laws of the pages of a game system (MECCANICHE, SYS-n), checked on worlds generated at random (D-118).
import fc from "fast-check";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { comparableText } from "../src/core/text.ts";
import {
    baseChain,
    findPage,
    firstTable,
    inheritedFields,
    isKind,
    layeredPage,
    layeredPages,
    locate,
    type Page,
    pageNamed,
    type PageType,
    planMove,
    readFields,
    readSection,
    splitPageFile,
    systemPageNamed,
    uniquePage,
    validHoldersOf,
    type World,
    writeLayer,
    writePage,
} from "../src/pages/index.ts";
import { makeTempFolder, removeFolder } from "./support.ts";

const names = ["Wolf", "Goblin", "Lupo", "Torch", "Ombra"];
const folders: Record<string, string> = { creature: "creatures", character: "characters", item: "items" };
const runs = { numRuns: 1000 };

// A page of the system: a creature or an item that derives from nothing (SYS-2), with an alias sometimes.
const systemShape = fc.record({
    name: fc.constantFrom(...names),
    type: fc.constantFrom<PageType>("creature", "item"),
    hp: fc.constantFrom("11/11", "7/7"),
    alias: fc.option(fc.constantFrom(...names, "Lupone"), { nil: undefined }),
});
// A page of the campaign, that may share a name with the system's, derive from a name, hold a field and carry or hold names.
const campaignShape = fc.record({
    name: fc.constantFrom(...names, "Zanna", "Spada"),
    type: fc.constantFrom<PageType>("creature", "character", "item"),
    base: fc.option(fc.constantFrom(...names, "Zanna", "Spada"), { nil: undefined }),
    fiuto: fc.option(fc.integer({ min: 0, max: 5 }), { nil: undefined }),
    alias: fc.option(fc.constantFrom(...names, "Lupone"), { nil: undefined }),
    holds: fc.array(fc.constantFrom(...names), { maxLength: 2 }),
});

let root = "";

beforeAll(() => {
    root = makeTempFolder();
});

afterAll(() => {
    removeFolder(root);
});

/** A world in a folder of its own, so that a write that should be refused could never land anywhere else. */
function worlds(): fc.Arbitrary<World>
{
    return fc.tuple(fc.uniqueArray(systemShape, { selector: (shape) => comparableText(shape.name) }), fc.array(campaignShape, { maxLength: 5 })).map(([system, campaign]) => ({
        root,
        problems: [],
        pages: campaign.map((shape, index): Page => ({
            name: shape.name,
            type: shape.type,
            path: `world/${folders[shape.type]}/${shape.name}${index}.md`,
            fields: {
                ...(shape.base === undefined ? {} : { [shape.type === "item" ? "item" : "creature"]: `[[${shape.base}]]` }),
                ...(shape.fiuto === undefined ? {} : { fiuto: shape.fiuto }),
                ...(shape.alias === undefined ? {} : { aliases: [shape.alias] }),
                ...(shape.holds.length === 0 ? {} : { [shape.type === "character" ? "inventory" : "contains"]: shape.holds.map((name) => `[[${name}]]`) }),
            },
            body: "",
        })),
        system: {
            name: "5e",
            title: "a test system",
            language: "en",
            fields: {},
            pages: system.map((shape): Page => ({
                name: shape.name,
                type: shape.type,
                path: `world/${folders[shape.type]}/${shape.name}.md`,
                fields: { hp: shape.hp, ...(shape.alias === undefined ? {} : { aliases: [shape.alias] }) },
                body: "",
                system: "5e",
            })),
        },
    }));
}

describe("the laws of the pages of a game system, on worlds made at random", () => {
    it("SYS-3: a name finds the campaign's page, else the system's; two of the campaign stop the command, and none of the system stands in", () => {
        fc.assert(
            fc.property(worlds(), fc.constantFrom(...names, "Zanna", "Nessuno"), (world, name) => {
                const own = world.pages.filter((page) => comparableText(page.name) === comparableText(name));
                const system = world.system?.pages.find((page) => comparableText(page.name) === comparableText(name));

                if (own.length > 1) {
                    expect(() => findPage(world, name)).toThrow("Two pages have the same name");
                    expect(uniquePage(world, name)).toBeUndefined();
                    return;
                }

                expect(findPage(world, name)).toBe(own[0] ?? system);
                expect(uniquePage(world, name)).toBe(own[0] ?? system);
            }),
            runs,
        );
    });

    it("SYS-3: a name wins over an alias wherever it is, and the campaign's aliases over the system's", () => {
        fc.assert(
            fc.property(worlds(), fc.constantFrom(...names, "Lupone"), (world, name) => {
                const named = (pages: Page[]): Page[] => pages.filter((page) => comparableText(page.name) === comparableText(name));
                const aliased = (pages: Page[]): Page[] => pages.filter((page) => (page.fields.aliases as string[] | undefined)?.some((alias) => comparableText(alias) === comparableText(name)) === true);
                const system = world.system?.pages ?? [];

                if (named(world.pages).length > 1 || (named(world.pages).length === 0 && named(system).length === 0 && aliased(world.pages).length > 1)) {
                    expect(() => pageNamed(world, name)).toThrow();
                    return;
                }

                expect(pageNamed(world, name)).toBe(named(world.pages)[0] ?? named(system)[0] ?? aliased(world.pages)[0] ?? aliased(system)[0]);
            }),
            runs,
        );
    });

    it("SYS-7: a chain goes from the campaign into the system, by the nearest page of each name, and reads what the campaign does not hold from there", () => {
        fc.assert(
            fc.property(worlds(), (world) => {
                for (const page of world.pages) {
                    const chain = baseChain(world, page);
                    expect(chain).toEqual(referenceChain(world, page));
                    const holder = [page, ...chain].find((candidate) => Object.hasOwn(candidate.fields, "hp"));
                    expect(inheritedFields(world, page).hp).toBe(holder?.fields.hp);
                }
            }),
            runs,
        );
    });

    it("SYS-2, SYS-6: a page of the system is in no place, whoever lists it, and is never written nor moved, nor does anything go into it", () => {
        fc.assert(
            fc.property(worlds(), (world) => {
                for (const page of world.system?.pages ?? []) {
                    expect(locate(world, page)).toEqual({ chain: [], alsoIn: [] });
                    expect(validHoldersOf(world, page)).toEqual([]);

                    if (world.pages.some((own) => comparableText(own.name) === comparableText(page.name))) {
                        continue;
                    }

                    expect(() => writePage(world, page.name, undefined, { set: { fiuto: 1 } })).toThrow(/of the system 5e: read-only/);
                    expect(() => writePage(world, page.name, page.type, { set: { fiuto: 1 } })).toThrow(/would hide it/);

                    for (const holder of world.pages.filter((own) => own.type === "place" || own.type === "character" || own.type === "item")) {
                        expect(() => planMove(world, [page], holder)).toThrow(/of the system 5e/);
                        expect(() => planMove(world, [holder], page)).toThrow(/of the system 5e/);
                    }
                }
            }),
            runs,
        );
    });
});

// A layer of the campaign over a page of the system (SYS-11): a value for hp sometimes, uses sometimes, a section of its own sometimes.
const layerShape = fc.record({
    name: fc.constantFrom(...names),
    hp: fc.option(fc.constantFrom("11/11", "12/12", "30/30"), { nil: undefined }),
    uses: fc.option(fc.constantFrom("3/3"), { nil: undefined }),
    section: fc.option(fc.constantFrom("Bite", "Howl", "Keen Eye"), { nil: undefined }),
});
const vocationBody = "**The Scout** walks ahead.\n\n| Rank | Knacks |\n|---|---|\n| 1st | Keen Eye |\n| 2nd | Quiet Step |\n\n## Keen Eye\n\nNotice with an edge.\n\n## Bite\n\nTwo dice.";

/** A world with the campaign's layers over its system's pages, as loadWorld merges them, and the world as the system writes it. */
function layeredWorlds(): fc.Arbitrary<{ plain: World; layered: World; }>
{
    return fc.tuple(worlds(), fc.uniqueArray(layerShape, { selector: (shape) => comparableText(shape.name), maxLength: 4 })).map(([plain, shapes]) => {
        // An item of the system without uses is a kind, counted in stacks (STK-1).
        const shipped = (plain.system?.pages ?? []).map((page) => ({ ...page, body: vocationBody, fields: page.type === "item" ? { weight: 1 } : page.fields }));
        const layers = shapes.flatMap((shape): Page[] => {
            const page = shipped.find((candidate) => comparableText(candidate.name) === comparableText(shape.name));
            return page === undefined ? [] : [{
                name: page.name,
                type: page.type,
                path: page.path,
                fields: { ...(shape.hp === undefined ? {} : { hp: shape.hp }), ...(shape.uses === undefined ? {} : { uses: shape.uses }) },
                body: shape.section === undefined ? "" : `## ${shape.section}\n\nThe campaign's ${shape.section}.`,
            }];
        });
        const system = plain.system === undefined ? undefined : { ...plain.system, pages: shipped };
        const merged = system === undefined ? undefined : { ...system, pages: layeredPages(shipped, layers, "layers/5e").pages };
        return { plain: { ...plain, system }, layered: { ...plain, system: merged } };
    });
}

describe("the laws of the campaign's layers over the pages of a game system, on worlds made at random (SYS-11)", () => {
    it("SYS-11: without layers, every page of the system is the very one it was", () => {
        fc.assert(
            fc.property(worlds(), (world) => {
                const pages = world.system?.pages ?? [];
                const { pages: merged, stray } = layeredPages(pages, [], "layers/5e");
                expect(stray).toEqual([]);
                merged.forEach((page, index) => expect(page).toBe(pages[index]));
            }),
            runs,
        );
    });

    it("SYS-11, SYS-7: what derives from a layered page reads the layer's values, and the page stays the system's, in no place", () => {
        fc.assert(
            fc.property(layeredWorlds(), ({ plain, layered }) => {
                for (const page of layered.pages) {
                    const holder = [page, ...baseChain(layered, page)].find((candidate) => Object.hasOwn(candidate.fields, "hp"));
                    expect(inheritedFields(layered, page).hp).toBe(holder?.fields.hp);
                    // The chain is the same, page by page, with the merged ones in it.
                    expect(baseChain(layered, page).map((base) => base.path)).toEqual(baseChain(plain, page).map((base) => base.path));
                }

                for (const page of layered.system?.pages ?? []) {
                    expect(page.system).toBe("5e");
                    expect(locate(layered, page)).toEqual({ chain: [], alsoIn: [] });
                    expect(systemPageNamed(layered, page.name)).toBe(page);
                }
            }),
            runs,
        );
    });

    it("SYS-11, STK-1: a kind stays a kind, and a layer never gives it uses", () => {
        fc.assert(
            fc.property(layeredWorlds(), ({ plain, layered }) => {
                for (const page of plain.system?.pages ?? []) {
                    const merged = systemPageNamed(layered, page.name);
                    expect(merged !== undefined && isKind(layered, merged)).toBe(isKind(plain, page));
                }
            }),
            runs,
        );
    });

    it("SYS-11: a layer on one section keeps the table of the page, and its text replaces that section alone", () => {
        fc.assert(
            fc.property(layeredWorlds(), ({ plain, layered }) => {
                for (const page of plain.system?.pages ?? []) {
                    const merged = systemPageNamed(layered, page.name);
                    expect(firstTable(merged?.body ?? "")).toEqual(firstTable(page.body));

                    for (const section of merged?.layer?.sections ?? []) {
                        expect(readSection(merged?.body ?? "", section)).toBe(`## ${section}\n\nThe campaign's ${section}.`);
                    }
                }
            }),
            runs,
        );
    });

    it("SYS-11: a layer written holds only what differs from the system, and read back over it gives what was written; the rest of the root is untouched", () => {
        fc.assert(
            fc.property(fc.constantFrom("12/12", "11/11", "7/7"), fc.constantFrom("11/11", "7/7"), (wanted, shipped) => {
                const folder = makeTempFolder();

                try {
                    const original: Page = { name: "Goblin", type: "creature", path: "world/creatures/Goblin.md", fields: { hp: shipped }, body: "", system: "5e" };
                    const world: World = { root: folder, pages: [], problems: [], system: { name: "5e", title: "a test system", language: "en", fields: {}, pages: [original] } };
                    const written = writeLayer(world, original, { set: { hp: wanted } });
                    const file = join(folder, "layers", "5e", "world", "creatures", "Goblin.md");
                    expect(existsSync(file)).toBe(wanted !== shipped);
                    expect(written.changed).toBe(wanted !== shipped);
                    expect(readdirSync(folder)).toEqual(wanted === shipped ? [] : ["layers"]);
                    const layer = existsSync(file) ? splitPageFile(readFileSync(file, "utf8")) : { body: "" };
                    const read = layeredPage(original, { fields: readFields(layer.frontmatter, "layer"), body: layer.body }, "layer");
                    expect(read.fields.hp).toBe(wanted);
                    expect(original.fields.hp).toBe(shipped);
                } finally {
                    removeFolder(folder);
                }
            }),
            { numRuns: 30 },
        );
    });
});

/** The chain as SYS-3 and SYS-7 say it, written plainly: the base is the one page of the campaign with the name, else the system's, and of the type the field names. */
function referenceChain(world: World, page: Page): Page[]
{
    const chain: Page[] = [];

    for (let current = referenceBase(world, page); current !== undefined && current !== page && !chain.includes(current); current = referenceBase(world, current)) {
        chain.push(current);
    }

    return chain;
}

function referenceBase(world: World, page: Page): Page | undefined
{
    const field = page.type === "creature" || page.type === "character" ? "creature" : page.type === "item" ? "item" : undefined;
    const link = field === undefined ? null : /^\[\[([^\]]+)\]\]$/.exec(String(page.fields[field] ?? ""));

    if (link === null) {
        return undefined;
    }

    const own = world.pages.filter((candidate) => comparableText(candidate.name) === comparableText(link[1]));
    const found = own.length > 0 ? (own.length === 1 ? own[0] : undefined) : world.system?.pages.find((candidate) => comparableText(candidate.name) === comparableText(link[1]));
    return found?.type === field ? found : undefined;
}
