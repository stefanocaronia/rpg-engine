// The state checks (D-467, D-473, CHK-1–CHK-4): what the party and the open scene hold that cannot be true together, said to the master with how to fix it;
// never a change. The core's rules read the system's own data; a system adds its own with checks.
import type { Context } from "../core/context.ts";
import type { Problem } from "../core/problem.ts";
import { comparableText, sameName, valueNamed } from "../core/text.ts";
import { formatCounter, readCounter } from "../counters/index.ts";
import { keeperOf } from "../effects/index.ts";
import { inheritedFields, isPartyMember, type Page, pagesWithName, parsePageReference, type World } from "../pages/index.ts";
import type { Scene } from "../scene/index.ts";
import type { CheckAtom, CheckOperator, GameSystem, SystemCheck } from "../systems/index.ts";
import { effectsOf } from "./effect-layer.ts";
import { keptEffects } from "./game-effects.ts";
import { readOpenScene } from "./game-scene.ts";
import { campaignSystem, campaignWorld } from "./game-world.ts";

/** A contradiction in the state: the rule that found it, the page it is on, and the line for the master. */
export interface Contradiction
{
    rule: string;
    page: Page;
    line: string;
}

/** Every contradiction now (CHK-3), for status and validate. */
export function allStateChecks(root: string, context: Context): Contradiction[]
{
    const system = campaignSystem(root, context);

    if (system === undefined) {
        return [];
    }

    const world = campaignWorld(root, context);
    const scene = readOpenScene(root).scene;
    return checkedPages(world, scene).flatMap((page) => [
        ...said("kept-broken", page, keptWhileBroken(world, scene, system, page)),
        ...said("awake-at-dying", page, awakeAtDying(world, system, page)),
        ...system.checks.flatMap((check, index) => said(`system-${index}`, page, systemCheck(world, check, page))),
    ]);
}

/** The contradictions not yet told in this chat, for scene next and advance (CHK-3): each once while it lasts, again when it comes back; every one without a chat. */
export function newStateChecks(root: string, context: Context): string[]
{
    const all = allStateChecks(root, context);
    const told = context.told;

    if (told === undefined) {
        return all.map((found) => found.line);
    }

    const fresh = all.filter((found) => !told.has(checkKey(found)));
    markStateChecksTold(context, all);
    return fresh.map((found) => found.line);
}

/** Every contradiction as a problem of validate, on the page it is on (CHK-3). */
export function stateCheckProblems(root: string, context: Context): Problem[]
{
    return allStateChecks(root, context).map((found) => ({ path: found.page.path, message: found.line }));
}

/** Marks these contradictions told, the whole of them now, and forgets those that hold no more, so that one that comes back is told again (CHK-3). */
export function markStateChecksTold(context: Context, found: Contradiction[]): void
{
    const told = context.told;
    const now = new Set(found.map(checkKey));

    for (const key of [...(told ?? [])].filter((name) => name.startsWith(keyPrefix) && !now.has(name))) {
        told?.delete(key);
    }

    now.forEach((key) => told?.add(key));
}

const keyPrefix = "check:";

function checkKey(found: Contradiction): string
{
    return `${keyPrefix}${found.rule}:${comparableText(found.page.name)}`;
}

function said(rule: string, page: Page, line: string | undefined): Contradiction[]
{
    return line === undefined ? [] : [{ rule, page, line }];
}

/** Who is checked (CHK-1): the party, alive or dead, and the characters of the open scene; never a copy nor the rest of the world. */
function checkedPages(world: World, scene: Scene | undefined): Page[]
{
    const inScene = (scene?.with ?? []).flatMap((link) => pagesWithName(world, parsePageReference(link).name).slice(0, 1));
    return [...new Set([...world.pages.filter(isPartyMember), ...inScene].filter((page) => page.type === "character" && page.system === undefined))];
}

/** Who keeps an effect alive while a condition that breaks it is on them (EFF-14), as concentration held while Unconscious. */
function keptWhileBroken(world: World, scene: Scene | undefined, system: GameSystem, page: Page): string | undefined
{
    const keeping = system.keeping;
    const condition = effectsOf(page).find((effect) => sameName(keeping?.conditions ?? [], effect.name) !== undefined)?.name;
    const kept = keeping === undefined || condition === undefined ? [] : keptEffects(world, scene, page.name);
    return kept.length === 0 ? undefined : `${page.name} keeps ${kept.join(" · ")} but is ${condition}, which breaks it: effect end, by [[${page.name}]]. Read rules ${keeping?.rules}.`;
}

/**
 * One of the party at the system's dying value, or below, with none of the conditions that keep from acting (DIE-1), as when one was ended by hand; never anyone
 * else, as a foe at 0 is dead in the game's rules (review of 19 October).
 */
function awakeAtDying(world: World, system: GameSystem, page: Page): string | undefined
{
    const dying = system.dying;

    if (!isPartyMember(page)) {
        return undefined;
    }

    const inactive = system.combat?.inactive ?? [];
    // The page's own counter: what a form that gives it holds is not the page's (DIE-8).
    const counter = dying === undefined ? undefined : readCounter(valueNamed(inheritedFields(world, page), dying.field));

    if (dying === undefined || counter === undefined || counter.value > dying.value || inactive.length === 0 || page.fields.status === "dead") {
        return undefined;
    }

    if (effectsOf(page).some((effect) => sameName(inactive, effect.name) !== undefined)) {
        return undefined;
    }

    const rule = system.thresholds.find((threshold) => comparableText(threshold.field) === comparableText(dying.field) && threshold.value === dying.value)?.rule;
    const read = rule === undefined ? "" : ` Read rules ${rule}.`;
    return `${page.name} is at ${dying.field} ${formatCounter(counter)}, not marked dead, with none of ${inactive.join(", ")}: raise its ${dying.field} as its rules say, `
        + `give it one of them back, or write status=dead.${read}`;
}

/** A check of the system (CHK-2): its line when `when` holds and `needs` does not; nothing when a field it reads is not on the page. */
function systemCheck(world: World, check: SystemCheck, page: Page): string | undefined
{
    const fields = inheritedFields(world, page);
    const when = holds(page, fields, check.when);
    const needs = holds(page, fields, check.needs);

    if (when !== true || needs !== false) {
        return undefined;
    }

    return check.say.replace(/\{([^{}]+)\}/g, (whole, name: string) => {
        if (name === "page") {
            return page.name;
        }

        const value = valueNamed(fields, name);
        return value === undefined ? whole : `${name} ${String(value)}`;
    });
}

/** Whether an atom holds on a page: an effect without end or keeper on it, or a field against a number; undefined when the field is not there. */
function holds(page: Page, fields: Record<string, unknown>, atom: CheckAtom): boolean | undefined
{
    if ("effect" in atom) {
        return effectsOf(page).some((effect) => comparableText(effect.name) === comparableText(atom.effect) && effect.end === undefined && keeperOf(effect) === undefined);
    }

    const value = readCounter(valueNamed(fields, atom.field))?.value;
    return value === undefined ? undefined : compare(value, atom.op, atom.value);
}

function compare(value: number, op: CheckOperator, against: number): boolean
{
    switch (op) {
        case "<":
            return value < against;
        case "<=":
            return value <= against;
        case "=":
            return value === against;
        case "!=":
            return value !== against;
        case ">=":
            return value >= against;
        case ">":
            return value > against;
    }
}
