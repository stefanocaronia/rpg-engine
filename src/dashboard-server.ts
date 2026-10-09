// The player's dashboard (D-270, D-272): the MCP server of the chat serves it on localhost. It gives the page what the player may see through the same commands,
// and tells it when a file of the campaign changes, by whoever, so that it reads again: nothing else goes through the notice, so no secret can.
import { createHash } from "node:crypto";
import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import { extname } from "node:path";
import { z } from "zod";
import { findCampaign } from "./campaign/index.ts";
import { imageFolders } from "./commands/game-images.ts";
import { view } from "./commands/view.ts";
import type { Context } from "./core/context.ts";
import type { Command } from "./core/registry.ts";
import type { SessionStore } from "./core/session-store.ts";
import { files, withFiles } from "./core/store.ts";
import { findImage } from "./images/index.ts";

/** The ports the dashboard tries in turn, taking the first that is free: the same link from one chat to the next (D-272). */
export const dashboardPorts = Array.from({ length: 10 }, (_, index) => 4747 + index);

/** A dashboard that is running: its link, and how to stop it. */
export interface Dashboard
{
    url: string;
    close(): Promise<void>;
}

// The commands the page may run: what the player may see, never the master's (VIEW-1). Roles will say more (phase 2).
const playerCommands: Command<z.ZodObject, unknown>[] = [view];

// Changes that come together, as a command writing a page and the log, make one notice.
const noticeDelay = 100;

const imageTypes: Record<string, string> = { ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp", ".svg": "image/svg+xml" };

/** Serves the dashboard of the campaign of context.folder, on 127.0.0.1 only, at the first of `ports` that is free; undefined when none is. */
export async function startDashboard(context: Context, session: SessionStore, ports: number[] = dashboardPorts): Promise<Dashboard | undefined>
{
    for (const port of ports) {
        const server = createServer();
        const listening = await listen(server, port);

        if (listening !== undefined) {
            return serve(server, listening, context, session);
        }
    }

    return undefined;
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

function serve(server: Server, port: number, context: Context, session: SessionStore): Dashboard
{
    const pages = new Set<ServerResponse>();
    let notice: NodeJS.Timeout | undefined;
    const stopListening = session.onChange(() => {
        notice ??= setTimeout(() => {
            notice = undefined;
            pages.forEach((page) => page.write("event: changed\ndata: {}\n\n"));
        }, noticeDelay).unref();
    });

    server.on("request", (request: IncomingMessage, response: ServerResponse) => {
        answer(request, response, { port, context, session, pages }).catch((error: unknown) => {
            send(response, 500, "text/plain; charset=utf-8", error instanceof Error ? error.message : String(error));
        });
    });
    // The server never keeps the process alive: it ends with the chat (D-270).
    server.unref();
    return {
        url: `http://localhost:${port}`,
        close: () =>
            new Promise((done) => {
                stopListening();
                clearTimeout(notice);
                pages.forEach((page) => page.end());
                server.close(() => done());
            }),
    };
}

interface Served
{
    port: number;
    context: Context;
    session: SessionStore;
    /** The pages that wait for notices. */
    pages: Set<ServerResponse>;
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

    if (path === "/events") {
        listenForChanges(request, response, served.pages);
    } else if (path.startsWith("/api/")) {
        await runCommand(path.slice("/api/".length), url.searchParams, response, served);
    } else if (path.startsWith("/images/")) {
        sendImage(path.slice("/images/".length), request, response, served);
    } else {
        send(response, 404, "text/plain; charset=utf-8", `Nothing at ${path}.`);
    }
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

    // A picture given again keeps its name: the page asks each time, and the same picture comes back as not modified.
    const tag = `"${createHash("sha1").update(bytes).digest("base64url")}"`;
    const headers = { "Content-Type": type, "Cache-Control": "no-cache", ETag: tag, "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; sandbox" };

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

function send(response: ServerResponse, status: number, type: string, body: string): void
{
    if (response.headersSent) {
        response.end();
        return;
    }

    response.writeHead(status, { ...securityHeaders, "Content-Type": type, "Cache-Control": "no-store" }).end(body);
}
