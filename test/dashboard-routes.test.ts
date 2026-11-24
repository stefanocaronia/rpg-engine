// The dashboard's gate on every route of its API: another site, another host's name, a write without the page's origin and any other method are refused before
// the route runs, and the campaign stays as it was.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { request } from "node:http";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { runCommandLine } from "../src/cli/command-line.ts";
import type { Context } from "../src/core/context.ts";
import { SessionStore } from "../src/core/session-store.ts";
import { type Dashboard, pageRoutes, startDashboard } from "../src/server/dashboard/index.ts";
import { inPlay, makeTempFolder, removeFolder, testContext } from "./support.ts";

let folder: string;
let context: Context;
let session: SessionStore;
let dashboard: Dashboard;
let port: number;

beforeEach(async () => {
    folder = makeTempFolder();
    context = testContext(folder);
    const made = await runCommandLine(["init", "--name", "Guadoscuro", "--language", "it", "--system", "fake", "--difficulty", "normal", "--lethality", "dice"], context);
    expect(made.exitCode, made.output).toBe(0);
    inPlay(folder);
    session = new SessionStore({ systemFolders: context.systemFolders, watchFolder: () => ({ close: () => undefined }) });
    const started = await startDashboard({ ...context, files: session }, session, { ports: [0] });

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

describe("the dashboard's routes", () => {
    it("has the routes of the page's API, with what each takes", () => {
        expect(pageRoutes.map((route) => route.path)).toEqual(expect.arrayContaining(["/api/run", "/api/asked", "/api/bell", "/api/words"]));
        expect(pageRoutes.find((route) => route.path === "/api/notes")).toEqual({ path: "/api/notes", get: true, post: true });
        expect(pageRoutes.find((route) => route.path === "/api/run")).toEqual({ path: "/api/run", get: false, post: true });
    });

    it("refuses a write without the page's origin, or from another site, on every route that takes one", async () => {
        const before = campaignFiles();

        for (const route of pageRoutes.filter((one) => one.post)) {
            expect((await status("POST", route.path)).status, `${route.path} without origin`).toBe(405);
            expect((await status("POST", route.path, { origin: "http://evil.example" })).status, `${route.path} from another site`).toBe(403);
        }

        expect(campaignFiles()).toEqual(before);
    }, 30_000);

    it("refuses another host's name, and any other method, on every route", async () => {
        const before = campaignFiles();

        for (const route of pageRoutes) {
            expect((await status("GET", route.path, { host: "evil.example" })).status, `${route.path} at another host`).toBe(403);
            expect((await status("PUT", route.path, { origin: `http://127.0.0.1:${port}` })).status, `${route.path} put`).toBe(405);
        }

        expect(campaignFiles()).toEqual(before);
    }, 30_000);
});

/** The status of a request with an empty body. */
function status(method: string, path: string, headers: Record<string, string> = {}): Promise<{ status: number; }>
{
    return new Promise((done, fail) => {
        request({ host: "127.0.0.1", port, path, method, headers }, (response) => {
            response.resume();
            response.on("end", () => done({ status: response.statusCode ?? 0 }));
        }).on("error", fail).end();
    });
}

/** Every file of the campaign, with its text and when it last changed. */
function campaignFiles(): Record<string, string>
{
    const paths = (readdirSync(folder, { recursive: true }) as string[]).filter((path) => statSync(join(folder, path)).isFile());
    return Object.fromEntries(paths.map((path) => [path, `${statSync(join(folder, path)).mtimeMs} ${readFileSync(join(folder, path), "utf8")}`]));
}
