// The campaign: a folder with campaign.yaml, its settings, the present and the sessions.
export { createCampaign } from "./create-campaign.ts";
export { requireCampaign } from "./find-campaign.ts";
export { type CampaignSettings, changeSetting, checkSettingName, missingSettings, readSettings, type SettingName, settingNames } from "./settings.ts";
