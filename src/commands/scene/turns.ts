// Order, next, a use of a turn, leaving, and the reminders for whoever acts next
import type { Context } from "../../core/context.ts";
import { appendLogEntry } from "../../core/log.ts";
import { comparableText, sameName } from "../../core/text.ts";
import type { Effect } from "../../effects/index.ts";
import { concernsPlayer, findPage, isPlayerCharacter, type Page, parsePageReference, playerCharacters, type World, writePage } from "../../pages/index.ts";
import { nextTurn, type Scene } from "../../scene/index.ts";
import { newStateChecks } from "../shared/campaign/checks.ts";
import { campaignSystem, campaignSystemWords, campaignWorld } from "../shared/campaign/world.ts";
import { packagesTurnStarted } from "../shared/packages/hooks.ts";
import { clearCopies, placeGrid, standing } from "../shared/places/grids.ts";
import { endedByTurn, endEffects, keptBy, systemNamed } from "../shared/scene/effects.ts";
import { turnEffectsNote } from "../shared/scene/reminders.ts";
import { copyCounters, copyPage, readOpenScene, scenePlace, updateScene } from "../shared/scene/scene.ts";
import { effectsOf } from "../shared/sheet/effect-layer.ts";
import { turnUsesOf, useInTurn, usesAtTurn } from "../shared/sheet/turn-uses.ts";
import { newDatedLogEntry } from "../shared/time/time.ts";
import { memberNames } from "./members.ts";
import type { SceneInput, SceneResult, Turns } from "./result.ts";

/** Takes out who goes (D-114): a copy vanishes with its numbers, a character leaves the scene without changing place. The turn of who leaves passes on. */
export function leave(root: string, world: World, who: string[], context: Context, current: Scene): SceneResult
{
    if (who.length === 0) {
        throw new Error('Give who leaves the scene, such as who "Annegato 2".');
    }

    const members = memberNames(current);
    const leaving = who.map((name) => {
        const member = sameName(members, parsePageReference(name).name);

        if (member === undefined) {
            throw new Error(`${name} is not in the scene. In it: ${members.length === 0 ? "no one" : members.join(", ")}.`);
        }

        return member;
    }).filter((name, index, all) => all.indexOf(name) === index);
    const copies = Object.fromEntries(Object.entries(current.copies).filter(([name]) => leaving.includes(name)));
    const staying = Object.keys(current.copies).filter((name) => !leaving.includes(name));
    const changes: [string[], unknown][] = [[["with"], current.with.filter((link) => !leaving.includes(parsePageReference(link).name))]];
    changes.push(...(staying.length === 0 ? [[["copies"], undefined] as [string[], unknown]] : Object.keys(copies).map((name): [string[], unknown] => [["copies", name], undefined])));
    const order = current.order?.filter((name) => !leaving.includes(name));
    const kept = order === undefined || order.length === 0 ? undefined : keptTurn(current, order);
    const turns = order === undefined || kept === undefined ? undefined : { order, ...kept, player: isPlayerTurn(world, kept.turn), ...severalPlayers(world) };

    if (current.order !== undefined) {
        changes.push([["order"], turns?.order], [["turn"], turns?.turn]);

        if (turns !== undefined) {
            changes.push([["round"], turns.round]);
        }
    }

    changes.push([["left"], [...(current.left ?? []), ...leaving]]);
    // Who leaves is hostile no more (D-415).
    const hostile = current.hostile?.filter((name) => !leaving.includes(name));

    if (current.hostile !== undefined) {
        changes.push([["hostile"], hostile === undefined || hostile.length === 0 ? undefined : hostile]);
    }

    // A copy that leaves, fallen or fled, is kept as it left, without its effects, which go with it (D-145): closing the scene counts what overcoming it gives (DAT-11).
    changes.push(...Object.entries(copies).map(([name, copy]): [string[], unknown] => [["gone", name], Object.fromEntries(Object.entries(copy).filter(([field]) => field !== "effects"))]));

    updateScene(root, changes);
    clearCopies(world, current, Object.keys(copies));
    // The turn it moves to, as next logs it, so that the open scene's log reads the round (SCN-10).
    const moved = turns === undefined || (turns.turn === current.turn && turns.round === (current.round ?? 1)) ? {} : { round: turns.round, turn: turns.turn };
    appendLogEntry(root, newDatedLogEntry(root, context, "scene-changed", "hidden", { title: current.title, left: leaving, copies: Object.keys(copies).length === 0 ? undefined : copies, ...moved }));
    const left = leaving.map((name) => (name in copies ? { name, counters: copyCounters(world, copies[name]) } : { name, counters: {} }));
    // The copies that left are gone with their effects, and with those they kept alive (D-145); the turn may have passed, and with it the end of some effects.
    const remaining = { ...current, copies: Object.fromEntries(Object.entries(current.copies).filter(([name]) => !leaving.includes(name))) };
    const keptByGone = (effect: Effect): boolean => Object.keys(copies).some((name) => keptBy(effect, name));
    const byTurn = (effect: Effect): boolean => turns !== undefined && endedByTurn(effect, turns.round, turns.turn, turns.order);
    const ended = endEffects(root, context, world, remaining, (effect) => keptByGone(effect) || byTurn(effect), (effect) => (keptByGone(effect) ? "who kept it left" : "turn"));
    return { action: "leave", left, turns, noTurns: current.order !== undefined && turns === undefined, ended };
}

/** Who takes turns, in order; those left out take none. A new order in a running scene keeps the round, and the turn if its owner is still in it. */
export function setOrder(root: string, world: World, order: string[], context: Context, current: Scene): SceneResult
{
    const members = memberNames(current);
    const inScene = members.length === 0 ? "no one yet" : members.join(", ");
    const named = order.map((name) => {
        const member = sameName(members, parsePageReference(name).name);

        if (member === undefined) {
            throw new Error(`${name} is not in the scene. In it: ${inScene}.`);
        }

        return member;
    });
    const repeated = named.find((name, index) => named.indexOf(name) !== index);

    if (repeated !== undefined) {
        throw new Error(`${repeated} is in the order twice: give each one once.`);
    }

    if (named.length === 0) {
        throw new Error(`Give who takes turns, in order. In the scene: ${inScene}.`);
    }

    const { round, turn } = keptTurn(current, named);
    updateScene(root, [[["order"], named], [["round"], round], [["turn"], turn]]);
    appendLogEntry(root, newDatedLogEntry(root, context, "scene-changed", "hidden", { title: current.title, order: named }));
    const ended = endEffects(root, context, world, current, (effect) => endedByTurn(effect, round, turn, named), "turn");
    return { action: "order", order: named, round, turn, player: isPlayerTurn(world, turn), ...severalPlayers(world), noTurn: members.filter((name) => !named.includes(name)), ended };
}

/**
 * The round and turn after a new order. A first order starts round 1. In a running scene the round goes on: the turn stays with its owner,
 * or, if they left the order, passes to the next of the old order still in it, or to a new round when no one after them is.
 */
function keptTurn(current: Scene, named: string[]): { round: number; turn: string; }
{
    const round = current.round ?? 1;

    if (current.order === undefined || current.turn === undefined) {
        return { round: 1, turn: named[0] };
    }

    if (named.includes(current.turn)) {
        return { round, turn: current.turn };
    }

    const after = current.order.slice(current.order.indexOf(current.turn) + 1).find((name) => named.includes(name));
    return after === undefined ? { round: round + 1, turn: named[0] } : { round, turn: after };
}

/** One use of a turn by one in the scene (TRN-1–TRN-3), kept in the scene, with its line in the log. */
export function useOfTurn(root: string, world: World, input: SceneInput, context: Context, current: Scene): SceneResult
{
    const [who, ...others] = input.who ?? [];

    if (who === undefined || input.uses === undefined || input.uses.trim() === "") {
        // The example by the game's own names: a game without uses of a turn has none to give.
        const uses = turnUsesOf(campaignSystem(root, context));
        throw new Error(`Give who and what they use of the turn${uses.length === 0 ? "" : `, one of ${uses.join(", ")}`}.`);
    }

    if (others.length > 0) {
        throw new Error(`One at a time: give who as one name, then use again for ${others.join(", ")}. Nothing changed.`);
    }

    if (current.order === undefined) {
        throw new Error("The scene has no order of turns, so no turn to use: set it with scene order first, after rolling for it if the game does.");
    }

    const name = memberNames(current).find((member) => comparableText(member) === comparableText(parsePageReference(who).name));

    if (name === undefined) {
        throw new Error(`${who} is not in the scene ${current.title}: bring them in with scene add, or give one of ${memberNames(current).join(", ")}.`);
    }

    const copy = current.copies[name];
    const page = copy === undefined ? findPage(world, name) : copyPage(name, copy);

    if (page === undefined) {
        throw new Error(`There is no page named ${name}. Look for it with the find command.`);
    }

    const by = input.by?.trim() === "" ? undefined : input.by?.trim();
    const system = campaignSystem(root, context);
    const done = useInTurn(world, system, current, { name, page }, input.uses.trim(), by);
    updateScene(root, [[["used", name], done.used]]);
    appendLogEntry(root, newDatedLogEntry(root, context, "turn-used", "hidden", { title: current.title, who: name, use: input.uses.trim(), by }));

    // What gave one more, spent from the sheet that counts it (TRN-5).
    if (done.spends !== undefined) {
        spendOne(root, context, world, { name, copy: copy !== undefined, page }, done.spends, by ?? "");
    }

    // One who cannot act, as Stunned, is said so: the game's rule, which the master applies (pp. 91, 358); by its name in the campaign's language too (D-403).
    const words = campaignSystemWords(root, context);
    const inactive = effectsOf(page).map((effect) => effect.name).filter((effect) => systemNamed(system?.combat?.inactive ?? [], effect, words) !== undefined);
    const warned = inactive.length === 0 ? "" : ` ${name} is ${inactive.join(", ")}: read what it may still do.`;
    return { action: "use", line: `${done.line}${warned}` };
}

/** One of a counter spent, on a page as it writes it or on a copy in the scene, with its line in the log. */
function spendOne(root: string, context: Context, world: World, who: { name: string; copy: boolean; page: Page; }, spends: { field: string; before: number; max?: number; }, why: string): void
{
    const after = spends.before - 1;
    const value = spends.max === undefined ? after : `${after}/${spends.max}`;

    if (who.copy) {
        updateScene(root, [[["copies", who.name, spends.field], value]]);
    } else {
        writePage(world, who.page.name, undefined, { set: { [spends.field]: value } });
    }

    // Seen where the player sees the page, as change writes it: never a foe's count.
    const visibility = who.copy || !concernsPlayer(world, who.page) ? "hidden" : "public";
    appendLogEntry(root, newDatedLogEntry(root, context, "counter-changed", visibility, { page: who.name, field: spends.field, before: String(spends.before), after: String(after), why }));
}

export function passTurn(root: string, world: World, context: Context, current: Scene): SceneResult
{
    if (current.order === undefined) {
        throw new Error("The scene has no order of turns: set it with scene order, after rolling for it if the game does.");
    }

    const { turn, round } = nextTurn(current.order, current.turn, current.round ?? 1);
    updateScene(root, [[["round"], round], [["turn"], turn]]);
    appendLogEntry(root, newDatedLogEntry(root, context, "scene-changed", "hidden", { title: current.title, round, turn }));
    const order = current.order;
    const ended = endEffects(root, context, world, current, (effect) => endedByTurn(effect, round, turn, order), "turn");
    return { action: "next", order, round, turn, player: isPlayerTurn(world, turn), ...severalPlayers(world), noTurn: [], ended };
}

/**
 * The result of a change of turn, with the effects on who ends the turn and on who starts the next (EFF-15), read after the effects that the turn ends have
 * ended; nothing when the turn stays where it was.
 */
export function withActing(root: string, context: Context, before: Scene, result: SceneResult): SceneResult
{
    if (result.action !== "leave" && result.action !== "order" && result.action !== "next") {
        return result;
    }

    const turns = result.action === "leave" ? result.turns : result;

    if (turns === undefined || (turns.turn === before.turn && turns.round === (before.round ?? 1))) {
        return result;
    }

    // A turn that begins gives back what its one used, and every turn what lasts only a turn (TRN-4).
    const used = readOpenScene(root).scene?.used;

    if (used !== undefined) {
        updateScene(root, [[["used"], usesAtTurn(campaignSystem(root, context), used, turns.turn)]]);
    }

    const world = campaignWorld(root, context);
    const system = campaignSystem(root, context);
    const scene = readOpenScene(root).scene;
    const effects = turnEffectsNote(world, scene, before.turn, turns.turn);
    // The player character's turn reminds what to mark of it, which the player sees on the dashboard (TRN-1); a companion's counts went right without (playtest
    // 08); dying, the death save it starts with (DIE-5).
    const member = findPage(world, turns.turn);
    const turn = packagesTurnStarted(root, context, turns.turn);
    const dying = turn.lines.join(" ");
    // Who cannot act, as one stable but still Unconscious, marks nothing.
    const words = campaignSystemWords(root, context);
    const inactive = member !== undefined && effectsOf(member).some((effect) => systemNamed(system?.combat?.inactive ?? [], effect.name, words) !== undefined);
    const pc = member !== undefined && isPlayerCharacter(member);
    const uses = !pc || dying !== "" || inactive ? [] : turnUsesOf(system);
    const mark = uses.length > 0 ? `Mark with scene use what ${turns.turn} uses of the turn, as it happens: ${uses.join(", ")}.` : "";
    // Notes written between the calls of another's turn reached the player (playtests 06, 08, 09, 11).
    const quiet = pc ? "" : "Write nothing until the round is told: what you work out stays in your thinking.";
    // What cannot be true together, once in a chat, after the system's code had its say (CHK-3).
    const checks = newStateChecks(root, context).join(" ");
    // The extensions' lines come after the engine's reminder, which only the system's take the place of (D-514).
    const acting = [effects, dying, mark, ...turn.added, offTheMap(world, scene, turns.turn), turn.problem ?? "", checks, quiet].filter((line) => line !== "").join(" ");
    return acting === "" ? result : { ...result, acting };
}

/** Who acts and stands on no square of the scene's map, when its place has one (GRD-3, playtest 07): where it stands decides reach, cover and the way. */
function offTheMap(world: World, scene: Scene | undefined, name: string): string
{
    const place = scenePlace(world, scene);

    if (place === undefined || placeGrid(place) === undefined || standing(world, place, scene).some((one) => sameName([one.name], name) !== undefined && one.square !== undefined)) {
        return "";
    }

    return `${name} is not on the map of ${place.name}: put it on its square with move ${name} --at, such as E4, before telling its turn.`;
}

/** "Round 2 · now Lena (then Annegato 2).", and on the player's character's turn, to stop there (D-139). */
export function turnText(result: Turns): string
{
    const then = result.order.length > 1 ? nextTurn(result.order, result.turn, 1).turn : undefined;
    const now = !result.player ? result.turn : result.several === true ? `${result.turn}, a player character` : `${result.turn}, the player's character`;
    // With more than one, a message that already said what this one does goes on (D-480 (5)).
    const stop = !result.player ? "." : result.several === true ? `: stop here and hand ${result.turn} the turn, by name, unless the player already said what ${result.turn} does.` : ": stop here and hand them the turn.";
    return `Round ${result.round} · now ${now}${then === undefined ? "" : ` (then ${then})`}${stop}`;
}

/** Whether more than one player character is alive, each handed their turn by name (D-480 (5)). */
function severalPlayers(world: World): { several?: true; }
{
    return playerCharacters(world).filter((page) => page.fields.status !== "dead").length > 1 ? { several: true } : {};
}

/** Whether the turn is the player's character's, which only the player plays; a dead one's is no one's. */
function isPlayerTurn(world: World, name: string): boolean
{
    const page = findPage(world, name);
    return page !== undefined && isPlayerCharacter(page) && page.fields.status !== "dead";
}
