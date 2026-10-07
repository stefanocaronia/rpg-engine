import { checkSettings } from "../campaign/index.ts";
import type { Context } from "../core/context.ts";
import { checkLog } from "../core/log.ts";
import type { Problem } from "../core/problem.ts";
import { checkWorld, type World } from "../pages/index.ts";
import { effectProblems } from "./game-effects.ts";
import { eventProblems } from "./game-events.ts";
import { moneyProblems } from "./game-money.ts";
import { readOpenScene, sceneProblems } from "./game-scene.ts";
import { readPresent, timeProblems } from "./game-time.ts";
import { campaignSystem, systemOccasions, systemProblems, systemSettingProblems } from "./game-world.ts";
import { listValueProblems } from "./sheet.ts";
import { workedOutProblems } from "./worked-out.ts";

/** Every problem in a campaign: its settings, its game system and coins, its log, its world, its game time, its planned events, its effects and its open scene. */
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
        ...timeProblems(root),
        ...eventProblems(world),
        ...effectProblems(world, readOpenScene(root).scene, readPresent(root).date, systemOccasions(root, context)),
        ...sceneProblems(root, world),
    ];
}
