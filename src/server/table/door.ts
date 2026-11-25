// The table's door: who knocks at its socket, and whether they sit, are told why not, or are closed without a word.
import type { Socket } from "node:net";
import { isNewerVersion } from "../../core/version.ts";
import type { TableChat } from "./chat.ts";
import { answerLine, firstLine, type Hello, readHello, type Refusal } from "./hello.ts";
import type { TablePlace } from "./place.ts";
import type { Seat } from "./seat.ts";

/** What the table's door knows of the table: its place and engine, its seat and its own chat, how long a hello may take, its log and its end. */
export interface Door
{
    place: TablePlace;
    version: string;
    seat: Seat;
    chat: TableChat;
    helloWait: number;
    log: (line: string) => void;
    end: (why: string) => Promise<void>;
    ending: () => boolean;
}

// A hello carries a few names of the chat's environment: a few kilobytes at most.
const mostHello = 1024 * 1024;

/**
 * A knock at the table: a chat that says hello with the place's token and the table's engine sits, while the seat is free, the table not ending, and the
 * table's own chat, while open, owns it; any other is told why not, and what says no hello is closed without a word; a probe is told the table's engine and
 * whether a chat sits. A newer engine's chat ends a table no chat sits at, so that it can start its own. Whether a chat sat, once it left.
 */
export async function welcome(socket: Socket, door: Door): Promise<boolean>
{
    socket.on("error", () => undefined);
    const first = await firstLine(socket, door.helloWait, mostHello);
    const hello = first === undefined ? undefined : readHello(first.line);

    if (first === undefined || hello === undefined) {
        socket.destroy();
        return false;
    }

    const refused = refusal(hello, door);

    if (refused !== undefined) {
        socket.end(answerLine({ refused }));
        door.log(`A chat was refused (${refused}${refused === "version" ? `: it runs RPG Engine ${hello.version}, the table ${door.version}` : ""}).`);

        if (refused === "version" && isNewerVersion(hello.version, door.version) && !door.seat.taken()) {
            void door.end(`a chat of the newer RPG Engine ${hello.version} came`);
        }

        return false;
    }

    if (hello.probe) {
        socket.end(answerLine({ table: { version: door.version, seated: door.seat.taken() } }));
        return false;
    }

    socket.write(answerLine({ ok: true }));
    door.log("A chat sat at the table.");
    await door.seat.sit(socket, first.rest, hello.environment);
    door.log("The chat left the table.");
    return true;
}

/** Why a hello may not sit, if it may not: a probe is answered whatever its engine and whoever sits. */
function refusal(hello: Hello, door: Door): Refusal | undefined
{
    if (hello.token !== door.place.token) {
        return "token";
    }

    if (door.ending()) {
        return "ending";
    }

    if (hello.probe) {
        return undefined;
    }

    if (hello.version !== door.version) {
        return "version";
    }

    // While the table's own chat is open, only its server sits.
    return door.seat.taken() || (door.chat.active() && !door.chat.owns(hello.environment)) ? "busy" : undefined;
}
