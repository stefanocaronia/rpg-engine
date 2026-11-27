// The master in OpenCode: its program started with no terminal as `opencode acp`, spoken to by the Agent Client Protocol, in the campaign's folder.
import { acpModels, openAcp } from "../acp/index.ts";
import type { Failure, MasterDriver } from "../chat.ts";
import { lackingServerFile } from "../program.ts";
import { inFolder, masterEnvironment, openCodeEnvironment, openCodeProgram } from "./program.ts";
import { openCodeAcp } from "./tools.ts";

/** OpenCode as the table drives it: the model a new chat proposes is the first OpenCode lists, the one it would play itself. */
export const openCode: MasterDriver = {
    open: (options) => openAcp({ ...options, environment: masterEnvironment(inFolder(options.environment, options.folder), options.allowed) }, openCodeAcp),
    missing: (folder) => lacking(folder)?.why,
    lacking,
    program: openCodeProgram,
    environment: openCodeEnvironment,
    models: (options) => acpModels({ ...options, environment: inFolder(options.environment, options.folder) }, openCodeAcp),
    model: "",
    efforts: ["minimal", "low", "medium", "high", "xhigh", "max"],
    effortsOnceChosen: true,
};

/** What a campaign lacks for OpenCode: the file that names the game's server. */
function lacking(folder: string): Failure | undefined
{
    return lackingServerFile(folder, "opencode.json", openCodeAcp.name);
}
