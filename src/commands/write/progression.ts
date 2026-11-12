// What the classes give after a write: features, values, items given or read first, and the counters' maxima worked out again
import type { Context } from "../../core/context.ts";
import { fieldsRead, listItemNames } from "../../core/formula.ts";
import { comparableText, sameName, valueNamed } from "../../core/text.ts";
import { formatCounter, readCounter } from "../../counters/index.ts";
import { declaredKind, inheritedFields, type Page, type World } from "../../pages/index.ts";
import { featureParts, mergedFeatures } from "../../progression/index.ts";
import type { GameSystem } from "../../systems/index.ts";
import { partText, situationPart } from "../shared/campaign/parts.ts";
import { effectiveFields } from "../shared/sheet/effect-layer.ts";
import { givenItems, progressionOf } from "../shared/sheet/progression.ts";
import { hasSheet, isUse } from "../shared/sheet/system-fields.ts";
import { counterLimits, itemLines, maximumSources, missingUses, workedMaximum } from "../shared/sheet/worked-out.ts";
import { signedText, workedParts } from "../shared/sheet/worked-text.ts";
import { askedFields } from "./checks.ts";

/**
 * What a change of classes gives or takes (PRO-4): the features of the rows it reaches, new, gained again or with a new value, those no longer had, the values of
 * the rows and of the formulas of the classes' pages that change, and, when a class rises, the system's note for a new level (D-226), unless the same write sets
 * a field it names, as hp-base. Nothing when the classes give the same.
 */
export function progressionNotes(context: Context, system: GameSystem | undefined, before: World, after: World, existing: Page, page: Page, set: string[]): string[]
{
    const was = progressionOf(before, effectiveFields(before, existing));
    const is = progressionOf(after, effectiveFields(after, page));
    const gains = rowGains(was, is);
    const lost = (was?.features ?? []).map((feature) => feature.name).filter((name) => !(is?.features ?? []).some((other) => sameFeature(other.name, name)));
    // The maximum of a use the rows give is said with the counters (FOR-6).
    const counters = Object.keys(after.system?.formulas?.counters ?? {});

    const valueOf = (progression: typeof was, field: string): string | undefined => {
        const found = progression?.values.find((value) => comparableText(value.field) === comparableText(field));
        return found === undefined ? undefined : signedText(after, found.field, found.value);
    };

    const fields = [...new Set([...(was?.values ?? []), ...(is?.values ?? [])].map((value) => value.field))].filter((field) => !counters.some((counter) => comparableText(counter) === comparableText(field)));
    const values = fields.flatMap((field) => {
        const [from, to] = [valueOf(was, field), valueOf(is, field)];
        return from === to ? [] : [`${field} ${from ?? "none"} → ${to ?? "none"}`];
    });
    // What the formulas of the classes' pages give, as the prepared spells of a new level (PRO-5).
    const [then, now] = [effectiveFields(before, existing), effectiveFields(after, page)];
    const formulaValues = (after.system?.itemFormulas?.[after.system.progression?.list ?? ""] ?? []).flatMap((field) => {
        const [from, to] = [valueNamed(then, field), valueNamed(now, field)];
        const text = (value: unknown): string => (value === undefined ? "none" : typeof value === "number" ? signedText(after, field, value) : String(value));
        return text(from) === text(to) ? [] : [`${field} ${text(from)} → ${text(to)}`];
    });
    const shown = gains.fresh[0] ?? gains.better[0]?.name;
    const parts = [
        gains.fresh.length === 0 ? "" : `${gains.fresh.join(", ")} ${gains.fresh.length === 1 ? "is" : "are"} new`,
        gains.again.length === 0 ? "" : `${gains.again.join(", ")} again`,
        gains.better.map((feature) => feature.text).join(", "),
        lost.length === 0 ? "" : `no longer ${lost.join(", ")}`,
        [...values, ...formulaValues].join(", "),
    ].filter((part) => part !== "");
    const hint = shown === undefined ? "" : ` show ${page.name}#${featureParts(shown).name} gives a feature's text.`;
    const levelUp = partText("level-up", system);
    // A new level is one more in all: a class changed for another of a lower level is none.
    const levels = (progression: typeof was): number => (progression?.from ?? []).reduce((total, item) => total + (item.level ?? 0), 0);
    // Not said when the same write sets a field the note names, as hp-base: it is already done.
    const named = new Set((levelUp?.match(/[\p{L}\p{N}-]+/gu) ?? []).map(comparableText));
    const done = set.some((field) => named.has(comparableText(field)));
    // The part level-up, once in a chat (D-97).
    const risen = levelUp !== undefined && levels(is) > levels(was) && !done ? situationPart("level-up", context, system) : "";
    // A value that ends in a period, such as +10 ft., ends the line.
    const said = parts.length === 0 ? [] : [`What ${page.name}'s ${is?.lists[0] ?? was?.lists[0] ?? "classes"} give: ${parts.join("; ").replace(/\.$/, "")}.${hint}`];
    return [...said, ...(risen === "" ? [] : [risen])];
}

/**
 * The features the rows and parts give now that they did not before, each name once (PRO-3): new to the character, gained again, as a later Ability Score
 * Improvement, or with a new value, as "Bardic Inspiration (d6 → d8)".
 */
function rowGains(was: ReturnType<typeof progressionOf>, is: ReturnType<typeof progressionOf>): { fresh: string[]; again: string[]; better: { name: string; text: string; }[]; }
{
    const key = (gain: { name: string; level: number; page: Page; }): string => `${gain.page.path}|${gain.level}|${comparableText(gain.name)}`;
    const old = new Set((was?.gains ?? []).map(key));
    const had = was?.features ?? [];
    const result = { fresh: [] as string[], again: [] as string[], better: [] as { name: string; text: string; }[] };

    for (const gain of mergedFeatures((is?.gains ?? []).filter((candidate) => !old.has(key(candidate))))) {
        const before = had.find((feature) => sameFeature(feature.name, gain.name))?.name;
        const [then, now] = [featureParts(before ?? "").value, featureParts(gain.name).value];

        if (before === undefined) {
            result.fresh.push(gain.name);
        } else if (now !== undefined && then !== undefined && comparableText(now) !== comparableText(then)) {
            result.better.push({ name: gain.name, text: `${featureParts(gain.name).name} (${then.slice(1, -1)} → ${now.slice(1, -1)})` });
        } else {
            result.again.push(featureParts(gain.name).name);
        }
    }

    return result;
}

/** Whether two names are the same feature, with or without a value in parentheses (PRO-3). */
function sameFeature(first: string, second: string): boolean
{
    return comparableText(featureParts(first).name) === comparableText(featureParts(second).name);
}

/** A section of a character with the name of a feature its classes give: show gives it in place of the feature's text (PRO-4). */
export function featureSectionNotes(world: World, page: Page, section: string): string[]
{
    const feature = progressionOf(world, effectiveFields(world, page))?.features.find((candidate) => sameFeature(candidate.name, section));
    return feature === undefined ? [] : [`show ${page.name}#${section} now gives this section, not the text of the feature ${featureParts(feature.name).name} its classes give.`];
}

/** Items written in a list where the parts of the classes already put them, as a domain's spell in prepared: always there, they do not count with the rest (PRO-7). */
export function givenListNotes(world: World, page: Page, changed: string[]): string[]
{
    const progression = progressionOf(world, effectiveFields(world, page));
    return changed.flatMap((field) => {
        const written = listItemNames(valueNamed(page.fields, field));
        const twice = givenItems(progression, field).filter((item) => sameName(written, item.name) !== undefined);
        const pages = [...new Set(twice.map((item) => item.page.name))].join(" and ");
        return twice.length === 0
            ? []
            : [`${twice.map((item) => item.name).join(", ")} ${twice.length === 1 ? "is" : "are"} always in ${field}, from ${pages}, and not counted with the rest: write ${page.name}, remove ${field}=${
                twice[0].name
            }, to choose another in its place.`];
    });
}

/**
 * When the items of a list give a field another formula reads, as two armors in equipped or Unarmored Defense from two classes, the formula reads the first
 * (PRO-5): said when a write makes it so.
 */
export function firstItemNotes(before: World, after: World, existing: Page | undefined, page: Page): string[]
{
    const computed = after.system?.formulas?.computed ?? [];
    return Object.entries(after.system?.itemFormulas ?? {}).flatMap(([list, names]) =>
        names.flatMap((field) => {
            const readers = computed.filter(([, formula]) => fieldsRead(formula).some((name) => comparableText(name) === comparableText(field))).map(([name]) => name);
            const giving = (world: World, fields: Record<string, unknown>): string[] => itemLines(world, fields, list, [field]).map((line) => line.item);
            const is = readers.length === 0 ? [] : giving(after, effectiveFields(after, page));
            const was = is.length < 2 || existing === undefined ? [] : giving(before, effectiveFields(before, existing));

            if (is.length < 2 || (was.length === is.length && was.every((name, index) => comparableText(name) === comparableText(is[index])))) {
                return [];
            }

            return [`${readers.join(", ")} ${readers.length === 1 ? "reads" : "read"} ${field} from ${is[0]}, the first in ${page.name}'s ${list} that gives it, not from ${is.slice(1).join(", ")}.`];
        })
    );
}

/**
 * The counters of a page whose written maximum is not what the game system works out from the page without its effects, set to it, and a note (FOR-6). A use
 * that only the lists give and that the page no longer has, with a maximum of 0 or none where it had one, is taken off (DAT-9).
 */
export function workedLimitsChange(system: GameSystem | undefined, before: World, existing: Page | undefined, world: World, page: Page): { set: Record<string, unknown>; unset: string[]; notes: string[]; }
{
    const fields = inheritedFields(world, page);
    const old = existing === undefined ? undefined : inheritedFields(before, existing);
    const changes = Object.keys(world.system?.formulas?.counters ?? {}).flatMap((field) => {
        const key = sameName(Object.keys(page.fields), field);
        const counter = key === undefined ? undefined : readCounter(page.fields[key]);
        const { max } = counterLimits(world, fields, field);
        const had = old === undefined || max !== undefined ? undefined : counterLimits(before, old, field).max;
        const limit = max ?? (had === undefined ? undefined : 0);

        if (key === undefined || counter === undefined || limit === undefined || counter.max === limit) {
            return [];
        }

        // Of a use, what was spent stays spent, as a table counts it: a maximum that grows by 3 gives 3 more; one that falls only caps the current, as the SRD does,
        // but for what an effect allows above the written maximum (FOR-6, D-228). Any other counter keeps its current, which reads no higher than the maximum.
        const grows = counter.max !== undefined && limit > counter.max;
        const capped = counter.max !== undefined && counter.value <= counter.max ? Math.max(0, Math.min(counter.value, limit)) : counter.value;
        const value = !isUse(world, key) || counter.max === undefined ? counter.value : grows ? counter.value + limit - counter.max : capped;
        return [{ key, before: counter.max, value: formatCounter({ value, max: limit }), reads: formatCounter({ value: Math.min(value, limit), max: limit }), max: limit, lost: max === undefined }];
    });
    // Only a use that the lists give, such as rages from the classes, never one the sheet asks to write, as hp: it stays at any maximum.
    const asked = askedFields(system);

    // A maximum from a class's row, with no formula, has no sources: the lists give it.
    const givenByLists = (field: string): boolean => {
        const sources = maximumSources(world, field, fields);
        return !asked.has(comparableText(field)) && (sources.length === 0 || sources.some((name) => declaredKind(world, name) === "list"));
    };

    // A use whose maximum has no value now, where it had one, as the slots of a caster who is one no more, is no longer the character's either.
    const gone = changes.filter((change) => change.max <= 0 && isUse(world, change.key) && !asked.has(comparableText(change.key)) && (change.lost || givenByLists(change.key)));
    const kept = changes.filter((change) => !gone.includes(change));
    // "hp 10/17 (max 10 → 17: hp-base 10, level 2, con-mod +2)": what the maximum comes from, so that a written maximum is not taken for the dice.
    const said = kept.map((change) => {
        const parts = workedParts(world, workedMaximum(world, fields, change.key)?.reads ?? []);
        return `${change.key} ${change.reads} (max ${change.before ?? "none"} → ${change.max}${parts === "" ? "" : `: ${parts}`})`;
    });
    // A use the page gets, such as a new level's channel-divinity, is written full on who keeps the sheet (DAT-9, D-225).
    const added = hasSheet(world, page) ? missingUses(world, fields).map((use) => ({ key: use.field, value: formatCounter({ value: use.max, max: use.max }) })) : [];
    const name = world.system?.name ?? "";
    const notes = [
        said.length === 0 ? "" : `${said.join(", ")}: worked out by the system ${name}.`,
        added.length === 0 ? "" : `${page.name} has ${added.map((use) => `${use.key} ${use.value}`).join(", ")}, full: uses of the system ${name} that come back with a rest.`,
        gone.length === 0 ? "" : `${page.name} no longer has ${gone.map((change) => change.key).join(", ")}: the system ${name} gives no uses of ${gone.length === 1 ? "it" : "them"} now.`,
    ];
    return {
        set: Object.fromEntries([...kept, ...added].map((change) => [change.key, change.value])),
        unset: gone.map((change) => change.key),
        notes: notes.filter((note) => note !== ""),
    };
}
