// The lists a character binds items in, as the 5e's attunement (D-435, BND-1–BND-3): at most so many items, each one that asks for it, as the system says.
import type { Problem } from "../core/problem.ts";
import { comparableText, valueNamed } from "../core/text.ts";
import { type FieldChange, findPage, inheritedFields, linksIn, type Page, type World } from "../pages/index.ts";
import type { GameSystem } from "../systems/index.ts";

/** Refuses a change that binds more items than the system allows, or an item that asks for no bond (BND-1, BND-2); before anything is written. */
export function checkBonds(world: World, system: GameSystem | undefined, page: Page | undefined, name: string, change: FieldChange): void
{
    for (const [field, bond] of Object.entries(system?.bonds ?? {})) {
        if (!changes(change, field)) {
            continue;
        }

        const before = bondedNames(world, page, field);
        const after = bondedAfter(before, change, field);

        if (after.length > bond.most) {
            throw new Error(`${name} would have ${after.length} items in ${field}, more than ${bond.most}, the most (read ${bond.rules}): remove one first, such as remove ${field}=[[${before[0] ?? after[0]}]]. Nothing changed.`);
        }

        for (const added of after.filter((item) => !before.some((other) => comparableText(other) === comparableText(item)))) {
            const item = findPage(world, added);

            if (item === undefined || item.type !== "item") {
                throw new Error(`${field} takes items, and ${added} is ${item === undefined ? "no page" : `${item.type ?? "a free page"}`}: link an item, such as add ${field}=[[Ring of Protection]]. Nothing changed.`);
            }

            if (askedBond(world, item, bond.needs) === undefined) {
                throw new Error(`${item.name} asks for no ${bond.needs}, so it goes in no ${field}: if it does, write ${item.name}, set ${bond.needs}=true. Nothing changed.`);
            }
        }
    }
}

/** What a write says of the items it bound (BND-3): how many of the most, and what an item asks, as by a paladin, which the master checks. */
export function bondNotes(world: World, system: GameSystem | undefined, before: Page | undefined, after: Page): string[]
{
    return Object.entries(system?.bonds ?? {}).flatMap(([field, bond]) => {
        const was = bondedNames(world, before, field);
        const now = bondedNames(world, after, field);
        return now.filter((item) => !was.some((other) => comparableText(other) === comparableText(item))).map((added) => {
            const item = findPage(world, added);
            const asked = item === undefined ? undefined : askedBond(world, item, bond.needs);
            const what = asked === undefined || asked === true ? "" : `; it asks: ${asked}, which you check`;
            return `${after.name}: ${field} ${added}, ${now.length} of ${bond.most}${what}. Read ${bond.rules}.`;
        });
    });
}

/** Characters with more items in a bond list than the system allows, written by hand (BND-1). */
export function bondProblems(world: World, system: GameSystem | undefined): Problem[]
{
    return Object.entries(system?.bonds ?? {}).flatMap(([field, bond]) =>
        world.pages.filter((page) => page.system === undefined && page.type === "character").flatMap((page): Problem[] => {
            const items = bondedNames(world, page, field);
            return items.length <= bond.most ? [] : [{ path: page.path, message: `${page.name} has ${items.length} items in ${field}, more than ${bond.most}, the most.`, fix: `write ${page.name}, remove ${field}=[[${items[0]}]]` }];
        })
    );
}

/** What an item asks for its bond: true, or the text of who may, as by a paladin; its own field, its base's, or a page it links to, as a magic item; undefined when it asks for none. */
function askedBond(world: World, item: Page, needs: string): string | true | undefined
{
    const own = asked(valueNamed(inheritedFields(world, item), needs));

    if (own !== undefined) {
        return own;
    }

    const linked = Object.values(item.fields).flatMap(linksIn).flatMap((name) => findPage(world, name) ?? []).filter((page) => page.type === "item");
    return linked.map((page) => asked(valueNamed(inheritedFields(world, page), needs))).find((value) => value !== undefined);
}

function asked(value: unknown): string | true | undefined
{
    if (value === true || (typeof value === "string" && comparableText(value.trim()) === "true")) {
        return true;
    }

    return typeof value === "string" && value.trim() !== "" && comparableText(value.trim()) !== "false" ? value.trim() : undefined;
}

function bondedNames(world: World, page: Page | undefined, field: string): string[]
{
    return page === undefined ? [] : linksIn(valueNamed(inheritedFields(world, page), field));
}

function changes(change: FieldChange, field: string): boolean
{
    return [change.set, change.add, change.remove].some((values) => Object.keys(values ?? {}).some((name) => comparableText(name) === comparableText(field)));
}

/** The list as the change leaves it: set whole, then what it adds and removes. */
function bondedAfter(before: string[], change: FieldChange, field: string): string[]
{
    const named = (values: Record<string, unknown> | undefined): unknown => Object.entries(values ?? {}).find(([name]) => comparableText(name) === comparableText(field))?.[1];
    const set = named(change.set);
    const start = set === undefined ? before : linksIn(set);
    const removed = linksIn(named(change.remove)).map(comparableText);
    const added = linksIn(named(change.add)).filter((item) => !start.some((other) => comparableText(other) === comparableText(item)));
    return [...start, ...added].filter((item) => !removed.includes(comparableText(item)));
}
