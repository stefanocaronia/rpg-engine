// The player's last choices of the setup's settings on this computer (D-37, T-134): what the setup of a new campaign suggests, never chooses.
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

/** The settings whose last choice a new campaign's setup suggests: how the player likes to play, never what belongs to one game, as how well they know it. */
export const rememberedSettings: readonly string[] = ["difficulty", "lethality", "saves", "rigor", "dice", "master-rolls", "units", "companions", "preparation", "length"];

const fileName = "last-choices.json";

/**
 * The last choice of each remembered setting, from the player's folder on this computer; for `campaign`, only those of the campaigns before it, never its own
 * (T-212). None when there is no folder or the file does not read.
 */
export function lastChoices(home: string | undefined, campaign?: string): Record<string, string>
{
    const kept = readKept(home);
    return campaign !== undefined && kept.campaign === resolve(campaign) ? kept.before : { ...kept.before, ...kept.own };
}

/**
 * Remembers a choice of a remembered setting in the player's folder, as the campaign `campaign` made it; a choice of another setting, or a folder that cannot
 * be written, changes nothing.
 */
export function rememberChoice(home: string | undefined, campaign: string, name: string, value: unknown): void
{
    if (home === undefined || !rememberedSettings.includes(name) || typeof value !== "string") {
        return;
    }

    const kept = readKept(home);
    const root = resolve(campaign);
    // Another campaign's choices become those before this one.
    const next: Kept = kept.campaign === root ? { ...kept, own: { ...kept.own, [name]: value } } : { campaign: root, own: { [name]: value }, before: { ...kept.before, ...kept.own } };
    const file = join(home, fileName);

    try {
        mkdirSync(dirname(file), { recursive: true });
        writeFileSync(file, `${JSON.stringify(next, null, 2)}\n`);
    } catch {
        // A suggestion lost is no reason to stop the change the player asked for.
    }
}

/** The file's content: the campaign that chose last, its own choices, and those of the campaigns before it. */
interface Kept
{
    campaign?: string;
    own: Record<string, string>;
    before: Record<string, string>;
}

/** The file as kept; a file of the choices alone, as written before T-212, holds those of the campaigns before; none when it does not read. */
function readKept(home: string | undefined): Kept
{
    if (home === undefined) {
        return { own: {}, before: {} };
    }

    try {
        const read: unknown = JSON.parse(readFileSync(join(home, fileName), "utf8"));
        const object = isObject(read) ? read : {};

        if (!("before" in object) && !("own" in object)) {
            return { own: {}, before: choicesOf(object) };
        }

        return { ...(typeof object.campaign === "string" ? { campaign: object.campaign } : {}), own: choicesOf(object.own), before: choicesOf(object.before) };
    } catch {
        return { own: {}, before: {} };
    }
}

/** The remembered settings of an object read, each with its value. */
function choicesOf(read: unknown): Record<string, string>
{
    const entries = isObject(read) ? Object.entries(read) : [];
    return Object.fromEntries(entries.filter((entry): entry is [string, string] => rememberedSettings.includes(entry[0]) && typeof entry[1] === "string"));
}

function isObject(read: unknown): read is Record<string, unknown>
{
    return read !== null && typeof read === "object" && !Array.isArray(read);
}
