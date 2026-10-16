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
    /** For money, its coins from the largest, each with its metal when the game names it, as the dashboard draws them (D-431). */
    coins?: { coin: string; count: number; metal?: string; }[];
    beside?: string;
    /** The field shown beside it, such as str-mod by str, which a check may name (ASK-12). */
    besideField?: string;
    /** The free roll its explanation offers (D-280). */
    roll?: SheetRoll;
    /** Where it is between two marks, as the experience between its level and the next. */
    progress?: { value: number; from: number; to: number; };
    /** Beside the points, what they say of the levels (PRO-6): how many the next level needs, the level that is due, or the least the level needs. */
    levelNeed?: { needs: number; level: number; } | { due: number; } | { least: number; level: number; };
}

/** A free roll of a number of the sheet: the dice, by their sides, the number added, and both as a notation, such as 1d20+5. */
export interface SheetRoll
{
    notation: string;
    dice: number[];
    modifier: number;
}

/**
 * A group of a sheet: its icon, the d of an SVG path, its values, or each item of a list with its values, as the attacks; for what a character carries, each thing
 * with how deep inside another it is and whether it is equipped (D-431).
 */
export interface SheetGroup
{
    name: string;
    icon?: string;
    values: SheetValue[];
    items?: { item: string; values: SheetValue[]; depth?: number; inside?: string; equipped?: boolean; image?: { file: string; version: number; }; }[];
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
    /** The icon on the token of one of the party, as their class (D-414). */
    icon?: string;
    /** In a fight, marked by the master as attacking the party (D-415): its token glows red. */
    hostile?: true;
    stranger?: true;
    count?: number;
    /** What is on them (D-419): the party's effects with their end, of others only the conditions anyone sees. */
    effects?: SeenEffect[];
    /** A condition keeps them from acting (D-314). */
    inactive?: true;
    /** At 0, as Combat tells it: the party at the dying point, a foe down. */
    down?: true;
    dead?: true;
}

/** Where the player character is, as it knows it (VIEW-6): the places that hold it, the outermost first; what holds there; its text; who is there. */
export interface ShownPlace
{
    name: string;
    image?: { file: string; version: number; };
    within: string[];
    /** What holds there: the environment's entries, then the places' effects with their end; each with its place. */
    around: ({ name: string; value: string; place?: string; } | { effect: string; end?: EffectEnd; place?: string; })[];
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
    /** The icon on the token of one of the party, as their class (D-414). */
    icon?: string;
    /** In a fight, marked by the master as attacking the party (D-415): its token glows red. */
    hostile?: true;
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
    /** What who acts has used of the turn, by the game's names (TRN-4): action, bonus action, reaction. */
    marks?: { use: string; used: boolean; }[];
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
    /** The icon on their token, as their class (D-414). */
    icon?: string;
    /** Where they are: the places that hold them that the character knows, the nearest first; elsewhere, or in the open (D-254, TRV-13). */
    place?: string[] | "elsewhere" | "open";
    counters: SheetValue[];
    effects: SeenEffect[];
    /** Their mood, none when neutral or dead (MOOD-6). */
    mood?: Mood;
    /** At the system's dying point, the counters shown large in their band (D-310 (7)). */
    dying?: DyingCounter[];
    /** What they are: Level 3 Cleric (D-409). */
    headline?: string;
}

/** An effect on someone, with its end when it has one, and as the chat writes it. */
export interface SeenEffect
{
    name: string;
    end?: EffectEnd;
    text: string;
    /** One of the system's conditions (D-419). */
    condition?: true;
    /** The condition's drawing, the d of an SVG path on a grid of 24, when the system gives one (D-419). */
    icon?: string;
}

/** When an effect ends (EFF-2): at a game date; at the start of someone's turn in a round; when the scene ends; at an occasion of the game system, as long rest. */
export type EffectEnd = { date: string; } | { round: number; turn: string; } | { scene: true; } | { occasion: string; };

/** A part of a notation, for the page to say in words (D-292): dice with what they do past rolling, or a number added, as +5. */
export type NotationPart = {
    dice: string;
    keep?: { which: "highest" | "lowest"; count: number; };
    drop?: { which: "highest" | "lowest"; count: number; };
    rerollOnce?: DiceCondition;
    explode?: { condition: DiceCondition; compound: boolean; };
    success?: DiceCondition;
} | { add: string; };

/** Which faces a rule of the dice takes: those equal to a value, or below or above it. */
export interface DiceCondition
{
    operator: "=" | "<" | "<=" | ">" | ">=";
    value: number;
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
    /** For whom, as the player's character knows them; creature or someone for one it does not know. */
    who?: string;
    /** What the roll is: the check the master asked of the player, a roll of the dashboard's dice, or what the master names a roll of theirs. */
    check?: string;
    /** The picture of whom it is for, as the player's character knows them. */
    image?: { file: string; version: number; };
    /** Whom it is for is someone the character does not know by name. */
    stranger?: true;
    /** The notation in parts, when it says more than its dice, for the page to say in words. */
    words?: NotationPart[];
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
    /** By button, its dice in parts when they say more than their dice, as 2d20 keeping the highest, +5, for the page to say in words. */
    words?: (NotationPart[] | null)[];
    /** By button, the name the game gives its roll, in the campaign's language, as "with advantage" (D-399). */
    names?: (string | null)[];
    /** Whether it asks where the player's character moves on the map of its place, its one button the change of mind (ASK-11). */
    square?: true;
    /** Whose sheet the checks read, and by button the field of the sheet it rolls, whose row answers it too (ASK-12). */
    who?: string;
    fields?: (string | null)[];
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
    /** Where it is from the party: the km and the point of the compass, none closer than 50 m. */
    from?: { km: number; direction?: string; };
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
    unit: { name: "km" | "mi"; km: number; foot?: number; };
    maps: KnownMap[];
    places: MapPlace[];
    roads: MapRoad[];
    party?: MapPoint & { place?: string; };
    trail: MapPoint[];
}

/** What view gives: the party, a page with its sheet, one section, the world map, or nothing. */
export type View =
    | { kind: "none"; language?: string; }
    | {
        kind: "overview";
        campaign: string;
        /** The campaign's language, in which the page writes its own words. */
        language?: string;
        /** The game system's words in that language, when it has them (D-403). */
        words?: SystemWords;
        /** The game system: its name, what it is, and what its source asks to say. */
        system?: { name: string; title: string; attribution?: string; };
        now?: string;
        /** The day of the calendar it is now, when the campaign has one (TIM-8). */
        calendar?: CalendarDay;
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
        /** How many problems the campaign's files have, which the master fixes. */
        problems?: number;
    }
    | { kind: "page"; title: string; headline?: string; sheet: SheetGroup[]; cards?: SheetCards; text: string; story?: string; }
    | { kind: "section"; title: string; lines: string[]; text: string; }
    | ({ kind: "map"; } & WorldMap)
    | { kind: "settings"; settings: PlayerSetting[]; }
    | { kind: "saves"; mode: string; rule: string; saves: ShownSave[]; make: boolean; reset: ResetPoint[]; wentBack?: string; }
    | { kind: "journal"; now?: string; quests: ShownQuest[]; chapters: ShownChapter[]; }
    | { kind: "setup"; mode: string; name: string; folderName: boolean; missing: string[]; questions: PlayerSetting[]; left?: string[]; }
    | { kind: "unknown"; text: string; };

/**
 * A save as the Saves section shows it (D-359): the words that name it and the game date, when it was made in real time, the place the party was in with its
 * kind and picture, the point of a reset it is, and whether the player may go back to it (D-361).
 */
export interface ShownSave
{
    number: number;
    label: string;
    name?: string;
    date?: string;
    at?: string;
    place?: string;
    kind?: string;
    picture?: { file: string; version: number; };
    point?: ResetPoint;
    load: boolean;
}

/** A quest as the journal shows it (D-367): its goals, its counters, its clock and its deadline, with the minutes still to come. */
export interface ShownQuest
{
    name: string;
    status: "open" | "done" | "failed";
    main: boolean;
    giver?: string;
    place?: string;
    text: string;
    goals: { text: string; done: boolean; }[];
    counters: { field: string; value: number; max: number; }[];
    clock?: { value: number; max: number; name?: string; };
    deadline?: { date: string; minutes?: number; };
    /** Its picture (D-388), and its place's picture and kind, for its card when it has none (D-389). */
    picture?: { file: string; version: number; };
    placePicture?: { file: string; version: number; };
    placeKind?: string;
}

/** A scene as a chapter of the story (D-367); without a title, what happened between scenes; its number, and its place's kind and picture (D-384). */
export interface ShownChapter
{
    title?: string;
    number?: number;
    type?: string;
    place?: string;
    kind?: string;
    picture?: { file: string; version: number; };
    date?: string;
    summary?: string;
    open: boolean;
    facts: JournalFact[];
}

/** A fact of the story (VIEW-9), with its game date: who and where as the character knows them, someone, creature and somewhere for those it does not. */
export type JournalFact =
    & { date?: string; }
    & (
        | { kind: "counter"; who: string; field: string; before: string; after: string; stack?: boolean; }
        | { kind: "time"; from?: string; to: string; }
        | { kind: "moved"; who: string[]; to?: string; }
        | { kind: "learned"; who: string; what: string[]; }
        | ({ kind: "effect"; who: string; } & SeenEffect)
        | { kind: "effect-ended"; who: string; effect: string; }
        | { kind: "back"; save: string; }
        | { kind: "quest"; status: "open" | "done" | "failed"; quest: string; }
    );

/** Where the campaign starts over from (D-361): the start of play, with the same character, or before session zero, to make one again. */
export type ResetPoint = "start" | "session zero";

/** A setting of the player's, as the Settings section shows it (D-341): what it is, its value or a list's items, and its values with what each means. */
export interface PlayerSetting
{
    name: string;
    about: string;
    value?: string;
    items?: string[];
    /** Its values, each with what it means to the player, and in the setup the words that answer its question, as a little for hints (D-370). */
    choices?: { value: string; means?: string; label?: string; }[];
    /** In the setup, the value the game suggests, never chosen for the player (D-370). */
    suggested?: string;
    /** In the setup, the question its card asks in place of its name, as how well the player knows the game (D-347). */
    question?: string;
    /** What the player should know of it on this computer, as whether pictures can be made here; fix when it says how to have what is missing. */
    note?: { text: string; fix?: true; };
    /** A setting of the player's own words, as the author the master writes like: the longest its text may be (D-395). */
    most?: number;
}

/** A day of the game's calendar: the day of its month, the month, its season and its year, when the calendar has them (TIM-8). */
export interface CalendarDay
{
    day: number;
    month: string;
    season?: string;
    year?: number;
}

/** A game system's words in the campaign's language (D-403): its groups by their names, its fields' labels by their ids, other words and texts by their English. */
export interface SystemWords
{
    groups: Record<string, string>;
    fields: Record<string, string>;
    words: Record<string, string>;
    /** A field's name in full where its label is short, as a roll says it: Charisma for CHA, Charisma saving throw for CHA save. */
    names?: Record<string, string>;
    headline?: string;
}
