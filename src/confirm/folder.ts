// A folder chosen by the player in a window of their operating system, as the launcher asks for one where a new campaign goes or an old one is. Its title
// comes in the environment or as an argument, never inside the script.
import { type DialogCommand, plainText, runDialog } from "./confirm.ts";

/** What the window gave: the folder chosen, undefined when the player cancelled, or a refusal in words where this system shows no such window. */
export type ChosenFolder = string | undefined | { refused: string; };

/** Runs a window's program: how it ended and what it wrote, "missing" where it is not on this computer; a fake in tests. */
export type DialogRunner = (command: DialogCommand) => Promise<{ code: number | null; out: string; err?: string; } | "missing">;

// Windows' own PowerShell: the folder window of Windows Forms, its answer in UTF-8; none at all without a desktop to show it on.
const windowsScript = [
    "if (-not [Environment]::UserInteractive) { exit 12 }",
    "[Console]::OutputEncoding = [Text.Encoding]::UTF8",
    "Add-Type -AssemblyName System.Windows.Forms",
    "$dialog = New-Object System.Windows.Forms.FolderBrowserDialog",
    "$dialog.Description = $env:RPG_FOLDER_TITLE",
    "$dialog.ShowNewFolderButton = $true",
    "$owner = New-Object System.Windows.Forms.Form -Property @{ TopMost = $true }",
    "if ($dialog.ShowDialog($owner) -eq 'OK') { [Console]::Out.Write($dialog.SelectedPath); exit 0 } else { exit 11 }",
].join("; ");

// macOS's AppleScript: the prompt as its argument; Escape ends it with -128.
const macScript = ["on run argv", "return POSIX path of (choose folder with prompt (item 1 of argv))", "end run"];

/** The folder the player chooses in their system's own window, titled `title`; `run` starts its program, a fake in tests. */
export async function chooseFolder(platform: string, env: Record<string, string | undefined>, title: string, run: DialogRunner = runDialog): Promise<ChosenFolder>
{
    for (const command of folderCommands(platform, env, title)) {
        const ran = await run(command);

        if (ran !== "missing") {
            return folderAnswer(command, ran);
        }
    }

    return { refused: noWindow(platform) };
}

/** The programs that may show the window on this system, in turn: none on a Linux without a desktop. */
export function folderCommands(platform: string, env: Record<string, string | undefined>, title: string): DialogCommand[]
{
    const shown = plainText(title, 100);

    if (platform === "win32") {
        const shell = `${env.SystemRoot ?? "C:\\Windows"}\\System32\\WindowsPowerShell\\v1.0\\powershell.exe`;
        return [{ file: shell, args: ["-NoProfile", "-NonInteractive", "-STA", "-Command", windowsScript], env: { RPG_FOLDER_TITLE: shown }, yes: { code: 0 } }];
    }

    if (platform === "darwin") {
        return [{ file: "/usr/bin/osascript", args: [...macScript.flatMap((line) => ["-e", line]), shown], env: {}, yes: { code: 0 } }];
    }

    if ((env.DISPLAY ?? "") === "" && (env.WAYLAND_DISPLAY ?? "") === "") {
        return [];
    }

    return [
        { file: "zenity", args: ["--file-selection", "--directory", `--title=${shown}`], env: {}, yes: { code: 0 } },
        { file: "kdialog", args: ["--getexistingdirectory", env.HOME ?? ".", "--title", shown], env: {}, yes: { code: 0 } },
    ];
}

/** What a folder window said, from how its program ended: the folder, undefined for a cancel, or a refusal where no window was shown. */
export function folderAnswer(command: DialogCommand, ran: { code: number | null; out: string; err?: string; }): ChosenFolder
{
    const folder = ran.out.replace(/[\r\n]+$/, "");

    if (ran.code === 0 && folder.trim() !== "") {
        // macOS ends a folder's path with a slash; the root keeps its own.
        return folder.length > 1 ? folder.replace(/\/$/, "") : folder;
    }

    const windows = command.file.toLowerCase().endsWith("powershell.exe");
    const mac = command.file.endsWith("osascript");
    const cancelled = windows ? ran.code === 11 : mac ? (ran.err ?? "").includes("(-128)") : ran.code === 1;
    return cancelled ? undefined : { refused: `The window to choose a folder could not open${(ran.err ?? "").trim() === "" ? "" : `: ${plainText(ran.err ?? "", 200)}`}. Write the folder's path instead.` };
}

function noWindow(platform: string): string
{
    return platform === "linux"
        ? "This computer has no window to choose a folder: install zenity or kdialog, or write the folder's path instead."
        : "This computer shows no window to choose a folder: write the folder's path instead.";
}
