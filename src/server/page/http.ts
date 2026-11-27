// What every route of a server of the player's pages uses to read a request and to send its answer, and whether a port of this machine is taken.
import { createHash } from "node:crypto";
import { type IncomingMessage, request, type ServerResponse } from "node:http";
import { connect } from "node:net";

export const securityHeaders = { "X-Content-Type-Options": "nosniff", "Referrer-Policy": "no-referrer", "Content-Security-Policy": "default-src 'self'" };

/** A request's body as bytes, up to `most`; undefined when it is more. */
export async function readBytes(request: IncomingMessage, most: number): Promise<Uint8Array | undefined>
{
    const chunks: Buffer[] = [];
    let size = 0;

    for await (const chunk of request) {
        size += (chunk as Buffer).length;

        if (size > most) {
            return undefined;
        }

        chunks.push(chunk as Buffer);
    }

    return Buffer.concat(chunks);
}

/** A request's body as JSON, up to `most` characters; undefined when it is more, or no JSON. */
export async function readBody(request: IncomingMessage, most = 4096): Promise<unknown>
{
    let text = "";
    // Whole characters, never a letter cut in two between the pieces of a long body.
    request.setEncoding("utf8");

    for await (const chunk of request) {
        text += String(chunk);

        if (text.length > most) {
            return undefined;
        }
    }

    try {
        return JSON.parse(text);
    } catch {
        return undefined;
    }
}

export function sendJson(response: ServerResponse, status: number, body: unknown): void
{
    send(response, status, "application/json; charset=utf-8", JSON.stringify(body));
}

export function send(response: ServerResponse, status: number, type: string, body: string, policy = securityHeaders["Content-Security-Policy"]): void
{
    if (response.headersSent) {
        response.end();
        return;
    }

    response.writeHead(status, { ...securityHeaders, "Content-Security-Policy": policy, "Content-Type": type, "Cache-Control": "no-store" }).end(body);
}

/** Bytes with a tag of what they hold, read again at each load: the same bytes come back as not modified, as three.js and the dice after the first load. */
export function sendTagged(request: IncomingMessage, response: ServerResponse, bytes: Uint8Array, headers: Record<string, string>): void
{
    const tag = `"${createHash("sha1").update(bytes).digest("base64url")}"`;
    const all = { ...securityHeaders, ...headers, "Cache-Control": "no-cache", "ETag": tag };

    if (request.headers["if-none-match"] === tag) {
        response.writeHead(304, all).end();
        return;
    }

    response.writeHead(200, all).end(request.method === "HEAD" ? undefined : bytes);
}

/** A part of an address as written, without its percent signs; undefined when they do not decode. */
export function decoded(part: string): string | undefined
{
    try {
        return decodeURIComponent(part);
    } catch {
        return undefined;
    }
}

/**
 * A request to a server of the player's pages, as its own page sends it, a write with the page's origin: its status and body; refused where nothing listens
 * at the address, or it does not read; undefined where it does not answer within `wait` ms.
 */
export function askPage(url: string, method: "GET" | "POST", path: string, body?: unknown, wait = 1000): Promise<{ status: number; body: string; } | "refused" | undefined>
{
    return new Promise((done) => {
        const address = URL.parse(path, url);

        if (address === null) {
            done("refused");
            return;
        }

        const sent = body === undefined ? undefined : JSON.stringify(body);
        const headers: Record<string, string> = sent === undefined ? {} : { "Origin": address.origin, "Content-Type": "application/json" };
        // A connection of its own, closed once answered: one kept open would keep the asked server from closing, as a chat that gives its page.
        const asked = request(address, { method, headers, timeout: wait, agent: false }, (response) => {
            let text = "";
            response.setEncoding("utf8");
            response.on("data", (chunk: string) => (text += chunk));
            response.on("end", () => done({ status: response.statusCode ?? 0, body: text }));
            response.on("error", () => done(undefined));
        });
        asked.on("timeout", () => {
            done(undefined);
            asked.destroy();
        });
        asked.on("error", (error: NodeJS.ErrnoException) => done(error.code === "ECONNREFUSED" ? "refused" : undefined));
        asked.end(sent);
    });
}

/** Whether a program answers at a port of this machine, on 127.0.0.1 or on ::1. */
export async function answers(port: number): Promise<boolean>
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
