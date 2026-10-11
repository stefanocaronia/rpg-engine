// The player's dashboard (D-270, D-272): the MCP server of the chat serves it on localhost. It gives the page what the player may see through the same commands,
// and tells it when a file of the campaign changes, by whoever, so that it reads again: nothing else goes through the notice, so no secret can.
import { createHash, randomUUID } from "node:crypto";
import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import { createRequire } from "node:module";
import { connect } from "node:net";
import { extname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";
import { findCampaign, requireCampaign, settingNames } from "./campaign/index.ts";
import { config, playerChangeNews, type PlayerSetting, playerSettingNamed, playerSettings } from "./commands/config.ts";
import { imageFolders } from "./commands/game-images.ts";
import { view } from "./commands/view.ts";
import type { Context, Picked, Player, Rows, Said } from "./core/context.ts";
import { type Command, isBoolean } from "./core/registry.ts";
import type { SessionStore } from "./core/session-store.ts";
import { files, isInside, withFiles } from "./core/store.ts";
import { notationWords } from "./dice/index.ts";
import { findImage } from "./images/index.ts";

/**
 * The ports the dashboard tries in turn, taking the first that is free: the same link from one chat to the next (D-272). Windows may keep ranges of ports
 * from boot to boot (netsh int ipv4 show excludedportrange): then the next range, and at last any free port, whose link status gives all the same (D-338).
 */
export const dashboardPorts = [...[4747, 5747, 6747, 7747, 8747].flatMap((first) => Array.from({ length: 10 }, (_, index) => first + index)), 0];

/** A dashboard that is running: its link, and how to stop it. */
export interface Dashboard
{
    url: string;
    /** The player through the page: ask's buttons, while a page is open (D-279). */
    player: Player;
    /**
     * What the player changed on the page since it was last taken, each setting as it is now against how it was, for the master's next call, and what gives it
     * back when that call never answers (D-341).
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
}

// The commands the page may run: what the player may see, never the master's (VIEW-1). Roles will say more (phase 2).
const playerCommands: Command<z.ZodObject, unknown>[] = [view];

// Changes that come together, as a command writing a page and the log, make one notice.
const noticeDelay = 100;

const imageTypes: Record<string, string> = { ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp", ".svg": "image/svg+xml" };
const pageTypes: Record<string, string> = {
    ".js": "text/javascript; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".svg": "image/svg+xml",
    ".png": "image/png",
    ".glb": "model/gltf-binary",
    ".json": "application/json; charset=utf-8",
    ".wav": "audio/wav",
};

// A picture runs nothing, even an SVG opened by itself.
const picturePolicy = "default-src 'none'; style-src 'unsafe-inline'; sandbox";

// From src/ and from dist/ alike, the built page is in dist/dashboard, one level up.
const builtPage = fileURLToPath(new URL("../dist/dashboard/", import.meta.url));

// The modules the page imports from packages, by the names the import map gives them: a package, and a file in it. three.module.js imports three.core.js
// beside it; three's loader of the dice's models imports two of its utilities beside it.
const vendorModules: Record<string, [string, string]> = {
    "preact.js": ["preact", "dist/preact.module.js"],
    "hooks.js": ["preact", "hooks/dist/hooks.module.js"],
    "jsx-runtime.js": ["preact", "jsx-runtime/dist/jsxRuntime.module.js"],
    "three.module.js": ["three", "build/three.module.js"],
    "three.core.js": ["three", "build/three.core.js"],
    "three/addons/loaders/GLTFLoader.js": ["three", "examples/jsm/loaders/GLTFLoader.js"],
    "three/addons/utils/BufferGeometryUtils.js": ["three", "examples/jsm/utils/BufferGeometryUtils.js"],
    "three/addons/utils/SkeletonUtils.js": ["three", "examples/jsm/utils/SkeletonUtils.js"],
    "cannon-es.js": ["cannon-es", "dist/cannon-es.js"],
};
const importMap = JSON.stringify({
    imports: {
        "preact": "/vendor/preact.js",
        "preact/hooks": "/vendor/hooks.js",
        "preact/jsx-runtime": "/vendor/jsx-runtime.js",
        "three": "/vendor/three.module.js",
        "three/addons/": "/vendor/three/addons/",
        "cannon-es": "/vendor/cannon-es.js",
    },
});

// The page runs only its own files and the import map written in it, known by its hash.
const pagePolicy = `default-src 'self'; script-src 'self' 'sha256-${createHash("sha256").update(importMap).digest("base64")}'; base-uri 'none'; form-action 'none'`;

const pageHtml = [
    "<!doctype html>",
    '<html lang="en">',
    '<meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width, initial-scale=1">',
    '<meta name="color-scheme" content="light dark">',
    "<title>RPG Engine</title>",
    '<link rel="icon" href="/assets/favicon.svg" type="image/svg+xml">',
    '<link rel="icon" href="/assets/icon-32.png" sizes="32x32">',
    '<link rel="apple-touch-icon" href="/assets/icon-180.png">',
    '<link rel="stylesheet" href="/style.css">',
    `<script type="importmap">${importMap}</script>`,
    '<script type="module" src="/app.js"></script>',
    '<div id="app"></div>',
    "",
].join("\n");

/** Serves the dashboard of the campaign of context.folder, on 127.0.0.1 only, at the first of the ports that is free; undefined when none is. */
export async function startDashboard(context: Context, session: SessionStore, options: DashboardOptions = {}): Promise<Dashboard | undefined>
{
    for (const port of options.ports ?? dashboardPorts) {
        // A port another program answers at, even on ::1 or on every address, is its: a browser asking localhost could reach it instead (D-277).
        if (port !== 0 && await answers(port)) {
            continue;
        }

        const server = createServer();
        const listening = await listen(server, port);

        if (listening !== undefined) {
            const served = { port: listening, context, session, page: options.page ?? builtPage, pages: new Set<ServerResponse>(), pageReturn: options.pageReturn ?? pageReturn, changed: new Map<string, PlayerSetting>() };
            return serve(server, { ...served, notify: () => undefined });
        }
    }

    return undefined;
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

interface Served
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
    /** How long a question waits for a page to come back, after the last one closed. */
    pageReturn: number;
    /** Each setting the player changed on the page since the master's last call, as it was before the first of those changes (D-341). */
    changed: Map<string, PlayerSetting>;
    /** The wait for a page to come back, since the last one closed: a page that opens ends it. */
    returning?: NodeJS.Timeout;
    /** Tells the pages that something changed, once for changes that come together. */
    notify(): void;
}

/** A question of ask on the page: its buttons, whether it asks for a square of the map (ASK-11), and what settles it: a click, a stop or a timeout, or the pages gone. */
interface Asked
{
    id: string;
    question: string;
    title: string;
    labels: string[];
    square?: true;
    /** Whose sheet the checks read and the field of each, for the page to light its row (ASK-12). */
    rows?: Rows;
    settle(choice: number | Said | Picked | undefined | "absent"): void;
}

// How many characters the player's own words may have, in place of a button (ASK-10).
const mostSaid = 500;

// How long the page waits for the player's click: as long as a host waits for a call that keeps reporting progress, as ask does with a form.
const playerWait = 30 * 60 * 1000;

// After the last page closed, how long a question waits for one to come back, as after a reload, before it goes to the form or to words (ASK-1).
const pageReturn = 5000;

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
        news: () => settingNews(served),
        close: () =>
            new Promise((done) => {
                stopListening();
                clearTimeout(notice);
                served.asked?.settle("absent");
                served.pages.forEach((page) => page.end());
                server.close(() => done());
            }),
    };
}

async function answer(request: IncomingMessage, response: ServerResponse, served: Served): Promise<void>
{
    // Only the dashboard's own page, at its own address: no other site may read what the player sees, nor a name that leads elsewhere (D-272).
    const own = [`http://localhost:${served.port}`, `http://127.0.0.1:${served.port}`];
    const origin = request.headers.origin;

    if (!own.includes(`http://${request.headers.host ?? ""}`) || (origin !== undefined && !own.includes(origin))) {
        send(response, 403, "text/plain; charset=utf-8", `The dashboard answers only its own page, at http://localhost:${served.port}.`);
        return;
    }

    const url = new URL(request.url ?? "/", own[0]);
    const path = url.pathname;

    // The page answers the master's question with a click, and changes the player's settings: what it sends, and only from itself (D-279, D-341).
    if (request.method === "POST" && path === "/api/answer" && origin !== undefined) {
        await answerAsked(request, response, served);
        return;
    }

    if (request.method === "POST" && path === "/api/config" && origin !== undefined) {
        await changeSetting(request, response, served);
        return;
    }

    if (request.method !== "GET" && request.method !== "HEAD") {
        send(response, 405, "text/plain; charset=utf-8", "The dashboard only gives what the player may see, and takes a click on what the master asks.");
        return;
    }

    if (path === "/api/asked") {
        const asked = served.asked;
        // Each button's dice in words, for its tooltip: the notation at a check's end, as "(2d20kh1+5)" (D-297).
        const words = asked?.labels.map((label) => notationWords(/\(([^()]+)\)$/.exec(label)?.[1] ?? "") ?? null);
        const rows = asked?.rows?.fields.some((field) => field !== null) === true ? { who: asked.rows.who, fields: asked.rows.fields } : {};
        sendJson(response, 200, { asked: asked === undefined ? null : { id: asked.id, question: asked.question, title: asked.title, labels: asked.labels, words, ...rows, ...(asked.square ? { square: true } : {}) } });
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
    } else if (path.startsWith("/vendor/")) {
        sendFile(vendorModule(path.slice("/vendor/".length)), path, request, response, served);
    } else {
        sendFile(pageFile(served.page, path), path, request, response, served);
    }
}

/** A file of the built page, by its path in the address: only a script, a style sheet or a picture inside its folder, such as its logo. */
function pageFile(folder: string, path: string): string | undefined
{
    const relative = decoded(path);
    const file = relative === undefined ? undefined : resolve(folder, `.${relative}`);
    return file !== undefined && isInside(folder, file) && pageTypes[extname(file)] !== undefined ? file : undefined;
}

/** A module the page imports from a package, as a file of the package; undefined for another name, or when the package is missing. */
function vendorModule(name: string): string | undefined
{
    const module = vendorModules[name];

    try {
        // The package's folder, from where its main file is: node_modules/<package>.
        const main = module === undefined ? undefined : createRequire(import.meta.url).resolve(module[0]);
        const folder = main === undefined || module === undefined ? undefined : main.slice(0, main.lastIndexOf(join("node_modules", module[0])) + join("node_modules", module[0]).length);
        return folder === undefined || module === undefined ? undefined : join(folder, module[1]);
    } catch {
        return undefined;
    }
}

/** A script, a style sheet or a picture of the page, as it is on the disk. */
function sendFile(file: string | undefined, path: string, request: IncomingMessage, response: ServerResponse, served: Served): void
{
    const type = file === undefined ? undefined : pageTypes[extname(file)];
    const bytes = file === undefined ? undefined : withFiles(served.session, () => files().bytes(file));

    if (bytes === undefined || type === undefined) {
        send(response, 404, "text/plain; charset=utf-8", `Nothing at ${path}.`);
        return;
    }

    sendTagged(request, response, bytes, { "Content-Type": type, "Content-Security-Policy": type.startsWith("image/") ? picturePolicy : securityHeaders["Content-Security-Policy"] });
}

/** Bytes with a tag of what they hold, read again at each load: the same bytes come back as not modified, as three.js and the dice after the first load. */
function sendTagged(request: IncomingMessage, response: ServerResponse, bytes: Uint8Array, headers: Record<string, string>): void
{
    const tag = `"${createHash("sha1").update(bytes).digest("base64url")}"`;
    const all = { ...securityHeaders, ...headers, "Cache-Control": "no-cache", "ETag": tag };

    if (request.headers["if-none-match"] === tag) {
        response.writeHead(304, all).end();
        return;
    }

    response.writeHead(200, all).end(request.method === "HEAD" ? undefined : bytes);
}

/**
 * The player through the page (D-279): the question shows on every page open, and the first click settles it; with no page open, "absent", so that ask turns to
 * the form or to words. A stop of the call takes the question away and nothing is logged (ASK-9).
 */
function pagePlayer(served: Served): Player
{
    const put = (question: string, title: string, labels: string[], square: boolean, signal?: AbortSignal, rows?: Rows): Promise<number | Said | Picked | undefined | "absent"> => {
        if (served.pages.size === 0) {
            return Promise.resolve("absent");
        }

        // A call stopped before its question was put on the page asks nothing (ASK-9).
        if (signal?.aborted === true) {
            return Promise.resolve(undefined);
        }

        // A question asked again, as after a summary, takes the place of the one before.
        served.asked?.settle(undefined);
        return new Promise((done) => {
            const timer = setTimeout(() => settle(undefined), playerWait).unref();

            const settle = (choice: number | Said | Picked | undefined | "absent"): void => {
                clearTimeout(timer);
                signal?.removeEventListener("abort", stop);

                if (served.asked?.id === asked.id) {
                    served.asked = undefined;
                    served.notify();
                }

                done(choice);
            };

            const stop = (): void => settle(undefined);
            const asked: Asked = { id: randomUUID(), question, title, labels, ...(square ? { square: true as const } : {}), ...(rows === undefined ? {} : { rows }), settle };
            served.asked = asked;
            signal?.addEventListener("abort", stop);
            served.notify();
        });
    };

    return {
        asking: () => served.asked !== undefined,
        async choose(question, title, labels, signal, rows)
        {
            const chosen = await put(question, title, labels, false, signal, rows);
            return typeof chosen === "object" && "square" in chosen ? undefined : chosen;
        },
        async chooseSquare(question, title, change, signal)
        {
            const chosen = await put(question, title, [change], true, signal);
            return typeof chosen === "number" ? (chosen === 0 ? 0 : undefined) : chosen;
        },
    };
}

/**
 * The page's answer to what the master asks: which button, by its place, or the player's own words (ASK-10); refused for a question no longer asked, so that a
 * late click counts for nothing.
 */
async function answerAsked(request: IncomingMessage, response: ServerResponse, served: Served): Promise<void>
{
    const body = await readBody(request);
    const parsed = z.union([
        z.object({ asked: z.string(), choice: z.number().int().min(0) }).strict(),
        z.object({ asked: z.string(), text: z.string().trim().min(1).max(mostSaid) }).strict(),
        z.object({ asked: z.string(), square: z.string().regex(/^[A-Za-z]{1,3}\d{1,3}$/) }).strict(),
    ]).safeParse(body);
    const asked = served.asked;

    if (!parsed.success) {
        sendJson(response, 400, { error: `Send which button was clicked, { asked, choice }, the player's words, { asked, text }, up to ${mostSaid} characters, or a square of the map, { asked, square }.` });
    } else if (
        asked === undefined || asked.id !== parsed.data.asked || ("choice" in parsed.data && parsed.data.choice >= asked.labels.length) || ("square" in parsed.data && asked.square !== true)
    ) {
        sendJson(response, 409, { error: "The master no longer asks this." });
    } else {
        asked.settle("choice" in parsed.data ? parsed.data.choice : "square" in parsed.data ? { square: parsed.data.square.toUpperCase() } : { said: parsed.data.text });
        sendJson(response, 202, {});
    }
}

/**
 * One of the player's settings changed on the page (D-341): a value, or an item added to or taken off a list, as config takes it, with the player as who
 * changed it; the master hears of it at the head of their next call. A setting of the master's is refused.
 */
async function changeSetting(request: IncomingMessage, response: ServerResponse, served: Served): Promise<void>
{
    const body = await readBody(request);
    const parsed = z.union([
        z.object({ setting: z.string(), value: z.string().trim().min(1).max(mostSaid) }).strict(),
        z.object({ setting: z.string(), add: z.string().trim().min(1).max(mostSaid) }).strict(),
        z.object({ setting: z.string(), remove: z.string().min(1).max(mostSaid) }).strict(),
    ]).safeParse(body);

    if (!parsed.success) {
        sendJson(response, 400, { error: "Send a setting of the player's with its value, { setting, value }, or an item to add to a list or take off it, { setting, add } or { setting, remove }." });
        return;
    }

    try {
        await served.session.ready();
        const change = parsed.data;
        const refused = withFiles(served.session, () => {
            const root = requireCampaign(served.context.folder);
            const before = playerSettingNamed(root, served.context, change.setting);

            if (before === undefined) {
                return (settingNames as string[]).includes(change.setting.trim())
                    ? { status: 403, error: `${change.setting} is the master's to change, in the chat.` }
                    : { status: 400, error: `There is no setting "${change.setting}": the player's are ${playerSettings(root, served.context).map((one) => one.name).join(", ")}.` };
            }

            const input = "value" in change ? { value: change.value } : "add" in change ? { add: [change.add] } : { remove: [change.remove] };
            config.run(config.input.parse({ setting: before.name, ...input }), { ...served.context, actor: "player" });

            if (!served.changed.has(before.name)) {
                served.changed.set(before.name, before);
            }

            return undefined;
        });

        if (refused === undefined) {
            sendJson(response, 202, {});
        } else {
            sendJson(response, refused.status, { error: refused.error });
        }
    } catch (error) {
        sendJson(response, 400, { error: error instanceof Error ? error.message : String(error) });
    }
}

/**
 * What the master hears of the settings the player changed since their last call: each as it is now against how it was, once (D-341); given back for the
 * next call when this one never answers. A campaign that does not read now keeps them for a call when it does.
 */
function settingNews(served: Served): { lines: string[]; restore(): void; }
{
    const changed = [...served.changed];
    const nothing = { lines: [], restore: () => undefined };

    if (changed.length === 0) {
        return nothing;
    }

    try {
        const lines = withFiles(served.session, () => {
            const root = requireCampaign(served.context.folder);
            const now = playerSettings(root, served.context);
            return changed.flatMap(([name, before]) => {
                const after = now.find((setting) => setting.name === name);
                return after === undefined ? [] : playerChangeNews(root, served.context, before, after);
            });
        });
        served.changed.clear();
        return { lines, restore: () => giveBack(served, changed) };
    } catch {
        return nothing;
    }
}

/** Gives back changes the master never heard: first, each as it was before any change since, then those made meanwhile. */
function giveBack(served: Served, taken: [string, PlayerSetting][]): void
{
    const since = [...served.changed].filter(([name]) => !taken.some(([other]) => other === name));
    served.changed.clear();

    for (const [name, before] of [...taken, ...since]) {
        served.changed.set(name, before);
    }
}

/** A request's body as JSON, up to a few kilobytes; undefined when it is more, or no JSON. */
async function readBody(request: IncomingMessage): Promise<unknown>
{
    let text = "";

    for await (const chunk of request) {
        text += String(chunk);

        if (text.length > 4096) {
            return undefined;
        }
    }

    try {
        return JSON.parse(text);
    } catch {
        return undefined;
    }
}

/**
 * Keeps the page's request open, to tell it "changed" whenever a file of the campaign changes; the page reads again, and comes back by itself after a pause.
 * When the last page closes while the master asks and none comes back soon, the question goes to the form or to words (ASK-1).
 */
function listenForChanges(request: IncomingMessage, response: ServerResponse, served: Served): void
{
    response.writeHead(200, { ...securityHeaders, "Content-Type": "text/event-stream; charset=utf-8", "Cache-Control": "no-store" });
    response.write("retry: 2000\n\n");
    served.pages.add(response);
    clearTimeout(served.returning);
    request.on("close", () => {
        served.pages.delete(response);
        const asked = served.asked;

        if (served.pages.size === 0 && asked !== undefined) {
            clearTimeout(served.returning);
            served.returning = setTimeout(() => served.pages.size === 0 && served.asked === asked && asked.settle("absent"), served.pageReturn).unref();
        }
    });
}

/** Runs a command the page may run, with its parameters from the query, as the MCP server runs a tool; its result, or the error, in JSON. */
async function runCommand(name: string, parameters: URLSearchParams, response: ServerResponse, served: Served): Promise<void>
{
    const command = playerCommands.find((candidate) => candidate.name === name);

    if (command === undefined) {
        sendJson(response, 404, { error: `The dashboard has no command ${name}: it has ${playerCommands.map((candidate) => candidate.name).join(", ")}.` });
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
        sendJson(response, 200, await command.run(parsed.data, served.context));
    } catch (error) {
        sendJson(response, 400, { error: error instanceof Error ? error.message : String(error) });
    }
}

/**
 * A picture of the campaign or of its game system, by the name of its file (D-267): only a file an images folder has, looked for by name, never by a path. It
 * runs nothing, even an SVG opened by itself.
 */
function sendImage(name: string, request: IncomingMessage, response: ServerResponse, served: Served): void
{
    const fileName = decoded(name);
    const file = fileName === undefined || /[\\/]/.test(fileName) ? undefined : withFiles(served.session, () => {
        const root = findCampaign(served.context.folder);
        return root === undefined ? undefined : findImage(imageFolders(root, served.context), fileName);
    });
    const type = file === undefined ? undefined : imageTypes[extname(file).toLowerCase()];
    const bytes = file === undefined ? undefined : withFiles(served.session, () => files().bytes(file));

    if (bytes === undefined || type === undefined) {
        send(response, 404, "text/plain; charset=utf-8", `There is no picture ${fileName ?? name}.`);
        return;
    }

    // The page asks for a picture by its name and when it last changed (D-277): a new address when it changes, and the same one comes back as not modified on a reload.
    sendTagged(request, response, bytes, { "Content-Type": type, "Content-Security-Policy": picturePolicy });
}

/** A part of an address as written, without its percent signs; undefined when they do not decode. */
function decoded(part: string): string | undefined
{
    try {
        return decodeURIComponent(part);
    } catch {
        return undefined;
    }
}

const securityHeaders = { "X-Content-Type-Options": "nosniff", "Referrer-Policy": "no-referrer", "Content-Security-Policy": "default-src 'self'" };

function sendJson(response: ServerResponse, status: number, body: unknown): void
{
    send(response, status, "application/json; charset=utf-8", JSON.stringify(body));
}

function send(response: ServerResponse, status: number, type: string, body: string, policy = securityHeaders["Content-Security-Policy"]): void
{
    if (response.headersSent) {
        response.end();
        return;
    }

    response.writeHead(status, { ...securityHeaders, "Content-Security-Policy": policy, "Content-Type": type, "Cache-Control": "no-store" }).end(body);
}
