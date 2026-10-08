// The campaign: a folder with campaign.yaml, its settings, the present, the sessions and the files an AI host reads.
export { createCampaign } from "./create-campaign.ts";
export { campaignFileName, findCampaign, houseRulesFolderName, requireCampaign } from "./find-campaign.ts";
export { hostFileNames, refreshHostFiles } from "./host-files.ts";
export {
    type CampaignSettings,
    changeListSetting,
    changeListSettingToNone,
    changeMapSetting,
    changeOtherSetting,
    changeSetting,
    checkSettingName,
    checkSettings,
    companionWays,
    diceWays,
    difficulties,
    lethalities,
    listSettingNames,
    mapSettingNames,
    missingSettings,
    preparations,
    readCampaignData,
    readCoinsSetting,
    readListSetting,
    readOneSetting,
    readSettings,
    readTextSetting,
    rigors,
    saveModes,
    settingMeaning,
    type SettingName,
    settingNames,
    setupSettingNames,
    unansweredSettings,
    unitSystems,
} from "./settings.ts";
export { type CampaignState, changeState, changeStateAt, readState, readStateValues } from "./state.ts";
