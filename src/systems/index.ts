// The game systems installed beside the engine (D-27, SYS-1): which they are and what each declares. Their pages are read by the pages module.
export {
    type CampaignData,
    campaignDataNames,
    findCampaignSystem,
    findSystem,
    type GameSystem,
    type GridRules,
    installedSystems,
    type Recipe,
    type Reward,
    rollName,
    type SheetEntry,
    type SheetGroup,
    systemFileName,
    type SystemSetting,
    type Threshold,
    type Travel,
    type TravelKind,
    withSettings,
} from "./game-system.ts";
export { type SystemWords, systemWords } from "./words.ts";
