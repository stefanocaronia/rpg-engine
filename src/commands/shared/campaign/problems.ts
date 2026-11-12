import { checkSettings } from "../../../campaign/index.ts";
import type { Context } from "../../../core/context.ts";
import { checkLog } from "../../../core/log.ts";
import type { Problem } from "../../../core/problem.ts";
import { checkWorld, mapProblems, type World } from "../../../pages/index.ts";
import { campaignExtensions } from "../packages/extensions.ts";
import { extensionWordsProblems } from "../packages/widgets.ts";
import { gridProblems } from "../places/grids.ts";
import { shortRoadProblems } from "../places/positions.ts";
import { passageProblems, roadProblems } from "../places/roads.ts";
import { effectProblems } from "../scene/effects.ts";
import { readOpenScene, sceneProblems } from "../scene/scene.ts";
import { bondProblems } from "../sheet/bonds.ts";
import { experienceProblems } from "../sheet/experience.ts";
import { workedOutProblems } from "../sheet/formula-problems.ts";
import { limitProblems } from "../sheet/limits.ts";
import { listValueProblems } from "../sheet/sheet.ts";
import { eventProblems } from "../time/events.ts";
import { readPresent, timeProblems } from "../time/time.ts";
import { imageProblems } from "./images.ts";
import { modeProblems } from "./mode.ts";
import { moneyProblems } from "./money.ts";
import { questProblems } from "./quests.ts";
import { themeProblems } from "./theme.ts";
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
