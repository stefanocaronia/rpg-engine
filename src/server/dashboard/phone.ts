// Playing from a phone on the home network (T-317): while the player turns it on from their computer, the dashboard opens a second door of its own on the
// home network, at a port of its own, which lets in only a phone paired by the code its QR code carries. The computer's page stays on 127.0.0.1 alone.
import { randomBytes, timingSafeEqual } from "node:crypto";
import { createSocket } from "node:dgram";
import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import { networkInterfaces } from "node:os";
import qrcode from "qrcode-generator";
import { z } from "zod";
import { readBody, send, sendJson } from "../page/index.ts";
import type { Served } from "./index.ts";

/** The door on the home network while it is open: where it listens, and the code that pairs a phone. */
export interface PhoneDoor
{
    server: Server;
    port: number;
    /** The computer's address on the home network the door listens at, which the QR code gives. */
    address: string;
    code: string;
}

/** What the page shows of the door: whether it is open and, to the computer alone, the address that pairs a phone. */
export interface PhoneNow
{
    /** The page asking is the phone's: it is paired already, and the door is not its to change. */
    phone: boolean;
    open: boolean;
    /** The computer has no address on a home network: a phone cannot reach it. */
    offline?: boolean;
    /** The address that pairs a phone, which the QR code gives. */
    link?: string;
}

/** The door's state as the page asking it may see it. */
export function phoneNow(request: IncomingMessage, served: Served): PhoneNow
{
    const door = served.phone;

    if (fromPhone(request, served)) {
        return { phone: true, open: true };
    }

    if (door === undefined) {
        return { phone: false, open: false, ...(served.homeAddresses().length === 0 ? { offline: true } : {}) };
    }

    return { phone: false, open: true, link: pairingLink(door) };
}

/** Opens or closes the door, as the computer's page asks: never the phone's, which cannot open what lets it in, nor see its code. */
export async function changePhone(request: IncomingMessage, response: ServerResponse, served: Served, admit: Admit): Promise<void>
{
    if (fromPhone(request, served)) {
        sendJson(response, 403, { error: "Only the computer's own page opens or closes the door to the phone." });
        return;
    }

    const parsed = z.object({ open: z.boolean() }).strict().safeParse(await readBody(request));

    if (!parsed.success) {
        sendJson(response, 400, { error: "Send whether the door to the phone is open: { open: true } or { open: false }." });
        return;
    }

    if (parsed.data.open && served.phone === undefined) {
        const opened = await openDoor(served.homeAddresses(), admit);

        if ("refused" in opened) {
            sendJson(response, 409, opened.refused);
            return;
        }

        served.phone = opened;
    } else if (!parsed.data.open && served.phone !== undefined) {
        const door = served.phone;
        served.phone = undefined;
        await closeDoor(door);
    }

    sendJson(response, 200, phoneNow(request, served));
}

/** The QR code of the address that pairs a phone, as an SVG picture, to the computer's page alone. */
export function sendPhoneCode(request: IncomingMessage, response: ServerResponse, served: Served): void
{
    const door = served.phone;

    if (door === undefined || fromPhone(request, served)) {
        send(response, 404, "text/plain; charset=utf-8", "The door to the phone is closed.");
        return;
    }

    const code = qrcode(0, "M");
    code.addData(pairingLink(door));
    code.make();
    send(response, 200, "image/svg+xml", code.createSvgTag({ cellSize: 4, margin: 2, scalable: true }));
}

/** Closes the door, as the dashboard stops. */
export async function closeDoor(door: PhoneDoor): Promise<void>
{
    const closed = new Promise<void>((done) => door.server.close(() => done()));
    // The phone's page keeps a connection open for the news: closed too, or the door would wait for it.
    door.server.closeAllConnections();
    await closed;
}

/** Whether a request came through the door to the phone: the port it reached is the door's. */
export function fromPhone(request: IncomingMessage, served: Served): boolean
{
    return served.phone !== undefined && request.socket.localPort === served.phone.port;
}

/** What answers a request let in, with the dashboard's own routes and page. */
export type Admit = (request: IncomingMessage, response: ServerResponse) => Promise<void>;

/** The computer's IPv4 addresses on a private network (192.168/16, 10/8, 172.16/12), where a phone on the same Wi-Fi reaches it. */
export function homeAddresses(): string[]
{
    return Object.values(networkInterfaces()).flatMap((faces) => faces ?? []).filter((face) => face.family === "IPv4" && !face.internal && isPrivate(face.address)).map((face) => face.address);
}

/** The address that pairs a phone: the door's, with the code. */
function pairingLink(door: PhoneDoor): string
{
    return `http://${door.address}:${door.port}/pair?code=${door.code}`;
}

/**
 * Opens the door at one home address alone, the one the computer reaches the network by where it is among them (not a virtual switch's, as WSL's), at a
 * port the system gives, with a new code; or why it could not.
 */
async function openDoor(addresses: string[], admit: Admit): Promise<PhoneDoor | { refused: { error: string; code: string; }; }>
{
    if (addresses.length === 0) {
        return { refused: { error: "This computer has no address on a home network: connect it to the same Wi-Fi as the phone, then try again.", code: "offline" } };
    }

    const routed = await routeAddress();
    const address = routed !== undefined && addresses.includes(routed) ? routed : addresses[0];
    const server = createServer();
    const listened = await new Promise<number | string>((done) => {
        server.once("error", (error: NodeJS.ErrnoException) => done(error.code ?? error.message));
        server.listen(0, address, () => {
            const bound = server.address();
            done(typeof bound === "object" && bound !== null ? bound.port : "no port");
        });
    });

    if (typeof listened === "string") {
        return { refused: { error: `The door to the phone could not open at ${address} (${listened}): check the computer's network, then try again.`, code: "listen" } };
    }

    const port = listened;
    const door: PhoneDoor = { server, port, address, code: randomBytes(24).toString("base64url") };
    server.on("request", (request: IncomingMessage, response: ServerResponse) => {
        answerAtDoor(request, response, door, admit).catch((error: unknown) => {
            send(response, 500, "text/plain; charset=utf-8", error instanceof Error ? error.message : String(error));
        });
    });
    // As the dashboard's own server, the door never keeps the process alive.
    server.unref();
    server.on("connection", (socket) => socket.unref());
    return door;
}

/**
 * The door's gate: the pairing address with its code gives the phone its cookie and sends it to the page; anything else needs that cookie, at the door's own
 * address, and, as on the computer, comes from the page itself: another site may open the page, never read the API.
 */
async function answerAtDoor(request: IncomingMessage, response: ServerResponse, door: PhoneDoor, admit: Admit): Promise<void>
{
    const host = `${door.address}:${door.port}`;
    const url = URL.parse(request.url ?? "/", `http://${host}`);

    if (request.headers.host !== host || url === null) {
        send(response, 403, "text/plain; charset=utf-8", "This door answers only at the address of its QR code.");
        return;
    }

    if (url.pathname === "/pair" && sameCode(url.searchParams.get("code") ?? "", door.code)) {
        response.writeHead(303, { "Location": "/", "Set-Cookie": `${cookieName(door)}=${door.code}; HttpOnly; SameSite=Lax; Path=/`, "Cache-Control": "no-store" });
        response.end();
        return;
    }

    const origin = request.headers.origin;
    const site = request.headers["sec-fetch-site"];
    const visit = request.headers["sec-fetch-mode"] === "navigate" && request.headers["sec-fetch-dest"] === "document" && url.pathname === "/";
    const foreign = !visit && (site === "cross-site" || site === "same-site");

    if (!cookiesOf(request, cookieName(door)).some((given) => sameCode(given, door.code)) || (origin !== undefined && origin !== `http://${host}`) || foreign) {
        send(response, 403, "text/plain; charset=utf-8", "This phone is not paired: scan the QR code in the game's Settings on the computer.");
        return;
    }

    await admit(request, response);
}

/** The pairing cookie's name, the door's port in it: a browser keeps a cookie by its host alone, and another door or service there sets its own. */
function cookieName(door: PhoneDoor): string
{
    return `rpg-phone-${door.port}`;
}

/** Every value of a cookie the request carries by that name, as another service at the same address may set one more. */
function cookiesOf(request: IncomingMessage, name: string): string[]
{
    return (request.headers.cookie ?? "").split(";").map((part) => part.trim().split("=")).filter(([given]) => given === name).map(([, value]) => value ?? "");
}

/** Whether a code is the door's, compared in a time that does not tell how much of it was right. */
function sameCode(given: string, code: string): boolean
{
    const givenBytes = Buffer.from(given);
    const codeBytes = Buffer.from(code);
    return givenBytes.length === codeBytes.length && timingSafeEqual(givenBytes, codeBytes);
}

/** The address this computer reaches the network by: a socket's own once it is pointed outside, which sends nothing; undefined where there is no route. */
async function routeAddress(): Promise<string | undefined>
{
    const socket = createSocket("udp4");

    try {
        return await new Promise<string | undefined>((done) => {
            socket.once("error", () => done(undefined));
            // 192.0.2.1 is a documentation address: a connected datagram socket only picks its route, and sends nothing there.
            socket.connect(9, "192.0.2.1", () => done(socket.address().address));
        });
    } finally {
        socket.close();
    }
}

function isPrivate(address: string): boolean
{
    const [first, second] = address.split(".").map(Number);
    return first === 10 || (first === 192 && second === 168) || (first === 172 && second >= 16 && second <= 31);
}
