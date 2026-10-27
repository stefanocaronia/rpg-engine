// rpg-engine itself on the dashboard (D-515 (3)): its version and npm's latest for the Packages page, its update from the page alone, globally with npm as it was
// installed, never for a development link or another install; then how the chat takes it. npm is a fake here.
import { mkdirSync, readFileSync, rmdirSync, symlinkSync, unlinkSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import type { EngineInstall, EngineUpdater } from "../src/core/context.ts";
import { packageApi } from "../src/core/package-declarations.ts";
import { getVersion } from "../src/core/version.ts";
import { npmEngine } from "../src/extensions/index.ts";
import { type TestCampaign, testCampaign } from "../src/testing.ts";
import { makeTempFolder } from "./support.ts";

let campaign: TestCampaign | undefined;

afterEach(async () => {
    await campaign?.close();
    campaign = undefined;
});

/** npm as the engine sees it: its latest, how this one is installed, and the versions it was asked to install, the last of which is then on disk. */
function fakeEngine(latest: string, install: EngineInstall, updated: string[]): EngineUpdater
{
    return {
        latest: () => Promise.resolve({ version: latest }),
        installed: () => Promise.resolve(install),
        onDisk: () => updated.at(-1) ?? getVersion(),
        update: (version) => {
            updated.push(version);
            return Promise.resolve(undefined);
        },
    };
}

describe("the engine on the Packages page", () => {
    it("says its version, npm's latest and how it is installed; updates a global one to the latest, and says how the chat takes it", async () => {
        const updated: string[] = [];
        campaign = await testCampaign({ system: "free" });
        campaign.context = { ...campaign.context, engine: fakeEngine("99.0.0", { how: "global" }, updated), host: () => "claude-code" };
        const dashboard = await campaign.dashboard();
        expect(await dashboard.get("/api/engine")).toEqual({ version: getVersion(), latest: "99.0.0", update: true, install: "global" });
        expect(await dashboard.post("/api/engine", { action: "update" })).toEqual({ status: 202, body: { kind: "engine-updated", version: "99.0.0", restart: "chat" } });
        expect(updated).toEqual(["99.0.0"]);
        // The chat still runs the version it started with: the one on disk is said apart, and is no update to make again.
        expect(await dashboard.get("/api/engine")).toEqual({ version: getVersion(), installed: "99.0.0", latest: "99.0.0", update: false, install: "global" });
        expect((await dashboard.post("/api/engine", { action: "update" })).body).toEqual({ error: "rpg-engine 99.0.0 is installed already: it comes with a new chat." });
        expect((await dashboard.post("/api/engine", { action: "remove" })).status).toBe(400);
    });

    it("gives its version alone where nothing updates it, as in the demo", async () => {
        campaign = await testCampaign({ system: "free" });
        const dashboard = await campaign.dashboard();
        expect(await dashboard.get("/api/engine")).toEqual({ version: getVersion() });
        expect((await dashboard.post("/api/engine", { action: "update" })).status).toBe(400);
    });

    it("never touches a development link nor another install, and has nothing to do at the latest", async () => {
        const updated: string[] = [];
        campaign = await testCampaign({ system: "free" });
        campaign.context = { ...campaign.context, engine: fakeEngine("99.0.0", { how: "link", folder: "F:/dev/rpg-engine" }, updated) };
        let dashboard = await campaign.dashboard();
        expect(await dashboard.get("/api/engine")).toMatchObject({ install: "link", folder: "F:/dev/rpg-engine" });
        expect(await dashboard.post("/api/engine", { action: "update" })).toEqual({
            status: 400,
            body: { error: "rpg-engine here is a link to the folder F:/dev/rpg-engine, made by npm link for its development: update it there, with git pull and npm run build. Nothing changed." },
        });

        campaign.context = { ...campaign.context, engine: fakeEngine(getVersion(), { how: "global" }, updated) };
        dashboard = await campaign.dashboard();
        expect(await dashboard.get("/api/engine")).toMatchObject({ update: false });
        expect((await dashboard.post("/api/engine", { action: "update" })).body).toEqual({ error: `rpg-engine ${getVersion()} is npm's latest: there is nothing to update.` });
        expect(updated).toEqual([]);
    });
});

describe("how this engine is installed, by npm's global folder", () => {
    it("tells the global package from a link to this folder and from an engine elsewhere, and says why an update failed", async () => {
        const global = makeTempFolder();
        const run = (out: string) => () => Promise.resolve({ code: 0, out: `${out}\n`, errors: "" });
        mkdirSync(join(global, "rpg-engine"));
        expect(await npmEngine(join(global, "rpg-engine"), run(global)).installed()).toEqual({ how: "global" });
        const elsewhere = makeTempFolder();
        expect(await npmEngine(elsewhere, run(global)).installed()).toMatchObject({ how: "other" });

        const linked = makeTempFolder();
        symlinkSync(elsewhere, join(linked, "rpg-engine"), "junction");
        expect(await npmEngine(elsewhere, run(linked)).installed()).toMatchObject({ how: "link" });

        // The link alone, never through it: a link elsewhere, a junction of Windows as an empty folder.
        try {
            unlinkSync(join(linked, "rpg-engine"));
        } catch {
            rmdirSync(join(linked, "rpg-engine"));
        }

        const busy = npmEngine(elsewhere, () => Promise.resolve({ code: 1, out: JSON.stringify({ error: { code: "EBUSY", summary: "resource busy" } }), errors: "" }));
        expect(await busy.update("1.2.3")).toBe("a file of rpg-engine is in use by another program: close the other chats with RPG Engine, then update it again");
        expect(await busy.update("1.2.3 && echo")).toBe("1.2.3 && echo is not a version of rpg-engine");
        expect(npmEngine(join(global, "rpg-engine")).onDisk()).toBe("0.0.0");
        expect(npmEngine().onDisk()).toBe(getVersion());
    });
});

describe("the API this engine reads, as npm sees it (D-515 (2))", () => {
    it("is in its package.json, by which the catalog finds the engine a newer package needs", () => {
        const manifest = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8")) as { "rpg-engine"?: unknown; };
        expect(manifest["rpg-engine"]).toEqual({ kind: "engine", api: packageApi });
    });
});
