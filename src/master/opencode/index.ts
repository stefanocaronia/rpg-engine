// The master in OpenCode: its program started with no terminal as `opencode acp`, spoken to by the Agent Client Protocol, in the campaign's folder.
import { join } from "node:path";
import { acpModels, openAcp } from "../acp/index.ts";
import type { MasterDriver } from "../chat.ts";
import { isFile } from "../program.ts";
import { inFolder, openCodeEnvironment, openCodeProgram } from "./program.ts";
import { openCodeAcp } from "./tools.ts";

/** OpenCode as the table drives it: the model a new chat proposes is the first OpenCode lists, the one it would play itself. */
export const openCode: MasterDriver = {
    open: (options) => openAcp({ ...options, environment: inFolder(options.environment, options.folder) }, openCodeAcp),
    missing: (folder) =>
        isFile(join(folder, "opencode.json"))
            ? undefined
            : "This campaign has no opencode.json, which tells OpenCode how to start the game's server: run rpg init in the campaign's folder, then try again.",
    program: openCodeProgram,
    environment: openCodeEnvironment,
    models: (options) => acpModels({ ...options, environment: inFolder(options.environment, options.folder) }, openCodeAcp),
    model: "",
    efforts: ["minimal", "low", "medium", "high", "xhigh", "max"],
};
