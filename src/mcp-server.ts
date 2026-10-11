import { McpServer, type RegisteredTool } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import type { RequestHandlerExtra } from "@modelcontextprotocol/sdk/shared/protocol.js";
import type { CallToolResult, ClientCapabilities, ServerNotification, ServerRequest } from "@modelcontextprotocol/sdk/types.js";
import { findCampaign, refreshHostFiles } from "./campaign/index.ts";
import { newChatBegun, newChatText, wentBackTo } from "./commands/game-saves.ts";
import { campaignWorld } from "./commands/game-world.ts";
import { commands } from "./commands/index.ts";
import { type Context, defaultContext, type Player } from "./core/context.ts";
import type { Command } from "./core/registry.ts";
import { SessionStore } from "./core/session-store.ts";
import { withFiles } from "./core/store.ts";
import { getVersion } from "./core/version.ts";
import { type Dashboard, startDashboard } from "./dashboard-server.ts";
import { startInstructions } from "./instructions/index.ts";
import { codexPictures } from "./pictures/index.ts";

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
 * the host to instructions, then status. The commands that ask the player appear for a host that shows forms, through which they ask (D-148), and wherever the
 * dashboard runs, whose page asks first (D-279).
 */
export function createMcpServer(context: Context = defaultContext(), environment: Record<string, string | undefined> = process.env, beforeCall?: () => Promise<void>): McpServer
{
    const server = new McpServer({ name: "rpg", version: getVersion() }, { instructions: startInstructions() });
    const askingTools: RegisteredTool[] = [];
    // A server lives as long as its chat: it gives each part of the instructions once (D-97).
    context.told ??= new Set();

    // Before each call, once the files are read again: the dashboard opens, and its page asks the player too, so the asking tools are there, forms or not (ASK-1, D-279).
    const prepare = async (): Promise<void> => {
        await beforeCall?.();

        if (context.page !== undefined) {
            askingTools.filter((tool) => !tool.enabled).forEach((tool) => tool.enable());
        }
    };

    for (const command of commands) {
        const tool = server.registerTool(command.name, toolConfig(command), (input: unknown, extra: ToolExtra) => runTool(command, input, context, extra, prepare));

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

                if (context.page === undefined) {
                    askingTools.forEach((tool) => tool.disable());
                }
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
    // Codex makes the places' pictures where the player is logged in with it (D-308).
    const context: Context = { ...defaultContext(), pictures: codexPictures() };
    const session = new SessionStore({ systemFolders: context.systemFolders });
    const served: Context = { ...context, files: session };
    await createMcpServer(served, process.env, dashboardOpener(served, session).open).connect(new StdioServerTransport());
}

/**
 * Opens the player's dashboard before the first call that finds a campaign in the server's folder, as after init, and lets that call wait for it, so that its
 * status gives the link (D-270, D-277); never in a folder without a campaign. The game goes on without it.
 */
export function dashboardOpener(context: Context, session: SessionStore, ports?: number[]): { open(): Promise<void>; close(): Promise<void>; }
{
    let opening: Promise<Dashboard | undefined> | undefined;
    return {
        open: async () => {
            opening ??= withFiles(session, () => findCampaign(context.folder)) === undefined ? undefined : startDashboard(context, session, { ports }).catch(() => undefined);
            const dashboard = await opening;
            context.dashboard = dashboard?.url;
            context.page = dashboard?.player;
            context.news = dashboard?.news;
        },
        close: async () => {
            await (await opening)?.close();
        },
    };
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

async function runTool(command: AnyCommand, input: unknown, context: Context, extra: ToolExtra, prepare: () => Promise<void>): Promise<CallToolResult>
{
    const keepAlive = command.needsPlayer ? reportProgress(extra, () => context.page?.asking?.() === true) : undefined;
    let news: { lines: string[]; restore(): void; } | undefined;
    // What the chat was told before the call: an answer that never goes tells nothing, so its parts are told again (D-97).
    const told = new Set(context.told);

    try {
        // In a session, the files that changed since the last call are read again; instructions starts a chat, or follows a summary: everything is checked (D-193).
        if (context.files instanceof SessionStore) {
            await context.files.ready(command.name === "instructions");
        }

        await prepare();
        // After a load the chat going on remembers what is gone: nothing runs in it, until a new chat begins with instructions (D-361).
        const back = chatAfterLoad(context, command.name);

        if (back.refused !== undefined) {
            news = context.news?.();
            return { content: [{ type: "text", text: [...(news?.lines ?? []), back.refused].join("\n\n") }], isError: true };
        }

        // The call's own context, with its cancel, as the user stopping it (ASK-9).
        const text = command.format(await command.run(input, { ...context, signal: extra.signal }));
        // What the player changed on the dashboard comes first, once, what they changed while the call waited included (D-341).
        news = context.news?.();
        return { content: [{ type: "text", text: [...(news?.lines ?? []), ...back.begun, text].join("\n\n") }] };
    } catch (error) {
        news ??= context.news?.();
        return { content: [{ type: "text", text: [...(news?.lines ?? []), error instanceof Error ? error.message : String(error)].join("\n\n") }], isError: true };
    } finally {
        clearInterval(keepAlive);

        // An answer that never goes, as for a call the user stopped, gives what the player changed back to the next one, and its parts.
        if (extra.signal.aborted) {
            news?.restore();
            context.told?.clear();
            told.forEach((name) => context.told?.add(name));
        }
    }
}

/**
 * The chat after a load (SAV-5, D-361): one going on when the game went back remembers what is gone, so every call of it is refused; instructions begins a new
 * chat, which goes on from the save, told so once.
 */
function chatAfterLoad(context: Context, command: string): { refused?: string; begun: string[]; }
{
    const run = <T>(work: () => T): T => (context.files === undefined ? work() : withFiles(context.files, work));
    return run(() => {
        const root = findCampaign(context.folder);
        const save = root === undefined ? undefined : wentBackTo(root);

        if (root === undefined || save === undefined) {
            return { begun: [] };
        }

        if (command !== "instructions") {
            return { refused: `The game went back to save ${save}. ${newChatText} Do not call instructions here: a new chat begins with it.`, begun: [] };
        }

        newChatBegun(root);
        return { begun: [`The game went back to save ${save} before this chat: start the story again from there, as status gives it, and tell nothing of what came after.`] };
    });
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
        async choose(question, title, labels, signal)
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
                // A stop of the call closes the form too (ASK-9).
                const reply = await server.server.elicitInput({ mode: "form", message: question, requestedSchema }, { timeout: playerWait, signal });

                if (reply.action !== "accept") {
                    return notShown();
                }

                const index = labels.indexOf(String(reply.content?.choice));
                return index === -1 ? undefined : index;
            } catch {
                return signal?.aborted === true ? undefined : notShown();
            }
        },
    };
}

/** Progress notifications while the player decides, when the host asked for them, saying where when the question is on the dashboard; undefined otherwise. */
function reportProgress(extra: ToolExtra, onPage: () => boolean): ReturnType<typeof setInterval> | undefined
{
    const progressToken = extra._meta?.progressToken;

    if (progressToken === undefined) {
        return undefined;
    }

    let progress = 0;
    return setInterval(() => {
        const message = onPage() ? "waiting for the player's click on the dashboard" : "waiting for the player";
        void extra.sendNotification({ method: "notifications/progress", params: { progressToken, progress: ++progress, message } }).catch(() => undefined);
    }, progressEvery);
}
