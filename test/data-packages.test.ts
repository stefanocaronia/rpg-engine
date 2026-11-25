// Packages of data alone: a theme or a language from a .zip, a folder or a GitHub link, read once and told by the file at its top, unpacked for every campaign
// on this computer, refused whole when they fail a check; the dashboard's themes and their files; the catalog of GitHub's three topics.
import { zipSync } from "fflate";
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { request } from "node:http";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { runCommandLine } from "../src/cli/command-line.ts";
import { gitHubRepository } from "../src/commands/package/data.ts";
import { packageCommand } from "../src/commands/package/package.ts";
import { catalog } from "../src/commands/shared/packages/catalog.ts";
import { languageFolders } from "../src/commands/shared/packages/unpacked.ts";
import type { Context, PackageManager } from "../src/core/context.ts";
import { SessionStore } from "../src/core/session-store.ts";
import { getVersion } from "../src/core/version.ts";
import { languagePackFor } from "../src/languages/index.ts";
import { type Dashboard, startDashboard } from "../src/server/dashboard/index.ts";
import { inPlay, makeTempFolder, readLogFile, testContext } from "./support.ts";

const fakeTheme = fileURLToPath(new URL("./systems/fake/theme/", import.meta.url));

/** The fake system's theme as a package's files, its theme.yaml changed by this function, with what a repository has beside it. */
function themeFiles(change: (yaml: string) => string = (yaml) => yaml): Record<string, string>
{
    const read = (path: string): string => readFileSync(join(fakeTheme, path), "utf8");
    return {
        "theme.yaml": change(read("theme.yaml")),
        "icons/party.svg": read("icons/party.svg"),
        "images/corner.svg": read("images/corner.svg"),
        "images/ruled.svg": read("images/ruled.svg"),
        "README.md": "# Ledger\n",
        LICENSE: "CC BY 4.0\n",
        ".github/workflows/check.yml": "on: push\n",
        "build.sh": "echo never kept\n",
        "images/unused.png": "never named",
        "node_modules/tool/logo.svg": "<svg/>",
        "docs/notes.md": "never kept\n",
    };
}

/** A .zip of these files, each under `top`, as GitHub zips a repository in a folder; its path. */
function zipOf(files: Record<string, string>, top = "", name = "package.zip"): string
{
    const file = join(makeTempFolder(), name);
    writeFileSync(file, zipBytes(files, top));
    return file;
}

function zipBytes(files: Record<string, string>, top = ""): Uint8Array
{
    return zipSync(Object.fromEntries(Object.entries(files).map(([path, text]) => [`${top}${path}`, new TextEncoder().encode(text)])));
}

/** A folder of these files; its path. */
function folderOf(files: Record<string, string>): string
{
    const folder = makeTempFolder();

    for (const [path, text] of Object.entries(files)) {
        mkdirSync(join(folder, path, ".."), { recursive: true });
        writeFileSync(join(folder, path), text);
    }

    return folder;
}

/** A German language of data alone, its phrases given. */
function germanFiles(phrases: Record<string, string>, version = "1.2.0"): Record<string, string>
{
    return {
        "language.yaml": `code: de\nname: Deutsch\nversion: ${version}\n`,
        "phrases.json": JSON.stringify(phrases),
        "guide.md": "# Anleitung\n",
        "systems/fake/words/de.yaml": "Ledger: Kassenbuch\n",
        "README.md": "never kept\n",
    };
}

/** A theme.yaml with this version. */
const versioned = (version: string) => (yaml: string): string => yaml.replace("name: Ledger\n", `name: Ledger\nversion: ${version}\n`);

let folder: string;
let unpacked: string;
let context: Context;
const rpg = (...args: string[]) => runCommandLine(args, context);
const themesThere = (): string[] => (existsSync(join(unpacked, "themes")) ? readdirSync(join(unpacked, "themes")) : []);

beforeEach(async () => {
    folder = makeTempFolder();
    unpacked = join(makeTempFolder(), "unpacked");
    context = { ...testContext(folder), unpacked, pageFolder: fileURLToPath(new URL("../src/dashboard/", import.meta.url)) };
    const made = await rpg("init", "--name", "Prova", "--language", "en", "--system", "free", "--difficulty", "normal", "--lethality", "dice");
    expect(made.exitCode, made.output).toBe(0);
    inPlay(folder);
});

describe("a theme as a package of its own", () => {
    it("installs one from a .zip GitHub made, keeping only theme.yaml, the files it names and a licence, for every campaign, and logs it", async () => {
        const zip = zipOf(themeFiles(versioned("1.0.0")), "ledger-main/");
        const installed = await rpg("package", "install", zip);
        expect(installed.output).toBe("Installed the theme Ledger 1.0.0 for every campaign on this computer: the player chooses it in Settings.");
        expect(themesThere()).toEqual(["ledger"]);
        expect(readdirSync(join(unpacked, "themes", "ledger"), { recursive: true }).map(String).map((path) => path.replaceAll("\\", "/")).sort()).toEqual(
            [".source", "LICENSE", "icons", "icons/party.svg", "images", "images/corner.svg", "images/ruled.svg", "theme.yaml"],
        );
        expect(readFileSync(join(unpacked, "themes", "ledger", ".source"), "utf8")).toBe(`${zip}\n`);
        expect(readLogFile(folder).at(-1)).toMatchObject({ type: "package-installed", data: { package: "ledger", version: "1.0.0", verified: false, kind: "theme" } });
        expect((await rpg("package", "list")).output).toContain("Themes of the dashboard, which the player chooses in Settings: Ledger 1.0.0.");
    });

    it("installs one from a folder, and from a GitHub link read as the zip of its branch", async () => {
        expect((await rpg("package", "install", folderOf(themeFiles()))).output).toContain("Installed the theme Ledger for every campaign");
        const asked: string[] = [];
        context = {
            ...context,
            download: (url) => {
                asked.push(url);
                return Promise.resolve(zipBytes(themeFiles(versioned("2.0.0")), "ledger-main/"));
            },
        };
        expect((await rpg("package", "install", "https://github.com/ada/ledger")).output).toBe(
            "Installed the theme Ledger 2.0.0 for every campaign on this computer: the player chooses it in Settings. It takes the place of Ledger.",
        );
        expect(asked).toEqual(["https://codeload.github.com/ada/ledger/zip/HEAD"]);
        expect(themesThere()).toEqual(["ledger"]);
        expect(readFileSync(join(unpacked, "themes", "ledger", ".source"), "utf8")).toBe("https://github.com/ada/ledger\n");
    });

    it("reads a link's branch or tag as codeload names it, each part written as an address writes it", () => {
        expect(gitHubRepository("https://github.com/ada/ledger.git")).toEqual({ link: "https://github.com/ada/ledger", zip: "https://codeload.github.com/ada/ledger/zip/HEAD" });
        expect(gitHubRepository("https://github.com/ada/ledger/tree/v2.0.0")?.zip).toBe("https://codeload.github.com/ada/ledger/zip/v2.0.0");
        expect(gitHubRepository("https://github.com/ada/ledger/tree/feature/new look")?.zip).toBe("https://codeload.github.com/ada/ledger/zip/feature/new%20look");
        expect(gitHubRepository("https://github.com/ada/ledger/tree/new%20look/")?.zip).toBe("https://codeload.github.com/ada/ledger/zip/new%20look");
        expect(gitHubRepository("https://example.com/ledger.zip")).toBeUndefined();
    });

    it("puts a new version in place of the one before in one step, and clears what an install left behind an hour ago", async () => {
        await rpg("package", "install", zipOf(themeFiles(versioned("1.0.0"))));
        mkdirSync(join(unpacked, "themes", ".installing-left"));
        mkdirSync(join(unpacked, "themes", ".replaced-left"));
        context = { ...context, now: () => new Date("2099-01-01T00:00:00Z") };
        expect((await rpg("package", "install", zipOf(themeFiles(versioned("1.1.0"))))).output).toContain("It takes the place of Ledger 1.0.0.");
        expect(readdirSync(join(unpacked, "themes"))).toEqual(["ledger"]);
        expect(readFileSync(join(unpacked, "themes", "ledger", "theme.yaml"), "utf8")).toContain("version: 1.1.0");
    });

    it("refuses a theme's .zip that unpacks to more than 50 MB before unpacking it", async () => {
        const big = zipSync({ "theme.yaml": new TextEncoder().encode("name: Big\n"), "fonts/huge.woff2": new Uint8Array(51 * 1024 * 1024 - 1024) });
        writeFileSync(join(folder, "big.zip"), big);
        await expect(packageCommand.run({ action: "install", name: join(folder, "big.zip") }, context)).rejects.toMatchObject({
            code: "theme-refused",
            values: { why: "its .zip unpacks to 51 MB, more than the 50 MB a theme may" },
        });
        expect(themesThere()).toEqual([]);
    });

    it("is told from an npm package of the same name on uninstall: the player says which", async () => {
        await rpg("package", "install", zipOf(themeFiles((yaml) => yaml.replace("name: Ledger\n", "name: Skies\n"))));
        await expect(packageCommand.run({ action: "uninstall", name: "skies" }, context)).rejects.toMatchObject({
            code: "ambiguous-name",
            values: { name: "skies", npm: "@rpgengine/skies", unpacked: "theme:skies" },
        });
        expect(themesThere()).toEqual(["skies"]);
        expect((await rpg("package", "uninstall", "theme:skies")).output).toBe("Skies is off this computer.");
        expect(themesThere()).toEqual([]);
    });

    it("refuses one that fails its checks, saying what to fix, and leaves nothing", async () => {
        const dim = zipOf(themeFiles((yaml) => yaml.replace('muted: "#a9b3a0"', 'muted: "#4a5245"')), "", "dim.zip");
        const refused = await rpg("package", "install", dim);
        expect(refused.exitCode).not.toBe(0);
        expect(refused.output).toContain("dim.zip is no theme the dashboard can use: dark: muted #4a5245 does not read");
        await expect(packageCommand.run({ action: "install", name: dim }, context)).rejects.toMatchObject({ code: "theme-refused", values: { name: "dim.zip" } });
        expect(themesThere()).toEqual([]);
        expect(readLogFile(folder).some((entry) => entry.type === "package-installed")).toBe(false);
    });

    it("refuses a .zip with none of the three files at its top, and a document", async () => {
        expect((await rpg("package", "install", zipOf({ "notes/one.md": "x", "notes/two.md": "y" }, "", "notes.zip"))).output).toBe(
            "notes.zip has no adventure.yaml, theme.yaml, language.yaml at its top: it is no adventure, theme or language. A document or a folder of notes is imported by the master, who writes its pages. Nothing changed.",
        );
        expect((await rpg("package", "install", "book.pdf")).output).toContain("is a document, not a package: make an adventure from it with import");
    });

    it("refuses one that asks a newer rpg-engine before any check, its unknown keys too, and installs one this engine reads", async () => {
        const newer = zipOf(themeFiles((yaml) => yaml.replace("name: Ledger\n", 'name: Ledger\nversion: 3.0.0\nengine: "99.0"\nsparkle: true\n')));
        expect((await rpg("package", "install", newer)).output).toBe(
            `Ledger 3.0.0 needs rpg-engine 99.0 or newer; this is ${getVersion()}. The player updates RPG Engine on the dashboard's Packages page, never you; then add it again. Nothing changed.`,
        );
        await expect(packageCommand.run({ action: "install", name: newer }, context)).rejects.toMatchObject({ code: "engine-too-old", values: { name: "Ledger", version: "3.0.0" } });
        expect(themesThere()).toEqual([]);

        for (const engine of [getVersion(), "0.1"]) {
            const read = await rpg("package", "install", zipOf(themeFiles((yaml) => yaml.replace("name: Ledger\n", `name: Ledger\nengine: "${engine}"\n`))));
            expect(read.output).toContain("Installed the theme Ledger for every campaign");
        }
    });

    it("is taken off this computer by its name, and is no more listed", async () => {
        await rpg("package", "install", zipOf(themeFiles()));
        expect((await rpg("package", "uninstall", "Ledger")).output).toBe("Ledger is off this computer.");
        expect(themesThere()).toEqual([]);
        expect(readLogFile(folder).at(-1)).toMatchObject({ type: "package-uninstalled", data: { package: "ledger", kind: "theme" } });
        expect((await rpg("package", "list")).output).not.toContain("Themes of the dashboard");
    });
});

describe("a theme linked for its author", () => {
    const listing = (path: string): string[] => readdirSync(path, { recursive: true }).map(String).map((one) => one.replaceAll("\\", "/")).sort();

    it("is read from the author's folder, never copied: its folder among the installed ones holds only where it is", async () => {
        const author = folderOf(themeFiles(versioned("0.3.0")));
        const linked = await rpg("package", "install", author, "--link");
        expect(linked.output).toBe(
            `Linked the theme Ledger 0.3.0, read from ${author}: it shows in the dashboard of any campaign on this computer, chosen in Settings, and the dashboard shows each change by itself.`,
        );
        expect(themesThere()).toEqual(["ledger"]);
        expect(listing(join(unpacked, "themes", "ledger"))).toEqual([".link", ".source"]);
        expect(readFileSync(join(unpacked, "themes", "ledger", ".link"), "utf8")).toBe(`${author}\n`);
        expect(readLogFile(folder).at(-1)).toMatchObject({ type: "package-installed", data: { package: "ledger", version: "0.3.0", kind: "theme" } });
        expect((await rpg("package", "list")).output).toContain(`Themes of the dashboard, which the player chooses in Settings: Ledger 0.3.0, linked from ${author}.`);

        // What the author changes is what the engine reads, at once.
        writeFileSync(join(author, "theme.yaml"), versioned("0.4.0")(readFileSync(join(fakeTheme, "theme.yaml"), "utf8")));
        expect((await rpg("package", "list")).output).toContain("Ledger 0.4.0, linked from");
    });

    it("never takes the author's folder away: an uninstall, a copy or a link over it leave its files as they were", async () => {
        const author = folderOf(themeFiles());
        const before = listing(author);
        await rpg("package", "install", author, "--link");
        expect((await rpg("package", "uninstall", "theme:ledger")).output).toBe("Ledger is off this computer.");
        expect(themesThere()).toEqual([]);
        expect(listing(author)).toEqual(before);

        await rpg("package", "install", author, "--link");
        expect((await rpg("package", "install", zipOf(themeFiles(versioned("1.0.0"))))).output).toContain("It takes the place of Ledger.");
        expect(listing(join(unpacked, "themes", "ledger"))).toContain("theme.yaml");
        expect(listing(author)).toEqual(before);

        expect((await rpg("package", "install", author, "--link")).output).toContain("It takes the place of Ledger 1.0.0.");
        await rpg("package", "install", author, "--link");
        await rpg("package", "uninstall", "Ledger");
        expect(listing(author)).toEqual(before);
        expect(readFileSync(join(author, "theme.yaml"), "utf8")).toBe(themeFiles()["theme.yaml"]);
    });

    it("links one that fails its checks, saying why it is not offered; one with no name by its folder's", async () => {
        const dim = folderOf(themeFiles((yaml) => yaml.replace('muted: "#a9b3a0"', 'muted: "#4a5245"')));
        expect((await rpg("package", "install", dim, "--link")).output).toContain("It is not offered until it passes its checks: dark: muted #4a5245 does not read");
        expect((await rpg("package", "list")).output).toContain(`ledger, linked from ${dim} (not offered: dark: muted #4a5245 does not read`);

        const nameless = join(makeTempFolder(), "My Draft");
        mkdirSync(nameless);
        writeFileSync(join(nameless, "theme.yaml"), "light: [\n");
        expect((await rpg("package", "install", nameless, "--link")).output).toContain("Linked the theme My Draft, read from");
        expect(themesThere()).toEqual(["ledger", "my-draft"]);

        rmSync(nameless, { recursive: true });
        expect((await rpg("package", "list")).output).toContain(`my-draft, linked from ${nameless} (not offered: the folder it is linked to, ${nameless}, is gone: link it again`);
        expect((await rpg("package", "uninstall", "theme:my-draft")).output).toBe("my-draft is off this computer.");
    });

    it("links only a theme's folder of this computer, and only on install", async () => {
        const adventure = folderOf({ "adventure.yaml": "title: X\n", "theme.yaml": "name: X\n" });

        for (const given of [zipOf(themeFiles()), "https://github.com/ada/ledger", "weather", adventure, folderOf(germanFiles({}))]) {
            await expect(packageCommand.run({ action: "install", name: given, link: true }, context), given).rejects.toMatchObject({ code: "not-linkable", values: { name: given } });
        }

        await expect(packageCommand.run({ action: "uninstall", name: "ledger", link: true }, context)).rejects.toMatchObject({ code: "not-linkable" });
        expect(themesThere()).toEqual([]);
    });

    it("is made new from the template, in a folder of its name where the command runs, and linked", async () => {
        const here = makeTempFolder();
        const made = await packageCommand.run({ action: "new", name: "Old Parchment" }, { ...context, folder: here });
        const author = join(here, "old-parchment");
        expect(packageCommand.format(made)).toBe(
            `Made the theme Old Parchment 0.1.0 in ${author} and linked it: choose it in Settings, in the dashboard of any campaign on this computer. `
                + "Change its theme.yaml there: the dashboard shows each change by itself.",
        );
        expect(readdirSync(author).sort()).toEqual(["README.md", "style.css", "theme.yaml"]);
        expect(readFileSync(join(unpacked, "themes", "old-parchment", ".link"), "utf8")).toBe(`${author}\n`);

        const elsewhere = join(makeTempFolder(), "deep", "sea");
        expect(packageCommand.format(await packageCommand.run({ action: "new", name: "Sea", folder: elsewhere }, context))).toContain(`in ${elsewhere} and linked it`);

        await expect(packageCommand.run({ action: "new", name: "Old Parchment" }, { ...context, folder: makeTempFolder() })).rejects.toMatchObject({ code: "theme-here", values: { name: "old-parchment" } });
        await expect(packageCommand.run({ action: "new", name: "Other", folder: author }, context)).rejects.toMatchObject({ code: "folder-not-empty", values: { name: author } });
        expect(themesThere()).toEqual(["old-parchment", "sea"]);
    });

    it("works outside a campaign: new, a link, list and an uninstall of a theme, and nothing else", async () => {
        const nowhere = { ...context, folder: makeTempFolder() };
        const lines = readLogFile(folder).length;
        const out = (...args: string[]) => runCommandLine(args, nowhere);
        expect((await out("package", "new", "Moss")).output).toContain("Made the theme Moss 0.1.0");
        expect((await out("package", "install", folderOf(themeFiles()), "--link")).output).toContain("Linked the theme Ledger");
        expect((await out("package", "list")).output).toContain(`Themes of the dashboard, which the player chooses in Settings: Ledger, linked from`);
        expect((await out("package", "uninstall", "Moss")).output).toBe("Moss is off this computer.");
        expect(existsSync(join(nowhere.folder, "moss", "theme.yaml"))).toBe(true);
        expect(readLogFile(folder)).toHaveLength(lines);

        for (const args of [["install", zipOf(themeFiles())], ["available"], ["uninstall", "weather"], ["export"]]) {
            expect((await out("package", ...args)).output, args.join(" ")).toContain("There is no campaign here");
        }
    });
});

describe("a language as a package of data alone", () => {
    it("installs one from a .zip into its own folder, read as the page's language, its version from language.yaml", async () => {
        const installed = await rpg("package", "install", zipOf(germanFiles({ "{count} failures": "{count} Fehlschläge" }), "lingua-de-main/"));
        expect(installed.output).toMatch(/^Installed Deutsch \(de\) 1\.2\.0, the dashboard's words made by hand, by someone else, for every campaign on this computer\./);
        const pack = languagePackFor(languageFolders(context), "de-AT");
        expect(pack).toMatchObject({ package: "language-de", version: "1.2.0", code: "de", name: "Deutsch", folder: join(unpacked, "languages", "de") });
        expect(readdirSync(join(unpacked, "languages", "de"), { recursive: true }).map(String).map((path) => path.replaceAll("\\", "/")).sort()).toEqual(
            [".source", "guide.md", "language.yaml", "phrases.json", "systems", "systems/fake", "systems/fake/words", "systems/fake/words/de.yaml"],
        );
        const listed = JSON.parse((await rpg("package", "list", "--json")).output) as { languages: Record<string, unknown>[]; };
        expect(listed.languages).toEqual([{ code: "de", name: "Deutsch", package: "language-de", version: "1.2.0", verified: false, unpacked: true }]);
        expect(readLogFile(folder).at(-1)).toMatchObject({ type: "package-installed", data: { package: "language-de", version: "1.2.0", kind: "language" } });
    });

    it("refuses one that loses a {name}, leaving the one before; an update takes its place; it is taken off by its code", async () => {
        await rpg("package", "install", zipOf(germanFiles({ "{count} failures": "{count} Fehlschläge" })));
        const broken = await rpg("package", "install", zipOf(germanFiles({ "{count} failures": "Fehlschläge" }, "1.3.0"), "", "kaputt.zip"));
        expect(broken.output).toBe('kaputt.zip cannot be used: "Fehlschläge" has not the {names} of "{count} failures". Nothing changed.');
        expect(languagePackFor(languageFolders(context), "de")?.version).toBe("1.2.0");
        await rpg("package", "install", zipOf(germanFiles({ "{count} failures": "{count} Misserfolge" }, "1.4.0")));
        expect(languagePackFor(languageFolders(context), "de")?.version).toBe("1.4.0");
        expect(readdirSync(join(unpacked, "languages"))).toEqual(["de"]);
        expect((await rpg("package", "uninstall", "de")).output).toBe("Deutsch is off this computer.");
        expect(languagePackFor(languageFolders(context), "de")).toBeUndefined();
    });

    it("refuses one that asks a newer rpg-engine, its unknown keys too, and installs one this engine reads", async () => {
        const files = germanFiles({ "{count} failures": "{count} Fehlschläge" });
        const newer = zipOf({ ...files, "language.yaml": 'code: de\nname: Deutsch\nversion: 2.0.0\nengine: "99.0"\nscript: Latn\n' });
        await expect(packageCommand.run({ action: "install", name: newer }, context)).rejects.toMatchObject({
            code: "engine-too-old",
            values: { name: "Deutsch", version: "2.0.0" },
            message: `Deutsch 2.0.0 needs rpg-engine 99.0 or newer; this is ${getVersion()}. The player updates RPG Engine on the dashboard's Packages page, never you; then add it again. Nothing changed.`,
        });
        expect(languagePackFor(languageFolders(context), "de")).toBeUndefined();
        await rpg("package", "install", zipOf({ ...files, "language.yaml": `code: de\nname: Deutsch\nversion: 2.0.0\nengine: "${getVersion()}"\n` }));
        expect(languagePackFor(languageFolders(context), "de")?.version).toBe("2.0.0");
    });

    it("refuses before writing anything when npm cannot take off the language package of the same code", async () => {
        const modules = npmGerman("@rpgengine/lang-de");
        const busy = { uninstall: () => Promise.resolve("EBUSY: resource busy or locked") } as unknown as PackageManager;
        context = { ...context, extensionFolders: [modules], packages: busy };
        await expect(packageCommand.run({ action: "install", name: zipOf(germanFiles({ "{count} failures": "{count} Fehlschläge" })) }, context)).rejects.toMatchObject({
            code: "uninstall-failed",
            values: { name: "@rpgengine/lang-de", why: "EBUSY: resource busy or locked" },
        });
        expect(existsSync(join(unpacked, "languages")) ? readdirSync(join(unpacked, "languages")) : []).toEqual([]);
        expect(languagePackFor(languageFolders(context), "de")?.package).toBe("@rpgengine/lang-de");
    });

    it("takes back a new npm language when npm cannot take off the one before, and keeps that one", async () => {
        const modules = npmGerman("@rpgengine/lang-de");
        const source = npmGerman("@rpgengine/deutsch");
        const taken: string[] = [];
        const npm: PackageManager = {
            describe: (spec) => Promise.resolve({ name: spec, version: "2.0.0", kind: "language" }),
            install: (spec) => {
                cpSync(join(source, "@rpgengine", "deutsch"), join(modules, "@rpgengine", "deutsch"), { recursive: true });
                return Promise.resolve(undefined);
            },
            uninstall: (name) => {
                taken.push(name);

                if (name === "@rpgengine/lang-de") {
                    return Promise.resolve("EBUSY: resource busy or locked");
                }

                rmSync(join(modules, ...name.split("/")), { recursive: true, force: true });
                return Promise.resolve(undefined);
            },
            search: () => Promise.resolve([]),
        };
        context = { ...context, extensionFolders: [modules], packages: npm };
        await expect(packageCommand.run({ action: "install", name: "@rpgengine/deutsch" }, context)).rejects.toMatchObject({ code: "uninstall-failed", values: { name: "@rpgengine/lang-de" } });
        expect(taken).toEqual(["@rpgengine/lang-de", "@rpgengine/deutsch"]);
        expect(existsSync(join(modules, "@rpgengine", "deutsch"))).toBe(false);
        expect(languagePackFor(languageFolders(context), "de")?.package).toBe("@rpgengine/lang-de");
    });
});

/** A folder of npm's packages holding a German language package by this name; its path. */
function npmGerman(name: string): string
{
    const modules = join(makeTempFolder(), "node_modules");
    const folder = join(modules, ...name.split("/"));
    mkdirSync(folder, { recursive: true });
    writeFileSync(join(folder, "package.json"), JSON.stringify({ name, version: "1.0.0", "rpg-engine": { kind: "language" } }));
    writeFileSync(join(folder, "language.yaml"), "code: de\nname: Deutsch\n");
    writeFileSync(join(folder, "phrases.json"), JSON.stringify({ "{count} failures": "{count} Fehlschläge" }));
    return modules;
}

describe("the themes on the dashboard", () => {
    let session: SessionStore;
    let dashboard: Dashboard;
    let port: number;

    beforeEach(async () => {
        session = new SessionStore({ systemFolders: context.systemFolders, watchFolder: () => ({ close: () => undefined }) });
        dashboard = await startDashboard({ ...context, files: session }, session, { ports: [0], page: folder }) as Dashboard;
        port = Number(new URL(dashboard.url).port);
    });

    afterEach(async () => {
        await dashboard.close();
        session.close();
    });

    function send(method: string, path: string, body?: Uint8Array, headers: Record<string, string> = {}): Promise<{ status: number; body: string; type: string; policy: string; }>
    {
        const sentHeaders = { ...(body === undefined ? {} : { origin: `http://127.0.0.1:${port}` }), ...headers };
        return new Promise((done, fail) => {
            const sent = request({ host: "127.0.0.1", port, path, method, headers: sentHeaders }, (response) => {
                let text = "";
                response.setEncoding("utf8");
                response.on("data", (chunk: string) => (text += chunk));
                response.on("end", () => done({ status: response.statusCode ?? 0, body: text, type: String(response.headers["content-type"]), policy: String(response.headers["content-security-policy"]) }));
            });
            sent.on("error", fail);
            sent.end(body);
        });
    }

    it("adds one from a .zip the page sends, lists it, and gives its CSS at its own address while the system has none", async () => {
        expect(JSON.parse((await send("GET", "/api/theme")).body)).toEqual({ system: "free" });
        const added = await send("POST", "/api/add", zipBytes(themeFiles()), { "content-type": "application/zip", "x-file-name": "ledger.zip" });
        expect(added.status).toBe(202);
        expect(JSON.parse(added.body)).toEqual({ kind: "theme" });
        expect(dashboard.news().lines.join(" ")).toContain("The player, on the dashboard, added ledger.zip: Installed the theme Ledger for every campaign");
        expect(JSON.parse((await send("GET", "/api/packages")).body).themes).toEqual([{ id: "ledger", name: "Ledger" }]);

        const given = JSON.parse((await send("GET", "/api/theme")).body) as { system: string; themes: { id: string; name: string; css: string; icons: Record<string, string>; }[]; };
        expect(given).toMatchObject({ system: "free", themes: [{ id: "ledger", name: "Ledger", icons: { party: "M5 4h14v16H5Z M9 9h6 M9 13h6" } }] });
        expect(given.themes[0].css).toContain('url("/themes/ledger/images/ruled.svg")');
    });

    it("serves a theme's files only from its folder, its pictures sandboxed, and nothing outside it", async () => {
        await runCommandLine(["package", "install", zipOf(themeFiles())], { ...context, files: session });
        const picture = await send("GET", "/themes/ledger/images/ruled.svg");
        expect(picture).toMatchObject({ status: 200, type: "image/svg+xml" });
        expect(picture.policy).toContain("sandbox");
        expect((await send("GET", "/themes/ledger/images/corner.svg?ink=%23abcdef")).body).toContain('stroke="#abcdef"');

        // Its own style sheet, kept with the pictures its url() name, served as CSS at an address that changes with it (D-575).
        const styled = themeFiles((yaml) => yaml.replace("name: Ledger", "name: Ledger\nstyle: css/look.css"));
        await runCommandLine(["package", "install", zipOf({ ...styled, "css/look.css": ".band { background: url(../images/seal.png); }", "images/seal.png": "png", "css/unused.css": "" })], { ...context, files: session });
        expect(readdirSync(join(unpacked, "themes", "ledger"), { recursive: true }).map(String).map((path) => path.replaceAll("\\", "/"))).toEqual(
            expect.arrayContaining(["css/look.css", "images/seal.png"]),
        );
        expect(existsSync(join(unpacked, "themes", "ledger", "css", "unused.css"))).toBe(false);
        const style = (JSON.parse((await send("GET", "/api/theme")).body) as { themes: { style: string; }[]; }).themes[0].style;
        expect(style).toMatch(/^\/themes\/ledger\/css\/look\.css\?v=[\w-]{12}&layer$/);
        const sheet = style.replace(/&layer$/, "");
        expect(await send("GET", style)).toMatchObject({ status: 200, type: "text/css; charset=utf-8", body: `@import url("${sheet}") layer(theme-style);\n` });
        expect(await send("GET", sheet)).toMatchObject({ status: 200, type: "text/css; charset=utf-8", body: ".band { background: url(../images/seal.png); }" });

        for (const refused of ["ledger/theme.yaml", "ledger/../../campaign.yaml", "ledger/%2e%2e/%2e%2e/campaign.yaml", "ledger/..%5C..%5Ccampaign.yaml", "Ledger/images/ruled.svg", "other/images/ruled.svg", "ledger"]) {
            expect((await send("GET", `/themes/${refused}`)).status, refused).toBe(404);
        }
    });

    it("serves a linked theme from its author's folder, at an address that changes with its files, and tells the page when they change", async () => {
        // The server looks for linked themes now and then: one linked after it started is seen too.
        const received: string[] = [];
        const events = request({ host: "127.0.0.1", port, path: "/events" });
        const connected = new Promise<void>((done) => {
            events.on("response", (response) => {
                response.setEncoding("utf8");
                response.on("data", (chunk: string) => received.push(chunk));
                done();
            });
        });
        events.end();
        await connected;

        const changed = async (): Promise<boolean> => {
            const count = received.filter((chunk) => chunk.includes("event: changed")).length;

            for (let tried = 0; tried < 40; tried++) {
                await new Promise((done) => setTimeout(done, 100));

                if (received.filter((chunk) => chunk.includes("event: changed")).length > count) {
                    return true;
                }
            }

            return false;
        };

        const author = folderOf(themeFiles());
        await runCommandLine(["package", "install", author, "--link"], { ...context, files: session });
        expect(await changed()).toBe(true);

        const css = async (): Promise<string> => (JSON.parse((await send("GET", "/api/theme")).body) as { themes: { css: string; }[]; }).themes[0].css;
        const first = await css();
        const address = /url\("(\/themes\/ledger\.[\w-]+)\/images\/ruled\.svg"\)/.exec(first)?.[1];
        expect(address).toBeDefined();
        expect(await send("GET", `${address}/images/ruled.svg`)).toMatchObject({ status: 200, body: themeFiles()["images/ruled.svg"] });

        // A picture changed, the same CSS but for its address: the page takes the new one.
        writeFileSync(join(author, "images", "ruled.svg"), '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 8 8"><path d="M0 4h8"/></svg>');
        expect(await changed()).toBe(true);
        const second = await css();
        expect(second).not.toBe(first);
        expect(second.replace(/ledger\.[\w-]+/g, "ledger")).toBe(first.replace(/ledger\.[\w-]+/g, "ledger"));
        events.destroy();
    });
});

describe("the catalog of GitHub's packages of data alone", () => {
    /** GitHub as these tests have it: a repository for each topic, its file at the top, and the searches that fail. */
    function github(failing: string[] = [], ledger = "name: Ledger\nversion: 1.0.0\n", files: Record<string, string> = {}): (url: string) => Promise<Uint8Array>
    {
        const repository = (name: string, description: string, owner = "ada") => ({
            full_name: `${owner}/${name}`,
            default_branch: "main",
            description,
            owner: { login: owner },
            stargazers_count: 3,
            html_url: `https://github.com/${owner}/${name}`,
        });
        const answers: Record<string, unknown> = {
            "https://api.github.com/search/repositories?q=topic:rpg-engine-adventure&sort=stars&per_page=20": { items: [repository("pozzo", "An adventure")] },
            "https://api.github.com/search/repositories?q=topic:rpg-engine-theme&sort=stars&per_page=20": {
                items: [repository("ledger", "A green theme"), repository("broken", "No theme"), repository("ledger", "Another's theme", "eve")],
            },
            "https://api.github.com/search/repositories?q=topic:rpg-engine-language&sort=stars&per_page=20": { items: [repository("lingua-de", "German")] },
            "https://raw.githubusercontent.com/ada/pozzo/main/adventure.yaml": "title: Il pozzo\nversion: 1.0.0\nabout: A well.\nlanguage: it\n",
            "https://raw.githubusercontent.com/ada/ledger/main/theme.yaml": "name: Ledger\nversion: 2.0.0\n",
            "https://raw.githubusercontent.com/eve/ledger/main/theme.yaml": "name: Ledger\nversion: 9.0.0\n",
            "https://raw.githubusercontent.com/ada/broken/main/theme.yaml": "colours: none\n",
            "https://raw.githubusercontent.com/ada/lingua-de/main/language.yaml": "code: de\nname: Deutsch\nversion: 1.5.0\n",
            ...files,
        };
        const zips: Record<string, Uint8Array> = {
            "https://codeload.github.com/ada/ledger/zip/HEAD": zipBytes(themeFiles((yaml) => yaml.replace("name: Ledger\n", ledger)), "ledger-main/"),
            "https://codeload.github.com/ada/lingua-de/zip/HEAD": zipBytes(germanFiles({ "{count} failures": "{count} Fehlschläge" }), "lingua-de-main/"),
        };

        return (url) => {
            const answer = answers[url];

            if (zips[url] !== undefined) {
                return Promise.resolve(zips[url]);
            }

            if (answer === undefined || failing.some((topic) => url.includes(topic))) {
                return Promise.reject(new Error(`${url} answered 404`));
            }

            return Promise.resolve(new TextEncoder().encode(typeof answer === "string" ? answer : JSON.stringify(answer)));
        };
    }

    it("lists adventures, themes and languages, each here and with an update only from the repository it came from", async () => {
        context = { ...context, download: github() };
        await rpg("package", "install", "https://github.com/ada/ledger");
        await rpg("package", "install", "https://github.com/ada/lingua-de/");
        const read = await catalog(folder, context);
        const fromGitHub = read.entries.filter((one) => one.source.startsWith("https://github.com/"));
        expect(fromGitHub.map((one) => [one.kind, one.source, one.version, one.installed, one.update])).toEqual([
            ["language", "https://github.com/ada/lingua-de", "1.5.0", "1.2.0", true],
            ["adventure", "https://github.com/ada/pozzo", "1.0.0", undefined, false],
            ["theme", "https://github.com/ada/ledger", "2.0.0", "1.0.0", true],
            ["theme", "https://github.com/eve/ledger", "9.0.0", undefined, false],
        ]);
        expect(fromGitHub.find((one) => one.kind === "theme")).toMatchObject({ description: "A green theme", author: "ada", verified: false, code: false, stars: 3 });
        expect(fromGitHub.find((one) => one.kind === "language")).toMatchObject({ language: "de" });
        expect(read.failed.github).toBeUndefined();
    });

    it("never offers an update of one here from a .zip or from npm, nor of a theme installed without a version", async () => {
        await rpg("package", "install", zipOf(themeFiles(versioned("1.0.0"))));
        context = { ...context, extensionFolders: [npmGerman("@rpgengine/lang-de")] };
        const elsewhere = await catalog(folder, { ...context, download: github() });
        expect(elsewhere.entries.filter((one) => one.kind !== "adventure").every((one) => one.installed === undefined && !one.update)).toBe(true);

        context = { ...context, download: github([], "name: Ledger\n") };
        await rpg("package", "install", "https://github.com/ada/ledger");
        const unversioned = await catalog(folder, context);
        expect(unversioned.entries.find((one) => one.source === "https://github.com/ada/ledger")).toMatchObject({ installed: "", update: false });
    });

    it("offers no update of one that asks a newer rpg-engine, says the engine it needs, and leaves out one not here", async () => {
        context = { ...context, download: github() };
        await rpg("package", "install", "https://github.com/ada/ledger");
        await rpg("package", "install", "https://github.com/ada/lingua-de");
        const asking = (engine: string) =>
            github([], undefined, {
                "https://raw.githubusercontent.com/ada/ledger/main/theme.yaml": `name: Ledger\nversion: 2.0.0\nengine: "${engine}"\n`,
                "https://raw.githubusercontent.com/eve/ledger/main/theme.yaml": `name: Ledger\nversion: 9.0.0\nengine: "${engine}"\n`,
                "https://raw.githubusercontent.com/ada/lingua-de/main/language.yaml": `code: de\nname: Deutsch\nversion: 1.5.0\nengine: "${engine}"\n`,
            });
        const fromGitHub = async (engine: string) => (await catalog(folder, { ...context, download: asking(engine) })).entries.filter((one) => one.source.startsWith("https://github.com/") && one.kind !== "adventure");

        expect((await fromGitHub("99.0")).map((one) => [one.kind, one.source, one.version, one.installed, one.update, one.newer])).toEqual([
            ["language", "https://github.com/ada/lingua-de", "1.2.0", "1.2.0", false, { version: "1.5.0", engine: "99.0" }],
            ["theme", "https://github.com/ada/ledger", "1.0.0", "1.0.0", false, { version: "2.0.0", engine: "99.0" }],
        ]);
        expect((await fromGitHub(getVersion())).map((one) => [one.source, one.version, one.update, one.newer])).toEqual([
            ["https://github.com/ada/lingua-de", "1.5.0", true, undefined],
            ["https://github.com/ada/ledger", "2.0.0", true, undefined],
            ["https://github.com/eve/ledger", "9.0.0", false, undefined],
        ]);
    });

    it("lists the rest when one search fails, and says which", async () => {
        const read = await catalog(folder, { ...context, download: github(["topic:rpg-engine-theme"]) });
        expect(read.entries.map((one) => one.kind).sort()).toEqual(["adventure", "language"]);
        expect(read.failed.github).toMatch(/^GitHub could not be asked for its themes: /);
    });
});
