// The campaign: a folder with campaign.yaml, its settings, the present and the sessions.
export { createCampaign } from "./create-campaign.ts";
export { requireCampaign } from "./find-campaign.ts";
export {
    type CampaignSettings,
    changeListSetting,
    changeSetting,
    checkSettingName,
    checkSettings,
    difficulties,
    lethalities,
    listSettingNames,
    missingSettings,
    readCoinsSetting,
    readSettings,
    type SettingName,
    settingNames,
} from "./settings.ts";
export { type CampaignState, changeState, changeStateAt, readState, readStateValues } from "./state.ts";
