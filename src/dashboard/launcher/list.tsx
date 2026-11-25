// The campaigns of this computer, as rows: each one a button the row's width that opens it, its name over its game system and when it was last opened, then
// where it is; the one whose table answers says so. One whose folder is gone, or that does not read, says it and can only be taken off the list.
import { Icon } from "../parts/icons.tsx";
import { pageLocale, t } from "../text.ts";
import type { ListedCampaign } from "./api.ts";
import { campaignMeta, campaignState, opens } from "./campaigns.ts";

/** What the list is doing with a campaign, and what went wrong with one, each by its folder. */
export interface ListStanding
{
    /** The campaign being opened, with the words that say so. */
    opening?: { root: string; words: string; } | undefined;
    /** Something is on its way: nothing else starts meanwhile. */
    busy: boolean;
    problem?: { root: string; text: string; } | undefined;
}

export function CampaignList({ campaigns, standing, now, onOpen, onRemove }: {
    campaigns: ListedCampaign[];
    standing: ListStanding;
    now: Date;
    onOpen(campaign: ListedCampaign): void;
    onRemove(campaign: ListedCampaign): void;
})
{
    // The arrows move along the rows that open, Home and End to the ends; Tab reaches each row too, and what takes it off the list.
    const move = (event: KeyboardEvent): void => {
        const step = event.key === "ArrowDown" ? 1 : event.key === "ArrowUp" ? -1 : 0;
        const rows = [...(event.currentTarget as HTMLElement).querySelectorAll<HTMLElement>("button.launcher-row")];
        const at = rows.indexOf(event.target as HTMLElement);

        if (at < 0 || (step === 0 && event.key !== "Home" && event.key !== "End")) {
            return;
        }

        event.preventDefault();
        rows[event.key === "Home" ? 0 : event.key === "End" ? rows.length - 1 : Math.min(rows.length - 1, Math.max(0, at + step))]?.focus();
    };

    return (
        <ul class="launcher-rows" onKeyDown={move}>
            {campaigns.map((campaign, index) => (
                <CampaignRow
                    key={campaign.root}
                    id={`launcher-campaign-${index}`}
                    campaign={campaign}
                    meta={campaignMeta(campaign, now, pageLocale())}
                    opening={standing.opening?.root === campaign.root ? standing.opening.words : undefined}
                    busy={standing.busy}
                    problem={standing.problem?.root === campaign.root ? standing.problem.text : undefined}
                    onOpen={() => onOpen(campaign)}
                    onRemove={() => onRemove(campaign)}
                />
            ))}
        </ul>
    );
}

function CampaignRow({ id, campaign, meta, opening, busy, problem, onOpen, onRemove }: {
    id: string;
    campaign: ListedCampaign;
    meta: string;
    opening: string | undefined;
    busy: boolean;
    problem: string | undefined;
    onOpen(): void;
    onRemove(): void;
})
{
    const state = campaignState(campaign);
    const remove = t("Remove {name} from the list…", { name: campaign.name });
    const words = (
        <>
            <span class="launcher-name">
                <bdi id={`${id}-name`}>{campaign.name}</bdi>
                {state === "open" && (
                    <span id={`${id}-open`} class="launcher-open">
                        <span class="launcher-dot" aria-hidden="true" />
                        {t("Open now")}
                    </span>
                )}
            </span>
            <span id={`${id}-meta`} class="launcher-meta">
                {state === "missing" && <Icon name="alert" />}
                {state === "unreadable" && <Icon name="alert" />}
                {opening ?? (state === "missing" ? t("Folder not found") : state === "unreadable" ? t("Cannot be read: {why}", { why: campaign.problem ?? "" }) : <bdi>{meta}</bdi>)}
            </span>
            <span id={`${id}-where`} class="launcher-where">
                <bdi dir="ltr">{campaign.root}</bdi>
            </span>
        </>
    );
    return (
        <li class={`launcher-item state-${state}`}>
            {opens(campaign)
                ? (
                    <button
                        type="button"
                        class="launcher-row"
                        aria-labelledby={state === "open" ? `${id}-name ${id}-open` : `${id}-name`}
                        aria-describedby={`${id}-meta ${id}-where`}
                        aria-busy={opening !== undefined}
                        aria-disabled={busy}
                        onClick={() => !busy && onOpen()}
                    >
                        {words}
                    </button>
                )
                : <div class="launcher-row unusable">{words}</div>}
            <button type="button" class="icon-button launcher-remove tip-left" aria-label={remove} data-tip={remove} aria-disabled={busy} onClick={() => !busy && onRemove()}>
                <Icon name="close" />
            </button>
            {problem !== undefined && <p class="launcher-problem" role="alert" dir="auto">{problem}</p>}
        </li>
    );
}
