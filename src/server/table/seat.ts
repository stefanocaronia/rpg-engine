// The one chat at a campaign's table (D-582): its MCP server on the table's own context, over the rest of its socket; as it leaves, the context is given
// back as a newly started server finds it, but for the files' session and the dashboard, which live on.
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import type { Socket } from "node:net";
import { PassThrough } from "node:stream";
import { type ChatFolders, type Context, forgetChat } from "../../core/context.ts";
import type { Dashboard } from "../dashboard/index.ts";
import { createMcpServer, serveOver } from "../mcp.ts";

/** The chat at the table now, one at a time. */
export interface Seat
{
    /** The name the chat's client gives itself; none while the seat is empty. */
    host(): string | undefined;
    /** What the table reads of the environment the chat's `rpg mcp` started in; empty while the seat is empty. */
    environment(): Record<string, string>;
    taken(): boolean;
    /** Seats a chat that said hello, its MCP conversation in the socket after `rest`: done once it left; it throws, once the chat left, what went wrong. */
    sit(socket: Socket, rest: Buffer, environment: Record<string, string>): Promise<void>;
    /** Sends the chat at the table away, as the table ends. */
    clear(): Promise<void>;
}

/** The chat at the table: its socket, the environment it gave, and its server once made. */
interface SeatedChat
{
    socket: Socket;
    environment: Record<string, string>;
    server?: ReturnType<typeof createMcpServer>;
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
            // Its calls still running are stopped, as when a host goes.
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
        sit: async (socket, rest, environment) => {
            const left = new Promise<void>((done) => socket.once("close", () => done()));
            const seated: SeatedChat = { socket, environment };
            let failed: unknown;
            chat = seated;

            try {
                context.chatFolders = chatFolders(environment);
                seated.server = createMcpServer(context, environment);
                // A transport the SDK closes, as after a line too long, closes the socket, and the seat is free again.
                seated.server.server.onclose = () => socket.destroy();
                const input = new PassThrough();
                input.write(rest);
                socket.pipe(input);
                await serveOver(seated.server, new StdioServerTransport(input, socket));
            } catch (error) {
                failed = error;
                socket.destroy();
            }

            await left;
            await leave(socket);

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
