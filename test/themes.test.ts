// The dashboard's themes (D-527, D-528): a game system's folder of data, read and checked as the engine reads the system, its CSS of custom properties written
// by the engine; validate and the dashboard's server, on the fake system's theme and on copies of it made wrong.
import { cpSync, mkdirSync, readFileSync, symlinkSync, writeFileSync } from "node:fs";
import { request } from "node:http";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { beforeEach, describe, expect, it } from "vitest";
import { runCommandLine } from "../src/command-line.ts";
import type { Context } from "../src/core/context.ts";
import { SessionStore } from "../src/core/session-store.ts";
import { startDashboard } from "../src/dashboard-server.ts";
import { contrast, drawnOrnament, readTheme, themeCss, themeFile, themeIconNames } from "../src/themes/index.ts";
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

    it("writes faces, then one layer of custom properties and nothing else, both modes by data-theme, its files at the address given", () => {
        const folder = themeLike((yaml) => yaml.replace("name: Ledger", "name: Ledger\nfonts:\n  - {family: Plain Sans, file: fonts/plain.woff2, weight: 100 900, license: fonts/OFL.txt}\ntitle-font: Plain Sans"), {
            "fonts/plain.woff2": new Uint8Array([0x77, 0x4f, 0x46, 0x32]),
            "fonts/OFL.txt": "SIL Open Font License 1.1",
        });
        const { theme } = readTheme(folder);
        const css = themeCss(theme!, "/theme");
        const [faces, layer] = css.split("@layer theme {");
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

describe("the icons a theme draws anew", () => {
    it("are icons the page has, by its own names", () => {
        const page = readFileSync(fileURLToPath(new URL("../src/dashboard/icons.tsx", import.meta.url)), "utf8");
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
