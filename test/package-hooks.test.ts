// The hooks and the game of a package's code under the API 5 (D-511, D-514), on the fake system, from the review of 26 October: hooks that give a promise or
// ask, the engine's notes kept beside an extension's lines, code not there said in a line, game.set checked as write --set, game.change, the lines cut.
import { appendFileSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { request } from "node:http";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { runCommandLine } from "../src/command-line.ts";
import { change } from "../src/commands/change.ts";
import { campaignPageModules } from "../src/commands/game-extension-list.ts";
import { packageWidget } from "../src/commands/game-widgets.ts";
import { packageCommand } from "../src/commands/package.ts";
import type { Context } from "../src/core/context.ts";
import { SessionStore } from "../src/core/session-store.ts";
import { startDashboard } from "../src/server/dashboard/index.ts";
import type { GameSystem } from "../src/systems/index.ts";
import { inPlay, makeTempFolder, readLogFile, removeFolder, testContext } from "./support.ts";

let folder: string;
let context: Context;

beforeEach(async () => {
    folder = makeTempFolder();
    context = testContext(folder);
    await ok("init", "--name", "Fenmoor", "--language", "en", "--system", "fake", "--difficulty", "normal", "--lethality", "dice");
    await ok("config", "harshness", "gentle");
    inPlay(folder);
    await ok("write", "Tamsin", "--type", "character", "--set", "role=pc", "--set", "vocations=[[Warden]] 1", "--set", "might=5");
});

afterEach(() => removeFolder(folder));

/** A folder of packages with the extension @rpgengine/<name>, its code given as lines, made for this API or the one given; the campaign lists it. */
function extension(name: string, code: string[], api = 5): void
{
    const own = join(folder, "packages", name);
    mkdirSync(join(own, "src"), { recursive: true });
    writeFileSync(join(own, "package.json"), JSON.stringify({ name: `@rpgengine/${name}`, version: "1.0.0", main: "dist/index.js", "rpg-engine": { kind: "extension", api } }));
    writeFileSync(join(own, "extension.yaml"), `title: ${name}\nabout: a test extension\nlanguage: en\n`);
    writeFileSync(join(own, "src", "index.ts"), `${code.join("\n")}\n`);
    const listed = context.extensionFolders?.[0] === join(folder, "packages");
    context = { ...context, extensionFolders: [join(folder, "packages")] };
    appendFileSync(join(folder, "campaign.yaml"), `${listed ? "" : "extensions:\n"}  "@rpgengine/${name}": 1.0.0\n`);
}

describe("the hooks of a package (D-514)", () => {
    it("take a promise as a line, never a rejection that ends the process, and refuse ask at once", async () => {
        extension("moody", [
            "export default () => ({",
            "    counterChanged: async (change) => { if (change.after < 5) { throw new Error('boom from an async hook'); } return [`${change.page} winces.`]; },",
            "    turnStarted: (turn, game) => { void game.ask({ question: 'Hold?', check: 'Might', notation: '2d6' }).catch(() => undefined); return ['Hold fast.']; },",
            "});",
        ]);
        const late = await ok("change", "Tamsin", "grit", "--to", "2");
        expect(late).toContain("The extension moody gave a promise after this change: its hooks give their lines at once, never waiting, so nothing of it followed; meanwhile apply its rules yourself, as its instructions say.");
        expect(late).not.toContain("winces");
        await ok("scene", "open", "--title", "The causeway", "--type", "combat", "--with", "Tamsin", "--creatures", "Bog Hound=1");
        await ok("scene", "order", "--order", "Bog Hound 1", "--order", "Tamsin");
        const turn = await ok("scene", "next");
        expect(turn).toContain("The extension moody failed after this turn began: ask waits for the player, and a hook is called at once, never waiting: ask from a command of the package instead.");
        expect(turn).not.toContain("Hold fast.");
        // The rejection of the promise let go is caught: the test's process goes on, and vitest finds none unhandled.
        await new Promise((done) => setTimeout(done, 50));
    });

    it("keep the engine's notes beside an extension's lines: what a roll's effects ask and the marks of the turn (TRN-1)", async () => {
        extension("chatter", [
            "export default () => ({",
            "    turnStarted: ({ who }) => [`The wind howls around ${who}.`],",
            "    rolled: ({ who }) => [`${who}'s dice clatter.`],",
            "});",
        ]);
        await ok("effect", "add", "Tamsin", "Dazed");
        const rolled = await ok("roll", "2d6+2", "--who", "Tamsin", "--why", "lift the gate");
        expect(rolled).toMatch(/Tamsin has Dazed: if they change this roll[^\n]*\nTamsin's dice clatter\./);
        await ok("scene", "open", "--title", "The causeway", "--type", "combat", "--with", "Tamsin", "--creatures", "Bog Hound=1");
        await ok("scene", "order", "--order", "Bog Hound 1", "--order", "Tamsin");
        expect(await ok("scene", "next")).toMatch(/Mark with scene use what Tamsin uses of the turn[^\n]*The wind howls around Tamsin\./);
    });

    it("are cut at five lines and 600 characters for a package, with a line that says so", async () => {
        extension("loud", ["export default () => ({ rolled: () => Array.from({ length: 7 }, (_, index) => `Line ${index + 1}.`) });"]);
        const rolled = await ok("roll", "2d6", "--who", "Tamsin", "--why", "noise");
        expect(rolled).toContain("Line 5.\nThe extension loud said more: cut.");
        expect(rolled).not.toContain("Line 6.");
    });

    it("say in a line the code of an extension that is not loaded yet, and are called once package installed another, in the same process", async () => {
        extension("injuries", ["export default () => ({ counterChanged: (change) => [`injuries hears ${change.page}.`] });"]);
        // A call that no entry started: the code was never loaded.
        const changed = async (to: number): Promise<string> => change.format(await change.run(change.input.parse({ page: "Tamsin", field: "grit", to }), context));
        expect(await changed(8)).toContain("The extension injuries's code is not loaded yet: start the MCP server again (/mcp in Claude Code), or open a new chat, so nothing of it followed this change;");

        const omens = join(folder, "packages", "omens");
        const npm = {
            describe: () => Promise.resolve({ name: "@rpgengine/omens", version: "1.0.0", kind: "extension", api: 5 }),
            install: () => {
                mkdirSync(join(omens, "src"), { recursive: true });
                writeFileSync(join(omens, "package.json"), JSON.stringify({ name: "@rpgengine/omens", version: "1.0.0", main: "dist/index.js", "rpg-engine": { kind: "extension", api: 5 } }));
                writeFileSync(join(omens, "extension.yaml"), "title: omens\nabout: a test extension\nlanguage: en\n");
                writeFileSync(join(omens, "src", "index.ts"), "export default () => ({ counterChanged: (change) => [`omens hears ${change.page}.`] });\n");
                return Promise.resolve(undefined);
            },
        };
        await packageCommand.run(packageCommand.input.parse({ action: "install", name: "omens" }), { ...context, packages: npm as unknown as Context["packages"] });
        const after = await changed(6);
        expect(after).toContain("injuries hears Tamsin.");
        expect(after).toContain("omens hears Tamsin.");
    });

    it("leave out the hooks of an extension whose commands are refused, said once, as of a system's code refused", async () => {
        extension("crooked", [
            "export default ({ z }) => ({",
            '    commands: [{ name: "straight", description: "Misnamed.", input: z.object({}), run: () => "no" }],',
            "    counterChanged: () => ['crooked hears it.'],",
            "});",
        ]);
        const first = await ok("change", "Tamsin", "grit", "--by=-1");
        expect(first).toContain("The extension crooked's code is left out (its command straight must be named crooked, or start with crooked-): validate says how to fix it");
        expect(first).not.toContain("crooked hears it.");
        expect(await ok("change", "Tamsin", "grit", "--by=-1")).not.toContain("crooked");

        const refused = { ...context, systemCode: { fake: { refused: "is not ours, and the player has not said yes to it, as a test says", version: "1.0.0" } } };
        const said = async (): Promise<string> => (await runCommandLine(["change", "Tamsin", "grit", "--by=-1"], refused)).output;
        expect(await said()).toContain("The game system fake's code is not ours, and the player has not said yes to it, as a test says, so nothing of it followed this change;");
        expect(await said()).not.toContain("as a test says");
        // Loaded at another version than the one installed now: said each time, until the server starts again.
        const stale = { ...context, systemCode: { fake: { ...context.systemCode?.fake, version: "0.9.0" } } as Context["systemCode"] };
        expect((await runCommandLine(["change", "Tamsin", "grit", "--by=-1"], stale)).output).toContain(
            "The game system fake's code is loaded at version 0.9.0, and 1.0.0 is installed now: start the MCP server again",
        );
    });
});

describe("what a package's code loads and declares (D-514, D-515)", () => {
    it("refuses code that gives null, with a clear line, and says to update the engine, with no fix of its own, for one made for a newer API", async () => {
        extension("hollow", ["export default () => null;"]);
        extension("tomorrow", ["export default () => ({});"], 7);
        const problems = await ok("validate");
        expect(problems).toMatch(/The code of the extension @rpgengine\/hollow cannot be used: [^\n]*hollow[^\n]*index\.ts's default export gave null, not its code: give an object, such as \{ commands: \[\] \}\./);
        expect(problems).not.toContain("file://");
        expect(problems).toContain("rpg-engine must be updated first: ask the player to update it on the Packages page of their dashboard, or as they installed it, then open a new chat.");
        expect(problems).not.toMatch(/tomorrow[^\n]*Fix: install it again/);
    });

    it("loads no extension's code for a command that calls no hook, such as --version or package", async () => {
        extension("counted", ["globalThis.countedImports = (globalThis.countedImports ?? 0) + 1;", "export default () => ({});"]);
        const imports = (): number => (globalThis as { countedImports?: number; }).countedImports ?? 0;
        await ok("--version");
        await ok("package", "list");
        expect(imports()).toBe(0);
        await ok("change", "Tamsin", "grit", "--by=-1");
        expect(imports()).toBe(1);
    });

    it("gives no page module of a system made for an API this engine does not read", () => {
        const system = join(makeTempFolder(), "future");
        mkdirSync(join(system, "page"), { recursive: true });
        writeFileSync(join(system, "page", "page.js"), "export default {};\n");
        writeFileSync(join(system, "package.json"), JSON.stringify({ name: "@test/system-future", version: "2.0.0", "rpg-engine": { kind: "system", api: 7, page: "page/page.js" } }));
        expect(campaignPageModules(folder, context, { folder: system, language: "en", figures: {} } as unknown as GameSystem)).toEqual([]);
    });
});

describe("the game a package's code reaches (D-514)", () => {
    beforeEach(() => {
        extension("setter", [
            "export default ({ z }) => ({",
            '    commands: [{ name: "setter", description: "Sets fields.", input: z.object({ page: z.string(), json: z.string() }), positionals: ["page", "json"],',
            '        run: ({ page, json }, game) => { game.set(page, JSON.parse(json), "a test"); return "set"; } },',
            '      { name: "setter-pin", description: "Pins someone.", input: z.object({ who: z.string() }), positionals: ["who"], run: ({ who }, game) => JSON.stringify(game.addEffect(who, "Pinned", "a test")) },',
            '      { name: "setter-fell", description: "Fells someone.", input: z.object({ who: z.string() }), positionals: ["who"], run: ({ who }, game) => game.change(who, "grit", { to: 0 }, "a test") }],',
            "});",
        ]);
    });

    it("sets fields only as write --set would, and writes nothing when write refuses", async () => {
        await ok("write", "Bruna", "--type", "character", "--set", "role=npc", "--set", "torches=3/5");
        await ok("write", "Fair", "--type", "event", "--set", "date=day 3");

        const refused = async (page: string, json: string, said: string | RegExp): Promise<void> => {
            const set = await runCommandLine(["setter", page, json], context);
            expect(set.exitCode, set.output).toBe(1);
            expect(set.output).toMatch(said);
        };

        const lines = readLogFile(folder).length;
        await refused("Tamsin", '{"effects": "Poisoned"}', /effect/i);
        await refused("Tamsin", '{"calling": ""}', /unset/);
        await refused("Bruna", '{"torches": "many"}', /torches is a counter/);
        await refused("Tamsin", '{"creature": "[[Tamsin]]"}', /Tamsin/);
        await refused("Fair", '{"date": "next spring maybe"}', /date/);
        await refused("Tamsin", '{"grit": 0}', /grit is a counter/);
        expect(readLogFile(folder)).toHaveLength(lines);
        expect(readFileSync(join(folder, "world", "characters", "Tamsin.md"), "utf8")).not.toContain("Poisoned");
    });

    it("changes a counter as change does, the system's hooks after it, never adds an effect over effects written by hand that do not read (EFF-12)", async () => {
        expect(await ok("setter-fell", "Tamsin")).toContain("Tamsin falls: one fading at the start of each of their turns");
        const page = join(folder, "world", "characters", "Tamsin.md");
        expect(readFileSync(page, "utf8")).toContain("Down");
        writeFileSync(page, readFileSync(page, "utf8").replace(/\neffects:\n(?: {2}- .*\n)+/, "\neffects:\n  - Cursed (might: 1) until a priest lifts it\n  - cursed\n"));
        const pinned = await runCommandLine(["setter-pin", "Tamsin"], context);
        expect(pinned.output).toContain("Tamsin's effects do not read:");
        expect(readFileSync(page, "utf8")).toContain("Cursed (might: 1) until a priest lifts it");
    });

    it("gives a card of the page code the data of its widget for the character shown, and a read-only run from the page tells the master nothing", async () => {
        await ok("change", "Tamsin", "grit", "--to=0");
        expect((await packageWidget(folder, context, "@rpgengine/system-fake", "rally", "Tamsin"))?.parts).toEqual([{ who: "Tamsin", does: "fades" }, { track: { label: "Fading", value: 0, max: 3 } }]);
        expect(await packageWidget(folder, context, "@rpgengine/system-fake", "nothing", "Tamsin")).toBeUndefined();

        const session = new SessionStore({ systemFolders: context.systemFolders, watchFolder: () => ({ close: () => undefined }) });
        const dashboard = await startDashboard({ ...context, files: session }, session, { ports: [0], page: folder });

        try {
            const port = Number(new URL(dashboard?.url ?? "").port);
            expect((JSON.parse(await call(port, "/api/widget?package=%40rpgengine%2Fsystem-fake&widget=rally&who=Tamsin")) as { shows: { parts: unknown[]; }; }).shows.parts[0]).toEqual({ who: "Tamsin", does: "fades" });
            expect(JSON.parse(await call(port, "/api/run", { command: "fake-fading", input: { who: "Tamsin" } }))).toEqual({ text: "Tamsin is Down: fading 0/3." });
            expect(dashboard?.news().lines).toEqual([]);
        } finally {
            await dashboard?.close();
            session.close();
        }
    });
});

/** A call to the dashboard, as its page makes it: a POST with a body, else a GET; the body of the answer. */
function call(port: number, path: string, body?: unknown): Promise<string>
{
    return new Promise((done, fail) => {
        const headers = body === undefined ? {} : { origin: `http://127.0.0.1:${port}`, "content-type": "application/json" };
        request({ host: "127.0.0.1", port, path, method: body === undefined ? "GET" : "POST", headers }, (response) => {
            let text = "";
            response.setEncoding("utf8");
            response.on("data", (chunk: string) => (text += chunk));
            response.on("end", () => done(text));
        }).on("error", fail).end(body === undefined ? undefined : JSON.stringify(body));
    });
}

async function ok(...args: string[]): Promise<string>
{
    const result = await runCommandLine(args, context);
    expect(result.exitCode, result.output).toBe(0);
    return result.output;
}
