// The guard of test/setup.ts: an AI host's real program is refused, in the tests and in the engine's own modules; a fake one in a temporary folder is not.
import { spawnSync } from "node:child_process";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { startLogin } from "../src/helpers/programs.ts";
import { realHostIn, takeRefused } from "./no-real-hosts.ts";
import { makeTempFolder } from "./support.ts";

describe("no test starts an AI host's real program", () => {
    it("knows the hosts' programs by name or by package, outside the temporary folder", () => {
        const fake = join(makeTempFolder(), "node_modules", "@anthropic-ai", "claude-code", "cli.js");

        for (const line of ["claude --version", "claude.exe auth status", '"C:/Users/someone/.local/bin/claude.exe" auth status', "codex login status", "agy acp", "opencode serve"]) {
            expect(realHostIn(line), line).toBe(line);
        }

        expect(realHostIn(process.execPath, ["C:/nvm/node_modules/@openai/codex/bin/codex.js", "app-server"])).toBeDefined();
        expect(realHostIn('npm install --prefix "C:/tools" @anthropic-ai/claude-code --no-audit')).toBeDefined();
        expect(realHostIn(`"${process.execPath}" "${fake}" auth status`)).toBeUndefined();
        expect(realHostIn(process.execPath, ["cli.ts", "--listen", "opencode"])).toBeUndefined();
        expect(realHostIn("claude-program", ["--first"])).toBeUndefined();
    });

    it("refuses one started by a test or by the engine, and tells it", () => {
        expect(() => spawnSync("C:/nowhere/claude.exe", ["--version"])).toThrow("A test started an AI host's real program");
        expect(() => startLogin("codex", "C:/nowhere/codex.cmd")).toThrow("A test started an AI host's real program");
        expect(takeRefused()).toEqual(["C:/nowhere/claude.exe --version", "C:/nowhere/codex.cmd login"]);
    });
});
