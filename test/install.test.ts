// Codex and Claude Code installed and signed in with the player's yes (D-424, D-425): install puts a program in the engine's own folder when the computer lacks
// it, opens the player's sign-in and says how it stands, with the link for a browser that did not open; status offers it by the player's account; a program
// installed there is started by its full path, and the sign-in is followed until it ends.
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { runCommandLine } from "../src/cli/command-line.ts";
import type { Context, HelperLogin, HelperName, Helpers, HelperState } from "../src/core/context.ts";
import { accessKeeper } from "../src/helpers/access.ts";
import { cancelLogin, computerHelpers, heldBack, helperChanges, helperLine, helperState, installedLine, lookAtHelper, signInRuns, startLogin } from "../src/helpers/programs.ts";
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
        look: (name) => Promise.resolve(states[name] ?? "missing"),
        cancel: (name) => void asked.push(`cancel ${name}`),
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

    it("tells who listens how the sign-in ended, once the player finished it after its first answer", async () => {
        const script = join(makeTempFolder(), "later.js");
        writeFileSync(script, "console.error('Go to https://auth.example/later'); setTimeout(() => process.exit(0), 300);");
        const ended: HelperLogin[] = [];
        expect(await startLogin("codex", `"${process.execPath}" "${script}"`, 5000, (login) => ended.push(login))).toEqual({ state: "waiting", link: "https://auth.example/later" });
        await vi.waitFor(() => expect(ended).toEqual([{ state: "done" }]), { timeout: 5000 });
    });

    it("stops a sign-in cancelled, its program and all it started, and tells nobody it ended", async () => {
        const folder = makeTempFolder();
        const script = join(folder, "waits.js");
        const pidFile = join(folder, "pid");
        writeFileSync(script, `require('fs').writeFileSync(${JSON.stringify(pidFile)}, String(process.pid)); console.error('Go to https://auth.example/wait'); setTimeout(() => {}, 60000);`);
        const ended: HelperLogin[] = [];
        let released = false;
        expect(await startLogin("claude", `"${process.execPath}" "${script}"`, 5000, (login) => ended.push(login), () => (released = true))).toMatchObject({ state: "waiting" });
        const pid = Number(readFileSync(pidFile, "utf8"));

        cancelLogin("claude");
        // Three seconds of grace first (T-301), on a loaded machine longer; free for another sign-in only once its program is gone.
        await vi.waitFor(() => expect(alive(pid)).toBe(false), { timeout: 8000 });
        await vi.waitFor(() => expect(released).toBe(true), { timeout: 8000 });
        await new Promise((done) => setTimeout(done, 200));
        expect(ended).toEqual([]);
    });

    it("cancels a sign-in asked and cancelled at once: its program never outlives the player's no", async () => {
        const fake = fakeProgram("claude", "if (asked === 'auth login') { console.error('Go to https://auth.example/now'); setTimeout(() => {}, 60000); }");
        const helpers = computerHelpers(fake.tools, { PATH: "" });
        const login = helpers.login("claude");
        helpers.cancel("claude");
        await login;
        // Stopped after the few seconds it has to end by itself, as one saving the player's sign-in (T-301).
        await vi.waitFor(() => expect(fake.started().filter((one) => one.asked === "auth login" && alive(one.pid))).toEqual([]), { timeout: 8000 });
    }, 15_000);

    it("starts no second sign-in of a program while the one cancelled still ends, as two would write the same sign-in (T-301)", async () => {
        const fake = fakeProgram("claude", "if (asked === 'auth login') { console.error('Go to https://auth.example/now'); setTimeout(() => {}, 60000); }");
        const helpers = computerHelpers(fake.tools, { PATH: "" });
        expect(await helpers.login("claude")).toMatchObject({ state: "waiting" });
        helpers.cancel("claude");
        expect(await helpers.login("claude")).toEqual({ state: "failed", why: "the sign-in to Claude Code just stopped is still ending: try again in a few seconds" });
        expect(fake.started().filter((one) => one.asked === "auth login")).toHaveLength(1);
        // Once it is gone, the next sign-in starts.
        await vi.waitFor(() => expect(fake.started().filter((one) => one.asked === "auth login" && alive(one.pid))).toEqual([]), { timeout: 8000 });
        await vi.waitFor(() => expect(signInRuns("claude")).toBe(false), { timeout: 8000 });
        expect(await helpers.login("claude")).toMatchObject({ state: "waiting" });
        helpers.cancel("claude");
        await vi.waitFor(() => expect(signInRuns("claude")).toBe(false), { timeout: 8000 });
    }, 30_000);
});

describe("one sign-in and one installation on this computer, whatever window of the engine asks", () => {
    const another = (): number => process.ppid;

    it("refuses a sign-in where another live process of the engine has one of that program under way, and starts nothing; the page reads it as under way elsewhere", async () => {
        const fake = fakeProgram("claude", "if (asked === 'auth status') { console.log(JSON.stringify({ loggedIn: false, authMethod: 'none' })); process.exitCode = 1; }");
        mkdirSync(join(fake.tools, "marks"), { recursive: true });
        writeFileSync(join(fake.tools, "marks", "login-claude"), String(another()));
        const helpers = computerHelpers(fake.tools, { PATH: "" });
        const login = await helpers.login("claude");
        expect(login).toEqual({ state: "failed", why: "a sign-in to Claude Code is already under way in another window of RPG Engine: finish it there, or close that window, then try again" });
        expect(fake.started().filter((one) => one.asked === "auth login")).toEqual([]);

        const keeper = accessKeeper({ helpers, changed: () => undefined });
        expect(keeper.signIn("claudeCode")).toBeUndefined();
        await vi.waitFor(() => expect(keeper.known("claudeCode")).toMatchObject({ signInCode: "elsewhere", signInWhy: login.state === "failed" ? login.why : "" }), { timeout: 5000 });
        expect(keeper.known("claudeCode")).not.toHaveProperty("signingIn");
    });

    it("never lets the mark of a process that is gone stop a sign-in, and lets its own go once it ended", async () => {
        const gone = spawnSync(process.execPath, ["-e", "process.stdout.write(String(process.pid))"], { encoding: "utf8" });
        const fake = fakeProgram("codex", "if (asked === 'login') { console.error('Go to https://auth.example/now'); }");
        mkdirSync(join(fake.tools, "marks"), { recursive: true });
        writeFileSync(join(fake.tools, "marks", "login-codex"), gone.stdout);
        const ended: HelperLogin[] = [];
        expect(await computerHelpers(fake.tools, { PATH: "" }).login("codex", (login) => ended.push(login))).toMatchObject({ state: "waiting" });
        await vi.waitFor(() => expect(ended).toEqual([{ state: "done" }]), { timeout: 5000 });
        expect(existsSync(join(fake.tools, "marks", "login-codex"))).toBe(false);
    });

    it("refuses an installation in the engine's folder where another live process of the engine has one under way, and starts no npm", async () => {
        const tools = makeTempFolder();
        mkdirSync(join(tools, "marks"));
        writeFileSync(join(tools, "marks", "install"), String(another()));
        const why = await computerHelpers(tools, { PATH: "" }).install("codex");
        expect(why).toBe("an installation is already under way in another window of RPG Engine: wait for it to end there, then try again");
        expect(existsSync(join(tools, "node_modules"))).toBe(false);
    });
});

describe("a program's status, asked of a fake one", () => {
    const claudeSays = (json: object, code = 0): string => `if (asked === 'auth status') { console.log(${JSON.stringify(JSON.stringify(json))}); process.exitCode = ${code}; }`;

    it("starts one program for a look, its status, and says how it stands only where it says so", async () => {
        const inside = fakeProgram("claude", claudeSays({ loggedIn: true, authMethod: "claude.ai" }));
        expect(await lookAtHelper("claude", inside.tools, { PATH: "" })).toBe("ready");
        expect(inside.started().map((one) => one.asked)).toEqual(["auth status"]);
        expect(await lookAtHelper("claude", fakeProgram("claude", claudeSays({ loggedIn: false, authMethod: "none" }, 1)).tools, { PATH: "" })).toBe("logged out");
        expect(await lookAtHelper("claude", fakeProgram("claude", claudeSays({ loggedIn: true, authMethod: "api_key" })).tools, { PATH: "" })).toBe("api key");
        expect(await lookAtHelper("codex", fakeProgram("codex", "console.error('Not logged in'); process.exitCode = 1;").tools, { PATH: "" })).toBe("logged out");
        expect(await lookAtHelper("codex", fakeProgram("codex", "console.error('Logged in using ChatGPT');").tools, { PATH: "" })).toBe("ready");
        expect(await lookAtHelper("claude", makeTempFolder(), { PATH: "" })).toBe("missing");
    });

    it("says nothing, never signed out, where the status cannot be read, fails, or takes too long", async () => {
        await expect(lookAtHelper("claude", fakeProgram("claude", "console.error('Error: something broke'); process.exitCode = 1;").tools, { PATH: "" })).rejects.toThrow("did not say how it stands");
        await expect(lookAtHelper("codex", fakeProgram("codex", "console.error('error: the network is down'); process.exitCode = 1;").tools, { PATH: "" })).rejects.toThrow("did not say how it stands");
        const slow = fakeProgram("claude", `setTimeout(() => console.log(${JSON.stringify(JSON.stringify({ loggedIn: true, authMethod: "claude.ai" }))}), 20000);`);
        const began = Date.now();
        await expect(lookAtHelper("claude", slow.tools, { PATH: "" }, 500)).rejects.toThrow("did not say how it stands");
        expect(Date.now() - began).toBeLessThan(5000);
        await vi.waitFor(() => expect(slow.started().filter((one) => alive(one.pid))).toEqual([]), { timeout: 5000 });
    });

    it("answers once the program ended, though a process it started still holds its output", async () => {
        const holder = "require('child_process').spawn(process.execPath, ['-e', 'setTimeout(() => {}, 20000)'], { detached: true, stdio: ['ignore', 'inherit', 'inherit'] }).unref();";
        const fake = fakeProgram("claude", `${holder} ${claudeSays({ loggedIn: true, authMethod: "claude.ai" })}`);
        const began = Date.now();
        expect(await lookAtHelper("claude", fake.tools, { PATH: "" })).toBe("ready");
        expect(Date.now() - began).toBeLessThan(8000);
    });

    it("asked the blocking way, keeps how the program stood when its status says nothing; only with nothing known reads it as signed out", async () => {
        const broken = "console.error('Error: the network is down'); process.exitCode = 1;";
        expect(helperState("codex", fakeProgram("codex", broken).tools, { PATH: "" }).state).toBe("logged out");
        expect(helperState("codex", fakeProgram("codex", "console.error('Logged in using ChatGPT');").tools, { PATH: "" }).state).toBe("ready");
        expect(helperState("codex", fakeProgram("codex", broken).tools, { PATH: "" }).state).toBe("ready");
        expect(helperState("codex", fakeProgram("codex", "console.error('Not logged in'); process.exitCode = 1;").tools, { PATH: "" }).state).toBe("logged out");
    });

    it("holds a chat's credential back only for a key, a token or a cloud provider of the program's own: a chat's other variables sign nobody in", () => {
        expect(heldBack("claude", { CLAUDECODE: "1", CLAUDE_CODE_ENTRYPOINT: "cli", CLAUDE_CODE_DISABLE_TELEMETRY: "1", CLAUDE_CONFIG_DIR: "/c", ANTHROPIC_MODEL: "opus" })).toBe(false);

        for (const variable of ["ANTHROPIC_API_KEY", "ANTHROPIC_AUTH_TOKEN", "CLAUDE_CODE_OAUTH_TOKEN", "CLAUDE_CODE_USE_BEDROCK", "claude_code_use_vertex", "CLAUDE_CODE_USE_FOUNDRY"]) {
            expect(heldBack("claude", { [variable]: "1" }), variable).toBe(true);
            expect(heldBack("claude", { [variable]: "" }), variable).toBe(false);
        }

        // Codex's app-server, with OPENAI_API_KEY and no account, says it needs one (Elena Galli, 2026-11-26): a Codex signed out is refused before it starts.
        expect(heldBack("codex", { OPENAI_API_KEY: "k" })).toBe(false);
        expect(heldBack("codex", { CODEX_API_KEY: "k" })).toBe(true);
        expect(heldBack("codex", { CODEX_HOME: "/c", ANTHROPIC_API_KEY: "k" })).toBe(false);
    });

    it("finds a program in a folder of the PATH without starting it", () => {
        const folder = makeTempFolder();
        const name = process.platform === "win32" ? "codex.cmd" : "codex";
        writeFileSync(join(folder, name), "", { mode: 0o755 });
        expect(helperLine("codex", makeTempFolder(), { PATH: folder, PATHEXT: ".EXE;.CMD" })).toBe("codex");
        expect(helperLine("claude", makeTempFolder(), { PATH: folder, PATHEXT: ".EXE;.CMD" })).toBeUndefined();
    });
});

/**
 * A fake program installed as npm would in a folder of the engine's, which runs `body` with `asked`, the words it was given; each start is written down,
 * with its pid and words.
 */
function fakeProgram(name: HelperName, body: string): { tools: string; started(): { pid: number; asked: string; }[]; }
{
    const tools = makeTempFolder();
    const place = name === "claude" ? join(tools, "node_modules", "@anthropic-ai", "claude-code") : join(tools, "node_modules", "@openai", "codex");
    const log = join(tools, "started.txt");
    mkdirSync(place, { recursive: true });
    writeFileSync(join(place, "package.json"), JSON.stringify({ bin: { [name]: "cli.js" } }));
    writeFileSync(
        join(place, "cli.js"),
        `const asked = process.argv.slice(2).join(' '); require('fs').appendFileSync(${JSON.stringify(log)}, JSON.stringify({ pid: process.pid, asked }) + '\\n');`
            + ` if (asked === '--version') { console.log('1.0.0'); } else { ${body} }`,
    );

    const started = (): { pid: number; asked: string; }[] => {
        try {
            return readFileSync(log, "utf8").trim().split("\n").filter((line) => line !== "").map((line) => JSON.parse(line) as { pid: number; asked: string; });
        } catch {
            return [];
        }
    };

    return { tools, started };
}

/** Whether a process runs. */
function alive(pid: number): boolean
{
    try {
        process.kill(pid, 0);
        return true;
    } catch {
        return false;
    }
}
