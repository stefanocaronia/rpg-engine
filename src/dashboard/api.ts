// What the page asks the dashboard's server: view, how the numbers of a group are made (FOR-8), and what the master asks, which a click answers (D-279).
import type { ActsShown, AskedNow, PlayerSetting, ResetPoint, ShownModule, ShownTheme, ShownWidget, View, WorldMap } from "./data.ts";
import { t } from "./text.ts";

/** The saves as the Saves section shows them, with what the mode lets the player do (D-359). */
export type SavesView = Extract<View, { kind: "saves"; }>;

/** A picture's address, with when its file last changed, so that it comes again only when it changes. */
export function pictureAddress(picture: { file: string; version: number; }): string
{
    return `/images/${encodeURIComponent(picture.file)}?v=${picture.version}`;
}

/** What view gives: the party, with the last rolls, as many as asked, and the place of the player character `focus` names (VIEW-12); or a page. */
export async function readView(page?: string, rolls?: number, focus?: string): Promise<View>
{
    const query = new URLSearchParams({ ...(page === undefined ? {} : { page }), ...(rolls === undefined ? {} : { rolls: String(rolls) }), ...(focus === undefined ? {} : { focus }) });
    return await readJson<View>(query.size === 0 ? "/api/view" : `/api/view?${query}`);
}

/** The world map as the player character knows it (VIEW-7). */
export async function readMap(): Promise<WorldMap>
{
    const body = await readJson<View>("/api/view?map=true");

    if (body.kind !== "map") {
        throw new Error(t("There is no player character yet: the map starts with one."));
    }

    return body;
}

/** The player's settings, with their values and what each means (D-341). */
export async function readSettings(): Promise<PlayerSetting[]>
{
    const body = await readJson<View>("/api/view?settings=true");

    return body.kind === "settings" ? body.settings : [];
}

/** The setup as the Setup view shows it (D-370). */
export type SetupView = Extract<View, { kind: "setup"; }>;

/** The campaign's setup: its mode and name, what the next mode needs, and the setup's questions (D-370). */
export async function readSetup(): Promise<SetupView>
{
    const body = await readJson<View>("/api/view?setup=true");

    if (body.kind !== "setup") {
        throw new Error(t("The game gave no setup: reload the page."));
    }

    return body;
}

/** The player's word in the setup (D-370): a choice left to the master, or ready; undefined when it reached the game, else what went wrong. */
export async function sendSetupWord(word: { leave: string; } | { ready: true; }): Promise<string | undefined>
{
    try {
        const response = await fetch("/api/setup", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(word) });
        return response.status === 202 ? undefined : ((await response.json() as { error?: string; }).error ?? t("It did not reach the game: try again."));
    } catch {
        return t("It did not reach the game: try again.");
    }
}

/** The journal as the Journal section shows it (D-367). */
export type JournalView = Extract<View, { kind: "journal"; }>;

/** The quests the character knows and the story by scenes (D-367); none before there is a player character. */
export async function readJournal(): Promise<JournalView | undefined>
{
    const body = await readJson<View>("/api/view?journal=true");

    return body.kind === "journal" ? body : undefined;
}

/** What the character knows, its documents and the calendar, as the World section shows them besides the map (D-276). */
export type WorldView = Extract<View, { kind: "world"; }>;

/** What the character knows, its documents and the calendar; none before there is a player character, or from a server older than the page. */
export async function readWorld(): Promise<WorldView | undefined>
{
    const body = await readJson<View>("/api/view?world=true");

    return body.kind === "world" ? body : undefined;
}

/** One of the player's notes (D-371), as the server keeps it. */
export interface Note
{
    id: string;
    title: string;
    text: string;
    at: string;
    shared?: string;
}

/** A note written, new or changed, by its id; one taken away; one shared with the master, or taken back before the master hears it. */
export type NoteChange = { id: string; title: string; text: string; } | { remove: string; } | { share: string; } | { unshare: string; };

/** The player's notes, the last written first (D-371), and those shared that the master has not heard yet, which may be taken back (D-381). */
export async function readNotes(): Promise<{ notes: Note[]; pending: string[]; }>
{
    const response = await fetch("/api/notes");
    const body = await response.json().catch(() => ({ error: t("The notes did not come ({status}): reload the page.", { status: response.status }) })) as { notes: Note[]; pending?: string[]; } | {
        error: string;
    };

    if ("error" in body) {
        throw new Error(body.error);
    }

    return { notes: body.notes, pending: body.pending ?? [] };
}

// The notes reach the game one after another, in the order they were written.
let noting: Promise<unknown> = Promise.resolve();

/**
 * Writes, takes away or shares a note (D-371), after those sent before: undefined when done, else what went wrong. `leaving`, as the page closes, sends it at once,
 * the request outliving the page.
 */
export async function sendNote(change: NoteChange, leaving = false): Promise<string | undefined>
{
    const post = async (): Promise<string | undefined> => {
        try {
            const response = await fetch("/api/notes", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(change), keepalive: leaving });
            return response.ok ? undefined : ((await response.json().catch(() => ({})) as { error?: string; }).error ?? t("The note was not saved: try again."));
        } catch {
            return t("The note was not saved: the game is not connected.");
        }
    };

    if (leaving) {
        return post();
    }

    const sent = noting.then(post);
    noting = sent;
    return sent;
}

/** Sends the master a story for the player character, which they write in its page with the player (D-386): undefined when it reached the game, else what went wrong. */
export async function sendStory(text: string, who: string): Promise<string | undefined>
{
    try {
        const response = await fetch("/api/story", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text, who }) });
        return response.ok ? undefined : ((await response.json().catch(() => ({})) as { error?: string; }).error ?? t("The story did not reach the master: try again."));
    } catch {
        return t("The story did not reach the master: the game is not connected.");
    }
}

/** The story the player sent that the master has not written yet; undefined when none (D-386). */
export async function readStory(who: string): Promise<string | undefined>
{
    const response = await fetch(`/api/story?${new URLSearchParams({ who })}`);
    return response.ok ? ((await response.json()) as { proposed?: string; }).proposed : undefined;
}

/** The campaign's saves, newest first, and what the mode lets the player do with them (D-359). */
export async function readSaves(): Promise<SavesView>
{
    const body = await readJson<View>("/api/view?saves=true");

    if (body.kind !== "saves") {
        throw new Error(t("The game gave no saves: reload the page."));
    }

    return body;
}

/** What the player does with the saves: save now, go back to a save, or start the campaign over, with its name written. */
export type SavesChange = { action: "make"; label?: string; } | { action: "load"; save: number; } | { action: "reset"; campaign: string; to?: ResetPoint; } | { action: "new chat"; };

/** Saves, goes back to a save or starts the campaign over (D-359): undefined when done, else what went wrong, as the engine says it. */
export async function changeSaves(change: SavesChange): Promise<string | undefined>
{
    try {
        const response = await fetch("/api/saves", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(change) });

        if (response.status === 202) {
            return undefined;
        }

        const body = await response.json() as { error?: string; };
        return body.error ?? t("It did not reach the game: try again.");
    } catch {
        return t("It did not reach the game: try again.");
    }
}

/** An extension on this computer (D-475): with whether the campaign uses it, or broken when it does not read; with where its problems are reported. */
export type ShownExtension =
    | { name: string; package: string; version: string; title: string; about: string; verified: boolean; used: boolean; issues?: string; }
    | { name: string; package: string; broken: string; issues?: string; };

/** A game system on this computer (D-485): the campaign plays one, chosen in its setup; one npm installed has its package. */
export interface ShownSystem
{
    name: string;
    title: string;
    version?: string;
    package?: string;
    verified: boolean;
    used: boolean;
    code: boolean;
    /** Where its problems are reported, as its package says. */
    issues?: string;
}

/** A language package on this computer (D-485 (3)): the dashboard's words made by hand, for every campaign. */
export interface ShownLanguage
{
    code: string;
    name: string;
    package: string;
    version: string;
    verified: boolean;
    /** Where its problems are reported, as its package says. */
    issues?: string;
}

/** An adventure of the campaign, with the game date it came in on, and whether it can still go: not once the story touched it (D-476). */
export interface ShownAdventure
{
    title: string;
    version: string;
    since?: string;
    removable: boolean;
}

/** What the player does with a package already here: update it, take it out of the campaign, or off this computer. */
export type PackageAction = "update" | "remove" | "uninstall";

/** The package the server works on, one at a time: what it does, and whether it waits for the player's yes in a window of their computer (D-478). */
export interface PackageWork
{
    name: string;
    action: "add" | PackageAction | "library" | "engine";
    phase: "working" | "yes";
}

/**
 * RPG Engine itself (D-515 (3)): its version, npm's latest and whether it is newer, or why npm was not asked; how it is installed: by npm globally, which the
 * page updates, by npm link of a folder, or any other way, from a folder.
 */
export interface EngineView
{
    version: string;
    latest?: string;
    update?: boolean;
    failed?: string;
    install: "global" | "link" | "other";
    folder?: string;
    working?: PackageWork;
}

/** RPG Engine and what npm has of it; undefined where the page is not served by the game's own server, which alone updates it. */
export async function readEngine(): Promise<EngineView | undefined>
{
    const response = await fetch("/api/engine");

    if (response.status === 400) {
        return undefined;
    }

    const body = await response.json() as EngineView | { error: string; };

    if ("error" in body) {
        throw new Error(body.error);
    }

    return body;
}

/** What updating RPG Engine came to: the version installed, and whether a new chat or the app opened again brings it; or the engine's words. */
export type EngineOutcome = { done: true; version: string; restart: "chat" | "app"; } | { done: false; error: string; code?: "busy"; };

/** Installs npm's latest RPG Engine as it was installed: the chat and this page go on with the one they started with. */
export async function updateEngine(): Promise<EngineOutcome>
{
    try {
        const response = await fetch("/api/engine", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "update" }) });
        const body = await response.json().catch(() => ({})) as { version?: string; restart?: "chat" | "app"; error?: string; code?: "busy"; };

        if (response.status === 202 && body.version !== undefined) {
            return { done: true, version: body.version, restart: body.restart === "app" ? "app" : "chat" };
        }

        return { done: false, error: body.error ?? t("It did not reach the game: try again."), ...(body.code === "busy" ? { code: body.code } : {}) };
    } catch {
        return { done: false, error: t("It did not reach the game: try again.") };
    }
}

/** The packages as the page shows them (D-485): by kind, with the one being worked on. */
export interface PackagesView
{
    system: { name: string; title: string; } | null;
    systems?: ShownSystem[];
    adventures?: ShownAdventure[];
    installed: ShownExtension[];
    missing: string[];
    languages?: ShownLanguage[];
    working?: PackageWork;
}

/** The packages here, at once: without npm. */
export async function readPackages(): Promise<PackagesView>
{
    return await readJson<PackagesView>("/api/packages");
}

/** The widgets of the campaign's extensions (D-502), each where it stands and with what it shows now. */
export async function readWidgets(): Promise<ShownWidget[]>
{
    return (await readJson<{ widgets: ShownWidget[]; }>("/api/widgets")).widgets;
}

/** What a package's widget shows for a card or a page of its page code, for who (D-514): nothing when the package or the widget is not the campaign's. */
export async function readWidgetData(owner: string, widget: string, who: string | undefined): Promise<{ data?: unknown; } | undefined>
{
    const query = new URLSearchParams({ package: owner, widget, ...(who === undefined ? {} : { who }) });
    const response = await fetch(`/api/widget?${query.toString()}`);
    const body = await response.json() as { shows?: { data?: unknown; }; error?: string; };

    if (body.error !== undefined) {
        throw new Error(body.error);
    }

    return body.shows;
}

/** The theme of the campaign's game system (D-528): its CSS, icons and name; nothing when it names none, or refused when it does not pass its checks. */
export async function readGameTheme(): Promise<ShownTheme>
{
    return await readJson<ShownTheme>("/api/theme");
}

/** The page modules of the campaign's system and extensions whose code runs (D-510, D-511), the system's first. */
export async function readModules(): Promise<ShownModule[]>
{
    return (await readJson<{ modules: ShownModule[]; }>("/api/modules")).modules;
}

/** The kinds of packages. */
export type PackageKind = "system" | "adventure" | "extension" | "language";

/** A package one may add (D-486): what the player needs to trust it, whether it brings code, what to add it by, and whether it is here already. */
export interface CatalogEntry
{
    kind: PackageKind;
    title: string;
    description?: string;
    author?: string;
    version?: string;
    verified: boolean;
    code: boolean;
    source: string;
    installed?: string;
    update: boolean;
    levels?: string;
    length?: string;
    language?: string;
    stars?: number;
    /** The game system an extension is made for (D-548). */
    system?: string;
    /** Its latest version, when that one needs a newer RPG Engine: `version` is then the newest this one reads (D-515 (2)). */
    newer?: { version: string; engine?: string; };
}

/** What npm and GitHub offer, and the one that did not answer, in its own words. */
export interface Catalog
{
    entries: CatalogEntry[];
    failed: { npm?: string; github?: string; };
}

/** The catalog (D-486), as the server keeps it for ten minutes; `fresh` asks npm and GitHub again. */
export async function readCatalog(fresh: boolean): Promise<Catalog>
{
    return await readJson<Catalog>(fresh ? "/api/catalog?fresh=true" : "/api/catalog");
}

/** What a package's work came to: done, with the kind the engine recognized in what was added; or the engine's words, and why the yes was not given. */
export type PackageOutcome = { done: true; kind?: PackageKind; } | { done: false; error: string; code?: "declined" | "no-window" | "busy"; };

/** Adds what the player wrote (D-485 (1)): a link, a GitHub repository's too, an npm name or a folder of this computer; the engine tells its kind. */
export async function addSource(source: string): Promise<PackageOutcome>
{
    return await packageWork(() => fetch("/api/add", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ source }) }));
}

/** Adds a .zip or a .tgz the player picked, sent as it is with its name. */
export async function addFile(file: File): Promise<PackageOutcome>
{
    return await packageWork(() => fetch("/api/add", { method: "POST", headers: { "Content-Type": file.type || "application/octet-stream", "X-File-Name": encodeURIComponent(file.name) }, body: file }));
}

/** Updates a package, takes it out of the campaign or off this computer: an adventure by its title, the others by their name or package. */
export async function changePackage(action: PackageAction, name: string): Promise<PackageOutcome>
{
    return await packageWork(() => fetch("/api/package", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, name }) }));
}

async function packageWork(send: () => Promise<Response>): Promise<PackageOutcome>
{
    try {
        const response = await send();
        const body = await response.json().catch(() => ({})) as { kind?: PackageKind; error?: string; code?: "declined" | "no-window" | "busy"; };

        if (response.status === 202) {
            return { done: true, ...(body.kind === undefined ? {} : { kind: body.kind }) };
        }

        return { done: false, error: body.error ?? t("It did not reach the game: try again."), ...(body.code === undefined ? {} : { code: body.code }) };
    } catch {
        return { done: false, error: t("It did not reach the game: try again.") };
    }
}

/**
 * A folder or a book of this computer's library (D-491 (13)): its books read and being read, those skipped and why, whether it is there, whether it holds too
 * many; whether this campaign uses it, and whether it is on this computer, as one the campaign lists may not be.
 */
export interface LibraryEntry
{
    path: string;
    books: number;
    reading: number;
    /** Each with the engine's words, and their kind, which the page says in the player's. */
    skipped: { name: string; why: string; kind: "password" | "drm" | "stuck" | "denied" | "broken"; }[];
    missing: boolean;
    crowded: boolean;
    used: boolean;
    onComputer: boolean;
}

/** This computer's library as the page shows it, with the work under way. */
export interface LibraryView
{
    entries: LibraryEntry[];
    working?: PackageWork;
}

/** This computer's library, with what this campaign uses, at once. */
export async function readLibrary(): Promise<LibraryView>
{
    return await readJson<LibraryView>("/api/library");
}

/**
 * Turns a folder or a book of this computer on in the campaign's library, adding it to the computer first with the player's yes in a window; off; or takes it
 * off this computer.
 */
export async function changeLibrary(action: "add" | "remove" | "forget", path: string): Promise<PackageOutcome>
{
    return await packageWork(() => fetch("/api/library", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, path }) }));
}

/** Exports the campaign as an adventure, as it was at its start (ADV-7): the address to download its .zip from, or what went wrong. */
export async function exportCampaign(credits: { author?: string; license?: string; }): Promise<{ download: string; file: string; } | { error: string; }>
{
    try {
        const response = await fetch("/api/export", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(credits) });
        const body = await response.json().catch(() => ({})) as { file?: string; error?: string; };
        return body.file === undefined ? { error: body.error ?? t("It did not reach the game: try again.") } : { download: `/api/export?file=${encodeURIComponent(body.file)}`, file: body.file };
    } catch {
        return { error: t("It did not reach the game: try again.") };
    }
}

/** A change of one of the player's settings: a value, or an item added to a list or taken off it. */
export type SettingChange = { setting: string; value: string; } | { setting: string; add: string; } | { setting: string; remove: string; };

// The player's changes reach the game one after another, in the order they were made.
let changing: Promise<unknown> = Promise.resolve();

/** Changes one of the player's settings (D-341), after those sent before: undefined when done, else what went wrong, as the engine says it. */
export async function changeSetting(change: SettingChange): Promise<string | undefined>
{
    const sent = changing.then(() => sendChange(change));
    changing = sent;
    return sent;
}

async function sendChange(change: SettingChange): Promise<string | undefined>
{
    try {
        const response = await fetch("/api/config", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(change) });

        if (response.status === 202) {
            return undefined;
        }

        const body = await response.json() as { error?: string; };
        return body.error ?? t("The change did not reach the game: try again.");
    } catch {
        return t("The change did not reach the game: try again.");
    }
}

/** What the master asks the player now, null when nothing; with nothing, the card a package's last question left (D-507). */
export async function readAsked(): Promise<AskedNow>
{
    const response = await fetch("/api/asked");
    return await response.json() as AskedNow;
}

/** Closes a package's card once told (D-507), for every page and every reading after; a server away keeps it, closed on this page alone. */
export async function closeCard(key: string): Promise<void>
{
    try {
        await fetch("/api/card", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ close: key }) });
    } catch {
        // Closed here; another page may still show it.
    }
}

/** Tells the server whether this page is seen now (D-455); a page that cannot tell it is taken as seen. */
export async function sendSeen(page: string, seen: boolean): Promise<void>
{
    try {
        await fetch("/api/seen", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ page, seen }) });
    } catch {
        // The server is away: it asks nothing meanwhile.
    }
}

/**
 * The player's answer to what the master asks, a button by its place, their own words (ASK-10), a square of the map (ASK-11) or a die of a rest to spend
 * (ASK-14): true when it counted, false when the master no longer asks it.
 */
export async function answer(asked: string, reply: number | string | { square: string; } | { spend: string; }): Promise<boolean>
{
    const body = typeof reply === "number" ? { asked, choice: reply } : typeof reply === "string" ? { asked, text: reply } : { asked, ...reply };
    const response = await fetch("/api/answer", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    return response.status === 202;
}

/** The sentences said on the page that the master has not heard yet, those heard lately, and whether this chat hears one at once (D-495). */
export async function readActs(): Promise<ActsShown>
{
    const response = await fetch("/api/act");

    if (!response.ok) {
        throw new Error(t("It did not reach the game: try again."));
    }

    return await response.json() as ActsShown;
}

/** Says a sentence to the master (D-495): its id, with how the sentences stand now; else what went wrong. */
export async function sayAct(text: string): Promise<{ id: string; shown: ActsShown; } | { error: string; }>
{
    try {
        const response = await fetch("/api/act", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text }) });
        const body = await response.json().catch(() => ({})) as ActsShown & { id?: string; error?: string; };
        return response.status === 202 && body.id !== undefined ? { id: body.id, shown: body } : { error: body.error ?? t("It did not reach the game: try again.") };
    } catch {
        return { error: t("It did not reach the game: try again.") };
    }
}

/** Takes a sentence back before the master hears it: how the sentences stand now, "heard" when it is too late, or undefined when the game is away. */
export async function withdrawAct(id: string): Promise<ActsShown | "heard" | undefined>
{
    try {
        const response = await fetch("/api/act", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ withdraw: id }) });
        return response.status === 409 ? "heard" : response.ok ? await response.json() as ActsShown : undefined;
    } catch {
        return undefined;
    }
}

/** How each number of a group of someone's sheet is made, by field: what view gives for Page#Group. */
export async function readExplanations(member: string, group: string): Promise<Map<string, string[]>>
{
    const section = await readView(`${member}#${group}`);
    return section.kind === "section" ? explanations(section.lines) : new Map();
}

/** "insight +5: wis-mod +3, proficiency +2" as insight → [wis-mod +3, proficiency +2]; a line without what it came from tells nothing more. */
export function explanations(lines: string[]): Map<string, string[]>
{
    return new Map(lines.flatMap((line): [string, string[]][] => {
        const colon = line.indexOf(": ");
        const field = line.split(" ")[0];
        return colon < 0 ? [] : [[field, line.slice(colon + 2).split(", ")]];
    }));
}

/** Runs a command of an extension marked for the player (D-510), as its page code asks: what it said; it throws what went wrong, as the engine says it. */
export async function runCommand(command: string, input: Record<string, unknown> = {}): Promise<string>
{
    const response = await fetch("/api/run", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ command, input }) });
    const body = await response.json().catch(() => ({})) as { text?: string; error?: string; };

    if (!response.ok || body.error !== undefined) {
        throw new Error(body.error ?? `${command} did not run (${response.status})`);
    }

    return body.text ?? "";
}

/**
 * What the server answers at an address, as JSON: it throws what the server says went wrong, or, when the game cannot be reached or answers no JSON, says so
 * in the page's words rather than the browser's.
 */
async function readJson<T>(address: string): Promise<T>
{
    let body: unknown;

    try {
        body = await (await fetch(address)).json();
    } catch {
        throw new Error(t("It did not reach the game: try again."));
    }

    if (typeof body === "object" && body !== null && "error" in body && typeof body.error === "string") {
        throw new Error(body.error);
    }

    return body as T;
}
