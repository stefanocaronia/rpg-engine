// The table's door: who knocks at its socket, and whether they sit, are told why not, are told the table ends, or are closed without a word.
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
 * table's own chat, while open, owns it; another server of that chat sits beside the one seated; any other is told why not, and what says no hello is closed without a word; a probe is told the table's engine and
 * whether a chat sits, and a stop that the table ends, which it does. A newer engine's chat ends a table no chat sits at, so that it can start its own.
 * Whether a chat sat, once it left.
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

    if (hello.asks === "probe") {
        socket.end(answerLine({ table: { version: door.version, seated: door.seat.taken() } }));
        return false;
    }

    // Asked to end from outside, with the place's token: as it ends by itself, its chat's turn stopped and the chat let go; asked again, it goes on ending.
    if (hello.asks === "stop") {
        socket.end(answerLine({ ending: true }));
        door.log(door.ending() ? "Asked again to end, by rpg table --stop: the table is ending." : "Asked to end, by rpg table --stop.");
        void door.end("asked to by rpg table --stop");
        return false;
    }

    socket.write(answerLine({ ok: true }));

    // A chat sits already, and the refusal let this one in: another server of the same chat, which sits beside it.
    if (door.seat.taken()) {
        door.log("Another server of the chat sat at the table, as a character's subagent starts.");
        await door.seat.join(socket, first.rest, hello.environment);
        door.log("Another server of the chat left the table.");
        return true;
    }

    door.log("A chat sat at the table.");
    await door.seat.sit(socket, first.rest, hello.environment);
    door.log("The chat left the table.");
    return true;
}

/** Why a hello may not sit, if it may not: a probe is answered whatever its engine and whoever sits, and a stop even as the table ends. */
function refusal(hello: Hello, door: Door): Refusal | undefined
{
    if (hello.token !== door.place.token) {
        return "token";
    }

    if (hello.asks === "stop") {
        return undefined;
    }

    if (door.ending()) {
        return "ending";
    }

    if (hello.asks === "probe") {
        return undefined;
    }

    if (hello.version !== door.version) {
        return "version";
    }

    // Another server of the table's own chat, still open, sits beside the one that sits, as a character's subagent's in Codex (D-588 (2)).
    if (door.seat.sameChat(hello.environment) && door.chat.owns(hello.environment)) {
        return undefined;
    }

    // While the table's own chat is open, only its servers sit.
    return door.seat.taken() || (door.chat.active() && !door.chat.owns(hello.environment)) ? "busy" : undefined;
}
