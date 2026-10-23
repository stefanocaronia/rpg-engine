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

/** The campaign as an extension's code reaches it: only through these, and only its own state is written (D-428, D-436). */
export interface Game
{
    /** Rolls with the engine's dice, as 1d6 or 4d6kh3: the total, each die's face, and the roll as one line. */
    roll(notation: string): { total: number; faces: number[]; text: string; };
    /** Now, in the game; undefined before the game has a date. */
    now(): GameMoment | undefined;
    /** The day of the calendar a game day falls on; undefined when the story counts only the days. */
    calendarDay(day: number): CalendarDay | undefined;
    /** The units of measure the campaign tells the story in. */
    units(): "metric" | "imperial";
    /** Where the party is: the first living player character's places, in the order of the pages, the nearest first, and what holds there by the places' environment, such as biome: desert. */
    party(): { places: string[]; environment: Record<string, string>; } | undefined;
    /** The extension's own state, kept in the campaign. */
    state: { read(): unknown; write(value: unknown): void; };
    /** A line in the campaign's log: public when the player may see it, hidden when only the master may. */
    log(text: string, visibility?: "public" | "hidden"): void;
}
