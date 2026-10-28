// What a fight asks the master to keep by hand, said when it happens (D-266): what can break what someone keeps alive (EFF-14), the effects at a turn and at a rest
// (EFF-15), the counter that shields another (DAT-14). The engine only says it: it ends and changes nothing by itself.
import { comparableText } from "../../core/text.ts";
import { readCounter } from "../../counters/index.ts";
import { type Effect, keeperOf } from "../../effects/index.ts";
import type { Page, World } from "../../pages/index.ts";
import type { Scene } from "../../scene/index.ts";
import type { GameSystem } from "../../systems/index.ts";
import { effectiveFields, effectsOf } from "./effect-layer.ts";
import { effectsOn, keptEffectHolders, keptEffects, systemNamed } from "./effects.ts";

/** "Viola keeps Eroismo (Corrado): lost 7 hp. Read rules Concentration.": what someone keeps alive, when the counter the game system names goes down by `lost` (EFF-14). */
export function keepingLossNote(world: World, scene: Scene | undefined, system: GameSystem | undefined, name: string, field: string, lost: number): string
{
    const keeping = system?.keeping;

    // Damage a shield takes first, as temporary hit points, is damage still.
    const shielded = Object.entries(system?.shields ?? {}).find(([shield]) => comparableText(shield) === comparableText(field))?.[1] ?? field;

    if (keeping === undefined || comparableText(shielded) !== comparableText(keeping.counter) || !(lost > 0)) {
        return "";
    }

    const kept = keptEffects(world, scene, name);
    return kept.length === 0 ? "" : `${name} keeps ${kept.join(" · ")}: lost ${lost} ${field}. Read rules ${keeping.rules}.`;
}

/**
 * "Corrado keeps Scudo della fede (Viola): now Paralyzed, which breaks it…": what someone keeps alive, when they take a condition the game system names (EFF-14),
 * maybe in the campaign's language (D-403).
 */
export function keepingConditionNote(world: World, scene: Scene | undefined, system: GameSystem | undefined, name: string, condition: string, words: Record<string, string> | undefined): string
{
    const keeping = system?.keeping;

    if (keeping === undefined || systemNamed(keeping.conditions, condition, words) === undefined) {
        return "";
    }

    const kept = keptEffects(world, scene, name);
    // The condition breaks it whatever a loss of the same change would ask (playtest 13: a save offered at 0 hp).
    return kept.length === 0 ? "" : `${name} keeps ${kept.join(" · ")}: now ${condition}, which breaks it, whatever else asks for a save: effect end, by [[${name}]]. Read rules ${keeping.rules}.`;
}

/**
 * "Malco already keeps Scudo della fede (Malco). Read rules Concentration.": someone given one more effect to keep alive, read in the world before it was added (EFF-14).
 * The same effect on another target is the same thing kept, as Bless on three.
 */
export function secondKeptNote(world: World, scene: Scene | undefined, system: GameSystem | undefined, effect: Effect): string
{
    const keeper = keeperOf(effect);

    if (system?.keeping === undefined || keeper === undefined) {
        return "";
    }

    const others = keptEffectHolders(world, scene, keeper).filter((kept) => comparableText(kept.effect) !== comparableText(effect.name));
    return others.length === 0 ? "" : `${keeper} already keeps ${others.map((kept) => `${kept.effect} (${kept.holders.join(", ")})`).join(" · ")}. Read rules ${system.keeping.rules}.`;
}

/** "End of Malco's turn: Paralyzed (by Corrado). Start of Ghoul 1's turn: In fiamme.": the effects on who ends a turn and on who starts the next, as the turn passes (EFF-15). */
export function turnEffectsNote(world: World, scene: Scene | undefined, ending: string | undefined, starting: string): string
{
    const on = (name: string): string[] => effectsOn(world, scene, name).map(effectWithKeeper);
    const parts = [
        ending === undefined || on(ending).length === 0 ? "" : `End of ${ending}'s turn: ${on(ending).join(", ")}.`,
        on(starting).length === 0 ? "" : `Start of ${starting}'s turn: ${on(starting).join(", ")}.`,
    ].filter((part) => part !== "");
    return parts.length === 0 ? "" : `${parts.join(" ")} Read in their text what acts now.`;
}

/** "Still on Corrado, with no end: Mummy Rot.": the effects without an end on who rests, whose text may ask for something at a rest (EFF-15). */
export function restingEffectsNote(page: Page): string
{
    const endless = effectsOf(page).filter((effect) => effect.end === undefined).map(effectWithKeeper);
    return endless.length === 0 ? "" : `Still on ${page.name}, with no end: ${endless.join(", ")}. Read in their text whether a rest asks for something.`;
}

/**
 * "Corrado has temp-hp 3, which goes first: …": a counter that shields the one that went down by `lost`, while it is above 0 (DAT-14). The change took it all
 * from the shielded counter, which fell by `fell`, never below its least: the note says how to put it right, in numbers.
 */
export function shieldNotes(world: World, system: GameSystem | undefined, page: Page, field: string, lost: number, fell: number): string[]
{
    if (system === undefined || !(lost > 0)) {
        return [];
    }

    const fields = Object.entries(effectiveFields(world, page));
    return Object.entries(system.shields).filter(([, shielded]) => comparableText(shielded) === comparableText(field)).flatMap(([shield]) => {
        const value = readCounter(fields.find(([name]) => comparableText(name) === comparableText(shield))?.[1])?.value ?? 0;
        const rule = system.thresholds.find((threshold) => comparableText(threshold.field) === comparableText(shield))?.rule;
        const read = rule === undefined ? "" : ` Read rules ${rule}.`;
        // What the shield takes, and what the counter should have lost after it: given back only what it lost beyond that (review of 17 October).
        const taken = Math.min(value, lost);
        const back = Math.max(0, fell - (lost - taken));
        const right = back > 0 ? `change ${shield} by -${taken} and ${field} by +${back}` : `change ${shield} by -${taken}; ${field} stays as it is`;
        return value > 0 ? [`${page.name} has ${shield} ${value}, which goes first: if this was damage, ${shield} takes ${taken} of it: ${right}.${read}`] : [];
    });
}

/** "Paralyzed (by Corrado)": an effect with who keeps it alive. */
function effectWithKeeper(effect: Effect): string
{
    const keeper = keeperOf(effect);
    return keeper === undefined ? effect.name : `${effect.name} (by ${keeper})`;
}
