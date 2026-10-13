// Claude draws the pictures as SVG where Codex cannot (D-342, D-390): Claude Code with the player's Claude login, never an API key, in an empty folder of its
// own without tools, settings, memory or a session kept; its SVG cleaned before the engine takes it. Three minutes at most; a refusal never tried again.
import { spawn } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { MadePicture, PictureMaker, PicturesReady, PictureSubject, TextWriter } from "../core/context.ts";
import { svgBrief } from "./briefs.ts";
import { helperChanges, helperEnvironment, helperState } from "./helpers.ts";
import { stopTree } from "./stop.ts";
import { cleanSvg, svgIn } from "./svg.ts";

// How long a picture may take before the engine gives it up: the probe's took 18 to 74 seconds.
const longest = 3 * 60 * 1000;

// Claude Code without the chat's own settings, tools, memory or session: only the brief, and the SVG as its answer (Elena's probe, 12 October).
const drawing = (claude: string): string =>
    `${claude} -p --model sonnet --effort low --output-format json --tools "" --setting-sources "" --strict-mcp-config --no-session-persistence `
    + `--disable-slash-commands --max-budget-usd 0.5 --system-prompt "You draw pictures as SVG code from a brief. You reply with the SVG alone."`;

// Claude Code as a writer of text (D-406): Sonnet at low effort, with nothing but the brief.
const writing = (claude: string): string =>
    `${claude} -p --model sonnet --effort low --output-format json --tools "" --setting-sources "" --strict-mcp-config --no-session-persistence `
    + `--disable-slash-commands --max-budget-usd 0.5 --system-prompt "You write what a brief asks, and only that."`;

/** Claude Code on this computer as a writer of text (D-406): ready where the player's Claude login lets it draw too. */
export function claudeWriter(maker: PictureMaker = claudePictures()): TextWriter
{
    return { ready: () => maker.ready().ready, write };
}

/** Why Claude draws no pictures, for the master and the player (D-390). */
export const claudeSays = {
    loggedOut: { why: "Claude Code is not logged in on this computer" },
    apiKey: { why: "Claude Code uses an API key, which pays by the call: pictures are drawn only with the Claude login" },
};

// How Claude Code is started, as the last look found it: by name on the PATH, or by its full path in the engine's folder (D-425).
let claude = "claude";

/** Claude Code on this computer, as the player's Claude login lets it draw pictures. */
export function claudePictures(): PictureMaker
{
    let known: { said: PicturesReady; at: number; changes: number; } | undefined;
    return {
        ready: (again) => {
            const late = again === true && Date.now() - (known?.at ?? 0) > 60_000;

            if (known === undefined || (!known.said.ready && (late || known.changes !== helperChanges()))) {
                known = { said: claudeReady(), at: Date.now(), changes: helperChanges() };
            }

            return known.said;
        },
        make,
    };
}

/** Whether Claude Code is there and logged in with the player's Claude plan: asked in a moment, without spending anything. */
function claudeReady(): PicturesReady
{
    const { state, line } = helperState("claude");
    claude = line ?? "claude";

    if (state === "missing" || state === "logged out") {
        return { ready: false, ...claudeSays.loggedOut };
    }

    return state === "ready" ? { ready: true, maker: "Claude" } : { ready: false, ...claudeSays.apiKey };
}

/** One SVG picture: Claude Code in an empty folder of its own, the brief on its input, its answer read, cleaned and written there. */
function make(subject: PictureSubject): Promise<MadePicture | { refused: string; }>
{
    const folder = mkdtempSync(join(tmpdir(), "rpg-picture-"));
    const clean = (): void => rmSync(folder, { recursive: true, force: true });

    return new Promise((done) => {
        const child = spawn(drawing(claude), { shell: true, windowsHide: true, cwd: folder, env: helperEnvironment("claude"), stdio: ["pipe", "pipe", "pipe"] });
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

/** Claude's answer to a brief, in an empty folder of its own; none when it failed or gave none in time. */
function write(brief: string): Promise<string | undefined>
{
    const folder = mkdtempSync(join(tmpdir(), "rpg-writing-"));

    return new Promise((done) => {
        const child = spawn(writing(claude), { shell: true, windowsHide: true, cwd: folder, env: helperEnvironment("claude"), stdio: ["pipe", "pipe", "ignore"] });
        let output = "";
        const timer = setTimeout(() => stopTree(child), longest);
        child.stdout.setEncoding("utf8");
        child.stdout.on("data", (chunk: string) => (output += chunk));
        child.stdin.on("error", () => undefined);
        child.on("error", () => undefined);
        child.on("close", () => {
            clearTimeout(timer);
            rmSync(folder, { recursive: true, force: true });
            const answer = parsed(output);
            done(answer?.is_error === true || typeof answer?.result !== "string" ? undefined : answer.result);
        });
        child.stdin.end(brief);
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

function parsed(output: string): { is_error?: unknown; result?: unknown; } | undefined
{
    try {
        return JSON.parse(output) as { is_error?: unknown; result?: unknown; };
    } catch {
        return undefined;
    }
}
