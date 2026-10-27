// The CSS of a theme, written by the engine alone: its faces, then one layer, theme, of custom properties and nothing else. The page's rules read them.
import type { Theme, ThemeMode, ThemeModeName, ThemeTexture } from "./theme.ts";

// What follows a theme's face, always: a Latin face has no Arabic or Japanese letters, and the page's own faces have.
const textFaces = `system-ui, -apple-system, "Segoe UI", sans-serif`;
const storyFaces = `"Palatino Linotype", Palatino, "Book Antiqua", Georgia, serif`;
const titleCases = { "as-written": "none", capitals: "uppercase", "small-capitals": "none" };

/** The CSS of a theme: its @font-face rules, then the layer theme with the values of both modes; its files at this address, such as /theme. */
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
    ];
    const modes = (["light", "dark"] as const).map((mode) => block(`:root[data-theme="${mode}"]`, [`color-scheme: ${mode};`, ...modeValues(theme, mode, at)]));
    return [...faces, `@layer theme {\n${[block(":root", common), ...modes].join("\n")}\n}`, ""].join("\n");
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
        ...(theme.ornament === undefined ? [] : [`--card-ornament: ${ornament(false)};`, `--card-ornament-mirrored: ${ornament(true)};`]),
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
