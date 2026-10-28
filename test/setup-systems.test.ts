// The setup with the engine's free alone (D-513 (1), D-514 (3)): status names the game systems this computer can install, from npm, ours first, or ours from the
// engine's list when npm does not answer; package install takes one of ours by its name alone, without a yes; validate's fix for a campaign whose system is
// one of ours not installed, which the game's server installs by itself (SYS-10).
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { ToolListChangedNotificationSchema } from "@modelcontextprotocol/sdk/types.js";
import { cpSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { beforeEach, describe, expect, it } from "vitest";
import { runCommandLine } from "../src/cli/command-line.ts";
import type { Context, PackageInfo, PackageManager } from "../src/core/context.ts";
import { SessionStore } from "../src/core/session-store.ts";
import { createMcpServer } from "../src/server/mcp.ts";
import { makeTempFolder, testContext } from "./support.ts";

const engineSystems = fileURLToPath(new URL("../systems/", import.meta.url));
let folder: string;
let context: Context;
let modules: string;

/** npm answering its search with these packages, installing them from these folders, and saying who asked it what. */
function fakeNpm(found: (PackageInfo & { folder?: string; })[] | { failed: string; }, asked: string[] = []): PackageManager
{
    const known = "failed" in found ? [] : found;
    return {
        describe: (spec) => {
            asked.push(`describe ${spec}`);
            const one = known.find((candidate) => candidate.name === spec.replace(/(?<=.)@[^@/]*$/, ""));
            return Promise.resolve(one ?? { failed: `npm has no package ${spec}`, missing: true });
        },
        install: (spec) => {
            asked.push(`install ${spec}`);
            const one = known.find((candidate) => candidate.name === spec.replace(/(?<=.)@[^@/]*$/, ""));
            cpSync(one?.folder ?? "", join(modules, ...(one?.name ?? "").split("/")), { recursive: true });
            return Promise.resolve(undefined);
        },
        uninstall: () => Promise.resolve(undefined),
        search: () => Promise.resolve(found),
    };
}

beforeEach(async () => {
    folder = makeTempFolder();
    modules = join(makeTempFolder(), "node_modules");
    mkdirSync(modules, { recursive: true });
    // This computer has the engine's free alone, as the pure engine will (D-513 (1)).
    const shipped = join(makeTempFolder(), "systems");
    cpSync(join(engineSystems, "free"), join(shipped, "free"), { recursive: true });
    context = { ...testContext(folder), systemFolders: [shipped, modules], extensionFolders: [modules] };
    await ok("init", "--name", "Prova", "--language", "en", "--difficulty", "normal", "--lethality", "dice");
});

async function ok(...args: string[]): Promise<string>
{
    const result = await runCommandLine(args, context);
    expect(result.exitCode, result.output).toBe(0);
    return result.output;
}

/** A game system's folder as npm would install it, made for this API. */
function systemPackage(name: string, title: string, api = 5): string
{
    const at = join(makeTempFolder(), name.split("/").at(-1) ?? name);
    mkdirSync(at, { recursive: true });
    writeFileSync(join(at, "package.json"), JSON.stringify({ name, version: "1.0.0", "rpg-engine": { kind: "system", api } }));
    writeFileSync(join(at, "system.yaml"), `title: ${title}\nlanguage: en\n`);
    return at;
}

describe("the systems the setup offers (D-513 (1))", () => {
    it("names those npm has for this engine, ours first, never one made for a newer API nor one already here", async () => {
        context = {
            ...context,
            packages: fakeNpm([
                { name: "@someone/system-pf", version: "2.0.0", kind: "system", api: 5, description: "a game of paths" },
                { name: "@rpgengine/system-5e", version: "1.0.0", kind: "system", api: 5 },
                { name: "@someone/system-later", version: "1.0.0", kind: "system", api: 99 },
                { name: "@rpgengine/weather", version: "0.3.0", kind: "extension", api: 5 },
                { name: "@rpgengine/system-free", version: "1.0.0", kind: "system", api: 5 },
            ]),
        };
        expect(await ok("status")).toContain(
            "\nGame systems to install, if the player wants one: 5e (compatible with fifth edition, from the SRD), @someone/system-pf (a game of paths, not verified). "
                + "Install the one chosen with package install and its name, then set it with config system: the campaign keeps it once it has a player character.\n",
        );
    });

    it("names ours from the engine's list when npm does not answer, and nothing once the campaign has a system", async () => {
        context = { ...context, packages: fakeNpm({ failed: "npm's registry could not be reached" }) };
        expect(await ok("status")).toContain("\nGame systems to install, if the player wants one: 5e (compatible with fifth edition, from the SRD). ");
        // npm's search may not find ours yet: the engine's list is there all the same.
        context = { ...context, packages: fakeNpm([{ name: "@rpgengine/weather", version: "0.3.0", kind: "extension", api: 5 }]) };
        expect(await ok("status")).toContain("\nGame systems to install, if the player wants one: 5e (compatible with fifth edition, from the SRD). ");
        await ok("config", "system", "free");
        expect(await ok("status")).not.toContain("Game systems to install");
    });

    it("installs one of ours by its name alone, without the player's yes, as @rpgengine/system-5e (D-478)", async () => {
        const asked: string[] = [];
        const tiny = systemPackage("@rpgengine/system-5e", "a stand-in for the fifth edition");
        context = { ...context, packages: fakeNpm([{ name: "@rpgengine/system-5e", version: "1.0.0", kind: "system", api: 5, folder: tiny }], asked) };
        expect(await ok("package", "install", "5e")).toBe(
            "Installed the game system 5e 1.0.0, a stand-in for the fifth edition. The campaign has no system yet: if the player chose this one, set it with config, setting system, value 5e.",
        );
        expect(asked).toEqual(["describe @rpgengine/system-5e", "install @rpgengine/system-5e@1.0.0"]);
        // Another of ours by its name alone: an extension's name first, then a system's.
        asked.length = 0;
        expect((await runCommandLine(["package", "install", "marsh"], context)).output).toBe(
            "npm has no package @rpgengine/marsh. Nothing changed: marsh alone means @rpgengine/marsh, one of RPG Engine's; another's is named with its scope, or as npm:marsh without one.",
        );
        expect(asked).toEqual(["describe @rpgengine/marsh", "describe @rpgengine/system-marsh"]);
    });

    it("loads its code at once when the campaign plays it, as config system does (D-513 (1))", async () => {
        const marsh = join(makeTempFolder(), "system-marsh");
        cpSync(fileURLToPath(new URL("./systems/fake/", import.meta.url)), marsh, { recursive: true });
        writeFileSync(join(marsh, "package.json"), JSON.stringify({ name: "@rpgengine/system-marsh", version: "1.0.0", main: "dist/index.js", "rpg-engine": { kind: "system", api: 5 } }));
        writeFileSync(join(folder, "campaign.yaml"), "name: Prova\nlanguage: en\nsystem: marsh\ndifficulty: normal\nlethality: dice\n");
        context = { ...context, systemCode: {}, packages: fakeNpm([{ name: "@rpgengine/system-marsh", version: "1.0.0", kind: "system", api: 5, folder: marsh }]) };
        expect(await ok("package", "install", "marsh")).toBe("Installed the game system marsh 1.0.0, the fake system of the core's tests. The campaign plays it. Its code runs from now.");
        expect(context.systemCode?.marsh).toHaveProperty("code");
    });
});

describe("a system installed in the chat that plays it (D-513 (1))", () => {
    it("loads its code when config sets it, one of ours or one with the player's yes, new to the process; a system loaded already stays as it was", async () => {
        const marsh = join(modules, "@rpgengine", "system-marsh");
        cpSync(fileURLToPath(new URL("./systems/fake/", import.meta.url)), marsh, { recursive: true });
        writeFileSync(join(marsh, "package.json"), JSON.stringify({ name: "@rpgengine/system-marsh", version: "1.0.0", main: "dist/index.js", "rpg-engine": { kind: "system", api: 5 } }));
        context = { ...context, systemCode: {} };
        await ok("config", "system", "marsh");
        expect(context.systemCode?.marsh).toMatchObject({ version: "1.0.0" });
        expect(context.systemCode?.marsh).toHaveProperty("code");
        // A broken one is not loaded again: what the process has holds until it starts again.
        context = { ...context, systemCode: { marsh: { problem: "broken", version: "1.0.0" } } };
        await ok("config", "system", "marsh");
        expect(context.systemCode?.marsh).toEqual({ problem: "broken", version: "1.0.0" });
    });
});

describe("a campaign whose system is one of ours, not installed (D-514 (3))", () => {
    it("has validate and status say to install it with package install", async () => {
        writeFileSync(join(folder, "campaign.yaml"), "name: Prova\nlanguage: en\nsystem: 5e\ndifficulty: normal\nlethality: dice\n");
        expect(await runCommandLine(["validate"], context).then((ran) => ran.output)).toContain(
            "The system 5e is not installed: no creatures, items or rules come from a system. Installed: free (free play, without a game system). "
                + "Fix: install it, one of RPG Engine's own, with package install 5e; until then, play on without its pages.",
        );
        expect(await ok("status")).toContain("Prova · en · 5e (not installed: install it, one of RPG Engine's own, with package install 5e; until then, play on without its pages) · ");
    });
});

describe("SYS-10: a campaign whose system is one of ours, not installed, opened by the game's server (D-514 (3))", () => {
    /** The fake system as npm would install our 5e: its package named so, its code from its source. */
    function fifthPackage(): string
    {
        const at = join(makeTempFolder(), "system-5e");
        cpSync(fileURLToPath(new URL("./systems/fake/", import.meta.url)), at, { recursive: true });
        writeFileSync(join(at, "package.json"), JSON.stringify({ name: "@rpgengine/system-5e", version: "1.0.0", type: "module", main: "dist/index.js", "rpg-engine": { kind: "system", api: 5 } }));
        return at;
    }

    /** A host on a server started in the campaign, with these packages and none of the systems' code loaded beyond the engine's. */
    async function host(packages: PackageManager, beforeCall?: () => Promise<void>, session = false): Promise<{ client: Client; call(name: string, signal?: AbortSignal): Promise<string>; }>
    {
        // In a session, as the game's server keeps its files, the install waits for the world read first (D-194).
        context = { ...context, packages, systemCode: {}, ...(session ? { files: new SessionStore({ systemFolders: context.systemFolders }) } : {}) };
        const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
        await createMcpServer(context, {}, beforeCall).connect(serverTransport);
        const client = new Client({ name: "host", version: "1.0.0" });
        await client.connect(clientTransport);
        const call = async (name: string, signal?: AbortSignal): Promise<string> => ((await client.callTool({ name, arguments: {} }, undefined, signal === undefined ? undefined : { signal })).content as { text: string; }[])[0].text;
        return { client, call };
    }

    const plays = (system: string): void => writeFileSync(join(folder, "campaign.yaml"), `name: Prova\nlanguage: en\nsystem: ${system}\ndifficulty: normal\nlethality: dice\n`);

    /** npm with our 5e, whose install waits until it is let go; begun once it is asked. */
    function heldNpm(asked: string[] = []): { npm: PackageManager; begun: Promise<void>; letGo(): void; }
    {
        let letGo: () => void = () => undefined;
        const npm = fakeNpm([{ name: "@rpgengine/system-5e", version: "1.0.0", kind: "system", api: 5, folder: fifthPackage() }], asked);
        const install = npm.install;
        const begun = new Promise<void>((started) => {
            npm.install = (spec) => (started(), new Promise((done) => (letGo = () => done(install(spec)))));
        });
        return { npm, begun, letGo: () => letGo() };
    }

    it("installs it as the server starts, as package install, without the player's yes; loads its code, says it once at the first call, and the tools take its names (D-478, D-518, D-520)", async () => {
        plays("5e");
        const asked: string[] = [];
        const held = heldNpm(asked);
        const { client, call } = await host(held.npm, undefined, true);
        // No call yet: the install has begun while the player writes.
        await held.begun;
        expect((await client.listTools()).tools.find((tool) => tool.name === "change")?.description).toContain("field health, by -3");
        let changed = 0;
        client.setNotificationHandler(ToolListChangedNotificationSchema, () => void changed++);
        const answer = call("status");
        held.letGo();
        const first = await answer;
        expect(
            first.startsWith(
                "The campaign's game system, 5e, was not on this computer: RPG Engine installed it, @rpgengine/system-5e 1.0.0, one of its own. Its pages and rules are there from now. "
                    + "The commands' descriptions may keep neutral examples until a new chat: in 5e use its own names, such as grit for damage, night's sleep, crown and shilling.\n\n",
            ),
            first,
        ).toBe(true);
        expect(first).toContain("\n\nProva · en · 5e, the fake system of the core's tests");
        expect(asked).toEqual(["describe @rpgengine/system-5e", "install @rpgengine/system-5e@1.0.0"]);
        expect(context.systemCode?.["5e"]).toHaveProperty("code");
        expect((await client.listTools()).tools.find((tool) => tool.name === "change")?.description).toContain("field grit, by -3");
        // The descriptions changed together: one list_changed, never one for each tool.
        expect(changed).toBe(1);
        expect(await call("status")).not.toContain("was not on this computer");
        expect(asked).toHaveLength(2);
        await client.close();
    });

    it("says why it could not, once, and validate and status say how to install it; the server does not try again", async () => {
        plays("5e");
        const asked: string[] = [];
        const offline = "npm cannot reach its registry from this computer, and has no copy of @rpgengine/system-5e from before: connect the computer to the internet once and install it again";
        const npm = { ...fakeNpm([], asked), describe: (spec: string) => (asked.push(`describe ${spec}`), Promise.resolve({ failed: offline })) };
        const { client, call } = await host(npm);
        const said = await call("status");
        expect(
            said.startsWith(
                `The campaign's game system, 5e, is not on this computer, and could not be installed: ${offline}. Tell the player off-game, in brackets and in a table's words, that this computer lacks `
                    + "the 5e rules and could not download them: once it is online, you install them with package install 5e, no yes needed. Until then you play without its pages "
                    + "and the sheet's worked-out numbers, or wait, as the player chooses.\n\n"
                    + "Prova · en · 5e (not installed: install it, one of RPG Engine's own, with package install 5e;",
            ),
            said,
        ).toBe(true);
        expect(await call("validate")).toContain("Fix: install it, one of RPG Engine's own, with package install 5e; until then, play on without its pages.");
        expect(asked).toEqual(["describe @rpgengine/system-5e"]);
        await client.close();
    });

    it("never installs a system not ours, which asks the player's yes, nor anything from the command line", async () => {
        const asked: string[] = [];
        plays("pf2e");
        const { client, call } = await host(fakeNpm([], asked));
        expect(await call("status")).toMatch(/^Prova · en · pf2e \(not installed: ask the player which game you play, then config, setting system, value free\)/);
        await client.close();
        plays("5e");
        expect(await ok("status")).toContain("5e (not installed: install it, one of RPG Engine's own, with package install 5e;");
        expect(asked).toEqual([]);
    });

    it("tells the next call, when the one that installed it was stopped before its answer went", async () => {
        plays("5e");
        const held = heldNpm();
        // The dashboard opens after the install, as the game's server does, and both calls wait for it.
        let opening: Promise<void> | undefined;
        const { client, call } = await host(held.npm, () => (opening ??= new Promise((done) => setTimeout(done, 30))));
        await held.begun;
        const stop = new AbortController();
        const stopped = call("status", stop.signal);
        await new Promise((done) => setTimeout(done, 20));
        stop.abort();
        await expect(stopped).rejects.toThrow();
        // The next call comes while the install still runs, as after a host's timeout: it waits for it, and has the line.
        const next = call("status");
        await new Promise((done) => setTimeout(done, 50));
        held.letGo();
        expect(await next).toMatch(/^The campaign's game system, 5e, was not on this computer: RPG Engine installed it/);
        expect(await call("status")).not.toContain("was not on this computer");
        await client.close();
    });
});
