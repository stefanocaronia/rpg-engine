// The dashboard's themes (D-527, D-528): a game system's folder of data, read and checked as the engine reads the system, its CSS of custom properties written
// by the engine; validate and the dashboard's server, on the fake system's theme and on copies of it made wrong.
import { cpSync, mkdirSync, readFileSync, symlinkSync, writeFileSync } from "node:fs";
import { request } from "node:http";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { beforeEach, describe, expect, it } from "vitest";
import { runCommandLine } from "../src/cli/command-line.ts";
import type { Context } from "../src/core/context.ts";
import { SessionStore } from "../src/core/session-store.ts";
import { startDashboard } from "../src/server/dashboard/index.ts";
import { contrast, drawnOrnament, drawnTexture, readTheme, themeCss, themeFile, themeFilesNamed, themeIconNames } from "../src/themes/index.ts";
import { inPlay, makeTempFolder, testContext } from "./support.ts";

const fake = fileURLToPath(new URL("./systems/fake", import.meta.url));
const fakeTheme = join(fake, "theme");

/** A copy of the fake system's theme, its theme.yaml changed by this function, and files added by path; the folder. */
function themeLike(change: (yaml: string) => string, files: Record<string, string | Uint8Array> = {}): string
{
    const folder = join(makeTempFolder(), "theme");
    cpSync(fakeTheme, folder, { recursive: true });
    writeFileSync(join(folder, "theme.yaml"), change(readFileSync(join(fakeTheme, "theme.yaml"), "utf8")));

    for (const [path, content] of Object.entries(files)) {
        mkdirSync(join(folder, path, ".."), { recursive: true });
        writeFileSync(join(folder, path), content);
    }

    return folder;
}

describe("a theme as the engine reads it", () => {
    it("reads the fake system's, its icons as lines and the colours it left out derived", () => {
        const { theme, problems } = readTheme(fakeTheme);
        expect(problems).toEqual([]);
        expect(theme).toMatchObject({ name: "Ledger", corners: 4, titleCase: "small-capitals", titleSpacing: 0.02, innerLine: "dashed", ornament: "images/corner.svg" });
        expect(theme?.icons).toEqual({ party: "M5 4h14v16H5Z M9 9h6 M9 13h6" });
        expect(theme?.modes.light.colours).toMatchObject({ paper: "#efeee6", "gold-ink": "#2d5a3a", "on-low": "#ffffff" });
        expect(theme?.modes.light.cardEdge).toBe("#cfcbbb");
        expect(theme?.modes.dark.titleGlow).toBe("#2d5a3a");
    });

    it("reads the lowest rpg-engine it asks, which its install checks", () => {
        const { problems } = readTheme(themeLike((yaml) => yaml.replace("name: Ledger", 'name: Ledger\nversion: 1.1.0\nengine: "0.22"')));
        expect(problems).toEqual([]);
        const unquoted = readTheme(themeLike((yaml) => yaml.replace("name: Ledger", "name: Ledger\nengine: 0.30")));
        expect(unquoted.problems.join(" ")).toContain('engine: "0.22"');
        const range = readTheme(themeLike((yaml) => yaml.replace("name: Ledger", 'name: Ledger\nengine: ">=0.22"')));
        expect(range.problems.join(" ")).toContain("not a range");
    });

    it("writes faces, then one layer of custom properties and nothing else, both modes by data-theme, its files at the address given", () => {
        const folder = themeLike((yaml) => yaml.replace("name: Ledger", "name: Ledger\nfonts:\n  - {family: Plain Sans, file: fonts/plain.woff2, weight: 100 900, license: fonts/OFL.txt}\ntitle-font: Plain Sans"), {
            "fonts/plain.woff2": new Uint8Array([0x77, 0x4f, 0x46, 0x32]),
            "fonts/OFL.txt": "SIL Open Font License 1.1",
        });
        const { theme } = readTheme(folder);
        const css = themeCss(theme!, "/theme");
        const [faces, rest] = css.split("@layer theme {");
        const [layer, guarded] = rest.split("@layer guarantees {");
        expect(faces.trim()).toBe('@font-face { font-family: "Plain Sans"; src: url("/theme/fonts/plain.woff2"); font-weight: 100 900; font-display: swap; }');
        expect(layer.match(/^ {4}\S.*\{$/gm)).toEqual([":root {", ':root[data-theme="light"] {', ':root[data-theme="dark"] {'].map((selector) => `    ${selector}`));
        // Inside the blocks, custom properties alone, and the scheme of colours of each mode.
        expect(layer.split("\n").filter((line) => line.startsWith("        ")).every((line) => /^ {8}(--[a-z0-9-]+|color-scheme): [^;{}]+;$/.test(line))).toBe(true);
        expect(css).toContain('--title-font: "Plain Sans", system-ui, -apple-system, "Segoe UI", sans-serif;');
        expect(css).toContain("--title-variant: small-caps;");
        expect(css).toContain('--page-texture: url("/theme/images/ruled.svg");');
        expect(css).toContain('--card-ornament: url("/theme/images/corner.svg?ink=%23cfcbbb");');
        expect(css).toContain('--card-ornament-mirrored: url("/theme/images/corner.svg?ink=%2333402f&mirrored");');
        expect(css).toContain("--dice-body: #9fd3a8;");
        // Then the colours the focus ring and the tooltip draw with, on every element and !important, which a theme's own style sheet cannot change (D-575).
        expect(guarded.match(/^ {4}\S.*\{$/gm)).toEqual(['    :root[data-theme="light"], :root[data-theme="light"] * {', '    :root[data-theme="dark"], :root[data-theme="dark"] * {']);
        expect(guarded.split("\n").filter((line) => line.startsWith("        ")).every((line) => /^ {8}--guard-[a-z]+: #[0-9a-f]{6} !important;$/.test(line))).toBe(true);
        expect(guarded).toContain(`--guard-accent: ${theme!.modes.dark.colours.accent} !important;`);
        expect(guarded).toContain(`--guard-ink: ${theme!.modes.light.colours.ink} !important;`);
    });

    it("keeps in the guarantees no value a theme's own style sheet could change: their colours their own, on every element, the tooltip's place set inline", () => {
        const style = (file: string): string => readFileSync(fileURLToPath(new URL(`../src/dashboard/style/${file}`, import.meta.url)), "utf8").replace(/\r\n/g, "\n");
        const guarantees = style("guarantees.css");
        const read = [...new Set([...guarantees.matchAll(/var\((--[a-z0-9-]+)/g)].map((match) => match[1]))];
        expect(read.filter((name) => !name.startsWith("--guard-"))).toEqual([]);

        for (const mode of ["light", "dark"]) {
            expect(guarantees).toContain(`:root[data-theme="${mode}"],\n    :root[data-theme="${mode}"] * {`);
        }

        // Their colours registered by the page, outside every layer, after the imports: an @property of the layer theme-style cannot make them invalid.
        const index = style("index.css");
        const lastImport = index.lastIndexOf("@import ");
        const guards = [...new Set([...guarantees.matchAll(/(--guard-[a-z]+):/g)].map((match) => match[1]))];
        expect(guards.length).toBeGreaterThan(0);

        for (const name of guards) {
            const at = index.indexOf(`\n@property ${name} {\n    syntax: "<color>";\n    inherits: true;\n    initial-value: #`);
            expect(at, name).toBeGreaterThan(lastImport);
            expect(index.slice(0, at).split("{").length, `${name} outside every block`).toBe(index.slice(0, at).split("}").length);
        }

        // The tooltip open: every property first to its initial value, then the page's; its pseudo-elements put out; no matter what a sheet says of it.
        const open = guarantees.match(/\n {4}\.page-tip:is\(:popover-open, :not\(\[popover\], \[hidden\]\)\) \{\n([^}]*)\}/)?.[1] ?? "";
        expect(open.trimStart().startsWith("all: initial !important;")).toBe(true);

        for (const property of ["display", "position", "inset", "background", "color", "font", "opacity", "transition", "scale", "translate", "rotate", "zoom"]) {
            expect(open, property).toMatch(new RegExp(`\\n {8}${property}: [^;]+ !important;`));
        }

        expect(guarantees).toMatch(/\.page-tip::before,\n {4}\.page-tip::after,\n {4}\.page-tip::backdrop \{\n {8}all: initial !important;\n {8}display: none !important;/);
        expect(guarantees).toMatch(/\.page-tip::first-line,\n {4}\.page-tip::first-letter \{\n {8}all: unset !important;/);

        const tooltip = readFileSync(fileURLToPath(new URL("../src/dashboard/shell/tooltip.ts", import.meta.url)), "utf8");
        expect(tooltip.match(/style\.setProperty\("(left|top)", [^;]+, "important"\)/g)).toHaveLength(2);
        expect(tooltip).not.toContain("--tip-");
    });

    it("refuses a theme with what to fix, each a line, and gives none (D-528 (1), (3))", () => {
        const cases: [string, (yaml: string) => string, string, Record<string, string | Uint8Array>?][] = [
            ["the dark mode left out", (yaml) => yaml.slice(0, yaml.indexOf("dark:")), "dark: missing; a theme gives both the light and the dark page"],
            ["a key it does not know", (yaml) => yaml.replace("cards:\n", "cards:\n  shadow: big\n"), 'cards: unknown key "shadow"; see what a theme gives in the game systems\' guide'],
            ["a colour not written #rrggbb", (yaml) => yaml.replace('paper: "#efeee6"', "paper: beige"), "light.paper: write it as #rrggbb"],
            [
                "an address of the web",
                (yaml) => yaml.replace("ornament: images/corner.svg", "ornament: https://example.com/corner.svg"),
                'cards.ornament: "https://example.com/corner.svg" must be a file of the theme\'s folder, such as images/ground.svg; a theme never reaches the web',
            ],
            [
                "a file outside its folder",
                (yaml) => yaml.replace("ornament: images/corner.svg", "ornament: ../system.yaml"),
                'cards.ornament: "../system.yaml" must be a file of the theme\'s folder, written from it, such as images/ground.svg',
            ],
            ["a file it does not have", (yaml) => yaml.replace("ornament: images/corner.svg", "ornament: images/thorn.svg"), 'cards.ornament: "images/thorn.svg" is not in the theme\'s folder'],
            ["a picture of another kind", (yaml) => yaml.replace("ruled.svg", "ruled.gif"), 'light.page-texture.picture: "images/ruled.gif" must be a file .svg, .png, .webp, .jpg, .jpeg'],
            [
                "a face without its license",
                (yaml) => yaml.replace("name: Ledger", "name: Ledger\nfonts:\n  - {family: Plain, file: fonts/plain.ttf, license: fonts/LICENSE.txt}"),
                'fonts.0.license: "fonts/LICENSE.txt" is not in the theme\'s folder',
                { "fonts/plain.ttf": "font" },
            ],
            [
                "a face it does not bring",
                (yaml) => yaml.replace("name: Ledger", "name: Ledger\ntext-font: Garamond"),
                'text-font: "Garamond" is none of the theme\'s fonts; add it to fonts with its file and license, or name one of none yet',
            ],
            ["an icon the page has not", (yaml) => yaml.replace("party: icons/party.svg", "dragon: icons/party.svg"), "icons.dragon: the page has no icon of that name"],
            [
                "an icon with a script among its paths",
                (yaml) => yaml,
                "icons.party: icons/party.svg must draw with paths alone, each a d of letters and numbers on a grid of 24, as M4 12h16; it has <script>",
                { "icons/party.svg": '<svg viewBox="0 0 24 24"><path d="M1 1h2"/><script>alert(1)</script><path d="M3 3h4"/></svg>' },
            ],
            [
                "an icon that draws a circle",
                (yaml) => yaml,
                "icons.party: icons/party.svg must draw with paths alone, each a d of letters and numbers on a grid of 24, as M4 12h16; it has <circle>",
                { "icons/party.svg": '<svg viewBox="0 0 24 24"><path d="M1 1h2"/><circle cx="12" cy="12" r="4"/></svg>' },
            ],
            ["a file named with other capitals than the disk's", (yaml) => yaml.replace("ornament: images/corner.svg", "ornament: Images/Corner.svg"), 'cards.ornament: "Images/Corner.svg" is not in the theme\'s folder'],
            ["a danger's button whose words do not read", (yaml) => yaml.replace('low: "#ff9a80"', 'low: "#ff9a80"\n  on-low: "#ffffff"'), "dark: on-low #ffffff does not read: on low #ff9a80 is 2.06:1, the page needs 4.5:1; "],
            ["a file over a megabyte", (yaml) => yaml, 'light.page-texture.picture: "images/ruled.svg" weighs 1001 KB; a theme\'s file weighs at most 1000 KB', { "images/ruled.svg": "x".repeat(1_001_000) }],
            [
                "muted text that does not read on the cards",
                (yaml) => yaml.replace('muted: "#a9b3a0"', 'muted: "#4a5245"'),
                "dark: muted #4a5245 does not read: on panel #18201a is 2.05:1, on cell #252c26 is 1.76:1, chip-muted on chip #354337 is 2.60:1, the page needs 4.5:1; ",
            ],
            ["a focus ring that does not show on the page", (yaml) => yaml.replace('accent: "#2d5a3a"', 'accent: "#c9d3c0"'), "light: accent #c9d3c0 does not read: on panel"],
            ["friends and foes alike", (yaml) => yaml.replace('low: "#ff9a80"', 'low: "#9fd3a9"'), "dark: ally #9fd3a8 and low #9fd3a9 are too alike; friends and foes must not look the same"],
        ];

        for (const [what, change, said, files] of cases) {
            const reading = readTheme(themeLike(change, files));
            expect(reading.theme, what).toBeUndefined();
            expect(reading.problems.some((problem) => problem.startsWith(said)), `${what}: ${reading.problems.join(" | ")}`).toBe(true);
        }
    });

    it("says to change a ground when no one colour reads on all it sits on", () => {
        const problems = readTheme(themeLike((yaml) => yaml.replace('panel: "#18201a"', 'panel: "#5ede61"'))).problems;
        expect(problems.find((problem) => problem.startsWith("dark: ink #eef0e6 does not read: on panel #5ede61"))).toMatch(/; no one colour reads on paper and panel and float as they are: change one of those$/);
    });

    it("offers, on themes made at random, colours that read and leave the rest reading once written", () => {
        let seed = 7;
        const random = (): number => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;
        const hex = (): string => `#${[0, 1, 2].map(() => Math.floor(random() * 256).toString(16).padStart(2, "0")).join("")}`;

        const written = (yaml: string, mode: string, token: string, value: string): string => {
            const [before, after] = [yaml.slice(0, yaml.indexOf("dark:")), yaml.slice(yaml.indexOf("dark:"))];
            const own = mode === "light" ? before : after;
            const line = new RegExp(`^  ${token}: .*$`, "m");
            const changed = line.test(own) ? own.replace(line, `  ${token}: "${value}"`) : own.replace(`${mode}:\n`, `${mode}:\n  ${token}: "${value}"\n`);
            return mode === "light" ? changed + after : before + changed;
        };

        let offers = 0;

        for (let round = 0; round < 40; round++) {
            let yaml = readFileSync(join(fakeTheme, "theme.yaml"), "utf8");

            for (const token of ["muted", "accent", "card-edge", "on-low"]) {
                yaml = written(yaml, random() < 0.5 ? "light" : "dark", token, hex());
            }

            for (const problem of readTheme(themeLike(() => yaml)).problems) {
                const offer = /^(light|dark): ([a-z-]+) #[0-9a-f]{6} does not read: .*; (#[0-9a-f]{6}) would do$/.exec(problem);

                if (offer === null) {
                    continue;
                }

                const [, mode, token, colour] = offer;
                const tokens = (problems: string[]): string[] => problems.flatMap((one) => /^(light|dark): ([a-z-]+) #/.exec(one)?.slice(1, 3).join(" ") ?? []);
                const before = tokens(readTheme(themeLike(() => yaml)).problems);
                const after = tokens(readTheme(themeLike(() => written(yaml, mode, token, colour))).problems);
                expect(after, `${problem} → ${after.join(", ")}`).not.toContain(`${mode} ${token}`);
                expect(after.every((one) => before.includes(one)), `${problem} → ${after.join(", ")}`).toBe(true);
                offers++;
            }
        }

        expect(offers).toBeGreaterThan(20);
    });

    it("offers, for a pair that does not read, the nearest colour that does", () => {
        const problems = readTheme(themeLike((yaml) => yaml.replace('muted: "#a9b3a0"', 'muted: "#4a5245"'))).problems;
        expect(problems).toHaveLength(1);
        const offered = /(#[0-9a-f]{6}) would do$/.exec(problems[0])?.[1] ?? "";
        expect(contrast(offered, "#18201a")).toBeGreaterThanOrEqual(4.5);
        expect(readTheme(themeLike((yaml) => yaml.replace('muted: "#a9b3a0"', `muted: "${offered}"`))).problems).toEqual([]);
    });

    it("gives a file only from inside the folder, and the ornament in a colour, turned right to left", () => {
        expect(themeFile(fakeTheme, "images/corner.svg")).toBe(join(fakeTheme, "images", "corner.svg"));
        expect(themeFile(fakeTheme, "../system.yaml")).toBeUndefined();
        expect(themeFile(fakeTheme, "IMAGES/corner.svg")).toBeUndefined();
        // A junction inside the folder that leads out of it.
        const folder = themeLike((yaml) => yaml);
        const outside = makeTempFolder();
        writeFileSync(join(outside, "secret.svg"), "<svg/>");
        symlinkSync(outside, join(folder, "images", "out"), "junction");
        expect(themeFile(folder, "images/out/secret.svg")).toBeUndefined();
        expect(themeFile(fakeTheme, "images")).toBeUndefined();
        const drawing = readFileSync(join(fakeTheme, "images", "corner.svg"), "utf8");
        expect(drawnOrnament(drawing, "#123456", false)).toContain('stroke="#123456"');
        expect(drawnOrnament(drawing, "#123456", true)).toContain('<g transform="translate(24 0) scale(-1 1)"><path d="M22 8v14H8"/></g></svg>');
    });
});

describe("the hooks a theme may give beyond colours and faces (D-575)", () => {
    const grain = '<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 12 12"><path d="M0 0h1v1H0Z" fill="currentColor"/></svg>';
    const hooked = (yaml: string): string =>
        yaml
            .replace("cards:\n  inner-line: dashed\n", "cards:\n  inner-line: dashed\n  corner: cut\n  texture: {picture: images/grain.svg}\n")
            .replace("name: Ledger", 'name: Ledger\nbuttons: {shape: pill}\ntabs: {shape: cut}\nshadows: sharp\npapers: {maps: "#eef0e4", documents: "#f3f0e2"}\nportraits: {shape: square, frame: double}\nstyle: style.css')
            .replace(
                "  page-texture: {picture: images/ruled.svg, fit: tile}",
                '  page-texture: {picture: images/ruled.svg, fit: tile}\n  head-picture: {picture: images/ruled.svg}\n  card-grain: "#d9d4c0"\n  shadow: "#2d5a3a"\n  portrait-frame: "#2d5a3a"',
            );
    const files = { "images/grain.svg": grain, "style.css": ".band h2 { letter-spacing: 0.1em; background: url(images/ruled.svg); }\n" };

    it("reads them, and writes each as custom properties of the layer theme alone", () => {
        const { theme, problems } = readTheme(themeLike(hooked, files));
        expect(problems).toEqual([]);
        expect(theme).toMatchObject({ buttonShape: "pill", tabShape: "cut", cardCorner: "cut", cardTexture: { picture: "images/grain.svg", fit: "tile" }, shadows: "sharp", style: "style.css" });
        expect(theme).toMatchObject({ papers: { maps: "#eef0e4", documents: "#f3f0e2" }, portraitShape: "square", portraitFrame: "double" });
        expect(theme?.modes.light).toMatchObject({ cardGrain: "#d9d4c0", shadow: "#2d5a3a", portraitFrame: "#2d5a3a", headPicture: { picture: "images/ruled.svg", fit: "cover" } });
        // What the dark mode left out: the grain in the cards' edge, the frame in the strong colour, the page's shadows' colour.
        expect(theme?.modes.dark).toMatchObject({ cardGrain: "#33402f", portraitFrame: "#9fd3a8" });
        expect(theme?.modes.dark.shadow).toBeUndefined();

        const css = themeCss(theme!, "/theme");
        const layer = css.slice(css.indexOf("@layer theme {"));
        expect(layer.split("\n").filter((line) => line.startsWith("        ")).every((line) => /^ {8}(--[a-z0-9-]+|color-scheme): [^;{}]+;$/.test(line))).toBe(true);

        for (
            const line of [
                "--button-radius: 999px;",
                "--button-corner: round;",
                "--tab-radius: 8px;",
                "--tab-corner: bevel;",
                "--tab-chosen: color-mix(in srgb, var(--accent) 16%, var(--paper));",
                "--card-corner: bevel;",
                "--doc-paper: #f3f0e2;",
                "--m-land: #eef0e4;",
                "--portrait-radius: 4px;",
                "--portrait-rim: linear-gradient(transparent, transparent);",
                '--head-picture: url("/theme/images/ruled.svg");',
                '--head-picture-shown: "";',
                '--card-texture-layer: linear-gradient(color-mix(in srgb, var(--panel) 70%, transparent), color-mix(in srgb, var(--panel) 70%, transparent)), url("/theme/images/grain.svg?ink=%23d9d4c0&texture") 0 0 / auto repeat;',
                "--lift: 1px 1px 0 color-mix(in srgb, #2d5a3a 30%, transparent);",
                "--portrait-frame: inset 0 0 0 1.5px #2d5a3a, inset 0 0 0 3px rgb(0 0 0 / 0.55), inset 0 0 0 4.5px #2d5a3a;",
            ]
        ) {
            expect(css, line).toContain(line);
        }

        // The style sheet is no part of the CSS the engine writes: the page adds it by itself.
        expect(css).not.toContain("letter-spacing");
    });

    it("writes none of them for a theme that gives none, which looks as it did", () => {
        const css = themeCss(readTheme(fakeTheme).theme!, "/theme");

        for (const token of ["--button-", "--tab-", "--card-corner", "--card-texture-layer", "--head-picture", "--lift", "--raise", "--overlay", "--doc-", "--m-land", "--map-", "--portrait-"]) {
            expect(css, token).not.toContain(token);
        }
    });

    it("writes each kind of shadow, and none at all as shadows that cast nothing", () => {
        const of = (kind: string): string => themeCss(readTheme(themeLike((yaml) => yaml.replace("name: Ledger", `name: Ledger\nshadows: ${kind}`))).theme!, "/theme");
        expect(of("none")).toContain("--overlay: 0 0 0 transparent;");
        expect(of("glow")).toContain("--raise: 0 0 16px -4px color-mix(in srgb, #2d5a3a 55%, transparent);");
        // Soft with no colour of its own is the page's own.
        expect(of("soft")).not.toContain("--lift");
    });

    it("refuses what would break the page's reading, each with what to fix", () => {
        const cases: [string, (yaml: string) => string, string, Record<string, string>?][] = [
            ["a shape it does not know", (yaml) => yaml.replace("name: Ledger", "name: Ledger\nbuttons: {shape: round}"), "buttons.shape: "],
            ["a texture that is no SVG", (yaml) => hooked(yaml).replace("images/grain.svg", "images/grain.png"), 'cards.texture.picture: "images/grain.png" must be a file .svg', { ...files, "images/grain.png": "png" }],
            [
                "a texture with colours of its own",
                hooked,
                "cards.texture.picture: images/grain.svg must draw in currentColor alone, which the page paints in card-grain; it paints #000",
                { ...files, "images/grain.svg": '<svg viewBox="0 0 4 4"><path d="M0 0h1v1H0Z" style="fill:#000"/></svg>' },
            ],
            [
                "a texture with a picture in it",
                hooked,
                "cards.texture.picture: images/grain.svg must draw with shapes alone; it has <image>",
                { ...files, "images/grain.svg": '<svg viewBox="0 0 4 4"><image href="photo.png"/></svg>' },
            ],
            ["a grain that muddies the cards' words", (yaml) => hooked(yaml).replace('card-grain: "#d9d4c0"', 'card-grain: "#1f2a1f"'), "light: card-grain #1f2a1f does not read: muted on grain", files],
            ["a chosen tab whose accent does not read on its tint", (yaml) => hooked(yaml).replace('accent: "#9fd3a8"', 'accent: "#5f9a6a"'), "dark: accent #5f9a6a does not read:", files],
            ["a documents' paper too dark for their ink", (yaml) => hooked(yaml).replace('documents: "#f3f0e2"', 'documents: "#6b6455"'), "papers.documents #6b6455 does not read: the documents' ink #2f261b on it is", files],
            ["a portrait frame that looks like a foe's ring", (yaml) => hooked(yaml).replace('portrait-frame: "#2d5a3a"', 'portrait-frame: "#a5321f"'), "light: portrait-frame #a5321f and low #a3331f are too alike", files],
            ["a style sheet that imports another", hooked, "style: style.css must not @import", { ...files, "style.css": '@import "other.css";\n.band { color: red; }' }],
            ["a style sheet that reaches the web", hooked, "style: url(https://example.com/a.png) in style.css: a theme never reaches the web", { ...files, "style.css": ".band { background: url(https://example.com/a.png); }" }],
            ["a style sheet that climbs out of its folder", hooked, 'style: url(../../system.yaml) in style.css: "../../system.yaml" must be a file of the theme\'s folder', {
                ...files,
                "style.css": ".band { background: url('../../system.yaml'); }",
            }],
            ["a style sheet's picture it does not have", hooked, 'style: url(images/none.png) in style.css: "images/none.png" is not in the theme\'s folder', { ...files, "style.css": '.band { background: url("images/none.png"); }' }],
            ["a style sheet's face, which goes in fonts with its licence", hooked, "style: url(face.woff2) in style.css: ", { ...files, "style.css": "@font-face { font-family: X; src: url(face.woff2); }", "face.woff2": "x" }],
            ["a style sheet that is no CSS", (yaml) => hooked(yaml).replace("style: style.css", "style: style.txt"), 'style: "style.txt" must be a file .css', { ...files, "style.txt": "" }],
            [
                "a style sheet that names the page's own files",
                hooked,
                "style: url(/images/ruled.svg) in style.css: an address from / is the page's, not the theme's folder; write it from the sheet, such as images/ruled.svg",
                { ...files, "style.css": ".band { background: url(/images/ruled.svg); }" },
            ],
            [
                "a style sheet with a picture written in it",
                hooked,
                "style: url(data:image/svg+xml,<svg/>) in style.css: the page blocks a data: address; put the picture in the theme's folder",
                { ...files, "style.css": '.band { background: url("data:image/svg+xml,<svg/>"); }' },
            ],
            [
                "a texture that changes its colour as it is drawn",
                hooked,
                "cards.texture.picture: images/grain.svg must draw with shapes alone; it has <set>, <animate>",
                { ...files, "images/grain.svg": '<svg viewBox="0 0 4 4"><path d="M0 0h1"><set attributeName="fill" to="#ff0000"/><animate attributeName="fill" values="red;blue"/></path></svg>' },
            ],
            [
                "a maps' paper on which the regions' names do not read",
                (yaml) => hooked(yaml).replace('maps: "#eef0e4"', 'maps: "#a4a4a4"'),
                "papers.maps #a4a4a4 does not read: the regions' names #5a3f4f on it is 3.73:1, the page needs 4.5:1, the rivers #3a6d96 on it is 2.21:1, the page needs 3:1, the party's trail",
                files,
            ],
        ];

        for (const [what, change, said, given] of cases) {
            const reading = readTheme(themeLike(change, given));
            expect(reading.theme, what).toBeUndefined();
            expect(reading.problems.some((problem) => problem.startsWith(said)), `${what}: ${reading.problems.join(" | ")}`).toBe(true);
        }
    });

    it("takes a style sheet's url() from its own folder, its comments left out", () => {
        const folder = themeLike((yaml) => hooked(yaml).replace("style: style.css", "style: css/look.css"), {
            ...files,
            "css/look.css": "/* url(images/none.png) */ .band { background: url(../images/ruled.svg) } .top { background: url( 'paper.svg' ) }",
            "css/paper.svg": "<svg/>",
        });
        expect(readTheme(folder).problems).toEqual([]);
        expect(themeFilesNamed(readFileSync(join(folder, "theme.yaml"), "utf8"), (name) => readFileSync(join(folder, name), "utf8"))).toEqual(
            expect.arrayContaining(["css/look.css", "images/ruled.svg", "css/paper.svg", "images/grain.svg"]),
        );
    });

    it("takes a style sheet named from ./ as the file it is, and its url() as the browser reads them", () => {
        const folder = themeLike((yaml) => hooked(yaml).replace("style: style.css", "style: ./css/look.css"), {
            ...files,
            "css/look.css": ".band { filter: url(#glow); background: url(my%20paper.svg) } .top { background: url(../images/ruled.svg) }",
            "css/my paper.svg": "<svg/>",
        });
        const reading = readTheme(folder);
        expect(reading.problems).toEqual([]);
        expect(reading.theme?.style).toBe("css/look.css");
        const named = themeFilesNamed(readFileSync(join(folder, "theme.yaml"), "utf8"), (name) => readFileSync(join(folder, name), "utf8"));
        expect(named).toEqual(expect.arrayContaining(["css/look.css", "css/my paper.svg", "images/ruled.svg"]));
        // What the sheet names from the page's root, or as no file, the install never takes from the theme's folder.
        const rooted = themeFilesNamed("style: css/look.css\n", () => ".a { background: url(/images/x.png) } .b { filter: url(#glow) } .c { background: url(data:image/png,x) }");
        expect(rooted).toEqual(["css/look.css"]);
    });

    it("draws the cards' texture in one colour, what it fills without saying how included", () => {
        expect(drawnTexture(grain, "#123456")).toContain('<path d="M0 0h1v1H0Z" fill="#123456"/>');
        expect(drawnTexture('<svg viewBox="0 0 4 4"><path d="M0 0h1"/></svg>', "#123456")).toBe('<svg fill="#123456" viewBox="0 0 4 4"><path d="M0 0h1"/></svg>');
        expect(drawnTexture('<svg fill="none" viewBox="0 0 4 4"><path d="M0 0h1" stroke="currentColor"/></svg>', "#123456")).toBe('<svg fill="none" viewBox="0 0 4 4"><path d="M0 0h1" stroke="#123456"/></svg>');
    });
});

describe("the icons a theme draws anew", () => {
    it("are icons the page has, by its own names", () => {
        const page = readFileSync(fileURLToPath(new URL("../src/dashboard/parts/icons.tsx", import.meta.url)), "utf8");
        const paths = page.slice(page.indexOf("const iconPaths"));
        const names = [...paths.slice(0, paths.indexOf("\n};")).matchAll(/^ {4}([a-zA-Z]+):/gm)].map((match) => match[1]);
        expect(names.length).toBeGreaterThan(10);
        expect(themeIconNames.filter((name) => !names.includes(name))).toEqual([]);
    });
});

describe("a system's theme in a campaign", () => {
    let folder: string;
    let context: Context;

    beforeEach(() => {
        folder = makeTempFolder();
        context = testContext(folder);
    });

    async function campaign(systems?: string): Promise<void>
    {
        context = systems === undefined ? context : { ...context, systemFolders: [systems, ...context.systemFolders] };
        const made = await runCommandLine(["init", "--name", "Ledger", "--language", "en", "--system", "fake", "--difficulty", "normal", "--lethality", "dice"], context);
        expect(made.exitCode, made.output).toBe(0);
        inPlay(folder);
    }

    /** The fake system copied, its theme made wrong: its folder of systems. */
    function wrongFake(): string
    {
        const systems = makeTempFolder();
        cpSync(fake, join(systems, "fake"), { recursive: true });
        writeFileSync(join(systems, "fake", "theme", "theme.yaml"), readFileSync(join(fakeTheme, "theme.yaml"), "utf8").replace('muted: "#a9b3a0"', 'muted: "#4a5245"'));
        return systems;
    }

    async function served(call: (get: (path: string) => Promise<{ status: number; body: string; type: string; }>) => Promise<void>): Promise<void>
    {
        const session = new SessionStore({ systemFolders: context.systemFolders, watchFolder: () => ({ close: () => undefined }) });
        const dashboard = await startDashboard({ ...context, files: session }, session, { ports: [0], page: folder });

        if (dashboard === undefined) {
            throw new Error("The dashboard did not start.");
        }

        const port = Number(new URL(dashboard.url).port);
        const get = (path: string) =>
            new Promise<{ status: number; body: string; type: string; }>((done, fail) => {
                request({ host: "127.0.0.1", port, path }, (response) => {
                    let text = "";
                    response.setEncoding("utf8");
                    response.on("data", (chunk: string) => (text += chunk));
                    response.on("end", () => done({ status: response.statusCode ?? 0, body: text, type: String(response.headers["content-type"]) }));
                }).on("error", fail).end();
            });

        try {
            await call(get);
        } finally {
            await dashboard.close();
            session.close();
        }
    }

    it("passes validate, and the dashboard gives its CSS, its icons and its files, only from its folder", async () => {
        await campaign();
        expect((await runCommandLine(["validate"], context)).output).toBe("No problems.");
        await served(async (get) => {
            const given = JSON.parse((await get("/api/theme")).body) as { system: string; name: string; css: string; icons: Record<string, string>; };
            expect(given).toMatchObject({ system: "fake", name: "Ledger", icons: { party: "M5 4h14v16H5Z M9 9h6 M9 13h6" } });
            expect(given.css).toContain("@layer theme {");
            expect(await get("/theme/images/ruled.svg")).toMatchObject({ status: 200, type: "image/svg+xml" });
            expect((await get("/theme/images/corner.svg?ink=%23abcdef&mirrored")).body).toContain('stroke="#abcdef" stroke-width="1.5"><g transform="translate(24 0) scale(-1 1)">');

            // An ink that is no colour is never written into the drawing.
            const scripted = (await get("/theme/images/corner.svg?ink=%3Cscript%3Ealert(1)%3C/script%3E")).body;
            expect(scripted).toContain('stroke="currentColor"');
            expect(scripted).not.toContain("<script");

            for (const refused of ["theme.yaml", "../system.yaml", "%2e%2e/system.yaml", "..%5Csystem.yaml", "images%5C..%5C..%5Csystem.yaml", "Images/corner.svg", "images/none.svg"]) {
                expect((await get(`/theme/${refused}`)).status, refused).toBe(404);
            }
        });
    });

    it("gives a theme's own style sheet at an address that changes with it, as CSS, and its cards' texture in one colour (D-575)", async () => {
        const systems = makeTempFolder();
        cpSync(fake, join(systems, "fake"), { recursive: true });
        const theme = join(systems, "fake", "theme");
        const yaml = readFileSync(join(fakeTheme, "theme.yaml"), "utf8").replace("name: Ledger", "name: Ledger\nstyle: ./css/look.css");
        writeFileSync(join(theme, "theme.yaml"), yaml.replace("  ornament: images/corner.svg", "  ornament: images/corner.svg\n  texture: {picture: images/grain.svg}"));
        mkdirSync(join(theme, "css"));
        writeFileSync(join(theme, "css", "look.css"), ".band { background: url(../images/ruled.svg); }");
        writeFileSync(join(theme, "other.css"), ".band { display: none; }");
        writeFileSync(join(theme, "images", "grain.svg"), '<svg viewBox="0 0 4 4"><path d="M0 0h1"/></svg>');
        await campaign(systems);
        await served(async (get) => {
            // The page links a sheet of one line, which brings the theme's into the layer theme-style: its url() from its own folder, none of its braces out of it.
            const given = JSON.parse((await get("/api/theme")).body) as { style: string; };
            expect(given.style).toMatch(/^\/theme\/css\/look\.css\?v=[\w-]{12}&layer$/);
            const linked = await get(given.style);
            const sheet = given.style.replace(/&layer$/, "");
            expect(linked).toMatchObject({ status: 200, type: "text/css; charset=utf-8", body: `@import url("${sheet}") layer(theme-style);\n` });
            expect(await get(sheet)).toMatchObject({ status: 200, type: "text/css; charset=utf-8", body: ".band { background: url(../images/ruled.svg); }" });
            expect((await get("/theme/other.css")).status).toBe(404);
            expect((await get("/theme/images/grain.svg?ink=%23abcdef&texture")).body).toBe('<svg fill="#abcdef" viewBox="0 0 4 4"><path d="M0 0h1"/></svg>');
            writeFileSync(join(theme, "css", "look.css"), ".band { color: inherit; }");
            expect(JSON.parse((await get("/api/theme")).body).style).not.toBe(given.style);
        });
    });

    it("gives no theme without a campaign, and the system's name alone when it names none", async () => {
        await served(async (get) => {
            expect(JSON.parse((await get("/api/theme")).body)).toEqual({});
        });
        const made = await runCommandLine(["init", "--name", "Plain", "--language", "en", "--system", "free", "--difficulty", "normal", "--lethality", "dice"], context);
        expect(made.exitCode, made.output).toBe(0);
        await served(async (get) => {
            expect(JSON.parse((await get("/api/theme")).body)).toEqual({ system: "free" });
            expect((await get("/theme/images/corner.svg")).status).toBe(404);
        });
    });

    it("says in validate why a theme is not used, while the dashboard keeps its own look", async () => {
        await campaign(wrongFake());
        expect((await runCommandLine(["validate"], context)).output).toContain(
            "- fake: theme/theme.yaml: the theme of the game system fake is not used, and the dashboard keeps its own look: dark: muted #4a5245 does not read: on panel #18201a is 2.05:1,",
        );
        await served(async (get) => {
            expect(JSON.parse((await get("/api/theme")).body)).toEqual({ system: "fake", refused: true });
            expect((await get("/theme/images/ruled.svg")).status).toBe(404);
        });
    });
});
