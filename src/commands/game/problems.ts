import { checkSettings } from "../../campaign/index.ts";
import type { Context } from "../../core/context.ts";
import { checkLog } from "../../core/log.ts";
import type { Problem } from "../../core/problem.ts";
import { checkWorld, mapProblems, type World } from "../../pages/index.ts";
import { bondProblems } from "./bonds.ts";
import { effectProblems } from "./effects.ts";
import { eventProblems } from "./events.ts";
import { experienceProblems } from "./experience.ts";
import { gridProblems } from "./grids.ts";
import { imageProblems } from "./images.ts";
import { limitProblems } from "./limits.ts";
import { modeProblems } from "./mode.ts";
import { moneyProblems } from "./money.ts";
import { campaignExtensions } from "./packages/extensions.ts";
import { extensionWordsProblems } from "./packages/widgets.ts";
import { shortRoadProblems } from "./positions.ts";
import { questProblems } from "./quests.ts";
import { passageProblems, roadProblems } from "./roads.ts";
import { readOpenScene, sceneProblems } from "./scene.ts";
import { listValueProblems } from "./sheet.ts";
import { themeProblems } from "./theme.ts";
import { readPresent, timeProblems } from "./time.ts";
import { workedOutProblems } from "./worked-out.ts";
import { campaignSystem, systemOccasions, systemProblems, systemSettingProblems } from "./world.ts";

/** Every problem in a campaign: its settings, its game system and coins, its log, its world, its pictures, its roads, its game time, its planned events, its effects and its open scene. */
export function campaignProblems(root: string, world: World, context: Context): Problem[]
{
    const system = systemProblems(root, context);
    return [
        ...checkSettings(root),
        ...system,
        ...systemSettingProblems(root, context),
        ...themeProblems(root, context),
        ...moneyProblems(root, context),
        ...checkLog(root),
        ...checkWorld(world),
        // While what campaign.yaml adds does not read, what the pages hold is not judged by the system alone: that fix comes first (CAM-3).
        ...(system.length === 0 ? workedOutProblems(world) : []),
        ...listValueProblems(world, campaignSystem(root, context)),
        ...bondProblems(world, campaignSystem(root, context)),
        ...limitProblems(world, campaignSystem(root, context)),
        ...experienceProblems(world),
        ...imageProblems(root, context, world),
        ...roadProblems(world, campaignSystem(root, context)),
        ...passageProblems(world, campaignSystem(root, context)),
        ...mapProblems(world),
        ...gridProblems(world, readOpenScene(root).scene),
        ...shortRoadProblems(world),
        ...timeProblems(root, context),
        ...campaignExtensions(root, context).problems,
        ...extensionWordsProblems(root, context),
        ...modeProblems(root),
        ...eventProblems(world),
        ...questProblems(world),
        ...effectProblems(world, readOpenScene(root).scene, readPresent(root).date, systemOccasions(root, context)),
        ...sceneProblems(root, world),
    ];
}
