// Who is in a scene: names, counters as the outputs show them, and the hidden log line for copies
import type { Context } from "../../core/context.ts";
import { appendLogEntry } from "../../core/log.ts";
import { isPartyMember, type Page, parsePageReference, type World } from "../../pages/index.ts";
import type { Scene, SceneCopy } from "../../scene/index.ts";
import type { GameSystem } from "../../systems/index.ts";
import { effectShown } from "../shared/scene/effects.ts";
import { copyCounters } from "../shared/scene/scene.ts";
import { countersText, pageCounters, partyCounters } from "../shared/sheet/counters.ts";
import { effectsOf } from "../shared/sheet/effect-layer.ts";
import { newDatedLogEntry } from "../shared/time/time.ts";
import type { Member } from "./result.ts";

/** The names of everyone in the scene: its characters and its copies. */
export function memberNames(current: Scene): string[]
{
    return [...current.with.map((link) => parsePageReference(link).name), ...Object.keys(current.copies)];
}

/** "Ennio: hp 12/12; Annegato 1: hp 22/22". */
export function membersText(members: Member[]): string
{
    return members.map((member) => {
        const shown = [countersText(member.counters), ...(member.effects ?? [])].filter((part) => part !== "").join(" · ");
        return shown === "" ? member.name : `${member.name}: ${shown}`;
    }).join("; ");
}

/** A character in the scene, with their effects: the player character and a companion with the counters of their line (DAT-2), anyone else with all of theirs. */
export function characterMember(world: World, page: Page, system: GameSystem | undefined): Member
{
    const counters = isPartyMember(page) ? partyCounters(world, page, undefined, system) : pageCounters(world, page);
    return { name: page.name, counters, effects: effectsOf(page).map((effect) => effectShown(world, effect)) };
}

export function copyMembers(world: World, copies: Record<string, SceneCopy>): Member[]
{
    return Object.entries(copies).map(([name, copy]) => ({ name, counters: copyCounters(world, copy) }));
}

/** The copies and what they changed go in a hidden line: the player does not see the enemies' numbers, nor the names of creatures in disguise. */
export function logCopies(root: string, context: Context, title: string, copies: Record<string, SceneCopy>): void
{
    if (Object.keys(copies).length > 0) {
        appendLogEntry(root, newDatedLogEntry(root, context, "scene-changed", "hidden", { title, copies }));
    }
}
