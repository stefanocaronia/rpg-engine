import { spawn } from "node:child_process";
import type { Confirm, Confirmed } from "../core/context.ts";

/** A program that shows the window: its file, its arguments, and what it reads from the environment; how its exit reads. */
export interface DialogCommand
{
    file: string;
    args: string[];
    env: Record<string, string>;
    /** How this program says yes: an exit code, or what it writes. */
    yes: { code?: number; out?: string; };
}

// The longest text a window shows: what the package says of itself is cut there.
const mostText = 600;
// How long the window waits, as a form does.
const longestWait = 30 * 60 * 1000;
// The buttons of a window that asks nothing else: a package's install (D-478).
const installAnswers = { yes: "Install", no: "Do not install" };

// Windows' own PowerShell: a message box, No first, on top of the other windows; none at all without a desktop to show it on.
const windowsScript = [
    "if (-not [Environment]::UserInteractive) { exit 12 }",
    "Add-Type -AssemblyName System.Windows.Forms",
    "$answer = [System.Windows.Forms.MessageBox]::Show($env:RPG_CONFIRM_TEXT, $env:RPG_CONFIRM_TITLE, 'YesNo', 'Warning', 'Button2', 'DefaultDesktopOnly')",
    "if ($answer -eq 'Yes') { exit 10 } else { exit 11 }",
].join("; ");

// macOS's AppleScript: the title, the text and the buttons as its arguments, the no first and the answer to Escape.
const macScript = [
    "on run argv",
    "display dialog (item 2 of argv) with title (item 1 of argv) buttons {item 3 of argv, item 4 of argv} default button (item 3 of argv) cancel button (item 3 of argv) with icon caution",
    'return "yes"',
    "end run",
];

/**
 * The window of the player's operating system (D-478): it asks, and says yes, no, or none when no window can be shown, as over SSH. `run` starts a program; a
 * fake in tests.
 */
export function systemConfirm(platform: string, env: Record<string, string | undefined>, run = runDialog): Confirm
{
    return {
        ask: async (title, text, signal, answers) => {
            // A call stopped before the window: nothing is asked, so no yes can come after the stop.
            if (signal?.aborted === true) {
                return "none";
            }

            for (const command of dialogCommands(platform, env, title, text, answers)) {
                const ran = await run(command, signal);

                if (ran !== "missing") {
                    return dialogAnswer(command, ran);
                }
            }

            return "none";
        },
    };
}

/** The programs that may show the window on this system, in turn, with its buttons, Windows' own Yes and No: none without a desktop (D-478). */
export function dialogCommands(platform: string, env: Record<string, string | undefined>, title: string, text: string, answers = installAnswers): DialogCommand[]
{
    const [shownTitle, shownText] = [plainText(title, 100), plainText(text, mostText)];
    const [yes, no] = [plainText(answers.yes, 40), plainText(answers.no, 40)];

    if (platform === "win32") {
        const shell = `${env.SystemRoot ?? "C:\\Windows"}\\System32\\WindowsPowerShell\\v1.0\\powershell.exe`;
        return [{ file: shell, args: ["-NoProfile", "-NonInteractive", "-Command", windowsScript], env: { RPG_CONFIRM_TITLE: shownTitle, RPG_CONFIRM_TEXT: shownText }, yes: { code: 10 } }];
    }

    if (platform === "darwin") {
        return [{ file: "/usr/bin/osascript", args: [...macScript.flatMap((line) => ["-e", line]), shownTitle, shownText, no, yes], env: {}, yes: { out: "yes" } }];
    }

    if ((env.DISPLAY ?? "") === "" && (env.WAYLAND_DISPLAY ?? "") === "") {
        return [];
    }

    return [
        { file: "zenity", args: ["--question", "--default-cancel", "--no-markup", `--title=${shownTitle}`, `--text=${shownText}`, `--ok-label=${yes}`, `--cancel-label=${no}`], env: {}, yes: { code: 0 } },
        { file: "kdialog", args: ["--title", shownTitle, "--warningyesno", shownText, "--yes-label", yes, "--no-label", no], env: {}, yes: { code: 0 } },
    ];
}

/** What a window said, from how its program ended: yes, no, or none when it could not show one. */
export function dialogAnswer(command: DialogCommand, ran: { code: number | null; out: string; err?: string; }): Confirmed
{
    const said = command.yes.out === undefined ? ran.code === command.yes.code : ran.out.trim() === command.yes.out && ran.code === 0;

    if (said) {
        return "yes";
    }

    // macOS's script ends with -128 when the player turns it down; any other error is a window never shown, as with no desktop.
    if (command.yes.out !== undefined && ran.code !== 0) {
        return (ran.err ?? "").includes("(-128)") ? "no" : "none";
    }

    // Windows' script says when there is no desktop; anything else that ended is the player's no, or the window closed.
    return command.yes.code === 10 && ran.code !== 11 ? "none" : "no";
}

/** A package's own words as a window shows them: no control or direction characters, which could hide or turn what it says, and no longer than `most`. */
export function plainText(text: string, most: number): string
{
    const plain = text.replace(/[\u0000-\u0008\u000b-\u001f\u007f\u202a-\u202e\u2066-\u2069]/g, "").trim();
    return plain.length <= most ? plain : `${plain.slice(0, most - 1)}…`;
}

/** Runs a window's program: how it ended and what it wrote; "missing" when it is not on this computer. Closed when the call is stopped, or after half an hour. */
function runDialog(command: DialogCommand, signal?: AbortSignal): Promise<{ code: number | null; out: string; err?: string; } | "missing">
{
    return new Promise((done) => {
        const child = spawn(command.file, command.args, { env: { ...process.env, ...command.env }, stdio: ["ignore", "pipe", "pipe"], windowsHide: false });
        let [out, err] = ["", ""];

        const stop = (): void => {
            child.kill();
        };

        const timer = setTimeout(stop, longestWait);
        signal?.addEventListener("abort", stop, { once: true });
        child.stdout.setEncoding("utf8");
        child.stdout.on("data", (chunk: string) => (out += chunk));
        child.stderr.setEncoding("utf8");
        child.stderr.on("data", (chunk: string) => (err += chunk));
        child.on("error", (error: NodeJS.ErrnoException) => {
            clearTimeout(timer);
            done(error.code === "ENOENT" ? "missing" : { code: null, out, err });
        });
        child.on("close", (code) => {
            clearTimeout(timer);
            signal?.removeEventListener("abort", stop);
            done({ code, out, err });
        });
    });
}
