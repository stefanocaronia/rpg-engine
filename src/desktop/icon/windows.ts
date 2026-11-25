// The icon on Windows: a shortcut on the desktop and in the Start menu, made by PowerShell, the only tool every Windows has for it, through the shell's own
// IShellLinkW, which keeps every letter of a path, where WScript.Shell keeps only those of the system's code page. It runs Node through
// `conhost --headless`, the one way found that opens no console window.
import { execFile } from "node:child_process";
import { win32 } from "node:path";
import type { IconCommand, IconPlaces } from "./index.ts";

// Compiling the shortcut's few lines of C# takes PowerShell a few seconds; a minute is more than any computer needs.
const powerShellWait = 60_000;

/** Makes the shortcuts, on the desktop and in the Start menu as Windows names them for this user, or in `places`: their paths. */
export function windowsIcons(command: IconCommand, image: string, places?: IconPlaces): Promise<string[]>
{
    const systemRoot = process.env.SystemRoot ?? "C:\\Windows";
    const env = {
        ...process.env,
        RPG_ICON_DESKTOP: places?.desktop ?? "",
        RPG_ICON_MENU: places?.menu ?? "",
        RPG_ICON_TARGET: win32.join(systemRoot, "System32", "conhost.exe"),
        RPG_ICON_ARGUMENTS: ["--headless", command.node, ...command.args].map(quoted).join(" "),
        RPG_ICON_FOLDER: command.folder,
        RPG_ICON_IMAGE: image,
    };
    const powerShell = win32.join(systemRoot, "System32", "WindowsPowerShell", "v1.0", "powershell.exe");
    const script = Buffer.from(shortcuts, "utf16le").toString("base64");

    return new Promise((done, failed) => {
        const options = { env, windowsHide: true, timeout: powerShellWait };
        execFile(powerShell, ["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-EncodedCommand", script], options, (error, stdout, stderr) => {
            if (error === null) {
                done(stdout.split(/\r?\n/).filter((line) => line.trim() !== ""));
            } else {
                const why = error.killed ? `PowerShell did not answer within ${powerShellWait / 1000} seconds` : stderr.trim() || error.message;
                failed(new Error(`Windows did not make RPG Engine's shortcuts: ${why}`));
            }
        });
    });
}

// The shell's link written with every letter of its paths, then read back: a shortcut that does not keep what it was given is taken away, and said.
const shellLink = `
using System;
using System.IO;
using System.Runtime.InteropServices;
using System.Runtime.InteropServices.ComTypes;
using System.Text;

namespace RpgEngine
{
    [ComImport, Guid("00021401-0000-0000-C000-000000000046")]
    class ShellLink { }

    [ComImport, InterfaceType(ComInterfaceType.InterfaceIsIUnknown), Guid("000214F9-0000-0000-C000-000000000046")]
    interface IShellLinkW
    {
        void GetPath([Out, MarshalAs(UnmanagedType.LPWStr)] StringBuilder file, int size, IntPtr data, uint flags);
        void GetIDList(out IntPtr list);
        void SetIDList(IntPtr list);
        void GetDescription([Out, MarshalAs(UnmanagedType.LPWStr)] StringBuilder name, int size);
        void SetDescription([MarshalAs(UnmanagedType.LPWStr)] string name);
        void GetWorkingDirectory([Out, MarshalAs(UnmanagedType.LPWStr)] StringBuilder folder, int size);
        void SetWorkingDirectory([MarshalAs(UnmanagedType.LPWStr)] string folder);
        void GetArguments([Out, MarshalAs(UnmanagedType.LPWStr)] StringBuilder arguments, int size);
        void SetArguments([MarshalAs(UnmanagedType.LPWStr)] string arguments);
        void GetHotkey(out short key);
        void SetHotkey(short key);
        void GetShowCmd(out int show);
        void SetShowCmd(int show);
        void GetIconLocation([Out, MarshalAs(UnmanagedType.LPWStr)] StringBuilder path, int size, out int index);
        void SetIconLocation([MarshalAs(UnmanagedType.LPWStr)] string path, int index);
        void SetRelativePath([MarshalAs(UnmanagedType.LPWStr)] string path, uint reserved);
        void Resolve(IntPtr window, uint flags);
        void SetPath([MarshalAs(UnmanagedType.LPWStr)] string file);
    }

    public static class Shortcut
    {
        // The path as written in the link, its variables not filled in.
        const uint rawPath = 4;

        public static void Make(string file, string target, string arguments, string folder, string icon)
        {
            IShellLinkW link = (IShellLinkW)new ShellLink();
            link.SetPath(target);
            link.SetArguments(arguments);
            link.SetWorkingDirectory(folder);
            link.SetIconLocation(icon, 0);
            link.SetDescription("RPG Engine");
            ((IPersistFile)link).Save(file, true);

            IShellLinkW read = (IShellLinkW)new ShellLink();
            ((IPersistFile)read).Load(file, 0);
            StringBuilder text = new StringBuilder(32768);
            read.GetPath(text, text.Capacity, IntPtr.Zero, rawPath);
            string readTarget = text.ToString();
            text.Clear();
            read.GetArguments(text, text.Capacity);
            string readArguments = text.ToString();
            text.Clear();
            read.GetWorkingDirectory(text, text.Capacity);
            string readFolder = text.ToString();

            if (!String.Equals(readTarget, target, StringComparison.OrdinalIgnoreCase) || readArguments != arguments || !String.Equals(readFolder, folder, StringComparison.OrdinalIgnoreCase))
            {
                File.Delete(file);
                throw new Exception("the shortcut " + file + " did not keep what it was given (it would run " + readTarget + " " + readArguments + " in " + readFolder + "), so it was taken away");
            }
        }
    }
}
`;

// The values come in the environment, never in the script: a path may hold any character PowerShell reads. Its output in UTF-8, and an error as its
// message alone, not in the system's language and code page around it.
const shortcuts = `
[Console]::OutputEncoding = [Text.Encoding]::UTF8
trap { [Console]::Error.WriteLine($_.Exception.Message); exit 1 }
$ErrorActionPreference = 'Stop'
Add-Type -TypeDefinition @'
${shellLink}
'@
$folders = if ($env:RPG_ICON_DESKTOP) { $env:RPG_ICON_DESKTOP, $env:RPG_ICON_MENU } else { [Environment]::GetFolderPath('Desktop'), [Environment]::GetFolderPath('Programs') }
foreach ($folder in $folders) {
    $file = [IO.Path]::Combine($folder, 'RPG Engine.lnk')
    [RpgEngine.Shortcut]::Make($file, $env:RPG_ICON_TARGET, $env:RPG_ICON_ARGUMENTS, $env:RPG_ICON_FOLDER, $env:RPG_ICON_IMAGE)
    $file
}
`;

// An argument as Windows reads it from a command line: in quotes when it has a space; a Windows path never holds a quote.
function quoted(argument: string): string
{
    return /\s/.test(argument) ? `"${argument}"` : argument;
}
