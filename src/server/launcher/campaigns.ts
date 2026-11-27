// The campaigns of this computer, as the launcher lists them: those it remembers, in a file of the engine's data folder; those in the folder where new ones go;
// and those whose table left its place. Forgetting one changes the list alone, never a file of the campaign. A campaign that cannot be read now, as one on a
// network share that does not answer, stays in the list with why: it never stops the list. Whether each folder answers is asked first, all together and
// without blocking, a second at most: one that does not is listed as such and not read, so that the launcher answers meanwhile.
import { stat } from "node:fs/promises";
import { basename, isAbsolute, join, resolve } from "node:path";
import { campaignFileName, readSettings, readTextSetting } from "../../campaign/index.ts";
import { readDataFile, writeDataFile } from "../../core/data-file.ts";
import { samePath } from "../../core/paths.ts";
import { type RefusalBody, refusalWords } from "../../core/refusal.ts";
import { files, FileStore, withFiles } from "../../core/store.ts";
import { type TablePlace, tablePlaces } from "../table/index.ts";

/** The name of the folder in the player's home where new campaigns go, made when the first needs it. */
export const campaignsFolderName = "RPG Engine";

/** The address the launcher serves the portraits of its campaigns at, each by a name, made from its file's path, that tells nothing of it. */
export const portraitsAddress = "/portraits/";

/** A campaign as the launcher shows it. */
export interface CampaignShown
{
    root: string;
    name: string;
    system?: string;
    language?: string;
    /** When the launcher last opened it, as an ISO date. */
    opened?: string;
    /** Whether its table answers now. */
    open: boolean;
    /** Whether its folder or its campaign file is gone. */
    missing: boolean;
    /** Why its campaign file does not read, or why the folder cannot be read now, where it does not; with the code and values of those words, for the page's own. */
    problem?: string;
    problemCode?: string;
    problemValues?: Record<string, string>;
    /** The colours of its theme's dice, in each look of the page, where its game system has a theme (D-528). */
    colours?: { light: DieColours; dark: DieColours; };
    /** Its player character, the first living one, and the address of their portrait where they have one. */
    character?: { name: string; portrait?: string; };
}

/** A die's body and the ink of its numbers. */
export interface DieColours
{
    body: string;
    ink: string;
}

/** What tells a campaign apart in the list: its theme's colours and its player character. */
export type CampaignFace = Pick<CampaignShown, "colours" | "character">;

/**
 * Where the list looks: the engine's data folder, the player's home, and whether a table answers at its place; how a campaign's folder is reached, which
 * settles once its disk answered, well or not; the tests give their own.
 */
export interface CampaignsWhere
{
    home: string;
    userHome: string;
    answers: (place: TablePlace) => Promise<boolean>;
    reach?: (root: string) => Promise<unknown>;
    /** What tells a campaign that reads apart, read with its files; none without it. */
    face?: (root: string) => CampaignFace;
}

// How long a campaign's folder may take to answer whether it is there before the list says it cannot be reached now.
const reachWait = 1000;

/** The folder where new campaigns go. */
export function campaignsFolder(userHome: string): string
{
    return join(userHome, campaignsFolderName);
}

/** The campaigns of this computer, the last opened first, then by name; a campaign once and only once, however its sources name its folder. */
export async function listCampaigns(where: CampaignsWhere): Promise<CampaignShown[]>
{
    const kept = readKept(where.home);
    const places = tablesLeft(where.home);
    const roots = withFiles(new FileStore(), () => {
        const listed: { root: string; opened?: string; }[] = [];

        for (const one of [...kept.campaigns, ...inFolder(campaignsFolder(where.userHome)).map((root) => ({ root })), ...places.map((place) => ({ root: place.root }))]) {
            if (!listed.some((other) => samePath(other.root, one.root)) && !kept.forgotten.some((root) => samePath(root, one.root))) {
                listed.push(one);
            }
        }

        return listed;
    });
    const reached = await Promise.all(roots.map((one) => answersWithin(one.root, where.reach ?? stat)));
    const found = withFiles(new FileStore(), () => roots.map((one, index) => (reached[index] === true ? campaignShown(one.root, one.opened, where.face) : unreached(one.root, one.opened))));
    const open = await Promise.all(found.map(async (campaign) => {
        const place = places.find((one) => samePath(one.root, campaign.root));
        return place === undefined ? false : await where.answers(place).catch(() => false);
    }));
    const shown = found.map((campaign, index) => ({ ...campaign, open: open[index] === true }));
    return shown.sort((one, other) => (other.opened ?? "").localeCompare(one.opened ?? "") || one.name.localeCompare(other.name));
}

/** Remembers a campaign, opened at `now` where given: it comes first in the list then. One forgotten before is listed again. */
export function rememberCampaign(home: string, root: string, now?: Date): void
{
    const kept = readKept(home);
    const before = kept.campaigns.find((one) => samePath(one.root, root));
    const opened = now?.toISOString() ?? before?.opened;
    const campaigns = [...kept.campaigns.filter((one) => one !== before), { root: resolve(root), ...(opened === undefined ? {} : { opened }) }];
    writeKept(home, { campaigns, forgotten: kept.forgotten.filter((one) => !samePath(one, root)) });
}

/** Takes a campaign off the list, never a file of it: it stays off even where the folder of new campaigns or its table would list it. */
export function forgetCampaign(home: string, root: string): void
{
    const kept = readKept(home);
    const forgotten = kept.forgotten.some((one) => samePath(one, root)) ? kept.forgotten : [...kept.forgotten, resolve(root)];
    writeKept(home, { campaigns: kept.campaigns.filter((one) => !samePath(one.root, root)), forgotten });
}

/** Whether a folder holds a campaign of its own, its campaign file right there; why not, as a refusal, where the folder cannot be read now. */
export function holdsCampaign(root: string): boolean | { unreadable: RefusalBody; }
{
    try {
        return withFiles(new FileStore(), () => files().exists(join(root, campaignFileName)));
    } catch (error) {
        return { unreadable: unreadable(root, error) };
    }
}

/** What campaigns.json keeps: the campaigns remembered, each with when it was last opened, and those forgotten. */
interface Kept
{
    campaigns: { root: string; opened?: string; }[];
    forgotten: string[];
}

/**
 * A campaign as its files say it now: its name, system and language, with its face where it reads, or why its file does not read; missing where it is gone;
 * why not where it cannot be read.
 */
function campaignShown(root: string, opened: string | undefined, face?: (root: string) => CampaignFace): Omit<CampaignShown, "open">
{
    const when = opened === undefined ? {} : { opened };

    try {
        if (!files().exists(join(root, campaignFileName))) {
            return { root, name: basename(root), ...when, missing: true };
        }

        const [name, system, language] = ["name", "system", "language"].map((setting) => readTextSetting(root, setting));
        const known = { root, name: name ?? basename(root), ...(system === undefined ? {} : { system }), ...(language === undefined ? {} : { language }), ...when, missing: false };

        try {
            readSettings(root);
            return { ...known, ...face?.(root) };
        } catch (error) {
            // What the campaign's file says wrong, in the words of whoever read it.
            const why = error instanceof Error ? error.message : String(error);
            return { ...known, name: basename(root), ...problemOf(refusalWords(why, "campaign-unread", { why })) };
        }
    } catch (error) {
        return { root, name: basename(root) || root, ...when, missing: false, ...problemOf(unreadable(root, error)) };
    }
}

/** A refusal as a listed campaign carries it: its words, with their code and values. */
function problemOf(refused: RefusalBody): Pick<CampaignShown, "problem" | "problemCode" | "problemValues">
{
    return { problem: refused.error, ...(refused.code === undefined ? {} : { problemCode: refused.code }), ...(refused.values === undefined ? {} : { problemValues: refused.values }) };
}

/** Whether a folder's disk answers within a second, asked without blocking: one that says the folder is not there answers too. */
function answersWithin(root: string, reach: (root: string) => Promise<unknown>): Promise<boolean>
{
    return new Promise((done) => {
        const late = setTimeout(() => done(false), reachWait);

        const answered = (): void => {
            clearTimeout(late);
            done(true);
        };

        // A path no system takes is refused at once: an answer too, which reading it then tells in words.
        void Promise.resolve().then(() => reach(root)).then(answered, answered);
    });
}

/** A campaign whose folder does not answer now, as on a network share that is away: listed with why, never read. */
function unreached(root: string, opened: string | undefined): Omit<CampaignShown, "open">
{
    const why = `${root} cannot be reached now: its disk or its network share does not answer. Bring it back and open the launcher again, or take it off the list.`;
    return { root, name: basename(root) || root, ...(opened === undefined ? {} : { opened }), missing: false, ...problemOf(refusalWords(why, "campaign-away", { root })) };
}

/** Why a campaign's folder cannot be read now, in words that say what to do, from the system's error: each reason with its own code. */
function unreadable(root: string, error: unknown): RefusalBody
{
    const failed = (error as NodeJS.ErrnoException | undefined)?.code;
    const [code, why] = failed === "EISDIR"
        ? ["campaign-file-is-folder", "its campaign.yaml is a folder, not a file"]
        : failed === "EACCES" || failed === "EPERM"
        ? ["campaign-not-allowed", "this computer does not let RPG Engine read it"]
        : failed === "ENAMETOOLONG"
        ? ["campaign-path-long", "its path is too long for this computer"]
        : failed?.startsWith("ERR_INVALID_ARG") === true
        ? ["campaign-path-invalid", "its path holds a character no folder may have"]
        : ["campaign-away", "its disk or its network share does not answer"];
    return refusalWords(`${root} cannot be read now: ${why}. Bring it back and open the launcher again, or take it off the list.`, code, { root });
}

/** The campaigns right inside the folder of new campaigns; none where it cannot be read. */
function inFolder(folder: string): string[]
{
    try {
        return files().entries(folder).filter((entry) => entry.isFolder).map((entry) => join(folder, entry.name)).filter((root) => holdsCampaign(root) === true);
    } catch {
        return [];
    }
}

/** The places tables left; none where the data folder cannot be read. */
function tablesLeft(home: string): TablePlace[]
{
    try {
        return tablePlaces(home);
    } catch {
        return [];
    }
}

function keptFile(home: string): string
{
    return join(home, "campaigns.json");
}

// The list kept; empty when the file is missing or does not read, which loses only the order and the campaigns added by hand. A folder that is no whole
// path is no campaign's.
function readKept(home: string): Kept
{
    const read = readDataFile(keptFile(home));
    const kept = typeof read === "object" && read !== null ? read as { campaigns?: unknown; forgotten?: unknown; } : {};
    const whole = (root: unknown): root is string => typeof root === "string" && root !== "" && isAbsolute(root);
    const campaigns = Array.isArray(kept.campaigns)
        ? kept.campaigns.flatMap((one: { root?: unknown; opened?: unknown; } | null) => {
            const [root, opened] = [one?.root, one?.opened];
            return whole(root) ? [{ root, ...(typeof opened === "string" ? { opened } : {}) }] : [];
        })
        : [];
    const forgotten = Array.isArray(kept.forgotten) ? kept.forgotten.filter(whole) : [];
    return { campaigns, forgotten };
}

function writeKept(home: string, kept: Kept): void
{
    writeDataFile(keptFile(home), kept);
}
