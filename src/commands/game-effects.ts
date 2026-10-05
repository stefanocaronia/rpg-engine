// The effects on pages and copies as several commands use them (D-123, D-132, D-138): who holds them, how they are written, and when they end.
import type { Context } from "../core/context.ts";
import { appendLogEntry } from "../core/log.ts";
import type { Problem } from "../core/problem.ts";
import { comparableText } from "../core/text.ts";
import { type Effect, endsAtTurn, formatEffect, formatEnd, keeperOf, readEffects } from "../effects/index.ts";
import { concernsPlayer, isEmptyField, type Page, type World, writePage } from "../pages/index.ts";
import type { Scene } from "../scene/index.ts";
import { type GameDate, minutesBetween, readGameDate } from "../time/index.ts";
import { effectsField, effectsOf, valuesChanged, withEffects } from "./effect-layer.ts";
import { copyPage, updateScene } from "./game-scene.ts";
import { newDatedLogEntry } from "./game-time.ts";
import { shortList } from "./notes.ts";

/** Who holds effects: a page, or a copy in the open scene seen as a page (INH-14). */
export interface EffectHolder
{
    page: Page;
    copy: boolean;
}

/** Writes a holder's effects; the field goes when none is left. */
export function saveEffects(root: string, world: World, holder: EffectHolder, effects: Effect[]): void
{
    const lines = effects.length === 0 ? undefined : effects.map(formatEffect);

    if (holder.copy) {
        updateScene(root, [[["copies", holder.page.name, "effects"], lines]]);
    } else {
        writePage(world, holder.page.name, undefined, lines === undefined ? { unset: ["effects"] } : { set: { effects: lines } });
    }
}

/**
 * Ends, on every page and on the copies of `scene`, the effects that `ends` picks (EFF-8, EFF-9, EFF-13), with a line in the log for each, public when it concerns
 * the player (EFF-11). Returns what ended, with the values that come back, "Scudo della fede on Ennio (ac 15 → 13)", ten at most. It never fails halfway:
 * a page that two pages' names share, or that cannot be written, is said, not written.
 */
export function endEffects(root: string, context: Context, world: World, scene: Scene | undefined, ends: (effect: Effect) => boolean, why: string | ((effect: Effect) => string)): string[]
{
    const ended: string[] = [];
    const whyOf = typeof why === "string" ? (): string => why : why;

    for (const holder of effectHolders(world, scene)) {
        const effects = effectsOf(holder.page);
        const ending = effects.filter(ends);

        if (ending.length === 0) {
            continue;
        }

        const remaining = effects.filter((effect) => !ending.includes(effect));
        const values = ending.flatMap((effect) => valuesChanged(world, holder.page, withEffects(holder.page, remaining), effect));
        const named = `${ending.map((effect) => effect.name).join(", ")} on ${holder.page.name}`;

        try {
            saveEffects(root, world, holder, remaining);
        } catch (error) {
            ended.push(`${named}: not written, ${error instanceof Error ? error.message : String(error)}`);
            continue;
        }

        const visibility = !holder.copy && concernsPlayer(world, holder.page) ? "public" : "hidden";

        for (const effect of ending) {
            appendLogEntry(root, newDatedLogEntry(root, context, "effect-ended", visibility, { page: holder.page.name, copy: holder.copy ? true : undefined, effect: effect.name, why: whyOf(effect) }));
        }

        ended.push(`${named}${values.length === 0 ? "" : ` (${values.join(", ")})`}`);
    }

    return ended.length <= 10 ? ended : [shortList(ended, " · ")];
}

/** Whether an effect's end in game time has come (EFF-8). */
export function endedByDate(effect: Effect, now: GameDate): boolean
{
    const date = effect.end !== undefined && "date" in effect.end ? readGameDate(effect.end.date) : undefined;
    return date !== undefined && minutesBetween(now, date) <= 0;
}

/** Whether an effect counted in rounds ends when the turn passes to `turn` in `round` (EFF-9). */
export function endedByTurn(effect: Effect, round: number, turn: string, order: string[]): boolean
{
    return effect.end !== undefined && "round" in effect.end && endsAtTurn(effect.end, round, turn, order);
}

/** Whether an effect ends with the scene: counted in rounds, which exist only in it, or lasting until it ends (EFF-9). */
export function endsWithScene(effect: Effect): boolean
{
    return effect.end !== undefined && ("round" in effect.end || "scene" in effect.end);
}

/** Whether someone keeps an effect alive (D-138). */
export function keptBy(effect: Effect, name: string): boolean
{
    const keeper = keeperOf(effect);
    return keeper !== undefined && comparableText(keeper) === comparableText(name);
}

/** "Spaventato until round 3, Lena": an effect as status names it, as its line writes it but its values. */
export function effectText(effect: Effect): string
{
    return effect.end === undefined ? effect.name : `${effect.name} until ${formatEnd(effect.end)}`;
}

/** "Benedizione (Ennio, Bruno)": what someone keeps alive, on whom (D-138). */
export function keptEffects(world: World, scene: Scene | undefined, name: string): string[]
{
    const kept = new Map<string, string[]>();

    for (const holder of effectHolders(world, scene)) {
        for (const effect of effectsOf(holder.page).filter((candidate) => keptBy(candidate, name))) {
            kept.set(effect.name, [...(kept.get(effect.name) ?? []), holder.page.name]);
        }
    }

    return [...kept].map(([effect, holders]) => `${effect} (${holders.join(", ")})`);
}

/**
 * The problems of effects (EFF-12): fields that do not read, ends that are not game dates, effects ended and still there, effects that end with a scene
 * when none is open. `sceneProblem` says why the open scene cannot be read, if it cannot.
 */
export function effectProblems(world: World, scene: Scene | undefined, now: GameDate | undefined, sceneProblem?: string): Problem[]
{
    return effectHolders(world, scene).flatMap(({ page, copy }) => {
        const path = copy ? "state.yaml" : page.path;
        const read = readEffects(effectsField(page));

        if ("problem" in read) {
            const fix =
                `write each line of effects in quotes, such as - "Scudo della fede (ac: 15) until day 2, 14:20", and each effect once; or remove them all with write ${page.name}, unset effects, and add again with effect add those that still hold`;
            return [{ path, message: `${page.name}: ${read.problem}`, fix }];
        }

        return read.effects.flatMap((effect): Problem[] => {
            const end = effect.end;
            const endIt = `effect end ${page.name} "${effect.name}"`;

            if (end !== undefined && "date" in end && readGameDate(end.date) === undefined) {
                return [{ path, message: `${effect.name} on ${page.name} ends "${end.date}", which is not a game date.`, fix: `${endIt}, then add it again with a duration` }];
            }

            if (end !== undefined && now !== undefined && endedByDate(effect, now)) {
                return [{ path, message: `${effect.name} on ${page.name} ended at ${formatEnd(end)}, and is still there.`, fix: `let time pass with advance, which ends it, or ${endIt}` }];
            }

            if (endsWithScene(effect) && scene === undefined) {
                const why = sceneProblem === undefined ? "no scene is open" : `the open scene cannot be read (${sceneProblem})`;
                return [{ path, message: `${effect.name} on ${page.name} ends with the scene, but ${why}.`, fix: endIt }];
            }

            return [];
        });
    });
}

/** The pages and the copies in the open scene that hold effects. */
function effectHolders(world: World, scene: Scene | undefined): EffectHolder[]
{
    const copies = scene === undefined ? [] : Object.entries(scene.copies).map(([name, copy]) => ({ page: copyPage(name, copy), copy: true }));
    return [...world.pages.map((page) => ({ page, copy: false })), ...copies].filter((holder) => !isEmptyField(effectsField(holder.page)));
}
