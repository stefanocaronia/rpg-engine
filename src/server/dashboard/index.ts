// The player's dashboard (D-270, D-272): the MCP server of the chat serves it on localhost. It gives the page what the player may see through the same commands,
// and tells it when a file of the campaign changes, by whoever, so that it reads again: nothing else goes through the notice, so no secret can.
import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import { findCampaign, savedPort, savePort } from "../../campaign/index.ts";
import type { PlayerSetting } from "../../commands/config/dashboard.ts";
import { importShown } from "../../commands/import/import.ts";
import { systemTexts } from "../../commands/shared/books/system-texts.ts";
import { type PageTranslator, pageTranslator } from "../../commands/shared/books/words.ts";
import type { Catalog } from "../../commands/shared/packages/catalog.ts";
import { loadCampaignCode } from "../../commands/shared/packages/code.ts";
import { themesFolder } from "../../commands/shared/packages/unpacked.ts";
import type { Context, Player, SystemTexts } from "../../core/context.ts";
import type { SessionStore } from "../../core/session-store.ts";
import { withFiles } from "../../core/store.ts";
import { lookUntil } from "../../core/wait.ts";
import { helperCommand, queueInCodex } from "../../helpers/index.ts";
import { samePath } from "../../library/index.ts";
import { loadSystemCode } from "../../systems/index.ts";
import { folderPrint, linkedThemeFolders } from "../../themes/index.ts";
import { answers, askPage, builtPage, send } from "../page/index.ts";
import { type Acts, newActs } from "../player-acts.ts";
import { choicesNews } from "./choices.ts";
import type { EngineAsked } from "./engine.ts";
import { type PageMaster, rollTeller } from "./master.ts";
import { callBegins, deliverActs, pageNews } from "./news.ts";
import { closeDoor, homeAddresses, type PhoneDoor } from "./phone.ts";
import { type Asked, pagePlayer, type ShownCard } from "./player.ts";
import { campaignPorts, type DashboardAt, dashboardAt } from "./ports.ts";
import { answer } from "./routes.ts";
import type { PackageAction, PackagePhase } from "./writes.ts";

export type { ChatQuestion, HostWish, MasterRefusal, ModelMark, PageChat, PageMaster, PageMessage } from "./master.ts";
export { showPage } from "./opener.ts";
export { campaignPorts, dashboardAt, dashboardPorts } from "./ports.ts";
export { pageRoutes } from "./routes.ts";

/** A dashboard that is running: its link, and how to stop it. */
export interface Dashboard
{
    url: string;
    /** The player through the page: ask's buttons, while a page is open (D-279). */
    player: Player;
    /**
     * What the player did on the page since it was last taken, for the master's next call: the saves, in order (D-359), then each setting as it is now against
     * how it was (D-341); and what gives it back when that call never answers.
     */
    news(told?: Set<string>): { lines: string[]; restore(): void; };
    /** How many pages are open now, listening for notices. */
    pages(): number;
    /**
     * As the chat its campaign's table served leaves, the context given a new chat (D-582): what the page kept of that chat goes, its doorbell and Codex's
     * queue, and the next chat hears the problems again; what the player did waits for it.
     */
    chatEnded(): void;
    /** Tells the pages that something changed, and each reads all again. */
    notify(): void;
    /** Tells the pages that the table's chat with the master changed, and each reads that alone. */
    chatChanged(): void;
    /** Brings the player's sentences waiting to the master, as at a call's end. */
    deliver(): void;
    close(): Promise<void>;
}

/** Where the dashboard listens, and the page it serves. */
export interface DashboardOptions
{
    /** The ports to try, in turn (D-272). */
    ports?: number[];
    /** The folder of the built page: dist/dashboard. */
    page?: string;
    /** How long a question waits for a page to come back, after the last one closed: a few seconds; less in the tests. */
    pageReturn?: number;
    /** How long a question waits on pages that no one sees, before it goes to the form or to words (D-455); less in the tests. */
    pageHidden?: number;
    /** Codex's queue for the player's sentences (D-495): Codex's own command, else a fake in the tests. */
    queue?: CodexQueue;
    /** How long sentences given to a hook that speaks them wait for the master's next call before they are given back, in ms (D-578). */
    heldFor?: number;
    /** The campaign's table's own chat with the master, which the page shows and speaks to. */
    master?: PageMaster;
    /** At a campaign's table: the way back to the launcher, which the table is given from outside; absent for a chat's own server. */
    launcher?: LauncherWay;
    /** The computer's addresses on the home network, where the door to the phone opens (T-317): the system's, else the tests'. */
    homeAddresses?: () => string[];
    /** The tests' look at the state the page is served with. */
    served?: (served: Served) => void;
    /** A chat's own server: what it does as the campaign's table asks for the page, which it gives once this answer is sent. */
    giveWay?: () => void;
    /** A campaign's table: the page another chat of the campaign serves is asked for, and served at its port once given. */
    takeOver?: boolean;
}

/**
 * The way from a campaign's page back to the launcher: its link where one answers now, the launcher reached, started first where none answers, and its
 * page opened in an application window of its own: whether one opened.
 */
export interface LauncherWay
{
    find(): Promise<{ url: string; } | undefined>;
    reach(): Promise<{ url: string; } | { error: string; }>;
    open(url: string): Promise<boolean>;
}

/** Codex's queue: whether this computer has the command, and a message queued in a thread, as the player's own (D-495). */
export interface CodexQueue
{
    ready(): boolean;
    send(thread: string, text: string): Promise<boolean>;
}

// Changes that come together, as a command writing a page and the log, make one notice.
const noticeDelay = 100;

// After the last page closed, how long a question waits for one to come back, as after a reload, before it goes to the form or to words (ASK-1).
const pageReturn = 5000;

// How long a question waits on pages that are open but that no one sees, as one in a tab behind, before it goes to the form or to words (D-455).
const pageHidden = 5000;

// How long the sentences given to OpenCode's hook wait for a call of the master before they are given back (D-578).
const heldFor = 60_000;

// How often the server looks at an import under way, for the pages to tell how far it is (D-491 (11)).
const importLookEvery = 2000;

// How often the server looks at the folders of the themes linked for their authors, for the pages to show each change (one second).
const themesLookEvery = 1000;

// How long a table waits for a chat to say it gives the page, then for its port to go free, and how often it looks.
const yieldAskWait = 5000;
const yieldWait = 3000;
const yieldLookEvery = 100;

/**
 * Serves the dashboard of the campaign of context.folder, on 127.0.0.1 only, at the first of the ports that is free, which campaign.yaml then keeps; undefined
 * when none is, or when another chat of the campaign serves its page already: one page for each campaign (D-577). A table with `takeOver` asks that chat
 * for the page first, and serves it at the same port once given.
 */
export async function startDashboard(context: Context, session: SessionStore, options: DashboardOptions = {}): Promise<Dashboard | undefined>
{
    // The systems' code, when no MCP server loaded it first, as the dashboard served alone (D-448).
    context.systemCode ??= await loadSystemCode(context.systemFolders);
    // And the campaign's extensions', whose hooks are called at once too (D-514).
    await withFiles(session, () => loadCampaignCode(context));
    const campaign = withFiles(session, () => findCampaign(context.folder));
    const root = campaign ?? context.folder;
    const saved = campaign === undefined ? undefined : withFiles(session, () => savedPort(campaign));

    for (const port of options.ports ?? campaignPorts(root)) {
        // A port another program answers at, even on ::1 or on every address, is its: a browser asking localhost could reach it instead (D-277). The
        // campaign's own page, which another chat serves, is the page: no second one at another port (D-577).
        if (port !== 0 && await answers(port)) {
            if (campaign === undefined || !await campaignServes(port, campaign, saved)) {
                continue;
            }

            // A table asks that chat for it, and serves it at the same port once given; a chat leaves it there.
            if (!await pageTaken(port, options)) {
                return undefined;
            }
        }

        const server = createServer();
        let listening = await listen(server, port);

        // Another chat of the campaign that started with this one may have taken the port a moment before: its page, then (D-577).
        if (listening === undefined && port !== 0 && campaign !== undefined && await campaignServes(port, campaign, saved)) {
            if (!await pageTaken(port, options)) {
                return undefined;
            }

            listening = await listen(server, port);
        }

        if (listening !== undefined) {
            // The port from then on, as the folder moves too, never one the system gave at random; the tests choose theirs.
            if (campaign !== undefined && options.ports === undefined && port !== 0) {
                withFiles(session, () => savePort(campaign, listening));
            }

            const served: Served = {
                port: listening,
                context,
                session,
                page: options.page ?? builtPage,
                pages: new Set<ServerResponse>(),
                pageReturn: options.pageReturn ?? pageReturn,
                pageHidden: options.pageHidden ?? pageHidden,
                phonePages: new Set<ServerResponse>(),
                pageIds: new Map<ServerResponse, string>(),
                seen: new Map<string, boolean>(),
                declined: new Set<string>(),
                changed: new Map<string, PlayerSetting>(),
                events: [],
                left: new Set<string>(),
                stories: new Map(),
                shared: new Map<string, string>(),
                notify: () => undefined,
                tellRolls: () => Promise.resolve(),
                words: pageTranslator(context, options.page ?? builtPage, () => served.notify()),
                texts: systemTexts(context, () => served.notify()),
                acts: newActs(),
                others: new Map<string, number>(),
                chat: {},
                queue: options.queue ?? codexQueue(),
                heldFor: options.heldFor ?? heldFor,
                homeAddresses: options.homeAddresses ?? homeAddresses,
                ...(options.master === undefined ? {} : { master: options.master }),
                ...(options.launcher === undefined ? {} : { launcher: options.launcher }),
                ...(options.giveWay === undefined ? {} : { giveWay: options.giveWay }),
            };
            options.served?.(served);
            return serve(server, served);
        }
    }

    return undefined;
}

/** The link of the campaign's page where another chat serves it (D-577); undefined when none does. */
export async function campaignPageElsewhere(root: string, ports: number[] = campaignPorts(root)): Promise<{ url: string; port: number; } | undefined>
{
    for (const port of ports.filter((one) => one !== 0)) {
        if (await campaignServes(port, root)) {
            return { url: `http://127.0.0.1:${port}`, port };
        }
    }

    return undefined;
}

/**
 * Whether the campaign's page answers at a port, asked a few times: a chat busy with its world for a second or two answers late (D-577); longer at the port
 * campaign.yaml keeps, where no other program is likely to take calls and not answer them.
 */
async function campaignServes(port: number, root: string, saved?: number): Promise<boolean>
{
    for (let asked = 0; asked < (port === saved ? 8 : 3); asked++) {
        const there = await dashboardAt(port);

        if (there !== undefined) {
            return isCampaignPage(there, root);
        }
    }

    return false;
}

/**
 * For a table alone: whether the chat that serves the campaign's page at a port gave it, and the port went free within a few seconds; never where it says
 * no or does not know how, as a chat of an older engine.
 */
async function pageTaken(port: number, options: DashboardOptions): Promise<boolean>
{
    if (options.takeOver !== true) {
        return false;
    }

    // A chat busy with its world answers late: it is given the time a table's start can spare.
    const asked = await askPage(`http://127.0.0.1:${port}`, "POST", "/api/yield", {}, yieldAskWait);

    if (asked === undefined || (asked !== "refused" && asked.status !== 200)) {
        return false;
    }

    const free = async (): Promise<true | undefined> => (await answers(port) ? undefined : true);
    return lookUntil(free, () => false, { within: yieldWait, every: yieldLookEvery });
}

/** Whether what answers at a port is the page of this campaign. */
export function isCampaignPage(there: DashboardAt | undefined, root: string): boolean
{
    return there?.root !== null && there?.root !== undefined && samePath(there.root, root);
}

/** What the server keeps while it runs, shared by the files beside it: the pages open, the question asked, what the master has not heard yet. */
export interface Served
{
    port: number;
    context: Context;
    session: SessionStore;
    /** The folder of the built page. */
    page: string;
    /** The pages open, which wait for notices. */
    pages: Set<ServerResponse>;
    /** What the master asks the player now, waiting for a click on the page (D-279). */
    asked?: Asked;
    /** The card of a package's question as its call left it, after the last dice, until another question comes (D-507). */
    card?: ShownCard;
    /** How long a question waits for a page to come back, after the last one closed. */
    pageReturn: number;
    /** Each setting the player changed on the page since the master's last call, as it was before the first of those changes (D-341). */
    changed: Map<string, PlayerSetting>;
    /** What the player did with the saves on the page since the master's last call, in order (D-359). */
    events: string[];
    /** The setup's choices the player left to the master on the page, shown so until the master makes them (D-370). */
    left: Set<string>;
    /** The stories the player proposed for their characters, by name, each with the page's opening text then: waiting until the master writes it (D-386). */
    stories: Map<string, { text: string; before: string; }>;
    /** The notes the player shared and the master has not heard yet, by id, with what the master will hear: until then the player may take one back (D-381). */
    shared: Map<string, string>;
    /** The wait for a page to come back, since the last one closed: a page that opens ends it. */
    returning?: NodeJS.Timeout;
    /** How long a question waits on pages that no one sees, before it goes to the form or to words (D-455). */
    pageHidden: number;
    /** Each open page's own id, as it gives it when it listens. */
    pageIds: Map<ServerResponse, string>;
    /** Whether each page, by its id, is seen now: on the screen, not in a tab or a window behind (D-455). */
    seen: Map<string, boolean>;
    /** The open pages that came through the door to the phone (T-317). */
    phonePages: Set<ServerResponse>;
    /** The wait of a question on pages that no one sees: a page seen again ends it. */
    hiding?: NodeJS.Timeout;
    /** Tells the pages that something changed, once for changes that come together. */
    notify(): void;
    /** The page in a language the package does not ship, translated on the fly (D-406). */
    words: PageTranslator;
    /** The game system's pages in the campaign's language, translated as the page reads them (D-539): the page's alone, never the master's calls. */
    texts: SystemTexts;
    /** The package the player is adding, updating or taking away on the page, while npm works (D-475): one at a time. */
    packageWork?: { name: string; action: PackageAction; phase: PackagePhase; };
    /** The packages the player said no to in a window of their computer, asked from the page: never asked again in this session (D-510). */
    declined: Set<string>;
    /** What the page may add, as npm and GitHub said it last, and when (D-486). */
    catalog?: { at: number; catalog: Catalog; };
    /** What npm said of its latest rpg-engine, asked at most once a day (T-219). */
    engineLatest?: EngineAsked;
    /** The player's sentences said on the page, waiting for the master or heard lately (D-495). */
    acts: Acts;
    /** The other chats of the campaign that wait for its page, by session, with when each last asked (D-577). */
    others: Map<string, number>;
    /** What the page keeps of the chat it serves now: a table's next chat gets it anew (D-582). */
    chat: ServedChat;
    /** How long sentences given to a hook wait for the master's next call, in ms (D-578). */
    heldFor: number;
    /** Codex's queue, and the sentences being put in it now (D-495). */
    queue: CodexQueue;
    queueing?: Promise<void>;
    /** The problems of the campaign's files the page last showed the player (playtest 05). */
    problemsShown?: number;
    /** The campaign's table's own chat with the master, where the table keeps one. */
    master?: PageMaster;
    /** Tells the table's chat the rolls the player may see made since it last looked; done once that look is. */
    tellRolls(): Promise<void>;
    /** At a campaign's table: the way back to the launcher. */
    launcher?: LauncherWay;
    /** The door to the player's phone on the home network, while the player keeps it open (T-317). */
    phone?: PhoneDoor;
    /** The computer's addresses on the home network now. */
    homeAddresses(): string[];
    /** A chat's own server: how it gives the page to the campaign's table, once. */
    giveWay?: () => void;
}

/** What the page keeps of the chat it serves, all of it: a campaign's table forgets it as that chat leaves (D-582). */
export interface ServedChat
{
    /**
     * The doorbell's hook, waiting for a sentence; whether it asked for the player's words, as OpenCode's does (D-578); whether one ever came, so that this chat
     * has one (D-495); and whether the last went away without a ring, as when the chat was stopped, until a hook or a call of the master comes again.
     */
    bell?: ServerResponse;
    bellWords?: boolean;
    belled?: boolean;
    bellGone?: boolean;
    /** Codex refused a sentence once: the others wait for the master's next call (D-495). */
    queueBroken?: boolean;
    /** How many of the problems the page showed the master was told of (playtest 05). */
    problemsTold?: number;
}

/** Codex's own queue on this computer, the command looked for once. */
function codexQueue(): CodexQueue
{
    let found: boolean | undefined;
    return { ready: () => (found ??= helperCommand("codex") !== undefined), send: queueInCodex };
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

function serve(server: Server, served: Served): Dashboard
{
    let notice: NodeJS.Timeout | undefined;
    let chatNotice: NodeJS.Timeout | undefined;

    served.notify = () => {
        notice ??= setTimeout(() => {
            notice = undefined;
            served.pages.forEach((page) => page.write("event: changed\ndata: {}\n\n"));
        }, noticeDelay).unref();
    };

    // The master's prose comes in many pieces: the pages read the chat alone, once for pieces that come together.
    const chatChanged = (): void => {
        chatNotice ??= setTimeout(() => {
            chatNotice = undefined;
            served.pages.forEach((page) => page.write("event: chat\ndata: {}\n\n"));
        }, noticeDelay).unref();
    };

    const stopListening = served.session.onChange(() => served.notify());
    // A call of the master that ends leaves the player's sentences said meanwhile for the doorbell, or for Codex's queue (D-495): the chat of the context
    // now, which a table gives anew to each chat it serves (D-582).
    let chat = served.context.chat;

    const hookChat = (): void => {
        chat = served.context.chat;

        if (chat !== undefined) {
            chat.beforeCall = () => callBegins(served);

            // And the rolls the call made that the player may see go to the table's chat.
            chat.afterCall = () => {
                deliverActs(served);
                void served.tellRolls();
            };
        }
    };

    hookChat();
    // Where the log stands, before any call: the rolls made before are not the chat's.
    served.tellRolls = rollTeller(served);
    void served.tellRolls();

    // An import works in another process, or in the call the master waits on, writing where the session does not watch: its state is looked at now and then,
    // and the pages hear when it changes (D-491 (11)).
    let importSeen = importNow(served);
    const importLook = setInterval(() => {
        const now = importNow(served);

        if (now !== importSeen) {
            importSeen = now;
            served.notify();
        }
    }, importLookEvery);
    importLook.unref();

    // A theme linked for its author is written in a folder of theirs, which the session does not watch: a print of its files is taken now and then, and the
    // pages hear when it changes, to take the theme again.
    let themesSeen = linkedThemesNow(served);
    const themesLook = setInterval(() => {
        const now = linkedThemesNow(served);

        if (now !== themesSeen) {
            themesSeen = now;
            served.notify();
        }
    }, themesLookEvery);
    themesLook.unref();

    server.on("request", (request: IncomingMessage, response: ServerResponse) => {
        answer(request, response, served).catch((error: unknown) => {
            send(response, 500, "text/plain; charset=utf-8", error instanceof Error ? error.message : String(error));
        });
    });
    // The server never keeps the process alive, nor does a page that stays open: it ends with the chat (D-270).
    server.unref();
    server.on("connection", (socket) => socket.unref());
    return {
        url: `http://127.0.0.1:${served.port}`,
        player: pagePlayer(served),
        news: (told) => {
            // The player's doings on the page, then the choices they confirmed (D-556).
            const page = pageNews(served, told);
            const confirmed = choicesNews(served, told);
            return {
                lines: [...page.lines, ...confirmed.lines],
                restore: () => {
                    page.restore();
                    confirmed.restore();
                },
            };
        },
        pages: () => keepingPages(served),
        chatEnded: () => {
            served.chat.bell?.end("gone");
            served.chat = {};
            hookChat();
            served.notify();
        },
        notify: () => served.notify(),
        chatChanged,
        deliver: () => deliverActs(served),
        close: () =>
            new Promise((done) => {
                stopListening();
                clearInterval(importLook);
                clearInterval(themesLook);
                clearTimeout(notice);
                clearTimeout(chatNotice);
                served.asked?.settle("absent");
                served.chat.bell?.end("gone");

                if (chat !== undefined) {
                    chat.beforeCall = undefined;
                    chat.afterCall = undefined;
                }

                served.pages.forEach((page) => page.end());

                const door = served.phone;
                served.phone = undefined;
                const closing = [door === undefined ? Promise.resolve() : closeDoor(door), new Promise<void>((closed) => server.close(() => closed()))];
                void Promise.all(closing).then(() => done());
            }),
    };
}

/** The pages that keep the game going: the computer's alone. A phone's page is seldom closed: the game ends with the computer's last window (T-317). */
function keepingPages(served: Served): number
{
    return [...served.pages].filter((page) => !served.phonePages.has(page)).length;
}

/** The import under way as the page tells it, as text to compare; empty without a campaign. */
function importNow(served: Served): string
{
    try {
        const root = withFiles(served.session, () => findCampaign(served.context.folder));
        return root === undefined ? "" : JSON.stringify(importShown(root) ?? null);
    } catch {
        return "";
    }
}

/** A print of the files of the themes linked on this computer, read as they are now; empty when none is linked. */
function linkedThemesNow(served: Served): string
{
    const themes = themesFolder(served.context);

    try {
        return themes === undefined ? "" : folderPrint(linkedThemeFolders(themes));
    } catch {
        return "";
    }
}
