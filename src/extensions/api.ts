// What an extension's code gets from rpg-engine and gives back (D-428, D-436): the only way it reaches the game. Extensions import these types from
// rpg-engine; the code receives the rest when it loads.
import type { z } from "zod";

/** What an extension's code gets when it loads: zod, to describe its commands' input with the same library the engine checks them with. */
export interface ExtensionKit
{
    z: typeof z;
}

/** The default export of an extension's code: given the kit, its commands and what it does when time passes. */
export type ExtensionEntry = (kit: ExtensionKit) => ExtensionCode;

/** What an extension's code gives rpg-engine. */
export interface ExtensionCode
{
    /** Its commands, which the command line and the MCP server give the master beside the core's (D-63). */
    commands?: ExtensionCommand<any>[];
    /** After advance or travel moved the game date: lines for their output, such as the weather of a new morning (D-436). */
    timePassed?(passage: TimePassage, game: Game): string[] | Promise<string[]>;
    /**
     * What each widget its extension.yaml declares shows now, by the widget's name there (D-502): called as the dashboard reads the game, it only reads; nothing
     * shows for undefined. Read as the card of a question, it is given the card's key, the attempt to show (D-507).
     */
    widgets?: Record<string, (game: GameView, card?: { key: string; }) => Widget | undefined | Promise<Widget | undefined>>;
}

/** A command of an extension: its name is the extension's, or starts with it and a hyphen, as weather or weather-set (D-63). */
export interface ExtensionCommand<Input extends z.ZodObject = z.ZodObject>
{
    name: string;
    /** Written for an AI: what it does (the first sentence), when to use it, an example. */
    description: string;
    input: Input;
    /** It changes nothing: hosts may run it without asking. */
    readOnly?: boolean;
    /** Fields the command line takes as positional arguments, in order: weather-set 2. */
    positionals?: string[];
    /**
     * It may ask the player with game.ask (D-505): through MCP the host is told it waits for the player, so that it does not give up. Unlike the core's ask it
     * stays on the command line and where nothing shows buttons, where ask gives the question in words.
     */
    needsPlayer?: boolean;
    /** The text the master reads; an error thrown says what went wrong and how to fix it. */
    run(input: z.infer<Input>, game: Game): string | Promise<string>;
}

/** A moment of the story: its game date as written, day 3, 06:00; the day and the minute of the day; the day of the calendar, when the story starts on one. */
export interface GameMoment
{
    date: string;
    day: number;
    minute?: number;
    calendar?: CalendarDay;
}

/** A day of the world's calendar (TIM-8). */
export interface CalendarDay
{
    day: number;
    month: string;
    season?: string;
    year?: number;
}

/** The time an advance or a travel let pass. */
export interface TimePassage
{
    from: GameMoment;
    to: GameMoment;
}

/** The campaign as a widget reads it (D-502): what the code's commands reach, without the dice, the log, asking or writing. */
export interface GameView
{
    /** Now, in the game; undefined before the game has a date. */
    now(): GameMoment | undefined;
    /** The day of the calendar a game day falls on; undefined when the story counts only the days. */
    calendarDay(day: number): CalendarDay | undefined;
    /** The units of measure the campaign tells the story in. */
    units(): "metric" | "imperial";
    /**
     * Where the party is: the first living player character's places, in the order of the pages, the nearest first, and what holds there by the places'
     * environment, such as biome: desert; and its living members, in the order of the pages (D-505).
     */
    party(): { places: string[]; environment: Record<string, string>; members: { name: string; pc: boolean; }[]; } | undefined;
    /** A page by its name or alias (D-505); undefined when no page, or more than one, has it. */
    page(name: string): GamePage | undefined;
    /** The open scene: its title, when it opened, and in a fight its round and whose turn it is (D-505); undefined when none is open. */
    scene(): { title: string; opened?: string; round?: number; turn?: string; } | undefined;
    /** The extension's own state, kept in the campaign. */
    state: { read(): unknown; };
}

/** A page as an extension's code reads it (D-505), with what its effects give and what the game system works out, as show gives it. */
export interface GamePage
{
    name: string;
    /** The player's character. */
    pc: boolean;
    /** The player's character or a companion. */
    party: boolean;
    /** A field: a number, text, or a list as text; a counter as written, such as 3/5; undefined when the page has none. */
    value(field: string): number | string | string[] | undefined;
    /** A counter, with its maximum when it has one. */
    counter(field: string): { value: number; max?: number; } | undefined;
    /** Whether an effect is on it, such as a condition. */
    has(effect: string): boolean;
    /** A formula of the game system worked out on it, as has(skills, stealth) * proficiency; undefined when it has no value. It throws when it does not read. */
    formula(text: string): number | undefined;
}

/** The campaign as an extension's code reaches it: only through these; it writes only its own state and the fields it adds to the system (D-428, D-436, D-505). */
export interface Game extends GameView
{
    /**
     * Rolls with the engine's dice, as 1d6 or 4d6kh3: the total, each die's face, and the roll as one line. With by, a roll in the log for who (D-505): in view
     * for the party, behind the screen for anyone else as the master-rolls setting says (D-287); with values, the faces of the player's physical dice, in view.
     */
    roll(notation: string, by?: RollFor): Rolled;
    /**
     * Sets fields on a page, numbers or text, only those the extension's extension.yaml adds as fields or counters (D-505): a counter keeps its maximum. Each
     * field has its line in the log, which the player sees when the engine shows them that page. It throws for another field, or a name no page alone has.
     */
    set(page: string, values: Record<string, number | string>, why: string): void;
    /**
     * Asks the player for a roll of their character, with the buttons of ask (D-505): the roll, logged as theirs; declined, when they change their mind; said, their
     * own words in place of a button; in words, the question to ask them in the chat where no buttons show: with physical dice they tell the faces,
     * else once they go ahead the code rolls them with roll and who, as the core's ask leaves to the master's roll.
     */
    ask(asked: AskedRoll): Promise<Asked>;
    state: { read(): unknown; write(value: unknown): void; };
    /** A line in the campaign's log: public when the player may see it, hidden when only the master may. */
    log(text: string, visibility?: "public" | "hidden"): void;
}

/** Whom a roll is for (D-505): who rolls, why, as the master reads it, what the player sees it as, and the faces of physical dice. */
export interface RollFor
{
    who: string;
    why: string;
    check?: string;
    values?: number[];
    /** What the faces mean, which the player sees in place of the total when a sum means nothing, as "4 pins, no 1": in the extension's words, translated. */
    says?: (faces: number[]) => WidgetText;
    /** How each die turned out, by its face in order, for the page to colour it: a 1 that resets a lock is bad (D-507). */
    tones?: (faces: number[]) => (DieTone | undefined)[];
}

/** How a die, or a part of a card, turned out for the one who rolls: good or bad, as the page colours it. */
export type DieTone = "good" | "bad";

/** The words of a button: its name, or its name with a note under it, as "Reroll" and "3 left"; the extension's words, translated. */
export type ButtonWords = WidgetText | { label: WidgetText; note: WidgetText; };

/**
 * A roll asked of the player (D-505): the question, the master's words or the extension's own, translated by its words; the check's name and its dice; the
 * words of the button that turns it down, in place of the core's change of mind, translated too; and what the faces mean, as for a roll with by.
 */
export interface AskedRoll
{
    who?: string;
    question: WidgetText;
    check: string;
    notation: string;
    /** The roll's button, in place of the core's "Roll: check (dice)". */
    roll?: ButtonWords;
    /** The button that turns it down, renamed; false for none, when the roll is forced, as a death save (D-507). */
    decline?: ButtonWords | false;
    /** The rule under the buttons, in a line, as "A 1 resets the lock". */
    rule?: WidgetText;
    /**
     * The card the dashboard asks it in (D-507): one of the extension's widgets, by its name in extension.yaml, and which attempt it is, the same for each
     * question of it, as a reroll after the roll. The page shows the widget as it is before the dice and as it is after; the code writes its state first.
     */
    card?: { widget: string; key: string; };
    says?: (faces: number[]) => WidgetText;
    tones?: (faces: number[]) => (DieTone | undefined)[];
}

/** A roll made: with by, the id of its line in the log and whether it was hidden behind the screen. */
export interface Rolled
{
    total: number;
    faces: number[];
    text: string;
    id?: string;
    hidden?: boolean;
}

/** What the player answered when asked for a roll (D-505). */
export type Asked =
    | { rolled: { id: string; total: number; faces: number[]; text: string; }; }
    | { declined: true; }
    | { said: string; }
    | { inWords: string; physical: boolean; };

/**
 * What a widget shows now (D-502), in the dashboard's own parts: in the top, its icon and its chip, what it says whole in the chip's tip; in a card, under the
 * widget's title, its note and its parts. The server checks it, and keeps it short.
 */
export interface Widget
{
    /** One of the icons of extension.yaml, in place of the widget's own. */
    icon?: string;
    /** The few words of a chip in the top, as 10–15 °C. */
    chip?: WidgetText;
    /** What it says whole, in a sentence: the chip's tip, and its name for a screen reader. */
    says?: WidgetText;
    /** A note at the end of a card's head. */
    note?: WidgetText;
    parts?: WidgetPart[];
}

/**
 * Words of the extension, written in its language: translated whole by its words/<code>.yaml, as "Light fog this morning"; or a phrase whose {names} are values
 * the page writes in its own language, as {text: "From {low} to {high}", values: {low: 10, high: 15}}.
 */
export type WidgetText = string | { text: string; values: Record<string, WidgetValue>; };

/** A value the page writes: a number; a word, translated; a number with its unit, as 12 km; a range, as 10–15 °C. */
export type WidgetValue = number | string | { number: number; unit?: string; } | { from: number; to: number; unit?: string; };

/**
 * A count, as pips, a bar, or steps of a progress (D-507): its value lit; after them, those held but not yet sure, those marked, as a die that failed, and
 * those the roll asked may light; in an ask's card, where it stands, and whether it is good or bad to have.
 */
export interface Track
{
    label: WidgetText;
    value: number;
    max: number;
    look?: "pips" | "bar" | "steps";
    held?: number;
    marked?: number;
    coming?: number;
    stage?: "start" | "center" | "end";
    tone?: DieTone;
}

/**
 * A part of a widget's card: one thing large, with its icon and its value; text; facts, as chips; values, each in a box under its label; a count as pips or a
 * bar; rows of a label, a value and a note; a table; a picture of the extension's images/.
 */
export type WidgetPart =
    | { lead: WidgetText; icon?: string; value?: WidgetValue; tone?: DieTone; }
    | { text: WidgetText; }
    | { facts: WidgetText[]; }
    | { values: { label: WidgetText; value: WidgetValue; }[]; }
    | { track: Track; }
    | { rows: { label: WidgetText; value?: WidgetValue; note?: WidgetText; }[]; }
    | { table: { head: WidgetText[]; rows: WidgetValue[][]; }; }
    | { image: string; alt: WidgetText; };
