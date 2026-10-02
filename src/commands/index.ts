import type { Command } from "../core/registry.ts";
import { roll } from "./roll.ts";

/** Every command of rpg-engine. */
export const commands: Command<any, any>[] = [roll];
