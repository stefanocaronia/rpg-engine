// The widgets of the campaign's packages on the dashboard (D-502, D-514), its game system's and its extensions': where each stands, as its extension.yaml or
// system.yaml puts it and campaign.yaml moves it, and what its code's hook shows now, checked and kept short, in the campaign's language. The package's state
// never reaches the page: only what its hook gives.
import { basename } from "node:path";
import { z } from "zod";
import { campaignFileName, readOneSetting, readTextSetting } from "../campaign/index.ts";
import type { Context } from "../core/context.ts";
import type { CardTint, PackageCode, Track, Widget, WidgetText, WidgetValue } from "../core/package-api.ts";
import { type CardPage, cardPages, type FigureSize } from "../core/package-api.ts";
import { type DeclaredWidget, type WidgetPlace, widgetPlaces } from "../core/package-declarations.ts";
import type { Problem } from "../core/problem.ts";
import { files } from "../core/store.ts";
import { comparableText } from "../core/text.ts";
import { type CodePackage, type ExtensionWords, wordIn } from "../extensions/index.ts";
import { findImage } from "../images/index.ts";
import { isInParty } from "../pages/index.ts";
import { campaignExtensions, packageWords, pageAddress, runsCode } from "./game-extension-list.ts";
import { campaignPackages, gameViewOf, packageCode } from "./game-package-code.ts";
import { campaignWorld } from "./game-world.ts";

/** Where a widget stands: a place of the dashboard, with its page for a card in one, and its order among the cards there; or off. */
export interface WidgetSpot
{
    place: WidgetPlace | "off";
    page?: CardPage;
    order: number;
}

/** A widget as the dashboard shows it (D-502): which it is, whose, its title in the campaign's language, where it stands and where its extension puts it, its icon, what it shows now. */
export interface ShownWidget extends WidgetSpot
{
    /** Its package's name and its own, as campaign.yaml names it: weather.today. */
    id: string;
    /** Its package's name, an extension's or the game system's. */
    extension: string;
    /** The package's title, as Settings names whose it is. */
    from: string;
    title: string;
    own: WidgetSpot;
    /** The path of its icon. */
    icon?: string;
    /** What it shows now; none while it has nothing to show, or is off. */
    shows?: ShownContent;
    /** In place person, what it shows on each of the party, by their name: only those it shows something on (D-514). */
    people?: Record<string, ShownContent>;
    /** Why it shows nothing, for whoever made it: its code failed, or gave what the dashboard does not show. */
    problem?: string;
    /** Its extension's version, which an error of its page code names (D-510). */
    version?: string;
    /** The address of its extension's page module, when it has one and its code runs (D-510). */
    module?: string;
    /** The figures its extension's page code draws, by name, with the room each takes (D-510). */
    figures?: Record<string, FigureSize>;
    /** Its extension's words in the campaign's language, by their English, for its page code's own words; none when it is written in that language. */
    words?: Record<string, string>;
}

/** What a widget shows, as the page draws it: its words in the campaign's language, its icons as their paths, its pictures as files. */
export interface ShownContent
{
    /** What only its page code draws (D-510): JSON as its hook gave it, never read by the master. */
    data?: unknown;
    /** The figure that draws the whole inside of its card of a roll (D-510). */
    body?: string;
    icon?: string;
    chip?: WidgetText;
    /** In place person, dead by the package's rules though not marked so (D-516). */
    dead?: true;
    /** In the card of a question, the colour of its moment (D-517). */
    tint?: CardTint;
    says?: WidgetText;
    note?: WidgetText;
    parts?: ShownPart[];
}

/** A part of a widget's card as the page draws it: a lead's icon as its path, a picture as the file of its extension the dashboard serves. */
export type ShownPart =
    | Exclude<NonNullable<Widget["parts"]>[number], { lead: WidgetText; } | { image: string; }>
    | { lead: WidgetText; icon?: string; value?: WidgetValue; tone?: "good" | "bad"; figure?: string; }
    | { image: { extension: string; file: string; version: number; }; alt: WidgetText; };

/** The places a campaign may put a widget in, in campaign.yaml: top, side, a page, which is a card in that page, or off. */
const widgetSpots = [...widgetPlaces.filter((place) => place !== "page" && place !== "card"), ...cardPages, "off"] as const;

// How long the hooks may take, all together, before the page goes on without those still at work, and the most a widget may give, as JSON.
const hookTime = 2000;
const mostShown = 12_000;

// The hooks still at work, by campaign, extension and widget: a reading that comes meanwhile waits on the same call, never calls again.
const working = new Map<string, Promise<Widget | undefined>>();

/**
 * The widgets of the campaign's packages, its game system's first, in the order of the packages and of their widgets, each where it stands and with what its
 * hook shows now. The hooks run together, within one time for all; one that takes longer shows nothing this time, and is not called again while it works.
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

    for (const extension of campaignPackages(root, context)) {
        const words = wordsOf(extension, language);
        const code = extension.widgets.length === 0 ? undefined : packageCode(extension, context).then((loaded) => ({ loaded }), (error: unknown) => ({ error: messageOf(error) }));

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
                ...pageOf(extension),
                // Its words for its page code's own words, in the campaign's language (D-510).
                ...(extension.page === undefined || words.read === undefined || Object.keys(words.read.words).length === 0 ? {} : { words: words.read.words }),
            };

            // A widget only of the cards of questions is read when one asks in it, never here.
            if (spot.place === "off" || spot.place === "card" || code === undefined) {
                reading.push(Promise.resolve(base));
                continue;
            }

            const party = spot.place === "person" ? partyNames(root, context) : undefined;
            reading.push(code.then((loaded) => widgetNow(root, context, extension, widget.name, base, loaded, words.read, late, party)));
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
    extension: CodePackage,
    name: string,
    base: ShownWidget,
    loaded: { loaded: PackageCode | undefined; } | { error: string; },
    words: ExtensionWords | undefined,
    late: Promise<"late">,
    party?: string[],
): Promise<ShownWidget>
{
    const hook = "error" in loaded ? undefined : loaded.loaded?.widgets?.[name];

    if (hook === undefined) {
        const problem = "error" in loaded ? `its code cannot be used: ${loaded.error}` : loaded.loaded === undefined ? "its code does not run in this campaign" : `its code gives nothing for the widget ${name}`;
        return { ...base, problem };
    }

    if (party !== undefined) {
        return await peopleNow(root, context, extension, name, base, hook, words, late, party);
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

/**
 * A widget in place person with what its hook shows on each of the party, by name (D-514): one called for each, together; one that fails or is late shows
 * nothing on them, and the first problem says why.
 */
async function peopleNow(
    root: string,
    context: Context,
    extension: CodePackage,
    name: string,
    base: ShownWidget,
    hook: NonNullable<PackageCode["widgets"]>[string],
    words: ExtensionWords | undefined,
    late: Promise<"late">,
    party: string[],
): Promise<ShownWidget>
{
    const shown = await Promise.all(party.map(async (who): Promise<{ shows?: [string, ShownContent]; problem?: string; }> => {
        try {
            const answer = await Promise.race([hookCall(root, extension, `${name}#person#${who}`, () => hook(gameViewOf(root, context, extension), { who })), late]);

            if (answer === "late") {
                return { problem: `it gave nothing in ${hookTime / 1000} seconds` };
            }

            return answer === undefined ? {} : { shows: [who, shownContent(extension, words, answer)] };
        } catch (error) {
            return { problem: messageOf(error) };
        }
    }));
    const people = Object.fromEntries(shown.flatMap((one) => (one.shows === undefined ? [] : [one.shows])));
    // The first in the party's order, whichever answered first.
    const problem = shown.find((one) => one.problem !== undefined)?.problem;
    return { ...base, ...(Object.keys(people).length === 0 ? {} : { people }), ...(problem === undefined ? {} : { problem }) };
}

/** The names of the party, the player's characters and their companions, in the order of the pages. */
function partyNames(root: string, context: Context): string[]
{
    return campaignWorld(root, context).pages.filter(isInParty).map((page) => page.name);
}

/** A hook's call, or the one already at work for the same widget of the same campaign. */
function hookCall(root: string, extension: CodePackage, widget: string, call: () => Widget | undefined | Promise<Widget | undefined>): Promise<Widget | undefined>
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

/** The widgets of the campaign's packages by the names campaign.yaml gives them, as weather.today, with where each package puts it. */
function campaignWidgetNames(root: string, context: Context): Record<string, WidgetSpot>
{
    return Object.fromEntries(campaignPackages(root, context).flatMap((extension) => extension.widgets.map((widget) => [`${extension.name}.${widget.name}`, ownSpot(widget)])));
}

/**
 * Where campaign.yaml would put the widgets it names, checked before it is written: each a widget of the campaign's extensions, each place one of those the
 * dashboard has. It throws what is wrong, and how to write it.
 */
export function checkWidgetSpots(root: string, context: Context, entries: Record<string, unknown>): void
{
    const spots = campaignWidgetNames(root, context);
    const known = Object.keys(spots);

    for (const [name, value] of Object.entries(entries)) {
        const own = Object.entries(spots).find(([one]) => comparableText(one) === comparableText(name))?.[1];

        if (own === undefined) {
            const names = known.length === 0 ? "the campaign's packages have none" : `the campaign's are ${known.join(", ")}`;
            throw new Error(`There is no widget ${name}: ${names}. Write one as ${known[0] ?? "weather.today"}: side. Nothing changed.`);
        }

        // A widget made for each of the party shows only there, or nowhere, as its hook needs who (D-514); another may come there too (D-516).
        const place = typeof value === "string" ? value : value !== null && typeof value === "object" && "place" in value ? value.place : undefined;

        if (own.place === "person" && place !== "person" && place !== "off") {
            throw new Error(`${name} stands on each of the party: write ${name}: off, or ${name}: person. Nothing changed.`);
        }

        if (own.place === "card") {
            throw new Error(`${name} shows only in the card its package asks a roll in, so it has no place to choose: take ${name} out of widgets. Nothing changed.`);
        }

        if (!spotSchema.safeParse(value).success) {
            // Of a place written as its parts, what is wrong with them, as an order that is no whole number.
            const issue = value !== null && typeof value === "object" ? spotObject.safeParse(value).error?.issues[0] : undefined;
            const why = issue === undefined ? "" : ` Here ${[...issue.path, ""].join(" ")}${issue.message}.`;
            throw new Error(`${name} takes ${widgetSpots.join(", ")}, or {place, page, order}, such as ${name}: side.${why} Nothing changed.`);
        }
    }
}

// The places campaign.yaml may give a widget.
const spotPlaces = [...widgetPlaces.filter((place) => place !== "card"), "off"] as const;

// The most and least order of a card among those of its place.
const orderWords = "is a whole number from -100 to 100";

/** A widget's place in campaign.yaml as its place, page and order. */
const spotObject = z.object({
    place: z.enum(spotPlaces, { error: `is ${spotPlaces.join(", ")}` }).optional(),
    page: z.enum(cardPages, { error: `is ${cardPages.join(", ")}` }).optional(),
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
    // A widget made for each of the party is there or off, as its hook needs who; another may come there too, a small card on each (D-516).
    const named = typeof given === "string" ? given : given.place;

    if (own.place === "person") {
        return named === "off" ? { place: "off", order: own.order } : own;
    }

    if (own.place === "card") {
        return own;
    }

    if (typeof given === "string") {
        return (cardPages as readonly string[]).includes(given) ? { place: "page", page: given as CardPage, order: own.order } : { place: given as WidgetSpot["place"], order: own.order };
    }

    const place = given.place ?? (given.page === undefined ? own.place : "page");
    const page = place === "page" ? given.page ?? own.page ?? "scene" : undefined;
    return { place, ...(page === undefined ? {} : { page }), order: given.order ?? own.order };
}

/** A package's words in the campaign's language, none where it is written in it; or why they cannot be read, with their file. */
function wordsOf(extension: CodePackage, language: string | undefined): { read?: ExtensionWords; problem?: string; }
{
    if (language === undefined || language.split("-")[0] === extension.language.split("-")[0]) {
        return {};
    }

    try {
        const read = packageWords(extension, language);
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
    z.object({ lead: textSchema, icon: iconName.optional(), value: valueSchema.optional(), tone: toneSchema.optional(), figure: iconName.optional() }).strict(),
    z.object({ who: text(80), does: textSchema.optional() }).strict(),
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
            figure: iconName.optional(),
            field: z.string().min(1).max(60).optional(),
        }).strict(),
    }).strict(),
    z.object({ rows: z.array(z.object({ label: textSchema, value: valueSchema.optional(), note: textSchema.optional() }).strict()).max(24) }).strict(),
    z.object({ table: z.object({ head: z.array(textSchema).min(1).max(6), rows: z.array(z.array(valueSchema).max(6)).max(24) }).strict() }).strict(),
    z.object({ image: z.string().regex(/^[\w .-]+\.(png|jpe?g|webp|svg)$/i), alt: textSchema }).strict(),
]);
const widgetSchema = z.object({
    // JSON for the page code alone, its size held by the most a widget gives.
    data: z.json().optional(),
    body: iconName.optional(),
    icon: iconName.optional(),
    chip: textSchema.optional(),
    dead: z.boolean().optional(),
    tint: z.enum(["low", "ally", "gold", "muted"], { error: "a card's tint is low, ally, gold or muted" }).optional(),
    says: textSchema.optional(),
    note: textSchema.optional(),
    parts: z.array(partSchema).max(12).optional(),
}).strict();

/** What a hook gave, checked, translated, its icons and pictures found; it throws what the dashboard cannot show, for whoever made the package. */
function shownContent(extension: CodePackage, words: ExtensionWords | undefined, given: unknown): ShownContent
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
            throw new Error(`it names the icon ${name}, which its ${fileOf(extension)} does not have`);
        }

        return name === undefined ? undefined : extension.icons[name];
    };

    const said = (one: WidgetText): WidgetText => (typeof one === "string" ? wordIn(words, one) : { text: wordIn(words, one.text), values: Object.fromEntries(Object.entries(one.values).map(([name, value]) => [name, valueIn(value)])) });

    const valueIn = (value: WidgetValue): WidgetValue => typeof value === "number" ? value : typeof value === "string" ? wordIn(words, value) : value.unit === undefined ? value : { ...value, unit: wordIn(words, value.unit) };

    // A figure it names is one its package declares, for its page code to draw.
    const figure = (name: string | undefined): { figure?: string; } => {
        if (name !== undefined && extension.figures[name] === undefined) {
            throw new Error(`it names the figure ${name}, which its ${fileOf(extension)} does not declare in figures`);
        }

        return name === undefined ? {} : { figure: name };
    };

    const { icon: ownIcon, chip, dead, tint, says, note, parts, data, body } = parsed.data;
    const shownIcon = icon(ownIcon);
    const inside = body === undefined ? {} : { body: figure(body).figure };
    return {
        ...(data === undefined ? {} : { data }),
        ...inside,
        ...(shownIcon === undefined ? {} : { icon: shownIcon }),
        ...(chip === undefined ? {} : { chip: said(chip) }),
        ...(dead === true ? { dead: true as const } : {}),
        ...(tint === undefined ? {} : { tint }),
        ...(says === undefined ? {} : { says: said(says) }),
        ...(note === undefined ? {} : { note: said(note) }),
        ...(parts === undefined ? {} : {
            parts: parts.map((part): ShownPart => {
                if ("lead" in part) {
                    const leadIcon = icon(part.icon);
                    const tone = part.tone === undefined ? {} : { tone: part.tone };
                    return { lead: said(part.lead), ...(leadIcon === undefined ? {} : { icon: leadIcon }), ...(part.value === undefined ? {} : { value: valueIn(part.value) }), ...tone, ...figure(part.figure) };
                }

                if ("who" in part) {
                    return { who: part.who, ...(part.does === undefined ? {} : { does: said(part.does) }) };
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
                    return { track: shownTrack({ ...part.track, label: said(part.track.label), ...figure(part.track.figure) }) };
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
 * What one widget of a package shows now, for the card of a question (D-507): read as the dashboard reads it, in the campaign's language; nothing when its
 * hook is not there, fails, gives what no part draws, or is late.
 */
export async function widgetCard(root: string, context: Context, extension: CodePackage, name: string, key: string, who?: string): Promise<ShownContent | undefined>
{
    return await widgetFor(root, context, extension, name, { key, ...(who === undefined ? {} : { who }) });
}

/**
 * What one widget of a package shows for a card of its page code, for the character the card shows (D-514): the package by its npm name, the widget declared
 * by it; nothing when either is not the campaign's, or as for a card of a question.
 */
export async function packageWidget(root: string, context: Context, packageName: string, name: string, who: string | undefined): Promise<ShownContent | undefined>
{
    const owner = campaignPackages(root, context).find((one) => one.package === packageName);
    return owner === undefined || !owner.widgets.some((widget) => widget.name === name) ? undefined : await widgetFor(root, context, owner, name, who === undefined ? {} : { who });
}

/** What a widget shows for a card: for a question, by its key, the attempt; for a card of the page code, by who it shows. */
async function widgetFor(root: string, context: Context, extension: CodePackage, name: string, asked: { key?: string; who?: string; }): Promise<ShownContent | undefined>
{
    try {
        const hook = (await packageCode(extension, context))?.widgets?.[name];

        if (hook === undefined) {
            return undefined;
        }

        let timer: NodeJS.Timeout | undefined;
        const late = new Promise<"late">((done) => {
            timer = setTimeout(() => done("late"), hookTime).unref();
        });
        // Its own call for its key or who, never one at work for the column or another card.
        const answer = await Promise.race([hookCall(root, extension, `${name}#${asked.key ?? ""}#${asked.who ?? ""}`, () => hook(gameViewOf(root, context, extension), asked)), late]).finally(() => clearTimeout(timer));
        return answer === "late" || answer === undefined ? undefined : shownContent(extension, wordsOf(extension, readTextSetting(root, "language")).read, answer);
    } catch {
        return undefined;
    }
}

/** Where a widget's page code is, when its package has some and its code runs (D-510): its module's address, its version, its figures. */
function pageOf(extension: CodePackage): Pick<ShownWidget, "version" | "module" | "figures">
{
    const module = extension.page === undefined || !runsCode(extension) ? {} : { module: pageAddress(extension.package, extension.version, extension.page) };
    return { version: extension.version, ...module, ...(Object.keys(extension.figures).length === 0 ? {} : { figures: extension.figures }) };
}

/** A picture of the package's images/, as the dashboard serves it at an address of the package's own; it throws when the package has none by that name. */
function pictureOf(extension: CodePackage, name: string): { extension: string; file: string; version: number; }
{
    const file = findImage([extension.folder], name);

    if (file === undefined) {
        throw new Error(`it shows the picture ${name}, which its images/ does not have`);
    }

    return { extension: extension.name, file: basename(file), version: Math.trunc(files().modified(file) ?? 0) };
}

/** The file a package declares its widgets, icons and figures in. */
function fileOf(extension: CodePackage): string
{
    return extension.kind === "system" ? "system.yaml" : "extension.yaml";
}

function messageOf(error: unknown): string
{
    return (error instanceof Error ? error.message : String(error)).split("\n")[0];
}
