// What every package for rpg-engine declares alike, an extension in extension.yaml and a game system in system.yaml (D-502, D-510, D-514): the version of the
// API it is made for, and its icons, widgets and figures, with the same limits.
import { z } from "zod";
import { type CardPage, cardPages, type FigureSize } from "./package-api.ts";

// The pages a card stands in and the room of a figure, as rpg-engine/page declares them to the packages, for the modules that read a package.
export type { CardPage, FigureSize };

/**
 * The version of the API a package is made for, which its package.json names as rpg-engine.api: the contract its code is given and what its extension.yaml or
 * system.yaml may declare. It goes up with every addition a package may use, and the engine reads a range (D-515): 2 added the widgets, 3 an extension's
 * additions to the game system and asking the player, 4 the code in the dashboard's page, 5 one contract for every kind of package, 6 the fields of
 * knowledge of a game system (sheet-knowledge), 7 what a page carries and the pictures of the dashboard's states.
 */
export const packageApi = 7;

/**
 * Our game systems (D-513): the name a campaign gives each, which package install takes alone, its package, and what it is; the setup offers them even when
 * npm does not answer. A list of names, as our scope is, never a game's code; Ironsworn joins it once it is playable.
 */
export const ourSystems: readonly { name: string; package: string; title: string; }[] = [
    { name: "5e", package: "@rpgengine/system-5e", title: "compatible with fifth edition, from the SRD" },
];

/** The kinds of package whose API is read. */
type ApiKind = "extension" | "system";

// The oldest API each kind is read at: a system's first is 5, the one contract.
const oldestApi: Record<ApiKind, number> = { extension: 1, system: 5 };

/** Whether this rpg-engine reads a package of this kind made for this version of the API: from the kind's first up to its own. */
export function readsApi(api: number | undefined, kind: ApiKind): boolean
{
    return api !== undefined && Number.isInteger(api) && api >= oldestApi[kind] && api <= packageApi;
}

/** What a package made for a newer API asks of the player, said where it is refused. */
export const updateEngine = "rpg-engine must be updated first: ask the player to update it on the Packages page of their dashboard, or as they installed it, then open a new chat";

/** Why this rpg-engine does not read a package made for this API, with what to do; undefined when it reads it. */
export function apiProblem(api: number | undefined, kind: ApiKind): string | undefined
{
    if (readsApi(api, kind)) {
        return undefined;
    }

    const range = oldestApi[kind] === packageApi ? `${packageApi}` : `${oldestApi[kind]} to ${packageApi}`;
    const reads = `this rpg-engine reads the API ${range} for ${kind === "system" ? "a game system" : "an extension"}`;
    return api !== undefined && api > packageApi
        ? `it is made for the API ${api}, and ${reads}: ${updateEngine}`
        : `it is made for ${api === undefined ? "no API, as its package.json does not name one in rpg-engine.api" : `the API ${api}`}, and ${reads}: install a newer version of it`;
}

/**
 * The places of the dashboard a widget may stand in (D-502): a chip in the top, a card in the table's column beside the rolls, a card in a page; on each of
 * the party (D-514), under their name on their sheet, in their row of the turns and as the word of their state; or only in the card of a question its
 * package's code asks in (D-507), as the 5e's death save.
 */
export const widgetPlaces = ["top", "side", "page", "person", "card"] as const;

export type WidgetPlace = (typeof widgetPlaces)[number];

/** A widget as a package declares it (D-502): its name, which its code's hook has, its title, its icon, and where it stands, among the cards in order. */
export interface DeclaredWidget
{
    name: string;
    title: string;
    icon?: string;
    place: WidgetPlace;
    /** The page of a card that stands in one. */
    page?: CardPage;
    /** Its order among the cards of its place, the lowest first. */
    order: number;
}

// How many icons, widgets and figures a package may declare, and the longest path of an icon.
const mostIcons = 40;
const mostWidgets = 8;
const mostFigures = 8;
const longestPath = 4000;

/** A name of an icon, a widget or a figure, as weather or sky-rain. */
const ownName = z.string().regex(/^[a-z][a-z0-9-]*$/, "use lowercase letters, digits and hyphens, as sky-rain");

const widgetSchema = z.object({
    title: z.string().trim().min(1).max(40),
    icon: ownName.optional(),
    place: z.enum(widgetPlaces, { error: `a widget's place is ${widgetPlaces.join(", ")}` }),
    page: z.enum(cardPages, { error: `a card's page is ${cardPages.join(", ")}` }).optional(),
    order: z.int().min(-100).max(100).optional(),
}).strict().refine((widget) => (widget.place === "page") === (widget.page !== undefined), {
    error: "a widget in place page names its page (scene, sheet, world or journal), and only one in a page does",
});

/** The keys of extension.yaml and system.yaml that declare a package's icons, widgets and figures (D-502, D-510). */
export const packagePartsShape = {
    icons: z.record(ownName, z.string().max(longestPath).regex(/^[MmLlHhVvCcSsQqTtAaZz\d\s,.+-]+$/, "an icon is the path of an SVG, as M4 12h16")).optional(),
    widgets: z.record(ownName, widgetSchema).optional(),
    figures: z.record(ownName, z.object({ width: z.int().min(8).max(1280), height: z.int().min(8).max(800), mirror: z.boolean().optional() }).strict()).optional(),
};

/** A package's icons, widgets and figures, as its file declares them. */
interface DeclaredParts
{
    icons?: Record<string, string>;
    widgets?: Record<string, z.infer<typeof widgetSchema>>;
    figures?: Record<string, FigureSize>;
}

/** The issues of a package's icons, widgets and figures beyond their shape: too many, or a widget's icon that is not among the icons. */
export function packagePartsIssues(declared: DeclaredParts, owner: "an extension" | "a game system"): { path: string[]; message: string; }[]
{
    const icons = Object.keys(declared.icons ?? {});
    const widgets = Object.entries(declared.widgets ?? {});
    const many = icons.length > mostIcons || widgets.length > mostWidgets || Object.keys(declared.figures ?? {}).length > mostFigures
        ? [{ path: [], message: `${owner} declares at most ${mostIcons} icons, ${mostWidgets} widgets and ${mostFigures} figures` }]
        : [];
    const strays = widgets.filter(([, widget]) => widget.icon !== undefined && !icons.includes(widget.icon)).map(([name, widget]) => ({
        path: ["widgets", name, "icon"],
        message: `the icon ${widget.icon ?? ""} is not among the icons: add it there`,
    }));
    return [...many, ...strays];
}

/** A package's widgets as the engine keeps them, in the order written, each with its order among the cards. */
export function declaredWidgets(widgets: DeclaredParts["widgets"]): DeclaredWidget[]
{
    return Object.entries(widgets ?? {}).map(([name, widget]) => ({ name, ...widget, order: widget.order ?? 0 }));
}
