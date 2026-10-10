import { checkSettings } from "../campaign/index.ts";
import type { Context } from "../core/context.ts";
import { checkLog } from "../core/log.ts";
import type { Problem } from "../core/problem.ts";
import { checkWorld, type World } from "../pages/index.ts";
import { effectProblems } from "./game-effects.ts";
import { eventProblems } from "./game-events.ts";
import { experienceProblems } from "./game-experience.ts";
import { gridProblems } from "./game-grids.ts";
import { imageProblems } from "./game-images.ts";
import { mapProblems } from "./game-maps.ts";
import { modeProblems } from "./game-mode.ts";
import { moneyProblems } from "./game-money.ts";
import { shortRoadProblems } from "./game-positions.ts";
import { passageProblems, roadProblems } from "./game-roads.ts";
import { readOpenScene, sceneProblems } from "./game-scene.ts";
import { readPresent, timeProblems } from "./game-time.ts";
import { campaignSystem, systemOccasions, systemProblems, systemSettingProblems } from "./game-world.ts";
import { listValueProblems } from "./sheet.ts";
import { workedOutProblems } from "./worked-out.ts";

/** Every problem in a campaign: its settings, its game system and coins, its log, its world, its pictures, its roads, its game time, its planned events, its effects and its open scene. */
export function campaignProblems(root: string, world: World, context: Context): Problem[]
{
    const system = systemProblems(root, context);
    return [
        ...checkSettings(root),
        ...system,
        ...systemSettingProblems(root, context),
        ...moneyProblems(root, context),
        ...checkLog(root),
        ...checkWorld(world),
        // While what campaign.yaml adds does not read, what the pages hold is not judged by the system alone: that fix comes first (CAM-3).
        ...(system.length === 0 ? workedOutProblems(world) : []),
        ...listValueProblems(world, campaignSystem(root, context)),
        ...experienceProblems(world),
        ...imageProblems(root, context, world),
        ...roadProblems(world, campaignSystem(root, context)),
        ...passageProblems(world, campaignSystem(root, context)),
        ...mapProblems(world),
        ...gridProblems(world, readOpenScene(root).scene),
        ...shortRoadProblems(world),
        ...timeProblems(root),
        ...modeProblems(root),
        ...eventProblems(world),
        ...effectProblems(world, readOpenScene(root).scene, readPresent(root).date, systemOccasions(root, context)),
        ...sceneProblems(root, world),
    ];
}
