// What a fight asks the master to keep by hand, said when it happens (D-266): what can break what someone keeps alive (EFF-14), the effects at a turn and at a rest
// (EFF-15), the counter that shields another (DAT-14). The engine only says it: it ends and changes nothing by itself.
import { comparableText } from "../core/text.ts";
import { readCounter } from "../counters/index.ts";
import { type Effect, keeperOf } from "../effects/index.ts";
import type { Page, World } from "../pages/index.ts";
import type { Scene } from "../scene/index.ts";
import type { GameSystem } from "../systems/index.ts";
import { effectiveFields, effectsOf } from "./effect-layer.ts";
import { effectsOn, keptEffects } from "./game-effects.ts";

/** "Viola keeps Eroismo (Corrado): lost 7 hp. Read rules Concentration.": what someone keeps alive, when the counter the game system names goes down by `lost` (EFF-14). */
export function keepingLossNote(world: World, scene: Scene | undefined, system: GameSystem | undefined, name: string, field: string, lost: number): string
{
    const keeping = system?.keeping;

    if (keeping === undefined || comparableText(field) !== comparableText(keeping.counter) || !(lost > 0)) {
        return "";
    }

    const kept = keptEffects(world, scene, name);
    return kept.length === 0 ? "" : `${name} keeps ${kept.join(" · ")}: lost ${lost} ${field}. Read rules ${keeping.rules}.`;
}

/** "Corrado keeps Scudo della fede (Viola): now Paralyzed. Read rules Concentration.": what someone keeps alive, when they take a condition the game system names (EFF-14). */
export function keepingConditionNote(world: World, scene: Scene | undefined, system: GameSystem | undefined, name: string, condition: string): string
{
    const keeping = system?.keeping;

    if (keeping === undefined || !keeping.conditions.some((named) => comparableText(named) === comparableText(condition))) {
        return "";
    }

    const kept = keptEffects(world, scene, name);
    return kept.length === 0 ? "" : `${name} keeps ${kept.join(" · ")}: now ${condition}. Read rules ${keeping.rules}.`;
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

    const others = keptEffects(world, scene, keeper).filter((kept) => comparableText(kept.slice(0, kept.lastIndexOf(" ("))) !== comparableText(effect.name));
    return others.length === 0 ? "" : `${keeper} already keeps ${others.join(" · ")}. Read rules ${system.keeping.rules}.`;
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
 * from the shielded counter: the note says how to put it right.
 */
export function shieldNotes(world: World, system: GameSystem | undefined, page: Page, field: string, lost: number): string[]
{
    if (system === undefined || !(lost > 0)) {
        return [];
    }

    const fields = Object.entries(effectiveFields(world, page));
    return Object.entries(system.shields).filter(([, shielded]) => comparableText(shielded) === comparableText(field)).flatMap(([shield]) => {
        const value = readCounter(fields.find(([name]) => comparableText(name) === comparableText(shield))?.[1])?.value ?? 0;
        const rule = system.thresholds.find((threshold) => comparableText(threshold.field) === comparableText(shield))?.rule;
        const read = rule === undefined ? "" : ` Read rules ${rule}.`;
        return value > 0 ? [`${page.name} has ${shield} ${value}, which goes first: if this was damage, give ${field} back what ${shield} takes and take it from ${shield}, with change.${read}`] : [];
    });
}

/** "Paralyzed (by Corrado)": an effect with who keeps it alive. */
function effectWithKeeper(effect: Effect): string
{
    const keeper = keeperOf(effect);
    return keeper === undefined ? effect.name : `${effect.name} (by ${keeper})`;
}
