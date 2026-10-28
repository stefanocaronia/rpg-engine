// The test kit for whoever writes an extension or a game system (D-506, D-514): a campaign of a game system in play, the engine's or one from its folder, with
// the extensions installed from their folders as the player's own, its commands run as the command line runs them, with the dice and the time decided; its
// log, its widgets and the dashboard read as the page reads them.
import { mkdirSync, mkdtempSync, readFileSync, rmdirSync, rmSync, symlinkSync, unlinkSync, writeFileSync } from "node:fs";
import { request } from "node:http";
import { tmpdir } from "node:os";
import { basename, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { stringify } from "yaml";
import { runCommandLine } from "./command-line.ts";
import { ask } from "./commands/ask.ts";
import { campaignWidgets, type ShownWidget } from "./commands/game-widgets.ts";
import { campaignSystem } from "./commands/game-world.ts";
import type { Context, Player } from "./core/context.ts";
import type { LogEntry } from "./core/log.ts";
import { SessionStore } from "./core/session-store.ts";
import { startDashboard } from "./dashboard-server.ts";
import { toolDescriptions } from "./mcp-server.ts";
import { loadSystemCode } from "./systems/index.ts";

export type { ShownWidget } from "./commands/game-widgets.ts";
export type { CardAsked, Context, Player, Rows, Said } from "./core/context.ts";
export type { LogEntry } from "./core/log.ts";
export { type SystemChecks, systemChecks } from "./system-checks.ts";

/** What a command printed, and its exit code: 0 when it did what it was asked. */
export interface Ran
{
    output: string;
    exitCode: number;
}

/** A campaign for an extension's tests, made by testCampaign. */
export interface TestCampaign
{
    /** Its folder, a temporary one of its own. */
    folder: string;
    /** What its commands run with: change its `page` to answer the player's questions, its `signal` to stop a call. */
    context: Context;
    /** Runs a command as the command line does, as `run("lockpicking", "Crypt door", "--who", "Kira")`. */
    run(...args: string[]): Promise<Ran>;
    /** Runs a command that must succeed, and gives what it printed; it throws with that when it fails. */
    ok(...args: string[]): Promise<string>;
    /** Asks the player with the core's ask, as through MCP, since the command line asks in words: give the context a page or a player to answer it. */
    ask(input: AskInput): Promise<Ran>;
    /** The dice show these faces in turn, each one die of any size; when they run out, a roll throws. */
    dice(...faces: number[]): void;
    /** The lines of the campaign's log, in order. */
    log(): LogEntry[];
    /** A file of the campaign, as text, by its path in it; undefined when there is none. */
    read(path: string): string | undefined;
    /** The widgets of the campaign's extensions, as the dashboard shows them; given a package's name, that package's alone, its game system's too. */
    widgets(of?: string): Promise<ShownWidget[]>;
    /** What a host reads of each of the core's tools, by name, as the MCP server gives it in this campaign: its description, then its parameters', with the examples of its game system (D-518). */
    descriptions(): Record<string, string>;
    /** The dashboard of the campaign, served on a port of this computer, with a page open on it. */
    dashboard(): Promise<TestDashboard>;
    /** Takes the campaign's folder away, and anything it started. */
    close(): Promise<void>;
}

/** What the core's ask takes, as its MCP tool does. */
export interface AskInput
{
    question: string;
    options?: string | string[];
    who?: string;
    square?: boolean;
    recipe?: string;
}

/** A campaign's dashboard in a test: the player through its page, what it answers, and what it is sent. */
export interface TestDashboard
{
    /** The player through the page: give it as the campaign's context.page for the questions to reach the page. */
    player: Player;
    /** What the dashboard answers at an address, as JSON, as /api/asked. */
    get(path: string): Promise<any>;
    /** Sends the dashboard what the page sends, as an answer to /api/answer; its status and what it answered. */
    post(path: string, body: unknown): Promise<{ status: number; body: any; }>;
    close(): Promise<void>;
}

/**
 * How a test campaign is made: its game system, the folders of the game systems beside the engine's, which win over them, the folders of the extensions it
 * uses, its language, and whether its setup is done (by default it is). A game system the package's repository installs, as a devDependency such as
 * @rpgengine/system-5e, is there too, after those given.
 */
export interface TestCampaignOptions
{
    system: string;
    /** Folders of game systems, each with its system.yaml, linked as the player's own: a system's repository its own, as `systems: ["."]`. */
    systems?: string[];
    extensions?: string[];
    language?: string;
    play?: boolean;
    /** Settings written in campaign.yaml as by hand, as {"calendar-start": "14 April"}. */
    settings?: Record<string, unknown>;
}

/**
 * A campaign in play for a test (D-506): made with init in a temporary folder, its setup done, using these extensions and game systems, each linked from its
 * folder as the player's own, never through npm, so that its code runs. Its dice show 4 until told otherwise, its time is a fixed day, its ids count up.
 */
export async function testCampaign(options: TestCampaignOptions): Promise<TestCampaign>
{
    const base = mkdtempSync(join(tmpdir(), "rpg-extension-test-"));
    const folder = join(base, "campaign");
    const packages = join(base, "packages");
    const systems = join(base, "systems");
    const linked: ReturnType<typeof linkPackage>[] = [];

    try {
        (options.extensions ?? []).forEach((extension) => linked.push(linkPackage(packages, resolve(extension))));
        (options.systems ?? []).forEach((system) => linked.push(linkPackage(systems, resolve(system), true)));
    } catch (error) {
        // The links first, alone, as close takes them away.
        linked.forEach((one) => unlink(one.link));
        rmSync(base, { recursive: true, force: true });
        throw error;
    }

    // The systems given first, then those the package's repository installs, as a devDependency (@rpgengine/system-5e), then the engine's own.
    const systemFolders = [systems, resolve("node_modules"), enginePath("../systems/")];
    let ids = 0;
    let faces: number[] | undefined;
    const context: Context = {
        folder,
        random: (sides) => {
            if (faces === undefined) {
                return Math.min(4, sides);
            }

            const face = faces.shift();

            if (face === undefined) {
                throw new Error("The test ran out of dice: give more faces with dice().");
            }

            return face;
        },
        now: () => new Date("2026-10-02T10:00:00Z"),
        newId: () => `id${++ids}`,
        newSalt: () => "salt",
        actor: "master",
        platform: process.platform === "win32" || process.platform === "darwin" ? process.platform : "linux",
        systemFolders,
        systemCode: await loadSystemCode(systemFolders),
        extensionFolders: [packages],
    };
    const started: TestDashboard[] = [];
    // Each call reads the campaign's context as the test left it, a page or a signal of its own included.
    const campaign: TestCampaign = {
        folder,
        context,
        run: (...args) => runCommandLine(args, campaign.context),
        ok: async (...args) => {
            const ran = await campaign.run(...args);

            if (ran.exitCode !== 0) {
                throw new Error(`${args.join(" ")} failed: ${ran.output}`);
            }

            return ran.output;
        },
        ask: async (input) => {
            try {
                return { output: ask.format(await ask.run(ask.input.parse(input), campaign.context)), exitCode: 0 };
            } catch (error) {
                return { output: error instanceof Error ? error.message : String(error), exitCode: 1 };
            }
        },
        dice: (...given) => (faces = [...given]),
        log: () => (readText(join(folder, "log.jsonl")) ?? "").split("\n").filter((line) => line.trim() !== "").map((line) => JSON.parse(line) as LogEntry),
        read: (path) => readText(join(folder, path)),
        // The extensions' alone unless a package is named, as a game system may have widgets of its own, as the 5e's death saves (D-516).
        widgets: async (of) => {
            const system = campaignSystem(folder, campaign.context)?.name;
            return (await campaignWidgets(folder, campaign.context)).filter((widget) => of === undefined ? widget.extension !== system : widget.extension === of);
        },
        descriptions: () => toolDescriptions(campaign.context),
        dashboard: async () => {
            const dashboard = await testDashboard(campaign.context);
            started.push(dashboard);
            return dashboard;
        },
        close: async () => {
            await Promise.all(started.map((dashboard) => dashboard.close()));
            // The links first, alone: never through them, into the extension's own folder.
            linked.forEach((one) => unlink(one.link));
            rmSync(base, { recursive: true, force: true });
        },
    };
    await campaign.ok("init", "--name", "Test", "--language", options.language ?? "en", "--system", options.system, "--difficulty", "normal", "--lethality", "dice");

    if (options.play !== false) {
        inPlay(folder);
    }

    const extensions = Object.fromEntries(linked.filter((one) => !one.system).map((one) => [one.name, one.version]));
    const added = { ...options.settings, ...(linked.length === 0 ? {} : { extensions }) };
    const written = readFileSync(join(folder, "campaign.yaml"), "utf8");
    writeFileSync(join(folder, "campaign.yaml"), Object.keys(added).length === 0 ? written : `${written}${stringify(added)}`);
    return campaign;
}

/**
 * A package's folder linked into those a test campaign reads, as one the player installed from a folder: its name and version. A game system's by the name of
 * its package, which gives it its name, as @rpgengine/system-5e is 5e; one of data alone, without a package.json, by its folder's.
 */
function linkPackage(packages: string, folder: string, system = false): { name: string; version: string; link: string; system: boolean; }
{
    const manifest = (readText(join(folder, "package.json")) === undefined && system
        ? { name: basename(folder), version: "0.0.0" }
        : JSON.parse(readText(join(folder, "package.json")) ?? "{}")) as { name?: string; version?: string; };

    if (manifest.name === undefined || manifest.version === undefined) {
        throw new Error(`${folder} has no package.json with a name and a version: give the folder of ${system ? "a game system" : "an extension"}.`);
    }

    if (system && readText(join(folder, "system.yaml")) === undefined) {
        throw new Error(`${folder} has no system.yaml: give the folder of a game system.`);
    }

    const scope = manifest.name.includes("/") ? manifest.name.split("/")[0] : "";
    mkdirSync(join(packages, scope), { recursive: true });
    // A junction on Windows, which needs no rights; a link elsewhere.
    const link = join(packages, scope, basename(manifest.name));
    symlinkSync(folder, link, "junction");
    return { name: manifest.name, version: manifest.version, link, system };
}

/** Takes a link away, never what it leads to: a junction of Windows goes as an empty folder does. */
function unlink(link: string): void
{
    try {
        unlinkSync(link);
    } catch {
        rmdirSync(link);
    }
}

/** A campaign that init made in play, as after its setup (MOD-1): the settings of play that are not there take their usual values. */
function inPlay(folder: string): void
{
    const state = join(folder, "state.yaml");
    writeFileSync(state, readFileSync(state, "utf8").replace(/^mode: setup$/m, "mode: play"));
    const settings = join(folder, "campaign.yaml");
    const written = readFileSync(settings, "utf8");
    const usual = ["saves: checkpoint", "rigor: smooth", "dice: digital", "units: metric"].filter((line) => !new RegExp(`^${line.split(":")[0]}:`, "m").test(written));
    writeFileSync(settings, `${written}${usual.map((line) => `${line}\n`).join("")}`);
}

/** The dashboard of a test campaign, with a page open on it that the server has heard from, so that questions go to the page. */
async function testDashboard(context: Context): Promise<TestDashboard>
{
    const session = new SessionStore({ systemFolders: context.systemFolders, watchFolder: () => ({ close: () => undefined }) });
    const dashboard = await startDashboard({ ...context, files: session }, session, { ports: [0], page: context.folder });

    if (dashboard === undefined) {
        session.close();
        throw new Error("The test's dashboard did not start.");
    }

    const port = Number(new URL(dashboard.url).port);
    const call = (method: string, path: string, body?: unknown): Promise<{ status: number; body: any; }> =>
        new Promise((done, fail) => {
            const headers = body === undefined ? {} : { "origin": `http://127.0.0.1:${port}`, "content-type": "application/json" };
            const sent = request({ host: "127.0.0.1", port, path, method, headers }, (response) => {
                let text = "";
                response.setEncoding("utf8");
                response.on("data", (chunk: string) => (text += chunk));
                response.on("end", () => done({ status: response.statusCode ?? 0, body: text.trim() === "" ? {} : JSON.parse(text) as unknown }));
            });
            sent.on("error", fail);
            sent.end(body === undefined ? undefined : JSON.stringify(body));
        });
    const page = request({ host: "127.0.0.1", port, path: "/events" });
    const opened = new Promise((done) => page.on("response", (response) => response.once("data", done)));
    page.end();
    await opened;
    return {
        player: dashboard.player,
        get: async (path) => (await call("GET", path)).body,
        post: (path, body) => call("POST", path, body),
        close: async () => {
            page.destroy();
            await dashboard.close();
            session.close();
        },
    };
}

/** A path of the engine's package, from this file in src/ or dist/ alike. */
function enginePath(relative: string): string
{
    return fileURLToPath(new URL(relative, import.meta.url));
}

function readText(path: string): string | undefined
{
    try {
        return readFileSync(path, "utf8");
    } catch {
        return undefined;
    }
}
