import { comparableText } from "../core/text.ts";
import type { PageType } from "./page-types.ts";

const linkPattern = /^\[\[[^\]]+\]\]$/;

/**
 * What a standard field holds: text, a link, a list of links or text, a list of links only, a link or a list of links, a counter, conditions as text or a list of texts,
 * or one of some values. Counters and conditions are read fully by the commands that use them.
 */
type Rule = "text" | "link" | "list" | "links" | "linkOrLinks" | "counter" | "conditions" | readonly string[];

const commonRules: Record<string, Rule> = { tags: "list", aliases: "list" };

const typeRules: Partial<Record<PageType, Record<string, Rule>>> = {
    character: { role: ["pc", "companion", "npc"], creature: "link", inventory: "list", knows: "links", factions: "links", status: ["alive", "dead"] },
    place: { contains: "list" },
    creature: { creature: "link" },
    quest: { status: ["planned", "open", "done", "failed"] },
    event: { date: "text", place: "link", status: ["planned", "happened", "cancelled"], clock: "counter", when: "conditions", by: "linkOrLinks" },
};

// What a new page of a type holds when the write that creates it leaves the field out.
const defaultFields: Partial<Record<PageType, Record<string, unknown>>> = {
    quest: { status: "planned" },
    event: { status: "planned" },
};

/** The fields a new page of this type starts with, unless they are given. */
export function newPageFields(type: PageType): Record<string, unknown>
{
    return defaultFields[type] ?? {};
}

/** The fields that list what a page holds: a place's contents and a character's inventory. */
export const containerFields = ["contains", "inventory"];

/** The standard fields that are always lists, of links or of words, on the pages that have them: read from text as the command line reads them (D-136). */
export const listFieldNames = [...new Set([commonRules, ...Object.values(typeRules)].flatMap((rules) => Object.entries(rules ?? {}).filter(([, rule]) => ["list", "links", "linkOrLinks"].includes(rule as string)).map(([name]) => name)))];

/** Whether a field has a fixed meaning on pages of this type, such as an event's date: such a field is never a counter, but for an event's clock. */
export function isStandardField(type: PageType | undefined, name: string): boolean
{
    return Object.hasOwn(commonRules, name) || (type !== undefined && Object.hasOwn(typeRules[type] ?? {}, name));
}

/** Whether a standard field is a counter, changed with change like any other: an event's clock (EVT-2). */
export function isCounterField(type: PageType | undefined, name: string): boolean
{
    const rules = rulesOf(type);
    return Object.hasOwn(rules, name) && rules[name] === "counter";
}

/** The values a standard field takes on pages of a type, such as a quest's statuses; undefined when it takes any. */
export function standardValues(type: PageType | undefined, name: string): readonly string[] | undefined
{
    const rule = Object.hasOwn(rulesOf(type), name) ? rulesOf(type)[name] : undefined;
    return typeof rule === "object" ? rule : undefined;
}

/** Checks the standard fields among `names`, the ones a write changed. The other fields are free. */
export function checkStandardFields(type: PageType | undefined, fields: Record<string, unknown>, names: string[]): void
{
    for (const name of names) {
        const problem = standardFieldProblem(type, fields, name);

        if (problem !== undefined) {
            throw new Error(problem);
        }
    }
}

/** What is wrong with a standard field, such as "status" must be one of…, or a field named like one in another case, such as Status; undefined when it is right, missing or not standard. */
export function standardFieldProblem(type: PageType | undefined, fields: Record<string, unknown>, name: string): string | undefined
{
    const rules = rulesOf(type);

    if (!(name in fields)) {
        return undefined;
    }

    const misspelled = misspelledFieldProblem(type, name);
    const problem = Object.hasOwn(rules, name) && !isEmptyField(fields[name]) ? problemWith(fields[name], rules[name]) : undefined;
    return misspelled ?? (problem === undefined ? undefined : `"${name}" ${problem}`);
}

/** The standard field that `name` writes in another case or with accents written another way, such as status for Status; undefined otherwise. */
export function misspelledStandardField(type: PageType | undefined, name: string): string | undefined
{
    const rules = rulesOf(type);
    return Object.hasOwn(rules, name) ? undefined : Object.keys(rules).find((standard) => comparableText(standard) === comparableText(name));
}

/** Why a field named like a standard one in another case is not read, such as Status; undefined for any other name. */
export function misspelledFieldProblem(type: PageType | undefined, name: string): string | undefined
{
    const standard = misspelledStandardField(type, name);
    return standard === undefined ? undefined : `"${name}" is the standard field ${standard} written another way, so the engine does not read it: write it as ${standard}.`;
}

/** Whether a field holds nothing: missing, or empty, as Obsidian writes a property without a value. An empty field counts as missing. */
export function isEmptyField(value: unknown): boolean
{
    return value === undefined || value === null || (typeof value === "string" && value.trim() === "");
}

function rulesOf(type: PageType | undefined): Record<string, Rule>
{
    return { ...commonRules, ...(type === undefined ? {} : typeRules[type]) };
}

function problemWith(value: unknown, rule: Rule): string | undefined
{
    if (typeof rule !== "string") {
        return typeof value === "string" && rule.includes(value) ? undefined : `must be one of: ${rule.join(", ")}.`;
    }

    switch (rule) {
        case "text":
            return typeof value === "string" || typeof value === "number" ? undefined : "must be text.";
        case "link":
            return isLink(value) ? undefined : "must be a link, such as [[Page]].";
        case "list":
            return Array.isArray(value) && value.every((item) => typeof item === "string" || typeof item === "number") ? undefined : "must be a list of links or text, such as [[A]], [[B]] or [a, b].";
        case "links":
            return Array.isArray(value) && value.every(isLink) ? undefined : "must be a list of links, such as [[A]], [[B]].";
        case "linkOrLinks":
            return isLink(value) || (Array.isArray(value) && value.every(isLink)) ? undefined : "must be a link, or a list of links, such as [[Varro]].";
        case "counter":
            return typeof value === "string" || typeof value === "number" ? undefined : "must be a counter written current/max, such as 1/4.";
        case "conditions":
            return typeof value === "string" || (Array.isArray(value) && value.every((item) => typeof item === "string")) ? undefined : "must be a condition or a list of conditions, as text, such as party in [[Ossario]].";
    }
}

function isLink(value: unknown): boolean
{
    return typeof value === "string" && linkPattern.test(value);
}
