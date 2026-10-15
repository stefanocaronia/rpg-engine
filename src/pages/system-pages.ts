// The pages of the campaign's game system as commands meet them: read-only, in no place, and never hidden by a page of the campaign (SYS-4, SYS-6).
import type { FieldKind } from "../core/field-kind.ts";
import { comparableText, withArticle } from "../core/text.ts";
import type { PageType } from "./page-types.ts";
import type { Page, World } from "./world.ts";

/**
 * Why a page of the game system never goes in a knows: anyone may know its rules, and a creature's numbers are the master's, which the player's view never
 * shows (SYS-6, D-254); what a character learns of a creature goes in a secret of a page of the campaign.
 */
export function systemKnowsReason(page: Page): string
{
    return page.type === "creature"
        ? "whose numbers are the master's, never shown in the player's view (what a character learns of it goes in a secret of a page of the campaign)"
        : "which anyone may know";
}

/** The kind the game system declares for a field, by its name in any case (SYS-8); undefined when it declares none. */
export function declaredKind(world: World, field: string): FieldKind | undefined
{
    const fields = world.system?.fields;
    return fields === undefined ? undefined : kindsOf(fields).get(comparableText(field));
}

/** The kinds a system declares, by the name as it is compared, the first written winning: built once for each system, as every field read asks (D-194). */
function kindsOf(fields: Record<string, FieldKind>): Map<string, FieldKind>
{
    let kinds = kindsByFields.get(fields);

    if (kinds === undefined) {
        kinds = new Map();

        for (const [name, kind] of Object.entries(fields)) {
            if (!kinds.has(comparableText(name))) {
                kinds.set(comparableText(name), kind);
            }
        }

        kindsByFields.set(fields, kinds);
    }

    return kinds;
}

const kindsByFields = new WeakMap<Record<string, FieldKind>, Map<string, FieldKind>>();

/** Whether the game system declares a field as something never counted: a number, text or a list, such as cr 1/4 or cost 15 gp (SYS-8). */
export function isDeclaredUncounted(world: World, field: string): boolean
{
    const kind = declaredKind(world, field);
    return kind !== undefined && kind !== "counter";
}

/** "a creature of the system 5e": what a page of the game system is, for messages. */
export function systemLabel(page: Page): string
{
    return `${withArticle(page.type ?? "page")} of the system ${page.system ?? ""}`;
}

/** The list where the game system puts a page for every character who keeps the sheet, as equipped for the unarmed strike (DAT-13); undefined for any other page. */
export function alwaysInList(world: World, page: Page): string | undefined
{
    return page.system === undefined ? undefined : Object.entries(world.system?.alwaysIn ?? {}).find(([, names]) => names.some((name) => comparableText(name) === comparableText(page.name)))?.[0];
}

/** "Unarmed Strike is an item of the system 5e that it puts in the equipped of every character with a sheet…": why no one writes or equips it (DAT-13). */
export function alwaysInMessage(page: Page, list: string): string
{
    return `${page.name} is ${
        systemLabel(page)
    } that it puts in the ${list} of every character with a sheet, worked out on each from their own fields: read-only, and never equipped, carried or derived from by hand, which would count it twice.`;
}

/**
 * Why a page of the game system cannot be written, and what to write instead: a page of the campaign that derives from it (SYS-6, SYS-7); for one the system puts
 * in a list of every character, that it is there already (DAT-13).
 */
export function readOnlyMessage(page: Page, fields: string[] = [], world?: World): string
{
    const list = world === undefined ? undefined : alwaysInList(world, page);

    if (list !== undefined) {
        return `${alwaysInMessage(page, list)} Nothing changed.`;
    }

    if (page.type === "creature") {
        const set = [`creature=[[${page.name}]]`, ...fields].join(", ");
        return `${page.name} is ${systemLabel(page)}: read-only. For a kind of your own, create a creature that derives from it, under a name in the campaign's language: `
            + `write "<name>", type creature, set ${set}; for one in particular, a character with creature=[[${page.name}]]. Nothing changed.`;
    }

    if (page.type === "item") {
        const set = [`item=[[${page.name}]]`, ...fields].join(", ");
        return `${page.name} is ${systemLabel(page)}: read-only. For one that someone has, create an item that derives from it, under a name in the campaign's language: `
            + `write "<name>", type item, set ${set}, then move it to them. Nothing changed.`;
    }

    return `${page.name} is ${systemLabel(page)}: read-only. Nothing changed.`;
}

/**
 * Why a page of the campaign cannot take the name of a page of the game system, which it would hide (SYS-4), with the name to give it instead; `fields` are those the refused
 * write gave, such as hp=15/15, for the call to make instead.
 */
export function hidingMessage(page: Page, type: PageType | undefined, fields: string[] = []): string
{
    const field = page.type === "creature" && (type === "creature" || type === "character") ? "creature" : page.type === "item" && type === "item" ? "item" : undefined;
    const set = [`${field ?? ""}=[[${page.name}]]`, ...fields].join(", ");
    const derived = field === undefined
        ? ` Give ${type === undefined ? "it" : `this ${type}`} another name.`
        : ` Give yours a name of its own, with ${field}=[[${page.name}]]: write "<name>", type ${type ?? ""}, set ${set}.`;
    return `${page.name} is ${systemLabel(page)}: a page of the campaign with that name would hide it.${derived} Nothing changed.`;
}

/**
 * Why a page of the game system goes into no container but as a stack (SYS-6, STK-1), and what to do instead; `holder` is where it was to go, `notKind` why an item is no kind
 * to count, if it is not one.
 */
export function heldSystemPageMessage(page: Page, holder: { name: string; type?: PageType; }, world?: World, notKind?: string): string
{
    const always = world === undefined ? undefined : alwaysInList(world, page);

    if (always !== undefined) {
        return alwaysInMessage(page, always);
    }

    if (page.type === "item" && notKind === undefined) {
        const list = holder.type === "character" ? "inventory" : "contains";
        return `${page.name} is ${systemLabel(page)}, a kind counted in stacks: write ${holder.name}, add ${list}="[[${page.name}]] 1", with how many.`;
    }

    if (page.type === "item") {
        return `${page.name} is ${systemLabel(page)}, and ${notKind}. To give ${holder.name} one, create it under a name in the campaign's language: `
            + `write "<name>", type item, set item=[[${page.name}]]; then move, page "<name>", to ${holder.name}.`;
    }

    return page.type === "creature" ? kindMessage(page) : `${page.name} is ${systemLabel(page)}, which is nowhere.`;
}

/** A creature of the game system is a kind: how one enters the story instead (SYS-6, SYS-7). */
export function kindMessage(page: Page): string
{
    return `${page.name} is ${systemLabel(page)}, a kind and read-only: one in a fight is a copy, brought in with scene, creatures ${page.name}=1; `
        + `one with a name of its own is a character with creature=[[${page.name}]].`;
}
