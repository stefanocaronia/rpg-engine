// The one chat at a campaign's table (D-582): its MCP server on the table's own context, over the rest of its socket, and beside it the other servers the
// same chat starts, as a character's subagent's in Codex, which only look (D-588 (2)); as the chat's own leaves, the others go with it, and the context is
// given back as a newly started server finds it, but for the files' session and the dashboard, which live on.
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import type { Socket } from "node:net";
import { PassThrough } from "node:stream";
import { type ChatFolders, type Context, forgetChat } from "../../core/context.ts";
import type { Dashboard } from "../dashboard/index.ts";
import { createMcpServer, serveOver } from "../mcp.ts";
import { subagentRefusal } from "../subagent.ts";

/** The chat at the table now, one at a time. */
export interface Seat
{
    /** The name the chat's client gives itself; none while the seat is empty. */
    host(): string | undefined;
    /** What the table reads of the environment the chat's `rpg mcp` started in; empty while the seat is empty. */
    environment(): Record<string, string>;
    taken(): boolean;
    /** Whether a hello, by the environment it gave, is another server of the chat that sits: the token the table's own chat gave its host, the chat not leaving. */
    sameChat(environment: Record<string, string>): boolean;
    /** Seats a chat that said hello, its MCP conversation in the socket after `rest`: done once it left; it throws, once the chat left, what went wrong. */
    sit(socket: Socket, rest: Buffer, environment: Record<string, string>): Promise<void>;
    /**
     * Seats another server of the chat that sits beside it (D-588 (2)), on the same context: it only looks, and its leaving leaves the chat seated. Done once
     * it left; it throws, then, what went wrong.
     */
    join(socket: Socket, rest: Buffer, environment: Record<string, string>): Promise<void>;
    /** Sends the chat at the table away, as the table ends. */
    clear(): Promise<void>;
}

/** The chat at the table: its socket, the environment it gave, its server once made, and the sockets of its other servers. */
interface SeatedChat
{
    socket: Socket;
    environment: Record<string, string>;
    server?: McpServer;
    others: Set<Socket>;
}

/** The seat of a table serving `context`, whose page is `dashboard`; `chatFolders` gives where the chat's host keeps its chats, by its environment. */
export function tableSeat(context: Context, dashboard: Dashboard, chatFolders: (environment: Record<string, string>) => ChatFolders | undefined): Seat
{
    let chat: SeatedChat | undefined;
    let leaving: Promise<void> | undefined;

    // The seat is free only once what was the chat's is forgotten.
    const leave = (socket: Socket): Promise<void> => {
        const going = chat;

        if (going?.socket !== socket) {
            return Promise.resolve();
        }

        leaving ??= (async () => {
            // Its other servers go with it; its calls still running are stopped, as when a host goes.
            going.others.forEach((other) => other.destroy());
            await going.server?.close().catch(() => undefined);
            forgetChat(context);
            dashboard.chatEnded();
            chat = undefined;
            leaving = undefined;
        })();
        return leaving;
    };

    return {
        host: () => chat?.server?.server.getClientVersion()?.name,
        environment: () => chat?.environment ?? {},
        taken: () => chat !== undefined,
        sameChat: (environment) => {
            const token = environment.RPG_TABLE_MASTER;
            return chat !== undefined && leaving === undefined && token !== undefined && token === chat.environment.RPG_TABLE_MASTER;
        },
        sit: async (socket, rest, environment) => {
            const seated: SeatedChat = { socket, environment, others: new Set() };
            chat = seated;

            const failed = await servedUntilClosed(socket, rest, () => {
                context.chatFolders = chatFolders(environment);
                seated.server = createMcpServer(context, environment);
                return seated.server;
            });

            await leave(socket);

            if (failed !== undefined) {
                throw failed;
            }
        },
        join: async (socket, rest, environment) => {
            const seated = chat;

            if (seated === undefined || leaving !== undefined) {
                socket.destroy();
                return;
            }

            seated.others.add(socket);
            let server: McpServer | undefined;
            const failed = await servedUntilClosed(socket, rest, () => (server = createMcpServer(context, environment, { onlyLooks: subagentRefusal })));
            seated.others.delete(socket);
            await server?.close().catch(() => undefined);

            if (failed !== undefined) {
                throw failed;
            }
        },
        clear: async () => {
            const socket = chat?.socket;
            socket?.destroy();

            if (socket !== undefined) {
                await leave(socket);
            }
        },
    };
}

/** Serves the server `made` gives over the socket after `rest`, until the socket closes: what went wrong, if anything, the socket closed for it. */
async function servedUntilClosed(socket: Socket, rest: Buffer, made: () => McpServer): Promise<unknown>
{
    const left = new Promise<void>((done) => socket.once("close", () => done()));
    let failed: unknown;

    try {
        const server = made();
        // A transport the SDK closes, as after a line too long, closes the socket, and the server leaves.
        server.server.onclose = () => socket.destroy();
        const input = new PassThrough();
        input.write(rest);
        socket.pipe(input);
        await serveOver(server, new StdioServerTransport(input, socket));
    } catch (error) {
        failed = error;
        socket.destroy();
    }

    await left;
    return failed;
}
