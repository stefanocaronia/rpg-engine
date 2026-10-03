import type { Command } from "../core/registry.ts";
import { change } from "./change.ts";
import { config } from "./config.ts";
import { find } from "./find.ts";
import { init } from "./init.ts";
import { roll } from "./roll.ts";
import { show } from "./show.ts";
import { status } from "./status.ts";
import { validate } from "./validate.ts";
import { write } from "./write.ts";

/** Every command of rpg-engine. */
export const commands: Command<any, any>[] = [init, config, status, validate, write, show, find, roll, change];
