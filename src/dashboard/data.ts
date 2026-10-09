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
    /** The free roll its explanation offers (D-280). */
    roll?: SheetRoll;
    /** Where it is between two marks, as the experience between its level and the next. */
    progress?: { value: number; from: number; to: number; };
}

/** A free roll of a number of the sheet: the dice, by their sides, the number added, and both as a notation, such as 1d20+5. */
export interface SheetRoll
{
    notation: string;
    dice: number[];
    modifier: number;
}

/** A group of a sheet: its icon, the d of an SVG path, its values, or each item of a list with its values, as the attacks. */
export interface SheetGroup
{
    name: string;
    icon?: string;
    values: SheetValue[];
    items?: { item: string; values: SheetValue[]; }[];
}

/** Where the page puts the groups of a sheet: those of its rail, in order, and the order of the others (D-295). */
export interface SheetCards
{
    rail: string[];
    order: string[];
}

/** A mood of the master or of a character (MOOD-1, D-305): the engine's closed list, which the robot and the badges draw. */
export const moods = ["neutral", "happy", "delighted", "curious", "focused", "determined", "worried", "surprised", "afraid", "sad", "angry", "disgusted", "mischievous"] as const;

export type Mood = (typeof moods)[number];

/** A face the robot shows for a moment (MOOD-4, D-305): the master's, from the log, or a reaction to a roll; its id tells it from the one before. */
export interface Moment
{
    id: string;
    mood: Mood;
    /** When, in real time (ISO 8601): one older than a few seconds is not shown. A roll's reaction has none, being new by itself. */
    at?: string;
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
    /** Their mood, none when neutral or dead (MOOD-6). */
    mood?: Mood;
}

/** A die as it was thrown: its sides, the face it shows, the faces that add up on it with explosions, the face before a reroll, dropped or a success. */
export interface ThrownDie
{
    sides: number | "F";
    value: number;
    faces?: number[];
    rerolledFrom?: number;
    dropped?: boolean;
    success?: boolean;
}

/** A roll the player may see (D-279): theirs, or one the master showed; never a hidden one, never the master's why. */
export interface ShownRoll
{
    id: string;
    /** The game date, as day 1, 18:00. */
    date?: string;
    /** When it was rolled, in real time. */
    at: string;
    by: "player" | "master";
    /** For whom, as the player's character knows them. */
    who?: string;
    /** What the roll is: the check the master asked of the player, a roll of the dashboard's dice, or what the master names a roll of theirs. */
    check?: string;
    /** The picture of whom it is for, as the player's character knows them. */
    image?: { file: string; version: number; };
    /** Whom it is for is someone the character does not know by name. */
    stranger?: true;
    /** The notation in words, when it says more than its dice. */
    words?: string;
    notation: string;
    total: number;
    text: string;
    dice: ThrownDie[];
}

/** What the master asks the player now, with a button for each check or answer (D-279). */
export interface Asked
{
    id: string;
    question: string;
    /** The word for a roll, or for a choice, in the campaign's language. */
    title: string;
    labels: string[];
    /** By button, its dice in words when they say more than their dice, as "2d20, keep the highest, +5". */
    words?: (string | null)[];
}

/** What view gives: the party, a page with its sheet, one section, or nothing. */
export type View =
    | { kind: "none"; }
    | {
        kind: "overview";
        campaign: string;
        /** The game system: its name, what it is, and what its source asks to say. */
        system?: { name: string; title: string; attribution?: string; };
        now?: string;
        /** The master's mood, and their last moment (MOOD-6). */
        master?: { mood: Mood; moment?: Moment; };
        party: Member[];
        quests: string[];
        scene?: string;
        diary: string[];
        total: number;
        rolls: ShownRoll[];
        /** How many public rolls the log has. */
        rollsTotal?: number;
    }
    | { kind: "page"; title: string; headline?: string; sheet: SheetGroup[]; cards?: SheetCards; text: string; }
    | { kind: "section"; title: string; lines: string[]; text: string; }
    | { kind: "unknown"; text: string; };
