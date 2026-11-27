// The master in Codex: its program started with no terminal as `codex app-server`, spoken to by its own JSON-RPC protocol, in the campaign's folder.
import { hosts } from "../../core/hosts.ts";
import type { Failure, MasterChat, MasterDriver, MasterOptions } from "../chat.ts";
import { Requests } from "../lines.ts";
import { lackingServerFile } from "../program.ts";
import { heldChat, startHost } from "../state.ts";
import { codexModels } from "./models.ts";
import { codexEnvironment, codexProgram, serverArguments } from "./program.ts";
import { readMessage } from "./read.ts";
import { begin, changeModel, writeWords } from "./setup.ts";
import { newTurn, sendInterrupt, type State } from "./state.ts";

/** Codex as the table drives it: the model a new chat proposes is the first Codex lists, the account's own default. */
export const codex: MasterDriver = {
    open: (options) => openCodex(options),
    missing: (folder) => lacking(folder)?.why,
    lacking,
    program: codexProgram,
    environment: codexEnvironment,
    models: codexModels,
    model: "",
    efforts: ["low", "medium", "high", "xhigh", "max", "ultra"],
};

/** What a campaign lacks for Codex: the file that names the game's server. */
function lacking(folder: string): Failure | undefined
{
    return lackingServerFile(folder, ".codex/config.toml", hosts.codex.name);
}

/** Opens a chat with the master in Codex, or takes one up again by its thread; the player's words wait until the model is confirmed. */
function openCodex(options: MasterOptions): MasterChat
{
    const shared = startHost(options, hosts.codex.name, serverArguments(options.folder, options.allowed));
    const state: State = {
        ...shared,
        requests: new Requests((line) => shared.process.write(line)),
        ...(options.session === undefined ? {} : { resumed: options.session }),
        model: { asked: options.model, ...(options.effort === undefined ? {} : { effort: options.effort }) },
        agents: new Set(),
        others: [],
        protocol: {
            newTurn,
            words: (turn, text) => writeWords(state, turn, text),
            stop: (turn) => sendInterrupt(state, turn),
            read: (message) => readMessage(state, message),
            change: (model, effort) => changeModel(state, model, effort),
        },
    };
    return heldChat(state, () => begin(state));
}
