// How betasim talks to the dashboard: it serves a demo campaign (test/demo/demo.ts) on a port of its own, free's or the 5e's as the flow says, puts a copy of it in the state each flow asks for,
// and plays the master's part, asking the page a check or a choice as ask does (D-279). Usability only, never the game. `npm run betasim`; betasim's README.md says how it works.
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import type { Page } from "playwright-core";
import { parse } from "yaml";
import { runCommandLine } from "../../src/cli/command-line.ts";
import { ask } from "../../src/commands/ask.ts";
import { type Context, defaultContext } from "../../src/core/context.ts";
import { SessionStore } from "../../src/core/session-store.ts";
import { withFiles } from "../../src/core/store.ts";
import { saveLibraryFolders } from "../../src/library/folders.ts";
import { type Dashboard, startDashboard } from "../../src/server/dashboard/index.ts";
import { loadSystemCode } from "../../src/systems/index.ts";
import { demoFolderOf, type DemoSystem, serveDemo } from "../demo/demo.ts";

/** The port in betasim.yaml and betasim-phone.yaml: never 5760, which the app's browser pane uses. */
const port = 5791;
const folders = join(import.meta.dirname, "..", "..", "tmp", "betasim");
// Each demo as it was the first time betasim ran, kept so that one run compares with the next; to take a newer demo, delete tmp/betasim/base and
// tmp/dashboard-demo, or tmp/betasim/base-5e and tmp/dashboard-demo-5e.
const bases: Record<DemoSystem, string> = { free: join(folders, "base"), "5e": join(folders, "base-5e") };
// Where the 5e's demo links its repository, as the player's own.
const fifthEditionLink = `${demoFolderOf("5e")}-systems`;
const work = join(folders, "campaign");
// The player's data folder of betasim's own, never the player's: the library added to this computer lives there (D-491). And a shelf of books to add.
const home = join(folders, "home");
const books = join(folders, "Manuali");

/** A flow's setup: settings and commands of the master, in order, files of the campaign, then a question on the page. */
interface Setup
{
    /** Each a command line of rpg, as the master would run it: ["config", "saves", "free"]. */
    rpg?: string[][];
    /** Files written in the campaign by their path in it, as an import under way leaves them (D-491 (11)). */
    files?: Record<string, string>;
    /** Claude Code's hook listening, so that the player's sentences go to the master by themselves (D-495); without it, the page copies them for the chat. */
    bell?: boolean;
    /** A shelf of books already added to this computer's library, not yet to this campaign's (D-491 (13)). */
    shelf?: boolean;
    /** A call of the master's running: a sentence said now waits for it, and can still be taken back (D-495). */
    busy?: boolean;
    /** The demo the flow plays: free's unless it needs the 5e's cards, as the hit dice of a rest, or its sheet, as its skills and attacks. */
    system?: DemoSystem;
    /** The master asks the page, as ask does: a check (an option with its notation), a choice, or the dice of a rest's recipe (ASK-14). */
    ask?: { question: string; options?: string[]; recipe?: string; };
}

let dashboard: Dashboard | undefined;
let session: SessionStore | undefined;
let context = gameContext();
let asked: Promise<string> | undefined;
// The page's calls to the game, and its files (the dice), still on their way: betasim moves on after a tap in fake time, while they take real time.
const calls = new WeakMap<Page, Set<unknown>>();

await reset();

export default {
    /** The page has read view when it shows a sheet, the Setup or why not. */
    async ready(page: Page): Promise<void>
    {
        await shown(page, ".band, .notice, .setup");
    },

    /** A fresh copy of the demo for each flow, its commands run, then the page again and the master's question. */
    async setup(page: Page, setup: Setup = {}): Promise<void>
    {
        follow(page);
        // The page leaves first, so that it does not see the game go away meanwhile.
        await page.goto("about:blank");
        await reset(setup);

        if (setup.shelf === true) {
            saveLibraryFolders(join(home, "library"), [books]);
        }

        if (setup.bell === true) {
            // The hook waits on the bell, as Claude Code's does between the master's turns; it ends with the dashboard.
            void fetch(`http://127.0.0.1:${port}/api/bell`).then((response) => response.text()).catch(() => undefined);
            await rung();
        }

        await page.goto(`http://127.0.0.1:${port}/`);
        await shown(page, ".band, .notice, .setup");
        await page.clock.runFor(500);

        if (setup.ask !== undefined) {
            const live = session as SessionStore;
            const served = dashboard as Dashboard;
            asked = withFiles(live, async () => ask.format(await ask.run(ask.input.parse(setup.ask), { ...context, files: live, page: served.player })));
            await shown(page, ".asked");
        }
    },

    /** What a flow may ask of the game: what the page said to the master, what the master hears next, the player's notes, a setting. */
    async query(page: Page, name: string, argument?: string): Promise<unknown>
    {
        if (name === "answer") {
            return answer(page);
        }

        if (name === "idle") {
            return idle(page);
        }

        if (name === "news") {
            // What the master hears at their next call; given back at once, so that asking does not read it for them.
            await idle(page);
            const news = (dashboard as Dashboard).news();
            news.restore();
            return news.lines.join("\n");
        }

        if (name === "notes") {
            const file = join(work, ".player", "notes.json");
            return existsSync(file) ? readFileSync(file, "utf8") : "";
        }

        if (name === "setting") {
            const settings = parse(readFileSync(join(work, "campaign.yaml"), "utf8")) as Record<string, unknown>;
            return settings[argument ?? ""];
        }

        if (name === "log") {
            return readFileSync(join(work, "log.jsonl"), "utf8").trim().split("\n").at(-1) ?? "";
        }

        throw new Error(`No query ${name}: idle, answer, news, notes, setting <name> or log.`);
    },
};

/** Keeps count of the page's calls to the game, the live events apart. */
function follow(page: Page): void
{
    if (calls.has(page)) {
        return;
    }

    const going = new Set<unknown>();
    calls.set(page, going);
    page.on("request", (request) => new URL(request.url()).pathname !== "/events" && going.add(request));
    page.on("requestfinished", (request) => going.delete(request));
    page.on("requestfailed", (request) => going.delete(request));
    // For the game's answers a response is enough: the page does not read the body of one that went well, and then the request never finishes.
    page.on("response", (response) => response.url().includes("/api/") && going.delete(response.request()));
    // betasim settles a page after each step by moving its clock: here the page's calls are waited for too, in real time, and the clock moves again so that it
    // draws what they said (a workaround until betasim has a hook of its own, betasim's README.md).
    const runFor = page.clock.runFor.bind(page.clock);

    page.clock.runFor = async (time) => {
        await runFor(time);

        // Quiet three times in a row: a call may start only once the one before has answered.
        for (let quiet = 0, tries = 0; quiet < 3 && tries < 150; tries++) {
            await new Promise((done) => setTimeout(done, 30));
            quiet = going.size === 0 ? quiet + 1 : 0;
            await runFor(30);
        }
    };
}

/** True once the page's calls have come back and it has drawn what they said: the clock, moved, waits for them. */
async function idle(page: Page): Promise<boolean>
{
    await page.clock.runFor(30);
    return (calls.get(page)?.size ?? 0) === 0;
}

/** Waits until the dashboard says the chat has its doorbell, so that the page sends the player's sentences instead of copying them. */
async function rung(): Promise<void>
{
    for (let tries = 0; tries < 50; tries++) {
        const acts = await fetch(`http://127.0.0.1:${port}/api/act`).then((response) => response.json() as Promise<{ bell?: boolean; }>);

        if (acts.bell === true) {
            return;
        }

        await new Promise((done) => setTimeout(done, 20));
    }

    throw new Error("The dashboard never heard the doorbell at /api/bell.");
}

/** Waits for what the page shows once it has read the game; after the flow's start the page's clock stands still, so it moves it meanwhile. */
async function shown(page: Page, selector: string): Promise<void>
{
    for (let tries = 0; tries < 150; tries++) {
        if (await page.locator(selector).first().isVisible()) {
            return;
        }

        await page.clock.runFor(100);
        await new Promise((done) => setTimeout(done, 50));
    }

    throw new Error(`The page never showed ${selector}.`);
}

/** The question's answer, once the page has sent it: the fake clock moves the page meanwhile, as the dice land. */
async function answer(page: Page): Promise<string>
{
    if (asked === undefined) {
        return "";
    }

    let said: string | undefined;
    void asked.then((text) => (said = text));

    for (let tries = 0; said === undefined && tries < 40; tries++) {
        await page.clock.runFor(250);
        await new Promise((done) => setTimeout(done, 50));
    }

    return said ?? "no answer";
}

/** The demo's copy back as it was, the commands run on it and the files written, and the dashboard on its port, even when a command failed. */
async function reset({ rpg = [], files = {}, busy = false, system = "free" }: Setup = {}): Promise<void>
{
    await dashboard?.close();
    session?.close();
    asked = undefined;

    if (!existsSync(bases[system]) || (system === "5e" && !existsSync(join(fifthEditionLink, "@rpgengine", "system-5e", "system.yaml")))) {
        // serveDemo makes the demo the first time, and links the 5e's repository; its own dashboard is not needed.
        await (await serveDemo([0], system)).close();
        cpSync(demoFolderOf(system), bases[system], { recursive: true });
    }

    rmSync(work, { recursive: true, force: true });
    cpSync(bases[system], work, { recursive: true });
    rmSync(home, { recursive: true, force: true });
    mkdirSync(books, { recursive: true });
    writeFileSync(join(books, "Manuale del Guado.md"), "# Manuale del Guado\n\nLe regole della casa per il guado: chi scivola nella corrente fa un tiro salvezza di Forza.\n");
    context = gameContext(busy, system);
    // The systems' code, as the MCP server loads it: the 5e's cards read their widgets through it (D-514).
    context.systemCode = await loadSystemCode(context.systemFolders);

    try {
        // The page in English, whatever the demo's language (D-394): the flows and the terms name its English words. The game's own words stay Italian.
        for (const line of [["config", "language", "en"], ...rpg]) {
            const result = await runCommandLine(line, context);

            if (result.exitCode !== 0) {
                throw new Error(`rpg ${line.join(" ")}: ${result.output}`);
            }
        }

        for (const [path, text] of Object.entries(files)) {
            mkdirSync(dirname(join(work, path)), { recursive: true });
            writeFileSync(join(work, path), text);
        }
    } finally {
        await serve();
    }
}

/**
 * The game as the MCP server has it for the copy of the demo, with betasim's own data folder and the player's yes to a folder of books (D-491); `busy`, while a
 * call of the master's runs, which takes the player's sentences at its head (D-495).
 */
function gameContext(busy = false, system: DemoSystem = "free"): Context
{
    const own = defaultContext(work);
    return {
        ...own,
        // The 5e as its demo links it from its repository, before the packages of this computer.
        systemFolders: system === "5e" ? [own.systemFolders[0], fifthEditionLink, ...own.systemFolders.slice(1)] : own.systemFolders,
        home,
        bookIndex: join(home, "library"),
        readLibrary: () => undefined,
        confirm: { ask: () => Promise.resolve("yes") },
        chat: { calls: busy ? 1 : 0 },
    };
}

/** The dashboard of the copy on its port. */
async function serve(): Promise<void>
{
    session = new SessionStore({ systemFolders: context.systemFolders });
    dashboard = await startDashboard({ ...context, files: session }, session, { ports: [port], pageReturn: 2_000 });

    if (dashboard === undefined) {
        throw new Error(`Port ${port} is taken: stop what holds it, or change it here and in betasim.yaml.`);
    }
}
