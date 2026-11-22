// The tabs of Settings: the game, the master and the campaign, whose settings are the campaign's, then the page's own, kept in this browser; each in the
// address, as #/settings/master.
import { t } from "../text.ts";

/** The tabs, in the order the page shows them: the first one's address is the section's own, #/settings. */
export const settingsTabs = ["game", "master", "campaign", "page"] as const;

export type SettingsTab = (typeof settingsTabs)[number];

/** The tab an address names; the first for none, or for one Settings do not have. */
export function settingsTab(written: string | undefined): SettingsTab
{
    return settingsTabs.find((tab) => tab === written) ?? settingsTabs[0];
}

/** A tab's name, in the page's language. */
export function settingsTabLabel(tab: SettingsTab): string
{
    const labels: Record<SettingsTab, string> = { game: t("Game"), master: t("Master"), campaign: t("Campaign"), page: t("This page") };
    return labels[tab];
}
