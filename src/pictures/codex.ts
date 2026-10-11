// Codex makes the pictures (D-308): only when the player is logged in with ChatGPT, never with an API key, which pays by the picture. It runs in an empty folder of
// its own, so that it never reads the campaign; the picture it makes stays in its own folder, from which the engine takes it. Three minutes at most; a refusal is
// never tried again, as it costs all the same.
import { spawn, spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { join } from "node:path";
import type { MadePicture, PictureMaker, PicturesReady } from "../core/context.ts";

// How long a picture may take before the engine gives it up (D-308): the probe's took 31 to 45 seconds.
const longest = 3 * 60 * 1000;

/** Codex on this computer, as the player's ChatGPT login lets it make pictures. */
export function codexPictures(): PictureMaker
{
    let known: { said: PicturesReady; at: number; } | undefined;
    return {
        // Asked once; a no again after a minute, as after the player logs in.
        ready: () => {
            if (known === undefined || (!known.said.ready && Date.now() - known.at > 60_000)) {
                known = { said: codexReady(), at: Date.now() };
            }

            return known.said;
        },
        make,
    };
}

/** Whether Codex is there and logged in with ChatGPT: asked in about a second, without spending anything. */
function codexReady(): PicturesReady
{
    // One line for the shell, which finds codex as npm installed it, a script on Windows; its version answers only where it is, in any language of the shell.
    const version = spawnSync("codex --version", { shell: true, encoding: "utf8", timeout: 15_000, windowsHide: true });
    const status = version.error === undefined && version.status === 0 ? spawnSync("codex login status", { shell: true, encoding: "utf8", timeout: 15_000, windowsHide: true }) : undefined;
    const said = `${status?.stdout ?? ""}${status?.stderr ?? ""}`;

    if (status === undefined) {
        return {
            ready: false,
            why: "Codex is not installed on this computer",
            fix: "Codex is not on this computer: to have pictures, install it (npm install -g @openai/codex), then run codex login in a terminal with your ChatGPT account.",
        };
    }

    if (status.error !== undefined || status.status !== 0 || /not logged in/i.test(said)) {
        return {
            ready: false,
            why: "Codex is not logged in on this computer: the player logs in with codex login",
            fix: "Codex is not logged in on this computer: to have pictures, run codex login in a terminal with your ChatGPT account.",
        };
    }

    return /chatgpt/i.test(said) ? { ready: true } : {
        ready: false,
        why: "Codex uses an API key, which pays by the picture: pictures are made only with the ChatGPT login",
        fix: "Codex here uses an API key, which pays by the picture: to have pictures, run codex login in a terminal with your ChatGPT account.",
    };
}

/** One picture from a brief: Codex in an empty folder of its own, the brief on its input, its events read for its thread; the picture from its own folder. */
function make(brief: string): Promise<MadePicture | { refused: string; }>
{
    const folder = mkdtempSync(join(tmpdir(), "rpg-picture-"));
    const last = join(folder, "last.txt");
    const line = `codex exec --ephemeral --skip-git-repo-check -s read-only -C "${folder}" --json -o "${last}" --ignore-user-config --ignore-rules -c model_reasoning_effort="low" -`;

    return new Promise((done) => {
        const child = spawn(line, { shell: true, windowsHide: true, stdio: ["pipe", "pipe", "pipe"] });
        let output = "";
        let errors = "";
        const timer = setTimeout(() => child.kill(), longest);
        child.stdout.on("data", (chunk: Buffer) => (output += chunk.toString()));
        child.stderr.on("data", (chunk: Buffer) => (errors += chunk.toString()));
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
