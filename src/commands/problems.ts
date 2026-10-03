import { checkSettings } from "../campaign/index.ts";
import { checkLog } from "../core/log.ts";
import type { Problem } from "../core/problem.ts";
import { checkWorld, type World } from "../pages/index.ts";
import { timeProblems } from "./game-time.ts";

/** Every problem in a campaign: its settings, its log, its world and its game time. */
export function campaignProblems(root: string, world: World): Problem[]
{
    return [...checkSettings(root), ...checkLog(root), ...checkWorld(world), ...timeProblems(root, world)];
}
