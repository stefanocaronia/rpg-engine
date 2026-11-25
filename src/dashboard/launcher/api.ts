// What the launcher's page asks the launcher: the campaigns of this computer, and one opened, made, added or taken off the list.
import type { ChatHost } from "../data.ts";
import { t } from "../text.ts";

/** A campaign as the launcher lists it. */
export interface ListedCampaign
{
    /** Its folder, by its whole path. */
    root: string;
    name: string;
    system?: string;
    language?: string;
    /** When it was last opened from the launcher, as an ISO date. */
    opened?: string;
    /** Its table answers now. */
    open: boolean;
    /** Its folder, or its file, is gone. */
    missing: boolean;
    /** Why its file does not read, where it does not. */
    problem?: string;
}

/** What the launcher's page shows: the engine, the folder new campaigns go in, the campaigns in their order, and what a new one may be made with. */
export interface LauncherNow
{
    version: string;
    folder: string;
    campaigns: ListedCampaign[];
    hosts: ChatHost[];
    systems: { name: string; title: string; }[];
    languages: string[];
}

/** A new campaign as the page asks for it; without a folder it goes in one named after it, in the folder of new campaigns. */
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

/** A refusal, in the launcher's words. */
export interface Refused
{
    error: string;
}

/** The launcher as it is now; it throws, in the page's words, when it does not answer. */
export async function readLauncher(): Promise<LauncherNow>
{
    try {
        const response = await fetch("/api/launcher");

        if (response.ok) {
            return await response.json() as LauncherNow;
        }
    } catch {
        // Said below, in the page's words.
    }

    throw new Error(away());
}

/** Opens a campaign, its table started where none answers, which may take some seconds: its page's link, and whether the launcher opened it in a window. */
export function openCampaign(root: string): Promise<{ url: string; window?: boolean; } | Refused>
{
    return ask({ open: { root } });
}

/** Makes a campaign and opens it: its page's link, its folder and whether it opened in a window; a refusal names its folder once it was made. */
export function createCampaign(wish: CampaignWish): Promise<{ url: string; root: string; window?: boolean; } | (Refused & { root?: string; })>
{
    return ask({ create: wish });
}

/** Lists a folder that holds a campaign: the campaigns after it. */
export function addCampaign(root: string): Promise<{ campaigns: ListedCampaign[]; } | Refused>
{
    return ask({ add: { root } });
}

/**
 * Has the player choose a folder in the system's own window, titled with the words of the control they clicked and open in `start`: the folder, or that
 * they chose none.
 */
export function pickFolder(words: string, start?: string): Promise<{ folder: string; } | { cancelled: true; } | Refused>
{
    return ask({ pick: { title: windowTitle(words), ...(start === undefined ? {} : { start }) } });
}

/** The words of a control as the title of the window it opens: without the ellipsis that says it opens one, and as long as the launcher takes. */
export function windowTitle(words: string): string
{
    const title = words.replace(/\s*(?:…|\.\.\.)\s*$/u, "").trim();
    return (title === "" ? words.trim() : title).slice(0, 120);
}

/** Takes a campaign off the list, never a file of it: the campaigns after it. */
export function forgetCampaign(root: string): Promise<{ campaigns: ListedCampaign[]; } | Refused>
{
    return ask({ forget: { root } });
}

/** Asks one thing of the launcher: what it answers, a refusal in its own words, or in the page's that it does not answer. */
async function ask<Answer extends object>(wish: object): Promise<Answer | Refused>
{
    try {
        const response = await fetch("/api/launcher", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(wish) });
        const body = await response.json().catch(() => ({})) as Answer & { error?: string; };
        return response.ok && body.error === undefined ? body : { ...body, error: body.error ?? away() };
    } catch {
        return { error: away() };
    }
}

function away(): string
{
    return t("It did not reach the game: try again.");
}
