// A chat's `rpg mcp` at its campaign's table (D-582): where the table is on and lets it sit, the process only passes the host's lines to the table and the
// table's back; anywhere else it serves as always, having read nothing of its input.
import type { Socket } from "node:net";
import type { Readable, Writable } from "node:stream";
import { findCampaign } from "../../campaign/index.ts";
import { userDataFolder } from "../../core/context.ts";
import { getVersion } from "../../core/version.ts";
import { busy, firstLine, helloLine, seated } from "./hello.ts";
import { knock, readPlace, removePlace } from "./place.ts";

export interface PipeOptions
{
    /** The engine's data folder on this computer, where the table's place is. */
    home: string;
    version: string;
    /** The chat's environment, of which the table reads a few names for it. */
    environment: Record<string, string | undefined>;
    /** How long the table may take to let the chat sit, in ms: about a second. */
    wait?: number;
    now?: () => number;
    /** What goes wrong, a line for the player who looks at the process's stderr. */
    log?: (line: string) => void;
}

/** What the host's requests still waiting hear, and the player on stderr, when the table ends before the chat. */
export const tableEnded = "The campaign's table ended: reconnect the rpg server (/mcp in Claude Code) or open a new chat, then look with status at what changed.";

/** What every call but a character's view hears, and the player on stderr, in a chat the table sent away because another chat plays there (D-588 (2)). */
export const tableBusy = "Another chat plays this campaign at its table now, in the campaign's page or opened by hand, and this one may only look, with view as a character: "
    + "close the other chat, then reconnect the rpg server (/mcp in Claude Code) or open a new chat here.";

// The table's answer is one short line.
const mostAnswer = 1024;
// After the host's input ended, how long the table may take to close its side.
const closeWait = 2000;

/**
 * `rpg mcp` in the process's folder, at its campaign's table where one is on: once either side ended, the process's exit code, 0 when the host's input ended
 * first, 1 when the table did; "busy" where the table sent it away because another chat sits, to serve only looking; undefined to serve as always.
 */
export async function pipeHere(input: Readable, output: Writable = process.stdout, folder = process.cwd()): Promise<number | "busy" | undefined>
{
    try {
        const root = findCampaign(folder);
        const log = (line: string): boolean => process.stderr.write(`${line}\n`);
        return root === undefined ? undefined : await pipeToTable(root, input, output, { home: userDataFolder(), version: getVersion(), environment: process.env, log });
    } catch {
        return undefined;
    }
}

/**
 * Pipes a chat's input to the table of the campaign at `root` and its answers to `output`: the exit code once either side ended, as pipeHere gives it.
 * Undefined, at once, with `input` untouched, where there is no table, its place is stale (taken away then), or it refuses, is slow or fails: the caller then
 * serves the chat itself; "busy", said in the log, where it refuses because another chat sits: the caller then serves it only looking, so that one engine
 * writes the campaign (D-588 (2)).
 */
export async function pipeToTable(root: string, input: Readable, output: Writable, options: PipeOptions): Promise<number | "busy" | undefined>
{
    const place = readPlace(options.home, root);

    if (place === undefined) {
        return undefined;
    }

    const wait = options.wait ?? 1000;
    const now = options.now ?? Date.now;
    const started = now();
    const knocked = await knock(place.socket, wait);

    if (knocked === "nobody") {
        removePlace(options.home, root, place.token);
        return undefined;
    }

    if (knocked === "slow") {
        return undefined;
    }

    knocked.on("error", () => undefined);
    knocked.write(helloLine(place.token, options.version, options.environment));
    const answer = await firstLine(knocked, Math.max(1, wait - (now() - started)), mostAnswer);

    const log = options.log ?? (() => undefined);

    if (answer === undefined || !seated(answer.line)) {
        knocked.destroy();

        if (answer !== undefined && busy(answer.line)) {
            log(`rpg mcp: ${tableBusy}`);
            return "busy";
        }

        return undefined;
    }

    return piped(knocked, answer.rest, input, output, log);
}

/**
 * The host's lines to the table and the table's back, until the table closes, or the host's input ends and the table closes after it: 0 then. A table that
 * closes first leaves each request of the host still waiting answered with an error that says what to do, as the router does for a child that ends: 1 then.
 */
function piped(socket: Socket, rest: Buffer, input: Readable, output: Writable, log: (line: string) => void): Promise<number>
{
    return new Promise((done) => {
        // The host's requests the table has not answered yet, by their id as JSON.
        const waiting = new Map<string, unknown>();
        let inputEnded = false;
        let closing: NodeJS.Timeout | undefined;

        const fromHost = lineReader((line) => {
            const message = parsed(line);

            if (message?.method !== undefined && message.id !== undefined) {
                waiting.set(JSON.stringify(message.id), message.id);
            }
        });

        const fromTable = lineReader((line) => {
            const message = parsed(line);

            if (message?.method === undefined && message?.id !== undefined) {
                waiting.delete(JSON.stringify(message.id));
            }
        });

        const finish = (): void => {
            clearTimeout(closing);
            input.off("data", fromHost);
            input.unpipe(socket);
            socket.destroy();

            if (inputEnded) {
                done(0);
                return;
            }

            for (const id of waiting.values()) {
                output.write(`${JSON.stringify({ jsonrpc: "2.0", id, error: { code: -32603, message: tableEnded } })}\n`);
            }

            log(`rpg mcp: ${tableEnded}`);
            done(1);
        };

        // The table closes its side once the host's input ended; at worst after a moment.
        const ended = (): void => {
            inputEnded = true;
            closing ??= setTimeout(finish, closeWait);
        };

        if (rest.length > 0) {
            fromTable(rest);
            output.write(rest);
        }

        socket.once("close", finish);
        socket.on("data", fromTable);
        socket.pipe(output, { end: false });
        input.once("end", ended);
        input.once("close", ended);
        input.on("data", fromHost);
        input.pipe(socket);
    });
}

/** Gives each whole line of a stream's chunks to `line`, as its chunks come. */
function lineReader(line: (text: string) => void): (chunk: Buffer) => void
{
    let pieces: Buffer[] = [];

    return (chunk) => {
        let start = 0;
        let end = chunk.indexOf(0x0a);

        while (end !== -1) {
            line(Buffer.concat([...pieces, chunk.subarray(start, end)]).toString("utf8"));
            pieces = [];
            start = end + 1;
            end = chunk.indexOf(0x0a, start);
        }

        if (start < chunk.length) {
            pieces.push(chunk.subarray(start));
        }
    };
}

function parsed(line: string): { method?: unknown; id?: unknown; } | undefined
{
    try {
        const message = JSON.parse(line) as unknown;
        return typeof message === "object" && message !== null ? message as { method?: unknown; id?: unknown; } : undefined;
    } catch {
        return undefined;
    }
}
