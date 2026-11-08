// The player's last choices of the setup's settings on this computer (D-37, T-134): what the setup of a new campaign suggests, never chooses.
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

/** The settings whose last choice a new campaign's setup suggests: how the player likes to play, never what belongs to one game, as how well they know it. */
export const rememberedSettings: readonly string[] = ["difficulty", "lethality", "saves", "rigor", "dice", "master-rolls", "units", "companions", "preparation", "length"];

const fileName = "last-choices.json";

/** The last choice of each remembered setting, from the player's folder on this computer; none when there is no folder or the file does not read. */
export function lastChoices(home: string | undefined): Record<string, string>
{
    if (home === undefined) {
        return {};
    }

    try {
        const read: unknown = JSON.parse(readFileSync(join(home, fileName), "utf8"));
        const entries = read !== null && typeof read === "object" && !Array.isArray(read) ? Object.entries(read) : [];
        return Object.fromEntries(entries.filter((entry): entry is [string, string] => rememberedSettings.includes(entry[0]) && typeof entry[1] === "string"));
    } catch {
        return {};
    }
}

/** Remembers a choice of a remembered setting in the player's folder; a choice of another setting, or a folder that cannot be written, changes nothing. */
export function rememberChoice(home: string | undefined, name: string, value: unknown): void
{
    if (home === undefined || !rememberedSettings.includes(name) || typeof value !== "string") {
        return;
    }

    const file = join(home, fileName);

    try {
        mkdirSync(dirname(file), { recursive: true });
        writeFileSync(file, `${JSON.stringify({ ...lastChoices(home), [name]: value }, null, 2)}\n`);
    } catch {
        // A suggestion lost is no reason to stop the change the player asked for.
    }
}
