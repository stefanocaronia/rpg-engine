// The package command (D-27, D-428, D-436, D-439, D-441): installing an extension on this computer with npm, ours or another with the player's own yes, adding it to
// the campaign, listing and removing; npm itself is a fake here, which copies the test extensions as it would install them.
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { request } from "node:http";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { runCommandLine } from "../src/command-line.ts";
import type { Confirm, Confirmed, Context, PackageInfo, PackageManager, Player } from "../src/core/context.ts";
import { SessionStore } from "../src/core/session-store.ts";
import { type Dashboard, startDashboard } from "../src/dashboard-server.ts";
import { inPlay, makeTempFolder, readLogFile, removeFolder, testContext, testExtensionFolders } from "./support.ts";

/** npm as these tests have it: the packages it knows by name, each the folder of a test extension; it installs one by copying it into node_modules. */
function fakeNpm(modules: string, known: Record<string, string>): PackageManager & { installed: string[]; }
{
    const installed: string[] = [];

    const info = (name: string): PackageInfo | undefined => {
        const folder = known[name];

        if (folder === undefined) {
            return undefined;
        }

        const manifest = join(folder, "package.json");
        const read = (existsSync(manifest) ? JSON.parse(readFileSync(manifest, "utf8")) : { version: "0.0.0" }) as { version: string; "rpg-engine"?: { kind: string; api: number; }; };
        return { name, version: read.version, ...(read["rpg-engine"] === undefined ? {} : { kind: read["rpg-engine"].kind, api: read["rpg-engine"].api }) };
    };

    return {
        installed,
        describe: (spec) => Promise.resolve(info(spec) ?? { failed: `npm has no package ${spec}`, missing: true }),
        install: (spec) => {
            // A name with its version, as rpg-engine gives npm the one it described.
            const name = spec.replace(/(?<=.)@[^@/]*$/, "");
            const to = join(modules, ...name.split("/"));
            mkdirSync(join(to, ".."), { recursive: true });
            // As npm does, what was there goes first: a link to a folder is taken away, never what it points to.
            rmSync(to, { recursive: true, force: true });
            cpSync(known[name], to, { recursive: true });
            installed.push(spec);
            return Promise.resolve(undefined);
        },
        uninstall: (name) => {
            rmSync(join(modules, ...name.split("/")), { recursive: true, force: true });
            return Promise.resolve(undefined);
        },
        search: () => Promise.resolve(Object.keys(known).flatMap((name) => info(name) ?? []).map((found) => ({ ...found, description: "a test package", author: "Ada" }))),
    };
}

// The weather's version, as its package.json gives it.
const weatherVersion = (JSON.parse(readFileSync(join(testExtensionFolders[0], "weather", "package.json"), "utf8")) as { version: string; }).version;

/** A player who answers on the dashboard's page, or in the host's form, with this button. */
function pageAnswering(button: number): Player
{
    return { choose: () => Promise.resolve(button) };
}

/** The window of the player's computer, answering so, and saying what it was asked. */
function windowAnswering(answer: Confirmed, asked: string[] = []): Confirm
{
    return {
        ask: (title, text) => {
            asked.push(`${title}: ${text}`);
            return Promise.resolve(answer);
        },
    };
}

let folder: string;
let modules: string;
let context: Context;
let npm: ReturnType<typeof fakeNpm>;
const rpg = (...args: string[]) => runCommandLine(args, context);

beforeEach(async () => {
    folder = makeTempFolder();
    modules = join(makeTempFolder(), "node_modules");
    const [ours, tests] = testExtensionFolders;
    npm = fakeNpm(modules, {
        "@rpgengine/weather": join(ours, "weather"),
        "@rpgengine/omens": join(tests, "omens"),
        "@test/rumors": join(tests, "rumors"),
        "seasons-of-the-test": join(tests, "seasons"),
        "left-pad": join(tests, "..", "systems"),
    });
    context = { ...testContext(folder), extensionFolders: [modules], packages: npm };
    await rpg("init", "--name", "Prova", "--language", "en", "--system", "ironsworn", "--difficulty", "normal", "--lethality", "dice");
    inPlay(folder);
});

afterEach(() => removeFolder(folder));

describe("a game system as a package (D-485)", () => {
    it("installs someone else's system with the player's yes, for a new campaign: the campaign keeps its own, and list says both", async () => {
        const tiny = join(makeTempFolder(), "system-tiny");
        mkdirSync(tiny, { recursive: true });
        writeFileSync(join(tiny, "package.json"), JSON.stringify({ name: "@test/system-tiny", version: "1.0.0", "rpg-engine": { kind: "system" } }));
        writeFileSync(join(tiny, "system.yaml"), "title: a tiny test system\nlanguage: en\n");
        npm = fakeNpm(modules, { "@test/system-tiny": tiny });
        context = { ...context, packages: npm, systemFolders: [...context.systemFolders, modules], confirm: windowAnswering("yes") };
        const result = await rpg("package", "install", "@test/system-tiny");
        expect(result.output).toBe("Installed the game system tiny 1.0.0, a tiny test system, not verified: at the player's risk. It is for a new campaign, chosen in its setup: this one plays ironsworn.");
        expect(readLogFile(folder).at(-1)).toMatchObject({ type: "package-installed", data: { package: "@test/system-tiny", kind: "system", verified: false } });
        expect(readFileSync(join(folder, "campaign.yaml"), "utf8")).toContain("system: ironsworn");
    });
});

describe("a language as a package (D-485 (3))", () => {
    /** A language package for German, its phrases given, as a folder npm would install. */
    function germanPack(name: string, phrases: Record<string, string>): string
    {
        const pack = join(makeTempFolder(), name.split("/").at(-1) ?? name);
        mkdirSync(pack, { recursive: true });
        writeFileSync(join(pack, "package.json"), JSON.stringify({ name, version: "1.0.0", "rpg-engine": { kind: "language" } }));
        writeFileSync(join(pack, "language.yaml"), "code: de\nname: Deutsch\n");
        writeFileSync(join(pack, "phrases.json"), JSON.stringify(phrases));
        return pack;
    }

    it("installs one with no yes, as texts only; refuses one that loses a {name}; and one language has one package", async () => {
        npm = fakeNpm(modules, {
            "@test/deutsch": germanPack("@test/deutsch", { "{count} failures": "{count} Fehlschläge" }),
            "@test/kaputt": germanPack("@test/kaputt", { "{count} failures": "Fehlschläge" }),
            "@test/besser": germanPack("@test/besser", { "{count} failures": "{count} Misserfolge", "{count} feet": "{count} Fuß" }),
        });
        context = { ...context, packages: npm, pageFolder: fileURLToPath(new URL("../src/dashboard/", import.meta.url)) };
        expect((await rpg("package", "install", "@test/deutsch")).output).toMatch(
            /^Installed Deutsch \(de\) 1\.0\.0, the dashboard's words made by hand, by someone else, for every campaign on this computer\. The \d+ phrases it lacks stay as the dashboard has them, its own or translated on the fly\.$/,
        );

        const broken = await rpg("package", "install", "@test/kaputt");
        expect(broken.output).toBe('@test/kaputt cannot be used: "Fehlschläge" has not the {names} of "{count} failures". It was taken off this computer.');
        expect(existsSync(join(modules, "@test", "kaputt"))).toBe(false);

        expect((await rpg("package", "install", "@test/besser")).output).toContain("It takes the place of @test/deutsch.");
        expect(existsSync(join(modules, "@test", "deutsch"))).toBe(false);
        expect((await rpg("package", "list")).output).toBeDefined();
    });
});

describe("rpg package install", () => {
    it("installs one of ours by its name alone, adds it to the campaign with its version, logs it, and gives the part for now (D-27, D-436)", async () => {
        const result = await rpg("package", "install", "weather");
        expect(result.output).toMatch(
            /^Installed weather \d+\.\d+\.\d+, verified, and the campaign uses it: the sky changes each dawn by a roll, with the seasons, hot deserts, polar cold and fog\. Its commands: weather, weather-set\. Its parts of your instructions are given when they apply: play, setup\.\n\nIts part for now:\n\nThe weather changes by itself each dawn/,
        );
        expect(npm.installed).toEqual([`@rpgengine/weather@${weatherVersion}`]);
        expect(readFileSync(join(folder, "campaign.yaml"), "utf8")).toContain(`\nextensions:\n  "@rpgengine/weather": ${weatherVersion}\n`);
        expect(readLogFile(folder).at(-1)).toMatchObject({ type: "package-installed", visibility: "public", data: { package: "@rpgengine/weather", version: weatherVersion, verified: true } });
        expect((await rpg("status")).output).toContain("\nExtensions: weather (the sky changes each dawn");

        expect((await rpg("package", "install", "weather")).output).toMatch(/^The campaign already uses weather \d+\.\d+\.\d+, verified: the sky/);
        expect(npm.installed).toEqual([`@rpgengine/weather@${weatherVersion}`]);
    });

    it("says when a chat sees the new tools, by the app in use (D-441)", async () => {
        context = { ...context, host: () => "codex-mcp-client" };
        expect((await rpg("package", "install", "weather")).output).toContain("Its commands: weather, weather-set. Codex sees them only once it is closed and opened again: tell the player.");
        await rpg("package", "remove", "weather");
        context = { ...context, host: () => "claude-code" };
        expect((await rpg("package", "install", "weather")).output).toContain("Its commands: weather, weather-set. They are yours from the player's next message.");
    });

    it("installs one not ours only with the player's own yes in the host's form or a window of their computer, never the page's nor the master's (D-441, D-478)", async () => {
        const refused = await rpg("package", "install", "@test/rumors");
        expect(refused.exitCode).toBe(1);
        expect(refused.output).toBe(
            "@test/rumors is not published by RPG Engine: its texts are someone else's, and RPG Engine takes no responsibility for it. Only the player can say yes to it, in the host's form or "
                + "in a window of their computer, and neither can be shown here (no desktop, as over SSH; on Linux zenity or kdialog shows it): install it where one can be. Nothing changed.",
        );

        // The page's click can be forged by a local program: it is never the yes (review of 19 October).
        context = { ...context, page: pageAnswering(0) };
        expect((await rpg("package", "install", "@test/rumors")).exitCode).toBe(1);
        expect(npm.installed).toEqual([]);

        context = { ...context, player: pageAnswering(1) };
        expect((await rpg("package", "install", "@test/rumors")).output).toBe("The player did not want @test/rumors. Nothing changed.");
        expect(npm.installed).toEqual([]);

        context = { ...context, player: pageAnswering(0) };
        expect((await rpg("package", "install", "@test/rumors")).output).toMatch(
            /^Installed rumors 2\.0\.0, not verified: at the player's risk, and the campaign uses it: a rumor in each tavern\. Its code is not used/,
        );
    });

    it("asks in a window of the player's computer where no form is, as on the command line, and asks the form first where there is one (D-478)", async () => {
        const asked: string[] = [];
        context = { ...context, terminal: true, confirm: windowAnswering("no", asked) };
        expect((await rpg("package", "install", "@test/rumors")).output).toBe("The player did not want @test/rumors. Nothing changed.");
        expect(asked).toEqual(["A package not ours: Install @test/rumors? @test/rumors is not published by RPG Engine: its texts are someone else's, and RPG Engine takes no responsibility for it."]);
        context = { ...context, confirm: windowAnswering("yes", asked) };
        expect((await rpg("package", "install", "@test/rumors")).exitCode).toBe(0);
        await rpg("package", "remove", "@test/rumors");
        context = { ...context, player: pageAnswering(0), confirm: windowAnswering("no", asked) };
        expect((await rpg("package", "install", "@test/rumors")).exitCode).toBe(0);
        expect((await rpg("rumors")).output).toMatch(/^Unknown command "rumors"/);
    });

    it("asks the player's yes for a .tgz of this computer, even named alone, saying what it holds and that its code runs (D-452)", async () => {
        context = { ...context, terminal: true, confirm: windowAnswering("none") };
        npm.describe = () => Promise.resolve({ name: "secret-notes", version: "1.0.0", kind: "extension", api: 1, author: "Ada" });
        expect((await rpg("package", "install", "secret-notes-1.0.0.tgz")).output).toBe(
            "secret-notes-1.0.0.tgz (secret-notes 1.0.0, by Ada) is a file of this computer, not a package published by RPG Engine: its code runs, it is never verified, "
                + "and RPG Engine takes no responsibility for it. Only the player can say yes to it, in the host's form or in a window of their computer, and neither can be shown here "
                + "(no desktop, as over SSH; on Linux zenity or kdialog shows it): install it where one can be. Nothing changed.",
        );
        expect(npm.installed).toEqual([]);
    });

    it("says, before the yes, that a .tgz of one of ours takes the place of npm's copy in every campaign, and npm's comes back when asked by its name (D-452)", async () => {
        await rpg("package", "install", "weather");
        context = { ...context, terminal: true };
        npm.describe = () => Promise.resolve({ name: "@rpgengine/weather", version: weatherVersion, kind: "extension", api: 1 });
        expect((await rpg("package", "install", "./weather.tgz")).output).toContain(
            `it is never verified, and RPG Engine takes no responsibility for it. It takes the place of @rpgengine/weather ${weatherVersion} from npm, in every campaign on this computer.`,
        );
    });

    it("installs npm's copy again over one from a folder of the same version, asked by its name (D-452)", async () => {
        const copy = join(makeTempFolder(), "weather");
        cpSync(join(testExtensionFolders[0], "weather"), copy, { recursive: true });
        mkdirSync(join(modules, "@rpgengine"), { recursive: true });
        symlinkSync(copy, join(modules, "@rpgengine", "weather"), "junction");
        await rpg("package", "install", "weather");
        expect(npm.installed).toEqual([`@rpgengine/weather@${weatherVersion}`]);
        removeFolder(join(copy, ".."));
    });

    it("never sends the player to the terminal when they closed the question without a yes", async () => {
        context = { ...context, player: { choose: () => Promise.resolve(undefined) } };
        expect((await rpg("package", "install", "@test/rumors")).output).toBe("The player closed the question without a yes to @test/rumors. Nothing changed: ask again only if they bring it up.");
        expect(npm.installed).toEqual([]);
    });

    it("never runs a stranger's code nor lets its part take the place of the core's (D-441)", async () => {
        context = { ...context, terminal: true, confirm: windowAnswering("yes") };
        await rpg("package", "install", "@test/rumors");
        const instructions = (await rpg("instructions")).output;
        expect(instructions).toContain("\n\n### Rumors (extension)\n\nEvery tavern holds a rumor.");
        expect(instructions).toContain("# Game master: core instructions");
        expect((await rpg("validate")).output).toBe("No problems.");
    });

    it("refuses a name alone that is not one of ours, and what npm does not have", async () => {
        expect((await rpg("package", "install", "left-pad")).output).toBe(
            "npm has no package @rpgengine/left-pad. Nothing changed: left-pad alone means @rpgengine/left-pad, one of RPG Engine's; another's is named with its scope, or as npm:left-pad without one.",
        );
        expect((await rpg("package", "install", "@rpgengine/nowhere")).output).toBe("npm has no package @rpgengine/nowhere. Nothing changed.");
        expect(readFileSync(join(folder, "campaign.yaml"), "utf8")).not.toContain("extensions:");
    });

    it("refuses what is not an extension for RPG Engine, and one made for another game system", async () => {
        context = { ...context, terminal: true };
        expect((await rpg("package", "install", "./not-a-package")).output).toMatch(/^\.\/not-a-package is not the folder of a package|npm has no package/);
        npm.describe = (spec) => Promise.resolve({ name: spec, version: "1.3.0" });
        expect((await rpg("package", "install", "@other/left-pad")).output).toBe(
            '@other/left-pad is not a package for RPG Engine: its package.json does not say "rpg-engine": {"kind": "extension"}. Nothing changed.',
        );
        npm.describe = (spec) => Promise.resolve({ name: spec, version: "0.1.0", kind: "extension", api: 1 });
        context = { ...context, confirm: windowAnswering("yes") };
        expect((await rpg("package", "install", "npm:seasons-of-the-test")).output).toBe(
            "seasons-of-the-test is installed on this computer, but it is for the game system 5e, and the campaign plays ironsworn: the campaign does not use it.",
        );
        npm.describe = (spec) => Promise.resolve({ name: spec, version: "3.0.0", kind: "extension", api: 3 });
        expect((await rpg("package", "install", "omens")).output).toBe(
            "@rpgengine/omens 3.0.0 is made for the extension API 3, and this RPG Engine reads the API 1 to 2: install a version made for these. Nothing changed.",
        );
        expect(readFileSync(join(folder, "campaign.yaml"), "utf8")).not.toContain("extensions:");
    });

    it("installs again a copy on this computer that no longer reads", async () => {
        await rpg("package", "install", "weather");
        writeFileSync(join(modules, "@rpgengine", "weather", "extension.yaml"), "title: [broken\n");
        expect((await rpg("package", "install", "weather")).output).toMatch(/^The campaign already uses weather \d+\.\d+\.\d+, verified|^Installed weather \d+\.\d+\.\d+, verified/);
        expect(npm.installed).toEqual([`@rpgengine/weather@${weatherVersion}`, `@rpgengine/weather@${weatherVersion}`]);
    });
});

describe("rpg package list, available, remove and uninstall (D-442)", () => {
    it("lists at once what is on this computer and what the campaign uses, a broken one with how to fix it, and one the campaign lists that is missing", async () => {
        await rpg("package", "install", "weather");
        await rpg("package", "install", "omens");
        writeFileSync(join(modules, "@rpgengine", "omens", "extension.yaml"), "title: [broken\n");
        writeFileSync(join(folder, "campaign.yaml"), `${readFileSync(join(folder, "campaign.yaml"), "utf8")}  "@other/tarot": 1.0.0\n`);
        npm.search = () => Promise.reject(new Error("list never asks npm"));
        expect((await rpg("package", "list")).output).toMatch(
            /^On this computer: omens \(broken: .*; install it again\); weather \d+\.\d+\.\d+, used by the campaign\.\nThe campaign lists, not installed here: @other\/tarot; install each with package install\.\npackage available says those npm has, and updates\.$/,
        );
        const listed = JSON.parse((await rpg("package", "list", "--json")).output) as { installed: Record<string, unknown>[]; };
        expect(listed.installed.find((one) => one.name === "weather")).toMatchObject({ package: "@rpgengine/weather", about: expect.stringMatching(/^the sky changes/), verified: true, used: true });
    });

    it("gives what npm has for this API, ours first, with its author and the updates of those installed", async () => {
        await rpg("package", "install", "weather");
        const installed = join(modules, "@rpgengine", "weather", "package.json");
        writeFileSync(installed, readFileSync(installed, "utf8").replace(/"version": "[^"]+"/, '"version": "0.0.1"'));
        expect((await rpg("package", "available")).output).toBe(
            `On npm: omens 1.2.0 by Ada: a test package; weather ${weatherVersion} by Ada, installed 0.0.1: an update: a test package; `
                + "rumors 2.0.0 (not verified) by Ada: a test package; seasons-of-the-test 0.1.0 (not verified) by Ada: a test package.",
        );
        npm.search = () => Promise.resolve({ failed: "npm's registry could not be reached: offline" });
        expect((await rpg("package", "available")).output).toBe("npm could not be asked: npm's registry could not be reached: offline.");
    });

    it("uninstalls one from this computer, and takes it out of the campaign", async () => {
        await rpg("package", "install", "weather");
        expect((await rpg("package", "uninstall", "weather")).output).toBe("weather is off this computer, and the campaign no longer uses it: another campaign that lists it asks to install it again.");
        expect(existsSync(join(modules, "@rpgengine", "weather"))).toBe(false);
        expect(readFileSync(join(folder, "campaign.yaml"), "utf8")).not.toContain("extensions:");
        expect(readLogFile(folder).at(-1)).toMatchObject({ type: "package-uninstalled", visibility: "public", data: { package: "@rpgengine/weather" } });
        expect((await rpg("package", "uninstall", "weather")).output).toBe("weather is not on this computer: no package is. Nothing changed.");
    });

    it("removes one from the campaign, keeping it on this computer and what it kept in the campaign", async () => {
        await rpg("package", "install", "weather");
        await rpg("advance", "--to", "day 1, 18:00");
        expect((await rpg("package", "remove", "weather")).output).toBe(
            "The campaign no longer uses weather: its commands and its parts of your instructions are gone; what it kept in the campaign stays, and comes back if it is installed again.",
        );
        expect(readFileSync(join(folder, "campaign.yaml"), "utf8")).not.toContain("extensions:");
        expect((await rpg("weather")).output).toMatch(/^Unknown command "weather"/);
        expect((await rpg("package", "remove", "weather")).output).toBe("The campaign does not use weather: it uses no package. Nothing changed.");
        expect((await rpg("package", "list")).output).toMatch(/^On this computer: weather \d+\.\d+\.\d+\.\n/);
    });
});

describe("the packages on the dashboard's page (D-475)", () => {
    let session: SessionStore;
    let dashboard: Dashboard;
    let port: number;

    beforeEach(async () => {
        session = new SessionStore({ systemFolders: context.systemFolders, watchFolder: () => ({ close: () => undefined }) });
        const started = await startDashboard({ ...context, files: session }, session, { ports: [0], page: folder });

        if (started === undefined) {
            throw new Error("The dashboard did not start.");
        }

        dashboard = started;
        port = Number(new URL(dashboard.url).port);
    });

    afterEach(async () => {
        await dashboard.close();
        session.close();
    });

    function send(method: string, path: string, body?: unknown): Promise<{ status: number; body: string; }>
    {
        const headers = body === undefined ? {} : { origin: `http://127.0.0.1:${port}`, "content-type": "application/json" };
        return new Promise((done, fail) => {
            const sent = request({ host: "127.0.0.1", port, path, method, headers }, (response) => {
                let text = "";
                response.setEncoding("utf8");
                response.on("data", (chunk: string) => (text += chunk));
                response.on("end", () => done({ status: response.statusCode ?? 0, body: text }));
            });
            sent.on("error", fail);
            sent.end(body === undefined ? undefined : JSON.stringify(body));
        });
    }

    it("lists the system and the packages, adds and takes out one of ours as the player, and the master hears of each", async () => {
        const before = JSON.parse((await send("GET", "/api/packages")).body);
        expect(before.system).toMatchObject({ name: "ironsworn" });
        expect(before.otherSystems.map((one: { name: string; }) => one.name)).toContain("5e");
        expect(before.installed).toEqual([]);
        const shop = JSON.parse((await send("GET", "/api/packages?npm=true")).body);
        expect(shop.available.map((one: { name: string; }) => one.name)).toContain("weather");
        const added = await send("POST", "/api/add", { source: "weather" });
        expect(added.status).toBe(202);
        expect(JSON.parse(added.body)).toEqual({ kind: "extension" });
        const listed = JSON.parse((await send("GET", "/api/packages")).body);
        expect(listed.systems.map((one: { name: string; used: boolean; }) => [one.name, one.used])).toEqual(expect.arrayContaining([["ironsworn", true], ["5e", false]]));
        const offered = JSON.parse((await send("GET", "/api/catalog")).body);
        expect(offered.entries).toEqual(expect.arrayContaining([expect.objectContaining({ kind: "extension", title: "weather", source: "weather", verified: true, installed: weatherVersion })]));
        expect(offered.failed).toMatchObject({ github: expect.stringContaining("reach GitHub") });
        const after = JSON.parse((await send("GET", "/api/packages")).body);
        expect(after.installed).toMatchObject([{ name: "weather", used: true, verified: true }]);
        expect(dashboard.news().lines.join("\n")).toContain("The player, on the dashboard, added weather: Installed weather");
        expect((await send("POST", "/api/package", { action: "remove", name: "weather" })).status).toBe(202);
        expect(JSON.parse((await send("GET", "/api/packages")).body).installed).toMatchObject([{ name: "weather", used: false }]);
    });

    it("adds someone else's package only with the player's yes in a window of their computer, never the host's form nor the page's click (D-478, D-485)", async () => {
        const refused = await send("POST", "/api/add", { source: "@test/rumors" });
        expect(refused.status).toBe(400);
        expect(JSON.parse(refused.body)).toMatchObject({ code: "no-window" });
        expect(JSON.parse((await send("GET", "/api/packages")).body).installed).toEqual([]);

        await dashboard.close();
        const asked: string[] = [];
        const started = await startDashboard({ ...context, files: session, player: pageAnswering(0), confirm: windowAnswering("no", asked) }, session, { ports: [0], page: folder });
        dashboard = started as Dashboard;
        port = Number(new URL(dashboard.url).port);
        expect(JSON.parse((await send("POST", "/api/add", { source: "@test/rumors" })).body)).toMatchObject({ code: "declined" });
        expect(asked).toHaveLength(1);

        await dashboard.close();
        dashboard = await startDashboard({ ...context, files: session, confirm: windowAnswering("yes") }, session, { ports: [0], page: folder }) as Dashboard;
        port = Number(new URL(dashboard.url).port);
        expect((await send("POST", "/api/add", { source: "@test/rumors" })).status).toBe(202);
        expect(JSON.parse((await send("GET", "/api/packages")).body).installed).toMatchObject([{ name: "rumors", used: true, verified: false }]);
    });
});
