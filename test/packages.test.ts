// The package command (D-27, D-428, D-436, D-439, D-441): installing an extension on this computer with npm, ours or another with the player's own yes, adding it to
// the campaign, listing and removing; npm itself is a fake here, which copies the test extensions as it would install them.
import { cpSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { runCommandLine } from "../src/command-line.ts";
import type { Context, PackageInfo, PackageManager, Player } from "../src/core/context.ts";
import { inPlay, makeTempFolder, readLogFile, removeFolder, testContext, testExtensionFolders } from "./support.ts";

/** npm as these tests have it: the packages it knows by name, each the folder of a test extension; it installs one by copying it into node_modules. */
function fakeNpm(modules: string, known: Record<string, string>): PackageManager & { installed: string[]; }
{
    const installed: string[] = [];

    const info = (name: string): PackageInfo | undefined => {
        const folder = known[name];

        if (folder === undefined) {
            return undefined;
        }

        const manifest = join(folder, "package.json");
        const read = (existsSync(manifest) ? JSON.parse(readFileSync(manifest, "utf8")) : { version: "0.0.0" }) as { version: string; "rpg-engine"?: { kind: string; api: number; }; };
        return { name, version: read.version, ...(read["rpg-engine"] === undefined ? {} : { kind: read["rpg-engine"].kind, api: read["rpg-engine"].api }) };
    };

    return {
        installed,
        describe: (spec) => Promise.resolve(info(spec) ?? { failed: `npm has no package ${spec}`, missing: true }),
        install: (spec) => {
            const to = join(modules, ...spec.split("/"));
            mkdirSync(join(to, ".."), { recursive: true });
            cpSync(known[spec], to, { recursive: true });
            installed.push(spec);
            return Promise.resolve(undefined);
        },
        search: () => Promise.resolve(Object.keys(known).flatMap((name) => info(name) ?? []).map((found) => ({ ...found, description: "a test package" }))),
    };
}

/** A player who answers on the dashboard's page with this button. */
function pageAnswering(button: number): Player
{
    return { choose: () => Promise.resolve(button) };
}

let folder: string;
let modules: string;
let context: Context;
let npm: ReturnType<typeof fakeNpm>;
const rpg = (...args: string[]) => runCommandLine(args, context);

beforeEach(async () => {
    folder = makeTempFolder();
    modules = join(makeTempFolder(), "node_modules");
    const [ours, tests] = testExtensionFolders;
    npm = fakeNpm(modules, {
        "@rpgengine/weather": join(ours, "weather"),
        "@rpgengine/omens": join(tests, "omens"),
        "@test/rumors": join(tests, "rumors"),
        "seasons-of-the-test": join(tests, "seasons"),
        "left-pad": join(tests, "..", "systems"),
    });
    context = { ...testContext(folder), extensionFolders: [modules], packages: npm };
    await rpg("init", "--name", "Prova", "--language", "en", "--system", "ironsworn", "--difficulty", "normal", "--lethality", "dice");
    inPlay(folder);
});

afterEach(() => removeFolder(folder));

describe("rpg package install", () => {
    it("installs one of ours by its name alone, adds it to the campaign with its version, logs it, and gives the part for now (D-27, D-436)", async () => {
        const result = await rpg("package", "install", "weather");
        expect(result.output).toMatch(
            /^Installed weather 0\.1\.0, verified, and the campaign uses it: the sky changes each dawn by a roll, with the seasons, hot deserts, polar cold and fog\. Its commands: weather, weather-set\. Its parts of your instructions are given when they apply: play, setup\.\n\nIts part for now:\n\nThe weather changes by itself each dawn/,
        );
        expect(npm.installed).toEqual(["@rpgengine/weather"]);
        expect(readFileSync(join(folder, "campaign.yaml"), "utf8")).toContain('\nextensions:\n  "@rpgengine/weather": 0.1.0\n');
        expect(readLogFile(folder).at(-1)).toMatchObject({ type: "package-installed", visibility: "public", data: { package: "@rpgengine/weather", version: "0.1.0", verified: true } });
        expect((await rpg("status")).output).toContain("\nExtensions: weather (the sky changes each dawn");

        expect((await rpg("package", "install", "weather")).output).toMatch(/^The campaign already uses weather 0\.1\.0, verified: the sky/);
        expect(npm.installed).toEqual(["@rpgengine/weather"]);
    });

    it("says when a chat sees the new tools, by the app in use (D-441)", async () => {
        context = { ...context, host: () => "codex-mcp-client" };
        expect((await rpg("package", "install", "weather")).output).toContain("Its commands: weather, weather-set. Codex sees them only once it is closed and opened again: tell the player.");
        await rpg("package", "remove", "weather");
        context = { ...context, host: () => "claude-code" };
        expect((await rpg("package", "install", "weather")).output).toContain("Its commands: weather, weather-set. They are yours from the player's next message.");
    });

    it("installs one not ours only with the player's own yes: never the master's, in a chat a button (D-441)", async () => {
        const refused = await rpg("package", "install", "@test/rumors", "--accept-risk");
        expect(refused.exitCode).toBe(1);
        expect(refused.output).toBe(
            "@test/rumors is not published by RPG Engine: its texts are someone else's, and RPG Engine takes no responsibility for it. Only the player can say yes to it, and they cannot be asked here: "
                + "tell them to install it from their terminal, in the campaign's folder, with rpg package install @test/rumors --accept-risk. Nothing changed.",
        );

        context = { ...context, page: pageAnswering(1) };
        expect((await rpg("package", "install", "@test/rumors")).output).toBe("The player did not want @test/rumors. Nothing changed.");
        expect(npm.installed).toEqual([]);

        context = { ...context, page: pageAnswering(0) };
        expect((await rpg("package", "install", "@test/rumors")).output).toMatch(
            /^Installed rumors 2\.0\.0, not verified: at the player's risk, and the campaign uses it: a rumor in each tavern\. Its code is not used/,
        );
    });

    it("on the command line, asks for --accept-risk, and installs with it", async () => {
        context = { ...context, terminal: true };
        expect((await rpg("package", "install", "@test/rumors")).output).toBe(
            "@test/rumors is not published by RPG Engine: its texts are someone else's, and RPG Engine takes no responsibility for it. "
                + "To install it at your own risk: package install @test/rumors --accept-risk. Nothing changed.",
        );
        expect((await rpg("package", "install", "@test/rumors", "--accept-risk")).exitCode).toBe(0);
        expect((await rpg("rumors")).output).toMatch(/^Unknown command "rumors"/);
    });

    it("never runs a stranger's code nor lets its part take the place of the core's (D-441)", async () => {
        context = { ...context, terminal: true };
        await rpg("package", "install", "@test/rumors", "--accept-risk");
        const instructions = (await rpg("instructions")).output;
        expect(instructions).toContain("\n\n### Rumors (extension)\n\nEvery tavern holds a rumor.");
        expect(instructions).toContain("# Game master: core instructions");
        expect((await rpg("validate")).output).toBe("No problems.");
    });

    it("refuses a name alone that is not one of ours, and what npm does not have", async () => {
        expect((await rpg("package", "install", "left-pad")).output).toBe(
            "npm has no package @rpgengine/left-pad. Nothing changed: left-pad alone means @rpgengine/left-pad, one of RPG Engine's; another's is named with its scope, or as npm:left-pad without one.",
        );
        expect((await rpg("package", "install", "@rpgengine/nowhere")).output).toBe("npm has no package @rpgengine/nowhere. Nothing changed.");
        expect(readFileSync(join(folder, "campaign.yaml"), "utf8")).not.toContain("extensions:");
    });

    it("refuses what is not an extension for RPG Engine, and one made for another game system", async () => {
        context = { ...context, terminal: true };
        expect((await rpg("package", "install", "./not-a-package")).output).toMatch(/^\.\/not-a-package is not the folder of a package|npm has no package/);
        npm.describe = (spec) => Promise.resolve({ name: spec, version: "1.3.0" });
        expect((await rpg("package", "install", "@other/left-pad")).output).toBe(
            '@other/left-pad is not a package for RPG Engine: its package.json does not say "rpg-engine": {"kind": "extension"}. Nothing changed.',
        );
        npm.describe = (spec) => Promise.resolve({ name: spec, version: "0.1.0", kind: "extension", api: 1 });
        expect((await rpg("package", "install", "npm:seasons-of-the-test", "--accept-risk")).output).toBe(
            "seasons-of-the-test is installed on this computer, but it is for the game system 5e, and the campaign plays ironsworn: the campaign does not use it.",
        );
        npm.describe = (spec) => Promise.resolve({ name: spec, version: "3.0.0", kind: "extension", api: 2 });
        expect((await rpg("package", "install", "omens")).output).toBe(
            "@rpgengine/omens 3.0.0 is made for the extension API 2, and this RPG Engine reads the API 1: install a version made for it. Nothing changed.",
        );
        expect(readFileSync(join(folder, "campaign.yaml"), "utf8")).not.toContain("extensions:");
    });

    it("installs again a copy on this computer that no longer reads", async () => {
        await rpg("package", "install", "weather");
        writeFileSync(join(modules, "@rpgengine", "weather", "extension.yaml"), "title: [broken\n");
        expect((await rpg("package", "install", "weather")).output).toMatch(/^The campaign already uses weather 0\.1\.0, verified|^Installed weather 0\.1\.0, verified/);
        expect(npm.installed).toEqual(["@rpgengine/weather", "@rpgengine/weather"]);
    });
});

describe("rpg package list and remove", () => {
    it("lists what is on this computer, what the campaign uses, and what npm has besides, a broken one with how to fix it", async () => {
        await rpg("package", "install", "weather");
        await rpg("package", "install", "omens");
        writeFileSync(join(modules, "@rpgengine", "omens", "extension.yaml"), "title: [broken\n");
        expect((await rpg("package", "list")).output).toMatch(
            /^On this computer: omens \(broken: .*; install it again\); weather 0\.1\.0, used by the campaign\.\nOn npm: rumors 2\.0\.0 \(not verified\): a test package; seasons-of-the-test 0\.1\.0 \(not verified\): a test package\.$/,
        );
    });

    it("removes one from the campaign, keeping it on this computer and what it kept in the campaign", async () => {
        await rpg("package", "install", "weather");
        await rpg("advance", "--to", "day 1, 18:00");
        expect((await rpg("package", "remove", "weather")).output).toBe(
            "The campaign no longer uses weather: its commands and its parts of your instructions are gone; what it kept in the campaign stays, and comes back if it is installed again.",
        );
        expect(readFileSync(join(folder, "campaign.yaml"), "utf8")).not.toContain("extensions:");
        expect((await rpg("weather")).output).toMatch(/^Unknown command "weather"/);
        expect((await rpg("package", "remove", "weather")).output).toBe("The campaign does not use weather: it uses no package. Nothing changed.");
        expect((await rpg("package", "list")).output).toMatch(/^On this computer: weather 0\.1\.0\.\n/);
    });
});
