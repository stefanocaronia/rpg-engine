// A theme of the dashboard (D-527, D-528): a folder of data, theme.yaml with its fonts, pictures and icons, read and checked as the engine reads its game
// system. It gives values alone, colours, corners, fonts and the hooks the page documents; the page's own rules read them, so no part is the theme's to redraw.
import { existsSync, readdirSync, readFileSync, realpathSync, statSync } from "node:fs";
import { extname, isAbsolute, join, posix, relative, sep } from "node:path";
import { parse } from "yaml";
import { z } from "zod";
import { contrast, distance, isLight, mix } from "./contrast.ts";

/** The name of a theme's file in its folder. */
export const themeFileName = "theme.yaml";

/** The page's icons a theme may draw anew, by their names: the sections, the menu and the top's tools. */
export const themeIconNames = ["party", "scene", "combat", "journal", "world", "saves", "help", "settings", "about", "packages", "menu"] as const;

/** The two looks of the page; a theme gives both. */
const themeModes = ["light", "dark"] as const;

/** One of the two looks of the page. */
export type ThemeModeName = (typeof themeModes)[number];

/** The colours each mode must give: the page's ground, the cards', lines, text, softer text, the accent, the strong colour and its text, friends and danger. */
const requiredColours = ["paper", "panel", "rule", "ink", "muted", "accent", "gold", "on-gold", "ally", "low"] as const;

/** The colours a mode may give, else the page derives them from the others. */
const optionalColours = ["panel-2", "float", "gold-ink", "warn", "on-low"] as const;

type ColourName = (typeof requiredColours)[number] | (typeof optionalColours)[number];

/** A theme as read, its files checked and its derived colours filled in. */
export interface Theme
{
    name: string;
    /** Its version, as a theme installed on its own gives it. */
    version?: string;
    /** The folder it was read from: its files are served from there. */
    folder: string;
    fonts: ThemeFont[];
    /** The family of each of the page's three faces it changes. */
    textFont?: string;
    titleFont?: string;
    storyFont?: string;
    /** The face of the big numbers: the text's, or the titles'. */
    numberFont: "text" | "title";
    /** A card's corner in pixels; the page's other corners follow it. */
    corners?: number;
    titleCase?: "as-written" | "capitals" | "small-capitals";
    /** The titles' letter spacing, in em. */
    titleSpacing?: number;
    /** A second line inside the cards, drawn as an outline that takes no room. */
    innerLine?: "none" | "solid" | "dashed" | "dotted";
    /** The picture in a card's lower corner, a file of the folder drawn in one colour. */
    ornament?: string;
    /** The cards' corners cut, notched or scooped instead of round, as far as `corners` says. */
    cardCorner?: "round" | "cut" | "notch" | "scoop";
    /** A texture under the cards, an SVG drawn in each mode's grain colour, faint under the card's own colour. */
    cardTexture?: ThemeTexture;
    /** The shape of the buttons of words, and of the chosen tab. */
    buttonShape?: Shape;
    tabShape?: "underline" | Shape;
    /** The shadows of whatever lifts: soft as the page's, sharp, none, or a glow. */
    shadows?: "soft" | "sharp" | "none" | "glow";
    /** The paper of the maps and of the documents found, the same in both modes. */
    papers: { maps?: string; documents?: string; };
    /** The portraits' shape and a frame drawn inside their edge. */
    portraitShape?: "round" | "rounded" | "square" | "cut";
    portraitFrame?: "none" | "thin" | "thick" | "double";
    /** A style sheet of its own, a file of the folder, which the page adds over its rules in a layer of its own, unchecked. */
    style?: string;
    /** The lines of each icon it draws, by name: the d of its paths, on a grid of 24. */
    icons: Record<string, string>;
    modes: Record<ThemeModeName, ThemeMode>;
}

/** A face of the theme: its family, its file in the folder, its weights as CSS reads them. */
export interface ThemeFont
{
    family: string;
    file: string;
    weight: string;
}

/** What a theme gives for one of the two looks. */
export interface ThemeMode
{
    /** Every colour of the page, those it left out derived. */
    colours: Record<ColourName, string>;
    titleGlow?: string;
    cardEdge: string;
    barEdge?: string;
    pageTexture?: ThemeTexture;
    barTexture?: ThemeTexture;
    /** A picture at the end of the top, beside the campaign's name, under no words. */
    headPicture?: ThemeTexture;
    /** The colour the cards' texture is drawn in. */
    cardGrain: string;
    /** The colour of the shadows, when not the page's. */
    shadow?: string;
    /** The colour of the portraits' frame. */
    portraitFrame: string;
}

/** The shapes of a button or a tab: the page's rounded corners, square, a pill, or cut. */
type Shape = "rounded" | "square" | "pill" | "cut";

/** A picture under the page or the top, repeated or covering it. */
export interface ThemeTexture
{
    picture: string;
    fit: "tile" | "cover";
}

/** A theme as read: the theme when it passes every check, else none and what to fix, each a line. */
export interface ThemeReading
{
    theme?: Theme;
    problems: string[];
}

/** Reads and checks the theme in this folder: its keys, its files, both modes, the contrast of the colours the page pairs. */
export function readTheme(folder: string): ThemeReading
{
    const path = join(folder, themeFileName);

    if (!existsSync(path)) {
        return { problems: [`there is no ${themeFileName} in ${folder}`] };
    }

    let data: unknown;

    try {
        data = parse(readFileSync(path, "utf8"));
    } catch (error) {
        return { problems: [`${themeFileName} is not valid YAML: ${error instanceof Error ? error.message.split("\n")[0] : String(error)}`] };
    }

    const parsed = themeSchema.safeParse(data ?? {});

    if (!parsed.success) {
        return { problems: parsed.error.issues.map(issueText) };
    }

    const problems: string[] = [];
    const given = parsed.data;

    const file = (place: string, name: string, kinds: readonly string[]): string => {
        const problem = fileProblem(folder, name, kinds);

        if (problem !== undefined) {
            problems.push(`${place}: ${problem}`);
        }

        return written(name);
    };

    const fonts = (given.fonts ?? []).map((font, index) => {
        file(`fonts.${index}.file`, font.file, fontFiles);
        file(`fonts.${index}.license`, font.license, licenseFiles);
        return { family: font.family, file: written(font.file), weight: String(font.weight ?? 400) };
    });

    const family = (key: "text-font" | "title-font" | "story-font"): string | undefined => {
        const name = given[key];

        if (name !== undefined && !fonts.some((font) => font.family === name)) {
            problems.push(`${key}: "${name}" is none of the theme's fonts; add it to fonts with its file and license, or name one of ${fonts.map((font) => `"${font.family}"`).join(", ") || "none yet"}`);
        }

        return name;
    };

    const icons: Record<string, string> = {};

    for (const [name, drawing] of Object.entries(given.icons ?? {})) {
        if (!(themeIconNames as readonly string[]).includes(name)) {
            problems.push(`icons.${name}: the page has no icon of that name; a theme draws ${themeIconNames.join(", ")}`);
            continue;
        }

        if (fileProblem(folder, drawing, [".svg"]) !== undefined) {
            problems.push(`icons.${name}: ${fileProblem(folder, drawing, [".svg"])}`);
            continue;
        }

        const svg = readFileSync(join(folder, drawing), "utf8");
        const lines = iconLines(svg);
        const others = otherElements(svg);

        if (lines === undefined) {
            problems.push(`icons.${name}: ${drawing} must draw with paths alone, each a d of letters and numbers on a grid of 24, as M4 12h16${others.length === 0 ? "" : `; it has ${others.map((element) => `<${element}>`).join(", ")}`}`);
        } else {
            icons[name] = lines;
        }
    }

    const ornament = given.cards?.ornament === undefined ? undefined : file("cards.ornament", given.cards.ornament, [".svg"]);
    const cardTexture = given.cards?.texture === undefined ? undefined : { picture: file("cards.texture.picture", given.cards.texture.picture, [".svg"]), fit: given.cards.texture.fit ?? "tile" };

    if (cardTexture !== undefined && fileProblem(folder, cardTexture.picture, [".svg"]) === undefined) {
        problems.push(...oneColourProblems(readFileSync(join(folder, cardTexture.picture), "utf8")).map((problem) => `cards.texture.picture: ${cardTexture.picture} ${problem}`));
    }

    const style = given.style === undefined ? undefined : file("style", given.style, [".css"]);

    if (style !== undefined && fileProblem(folder, style, [".css"]) === undefined) {
        problems.push(...styleProblems(folder, style));
    }

    const hooks: Hooks = { tabs: given.tabs?.shape ?? "underline", grain: cardTexture !== undefined, frame: (given.portraits?.frame ?? "none") !== "none" };
    const modes = {} as Record<ThemeModeName, ThemeMode>;

    for (const mode of themeModes) {
        const asked = given[mode];
        const colours = derived(asked);
        const cardEdge = asked["card-edge"] ?? colours.rule;
        modes[mode] = {
            colours,
            cardEdge,
            ...(asked["title-glow"] === undefined || asked["title-glow"] === "none" ? {} : { titleGlow: asked["title-glow"] }),
            ...(asked["bar-edge"] === undefined || asked["bar-edge"] === "none" ? {} : { barEdge: asked["bar-edge"] }),
            ...(asked["page-texture"] === undefined ? {} : { pageTexture: { picture: file(`${mode}.page-texture.picture`, asked["page-texture"].picture, pictureFiles), fit: asked["page-texture"].fit ?? "tile" } }),
            ...(asked["bar-texture"] === undefined ? {} : { barTexture: { picture: file(`${mode}.bar-texture.picture`, asked["bar-texture"].picture, pictureFiles), fit: asked["bar-texture"].fit ?? "tile" } }),
            ...(asked["head-picture"] === undefined ? {} : { headPicture: { picture: file(`${mode}.head-picture.picture`, asked["head-picture"].picture, pictureFiles), fit: asked["head-picture"].fit ?? "cover" } }),
            cardGrain: asked["card-grain"] ?? cardEdge,
            ...optional("shadow", asked.shadow),
            portraitFrame: asked["portrait-frame"] ?? colours.gold,
        };
        problems.push(...legibilityProblems(mode, modes[mode], hooks));
    }

    problems.push(...paperProblems(given.papers ?? {}));

    const theme: Theme = {
        name: given.name,
        ...optional("version", given.version),
        folder,
        fonts,
        ...optional("textFont", family("text-font")),
        ...optional("titleFont", family("title-font")),
        ...optional("storyFont", family("story-font")),
        numberFont: given["number-font"] ?? "text",
        ...optional("corners", given.corners),
        ...optional("titleCase", given.titles?.case),
        ...optional("titleSpacing", given.titles?.spacing),
        ...optional("innerLine", given.cards?.["inner-line"]),
        ...optional("ornament", ornament),
        ...optional("cardCorner", given.cards?.corner),
        ...optional("cardTexture", cardTexture),
        ...optional("buttonShape", given.buttons?.shape),
        ...optional("tabShape", given.tabs?.shape),
        ...optional("shadows", given.shadows),
        papers: given.papers ?? {},
        ...optional("portraitShape", given.portraits?.shape),
        ...optional("portraitFrame", given.portraits?.frame),
        ...optional("style", style),
        icons,
        modes,
    };
    return problems.length === 0 ? { theme, problems } : { problems };
}

/** The real path of a file of a theme's folder, only when it is one and inside it, links resolved: what the dashboard serves. */
export function themeFile(folder: string, name: string): string | undefined
{
    try {
        const inside = realpathSync(folder);
        const path = realpathSync(join(folder, name));
        const way = relative(inside, path);
        return way === "" || way.startsWith("..") || isAbsolute(way) || !statSync(path).isFile() || !writtenAsIs(folder, name) ? undefined : path;
    } catch {
        return undefined;
    }
}

/**
 * The files a theme.yaml names, with forward slashes, as written from its folder: its fonts and their licences, its ornament, icons, textures and pictures,
 * its style sheet and the pictures that names, read by `read`. None when it does not read: its checks say why.
 */
export function themeFilesNamed(text: string, read: (name: string) => string | undefined = () => undefined): string[]
{
    let data: unknown;

    try {
        data = parse(text);
    } catch {
        return [];
    }

    const given = (typeof data === "object" && data !== null ? data : {}) as Record<string, unknown>;
    const field = (value: unknown, key: string): unknown => (typeof value === "object" && value !== null ? (value as Record<string, unknown>)[key] : undefined);
    const fonts = Array.isArray(given.fonts) ? given.fonts.flatMap((font: unknown) => [field(font, "file"), field(font, "license")]) : [];
    const icons = typeof given.icons === "object" && given.icons !== null ? Object.values(given.icons) : [];
    const textures = ["light", "dark"].flatMap((mode) => ["page-texture", "bar-texture", "head-picture"].map((texture) => field(field(given[mode], texture), "picture")));
    const named = [...fonts, ...icons, ...textures, field(given.cards, "ornament"), field(field(given.cards, "texture"), "picture"), given.style];
    const files = named.filter((one): one is string => typeof one === "string").map(written);
    const style = typeof given.style === "string" ? written(given.style) : undefined;
    const sheet = style === undefined ? undefined : read(style);
    return sheet === undefined || style === undefined ? files : [...files, ...styleUrls(sheet).filter(namesFile).map((url) => fromStyle(style, url))];
}

/** A name as written from a theme's folder, with forward slashes and no ./ before it. */
function written(name: string): string
{
    return name.replaceAll("\\", "/").replace(/^(\.\/)+/, "");
}

/** The addresses a style sheet's url() give, as written, without their quotes. */
function styleUrls(css: string): string[]
{
    return [...withoutComments(css).matchAll(/url\(\s*(?:"([^"]*)"|'([^']*)'|([^)\s]*))\s*\)/gi)].map((match) => (match[1] ?? match[2] ?? match[3]).trim());
}

/** Whether a style sheet's url() names a file from the sheet: not an element of the page (#glow), an address with a scheme, nor one from the page's root. */
function namesFile(url: string): boolean
{
    return !url.startsWith("#") && !url.startsWith("/") && !/^[a-z][a-z\d+.-]*:/i.test(url);
}

/** An address of a theme's style sheet as a file of its folder: relative to the sheet, decoded as the browser does, its ./ and ../ resolved; one that climbs out keeps its .. */
function fromStyle(style: string, url: string): string
{
    const path = url.split(/[?#]/)[0];
    let name = path;

    try {
        name = decodeURIComponent(path);
    } catch {
        // No valid escape: the browser asks for it as written, and the check says it is missing.
    }

    return posix.normalize(posix.join(posix.dirname(style), name));
}

function withoutComments(css: string): string
{
    return css.replace(/\/\*[\s\S]*?\*\//g, "");
}

/** An ornament drawn in one colour, turned for a page that reads right to left: the theme gives one drawing for both modes and both directions. */
export function drawnOrnament(svg: string, ink: string, mirrored: boolean): string
{
    const coloured = svg.replaceAll("currentColor", ink);

    if (!mirrored) {
        return coloured;
    }

    const box = /viewBox="\s*(-?[\d.]+)[\s,]+(-?[\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)\s*"/.exec(coloured);
    const opened = /<svg[^>]*>/.exec(coloured);

    if (box === null || opened === null) {
        return coloured;
    }

    const across = 2 * Number(box[1]) + Number(box[3]);
    const start = opened.index + opened[0].length;
    const end = coloured.lastIndexOf("</svg>");
    return `${coloured.slice(0, start)}<g transform="translate(${across} 0) scale(-1 1)">${coloured.slice(start, end)}</g>${coloured.slice(end)}`;
}

/** The cards' texture drawn in one colour: what it draws in currentColor, and what it fills without saying how, in that colour. */
export function drawnTexture(svg: string, ink: string): string
{
    const coloured = svg.replaceAll("currentColor", ink);
    const opened = /<svg\b[^>]*>/.exec(coloured);
    return opened === null || /\sfill\s*=/.test(opened[0]) ? coloured : `${coloured.slice(0, opened.index + 4)} fill="${ink}"${coloured.slice(opened.index + 4)}`;
}

/** Whether each part of a file's name is written as the disk has it, capitals too: Windows finds Images/Corner.SVG, Linux does not. */
function writtenAsIs(folder: string, name: string): boolean
{
    let at = folder;

    for (const part of name.split(/[\\/]/).filter((one) => one !== "" && one !== ".")) {
        if (!readdirSync(at).includes(part)) {
            return false;
        }

        at = join(at, part);
    }

    return true;
}

const fontFiles = [".woff2", ".woff", ".ttf", ".otf"];

const pictureFiles = [".svg", ".png", ".webp", ".jpg", ".jpeg"];

const licenseFiles = [".txt", ".md"];

// What a theme's file may weigh at most: a face, a picture.
const mostBytes = 1_000_000;

const colour = z.string().regex(/^#[0-9a-fA-F]{6}$/, { error: "write it as #rrggbb" }).transform((value) => value.toLowerCase());

const fileName = z.string().min(1);

const texture = z.object({ picture: fileName, fit: z.enum(["tile", "cover"]).optional() }).strict();

const modeSchema = z.object({
    ...Object.fromEntries(requiredColours.map((name) => [name, colour])) as Record<(typeof requiredColours)[number], typeof colour>,
    ...Object.fromEntries(optionalColours.map((name) => [name, colour.optional()])) as Record<(typeof optionalColours)[number], z.ZodOptional<typeof colour>>,
    "title-glow": z.union([z.literal("none"), colour]).optional(),
    "card-edge": colour.optional(),
    "bar-edge": z.union([z.literal("none"), colour]).optional(),
    "page-texture": texture.optional(),
    "bar-texture": texture.optional(),
    "head-picture": texture.optional(),
    "card-grain": colour.optional(),
    shadow: colour.optional(),
    "portrait-frame": colour.optional(),
}).strict();

const shapes = ["rounded", "square", "pill", "cut"] as const;

const themeSchema = z.object({
    name: z.string().min(1),
    version: z.union([z.string().min(1), z.number()]).transform(String).optional(),
    // The lowest rpg-engine that reads it, such as "0.22": checked as it is installed.
    engine: z.union([z.string().min(1), z.number()]).transform(String).optional(),
    fonts: z.array(
        z.object({
            family: z.string().regex(/^[\p{L}\p{N} _-]+$/u, { error: "letters, numbers, spaces and hyphens alone" }),
            file: fileName,
            weight: z.union([z.number().int().min(1).max(1000), z.string().regex(/^\d{1,4}( \d{1,4})?$/, { error: "a weight, or two for a variable face, such as 100 900" })]).optional(),
            license: fileName,
        }).strict(),
    ).optional(),
    "text-font": z.string().min(1).optional(),
    "title-font": z.string().min(1).optional(),
    "story-font": z.string().min(1).optional(),
    "number-font": z.enum(["text", "title"]).optional(),
    corners: z.number().min(0).max(16, { error: "a card's corner in pixels, from 0 to 16" }).optional(),
    titles: z.object({ case: z.enum(["as-written", "capitals", "small-capitals"]).optional(), spacing: z.number().min(-0.02).max(0.15).optional() }).strict().optional(),
    cards: z.object({
        "inner-line": z.enum(["none", "solid", "dashed", "dotted"]).optional(),
        ornament: fileName.optional(),
        corner: z.enum(["round", "cut", "notch", "scoop"]).optional(),
        texture: texture.optional(),
    }).strict().optional(),
    buttons: z.object({ shape: z.enum(shapes).optional() }).strict().optional(),
    tabs: z.object({ shape: z.enum(["underline", ...shapes]).optional() }).strict().optional(),
    shadows: z.enum(["soft", "sharp", "none", "glow"]).optional(),
    papers: z.object({ maps: colour.optional(), documents: colour.optional() }).strict().optional(),
    portraits: z.object({ shape: z.enum(["round", "rounded", "square", "cut"]).optional(), frame: z.enum(["none", "thin", "thick", "double"]).optional() }).strict().optional(),
    style: fileName.optional(),
    icons: z.record(z.string(), fileName).optional(),
    light: modeSchema,
    dark: modeSchema,
}).strict();

// The pairs of colours the page sets one on the other, the contrast each needs, text 4.5:1 and the focus ring 3:1 on the page, and the colour of the theme to
// change when one does not reach it. The grounds and words the page mixes are measured as it mixes them: an effect's chip, the accent at 16% on the card's
// second tone, its end the muted at 70% with the ink; the player's turn, its softer words on-gold at 75%; an ornament may lie under a word in a card's corner;
// on-low, given or derived, on the danger's button.
const pairs: Pair[] = [
    { ink: "ink", ground: "paper", least: 4.5, change: "ink" },
    { ink: "ink", ground: "panel", least: 4.5, change: "ink" },
    { ink: "ink", ground: "float", least: 4.5, change: "ink" },
    { ink: "muted", ground: "panel", least: 4.5, change: "muted" },
    { ink: "muted", ground: "cell", least: 4.5, change: "muted" },
    { ink: "chip-muted", ground: "chip", least: 4.5, change: "muted" },
    { ink: "accent", ground: "panel", least: 4.5, change: "accent" },
    { ink: "accent", ground: "chip", least: 4.5, change: "accent" },
    { ink: "accent", ground: "paper", least: 3, change: "accent" },
    { ink: "on-gold", ground: "gold", least: 4.5, change: "on-gold" },
    { ink: "on-gold-soft", ground: "gold", least: 4.5, change: "on-gold" },
    { ink: "gold-ink", ground: "panel", least: 4.5, change: "gold-ink" },
    { ink: "ally", ground: "panel", least: 4.5, change: "ally" },
    { ink: "low", ground: "panel", least: 4.5, change: "low" },
    { ink: "warn", ground: "panel", least: 4.5, change: "warn" },
    { ink: "ink", ground: "card-edge", least: 4.5, change: "card-edge" },
    // The last button of a confirm that loses something.
    { ink: "on-low", ground: "low", least: 4.5, change: "on-low" },
];

// The pairs a hook adds when a theme uses it: the chosen tab's accent on its tint, and the words of a card on its texture where it is thickest, whose grain
// colour is the one to change.
const tabPairs: Pair[] = [{ ink: "accent", ground: "tab", least: 4.5, change: "accent" }];
const grainPairs: Pair[] = ["ink", "muted", "accent", "gold-ink", "ally", "low", "warn"].map((ink) => ({ ink, ground: "grain", least: 4.5, change: "card-grain" }));

/** The pairs a theme's colours must pass, with those of the hooks it uses. */
function pairsOf(hooks: Hooks): Pair[]
{
    return [...pairs, ...(hooks.tabs === "underline" ? [] : tabPairs), ...(hooks.grain ? grainPairs : [])];
}

/**
 * What does not read in a mode: by colour of the theme to change, the pairs it fails, and the nearest colour that makes them all read without making another
 * pair fail; or, when none does, that one of the colours it sits on or under must change.
 */
function legibilityProblems(mode: ThemeModeName, given: ThemeMode, hooks: Hooks): string[]
{
    const all = pairsOf(hooks);
    const written: Record<string, string> = { ...given.colours, "card-edge": given.cardEdge, "card-grain": given.cardGrain };
    const shown = measured(written);
    const failing = all.filter((pair) => !reads(pair, shown));
    const problems = [...new Set(failing.map((pair) => pair.change))].map((change) => {
        const own = failing.filter((pair) => pair.change === change);
        const fails = own.map((pair) => `${pair.ink === change ? "" : `${pair.ink} `}on ${pair.ground} ${shown[pair.ground]} is ${ratioText(shown[pair.ink], shown[pair.ground])}:1`);
        const said = `${mode}: ${change} ${written[change]} does not read: ${fails.join(", ")}, the page needs ${own[0].least}:1`;
        const offered = readingColour(written, change, all);
        const others = [...new Set(all.filter((pair) => pair.change === change).flatMap((pair) => madeOf(pair.ground === change ? pair.ink : pair.ground)))].filter((name) => name !== change);
        return offered === undefined ? `${said}; no one colour reads on ${others.join(" and ")} as they are: change one of those` : `${said}; ${offered} would do`;
    });

    if (!apart(written)) {
        problems.push(`${mode}: ally ${written.ally} and low ${written.low} are too alike; friends and foes must not look the same`);
    }

    if (hooks.frame && distance(given.portraitFrame, written.low) < 60) {
        problems.push(`${mode}: portrait-frame ${given.portraitFrame} and low ${written.low} are too alike; a foe is ringed in low, and every portrait would look like one`);
    }

    return problems;
}

/** The hooks of a theme that add pairs to check: the chosen tab's shape, a texture under the cards, a frame round the portraits. */
interface Hooks
{
    tabs: string;
    grain: boolean;
    frame: boolean;
}

interface Pair
{
    ink: string;
    ground: string;
    least: number;
    change: string;
}

// The inks the page writes on the paper of the documents and of the maps, copied from tokens.css and world.css, and the contrast each needs: words 4.5:1,
// a mark 3:1. The documents' ruled lines are faint, a texture, and need none.
const paperInks: Record<"documents" | "maps", [string, string, number][]> = {
    documents: [["the documents' ink", "#2f261b", 4.5], ["their notes", "#5c4a30", 4.5], ["their links", "#7a3b16", 4.5], ["their seals", "#9b2f24", 3]],
    maps: [["the maps' ink", "#3f2f1f", 4.5], ["the regions' names", "#5a3f4f", 4.5], ["their marks", "#6b4a5c", 3], ["the rivers", "#3a6d96", 3], ["the party's trail", "#b2361f", 3]],
};

/** What does not read on the paper a theme gives the documents or the maps, the same in both modes, and the nearest paper that reads. */
function paperProblems(papers: { maps?: string; documents?: string; }): string[]
{
    return (["documents", "maps"] as const).flatMap((kind) => {
        const paper = papers[kind];
        const failing = paper === undefined ? [] : paperInks[kind].filter(([, ink, least]) => contrast(ink, paper) < least);

        if (paper === undefined || failing.length === 0) {
            return [];
        }

        const fails = failing.map(([name, ink, least]) => `${name} ${ink} on it is ${ratioText(ink, paper)}:1, the page needs ${least}:1`).join(", ");
        const offered = [...Array(100).keys()].map((step) => mix("#ffffff", paper, (step + 1) / 100)).find((tried) => paperInks[kind].every(([, ink, least]) => contrast(ink, tried) >= least));
        return [`papers.${kind} ${paper} does not read: ${fails}; the page writes dark on it in both modes, ${offered ?? "#ffffff"} would do`];
    });
}

// The colours the page mixes of the theme's: the two each mixes, and how much of the first. The chosen tab's tint over the page; a card's texture where it
// is thickest, its grain at 30% over the card.
const mixes: Record<string, [string, string, number]> = {
    cell: ["ink", "panel", 0.06],
    chip: ["accent", "panel-2", 0.16],
    "chip-muted": ["muted", "ink", 0.7],
    "on-gold-soft": ["on-gold", "gold", 0.75],
    tab: ["accent", "paper", 0.16],
    grain: ["card-grain", "panel", 0.3],
};

/** The colours as the page shows them, those it mixes included. */
function measured(written: Record<string, string>): Record<string, string>
{
    return { ...written, ...Object.fromEntries(Object.entries(mixes).map(([name, [first, second, share]]) => [name, mix(written[first], written[second], share)])) };
}

/** The theme's colours a colour the page shows is made of: itself, or the two it mixes, which a message can name. */
function madeOf(name: string): string[]
{
    const mixed = mixes[name];
    return mixed === undefined ? [name] : [mixed[0], mixed[1]];
}

/** Whether friends and foes look apart. */
function apart(colours: Record<string, string>): boolean
{
    return distance(colours.ally, colours.low) >= 60;
}

function reads(pair: { ink: string; ground: string; least: number; }, shown: Record<string, string>): boolean
{
    return contrast(shown[pair.ink], shown[pair.ground]) >= pair.least;
}

/** A contrast as the message says it, cut down and never rounded up: 4.497 is 4.49:1, short of 4.5. */
function ratioText(first: string, second: string): string
{
    return (Math.floor(contrast(first, second) * 100) / 100).toFixed(2);
}

/**
 * The colour nearest to the one written, toward white or toward black, that makes every pair it is in read, no pair that read stop reading, and friends and foes
 * that looked apart still look so; undefined when there is none.
 */
function readingColour(written: Record<string, string>, change: string, pairs: Pair[]): string | undefined
{
    const before = measured(written);
    const readBefore = pairs.filter((pair) => reads(pair, before));
    const apartBefore = apart(written);

    for (let step = 1; step <= 100; step++) {
        for (const toward of ["#000000", "#ffffff"]) {
            const tried = { ...written, [change]: mix(toward, written[change], step / 100) };
            const shown = measured(tried);
            const readsNow = pairs.filter((pair) => pair.change === change).every((pair) => reads(pair, shown)) && readBefore.every((pair) => reads(pair, shown));

            if (readsNow && (!apartBefore || apart(tried))) {
                return tried[change];
            }
        }
    }

    return undefined;
}

/** The colours a mode left out, from those it gave, as the page derives its own. */
function derived(given: z.infer<typeof modeSchema>): Record<ColourName, string>
{
    const goldReads = contrast(given.gold, given.panel) >= 4.5;
    const panelTwo = given["panel-2"] ?? mix(given.ink, given.panel, 0.04);
    return {
        ...Object.fromEntries(requiredColours.map((name) => [name, given[name]])) as Record<(typeof requiredColours)[number], string>,
        "panel-2": panelTwo,
        float: given.float ?? (isLight(given.panel) ? "#ffffff" : mix("#ffffff", given.panel, 0.08)),
        "gold-ink": given["gold-ink"] ?? (goldReads ? given.gold : given.accent),
        warn: given.warn ?? given["gold-ink"] ?? (goldReads ? given.gold : given.accent),
        "on-low": given["on-low"] ?? wordsOn(given.low, ["#ffffff", given["on-gold"], given.ink, given.paper]),
    };
}

/** The first of these colours that reads on the ground, text's 4.5:1, else the one that reads best: the words on a button of that colour. */
function wordsOn(ground: string, candidates: string[]): string
{
    return candidates.find((candidate) => contrast(candidate, ground) >= 4.5) ?? [...candidates].sort((a, b) => contrast(b, ground) - contrast(a, ground))[0];
}

/** What is wrong with a file a theme names, if anything: outside its folder, an address of the web, of another kind, missing, or too heavy. */
function fileProblem(folder: string, name: string, kinds: readonly string[]): string | undefined
{
    if (/^[a-z][a-z\d+.-]*:/i.test(name) || name.startsWith("//")) {
        return `"${name}" must be a file of the theme's folder, such as images/ground.svg; a theme never reaches the web`;
    }

    if (isAbsolute(name) || name.split(/[\\/]/).includes("..")) {
        return `"${name}" must be a file of the theme's folder, written from it, such as images/ground.svg`;
    }

    if (!kinds.includes(extname(name).toLowerCase())) {
        return `"${name}" must be a file ${kinds.join(", ")}`;
    }

    const path = themeFile(folder, name);

    if (path === undefined) {
        return `"${name}" is not in the theme's folder ${folder}${similar(folder, name)}`;
    }

    const size = statSync(path).size;
    return size > mostBytes ? `"${name}" weighs ${Math.round(size / 1000)} KB; a theme's file weighs at most ${mostBytes / 1000} KB` : undefined;
}

/**
 * What keeps an SVG from being drawn in one colour, as the cards' texture is, so that the page knows the colour under every word: a paint other than
 * currentColor, or what brings colours of its own, a style, a picture, foreign content, a filter, an animation that changes them.
 */
function oneColourProblems(svg: string): string[]
{
    const paints = [...svg.matchAll(/\b(fill|stroke|stop-color|flood-color|lighting-color|color)\s*(?:=\s*(["'])(.*?)\2|:\s*([^;"'}>]+))/gi)]
        .map((match) => (match[3] ?? match[4]).trim())
        .filter((paint) => !/^(currentcolor|none|inherit|transparent|url\(\s*['"]?#[^)]*\))$/i.test(paint));
    const elements = [...new Set([...svg.matchAll(/<(style|image|foreignObject|script|filter|set|animateColor|animate)\b/gi)].map((match) => match[1]))];
    return [
        ...(paints.length === 0 ? [] : [`must draw in currentColor alone, which the page paints in card-grain; it paints ${[...new Set(paints)].slice(0, 4).join(", ")}`]),
        ...(elements.length === 0 ? [] : [`must draw with shapes alone; it has ${elements.map((element) => `<${element}>`).join(", ")}`]),
    ];
}

/**
 * What a theme's own style sheet must not do: import another sheet, or name in url() what is not a picture of its folder. A help to its author, not a wall:
 * the page's content security policy keeps the sheet from reaching the web.
 */
function styleProblems(folder: string, style: string): string[]
{
    const css = withoutComments(readFileSync(join(folder, style), "utf8"));
    const imports = /@import\b/i.test(css) ? [`style: ${style} must not @import: write its rules in it, and name its pictures with url()`] : [];
    const urls = styleUrls(css).flatMap((url) => {
        const problem = urlProblem(folder, style, url);
        return problem === undefined ? [] : [`style: url(${url}) in ${style}: ${problem}`];
    });
    return [...imports, ...urls];
}

/** What is wrong with a url() of a theme's style sheet, if anything: an element of the page, as url(#glow), is fine; a file is a picture of its folder. */
function urlProblem(folder: string, style: string, url: string): string | undefined
{
    const instead = "put the picture in the theme's folder and name it from the sheet, such as images/ruled.svg";

    if (url.startsWith("#")) {
        return undefined;
    }

    if (/^data:/i.test(url)) {
        return `the page blocks a data: address; ${instead}`;
    }

    if (/^[a-z][a-z\d+.-]*:/i.test(url) || url.startsWith("//")) {
        return `a theme never reaches the web, and the page blocks it; ${instead}`;
    }

    if (url.startsWith("/")) {
        return "an address from / is the page's, not the theme's folder; write it from the sheet, such as images/ruled.svg";
    }

    const problem = fileProblem(folder, fromStyle(style, url), pictureFiles);
    return problem === undefined ? undefined : `${problem}; its url() name pictures of the theme's folder, written from the sheet`;
}

/** The files of the same folder, to say which one was meant. */
function similar(folder: string, name: string): string
{
    const place = join(folder, name.split(/[\\/]/).slice(0, -1).join(sep));

    try {
        const there = readdirSync(place);
        return there.length === 0 ? "" : `; there are ${there.sort().slice(0, 6).join(", ")}`;
    } catch {
        return "";
    }
}

/** The d of each path of an icon's SVG, joined, when it draws with paths alone on a grid of 24: no other element, a circle or a script either. */
function iconLines(svg: string): string | undefined
{
    if (otherElements(svg).length > 0) {
        return undefined;
    }

    const lines = [...svg.matchAll(/<path\b[^>]*\sd="([^"]*)"/g)].map((match) => match[1].trim());
    const valid = lines.length > 0 && lines.every((line) => /^[Mm][MmLlHhVvCcSsQqTtAaZz\d.,\s+-]*$/.test(line)) && lines.join(" ").length <= 2000;
    return valid ? lines.join(" ") : undefined;
}

/** The elements of an icon's SVG that are not its paths, the groups that hold them or its title. */
function otherElements(svg: string): string[]
{
    return [...new Set([...svg.matchAll(/<([a-zA-Z][\w:-]*)/g)].map((match) => match[1]).filter((element) => !["svg", "path", "g", "title"].includes(element)))];
}

/** A zod issue of theme.yaml as a line: where, and what to write. */
function issueText(issue: z.core.$ZodIssue): string
{
    const place = issue.path.map(String).join(".");
    const keys = issue.code === "unrecognized_keys" ? issue.keys : [];

    if (keys.length > 0) {
        return `${place === "" ? "" : `${place}: `}unknown ${keys.length === 1 ? "key" : "keys"} ${keys.map((key) => `"${key}"`).join(", ")}; see what a theme gives in the game systems' guide`;
    }

    const missing = issue.code === "invalid_type" && /received undefined/.test(issue.message);
    const said = missing ? themeModes.includes(place as ThemeModeName) ? "missing; a theme gives both the light and the dark page" : "missing" : issue.message;
    return `${place}: ${said}`;
}

function optional<Key extends string, Value>(key: Key, value: Value | undefined): { [K in Key]?: Value; }
{
    return (value === undefined ? {} : { [key]: value }) as { [K in Key]?: Value; };
}
