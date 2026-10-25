// The widgets of the campaign's extensions on the dashboard (D-502): where each stands, as its extension.yaml puts it and campaign.yaml moves it, and what its
// code's hook shows now, checked and kept short, in the campaign's language. The extension's state never reaches the page: only what its hook gives.
import { basename } from "node:path";
import { z } from "zod";
import { campaignFileName, readOneSetting, readTextSetting } from "../campaign/index.ts";
import type { Context } from "../core/context.ts";
import type { Problem } from "../core/problem.ts";
import { files } from "../core/store.ts";
import { comparableText } from "../core/text.ts";
import {
    type DeclaredWidget,
    type Extension,
    type ExtensionCode,
    type ExtensionWords,
    extensionWords,
    type Track,
    type Widget,
    type WidgetPage,
    widgetPages,
    type WidgetPlace,
    widgetPlaces,
    type WidgetText,
    type WidgetValue,
    wordIn,
} from "../extensions/index.ts";
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

/** A part of a widget's card as the page draws it: a lead's icon as its path, a picture as the file of its extension the dashboard serves. */
export type ShownPart =
    | Exclude<NonNullable<Widget["parts"]>[number], { lead: WidgetText; } | { image: string; }>
    | { lead: WidgetText; icon?: string; value?: WidgetValue; }
    | { image: { extension: string; file: string; version: number; }; alt: WidgetText; };

/** The places a campaign may put a widget in, in campaign.yaml: top, side, a page, which is a card in that page, or off. */
export const widgetSpots = [...widgetPlaces.filter((place) => place !== "page"), ...widgetPages, "off"] as const;

// How long the hooks may take, all together, before the page goes on without those still at work, and the most a widget may give, as JSON.
const hookTime = 2000;
const mostShown = 12_000;

// The hooks still at work, by campaign, extension and widget: a reading that comes meanwhile waits on the same call, never calls again.
const working = new Map<string, Promise<Widget | undefined>>();

/**
 * The widgets of the campaign's extensions, in the order of the extensions and of their widgets, each where it stands and with what its hook shows now. The
 * hooks run together, within one time for all; one that takes longer shows nothing this time, and is not called again while it works.
 */
export async function campaignWidgets(root: string, context: Context): Promise<ShownWidget[]>
{
    const spots = campaignSpots(root);
    const language = readTextSetting(root, "language");
    let timer: NodeJS.Timeout | undefined;
    const late = new Promise<"late">((done) => {
        timer = setTimeout(() => done("late"), hookTime).unref();
    });
    const reading: Promise<ShownWidget>[] = [];

    for (const extension of campaignExtensions(root, context).extensions) {
        const words = wordsOf(extension, language);
        const code = extension.widgets.length === 0 ? undefined : extensionCode(extension).then((loaded) => ({ loaded }), (error: unknown) => ({ error: messageOf(error) }));

        for (const widget of extension.widgets) {
            const id = `${extension.name}.${widget.name}`;
            const own = ownSpot(widget);
            const given = Object.entries(spots).find(([name]) => comparableText(name) === comparableText(id))?.[1];
            const spot = given === undefined ? own : spotOf(given, own);
            const base: ShownWidget = {
                id,
                extension: extension.name,
                from: words.read?.title ?? extension.title,
                title: wordIn(words.read, widget.title),
                ...spot,
                own,
                ...(widget.icon === undefined ? {} : { icon: extension.icons[widget.icon] }),
                ...(words.problem === undefined ? {} : { problem: words.problem }),
            };

            if (spot.place === "off" || code === undefined) {
                reading.push(Promise.resolve(base));
                continue;
            }

            reading.push(code.then((loaded) => widgetNow(root, context, extension, widget.name, base, loaded, words.read, late)));
        }
    }

    try {
        return await Promise.all(reading);
    } finally {
        clearTimeout(timer);
    }
}

/** What keeps the words of the campaign's extensions from being read in its language, for validate: the file, and how to fix it (D-502). */
export function extensionWordsProblems(root: string, context: Context): Problem[]
{
    const language = readTextSetting(root, "language");
    return campaignExtensions(root, context).extensions.flatMap((extension) => {
        const problem = wordsOf(extension, language).problem;
        return problem === undefined ? [] : [{ path: campaignFileName, message: problem, fix: `or install it again with package install ${extension.name}` }];
    });
}

/** A widget with what its hook shows now, or why it shows nothing: its code, a hook it lacks, a hook that failed or was late, what it gave. */
async function widgetNow(
    root: string,
    context: Context,
    extension: Extension,
    name: string,
    base: ShownWidget,
    loaded: { loaded: ExtensionCode | undefined; } | { error: string; },
    words: ExtensionWords | undefined,
    late: Promise<"late">,
): Promise<ShownWidget>
{
    const hook = "error" in loaded ? undefined : loaded.loaded?.widgets?.[name];

    if (hook === undefined) {
        const problem = "error" in loaded ? `its code cannot be used: ${loaded.error}` : loaded.loaded === undefined ? "its code does not run in this campaign" : `its code gives nothing for the widget ${name}`;
        return { ...base, problem };
    }

    try {
        const answer = await Promise.race([hookCall(root, extension, name, () => hook(gameViewOf(root, context, extension))), late]);

        if (answer === "late") {
            return { ...base, problem: `it gave nothing in ${hookTime / 1000} seconds` };
        }

        const shows = answer === undefined ? undefined : shownContent(extension, words, answer);
        return { ...base, ...(shows === undefined ? {} : { shows }) };
    } catch (error) {
        return { ...base, problem: messageOf(error) };
    }
}

/** A hook's call, or the one already at work for the same widget of the same campaign. */
function hookCall(root: string, extension: Extension, widget: string, call: () => Widget | undefined | Promise<Widget | undefined>): Promise<Widget | undefined>
{
    const key = `${root}|${extension.package}@${extension.version}|${widget}`;
    const running = working.get(key);

    if (running !== undefined) {
        return running;
    }

    const started = Promise.resolve().then(call).finally(() => working.delete(key));
    working.set(key, started);
    return started;
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
    const known = Object.keys(campaignWidgetNames(root, context));

    for (const [name, value] of Object.entries(entries)) {
        if (!known.some((one) => comparableText(one) === comparableText(name))) {
            const names = known.length === 0 ? "the campaign's extensions have none" : `the campaign's are ${known.join(", ")}`;
            throw new Error(`There is no widget ${name}: ${names}. Write one as ${known[0] ?? "weather.today"}: side. Nothing changed.`);
        }

        if (!spotSchema.safeParse(value).success) {
            // Of a place written as its parts, what is wrong with them, as an order that is no whole number.
            const issue = value !== null && typeof value === "object" ? spotObject.safeParse(value).error?.issues[0] : undefined;
            const why = issue === undefined ? "" : ` Here ${[...issue.path, ""].join(" ")}${issue.message}.`;
            throw new Error(`${name} takes ${widgetSpots.join(", ")}, or {place, page, order}, such as ${name}: side.${why} Nothing changed.`);
        }
    }
}

// The most and least order of a card among those of its place.
const orderWords = "is a whole number from -100 to 100";

/** A widget's place in campaign.yaml as its place, page and order. */
const spotObject = z.object({
    place: z.enum([...widgetPlaces, "off"], { error: `is ${[...widgetPlaces, "off"].join(", ")}` }).optional(),
    page: z.enum(widgetPages, { error: `is ${widgetPages.join(", ")}` }).optional(),
    order: z.int({ error: orderWords }).min(-100, { error: orderWords }).max(100, { error: orderWords }).optional(),
}, { error: (issue) => (issue.code === "unrecognized_keys" ? `has no ${issue.keys.join(", ")}: only place, page and order` : undefined) }).strict().refine(
    (spot) => spot.place !== "page" || spot.page !== undefined,
    { error: "a card in place page names its page: scene, sheet, world or journal" },
);

/** A widget's place in campaign.yaml: a word, or its place, page and order. */
const spotSchema = z.union([z.enum(widgetSpots), spotObject]);

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

/** An extension's words in the campaign's language, none where it is written in it; or why they cannot be read, with their file. */
function wordsOf(extension: Extension, language: string | undefined): { read?: ExtensionWords; problem?: string; }
{
    if (language === undefined || language.split("-")[0] === extension.language.split("-")[0]) {
        return {};
    }

    try {
        const read = extensionWords(extension.folder, language);
        return read === undefined ? {} : { read };
    } catch (error) {
        return { problem: messageOf(error) };
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
const toneSchema = z.enum(["good", "bad"]);
const partSchema = z.union([
    z.object({ lead: textSchema, icon: iconName.optional(), value: valueSchema.optional(), tone: toneSchema.optional() }).strict(),
    z.object({ text: textSchema }).strict(),
    z.object({ facts: z.array(textSchema).max(12) }).strict(),
    z.object({ values: z.array(z.object({ label: textSchema, value: valueSchema }).strict()).max(12) }).strict(),
    z.object({
        track: z.object({
            label: textSchema,
            value: z.int().min(0),
            max: z.int().min(1).max(100),
            look: z.enum(["pips", "bar", "steps"]).optional(),
            held: z.int().min(0).optional(),
            marked: z.int().min(0).optional(),
            coming: z.int().min(0).optional(),
            stage: z.enum(["start", "center", "end"]).optional(),
            tone: toneSchema.optional(),
        }).strict(),
    }).strict(),
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
                    const tone = part.tone === undefined ? {} : { tone: part.tone };
                    return { lead: said(part.lead), ...(leadIcon === undefined ? {} : { icon: leadIcon }), ...(part.value === undefined ? {} : { value: valueIn(part.value) }), ...tone };
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
                    return { track: shownTrack({ ...part.track, label: said(part.track.label) }) };
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

/** A count as the page draws it: the lit ones, then those held, marked and coming, each cut to what is left of its maximum. */
function shownTrack<Shown extends Track>(track: Shown): Shown
{
    let left = track.max;

    const fit = (count: number | undefined): number | undefined => {
        const kept = count === undefined ? undefined : Math.min(count, left);
        left -= kept ?? 0;
        return kept;
    };

    const value = fit(track.value) ?? 0;
    const [held, marked, coming] = [fit(track.held), fit(track.marked), fit(track.coming)];
    return { ...track, value, ...(held === undefined ? {} : { held }), ...(marked === undefined ? {} : { marked }), ...(coming === undefined ? {} : { coming }) };
}

/**
 * What one widget of an extension shows now, for the card of a question (D-507): read as the dashboard reads it, in the campaign's language; nothing when its
 * hook is not there, fails, gives what no part draws, or is late.
 */
export async function widgetCard(root: string, context: Context, extension: Extension, name: string, key: string): Promise<ShownContent | undefined>
{
    try {
        const hook = (await extensionCode(extension))?.widgets?.[name];

        if (hook === undefined) {
            return undefined;
        }

        let timer: NodeJS.Timeout | undefined;
        const late = new Promise<"late">((done) => {
            timer = setTimeout(() => done("late"), hookTime).unref();
        });
        // Its own call for its key, never one at work for the column or another card.
        const answer = await Promise.race([hookCall(root, extension, `${name}#${key}`, () => hook(gameViewOf(root, context, extension), { key })), late]).finally(() => clearTimeout(timer));
        return answer === "late" || answer === undefined ? undefined : shownContent(extension, wordsOf(extension, readTextSetting(root, "language")).read, answer);
    } catch {
        return undefined;
    }
}

/** A picture of the extension's images/, as the dashboard serves it at an address of the extension's own; it throws when the extension has none by that name. */
function pictureOf(extension: Extension, name: string): { extension: string; file: string; version: number; }
{
    const file = findImage([extension.folder], name);

    if (file === undefined) {
        throw new Error(`it shows the picture ${name}, which its images/ does not have`);
    }

    return { extension: extension.name, file: basename(file), version: Math.trunc(files().modified(file) ?? 0) };
}

function messageOf(error: unknown): string
{
    return (error instanceof Error ? error.message : String(error)).split("\n")[0];
}
