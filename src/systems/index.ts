// The game systems installed beside the engine (D-27, SYS-1): which they are and what each declares. Their pages are read by the pages module.
export { type CampaignData, campaignDataNames, type SystemLayer } from "./campaign-data.ts";
export { givenCode, type LoadedSystemCode, loadSystemCode, systemApiProblem, systemHasCode, type SystemPackage, systemPackage, systemPageModule } from "./code.ts";
export { type SystemFolder, systemFolders } from "./folders.ts";
export {
    type ActVerb,
    type CheckAtom,
    type CheckOperator,
    type DamageRule,
    type GameSystem,
    type GridRules,
    type Lifestyle,
    type Recipe,
    type Reward,
    rollName,
    rulesetSetting,
    type SheetEntry,
    type SheetGroup,
    type SheetVerb,
    type SystemCheck,
    systemFileName,
    type SystemSetting,
    type Threshold,
    type Travel,
    type TravelKind,
    type TurnUse,
} from "./game-system.ts";
export { findCampaignSystem, findSystem, installedSystems, readableSystems, systemContentFolders, systemInFolder } from "./installed.ts";
export { engineOfferings, engineSettingValue, heldSettings, offeredEngineValues, playedValueOf, withSettings } from "./settings.ts";
export { layeredSystemWords, type SystemWords, systemWords } from "./words.ts";
