// `rpg table` (D-582): a process for a campaign that serves its page with no chat open, and runs the commands of the chat at it, which its `rpg mcp` pipes
// in through a local socket; it ends by itself once no chat and no page has been there for a while, or once the packages' code it loaded changed on disk.
import { createServer, type Server, type Socket } from "node:net";
import { homedir } from "node:os";
import { findCampaign } from "../../campaign/index.ts";
import { chatFolders as hostChatFolders } from "../../chats/index.ts";
import { type ChatFolders, type Context, forgetChat, userDataFolder } from "../../core/context.ts";
import type { SessionStore } from "../../core/session-store.ts";
import { getVersion, isNewerVersion } from "../../core/version.ts";
import { type ChatSide, servedContext } from "../context.ts";
import { type Dashboard, type DashboardOptions, startDashboard } from "../dashboard/index.ts";
import { showPage } from "../dashboard/opener.ts";
import { answerLine, firstLine, type Hello, probeTable, readHello, type Refusal } from "./hello.ts";
import { knock, newToken, readPlace, removePlace, removeSocketFile, type TablePlace, tableSocket, writePlace } from "./place.ts";
import { type Seat, tableSeat } from "./seat.ts";

/** A table at work: its page's link, its place, its end, and what ends it. */
export interface Table
{
    url: string;
    place: TablePlace;
    /** Done once the table ended, its page closed and its place gone. */
    ended: Promise<void>;
    end(why: string): Promise<void>;
}

export interface TableOptions
{
    /** The folder the table starts in: a campaign's, or one below it. */
    folder: string;
    /** The engine's data folder on this computer, where the table's place is written. */
    home: string;
    platform: string;
    /** The engine's version, which a chat's must be. */
    version: string;
    /** How long the table waits with no chat and no page before it ends, and how often it looks, in ms. */
    idle?: number;
    idleEvery?: number;
    /** How long a knock may take to say hello, in ms. */
    helloWait?: number;
    now?: () => number;
    /** The context and the files' session of the table, as a chat's server makes them; the tests give their own. */
    served?: (chat: ChatSide) => Promise<{ context: Context; session: SessionStore; }>;
    dashboard?: DashboardOptions;
    /** Where the chat's host keeps its chats, by its environment; none in the tests. */
    chatFolders?: (environment: Record<string, string>) => ChatFolders | undefined;
    /** What the table does, a line at a time. */
    log?: (line: string) => void;
}

/** What `rpg table` may be given besides its folder: the table's options, and how the process exits on an error nothing caught; the tests give their own. */
export type RunOptions = Partial<Omit<TableOptions, "folder">> & { exit?: (code: number) => void; };

/** A table opened, the link of one there already, or why it could not start. */
export type Opened = Table | { running: string; } | { refused: string; };

/** What a table is made of once its page serves: its context and files, its page, and its seat. */
interface Parts
{
    root: string;
    context: Context;
    session: SessionStore;
    dashboard: Dashboard;
    seat: Seat;
}

const idle = 5 * 60_000;
const idleEvery = 15_000;
const helloWait = 2000;
// A hello carries a few names of the chat's environment: a few kilobytes at most.
const mostHello = 1024 * 1024;
// How long a table already there may take to answer a knock, and a probe.
const knockWait = 1000;
// How long a table that could not start looks for one that started beside it, and how often.
const lookAgainFor = 1000;
const lookAgainEvery = 100;

/**
 * `rpg table` in the process's folder: the table's link on stdout once it serves, or the link of the one already there; what happens on stderr. Its exit
 * code: 0 once it ended, as after a while with no chat and no page, or on Ctrl+C; 1 when it could not start, or on an error nothing caught.
 */
export async function runTable(folder = process.cwd(), given: RunOptions = {}): Promise<number>
{
    const log = (line: string): boolean => process.stderr.write(`${line}\n`);
    const options: TableOptions = { folder, home: userDataFolder(), platform: process.platform, version: getVersion(), log, ...given };
    const opened = await openTable(options);

    if ("refused" in opened) {
        options.log?.(opened.refused);
        return 1;
    }

    if ("running" in opened) {
        process.stdout.write(`${opened.running}\n`);
        return 0;
    }

    process.stdout.write(`${opened.url}\n`);
    const stop = (): void => void opened.end("stopped");
    const unguard = guardProcess(opened, options, given.exit ?? ((code) => process.exit(code)));
    process.once("SIGINT", stop);
    process.once("SIGTERM", stop);
    await opened.ended;
    process.off("SIGINT", stop);
    process.off("SIGTERM", stop);
    unguard();
    return 0;
}

/**
 * Opens the table of the campaign of `options.folder`: its page served at once, its socket listening and its place written. `running` with the link of a
 * table of the campaign already there; `refused` with why, and what to do, where it cannot start.
 */
export async function openTable(options: TableOptions): Promise<Opened>
{
    const root = findCampaign(options.folder);

    if (root === undefined) {
        return { refused: `rpg table: ${options.folder} is no campaign. Run it in a campaign's folder, or make one there first with rpg init.` };
    }

    const there = await tableThere(options, root);

    if (there !== undefined) {
        return there;
    }

    const parts = await openParts(options, root);
    return "seat" in parts ? await atWork(options, parts) : parts;
}

/**
 * A table of the campaign there already: its link where it answers a probe; a refusal that says what to do where it does not, or ends; none where its place
 * is missing or stale, taken away then.
 */
async function tableThere(options: TableOptions, root: string): Promise<{ running: string; } | { refused: string; } | undefined>
{
    const place = readPlace(options.home, root);

    if (place === undefined) {
        return undefined;
    }

    const probed = await probeTable(place, options.version, knockWait);

    if (probed === "nobody") {
        removePlace(options.home, root, place.token);
        return undefined;
    }

    if (probed === "silent" || ("refused" in probed && probed.refused !== "ending")) {
        return { refused: `rpg table: the table of ${root} (process ${place.pid}) does not answer: end that process, then run rpg table again.` };
    }

    return "refused" in probed ? { refused: `rpg table: the table of ${root} is ending: run rpg table again in a moment.` } : { running: place.url };
}

/**
 * A table of the campaign started beside this one, as two started together, looked for again for about a second, once this one could not have its page or
 * its socket; what the last look found, if anything.
 */
async function tableAfterAll(options: TableOptions, root: string): Promise<{ running: string; } | { refused: string; } | undefined>
{
    const now = options.now ?? Date.now;
    const until = now() + lookAgainFor;
    let there = await tableThere(options, root);

    while ((there === undefined || !("running" in there)) && now() < until) {
        await new Promise((done) => setTimeout(done, lookAgainEvery));
        there = await tableThere(options, root);
    }

    return there;
}

/** The table's context, its page and its seat; where its page does not start, the table that serves it after all, or why not. */
async function openParts(options: TableOptions, root: string): Promise<Parts | { running: string; } | { refused: string; }>
{
    // The chat at the table names the host and gives its environment, once there is a seat.
    let seat: Seat | undefined;
    const made = options.served ?? ((chat: ChatSide) => servedContext(chat, options.folder));
    const { context, session } = await made({ host: () => seat?.host(), environment: () => seat?.environment() ?? {} });
    // As no chat has sat yet: each chat's server makes its own.
    forgetChat(context);
    const dashboard = await startDashboard(context, session, options.dashboard ?? {});

    if (dashboard === undefined) {
        session.close();
        return await tableAfterAll(options, root) ?? {
            refused: "rpg table: the campaign's page is served already, by a chat of it that is still open, or no port is free. Close that chat, start the table, "
                + "then open the chat again.",
        };
    }

    showPage(context, dashboard);
    seat = tableSeat(context, dashboard, options.chatFolders ?? ((environment) => hostChatFolders(environment, homedir())));
    return { root, context, session, dashboard, seat };
}

/** The table at work once its page serves: its socket listening and its place written, its door open, its watch for when to end. */
async function atWork(options: TableOptions, parts: Parts): Promise<Opened>
{
    const { root, context, session, dashboard, seat } = parts;
    const socket = tableSocket(options.home, root, options.platform);
    const place: TablePlace = { root, pid: process.pid, version: options.version, socket, token: newToken(), url: dashboard.url };
    const log = options.log ?? (() => undefined);
    const now = options.now ?? Date.now;
    // The knocks not seated yet, which the end closes.
    const knocking = new Set<Socket>();
    let lastBusy = now();
    let outdated = false;
    let ending: Promise<void> | undefined;
    let markEnded: () => void = () => undefined;
    const ended = new Promise<void>((done) => (markEnded = done));

    const end = (why: string): Promise<void> => {
        ending ??= (async () => {
            clearInterval(looking);
            listener.close();
            await seat.clear();
            knocking.forEach((knocked) => knocked.destroy());
            await dashboard.close();
            session.close();
            removePlace(options.home, root, place.token);
            log(`The table of ${root} ended: ${why}.`);
            markEnded();
        })();
        return ending;
    };

    const door: Door = { place, version: options.version, seat, helloWait: options.helloWait ?? helloWait, log, end, ending: () => ending !== undefined };
    const listener = createServer((knocked) => {
        knocking.add(knocked);
        knocked.once("close", () => knocking.delete(knocked));
        void welcome(knocked, door).then((sat) => {
            if (sat) {
                lastBusy = now();
            }
        }).catch((error: unknown) => {
            knocked.destroy();
            log(`A chat at the table failed: ${error instanceof Error ? error.message : String(error)}.`);
        });
    });

    const listened = await listenAt(listener, socket, options.platform);

    if (listened !== undefined) {
        await dashboard.close();
        session.close();
        return await tableAfterAll(options, root) ?? {
            refused: listened === "EADDRINUSE"
                ? `rpg table: another program listens at ${socket}, where the table of ${root} would: end the rpg table of this campaign still running, then start it again.`
                : `rpg table: the table of ${root} cannot listen at ${socket} (${listened}).`,
        };
    }

    listener.on("error", () => undefined);
    writePlace(options.home, place);
    // The code of a package changed on disk since the table loaded it: the next start loads it, once no call runs.
    context.codeOutdated = () => (outdated = true);
    const idleFor = options.idle ?? idle;
    const looking = setInterval(() => {
        if (outdated && (context.chat?.calls ?? 0) === 0) {
            void end("the code of a package of the campaign changed on disk since the table loaded it");
        } else if (seat.taken() || dashboard.pages() > 0) {
            lastBusy = now();
        } else if (now() - lastBusy >= idleFor) {
            void end(`no chat and no page for ${Math.round(idleFor / 1000)} s`);
        }
    }, options.idleEvery ?? idleEvery);

    log(`The table of ${root} serves its page at ${dashboard.url}; its chats come through ${socket}.`);
    return { url: dashboard.url, place, ended, end };
}

/** What the table's door knows of the table: its place and engine, its seat, how long a hello may take, its log and its end. */
interface Door
{
    place: TablePlace;
    version: string;
    seat: Seat;
    helloWait: number;
    log: (line: string) => void;
    end: (why: string) => Promise<void>;
    ending: () => boolean;
}

/**
 * A knock at the table: a chat that says hello with the place's token and the table's engine sits, while the seat is free and the table not ending; any other
 * is told why not, and what says no hello is closed without a word; a probe is told the table's engine and whether a chat sits. A newer engine's chat ends a
 * table no chat sits at, so that it can start its own. Whether a chat sat, once it left.
 */
async function welcome(socket: Socket, door: Door): Promise<boolean>
{
    socket.on("error", () => undefined);
    const first = await firstLine(socket, door.helloWait, mostHello);
    const hello = first === undefined ? undefined : readHello(first.line);

    if (first === undefined || hello === undefined) {
        socket.destroy();
        return false;
    }

    const refused = refusal(hello, door);

    if (refused !== undefined) {
        socket.end(answerLine({ refused }));
        door.log(`A chat was refused (${refused}${refused === "version" ? `: it runs RPG Engine ${hello.version}, the table ${door.version}` : ""}).`);

        if (refused === "version" && isNewerVersion(hello.version, door.version) && !door.seat.taken()) {
            void door.end(`a chat of the newer RPG Engine ${hello.version} came`);
        }

        return false;
    }

    if (hello.probe) {
        socket.end(answerLine({ table: { version: door.version, seated: door.seat.taken() } }));
        return false;
    }

    socket.write(answerLine({ ok: true }));
    door.log("A chat sat at the table.");
    await door.seat.sit(socket, first.rest, hello.environment);
    door.log("The chat left the table.");
    return true;
}

/** Why a hello may not sit, if it may not: a probe is answered whatever its engine and whoever sits. */
function refusal(hello: Hello, door: Door): Refusal | undefined
{
    if (hello.token !== door.place.token) {
        return "token";
    }

    if (door.ending()) {
        return "ending";
    }

    if (hello.probe) {
        return undefined;
    }

    if (hello.version !== door.version) {
        return "version";
    }

    return door.seat.taken() ? "busy" : undefined;
}

/**
 * Listens at the table's socket: undefined once it does, else the error's code. A socket file left by a table that ended without its cleanup is taken away
 * once nothing answers at it, and listened at again; never one where something answers.
 */
async function listenAt(server: Server, socket: string, platform: string): Promise<string | undefined>
{
    const first = await listening(server, socket);

    if (first !== "EADDRINUSE" || platform === "win32") {
        return first;
    }

    const knocked = await knock(socket, knockWait);

    if (knocked !== "nobody") {
        if (knocked !== "slow") {
            knocked.destroy();
        }

        return first;
    }

    removeSocketFile(socket, platform);
    return listening(server, socket);
}

/** Whether the socket server listens at its path: undefined once it does, else the error's code, as where another process does already. */
function listening(server: Server, path: string): Promise<string | undefined>
{
    return new Promise((done) => {
        const failed = (error: NodeJS.ErrnoException): void => done(error.code ?? error.message);
        server.once("error", failed);
        server.listen(path, () => {
            server.off("error", failed);
            done(undefined);
        });
    });
}

/**
 * In `rpg table` alone: a promise that failed with nobody to catch it is logged, and the table goes on; an exception nobody caught is logged, the place taken
 * away, and the process ends with 1. What takes the guard away.
 */
function guardProcess(table: Table, options: TableOptions, exit: (code: number) => void): () => void
{
    const said = (error: unknown): string => (error instanceof Error ? error.stack ?? error.message : String(error));
    const rejected = (reason: unknown): void => options.log?.(`rpg table: a promise failed with nobody to catch it; the table goes on. ${said(reason)}`);

    const thrown = (error: unknown): void => {
        options.log?.(`rpg table: an error nobody caught; the table ends. ${said(error)}`);
        removePlace(options.home, table.place.root, table.place.token);
        exit(1);
    };

    process.on("unhandledRejection", rejected);
    process.on("uncaughtException", thrown);

    return () => {
        process.off("unhandledRejection", rejected);
        process.off("uncaughtException", thrown);
    };
}
