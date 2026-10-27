// The setup with the engine's free alone (D-513 (1), D-514 (3)): status names the game systems this computer can install, from npm, ours first, or ours from the
// engine's list when npm does not answer; package install takes one of ours by its name alone, without a yes; validate's fix for a campaign whose system is
// one of ours not installed.
import { cpSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { beforeEach, describe, expect, it } from "vitest";
import { runCommandLine } from "../src/command-line.ts";
import type { Context, PackageInfo, PackageManager } from "../src/core/context.ts";
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
