// The launcher's campaigns as its page reads them: how each stands, when it was last opened in the reader's words, and the new campaign as its form holds it.
// No drawing here: the page's parts draw what these say.
import { effortsOf, firstChoice, hostsFound, listedModel } from "../chat/chat.ts";
import type { ChatChoice, ChatHost } from "../data.ts";
import type { CampaignWish, LauncherNow, ListedCampaign } from "./api.ts";

/** How a listed campaign stands: its folder gone, its file unreadable, its table answering, or ready to open. */
export type CampaignState = "missing" | "unreadable" | "open" | "ready";

/** How a campaign stands; a folder that is gone says so before a file that does not read. */
export function campaignState(campaign: ListedCampaign): CampaignState
{
    return campaign.missing ? "missing" : campaign.problem !== undefined ? "unreadable" : campaign.open ? "open" : "ready";
}

/** Whether a campaign can be opened: one whose folder is gone, or that does not read, can only be taken off the list. */
export function opens(campaign: ListedCampaign): boolean
{
    const state = campaignState(campaign);
    return state === "open" || state === "ready";
}

/**
 * When a campaign was last opened, as a game says it, in a language: today, yesterday, some days or weeks ago, then its day, with the year when it is not
 * this one; nothing for one never opened, or a date that does not read. A moment ahead of the clock is today.
 */
export function openedLabel(opened: string | undefined, now: Date, locale: string): string | undefined
{
    const date = opened === undefined ? undefined : new Date(opened);

    if (date === undefined || Number.isNaN(date.getTime())) {
        return undefined;
    }

    const midnight = (day: Date): number => new Date(day.getFullYear(), day.getMonth(), day.getDate()).getTime();
    const days = Math.max(0, Math.round((midnight(now) - midnight(date)) / 86_400_000));
    const relative = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });

    if (days < 7) {
        return relative.format(-days, "day");
    }

    if (days < 30) {
        return relative.format(-Math.floor(days / 7), "week");
    }

    return new Intl.DateTimeFormat(locale, { day: "numeric", month: "short", ...(date.getFullYear() === now.getFullYear() ? {} : { year: "numeric" }) }).format(date);
}

/** What a row says under a campaign's name: its game system, then when it was last opened. */
export function campaignMeta(campaign: ListedCampaign, now: Date, locale: string): string
{
    return [campaign.system, openedLabel(campaign.opened, now, locale)].filter((part) => part !== undefined && part !== "").join(" · ");
}

/** A folder's own name, the last part of its path, as either system writes it. */
export function folderName(path: string): string
{
    return path.split(/[\\/]/).filter((part) => part !== "").at(-1) ?? path;
}

/**
 * The campaign of the list at the folder an address asks for, compared as the launcher compares its folders, which it gives whole: in any case where the
 * path is one of Windows, with a separator at its end or not; none where it is no campaign of the list.
 */
export function listedAt(campaigns: ListedCampaign[], root: string): ListedCampaign | undefined
{
    const key = (path: string): string => {
        const plain = path.length > 1 ? path.replace(/[\\/]+$/, "") : path;
        return /^([a-z]:|\\\\)/i.test(path) ? plain.toLowerCase() : plain;
    };

    return campaigns.find((campaign) => key(campaign.root) === key(root));
}

/** A new campaign as its form holds it: the folder only when the player chose one, the chat's choice only where an app is on this computer. */
export interface NewCampaign
{
    name: string;
    language: string;
    system: string;
    folder?: string;
    chat?: ChatChoice;
}

/**
 * The form as it opens: the page's own language where the launcher offers it, else English; the first game system; the first app the page can open a chat
 * in, with the model it proposes among those it offers.
 */
export function firstForm(launcher: Pick<LauncherNow, "languages" | "systems" | "hosts">, pageLanguage: string): NewCampaign
{
    const chat = firstChoice({ hosts: launcher.hosts });
    return {
        name: "",
        language: launcher.languages.includes(pageLanguage) ? pageLanguage : launcher.languages.includes("en") ? "en" : launcher.languages[0] ?? "en",
        system: launcher.systems[0]?.name ?? "",
        ...(chat === undefined ? {} : { chat }),
    };
}

/** The form without the folder the player chose: the campaign goes where new ones do. */
export function inUsualFolder(form: NewCampaign): NewCampaign
{
    return { name: form.name, language: form.language, system: form.system, ...(form.chat === undefined ? {} : { chat: form.chat }) };
}

/**
 * What the form asks of the launcher: nothing while it has no name or no game system. The chat's app goes only when the page can open a chat in it, with
 * the model it proposes where the player left none, and the effort only where that model takes it.
 */
export function wishOf(form: NewCampaign, hosts: ChatHost[]): CampaignWish | undefined
{
    const name = form.name.trim();

    if (name === "" || form.system === "" || form.language === "") {
        return undefined;
    }

    const host = hostsFound({ hosts }).found.find((one) => one.id === form.chat?.host);
    const written = form.chat?.model.trim() ?? "";
    const model = host === undefined ? "" : written === "" ? listedModel(host, undefined) : written;
    const effort = form.chat?.effort;
    return {
        name,
        ...(form.folder === undefined ? {} : { folder: form.folder }),
        language: form.language,
        system: form.system,
        ...(host === undefined ? {} : { host: host.id, model, ...(effort !== undefined && effortsOf(host, model).includes(effort) ? { effort } : {}) }),
    };
}
