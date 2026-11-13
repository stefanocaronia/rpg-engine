// Newer versions of the campaign's packages (D-569): status tells the master at the start of a session, with the command that updates each; npm's registry is
// asked at most once a day, its answer kept in the player's folder, and offline nothing is said. The registry and the time are fakes here.
import { appendFileSync, cpSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { beforeEach, describe, expect, it } from "vitest";
import { runCommandLine } from "../src/cli/command-line.ts";
import type { Context, PackageManager } from "../src/core/context.ts";
import { inPlay, makeTempFolder, testContext, testExtensionFolders } from "./support.ts";

const line = "Newer on npm: skies 0.3.0 (here 0.2.0). Tell the player; update only if they want it, with package install skies.";

/** npm's registry as these tests have it: the newest version of each package, none offline; and every name it was asked. */
function registry(newest: Record<string, string | undefined>, asked: string[]): PackageManager
{
    return {
        describe: (spec) => Promise.resolve({ failed: `npm has no package ${spec}`, missing: true }),
        install: () => Promise.resolve("not in these tests"),
        uninstall: () => Promise.resolve(undefined),
        search: () => Promise.resolve([]),
        newest: (name) => {
            asked.push(name);
            return Promise.resolve(newest[name]);
        },
    };
}

let context: Context;
let asked: string[];
let at: number;

async function status(): Promise<string>
{
    return (await runCommandLine(["status"], context)).output;
}

beforeEach(async () => {
    const folder = makeTempFolder();
    const modules = join(makeTempFolder(), "node_modules");
    mkdirSync(join(modules, "@rpgengine"), { recursive: true });
    cpSync(join(testExtensionFolders[0], "skies"), join(modules, "@rpgengine", "skies"), { recursive: true });
    asked = [];
    at = Date.parse("2026-11-14T09:00:00Z");
    context = { ...testContext(folder), extensionFolders: [modules], home: makeTempFolder(), now: () => new Date(at), packages: registry({ "@rpgengine/skies": "0.3.0" }, asked) };
    await runCommandLine(["init", "--name", "Prova", "--language", "en", "--system", "free", "--difficulty", "normal", "--lethality", "dice"], context);
    appendFileSync(join(folder, "campaign.yaml"), 'extensions:\n  "@rpgengine/skies": 0.2.0\n');
    inPlay(folder);
});

describe("newer versions of the campaign's packages (D-569)", () => {
    it("tells the master a newer version this engine reads, with the command; asks npm once a day, and again the day after", async () => {
        expect(await status()).toContain(`\n${line}\n`);
        expect(await status()).toContain(line);
        expect(asked).toEqual(["@rpgengine/skies"]);
        // A day later npm is asked again: the version here is now the newest.
        at += 25 * 60 * 60 * 1000;
        context = { ...context, packages: registry({ "@rpgengine/skies": "0.2.0" }, asked) };
        expect(await status()).not.toContain("Newer on npm");
        expect(asked).toEqual(["@rpgengine/skies", "@rpgengine/skies"]);
    });

    it("says nothing offline, and does not wait on npm again the same day", async () => {
        context = { ...context, packages: registry({}, asked) };
        expect(await status()).not.toContain("Newer on npm");
        expect(await status()).not.toContain("Newer on npm");
        expect(asked).toEqual(["@rpgengine/skies"]);
    });

    it("tells it once in a chat, at its first status", async () => {
        context = { ...context, told: new Set() };
        expect(await status()).toContain(line);
        expect(await status()).not.toContain("Newer on npm");
    });

    it("asks nothing where npm is not asked, as without a registry", async () => {
        context = { ...context, packages: undefined };
        expect(await status()).not.toContain("Newer on npm");
    });
});
