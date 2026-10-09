// What the page reads from view (D-272), as its JSON comes: test/dashboard.test.ts checks that what view gives fits these types.

/** A counter's value, with its limits. */
export interface Counter
{
    value: number;
    max?: number;
    min?: number;
}

/** A value of a sheet or of someone's line: its text as the chat gives it, and what the widgets need. */
export interface SheetValue
{
    field: string;
    kind?: string;
    text: string;
    counter?: Counter;
    items?: string[];
    always?: { from: string[]; items: string[]; };
    marks: number;
    beside?: string;
}

/** A group of a sheet: its values, or each item of a list with its values, as the attacks. */
export interface SheetGroup
{
    name: string;
    values: SheetValue[];
    items?: { item: string; values: SheetValue[]; }[];
}

/** Someone of the party. */
export interface Member
{
    name: string;
    role: "pc" | "companion";
    dead: boolean;
    /** Their picture's file, and when it last changed. */
    image?: { file: string; version: number; };
    place?: string;
    counters: SheetValue[];
    effects: { name: string; end?: string; text: string; }[];
}

/** What view gives: the party, a page with its sheet, one section, or nothing. */
export type View =
    | { kind: "none"; }
    | { kind: "overview"; campaign: string; now?: string; party: Member[]; quests: string[]; scene?: string; diary: string[]; total: number; }
    | { kind: "page"; title: string; sheet: SheetGroup[]; text: string; }
    | { kind: "section"; title: string; lines: string[]; text: string; }
    | { kind: "unknown"; text: string; };
