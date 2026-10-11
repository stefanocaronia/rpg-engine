// What the page asks the dashboard's server: view, how the numbers of a group are made (FOR-8), and what the master asks, which a click answers (D-279).
import type { Asked, PlayerSetting, View, WorldMap } from "./data.ts";

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
        throw new Error("There is no player character yet: the map starts with one.");
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

/** A change of one of the player's settings: a value, or an item added to a list or taken off it. */
export type SettingChange = { setting: string; value: string; } | { setting: string; add: string; } | { setting: string; remove: string; };

/** Changes one of the player's settings (D-341): undefined when done, else what went wrong, as the engine says it. */
export async function changeSetting(change: SettingChange): Promise<string | undefined>
{
    try {
        const response = await fetch("/api/config", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(change) });

        if (response.status === 202) {
            return undefined;
        }

        const body = await response.json() as { error?: string; };
        return body.error ?? "The change did not reach the game: try again.";
    } catch {
        return "The change did not reach the game: try again.";
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
