// The player's dashboard (D-270, D-272): view gives the party and the sheet as data, with the chat's text unchanged; the server gives only what view gives, only
// to its own page, tells the page when a file changes, and serves the pictures.
import { cpSync, readFileSync, writeFileSync } from "node:fs";
import { createServer, type IncomingHttpHeaders, request } from "node:http";
import { join, resolve } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { runCommandLine } from "../src/command-line.ts";
import type { Context } from "../src/core/context.ts";
import { SessionStore, type WatchFolder } from "../src/core/session-store.ts";
import { type Dashboard, startDashboard } from "../src/dashboard-server.ts";
import { inPlay, makeTempFolder, removeFolder, testContext, testSystemFolders } from "./support.ts";

const png = Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13]);

let folder: string;
let context: Context;

beforeEach(async () => {
    folder = makeTempFolder();
    context = testContext(folder);
    await ok("init", "--name", "Guadoscuro", "--language", "it", "--system", "5e", "--difficulty", "normal", "--lethality", "dice");
    inPlay(folder);
    await ok("advance", "--to", "day 1, 18:00");
    await ok("write", "Locanda", "--type", "place");
    await ok(
        "write",
        "Ettore",
        "--type",
        "character",
        ...[
            "role=pc",
            "classes=[[Cleric]] 3",
            "xp=900",
            "str=14",
            "dex=8",
            "con=15",
            "int=10",
            "wis=16",
            "cha=12",
            "hp-base=18",
            "hp=20/24",
            "speed=25 ft.",
            "hit-dice-d8=3/3",
            "save-proficiencies=[wis, cha]",
            "skill-proficiencies=[Insight, Religion]",
            "languages=[Common, Dwarvish]",
        ].flatMap((field) => ["--set", field]),
    );
    await ok("write", "Lupa", "--type", "character", "--set", "role=companion", "--set", "creature=[[Wolf]]");
    await ok("write", "Locanda", "--add", "contains=[[Ettore]]", "--add", "contains=[[Lupa]]");
    await ok("effect", "add", "Ettore", "Benedizione", "--for", "1h");
    await ok("write", "Varro", "--type", "character", "--set", "role=npc", "--text", "Il mugnaio.");
    await ok("write", "Varro#Colpa", "--secret", "--text", "Ha ucciso il fratello.");
    await ok("write", "Ettore", "--add", "knows=[[Varro]]");
    writeFileSync(join(folder, "ritratto.png"), png);
    await ok("image", "Ettore", join(folder, "ritratto.png"));
});

afterEach(() => removeFolder(folder));

async function ok(...args: string[]): Promise<string>
{
    const result = await runCommandLine(args, context);
    expect(result.exitCode, result.output).toBe(0);
    return result.output;
}

describe("view as data (VIEW-1, D-272)", () => {
    it("gives the party with their pictures, places, numbers with their limits and effects, and the chat the same lines", async () => {
        const data = JSON.parse(await ok("view", "--json"));
        expect(data.party[0]).toMatchObject({
            name: "Ettore",
            role: "pc",
            dead: false,
            image: "Ettore.png",
            place: "in Locanda",
            effects: [{ name: "Benedizione", end: "day 1, 19:00", text: "Benedizione until day 1, 19:00" }],
        });
        expect(data.party[0].counters).toContainEqual({ field: "hp", kind: "counter", text: "20/24", counter: { value: 20, max: 24 }, marks: 0 });
        // A companion shows the picture of the creature she derives from (D-267).
        expect(data.party[1]).toMatchObject({ name: "Lupa", role: "companion", image: "wolf-head.svg" });
        expect(await ok("view")).toContain([
            "Ettore, in Locanda: level 3 · xp 900 (1800 to level 4) · hp 20/24 · ac 9 · passive-perception 13 · hit-dice-d8 3/3 · slots-1 4/4 · slots-2 2/2 · channel-divinity 1/1 · Benedizione until day 1, 19:00",
            "Lupa (companion), in Locanda: hp 11/11 · ac 13 · passive-perception 13",
        ].join("\n"));
    });

    it("gives the sheet by the system's groups, each value with its text, marks, what is beside it, a counter's limits and the items of a list", async () => {
        const data = JSON.parse(await ok("view", "Ettore", "--json"));
        const group = (name: string) => data.sheet.find((candidate: { name: string; }) => candidate.name === name);
        expect(group("Abilities").values[0]).toEqual({ field: "str", kind: "number", text: "14", marks: 0, beside: "+2" });
        expect(group("Saving Throws").values).toContainEqual({ field: "wis-save", kind: "modifier", text: "+5", marks: 1 });
        expect(group("Combat").values).toContainEqual({ field: "hit-dice-d8", kind: "counter", text: "3/3", counter: { value: 3, max: 3 }, marks: 0 });
        expect(group("Proficiencies").values).toContainEqual({ field: "languages", kind: "list", text: "Common, Dwarvish", items: ["Common", "Dwarvish"], marks: 0 });
        expect(group("Attacks")).toEqual({
            name: "Attacks",
            values: [],
            items: [{ item: "Unarmed Strike", values: [expect.objectContaining({ field: "attack", text: "+4" }), expect.objectContaining({ field: "damage-roll", text: "3 bludgeoning" })] }],
        });
        expect(await ok("view", "Ettore")).toContain("Attacks: Unarmed Strike +4, 3 bludgeoning");
    });

    it("works the same for another game: momentum from -6, with the maximum the debilities leave", async () => {
        // The test system based on Ironsworn, with a sheet and a line of its own.
        const systems = makeTempFolder();
        cpSync(join(testSystemFolders[1], "ironsworn"), join(systems, "ironsworn"), { recursive: true });
        const settings = join(systems, "ironsworn", "system.yaml");
        writeFileSync(settings, `${readFileSync(settings, "utf8")}\nsheet:\n  Stats: [edge, heart, iron, shadow, wits]\n  Condition: [health, spirit, supply, momentum, debilities?]\nstatus-line: [health, spirit, supply, momentum]\n`);
        const ironsworn = makeTempFolder();
        context = { ...testContext(ironsworn), systemFolders: [testSystemFolders[0], systems] };

        try {
            await ok("init", "--name", "Ferro", "--language", "en", "--system", "ironsworn");
            inPlay(ironsworn);
            await ok("write", "Kira", "--type", "character", "--set", "role=pc", "--set", "edge=2", "--set", "health=5/5", "--set", "momentum=2", "--set", "debilities=[wounded]");
            const data = JSON.parse(await ok("view", "Kira", "--json"));
            const condition = data.sheet.find((group: { name: string; }) => group.name === "Condition");
            expect(condition.values).toContainEqual({ field: "momentum", kind: "counter", text: "2/9", counter: { min: -6, max: 9, value: 2 }, marks: 0 });
            expect(condition.values).toContainEqual({ field: "debilities", kind: "list", text: "wounded", items: ["wounded"], marks: 0 });
            const party = JSON.parse(await ok("view", "--json")).party;
            expect(party[0].counters.map((value: { field: string; }) => value.field)).toEqual(["health", "momentum"]);
        } finally {
            removeFolder(ironsworn);
            removeFolder(systems);
        }
    });
});

describe("the dashboard's server (D-270, D-272)", () => {
    let watchers: { changed: (name: string | undefined) => void; failed: () => void; }[];
    let session: SessionStore;
    let dashboard: Dashboard;
    let port: number;

    const fakeWatcher: WatchFolder = (_folder, changed, failed) => {
        watchers.push({ changed, failed });
        return { close: () => undefined };
    };

    beforeEach(async () => {
        watchers = [];
        session = new SessionStore({ systemFolders: context.systemFolders, watchFolder: fakeWatcher });
        const started = await startDashboard({ ...context, files: session }, session, [0]);

        if (started === undefined) {
            throw new Error("The dashboard did not start.");
        }

        dashboard = started;
        port = Number(new URL(dashboard.url).port);
    });

    afterEach(async () => {
        await dashboard.close();
        session.close();
    });

    function get(path: string, headers: Record<string, string> = {}): Promise<{ status: number; headers: IncomingHttpHeaders; body: string; }>
    {
        return new Promise((done, fail) => {
            request({ host: "127.0.0.1", port, path, headers }, (response) => {
                let body = "";
                response.setEncoding("utf8");
                response.on("data", (chunk: string) => (body += chunk));
                response.on("end", () => done({ status: response.statusCode ?? 0, headers: response.headers, body }));
            }).on("error", fail).end();
        });
    }

    it("gives what view gives, in JSON, and never a secret not discovered, nor another command", async () => {
        const overview = await get("/api/view");
        expect(overview.status).toBe(200);
        expect(overview.headers["content-type"]).toBe("application/json; charset=utf-8");
        expect(JSON.parse(overview.body)).toEqual(JSON.parse(await ok("view", "--json")));
        const varro = await get("/api/view?page=Varro");
        expect(JSON.parse(varro.body)).toMatchObject({ kind: "page", title: "Varro (character)" });
        expect(varro.body).not.toContain("fratello");
        const shown = await get("/api/show?page=Varro");
        expect(shown.status).toBe(404);
        expect(shown.body).not.toContain("fratello");
        expect(JSON.parse(shown.body).error).toBe("The dashboard has no command show: it has view.");
        expect((await get("/api/view?pagina=Varro")).status).toBe(400);
    });

    it("answers only its own page: another site, or a name that leads elsewhere, gets nothing", async () => {
        expect((await get("/api/view", { origin: "http://evil.example" })).status).toBe(403);
        expect((await get("/api/view", { host: `evil.example:${port}` })).status).toBe(403);
        expect((await get("/api/view", { origin: `http://localhost:${port}`, host: `localhost:${port}` })).status).toBe(200);
        expect((await get("/api/view")).headers["content-security-policy"]).toBe("default-src 'self'");
    });

    it("tells the page when a file of the campaign changes, by whoever, once for changes that come together", async () => {
        // The first call finds the campaign, and the session watches it.
        await get("/api/view");
        const received: string[] = [];
        const events = request({ host: "127.0.0.1", port, path: "/events" });
        const connected = new Promise<void>((done) => {
            events.on("response", (response) => {
                response.setEncoding("utf8");
                response.on("data", (chunk: string) => {
                    received.push(chunk);
                    done();
                });
            });
        });
        events.end();
        await connected;
        watchers[0].changed("log.jsonl");
        watchers[0].changed("state.yaml");
        await new Promise((done) => setTimeout(done, 300));
        events.destroy();
        expect(received.join("")).toBe("retry: 2000\n\nevent: changed\ndata: {}\n\n");
    });

    it("serves the pictures of the campaign and of the system by name, which a page asks again for nothing when they did not change", async () => {
        const picture = await get("/images/Ettore.png");
        expect(picture.status).toBe(200);
        expect(picture.headers).toMatchObject({ "content-type": "image/png", "x-content-type-options": "nosniff", "content-security-policy": "default-src 'none'; style-src 'unsafe-inline'; sandbox" });
        expect((await get("/images/Ettore.png", { "if-none-match": picture.headers.etag ?? "" })).status).toBe(304);
        expect((await get("/images/wolf-head.svg")).headers["content-type"]).toBe("image/svg+xml");
        expect((await get("/images/..%2Fcampaign.yaml")).status).toBe(404);
        expect((await get("/images/%E0%A4%A")).status).toBe(404);
    });

    it("takes the next port when one is taken, and status gives the link", async () => {
        const taken = createServer();
        await new Promise<void>((done) => taken.listen(0, "127.0.0.1", done));
        const busy = (taken.address() as { port: number; }).port;
        const next = await startDashboard({ ...context, files: session }, session, [busy, 0]);

        try {
            expect(next?.url).toMatch(/^http:\/\/localhost:\d+$/);
            expect(next?.url).not.toBe(`http://localhost:${busy}`);
        } finally {
            await next?.close();
            taken.close();
        }

        const status = await runCommandLine(["status"], { ...context, dashboard: "http://localhost:4747" });
        expect(status.output).toContain("Dashboard: http://localhost:4747, the player's sheet, live: give the player the link when the session starts.");
    });
});

describe("the session's notices (D-193, D-272)", () => {
    it("calls who listens when a watcher names a change or loses track, and who waits for a campaign once, when a call first finds it", () => {
        const watched: { changed: (name: string | undefined) => void; failed: () => void; }[] = [];
        const session = new SessionStore({ systemFolders: context.systemFolders, watchFolder: (_folder, changed, failed) => (watched.push({ changed, failed }), { close: () => undefined }) });
        let changes = 0;
        let tracked = 0;
        const stop = session.onChange(() => changes++);
        session.onTrack(() => tracked++);
        session.track(folder);
        session.track(resolve(folder));
        expect(tracked).toBe(1);
        watched[0].changed("log.jsonl");
        watched[0].failed();
        expect(changes).toBe(2);
        stop();
        watched[1].changed("Ettore.md");
        expect(changes).toBe(2);
        session.close();
    });
});
