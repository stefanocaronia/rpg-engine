// What a chat and its campaign's table say first, a JSON line each (D-582): the chat's hello, with the table's token, its engine's version and the few names
// of its environment the table reads for it, and the table's answer; after a yes the socket is the MCP conversation. A probe asks only whether the table is
// there, and never sits.
import type { Socket } from "node:net";
import { knock, type TablePlace } from "./place.ts";

/**
 * The names of a chat's environment its server reads, the only ones its hello carries: Claude Code's id of the chat and how it was started, where Claude Code
 * and Codex keep their chats, and the token of a chat the table itself opened.
 */
export const chatEnvironmentNames = ["CLAUDE_CODE_SESSION_ID", "CLAUDE_CODE_ENTRYPOINT", "CLAUDE_CONFIG_DIR", "CODEX_HOME", "RPG_TABLE_MASTER"];

/** A chat's hello: the token of the table's place, the chat's engine, and what the table reads of the environment its `rpg mcp` started in; or a probe. */
export interface Hello
{
    token: string;
    version: string;
    environment: Record<string, string>;
    probe: boolean;
}

/** Why a table does not let a chat sit: a wrong token, another engine, another chat sitting, or the table ending. */
export type Refusal = "token" | "version" | "busy" | "ending";

/** The table's answer: the chat sits, or why not; to a probe, the table's engine and whether a chat sits. After any but a yes the socket closes. */
export type HelloAnswer = { ok: true; } | { refused: Refusal; } | { table: { version: string; seated: boolean; }; };

/** A table as a probe finds it: its answer, `refused` with why, "nobody" where nothing listens, "silent" where what listens gives no answer in time. */
export type Probed = { version: string; seated: boolean; } | { refused: Refusal; } | "nobody" | "silent";

// The table's answer is one short line.
const mostAnswer = 1024;

export function helloLine(token: string, version: string, environment: Record<string, string | undefined>): string
{
    return `${JSON.stringify({ token, version, environment: chatEnvironment(environment) })}\n`;
}

/** A hello as a chat sends it, or a probe; undefined for anything else, as a browser's request or noise. */
export function readHello(line: string): Hello | undefined
{
    const read = parsed(line) as Partial<Hello> | undefined;

    if (typeof read?.token !== "string" || typeof read.version !== "string") {
        return undefined;
    }

    if (read.probe === true) {
        return { token: read.token, version: read.version, environment: {}, probe: true };
    }

    const environment = read.environment;

    if (typeof environment !== "object" || environment === null || Array.isArray(environment)) {
        return undefined;
    }

    return { token: read.token, version: read.version, environment: chatEnvironment(environment), probe: false };
}

export function answerLine(answer: HelloAnswer): string
{
    return `${JSON.stringify(answer)}\n`;
}

/** Whether the table's answer lets the chat sit. */
export function seated(line: string): boolean
{
    return (parsed(line) as { ok?: unknown; } | undefined)?.ok === true;
}

/** Asks the table at a place whether it is there, within `wait` ms to answer the knock and as long to answer the probe; the probe never takes the seat. */
export async function probeTable(place: TablePlace, version: string, wait: number): Promise<Probed>
{
    const knocked = await knock(place.socket, wait);

    if (knocked === "nobody" || knocked === "slow") {
        return knocked === "nobody" ? "nobody" : "silent";
    }

    knocked.on("error", () => undefined);
    knocked.write(`${JSON.stringify({ token: place.token, version, probe: true })}\n`);
    const answer = await firstLine(knocked, wait, mostAnswer);
    knocked.destroy();
    const read = answer === undefined ? undefined : parsed(answer.line) as Partial<{ table: { version?: unknown; seated?: unknown; }; refused: Refusal; }> | undefined;

    if (typeof read?.table?.version === "string" && typeof read.table.seated === "boolean") {
        return { version: read.table.version, seated: read.table.seated };
    }

    return typeof read?.refused === "string" ? { refused: read.refused } : "silent";
}

/**
 * The first line a socket gives, without its end of line, and the bytes after it, which belong to what follows; undefined when none comes within `wait` ms,
 * the socket ends first, or the line grows past `most` bytes. The socket is left paused, with none of its listeners.
 */
export function firstLine(socket: Socket, wait: number, most: number): Promise<{ line: string; rest: Buffer; } | undefined>
{
    return new Promise((done) => {
        let read = Buffer.alloc(0);

        const finish = (found: { line: string; rest: Buffer; } | undefined): void => {
            clearTimeout(timer);
            socket.pause();
            socket.off("data", take);
            socket.off("end", none);
            socket.off("close", none);
            done(found);
        };

        const none = (): void => finish(undefined);

        const take = (chunk: Buffer): void => {
            read = Buffer.concat([read, chunk]);
            const end = read.indexOf(0x0a);

            if (end !== -1) {
                finish({ line: read.subarray(0, end).toString("utf8").replace(/\r$/, ""), rest: read.subarray(end + 1) });
            } else if (read.length > most) {
                finish(undefined);
            }
        };

        const timer = setTimeout(none, wait);
        socket.on("data", take);
        socket.once("end", none);
        socket.once("close", none);
    });
}

/** The names of an environment the table reads for a chat, those that are text. */
function chatEnvironment(environment: object): Record<string, string>
{
    const given = Object.entries(environment).filter((entry): entry is [string, string] => chatEnvironmentNames.includes(entry[0]) && typeof entry[1] === "string");
    return Object.fromEntries(given);
}

function parsed(line: string): unknown
{
    try {
        return JSON.parse(line) as unknown;
    } catch {
        return undefined;
    }
}
