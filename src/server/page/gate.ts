// The gate of a server of the player's pages on this computer, the dashboard's and the launcher's: only its own page, at its own address, gets in, and only
// that page writes; no other site may read what the player sees, nor a name that leads elsewhere.
import type { IncomingMessage } from "node:http";

/** Whether a request comes from the server's own page, at its own address on `port`. */
export function fromOwnPage(request: IncomingMessage, path: string, port: number): boolean
{
    const own = [`http://localhost:${port}`, `http://127.0.0.1:${port}`];
    const origin = request.headers.origin;
    // A request another site makes the browser send, as an image's, which carries no origin, says so in Sec-Fetch-Site: never ours, nor the hook's, which sends none.
    // Another program's page on this computer, at another port, is the same site: it may only open the page itself, as a link does, never the API, the bell or a frame.
    const site = request.headers["sec-fetch-site"];
    const visit = request.headers["sec-fetch-mode"] === "navigate" && request.headers["sec-fetch-dest"] === "document" && path === "/";
    const foreign = site === "cross-site" || (site === "same-site" && !visit);
    return own.includes(`http://${request.headers.host ?? ""}`) && (origin === undefined || own.includes(origin)) && !foreign;
}

/** Whether a request is a write of the page itself: a POST that says its origin, which the gate has checked as the server's own. */
export function pageWrites(request: IncomingMessage): boolean
{
    return request.method === "POST" && request.headers.origin !== undefined;
}

/** What the gate answers to whoever it refuses: the address of the server's own page, as every link gives it. */
export function refusedAt(server: string, port: number): string
{
    return `${server} answers only its own page, at http://127.0.0.1:${port}.`;
}
