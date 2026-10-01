import type { Command } from "../registry.js";
import { roll } from "./roll.js";

/** Every command of rpg-engine. */
export const commands: Command<any, any>[] = [roll];
