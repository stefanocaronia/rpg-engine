import { z } from "zod";
import { requireCampaign } from "../campaign/index.ts";
import { numberOf } from "../core/formula.ts";
import { appendLogEntry } from "../core/log.ts";
import { defineCommand } from "../core/registry.ts";
import { comparableText, sameName } from "../core/text.ts";
import { readCounter } from "../counters/index.ts";
import { type Effect, type EffectEnd, effectNamed, formatEffect, formatEnd, isSceneDuration, readEffect, readRounds, withEffect } from "../effects/index.ts";
import { concernsPlayer, declaredKind, environmentAt, isDeclaredUncounted, isNeverInherited, isStandardField, type Page, parsePageReference, readFieldValue, type World } from "../pages/index.ts";
import type { Scene } from "../scene/index.ts";
import type { GameSystem } from "../systems/index.ts";
import { addDuration, formatGameDate, readDuration } from "../time/index.ts";
import { effectGiving, effectiveFields, effectsOf, valuesChanged, withEffects } from "./effect-layer.ts";
import { checkEffectsReadable, type EffectHolder, endEffects, keptBy, saveEffects } from "./game-effects.ts";
import { houseRules, ruleBlock, ruleTitled } from "./game-rules.ts";
import { checkNotSystemPage, pageOrCopy, readOpenScene } from "./game-scene.ts";
import { newDatedLogEntry, presentDate } from "./game-time.ts";
import { campaignSystem, campaignWorld, missingSystemHint, occasionsOf } from "./game-world.ts";
import { computedField, counterLimits, maximumSources } from "./worked-out.ts";

const actions = ["add", "end"] as const;

// Values arrive as field=value strings from a command line, or as an object through MCP.
const fieldValues = z.union([z.array(z.string()), z.record(z.string(), z.unknown())]);

/** What effect did: on whom, which effect, and what changed, with what the master should know. */
interface EffectResult
{
    action: (typeof actions)[number];
    page?: string;
    effect?: string;
    end?: string;
    values: string[];
    /** For end with by: the effects that someone kept alive, as they ended. */
    ended: string[];
    notes: string[];
}

export const effect = defineCommand({
    name: "effect",
    description:
        "Put a condition or an effect on a character, a place or a copy in the open scene, or end one: frightened, prone, a spell, a form; on a place, such as rain or magical darkness, it holds for all inside by its name, and its values are the place's own. "
        + "add gives its name, how long it lasts, who keeps it alive if someone must (concentration), and the values it gives meanwhile; what else it does in play is yours to rule. "
        + "It ends by itself, and advance or scene says so; end takes it away sooner, or every effect someone keeps alive. "
        + 'Example: action add, page Ennio, name "Scudo della fede", for 10m, by [[Lena]], set ac=15.',
    group: "game",
    positionals: ["action", "page", "name"],
    input: z.object({
        action: z.enum(actions).describe("add or end"),
        page: z.string().optional().describe("who has it: a page, or a copy in the open scene such as Annegato 2"),
        name: z.string().optional().describe("the effect's name, such as Benedizione; a condition of the game system always by its name there, such as Frightened"),
        for: z.string().optional().describe(
            "add: how long it lasts: 10m, 1h, 1d 6h; in a scene with turns, rounds from the current turn, such as 1 round; or scene, until it ends; or an occasion of the game system, such as long rest, which its recipe brings. Left out, it lasts until it is ended: so for one that ends with something in the story, such as until they breathe clean air; end it then",
        ),
        until: z.string().optional().describe("add, in a scene with turns: whose next turn ends it when it starts, such as Ennio, instead of for"),
        by: z.string().optional().describe("add: who keeps it alive, such as [[Lena]]; end: take away every effect they keep, on everyone"),
        set: fieldValues.optional().describe("add: the values it reads while it lasts, field=value, repeatable, such as ac=15, never a bonus such as +2. What must outlive it, such as hit points it adds, change on the page instead"),
        why: z.string().optional().describe("what caused it, or ended it"),
    }),

    run(input, context): EffectResult
    {
        const root = requireCampaign(context.folder);
        const world = campaignWorld(root, context);
        const open = readOpenScene(root);
        const why = input.why?.trim() === "" ? undefined : input.why;

        if (input.action === "end" && input.by !== undefined && input.page === undefined && input.name === undefined) {
            const keeper = parsePageReference(input.by).name;
            const ended = endEffects(root, context, world, open.scene, (effect) => keptBy(effect, keeper), why ?? `${keeper} stopped keeping them`);

            if (ended.length === 0) {
                throw new Error(`${keeper} keeps no effect alive.`);
            }

            return { action: "end", values: [], ended, notes: [] };
        }

        if (input.page === undefined || input.name === undefined || input.name.trim() === "") {
            throw new Error(`Give the page and the effect's name, such as page Ennio, name Benedizione${input.action === "end" ? "; or only by, to end every effect someone keeps alive" : ""}.`);
        }

        const found = pageOrCopy(world, open, input.page, (page) => `effects are on the whole page, such as page ${page}`);
        checkNotSystemPage(world, open, found.page);
        const holder: EffectHolder = { page: found.page, copy: found.copy !== undefined };
        checkEffectsReadable(holder.page);
        const current = effectsOf(holder.page);
        const visibility = !holder.copy && concernsPlayer(world, holder.page) ? "public" : "hidden";

        if (input.action === "end") {
            if (input.for !== undefined || input.until !== undefined || input.set !== undefined || input.by !== undefined) {
                throw new Error("end takes the page and the effect's name, or by alone: nothing else.");
            }

            const ended = effectNamed(current, input.name);

            if (ended === undefined) {
                const held = current.length === 0 ? `${holder.page.name} has no effects.` : `Its effects: ${current.map((effect) => effect.name).join(", ")}.`;
                throw new Error(`${holder.page.name} has no effect named ${input.name.trim()}. ${held}`);
            }

            const remaining = current.filter((effect) => effect !== ended);
            const values = valuesChanged(world, holder.page, withEffects(holder.page, remaining), ended);
            saveEffects(root, world, holder, remaining);
            appendLogEntry(root, newDatedLogEntry(root, context, "effect-ended", visibility, { page: holder.page.name, copy: holder.copy ? true : undefined, effect: ended.name, why }));
            return { action: "end", page: holder.page.name, effect: ended.name, values, ended: [], notes: [] };
        }

        const name = input.name.trim();

        if (/\([^()]*:[^()]*\)/.test(name)) {
            throw new Error(`Give the values with set, not in the name, such as name ${name.replace(/\s*\(.*$/, "")}, set ac=15.`);
        }

        if (/\buntil\b/i.test(name)) {
            throw new Error(`The name ${name} has "until" in it: give the end with for or until, not in the name.`);
        }

        const values = readValues(world, holder.page, input.set);
        checkPlaceValues(world, holder, values);
        const keeper = input.by === undefined ? undefined : keeperLink(world, open.scene, input.by);
        const system = campaignSystem(root, context);
        checkNotCounter(system, holder.page, name);
        const added: Effect = { name, ...(keeper === undefined ? {} : { by: keeper }), values, ...withEnd(root, open.scene, input.for, input.until, system, inScene(open.scene, holder), missingSystemHint(world)) };
        checkLine(added);
        const replaced = effectNamed(current, name);
        const effects = withEffect(current, added);
        const changed = valuesChanged(world, holder.page, withEffects(holder.page, effects), added);
        const notes = [...addNotes(world, holder.page, current, added, open.scene, system), ...conditionNote(root, system, name), ...roundsNote(input.for, added.end, system)];
        saveEffects(root, world, holder, effects);
        appendLogEntry(root, newDatedLogEntry(root, context, "effect-added", visibility, { page: holder.page.name, copy: holder.copy ? true : undefined, effect: formatEffect(added), why }));
        const instead = replaced === undefined ? [] : [`It takes the place of ${formatEffect(replaced)}.`];
        return { action: "add", page: holder.page.name, effect: added.name, end: added.end === undefined ? undefined : formatEnd(added.end), values: changed, ended: [], notes: [...instead, ...notes] };
    },

    format(result)
    {
        const values = result.values.length === 0 ? "" : `; ${result.values.join(", ")}`;

        if (result.action === "end") {
            return result.effect === undefined ? `Ended: ${result.ended.join(" · ")}.` : `${result.page}: ${result.effect} ended${values}.`;
        }

        const line = `${result.page}: ${result.effect}${result.end === undefined ? ", until it is ended" : ` until ${result.end}`}${values}.`;
        // A note of several lines, such as the text of a condition, goes on lines of its own.
        const short = result.notes.filter((note) => !note.includes("\n"));
        const long = result.notes.filter((note) => note.includes("\n"));
        return [[line, ...short].join(" "), ...long].join("\n\n");
    },
});

/**
 * An effect on a place holds for all inside by its name and its end; its values are the place's own (ENV-3, D-157). One named as an entry of the environment
 * that holds there would seem to change it, and would not: refused.
 */
function checkPlaceValues(world: World, holder: EffectHolder, values: [string, string][]): void
{
    if (holder.copy || holder.page.type !== "place") {
        return;
    }

    const entries = environmentAt(world, holder.page);
    const clash = values.find(([field]) => entries.some(({ entry }) => comparableText(entry.name) === comparableText(field)));

    if (clash !== undefined) {
        const where = entries.find(({ entry }) => comparableText(entry.name) === comparableText(clash[0]))?.place.name ?? holder.page.name;
        throw new Error(
            `${clash[0]} is in the environment of ${where}: an effect on a place holds for all inside by its name and end, and its values are the place's own. Leave ${clash[0]} out and let the name say it, such as Magical darkness.`,
        );
    }
}

/** An effect never bears the name of a counter of the game system, such as exhaustion: the counter is kept on the page, with change (DAT-6). */
function checkNotCounter(system: GameSystem | undefined, page: Page, name: string): void
{
    const field = Object.keys(system?.fields ?? {}).find((candidate) => comparableText(candidate) === comparableText(name));

    if (system !== undefined && field !== undefined && system.fields[field] === "counter") {
        throw new Error(`${field} is a counter of the system ${system.name}, kept on the page: change it, such as page ${page.name}, field ${field}, by 1. Nothing changed.`);
    }
}

/** Whether the holder of an effect is in the open scene: a copy in it, or a character it is with. */
function inScene(scene: Scene | undefined, holder: EffectHolder): boolean
{
    return scene !== undefined && (holder.copy || scene.with.some((link) => comparableText(parsePageReference(link).name) === comparableText(holder.page.name)));
}

/**
 * When the effect ends (EFF-4): a duration in game time from now; rounds from the current turn, or the next turn of someone, in a scene with turns;
 * the end of the scene; an occasion of the game system; or nothing. `member` says whether its holder is in the open scene, and `hint` what a missing
 * game system means, for a duration that does not read.
 */
function withEnd(
    root: string,
    scene: Scene | undefined,
    duration: string | undefined,
    until: string | undefined,
    system: GameSystem | undefined,
    member: boolean,
    hint: string,
): { end?: EffectEnd; }
{
    if (duration !== undefined && until !== undefined) {
        throw new Error("Give for or until, not both.");
    }

    if (until !== undefined) {
        return { end: untilTurn(scene, until) };
    }

    if (duration === undefined || duration.trim() === "") {
        return {};
    }

    if (isSceneDuration(duration)) {
        if (scene === undefined) {
            throw new Error("No scene is open: an effect that lasts the scene needs one. Open it with scene open, or give a duration such as 10m.");
        }

        return { end: { scene: true } };
    }

    const rounds = readRounds(duration);

    if (rounds !== undefined) {
        const turns = sceneTurns(scene);
        return { end: { round: turns.round + rounds, turn: turns.turn } };
    }

    const occasion = occasionsOf(system).find((candidate) => comparableText(candidate) === comparableText(duration.trim()));

    if (occasion !== undefined) {
        return { end: { occasion } };
    }

    const minutes = readDuration(duration);

    if (minutes === undefined) {
        const occasions = occasionsOf(system);
        const named = occasions.length === 0 ? "" : `, or an occasion of the system ${system?.name ?? ""}: ${occasions.join(", ")}`;
        throw new Error(`"${duration}" is not a duration: write it as 10m, 1h or 1d 6h, as rounds such as 1 round or 10 rounds, or scene${named}.${hint}`);
    }

    // In a scene with turns, time does not pass with the rounds: a duration of up to a minute, on someone in the scene, becomes rounds as long as the system's
    // round; a longer one stays in game time and outlasts the scene (DAT-7).
    if (member && minutes <= 1 && scene?.order !== undefined && system?.roundSeconds !== undefined) {
        const turns = sceneTurns(scene);
        return { end: { round: turns.round + Math.ceil((minutes * 60) / system.roundSeconds), turn: turns.turn } };
    }

    const now = presentDate(root);

    if (now === undefined) {
        throw new Error('The game has no date yet, so a duration in time cannot end: set the date with advance to, such as "day 1, 18:00", or count the effect in rounds.');
    }

    return { end: { date: formatGameDate(addDuration(now, minutes)) } };
}

/** The start of someone's next turn: in this round, if their turn is still to come, else in the next (EFF-4). */
function untilTurn(scene: Scene | undefined, name: string): EffectEnd
{
    const turns = sceneTurns(scene);
    const who = sameName(turns.order, parsePageReference(name).name);

    if (who === undefined) {
        throw new Error(`${name} takes no turn in this scene. The order: ${turns.order.join(", ")}.`);
    }

    const later = turns.order.indexOf(who) > turns.order.indexOf(turns.turn);
    return { round: later ? turns.round : turns.round + 1, turn: who };
}

/** The order, round and turn of the open scene; refused, with how to set them, when it has none. */
function sceneTurns(scene: Scene | undefined): { order: string[]; round: number; turn: string; }
{
    if (scene?.order === undefined || scene.turn === undefined) {
        throw new Error(`Rounds are counted in a scene with turns: ${scene === undefined ? "open one with scene open, then set the order" : "set the order with scene order"}, or give a duration in time, such as 1m.`);
    }

    return { order: scene.order, round: scene.round ?? 1, turn: scene.turn };
}

/** Who keeps the effect alive, as the line writes it: a link to a page, or the name of a copy in the open scene (D-138). */
function keeperLink(world: World, scene: Scene | undefined, name: string): string
{
    const found = pageOrCopy(world, { scene }, name, (page) => `who keeps an effect alive is a whole page, such as ${page}`);
    return found.copy ?? `[[${found.page.name}]]`;
}

/**
 * The values an effect gives (EFF-3, EFF-4): counters and free fields, never a fixed field or a relation; one value for each field; a counter stays a counter.
 * As text, the way the line writes them.
 */
function readValues(world: World, page: Page, set: string[] | Record<string, unknown> | undefined): [string, string][]
{
    const pairs = Array.isArray(set)
        ? set.map((assignment): [string, unknown] => {
            const separator = assignment.indexOf("=");

            if (separator <= 0 || assignment.slice(separator + 1).trim() === "") {
                throw new Error(`Write a value as field=value, such as ac=15, not "${assignment}".`);
            }

            return [assignment.slice(0, separator).trim(), assignment.slice(separator + 1).trim()];
        })
        : Object.entries(set ?? {});
    const fields = effectiveFields(world, page);

    return pairs.map(([field, value], index) => {
        if (isStandardField(page.type, field) || isNeverInherited(field) || comparableText(field) === "by") {
            throw new Error(`An effect gives values to counters and free fields, such as ac=15, not to ${field}.`);
        }

        if (pairs.findIndex(([other]) => comparableText(other) === comparableText(field)) !== index) {
            throw new Error(`${field} is given twice: give each value once.`);
        }

        if (value === null || value === undefined || String(value).trim() === "") {
            throw new Error(`Give ${field} a value, such as ${field}=15.`);
        }

        if (typeof value !== "string" && typeof value !== "number" && typeof value !== "boolean") {
            throw new Error(`Give ${field} one value, such as ${field}=15: an effect does not hold lists.`);
        }

        const text = String(value).trim();
        checkValue(world, page, fields, field, text);
        return [field, text];
    });
}

/** A value reads as a page would hold it, and a field the page reads as a counter gets a counter: the value it reads, not a bonus. */
function checkValue(world: World, page: Page, fields: Record<string, unknown>, field: string, text: string): void
{
    let value: unknown;

    try {
        value = readFieldValue(text);
    } catch (error) {
        throw new Error(`${error instanceof Error ? error.message : String(error)} Nothing changed.`);
    }

    const current = Object.entries(fields).find(([name]) => comparableText(name) === comparableText(field))?.[1];
    const computed = computedField(world, field, fields);

    // An effect changes what a computed field comes from, never the field (FOR-7, D-200).
    if (computed !== undefined) {
        // A bonus field first, which is what an effect is for; else a field the page writes.
        const from = [...computed.from.filter((name) => declaredKind(world, name) === "bonus"), ...computed.from.filter((name) => computedField(world, name, fields) === undefined)];
        throw new Error(
            `${computed.name} on ${page.name} is worked out by the system ${world.system?.name ?? ""} from ${computed.from.join(", ")}: give the effect one of the fields it comes from instead, such as ${
                from[0] ?? computed.from[0]
            }. Nothing changed.`,
        );
    }

    // A bonus is what the effect adds, with its sign or without (FOR-5).
    if (declaredKind(world, field) === "bonus" && numberOf(text) === undefined) {
        throw new Error(`${field} on ${page.name} is a bonus: give what the effect adds, such as ${field}=1, not "${text}". Nothing changed.`);
    }

    // A field the game system declares as a number takes a number; a counter stays a counter (SYS-8, EFF-3).
    if (["number", "modifier"].includes(declaredKind(world, field) ?? "") && typeof value !== "number" && !(declaredKind(world, field) === "modifier" && numberOf(text) !== undefined)) {
        throw new Error(`${field} on ${page.name} is a number, ${String(current ?? "none")}: give the value it reads while the effect lasts, such as ${field}=${exampleValue(current, text)}, not "${text}". Nothing changed.`);
    }

    // The maximum of a counter the system works out comes from what the formula reads, as hp from hp-base (FOR-6, FOR-7).
    const limits = readCounter(value)?.max === undefined ? {} : counterLimits(world, fields, field);

    if (limits.max !== undefined && readCounter(value)?.max !== limits.max) {
        const from = maximumSources(world, field, fields);
        throw new Error(
            `The maximum of ${field} on ${page.name} is worked out by the system ${world.system?.name ?? ""}: ${limits.max}, from ${from.join(", ")}. Give the effect the current value alone, such as ${field}=${
                readCounter(value)?.value ?? 0
            }, or one of those fields, such as ${from[0] ?? field}. Nothing changed.`,
        );
    }

    if (!isDeclaredUncounted(world, field) && readCounter(current) !== undefined && readCounter(value) === undefined) {
        throw new Error(`${field} on ${page.name} is a counter, ${String(current)}: give the value it reads while the effect lasts, such as ${field}=${exampleValue(current, text)}, not "${text}". Nothing changed.`);
    }
}

/** The effect must read back from its line as it is. */
function checkLine(added: Effect): void
{
    const read = readEffect(formatEffect(added));

    if ("problem" in read) {
        throw new Error(`${read.problem} Nothing changed.`);
    }

    if (JSON.stringify(read.effect) !== JSON.stringify(added)) {
        throw new Error(`"${formatEffect(added)}" would not read back as written: give values without commas. Nothing changed.`);
    }
}

/**
 * What the master should know about an effect just added: a current/max counter in it changes there and is lost at its end; a value it gives over another
 * effect's; a duration in time in a scene whose turns do not move time (EFF-3, EFF-4).
 */
function addNotes(world: World, page: Page, current: Effect[], added: Effect, scene: Scene | undefined, system: GameSystem | undefined): string[]
{
    const others = withEffects(page, current.filter((effect) => comparableText(effect.name) !== comparableText(added.name)));
    const fields = effectiveFields(world, others);
    const read = (field: string): string => String(Object.entries(fields).find(([name]) => comparableText(name) === comparableText(field))?.[1] ?? "none");
    const counters = added.values.filter(([field, value]) => !isDeclaredUncounted(world, field) && readCounter(value)?.max !== undefined).map(([field]) => field);
    // A bonus field adds up the effects that give it, so none goes over another (FOR-5).
    const over = added.values.filter(([field]) => declaredKind(world, field) !== "bonus").flatMap(([field]) => {
        const other = effectGiving(others, field);
        return other === undefined ? [] : [`${field} goes over ${other.name} (${field} ${read(field)})`];
    });
    // With a round, a short duration became rounds and a long one outlasts the scene on purpose (DAT-7): only a system without one needs the warning.
    const timed = scene?.order !== undefined && added.end !== undefined && "date" in added.end && system?.roundSeconds === undefined;
    return [
        counters.length === 0
            ? ""
            : `${counters.join(", ")} change${counters.length === 1 ? "s" : ""} on ${added.name} while it lasts, and at its end ${page.name} reads ${
                counters.map((field) => `${field} ${read(field)}`).join(", ")
            } again: what must outlive it goes on the page, with change.`,
        over.length === 0 ? "" : `Its ${over.join(", ")}: write the value both give together.`,
        timed ? "The scene counts turns, and time does not pass with them: if it should end during the turns, give it in rounds." : "",
    ].filter((note) => note !== "");
}

/**
 * The text of a condition of the game system, when the effect bears its name (DAT-6): who believes they know a rule does not look it up. A house rule
 * on it comes first, with the precedents on it.
 */
function conditionNote(root: string, system: GameSystem | undefined, name: string): string[]
{
    const condition = system?.conditions.find((candidate) => comparableText(candidate) === comparableText(name));

    if (system === undefined || condition === undefined) {
        return [];
    }

    const rule = ruleTitled(root, system, condition);

    if (rule === undefined) {
        return [];
    }

    const source = rule.source === houseRules ? ", by a house rule of the campaign" : "";
    return [`${condition} is a condition of the system ${system.name}${source}:\n${ruleBlock(rule)}`];
}

/** "1m is 10 rounds of 6 seconds.": a duration in time that became rounds, in a scene with turns (DAT-7). */
function roundsNote(duration: string | undefined, end: EffectEnd | undefined, system: GameSystem | undefined): string[]
{
    const minutes = duration === undefined ? undefined : readDuration(duration);

    if (minutes === undefined || end === undefined || !("round" in end) || system?.roundSeconds === undefined) {
        return [];
    }

    const rounds = Math.ceil((minutes * 60) / system.roundSeconds);
    return [`${duration?.trim() ?? ""} is ${rounds} ${rounds === 1 ? "round" : "rounds"} of ${system.roundSeconds} seconds.`];
}

/** The value an effect would give, such as 18 for "+2" on ac 16; 16 when the change is not a number added to one. */
function exampleValue(current: unknown, text: string): number
{
    return typeof current === "number" && /^[+-]\d+$/.test(text.trim()) ? current + Number(text.trim()) : 16;
}
