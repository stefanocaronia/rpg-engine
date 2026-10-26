// The one contract of a package's code (D-428, D-436, D-448, D-514), an extension's or a game system's: what it gets from rpg-engine and gives back, the only
// way it reaches the game. Packages import these types from rpg-engine; the code receives the rest when it loads.
import type { z } from "zod";

/** What a package's code gets when it loads: zod, to describe its commands' input with the same library the engine checks them with. */
export interface PackageKit
{
    z: typeof z;
}

/** The default export of a package's code: given the kit, what it gives rpg-engine. */
export type PackageEntry = (kit: PackageKit) => PackageCode;

/**
 * What a package's code gives rpg-engine, each part optional, the same for every kind of package (D-511, D-514). The hooks after the engine's own writes,
 * counterChanged, turnStarted, rolled and effectAdded, are called for the campaign's game system first, then for its extensions in order, each giving lines for
 * the command's output; they are called at once, never waiting.
 */
export interface PackageCode
{
    /** Its commands, which the command line and the MCP server give the master beside the core's (D-63). */
    commands?: PackageCommand<any>[];
    /** After advance or travel moved the game date: lines for their output, such as the weather of a new morning (D-436). */
    timePassed?(passage: TimePassage, game: Game): string[] | Promise<string[]>;
    /**
     * What each widget its extension.yaml or system.yaml declares shows now, by the widget's name there (D-502): called as the dashboard reads the game, it only
     * reads; nothing shows for undefined. Read as the card of a question, it is given the card's key, the attempt to show (D-507), and whose roll it is; for a card or a page of
     * its page code that names it, the character the card shows, as who (D-514); in place person, each of the party in turn, as who.
     */
    widgets?: Record<string, (game: GameView, asked?: { key?: string; who?: string; }) => Widget | undefined | Promise<Widget | undefined>>;
    /** After change, or a rest's dice, wrote a counter of a page. Writes made through the game call no hook. */
    counterChanged?(change: CounterChange, game: Game): string[];
    /** As someone's turn starts in a scene. */
    turnStarted?(turn: { who: string; }, game: Game): string[];
    /** After a roll for someone was logged, never a hidden one. */
    rolled?(roll: Rolled & { who: string; }, game: Game): string[];
    /** After an effect was added to a page, never to a copy. */
    effectAdded?(added: { page: string; effect: string; }, game: Game): string[];
    /**
     * Before the core's ask shows its buttons: how the dashboard asks this roll (D-507), as game.ask words it, such as in the card of one of its widgets and with
     * no button to turn it down; undefined to ask as always. The first package that gives one words the roll. It only reads.
     */
    asking?(question: AskingQuestion, game: GameView): Asking | undefined;
}

/**
 * What the core's ask asks, as asking gets it: whose roll, the checks' names and their dice, in order; for the dice of a rest, the recipe, the checks being the
 * counters of dice and the notations a die of each, as 1d8.
 */
export interface AskingQuestion
{
    who: string;
    checks: string[];
    notations: string[];
    recipe?: string;
}

/** A command of a package: its name is the package's, or starts with it and a hyphen, as weather or weather-set (D-63). */
export interface PackageCommand<Input extends z.ZodObject = z.ZodObject>
{
    name: string;
    /** Written for an AI: what it does (the first sentence), when to use it, an example. */
    description: string;
    input: Input;
    /** It changes nothing: hosts may run it without asking. */
    readOnly?: boolean;
    /** Fields the command line takes as positional arguments, in order: weather-set 2. */
    positionals?: string[];
    /** The player may run it too, from the package's code in the dashboard's page, with run (D-510); the master hears it at their next call. */
    player?: boolean;
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

/** A counter a command changed on a page: before and after, its maximum, and what damage took of it past what shields it. */
export interface CounterChange
{
    page: string;
    field: string;
    before: number;
    after: number;
    max?: number;
    lost: number;
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
    /** A setting of the campaign, as mentor; undefined when it has none. */
    setting(name: string): string | undefined;
    /** Whether two names are the same, as the engine compares them: case and accents aside. */
    sameName(one: string, other: string): boolean;
    /** The package's own state, kept in the campaign. */
    state: { read(): unknown; };
}

/** A page as a package's code reads it (D-505), with what its effects give and what the game system works out, as show gives it. */
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

/**
 * The campaign as a package's code reaches it: only through these (D-428, D-436, D-505, D-511): the fields and the effects of any page, its own state and the
 * log. Each write has its line in the log, public or hidden as the engine shows that page.
 */
export interface Game extends GameView
{
    /**
     * Rolls with the engine's dice, as 1d6 or 4d6kh3: the total, each die's face and each die as thrown, and the roll as one line. With by, a roll in the log for
     * who (D-505): in view for the party, behind the screen for anyone else as the master-rolls setting says (D-287); with values, the faces of the player's
     * physical dice, in view.
     */
    roll(notation: string, by?: RollFor): Rolled;
    /**
     * Sets fields on a page, any field, numbers or text, as write --set does, with its checks: a number on a counter keeps its maximum. It throws what write
     * refuses, and for a name no page alone has, by name or alias. A counter the rules watch, such as hit points, is changed with change.
     */
    set(page: string, values: Record<string, number | string>, why: string): void;
    /**
     * Changes a counter or money on a page as the change command does, the way to change one the rules watch, such as hit points: by an amount, to a value, or
     * spent, within its limits; its text, with the hooks' lines. Called from a command it calls the hooks of the campaign's packages after the change; from
     * inside a hook, none, so that no change sets off another.
     */
    change(page: string, field: string, amount: { by?: number | string; to?: number | string; spend?: number | string; }, why: string): string;
    /** Adds an effect without end; the engine's notes on what it breaks of what one keeps, or undefined when the page has it already. */
    addEffect(page: string, name: string, why: string): string[] | undefined;
    /** Ends an effect; whether the page had it. */
    endEffect(page: string, name: string, why: string): boolean;
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
    /** What the faces mean, which the player sees in place of the total when a sum means nothing, as "4 pins, no 1": in the package's words, translated. */
    says?: (faces: number[]) => WidgetText;
    /** How each die turned out, by its face in order, for the page to colour it: a 1 that resets a lock is bad (D-507). */
    tones?: (faces: number[]) => (DieTone | undefined)[];
}

/** The colour of the moment of a card of a question (D-517), by the dashboard's token: danger, an ally's green, gold, muted. */
export type CardTint = "low" | "ally" | "gold" | "muted";

/** How a die, or a part of a card, turned out for the one who rolls: good or bad, as the page colours it. */
export type DieTone = "good" | "bad";

/** The words of a button: its name, or its name with a note under it, as "Reroll" and "3 left"; the package's words, translated. */
export type ButtonWords = WidgetText | { label: WidgetText; note: WidgetText; };

/**
 * A roll asked of the player (D-505): the question, the master's words or the package's own, translated by its words; the check's name and its dice; and how
 * the dashboard asks it.
 */
export interface AskedRoll extends Asking
{
    who?: string;
    question: WidgetText;
    check: string;
    notation: string;
}

/**
 * How the dashboard asks a roll, in a package's words (D-507): the roll's button; the button that turns it down, renamed, in place of the core's change of mind,
 * or none when the roll is forced; the rule under the buttons; the card of one of its widgets; and what the faces mean, as for a roll with by.
 */
export interface Asking
{
    /** The roll's button, in place of the core's "Roll: check (dice)". */
    roll?: ButtonWords;
    /** The button that turns it down, renamed; false for none, when the roll is forced, as a death save (D-507). */
    decline?: ButtonWords | false;
    /** The rule under the buttons, in a line, as "A 1 resets the lock". */
    rule?: WidgetText;
    /**
     * The card the dashboard asks it in (D-507): one of the package's widgets, by its name in extension.yaml or system.yaml, and which attempt it is, the same for
     * each question of it, as a reroll after the roll. The page shows the widget as it is before the dice and as it is after; the code writes its state first.
     */
    card?: { widget: string; key: string; };
    says?: (faces: number[]) => WidgetText;
    tones?: (faces: number[]) => (DieTone | undefined)[];
}

/** A roll made: its dice as written, each die as thrown, as the lower of two kept highest dropped; with by, the id of its line in the log and whether it was hidden. */
export interface Rolled
{
    notation: string;
    total: number;
    faces: number[];
    dice: { sides: number | "F"; value: number; dropped?: boolean; }[];
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
    /** What only its page code draws (D-510), as the pins of a lock: JSON, kept short, which goes only to the page, never to the master. */
    data?: unknown;
    /** The figure of its page code that draws the whole inside of its card of a roll, the dashboard keeping the question and the field for words (D-510). */
    body?: string;
    /** One of the package's icons, in place of the widget's own; in place person, the mark of their state on their token. */
    icon?: string;
    /** The few words of a chip in the top, as 10–15 °C; in place person, the word of their state, as Dying, tinted by its lead's tone. */
    chip?: WidgetText;
    /** In place person, dead by the package's rules though not yet marked so (D-516): drawn as the dead are, greyed, with the skull. */
    dead?: boolean;
    /**
     * In the card of a question, the colour of its moment, as the 5e's death save in the red of danger (D-517): one of the dashboard's tokens, low for danger,
     * ally, gold or muted; the card then has a frame of that tint, without the robot. None, as the lock's card: the question's own frame (D-509).
     */
    tint?: CardTint;
    /** What it says whole, in a sentence: the chip's tip, and its name for a screen reader. */
    says?: WidgetText;
    /** A note at the end of a card's head. */
    note?: WidgetText;
    parts?: WidgetPart[];
}

/**
 * Words of the package, written in its language: translated whole by its words/<code>.yaml, as "Light fog this morning"; or a phrase whose {names} are values
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
    /** The figure of the package's page code that draws it, in place of the dashboard's pips (D-510); its label and value still say it in words. */
    figure?: string;
    /** The counter of the sheet it counts, which leaves the line of values under the name while a widget in place person shows it (D-514). */
    field?: string;
}

/**
 * A part of a widget's card: one thing large, with its icon and its value; text; facts, as chips; values, each in a box under its label; a count as pips or a
 * bar; rows of a label, a value and a note; a table; a picture of the package's images/.
 */
export type WidgetPart =
    | { lead: WidgetText; icon?: string; value?: WidgetValue; tone?: DieTone; figure?: string; }
    | { who: string; does?: WidgetText; }
    | { text: WidgetText; }
    | { facts: WidgetText[]; }
    | { values: { label: WidgetText; value: WidgetValue; }[]; }
    | { track: Track; }
    | { rows: { label: WidgetText; value?: WidgetValue; note?: WidgetText; }[]; }
    | { table: { head: WidgetText[]; rows: WidgetValue[][]; }; }
    | { image: string; alt: WidgetText; };
