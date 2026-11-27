// What a campaign's page turns down with words of its own (T-267): each travels with a code and its values, for the page to say in its language.
import { request } from "node:http";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { runCommandLine } from "../src/cli/command-line.ts";
import type { Context } from "../src/core/context.ts";
import { SessionStore } from "../src/core/session-store.ts";
import { type Dashboard, startDashboard } from "../src/server/dashboard/index.ts";
import { inPlay, makeTempFolder, removeFolder, testContext } from "./support.ts";

let folder: string;
let context: Context;
let session: SessionStore | undefined;
let dashboard: Dashboard | undefined;
let port: number;

beforeEach(async () => {
    folder = makeTempFolder();
    context = testContext(folder);
    await ok("init", "--name", "Guadoscuro", "--language", "it", "--system", "fake", "--difficulty", "normal", "--lethality", "dice");
});

afterEach(async () => {
    await dashboard?.close();
    session?.close();
    dashboard = undefined;
    session = undefined;
    removeFolder(folder);
});

async function ok(...args: string[]): Promise<void>
{
    const result = await runCommandLine(args, context);
    expect(result.exitCode, result.output).toBe(0);
}

/** Serves the campaign as it is now, with the home network given if any. */
async function serve(homeAddresses?: () => string[]): Promise<void>
{
    session = new SessionStore({ systemFolders: context.systemFolders, watchFolder: () => ({ close: () => undefined }) });
    dashboard = await startDashboard({ ...context, files: session }, session, { ports: [0], ...(homeAddresses === undefined ? {} : { homeAddresses }) });

    if (dashboard === undefined) {
        throw new Error("The dashboard did not start.");
    }

    port = Number(new URL(dashboard.url).port);
}

/** A POST from the page: the status and the body it answers. */
function post(path: string, body: unknown): Promise<{ status: number; body: unknown; }>
{
    return new Promise((done, fail) => {
        const headers = { origin: `http://127.0.0.1:${port}`, "content-type": "application/json" };
        const sent = request({ host: "127.0.0.1", port, path, method: "POST", headers, agent: false }, (response) => {
            let text = "";
            response.setEncoding("utf8");
            response.on("data", (chunk: string) => (text += chunk));
            response.on("end", () => done({ status: response.statusCode ?? 0, body: JSON.parse(text) }));
        });
        sent.on("error", fail).end(JSON.stringify(body));
    });
}

describe("what the page turns down, with its code and values (T-267)", () => {
    it("a setting of the master's, and one there is not", async () => {
        inPlay(folder);
        await serve();

        expect(await post("/api/config", { setting: "precedents", add: "Avvelenato: svantaggio" })).toEqual({
            status: 403,
            body: { error: "precedents is the master's to change, in the chat.", code: "masters-setting", values: { setting: "precedents" } },
        });
        const none = await post("/api/config", { setting: "nonsense", value: "x" });
        expect(none).toMatchObject({ status: 400, body: { code: "no-setting", values: { setting: "nonsense", settings: expect.stringMatching(/^difficulty, lethality, /) } } });
        expect((none.body as { error: string; values: { settings: string; }; }).error).toBe(`There is no setting "nonsense": the player's are ${(none.body as { values: { settings: string; }; }).values.settings}.`);
    });

    it("the campaign started over without its name", async () => {
        inPlay(folder);
        await serve();

        expect(await post("/api/saves", { action: "reset", campaign: "Guado" })).toEqual({
            status: 400,
            body: { error: "Write the campaign's name, Guadoscuro, to start it over. Nothing changed.", code: "start-over-name", values: { name: "Guadoscuro" } },
        });
    });

    it("a note that did not come whole, and one that is not there", async () => {
        inPlay(folder);
        await serve();

        expect(await post("/api/notes", { title: "", text: "\u0001".repeat(11_000) })).toEqual({
            status: 400,
            body: { error: "The note did not come whole: it may be too long, so shorten it.", code: "note-not-whole" },
        });
        expect(await post("/api/notes", { share: "nessuna" })).toEqual({ status: 400, body: { error: "There is no such note: reload the page.", code: "no-note" } });
    });

    it("a story that did not come whole, with no player character, and with more than one", async () => {
        inPlay(folder);
        await serve();

        expect(await post("/api/story", { text: "x".repeat(64_001) })).toEqual({
            status: 400,
            body: { error: "The story did not come whole: it may be too long, so shorten it.", code: "story-not-whole" },
        });
        expect(await post("/api/story", { text: "Figlia del mugnaio." })).toEqual({
            status: 400,
            body: { error: "There is no player character yet: make it with the master first.", code: "no-character" },
        });

        await dashboard?.close();
        session?.close();
        await ok("write", "Ettore", "--type", "character", "--set", "role=pc");
        await ok("write", "Mira", "--type", "character", "--set", "role=pc");
        await serve();

        expect(await post("/api/story", { text: "Figlia del mugnaio." })).toEqual({
            status: 400,
            body: { error: "Give who, whose story it is: Ettore or Mira.", code: "story-whose", values: { names: "Ettore, Mira" } },
        });
    });

    it("a word of the setup on what is no question of it", async () => {
        await serve();

        const odd = await post("/api/setup", { leave: "the whole game" });
        expect(odd).toMatchObject({ status: 400, body: { code: "no-setup-question", values: { question: "the whole game", questions: expect.stringMatching(/rigor/) } } });
        expect((odd.body as { error: string; }).error).toBe(`the whole game is no question of the setup: leave one of ${(odd.body as { values: { questions: string; }; }).values.questions}.`);
    });

    it("the door to the phone that cannot listen, with the address and why", async () => {
        inPlay(folder);
        await serve(() => ["192.0.2.250"]);

        const refused = await post("/api/phone", { open: true });
        expect(refused).toMatchObject({ status: 409, body: { code: "listen", values: { address: "192.0.2.250", why: expect.stringMatching(/^E[A-Z]+$/) } } });
        const { error, values } = refused.body as { error: string; values: { why: string; }; };
        expect(error).toBe(`The door to the phone could not open at 192.0.2.250 (${values.why}): check the computer's network, then try again.`);
    });
});
