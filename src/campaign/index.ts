// The campaign: a folder with campaign.yaml, its settings, the present, the sessions and the files an AI host reads.
export { createCampaign } from "./create-campaign.ts";
export { campaignFileName, findCampaign, houseRulesFolderName, requireCampaign } from "./find-campaign.ts";
export { refreshHostFiles } from "./host-files.ts";
export {
    type CampaignSettings,
    changeListSetting,
    changeMapSetting,
    changeOtherSetting,
    changeSetting,
    checkSettingName,
    checkSettings,
    difficulties,
    lethalities,
    listSettingNames,
    mapSettingNames,
    missingSettings,
    readCampaignData,
    readCoinsSetting,
    readListSetting,
    readOneSetting,
    readSettings,
    readTextSetting,
    type SettingName,
    settingNames,
} from "./settings.ts";
export { type CampaignState, changeState, changeStateAt, readState, readStateValues } from "./state.ts";
