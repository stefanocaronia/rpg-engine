// A package's page code (D-510, D-511): its module, loaded once by its address, draws inside the places the page keeps for it, each a shadow root that
// takes the page's style sheet, with the page's own Preact: a count or a lead of its widget, the whole inside of its card of a roll, its cards in the pages
// and its own pages. Each drawing is given the page's language, direction, theme and motion, its package's words, and the people the page knows, for their
// portraits. When it breaks, its place says the error and whose it is, for whoever fixes it. The shapes are rpg-engine/page's, which src/page.ts declares.
import { Component, type ComponentChildren, type ComponentType, createContext, render, type VNode } from "preact";
import { useContext, useEffect, useLayoutEffect, useRef, useState } from "preact/hooks";
import { readWidgetData, runCommand } from "../api.ts";
import type { FigureSize, PackageCode, RestDice, ShownModule, Tone, WidgetText, WidgetTrack, WidgetValue } from "../data.ts";
import { fieldLabel } from "../labels.ts";
import { isolated, numberText, pageDirection, pageLocale } from "../text.ts";
import { shownTheme } from "../theme.ts";
import { PeopleContext } from "./people.ts";

/** Where a figure is drawn: a chip in the top, a card beside the rolls, a card in a page, a roll's card, or the panel on someone of the party (D-516). */
export type FigurePlace = "top" | "side" | "page" | "ask" | "person";

/** The part a figure draws in place of the page's own. */
export type FigurePart = { track: WidgetTrack; } | { lead: WidgetText; icon?: string; value?: WidgetValue; tone?: Tone; };

/** What every drawing of a package gets: its words and numbers in the page's language, its direction, theme and motion, and its commands for the player. */
export interface PageProps
{
    words(text: string, values?: Record<string, string | number>): string;
    number(value: number): string;
    language: string;
    dir: "ltr" | "rtl";
    theme: "light" | "dark";
    reducedMotion: boolean;
    run(command: string, input?: Record<string, unknown>): Promise<string>;
    /** A field of the game system's sheet as the page names it, as PF for hp in Italian. */
    field(name: string): string;
}

/** What the component of a figure gets (D-510). */
export interface FigureProps extends PageProps
{
    name: string;
    data: unknown;
    before?: unknown;
    part?: FigurePart;
    place: FigurePlace;
    size: FigureSize;
}

/** The pages of the dashboard a package's card stands in (D-511), after their own cards: as src/page.ts declares them to the packages. */
export const cardPages = ["scene", "sheet", "world", "journal"] as const;

export type CardPage = (typeof cardPages)[number];

/** A card a package puts in a page of the dashboard (D-511): its title and icon in the page's frame, its order among the packages' cards, its inside its own. */
export interface PageCard
{
    page: CardPage;
    title: string;
    icon?: string;
    order?: number;
    /** One of its package's widgets, whose hook gives the card its data, for the character it shows (D-514). */
    widget?: string;
    draw: ComponentType<PageCardProps>;
}

/** What a package's card in a page gets: its name and page; on the sheet whose sheet it is, and what the page shows there, as the page's view gives it. */
export interface PageCardProps extends PageProps
{
    name: string;
    page: CardPage;
    who?: string;
    view?: unknown;
    data?: unknown;
}

/** A page of a package's own (D-511), at #/pkg/<package>/<name>: its title and icon in the page's head, its whole inside its own. */
export interface OwnPage
{
    title: string;
    icon?: string;
    /** Where the navigation has it (D-512): a tab beside the sections, or the packages' menu, which is where a page that says nothing goes. */
    nav?: "tab" | "menu";
    /** One of its package's widgets, whose hook gives the page its data (D-514). */
    widget?: string;
    draw: ComponentType<OwnPageProps>;
}

/** A package's own page as the navigation shows it (D-512): its package and name, its title and icon, a tab or in the packages' menu. */
export interface NavPage
{
    package: string;
    name: string;
    title: string;
    icon?: string;
    nav: "tab" | "menu";
}

/** The packages' own pages in the order of their modules, the system's first, each where it says, the menu when it says nothing (D-512); none of a module coming or broken. */
export function navPagesOf(loaded: { module: ShownModule; loaded: LoadedModule; }[]): NavPage[]
{
    return loaded.flatMap(({ module, loaded: one }) =>
        one === undefined || one instanceof Error
            ? []
            : Object.entries(one.pages ?? {}).map(([name, page]) => ({
                package: module.package,
                name,
                title: page.title,
                ...(page.icon === undefined ? {} : { icon: page.icon }),
                nav: page.nav === "tab" ? "tab" as const : "menu" as const,
            }))
    );
}

/** The packages' own pages once their modules came, drawn again as they come. */
export function useNavPages(shown: ShownModule[]): NavPage[]
{
    const [, setCome] = useState(0);
    const key = shown.map((module) => module.address).join(" ");

    useEffect(() => {
        let live = true;
        void Promise.all(shown.map((module) => moduleAt(module.address))).then(() => live && setCome((count) => count + 1));

        return () => {
            live = false;
        };
    }, [key]);

    return navPagesOf(shown.map((module) => ({ module, loaded: modules.get(module.address) })));
}

/** A package's page as the navigation and the address name it: package/name. */
export function ownKey(page: { package: string; name: string; }): string
{
    return `${page.package}/${page.name}`;
}

/** What a package's own page gets. */
export interface OwnPageProps extends PageProps
{
    name: string;
    data?: unknown;
}

/**
 * The data a widget of a package gives a card or a page of its page code that names it, for the character it shows (D-514): undefined until it comes, or when
 * the card names none or its hook gives nothing. Read again each time the page reads the game again (`reading`, the widgets as last read), the data drawn
 * kept until the new comes; for another widget or character, none until theirs comes.
 */
export function useWidgetData(owner: string, widget: string | undefined, who: string | undefined, reading: unknown): unknown
{
    const [data, setData] = useState<unknown>(undefined);

    useEffect(() => setData(undefined), [owner, widget, who]);

    useEffect(() => {
        let current = true;

        if (widget !== undefined) {
            void readWidgetData(owner, widget, who).then((shows) => current && setData(shows?.data), () => undefined);
        }

        return () => {
            current = false;
        };
    }, [owner, widget, who, reading]);

    return data;
}

/** What the component that draws the whole inside of a roll's card gets (D-510): a figure's, and the question's buttons, drawn with the page's own. */
export interface BodyProps extends FigureProps
{
    parts: unknown[];
    /** The dice of a rest the card asks, as they stand: its buttons are a die of each counter, in their order, then the one that ends it (ASK-14). */
    rest?: RestDice;
    /** The last roll made from it, once its dice landed. */
    rolled?: { total: number; faces: number[]; };
    buttons: CardButton[];
    /** The question a die asks over the buttons, as "A 1 came up: reroll?", when it is not the card's title. */
    prompt?: string;
    rule?: string;
    /** The button pressed, while its answer goes. */
    sent?: number;
    /** The call that asked in it is over: no buttons, its outcome. */
    ended: boolean;
    answer(button: number): void;
}

/** A button of a question: its name, the note after it, its dice when it rolls; danger when what it does loses something, as "it resets". */
export interface CardButton
{
    name: string;
    note?: string;
    dice?: string;
    danger?: boolean;
}

/** What an extension's page module gives as its default export: by their names in extension.yaml, its figures and its cards' insides. */
export interface PageModule
{
    figures?: Record<string, ComponentType<FigureProps>>;
    bodies?: Record<string, ComponentType<BodyProps>>;
    cards?: Record<string, PageCard>;
    pages?: Record<string, OwnPage>;
    /** Its own style sheet, which each of its drawings takes after the page's: its layout and motion, with the page's tokens. */
    style?: string;
    /**
     * A game system's alone (D-528 (6)): a style sheet over the whole page's, without a layer, so it wins over the page's rules whatever their selectors, while
     * the player keeps the game's style on; never over the focus ring and the tooltips. The page's classes may change: it is the system's to keep up.
     */
    pageStyle?: string;
}

/** The page modules of the campaign's packages whose code runs, its system's first (D-511), as last read. */
export const ModulesContext = createContext<ShownModule[]>([]);

/** A package's page module as a widget's or a card's owner knows it. */
export function codeOfModule(module: ShownModule): PackageCode
{
    return { extension: module.package, version: module.version, module: module.address, figures: module.figures, ...(module.words === undefined ? {} : { words: module.words }) };
}

/** A module as it stands: coming, come, or broken with why. */
export type LoadedModule = PageModule | Error | undefined;

/**
 * A package's cards in a page of the dashboard (D-511), in their order: none while its module comes; the error of a module that did not load, which the
 * page says in a card of the package's in each of its pages, as a figure or a body says it in its place (D-510 (5)).
 */
export function cardsIn(loaded: LoadedModule, page: CardPage): [string, PageCard][] | Error
{
    if (loaded instanceof Error) {
        return loaded;
    }

    return Object.entries(loaded?.cards ?? {}).filter(([, card]) => card.page === page).sort(([, first], [, second]) => (first.order ?? 0) - (second.order ?? 0));
}

/** A package's own page by its name (D-511): undefined while its module comes or when it has no such page; the error of a module that did not load. */
export function ownPageIn(loaded: LoadedModule, page: string): OwnPage | Error | undefined
{
    return loaded instanceof Error ? loaded : loaded?.pages?.[page];
}

/** Starts loading these page modules, so that a card of a roll finds its own there when it comes. */
export function preloadModules(owners: PackageCode[]): void
{
    for (const owner of owners) {
        if (owner.module !== undefined) {
            void moduleAt(owner.module);
        }
    }
}

/** A widget's page module as it stands, drawn again once it comes. */
export function usePageModule(owner: PackageCode | undefined): LoadedModule
{
    const address = owner?.module;
    const [, setCome] = useState(0);

    useEffect(() => {
        if (address === undefined || modules.has(address)) {
            return;
        }

        let live = true;
        void moduleAt(address).then(() => live && setCome((count) => count + 1));

        return () => {
            live = false;
        };
    }, [address]);

    return address === undefined ? undefined : modules.get(address);
}

/** What the page gives every drawing of this package, now: its language, direction, theme, motion, words, numbers, and its commands. */
export function pagePropsOf(owner: PackageCode): PageProps
{
    return {
        words: (text, values) => filled(owner.words?.[text] ?? text, values),
        number: numberText,
        language: pageLocale(),
        dir: pageDirection(),
        theme: shownTheme(),
        reducedMotion: matchMedia("(prefers-reduced-motion: reduce)").matches,
        run: runCommand,
        field: (name) => fieldLabel(name),
    };
}

/** The room of a figure its extension declares, or the room it is given when it declares none. */
export function figureSize(owner: PackageCode, name: string): FigureSize
{
    return owner.figures?.[name] ?? { width: 320, height: 120 };
}

/**
 * The place of an extension's drawing: an element of the page with a shadow root, the page's style sheet in it, where the drawing renders with the page's
 * Preact; the room of a figure kept while its module comes. A drawing that throws, or a module that does not load, leaves the error and whose it is.
 */
export function ExtensionRoot({ widget, loaded, kind, size, draw }: {
    widget: PackageCode;
    loaded: LoadedModule;
    kind: string;
    size?: FigureSize | undefined;
    /** The drawing, once its module came; what it throws is caught as its components' errors are. */
    draw(module: PageModule): VNode | null;
})
{
    const element = useRef<HTMLDivElement>(null);
    const people = useContext(PeopleContext);
    const [sheet, setSheet] = useState(pageSheet);
    const owner = `${widget.extension}${widget.version === undefined ? "" : ` ${widget.version}`}`;

    useEffect(() => {
        if (sheet === undefined) {
            void loadPageSheet().then(setSheet);
        }
    }, []);

    useLayoutEffect(() => {
        const box = element.current;

        if (box === null || sheet === undefined) {
            return;
        }

        const root = box.shadowRoot ?? box.attachShadow({ mode: "open" });
        const own = loaded === undefined || loaded instanceof Error ? undefined : moduleSheet(loaded);
        root.adoptedStyleSheets = own === undefined ? [sheet] : [sheet, own];
        const inside = loaded === undefined
            ? null
            : loaded instanceof Error
            ? <Broken owner={owner} error={loaded} />
            : (
                <Boundary owner={owner}>
                    <Drawing draw={draw} module={loaded} />
                </Boundary>
            );
        render(<PeopleContext.Provider value={people}>{inside}</PeopleContext.Provider>, root);
    });

    useEffect(() => () => {
        const root = element.current?.shadowRoot;

        if (root !== null && root !== undefined) {
            render(null, root);
        }
    }, []);

    const room = size === undefined ? undefined : { "--figure-width": `${size.width}px`, "--figure-ratio": String(size.width / size.height) };
    const classes = ["ext-root", kind, size?.mirror === true ? "mirrored" : ""].filter((name) => name !== "").join(" ");
    return <div ref={element} class={classes} style={room} />;
}

/** The first element of the selector in this element, its extensions' drawings included: the focus's next stop after a button pressed in one. */
export function deepQuery(element: Element, selector: string): HTMLElement | null
{
    const found = element.querySelector<HTMLElement>(selector);

    if (found !== null) {
        return found;
    }

    for (const host of element.querySelectorAll(".ext-root")) {
        const inside = host.shadowRoot?.querySelector<HTMLElement>(selector);

        if (inside !== null && inside !== undefined) {
            return inside;
        }
    }

    return null;
}

/** Words of an extension with their {names} filled, numbers as the page writes them, each set apart right to left. */
export function filled(text: string, values: Record<string, string | number> = {}): string
{
    return text.replace(/\{(\w+)\}/g, (whole, name: string) => {
        const value = values[name];
        return value === undefined ? whole : isolated(typeof value === "number" ? numberText(value) : value);
    });
}

// The modules by their address, once asked for; what came of each.
const loading = new Map<string, Promise<void>>();
const modules = new Map<string, PageModule | Error>();

function moduleAt(address: string): Promise<void>
{
    let promise = loading.get(address);

    if (promise === undefined) {
        promise = import(address).then(
            (loaded: { default?: PageModule; }) => {
                modules.set(address, loaded.default ?? new Error("its page module has no default export"));
            },
            (error: unknown) => {
                modules.set(address, error instanceof Error ? error : new Error(String(error)));
            },
        );
        loading.set(address, promise);
    }

    return promise;
}

/** The style sheet over the whole page that the campaign's system's page module gives, once it comes (D-528 (6)); undefined when it gives none or fails. */
export async function systemPageStyle(module: ShownModule | undefined): Promise<string | undefined>
{
    if (module?.kind !== "system") {
        return undefined;
    }

    await moduleAt(module.address);
    const loaded = modules.get(module.address);
    const style = loaded === undefined || loaded instanceof Error ? undefined : loaded.pageStyle;

    if (typeof style !== "string") {
        return undefined;
    }

    // A sheet of its own layers could name the page's, and take a guarantee away with an !important of its own there: read as the browser reads it, in any
    // spelling.
    if (declaresLayers(style)) {
        console.warn(`${module.package}: its pageStyle declares @layer, which a game system's page style may not; the page leaves it out.`);
        return undefined;
    }

    return style;
}

/** Whether a style sheet has a cascade layer anywhere, its nested rules too, as the browser parses it. */
function declaresLayers(style: string): boolean
{
    const sheet = new CSSStyleSheet();
    sheet.replaceSync(style);
    return hasLayer(sheet.cssRules);
}

function hasLayer(rules: CSSRuleList): boolean
{
    return Array.from(rules).some((rule) => rule instanceof CSSLayerBlockRule || rule instanceof CSSLayerStatementRule || ("cssRules" in rule && hasLayer(rule.cssRules as CSSRuleList)));
}

// The page's style sheet, read once and adopted by every drawing's shadow root: the page's parts look the same inside.
let pageSheet: CSSStyleSheet | undefined;
let sheetLoading: Promise<CSSStyleSheet> | undefined;

function loadPageSheet(): Promise<CSSStyleSheet>
{
    // One that did not come is asked again by the next drawing, never kept as failed.
    sheetLoading ??= fetch("/style.css").then(async (response) => {
        if (!response.ok) {
            throw new Error(`/style.css did not come (${response.status}).`);
        }

        const sheet = await new CSSStyleSheet().replace(await response.text());
        pageSheet = sheet;
        return sheet;
    }).catch((error: unknown) => {
        sheetLoading = undefined;
        throw error;
    });
    return sheetLoading;
}

// Each module's own style sheet, made once.
const moduleSheets = new WeakMap<PageModule, CSSStyleSheet>();

/** A module's own style sheet, when it gives one. */
function moduleSheet(module: PageModule): CSSStyleSheet | undefined
{
    if (module.style === undefined) {
        return undefined;
    }

    let sheet = moduleSheets.get(module);

    if (sheet === undefined) {
        sheet = new CSSStyleSheet();
        sheet.replaceSync(module.style);
        moduleSheets.set(module, sheet);
    }

    return sheet;
}

/** The drawing, called inside its boundary, which catches what it throws as well as what its components do. */
function Drawing({ draw, module }: { draw(module: PageModule): VNode | null; module: PageModule; })
{
    return draw(module);
}

/** A drawing that threw: the error in its place, and whose code it is, from then on (D-510 (5)). */
class Boundary extends Component<{ owner: string; children: ComponentChildren; }, { error?: Error; }>
{
    static getDerivedStateFromError(error: unknown): { error: Error; }
    {
        return { error: error instanceof Error ? error : new Error(String(error)) };
    }

    render()
    {
        return this.state.error === undefined ? this.props.children : <Broken owner={this.props.owner} error={this.state.error} />;
    }
}

/** What the place says of a drawing that broke, for whoever fixes it: in English, as an error of code. */
function Broken({ owner, error }: { owner: string; error: Error; })
{
    return (
        <p class="ext-broken" role="alert" lang="en" dir="ltr">
            <b>{owner}</b>
            {`: its page code broke. ${error.name}: ${error.message}`}
        </p>
    );
}
