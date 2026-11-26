// The launcher: the campaigns of this computer listed, made and opened by starting their tables, its page behind the dashboard's gate, its end, its window,
// the folder window, the icon, and `rpg open`, `rpg launcher` and `rpg icon`. Everything from outside is the test's own: folders, clock, tables, browser.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { request } from "node:http";
import { basename, join } from "node:path";
import { PassThrough } from "node:stream";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { runCommandLine } from "../src/cli/command-line.ts";
import { offerIcon, type Terminal } from "../src/cli/icon.ts";
import { type OpenWhere, runIcon, runOpen, sayAndEnd } from "../src/cli/open.ts";
import { chooseFolder, dialogCommands, folderCommands } from "../src/confirm/index.ts";
import type { Context } from "../src/core/context.ts";
import { readLog } from "../src/core/log.ts";
import { isPageAddress } from "../src/core/page-address.ts";
import { stopTree } from "../src/core/process.ts";
import { SessionStore } from "../src/core/session-store.ts";
import { FileStore, withFiles } from "../src/core/store.ts";
import { productName } from "../src/dashboard/shell/product.ts";
import { windowPlace as pageWindowPlace } from "../src/dashboard/shell/window.ts";
import {
    appBrowser,
    type BrowserSystem,
    iconAsked,
    type IconCommand,
    iconCommand,
    iconToRemake,
    makeIcons,
    noteIconMade,
    oneWindowAtATime,
    openedAddress,
    openInBrowser,
    openWindow,
    pageTitle,
    placeCommand,
    readPlaced,
    realSystem,
    windowPlace,
    windowTitles,
} from "../src/desktop/index.ts";
import type { HostOffered, MasterDriver, MasterModel } from "../src/master/index.ts";
import { type Dashboard, type LauncherWay, startDashboard } from "../src/server/dashboard/index.ts";
import {
    campaignsFolder,
    folderName,
    forgetCampaign,
    type Launcher,
    type LauncherOptions,
    launcherWay,
    listCampaigns,
    makeCampaign,
    openCampaign,
    openLauncher,
    reachLauncher,
    readLauncher,
    rememberCampaign,
    runLauncher,
    type TableStarter,
} from "../src/server/launcher/index.ts";
import { launcherHtml, pageHtml } from "../src/server/page/index.ts";
import { type Probed, readLastChat, type TablePlace } from "../src/server/table/index.ts";
import { writePlace } from "../src/server/table/place.ts";
import { drivenHelpers } from "./fake-helpers.ts";
import { pageFolder } from "./i18n/phrases.ts";
import { inPlay, makeTempFolder, testContext } from "./support.ts";

const version = "1.2.3";

let home: string;
let userHome: string;
let launchers: Launcher[];

beforeEach(() => {
    home = makeTempFolder();
    userHome = makeTempFolder();
    launchers = [];
});

afterEach(async () => {
    for (const launcher of launchers) {
        await launcher.end("the test is over");
    }
});

/** A campaign made as rpg init makes it, in `folder`, with the fake system. */
async function campaignIn(folder: string, name: string): Promise<string>
{
    mkdirSync(folder, { recursive: true });
    const made = await runCommandLine(["init", "--name", name, "--language", "it", "--system", "fake"], testContext(folder));
    expect(made.exitCode, made.output).toBe(0);
    return folder;
}

/** A table's place, as a table writes it once it serves. */
function placeOf(root: string, tableVersion = version, token = "token"): TablePlace
{
    return { root, pid: 4242, version: tableVersion, socket: join(home, "socket"), token, url: `http://127.0.0.1:6${tableVersion.length}00` };
}

/** Tables that answer as the test says: each place's token gives what its probe says, and a start writes the place given for the campaign. */
function fakeTables(answers: Record<string, Probed>, started: (root: string) => TablePlace | undefined = () => undefined): TableStarter & { starts: string[]; clock: { now: number; }; }
{
    const clock = { now: 0 };
    const starts: string[] = [];
    return {
        home,
        version,
        starts,
        clock,
        start: (root) => {
            starts.push(root);
            const place = started(root);

            if (place !== undefined) {
                writePlace(home, place);
            }
        },
        probe: (place) => Promise.resolve(answers[place.token] ?? "nobody"),
        now: () => clock.now,
        wait: (milliseconds) => {
            clock.now += milliseconds;
            return Promise.resolve();
        },
    };
}

describe("the campaigns of this computer", () => {
    it("lists those remembered, those in the folder of new campaigns and those whose table left its place, each once, the last opened first, then by name", async () => {
        const kept = await campaignIn(join(makeTempFolder(), "kept"), "Rocca");
        const inFolder = await campaignIn(join(campaignsFolder(userHome), "Brughiera"), "Brughiera");
        const another = await campaignIn(join(campaignsFolder(userHome), "Abbazia"), "Abbazia");
        const tabled = await campaignIn(join(makeTempFolder(), "tabled"), "Torre");
        mkdirSync(join(campaignsFolder(userHome), "not a campaign"));
        rememberCampaign(home, kept, new Date("2026-11-20T10:00:00Z"));
        rememberCampaign(home, another, new Date("2026-11-24T10:00:00Z"));
        writePlace(home, placeOf(tabled, version, "open"));
        writePlace(home, placeOf(inFolder, version, "stale"));

        const listed = await listCampaigns({ home, userHome, answers: (place) => Promise.resolve(place.token === "open") });

        expect(listed.map((one) => one.name)).toEqual(["Abbazia", "Rocca", "Brughiera", "Torre"]);
        expect(listed[0]).toEqual({ root: another, name: "Abbazia", system: "fake", language: "it", opened: "2026-11-24T10:00:00.000Z", open: false, missing: false });
        expect(listed.find((one) => one.name === "Torre")?.open).toBe(true);
        expect(listed.find((one) => one.name === "Brughiera")?.open).toBe(false);
    });

    it("says a campaign whose folder is gone, and one whose file does not read, by its folder's name and why", async () => {
        const gone = join(makeTempFolder(), "gone");
        const broken = await campaignIn(join(makeTempFolder(), "broken"), "Rotta");
        writeFileSync(join(broken, "campaign.yaml"), "name: [unclosed\n");
        rememberCampaign(home, gone, new Date("2026-11-20T10:00:00Z"));
        rememberCampaign(home, broken);

        const listed = await listCampaigns({ home, userHome, answers: () => Promise.resolve(false) });

        expect(listed[0]).toMatchObject({ root: gone, name: "gone", missing: true, open: false });
        expect(listed[1]).toMatchObject({ root: broken, name: "broken", missing: false });
        expect(listed[1]?.problem).toEqual(expect.any(String));
    });

    it("forgets a campaign from the list alone, even one the folder of new campaigns lists, and lists it again once remembered", async () => {
        const inFolder = await campaignIn(join(campaignsFolder(userHome), "Brughiera"), "Brughiera");
        forgetCampaign(home, inFolder);

        expect(await listCampaigns({ home, userHome, answers: () => Promise.resolve(false) })).toEqual([]);
        expect(existsSync(join(inFolder, "campaign.yaml"))).toBe(true);

        rememberCampaign(home, inFolder);
        expect((await listCampaigns({ home, userHome, answers: () => Promise.resolve(false) })).map((one) => one.name)).toEqual(["Brughiera"]);
    });
});

describe("a campaign opened from the launcher", () => {
    it("gives the link of its table where one of this engine answers, and starts none", async () => {
        const root = await campaignIn(makeTempFolder(), "Rocca");
        writePlace(home, placeOf(root));
        const tables = fakeTables({ token: { version, seated: false } });

        expect(await openCampaign(root, tables)).toEqual({ url: placeOf(root).url });
        expect(tables.starts).toEqual([]);
    });

    it("starts its table where none answers, a stale place too, and waits for it to serve", async () => {
        const root = await campaignIn(makeTempFolder(), "Rocca");
        writePlace(home, placeOf(root, version, "stale"));
        const tables = fakeTables({ fresh: { version, seated: false } }, (started) => placeOf(started, version, "fresh"));

        expect(await openCampaign(root, tables)).toEqual({ url: placeOf(root).url });
        expect(tables.starts).toEqual([root]);
    });

    it("refuses where its table runs another engine, saying which and how to end it, and never ends it", async () => {
        const root = await campaignIn(makeTempFolder(), "Rocca");
        writePlace(home, placeOf(root, "0.9.0"));
        const tables = fakeTables({ token: { version: "0.9.0", seated: true } });
        const opened = await openCampaign(root, tables);

        expect(opened).toEqual({ error: expect.stringContaining("runs RPG Engine 0.9.0, not 1.2.3") });
        expect("error" in opened && opened.error).toContain("4242");
        expect(tables.starts).toEqual([]);
    });

    it("refuses once its table has not started within fifteen seconds, and where its folder holds no campaign", async () => {
        const root = await campaignIn(makeTempFolder(), "Rocca");
        const tables = fakeTables({});

        expect(await openCampaign(root, tables)).toEqual({ error: expect.stringContaining("did not start within 15 seconds") });
        expect(tables.starts).toEqual([root]);
        expect(tables.clock.now).toBeGreaterThanOrEqual(15_000);
        expect(await openCampaign(makeTempFolder(), tables)).toEqual({ error: expect.stringContaining("holds no campaign") });
    });
});

describe("a campaign made from the launcher", () => {
    const driver = (host: string): MasterDriver | undefined =>
        host === "claudeCode"
            ? {
                open: () => {
                    throw new Error("no chat in a test");
                },
                missing: () => undefined,
                program: () => undefined,
                environment: (given) => given,
                models: () => Promise.resolve([]),
                model: "sonnet",
                efforts: ["low", "high"],
            }
            : undefined;

    function where(tables: TableStarter): Parameters<typeof makeCampaign>[1]
    {
        return { userHome, context: testContext(userHome), now: () => new Date("2026-11-25T08:00:00Z"), driver, tables };
    }

    const opening = (): TableStarter & { starts: string[]; } => fakeTables({ made: { version, seated: false } }, (root) => placeOf(root, version, "made"));

    it("goes in a folder named after it in the folder of new campaigns, as rpg init makes it for a player; it is remembered and opened", async () => {
        const made = await makeCampaign({ name: "La Rocca: atto I?", language: "it", system: "fake" }, where(opening()));
        const root = join(campaignsFolder(userHome), "La Rocca atto I");

        expect(made).toEqual({ url: placeOf(root).url, root });
        expect(readFileSync(join(root, "campaign.yaml"), "utf8")).toContain('name: "La Rocca: atto I?"');
        expect(readFileSync(join(root, "state.yaml"), "utf8")).toContain("mode: setup");
        expect((await listCampaigns({ home, userHome, answers: () => Promise.resolve(true) }))[0]).toMatchObject({ root, opened: "2026-11-25T08:00:00.000Z" });
    });

    it("never goes in a folder that holds files already: -2, -3 after the name", async () => {
        mkdirSync(join(campaignsFolder(userHome), "Rocca"), { recursive: true });
        writeFileSync(join(campaignsFolder(userHome), "Rocca", "notes.txt"), "mine");
        writeFileSync(join(campaignsFolder(userHome), "Rocca-2"), "a file");
        const made = await makeCampaign({ name: "Rocca", language: "it", system: "fake" }, where(opening()));

        expect(made).toMatchObject({ root: join(campaignsFolder(userHome), "Rocca-3") });
        expect(folderName("con")).toBe("Campaign");
        expect(folderName(" ...")).toBe("Campaign");
    });

    it("is made as the player makes it, as the page's own writes run their commands", async () => {
        const made = await makeCampaign({ name: "Rocca", language: "it", system: "fake" }, where(opening()));
        const root = "root" in made ? made.root ?? "" : "";

        expect(withFiles(new FileStore(), () => readLog(root)).find((entry) => entry.type === "campaign-created")).toMatchObject({ by: "player" });
    });

    it("goes in the folder given when it is empty or not there yet; a folder with files is refused, and nothing is made", async () => {
        const given = join(makeTempFolder(), "here");
        expect(await makeCampaign({ name: "Rocca", folder: given, language: "it", system: "fake" }, where(opening()))).toMatchObject({ root: given });

        const full = makeTempFolder();
        writeFileSync(join(full, "notes.txt"), "mine");
        expect(await makeCampaign({ name: "Rocca", folder: full, language: "it", system: "fake" }, where(opening()))).toEqual({ error: expect.stringContaining("already holds files") });
        expect(existsSync(join(full, "campaign.yaml"))).toBe(false);
    });

    it("writes the first chat's host, model and effort for its page to propose, after the checks the table makes; refuses others before making anything", async () => {
        const made = await makeCampaign({ name: "Rocca", language: "it", system: "fake", host: "claudeCode", effort: "high" }, where(opening()));
        const root = "root" in made ? made.root ?? "" : "";

        expect(readLastChat(home, root)).toEqual({ root, host: "claudeCode", model: "sonnet", effort: "high" });
        expect(await makeCampaign({ name: "Altra", language: "it", system: "fake", host: "claudeCode", effort: "max" }, where(opening()))).toEqual({ error: expect.stringContaining("knows no effort max") });
        expect(await makeCampaign({ name: "Altra", language: "it", system: "fake", host: "codex" }, where(opening()))).toEqual({ error: expect.stringContaining("cannot open in codex yet") });
        expect(await makeCampaign({ name: "Altra", language: "it", system: "fake", host: "claudeCode", model: "two words" }, where(opening()))).toEqual({ error: expect.stringContaining("no name of a model") });
        expect(await makeCampaign({ name: "Altra", language: "it", system: "nowhere" }, where(opening()))).toEqual({ error: expect.stringContaining("is not an installed system") });
        expect(existsSync(join(campaignsFolder(userHome), "Altra", "campaign.yaml"))).toBe(false);
    });

    it("takes an effort of the model chosen as its host listed it, refuses one it does not take naming its own, and takes a model the host did not list", async () => {
        const models = (host: string): MasterModel[] => (host === "claudeCode" ? [{ id: "haiku", name: "Haiku 4.5", efforts: [] }, { id: "opus", name: "Opus 5.5", efforts: ["low", "max"] }] : []);
        const listed = (tables: TableStarter): Parameters<typeof makeCampaign>[1] => ({ ...where(tables), models });
        const wish = { name: "Rocca", language: "it", system: "fake", host: "claudeCode" };

        expect(await makeCampaign({ ...wish, model: "opus", effort: "high" }, listed(opening()))).toEqual({ error: "Opus 5.5 takes no effort high in Claude Code: choose one of low, max." });
        expect(await makeCampaign({ ...wish, model: "haiku", effort: "low" }, listed(opening()))).toEqual({ error: "Haiku 4.5 takes no effort in Claude Code: leave the effort to the host." });
        const made = await makeCampaign({ ...wish, model: "opus", effort: "max" }, listed(opening()));
        const root = "root" in made ? made.root ?? "" : "";
        expect(readLastChat(home, root)).toEqual({ root, host: "claudeCode", model: "opus", effort: "max" });
        const typed = await makeCampaign({ ...wish, name: "Altra", model: "claude-opus-6", effort: "high" }, listed(opening()));
        expect(readLastChat(home, "root" in typed ? typed.root ?? "" : "")).toMatchObject({ model: "claude-opus-6", effort: "high" });
    });
});

/** The options of a launcher in the test's folders, with fake tables, hosts and folder window. */
function launcherOptions(options: Partial<LauncherOptions> = {}): LauncherOptions
{
    const tables = fakeTables({ made: { version, seated: false } }, (root) => placeOf(root, version, "made"));
    const hosts: HostOffered[] = [
        { id: "claudeCode", name: "Claude Code", ready: true, found: true, model: "sonnet", efforts: ["low", "medium", "high"], models: [{ id: "opus", name: "Opus 5.5", efforts: ["low", "high"] }] },
        { id: "codex", name: "Codex", ready: false, found: false, model: "", efforts: [], models: [] },
    ];
    return {
        home,
        userHome,
        platform: "linux",
        version,
        context: testContext(userHome),
        ports: [0],
        lookAgainFor: 0,
        page: pageFolder,
        tables,
        answers: (place) => Promise.resolve(place.token === "made"),
        pick: () => Promise.resolve(join(userHome, "Chosen")),
        hosts: () => hosts,
        openWindow: () => Promise.resolve(false),
        ...options,
    };
}

async function startLauncher(options: Partial<LauncherOptions> = {}): Promise<Launcher>
{
    const opened = await openLauncher(launcherOptions(options));

    if (!("url" in opened)) {
        throw new Error(`The launcher did not start: ${JSON.stringify(opened)}`);
    }

    launchers.push(opened);
    return opened;
}

/** A request to a server as its page sends it, with the page's origin on a POST unless the headers say otherwise: its status and JSON or text. */
function call(url: string, method: string, path: string, body?: unknown, headers: Record<string, string> = {}): Promise<{ status: number; body: unknown; text: string; type: string; }>
{
    const address = new URL(path, url);
    const sent = body === undefined ? undefined : JSON.stringify(body);
    const own = method === "POST" ? { origin: address.origin } : {};
    return new Promise((done, fail) => {
        request(address, { method, headers: { ...own, ...headers } }, (response) => {
            let text = "";
            response.setEncoding("utf8");
            response.on("data", (chunk: string) => (text += chunk));
            response.on("end", () => {
                let parsed: unknown;

                try {
                    parsed = JSON.parse(text);
                } catch {
                    parsed = undefined;
                }

                done({ status: response.statusCode ?? 0, body: parsed, text, type: String(response.headers["content-type"] ?? "") });
            });
        }).on("error", fail).end(sent);
    });
}

describe("the launcher's server", () => {
    it("gives the page the campaigns, the hosts, the systems and the languages, behind the dashboard's gate", async () => {
        const kept = await campaignIn(join(campaignsFolder(userHome), "Rocca"), "Rocca");
        const launcher = await startLauncher();
        const read = await call(launcher.url, "GET", "/api/launcher");

        expect(read.status).toBe(200);
        expect(read.body).toMatchObject({
            launcher: true,
            version,
            folder: campaignsFolder(userHome),
            campaigns: [{ root: kept, name: "Rocca", system: "fake", language: "it", open: false, missing: false }],
            hosts: [
                { id: "claudeCode", name: "Claude Code", ready: true, found: true, model: "sonnet", efforts: ["low", "medium", "high"], models: [{ id: "opus", name: "Opus 5.5", efforts: ["low", "high"] }] },
                { id: "codex", name: "Codex", ready: false, found: false, model: "", efforts: [], models: [] },
            ],
            systems: expect.arrayContaining([{ name: "fake", title: expect.any(String) }, { name: "free", title: expect.any(String) }]),
            languages: expect.arrayContaining(["en", "it", "ja", "ar"]),
        });
        expect((read.body as { languages: string[]; }).languages[0]).toBe("en");
        expect((await call(launcher.url, "GET", "/api/launcher", undefined, { host: "evil.example" })).status).toBe(403);
        expect((await call(launcher.url, "GET", "/api/launcher", undefined, { "sec-fetch-site": "cross-site" })).status).toBe(403);
        expect((await call(launcher.url, "POST", "/api/launcher", { pick: true }, { origin: "http://evil.example" })).status).toBe(403);
        expect((await call(launcher.url, "POST", "/api/launcher", { pick: true }, { origin: "" })).status).toBe(403);
        expect((await call(launcher.url, "PUT", "/api/launcher")).status).toBe(405);
    });

    it("serves its page, its entry and the page's files, with the dashboard's policy", async () => {
        const launcher = await startLauncher();
        const page = await call(launcher.url, "GET", "/");

        expect(page.status).toBe(200);
        expect(page.text).toContain('<script type="module" src="/launcher/main.js"></script>');
        expect((await call(launcher.url, "GET", "/assets/favicon.svg")).type).toBe("image/svg+xml");
        expect((await call(launcher.url, "GET", "/vendor/preact.js")).status).toBe(200);
        expect((await call(launcher.url, "GET", "/api/view")).status).toBe(404);
        expect((await call(launcher.url, "GET", "/images/map.png")).status).toBe(404);
    });

    it("opens a campaign, makes one, adds and forgets one, and says to the pages listening that the list changed", async () => {
        const kept = await campaignIn(join(makeTempFolder(), "Rocca"), "Rocca");
        const launcher = await startLauncher();
        const heard = listenTo(launcher.url);
        await vi.waitFor(() => expect(heard.opened()).toBe(true));

        expect(await call(launcher.url, "POST", "/api/launcher", { open: { root: kept } })).toMatchObject({ status: 200, body: { url: placeOf(kept).url } });
        expect(await call(launcher.url, "POST", "/api/launcher", { open: { root: makeTempFolder() } })).toMatchObject({ status: 409, body: { error: expect.stringContaining("holds no campaign") } });
        const made = await call(launcher.url, "POST", "/api/launcher", { create: { name: "Brughiera", language: "it", system: "fake" } });
        const root = join(campaignsFolder(userHome), "Brughiera");
        expect(made).toMatchObject({ status: 200, body: { url: placeOf(root).url, root } });
        expect(await call(launcher.url, "POST", "/api/launcher", { create: { name: "Altra", language: "it", system: "nowhere" } })).toMatchObject({ status: 409, body: { error: expect.any(String) } });

        const other = await campaignIn(join(makeTempFolder(), "Torre"), "Torre");
        const added = await call(launcher.url, "POST", "/api/launcher", { add: { root: other } });
        expect(added.status).toBe(200);
        expect((added.body as { campaigns: { name: string; }[]; }).campaigns.map((one) => one.name)).toEqual(["Brughiera", "Rocca", "Torre"]);
        expect(await call(launcher.url, "POST", "/api/launcher", { add: { root: makeTempFolder() } })).toMatchObject({ status: 409, body: { error: expect.stringContaining("is no campaign") } });

        const forgotten = await call(launcher.url, "POST", "/api/launcher", { forget: { root: other } });
        expect((forgotten.body as { campaigns: { name: string; }[]; }).campaigns.map((one) => one.name)).toEqual(["Brughiera", "Rocca"]);
        expect(existsSync(join(other, "campaign.yaml"))).toBe(true);
        // The open, the campaign made, the one added and the one forgotten.
        await vi.waitFor(() => expect(heard.count()).toBe(4));
        heard.close();
    });

    it("opens a campaign's page in a window of its own once its table answers, one for two quick asks; where it opens none, the page goes there itself", async () => {
        const kept = await campaignIn(join(makeTempFolder(), "Rocca"), "Rocca");
        const windows: string[] = [];
        let opens = true;

        const opening = (url: string, kind: string): Promise<boolean> => {
            windows.push(`${kind} ${url}`);
            return new Promise((done) => setTimeout(() => done(opens), 50));
        };

        // Each campaign's table at an address of its own.
        const ports: Record<string, number> = { Rocca: 6501, Brughiera: 6502, Torre: 6503 };
        const tableOf = (root: string): TablePlace => ({ ...placeOf(root, version, "made"), url: `http://127.0.0.1:${ports[basename(root)] ?? 6500}` });
        const tables = fakeTables({ made: { version, seated: false } }, tableOf);
        const launcher = await startLauncher({ openWindow: opening, tables });

        const twice = await Promise.all([1, 2].map(() => call(launcher.url, "POST", "/api/launcher", { open: { root: kept } })));
        expect(twice.map((one) => one.body)).toEqual([{ url: tableOf(kept).url, window: true }, { url: tableOf(kept).url, window: true }]);
        expect(windows).toEqual([`campaign ${tableOf(kept).url}`]);

        const root = join(campaignsFolder(userHome), "Brughiera");
        const made = await call(launcher.url, "POST", "/api/launcher", { create: { name: "Brughiera", language: "it", system: "fake" } });
        expect(made.body).toEqual({ url: tableOf(root).url, root, window: true });
        expect(windows.at(-1)).toBe(`campaign ${tableOf(root).url}`);

        // No window could be opened, as with no Chromium: nothing opened, and the page goes there itself.
        opens = false;
        const other = await campaignIn(join(makeTempFolder(), "Torre"), "Torre");
        expect((await call(launcher.url, "POST", "/api/launcher", { open: { root: other } })).body).toEqual({ url: tableOf(other).url, window: false });
        // A refusal opens nothing.
        expect(await call(launcher.url, "POST", "/api/launcher", { open: { root: makeTempFolder() } })).toMatchObject({ status: 409 });
        expect(windows).toHaveLength(3);
    });

    it("gives the folder the player chose, a cancel, or why there is no window", async () => {
        const answers = [join(userHome, "Chosen"), undefined, { refused: "no window here" }];
        const launcher = await startLauncher({ pick: () => Promise.resolve(answers.shift()) });

        expect(await call(launcher.url, "POST", "/api/launcher", { pick: true })).toMatchObject({ status: 200, body: { folder: join(userHome, "Chosen") } });
        expect(await call(launcher.url, "POST", "/api/launcher", { pick: true })).toMatchObject({ status: 200, body: { cancelled: true } });
        expect(await call(launcher.url, "POST", "/api/launcher", { pick: true })).toMatchObject({ status: 409, body: { error: "no window here" } });
    });

    it("gives the folder window the page's title and the folder it opens in, a whole path; refuses a title it cannot show and a path that is not whole", async () => {
        const asked: unknown[] = [];
        const launcher = await startLauncher({
            pick: (wish) => {
                asked.push(wish);
                return Promise.resolve(undefined);
            },
        });
        const start = join(userHome, "RPG Engine");

        expect(await call(launcher.url, "POST", "/api/launcher", { pick: { title: "Apri una cartella", start } })).toMatchObject({ status: 200, body: { cancelled: true } });
        expect(await call(launcher.url, "POST", "/api/launcher", { pick: {} })).toMatchObject({ status: 200 });
        expect(await call(launcher.url, "POST", "/api/launcher", { pick: true })).toMatchObject({ status: 200 });
        expect(asked).toEqual([{ title: "Apri una cartella", start }, {}, {}]);

        for (const bad of [{ title: "" }, { title: "x".repeat(121) }, { title: "Two\nlines" }, { start: "RPG Engine" }, { title: "Ok", other: 1 }, false]) {
            expect(await call(launcher.url, "POST", "/api/launcher", { pick: bad })).toMatchObject({ status: 400 });
        }

        expect(asked).toHaveLength(3);
        expect((await call(launcher.url, "POST", "/api/launcher", { pick: { title: "Two\nlines" } })).body).toEqual({ error: expect.stringContaining("on one line") });
    });

    it("opens one folder window at a time: a second ask while it is open is refused, and one after it closed opens again", async () => {
        let close: (folder: string | undefined) => void = () => undefined;
        let opened = 0;
        const launcher = await startLauncher({
            pick: () => {
                opened++;
                return new Promise((done) => (close = done));
            },
        });

        const first = call(launcher.url, "POST", "/api/launcher", { pick: { title: "Apri una cartella" } });
        await vi.waitFor(() => expect(opened).toBe(1));

        expect(await call(launcher.url, "POST", "/api/launcher", { pick: true })).toMatchObject({ status: 409, body: { error: expect.stringContaining("open already") } });
        close(undefined);
        expect(await first).toMatchObject({ status: 200, body: { cancelled: true } });
        const again = call(launcher.url, "POST", "/api/launcher", { pick: true });
        await vi.waitFor(() => expect(opened).toBe(2));
        close(join(userHome, "Chosen"));
        expect(await again).toMatchObject({ status: 200, body: { folder: join(userHome, "Chosen") } });
    });

    it("refuses a body of another shape in one sentence naming the shapes", async () => {
        const launcher = await startLauncher();
        const bad = [{}, { pick: true, open: { root: userHome } }, { create: { name: "Rocca", language: "it", system: "fake", extra: 1 } }, { open: { root: 7 } }];

        for (const body of bad) {
            expect(await call(launcher.url, "POST", "/api/launcher", body), JSON.stringify(body)).toMatchObject({ status: 400, body: { error: expect.stringContaining("Send one of") } });
        }
    });

    it("refuses a body of the right shape with what is wrong in it, and what to do", async () => {
        const launcher = await startLauncher();
        const bad: [unknown, string][] = [
            [{ open: { root: "relative/folder" } }, "Give the folder's whole path"],
            [{ open: { root: `${userHome}\0x` } }, "Give the folder's whole path"],
            [{ add: { root: `/${"a".repeat(1001)}` } }, "at most 1000 characters"],
            [{ create: { name: "  ", language: "it", system: "fake" } }, "a name of 1 to 80 characters"],
            [{ create: { name: "x".repeat(81), language: "it", system: "fake" } }, "a name of 1 to 80 characters"],
            [{ create: { name: "Rocca\tseconda", language: "it", system: "fake" } }, "without tabs or other control characters"],
            [{ create: { name: "Rocca", language: "italiano!", system: "fake" } }, "by its code"],
        ];

        for (const [body, why] of bad) {
            expect(await call(launcher.url, "POST", "/api/launcher", body), JSON.stringify(body).slice(0, 60)).toMatchObject({ status: 400, body: { error: expect.stringContaining(why) } });
        }
    });

    it("quits only with its place's token, its place taken away", async () => {
        const launcher = await startLauncher();

        expect((await call(launcher.url, "POST", "/api/launcher", { quit: { token: "wrong" } })).status).toBe(403);
        expect(readLauncher(home)?.token).toBe(launcher.place.token);
        expect((await call(launcher.url, "POST", "/api/launcher", { quit: { token: launcher.place.token } })).status).toBe(200);
        await launcher.ended;
        expect(readLauncher(home)).toBeUndefined();
    });

    it("ends by itself once no page has listened and nothing has asked for ten minutes, by its clock", async () => {
        let now = 0;
        const launcher = await startLauncher({ now: () => now, idleEvery: 20 });
        const heard = listenTo(launcher.url);
        await vi.waitFor(() => expect(heard.opened()).toBe(true));
        now = 11 * 60_000;
        await new Promise((done) => setTimeout(done, 100));
        expect(readLauncher(home)).toBeDefined();

        // Once the page has gone, ten more minutes by its clock end it.
        heard.close();
        await vi.waitFor(() => {
            now += 11 * 60_000;
            expect(readLauncher(home)).toBeUndefined();
        });
        await launcher.ended;
    });

    it("gives the link of the launcher of this engine already there, and says one of another engine", async () => {
        const first = await startLauncher();

        expect(await openLauncher(launcherOptions())).toEqual({ running: first.url });
        expect(await openLauncher(launcherOptions({ version: "2.0.0" }))).toMatchObject({ other: { url: first.url, answered: version, token: first.place.token } });
    });

    it("takes away the place of a launcher that no longer answers, and starts", async () => {
        writeFileSync(join(home, "launcher.json"), JSON.stringify({ pid: 4242, version, url: "http://127.0.0.1:9", token: "gone" }));
        const launcher = await startLauncher();

        expect(readLauncher(home)?.token).toBe(launcher.place.token);
    });
});

describe("the AI apps from the launcher's page", () => {
    /** Hosts as the launcher offers them, Codex found once `found.codex` says so. */
    function appHosts(found: { codex: boolean; }): () => HostOffered[]
    {
        return () => [
            { id: "claudeCode", name: "Claude Code", ready: true, found: true, model: "sonnet", efforts: [], models: [] },
            { id: "codex", name: "Codex", ready: true, found: found.codex, model: "", efforts: [], models: [] },
            { id: "openCode", name: "OpenCode", ready: true, found: true, model: "", efforts: [], models: [] },
        ];
    }

    it("gives each host's account at once, never waiting for a program's status, and a notice once it is known", async () => {
        const helpers = drivenHelpers({ claude: "ready", codex: "logged out" });
        const launcher = await startLauncher({ helpers, hosts: appHosts({ codex: true }) });
        const heard = listenTo(launcher.url);
        await vi.waitFor(() => expect(heard.opened()).toBe(true));

        // The looks wait for the test: the page reads what is known now.
        const first = await call(launcher.url, "GET", "/api/launcher");
        expect((first.body as { hosts: unknown[]; }).hosts).toEqual([
            expect.objectContaining({ id: "claudeCode", found: true, account: "unknown", signIn: "page", install: { page: "https://code.claude.com/docs/en/setup", engine: true } }),
            expect.objectContaining({ id: "codex", account: "unknown", signIn: "page", install: { page: "https://learn.chatgpt.com/docs/codex/cli", engine: true } }),
            { id: "openCode", name: "OpenCode", ready: true, found: true, model: "", efforts: [], models: [], account: "unknown", install: { page: "https://opencode.ai/download" } },
        ]);

        helpers.answerLooks();
        await vi.waitFor(() => expect(heard.count()).toBe(2));
        const known = (await call(launcher.url, "GET", "/api/launcher")).body as { hosts: { account: string; }[]; };
        expect(known.hosts.map((host) => host.account)).toEqual(["in", "out", "unknown"]);
        heard.close();
    });

    it("starts a sign-in once, tells the pages while it waits and once it is done, and cancels one", async () => {
        const helpers = drivenHelpers({ claude: "logged out", codex: "logged out" }, true);
        const launcher = await startLauncher({ helpers, hosts: appHosts({ codex: true }) });
        const heard = listenTo(launcher.url);
        await vi.waitFor(() => expect(heard.opened()).toBe(true));
        await call(launcher.url, "GET", "/api/launcher");
        await vi.waitFor(() => expect(heard.count()).toBe(2));

        const started = await call(launcher.url, "POST", "/api/launcher", { signIn: { host: "codex" } });
        expect(started.status).toBe(200);
        expect((started.body as { hosts: unknown[]; }).hosts).toContainEqual(expect.objectContaining({ id: "codex", account: "out", signingIn: true }));
        expect((await call(launcher.url, "POST", "/api/launcher", { signIn: { host: "codex" } })).status).toBe(200);
        expect(helpers.asked.filter((one) => one.startsWith("login"))).toEqual(["login codex"]);
        // The sign-in's own link, for a browser that did not open, comes with its first answer: a notice of its own.
        await vi.waitFor(() => expect(heard.count()).toBe(4));
        expect((await call(launcher.url, "GET", "/api/launcher")).body).toMatchObject({ hosts: expect.arrayContaining([expect.objectContaining({ id: "codex", signInLink: "https://auth.example/codex" })]) as unknown });

        helpers.states.codex = "ready";
        helpers.endLogin("codex", { state: "done" });
        await vi.waitFor(() => expect(heard.count()).toBe(6));
        const done = (await call(launcher.url, "GET", "/api/launcher")).body as { hosts: { id: string; account: string; signingIn?: true; }[]; };
        expect(done.hosts.find((host) => host.id === "codex")).toMatchObject({ account: "in" });
        expect(done.hosts.find((host) => host.id === "codex")?.signingIn).toBeUndefined();
        expect(done.hosts.find((host) => host.id === "codex")).not.toHaveProperty("signInLink");

        await call(launcher.url, "POST", "/api/launcher", { signIn: { host: "claudeCode" } });
        const cancelled = await call(launcher.url, "POST", "/api/launcher", { signIn: { host: "claudeCode", cancel: true } });
        expect(cancelled.status).toBe(200);
        expect(helpers.asked).toContain("cancel claude");
        expect((cancelled.body as { hosts: { id: string; signingIn?: true; }[]; }).hosts.find((host) => host.id === "claudeCode")?.signingIn).toBeUndefined();
        heard.close();
    });

    it("says why a sign-in failed", async () => {
        const helpers = drivenHelpers({ claude: "logged out" }, true);
        const launcher = await startLauncher({ helpers, hosts: appHosts({ codex: false }) });
        await call(launcher.url, "POST", "/api/launcher", { signIn: { host: "claudeCode" } });
        helpers.endLogin("claude", { state: "failed", why: "it said: address already in use" });

        await vi.waitFor(async () => {
            const read = (await call(launcher.url, "GET", "/api/launcher")).body as { hosts: { id: string; signInWhy?: string; }[]; };
            expect(read.hosts.find((host) => host.id === "claudeCode")?.signInWhy).toBe("it said: address already in use");
        });
    });

    it("installs a host the computer lacks, once, and offers it found once it is there; says why one failed", async () => {
        const found = { codex: false };
        const helpers = drivenHelpers({}, true);
        const launcher = await startLauncher({ helpers, hosts: appHosts(found) });

        const started = await call(launcher.url, "POST", "/api/launcher", { install: { host: "codex" } });
        expect((started.body as { hosts: unknown[]; }).hosts).toContainEqual(expect.objectContaining({ id: "codex", found: false, installing: true }));
        await call(launcher.url, "POST", "/api/launcher", { install: { host: "codex" } });
        expect(helpers.asked.filter((one) => one.startsWith("install"))).toEqual(["install codex"]);

        found.codex = true;
        helpers.states.codex = "logged out";
        helpers.endInstall("codex", undefined);
        await vi.waitFor(async () => {
            const read = (await call(launcher.url, "GET", "/api/launcher")).body as { hosts: { id: string; }[]; };
            expect(read.hosts.find((host) => host.id === "codex")).toMatchObject({ found: true, account: "out" });
        });
        expect(await call(launcher.url, "POST", "/api/launcher", { install: { host: "codex" } })).toMatchObject({
            status: 409,
            body: { error: "Codex is on this computer already: choose it for a campaign, and play." },
        });

        found.codex = false;
        await call(launcher.url, "POST", "/api/launcher", { install: { host: "codex" } });
        helpers.endInstall("codex", "npm said: EACCES");
        await vi.waitFor(async () => {
            const read = (await call(launcher.url, "GET", "/api/launcher")).body as { hosts: { id: string; installWhy?: string; }[]; };
            expect(read.hosts.find((host) => host.id === "codex")?.installWhy).toBe("npm said: EACCES");
        });
    });

    it("refuses in words a host that signs in or installs from its own app, a host it does not know, and a launcher given no programs", async () => {
        const helpers = drivenHelpers({}, true);
        const launcher = await startLauncher({ helpers, hosts: appHosts({ codex: false }) });

        expect(await call(launcher.url, "POST", "/api/launcher", { signIn: { host: "antigravity" } })).toMatchObject({
            status: 409,
            body: { error: expect.stringContaining("Antigravity signs in from its own app, not from here") },
        });
        expect(await call(launcher.url, "POST", "/api/launcher", { install: { host: "antigravity" } })).toMatchObject({
            status: 409,
            body: { error: "RPG Engine does not install Antigravity: install it from https://antigravity.google/download, then look again." },
        });
        expect(await call(launcher.url, "POST", "/api/launcher", { signIn: { host: "cursor" } })).toMatchObject({
            status: 400,
            body: { error: "Give a host the launcher knows: claudeCode, codex, antigravity, openCode." },
        });
        expect(helpers.asked.filter((one) => !one.startsWith("look"))).toEqual([]);

        await launcher.end("a launcher given no programs comes next");
        const bare = await startLauncher({ hosts: appHosts({ codex: false }) });
        expect(await call(bare.url, "POST", "/api/launcher", { hosts: true })).toMatchObject({ status: 409, body: { error: expect.stringContaining("start it again with rpg launcher") } });
    });

    it("looks at every host again when the page asks, at most once a minute", async () => {
        const helpers = drivenHelpers({ claude: "logged out", codex: "logged out" }, true);
        let time = Date.now();
        const launcher = await startLauncher({ helpers, hosts: appHosts({ codex: true }), now: () => time });
        await call(launcher.url, "GET", "/api/launcher");
        await vi.waitFor(() => expect(helpers.asked.length).toBe(2));

        // As the page's window comes back to the front, again and again: nothing within the minute.
        helpers.states.claude = "ready";
        expect((await call(launcher.url, "POST", "/api/launcher", { hosts: true })).status).toBe(200);
        expect((await call(launcher.url, "POST", "/api/launcher", { hosts: true })).status).toBe(200);
        expect(helpers.asked).toHaveLength(2);

        time += 61_000;
        expect((await call(launcher.url, "POST", "/api/launcher", { hosts: true })).status).toBe(200);
        await vi.waitFor(async () => {
            const read = (await call(launcher.url, "GET", "/api/launcher")).body as { hosts: { id: string; account: string; }[]; };
            expect(read.hosts.find((host) => host.id === "claudeCode")?.account).toBe("in");
        });
        expect(helpers.asked.filter((one) => one === "look claude")).toHaveLength(2);
    });
});

/** A page that listens for the launcher's notices: how many came, whether it is listening, and its end. */
function listenTo(url: string): { count: () => number; opened: () => boolean; close: () => void; }
{
    let count = 0;
    let opened = false;
    const asked = request(new URL("/events", url), (response) => {
        opened = true;
        response.setEncoding("utf8");
        response.on("data", (chunk: string) => (count += chunk.split("event: changed").length - 1));
        response.on("error", () => undefined);
    });
    asked.on("error", () => undefined);
    asked.end();
    return { count: () => count, opened: () => opened, close: () => asked.destroy() };
}

describe("reaching the launcher", () => {
    it("asks one of another engine to quit, starts this engine's apart, and gives its link", async () => {
        const old = await startLauncher({ version: "0.9.0" });
        let started: Launcher | undefined;
        const reached = await reachLauncher(home, version, {
            start: () => void startLauncher().then((one) => (started = one)),
            wait: (milliseconds) => new Promise((done) => setTimeout(done, milliseconds)),
        });

        await old.ended;
        expect(reached).toEqual({ url: started?.url });
    });

    it("refuses once none answers within ten seconds", async () => {
        let now = 0;
        const starts: number[] = [];
        const reached = await reachLauncher(home, version, { start: () => void starts.push(now), now: () => now, wait: (milliseconds) => Promise.resolve(void (now += milliseconds)) });

        expect(reached).toEqual({ error: expect.stringContaining("did not start within ten seconds") });
        expect(starts).toEqual([0]);
    });
});

describe("the way back from a campaign's page", () => {
    let folder: string;
    let session: SessionStore;
    let dashboard: Dashboard | undefined;

    beforeEach(async () => {
        folder = await campaignIn(makeTempFolder(), "Rocca");
        inPlay(folder);
        session = new SessionStore({ systemFolders: testContext(folder).systemFolders, watchFolder: () => ({ close: () => undefined }) });
    });

    afterEach(async () => {
        await dashboard?.close();
        session.close();
    });

    async function serve(launcher?: LauncherWay, own: Partial<Context> = { home }): Promise<string>
    {
        dashboard = await startDashboard({ ...testContext(folder), files: session, ...own }, session, { ports: [0], ...(launcher === undefined ? {} : { launcher }) });
        return dashboard?.url ?? "";
    }

    /** A way to the launcher that always finds and reaches what it is given, and opens no window. */
    function reaching(reached: { url: string; } | { error: string; }): LauncherWay
    {
        return { find: () => Promise.resolve("url" in reached ? reached : undefined), reach: () => Promise.resolve(reached), open: () => Promise.resolve(false) };
    }

    it("gives the campaign's root always, and the launcher's link where it answers", async () => {
        const url = await serve(launcherWay(home, version, () => Promise.resolve(false)));

        expect((await call(url, "GET", "/api/home")).body).toEqual({ root: folder });
        const launcher = await startLauncher();
        expect((await call(url, "GET", "/api/home")).body).toEqual({ url: launcher.url, root: folder });
    });

    it("gives no launcher's link to a page served with no way to it, as a chat's own", async () => {
        await startLauncher();

        expect((await call(await serve(), "GET", "/api/home")).body).toEqual({ root: folder });
    });

    it("starts the launcher from the page at a table alone, and refuses elsewhere", async () => {
        expect(await call(await serve(), "POST", "/api/home", { start: true })).toMatchObject({ status: 409, body: { error: expect.stringContaining("rpg open") } });
        await dashboard?.close();

        const url = await serve(reaching({ url: "http://127.0.0.1:5750" }));
        expect(await call(url, "POST", "/api/home", { start: true })).toMatchObject({ status: 200, body: { url: "http://127.0.0.1:5750", window: false } });
        expect(await call(url, "POST", "/api/home", { start: false })).toMatchObject({ status: 400 });
        expect((await call(url, "POST", "/api/home", { start: true }, { origin: "" })).status).toBe(403);
        await dashboard?.close();

        const failing = await serve(reaching({ error: "not within ten seconds" }));
        expect(await call(failing, "POST", "/api/home", { start: true })).toMatchObject({ status: 409, body: { error: "not within ten seconds" } });
    });

    it("opens the launcher's page in a window of its own once it answers, one for two quick asks", async () => {
        const launcher = await startLauncher();
        const windows: string[] = [];

        const opening = (url: string, kind: string): Promise<boolean> => {
            windows.push(`${kind} ${url}`);
            return new Promise((done) => setTimeout(() => done(true), 50));
        };

        const url = await serve(launcherWay(home, version, opening));

        const twice = await Promise.all([1, 2].map(() => call(url, "POST", "/api/home", { start: true })));
        expect(twice.map((one) => one.body)).toEqual([{ url: launcher.url, window: true }, { url: launcher.url, window: true }]);
        expect(windows).toEqual([`launcher ${launcher.url}`]);
    });
});

describe("the folder window", () => {
    it("is Explorer's own folder window on Windows, through PowerShell run hidden, its script on the input, its title and folder in the environment", () => {
        const [command] = folderCommands("win32", { SystemRoot: "C:\\Windows" }, { title: "Choose a folder; Remove-Item *\n", start: "C:\\Users\\ann\\RPG Engine" });

        expect(command?.file).toBe("C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe");
        expect(command?.args).toEqual(["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-Sta", "-Command", "-"]);
        expect(command?.hidden).toBe(true);
        expect(command?.input).toContain("FileOpenDialog");
        expect(command?.input).toContain("pickFolders | forceFileSystem | pathMustExist");
        expect(command?.input).not.toContain("FolderBrowserDialog");
        expect(command?.input).not.toContain("Remove-Item");
        expect(command?.input).not.toContain('RPG Engine"');
        // Plain ASCII, one block that ends with the empty line PowerShell waits for.
        expect(command?.input).toMatch(/^& \{\n[\x20-\x7e\n]*\n\}\n\n$/);
        expect(command?.env).toEqual({ RPG_FOLDER_TITLE: "Choose a folder; Remove-Item *", RPG_FOLDER_START: "C:\\Users\\ann\\RPG Engine" });
        expect(folderCommands("win32", {})[0]?.env).toEqual({ RPG_FOLDER_TITLE: "", RPG_FOLDER_START: "" });
    });

    it("leaves the yes and no window of a package as it was: its PowerShell shown, its script on the command line, nothing on its input", () => {
        const [command] = dialogCommands("win32", { SystemRoot: "C:\\Windows" }, "Title", "Text");

        expect(command?.hidden).toBeUndefined();
        expect(command?.input).toBeUndefined();
        expect(command?.args.at(-2)).toBe("-Command");
    });

    it("reads the folder chosen, a cancel, and no desktop on Windows", async () => {
        const answers = [{ code: 0, out: "C:\\Giochi\\Città\r\n" }, { code: 11, out: "" }, { code: 12, out: "" }];
        const run = (): Promise<{ code: number; out: string; }> => Promise.resolve(answers.shift() ?? { code: 1, out: "" });

        expect(await chooseFolder("win32", {}, { title: "Choose" }, run)).toBe("C:\\Giochi\\Città");
        expect(await chooseFolder("win32", {}, { title: "Choose" }, run)).toBeUndefined();
        expect(await chooseFolder("win32", {}, { title: "Choose" }, run)).toEqual({ refused: expect.stringContaining("could not open") });
    });

    it("says why the window did not open on Windows, as PowerShell wrote it, and that PowerShell is missing", async () => {
        const failed = (): Promise<{ code: number; out: string; err: string; }> => Promise.resolve({ code: 1, out: "", err: "Add-Type failed\r\n" });

        expect(await chooseFolder("win32", {}, {}, failed)).toEqual({ refused: "The window to choose a folder could not open: Add-Type failed. Write the folder's path instead." });
        expect(await chooseFolder("win32", {}, {}, () => Promise.resolve("missing"))).toEqual({ refused: expect.stringContaining("no window to choose a folder") });
    });

    it("is osascript's choose folder on macOS, its prompt and its folder arguments, each the system's own when empty; Escape is a cancel", async () => {
        const [command] = folderCommands("darwin", {}, { title: "Choose", start: "/Users/ann/RPG Engine" });
        const answers = [{ code: 0, out: "/Users/ann/Giochi/\n" }, { code: 1, out: "", err: "execution error: User canceled. (-128)" }];
        const run = (): Promise<{ code: number; out: string; err?: string; }> => Promise.resolve(answers.shift() ?? { code: 1, out: "" });

        expect(command?.file).toBe("/usr/bin/osascript");
        expect(command?.args.slice(-2)).toEqual(["Choose", "/Users/ann/RPG Engine"]);
        expect(command?.args.join(" ")).not.toContain('RPG Engine"');
        expect(command?.args.join(" ")).toContain("default location (POSIX file startFolder)");
        expect(folderCommands("darwin", {})[0]?.args.slice(-2)).toEqual(["", ""]);
        expect(await chooseFolder("darwin", {}, { title: "Choose" }, run)).toBe("/Users/ann/Giochi");
        expect(await chooseFolder("darwin", {}, { title: "Choose" }, run)).toBeUndefined();
    });

    it("gives zenity and kdialog the title and the folder as arguments, and nothing of either where none is given", () => {
        const [zenity, kdialog] = folderCommands("linux", { DISPLAY: ":0", HOME: "/home/ann" }, { title: "Scegli; rm -rf ~", start: "/home/ann/RPG Engine" });

        expect(zenity?.args).toEqual(["--file-selection", "--directory", "--title=Scegli; rm -rf ~", "--filename=/home/ann/RPG Engine/"]);
        expect(kdialog?.args).toEqual(["--getexistingdirectory", "/home/ann/RPG Engine", "--title", "Scegli; rm -rf ~"]);
        expect(folderCommands("linux", { DISPLAY: ":0", HOME: "/home/ann" }).map((command) => command.args)).toEqual([
            ["--file-selection", "--directory"],
            ["--getexistingdirectory", "/home/ann"],
        ]);
    });

    it("is zenity on a Linux desktop, else kdialog, else a refusal; none at all with no desktop", async () => {
        const tried: string[] = [];

        const zenityMissing = (command: { file: string; }): Promise<"missing" | { code: number; out: string; }> => {
            tried.push(command.file);
            return Promise.resolve(command.file === "zenity" ? "missing" : { code: 0, out: "/home/ann/Giochi\n" });
        };

        expect(folderCommands("linux", { DISPLAY: ":0" }, { title: "Choose" }).map((command) => command.file)).toEqual(["zenity", "kdialog"]);
        expect(await chooseFolder("linux", { DISPLAY: ":0" }, { title: "Choose" }, zenityMissing)).toBe("/home/ann/Giochi");
        expect(tried).toEqual(["zenity", "kdialog"]);
        expect(await chooseFolder("linux", { DISPLAY: ":0" }, { title: "Choose" }, () => Promise.resolve({ code: 1, out: "" }))).toBeUndefined();
        expect(await chooseFolder("linux", { DISPLAY: ":0" }, { title: "Choose" }, () => Promise.resolve("missing"))).toEqual({ refused: expect.stringContaining("zenity or kdialog") });
        expect(await chooseFolder("linux", {}, { title: "Choose" }, () => Promise.reject(new Error("never run")))).toEqual({ refused: expect.any(String) });
    });
});

describe("the launcher's window", () => {
    const env = { ProgramFiles: "C:\\Program Files", "ProgramFiles(x86)": "C:\\Program Files (x86)", LOCALAPPDATA: "C:\\Users\\ann\\AppData\\Local" };
    const chrome = "C:\\Users\\ann\\AppData\\Local\\Google\\Chrome\\Application\\chrome.exe";
    const edge = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
    const brave = "C:\\Program Files\\BraveSoftware\\Brave-Browser\\Application\\brave.exe";
    const choices = "HKEY_CURRENT_USER\\Software\\Microsoft\\Windows\\Shell\\Associations\\UrlAssociations\\http";

    // A system with these files, whose commands print what is given for them, which starts the programs it is told start, and whose PowerShell prints `ran`.
    const system = (
        files: string[],
        printed: Record<string, string> = {},
        starts: (command: string) => boolean = () => true,
        ran: { printed: string; ended: boolean; } = { printed: "", ended: true },
    ): BrowserSystem & { started: string[][]; run: BrowserSystem["run"] & { asked: { command: string; args: string[]; env: Record<string, string>; input: string; }[]; }; } => {
        const started: string[][] = [];
        const asked: { command: string; args: string[]; env: Record<string, string>; input: string; }[] = [];
        return {
            started,
            exists: (path) => files.includes(path),
            output: (command) => Promise.resolve(printed[command] ?? ""),
            start: (command, args) => {
                started.push([command, ...args]);
                return Promise.resolve(starts(command));
            },
            run: Object.assign((command: string, args: string[], env: Record<string, string>, input: string) => {
                asked.push({ command, args, env, input });
                return Promise.resolve(ran);
            }, { asked }),
        };
    };

    // What reg prints of the default browser for http: the old key, and the newer one Windows reads in its place when it has it.
    const userChoice = (progId: string, latest?: string): string =>
        [
            `${choices}\\UserChoice`,
            `    ProgId    REG_SZ    ${progId}`,
            "",
            ...(latest === undefined ? [] : [`${choices}\\UserChoiceLatest`, "", `${choices}\\UserChoiceLatest\\ProgId`, `    ProgId    REG_SZ    ${latest}`]),
            "",
        ].join("\r\n");

    it("opens in Chrome on Windows, else in Edge, wherever each installs itself; else none", async () => {
        expect(await appBrowser("win32", env, system([chrome, edge]))).toBe(chrome);
        expect(await appBrowser("win32", env, system([edge]))).toBe(edge);
        expect(await appBrowser("win32", env, system([]))).toBeUndefined();
    });

    it("opens in the default browser of Windows when it is a Chromium that takes --app, by the ProgId Windows reads, the newer key first", async () => {
        expect(await appBrowser("win32", env, system([chrome, edge, brave], { reg: userChoice("MSEdgeHTM") }))).toBe(edge);
        expect(await appBrowser("win32", env, system([chrome, edge, brave], { reg: userChoice("MSEdgeHTM", "BraveHTML") }))).toBe(brave);
        expect(await appBrowser("win32", env, system([chrome, edge], { reg: userChoice("ChromeHTML.ABCDEF") }))).toBe(chrome);
        expect(await appBrowser("win32", env, system([chrome, edge], { reg: userChoice("MSEdgeHTM", "FirefoxURL-308046B0AF4A39CB") }))).toBe(chrome);
        expect(await appBrowser("win32", env, system([edge], { reg: userChoice("BraveHTML") }))).toBe(edge);
    });

    it("finds Chrome and Edge in the Applications of macOS, and on the PATH of Linux, the default browser first there", async () => {
        const mac = "/Users/ann/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge";
        const linux = "/snap/bin/chromium";
        const linuxEdge = "/usr/bin/microsoft-edge";

        expect(await appBrowser("darwin", { HOME: "/Users/ann" }, system([mac]))).toBe(mac);
        expect(await appBrowser("linux", { PATH: "/usr/bin:/snap/bin" }, system([linux]))).toBe(linux);
        expect(await appBrowser("linux", { PATH: "/usr/bin:/snap/bin" }, system([linux, linuxEdge], { "xdg-settings": "microsoft-edge.desktop\n" }))).toBe(linuxEdge);
        expect(await appBrowser("linux", { PATH: "/usr/bin:/snap/bin" }, system([linux, linuxEdge], { "xdg-settings": "firefox.desktop\n" }))).toBe(linux);
    });

    it("on Windows has PowerShell start the browser and place its window, the address unmarked, the sizes and titles of its kind in the environment", async () => {
        const placed = system([chrome], {}, () => true, { printed: "placed 1728x936 at 96,52\r\n", ended: true });
        expect(await openInBrowser("http://127.0.0.1:5750/", "campaign", "win32", { ...env, SystemRoot: "D:\\Win" }, placed)).toEqual({ opened: "window", placed: true });
        expect(placed.started).toEqual([]);
        const [asked] = placed.run.asked;
        expect(asked?.command).toBe("D:\\Win\\System32\\WindowsPowerShell\\v1.0\\powershell.exe");
        // The script on PowerShell's input: the command line stays short, as Windows keeps it.
        expect(asked?.args).toEqual(["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-Command", "-"]);
        expect(`${asked?.command ?? ""} ${asked?.args.join(" ") ?? ""}`.length).toBeLessThan(200);
        expect(asked?.env).toEqual({
            RPG_WINDOW_BROWSER: chrome,
            // A browser's profile of the engine's own for each kind of window, which then opens at its place at once (T-309).
            RPG_WINDOW_ARGUMENTS: [
                "--user-data-dir=C:\\Users\\ann\\AppData\\Local\\rpg-engine\\windows\\chrome-campaign",
                "--no-first-run",
                "--no-default-browser-check",
                "--disable-features=Translate",
                "--app=http://127.0.0.1:5750/",
            ].join("\n"),
            RPG_WINDOW_WIDTH: "1920",
            RPG_WINDOW_HEIGHT: "1200",
            RPG_WINDOW_SHARE: "0.9",
            RPG_WINDOW_WAIT: "8000",
            RPG_WINDOW_TITLES: "RPG Engine",
            RPG_WINDOW_ENDINGS: " · RPG Engine",
            RPG_WINDOW_ADDRESS: "127.0.0.1:5750",
        });
        // The values never in the script, which is plain ASCII, as PowerShell reads its input.
        const script = asked?.input ?? "";
        expect(script).toContain("$env:RPG_WINDOW_BROWSER");
        expect(script).toContain("RpgEngine.AppWindow");
        expect(script).not.toContain("127.0.0.1");
        expect(script).not.toContain("Chrome\\Application");
        expect(script).toMatch(/^[\x20-\x7e\r\n\t]*$/);
        expect(script.endsWith("}\n\n")).toBe(true);

        const launcher = system([chrome], {}, () => true, { printed: "opened\n", ended: true });
        expect(await openInBrowser("http://127.0.0.1:5750/", "launcher", "win32", env, launcher)).toEqual({ opened: "window", placed: false });
        expect(launcher.run.asked[0]?.env).toMatchObject({ RPG_WINDOW_WIDTH: "960", RPG_WINDOW_HEIGHT: "680", RPG_WINDOW_SHARE: "1", RPG_WINDOW_TITLES: "RPG Engine", RPG_WINDOW_ENDINGS: "" });
        expect(launcher.started).toEqual([]);
    });

    it("knows its window by the titles the pages have as they open: the shell's, which the launcher keeps and a campaign's page ends with", () => {
        expect(pageHtml).toContain(`<title>${pageTitle}</title>`);
        expect(launcherHtml).toContain(`<title>${pageTitle}</title>`);
        expect(productName).toBe(pageTitle);
        expect(windowTitles("launcher", "http://127.0.0.1:5751/?opened=1")).toEqual({ address: "127.0.0.1:5751", exact: ["RPG Engine"], endings: [] });
        expect(windowTitles("campaign", "http://127.0.0.1:6500")).toEqual({ address: "127.0.0.1:6500", exact: ["RPG Engine"], endings: [" · RPG Engine"] });
    });

    it("refuses an address that is no page of the engine's on this computer, before any browser is looked for", async () => {
        for (const url of ['http://127.0.0.1:5750/" --x', "http://127.0.0.1:5750/a b", "https://127.0.0.1:5750/", "http://localhost:5750/", "http://127.0.0.1:0/", "http://127.0.0.1:5750/\n", "file:///C:/x"]) {
            const nothing = system([chrome]);
            await expect(openInBrowser(url, "launcher", "win32", env, nothing), url).rejects.toThrow("is no address of RPG Engine's pages");
            expect(nothing.run.asked, url).toEqual([]);
            expect(nothing.started, url).toEqual([]);
        }

        expect(isPageAddress("http://127.0.0.1:5750")).toBe(true);
        expect(isPageAddress("http://127.0.0.1:5750/?open=C%3A%5CGames%5CRocca&opened=1")).toBe(true);
    });

    it("on Windows starts the browser itself, the address marked, where PowerShell did not; never a second time where PowerShell was cut short", async () => {
        const failed = system([chrome], {}, () => true, { printed: "", ended: true });
        expect(await openInBrowser("http://127.0.0.1:5750/", "campaign", "win32", env, failed)).toEqual({ opened: "window", placed: false });
        expect(failed.started).toEqual([[chrome, "--app=http://127.0.0.1:5750/?opened=1"]]);

        const late = system([chrome], {}, () => true, { printed: "", ended: false });
        expect(await openInBrowser("http://127.0.0.1:5750/", "campaign", "win32", env, late)).toEqual({ opened: "window", placed: false });
        expect(late.started).toEqual([]);
    });

    it("elsewhere opens a window marked so that the page sizes it, else a tab of the default browser, else none; a window alone where only one will do", async () => {
        const linux = system(["/usr/bin/google-chrome"]);
        expect(await openInBrowser("http://127.0.0.1:5750/", "launcher", "linux", { PATH: "/usr/bin" }, linux)).toEqual({ opened: "window", placed: false });
        expect(linux.started).toEqual([["/usr/bin/google-chrome", "--app=http://127.0.0.1:5750/?opened=1"]]);
        expect(linux.run.asked).toEqual([]);

        const none = system([]);
        expect(await openInBrowser("http://127.0.0.1:5750/", "launcher", "win32", env, none)).toEqual({ opened: "tab", placed: false });
        expect(none.started).toEqual([["explorer.exe", "http://127.0.0.1:5750/"]]);
        expect(await openInBrowser("http://127.0.0.1:5750/", "launcher", "darwin", {}, system([], {}, () => false))).toEqual({ opened: "none", placed: false });
        expect(openedAddress("http://127.0.0.1:5750")).toBe("http://127.0.0.1:5750/?opened=1");

        const windowOnly = system([]);
        expect(await openWindow("http://127.0.0.1:5750/", "campaign", "win32", env, windowOnly)).toEqual({ opened: "none", placed: false });
        expect(windowOnly.started).toEqual([]);
    });

    it("reads PowerShell's line: where it placed the window, that it opened one it could not place, or nothing it knows", () => {
        expect(readPlaced("placed 1728x936 at 96,52\r\n")).toEqual({ width: 1728, height: 936, left: 96, top: 52 });
        expect(readPlaced("placed 960x680 at -1440,-900")).toEqual({ width: 960, height: 680, left: -1440, top: -900 });
        expect(readPlaced("opened\r\n")).toBe("opened");
        expect(readPlaced("")).toBeUndefined();
        expect(readPlaced("Exception calling Start")).toBeUndefined();
        expect(placeCommand("C:\\B\\b.exe", ["--a", "--b=c d"], "launcher", "C:\\Windows", windowTitles("launcher", "http://127.0.0.1:5750")).env.RPG_WINDOW_ARGUMENTS).toBe("--a\n--b=c d");
    });

    it("ends with the program it ran, not with one that program started and left holding its output", async () => {
        const held =
            `const child = require("node:child_process").spawn(process.execPath, ["-e", "setTimeout(() => undefined, 9000)"], { detached: true, stdio: ["ignore", "inherit", "ignore"], windowsHide: true }); console.log(child.pid); child.unref();`;
        const began = Date.now();
        const ran = await realSystem.run(process.execPath, ["-e", held], {}, "");
        const waited = Date.now() - began;
        const left = Number(ran.printed.trim());

        try {
            expect(ran.ended).toBe(true);
            expect(Number.isInteger(left) && left > 1).toBe(true);
            // Two seconds after its end at most, where the output is held: never the nine of the one it left.
            expect(waited).toBeLessThan(6000);
        } finally {
            stopTree(left, "SIGKILL");
        }
    }, 20_000);

    it("says a program that is not there ended, with nothing printed", async () => {
        expect(await realSystem.run(join(makeTempFolder(), "no-such-program"), [], {}, "")).toEqual({ printed: "", ended: true });
    });
});

describe("where a window goes", () => {
    it("puts the launcher's small in the middle of its screen's free room, never larger than it, in the room wherever it starts", () => {
        expect(windowPlace("launcher", { width: 1920, height: 1040 })).toEqual({ width: 960, height: 680, left: 480, top: 180 });
        expect(windowPlace("launcher", { width: 3840, height: 2080 })).toEqual({ width: 960, height: 680, left: 1440, top: 700 });
        expect(windowPlace("launcher", { width: 800, height: 560 })).toEqual({ width: 800, height: 560, left: 0, top: 0 });
        expect(windowPlace("launcher", { width: 1920, height: 1040, left: 1920, top: 40 })).toEqual({ width: 960, height: 680, left: 2400, top: 220 });
        expect(windowPlace("launcher", { width: 1366, height: 728, left: -1366, top: -768 })).toEqual({ width: 960, height: 680, left: -1163, top: -744 });
    });

    it("gives a campaign's nine tenths of the room, at most 1920 by 1200, centred, on small, usual and very large screens", () => {
        expect(windowPlace("campaign", { width: 1280, height: 680 })).toEqual({ width: 1152, height: 612, left: 64, top: 34 });
        expect(windowPlace("campaign", { width: 1920, height: 1040 })).toEqual({ width: 1728, height: 936, left: 96, top: 52 });
        expect(windowPlace("campaign", { width: 5120, height: 2840 })).toEqual({ width: 1920, height: 1200, left: 1600, top: 820 });
        expect(windowPlace("campaign", { width: 2560, height: 1400, left: 2560, top: 0 })).toEqual({ width: 1920, height: 1200, left: 2880, top: 100 });
    });

    it("keeps its sizes in step with the page's own, which sizes its window where nobody placed it", () => {
        for (const room of [{ width: 800, height: 560 }, { width: 1366, height: 728 }, { width: 1920, height: 1040, left: 1920, top: 40 }, { width: 5120, height: 2840 }]) {
            for (const kind of ["launcher", "campaign"] as const) {
                expect(windowPlace(kind, room)).toEqual(pageWindowPlace(kind, room));
            }
        }
    });

    it("opens one window for an address at a time: asked again while it opens, it answers as the first did", async () => {
        const opened: string[] = [];
        const open = oneWindowAtATime((url, kind) => {
            opened.push(`${kind} ${url}`);
            return new Promise((done) => setTimeout(() => done(true), 20));
        }, 0);

        expect(await Promise.all([open("http://a", "campaign"), open("http://a", "campaign"), open("http://b", "campaign")])).toEqual([true, true, true]);
        expect(opened).toEqual(["campaign http://a", "campaign http://b"]);
        await new Promise((done) => setTimeout(done, 5));
        expect(await open("http://a", "campaign")).toBe(true);
        expect(opened).toHaveLength(3);
        expect(await oneWindowAtATime(() => Promise.reject(new Error("no browser")))("http://c", "launcher")).toBe(false);
    });
});

/** A desktop and a menu of the test's own, the desktop there already as on a Linux desktop. */
function places(): { desktop: string; menu: string; }
{
    const desktop = join(makeTempFolder(), "Desktop");
    mkdirSync(desktop);
    return { desktop, menu: join(makeTempFolder(), "applications") };
}

describe("the icon", () => {
    const command: IconCommand = { node: "/opt/node 22/bin/node", args: ["/opt/rpg-engine/cli.js", "open"], folder: "/home/ann", path: "/opt/homebrew/bin:/usr/bin" };

    it("is a desktop entry on Linux, in the menu and on the desktop, that runs rpg open with the terminal's PATH and no terminal", async () => {
        const where = places();
        const made = await makeIcons("linux", command, where);
        const entry = readFileSync(join(where.menu, "rpg-engine.desktop"), "utf8");

        expect(made).toEqual([join(where.desktop, "rpg-engine.desktop"), join(where.menu, "rpg-engine.desktop")]);
        expect(entry).toContain(`Exec="env" "PATH=/opt/homebrew/bin:/usr/bin" "/opt/node 22/bin/node" "/opt/rpg-engine/cli.js" "open"\n`);
        expect(entry).toContain("Path=/home/ann\n");
        expect(entry).toContain("Name=RPG Engine\nComment=Tabletop role-playing with an AI game master\n");
        expect(entry).toContain("Categories=Game;RolePlaying;\n");
        expect(existsSync(/^Icon=(.+)$/m.exec(entry)?.[1] ?? "")).toBe(true);
    });

    it("escapes a backslash and a % in the desktop entry's folder, and starts with env even where the terminal had no PATH, as GLib reads its first word", async () => {
        const where = places();
        await makeIcons("linux", { ...command, node: "/opt/node 100%/bin/node", folder: "/home/ann/a\\b 100%", path: "" }, where);
        const entry = readFileSync(join(where.menu, "rpg-engine.desktop"), "utf8");

        expect(entry).toContain("Path=/home/ann/a\\\\b 100%\n");
        expect(entry).toContain(`Exec="env" "/opt/node 100%%/bin/node" "/opt/rpg-engine/cli.js" "open"\n`);
    });

    it("goes only in the menu on a Linux with no desktop folder", async () => {
        const where = { desktop: join(makeTempFolder(), "Desktop"), menu: join(makeTempFolder(), "applications") };

        expect(await makeIcons("linux", command, where)).toEqual([join(where.menu, "rpg-engine.desktop")]);
    });

    it("is made again when it runs another Node or script, which may be gone, unless the player removed it; another PATH alone is no reason", async () => {
        const where = places();
        noteIconMade(home, command, await makeIcons("linux", command, where), "desk");

        expect(iconToRemake(home, command, "desk")).toBe(false);
        expect(iconToRemake(home, { ...command, path: "/usr/local/bin" }, "desk")).toBe(false);
        expect(iconToRemake(home, iconCommand("/home/ann"), "desk")).toBe(true);
        expect(iconToRemake(home, iconCommand("/home/ann"), "desk", () => false)).toBe(false);
        expect(iconAsked(home, "desk")).toBe(true);
        expect(iconCommand("/home/ann", "/bin")).toMatchObject({ node: process.execPath, folder: "/home/ann", path: "/bin", args: expect.arrayContaining(["open"]) });
    });

    it.skipIf(process.platform === "win32")("is a small application on macOS, linked from the desktop, that runs rpg open in the player's home with the terminal's PATH", async () => {
        const where = { desktop: makeTempFolder(), menu: makeTempFolder() };
        await makeIcons("darwin", command, where);
        const launcher = readFileSync(join(where.desktop, "RPG Engine.app", "Contents", "MacOS", "rpg-engine"), "utf8");

        expect(launcher).toBe("#!/bin/sh\ncd '/home/ann' && exec 'env' 'PATH=/opt/homebrew/bin:/usr/bin' '/opt/node 22/bin/node' '/opt/rpg-engine/cli.js' 'open'\n");
        expect(readFileSync(join(where.menu, "RPG Engine.app", "Contents", "Info.plist"), "utf8")).toContain("<string>io.github.stefanocaronia.rpg-engine</string>");
    });

    it.runIf(process.platform === "win32")("is a shortcut on Windows, on the desktop and in the Start menu, that keeps every letter of its paths and runs rpg open through a console with no window", async () => {
        const root = join(makeTempFolder(), "Ελληνικά Кириллица 日本語 🎲");
        const where = { desktop: join(root, "Desktop"), menu: join(root, "Start Menu") };
        mkdirSync(where.desktop, { recursive: true });
        mkdirSync(where.menu, { recursive: true });
        const ours: IconCommand = { node: join(root, "node", "node.exe"), args: [join(root, "rpg engine", "cli.js"), "open"], folder: root, path: "" };
        const made = await makeIcons("win32", ours, where);
        const link = shellLink(readFileSync(made[0] ?? ""));

        expect(made).toEqual([join(where.desktop, "RPG Engine.lnk"), join(where.menu, "RPG Engine.lnk")]);
        expect(link.target).toMatch(/system32\\conhost\.exe$/i);
        expect(link.arguments).toBe(`--headless "${ours.node}" "${ours.args[0]}" open`);
        expect(link.folder).toBe(root);
        expect(link.icon).toMatch(/icon\.ico$/);
        expect(link.name).toBe("RPG Engine");
    }, 60_000);
});

/**
 * A Windows shortcut as its own format holds it, read without Windows' help: its name, its folder, its arguments and its icon, and the target's path from its
 * link information.
 */
function shellLink(bytes: Buffer): { target: string; name?: string; folder?: string; arguments?: string; icon?: string; }
{
    const flags = bytes.readUInt32LE(0x14);
    const unicode = (flags & 0x80) !== 0;
    let at = 0x4c;

    if ((flags & 0x1) !== 0) {
        at += 2 + bytes.readUInt16LE(at);
    }

    let target = "";

    if ((flags & 0x2) !== 0) {
        const info = bytes.subarray(at, at + bytes.readUInt32LE(at));
        const headerSize = info.readUInt32LE(4);
        const basePath = headerSize >= 0x24 ? info.readUInt32LE(0x1c) : 0;
        target = headerSize >= 0x24 && basePath !== 0
            ? info.subarray(basePath).toString("utf16le").split("\0")[0] ?? ""
            : info.subarray(info.readUInt32LE(0x10)).toString("latin1").split("\0")[0] ?? "";
        at += info.length;
    }

    const strings: Record<string, string> = {};

    for (const [flag, name] of [[0x4, "name"], [0x8, "relative"], [0x10, "folder"], [0x20, "arguments"], [0x40, "icon"]] as const) {
        if ((flags & flag) !== 0) {
            const count = bytes.readUInt16LE(at);
            const size = unicode ? count * 2 : count;
            strings[name] = bytes.subarray(at + 2, at + 2 + size).toString(unicode ? "utf16le" : "latin1");
            at += 2 + size;
        }
    }

    return { target, ...strings };
}

/** A terminal that answers the question once it is shown, on a Linux desktop unless told otherwise; what it showed. */
function fakeTerminal(answer: string, options: { tty?: boolean; env?: NodeJS.ProcessEnv; } = {}): { terminal: Terminal; shown: () => string; }
{
    const tty = options.tty ?? true;
    const input = Object.assign(new PassThrough(), { isTTY: tty });
    const output = Object.assign(new PassThrough(), { isTTY: tty });
    let shown = "";
    let answered = false;
    output.on("data", (chunk: Buffer) => {
        shown += chunk.toString("utf8");

        if (!answered && shown.includes("[Y/n]")) {
            answered = true;
            input.write(`${answer}\r`);
        }
    });
    return { terminal: { input, output, env: options.env ?? { DISPLAY: ":0" } }, shown: () => shown };
}

describe("rpg open, rpg icon and rpg launcher", () => {
    // Every icon in the test's own folders: should a check of the terminal fail, none goes on the real desktop.
    const where = (own: Partial<OpenWhere> = {}): OpenWhere => ({
        home,
        userHome,
        platform: "linux",
        places: places(),
        version,
        reach: () => Promise.resolve({ url: "http://127.0.0.1:5750" }),
        browser: () => Promise.resolve("window"),
        terminal: fakeTerminal("n", { tty: false }).terminal,
        now: () => new Date("2026-11-25T08:00:00Z"),
        ...own,
    });

    it("opens the launcher's page in a window, or says its link where no browser started", async () => {
        expect(await runOpen([], where())).toEqual({ output: "RPG Engine's campaigns are open in a window: http://127.0.0.1:5750", exitCode: 0 });
        expect((await runOpen([], where({ browser: () => Promise.resolve("none") }))).output).toBe("RPG Engine's campaigns are at http://127.0.0.1:5750: open that link in your browser.");
        expect(await runOpen(["now"], where())).toEqual({ output: "rpg open takes no options: now.", exitCode: 1 });
    });

    it("ends the process once its line is out, with its exit code, whatever is left open, as under the icon's console nobody reads; the command line ends so", async () => {
        const [out, err] = [new PassThrough(), new PassThrough()];
        const ended: number[] = [];
        // Something left open, which alone would keep the process alive.
        const left = setInterval(() => undefined, 1000);

        try {
            sayAndEnd({ output: "open", exitCode: 0 }, { out, err }, (code) => ended.push(code));
            sayAndEnd({ output: "failed", exitCode: 1 }, { out, err }, (code) => ended.push(code));
            await vi.waitFor(() => expect(ended).toEqual([0, 1]));
        } finally {
            clearInterval(left);
        }

        expect(String(out.read())).toBe("open\n");
        expect(String(err.read())).toBe("failed\n");

        // A console that never says the line is out, as the icon's: the process ends all the same, once.
        const silent = { write: (): boolean => true } as unknown as NodeJS.WritableStream;
        const late: number[] = [];
        sayAndEnd({ output: "open", exitCode: 0 }, { out: silent, err: silent }, (code) => late.push(code), 20);
        await vi.waitFor(() => expect(late).toEqual([0]));
        await new Promise((done) => setTimeout(done, 60));
        expect(late).toEqual([0]);
        expect(readFileSync(join(import.meta.dirname, "..", "src", "cli", "cli.ts"), "utf8")).toMatch(/sayAndEnd\(await \(args\[0\] === "open" \? runOpen : runIcon\)/);
    });

    it("writes why it failed to open.log, the last time alone, for the icon that has no console", async () => {
        const failing = where({ reach: () => Promise.resolve({ error: "RPG Engine's launcher did not start within ten seconds." }) });

        expect(await runOpen([], failing)).toEqual({ output: "RPG Engine's launcher did not start within ten seconds.", exitCode: 1 });
        await runOpen([], failing);
        expect(readFileSync(join(home, "open.log"), "utf8")).toBe("2026-11-25T08:00:00.000Z RPG Engine's launcher did not start within ten seconds.\n");
    });

    it("asks once a machine in a terminal whether to put the icon there: no is noted, yes puts it where it is told", async () => {
        const said = fakeTerminal("n");
        expect((await runOpen([], where({ terminal: said.terminal }))).output).toContain("All right, no icon. To add it later, type rpg icon.");
        expect(said.shown()).toContain("Add an RPG Engine icon to your desktop and your applications menu? Double-click it to see your campaigns. [Y/n]");
        expect(iconAsked(home)).toBe(true);
        expect(await offerIcon(where(), fakeTerminal("y").terminal)).toBeUndefined();

        const other = makeTempFolder();
        const at = places();
        expect(await offerIcon({ home: other, userHome, platform: "linux", places: at }, fakeTerminal("").terminal)).toContain("Done: RPG Engine is on your desktop and in your applications menu.");
        expect(existsSync(join(at.desktop, "rpg-engine.desktop"))).toBe(true);
    });

    it("ends with no answer after its wait, as in the icon's console that nobody sees, and asks again another time", async () => {
        const input = Object.assign(new PassThrough(), { isTTY: true });
        const output = Object.assign(new PassThrough(), { isTTY: true });
        const nobody: Terminal = { input, output, env: { DISPLAY: ":0" }, answerWait: 50 };
        let shown = "";
        output.on("data", (chunk: Buffer) => (shown += chunk.toString("utf8")));

        expect(await runOpen([], where({ terminal: nobody }))).toEqual({ output: "RPG Engine's campaigns are open in a window: http://127.0.0.1:5750", exitCode: 0 });
        expect(shown).toContain("[Y/n]");
        expect(iconAsked(home)).toBe(false);
    }, 5000);

    it("never asks with no terminal, or on a Linux with no desktop", async () => {
        expect(await offerIcon(where(), fakeTerminal("y", { tty: false }).terminal)).toBeUndefined();
        expect(await offerIcon(where(), fakeTerminal("y", { env: {} }).terminal)).toBeUndefined();
        expect(iconAsked(home)).toBe(false);
    });

    it("puts the icon there with rpg icon, and takes it away with rpg icon --remove, saying the files", async () => {
        const at = places();
        const made = await runIcon([], where({ places: at }));

        expect(made.exitCode).toBe(0);
        expect(made.output).toContain(join(at.menu, "rpg-engine.desktop"));
        expect(await runIcon(["--remove"], where())).toEqual({ output: expect.stringContaining("Done: RPG Engine's icon is gone"), exitCode: 0 });
        expect(existsSync(join(at.menu, "rpg-engine.desktop"))).toBe(false);
        expect(await runIcon(["--remove"], where())).toEqual({ output: "RPG Engine found no icon of its own on this computer.", exitCode: 0 });
        expect(await runIcon(["now"], where())).toMatchObject({ exitCode: 1 });
    });

    it("runs with no programs of this computer unless the caller gives them: the page reads no account and cannot sign in", async () => {
        const write = vi.spyOn(process.stdout, "write").mockImplementation(() => true);
        const said: string[] = [];
        const given = { ...launcherOptions(), log: (line: string) => said.push(line), programsWait: 5000 };

        try {
            const running = runLauncher(given);
            await vi.waitFor(() => expect(readLauncher(home)).toBeDefined());
            const place = readLauncher(home);
            const shown = await call(place?.url ?? "", "POST", "/api/launcher", { signIn: { host: "claudeCode" } });
            expect(shown.status).toBe(409);
            expect(JSON.stringify(shown.body)).toContain("cannot sign in");
            await call(place?.url ?? "", "POST", "/api/launcher", { quit: { token: place?.token } });
            expect(await running).toBe(0);
            // How the programs it started ended, said with the time, after its own end.
            expect(said.slice(-2)).toEqual(["The launcher ended: asked to quit.", expect.stringMatching(/^\d{4}-\d\d-\d\dT[\d:.]+Z The programs the launcher started ended by themselves in \d+ ms\.$/)]);
        } finally {
            write.mockRestore();
        }
    });

    it("runs the launcher in the foreground with rpg launcher: its link on stdout, 0 once it quits; the link of one there already; 1 for another engine's", async () => {
        const printed: string[] = [];
        const write = vi.spyOn(process.stdout, "write").mockImplementation((text) => printed.push(String(text)) > 0);
        // Driven programs: the real ones are this computer's own, with the player's accounts.
        const given = { ...launcherOptions(), helpers: drivenHelpers(), log: () => undefined };

        try {
            const running = runLauncher(given);
            await vi.waitFor(() => expect(readLauncher(home)).toBeDefined());
            const place = readLauncher(home);

            expect(await runLauncher(given)).toBe(0);
            expect(await runLauncher({ ...given, version: "2.0.0" })).toBe(1);
            await call(place?.url ?? "", "POST", "/api/launcher", { quit: { token: place?.token } });
            expect(await running).toBe(0);
            expect(printed).toEqual([`${place?.url}\n`, `${place?.url}\n`]);
        } finally {
            write.mockRestore();
        }
    });
});
