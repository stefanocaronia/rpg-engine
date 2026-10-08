import { McpServer, type RegisteredTool } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import type { RequestHandlerExtra } from "@modelcontextprotocol/sdk/shared/protocol.js";
import type { CallToolResult, ClientCapabilities, ServerNotification, ServerRequest } from "@modelcontextprotocol/sdk/types.js";
import { findCampaign, refreshHostFiles } from "./campaign/index.ts";
import { campaignWorld } from "./commands/game-world.ts";
import { commands } from "./commands/index.ts";
import { type Context, defaultContext, type Player } from "./core/context.ts";
import type { Command } from "./core/registry.ts";
import { SessionStore } from "./core/session-store.ts";
import { withFiles } from "./core/store.ts";
import { getVersion } from "./core/version.ts";
import { startInstructions } from "./instructions/index.ts";

type AnyCommand = Command<any, any>;
type ToolExtra = RequestHandlerExtra<ServerRequest, ServerNotification>;

// How long the player may take to click: as long as a host waits for a tool call that keeps reporting progress.
const playerWait = 30 * 60 * 1000;

// While the player decides, the call reports progress this often, so that a host does not take it for a call that hangs.
const progressEvery = 20 * 1000;

// A form closed faster than anyone could read it was never shown: the host declares forms it does not show (ASK-6).
const tooFastForPerson = 1500;

// Hosts that declare forms but do not show them, by the entry point Claude Code gives its servers: inside the desktop app a form is closed at once,
// or stays stuck while it renders (tried on 5 October 2026). There the master asks in words (ASK-1).
// A claude started from inside the desktop app inherits its entry point, so its servers leave out the forms too.
const entryPointsWithoutForms = ["claude-desktop"];

// Hosts ask for the tools tens of milliseconds after initialized: the world, which takes a second or more to read in a large campaign, is read after that.
const preloadAfter = 250;

/**
 * The MCP server: every command becomes a tool with the same name, description and parameters, and answers with the same text as the command line. Its instructions send
 * the host to instructions, then status. The commands that ask the player appear only for a host that shows forms, through which they ask (D-148).
 */
export function createMcpServer(context: Context = defaultContext(), environment: Record<string, string | undefined> = process.env): McpServer
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
        const hidesForms = entryPointsWithoutForms.includes(environment.CLAUDE_CODE_ENTRYPOINT ?? "");

        if (context.player === undefined && !hidesForms && showsForms(server.server.getClientCapabilities())) {
            context.player = formPlayer(server, () => {
                context.player = undefined;
                askingTools.forEach((tool) => tool.disable());
            });
            askingTools.forEach((tool) => tool.enable());
        }

        // The world is read once the host has the tools, never before: initialize and the list of tools answer at once (D-194).
        if (context.files instanceof SessionStore) {
            setTimeout(() => void preload(context, context.files as SessionStore), preloadAfter);
        }
    };

    return server;
}

/**
 * Serves the tools over standard input and output, as AI hosts expect, with the files kept for the whole session (D-137, D-193). It ends when the host
 * goes and its input closes: its watchers, or a player's form still waiting, never keep it alive.
 */
export async function startMcpServer(): Promise<void>
{
    const leave = (): never => process.exit(0);
    process.stdin.on("end", leave);
    process.stdin.on("close", leave);
    const context = defaultContext();
    await createMcpServer({ ...context, files: new SessionStore({ systemFolders: context.systemFolders }) }).connect(new StdioServerTransport());
}

/**
 * Reads the campaign of the server's folder, if there is one, before the first call needs it; a campaign that does not read waits for that call to say why.
 * Its start lines in AGENTS.md follow the engine, as after an update (D-97).
 */
async function preload(context: Context, session: SessionStore): Promise<void>
{
    try {
        await session.ready(true);
        withFiles(session, () => {
            const root = findCampaign(context.folder);

            if (root !== undefined) {
                session.track(root);
                refreshHostFiles(root, startInstructions());
                campaignWorld(root, context);
            }
        });
    } catch {
        // The call that needs the campaign reads it again, and says what is wrong.
    }
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
        // In a session, the files that changed since the last call are read again; instructions starts a chat, or follows a summary: everything is checked (D-193).
        if (context.files instanceof SessionStore) {
            await context.files.ready(command.name === "instructions");
        }

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

/**
 * The player through the host's forms: one question, one choice among the labels, required; undefined when no one answered or the form failed.
 * A form refused or failed faster than a person could read it was never shown: `unavailable` takes the buttons away for the rest of the session.
 */
function formPlayer(server: McpServer, unavailable: () => void): Player
{
    return {
        async choose(question, title, labels)
        {
            const started = Date.now();

            const notShown = (): "unavailable" | undefined => {
                if (Date.now() - started >= tooFastForPerson) {
                    return undefined;
                }

                unavailable();
                return "unavailable";
            };

            try {
                const requestedSchema = { type: "object" as const, properties: { choice: { type: "string" as const, title, enum: labels } }, required: ["choice"] };
                const reply = await server.server.elicitInput({ mode: "form", message: question, requestedSchema }, { timeout: playerWait });

                if (reply.action !== "accept") {
                    return notShown();
                }

                const index = labels.indexOf(String(reply.content?.choice));
                return index === -1 ? undefined : index;
            } catch {
                return notShown();
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
