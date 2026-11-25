// The chat with the master in the page, where the campaign's table keeps one: what the page shows of it, and the player's words, stop, open and close.
import type { IncomingMessage, ServerResponse } from "node:http";
import { z } from "zod";
import { type HostId, hostIds } from "../../core/hosts.ts";
import { isHostName } from "../../master/index.ts";
import { readBody, sendJson } from "../page/index.ts";
import type { Served } from "./index.ts";

/** What the page needs of the table's chat with the master. */
export interface PageMaster
{
    shown(): PageChat;
    open(choice: { host: HostId; model: string; effort?: string; fresh?: boolean; }): string | undefined;
    /** The player's words to the master; the page keeps `shown` where given, as the sentence without what was added to it. */
    say(text: string, shown?: string): "sent" | "busy" | "closed";
    stop(): void;
    close(): void;
    active(): boolean;
}

/**
 * The chat as the page reads it: the hosts it may open in, the campaign's last choice and whether a chat of it can be taken up, the open chat with how its
 * turn stands, its messages, and whether a chat opened by hand plays the campaign.
 */
export interface PageChat
{
    hosts: { id: string; name: string; found: boolean; model: string; efforts: string[]; }[];
    last?: { host: string; model: string; effort?: string; resumable: boolean; };
    chat?: { host: string; model: string; effort?: string; state: "idle" | "turn" | "ended"; why?: string; tool?: string; };
    messages: { id: number; from: "player" | "master" | "table"; text: string; }[];
    elsewhere: boolean;
}

// How long the player's words may be, and a body that holds them, every character escaped.
const mostWords = 20_000;
const mostBody = mostWords * 6 + 1024;

const noTable = "The chat with the master in the page needs the campaign's table: start it with rpg table in the campaign's folder.";

const asked = z.union([
    z.object({ say: z.string().transform((text) => text.trim()).pipe(z.string().min(1).max(mostWords)) }).strict(),
    z.object({ stop: z.literal(true) }).strict(),
    z.object({
        open: z.object({
            host: z.enum(hostIds as [HostId, ...HostId[]]),
            // A model left blank is the table's to refuse, in words; any other must be a name the host's program may take.
            model: z.string().min(1).max(200).refine((model) => model.trim() === "" || isHostName(model)),
            effort: z.string().min(1).max(100).optional(),
            fresh: z.boolean().optional(),
        }).strict(),
    }).strict(),
    z.object({ close: z.literal(true) }).strict(),
]);

/** The chat as the page shows it; `table: false` where no table keeps one. */
export function masterNow(response: ServerResponse, served: Served): void
{
    sendJson(response, 200, served.master === undefined ? { table: false } : shown(served.master));
}

/** What the page asks of the chat: the player's words, stop the turn, open a chat or close it; each answered with the chat as it is after it. */
export async function changeMaster(request: IncomingMessage, response: ServerResponse, served: Served): Promise<void>
{
    const parsed = asked.safeParse(await readBody(request, mostBody));

    if (!parsed.success) {
        sendJson(response, 400, { error: `Send { say } with the player's words, up to ${mostWords} characters, { stop: true }, { open: { host, model, effort?, fresh? } } or { close: true }.` });
        return;
    }

    const master = served.master;

    if (master === undefined) {
        sendJson(response, 409, { error: noTable });
        return;
    }

    const wish = parsed.data;

    if ("say" in wish) {
        const said = master.say(wish.say);
        const refused = { busy: "The master is still answering: wait, or stop the turn.", closed: "No chat with the master is open." };
        sendJson(response, said === "sent" ? 202 : 409, said === "sent" ? shown(master) : { error: refused[said], ...shown(master) });
    } else if ("open" in wish) {
        const refused = master.open(wish.open);
        sendJson(response, refused === undefined ? 200 : 409, refused === undefined ? shown(master) : { error: refused, ...shown(master) });
    } else {
        if ("stop" in wish) {
            master.stop();
        } else {
            master.close();
        }

        sendJson(response, 200, shown(master));
    }
}

function shown(master: PageMaster): { table: true; } & PageChat
{
    return { table: true, ...master.shown() };
}
