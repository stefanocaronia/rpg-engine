// The master in Claude Code: its program started with no terminal, spoken to by its stream-json protocol, one JSON object a line each way.
import { join } from "node:path";
import { hosts } from "../../core/hosts.ts";
import { isHostName, type MasterChat, type MasterDriver, type MasterOptions } from "../chat.ts";
import { isFile } from "../program.ts";
import { heldChat, startHost } from "../state.ts";
import { claudeModels } from "./models.ts";
import { agentArguments, claudeEnvironment, claudeProgram, settingArguments, streamArguments } from "./program.ts";
import { builtInTools, subagentKinds, subagentTool } from "./protocol.ts";
import { readMessage } from "./read.ts";
import { askModel, changeModel, newTurn, type State, writeStop, writeWords } from "./state.ts";

/** Claude Code as the table drives it. */
export const claudeCode: MasterDriver = {
    open: (options) => openClaudeCode(options),
    missing: (folder) =>
        isFile(join(folder, ".mcp.json"))
            ? undefined
            : "This campaign has no .mcp.json, which tells Claude Code how to start the game's server: run rpg init in the campaign's folder, then try again.",
    program: claudeProgram,
    environment: claudeEnvironment,
    models: claudeModels,
    model: "opus",
    efforts: ["low", "medium", "high", "xhigh", "max"],
};

/** Opens a chat with the master in Claude Code, or takes one up again by its session. */
function openClaudeCode(options: MasterOptions): MasterChat
{
    // The last guard: a name that could be read as an option never becomes an argument.
    for (const name of [options.model, options.session].filter((value) => value !== undefined)) {
        if (!isHostName(name)) {
            throw new Error(`${JSON.stringify(name.slice(0, 200))} is no name of a model or a chat`);
        }
    }

    const state: State = {
        ...startHost(options, hosts.claudeCode.name, programArguments(options)),
        requests: 0,
        model: { asked: options.model, request: "" },
        ...(options.effort === undefined ? {} : { effort: options.effort }),
        protocol: {
            newTurn,
            words: (turn, text) => writeWords(state, turn, text),
            stop: () => writeStop(state),
            read: (message) => readMessage(state, message),
            change: (model, effort) => changeModel(state, model, effort),
        },
    };
    return heldChat(state, () => askModel(state));
}

/**
 * The program's arguments after its own: the protocol, the model and effort, the campaign's settings and its rpg server alone, the tools allowed, a subagent
 * asked before it starts, the chat taken up.
 */
function programArguments(options: MasterOptions): string[]
{
    // The subagent tool serves a character played apart and a page of the web read: given where either is allowed, and each start asked of the table.
    const subagents = subagentKinds.some((kind) => options.allowed.includes(kind));
    const tools = builtInTools.filter((tool) => (tool.name === subagentTool ? subagents : options.allowed.includes(tool.kind))).map((tool) => tool.name);
    return [
        ...streamArguments,
        "--include-partial-messages",
        "--permission-prompt-tool",
        "stdio",
        "--model",
        options.model,
        ...(options.effort === undefined ? [] : ["--effort", options.effort]),
        ...settingArguments,
        "--mcp-config",
        join(options.folder, ".mcp.json"),
        "--disable-slash-commands",
        "--tools",
        tools.join(","),
        ...(subagents ? agentArguments : []),
        ...(options.session === undefined ? [] : ["--resume", options.session]),
    ];
}
