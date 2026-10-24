// The widgets of the campaign's extensions on the dashboard (D-502): where each stands, as its extension.yaml puts it and campaign.yaml moves it, and what its
// code's hook shows now, checked and kept short, in the campaign's language. The extension's state never reaches the page: only what its hook gives.
import { basename } from "node:path";
import { z } from "zod";
import { readOneSetting, readTextSetting } from "../campaign/index.ts";
import type { Context } from "../core/context.ts";
import { files } from "../core/store.ts";
import { type DeclaredWidget, type Extension, type ExtensionWords, extensionWords, type Widget, type WidgetPage, widgetPages, type WidgetPlace, widgetPlaces, type WidgetText, type WidgetValue, wordIn } from "../extensions/index.ts";
import { findImage } from "../images/index.ts";
import { campaignExtensions } from "./game-extension-list.ts";
import { extensionCode, gameViewOf } from "./game-extensions.ts";

/** Where a widget stands: a place of the dashboard, with its page for a card in one, and its order among the cards there; or off. */
export interface WidgetSpot
{
    place: WidgetPlace | "off";
    page?: WidgetPage;
    order: number;
}

/** A widget as the dashboard shows it (D-502): which it is, whose, its title in the campaign's language, where it stands and where its extension puts it, its icon, what it shows now. */
export interface ShownWidget extends WidgetSpot
{
    /** Its extension's name and its own, as campaign.yaml names it: weather.today. */
    id: string;
    extension: string;
    /** The extension's title, as Settings names whose it is. */
    from: string;
    title: string;
    own: WidgetSpot;
    /** The path of its icon. */
    icon?: string;
    /** What it shows now; none while it has nothing to show, or is off. */
    shows?: ShownContent;
    /** Why it shows nothing, for whoever made it: its code failed, or gave what the dashboard does not show. */
    problem?: string;
}

/** What a widget shows, as the page draws it: its words in the campaign's language, its icons as their paths, its pictures as files. */
export interface ShownContent
{
    icon?: string;
    chip?: WidgetText;
    says?: WidgetText;
    note?: WidgetText;
    parts?: ShownPart[];
}

/** A part of a widget's card as the page draws it: a lead's icon as its path, a picture as the file the dashboard serves. */
export type ShownPart =
    | Exclude<NonNullable<Widget["parts"]>[number], { lead: WidgetText; } | { image: string; }>
    | { lead: WidgetText; icon?: string; value?: WidgetValue; }
    | { image: { file: string; version: number; }; alt: WidgetText; };

/** The places a campaign may put a widget in, in campaign.yaml: top, side, a page, which is a card in that page, or off. */
export const widgetSpots = [...widgetPlaces.filter((place) => place !== "page"), ...widgetPages, "off"] as const;

// How long a widget's hook may take before the page goes on without it, and the most a widget may give, as JSON.
const hookTime = 2000;
const mostShown = 12_000;

/** The widgets of the campaign's extensions, in the order of the extensions and of their widgets, each where it stands and with what its hook shows now. */
export async function campaignWidgets(root: string, context: Context): Promise<ShownWidget[]>
{
    const spots = campaignSpots(root);
    const language = readTextSetting(root, "language");
    const shown: ShownWidget[] = [];

    for (const extension of campaignExtensions(root, context).extensions) {
        const words = wordsOf(extension, language);
        const code = extension.widgets.length === 0 ? undefined : await extensionCode(extension).then((loaded) => ({ loaded }), (error: unknown) => ({ error: messageOf(error) }));

        for (const widget of extension.widgets) {
            const id = `${extension.name}.${widget.name}`;
            const own = ownSpot(widget);
            const spot = spots[id] === undefined ? own : spotOf(spots[id], own);
            const base: ShownWidget = {
                id,
                extension: extension.name,
                from: words?.title ?? extension.title,
                title: wordIn(words, widget.title),
                ...spot,
                own,
                ...(widget.icon === undefined ? {} : { icon: extension.icons[widget.icon] }),
            };

            if (spot.place === "off" || code === undefined) {
                shown.push(base);
                continue;
            }

            const hook = "error" in code ? undefined : code.loaded?.widgets?.[widget.name];
            const problem = "error" in code
                ? `its code cannot be used: ${code.error}`
                : code.loaded === undefined
                ? "its code does not run in this campaign"
                : hook === undefined
                ? `its code gives nothing for the widget ${widget.name}`
                : undefined;

            if (problem !== undefined) {
                shown.push({ ...base, problem });
                continue;
            }

            try {
                const given = await withinTime(Promise.resolve(hook!(gameViewOf(root, context, extension))));
                const shows = given === undefined ? undefined : shownContent(extension, words, given);
                shown.push({ ...base, ...(shows === undefined ? {} : { shows }) });
            } catch (error) {
                shown.push({ ...base, problem: messageOf(error) });
            }
        }
    }

    return shown;
}

/** The widgets of the campaign's extensions by the names campaign.yaml gives them, as weather.today, with where each extension puts it. */
export function campaignWidgetNames(root: string, context: Context): Record<string, WidgetSpot>
{
    return Object.fromEntries(campaignExtensions(root, context).extensions.flatMap((extension) => extension.widgets.map((widget) => [`${extension.name}.${widget.name}`, ownSpot(widget)])));
}

/**
 * Where campaign.yaml would put the widgets it names, checked before it is written: each a widget of the campaign's extensions, each place one of those the
 * dashboard has. It throws what is wrong, and how to write it.
 */
export function checkWidgetSpots(root: string, context: Context, entries: Record<string, unknown>): void
{
    const known = campaignWidgetNames(root, context);

    for (const [name, value] of Object.entries(entries)) {
        if (known[name] === undefined) {
            const names = Object.keys(known);
            throw new Error(`There is no widget ${name}: ${names.length === 0 ? "the campaign's extensions have none" : `the campaign's are ${names.join(", ")}`}. Nothing changed.`);
        }

        if (!spotSchema.safeParse(value).success) {
            throw new Error(`${name} takes ${widgetSpots.join(", ")}, or {place, page, order}, such as ${name}: side. Nothing changed.`);
        }
    }
}

/** A widget's place in campaign.yaml: a word, or its place, page and order. */
const spotSchema = z.union([
    z.enum(widgetSpots),
    z.object({ place: z.enum([...widgetPlaces, "off"]).optional(), page: z.enum(widgetPages).optional(), order: z.int().min(-100).max(100).optional() }).strict()
        .refine((spot) => spot.place !== "page" || spot.page !== undefined),
]);

/** Where campaign.yaml puts the widgets it names; one written wrongly by hand is left out, its extension's place holding. */
function campaignSpots(root: string): Record<string, z.infer<typeof spotSchema>>
{
    let written: unknown;

    try {
        written = readOneSetting(root, "widgets");
    } catch {
        return {};
    }

    const entries = written !== null && typeof written === "object" && !Array.isArray(written) ? Object.entries(written) : [];
    return Object.fromEntries(entries.flatMap(([name, value]) => {
        const parsed = spotSchema.safeParse(value);
        return parsed.success ? [[name, parsed.data]] : [];
    }));
}

function ownSpot(widget: DeclaredWidget): WidgetSpot
{
    return { place: widget.place, ...(widget.page === undefined ? {} : { page: widget.page }), order: widget.order };
}

/** Where the campaign puts a widget: a page's name is a card in that page; a place without its page keeps the extension's page, else the Scene. */
function spotOf(given: z.infer<typeof spotSchema>, own: WidgetSpot): WidgetSpot
{
    if (typeof given === "string") {
        return (widgetPages as readonly string[]).includes(given) ? { place: "page", page: given as WidgetPage, order: own.order } : { place: given as WidgetSpot["place"], order: own.order };
    }

    const place = given.place ?? (given.page === undefined ? own.place : "page");
    const page = place === "page" ? given.page ?? own.page ?? "scene" : undefined;
    return { place, ...(page === undefined ? {} : { page }), order: given.order ?? own.order };
}

function wordsOf(extension: Extension, language: string | undefined): ExtensionWords | undefined
{
    if (language === undefined || language.split("-")[0] === extension.language.split("-")[0]) {
        return undefined;
    }

    try {
        return extensionWords(extension.folder, language);
    } catch {
        return undefined;
    }
}

// What a widget may give: short words, few parts, numbers that are numbers.
const text = (most: number) => z.string().max(most);
const valueSchema = z.union([
    z.number(),
    text(80),
    z.object({ number: z.number(), unit: text(12).optional() }).strict(),
    z.object({ from: z.number(), to: z.number(), unit: text(12).optional() }).strict(),
]);
const textSchema = z.union([
    text(160),
    z.object({ text: text(240), values: z.record(z.string().regex(/^\w+$/), valueSchema).refine((values) => Object.keys(values).length <= 8, "at most 8 values") }).strict(),
]);
const iconName = z.string().regex(/^[a-z][a-z0-9-]*$/);
const partSchema = z.union([
    z.object({ lead: textSchema, icon: iconName.optional(), value: valueSchema.optional() }).strict(),
    z.object({ text: textSchema }).strict(),
    z.object({ facts: z.array(textSchema).max(12) }).strict(),
    z.object({ values: z.array(z.object({ label: textSchema, value: valueSchema }).strict()).max(12) }).strict(),
    z.object({ track: z.object({ label: textSchema, value: z.int().min(0), max: z.int().min(1).max(100), look: z.enum(["pips", "bar"]).optional() }).strict() }).strict(),
    z.object({ rows: z.array(z.object({ label: textSchema, value: valueSchema.optional(), note: textSchema.optional() }).strict()).max(24) }).strict(),
    z.object({ table: z.object({ head: z.array(textSchema).min(1).max(6), rows: z.array(z.array(valueSchema).max(6)).max(24) }).strict() }).strict(),
    z.object({ image: z.string().regex(/^[\w .-]+\.(png|jpe?g|webp|svg)$/i), alt: textSchema }).strict(),
]);
const widgetSchema = z.object({
    icon: iconName.optional(),
    chip: textSchema.optional(),
    says: textSchema.optional(),
    note: textSchema.optional(),
    parts: z.array(partSchema).max(12).optional(),
}).strict();

/** What a hook gave, checked, translated, its icons and pictures found; it throws what the dashboard cannot show, for whoever made the extension. */
function shownContent(extension: Extension, words: ExtensionWords | undefined, given: unknown): ShownContent
{
    const parsed = widgetSchema.safeParse(given);

    if (!parsed.success) {
        const issue = parsed.error.issues[0];
        throw new Error(`it gave what the dashboard does not show, at ${issue.path.join(".") || "its top"}: ${issue.message}`);
    }

    if (JSON.stringify(parsed.data).length > mostShown) {
        throw new Error(`it gave more than the dashboard shows of a widget, ${mostShown} characters as JSON`);
    }

    const icon = (name: string | undefined): string | undefined => {
        if (name !== undefined && extension.icons[name] === undefined) {
            throw new Error(`it names the icon ${name}, which its extension.yaml does not have`);
        }

        return name === undefined ? undefined : extension.icons[name];
    };

    const said = (one: WidgetText): WidgetText => (typeof one === "string" ? wordIn(words, one) : { text: wordIn(words, one.text), values: Object.fromEntries(Object.entries(one.values).map(([name, value]) => [name, valueIn(value)])) });

    const valueIn = (value: WidgetValue): WidgetValue => typeof value === "number" ? value : typeof value === "string" ? wordIn(words, value) : value.unit === undefined ? value : { ...value, unit: wordIn(words, value.unit) };

    const { icon: ownIcon, chip, says, note, parts } = parsed.data;
    const shownIcon = icon(ownIcon);
    return {
        ...(shownIcon === undefined ? {} : { icon: shownIcon }),
        ...(chip === undefined ? {} : { chip: said(chip) }),
        ...(says === undefined ? {} : { says: said(says) }),
        ...(note === undefined ? {} : { note: said(note) }),
        ...(parts === undefined ? {} : {
            parts: parts.map((part): ShownPart => {
                if ("lead" in part) {
                    const leadIcon = icon(part.icon);
                    return { lead: said(part.lead), ...(leadIcon === undefined ? {} : { icon: leadIcon }), ...(part.value === undefined ? {} : { value: valueIn(part.value) }) };
                }

                if ("text" in part) {
                    return { text: said(part.text) };
                }

                if ("facts" in part) {
                    return { facts: part.facts.map(said) };
                }

                if ("values" in part) {
                    return { values: part.values.map((one) => ({ label: said(one.label), value: valueIn(one.value) })) };
                }

                if ("track" in part) {
                    return { track: { ...part.track, label: said(part.track.label), value: Math.min(part.track.value, part.track.max) } };
                }

                if ("rows" in part) {
                    return {
                        rows: part.rows.map((row) => ({
                            label: said(row.label),
                            ...(row.value === undefined ? {} : { value: valueIn(row.value) }),
                            ...(row.note === undefined ? {} : { note: said(row.note) }),
                        })),
                    };
                }

                if ("table" in part) {
                    return { table: { head: part.table.head.map(said), rows: part.table.rows.map((row) => row.map(valueIn)) } };
                }

                return { image: pictureOf(extension, part.image), alt: said(part.alt) };
            }),
        }),
    };
}

/** A picture of the extension's images/, as the dashboard serves it; it throws when the extension has none by that name. */
function pictureOf(extension: Extension, name: string): { file: string; version: number; }
{
    const file = findImage([extension.folder], name);

    if (file === undefined) {
        throw new Error(`it shows the picture ${name}, which its images/ does not have`);
    }

    return { file: basename(file), version: Math.trunc(files().modified(file) ?? 0) };
}

/** What a hook gives, or that it took too long. */
function withinTime<Value>(running: Promise<Value>): Promise<Value>
{
    let timer: NodeJS.Timeout | undefined;
    const late = new Promise<never>((_, fail) => {
        timer = setTimeout(() => fail(new Error(`it gave nothing in ${hookTime / 1000} seconds`)), hookTime).unref();
    });
    return Promise.race([running, late]).finally(() => clearTimeout(timer));
}

function messageOf(error: unknown): string
{
    return (error instanceof Error ? error.message : String(error)).split("\n")[0];
}
