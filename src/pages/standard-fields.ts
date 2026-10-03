import type { PageType } from "./page-types.ts";

const linkPattern = /^\[\[[^\]]+\]\]$/;

/** What a standard field holds: text, a link, a list of links or text, a list of links only, or one of some values. */
type Rule = "text" | "link" | "list" | "links" | readonly string[];

const commonRules: Record<string, Rule> = { tags: "list", aliases: "list" };

const typeRules: Partial<Record<PageType, Record<string, Rule>>> = {
    character: { role: ["pc", "companion", "npc"], creature: "link", inventory: "list", knows: "links", factions: "links", status: ["alive", "dead"] },
    place: { contains: "list" },
    quest: { status: ["planned", "open", "done", "failed"] },
    event: { date: "text", place: "link", status: ["planned", "happened"] },
};

// What a new page of a type holds when the write that creates it leaves the field out.
const defaultFields: Partial<Record<PageType, Record<string, unknown>>> = {
    quest: { status: "planned" },
};

/** The fields a new page of this type starts with, unless they are given. */
export function newPageFields(type: PageType): Record<string, unknown>
{
    return defaultFields[type] ?? {};
}

/** The fields that list what a page holds: a place's contents and a character's inventory. */
export const containerFields = ["contains", "inventory"];

/** Whether a field has a fixed meaning on pages of this type, such as an event's date: such a field is never a counter. */
export function isStandardField(type: PageType | undefined, name: string): boolean
{
    return name in commonRules || (type !== undefined && name in (typeRules[type] ?? {}));
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

/** What is wrong with a standard field, such as "status" must be one of…; undefined when it is right, missing or not standard. */
export function standardFieldProblem(type: PageType | undefined, fields: Record<string, unknown>, name: string): string | undefined
{
    const rules = { ...commonRules, ...(type === undefined ? {} : typeRules[type]) };
    const problem = name in rules && name in fields ? problemWith(fields[name], rules[name]) : undefined;
    return problem === undefined ? undefined : `"${name}" ${problem}`;
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
    }
}

function isLink(value: unknown): boolean
{
    return typeof value === "string" && linkPattern.test(value);
}
