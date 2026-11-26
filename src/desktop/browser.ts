// The engine's pages opened in the player's browser: in an application window of their own, in the default browser when it opens one with --app, else in
// Chrome or Edge when either is installed; else in a tab of the system's default browser. On Windows the window is placed from outside, by PowerShell; on
// the other systems its address is marked so that the page sizes it.
import { execFile, spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { posix, win32 } from "node:path";
import { isPageAddress } from "../core/page-address.ts";
import { whenEnded } from "../core/process.ts";
import { placeCommand, readPlaced, type WindowKind, windowTitles } from "./window/index.ts";

/** What the search for a browser asks of the system: whether a file is there, what a command prints (nothing when it fails), and a program started apart. */
export interface BrowserSystem
{
    exists: (path: string) => boolean;
    output: (command: string, args: string[]) => Promise<string>;
    /** Starts a program apart from this process, which it outlives: whether it started. */
    start: (command: string, args: string[]) => Promise<boolean>;
    /** Runs a program to its end, hidden, with these variables added to its environment and this on its input: what it printed, and whether it ended in time. */
    run: (command: string, args: string[], env: Record<string, string>, input: string) => Promise<{ printed: string; ended: boolean; }>;
}

/** How the page opened: in a window of its own, in a tab of the default browser, or not at all. */
export type BrowserOpened = "window" | "tab" | "none";

/** How the page opened, and whether its window was placed from outside: one that was not is marked, so that the page sizes it. */
export interface BrowserOpening
{
    opened: BrowserOpened;
    placed: boolean;
}

/** Opens an address in an application window of a kind, as `openWindow` does; else in a tab of the default browser, which is not marked. */
export async function openInBrowser(url: string, kind: WindowKind, platform: string, env: NodeJS.ProcessEnv = process.env, system: BrowserSystem = realSystem): Promise<BrowserOpening>
{
    const window = await openWindow(url, kind, platform, env, system);

    if (window.opened === "window") {
        return window;
    }

    // Explorer, open and xdg-open take an address as they take a folder, and hand it to the default browser.
    const manager = platform === "win32" ? "explorer.exe" : platform === "darwin" ? "open" : "xdg-open";
    return { opened: await system.start(manager, [url]) ? "tab" : "none", placed: false };
}

/**
 * Opens an address in an application window of a kind, and nothing else: on Windows placed by PowerShell, which starts the browser and waits for its window;
 * elsewhere, or where PowerShell did not start the browser, the browser started with the address marked, so that the page sizes its window. An address that
 * is no page of the engine's on this computer is refused first, with words.
 */
export async function openWindow(url: string, kind: WindowKind, platform: string, env: NodeJS.ProcessEnv = process.env, system: BrowserSystem = realSystem): Promise<BrowserOpening>
{
    if (!isPageAddress(url)) {
        throw new Error(`${JSON.stringify(url)} is no address of RPG Engine's pages, which are at http://127.0.0.1 and a port: no browser was started for it.`);
    }

    const browser = await appBrowser(platform, env, system);

    if (browser === undefined) {
        return { opened: "none", placed: false };
    }

    if (platform === "win32") {
        const command = placeCommand(browser, [...windowProfile(browser, kind, env), `--app=${url}`], kind, env.SystemRoot ?? "C:\\Windows", windowTitles(kind, url));
        const ran = await system.run(command.file, command.args, command.env, command.input);
        const read = readPlaced(ran.printed);

        // A script cut short at its time had started the browser already: never a second window.
        if (read !== undefined || !ran.ended) {
            return { opened: "window", placed: read !== undefined && read !== "opened" };
        }
    }

    return { opened: await system.start(browser, [`--app=${openedAddress(url)}`]) ? "window" : "none", placed: false };
}

/**
 * The browser's profile of the engine's own for a kind of window, in the player's local data: a Chromium reads where a window goes and how large it is only
 * from the command line it started with, so a browser of its own for each kind opens every window of it at its place at once, never one moved after. None
 * where Windows gives no local data folder: the window is then placed once it is there.
 */
export function windowProfile(browser: string, kind: WindowKind, env: NodeJS.ProcessEnv): string[]
{
    if (env.LOCALAPPDATA === undefined || env.LOCALAPPDATA === "") {
        return [];
    }

    const name = win32.basename(browser).replace(/\.exe$/i, "").toLowerCase();
    // The page speaks the player's language already: the browser never offers to translate it.
    const profile = win32.join(env.LOCALAPPDATA, "rpg-engine", "windows", `${name}-${kind}`);
    return [`--user-data-dir=${profile}`, "--no-first-run", "--no-default-browser-check", "--disable-features=Translate"];
}

/** The address of the window, marked so that the page sizes it as it opens. */
export function openedAddress(url: string): string
{
    const address = new URL(url);
    address.searchParams.set("opened", "1");
    return address.href;
}

/**
 * The browser that opens the window: the default one when it is a Chromium that takes --app and is where it installs itself, so that the window opens in the
 * browser the player uses; else Chrome or Edge, the first there is; none when neither is.
 */
export async function appBrowser(platform: string, env: NodeJS.ProcessEnv, system: BrowserSystem = realSystem): Promise<string | undefined>
{
    const chosen = await defaultBrowser(platform, system);
    const tried = platform === "linux" ? [chrome, chromium, edge] : [chrome, edge];
    const browsers = chosen === undefined ? tried : [chosen, ...tried];
    return browsers.flatMap((browser) => browserPaths(browser, platform, env)).find(system.exists);
}

/** A browser built on Chromium, which opens an address as an application with --app, as each system names it. */
interface Chromium
{
    /** Its folders and program under Program Files or the user's AppData on Windows. */
    windows: string[];
    /** The ProgId Windows keeps for it as the default browser; a per-user install may add a suffix after a dot. */
    progId: string;
    /** Its application on macOS. */
    mac: string;
    /** Its commands on Linux. */
    linux: string[];
    /** Its desktop files on Linux, which xdg-settings names as the default browser, without the extension. */
    desktop: string[];
}

const chrome: Chromium = {
    windows: ["Google", "Chrome", "Application", "chrome.exe"],
    progId: "ChromeHTML",
    mac: "Google Chrome",
    linux: ["google-chrome", "google-chrome-stable"],
    desktop: ["google-chrome"],
};

const edge: Chromium = {
    windows: ["Microsoft", "Edge", "Application", "msedge.exe"],
    progId: "MSEdgeHTM",
    mac: "Microsoft Edge",
    linux: ["microsoft-edge", "microsoft-edge-stable"],
    desktop: ["microsoft-edge"],
};

const brave: Chromium = {
    windows: ["BraveSoftware", "Brave-Browser", "Application", "brave.exe"],
    progId: "BraveHTML",
    mac: "Brave Browser",
    linux: ["brave-browser", "brave-browser-stable", "brave"],
    desktop: ["brave-browser", "brave_brave"],
};

const chromium: Chromium = {
    windows: ["Chromium", "Application", "chrome.exe"],
    progId: "ChromiumHTM",
    mac: "Chromium",
    linux: ["chromium", "chromium-browser"],
    desktop: ["chromium", "chromium-browser", "chromium_chromium"],
};

const chromiums = [chrome, edge, brave, chromium];

// Windows keeps the default browser for http in UserChoiceLatest when it has one, which it then reads in place of UserChoice; macOS is not asked.
async function defaultBrowser(platform: string, system: BrowserSystem): Promise<Chromium | undefined>
{
    if (platform === "win32") {
        const choices = await system.output("reg", ["query", String.raw`HKCU\Software\Microsoft\Windows\Shell\Associations\UrlAssociations\http`, "/s"]);
        const progId = progIdIn(choices, String.raw`\UserChoiceLatest\ProgId`) ?? progIdIn(choices, String.raw`\UserChoice`);
        return chromiums.find((browser) => progId === browser.progId || progId?.startsWith(`${browser.progId}.`) === true);
    }

    if (platform === "linux") {
        const desktop = (await system.output("xdg-settings", ["get", "default-web-browser"])).trim().replace(/\.desktop$/, "");
        return chromiums.find((browser) => browser.desktop.includes(desktop));
    }

    return undefined;
}

// The ProgId under the key of reg's answer that ends so.
function progIdIn(choices: string, key: string): string | undefined
{
    let inKey = false;

    for (const line of choices.split(/\r?\n/)) {
        if (line.startsWith("HKEY_")) {
            inKey = line.trimEnd().endsWith(key);
        } else if (inKey) {
            const value = /^\s+ProgId\s+REG_SZ\s+(\S+)/.exec(line);

            if (value !== null) {
                return value[1];
            }
        }
    }

    return undefined;
}

// Where each system installs a browser: Program Files and the user's AppData, the Applications of macOS, the PATH of Linux.
function browserPaths(browser: Chromium, platform: string, env: NodeJS.ProcessEnv): string[]
{
    if (platform === "win32") {
        const roots = [env.ProgramFiles, env["ProgramFiles(x86)"], env.LOCALAPPDATA].filter((root): root is string => root !== undefined && root !== "");
        return roots.map((root) => win32.join(root, ...browser.windows));
    }

    if (platform === "darwin") {
        const roots = ["/Applications", ...(env.HOME === undefined ? [] : [posix.join(env.HOME, "Applications")])];
        return roots.map((root) => posix.join(root, `${browser.mac}.app`, "Contents", "MacOS", browser.mac));
    }

    const folders = (env.PATH ?? "").split(":").filter((folder) => folder !== "");
    return browser.linux.flatMap((name) => folders.map((folder) => posix.join(folder, name)));
}

// PowerShell compiles its few lines of C# in a few seconds, then waits for the window eight at most: half a minute is more than any computer needs.
const runWait = 30_000;

/** This computer's own: its files, its programs run and started; the tests of the window script run it for real with a browser of their own. */
export const realSystem: BrowserSystem = {
    exists: existsSync,
    output: (command, args) =>
        new Promise((done) => {
            // A second at most: the window would rather open in Chrome or Edge than wait on a registry or a desktop that does not answer.
            execFile(command, args, { windowsHide: true, timeout: 1000 }, (error, output) => done(error === null ? output : ""));
        }),
    start: (command, args) =>
        new Promise((done) => {
            const opened = spawn(command, args, { detached: true, stdio: "ignore" });
            opened.once("spawn", () => {
                opened.unref();
                done(true);
            });
            opened.once("error", () => done(false));
        }),
    run: (command, args, env, input) =>
        new Promise((done) => {
            const running = spawn(command, args, { env: { ...process.env, ...env }, windowsHide: true, stdio: ["pipe", "pipe", "ignore"] });
            let printed = "";
            let cut = false;

            // The program alone, never what it started: the browser it opened stays.
            const timer = setTimeout(() => {
                cut = true;
                running.kill();
            }, runWait);

            running.stdout.setEncoding("utf8").on("data", (chunk: string) => (printed += chunk));

            const end = (): void => {
                clearTimeout(timer);
                done({ printed, ended: !cut });
            };

            // A program that did not start has no end to wait for.
            running.on("error", end);
            // Its end, not the close of its output: the browser it started may hold that open for as long as it lives, and this process would wait with it.
            whenEnded(running, end);
            // A program that ends before it read all of it closes its input: nothing to say then.
            running.stdin.on("error", () => undefined);
            running.stdin.end(input);
        }),
};
