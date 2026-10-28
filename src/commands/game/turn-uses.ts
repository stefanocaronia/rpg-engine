// What one does in a turn (D-453, TRN-1–TRN-4): the uses the system names, as an action, a bonus action, a reaction, the attacks of an action and what a
// feature gives once a turn, each at most so many until it comes back.
import { comparableText, sameWord, valueNamed } from "../../core/text.ts";
import { readCounter } from "../../counters/index.ts";
import type { Page, World } from "../../pages/index.ts";
import type { Scene } from "../../scene/index.ts";
import type { GameSystem, TurnUse } from "../../systems/index.ts";
import { effectiveFields } from "./effect-layer.ts";
import { formulaValue, workedMaximum } from "./worked-out.ts";

/** What a use did: the uses of the one who used it, as the scene keeps them, the line that says it, and the counter of the sheet it spends (TRN-5). */
export interface UsedInTurn
{
    used: string[];
    line: string;
    spends?: { field: string; before: number; max?: number; };
}

/**
 * One use of a turn (TRN-1, TRN-2): refused past its most, or in another's turn when it goes only in one's own, unless the master names what gives one more
 * (`by`, as Action Surge); a use within another, as an attack within the action, takes that one first, and counts within it (TRN-3).
 */
export function useInTurn(world: World, system: GameSystem | undefined, scene: Scene, actor: { name: string; page: Page; }, asked: string, by?: string): UsedInTurn
{
    const uses = system?.turnUses ?? {};
    const use = Object.keys(uses).find((name) => comparableText(name) === comparableText(asked));

    if (system === undefined || use === undefined) {
        const named = Object.keys(uses);

        // A game that counts no uses of a turn: nothing to mark (review of 17 October, on Ironsworn).
        if (named.length === 0) {
            throw new Error(`${system?.name ?? "The campaign's game"} counts no uses of a turn: leave scene use out. Nothing changed.`);
        }

        throw new Error(`${asked} is no use of a turn in ${system?.name}: give one of ${named.join(", ")}. Nothing changed.`);
    }

    const rule = uses[use];
    const fields = effectiveFields(world, actor.page);
    const name = actor.name;

    if (rule.needs !== undefined && !((formulaValue(world, fields, rule.needs) ?? 0) > 0)) {
        throw new Error(`${name} has no ${use}: it comes from what the sheet has, as a feature. Nothing changed.`);
    }

    const ownTurn = scene.turn !== undefined && comparableText(scene.turn) === comparableText(name);

    if (!rule.anyTurn && !ownTurn && by === undefined) {
        const whose = scene.turn === undefined ? "no one's turn" : `${scene.turn}'s turn`;
        const anyTurn = Object.entries(uses).filter(([, other]) => other.anyTurn && other.needs === undefined).map(([other]) => other);
        const instead = anyTurn.length === 0 ? "" : `; what one does in another's turn takes ${anyTurn.join(" or ")}: mark that`;
        throw new Error(`It is ${whose}, not ${name}'s: ${use} goes in its own turn${instead}. Nothing changed.`);
    }

    // What gives one more, when the sheet counts it, as action-surge for Action Surge, is spent with it (TRN-5).
    const spends = spentCounter(world, system, fields, name, by);
    const spent = spends === undefined ? "" : `; ${spends.field} ${spends.before} → ${spends.before - 1}`;
    const list = [...(scene.used?.[name] ?? [])];
    const most = (one: TurnUse): number | undefined => (one.most === undefined ? 1 : formulaValue(world, fields, one.most));
    const tagged = (entry: string, by?: string): string => (by === undefined ? entry : `${entry} by ${by}`);

    if (rule.within === undefined) {
        const count = list.filter((entry) => sameWord(baseOf(entry), use)).length;
        const limit = most(rule);

        if (limit !== undefined && count >= limit && by === undefined) {
            throw new Error(`${name} has used ${limit === 1 ? `its ${use}` : `${count} ${use}`} until its next turn${giveMore(uses, use)}. Nothing changed.`);
        }

        const noted = rule.note !== undefined && (rule.noteWhen === undefined || (formulaValue(world, fields, rule.noteWhen) ?? 0) > 0);
        const note = noted ? ` ${rule.note}` : "";
        // An action that holds more than one attack is marked by its attacks, each in turn (TRN-3).
        const inner = Object.entries(uses).find(([, other]) => other.within !== undefined && sameWord(other.within, use) && (most(other) ?? 0) > 1);
        const attacks = inner === undefined ? "" : ` If it is to attack, mark each ${inner[0]} instead, ${most(inner[1])} for ${name}, which takes the ${use}.`;
        return { used: [...list, tagged(use, by)], line: `${name}: ${use} used${by === undefined ? "" : `, by ${by}`}${spent}.${note}${attacks}`, ...(spends === undefined ? {} : { spends }) };
    }

    // An attack counts within the action it took, until another action is used (TRN-3).
    const within = rule.within;
    const taken = `${within} for ${use}`;
    const last = list.findLastIndex((entry) => sameWord(withoutBy(entry), taken));
    const since = last < 0 ? [] : list.slice(last + 1);
    const counted = since.filter((entry) => sameWord(entry, use)).length;
    const limit = most(rule);
    const of = limit === undefined ? "" : ` of ${limit}`;

    if (last >= 0 && !since.some((entry) => sameWord(baseOf(entry), within)) && (limit === undefined || counted < limit)) {
        return { used: [...list, use], line: `${name}: ${use} ${counted + 1}${of}.` };
    }

    const withinRule = system.turnUses[within];
    const withinCount = list.filter((entry) => sameWord(baseOf(entry), within)).length;
    const withinLimit = withinRule === undefined ? 1 : most(withinRule);

    if (withinLimit !== undefined && withinCount >= withinLimit && by === undefined) {
        const done = last < 0 ? "" : `, with ${counted} ${use}${of}`;
        throw new Error(`${name} has used its ${within} until its next turn${done}${giveMore(uses, within)}. Nothing changed.`);
    }

    return { used: [...list, tagged(taken, by), use], line: `${name}: ${use} 1${of}, its ${within} used${by === undefined ? "" : `, by ${by}`}${spent}.`, ...(spends === undefined ? {} : { spends }) };
}

/** The uses that are left when a turn begins (TRN-4): none of the one whose turn it is, and of the others only those that last past a turn. */
export function usesAtTurn(system: GameSystem | undefined, used: Scene["used"], turn: string): Scene["used"]
{
    const uses = system?.turnUses ?? {};

    const lasting = (entry: string): boolean => {
        const use = Object.keys(uses).find((name) => sameWord(name, baseOf(entry)));
        return use === undefined || uses[use].resets !== "each turn";
    };

    const left = Object.entries(used ?? {}).flatMap(([name, entries]): [string, string[]][] => {
        const kept = sameWord(name, turn) ? [] : entries.filter(lasting);
        return kept.length === 0 ? [] : [[name, kept]];
    });
    return left.length === 0 ? undefined : Object.fromEntries(left);
}

/**
 * The uses a turn's reminder names (TRN-1): those that stand alone, as the action, the bonus action and the reaction; the attacks within the action and what
 * a feature gives, as Sneak Attack, stay the master's to mark when it will, and are counted then (playtests 05 and 05b: the master counts them right).
 */
export function turnUsesOf(system: GameSystem | undefined): string[]
{
    return Object.entries(system?.turnUses ?? {}).filter(([, rule]) => rule.within === undefined && rule.needs === undefined).map(([use]) => use);
}

/** The uses a turn shows, as the dashboard's marks (TRN-4): those that stand alone, used or not, for who acts. */
export function turnMarks(system: GameSystem | undefined, scene: Scene, name: string): { use: string; used: boolean; }[]
{
    const list = scene.used?.[name] ?? [];
    return Object.entries(system?.turnUses ?? {}).filter(([, rule]) => rule.within === undefined && rule.needs === undefined).map(([use]) => ({
        use,
        used: list.some((entry) => sameWord(baseOf(entry), use)),
    }));
}

/** The counter of the sheet that `by` names, as action-surge for "Action Surge", with what it holds, a full one when not written yet; refused at 0. */
function spentCounter(world: World, system: GameSystem, fields: Record<string, unknown>, name: string, by: string | undefined): UsedInTurn["spends"]
{
    const wanted = by === undefined ? undefined : comparableText(by).replace(/\s+/g, "-");
    const field = wanted === undefined ? undefined : Object.keys(system.fields).find((key) => system.fields[key] === "counter" && comparableText(key) === wanted);

    if (by === undefined || field === undefined) {
        return undefined;
    }

    const written = readCounter(valueNamed(fields, field));
    const max = workedMaximum(world, fields, field)?.value;
    const most = typeof max === "number" ? max : written?.max;
    const before = written?.value ?? most;

    if (before === undefined) {
        return undefined;
    }

    if (before <= 0) {
        throw new Error(`${name} has ${field} 0: ${by} gives nothing more until it comes back. Nothing changed.`);
    }

    return { field, before, ...(most === undefined ? {} : { max: most }) };
}

/** What a refusal adds (TRN-2): what another use makes is marked as that use, the game's own named; by only for what gives one more. */
function giveMore(uses: Record<string, TurnUse>, use: string): string
{
    const others = Object.entries(uses).filter(([name, rule]) => !sameWord(name, use) && rule.within === undefined && rule.needs === undefined).map(([name]) => name);
    const as = others.length === 0 ? "" : `, as with ${others.join(" or ")},`;
    return `: what another use makes${as} is marked as that use; add by and what only for what gives one more, as a feature by its name`;
}

/** "action for attack by Action Surge" is an action, taken for an attack. */
function baseOf(entry: string): string
{
    return withoutBy(entry).replace(/ for .*$/, "");
}

/** "action for attack by Action Surge" without what gave it: "action for attack". */
function withoutBy(entry: string): string
{
    return entry.replace(/ by .*$/, "");
}
