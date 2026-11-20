// The CSS of a theme, written by the engine alone: its faces, then one layer, theme, of custom properties and nothing else, which the page's rules read; and
// in the layer guarantees, the colours its focus ring and tooltip draw with.
import { mix } from "./contrast.ts";
import type { Theme, ThemeMode, ThemeModeName, ThemeTexture } from "./theme.ts";

// What follows a theme's face, always: a Latin face has no Arabic or Japanese letters, and the page's own faces have.
const textFaces = `system-ui, -apple-system, "Segoe UI", sans-serif`;
const storyFaces = `"Palatino Linotype", Palatino, "Book Antiqua", Georgia, serif`;
const titleCases = { "as-written": "none", capitals: "uppercase", "small-capitals": "none" };

// A shape as a corner: its radius and the shape CSS gives it; a cut corner is 8 px of bevel, where the browser draws one, else a round corner.
const shapeCorners = { rounded: undefined, square: ["0", "round"], pill: ["999px", "round"], cut: ["8px", "bevel"] } as const;
const cardCorners = { round: "round", cut: "bevel", notch: "notch", scoop: "scoop" } as const;

// The portraits' shapes: their corner and the rim of their glass, which is round only on a round coin.
const portraitCorners = { round: undefined, rounded: ["22%", "round"], square: ["4px", "round"], cut: ["28%", "bevel"] } as const;

// The inks the page draws on the documents' paper and the maps', as tokens.css gives them: their folds, rules and grids are a little of it on the paper the theme gives.
const documentInk = "#2f261b";
const mapInk = "#3f2f1f";

/** The CSS of a theme: its @font-face rules, the layer theme with the values of both modes, the colours of the guarantees; its files at this address, such as /theme. */
export function themeCss(theme: Theme, address: string): string
{
    const at = (file: string): string => `${address}/${file.split("/").map(encodeURIComponent).join("/")}`;
    const faces = theme.fonts.map((font) => `@font-face { font-family: "${font.family}"; src: url("${at(font.file)}"); font-weight: ${font.weight}; font-display: swap; }`);
    const common = [
        ...face("--font", theme.textFont, textFaces),
        ...face("--title-font", theme.titleFont, textFaces),
        ...face("--serif", theme.storyFont, storyFaces),
        `--number-font: ${theme.numberFont === "title" ? "var(--title-font)" : "var(--font)"};`,
        ...corners(theme.corners),
        ...(theme.titleCase === undefined ? [] : [`--title-case: ${titleCases[theme.titleCase]};`, `--title-variant: ${theme.titleCase === "small-capitals" ? "small-caps" : "normal"};`]),
        ...(theme.titleSpacing === undefined ? [] : [`--title-spacing: ${theme.titleSpacing}em;`]),
        ...(theme.innerLine === undefined ? [] : [`--card-inner-line: ${theme.innerLine};`]),
        ...(theme.cardCorner === undefined || theme.cardCorner === "round" ? [] : [`--card-corner: ${cardCorners[theme.cardCorner]};`]),
        ...shape("--button", theme.buttonShape),
        ...tabs(theme.tabShape),
        ...papers(theme.papers),
        ...portraits(theme),
    ];
    const modes = (["light", "dark"] as const).map((mode) => block(`:root[data-theme="${mode}"]`, [`color-scheme: ${mode};`, ...modeValues(theme, mode, at)]));
    return [...faces, `@layer theme {\n${[block(":root", common), ...modes].join("\n")}\n}`, `@layer guarantees {\n${guarded(theme).join("\n")}\n}`, ""].join("\n");
}

/**
 * The colours the focus ring and the tooltip draw with, the theme's, in the layer guarantees: on every element and !important, as guarantees.css sets the
 * page's own, so that no rule of a theme's own style sheet changes them (D-575).
 */
function guarded(theme: Theme): string[]
{
    return (["light", "dark"] as const).map((mode) => {
        const colours = theme.modes[mode].colours;
        const values = { accent: colours.accent, ink: colours.ink, paper: colours.paper, gold: colours.gold };
        return block(`:root[data-theme="${mode}"], :root[data-theme="${mode}"] *`, Object.entries(values).map(([name, value]) => `--guard-${name}: ${value} !important;`));
    });
}

function modeValues(theme: Theme, mode: ThemeModeName, at: (file: string) => string): string[]
{
    const given: ThemeMode = theme.modes[mode];
    const ornament = (mirrored: boolean): string => `url("${at(theme.ornament ?? "")}?ink=${encodeURIComponent(given.cardEdge)}${mirrored ? "&mirrored" : ""}")`;
    return [
        ...Object.entries(given.colours).map(([name, value]) => `--${name}: ${value};`),
        `--cell: color-mix(in srgb, var(--ink) 6%, var(--panel));`,
        `--glow: color-mix(in srgb, ${given.colours.accent} ${mode === "light" ? 10 : 22}%, transparent);`,
        // The dice and the coins of the set Theme: the strong colour, with its text for their numbers.
        `--dice-body: ${given.colours.gold};`,
        `--dice-ink: ${given.colours["on-gold"]};`,
        `--card-edge: ${given.cardEdge};`,
        ...(given.titleGlow === undefined ? [] : [`--title-glow: 0 0 1px ${given.titleGlow}, 0 0 9px color-mix(in srgb, ${given.titleGlow} 70%, transparent);`]),
        ...(given.barEdge === undefined ? [] : [`--bar-edge: ${given.barEdge};`]),
        ...texture("--page-texture", given.pageTexture, at),
        ...texture("--bar-texture", given.barTexture, at),
        ...texture("--head-picture", given.headPicture, at),
        ...(given.headPicture === undefined ? [] : [`--head-picture-shown: "";`]),
        ...(theme.ornament === undefined ? [] : [`--card-ornament: ${ornament(false)};`, `--card-ornament-mirrored: ${ornament(true)};`]),
        ...cardTexture(theme.cardTexture, given.cardGrain, at),
        ...shadows(theme.shadows, given, mode),
        ...(theme.portraitFrame === undefined || theme.portraitFrame === "none" ? [] : [`--portrait-frame: ${frame(theme.portraitFrame, given.portraitFrame)};`]),
    ];
}

function face(token: string, family: string | undefined, after: string): string[]
{
    return family === undefined ? [] : [`${token}: "${family}", ${after};`];
}

/** The page's scale of corners, from a card's: a tooltip's a third of it, a button's half, a chip's two thirds, the banner's a third more. */
function corners(card: number | undefined): string[]
{
    if (card === undefined) {
        return [];
    }

    const scale = { xs: card / 3, s: card / 2, m: (card * 2) / 3, l: card, xl: (card * 4) / 3 };
    return Object.entries(scale).map(([step, value]) => `--radius-${step}: ${Math.round(value)}px;`);
}

/** The corner of a kind of control, the page's own while the theme leaves it rounded. */
function shape(token: string, given: Theme["buttonShape"]): string[]
{
    const corner = given === undefined ? undefined : shapeCorners[given];
    return corner === undefined ? [] : [`${token}-radius: ${corner[0]};`, `${token}-corner: ${corner[1]};`];
}

/** The chosen tab: the page's bar under it, or a tint of the accent over the page, in the shape asked. */
function tabs(given: Theme["tabShape"]): string[]
{
    if (given === undefined || given === "underline") {
        return [];
    }

    const corner = shapeCorners[given] ?? ["var(--radius-m)", "round"];
    return [`--tab-radius: ${corner[0]};`, `--tab-corner: ${corner[1]};`, `--tab-chosen: color-mix(in srgb, var(--accent) 16%, var(--paper));`, `--tab-bar: transparent;`];
}

/** The paper of the documents, with its folds and rules drawn of its ink; and the land of the maps, a place's floor and grid and the world's fog drawn of it. */
function papers(given: Theme["papers"]): string[]
{
    return [
        ...(given.documents === undefined ? [] : [`--doc-paper: ${given.documents};`, `--doc-fold: ${mix(documentInk, given.documents, 0.12)};`, `--doc-rule: ${mix(documentInk, given.documents, 0.3)};`]),
        ...(given.maps === undefined
            ? []
            : [`--m-land: ${given.maps};`, `--map-paper: ${given.maps};`, `--map-floor: ${mix("#ffffff", given.maps, 0.3)};`, `--map-grid: ${mix(mapInk, given.maps, 0.2)};`, `--map-fog: ${mix(mapInk, given.maps, 0.15)};`]),
    ];
}

/** The portraits' corner and their glass's rim, which only a round coin has. */
function portraits(theme: Theme): string[]
{
    const corner = theme.portraitShape === undefined ? undefined : portraitCorners[theme.portraitShape];
    return corner === undefined ? [] : [`--portrait-radius: ${corner[0]};`, `--portrait-corner: ${corner[1]};`, `--portrait-rim: linear-gradient(transparent, transparent);`];
}

/** A frame inside a portrait's edge, over the picture: one line, a thick one, or two with a dark line between them. */
function frame(kind: "thin" | "thick" | "double", colour: string): string
{
    return {
        thin: `inset 0 0 0 2px ${colour}`,
        thick: `inset 0 0 0 4px ${colour}`,
        double: `inset 0 0 0 1.5px ${colour}, inset 0 0 0 3px rgb(0 0 0 / 0.55), inset 0 0 0 4.5px ${colour}`,
    }[kind];
}

/** The cards' texture, drawn by the page in the grain's colour, faint under the card's own colour: 30% where it is thickest, which the check measures. */
function cardTexture(given: ThemeTexture | undefined, grain: string, at: (file: string) => string): string[]
{
    if (given === undefined) {
        return [];
    }

    const veil = "linear-gradient(color-mix(in srgb, var(--panel) 70%, transparent), color-mix(in srgb, var(--panel) 70%, transparent))";
    const place = given.fit === "cover" ? "center / cover no-repeat" : "0 0 / auto repeat";
    return [`--card-texture-layer: ${veil}, url("${at(given.picture)}?ink=${encodeURIComponent(grain)}&texture") ${place};`];
}

/**
 * The shadows of whatever lifts, of the colour the mode gives or the page's: soft as the page's own, sharp as a cut-out laid on the page, none, or a glow
 * all round; what lifts most, what floats, the most.
 */
function shadows(kind: Theme["shadows"], given: ThemeMode, mode: ThemeModeName): string[]
{
    if (kind === undefined || (kind === "soft" && given.shadow === undefined)) {
        return [];
    }

    const colour = given.shadow ?? (kind === "glow" ? given.colours.accent : mode === "light" ? "#182c4c" : "#000000");
    const of = (share: number): string => `color-mix(in srgb, ${colour} ${share}%, transparent)`;
    const shadow = {
        soft: {
            lift: `0 1px 2px ${of(mode === "light" ? 8 : 30)}${mode === "light" ? "" : ", inset 0 1px 0 rgb(255 255 255 / 0.05)"}`,
            raise: `0 6px 18px -10px ${of(mode === "light" ? 35 : 60)}`,
            up: `0 -6px 18px -12px ${of(35)}`,
            overlay: `0 14px 32px -12px ${of(45)}, 0 3px 8px -3px ${of(25)}`,
        },
        sharp: { lift: `1px 1px 0 ${of(30)}`, raise: `3px 3px 0 ${of(22)}`, up: `0 -3px 0 ${of(22)}`, overlay: `5px 5px 0 ${of(35)}` },
        none: { lift: "0 0 0 transparent", raise: "0 0 0 transparent", up: "0 0 0 transparent", overlay: "0 0 0 transparent" },
        glow: { lift: `0 0 0 1px ${of(18)}`, raise: `0 0 16px -4px ${of(55)}`, up: `0 -4px 16px -6px ${of(45)}`, overlay: `0 0 28px -6px ${of(65)}, 0 0 0 1px ${of(35)}` },
    }[kind];
    return [`--lift: ${shadow.lift};`, `--raise: ${shadow.raise};`, `--raise-up: ${shadow.up};`, `--overlay: ${shadow.overlay};`];
}

function texture(token: string, given: ThemeTexture | undefined, at: (file: string) => string): string[]
{
    if (given === undefined) {
        return [];
    }

    return [`${token}: url("${at(given.picture)}");`, `${token}-size: ${given.fit === "cover" ? "cover" : "auto"};`, `${token}-repeat: ${given.fit === "cover" ? "no-repeat" : "repeat"};`];
}

function block(selector: string, lines: string[]): string
{
    return `    ${selector} {\n${lines.map((line) => `        ${line}`).join("\n")}\n    }`;
}
