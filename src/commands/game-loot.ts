// What the fallen carry and what a container holds is there to be found, and what is taken is the player's to say (D-530, Elena's tests of 27 and 28 October,
// where the master put a fallen foe's coins in the character's pocket): text for the master where they read it, show of the page or the close of the scene.
import { valueNamed } from "../core/text.ts";
import { readCounter } from "../counters/index.ts";
import { inheritedFields, isEmptyField, isPartyMember, type Page, type World } from "../pages/index.ts";
import type { GameSystem } from "../systems/index.ts";

/** What the master is told of what the fallen carry: there, for the player to take. */
export const lootAdvice = "tell what the party sees, and let the player say what is taken, and by whom.";

/** Whether a character or creature outside the party, a copy too, is dead or at the system's down value or below. */
export function isFallen(world: World, system: GameSystem | undefined, page: Page): boolean
{
    if (isPartyMember(page) || (page.type !== "character" && page.type !== "creature")) {
        return false;
    }

    const down = system?.down;
    const counter = down === undefined ? undefined : readCounter(valueNamed(inheritedFields(world, page), down.field));
    return page.fields.status === "dead" || (down !== undefined && counter !== undefined && counter.value <= down.value);
}

/** Whether an item holds something, as a chest. */
export function holdsItems(world: World, page: Page): boolean
{
    return page.type === "item" && !isEmptyField(valueNamed(inheritedFields(world, page), "contains"));
}

/**
 * "Fallen here: Orco 1, Orco 2 (show Orco), Varro. What they carried lies where they fell: tell…", for the close of a scene: a copy ends with it, and what it
 * carried is read on its creature, its kind. Empty when none fell.
 */
export function fallenLine(fallen: { name: string; kind?: string; }[]): string
{
    if (fallen.length === 0) {
        return "";
    }

    const kinds = new Map<string, string[]>();

    for (const one of fallen) {
        const kind = one.kind ?? one.name;
        kinds.set(kind, [...(kinds.get(kind) ?? []), one.name]);
    }

    const named = [...kinds].map(([kind, names]) => (names.length === 1 && names[0] === kind ? kind : `${names.join(", ")} (show ${kind})`)).join(", ");
    return `Fallen here: ${named}. What they carried lies where they fell: ${lootAdvice}`;
}
