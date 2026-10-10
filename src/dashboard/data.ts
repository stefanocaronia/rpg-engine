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

/** Where the page puts the groups of a sheet: those of its rail, in order, and the order of the others (D-295); those at hand in a fight (D-315). */
export interface SheetCards
{
    rail: string[];
    order: string[];
    atHand: string[];
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

/** Someone at the place or in the scene as the player sees them (VIEW-6): a name, or someone; their role and picture; for copies of a creature, how many. */
export interface ShownPerson
{
    name: string;
    role: "pc" | "companion" | "other";
    image?: { file: string; version: number; };
    stranger?: true;
    count?: number;
}

/** Where the player character is, as it knows it (VIEW-6): the places that hold it, the outermost first; what holds there; its text; who is there. */
export interface ShownPlace
{
    name: string;
    image?: { file: string; version: number; };
    within: string[];
    around: { text: string; place?: string; }[];
    text: string;
    here: ShownPerson[];
    /** Its map, when it has one (GRD-6). */
    map?: ShownGrid;
}

/** The map of the place where the party is (GRD-6, D-323): its rows of squares as written, its legend, where its squares lead, who stands where. */
export interface ShownGrid
{
    columns: number;
    rows: number;
    lines: string[];
    legend: { symbol: string; name: string; kind: string; blocks?: true; difficult?: true; }[];
    /** How its ground looks (D-325): floor, cave, paving, a biome, or plain. */
    ground: string;
    exits: { square: string; to?: string; }[];
    /** Who stands where: the side of what they fill, when more than a square, and how far from the player character (GRD-4, D-328). */
    at: (ShownPerson & { square: string; side?: number; distance?: string; })[];
    /** On the player character's turn in a fight, the squares it can still reach (D-328). */
    reach?: string[];
}

/** Someone in a fight as the player sees them (D-314): the party's counter as numbers, a foe's in words; what is on them; whether they act; what they keep; the dying's counters. */
export interface Fighter
{
    name: string;
    role: "pc" | "companion" | "other";
    image?: { file: string; version: number; };
    stranger?: true;
    health?: string;
    effects: Member["effects"];
    inactive?: true;
    keeps?: string[];
    dying?: DyingCounter[];
}

/** A counter of the panel of the dying (D-314): its value, and its limit. */
export interface DyingCounter
{
    field: string;
    value: number;
    limit?: number;
}

/** The open scene as the player sees it (VIEW-6). */
export interface ShownScene
{
    title: string;
    type: string;
    since?: string;
    /** What is happening now (SCN-11). */
    now?: string;
    place?: string;
    who: ShownPerson[];
    order?: string[];
    turn?: string;
    round?: number;
    /** In a fight, each one in it, in the order of the turns (D-314). */
    fighters?: Fighter[];
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
    /** At the system's dying point, the counters shown large in their band (D-310 (7)). */
    dying?: DyingCounter[];
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
    /** Whether it asks where the player's character moves on the map of its place, its one button the change of mind (ASK-11). */
    square?: true;
}

/** A point of the world map, in km east and north of its centre; with its map, by the place that holds it, none for the main map (POS-8). */
export interface MapPoint
{
    x: number;
    y: number;
    map?: string;
}

/** A place the character knows on the map (VIEW-7): its kind, its point when it is drawn, the known places that hold it, a region's radius, biome and terrain, where it is from the party. */
export interface MapPlace
{
    name: string;
    kind?: string;
    x?: number;
    y?: number;
    map?: string;
    within: string[];
    radius?: number;
    biome?: string;
    terrain?: string;
    from?: string;
    image?: { file: string; version: number; };
}

/** A known road from its first known stop to its last (VIEW-7): a stop the character does not know is a point without a name; beyond, a beginning toward the next. */
export interface MapRoad
{
    name: string;
    kind: string;
    points: (MapPoint & { name?: string; km: number; })[];
    before?: MapPoint;
    after?: MapPoint;
}

/** A map the character knows (POS-8, D-320): its name, the main map's being the campaign's; and the map it lies under or mirrors, sharing its coordinates. */
export interface KnownMap
{
    name: string;
    main?: true;
    under?: string;
    mirror?: string;
}

/** The world map as the character knows it (VIEW-7, D-318): the player's unit and its km, the maps it knows, the places nearest the party first, the roads, the party and its trail. */
export interface WorldMap
{
    unit: { name: "km" | "mi"; km: number; };
    maps: KnownMap[];
    places: MapPlace[];
    roads: MapRoad[];
    party?: MapPoint & { place?: string; };
    trail: MapPoint[];
}

/** What view gives: the party, a page with its sheet, one section, the world map, or nothing. */
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
        place?: ShownPlace;
        openScene?: ShownScene;
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
    | ({ kind: "map"; } & WorldMap)
    | { kind: "unknown"; text: string; };
