// The laws of inheritance (MECCANICHE, INH-n), checked on thousands of worlds generated at random (D-118).
import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { comparableText } from "../src/core/text.ts";
import {
    baseChain,
    changedFields,
    checkWorld,
    derivedPages,
    followersOf,
    holdsField,
    inheritedByBase,
    inheritedFields,
    introductionText,
    isEmptyField,
    newBaseProblem,
    ownFieldChange,
    type Page,
    type PageType,
    sectionFollowersOf,
    textParts,
    type World,
} from "../src/pages/index.ts";

const names = ["Lupo", "Orso", "Corvo", "Ombra", "Zanna"];
const neverInherited = ["role", "status", "creature", "inventory", "knows", "factions", "contains", "date", "place", "tags", "aliases"];
const folders: Record<string, string> = { creature: "creatures", character: "characters", item: "items" };
const runs = { numRuns: 2000 };

// A link in any case, to a page that may or may not exist; or a value that links nowhere.
const creatureValue = fc.oneof(
    fc.constantFrom(...names).chain((name) => fc.constantFrom(`[[${name}]]`, `[[${name.toLowerCase()}]]`, `[[${name.toUpperCase()}]]`)),
    fc.constantFrom("[[Nessuno]]", "Lupo", "", null),
);
const fieldName = fc.constantFrom("hp", "HP", "ac", "Ac", "fiuto", "attacchi", "Attacchi", "Status", ...neverInherited.filter((name) => name !== "creature"), "Knows", "PLACE");
const fieldValue = fc.oneof(fc.constantFrom("5/12", "12/12", "3", "feroce", "", null), fc.integer({ min: 0, max: 20 }), fc.constant(["morso", "artigli"]), fc.constant(["coda"]));
// A page names each section or secret once, in any case: validate reports one that does not.
const part = fc.constantFrom("## Tattiche\n\nIn branco.", "## tattiche\n\nDa solo.", "## Aspetto\n\nGrigio.\n\n### Occhi\n\nGialli.", "### Occhi\n\nRossi.", "> [!secret] Debolezza\n> Il fuoco.", "> [!secret]\n> Senza nome.");
const partName = (text: string): string => (text.includes("### Occhi") ? "occhi" : text.split("\n")[0].replace(/^(#+ |> \[!secret\] ?)/, "").toLowerCase());
const pageShape = fc.record({
    name: fc.constantFrom(...names),
    type: fc.constantFrom<PageType>("creature", "creature", "creature", "character", "item"),
    fields: fc.dictionary(fieldName, fieldValue, { maxKeys: 4 }),
    creature: fc.option(creatureValue, { nil: undefined }),
    introduction: fc.boolean(),
    parts: fc.uniqueArray(part, { selector: partName, maxLength: 2 }),
});
// Mostly pages with names of their own; sometimes one more, which may share a name.
const worlds = fc.tuple(fc.uniqueArray(pageShape, { selector: (page) => page.name, minLength: 1, maxLength: 5 }), fc.option(pageShape, { nil: undefined })).map(([pages, extra]) => {
    const all = extra === undefined ? pages : [...pages, extra];
    return {
        root: "",
        problems: [],
        pages: all.map((shape, index): Page => ({
            name: shape.name,
            type: shape.type,
            path: `world/${folders[shape.type]}/${shape.name}${index}.md`,
            fields: shape.creature === undefined ? shape.fields : { ...shape.fields, creature: shape.creature },
            body: [shape.introduction ? `Chi è ${shape.name}.` : "", ...shape.parts].filter((text) => text !== "").join("\n\n"),
        })),
    } satisfies World;
});

describe("the laws of inheritance, on worlds made at random", () => {
    it("INH-2, INH-3: a chain holds only creatures, each once, never the page, and follows the reference model", () => {
        fc.assert(
            fc.property(worlds, (world) => {
                for (const page of world.pages) {
                    const chain = baseChain(world, page);
                    expect(chain).toEqual(referenceChain(world, page));
                    expect(new Set(chain).size).toBe(chain.length);
                    expect(chain.includes(page)).toBe(false);
                    expect(chain.every((base) => base.type === "creature")).toBe(true);
                }
            }),
            runs,
        );
    });

    it("INH-4–INH-8: a page reads each field from itself, else from the nearest base that holds it with a value, never a field of the closed list from a base", () => {
        fc.assert(
            fc.property(worlds, (world) => {
                for (const page of world.pages) {
                    const read = inheritedFields(world, page);
                    const layers = [page, ...referenceChain(world, page)];
                    const keys = new Set(layers.flatMap((holder) => Object.keys(holder.fields)).map(comparableText));

                    for (const key of keys) {
                        const expected = referenceRead(page, layers, key);
                        const found = Object.entries(read).filter(([name]) => comparableText(name) === key);
                        expect(found).toEqual(expected === undefined ? [] : [expected]);
                    }

                    expect(Object.keys(read).every((name) => keys.has(comparableText(name)))).toBe(true);
                    expect(Object.values(read).some(isEmptyField)).toBe(false);
                }
            }),
            runs,
        );
    });

    it("INH-10: the followers of a base for a field are exactly the pages whose value changes when the base writes a new one", () => {
        fc.assert(
            fc.property(worlds, fc.constantFrom("hp", "Fiuto", "attacchi", "tags", "Knows", "status"), (world, field) => {
                for (const base of world.pages.filter((page) => page.type === "creature")) {
                    const followers = followersOf(world, base, field);
                    const rewritten = { ...base, fields: { ...withoutField(base.fields, field), [field]: "nuovo" } };
                    const after = { ...world, pages: world.pages.map((page) => (page === base ? rewritten : page)) };

                    for (const derived of derivedPages(world, base)) {
                        const value = Object.entries(inheritedFields(after, derived)).find(([name]) => comparableText(name) === comparableText(field))?.[1];
                        expect(followers.includes(derived), `${derived.name} from ${base.name}`).toBe(value === "nuovo" && !holdsField(derived, field));
                    }

                    expect(followers.every((page) => derivedPages(world, base).includes(page))).toBe(true);
                    expect(neverInherited.includes(field.toLowerCase()) ? followers : []).toEqual([]);
                }
            }),
            runs,
        );
    });

    it("INH-13: a page shows each section or secret once by name, its own first, else from the nearest base that has it", () => {
        fc.assert(
            fc.property(worlds, (world) => {
                for (const page of world.pages) {
                    const groups = inheritedByBase(world, page);
                    expect(groups.every((group) => Object.keys(group.fields).length > 0 || group.parts.length > 0 || group.introduction !== "")).toBe(true);
                    const introducer = introductionText(page.body) === "" ? baseChain(world, page).find((base) => introductionText(base.body) !== "") : undefined;
                    expect(groups.filter((group) => group.introduction !== "").map((group) => group.base)).toEqual(introducer === undefined ? [] : [introducer]);
                    const inherited = groups.flatMap((group) => group.parts.map((piece) => ({ ...piece, base: group.base }))).filter((piece) => piece.name !== "");
                    const shown = [...textParts(page.body).map((piece) => piece.name).filter((name) => name !== ""), ...inherited.map((piece) => piece.name)].map(comparableText);
                    expect(new Set(shown).size).toBe(shown.length);

                    for (const piece of inherited) {
                        const nearest = baseChain(world, page).find((base) => textParts(base.body).some((own) => comparableText(own.name) === comparableText(piece.name)));
                        expect(nearest).toBe(piece.base);
                    }

                    for (const base of baseChain(world, page)) {
                        for (const name of textParts(base.body).map((piece) => piece.name).filter((name) => name !== "")) {
                            expect(shown.includes(comparableText(name))).toBe(true);
                        }

                        const unnamed = textParts(base.body).filter((piece) => piece.name === "").length;
                        expect(groups.find((group) => group.base === base)?.parts.filter((piece) => piece.name === "").length ?? 0).toBe(unnamed);
                    }
                }
            }),
            runs,
        );
    });

    it("INH-13: the followers of a section are the pages that show it from that base", () => {
        fc.assert(
            fc.property(worlds, fc.constantFrom("Tattiche", "Debolezza", "Nuova"), (world, name) => {
                for (const base of world.pages.filter((page) => page.type === "creature")) {
                    const rewritten = { ...base, body: `${base.body}\n\n> [!secret] ${name}\n> Scritto ora.`.trim() };
                    const holds = textParts(base.body).some((piece) => comparableText(piece.name) === comparableText(name));
                    const after = { ...world, pages: world.pages.map((page) => (page === base ? (holds ? base : rewritten) : page)) };
                    const shownFrom = (derived: Page): Page | undefined => inheritedByBase(after, derived).find((group) => group.parts.some((piece) => comparableText(piece.name) === comparableText(name)))?.base;

                    for (const derived of derivedPages(world, base)) {
                        expect(sectionFollowersOf(world, base, name).includes(derived)).toBe(shownFrom(derived) === (holds ? base : rewritten));
                    }
                }
            }),
            runs,
        );
    });

    it("INH-2, INH-3: write takes no creature that would make a page derive from itself, even through a page written later", () => {
        fc.assert(
            fc.property(worlds, fc.constantFrom(...names, "Spettro"), fc.constantFrom<PageType>("creature", "character"), creatureValue, (world, name, newType, link) => {
                const named = world.pages.filter((page) => comparableText(page.name) === comparableText(name));

                if (named.length > 1 || typeof link !== "string") {
                    return;
                }

                const before = named.at(0);
                const page: Page = { name, type: before?.type ?? newType, path: before?.path ?? `world/creatures/${name}.md`, fields: { ...before?.fields, creature: link }, body: before?.body ?? "" };
                const after = { ...world, pages: [...world.pages.filter((other) => other !== before), page] };
                const problem = newBaseProblem(world, page, link);

                if (problem === undefined) {
                    expect(comesBack(after, page), `${name} → ${link}`).toBe(false);
                }

                if (problem?.includes("would come back") === true) {
                    expect(comesBack(after, page), `${name} → ${link}`).toBe(true);
                }
            }),
            runs,
        );
    });

    it("INH-15: validate reports a page that derives from itself exactly when its chain comes back to it", () => {
        fc.assert(
            fc.property(worlds, (world) => {
                const messages = checkWorld(world).map((problem) => problem.message);

                for (const page of world.pages.filter((candidate) => world.pages.filter((other) => other.name === candidate.name).length === 1)) {
                    expect(messages.some((message) => message.startsWith(`${page.name} derives from itself:`))).toBe(comesBack(world, page));
                }
            }),
            runs,
        );
    });

    it("INH-5: a value set on a page is what the page reads afterwards, in whatever case the field is given, and no field is written twice", () => {
        fc.assert(
            fc.property(worlds, fc.constantFrom("hp", "HP", "Fiuto", "attacchi", "Attacchi"), (world, field) => {
                for (const page of world.pages) {
                    const after = { ...page, fields: changedFields(page.fields, ownFieldChange(world, page, { set: { [field]: "nuovo" } })) };
                    const now = { ...world, pages: world.pages.map((other) => (other === page ? after : other)) };
                    const read = Object.entries(inheritedFields(now, after)).filter(([name]) => comparableText(name) === comparableText(field));
                    expect(read.map(([, value]) => value)).toEqual(["nuovo"]);
                    const written = (fields: Record<string, unknown>): number => Object.keys(fields).filter((name) => comparableText(name) === comparableText(field)).length;
                    expect(written(after.fields)).toBe(Math.max(1, written(page.fields)));
                }
            }),
            runs,
        );
    });

    it("INH-5, INH-7: adding to a list starts from the list the page reads, and leaves the page reading it with the item", () => {
        fc.assert(
            fc.property(worlds, fc.constantFrom("attacchi", "Attacchi"), (world, field) => {
                for (const page of world.pages) {
                    const before = Object.entries(inheritedFields(world, page)).find(([name]) => comparableText(name) === comparableText(field))?.[1];
                    const change = ownFieldChange(world, page, { add: { [field]: ["coda"] } });

                    if (before !== undefined && !Array.isArray(before)) {
                        expect(() => changedFields(page.fields, change)).toThrow("is not a list");
                        continue;
                    }

                    const after = { ...page, fields: changedFields(page.fields, change) };
                    const read = Object.entries(inheritedFields({ ...world, pages: world.pages.map((other) => (other === page ? after : other)) }, after)).find(([name]) => comparableText(name) === comparableText(field))?.[1];
                    expect(read).toEqual([...new Set([...((before as unknown[] | undefined) ?? []), "coda"])]);
                }
            }),
            runs,
        );
    });
});

/** The chain as INH-2 and INH-3 say it, written plainly: follow the link of a character or creature to the one creature with that name, and stop before a page already met. */
function referenceChain(world: World, page: Page): Page[]
{
    const chain: Page[] = [];
    let current = referenceBase(world, page);

    while (current !== undefined && current !== page && !chain.includes(current)) {
        chain.push(current);
        current = referenceBase(world, current);
    }

    return chain;
}

function referenceBase(world: World, page: Page): Page | undefined
{
    const link = page.type === "creature" || page.type === "character" ? /^\[\[([^\]]+)\]\]$/.exec(String(page.fields.creature ?? "")) : null;
    const found = link === null ? [] : world.pages.filter((candidate) => candidate.name.toLowerCase() === link[1].toLowerCase());
    return found.length === 1 && found[0].type === "creature" ? found[0] : undefined;
}

/** What a page reads for a field, as INH-4–INH-8 say it: the last name with a value on the nearest page that has one; never a field of the closed list from a base. */
function referenceRead(page: Page, layers: Page[], key: string): [string, unknown] | undefined
{
    for (const holder of layers) {
        if (holder !== page && neverInherited.includes(key)) {
            continue;
        }

        const held = Object.keys(holder.fields).filter((name) => comparableText(name) === key && !isEmptyField(holder.fields[name]));

        if (held.length > 0) {
            return [held[held.length - 1], holder.fields[held[held.length - 1]]];
        }
    }

    return undefined;
}

function comesBack(world: World, page: Page): boolean
{
    const seen = new Set<Page>();

    for (let current = referenceBase(world, page); current !== undefined; current = referenceBase(world, current)) {
        if (current === page) {
            return true;
        }

        if (seen.has(current)) {
            return false;
        }

        seen.add(current);
    }

    return false;
}

function withoutField(fields: Record<string, unknown>, field: string): Record<string, unknown>
{
    return Object.fromEntries(Object.entries(fields).filter(([name]) => comparableText(name) !== comparableText(field)));
}
