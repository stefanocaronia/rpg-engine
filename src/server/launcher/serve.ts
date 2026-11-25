// `rpg launcher`: a light process apart from any campaign that lists the campaigns of this computer, makes one and opens one by starting its table, then
// its page in a window of its own; its own page opens in a window of its own too. It ends by itself once no page has listened and nothing has asked for a while. Two started together end as one.
import { randomBytes } from "node:crypto";
import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import { homedir } from "node:os";
import { chooseFolder, type ChosenFolder } from "../../confirm/index.ts";
import { type Context, defaultContext, userDataFolder } from "../../core/context.ts";
import { guardProcess } from "../../core/process.ts";
import { getVersion } from "../../core/version.ts";
import { lookUntil } from "../../core/wait.ts";
import { oneWindowAtATime, openWindow, type WindowOpener } from "../../desktop/index.ts";
import { hostCommand } from "../../helpers/index.ts";
import { type HostOffered, hostProgram, hostsOffered } from "../../master/index.ts";
import { answers, builtPage, sendJson } from "../page/index.ts";
import { probeTable, type TablePlace } from "../table/index.ts";
import { type CampaignShown, listCampaigns } from "./campaigns.ts";
import type { TableStarter } from "./open.ts";
import { type LauncherPlace, readLauncher, removeLauncher, writeLauncher } from "./place.ts";
import { answerLauncher, type LauncherServed } from "./routes.ts";
import { findLauncher, type LauncherProbed, type LauncherThere } from "./start.ts";

/** A launcher at work: its page's link, its place, its end, and what ends it. */
export interface Launcher
{
    url: string;
    place: LauncherPlace;
    /** Done once it ended, its pages closed and its place gone. */
    ended: Promise<void>;
    end(why: string): Promise<void>;
}

/** What the launcher takes from outside; `rpg launcher` gives this computer's, the tests their own. */
export interface LauncherOptions
{
    /** The engine's data folder, where the launcher's and the tables' places are, and the list of campaigns. */
    home: string;
    /** The player's home, where the folder of new campaigns is. */
    userHome: string;
    platform: string;
    version: string;
    /** The context `rpg init` makes a campaign with: the game systems installed, above all. */
    context: Context;
    /** The ports to try, in turn. */
    ports?: number[];
    /** The folder of the built page. */
    page?: string;
    /** How long the launcher waits with no page and no request before it ends, and how often it looks, in ms. */
    idle?: number;
    idleEvery?: number;
    /** How long a launcher just started looks for another started beside it, in ms. */
    lookAgainFor?: number;
    now?: () => number;
    log?: (line: string) => void;
    /** How a campaign's table starts and is asked after. */
    tables?: Partial<Omit<TableStarter, "home" | "version">>;
    /** Whether a campaign's table answers at its place, for the list. */
    answers?: (place: TablePlace) => Promise<boolean>;
    /** How a campaign's folder is reached, for the list: settled once its disk answered. */
    reach?: (root: string) => Promise<unknown>;
    /** The system's window that chooses a folder. */
    pick?: () => Promise<ChosenFolder>;
    /** The hosts a campaign's first chat may open in. */
    hosts?: () => HostOffered[];
    /** Asks a launcher at a place which engine it runs. */
    probe?: (place: LauncherPlace) => Promise<LauncherProbed>;
    /** Opens a campaign's page in an application window of its own: the browser's, placed and sized for a campaign. */
    openWindow?: WindowOpener;
}

/** A launcher opened, the link of one of this engine there already, one of another engine there, or why it could not start. */
export type LauncherOpened = Launcher | { running: string; } | { other: LauncherPlace & { answered: string; }; } | { refused: string; };

/** What `rpg launcher` may be given besides this computer's own, and how the process exits on an error nothing caught; the tests give their own. */
export type LauncherRunOptions = Partial<LauncherOptions> & { exit?: (code: number) => void; };

// The launcher's ports: a few of its own, then any the system gives.
const launcherPorts = [5750, 5751, 5752, 5753, 5754, 5755, 5756, 5757, 5758, 5759, 0];
const idle = 10 * 60_000;
const idleEvery = 30_000;
// How long a table may take to answer whether it is there, for the list.
const listProbeWait = 500;
// How long a launcher just started looks for one started beside it, as two double clicks start them, and how often.
const lookAgainFor = 1000;
const lookAgainEvery = 100;
// How long a launcher waits for one starting at its place to answer as the launcher: it does once it looked around, within about a second.
const startingWait = 5000;
// What the page reads where a request failed in a way nobody foresaw: the launcher goes on.
const failedWords = "RPG Engine's launcher could not do that. Try again; if it happens again, close its window, run rpg launcher in a terminal and read what it says.";

/**
 * `rpg launcher`: its link on stdout once it serves, or the link of the one of this engine already there; what happens on stderr. Its exit code: 0 once it
 * ended, as after a while with no page, or on Ctrl+C; 1 when it could not start, or one of another engine is there, or on an error nothing caught.
 */
export async function runLauncher(given: LauncherRunOptions = {}): Promise<number>
{
    const log = (line: string): boolean => process.stderr.write(`${line}\n`);
    const userHome = given.userHome ?? homedir();
    const options: LauncherOptions = { home: userDataFolder(), userHome, platform: process.platform, version: getVersion(), context: defaultContext(userHome), log, ...given };
    const opened = await openLauncher(options);

    if ("refused" in opened) {
        options.log?.(opened.refused);
        return 1;
    }

    if ("other" in opened) {
        options.log?.(`rpg launcher: the launcher of RPG Engine ${opened.other.answered} runs at ${opened.other.url}: rpg open ends it and starts this one.`);
        return 1;
    }

    if ("running" in opened) {
        process.stdout.write(`${opened.running}\n`);
        return 0;
    }

    process.stdout.write(`${opened.url}\n`);
    const stop = (): void => void opened.end("stopped");
    const cleanup = (): void => removeLauncher(options.home, opened.place.token);
    const unguard = guardProcess("rpg launcher", "the launcher", (line) => options.log?.(line), cleanup, given.exit ?? ((code) => process.exit(code)));
    process.once("SIGINT", stop);
    process.once("SIGTERM", stop);
    await opened.ended;
    process.off("SIGINT", stop);
    process.off("SIGTERM", stop);
    unguard();
    return 0;
}

/**
 * Opens the launcher: its page served and its place written; the link of one there already, or of one started beside it, which this one leaves the place to;
 * a refusal where one is there and does not answer, or no port is free.
 */
export async function openLauncher(options: LauncherOptions): Promise<LauncherOpened>
{
    const there = await launcherThere(options);

    if (there !== undefined) {
        return there;
    }

    for (const port of options.ports ?? launcherPorts) {
        // A port another program answers at, even on ::1, is its: a browser asking localhost could reach it instead.
        if (port !== 0 && await answers(port)) {
            continue;
        }

        const server = createServer();
        const listening = await listen(server, port);

        if (listening === undefined) {
            continue;
        }

        // Another launcher may have written its place since this one looked, as one started in the same instant, at the port before.
        const beside = await launcherThere(options);

        if (beside !== undefined) {
            await new Promise((done) => server.close(done));
            return beside;
        }

        const { settle, ...launcher } = atWork(server, listening, options);
        const after = await launcherAfterAll(options, launcher.place);

        if (after !== undefined) {
            await launcher.end("another launcher started beside it");
            return after;
        }

        settle();
        return launcher;
    }

    return { refused: "rpg launcher: no port is free on this computer for the launcher's page. Close the programs you do not need, or restart the computer, then try again." };
}

/**
 * The launcher at its place: its link, one of another engine, or a refusal where it does not answer; none where there is none, or where the place is this
 * one's own, by its token. One that is starting is asked again until it answers as the launcher, a few seconds at most.
 */
async function launcherThere(options: LauncherOptions, own?: string): Promise<LauncherOpened | undefined>
{
    let last: LauncherThere | undefined;
    const { there } = await lookUntil(
        async () => {
            last = await findLauncher(options.home, options.probe);
            return last?.starting === true && last.token !== own ? undefined : { there: last };
        },
        () => ({ there: last }),
        { within: startingWait, every: lookAgainEvery },
    );

    if (there === undefined || there.token === own) {
        return undefined;
    }

    if (there.answered === undefined) {
        return { refused: `rpg launcher: RPG Engine's launcher at ${there.url} (process ${there.pid}) is there but does not answer: end that process, then run rpg launcher again.` };
    }

    return there.answered === options.version ? { running: there.url } : { other: { ...there, answered: there.answered } };
}

/**
 * A launcher started beside this one, looked for about a second once this one wrote its place: the one whose place stays, which the other started in the same
 * instant wrote after this one's. A place left by one that is gone is taken away, and this one's written again.
 */
async function launcherAfterAll(options: LauncherOptions, own: LauncherPlace): Promise<LauncherOpened | undefined>
{
    const look = async (): Promise<LauncherOpened | undefined> => {
        const place = readLauncher(options.home);

        if (place?.token === own.token) {
            return undefined;
        }

        const there = await launcherThere(options, own.token);

        if (there === undefined) {
            writeLauncher(options.home, own);
        }

        return there !== undefined && !("refused" in there) ? there : undefined;
    };

    return lookUntil(look, () => undefined, { within: options.lookAgainFor ?? lookAgainFor, every: lookAgainEvery });
}

/** The launcher at work once it listens: its place written, its routes answering, its watch for when to end; settled once it keeps its place. */
function atWork(server: Server, port: number, options: LauncherOptions): Launcher & { settle(): void; }
{
    const now = options.now ?? Date.now;
    const log = options.log ?? (() => undefined);
    const url = `http://127.0.0.1:${port}`;
    const place: LauncherPlace = { pid: process.pid, version: options.version, url, token: randomBytes(16).toString("hex") };
    const environment = process.env;
    const pages = new Set<ServerResponse>();
    let lastBusy = now();
    let ending: Promise<void> | undefined;
    let markEnded: () => void = () => undefined;
    const ended = new Promise<void>((done) => (markEnded = done));
    // A campaign being opened stops looking for its table once the launcher quits.
    const tables: TableStarter = { home: options.home, version: options.version, quitting: () => ending !== undefined, ...options.tables };

    const end = (why: string): Promise<void> => {
        ending ??= (async () => {
            clearInterval(looking);
            pages.forEach((page) => page.end());
            await new Promise((done) => {
                server.close(done);
                server.closeAllConnections();
            });
            removeLauncher(options.home, place.token);
            log(`The launcher ended: ${why}.`);
            markEnded();
        })();
        return ending;
    };

    const served: LauncherServed = {
        port,
        version: options.version,
        page: options.page ?? builtPage,
        token: place.token,
        userHome: options.userHome,
        home: options.home,
        pages,
        campaigns: (): Promise<CampaignShown[]> =>
            listCampaigns({
                home: options.home,
                userHome: options.userHome,
                answers: options.answers ?? (async (table) => typeof await probeTable(table, options.version, listProbeWait) === "object"),
                ...(options.reach === undefined ? {} : { reach: options.reach }),
            }),
        hosts: options.hosts ?? (() => hostsOffered((host) => hostProgram(host, { environment, platform: options.platform, userHome: options.userHome, npmProgram: (one) => hostCommand(one, environment) }) !== undefined)),
        pick: options.pick ?? (() => chooseFolder(options.platform, environment, "Choose a folder for RPG Engine")),
        picking: false,
        settled: false,
        making: { userHome: options.userHome, context: options.context, now: () => new Date(now()), tables },
        openWindow: oneWindowAtATime(options.openWindow ?? (async (address, kind) => (await openWindow(address, kind, options.platform)).opened === "window")),
        notify: () => pages.forEach((page) => page.write("event: changed\ndata: {}\n\n")),
        quit: () => void end("asked to quit"),
    };

    // Whatever fails in a route is the launcher's to log: the page reads what to do, and the launcher goes on.
    server.on("request", (request: IncomingMessage, response: ServerResponse) => {
        lastBusy = now();
        answerLauncher(request, response, served).catch((error: unknown) => {
            log(`The launcher could not answer ${request.method ?? ""} ${request.url ?? ""}: ${error instanceof Error ? error.stack ?? error.message : String(error)}`);
            sendJson(response, 500, { error: failedWords });
        });
    });

    const looking = setInterval(() => {
        if (pages.size > 0) {
            lastBusy = now();
        } else if (now() - lastBusy >= (options.idle ?? idle)) {
            void end(`no page and no request for ${Math.round((options.idle ?? idle) / 1000)} s`);
        }
    }, options.idleEvery ?? idleEvery);
    looking.unref();

    writeLauncher(options.home, place);
    log(`The launcher serves its page at ${url}.`);
    return { url, place, ended, end, settle: () => void (served.settled = true) };
}

/** The port the server listens on, or undefined when it cannot have this one, as when another program has it. */
function listen(server: Server, port: number): Promise<number | undefined>
{
    return new Promise((done) => {
        server.once("error", () => done(undefined));
        server.listen(port, "127.0.0.1", () => {
            const address = server.address();
            done(typeof address === "object" && address !== null ? address.port : port);
        });
    });
}
