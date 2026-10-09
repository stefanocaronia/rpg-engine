// The player's dashboard (D-270, D-272): the MCP server of the chat serves it on localhost. It gives the page what the player may see through the same commands,
// and tells it when a file of the campaign changes, by whoever, so that it reads again: nothing else goes through the notice, so no secret can.
import { createHash } from "node:crypto";
import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import { createRequire } from "node:module";
import { connect } from "node:net";
import { extname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";
import { findCampaign } from "./campaign/index.ts";
import { imageFolders } from "./commands/game-images.ts";
import { view } from "./commands/view.ts";
import type { Context } from "./core/context.ts";
import type { Command } from "./core/registry.ts";
import type { SessionStore } from "./core/session-store.ts";
import { files, isInside, withFiles } from "./core/store.ts";
import { findImage } from "./images/index.ts";

/** The ports the dashboard tries in turn, taking the first that is free: the same link from one chat to the next (D-272). */
export const dashboardPorts = Array.from({ length: 10 }, (_, index) => 4747 + index);

/** A dashboard that is running: its link, and how to stop it. */
export interface Dashboard
{
    url: string;
    close(): Promise<void>;
}

/** Where the dashboard listens, and the page it serves. */
export interface DashboardOptions
{
    /** The ports to try, in turn (D-272). */
    ports?: number[];
    /** The folder of the built page: dist/dashboard. */
    page?: string;
}

// The commands the page may run: what the player may see, never the master's (VIEW-1). Roles will say more (phase 2).
const playerCommands: Command<z.ZodObject, unknown>[] = [view];

// Changes that come together, as a command writing a page and the log, make one notice.
const noticeDelay = 100;

const imageTypes: Record<string, string> = { ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp", ".svg": "image/svg+xml" };
const pageTypes: Record<string, string> = { ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".svg": "image/svg+xml", ".png": "image/png" };

// A picture runs nothing, even an SVG opened by itself.
const picturePolicy = "default-src 'none'; style-src 'unsafe-inline'; sandbox";

// From src/ and from dist/ alike, the built page is in dist/dashboard, one level up.
const builtPage = fileURLToPath(new URL("../dist/dashboard/", import.meta.url));

// The modules the page imports from packages, by the names the import map gives them: a package, and a file in it. three.module.js imports three.core.js
// beside it.
const vendorModules: Record<string, [string, string]> = {
    "preact.js": ["preact", "dist/preact.module.js"],
    "hooks.js": ["preact", "hooks/dist/hooks.module.js"],
    "jsx-runtime.js": ["preact", "jsx-runtime/dist/jsxRuntime.module.js"],
    "three.module.js": ["three", "build/three.module.js"],
    "three.core.js": ["three", "build/three.core.js"],
    "cannon-es.js": ["cannon-es", "dist/cannon-es.js"],
};
const importMap = JSON.stringify({
    imports: { "preact": "/vendor/preact.js", "preact/hooks": "/vendor/hooks.js", "preact/jsx-runtime": "/vendor/jsx-runtime.js", "three": "/vendor/three.module.js", "cannon-es": "/vendor/cannon-es.js" },
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
            return serve(server, { port: listening, context, session, page: options.page ?? builtPage, pages: new Set() });
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
}

function serve(server: Server, served: Served): Dashboard
{
    let notice: NodeJS.Timeout | undefined;
    const stopListening = served.session.onChange(() => {
        notice ??= setTimeout(() => {
            notice = undefined;
            served.pages.forEach((page) => page.write("event: changed\ndata: {}\n\n"));
        }, noticeDelay).unref();
    });

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
        close: () =>
            new Promise((done) => {
                stopListening();
                clearTimeout(notice);
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

    if (request.method !== "GET" && request.method !== "HEAD") {
        send(response, 405, "text/plain; charset=utf-8", "The dashboard only gives what the player may see: it takes GET.");
        return;
    }

    const url = new URL(request.url ?? "/", own[0]);
    const path = url.pathname;

    if (path === "/") {
        send(response, 200, "text/html; charset=utf-8", pageHtml, pagePolicy);
    } else if (path === "/favicon.ico") {
        // Browsers ask for it by themselves; the page's icon comes with its logo.
        response.writeHead(204, securityHeaders).end();
    } else if (path === "/events") {
        listenForChanges(request, response, served.pages);
    } else if (path.startsWith("/api/")) {
        await runCommand(path.slice("/api/".length), url.searchParams, response, served);
    } else if (path.startsWith("/images/")) {
        sendImage(path.slice("/images/".length), request, response, served);
    } else if (path.startsWith("/vendor/")) {
        sendFile(vendorModule(path.slice("/vendor/".length)), path, response, served);
    } else {
        sendFile(pageFile(served.page, path), path, response, served);
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
function sendFile(file: string | undefined, path: string, response: ServerResponse, served: Served): void
{
    const type = file === undefined ? undefined : pageTypes[extname(file)];
    const bytes = file === undefined ? undefined : withFiles(served.session, () => files().bytes(file));

    if (bytes === undefined || type === undefined) {
        send(response, 404, "text/plain; charset=utf-8", `Nothing at ${path}.`);
        return;
    }

    const policy = type.startsWith("image/") ? picturePolicy : securityHeaders["Content-Security-Policy"];
    response.writeHead(200, { ...securityHeaders, "Content-Security-Policy": policy, "Content-Type": type, "Cache-Control": "no-cache" }).end(bytes);
}

/** Keeps the page's request open, to tell it "changed" whenever a file of the campaign changes; the page reads again, and comes back by itself after a pause. */
function listenForChanges(request: IncomingMessage, response: ServerResponse, pages: Set<ServerResponse>): void
{
    response.writeHead(200, { ...securityHeaders, "Content-Type": "text/event-stream; charset=utf-8", "Cache-Control": "no-store" });
    response.write("retry: 2000\n\n");
    pages.add(response);
    request.on("close", () => pages.delete(response));
}

/** Runs a command the page may run, with its parameters from the query, as the MCP server runs a tool; its result, or the error, in JSON. */
async function runCommand(name: string, parameters: URLSearchParams, response: ServerResponse, served: Served): Promise<void>
{
    const command = playerCommands.find((candidate) => candidate.name === name);

    if (command === undefined) {
        sendJson(response, 404, { error: `The dashboard has no command ${name}: it has ${playerCommands.map((candidate) => candidate.name).join(", ")}.` });
        return;
    }

    const parsed = command.input.strict().safeParse(Object.fromEntries(parameters));

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
    const tag = `"${createHash("sha1").update(bytes).digest("base64url")}"`;
    const headers = { "Content-Type": type, "Cache-Control": "no-cache", ETag: tag, "Content-Security-Policy": picturePolicy };

    if (request.headers["if-none-match"] === tag) {
        response.writeHead(304, { ...securityHeaders, ...headers }).end();
        return;
    }

    response.writeHead(200, { ...securityHeaders, ...headers }).end(request.method === "HEAD" ? undefined : bytes);
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
