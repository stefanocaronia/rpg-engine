import { checkSettings } from "../campaign/index.ts";
import { checkLog } from "../core/log.ts";
import type { Problem } from "../core/problem.ts";
import { checkWorld, type World } from "../pages/index.ts";
import { moneyProblems } from "./game-money.ts";
import { sceneProblems } from "./game-scene.ts";
import { timeProblems } from "./game-time.ts";

/** Every problem in a campaign: its settings and coins, its log, its world, its game time and its open scene. */
export function campaignProblems(root: string, world: World): Problem[]
{
    return [...checkSettings(root), ...moneyProblems(root), ...checkLog(root), ...checkWorld(world), ...timeProblems(root, world), ...sceneProblems(root, world)];
}
