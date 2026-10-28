// The player's dashboard (D-270, D-272): the MCP server of the chat serves it on localhost. It gives the page what the player may see through the same commands,
// and tells it when a file of the campaign changes, by whoever, so that it reads again: nothing else goes through the notice, so no secret can.
import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import { connect } from "node:net";
import { z } from "zod";
import { findCampaign } from "../../campaign/index.ts";
import type { PlayerSetting } from "../../commands/config.ts";
import type { Catalog } from "../../commands/game/packages/catalog.ts";
import { loadCampaignCode } from "../../commands/game/packages/code.ts";
import { campaignWidgets, packageWidget } from "../../commands/game/packages/widgets.ts";
import { type PageTranslator, pageTranslator } from "../../commands/game/page-words.ts";
import { importShown } from "../../commands/import.ts";
import { view } from "../../commands/view.ts";
import type { Context, Player } from "../../core/context.ts";
import { type Command, isBoolean } from "../../core/registry.ts";
import type { SessionStore } from "../../core/session-store.ts";
import { withFiles } from "../../core/store.ts";
import { notationParts } from "../../dice/index.ts";
import { helperCommand, queueInCodex } from "../../helpers/index.ts";
import { loadSystemCode } from "../../systems/index.ts";
import { type Acts, newActs } from "../player-acts.ts";
import { builtPage, packagePageFile, pageFile, pageHtml, pageModulesOf, pagePolicy, pageWords, securityHeaders, send, sendFile, sendImage, sendJson, sendPacked, sendThemeFile, themeAddress, themeNow, vendorModule } from "./files.ts";
import { act, deliverActs, keepProblems, listenForBell, notes, pageNews, setupWord, story } from "./news.ts";
import { answerAsked, type Asked, closeCard, listenForChanges, pagePlayer, pageSeen, rollNamesOf, type ShownCard, spendShown } from "./player.ts";
import { addPackage, catalogNow, changeLibrary, changePackage, changeSaves, changeSetting, engineNow, exportCampaign, exportedFile, libraryNow, type PackageAction, type PackagePhase, packagesNow, runForPlayer } from "./writes.ts";

/**
 * The ports the dashboard tries in turn, taking the first that is free: the same link from one chat to the next (D-272). Windows may keep ranges of ports
 * from boot to boot (netsh int ipv4 show excludedportrange): then the next range, and at last any free port, whose link status gives all the same (D-338).
 */
export const dashboardPorts = [...[4747, 5747, 6747, 7747, 8747].flatMap((first) => Array.from({ length: 10 }, (_, index) => first + index)), 0];

/**
 * The ports for a campaign's dashboard: its own in each range first, worked out from its folder, then the others (D-353). Its link stays the same from one
 * chat to the next, as long as no other program holds that port, so that the player can keep it, and a page left open comes back by itself.
 */
export function campaignPorts(root: string): number[]
{
    const offset = [...root.replaceAll("\\", "/").toLowerCase()].reduce((sum, letter) => (sum * 31 + letter.charCodeAt(0)) % 100003, 0) % 10;
    const own = [4747, 5747, 6747, 7747, 8747].map((first) => first + offset);
    return [...own, ...dashboardPorts.filter((port) => !own.includes(port))];
}

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
    news(): { lines: string[]; restore(): void; };
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
}

/** Codex's queue: whether this computer has the command, and a message queued in a thread, as the player's own (D-495). */
export interface CodexQueue
{
    ready(): boolean;
    send(thread: string, text: string): Promise<boolean>;
}

// The commands the page may run: what the player may see, never the master's (VIEW-1). Roles will say more (phase 2).
const playerCommands: Command<z.ZodObject, unknown>[] = [view];

// What the page may never ask of these commands: another character's view, which is the character agent's (VIEW-10).
const masterParameters = ["as"];

// Changes that come together, as a command writing a page and the log, make one notice.
const noticeDelay = 100;

// After the last page closed, how long a question waits for one to come back, as after a reload, before it goes to the form or to words (ASK-1).
const pageReturn = 5000;

// How long a question waits on pages that are open but that no one sees, as one in a tab behind, before it goes to the form or to words (D-455).
const pageHidden = 5000;

// How often the server looks at an import under way, for the pages to tell how far it is (D-491 (11)).
const importLookEvery = 2000;

/** Serves the dashboard of the campaign of context.folder, on 127.0.0.1 only, at the first of the ports that is free; undefined when none is. */
export async function startDashboard(context: Context, session: SessionStore, options: DashboardOptions = {}): Promise<Dashboard | undefined>
{
    // The systems' code, when no MCP server loaded it first, as the dashboard served alone (D-448).
    context.systemCode ??= await loadSystemCode(context.systemFolders);
    // And the campaign's extensions', whose hooks are called at once too (D-514).
    await withFiles(session, () => loadCampaignCode(context));
    const root = withFiles(session, () => findCampaign(context.folder)) ?? context.folder;

    for (const port of options.ports ?? campaignPorts(root)) {
        // A port another program answers at, even on ::1 or on every address, is its: a browser asking localhost could reach it instead (D-277).
        if (port !== 0 && await answers(port)) {
            continue;
        }

        const server = createServer();
        const listening = await listen(server, port);

        if (listening !== undefined) {
            const served: Served = {
                port: listening,
                context,
                session,
                page: options.page ?? builtPage,
                pages: new Set<ServerResponse>(),
                pageReturn: options.pageReturn ?? pageReturn,
                pageHidden: options.pageHidden ?? pageHidden,
                pageIds: new Map<ServerResponse, string>(),
                seen: new Map<string, boolean>(),
                declined: new Set<string>(),
                changed: new Map<string, PlayerSetting>(),
                events: [],
                left: new Set<string>(),
                stories: new Map(),
                shared: new Map<string, string>(),
                notify: () => undefined,
                words: pageTranslator(context, options.page ?? builtPage, () => served.notify()),
                acts: newActs(),
                queue: options.queue ?? codexQueue(),
            };
            return serve(server, served);
        }
    }

    return undefined;
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
    /** The wait of a question on pages that no one sees: a page seen again ends it. */
    hiding?: NodeJS.Timeout;
    /** Tells the pages that something changed, once for changes that come together. */
    notify(): void;
    /** The page in a language the package does not ship, translated on the fly (D-406). */
    words: PageTranslator;
    /** The package the player is adding, updating or taking away on the page, while npm works (D-475): one at a time. */
    packageWork?: { name: string; action: PackageAction; phase: PackagePhase; };
    /** The packages the player said no to in a window of their computer, asked from the page: never asked again in this session (D-510). */
    declined: Set<string>;
    /** What the page may add, as npm and GitHub said it last, and when (D-486). */
    catalog?: { at: number; catalog: Catalog; };
    /** The player's sentences said on the page, waiting for the master or heard lately (D-495). */
    acts: Acts;
    /** The doorbell of Claude Code's hook, waiting for a sentence; and whether one ever came, so that this chat has one (D-495). */
    bell?: ServerResponse;
    belled?: boolean;
    /** Codex's queue, and the sentences being put in it now (D-495). */
    queue: CodexQueue;
    queueing?: Promise<void>;
    /** Codex refused a sentence once: the others wait for the master's next call (D-495). */
    queueBroken?: boolean;
    /** The problems of the campaign's files the page last showed the player, and how many the master was told of (playtest 05). */
    problemsShown?: number;
    problemsTold?: number;
}

/** Codex's own queue on this computer, the command looked for once. */
function codexQueue(): CodexQueue
{
    let found: boolean | undefined;
    return { ready: () => (found ??= helperCommand("codex") !== undefined), send: queueInCodex };
}

/** Whether a program answers at a port of this machine, on 127.0.0.1 or on ::1. */
async function answers(port: number): Promise<boolean>
{
    const answersAt = (host: string): Promise<boolean> =>
        new Promise((done) => {
            const socket = connect({ host, port });

            const end = (answered: boolean): void => {
                socket.destroy();
                done(answered);
            };

            socket.setTimeout(300, () => end(false));
            socket.once("connect", () => end(true));
            socket.once("error", () => end(false));
        });
    return (await Promise.all(["127.0.0.1", "::1"].map(answersAt))).some((answer) => answer);
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

    served.notify = () => {
        notice ??= setTimeout(() => {
            notice = undefined;
            served.pages.forEach((page) => page.write("event: changed\ndata: {}\n\n"));
        }, noticeDelay).unref();
    };

    const stopListening = served.session.onChange(() => served.notify());
    // A call of the master that ends leaves the player's sentences said meanwhile for the doorbell, or for Codex's queue (D-495).
    const chat = served.context.chat;

    if (chat !== undefined) {
        chat.afterCall = () => deliverActs(served);
    }

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
        news: () => pageNews(served),
        close: () =>
            new Promise((done) => {
                stopListening();
                clearInterval(importLook);
                clearTimeout(notice);
                served.asked?.settle("absent");
                served.bell?.end("gone");

                if (chat !== undefined) {
                    chat.afterCall = undefined;
                }

                served.pages.forEach((page) => page.end());
                server.close(() => done());
            }),
    };
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

async function answer(request: IncomingMessage, response: ServerResponse, served: Served): Promise<void>
{
    // Only the dashboard's own page, at its own address: no other site may read what the player sees, nor a name that leads elsewhere (D-272).
    const own = [`http://localhost:${served.port}`, `http://127.0.0.1:${served.port}`];
    const origin = request.headers.origin;

    // A request another site makes the browser send, as an image's, which carries no origin, says so in Sec-Fetch-Site: never ours, nor the hook's, which sends none.
    const crossSite = request.headers["sec-fetch-site"] === "cross-site";

    if (!own.includes(`http://${request.headers.host ?? ""}`) || (origin !== undefined && !own.includes(origin)) || crossSite) {
        send(response, 403, "text/plain; charset=utf-8", `The dashboard answers only its own page, at http://localhost:${served.port}.`);
        return;
    }

    const url = new URL(request.url ?? "/", own[0]);
    const path = url.pathname;

    // The page answers the master's question with a click, and changes the player's settings: what it sends, and only from itself (D-279, D-341).
    if (request.method === "POST" && path === "/api/run" && origin !== undefined) {
        await runForPlayer(request, response, served);
        return;
    }

    if (request.method === "POST" && path === "/api/answer" && origin !== undefined) {
        await answerAsked(request, response, served);
        return;
    }

    if (path === "/api/act" && (request.method === "GET" || (request.method === "POST" && origin !== undefined))) {
        await act(request, response, served);
        return;
    }

    // Claude Code's hook waits here for the player's next sentence, from this computer (D-495).
    if (request.method === "GET" && path === "/api/bell") {
        listenForBell(request, response, served, url.searchParams.has("probe"));
        return;
    }

    if (request.method === "POST" && path === "/api/card" && origin !== undefined) {
        await closeCard(request, response, served);
        return;
    }

    if (request.method === "POST" && path === "/api/seen" && origin !== undefined) {
        await pageSeen(request, response, served);
        return;
    }

    if (request.method === "POST" && path === "/api/package" && origin !== undefined) {
        await changePackage(request, response, served);
        return;
    }

    if (request.method === "POST" && path === "/api/library" && origin !== undefined) {
        await changeLibrary(request, response, served);
        return;
    }

    // An adventure the player adds from a .zip of their computer, and the campaign exported as one (D-483): files, never code.
    if (request.method === "POST" && path === "/api/add" && origin !== undefined) {
        await addPackage(request, response, served);
        return;
    }

    if (request.method === "POST" && path === "/api/export" && origin !== undefined) {
        await exportCampaign(request, response, served);
        return;
    }

    if (request.method === "POST" && path === "/api/config" && origin !== undefined) {
        await changeSetting(request, response, served);
        return;
    }

    if (path === "/api/notes" && (request.method === "GET" || (request.method === "POST" && origin !== undefined))) {
        await notes(request, response, served);
        return;
    }

    if (path === "/api/story" && (request.method === "GET" || (request.method === "POST" && origin !== undefined))) {
        await story(request, response, served);
        return;
    }

    if (request.method === "POST" && path === "/api/setup" && origin !== undefined) {
        await setupWord(request, response, served);
        return;
    }

    if (request.method === "POST" && path === "/api/saves" && origin !== undefined) {
        await changeSaves(request, response, served);
        return;
    }

    if (path === "/api/words" && (request.method === "GET" || (request.method === "POST" && origin !== undefined))) {
        await pageWords(request, response, served, url);
        return;
    }

    // rpg-engine itself (D-515 (3)): what it is and what npm has, for the page; its update, from the page alone, never by the master.
    if (path === "/api/engine" && (request.method === "GET" || (request.method === "POST" && origin !== undefined))) {
        await engineNow(request, response, served);
        return;
    }

    if (request.method !== "GET" && request.method !== "HEAD") {
        send(response, 405, "text/plain; charset=utf-8", "The dashboard only gives what the player may see, and takes a click on what the master asks, the player's settings and their saves.");
        return;
    }

    if (path === "/api/asked") {
        const asked = served.asked;
        // Each button's dice, for the page to say in words in its tooltip: the notation at a check's end, as "(2d20kh1+5)" (D-297).
        const words = asked?.labels.map((label) => notationParts(/\(([^()]+)\)$/.exec(label)?.[1] ?? "") ?? null);
        // And the name the game gives its roll, in the campaign's language, as "with advantage" (D-399).
        const names = asked === undefined ? undefined : rollNamesOf(asked.labels, served);
        // Whose roll it is, always, for the page to show who is asked (D-480 (7)); the fields of the sheet only when a check rolls one.
        const rows = asked?.rows === undefined ? {} : { who: asked.rows.who, ...(asked.rows.fields.some((field) => field !== null) ? { fields: asked.rows.fields } : {}) };
        // The dice of a rest as they are now, read again at each look (ASK-14).
        const spend = asked?.spending === undefined ? undefined : spendShown(asked.spending, served);
        sendJson(response, 200, {
            // How the card of a package's last question was left, while no other question is asked (D-507).
            ...(asked === undefined && served.card !== undefined ? { card: served.card } : {}),
            asked: asked === undefined
                ? null
                : {
                    id: asked.id,
                    question: asked.question,
                    title: asked.title,
                    labels: asked.labels,
                    words,
                    names,
                    ...rows,
                    ...(asked.rows?.forced === true ? { forced: true } : {}),
                    ...(asked.rows?.toss === true ? { toss: true } : {}),
                    ...(asked.rows?.buttons === undefined ? {} : { buttons: asked.rows.buttons }),
                    ...(asked.rows?.rule === undefined ? {} : { rule: asked.rows.rule }),
                    // Its card, or that one comes, until its widget answers: the page waits for it rather than show the question twice (D-507).
                    ...(asked.card !== undefined ? { card: asked.card } : asked.rows?.card === undefined ? {} : { card: { widget: asked.rows.card.widget, key: asked.rows.card.key, coming: true } }),
                    ...(asked.square ? { square: true } : {}),
                    ...(spend === undefined ? {} : { who: spend.who, spend }),
                },
        });
        return;
    }

    if (path === "/api/packages") {
        await packagesNow(response, served, url.searchParams.get("npm") === "true");
        return;
    }

    if (path === "/api/theme") {
        await themeNow(response, served);
        return;
    }

    if (path === "/api/modules") {
        const root = findCampaign(served.context.folder);
        await served.session.ready();
        const modules = root === undefined ? [] : withFiles(served.session, () => pageModulesOf(root, served));
        sendJson(response, 200, { modules: modules.map((one) => ({ package: one.package, kind: one.kind, version: one.version, address: one.address, figures: one.figures, ...(one.words === undefined ? {} : { words: one.words }) })) });
        return;
    }

    if (path === "/api/widgets") {
        await widgetsNow(response, served);
        return;
    }

    if (path === "/api/widget") {
        await widgetForCard(response, served, url.searchParams);
        return;
    }

    if (path === "/api/library") {
        await libraryNow(response, served);
        return;
    }

    if (path === "/api/catalog") {
        await catalogNow(response, served, url.searchParams.get("fresh") === "true");
        return;
    }

    if (path === "/api/export") {
        exportedFile(response, served, url.searchParams.get("file") ?? "");
        return;
    }

    if (path === "/") {
        send(response, 200, "text/html; charset=utf-8", pageHtml, pagePolicy);
    } else if (path === "/favicon.ico") {
        // Browsers ask for it by themselves; the page's icon comes with its logo.
        response.writeHead(204, securityHeaders).end();
    } else if (path === "/events") {
        listenForChanges(request, response, served);
    } else if (path.startsWith("/api/")) {
        await runCommand(path.slice("/api/".length), url.searchParams, response, served);
    } else if (path.startsWith("/images/")) {
        sendImage(path.slice("/images/".length), request, response, served);
    } else if (sendPacked(path, response, served)) {
        // A language package's phrases or Guide, before the page's own (D-485 (3)).
    } else if (path.startsWith(`${themeAddress}/`)) {
        await sendThemeFile(path.slice(themeAddress.length + 1), url.searchParams, request, response, served);
    } else if (path.startsWith("/vendor/")) {
        sendFile(vendorModule(path.slice("/vendor/".length)), path, request, response, served);
    } else if (path.startsWith("/pkg/")) {
        sendFile(packagePageFile(path.slice("/pkg/".length), served), path, request, response, served);
    } else {
        sendFile(pageFile(served.page, path), path, request, response, served);
    }
}

/** Runs a command the page may run, with its parameters from the query, as the MCP server runs a tool; its result, or the error, in JSON. */
async function runCommand(name: string, parameters: URLSearchParams, response: ServerResponse, served: Served): Promise<void>
{
    const command = playerCommands.find((candidate) => candidate.name === name);

    if (command === undefined) {
        sendJson(response, 404, { error: `The dashboard has no command ${name}: it has ${playerCommands.map((candidate) => candidate.name).join(", ")}.` });
        return;
    }

    const masters = [...parameters.keys()].filter((key) => masterParameters.includes(key));

    if (masters.length > 0) {
        sendJson(response, 400, { error: `The dashboard gives only what the player may see: ${masters.join(", ")} is the master's.` });
        return;
    }

    // A flag of the command comes in the address as true or false, as view's map.
    const shape = command.input.shape as Record<string, z.ZodType>;
    const given = [...parameters].map(([name, value]) => [name, shape[name] !== undefined && isBoolean(shape[name]) ? value === "true" : value]);
    const parsed = command.input.strict().safeParse(Object.fromEntries(given));

    if (!parsed.success) {
        sendJson(response, 400, { error: z.prettifyError(parsed.error) });
        return;
    }

    try {
        await served.session.ready();
        const result = await command.run(parsed.data, served.context);
        keepProblems(served, result);
        sendJson(
            response,
            200,
            isSetup(result) ? { ...result, left: result.questions.filter((question) => served.left.has(question.name) && question.value === undefined && question.items === undefined).map((question) => question.name) } : result,
        );
    } catch (error) {
        sendJson(response, 400, { error: error instanceof Error ? error.message : String(error) });
    }
}

/** Whether a command's result is the setup, as view gives it with setup. */
function isSetup(result: unknown): result is { kind: "setup"; questions: PlayerSetting[]; }
{
    return typeof result === "object" && result !== null && (result as { kind?: unknown; }).kind === "setup";
}

/** What one widget of a package shows for a card or a page of its page code, for the character it shows (D-514): its data, or nothing. */
async function widgetForCard(response: ServerResponse, served: Served, query: URLSearchParams): Promise<void>
{
    const [owner, name, who] = [query.get("package") ?? "", query.get("widget") ?? "", query.get("who") ?? undefined];

    try {
        await served.session.ready();
        const shows = await withFiles(served.session, async () => {
            const root = findCampaign(served.context.folder);
            return root === undefined ? undefined : await packageWidget(root, served.context, owner, name, who === "" ? undefined : who);
        });
        sendJson(response, 200, shows === undefined ? {} : { shows });
    } catch (error) {
        sendJson(response, 400, { error: error instanceof Error ? error.message : String(error) });
    }
}

/** The widgets of the campaign's extensions as the page shows them (D-502): where each stands, and what it shows now; none without a campaign. */
async function widgetsNow(response: ServerResponse, served: Served): Promise<void>
{
    try {
        await served.session.ready();
        const widgets = await withFiles(served.session, async () => {
            const root = findCampaign(served.context.folder);
            return root === undefined ? [] : await campaignWidgets(root, served.context);
        });
        sendJson(response, 200, { widgets });
    } catch (error) {
        sendJson(response, 400, { error: error instanceof Error ? error.message : String(error) });
    }
}
