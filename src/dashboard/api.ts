// What the page asks the dashboard's server: view, how the numbers of a group are made (FOR-8), and what the master asks, which a click answers (D-279).
import type { Asked, View } from "./data.ts";

export async function readView(page?: string): Promise<View>
{
    const response = await fetch(page === undefined ? "/api/view" : `/api/view?${new URLSearchParams({ page })}`);
    const body = await response.json() as View | { error: string; };

    if ("error" in body) {
        throw new Error(body.error);
    }

    return body;
}

/** What the master asks the player now; undefined when nothing. */
export async function readAsked(): Promise<Asked | undefined>
{
    const response = await fetch("/api/asked");
    const body = await response.json() as { asked: Asked | null; };
    return body.asked ?? undefined;
}

/** The player's click on what the master asks, by the button's place: true when it counted, false when the master no longer asks it. */
export async function answer(asked: string, choice: number): Promise<boolean>
{
    const response = await fetch("/api/answer", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ asked, choice }) });
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
