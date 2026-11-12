// How worked-out values read in outputs: signed, with their parts (FOR-8)
import type { FormulaRead } from "../../../core/formula.ts";
import { declaredKind, weightUnit, type World } from "../../../pages/index.ts";
import { formatDuration } from "../../../time/index.ts";

/** A computed field that has a value, and the values it came from (FOR-8); a field the rows of the classes give may hold text, such as martial-arts 1d6 (PRO-2). */
export interface WorkedField
{
    field: string;
    value: number | string;
    reads: FormulaRead[];
}

/** A value of a field as the outputs show it: with its sign when the system declares the field a modifier or a bonus (FOR-8). */
export function signedText(world: World, field: string, value: number | string): string
{
    const kind = declaredKind(world, field);

    // A length in the system's unit, at most one decimal: 12.5 ft (SPD-1).
    if (typeof value === "number" && kind === "length") {
        return `${Math.round(value * 10) / 10}${world.system?.lengthUnit === undefined ? "" : ` ${world.system.lengthUnit}`}`;
    }

    // A weight in the unit the system's items are weighed in: 420 lb.
    if (typeof value === "number" && kind === "weight") {
        const unit = world.system?.load === undefined ? undefined : weightUnit(world, world.system.load.field);
        return `${Math.round(value * 10) / 10}${unit === undefined ? "" : ` ${unit}`}`;
    }

    // A duration in minutes as the engine writes them, half a minute in seconds: 3m, 30s.
    if (typeof value === "number" && kind === "duration") {
        return value > 0 && value < 1 ? `${Math.round(value * 60)}s` : formatDuration(Math.round(value));
    }

    return typeof value === "number" && (kind === "modifier" || kind === "bonus") && value >= 0 ? `+${value}` : String(value);
}

/** "insight +5: wis-mod +3, proficiency +2, Insight in skill-proficiencies": a computed field and what it came from, leaving out what adds nothing (FOR-8). */
export function workedLine(world: World, worked: WorkedField): string
{
    const parts = workedParts(world, worked.reads);
    return `${worked.field} ${signedText(world, worked.field, worked.value)}${parts === "" ? "" : `: ${parts}`}`;
}

/** "wis-mod +3, proficiency +2, Insight in skill-proficiencies": the values a result came from, leaving out what adds nothing (FOR-8). */
export function workedParts(world: World, reads: FormulaRead[]): string
{
    const parts = reads.flatMap((read): string[] => {
        if ("table" in read) {
            // A key the explanation does not already give, as text: "ranks dangerous: 8".
            const keyed = reads.some((other) => "field" in other && "key" in other && other.key === true);
            return [keyed ? `${read.table} ${read.value}` : `${read.table} ${read.key}: ${read.value}`];
        }

        // The dice a roll took from a field, as a monk's martial-arts 1d6 (D-235).
        if ("dice" in read) {
            return [`${read.field} ${read.dice}`];
        }

        if ("field" in read) {
            // A bonus of 0 and a factor of 1 change nothing (FOR-5).
            const kind = declaredKind(world, read.field);
            return (read.value === 0 && kind === "bonus") || (read.value === 1 && kind === "factor") ? [] : [`${read.field} ${signedText(world, read.field, read.value)}`];
        }

        if ("item" in read) {
            return read.value === 0 ? [] : [read.value === 1 && !/\d/.test(read.item) ? `${read.item} in ${read.list}` : `${read.item} ${read.value} in ${read.list}`];
        }

        // The total of a list says nothing more beside one of its items, "Cleric 3 in classes", nor when it is 0; how many items a list has is no part of a value.
        if (read.count === true || read.value === 0 || reads.some((other) => "item" in other && other.list === read.list && other.value !== 0)) {
            return [];
        }

        return [`${read.value} in ${read.list}${read.where === undefined ? "" : `, ${read.where}`}`];
    });
    // "Perception in skills" says nothing more beside "Perception 3 in skills".
    const named = (part: string): boolean => parts.some((other) => other !== part && other.startsWith(part.replace(/ in [^ ]+$/, " ")) && other.endsWith(part.slice(part.lastIndexOf(" in "))));
    return parts.filter((part, index) => parts.indexOf(part) === index && !named(part)).join(", ");
}
