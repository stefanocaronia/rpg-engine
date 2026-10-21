import { randomBytes, randomInt, randomUUID } from "node:crypto";
import { homedir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import type { FileStore } from "./store.ts";

/** What a command needs from the outside world: tests replace it to get repeatable results. */
export interface Context
{
    /** Folder the command runs in: commands look for the campaign here and in the folders above. */
    folder: string;
    /** Rolls one digital die: an integer from 1 to `sides`. */
    random(sides: number): number;
    now(): Date;
    /** A new short id for a line of the log. */
    newId(): string;
    /** A new random salt for a hidden roll. */
    newSalt(): string;
    /** Who acts: the master, the player or a companion. For now always the master. */
    actor: string;
    /** The operating system, as Node names it (win32, linux, darwin): some files differ by it. */
    platform: string;
    /** The player, where the surface can ask them directly, as an AI host that shows forms does (D-148); missing elsewhere. */
    player?: Player;
    /** The player through the dashboard's page, when the MCP server serves one (D-279): it comes before the form, while a page is open. */
    page?: Player;
    /** The call's cancel, as the host sends it when the user stops the call (ASK-9); MCP only. */
    signal?: AbortSignal;
    /** The folders that hold the installed game systems, nearest first (SYS-1). */
    systemFolders: string[];
    /**
     * The code of the systems that bring some, by name, loaded as the command line, the MCP server or the dashboard starts (D-448): its hooks, which the
     * systems module types, or what kept it from loading.
     */
    systemCode?: Record<string, { hooks: object; } | { problem: string; }>;
    /** The folders that hold the installed extensions, each a package folder or npm's node_modules (D-436); none where missing. */
    extensionFolders?: string[];
    /** The AI app the MCP server serves, by the name it gives itself, such as claude-code; missing on the command line. */
    host?: () => string | undefined;
    /** The command was typed by the player in their own terminal: their own hands, as the yes to a package not ours needs (D-441). */
    terminal?: boolean;
    /** npm on this computer, which installs the packages in the engine's own folder (D-436); missing where nothing installs, as in most tests. */
    packages?: PackageManager;
    /** A window of the player's operating system, for a yes the master cannot give (D-478); only where a player sits, never in the tests. */
    confirm?: Confirm;
    /** Downloads a file over https, at most `most` bytes (ADV-1); missing where nothing reaches the web, as in the tests. */
    download?(url: string, most: number, signal?: AbortSignal): Promise<Uint8Array>;
    /** The files as the MCP server keeps them for a whole session (D-137, D-193); without it, each call reads them afresh. */
    files?: FileStore;
    /** The parts of the instructions already given in this chat, which the MCP server keeps until instructions starts over (D-97); without it, every call gives them. */
    told?: Set<string>;
    /** Whether the chat has the character agent as an agent, which the campaign had as the MCP server started (D-490); instructions then gives Voices. */
    characterAgent?: boolean;
    /** The link of the player's dashboard, when the MCP server serves one (D-270); status gives it. */
    dashboard?: string;
    /** Whether status has already had the master offer the dashboard in this chat, as its first status does (D-353). */
    dashboardOffered?: boolean;
    /**
     * What the player changed on the dashboard since the master's last call, taken for the head of the next call's answer, and given back when that answer
     * never goes, as for a call the user stopped (D-341).
     */
    news?: () => { lines: string[]; restore(): void; };
    /** What makes pictures from words on this computer (D-308), as Codex with the player's login; missing where none can, as in tests. */
    pictures?: PictureMaker;
    /** What writes text from a brief on this computer, outside the chat, as Codex or Claude Code with the player's login (D-406); missing where none can. */
    writer?: TextWriter;
    /** What reads the player's documents outside the chat (D-489 (1)): none where no helper is ready, and in tests. */
    reader?: DocumentReader;
    /**
     * Starts the import's runs in a process of their own, apart from the chat, in the campaign's folder: an import outlives a chat closed or an MCP server
     * started again (playtest 18). None on the command line, which runs them itself, and in tests.
     */
    importRunner?: (root: string) => void;
    /** The folder of this player's data on this computer, apart from any campaign: the page's words translated on the fly (D-406). */
    home?: string;
    /** The folder of the dashboard's built page, whose i18n/ lists every phrase it has (D-423). */
    pageFolder?: string;
    /** Codex and Claude Code on this computer, installed and signed in with the player's yes (D-424); missing outside the MCP server, as in tests. */
    helpers?: Helpers;
}

/** A package for rpg-engine as npm or its folder describes it (D-439): its name, version and kind, and what it is. */
export interface PackageInfo
{
    name: string;
    version: string;
    /** What its package.json says it is for rpg-engine: extension, system…; undefined for a package that is not one. */
    kind?: string;
    /** The version of the extensions' API it is made for (D-441). */
    api?: number;
    description?: string;
    /** Who wrote it, as npm gives it. */
    author?: string;
    /** Whether it brings code that runs, by its package.json: a main, exports or a command. */
    code?: boolean;
    /** Whether it needs other packages, which npm installs beside it. */
    dependencies?: boolean;
}

/** What the window of the player's operating system said: yes, no, or none when it could not be shown. */
export type Confirmed = "yes" | "no" | "none";

/** A yes or no asked of the player in a window of their operating system, which the master cannot answer with its own tools (D-478). */
export interface Confirm
{
    ask(title: string, text: string, signal?: AbortSignal): Promise<Confirmed>;
}

/** npm for the packages (D-436): what one is before it is installed, installing it in the engine's folder without running its scripts, and the search. */
export interface PackageManager
{
    /** A package by its npm name, with a version or not, or by its folder; why not when there is none. */
    describe(spec: string): Promise<PackageInfo | { failed: string; missing?: true; }>;
    /** Installs it: undefined once it is installed, else why not. */
    install(spec: string): Promise<string | undefined>;
    /** Takes an installed package off this computer, by its name: undefined once it is gone, else why not. */
    uninstall(name: string): Promise<string | undefined>;
    /** The packages for rpg-engine npm has, by their keyword and what their package.json says. */
    search(): Promise<PackageInfo[] | { failed: string; }>;
}

/** A program of this computer that writes and draws outside the chat, with the player's own login (D-424). */
export type HelperName = "codex" | "claude";

/** How a helper program stands: not on this computer, there without the player's login, signed in with an API key, which the engine never uses, or ready. */
export type HelperState = "missing" | "logged out" | "api key" | "ready";

/** The player's sign-in of a helper program: waiting for them in the browser, with the link it gave; done; or failed, and why. */
export type HelperLogin = { state: "waiting"; link?: string; } | { state: "done"; } | { state: "failed"; why: string; };

/** Codex and Claude Code on this computer (D-424, D-425): how each stands, installing one in the engine's own folder, and the player's sign-in. */
export interface Helpers
{
    state(name: HelperName): HelperState;
    /** Installs a program in the engine's folder: undefined once it answers there, else why not. */
    install(name: HelperName): Promise<string | undefined>;
    /** Starts the sign-in once, kept alive for ten minutes, and tells how it stands once it gave its link or ended, or after a few seconds. */
    login(name: HelperName): Promise<HelperLogin>;
}

/** What writes text from a brief outside the chat (D-406): whether it can now, and its answer, none when it gave none. */
export interface TextWriter
{
    ready(): boolean;
    write(brief: string): Promise<string | undefined>;
}

/** What reads the player's documents outside the chat and writes an adventure from them (D-489 (1)): whether it can now, and one run of a brief in a folder. */
export interface DocumentReader
{
    ready(): boolean;
    /** One run: the brief on its input, reading only in `folder` and writing only in its `writable` subfolders; its last words, or why it stopped. Stopped by `signal`. */
    read(folder: string, brief: string, writable: string[], signal?: AbortSignal): Promise<{ said: string; } | { failed: string; }>;
}

/**
 * Whether pictures can be made here, or why not, in words the master can tell the player, and in the player's own with the steps to have them, one a line,
 * numbered, with the commands between backticks (D-341).
 */
export type PicturesReady = { ready: true; maker?: "Codex" | "Claude"; } | { ready: false; why: string; fix?: string; };

/**
 * What a picture shows (D-308, D-388, D-408): a place as the party sees it arriving, a quest as the character knows it, or the portrait of one of the party as
 * the player sees them; never what the table keeps out.
 */
export interface PictureSubject
{
    kind: "place" | "quest" | "portrait" | "creature";
    name: string;
    /** For a portrait or a creature, what the game says they are, as far as the character knows: what their page derives from, and for the party the line under their name. */
    who?: string;
    seen: string;
    unseen: string[];
}

/** A picture made: its file, and what to call once it is copied, which clears the maker's own copy. */
export interface MadePicture
{
    file: string;
    done(): void;
}

/** What makes a picture from a brief: whether it can, and the picture, or why none came. */
export interface PictureMaker
{
    /** Asked once; with again, a no a minute old or more is asked once more, as after the player logs in. */
    ready(again?: boolean): PicturesReady;
    make(subject: PictureSubject): Promise<MadePicture | { refused: string; }>;
}

/**
 * Asks the player one question with buttons: the index of the label they chose; undefined when no one answered; "unavailable" when the surface turned out
 * unable to show the buttons, so that from then on the master asks in words; "absent" when no one is there to see them now, as a dashboard with no page open.
 */
/** The player's own words in place of a button, as the dashboard's page lets them write (ASK-10). */
export interface Said
{
    said: string;
}

/** Whose sheet a roll's checks read, and by button the field each one rolls, for the page to light that row of the sheet (ASK-12); a death save, what it is. */
export interface Rows
{
    who: string;
    fields: (string | null)[];
    save?: SaveAsked;
}

/** A death save the question asks (DIE-4, D-460): its die, the total that succeeds, its counters as they stand, and what the lowest and highest faces do. */
export interface SaveAsked
{
    sides: number;
    atLeast: number;
    successes: { field: string; value: number; most: number; };
    failures: { field: string; value: number; most: number; };
    lowest?: number;
    highest?: { field: string; value: number; };
}

/** A square of a place's map the player touched, by its name, such as E4 (ASK-11). */
export interface Picked
{
    square: string;
}

export interface Player
{
    choose(question: string, title: string, labels: string[], signal?: AbortSignal, rows?: Rows): Promise<number | Said | undefined | "unavailable" | "absent">;
    /** Asks where the player's character moves on the map of its place (ASK-11): the square, the change of mind as its one button (0), or the player's words; only a page can. */
    chooseSquare?(question: string, title: string, change: string, signal?: AbortSignal): Promise<Picked | 0 | Said | undefined | "absent">;
    /** Whether a question waits for the player there now, as on the dashboard's page; a form does not say. */
    asking?(): boolean;
}

export function defaultContext(folder = process.cwd()): Context
{
    return {
        folder,
        random: (sides) => randomInt(1, sides + 1),
        now: () => new Date(),
        newId: () => randomUUID().replaceAll("-", "").slice(0, 8),
        newSalt: () => randomBytes(16).toString("hex"),
        actor: "master",
        platform: process.platform,
        // From src/core/ and from dist/core/ alike, the package's systems/ folder is two levels up; then those npm installed (D-485).
        systemFolders: [fileURLToPath(new URL("../../systems/", import.meta.url)), join(packagesFolder(), "node_modules")],
        extensionFolders: [join(packagesFolder(), "node_modules")],
        home: userDataFolder(),
        // The built page is in dist/dashboard, two levels up from src/core/ and from dist/core/ alike.
        pageFolder: fileURLToPath(new URL("../../dist/dashboard/", import.meta.url)),
    };
}

/** Where the engine installs the packages, with npm, on this computer (D-436): the player's local data, beside the programs it installs (D-425). */
export function packagesFolder(): string
{
    const home = homedir();

    if (process.platform === "win32") {
        return join(process.env.LOCALAPPDATA || join(home, "AppData", "Local"), "rpg-engine", "packages");
    }

    return process.platform === "darwin"
        ? join(home, "Library", "Application Support", "rpg-engine", "packages")
        : join(process.env.XDG_DATA_HOME || join(home, ".local", "share"), "rpg-engine", "packages");
}

/** Where this player's data is kept on this computer (D-406): the folder the system gives a program's data. */
function userDataFolder(): string
{
    const home = homedir();

    if (process.platform === "win32") {
        return join(process.env.APPDATA ?? join(home, "AppData", "Roaming"), "rpg-engine");
    }

    return process.platform === "darwin" ? join(home, "Library", "Application Support", "rpg-engine") : join(process.env.XDG_DATA_HOME ?? join(home, ".local", "share"), "rpg-engine");
}
