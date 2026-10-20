// The code a game system brings where its data is not enough (D-448), as the 5e's dying point: hooks the engine calls after its own writes, given the game
// they may read and change. A system's package.json says it has code, as an extension's does (D-439); the engine loads it once for the process, as it starts.
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import type { SaveAsked } from "../core/context.ts";
import { systemFolders } from "./system-folders.ts";

/** A die as it was thrown: its faces, what it showed, and whether it was dropped, as the lower of two kept highest. */
export interface ThrownDie
{
    sides: number | "F";
    value: number;
    dropped?: boolean;
}

/** A counter a command changed on a page: before and after, its maximum, and what damage took of it past what shields it. */
export interface CounterChange
{
    page: string;
    field: string;
    before: number;
    after: number;
    max?: number;
    lost: number;
}

/** A roll made for someone with a page, as the player's check or the master's roll with who: never a hidden one. */
export interface RollMade
{
    who: string;
    notation: string;
    total: number;
    dice: ThrownDie[];
}

/** A page as a system's code reads it: in the party or not, the player's character or not, its counters with what its effects give, its effects. */
export interface SystemPage
{
    name: string;
    party: boolean;
    pc: boolean;
    counter(field: string): { value: number; max?: number; } | undefined;
    has(effect: string): boolean;
}

/** What a system's code may read of the game. */
export interface SystemReader
{
    /** A page by its name; undefined when no page, or more than one, has it. */
    page(name: string): SystemPage | undefined;
    /** A setting of the campaign, as mentor. */
    setting(name: string): string | undefined;
    /** Whether two names are the same, as the engine compares them: case and accents aside. */
    sameName(one: string, other: string): boolean;
}

/** What a system's code may do to the game: each write with its line in the log, public or hidden as the engine shows that page to the player. */
export interface SystemGame extends SystemReader
{
    /** Sets numbers on a page: a counter keeps its maximum. */
    set(page: string, values: Record<string, number>, why: string): void;
    /** Adds an effect without end; the engine's notes on what it breaks of what one keeps, or undefined when the page has it already. */
    addEffect(page: string, name: string, why: string): string[] | undefined;
    /** Ends an effect; whether the page had it. */
    endEffect(page: string, name: string, why: string): boolean;
    /** Rolls with the engine's dice, as a public roll in the log for who. */
    roll(notation: string, by: { who: string; why: string; }): { total: number; dice: ThrownDie[]; text: string; };
}

/** The hooks of a system's code, each optional, each giving lines for the command's output. Writes made through the game call no hook. */
export interface SystemHooks
{
    /** After change, or the hit dice, wrote a counter of a page. */
    counterChanged?(change: CounterChange, game: SystemGame): string[];
    /** As someone's turn starts in a scene. */
    turnStarted?(turn: { who: string; }, game: SystemGame): string[];
    /** After a roll for someone was logged. */
    rolled?(roll: RollMade, game: SystemGame): string[];
    /** After an effect was added to a page. */
    effectAdded?(added: { page: string; effect: string; }, game: SystemGame): string[];
    /** Before ask shows its buttons: what the page draws of the question, as a death save; it only reads. */
    asking?(question: { who: string; notations: string[]; }, game: SystemReader): SaveAsked | undefined;
}

/** The default export of a system's code. */
export type SystemEntry = () => SystemHooks;

/** A system's code as loaded: its hooks, or what kept it from loading. */
export type LoadedSystemCode = { hooks: SystemHooks; } | { problem: string; };

/** Whether a system's folder brings code: a package.json of kind system with a main (D-448). */
export function systemHasCode(folder: string): boolean
{
    return systemPackage(folder) !== undefined;
}

/**
 * The code of every system in these folders that brings some, by the system's name, loaded once: from its source where the engine runs from its own, as in
 * the tests, else from its built main. One that fails to load says why, for the command that needs it.
 */
export async function loadSystemCode(folders: string[]): Promise<Record<string, LoadedSystemCode>>
{
    const loaded: Record<string, LoadedSystemCode> = {};

    // The nearest system by a name is the one played, as findSystem reads it: another of that name never brings its code.
    const seen = new Set<string>();

    for (const { name, folder: own } of systemFolders(folders)) {
        const main = systemPackage(own);
        const first = !seen.has(name.toLowerCase());
        seen.add(name.toLowerCase());

        if (main === undefined || !first) {
            continue;
        }

        const source = join(own, "src", "index.ts");
        const file = import.meta.url.endsWith(".ts") && existsSync(source) ? source : join(own, main);

        try {
            const module = await import(pathToFileURL(file).href) as { default?: unknown; };

            if (typeof module.default !== "function") {
                throw new Error(`${file} has no default export that gives its hooks`);
            }

            loaded[name] = { hooks: (module.default as SystemEntry)() };
        } catch (error) {
            loaded[name] = { problem: error instanceof Error ? error.message : String(error) };
        }
    }

    return loaded;
}

/** The main of a system's package.json of kind system; undefined when it has none. */
function systemPackage(folder: string): string | undefined
{
    const path = join(folder, "package.json");

    if (!existsSync(path)) {
        return undefined;
    }

    try {
        const data = JSON.parse(readFileSync(path, "utf8")) as { main?: unknown; "rpg-engine"?: { kind?: unknown; }; };
        return data["rpg-engine"]?.kind === "system" && typeof data.main === "string" ? data.main : undefined;
    } catch {
        return undefined;
    }
}
