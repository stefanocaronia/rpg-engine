import { McpServer, type RegisteredTool } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import type { RequestHandlerExtra } from "@modelcontextprotocol/sdk/shared/protocol.js";
import type { CallToolResult, ClientCapabilities, ServerNotification, ServerRequest } from "@modelcontextprotocol/sdk/types.js";
import { commands } from "./commands/index.ts";
import { type Context, defaultContext, type Player } from "./core/context.ts";
import type { Command } from "./core/registry.ts";
import { getVersion } from "./core/version.ts";
import { startInstructions } from "./instructions/index.ts";

type AnyCommand = Command<any, any>;
type ToolExtra = RequestHandlerExtra<ServerRequest, ServerNotification>;

// How long the player may take to click: as long as a host waits for a tool call that keeps reporting progress.
const playerWait = 30 * 60 * 1000;

// While the player decides, the call reports progress this often, so that a host does not take it for a call that hangs.
const progressEvery = 20 * 1000;

/**
 * The MCP server: every command becomes a tool with the same name, description and parameters, and answers with the same text as the command line. Its instructions send
 * the host to instructions, then status. The commands that ask the player appear only for a host that shows forms, through which they ask (D-148).
 */
export function createMcpServer(context: Context = defaultContext()): McpServer
{
    const server = new McpServer({ name: "rpg", version: getVersion() }, { instructions: startInstructions() });
    const askingTools: RegisteredTool[] = [];

    for (const command of commands) {
        const tool = server.registerTool(command.name, toolConfig(command), (input: unknown, extra: ToolExtra) => runTool(command, input, context, extra));

        if (command.needsPlayer && context.player === undefined) {
            tool.disable();
            askingTools.push(tool);
        }
    }

    server.server.oninitialized = () => {
        if (context.player === undefined && showsForms(server.server.getClientCapabilities())) {
            context.player = formPlayer(server);
            askingTools.forEach((tool) => tool.enable());
        }
    };

    return server;
}

/** Serves the tools over standard input and output, as AI hosts expect; it runs until the host closes it. */
export async function startMcpServer(): Promise<void>
{
    await createMcpServer().connect(new StdioServerTransport());
}

function toolConfig(command: AnyCommand)
{
    const annotations = command.readOnly ? { readOnlyHint: true } : undefined;
    const meta = command.alwaysLoad ? { "anthropic/alwaysLoad": true } : undefined;
    return { description: command.description, inputSchema: command.input.strict(), annotations, _meta: meta };
}

async function runTool(command: AnyCommand, input: unknown, context: Context, extra: ToolExtra): Promise<CallToolResult>
{
    const keepAlive = command.needsPlayer ? reportProgress(extra) : undefined;

    try {
        return { content: [{ type: "text", text: command.format(await command.run(input, context)) }] };
    } catch (error) {
        return { content: [{ type: "text", text: error instanceof Error ? error.message : String(error) }], isError: true };
    } finally {
        clearInterval(keepAlive);
    }
}

/** Whether the host shows forms (MCP elicitation): before the url mode existed, a capability without modes meant forms. */
function showsForms(capabilities: ClientCapabilities | undefined): boolean
{
    const elicitation = capabilities?.elicitation as { form?: unknown; url?: unknown; } | undefined;
    return elicitation !== undefined && (elicitation.form !== undefined || elicitation.url === undefined);
}

/** The player through the host's forms: one question, one choice among the labels, required; undefined when no one answered or the form failed. */
function formPlayer(server: McpServer): Player
{
    return {
        async choose(question, title, labels)
        {
            try {
                const requestedSchema = { type: "object" as const, properties: { choice: { type: "string" as const, title, enum: labels } }, required: ["choice"] };
                const reply = await server.server.elicitInput({ mode: "form", message: question, requestedSchema }, { timeout: playerWait });
                const index = reply.action === "accept" ? labels.indexOf(String(reply.content?.choice)) : -1;
                return index === -1 ? undefined : index;
            } catch {
                return undefined;
            }
        },
    };
}

/** Progress notifications while the player decides, when the host asked for them; undefined when it did not. */
function reportProgress(extra: ToolExtra): ReturnType<typeof setInterval> | undefined
{
    const progressToken = extra._meta?.progressToken;

    if (progressToken === undefined) {
        return undefined;
    }

    let progress = 0;
    return setInterval(() => void extra.sendNotification({ method: "notifications/progress", params: { progressToken, progress: ++progress, message: "waiting for the player" } }).catch(() => undefined), progressEvery);
}
