import { checkSettings } from "../campaign/index.ts";
import { checkLog } from "../core/log.ts";
import type { Problem } from "../core/problem.ts";
import { checkWorld, type World } from "../pages/index.ts";
import { effectProblems } from "./game-effects.ts";
import { eventProblems } from "./game-events.ts";
import { moneyProblems } from "./game-money.ts";
import { readOpenScene, sceneProblems } from "./game-scene.ts";
import { readPresent, timeProblems } from "./game-time.ts";

/** Every problem in a campaign: its settings and coins, its log, its world, its game time, its planned events, its effects and its open scene. */
export function campaignProblems(root: string, world: World): Problem[]
{
    return [
        ...checkSettings(root),
        ...moneyProblems(root),
        ...checkLog(root),
        ...checkWorld(world),
        ...timeProblems(root),
        ...eventProblems(world),
        ...effectProblems(world, readOpenScene(root).scene, readPresent(root).date),
        ...sceneProblems(root, world),
    ];
}
