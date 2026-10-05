// What holds around a page (D-153, ENV-2, ENV-3, ENV-5): the environment of the places it is in, with their effects, as outputs tell it.
import { comparableText } from "../core/text.ts";
import { environmentAt, formatEnvironmentEntry, type Page, placesAround, type World } from "../pages/index.ts";
import { effectsOf } from "./effect-layer.ts";
import { effectText } from "./game-effects.ts";

/** One thing that holds around a page, as outputs name it: "light: dark (Cripta)", "Pioggia battente until day 3, 18:00 (Palude)". */
export interface Surrounding
{
    /** What tells it apart from the others: an entry's name, or an effect and its place. */
    key: string;
    text: string;
}

/** What holds at a page, nearest first: its places' environment, each entry with its place, then their effects, each with its end and place. Nothing for no page. */
export function surroundings(world: World, page: Page | undefined): Surrounding[]
{
    if (page === undefined) {
        return [];
    }

    const entries = environmentAt(world, page).map(({ entry, place }) => ({ key: `entry ${comparableText(entry.name)}`, text: `${formatEnvironmentEntry(entry)} (${place.name})` }));
    const effects = placesAround(world, page).flatMap((place) => effectsOf(place).map((effect) => ({ key: `effect ${place.path} ${comparableText(effect.name)}`, text: `${effectText(effect)} (${place.name})` })));
    return [...entries, ...effects];
}

/** "light: dark (Cripta) · Pioggia battente until day 3, 18:00 (Palude)"; empty when nothing holds. */
export function surroundingsText(items: Surrounding[]): string
{
    return items.map((item) => item.text).join(" · ");
}

/** What changes around someone who moves (ENV-5): what holds now and did not, or differently; what held before and holds no more. */
export function surroundingsChange(before: Surrounding[], after: Surrounding[]): { here: Surrounding[]; noLonger: Surrounding[]; }
{
    const was = new Map(before.map((item) => [item.key, item.text]));
    const keys = new Set(after.map((item) => item.key));
    return { here: after.filter((item) => was.get(item.key) !== item.text), noLonger: before.filter((item) => !keys.has(item.key)) };
}
