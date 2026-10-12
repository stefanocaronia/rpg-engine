// Claude draws the pictures as SVG where Codex cannot (D-342, D-390): Claude Code with the player's Claude login, never an API key, in an empty folder of its
// own without tools, settings, memory or a session kept; its SVG cleaned before the engine takes it. Three minutes at most; a refusal never tried again.
import { spawn, spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { MadePicture, PictureMaker, PicturesReady, PictureSubject } from "../core/context.ts";
import { svgBrief } from "./briefs.ts";
import { stopTree } from "./stop.ts";
import { cleanSvg, svgIn } from "./svg.ts";

// How long a picture may take before the engine gives it up: the probe's took 18 to 74 seconds.
const longest = 3 * 60 * 1000;

// Claude Code without the chat's own settings, tools, memory or session: only the brief, and the SVG as its answer (Elena's probe, 12 October).
const drawing = `claude -p --model sonnet --effort low --output-format json --tools "" --setting-sources "" --strict-mcp-config --no-session-persistence `
    + `--disable-slash-commands --max-budget-usd 0.5 --system-prompt "You draw pictures as SVG code from a brief. You reply with the SVG alone."`;

/** Claude Code on this computer, as the player's Claude login lets it draw pictures. */
export function claudePictures(): PictureMaker
{
    let known: { said: PicturesReady; at: number; } | undefined;
    return {
        ready: (again) => {
            if (known === undefined || (again === true && !known.said.ready && Date.now() - known.at > 60_000)) {
                known = { said: claudeReady(), at: Date.now() };
            }

            return known.said;
        },
        make,
    };
}

/** Whether Claude Code is there and logged in with the player's Claude plan: asked in a moment, without spending anything. */
function claudeReady(): PicturesReady
{
    const status = spawnSync("claude auth status", { shell: true, encoding: "utf8", timeout: 15_000, windowsHide: true, env: childEnvironment() });
    let said: { loggedIn?: unknown; authMethod?: unknown; } = {};

    try {
        said = JSON.parse(status.stdout ?? "") as typeof said;
    } catch {
        said = {};
    }

    if (status.error !== undefined || said.loggedIn !== true) {
        return { ready: false, why: "Claude Code is not logged in on this computer" };
    }

    return said.authMethod === "claude.ai"
        ? { ready: true, maker: "Claude" }
        : { ready: false, why: "Claude Code uses an API key, which pays by the call: pictures are drawn only with the Claude login" };
}

/** One SVG picture: Claude Code in an empty folder of its own, the brief on its input, its answer read, cleaned and written there. */
function make(subject: PictureSubject): Promise<MadePicture | { refused: string; }>
{
    const folder = mkdtempSync(join(tmpdir(), "rpg-picture-"));
    const clean = (): void => rmSync(folder, { recursive: true, force: true });

    return new Promise((done) => {
        const child = spawn(drawing, { shell: true, windowsHide: true, cwd: folder, env: childEnvironment(), stdio: ["pipe", "pipe", "pipe"] });
        let output = "";
        let errors = "";
        let settled = false;

        // Out of time, the drawing goes whole and the answer is given at once; what comes after counts for nothing.
        const timer = setTimeout(() => {
            settled = true;
            stopTree(child);
            clean();
            done({ refused: "no picture came in three minutes" });
        }, longest);

        child.stdout.setEncoding("utf8");
        child.stderr.setEncoding("utf8");
        child.stdout.on("data", (chunk: string) => (output += chunk));
        child.stderr.on("data", (chunk: string) => (errors += chunk));
        child.stdin.on("error", () => undefined);
        child.on("error", () => undefined);
        child.on("close", () => {
            clearTimeout(timer);

            if (settled) {
                return;
            }

            const answer = parsed(output);
            const svg = answer?.is_error === true || typeof answer?.result !== "string" ? undefined : cleanSvg(svgIn(answer.result) ?? "");

            if (svg === undefined) {
                clean();
                done({ refused: refusal(answer, errors) });
                return;
            }

            const file = join(folder, "picture.svg");
            writeFileSync(file, svg);
            done({ file, done: clean });
        });
        child.stdin.end(svgBrief(subject));
    });
}

/** Why no picture came: Claude's own error, a drawing that could not be used, or what Claude Code said as it stopped. */
function refusal(answer: { is_error?: unknown; result?: unknown; } | undefined, errors: string): string
{
    if (answer === undefined) {
        const said = errors.trim().split("\n").at(-1)?.trim() ?? "";
        return said === "" ? "Claude Code stopped without an answer" : `Claude Code said: ${said}`;
    }

    return answer.is_error === true ? `Claude failed: ${String(answer.result)}` : "Claude drew no picture that could be used";
}

/** The environment of the drawing Claude: the chat's own variables and any API key taken away; where its login and its shell are, kept. */
function childEnvironment(): NodeJS.ProcessEnv
{
    const kept = new Set(["CLAUDE_CONFIG_DIR", "CLAUDE_CODE_GIT_BASH_PATH"]);
    return Object.fromEntries(Object.entries(process.env).filter(([name]) => kept.has(name.toUpperCase()) || !/^(CLAUDE|ANTHROPIC)/i.test(name)));
}

function parsed(output: string): { is_error?: unknown; result?: unknown; } | undefined
{
    try {
        return JSON.parse(output) as { is_error?: unknown; result?: unknown; };
    } catch {
        return undefined;
    }
}
