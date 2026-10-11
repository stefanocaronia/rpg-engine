// Claude draws the pictures as SVG where Codex cannot make them (D-342, D-390): Claude Code on the player's computer, only logged in with their Claude plan,
// never with an API key, which pays by the call. It runs in an empty folder of its own, without tools, settings, memory or a session kept; the SVG it answers
// is cleaned before the engine takes it. Three minutes at most; a refusal is never tried again.
import { spawn, spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { MadePicture, PictureMaker, PicturesReady, PictureSubject } from "../core/context.ts";
import { svgBrief } from "./briefs.ts";
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
        const timer = setTimeout(() => child.kill(), longest);
        child.stdout.on("data", (chunk: Buffer) => (output += chunk.toString()));
        child.stderr.on("data", () => undefined);
        child.on("error", () => undefined);
        child.on("close", () => {
            clearTimeout(timer);
            const answer = parsed(output);
            const svg = answer?.is_error === true || typeof answer?.result !== "string" ? undefined : cleanSvg(svgIn(answer.result) ?? "");

            if (svg === undefined) {
                clean();
                done({ refused: answer === undefined ? "no picture came in three minutes" : `Claude ${answer.is_error === true ? `failed: ${String(answer.result)}` : "drew no picture that could be used"}` });
                return;
            }

            const file = join(folder, "picture.svg");
            writeFileSync(file, svg);
            done({ file, done: clean });
        });
        child.stdin.end(svgBrief(subject));
    });
}

/** The environment of the drawing Claude: the chat's own variables taken away, its login kept on disk. */
function childEnvironment(): NodeJS.ProcessEnv
{
    return Object.fromEntries(Object.entries(process.env).filter(([name]) => !/^(CLAUDE|ANTHROPIC)/i.test(name)));
}

function parsed(output: string): { is_error?: unknown; result?: unknown; } | undefined
{
    try {
        return JSON.parse(output) as { is_error?: unknown; result?: unknown; };
    } catch {
        return undefined;
    }
}
