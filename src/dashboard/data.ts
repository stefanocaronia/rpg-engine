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
    date?: string;
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
        party: Member[];
        quests: string[];
        scene?: string;
        diary: string[];
        total: number;
        rolls: ShownRoll[];
    }
    | { kind: "page"; title: string; headline?: string; sheet: SheetGroup[]; cards?: SheetCards; text: string; }
    | { kind: "section"; title: string; lines: string[]; text: string; }
    | { kind: "unknown"; text: string; };
