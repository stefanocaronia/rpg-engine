// The door to the player's phone on the home network (T-317): opened from the computer's page alone, it lets in only a phone paired by its code.
import { mkdirSync, writeFileSync } from "node:fs";
import { request } from "node:http";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { runCommandLine } from "../src/cli/command-line.ts";
import type { Context } from "../src/core/context.ts";
import { SessionStore } from "../src/core/session-store.ts";
import { type Dashboard, startDashboard } from "../src/server/dashboard/index.ts";
import { doorPhrases } from "../src/server/dashboard/phone.ts";
import { pageFolder } from "./i18n/phrases.ts";
import { inPlay, makeTempFolder, removeFolder, testContext } from "./support.ts";

let folder: string;
let context: Context;
let session: SessionStore;
let dashboard: Dashboard;
let port: number;
// The home network of the tests: this computer's own address, which the door answers at as it would at 192.168.1.20.
let addresses: string[];

beforeEach(async () => {
    folder = makeTempFolder();
    context = testContext(folder);
    const made = await runCommandLine(["init", "--name", "Guadoscuro", "--language", "it", "--system", "fake", "--difficulty", "normal", "--lethality", "dice"], context);
    expect(made.exitCode, made.output).toBe(0);
    inPlay(folder);
    session = new SessionStore({ systemFolders: context.systemFolders, watchFolder: () => ({ close: () => undefined }) });
    addresses = ["127.0.0.1"];
    // The page's words from its sources, as they are before a build.
    const started = await startDashboard({ ...context, files: session }, session, { ports: [0], page: pageFolder, homeAddresses: () => addresses });

    if (started === undefined) {
        throw new Error("The dashboard did not start.");
    }

    dashboard = started;
    port = Number(new URL(dashboard.url).port);
});

afterEach(async () => {
    await dashboard.close();
    session.close();
    removeFolder(folder);
});

describe("the door to the phone", () => {
    it("is closed at the start, and opens from the computer's page with the link of its QR code", async () => {
        expect(await call(port, "GET", "/api/phone")).toMatchObject({ status: 200, body: { phone: false, open: false } });

        const door = await openDoor();
        expect(door.port).not.toBe(port);
        expect((await call(port, "GET", "/api/phone")).body).toEqual({ phone: false, open: true, link: door.link });

        const code = await call(port, "GET", "/api/phone/code");
        expect(code.status).toBe(200);
        expect(code.type).toBe("image/svg+xml");
        expect(code.text).toContain("<svg");
    });

    it("lets in nothing without the pairing, nor a wrong code", async () => {
        const door = await openDoor();

        for (const path of ["/", "/api/asked", "/api/phone", "/style.css"]) {
            expect((await call(door.port, "GET", path)).status, path).toBe(403);
        }

        const wrong = await call(door.port, "GET", `/pair?code=${"x".repeat(door.code.length)}`);
        expect(wrong.status).toBe(403);
        expect(wrong.cookie).toBeUndefined();
    });

    it("says why it lets nothing in in the campaign's language, as the page behind it would, with no page around the words", async () => {
        const door = await openDoor();
        const unpaired = await call(door.port, "GET", "/");
        expect(unpaired).toMatchObject({ status: 403, type: "text/plain; charset=utf-8", text: "Questo telefono non è abbinato: inquadra il codice QR nelle Impostazioni del gioco, sul computer." });
        expect((await call(door.port, "GET", "/", { host: `evil.example:${door.port}` })).text).toBe("L'accesso dal telefono risponde solo all'indirizzo del suo codice QR.");

        // The language of the campaign now, not the one it had as the door opened; English for one nobody translated, as the page.
        expect((await runCommandLine(["config", "language", "en"], { ...context, files: session })).exitCode).toBe(0);
        expect((await call(door.port, "GET", "/")).text).toBe(doorPhrases.unpaired);
        await runCommandLine(["config", "language", "it-CH"], { ...context, files: session });
        expect((await call(door.port, "GET", "/")).text).toContain("Questo telefono non è abbinato");
        await runCommandLine(["config", "language", "tlh"], { ...context, files: session });
        expect((await call(door.port, "GET", "/", { host: "elsewhere" })).text).toBe(doorPhrases.elsewhere);

        // A campaign.yaml written by hand that says no language, or does not read: English, and still nothing let in.
        const file = join(folder, "campaign.yaml");
        const written = session.text(file) ?? "";
        session.write(file, written.replace(/^language:.*\n/m, ""));
        expect(await call(door.port, "GET", "/")).toMatchObject({ status: 403, text: doorPhrases.unpaired });
        session.write(file, "language: [it\n");
        expect(await call(door.port, "GET", "/api/asked")).toMatchObject({ status: 403, text: doorPhrases.unpaired });
        session.write(file, written);
    });

    it("says it in English where the page's words in the campaign's language do not read, and never what went wrong", async () => {
        const page = makeTempFolder();
        mkdirSync(join(page, "i18n"));
        // A file that holds no phrases at all, as one cut short and written again by hand.
        writeFileSync(join(page, "i18n", "it.json"), "null");
        const other = await startDashboard({ ...context, files: session }, session, { ports: [0], page, homeAddresses: () => addresses });

        try {
            const at = Number(new URL(other?.url ?? "").port);
            const link = new URL(((await call(at, "POST", "/api/phone", { origin: `http://127.0.0.1:${at}` }, { open: true })).body as { link: string; }).link);
            expect(await call(Number(link.port), "GET", "/")).toMatchObject({ status: 403, text: doorPhrases.unpaired });
        } finally {
            await other?.close();
            removeFolder(page);
        }
    });

    it("pairs a phone by its code, which then plays the page but neither closes the door nor reads its code", async () => {
        const door = await openDoor();
        const paired = await call(door.port, "GET", `/pair?code=${door.code}`);
        expect(paired.status).toBe(303);
        expect(paired.location).toBe("/");
        expect(paired.cookie).toBe(`rpg-phone-${door.port}=${door.code}; HttpOnly; SameSite=Lax; Path=/`);

        const cookie = `rpg-phone-${door.port}=${door.code}`;
        expect((await call(door.port, "GET", "/api/asked", { cookie })).status).toBe(200);
        expect((await call(door.port, "GET", "/api/phone", { cookie })).body).toEqual({ phone: true, open: true });
        expect((await call(door.port, "GET", "/api/phone/code", { cookie })).status).toBe(404);
        expect((await call(door.port, "POST", "/api/phone", { cookie, origin: `http://127.0.0.1:${door.port}` }, { open: false })).status).toBe(403);
        expect((await call(port, "GET", "/api/phone")).body).toMatchObject({ open: true });
    });

    it("refuses a paired phone's cookie sent by another site, or at another name", async () => {
        const door = await openDoor();
        const cookie = `rpg-phone-${door.port}=${door.code}`;

        expect((await call(door.port, "GET", "/api/asked", { cookie, "sec-fetch-site": "cross-site" })).status).toBe(403);
        expect((await call(door.port, "POST", "/api/notes", { cookie, origin: "http://evil.example" }, {})).status).toBe(403);
        expect((await call(door.port, "GET", "/api/asked", { cookie, host: `evil.example:${door.port}` })).status).toBe(403);
        // Another site may open the page, as a link does; never read the API.
        expect((await call(door.port, "GET", "/", { cookie, "sec-fetch-site": "cross-site", "sec-fetch-mode": "navigate", "sec-fetch-dest": "document" })).status).not.toBe(403);
    });

    it("refuses the cookie from another service at the same address, and reads past one more it set", async () => {
        const door = await openDoor();
        const cookie = `rpg-phone-${door.port}=${door.code}`;

        expect((await call(door.port, "GET", "/api/asked", { cookie, "sec-fetch-site": "same-site" })).status).toBe(403);
        expect((await call(door.port, "GET", "/api/asked", { cookie: `rpg-phone-${door.port}=junk; ${cookie}` })).status).toBe(200);
        expect((await call(door.port, "GET", "/api/asked", { cookie: `rpg-phone-1=${door.code}` })).status).toBe(403);
    });

    it("keeps the phone away from the campaigns, which open on the computer", async () => {
        const door = await openDoor();
        const cookie = `rpg-phone-${door.port}=${door.code}`;

        expect((await call(door.port, "GET", "/api/home", { cookie })).body).toEqual({ phone: true });
        const refused = await call(door.port, "POST", "/api/home", { cookie, origin: `http://127.0.0.1:${door.port}` }, { start: true });
        expect(refused.status).toBe(403);
        expect(refused.body).toEqual({ error: "The campaigns open on the computer: go back to them there.", code: "home-on-computer" });
    });

    it("says why when it cannot listen at the address", async () => {
        addresses = ["192.0.2.250"];
        expect(await call(port, "POST", "/api/phone", { origin: `http://127.0.0.1:${port}` }, { open: true })).toMatchObject({ status: 409, body: { code: "listen" } });
        expect((await call(port, "GET", "/api/phone")).body).toMatchObject({ open: false });
    });

    it("ends the phone's news as the door closes", async () => {
        const door = await openDoor();
        const news = await listen(door.port, `rpg-phone-${door.port}=${door.code}`, "/events");
        expect(await call(port, "POST", "/api/phone", { origin: `http://127.0.0.1:${port}` }, { open: false })).toMatchObject({ status: 200 });
        await news.ended;
    });

    it("never keeps the game going: it ends with the computer's last window", async () => {
        const door = await openDoor();
        const news = await listen(door.port, `rpg-phone-${door.port}=${door.code}`, "/events?page=phone-1");
        expect(dashboard.pages()).toBe(0);

        await call(port, "POST", "/api/phone", { origin: `http://127.0.0.1:${port}` }, { open: false });
        await news.ended;
    });

    it("closes from the computer's page, and a new door has a new code", async () => {
        const first = await openDoor();
        expect(await call(port, "POST", "/api/phone", { origin: `http://127.0.0.1:${port}` }, { open: false })).toMatchObject({ status: 200, body: { open: false } });
        await expect(call(first.port, "GET", "/")).rejects.toThrow();

        const second = await openDoor();
        expect(second.code).not.toBe(first.code);
    });

    it("says so when the computer is on no home network", async () => {
        addresses = [];
        expect((await call(port, "GET", "/api/phone")).body).toEqual({ phone: false, open: false, offline: true });
        expect(await call(port, "POST", "/api/phone", { origin: `http://127.0.0.1:${port}` }, { open: true })).toMatchObject({ status: 409, body: { code: "offline" } });
    });

    it("closes with the dashboard", async () => {
        const door = await openDoor();
        await dashboard.close();
        await expect(call(door.port, "GET", "/")).rejects.toThrow();
        dashboard = { close: () => Promise.resolve() } as Dashboard;
    });
});

/** Opens the door from the computer's page: its port and code, from the link its QR code gives. */
async function openDoor(): Promise<{ port: number; code: string; link: string; }>
{
    const opened = await call(port, "POST", "/api/phone", { origin: `http://127.0.0.1:${port}` }, { open: true });
    expect(opened.status).toBe(200);
    const link = (opened.body as { link: string; }).link;
    const url = new URL(link);
    return { port: Number(url.port), code: url.searchParams.get("code") ?? "", link };
}

/** The phone's news, open at the door: `ended` settled once the door ends it. */
function listen(at: number, cookie: string, path: string): Promise<{ ended: Promise<void>; }>
{
    return new Promise((opened, fail) => {
        request({ host: "127.0.0.1", port: at, path, headers: { host: `127.0.0.1:${at}`, cookie } }, (response) => {
            expect(response.statusCode).toBe(200);
            response.resume();
            opened({ ended: new Promise((ended) => response.on("close", () => ended())) });
        }).on("error", fail).end();
    });
}

interface Answer
{
    status: number;
    type?: string;
    text: string;
    body: unknown;
    cookie?: string;
    location?: string;
}

/** A request to 127.0.0.1 at `at`, by default at its own name there, as the phone's browser sends it. */
function call(at: number, method: string, path: string, headers: Record<string, string> = {}, body?: unknown): Promise<Answer>
{
    const sent = { host: `127.0.0.1:${at}`, ...(body === undefined ? {} : { "content-type": "application/json" }), ...headers };
    return new Promise((done, fail) => {
        request({ host: "127.0.0.1", port: at, path, method, headers: sent }, (response) => {
            let text = "";
            response.setEncoding("utf8");
            response.on("data", (chunk: string) => (text += chunk));
            response.on("end", () => {
                const type = response.headers["content-type"];
                done({
                    status: response.statusCode ?? 0,
                    text,
                    body: type?.startsWith("application/json") === true ? JSON.parse(text) as unknown : undefined,
                    ...(type === undefined ? {} : { type }),
                    ...(response.headers["set-cookie"] === undefined ? {} : { cookie: response.headers["set-cookie"][0] }),
                    ...(response.headers.location === undefined ? {} : { location: response.headers.location }),
                });
            });
        }).on("error", fail).end(body === undefined ? undefined : JSON.stringify(body));
    });
}
