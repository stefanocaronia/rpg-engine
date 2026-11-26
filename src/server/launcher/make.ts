// A campaign made from the launcher, as `rpg init` makes one for a player: in the folder given, else in a folder of its own named after it in the folder of
// new campaigns; with the host, model and effort the player chose for its first chat, which its page then proposes; remembered, then opened. The commands
// load only when a campaign is made: the launcher starts without them.
import { join, win32 } from "node:path";
import type { Context } from "../../core/context.ts";
import { type HostId, hostIds, hosts } from "../../core/hosts.ts";
import { files, FileStore, withFiles } from "../../core/store.ts";
import { effortRefused, isHostName, type MasterDriver, masterDriver, type MasterModel, proposedModel } from "../../master/index.ts";
import { writeLastChat } from "../table/index.ts";
import { campaignsFolder, rememberCampaign } from "./campaigns.ts";
import { openCampaign, type TableStarter } from "./open.ts";

/** What the player asks for a new campaign. */
export interface CampaignWish
{
    name: string;
    folder?: string;
    language: string;
    system: string;
    host?: string;
    model?: string;
    effort?: string;
}

/** What making a campaign takes: where new ones go, the context `rpg init` runs with, the clock, the hosts' drivers and the models known of each, and how its table starts. */
export interface MakeWhere
{
    userHome: string;
    context: Context;
    now: () => Date;
    driver?: (host: HostId) => MasterDriver | undefined;
    models?: (host: HostId) => MasterModel[];
    tables: TableStarter;
}

/** Makes the campaign, remembers it and opens it: its page's link and its folder; a refusal in words, with its folder once it was made. */
export async function makeCampaign(wish: CampaignWish, where: MakeWhere): Promise<{ url: string; root: string; } | { error: string; root?: string; }>
{
    const chat = chatOf(wish, where.driver ?? masterDriver, where.models ?? (() => []));

    if (typeof chat === "string") {
        return { error: chat };
    }

    let root: string;

    try {
        root = wish.folder ?? freeFolder(campaignsFolder(where.userHome), folderName(wish.name));

        if (wish.folder !== undefined && withFiles(new FileStore(), () => files().entries(root).length > 0)) {
            return { error: `${wish.folder} already holds files: choose an empty folder, or a new one.` };
        }
    } catch (error) {
        return { error: inWords(error, wish.folder ?? campaignsFolder(where.userHome)) };
    }

    try {
        const { init } = await import("../../commands/init.ts");
        const input = init.input.parse({ folder: root, name: wish.name, language: wish.language, system: wish.system });
        // Made as the player makes it, as the page's own writes run their commands.
        withFiles(new FileStore(where.context.systemFolders), () => init.run(input, { ...where.context, folder: root, actor: "player" }));
    } catch (error) {
        return { error: inWords(error, root) };
    }

    if (chat !== undefined) {
        writeLastChat(where.tables.home, root, { root, ...chat });
    }

    rememberCampaign(where.tables.home, root, where.now());
    const opened = await openCampaign(root, where.tables);
    return "url" in opened ? { url: opened.url, root } : { error: opened.error, root };
}

/** The first chat's host, model and effort, after the checks its table makes as it opens one; none where no host is asked; a refusal in words. */
function chatOf(
    wish: CampaignWish,
    driverOf: (host: HostId) => MasterDriver | undefined,
    models: (host: HostId) => MasterModel[],
): { host: HostId; model: string; effort?: string; } | string | undefined
{
    if (wish.host === undefined) {
        return wish.model === undefined && wish.effort === undefined ? undefined : "Choose the host first, then its model and effort.";
    }

    const host = hostIds.find((id) => id === wish.host);
    const driver = host === undefined ? undefined : driverOf(host);

    if (host === undefined || driver === undefined) {
        return `A chat with the master cannot open in ${wish.host} yet: choose another host, or none, and open the chat from the campaign's page later.`;
    }

    const model = wish.model ?? proposedModel(driver, models(host));

    if (!isHostName(model)) {
        return `That is no name of a model: ${model}. Choose one of the models the page lists for ${hosts[host].name}, or leave it to the host.`;
    }

    const refused = effortRefused(host, driver, models(host), model, wish.effort);

    if (refused !== undefined) {
        return refused;
    }

    return { host, model, ...(wish.effort === undefined ? {} : { effort: wish.effort }) };
}

/**
 * What went wrong making a campaign, in words that say what to do: the engine's own refusals as they are, the system's errors told plainly, never in its own
 * words.
 */
function inWords(error: unknown, folder: string): string
{
    const failed = error as NodeJS.ErrnoException | undefined;

    if (typeof failed?.syscall !== "string") {
        return error instanceof Error ? error.message : String(error);
    }

    const why = failed.code === "ENOTDIR" || failed.code === "EEXIST"
        ? "a part of that path is a file, not a folder"
        : failed.code === "EACCES" || failed.code === "EPERM"
        ? "this computer does not let RPG Engine write there"
        : failed.code === "ENOSPC"
        ? "its disk is full"
        : failed.code === "EROFS"
        ? "its disk cannot be written"
        : failed.code === "ENAMETOOLONG"
        ? "its path is too long for this computer"
        : failed.code === "ENOENT"
        ? "its disk is not there"
        : "its disk or its network share does not answer";
    return `The campaign could not be made in ${folder}: ${why}. Choose another folder, such as one in your home.`;
}

// A name Windows keeps for a device, alone or with an extension after a dot: one rule for the folder a campaign's name gives and for the folder the page gives.
const deviceName = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(\..*)?$/i;

/** A folder's name from a campaign's: what no system takes out, and never a name Windows keeps for a device, so that Windows always takes it. */
export function folderName(name: string): string
{
    const plain = name.replace(/[<>:"/\\|?*\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().replace(/[. ]+$/, "").slice(0, 80).trim().replace(/[. ]+$/, "");
    return plain === "" || deviceName.test(plain) ? "Campaign" : plain;
}

/**
 * What keeps Windows from using a folder's path as written, in a sentence that says which part and why: a part that ends with a dot or a space, which
 * Windows takes off, or a name it keeps for a device; none where it can. Node writes such a folder all the same, and then no program starts in it.
 */
export function windowsNameProblem(folder: string): string | undefined
{
    const parts = folder.slice(win32.parse(folder).root.length).split(/[\\/]/).filter((part) => part !== "");

    for (const part of parts) {
        if (/[. ]$/.test(part)) {
            return `${folder}: the folder "${part}" ends with a ${part.endsWith(".") ? "dot" : "space"}, which Windows takes off a folder's name. Choose a name without it.`;
        }

        if (deviceName.test(part)) {
            return `${folder}: "${part}" is a name Windows keeps for a device, never a folder's. Choose another name.`;
        }
    }

    return undefined;
}

/** The folder named so in `parent`, else with -2, -3… after it: never one that holds files already. */
function freeFolder(parent: string, name: string): string
{
    return withFiles(new FileStore(), () => {
        const there = files().entries(parent);
        // A file of that name takes it too; and a name that differs only by case, which some systems take for the same.
        const taken = (candidate: string): boolean => there.some((entry) => entry.name.toLowerCase() === candidate.toLowerCase() && (!entry.isFolder || files().entries(join(parent, entry.name)).length > 0));
        let chosen = name;

        for (let count = 2; taken(chosen); count++) {
            chosen = `${name}-${count}`;
        }

        return join(parent, chosen);
    });
}
