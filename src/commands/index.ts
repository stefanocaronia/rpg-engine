import type { Command } from "../core/registry.ts";
import { advance } from "./advance.ts";
import { ask } from "./ask.ts";
import { change } from "./change.ts";
import { config } from "./config.ts";
import { effect } from "./effect.ts";
import { find } from "./find.ts";
import { init } from "./init.ts";
import { instructions } from "./instructions.ts";
import { mode } from "./mode.ts";
import { move } from "./move.ts";
import { reveal } from "./reveal.ts";
import { roll } from "./roll.ts";
import { rules } from "./rules.ts";
import { save } from "./save.ts";
import { scene } from "./scene.ts";
import { show } from "./show.ts";
import { status } from "./status.ts";
import { validate } from "./validate.ts";
import { view } from "./view.ts";
import { write } from "./write.ts";

/** Every command of rpg-engine. */
export const commands: Command<any, any>[] = [init, config, instructions, status, mode, validate, write, move, reveal, show, view, find, rules, roll, ask, change, effect, advance, scene, save];
