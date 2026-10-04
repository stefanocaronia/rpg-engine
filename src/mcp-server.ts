import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { commands } from "./commands/index.ts";
import { type Context, defaultContext } from "./core/context.ts";
import type { Command } from "./core/registry.ts";
import { getVersion } from "./core/version.ts";
import { startInstructions } from "./instructions/index.ts";

type AnyCommand = Command<any, any>;

/** The MCP server: every command becomes a tool with the same name, description and parameters, and answers with the same text as the command line. Its instructions send the host to instructions, then status. */
export function createMcpServer(context: Context = defaultContext()): McpServer
{
    const server = new McpServer({ name: "rpg", version: getVersion() }, { instructions: startInstructions() });

    for (const command of commands) {
        server.registerTool(command.name, toolConfig(command), (input: unknown) => runTool(command, input, context));
    }

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

async function runTool(command: AnyCommand, input: unknown, context: Context): Promise<CallToolResult>
{
    try {
        return { content: [{ type: "text", text: command.format(await command.run(input, context)) }] };
    } catch (error) {
        return { content: [{ type: "text", text: error instanceof Error ? error.message : String(error) }], isError: true };
    }
}
