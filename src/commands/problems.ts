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
import { systemOccasions, systemProblems } from "./game-world.ts";

/** Every problem in a campaign: its settings, its game system and coins, its log, its world, its game time, its planned events, its effects and its open scene. */
export function campaignProblems(root: string, world: World, context: Context): Problem[]
{
    return [
        ...checkSettings(root),
        ...systemProblems(root, context),
        ...moneyProblems(root, context),
        ...checkLog(root),
        ...checkWorld(world),
        ...timeProblems(root),
        ...eventProblems(world),
        ...effectProblems(world, readOpenScene(root).scene, readPresent(root).date, systemOccasions(root, context)),
        ...sceneProblems(root, world),
    ];
}
