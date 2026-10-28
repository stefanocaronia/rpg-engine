// The types of rpg-engine/page (D-510): what a package's page code gets from the dashboard to draw its figures inside the dashboard's own frame. In the
// page, rpg-engine/page is the dashboard's kit, its components and its style sheet, given with the dashboard's own Preact.
import type { ComponentChildren, ComponentType, JSX } from "preact";
import type { DieTone, Track, WidgetText, WidgetValue } from "./core/package-api.ts";

export type { DieTone, Track, WidgetText, WidgetValue } from "./core/package-api.ts";

/** The room a figure takes on a wide screen, as its extension.yaml or system.yaml declares it; on a phone it shrinks to the width there is, keeping its shape. */
export interface FigureSize
{
    width: number;
    height: number;
    mirror?: boolean;
}

/** Where a figure is drawn: a chip in the top, a card beside the rolls, a card in a page, a roll's card, or the panel on someone of the party (D-516). */
export type FigurePlace = "top" | "side" | "page" | "ask" | "person";

/** The part a figure draws in place of the dashboard's own, its words translated: what the dashboard says of it to a screen reader. */
export type FigurePart = { track: Track; } | { lead: WidgetText; icon?: string; value?: WidgetValue; tone?: DieTone; };

/** What every drawing of a package gets (D-510, D-511): its words and numbers in the dashboard's language, its direction, theme and motion, its commands. */
export interface PageProps
{
    /** The package's words in the dashboard's language, its {names} filled. */
    words(text: string, values?: Record<string, string | number>): string;
    /** A number as the dashboard's language writes it. */
    number(value: number): string;
    language: string;
    dir: "ltr" | "rtl";
    theme: "light" | "dark";
    reducedMotion: boolean;
    /** Runs a command of the package marked player, as the player: what it said (D-510); one marked readOnly tells the master nothing. */
    run(command: string, input?: Record<string, unknown>): Promise<string>;
    /** A field of the game system's sheet as the dashboard names it in its language, as PF for hp in Italian. */
    field(name: string): string;
}

/** What the component of a figure gets (D-510). */
export interface FigureProps extends PageProps
{
    /** Its name, as its extension.yaml or system.yaml declares it. */
    name: string;
    /** What the widget's hook gave for the page code: in a roll's card, as it is after the dice, given once they land. */
    data: unknown;
    /** The data it drew before, once what it draws changed: in a roll's card, before the dice; for the figure to move from it. */
    before?: unknown;
    /** The part it draws, when it stands for one. */
    part?: FigurePart;
    place: FigurePlace;
    size: FigureSize;
}

/** The pages of the dashboard a package's card or widget stands in, after their own cards (D-502, D-511): the Scene, the sheet, the World and the Journal. */
export const cardPages = ["scene", "sheet", "world", "journal"] as const;

export type CardPage = (typeof cardPages)[number];

/** A card a package puts in a page of the dashboard (D-511): its title and icon (a path on a grid of 24) in the dashboard's frame, its order, its inside. */
export interface PageCard
{
    page: CardPage;
    title: string;
    icon?: string;
    order?: number;
    /** One of its package's widgets, whose hook gives the card its data, for the character the card shows (D-514). */
    widget?: string;
    draw: ComponentType<PageCardProps>;
}

/** What a package's card in a page gets: its name and page; on the sheet whose sheet it is, in the Scene the player character in front; what the page shows there. */
export interface PageCardProps extends PageProps
{
    name: string;
    page: CardPage;
    who?: string;
    /** On the sheet the character shown, in the Scene their place, as the dashboard's view gives them. */
    view?: unknown;
    /** The data its widget's hook gives for who, once it came, when the card names a widget. */
    data?: unknown;
}

/** A page of a package's own (D-511), at #/pkg/<package>/<name>, linked from its row in Packages: its title and icon in the page's head, its whole inside. */
export interface OwnPage
{
    title: string;
    icon?: string;
    /**
     * Where the dashboard's navigation has it (D-512): a tab beside Party, Scene, Journal and World, for what is central to a game, as a system's spells;
     * the menu, the default, in the menu of the packages' icon at the top.
     */
    nav?: "tab" | "menu";
    /** One of its package's widgets, whose hook gives the page its data (D-514). */
    widget?: string;
    draw: ComponentType<OwnPageProps>;
}

/** What a package's own page gets. */
export interface OwnPageProps extends PageProps
{
    name: string;
    /** The data its widget's hook gives, once it came, when the page names a widget. */
    data?: unknown;
}

/**
 * What the component that draws the whole inside of a roll's card gets (D-510): a figure's props, and the question's buttons it draws with the dashboard's
 * components, the dashboard keeping the question and the field for the player's own words.
 */
export interface BodyProps extends FigureProps
{
    /** The widget's parts, its words translated. */
    parts: unknown[];
    /** The dice of a rest the card asks (ASK-14), as they stand: its buttons are then a die of each counter, in their order, and last the one that ends it. */
    rest?: RestDice;
    /** The last roll made from it, once its dice landed: its total and its faces. */
    rolled?: { total: number; faces: number[]; };
    /** The question's buttons, as the kit's Choices draws them. */
    buttons: CardButton[];
    /** The question a die asks over the buttons, as "A 1 came up: reroll?", when it is not the card's title. */
    prompt?: string;
    /** The rule under the buttons, in a line. */
    rule?: string;
    /** The button pressed, while its answer goes: the others wait. */
    sent?: number;
    /** The call that asked in it is over: no buttons, and its outcome. */
    ended: boolean;
    /** Answers the question with one of its buttons, by its place among them. */
    answer(button: number): void;
}

/**
 * The dice of a rest the player spends one at a time (ASK-14): whose they are; each counter of dice with its die and what a die adds; the counter they give to
 * as it was at the question and as it is; the dice rolled so far, each by the id of its roll.
 */
export interface RestDice
{
    who: string;
    dice: { field: string; sides: number; value: number; max: number; adds: number; }[];
    gives: { field: string; from: number; value: number; max?: number; };
    rolls: { id: string; field: string; face: number; adds: number; total: number; }[];
}

/** A button of a question: its name, the note after it, its dice when it rolls; danger when what it does loses something, as "it resets". */
export interface CardButton
{
    name: string;
    note?: string;
    dice?: string;
    danger?: boolean;
}

/**
 * The default export of a package's page module (D-510, D-511): by name, the components of its figures (declared in its extension.yaml or system.yaml) and of its cards'
 * insides, its cards in the dashboard's pages and its own pages.
 */
export interface PageModule
{
    figures?: Record<string, ComponentType<FigureProps>>;
    bodies?: Record<string, ComponentType<BodyProps>>;
    cards?: Record<string, PageCard>;
    pages?: Record<string, OwnPage>;
    /** Its own style sheet, which each of its drawings takes after the dashboard's: the layout and motion of its own parts, with the dashboard's tokens. */
    style?: string;
    /**
     * A game system's alone: a style sheet over the whole dashboard's, without a layer, which wins over its rules whatever their selectors while the player keeps
     * the game's style on; never over the focus ring and the tooltips. Its classes are not a contract: a change of the dashboard may break it.
     */
    pageStyle?: string;
}

// The dashboard's own parts, which /kit.js gives in the page (src/dashboard/kit.tsx): drawn as the dashboard draws its own, with its style sheet's classes.

/** A button of words: gold for the one main action, quiet for a secondary one, danger for one that loses something; disabled waits, keeping the focus. */
export declare function Button(props: { children: ComponentChildren; onClick(): void; kind?: "gold" | "quiet" | "danger"; disabled?: boolean; tip?: string; }): JSX.Element;
/** A button of an icon, a path on a grid of 24, named by its words, which its tooltip shows. */
export declare function IconButton(props: { path: string; label: string; onClick(): void; }): JSX.Element;
/** An icon, a path on a grid of 24, stroked in the accent. */
export declare function Icon(props: { path: string; }): JSX.Element;
/** The dice of a notation as the dashboard draws them, as a d20 for 1d20+5. */
export declare function Dice(props: { notation: string; }): JSX.Element;
/** Things of a list, as chips. */
export declare function Chips(props: { items: WidgetText[]; }): JSX.Element;
/** Someone's portrait as a coin: the party and those at the place by name, with their picture, else their initials. */
export declare function Portrait(props: { name: string; large?: boolean; }): JSX.Element;
/** Who acts, as "Ettore picks": their portrait, their name and what they do. */
export declare function Who(props: { who: string; does?: WidgetText; }): JSX.Element;
/** A count as pips, a bar or steps, with its label; in a card of a roll, its place there; a screen reader hears its name and value. */
export declare function Track(props: { track: Track; place?: "start" | "center" | "end"; }): JSX.Element;
/** Words of the package, their values written in the dashboard's language. */
export declare function Text(props: { text: WidgetText; }): JSX.Element;
/** A value written in the dashboard's language, set apart right to left. */
export declare function Value(props: { value: WidgetValue; }): JSX.Element;
/** The buttons of a question in a card of a roll: a roll in gold with its dice, a choice that loses something with a red edge; the one pressed marked. */
export declare function Choices(props: { buttons: CardButton[]; sent?: number; onChoose(button: number): void; }): JSX.Element;
