// How betasim talks to the dashboard: it serves the demo campaign (test/demo/demo.ts) on a port of its own, puts a copy of it in the state each flow asks for,
// and plays the master's part, asking the page a check or a choice as ask does (D-279). Usability only, never the game. `npm run betasim`; see README.md here.
import { cpSync, existsSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import type { Page } from "playwright-core";
import { parse } from "yaml";
import { runCommandLine } from "../../src/command-line.ts";
import { ask } from "../../src/commands/ask.ts";
import { type Context, defaultContext } from "../../src/core/context.ts";
import { SessionStore } from "../../src/core/session-store.ts";
import { withFiles } from "../../src/core/store.ts";
import { type Dashboard, startDashboard } from "../../src/dashboard-server.ts";
import { demoFolder, serveDemo } from "../demo/demo.ts";

/** The port in betasim.yaml and betasim-phone.yaml: never 5760, which the app's browser pane uses. */
const port = 5791;
const folders = join(import.meta.dirname, "..", "..", "tmp", "betasim");
// The demo as it was the first time betasim ran, kept so that one run compares with the next; delete tmp/betasim to take the demo again.
const base = join(folders, "base");
const work = join(folders, "campaign");

/** A flow's setup: settings and commands of the master, in order, then a question on the page. */
interface Setup
{
    /** Each a command line of rpg, as the master would run it: ["config", "saves", "free"]. */
    rpg?: string[][];
    /** The master asks the page, as ask does: a check (an option with its notation) or a choice. */
    ask?: { question: string; options: string[]; };
}

let dashboard: Dashboard | undefined;
let session: SessionStore | undefined;
let context: Context = defaultContext(work);
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
        await reset(setup.rpg ?? []);
        await page.goto(`http://127.0.0.1:${port}/`);
        await shown(page, ".band, .notice, .setup");
        await page.clock.runFor(500);

        if (setup.ask !== undefined) {
            const { question, options } = setup.ask;
            const live = session as SessionStore;
            const served = dashboard as Dashboard;
            asked = withFiles(live, async () => ask.format(await ask.run(ask.input.parse({ question, options }), { ...context, files: live, page: served.player })));
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
    page.on("request", (request) => !request.url().endsWith("/events") && going.add(request));
    page.on("requestfinished", (request) => going.delete(request));
    page.on("requestfailed", (request) => going.delete(request));
    // For the game's answers a response is enough: the page does not read the body of one that went well, and then the request never finishes.
    page.on("response", (response) => response.url().includes("/api/") && going.delete(response.request()));
    // betasim settles a page after each step by moving its clock: here the page's calls are waited for too, in real time, and the clock moves again so that it
    // draws what they said (a workaround until betasim has a hook of its own, README.md).
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

/** The demo's copy back as it was, the commands run on it, and the dashboard on its port. */
async function reset(commands: string[][] = []): Promise<void>
{
    await dashboard?.close();
    session?.close();
    asked = undefined;

    if (!existsSync(base)) {
        // serveDemo makes the demo the first time; its own dashboard is not needed.
        await (await serveDemo([0])).close();
        cpSync(demoFolder, base, { recursive: true });
    }

    rmSync(work, { recursive: true, force: true });
    cpSync(base, work, { recursive: true });
    context = defaultContext(work);

    // The page in English, whatever the demo's language (D-394): the flows and the terms name its English words. The game's own words stay Italian.
    for (const line of [["config", "language", "en"], ...commands]) {
        const result = await runCommandLine(line, context);

        if (result.exitCode !== 0) {
            throw new Error(`rpg ${line.join(" ")}: ${result.output}`);
        }
    }

    session = new SessionStore({ systemFolders: context.systemFolders });
    dashboard = await startDashboard({ ...context, files: session }, session, { ports: [port], pageReturn: 2_000 });

    if (dashboard === undefined) {
        throw new Error(`Port ${port} is taken: stop what holds it, or change it here and in betasim.yaml.`);
    }
}
