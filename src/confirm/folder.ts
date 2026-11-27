// A folder chosen by the player in a window of their operating system, as the launcher asks for one where a new campaign goes or an old one is. Its title
// and the folder it opens in come in the environment or as arguments, never inside a script.
import { type DialogCommand, plainText, runDialog } from "./confirm.ts";

/**
 * What the window gave: the folder chosen, undefined when the player cancelled, or a refusal where this system shows no such window: its words, and their
 * code with its values, for a page to say them in its own language; what the window's program said travels as it is, in the value `why`.
 */
export type ChosenFolder = string | undefined | { refused: string; code?: string; values?: Record<string, string>; };

/** What the window shows: its title, in the player's language, and the folder it opens in; the system's own where either is left out. */
export interface FolderAsked
{
    title?: string;
    start?: string;
}

/** Runs a window's program: how it ended and what it wrote, "missing" where it is not on this computer; a fake in tests. */
export type DialogRunner = (command: DialogCommand) => Promise<{ code: number | null; out: string; err?: string; } | "missing">;

/** The folder the player chooses in their system's own window, as `asked` says; `run` starts its program, a fake in tests. */
export async function chooseFolder(platform: string, env: Record<string, string | undefined>, asked: FolderAsked = {}, run: DialogRunner = runDialog): Promise<ChosenFolder>
{
    for (const command of folderCommands(platform, env, asked)) {
        const ran = await run(command);

        if (ran !== "missing") {
            return folderAnswer(command, ran);
        }
    }

    return noWindow(platform);
}

/** The programs that may show the window on this system, in turn: none on a Linux without a desktop. */
export function folderCommands(platform: string, env: Record<string, string | undefined>, asked: FolderAsked = {}): DialogCommand[]
{
    const title = plainText(asked.title ?? "", 120);
    const start = asked.start ?? "";

    if (platform === "win32") {
        // Hidden, so that no console window opens beside it; the script on its input, as long as it needs to be.
        const shell = `${env.SystemRoot ?? "C:\\Windows"}\\System32\\WindowsPowerShell\\v1.0\\powershell.exe`;
        return [{
            file: shell,
            args: ["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-Sta", "-Command", "-"],
            env: { RPG_FOLDER_TITLE: title, RPG_FOLDER_START: start },
            yes: { code: 0 },
            input: windowsScript,
            hidden: true,
        }];
    }

    if (platform === "darwin") {
        return [{ file: "/usr/bin/osascript", args: [...macScript.flatMap((line) => ["-e", line]), title, start], env: {}, yes: { code: 0 } }];
    }

    if ((env.DISPLAY ?? "") === "" && (env.WAYLAND_DISPLAY ?? "") === "") {
        return [];
    }

    // zenity opens in the folder of a path that ends with a slash.
    const zenityStart = start === "" ? [] : [`--filename=${start.endsWith("/") ? start : `${start}/`}`];
    return [
        { file: "zenity", args: ["--file-selection", "--directory", ...(title === "" ? [] : [`--title=${title}`]), ...zenityStart], env: {}, yes: { code: 0 } },
        { file: "kdialog", args: ["--getexistingdirectory", start === "" ? env.HOME ?? "." : start, ...(title === "" ? [] : ["--title", title])], env: {}, yes: { code: 0 } },
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

    if (cancelled) {
        return undefined;
    }

    // What the window's program said as it failed, where it said anything.
    const why = (ran.err ?? "").trim() === "" ? undefined : plainText(ran.err ?? "", 200);
    return {
        refused: `The window to choose a folder could not open${why === undefined ? "" : `: ${why}`}. Write the folder's path instead.`,
        code: "folder-window-failed",
        ...(why === undefined ? {} : { values: { why } }),
    };
}

function noWindow(platform: string): { refused: string; code: string; }
{
    return platform === "linux"
        ? { refused: "This computer has no window to choose a folder: install zenity or kdialog, or write the folder's path instead.", code: "folder-window-missing" }
        : { refused: "This computer shows no window to choose a folder: write the folder's path instead.", code: "folder-window-none" };
}

// Explorer's own window to choose a folder, through the shell's IFileOpenDialog. Its owner is an invisible window on top of the others, near the pointer:
// a hidden process's window would otherwise open behind the browser. The first window a process shows takes the hidden state it was started with, so the
// owner is shown hidden first. The folder it opens in is the one given, else its nearest parent that is there. It gives the path, or null for a cancel.
const folderWindow = `
using System;
using System.IO;
using System.Runtime.InteropServices;

namespace RpgEngine
{
    public static class FolderWindow
    {
        [ComImport, Guid("DC1C5A9C-E88A-4dde-A5A1-60F82A20AEF7")]
        class FileOpenDialog { }

        [ComImport, Guid("42f85136-db7e-439c-85f1-e4075d135fc8"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
        interface IFileDialog
        {
            [PreserveSig] int Show(IntPtr owner);
            void SetFileTypes(uint count, IntPtr types);
            void SetFileTypeIndex(uint index);
            void GetFileTypeIndex(out uint index);
            void Advise(IntPtr events, out uint cookie);
            void Unadvise(uint cookie);
            void SetOptions(uint options);
            void GetOptions(out uint options);
            void SetDefaultFolder(IShellItem item);
            void SetFolder(IShellItem item);
            void GetFolder(out IShellItem item);
            void GetCurrentSelection(out IShellItem item);
            void SetFileName([MarshalAs(UnmanagedType.LPWStr)] string name);
            void GetFileName([MarshalAs(UnmanagedType.LPWStr)] out string name);
            void SetTitle([MarshalAs(UnmanagedType.LPWStr)] string title);
            void SetOkButtonLabel([MarshalAs(UnmanagedType.LPWStr)] string label);
            void SetFileNameLabel([MarshalAs(UnmanagedType.LPWStr)] string label);
            void GetResult(out IShellItem item);
        }

        [ComImport, Guid("43826d1e-e718-42ee-bc55-a1e261c37bfe"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
        interface IShellItem
        {
            void BindToHandler(IntPtr context, ref Guid handler, ref Guid interfaceId, out IntPtr found);
            void GetParent(out IShellItem parent);
            void GetDisplayName(uint form, [MarshalAs(UnmanagedType.LPWStr)] out string name);
        }

        [StructLayout(LayoutKind.Sequential)]
        struct Point { public int X, Y; }

        [StructLayout(LayoutKind.Sequential)]
        struct Rect { public int Left, Top, Right, Bottom; }

        [StructLayout(LayoutKind.Sequential)]
        struct MonitorInfo { public int Size; public Rect Monitor; public Rect Work; public uint Flags; }

        [DllImport("shell32.dll", CharSet = CharSet.Unicode)] static extern int SHCreateItemFromParsingName(string path, IntPtr context, ref Guid interfaceId, out IShellItem item);
        [DllImport("user32.dll")] static extern IntPtr SetThreadDpiAwarenessContext(IntPtr context);
        [DllImport("user32.dll", CharSet = CharSet.Unicode)] static extern IntPtr CreateWindowEx(uint style, string className, string name, uint windowStyle, int left, int top, int width, int height, IntPtr parent, IntPtr menu, IntPtr instance, IntPtr parameter);
        [DllImport("user32.dll")] static extern bool DestroyWindow(IntPtr window);
        [DllImport("user32.dll")] static extern bool ShowWindow(IntPtr window, int show);
        [DllImport("user32.dll")] static extern bool SetForegroundWindow(IntPtr window);
        [DllImport("user32.dll")] static extern bool GetCursorPos(out Point point);
        [DllImport("user32.dll")] static extern IntPtr MonitorFromPoint(Point point, uint flags);
        [DllImport("user32.dll")] static extern bool GetMonitorInfo(IntPtr monitor, ref MonitorInfo info);

        const uint pickFolders = 0x20, forceFileSystem = 0x40, pathMustExist = 0x800;
        const uint fileSystemPath = 0x80058000;
        const int cancelled = unchecked((int)0x800704C7);
        const uint topMost = 0x8, toolWindow = 0x80, popup = 0x80000000;
        const uint nearestMonitor = 2;

        public static string Choose(string title, string start)
        {
            try
            {
                SetThreadDpiAwarenessContext(new IntPtr(-4));
            }
            catch (EntryPointNotFoundException)
            {
            }

            IntPtr owner = Owner();

            try
            {
                IFileDialog dialog = (IFileDialog)new FileOpenDialog();
                uint options;
                dialog.GetOptions(out options);
                dialog.SetOptions(options | pickFolders | forceFileSystem | pathMustExist);

                if (!String.IsNullOrEmpty(title)) dialog.SetTitle(title);

                IShellItem folder = Existing(start);

                if (folder != null) dialog.SetFolder(folder);

                int shown = dialog.Show(owner);

                if (shown == cancelled) return null;

                Marshal.ThrowExceptionForHR(shown);
                IShellItem chosen;
                dialog.GetResult(out chosen);
                string path;
                chosen.GetDisplayName(fileSystemPath, out path);
                return path;
            }
            finally
            {
                if (owner != IntPtr.Zero) DestroyWindow(owner);
            }
        }

        // An invisible window on top of the others, at the middle of the free room of the screen the pointer is on, shown hidden once.
        static IntPtr Owner()
        {
            Point pointer;
            GetCursorPos(out pointer);
            MonitorInfo monitor = new MonitorInfo();
            monitor.Size = Marshal.SizeOf(typeof(MonitorInfo));
            GetMonitorInfo(MonitorFromPoint(pointer, nearestMonitor), ref monitor);
            int left = (monitor.Work.Left + monitor.Work.Right) / 2, top = (monitor.Work.Top + monitor.Work.Bottom) / 3;
            IntPtr owner = CreateWindowEx(topMost | toolWindow, "STATIC", "", popup, left, top, 0, 0, IntPtr.Zero, IntPtr.Zero, IntPtr.Zero, IntPtr.Zero);

            if (owner != IntPtr.Zero)
            {
                ShowWindow(owner, 0);
                SetForegroundWindow(owner);
            }

            return owner;
        }

        // The folder given, else its nearest parent that is there; none where none is.
        static IShellItem Existing(string start)
        {
            string folder = String.IsNullOrEmpty(start) ? null : start;

            while (folder != null && !Directory.Exists(folder))
            {
                folder = Path.GetDirectoryName(folder);
            }

            if (folder == null) return null;

            Guid shellItem = typeof(IShellItem).GUID;
            IShellItem item;
            return SHCreateItemFromParsingName(folder, IntPtr.Zero, ref shellItem, out item) == 0 ? item : null;
        }
    }
}
`;

// Windows' own PowerShell, which every Windows has: none at all without a desktop to show the window on. The path in UTF-8 on one line, else 11 for a
// cancel. The script comes on the standard input, one block run once the empty line after it comes, and plain ASCII.
const windowsScript = `& {
if (-not [Environment]::UserInteractive) { exit 12 }
[Console]::OutputEncoding = [Text.Encoding]::UTF8
trap { [Console]::Error.WriteLine($_.Exception.Message); exit 1 }
$ErrorActionPreference = 'Stop'
Add-Type -TypeDefinition @'
${folderWindow}
'@
$chosen = [RpgEngine.FolderWindow]::Choose([string]$env:RPG_FOLDER_TITLE, [string]$env:RPG_FOLDER_START)
if ($null -eq $chosen) { exit 11 }
[Console]::Out.Write($chosen)
exit 0
}

`;

// macOS's AppleScript: the prompt and the folder it opens in as its arguments, each left to the system where it is empty; Escape ends it with -128.
const macScript = [
    "on run argv",
    "set {shownPrompt, startFolder} to {item 1 of argv, item 2 of argv}",
    'if startFolder is "" and shownPrompt is "" then return POSIX path of (choose folder)',
    'if startFolder is "" then return POSIX path of (choose folder with prompt shownPrompt)',
    'if shownPrompt is "" then return POSIX path of (choose folder default location (POSIX file startFolder))',
    "return POSIX path of (choose folder with prompt shownPrompt default location (POSIX file startFolder))",
    "end run",
];
