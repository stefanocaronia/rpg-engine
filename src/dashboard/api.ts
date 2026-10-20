// What the page asks the dashboard's server: view, how the numbers of a group are made (FOR-8), and what the master asks, which a click answers (D-279).
import type { Asked, PlayerSetting, ResetPoint, View, WorldMap } from "./data.ts";
import { t } from "./text.ts";

/** The saves as the Saves section shows them, with what the mode lets the player do (D-359). */
export type SavesView = Extract<View, { kind: "saves"; }>;

/** What view gives: the party, with the last rolls, as many as asked; or a page. */
export async function readView(page?: string, rolls?: number): Promise<View>
{
    const query = new URLSearchParams({ ...(page === undefined ? {} : { page }), ...(rolls === undefined ? {} : { rolls: String(rolls) }) });
    const response = await fetch(query.size === 0 ? "/api/view" : `/api/view?${query}`);
    const body = await response.json() as View | { error: string; };

    if ("error" in body) {
        throw new Error(body.error);
    }

    return body;
}

/** The world map as the player character knows it (VIEW-7). */
export async function readMap(): Promise<WorldMap>
{
    const response = await fetch("/api/view?map=true");
    const body = await response.json() as View | { error: string; };

    if ("error" in body) {
        throw new Error(body.error);
    }

    if (body.kind !== "map") {
        throw new Error(t("There is no player character yet: the map starts with one."));
    }

    return body;
}

/** The player's settings, with their values and what each means (D-341). */
export async function readSettings(): Promise<PlayerSetting[]>
{
    const response = await fetch("/api/view?settings=true");
    const body = await response.json() as View | { error: string; };

    if ("error" in body) {
        throw new Error(body.error);
    }

    return body.kind === "settings" ? body.settings : [];
}

/** The setup as the Setup view shows it (D-370). */
export type SetupView = Extract<View, { kind: "setup"; }>;

/** The campaign's setup: its mode and name, what the next mode needs, and the setup's questions (D-370). */
export async function readSetup(): Promise<SetupView>
{
    const response = await fetch("/api/view?setup=true");
    const body = await response.json() as View | { error: string; };

    if ("error" in body) {
        throw new Error(body.error);
    }

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
    const response = await fetch("/api/view?journal=true");
    const body = await response.json() as View | { error: string; };

    if ("error" in body) {
        throw new Error(body.error);
    }

    return body.kind === "journal" ? body : undefined;
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
export async function sendStory(text: string): Promise<string | undefined>
{
    try {
        const response = await fetch("/api/story", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text }) });
        return response.ok ? undefined : ((await response.json().catch(() => ({})) as { error?: string; }).error ?? t("The story did not reach the master: try again."));
    } catch {
        return t("The story did not reach the master: the game is not connected.");
    }
}

/** The story the player sent that the master has not written yet; undefined when none (D-386). */
export async function readStory(): Promise<string | undefined>
{
    const response = await fetch("/api/story");
    return response.ok ? ((await response.json()) as { proposed?: string; }).proposed : undefined;
}

/** The campaign's saves, newest first, and what the mode lets the player do with them (D-359). */
export async function readSaves(): Promise<SavesView>
{
    const response = await fetch("/api/view?saves=true");
    const body = await response.json() as View | { error: string; };

    if ("error" in body) {
        throw new Error(body.error);
    }

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

/** An extension on this computer (D-475): with whether the campaign uses it, or broken when it does not read. */
export type ShownExtension =
    | { name: string; package: string; version: string; title: string; about: string; verified: boolean; used: boolean; }
    | { name: string; package: string; broken: string; };

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
}

/** A language package on this computer (D-485 (3)): the dashboard's words made by hand, for every campaign. */
export interface ShownLanguage
{
    code: string;
    name: string;
    package: string;
    version: string;
    verified: boolean;
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
    action: "add" | PackageAction;
    phase: "working" | "yes";
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
    const response = await fetch("/api/packages");
    const body = await response.json() as PackagesView | { error: string; };

    if ("error" in body) {
        throw new Error(body.error);
    }

    return body;
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
    const response = await fetch(fresh ? "/api/catalog?fresh=true" : "/api/catalog");
    const body = await response.json() as Catalog | { error: string; };

    if ("error" in body) {
        throw new Error(body.error);
    }

    return body;
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

/** What the master asks the player now; undefined when nothing. */
export async function readAsked(): Promise<Asked | undefined>
{
    const response = await fetch("/api/asked");
    const body = await response.json() as { asked: Asked | null; };
    return body.asked ?? undefined;
}

/**
 * The player's answer to what the master asks, a button by its place, their own words (ASK-10) or a square of the map (ASK-11): true when it counted, false when
 * the master no longer asks it.
 */
/** Tells the server whether this page is seen now (D-455); a page that cannot tell it is taken as seen. */
export async function sendSeen(page: string, seen: boolean): Promise<void>
{
    try {
        await fetch("/api/seen", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ page, seen }) });
    } catch {
        // The server is away: it asks nothing meanwhile.
    }
}

export async function answer(asked: string, reply: number | string | { square: string; }): Promise<boolean>
{
    const body = typeof reply === "number" ? { asked, choice: reply } : typeof reply === "string" ? { asked, text: reply } : { asked, square: reply.square };
    const response = await fetch("/api/answer", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    return response.status === 202;
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
