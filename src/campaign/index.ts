// The campaign: a folder with campaign.yaml, its settings, the present and the sessions.
export { createCampaign } from "./create-campaign.ts";
export { requireCampaign } from "./find-campaign.ts";
export { type CampaignSettings, changeListSetting, changeSetting, checkSettingName, listSettingNames, missingSettings, readSettings, type SettingName, settingNames } from "./settings.ts";
