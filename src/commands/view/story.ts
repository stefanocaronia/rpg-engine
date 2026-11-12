// Public log lines as the player sees them: diary facts and rolls
import type { LogEntry } from "../../core/log.ts";
import { comparableText } from "../../core/text.ts";
import { type CoinSide, coinSides, notationParts, type ThrownDie } from "../../dice/index.ts";
import { readEffect } from "../../effects/index.ts";
import { pagesWithName, parsePageReference, systemPageNamed, textsIn, type World } from "../../pages/index.ts";
import { effectShown, type SeenEffect } from "../shared/scene/effects.ts";
import type { StoryFact } from "./journal.ts";
import type { ShownRoll } from "./result.ts";

// How many lines of the diary the view gives when no number is asked.
export const diaryLines = 10;

// How many rolls the view gives, the last ones.
export const rollsShown = 20;

/**
 * A public roll of the log as the player sees it: who rolled, for whom as the character knows them, else as the scene it was rolled in named them (`seen`, D-421),
 * the check, the dice; never the master's why (VIEW-4).
 */
export function shownRoll(
    world: World,
    entry: LogEntry,
    named: (name: unknown) => string | undefined,
    picture: (name: unknown) => ShownRoll["image"],
    seen: Record<string, string> | undefined,
): ShownRoll
{
    const data = entry.data as { who?: unknown; check?: unknown; notation?: unknown; total?: unknown; result?: unknown; says?: unknown; tones?: unknown; toss?: unknown; tray?: unknown; dice?: unknown; physical?: unknown; };
    const known = data.who === undefined ? undefined : named(data.who);
    const who = data.who === undefined ? undefined : known ?? strangerOfRoll(world, data.who, named, seen);
    // A stranger the scene of the roll never named shows no face: it would tell who acted out of sight (D-421).
    const image = data.who === undefined || who === "someone" ? undefined : picture(data.who);
    const words = notationParts(String(data.notation ?? ""));
    const toss = Array.isArray(data.toss) ? data.toss.filter((side): side is CoinSide => (coinSides as readonly unknown[]).includes(side)) : undefined;
    return {
        id: entry.id,
        ...(entry.date === undefined ? {} : { date: entry.date }),
        at: entry.at,
        // Physical dice are the player's, though the master writes their values.
        by: entry.by === "player" || data.physical === true ? "player" : "master",
        ...(who === undefined ? {} : { who }),
        ...(image === undefined ? {} : { image }),
        ...(who !== undefined && known === undefined ? { stranger: true as const } : {}),
        ...(typeof data.check === "string" ? { check: data.check } : {}),
        notation: String(data.notation ?? ""),
        ...(words === undefined ? {} : { words }),
        total: Number(data.total ?? 0),
        ...(typeof data.says === "string" && data.says.trim() !== "" ? { says: data.says } : {}),
        ...(Array.isArray(data.tones) ? { tones: data.tones.map((tone) => (tone === "good" || tone === "bad" ? tone : null)) } : {}),
        ...(toss === undefined ? {} : { toss }),
        ...(typeof data.tray === "boolean" ? { tray: data.tray } : {}),
        text: String(data.result ?? ""),
        dice: toss === undefined && Array.isArray(data.dice) ? (data.dice as ThrownDie[]) : [],
    };
}

/** How many rolls the dashboard asks for: a whole number from 1. */
export function rollCount(asked: string | undefined): number
{
    const count = asked === undefined ? rollsShown : Number(asked.trim());

    if (!Number.isInteger(count) || count < 1) {
        throw new Error(`"${asked}" is not how many rolls: give a whole number from 1.`);
    }

    return count;
}

/** How many lines of the diary are asked: a whole number from 1. */
export function diaryCount(asked: string | undefined): number
{
    if (asked === undefined) {
        return diaryLines;
    }

    const count = Number(asked.trim());

    if (!Number.isInteger(count) || count < 1) {
        throw new Error(`"${asked}" is not how many lines of the diary: give a whole number from 1, or all.`);
    }

    return count;
}

/**
 * A public line of the log as the diary tells it (VIEW-4): the facts, with the game date, never the master's why; who and where the character does not know as
 * someone and somewhere (D-254). Lines of no story, as a setting changed, are left out.
 */
export function diaryLine(world: World, entry: LogEntry, named: (name: unknown) => string | undefined): string[]
{
    const fact = storyFact(world, entry, named);
    return fact === undefined ? [] : [fact.date === undefined ? factText(fact) : `${fact.date} · ${factText(fact)}`];
}

/**
 * A public line of the log as a fact of the story (VIEW-4, VIEW-9), as data the dashboard writes in its language: who and where as the character knows them,
 * someone, creature and somewhere for those it does not (D-254); undefined for a line of no story.
 */
export function storyFact(world: World, entry: LogEntry, named: (name: unknown) => string | undefined): StoryFact | undefined
{
    const data = entry.data as Record<string, unknown>;
    const text = (value: unknown): string => (Array.isArray(value) ? value.map(String).join(", ") : String(value ?? ""));
    const who = (name: unknown): string => named(name) ?? (isCopyName(world, name) ? "creature" : "someone");
    const pages = Array.isArray(data.pages) ? data.pages.map((name) => named(name) ?? "someone") : [];
    const fact = ((): StoryFact | undefined => {
        switch (entry.type) {
            case "scene-opened":
                return { kind: "scene-opened", title: text(data.title), type: text(data.type) };
            case "scene-closed":
                return { kind: "scene-closed", title: text(data.title), type: text(data.type), summary: text(data.summary) };
            case "roll":
                return { kind: "roll", ...(data.who === undefined ? {} : { who: who(data.who) }), result: text(data.result) };
            case "roll-revealed":
                return { kind: "roll-revealed" };
            case "counter-changed":
                return {
                    kind: "counter",
                    who: who(data.page),
                    field: text(data.field),
                    before: text(data.before),
                    after: text(data.after),
                    ...(data.stack === true ? { stack: true } : {}),
                    ...(data.upkeep === true ? { upkeep: true } : {}),
                };
            case "time-advanced":
                return { kind: "time", ...(data.from === undefined ? {} : { from: text(data.from) }), to: text(data.to) };
            case "moved":
                return pages.every((name) => name === "someone") && named(data.to) === undefined ? undefined : { kind: "moved", who: pages, ...(data.to === null ? {} : { to: named(data.to) ?? "somewhere" }) };
            case "learned":
                return { kind: "learned", who: text(data.page), what: textsIn(data.knows).map(learnedText) };
            case "effect-added":
                return { kind: "effect", who: who(data.page), ...seenEffectOf(world, text(data.effect), named) };
            case "effect-ended":
                return { kind: "effect-ended", who: who(data.page), effect: text(data.effect) };
            case "saved":
                return { kind: "saved", save: text(data.save), ...(data.label === undefined ? {} : { label: text(data.label) }) };
            case "save-loaded":
                return { kind: "back", save: text(data.save) };
            case "mode-changed":
                return { kind: "mode", to: text(data.to) };
            case "quest-changed":
                return { kind: "quest", status: data.status === "open" ? "open" : data.status === "done" ? "done" : "failed", quest: named(data.quest) ?? text(data.quest) };
            default:
                return undefined;
        }
    })();
    return fact === undefined || entry.date === undefined ? fact : { ...fact, date: entry.date };
}

/** "Ettore: hp 14 → 12": a fact of the story in the chat's words. */
function factText(fact: StoryFact): string
{
    const told = ((): string => {
        switch (fact.kind) {
            case "scene-opened":
                return `Scene opened: ${fact.title} (${fact.type})`;
            case "scene-closed":
                return `Scene: ${fact.title} (${fact.type}): ${fact.summary}`;
            case "roll":
                return `${fact.who === undefined ? "Roll" : nameText(fact.who, true)}: ${fact.result}`;
            case "roll-revealed":
                return "A hidden roll was shown";
            case "counter":
                return `${nameText(fact.who, true)}: ${fact.field} ${fact.before} → ${fact.after}`;
            case "time":
                return fact.from === undefined ? `The story starts on ${fact.to}` : `Time passes: ${fact.from} → ${fact.to}`;
            case "moved":
                return `${fact.who.join(", ")} to ${fact.to ?? "the open"}`;
            case "learned":
                return `${fact.who} learned: ${fact.what.join(", ")}`;
            case "effect":
                return `${nameText(fact.who, true)}: ${fact.text}`;
            case "effect-ended":
                return `${nameText(fact.who, true)}: ${fact.effect} ended`;
            case "saved":
                return `Saved: ${fact.save}${fact.label === undefined ? "" : ` - ${fact.label}`}`;
            case "back":
                return `Back to save ${fact.save}: what came after it is gone`;
            case "mode":
                return `The campaign is now in ${fact.to}`;
            case "quest":
                return `${fact.status === "open" ? "Quest taken" : fact.status === "done" ? "Quest completed" : "Quest failed"}: ${fact.quest}`;
        }
    })();
    return told;
}

/** A name of the story in the chat's words: a creature for creature, as the copies of one it does not know; Someone and A creature opening a line. */
function nameText(name: string, first = false): string
{
    const said = name === "creature" ? "a creature" : name;
    return first && (name === "creature" || name === "someone") ? `${said[0].toUpperCase()}${said.slice(1)}` : said;
}

/**
 * What the character saw of those it did not know, in the scene each roll was rolled in, by the roll's id: the seen words the log kept since that scene opened,
 * and for the scene still open its own, which a scene opened before the log kept them has alone.
 */
export function seenByRoll(log: LogEntry[], open: Record<string, string> | undefined): Map<string, Record<string, string>>
{
    const byRoll = new Map<string, Record<string, string>>();
    let seen: Record<string, string> = {};
    let inScene: string[] = [];

    for (const entry of log) {
        if (entry.type === "scene-opened" || entry.type === "scene-closed") {
            seen = {};
            inScene = [];
        } else if (entry.type === "scene-changed" && entry.data.seen !== null && typeof entry.data.seen === "object") {
            seen = { ...seen, ...(entry.data.seen as Record<string, string>) };
        } else if (entry.type === "roll") {
            byRoll.set(entry.id, seen);
            inScene.push(entry.id);
        }
    }

    for (const id of open === undefined ? [] : inScene) {
        byRoll.set(id, { ...byRoll.get(id), ...open });
    }

    return byRoll;
}

/**
 * Whom a roll is for when the character does not know them by name, as its scene named them (D-416, D-421): a copy by its name when the character knows its
 * creature, else by what it saw of its kind and its number, else creature; anyone else by what it saw, else someone.
 */
function strangerOfRoll(world: World, who: unknown, named: (name: unknown) => string | undefined, seen: Record<string, string> | undefined): string
{
    const name = String(who).trim();
    const said = (key: string): string | undefined => Object.entries(seen ?? {}).find(([seenName]) => comparableText(seenName) === comparableText(key))?.[1];

    if (!isCopyName(world, name)) {
        return said(name) ?? "someone";
    }

    const [, kind = "", number = ""] = /^(.+) (\d+)$/.exec(name) ?? [];
    const kindSeen = said(kind);
    return named(kind) !== undefined ? name : kindSeen === undefined ? "creature" : `${kindSeen} ${number}`;
}

/** Whether a name is a copy's in a scene, such as Lupo mannaro 1: a creature's name and a number, with no page of its own. */
export function isCopyName(world: World, name: unknown): boolean
{
    const match = typeof name === "string" ? /^(.+) \d+$/.exec(name.trim()) : null;
    return match !== null && pagesWithName(world, match[0]).length === 0 && [...pagesWithName(world, match[1]), systemPageNamed(world, match[1])].some((page) => page?.type === "creature");
}

/** "Coppa#Veleno": what was learned, as a link names it. */
function learnedText(link: string): string
{
    const reference = parsePageReference(link);
    return reference.section === undefined ? reference.name : `${reference.name}#${reference.section}`;
}

/**
 * An effect as the player sees it, as a line of the log writes it: its name and its end, without who keeps it, which may be a secret; an end at someone's turn
 * names them as the diary does.
 */
function seenEffectOf(world: World, line: string, named: (name: unknown) => string | undefined): SeenEffect
{
    const read = readEffect(line);

    if (!("effect" in read)) {
        return { name: line, text: line };
    }

    const end = read.effect.end;
    const seen = end !== undefined && "turn" in end ? { ...end, turn: named(end.turn) ?? (isCopyName(world, end.turn) ? "creature" : "someone") } : end;
    const told = seen !== undefined && "turn" in seen ? { ...seen, turn: nameText(seen.turn) } : seen;
    return { name: read.effect.name, ...(seen === undefined ? {} : { end: seen }), text: effectShown(world, { ...read.effect, values: [], end: told }) };
}
