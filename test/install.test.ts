// Codex and Claude Code installed and signed in with the player's yes (D-424, D-425): install puts a program in the engine's own folder when the computer lacks
// it, opens the player's sign-in and says how it stands, with the link for a browser that did not open; status offers it by the player's account; a program
// installed there is started by its full path, and the sign-in is followed until it ends.
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { beforeEach, describe, expect, it } from "vitest";
import { runCommandLine } from "../src/cli/command-line.ts";
import type { Context, HelperLogin, HelperName, Helpers, HelperState } from "../src/core/context.ts";
import { helperChanges, installedLine, startLogin } from "../src/helpers/programs.ts";
import { makeTempFolder, readLogFile, testContext } from "./support.ts";

let folder: string;
let context: Context;

async function ok(...args: string[]): Promise<string>
{
    const result = await runCommandLine(args, context);
    expect(result.exitCode, result.output).toBe(0);
    return result.output;
}

/** Programs that stand as `states` say, an installation that fails with `refused`, and a sign-in that answers `login`; what was asked is kept. */
function fakeHelpers(states: Partial<Record<HelperName, HelperState>>, login: HelperLogin, refused?: string): Helpers & { asked: string[]; }
{
    const asked: string[] = [];
    return {
        asked,
        state: (name) => states[name] ?? "missing",
        install: (name) => {
            asked.push(`install ${name}`);
            states[name] = refused === undefined ? "logged out" : "missing";
            return Promise.resolve(refused);
        },
        login: (name) => {
            asked.push(`login ${name}`);
            return Promise.resolve(login);
        },
    };
}

beforeEach(async () => {
    folder = makeTempFolder();
    context = testContext(folder);
    await ok("init", "--name", "Prova", "--language", "vi", "--system", "fake");
});

describe("Codex and Claude Code installed with the player's yes (D-424, D-425)", () => {
    it("installs a program the computer lacks, opens the sign-in with its link, and says it is ready once the player signed in", async () => {
        const states: Partial<Record<HelperName, HelperState>> = {};
        context = { ...context, helpers: fakeHelpers(states, { state: "waiting", link: "https://auth.openai.com/oauth/authorize?x=1" }) };
        const waiting = await ok("install", "codex");
        expect(waiting).toContain("Codex is installed. Its sign-in is open in the player's browser: tell them to sign in with their ChatGPT account");
        expect(waiting).toContain("If no page opened, give them this link: https://auth.openai.com/oauth/authorize?x=1");
        expect(readLogFile(folder).at(-1)).toMatchObject({ type: "helper-installed", visibility: "hidden", data: { program: "codex" } });

        // The player signed in: the page hears that it can be translated now.
        states.codex = "ready";
        const ready = await ok("install", "codex");
        expect(ready).toContain("Codex is ready on this computer with the player's ChatGPT account: the dashboard is translated in the background from now on");
        expect(ready).toContain("that it runs on their own plan and its limits, imports of their documents too");
        expect(readLogFile(folder).at(-1)).toMatchObject({ type: "helper-ready", visibility: "hidden" });
    });

    it("turns to the translation in the chat when the installation fails, or the sign-in ends with an account the engine does not use", async () => {
        context = { ...context, helpers: fakeHelpers({}, { state: "waiting" }, "npm said: EACCES") };
        expect(await ok("install", "claude")).toBe(
            "Claude Code is not ready: it could not be installed: npm said: EACCES. Offer the player instead to translate the dashboard now, in the chat, with translate.",
        );
        context = { ...context, helpers: fakeHelpers({ codex: "api key" }, { state: "done" }) };
        expect(await ok("install", "codex")).toContain("Codex is not ready: the sign-in ended, but not with a ChatGPT account.");
        const refused = await runCommandLine(["install", "codex"], { ...context, helpers: undefined });
        expect(refused.output).toContain("Only the game's server installs programs, in a chat. In a terminal: npm install -g @openai/codex, then codex login.");
    });

    it("is offered in the setup by the player's account, where the dashboard lacks the language and nothing translates it in the background", async () => {
        const page = makeTempFolder();
        mkdirSync(join(page, "i18n"));
        writeFileSync(join(page, "i18n", "it.json"), JSON.stringify({ Roll: "Tira" }));
        context = { ...context, home: makeTempFolder(), pageFolder: page, dashboard: "http://127.0.0.1:4747/", helpers: fakeHelpers({}, { state: "waiting" }) };
        const status = await ok("status");
        expect(status).toContain("Ask the player once which account they have, and offer: with ChatGPT, any plan, to install Codex, with install codex");
        expect(status).toContain("with neither, to translate it now in the chat, in a couple of minutes, with translate.");
    });
});

describe("the programs in the engine's folder (D-425)", () => {
    it("starts one installed there by its full path, as its package's bin says: node and a script, or the program itself", () => {
        const tools = makeTempFolder();
        expect(installedLine("codex", tools)).toBeUndefined();
        const codex = join(tools, "node_modules", "@openai", "codex");
        mkdirSync(join(codex, "bin"), { recursive: true });
        writeFileSync(join(codex, "package.json"), JSON.stringify({ bin: { codex: "bin/codex.js" } }));
        writeFileSync(join(codex, "bin", "codex.js"), "");
        expect(installedLine("codex", tools)).toBe(`"${process.execPath}" "${join(codex, "bin", "codex.js")}"`);
        const claude = join(tools, "node_modules", "@anthropic-ai", "claude-code");
        mkdirSync(join(claude, "bin"), { recursive: true });
        writeFileSync(join(claude, "package.json"), JSON.stringify({ bin: { claude: "bin/claude.exe" } }));
        writeFileSync(join(claude, "bin", "claude.exe"), "");
        expect(installedLine("claude", tools)).toBe(`"${join(claude, "bin", "claude.exe")}"`);
    });

    it("follows the sign-in until it ends, with the link it printed, and counts the program ready", async () => {
        const script = join(makeTempFolder(), "login.js");
        writeFileSync(script, "console.error('Starting local login server on http://localhost:1455.\\nIf your browser did not open, go to https://auth.example/authorize?code=1'); setTimeout(() => process.exit(0), 200);");
        const before = helperChanges();
        // It answers as soon as the link comes, the sign-in still waiting for the player.
        expect(await startLogin("codex", `"${process.execPath}" "${script}"`)).toEqual({ state: "waiting", link: "https://auth.example/authorize?code=1" });

        for (let tries = 0; tries < 100 && helperChanges() === before; tries++) {
            await new Promise((done) => setTimeout(done, 50));
        }

        expect(helperChanges()).toBe(before + 1);
    });

    it("tells a sign-in that fails at once as failed, with what it said, never as open", async () => {
        const script = join(makeTempFolder(), "fail.js");
        writeFileSync(script, "console.error('Error: address already in use 127.0.0.1:1455'); process.exit(1);");
        expect(await startLogin("claude", `"${process.execPath}" "${script}"`)).toEqual({ state: "failed", why: "it said: Error: address already in use 127.0.0.1:1455" });
    });
});
