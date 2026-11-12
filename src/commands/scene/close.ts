// Closing a scene: effects ended, rewards, the fallen, the save, its text
import type { Context } from "../../core/context.ts";
import { numberOf } from "../../core/formula.ts";
import { appendLogEntry } from "../../core/log.ts";
import { valueNamed } from "../../core/text.ts";
import { readCounter } from "../../counters/index.ts";
import type { Effect } from "../../effects/index.ts";
import { findPage, isPartyMember, linksIn, type Page, pagesWithName, parsePageReference, type World } from "../../pages/index.ts";
import { type Scene, sceneTypes } from "../../scene/index.ts";
import type { GameSystem } from "../../systems/index.ts";
import { formatGameDate } from "../../time/index.ts";
import { firstInChat } from "../shared/campaign/parts.ts";
import { isTickedOpenQuest, tickedQuestNote } from "../shared/campaign/quests.ts";
import { isPlayerDead, makeSave, saveText } from "../shared/campaign/saves.ts";
import { campaignSystem, campaignWorld } from "../shared/campaign/world.ts";
import { clearCopies } from "../shared/places/grids.ts";
import { endEffects, endsWithScene, keptBy } from "../shared/scene/effects.ts";
import { fallenLine, isFallen } from "../shared/scene/loot.ts";
import { copyPage, rawScene, readOpenScene, saveScene } from "../shared/scene/scene.ts";
import { effectiveFields, effectsOf } from "../shared/sheet/effect-layer.ts";
import { hasSheet, startingAtZero } from "../shared/sheet/system-fields.ts";
import { newDatedLogEntry, readPresent } from "../shared/time/time.ts";
import { copyMembers, logCopies, membersText } from "./members.ts";
import type { Member, Saved, SceneResult } from "./result.ts";

/** Ends the scene; one that cannot be read is closed too, so that a scene written wrongly by hand never blocks the game. */
export function close(root: string, world: World, summary: string, context: Context): SceneResult
{
    if (summary.trim() === "") {
        throw new Error("Give the scene a summary of one or two sentences: what happened, as the player saw it.");
    }

    const { scene: current, problem } = readOpenScene(root);

    if (current === undefined && problem === undefined) {
        throw new Error("No scene is open: there is nothing to close.");
    }

    const present = readPresent(root).date;
    const closed = present === undefined ? undefined : formatGameDate(present);
    const raw = current === undefined ? rawScene(root) : undefined;
    // Rounds exist only in the scene: the effects counted in them end with it, on the pages; the copies go with theirs, and with what they kept alive (D-145).
    const keptByCopy = (effect: Effect): boolean => current !== undefined && Object.keys(current.copies).some((name) => keptBy(effect, name));
    // What the close says is worked out before anything is written: a page it cannot find stops it with the scene still open.
    const endless = (current?.with ?? []).flatMap((link) => {
        const page = findPage(world, parsePageReference(link).name);
        return page === undefined ? [] : effectsOf(page).filter((effect) => effect.end === undefined && !keptByCopy(effect)).map((effect) => `${effect.name} on ${page.name}`);
    });
    const rewards = current === undefined ? [] : rewardLines(world, campaignSystem(root, context), current);
    // What the fallen carried stays where they fell, a copy's read on its creature, which ends with the scene (D-530).
    const fallen = current === undefined ? "" : fallenLine(fallenOf(world, campaignSystem(root, context), current));
    // A scene that ends may end the story of a quest whose goals are all ticked: the master says whether it did (D-239).
    const quests = world.pages.filter(isTickedOpenQuest).map(tickedQuestNote);
    const ended = endEffects(root, context, world, undefined, (effect) => endsWithScene(effect) || keptByCopy(effect), "scene closed");

    if (current !== undefined) {
        clearCopies(campaignWorld(root, context), current, Object.keys(current.copies));
    }

    saveScene(root, undefined);

    if (current === undefined) {
        const titled = rawTitleAndType(raw);
        appendLogEntry(root, newDatedLogEntry(root, context, "scene-closed", "public", { ...titled, closed, summary: summary.trim() }));
        return { action: "close", copies: [], unreadable: problem?.message, ended, endless: [], quests, ...endOfSceneSave(root, context, world, titled.title) };
    }

    logCopies(root, context, current.title, current.copies);
    const left = current.left?.filter((name) => pagesWithName(world, name).length > 0);
    // Who the character saw without learning their name stays so after the scene (D-416).
    const unnamed = current.seen === undefined ? undefined : Object.keys(current.seen);
    const data = { title: current.title, type: current.type, place: current.place, with: current.with, left: left?.length === 0 ? undefined : left, unnamed, opened: current.opened, closed, rounds: current.round, summary: summary.trim() };
    appendLogEntry(root, newDatedLogEntry(root, context, "scene-closed", "public", data));
    // The copies that left during the scene, fled or fallen, end with it too: one that may come back needs a page now, with its wounds (D-246).
    const gone = copyMembers(world, current.gone ?? {});
    const saved = endOfSceneSave(root, context, world, current.title);
    return {
        action: "close",
        title: current.title,
        rounds: current.round,
        copies: copyMembers(world, current.copies),
        gone,
        ended,
        endless,
        ...(rewards.length === 0 ? {} : { rewards }),
        ...(fallen === "" ? {} : { fallen }),
        ...(peakEnded(current.type) && firstInChat(context, "after-peak") ? { afterPeak } : {}),
        quests,
        ...saved,
    };
}

/**
 * The save at the end of a scene, named by its title (D-55, SAV-3): none while the player character is dead, since going back is what one is for. A save that
 * cannot be written never stops the close, which is already done: it says why.
 */
function endOfSceneSave(root: string, context: Context, world: World, title: string): Saved
{
    if (isPlayerDead(world)) {
        return { unsaved: "No save: the player character is dead. If the player wants to go back, save load, as the campaign's saves setting allows." };
    }

    try {
        return { saved: saveText(makeSave(root, context, title, "scene closed")) };
    } catch (error) {
        const reason = error instanceof Error ? error.message : String(error);
        return { unsaved: `No save: it could not be written (${reason}). Make .saves a folder that can be written; the next scene's end saves again.` };
    }
}

/**
 * What the creatures overcome in a scene give the party there (DAT-11): for each reward of the system, the copies, also those that left, and the characters
 * outside the party at its counter's value or below, or dead, with what each gives, shared, rounded down, among the living party members who were there and
 * keep the sheet. Said with the calls to make, never given: a character may have been an ally, and who fled or was overcome another way is the master's to judge.
 */
function rewardLines(world: World, system: GameSystem | undefined, scene: Scene): string[]
{
    const there = [...scene.with.map((link) => parsePageReference(link).name), ...(scene.left ?? [])].flatMap((name) => findPage(world, name) ?? []);
    const party = there.filter((page, index) => there.indexOf(page) === index && isPartyMember(page) && page.fields.status !== "dead" && hasSheet(world, page));
    const copies = [...Object.entries(scene.copies), ...Object.entries(scene.gone ?? {})].map(([name, copy]) => ({ page: copyPage(name, copy), left: name in (scene.gone ?? {}) }));
    const others = [...copies, ...there.filter((page) => !isPartyMember(page)).map((page) => ({ page, left: (scene.left ?? []).includes(page.name) }))];
    const read = (fields: Record<string, unknown>, field: string): unknown => valueNamed(fields, field);

    return (system?.rewards ?? []).flatMap((reward) => {
        const worth = others.flatMap(({ page, left }) => {
            const fields = effectiveFields(world, page);
            const value = numberOf(read(fields, reward.from));
            const counter = readCounter(read(fields, reward.counter))?.value;
            const down = page.fields.status === "dead" || (counter !== undefined && counter <= reward.value);
            return [{ name: page.name, kind: linksIn(page.fields.creature)[0] ?? page.name, worth: value ?? 0, given: value !== undefined, down, left, character: page.type === "character" }];
        });
        const overcome = worth.filter((item) => item.down && item.worth > 0);
        const fled = worth.filter((item) => !item.down && item.left && item.worth > 0);
        // A creature of the campaign written without the field, as cr 2 (450 XP), would count nothing in silence.
        const unknown = worth.filter((item) => item.down && !item.given);
        const total = overcome.reduce((sum, item) => sum + item.worth, 0);

        if ((total === 0 && fled.length === 0 && unknown.length === 0) || party.length === 0) {
            return [];
        }

        const share = Math.floor(total / party.length);
        const to = party.length === 1 ? `${share} to ${party[0].name}` : `${share} each to ${party.map((page) => page.name).join(", ")}`;
        // Who has no such field yet gets it written, unless change starts it at 0 (CNT-8).
        const held = (page: Page): boolean => read(effectiveFields(world, page), reward.field) !== undefined || startingAtZero(world, reward.field) !== undefined;
        const calls = party.map((page) => (held(page) ? `change ${page.name}, field ${reward.field}, by ${share}` : `write ${page.name}, set ${reward.field}=${share}`)).join("; ");
        const kinds = [...new Set(unknown.map((item) => item.kind))];
        const characters = overcome.filter((item) => item.character).map((item) => item.name);
        const parts = [
            total === 0 ? `${reward.field}:` : `${reward.field} of those overcome: ${overcome.map((item) => `${item.name} ${item.worth}`).join(", ")}, ${total} in all; ${to}: ${calls}.`,
            characters.length === 0 ? "" : `${characters.join(", ")} ${characters.length === 1 ? "is a character" : "are characters"}: leave out any who fought on your side, and share again.`,
            fled.length === 0 ? "" : `Fled: ${fled.map((item) => `${item.name} ${item.worth}`).join(", ")}, to count if the party overcame them.`,
            unknown.length === 0
                ? ""
                : `${unknown.map((item) => item.name).join(", ")} ${unknown.length === 1 ? "counts" : "count"} nothing, with no ${reward.from} on ${kinds.join(", ")}: write it, such as write ${
                    kinds[0]
                }, set ${reward.from}=…, and share it.`,
            "Leave out what the party summoned; count those overcome another way and what the story rewards, as you judge, and tell the player only what each gained.",
        ];
        return [parts.filter((part) => part !== "").join(" ")];
    });
}

/** What a fight or a challenge that ends asks of the master, once in a chat, as play's rules left the instructions for it (D-532). */
const afterPeak = "After a peak, give a quiet scene the player can fill: a meal, rain, a talk. Judge a challenge by what it cost, not by whether it was won: "
    + "after two that cost nothing, let the next rise, within what the difficulty allows.";

/** Whether a scene of this type is a peak: a fight or a challenge. */
function peakEnded(type: string): boolean
{
    return type === "combat" || type === "challenge";
}

/** Who fell in a scene, dead or down: its copies, those that left during it too, each with its creature, and the characters outside the party. */
function fallenOf(world: World, system: GameSystem | undefined, scene: Scene): { name: string; kind?: string; }[]
{
    const copies = [...Object.entries(scene.copies), ...Object.entries(scene.gone ?? {})].map(([name, copy]) => ({ page: copyPage(name, copy), kind: parsePageReference(copy.creature).name }));
    const names = [...new Set([...scene.with.map((link) => parsePageReference(link).name), ...(scene.left ?? [])])];
    const characters = names.flatMap((name) => findPage(world, name) ?? []).map((page) => ({ page, kind: undefined }));
    return [...copies, ...characters].filter(({ page }) => isFallen(world, system, page)).map(({ page, kind }) => ({ name: page.name, ...(kind === undefined ? {} : { kind }) }));
}

/** The title and type of a scene that cannot be read, as far as they can be, so that the log still holds a closed scene. */
function rawTitleAndType(raw: unknown): { title: string; type: string; }
{
    const fields = raw !== null && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
    const title = typeof fields.title === "string" && fields.title.trim() !== "" ? fields.title : "Untitled scene";
    const type = typeof fields.type === "string" && (sceneTypes as readonly string[]).includes(fields.type) ? fields.type : "other";
    return { title, type };
}

export function closedText(
    result: { title?: string; rounds?: number; copies: Member[]; gone?: Member[]; unreadable?: string; ended: string[]; endless: string[]; rewards?: string[]; fallen?: string; afterPeak?: string; quests: string[]; } & Saved,
): string
{
    const saved = result.saved === undefined ? (result.unsaved === undefined ? "" : `\n${result.unsaved}`) : `\nSaved: ${result.saved}.`;
    const advance = "Advance any time it took that you have not advanced yet; write on their pages what it changed for good, such as a fire put out or a door broken.";
    const endless = result.endless.length === 0 ? "" : `\nStill there, with no end: ${result.endless.join(" · ")}. End those the scene ended, with effect end.`;
    const ended = `${result.ended.length === 0 ? "" : `\nEnded with the scene: ${result.ended.join(" · ")}.`}${endless}`;
    const quests = result.quests.map((line) => `\n${line}`).join("");

    if (result.unreadable !== undefined) {
        return `The open scene could not be read (${result.unreadable}): closed it, without its copies. ${advance}${ended}${quests}${saved}`;
    }

    const rounds = result.rounds === undefined ? "" : ` after ${result.rounds} ${result.rounds === 1 ? "round" : "rounds"}`;
    const gone = result.copies.length === 0 ? "" : ` Copies gone: ${membersText(result.copies)}.`;
    const left = (result.gone ?? []).length === 0
        ? ""
        : `\nLeft during the scene: ${membersText(result.gone ?? [])}. A copy ends with its scene: if one may come back, give it a page now, with its wounds.`;
    const rewards = (result.rewards ?? []).map((line) => `\n${line}`).join("");
    const fallen = result.fallen === undefined ? "" : `\n${result.fallen}`;
    const peak = result.afterPeak === undefined ? "" : `\n${result.afterPeak}`;
    return `Scene closed${rounds}: ${result.title}.${gone} ${advance}${ended}${left}${fallen}${rewards}${quests}${peak}${saved}`;
}
