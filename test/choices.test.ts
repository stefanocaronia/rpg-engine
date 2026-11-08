// The choices waiting for the player (D-556): the master prepares them in one call, the player answers them on the dashboard when they like, rolling where an
// option rolls, and confirms; the master hears the answers at the head of a later call, and the level's note waits meanwhile.
import { readFileSync, writeFileSync } from "node:fs";
import { request } from "node:http";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { readChoices } from "../src/campaign/index.ts";
import { runCommandLine } from "../src/cli/command-line.ts";
import type { ChatState, Context } from "../src/core/context.ts";
import { readLog } from "../src/core/log.ts";
import { SessionStore } from "../src/core/session-store.ts";
import { type Dashboard, startDashboard } from "../src/server/dashboard/index.ts";
import { inPlay, makeTempFolder, removeFolder, testContext } from "./support.ts";

let folder: string;
let context: Context;

beforeEach(async () => {
    folder = makeTempFolder();
    context = { ...testContext(folder), dashboard: "http://127.0.0.1:5760" };
    await ok("init", "--name", "Guadoscuro", "--language", "it", "--system", "fake");
    inPlay(folder);
    await ok("write", "Ennio", "--type", "character", "--set", "role=pc", "--set", "vocations=[[Warden]] 1", "--set", "renown=0");
    await ok("write", "Re Nero", "--type", "character");
    await ok("write", "Lanterna", "--type", "item", "--text", "Una lanterna cieca, forgiata da [[Re Nero|il sovrano]]. Fa luce solo davanti.");
});

afterEach(() => removeFolder(folder));

async function run(...args: string[]): Promise<{ exitCode: number; output: string; }>
{
    return runCommandLine(args, context);
}

async function ok(...args: string[]): Promise<string>
{
    const result = await run(...args);
    expect(result.exitCode, result.output).toBe(0);
    return result.output;
}

async function prepare(items: unknown[], ...more: string[]): Promise<{ exitCode: number; output: string; }>
{
    return run("choices", "--title", "Livello 2", "--items", JSON.stringify(items), ...more);
}

const level = [
    { question: "Punti ferita", options: ["Tira 1d6", "Prendi la media: 4"] },
    { question: "Oggetto", options: ["[[Lanterna]]", "Una corda", "[[Re Nero|La lanterna del re]] e [[Lanterna]]"] },
    { question: "Talenti", options: ["Forza", "Grazia", "Arguzia"], pick: "0-2" },
];

describe("the choices command", () => {
    it("prepares them in state.yaml, for the only player character, and tells the master to go on with the story", async () => {
        const result = await prepare(level);
        expect(result.exitCode, result.output).toBe(0);
        expect(result.output).toContain("The choices of Ennio, Livello 2, wait on the player's dashboard.");
        expect(result.output).toContain("http://127.0.0.1:5760");
        const [set] = readChoices(folder);
        expect(set).toMatchObject({ who: "Ennio", title: "Livello 2", made: "2026-10-02" });
        expect(set.items.map((item) => item.pick)).toEqual([{ least: 1, most: 1 }, { least: 1, most: 1 }, { least: 0, most: 2 }]);
        expect(readFileSync(join(folder, "state.yaml"), "utf8")).toContain("pick: 0-2");
        expect(await ok("status")).toContain("Waiting on the dashboard since 2026-10-02: Ennio's choices, Livello 2; the player knows: leave them to them.");
    });

    it("refuses what the player could not answer, and prepares nothing", async () => {
        expect((await prepare([{ question: "Oggetto", options: ["Una corda"] }])).output).toContain("Una corda: that is no choice; write it yourself and tell the player");
        expect((await prepare([{ question: "Oggetto", options: ["Corda", "corda"] }])).output).toContain("gives corda twice");
        expect((await prepare([{ question: "Talenti", options: ["Forza", "Grazia"], pick: 3 }])).output).toContain("pick 3 does not fit 2 options");
        expect((await prepare([{ question: "Punti ferita", options: ["Tira 1d6", "Prendi 4"], pick: "0-1" }])).output).toContain("such an item picks one");
        expect((await prepare([{ question: "Oggetto", options: ["[[Lanternina]]", "Corda"] }])).output).toContain("[[Lanternina]] is no page of the campaign");
        expect((await prepare([{ question: "Punti ferita", options: ["Tira 1d6+might", "Prendi 4"] }])).output).toContain('Punti ferita: Tira 1d6+might: Cannot read "might"');
        expect((await run("choices", "--title", "Livello 2", "--items", JSON.stringify(level), "--who", "Rasco")).output).toContain("Rasco is no one of the party");
        expect(readChoices(folder)).toEqual([]);
    });

    it("needs the player's dashboard: without it the master asks in the chat", async () => {
        context = testContext(folder);
        expect((await prepare(level)).output).toContain("The player has no dashboard here: ask each choice in the chat");
    });

    it("takes the place of a set of the same title, keeping the answers of the items that stay; cancel takes it away", async () => {
        await prepare(level);
        const [set] = readChoices(folder);
        const state = join(folder, "state.yaml");
        const text = readFileSync(state, "utf8");
        // The player answered the object and the talents.
        const answered = text.replace("      - question: Oggetto", "      - question: Oggetto\n        answer: [Una corda]").replace("        pick: 0-2", "        pick: 0-2\n        answer: [Forza]");
        writeFileSync(state, answered);
        const replaced = await prepare([level[0], level[1], { ...level[2], options: ["Forza", "Grazia"] }]);
        expect(replaced.output).toContain("keeping 1 of the player's answers");
        expect(readChoices(folder)[0]).toMatchObject({ items: [{}, { answer: ["Una corda"] }, {}] });
        expect(readChoices(folder)[0].id).not.toBe(set.id);
        expect(readChoices(folder)[0].items[2].answer).toBeUndefined();
        expect(await ok("choices", "--title", "livello 2", "--cancel")).toContain("are taken away from the dashboard");
        expect(readChoices(folder)).toEqual([]);
    });

    it("follows the character renamed, and tells the master to take away the choices of one dead", async () => {
        await prepare(level);
        await ok("rename", "Ennio", "Ettore");
        expect(readChoices(folder)[0].who).toBe("Ettore");
        await ok("write", "Ettore", "--set", "status=dead");
        expect(await ok("status")).toContain("Ettore's choices, Livello 2; Ettore is dead: take them away with choices, cancel true.");
    });

    it("in a game without levels, tells the master to take the confirmed choices away once written", async () => {
        const confirm = (): void => {
            const state = join(folder, "state.yaml");
            writeFileSync(state, readFileSync(state, "utf8").replace("    who: Ennio", "    who: Ennio\n    confirmed: 2026-10-02"));
        };

        await prepare(level);
        confirm();
        expect(await ok("status")).not.toContain("take them away");
        removeFolder(folder);
        folder = makeTempFolder();
        context = { ...testContext(folder), dashboard: "http://127.0.0.1:5760" };
        await ok("init", "--name", "Libero", "--language", "it", "--system", "free");
        inPlay(folder);
        await ok("write", "Ennio", "--type", "character", "--set", "role=pc");
        await prepare([{ question: "Ricompensa", options: ["Una spada", "Un cavallo"] }]);
        confirm();
        expect(await ok("status")).toContain("Write them on the sheet as the rules say, then tell it in the story; an answer against the rules, ask the player about it. Once written, take them away with choices, cancel true.");
    });

    it("lets the player read the pages its options name while they wait, never a character agent, and nothing else of the view (VIEW-2)", async () => {
        const kind = async (...args: string[]) => (JSON.parse(await ok("view", ...args, "--json")) as { kind: string; }).kind;
        expect(await kind("Lanterna")).toBe("unknown");
        await prepare(level);
        expect(await kind("Lanterna")).toBe("page");
        expect(await kind("--world")).toBe("world");
        expect(JSON.stringify(JSON.parse(await ok("view", "--world", "--json")))).not.toContain("Lanterna");
        await ok("write", "Bruna", "--type", "character", "--set", "role=companion");
        expect(await kind("Lanterna", "--as", "Bruna")).toBe("unknown");
        await ok("choices", "--title", "Livello 2", "--cancel");
        expect(await kind("Lanterna")).toBe("unknown");
    });
});

describe("the level's note (D-556)", () => {
    it("says one level at a time, prepared with choices where the player has a dashboard, and waits while they do", async () => {
        await ok("config", "harshness", "gentle");
        const reached = await ok("change", "Ennio", "renown", "--by", "40");
        expect(reached).toContain('Ennio has the renown for level 2, then up to level 3, one level at a time: read rules "Rising", then prepare with choices');
        await prepare(level);
        expect(await ok("status")).not.toContain("has the renown");
        expect(await ok("change", "Ennio", "renown", "--by", "1")).not.toContain("has the renown");
    });
});

describe("the choices on the dashboard", () => {
    let session: SessionStore;
    let dashboard: Dashboard;
    let port: number;
    let chat: ChatState;

    beforeEach(async () => {
        await prepare(level);
        session = new SessionStore({ systemFolders: context.systemFolders, watchFolder: () => ({ close: () => undefined }) });
        chat = { calls: 0 };
        const started = await startDashboard({ ...context, files: session, chat }, session, { ports: [0], page: folder });

        if (started === undefined) {
            throw new Error("The dashboard did not start.");
        }

        dashboard = started;
        port = Number(new URL(dashboard.url).port);
        // The commands write through the dashboard's files, as in the MCP server.
        context = { ...context, files: session };
    });

    afterEach(async () => {
        await dashboard.close();
        session.close();
    });

    function send(method: string, body?: unknown): Promise<{ status: number; body: Record<string, unknown>; }>
    {
        const headers = body === undefined ? {} : { "origin": `http://127.0.0.1:${port}`, "content-type": "application/json" };
        return new Promise((done, fail) => {
            const sent = request({ host: "127.0.0.1", port, path: "/api/choices", method, headers }, (response) => {
                let text = "";
                response.setEncoding("utf8");
                response.on("data", (chunk: string) => (text += chunk));
                response.on("end", () => done({ status: response.statusCode ?? 0, body: JSON.parse(text) as Record<string, unknown> }));
            });
            sent.on("error", fail).end(body === undefined ? undefined : JSON.stringify(body));
        });
    }

    it("shows each option's words, dice and page, takes the player's answers and rolls, and confirms only once all is answered", async () => {
        const shown = await send("GET");
        const sets = shown.body.sets as { id: string; items: { options: unknown[]; }[]; }[];
        const id = sets[0].id;
        expect(sets[0].items[0].options).toEqual([{ text: "Tira 1d6", label: "Tira", notation: "1d6" }, { text: "Prendi la media: 4", label: "Prendi la media: 4" }]);
        const lantern = { name: "Lanterna", title: "Lanterna", opening: "Una lanterna cieca, forgiata da il sovrano." };
        // The opening as the character may read it: a link to a page it does not know as its words (VIEW-3).
        expect(sets[0].items[1].options[0]).toEqual({ text: "[[Lanterna]]", label: "Lanterna", pages: [lantern] });
        // Every page an option names, in its order, each once.
        expect(sets[0].items[1].options[2]).toMatchObject({ label: "La lanterna del re e Lanterna", pages: [{ name: "Re Nero", title: "Re Nero", opening: "" }, lantern] });
        expect(shown.body.physical).toBe(false);

        expect((await send("POST", { id, item: 0, answer: ["Tira 1d6"] })).status).toBe(409);
        expect((await send("POST", { id, item: 0, roll: "Tira 1d6" })).status).toBe(200);
        expect(readLog(folder).at(-1)).toMatchObject({ type: "roll", by: "player", data: { check: "Punti ferita", who: "Ennio", result: "1d6 = 4 [4]" } });
        expect((await send("POST", { id, item: 0, answer: ["Prendi la media: 4"] })).body.error).toBe("A roll made stays: this choice is answered.");
        expect((await send("POST", { id, item: 2, answer: ["Forza", "Grazia", "Arguzia"] })).body.error).toBe("This choice takes at most 2.");
        expect((await send("POST", { id, confirm: true, said: "Ho confermato le mie scelte: Livello 2." })).body.error).toBe("Oggetto still waits for an answer.");
        expect((await send("POST", { id, item: 1, answer: ["Una corda"] })).status).toBe(200);
        expect((await send("POST", { id, confirm: true, said: "Ho confermato le mie scelte: Livello 2." })).status).toBe(200);
        expect(readChoices(folder)[0]).toMatchObject({ confirmed: "2026-10-02", items: [{ answer: ["Tira 1d6"], rolled: "1d6 = 4 [4]" }, { answer: ["Una corda"] }, {}] });
        expect(readLog(folder).at(-1)).toMatchObject({ type: "choices-confirmed", by: "player", data: { who: "Ennio", title: "Livello 2" } });

        // The master hears the answers once in a chat, at the head of a call; they stay in state.yaml, for a chat that closes before the master writes them.
        const told = new Set<string>();
        const note = "Ennio's choices for Livello 2, confirmed on the dashboard: Punti ferita: Tira 1d6 (1d6 = 4 [4]); Oggetto: Una corda; Talenti: none.";
        const lines = dashboard.news?.(told).lines.join("\n") ?? "";
        expect(lines).toContain("> Ho confermato le mie scelte: Livello 2.");
        expect(lines).toContain(note);
        expect(dashboard.news?.(told).lines.join("\n")).not.toContain(note);
        expect(readChoices(folder)).toHaveLength(1);
        expect(dashboard.news?.(new Set()).lines.join("\n")).toContain(note);
        // On the command line, where no chat keeps what it was told, status says them; the level waits for them, and leaves them once it rises.
        expect(await ok("status")).toContain(note);
        await ok("config", "harshness", "gentle");
        await ok("change", "Ennio", "renown", "--by", "40");
        expect(await ok("status")).not.toContain("has the renown");
        expect(await ok("write", "Ennio", "--set", "vocations=[[Warden]] 2")).toContain("Ennio has the renown for level 3: ");
        expect(readChoices(folder)).toEqual([]);
    });

    it("takes a new id when the master prepares a confirmed set again, which the player confirms again and the master hears again", async () => {
        const id = ((await send("GET")).body.sets as { id: string; }[])[0].id;
        await send("POST", { id, item: 0, roll: "Tira 1d6" });
        await send("POST", { id, item: 1, answer: ["Una corda"] });
        await send("POST", { id, confirm: true, said: "Fatto." });
        const told = new Set<string>();
        expect(dashboard.news?.(told).lines.join("\n")).toContain("Oggetto: Una corda");
        expect((await prepare(level)).output).toContain("keeping 2 of the player's answers; the player had confirmed it, and it waits for them again.");
        const again = ((await send("GET")).body.sets as { id: string; confirmed?: string; }[])[0];
        expect(again.id).not.toBe(id);
        expect(again.confirmed).toBeUndefined();
        expect((await send("POST", { id, confirm: true, said: "Fatto." })).status).toBe(409);
        await send("POST", { id: again.id, item: 1, answer: ["[[Lanterna]]"] });
        await send("POST", { id: again.id, confirm: true, said: "Ho cambiato idea." });
        expect(dashboard.news?.(told).lines.join("\n")).toContain("Oggetto: [[Lanterna]]");
    });
});
