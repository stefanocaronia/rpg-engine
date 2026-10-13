// Codex makes the pictures (D-308): only when the player is logged in with ChatGPT, never with an API key, which pays by the picture. It runs in an empty folder of
// its own, so that it never reads the campaign; the picture it makes stays in its own folder, from which the engine takes it. Three minutes at most; a refusal is
// never tried again, as it costs all the same.
import { spawn } from "node:child_process";
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { join } from "node:path";
import type { MadePicture, PictureMaker, PicturesReady, PictureSubject, TextWriter } from "../core/context.ts";
import { paintedBrief } from "./briefs.ts";
import { helperChanges, helperEnvironment, helperState } from "./helpers.ts";
import { stopTree } from "./stop.ts";

// How long a picture may take before the engine gives it up (D-308): the probe's took 31 to 45 seconds.
const longest = 3 * 60 * 1000;

/** Why Codex makes no pictures, for the master, and how the player has them, which the dashboard writes in its language (D-308). */
export const codexSays = {
    missing: {
        why: "Codex is not installed on this computer",
        fix: "Pictures need Codex, which is not on this computer yet. To have them:\n"
            + "1. Open a terminal: on Windows, Start, then type Terminal.\n"
            + "2. Paste `npm install -g @openai/codex` and press Enter.\n"
            + "3. Paste `codex login` and sign in with your ChatGPT account in the browser that opens.\n"
            + "Codex makes them with your ChatGPT plan, never paying by the picture.",
    },
    loggedOut: {
        why: "Codex is not logged in on this computer: the player logs in with codex login",
        fix: "Codex is on this computer but not logged in. To have pictures:\n"
            + "1. Open a terminal: on Windows, Start, then type Terminal.\n"
            + "2. Paste `codex login` and sign in with your ChatGPT account in the browser that opens.\n"
            + "Codex makes them with your ChatGPT plan, never paying by the picture.",
    },
    apiKey: {
        why: "Codex uses an API key, which pays by the picture: pictures are made only with the ChatGPT login",
        fix: "Codex on this computer pays for each picture with an API key, which the engine never uses. To make them with your ChatGPT plan instead:\n"
            + "1. Open a terminal: on Windows, Start, then type Terminal.\n"
            + "2. Paste `codex login` and sign in with your ChatGPT account in the browser that opens.",
    },
};

// How Codex is started, as the last look found it: by name on the PATH, or by its full path in the engine's folder (D-425).
let codex = "codex";

/** Codex on this computer, as the player's ChatGPT login lets it make pictures. */
export function codexPictures(): PictureMaker
{
    let known: { said: PicturesReady; at: number; changes: number; } | undefined;
    return {
        // Asked once; a no again after a minute, only where the player may be waiting for it, as Settings and image: never on every call of the master; and
        // again at once after a program came ready here, as after the player signs in (D-424).
        ready: (again) => {
            const late = again === true && Date.now() - (known?.at ?? 0) > 60_000;

            if (known === undefined || (!known.said.ready && (late || known.changes !== helperChanges()))) {
                known = { said: codexReady(), at: Date.now(), changes: helperChanges() };
            }

            return known.said;
        },
        make,
    };
}

/** Codex on this computer as a writer of text (D-406): ready where its ChatGPT login makes pictures too. */
export function codexWriter(maker: PictureMaker = codexPictures()): TextWriter
{
    return { ready: () => maker.ready().ready, write };
}

/** Whether Codex is there and logged in with ChatGPT: asked in about a second, without spending anything. */
function codexReady(): PicturesReady
{
    const { state, line } = helperState("codex");
    codex = line ?? "codex";

    if (state === "missing") {
        return { ready: false, ...codexSays.missing };
    }

    if (state === "logged out") {
        return { ready: false, ...codexSays.loggedOut };
    }

    return state === "ready" ? { ready: true, maker: "Codex" } : { ready: false, ...codexSays.apiKey };
}

/** One picture: Codex in an empty folder of its own, the painted brief on its input, its events read for its thread; the picture from its own folder. */
function make(subject: PictureSubject): Promise<MadePicture | { refused: string; }>
{
    const folder = mkdtempSync(join(tmpdir(), "rpg-picture-"));
    const last = join(folder, "last.txt");
    const line = `${codex} exec --ephemeral --skip-git-repo-check -s read-only -C "${folder}" --json -o "${last}" --ignore-user-config --ignore-rules -c model_reasoning_effort="low" -`;

    return new Promise((done) => {
        const child = spawn(line, { shell: true, windowsHide: true, cwd: folder, env: helperEnvironment("codex"), stdio: ["pipe", "pipe", "pipe"] });
        let output = "";
        let errors = "";
        const timer = setTimeout(() => stopTree(child), longest);
        child.stdout.on("data", (chunk: Buffer) => (output += chunk.toString()));
        child.stderr.on("data", (chunk: Buffer) => (errors += chunk.toString()));
        child.stdin.on("error", () => undefined);
        child.on("error", () => undefined);
        child.on("close", () => {
            clearTimeout(timer);
            const events = output.split("\n").flatMap((line): Record<string, unknown>[] => {
                try {
                    return [JSON.parse(line) as Record<string, unknown>];
                } catch {
                    return [];
                }
            });
            const thread = events.find((event) => event.type === "thread.started")?.thread_id;
            const pictures = typeof thread === "string" ? join(process.env.CODEX_HOME ?? join(homedir(), ".codex"), "generated_images", thread) : undefined;
            const file = pictures === undefined || !existsSync(pictures) ? undefined : readdirSync(pictures).find((name) => name.toLowerCase().endsWith(".png"));

            const clean = (): void => {
                rmSync(folder, { recursive: true, force: true });

                if (pictures !== undefined) {
                    rmSync(pictures, { recursive: true, force: true });
                }
            };

            if (pictures !== undefined && file !== undefined) {
                done({ file: join(pictures, file), done: clean });
                return;
            }

            const failed = events.find((event) => event.type === "turn.failed");
            const said = existsSync(last) ? lastLine(last) : "";
            clean();
            done({ refused: refusal(errors, failed, said) });
        });
        child.stdin.end(paintedBrief(subject));
    });
}

/** Codex's answer to a brief, in an empty folder of its own, as its last message; none when it gave none in time. */
function write(brief: string): Promise<string | undefined>
{
    const folder = mkdtempSync(join(tmpdir(), "rpg-writing-"));
    const last = join(folder, "last.txt");
    const line = `${codex} exec --ephemeral --skip-git-repo-check -s read-only -C "${folder}" -o "${last}" --ignore-user-config --ignore-rules -c model_reasoning_effort="low" -`;

    return new Promise((done) => {
        const child = spawn(line, { shell: true, windowsHide: true, cwd: folder, env: helperEnvironment("codex"), stdio: ["pipe", "ignore", "ignore"] });
        const timer = setTimeout(() => stopTree(child), longest);
        child.stdin.on("error", () => undefined);
        child.on("error", () => undefined);
        child.on("close", () => {
            clearTimeout(timer);
            const said = existsSync(last) ? readFileSync(last, "utf8").trim() : "";
            rmSync(folder, { recursive: true, force: true });
            done(said === "" ? undefined : said);
        });
        child.stdin.end(brief);
    });
}

/** Why no picture came: the generator's safety check, a failed turn, what Codex said, or the time that ran out. */
function refusal(errors: string, failed: Record<string, unknown> | undefined, said: string): string
{
    if (/moderation_blocked/.test(errors)) {
        return "the generator's safety check refused it: describe the place, never a victim or wounds";
    }

    if (failed !== undefined) {
        const error = failed.error as { message?: unknown; } | undefined;
        return `Codex failed: ${String(error?.message ?? "no reason given")}`;
    }

    return said === "" ? "no picture came in three minutes" : `Codex said: ${said}`;
}

/** The last line Codex wrote as its answer; nothing when it wrote none. */
function lastLine(file: string): string
{
    try {
        return readFileSync(file, "utf8").trim().split("\n").at(-1)?.trim() ?? "";
    } catch {
        return "";
    }
}
