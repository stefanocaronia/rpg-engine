// The chat with the master in the page, where the campaign's table keeps one: what the page shows of it, and the player's words, stop, open and close.
import type { IncomingMessage, ServerResponse } from "node:http";
import { z } from "zod";
import { findCampaign } from "../../campaign/index.ts";
import type { ShownRoll } from "../../commands/view/result.ts";
import { rollLine } from "../../commands/view/story.ts";
import { view } from "../../commands/view/view.ts";
import { type HostId, hostIds } from "../../core/hosts.ts";
import { readLog } from "../../core/log.ts";
import { withFiles } from "../../core/store.ts";
import type { HostAccess } from "../../helpers/index.ts";
import { type EndCode, isHostName } from "../../master/index.ts";
import { readBody, sendJson } from "../page/index.ts";
import type { Served } from "./index.ts";

/** What the page asks of an AI app: its sign-in started, or cancelled; its installation; a look again at each one's account. */
export type HostWish = { signIn: { host: HostId; cancel?: true; }; } | { install: { host: HostId; }; } | { hosts: true; };

/** Why the chat did not open: in words, and with its code where the page does something of its own, as the sign-in for a host not signed in. */
export type MasterRefusal = string | { error: string; code: EndCode; };

/** What the page needs of the table's chat with the master. */
export interface PageMaster
{
    shown(): PageChat;
    open(choice: { host: HostId; model: string; effort?: string; fresh?: boolean; }): MasterRefusal | undefined;
    /** What the page asks of an AI app; why not, in words. Missing where the table cannot sign in or install. */
    hostWish?(wish: HostWish): string | undefined;
    /** Another model, and effort where given, for the open chat between two turns; why not, in words. */
    changeModel?(model: string, effort?: string): string | undefined;
    /** The player's words to the master; the page keeps `shown` where given, as the sentence without what was added to it. */
    say(text: string, shown?: string): "sent" | "busy" | "closed";
    stop(): void;
    close(): void;
    active(): boolean;
    /** A page listens to the server's events, as `/events` opens. */
    listened?(): void;
    /** A question of the master's waits on the page: the chat keeps it after what the master wrote so far; `answer` settles it with the player's own words, where it takes them. */
    askBegins(question: ChatQuestion, answer?: (words: string) => void): void;
    /** The question `id` ended: answered, with the answer in words, or left without one. */
    askEnds(id: string, answer?: string): void;
    /** A roll the player may see was made: the chat keeps it, in words and as the Rolls card gets it. */
    rolled(text: string, roll: ShownRoll): void;
    /**
     * The first roll of the player's in the turn that runs whose mark, [roll id], was handed to the master and its words do not hold yet. Given a fourth time,
     * it is nothing instead, and that roll is no longer owed: a master that cannot write the mark is never refused for ever.
     */
    untold?(): { id: string; check?: string; } | undefined;
    /** A command handed the master the mark of the player's roll `id`: from then on the roll is the master's to tell in this turn. */
    owed?(id: string): void;
}

/** A question of the master's as the page's bar shows it: its text and title, and its buttons. */
export interface ChatQuestion
{
    id: string;
    text: string;
    title?: string;
    options: string[];
}

/**
 * The chat as the page reads it: the hosts it may open in, the campaign's last choice and whether a chat of it can be taken up, the open chat with the model
 * chosen and the host's own name for the one it runs, whether it was cut short as the table that wrote it ended or was taken up with nothing said in it yet,
 * how its turn stands and whether the player's words now answer the question that waits, its messages, and whether a chat opened by hand plays the campaign.
 * Each host comes with its account, its sign-in and its installation where the table knows them; the open chat says when its model changes between turns,
 * the efforts of the model it runs where the host says them only once it is chosen, and the code of why it ended where it has one.
 */
export interface PageChat
{
    hosts: ({
        id: string;
        name: string;
        ready: boolean;
        found: boolean;
        model: string;
        efforts: string[];
        models: { id: string; name: string; about?: string; efforts: string[]; advised?: true; metered?: true; group?: string; }[];
    } & Partial<HostAccess>)[];
    last?: { host: string; model: string; effort?: string; resumable: boolean; };
    chat?: {
        host: string;
        model: string;
        effort?: string;
        runs?: string;
        efforts?: string[];
        cutShort?: true;
        takenUp?: true;
        state: "idle" | "turn" | "ended";
        why?: string;
        code?: EndCode;
        tool?: string;
        answers?: true;
        changes?: true;
    };
    messages: PageMessage[];
    elsewhere: boolean;
}

/**
 * A message of the chat: words of the player's, the master's or the table's, a line of the table about the master's model marked so; a question of the
 * master's and how it ended; a roll the player may see.
 */
export type PageMessage =
    | ({ id: number; from: "player" | "master" | "table"; text: string; } & ModelMark)
    | { id: number; from: "asked"; text: string; title?: string; options: string[]; state: "waiting" | "answered" | "left"; answer?: string; }
    | { id: number; from: "roll"; text: string; roll: ShownRoll; };

/**
 * What a line of the table about the master's model says beside its English, for a page that draws it quietly and in its own language: `model`, the
 * model changed to, as the page names it, with its effort, or with `dropped` where the effort before was left as that model takes none such; `model-kept`,
 * a change the app did not take, `asked` the model asked and `model` the one that stays.
 */
export type ModelMark = { code?: "model" | "model-kept"; model?: string; asked?: string; effort?: string; dropped?: true; };

// How long the player's words may be, and a body that holds them, every character escaped.
const mostWords = 20_000;
const mostBody = mostWords * 6 + 1024;

const noTable = "The chat with the master in the page needs the campaign's table: start it with rpg table in the campaign's folder.";
const noAccess = "This page cannot sign in to the AI apps or install them: open the campaign from RPG Engine, then try again.";
const noChange = "This page cannot change the model of an open chat: close the chat, then open it with another model.";

// A host the engine knows, by its id; a model's name, blank for the table to refuse in words, else one the host's program may take.
const hostAsked = z.enum(hostIds as [HostId, ...HostId[]]);
const modelAsked = z.string().min(1).max(200).refine((model) => model.trim() === "" || isHostName(model));

const asked = z.union([
    z.object({ say: z.string().transform((text) => text.trim()).pipe(z.string().min(1).max(mostWords)) }).strict(),
    z.object({ stop: z.literal(true) }).strict(),
    z.object({
        open: z.object({ host: hostAsked, model: modelAsked, effort: z.string().min(1).max(100).optional(), fresh: z.boolean().optional() }).strict(),
    }).strict(),
    z.object({ close: z.literal(true) }).strict(),
    z.object({ model: z.object({ model: modelAsked, effort: z.string().min(1).max(100).optional() }).strict() }).strict(),
    z.object({ signIn: z.object({ host: hostAsked, cancel: z.literal(true).optional() }).strict() }).strict(),
    z.object({ install: z.object({ host: hostAsked }).strict() }).strict(),
    z.object({ hosts: z.literal(true) }).strict(),
]);

/** The chat as the page shows it; `table: false` where no table keeps one. */
export function masterNow(response: ServerResponse, served: Served): void
{
    sendJson(response, 200, served.master === undefined ? { table: false } : shown(served.master));
}

/**
 * What the page asks of the chat: the player's words, stop the turn, open a chat or close it, another model for it; or of an AI app: its sign-in, its
 * installation, a look again. Each answered with the chat as it is after it; how a sign-in or an installation goes on reaches the page as the chat's change.
 */
export async function changeMaster(request: IncomingMessage, response: ServerResponse, served: Served): Promise<void>
{
    const parsed = asked.safeParse(await readBody(request, mostBody));

    if (!parsed.success) {
        sendJson(response, 400, {
            error: `Send { say } with the player's words, up to ${mostWords} characters, { stop: true }, { open: { host, model, effort?, fresh? } }, { close: true }, `
                + "{ model: { model, effort? } }, { signIn: { host, cancel? } }, { install: { host } } or { hosts: true }.",
        });
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
        // A question waits that the player's own words do not answer, as the dice of a rest.
        const busy = served.asked === undefined ? "The master is still answering: wait, or stop the turn." : "The master asks a question its buttons answer: answer it there.";
        const refused = { busy, closed: "No chat with the master is open." };
        sendJson(response, said === "sent" ? 202 : 409, said === "sent" ? shown(master) : { error: refused[said], ...shown(master) });
    } else if ("open" in wish) {
        const refused = master.open(wish.open);
        const words = typeof refused === "string" || refused === undefined ? { error: refused } : refused;
        sendJson(response, refused === undefined ? 200 : 409, refused === undefined ? shown(master) : { ...words, ...shown(master) });
    } else if ("model" in wish) {
        answered(response, master, master.changeModel === undefined ? noChange : master.changeModel(wish.model.model, wish.model.effort));
    } else if ("signIn" in wish || "install" in wish || "hosts" in wish) {
        answered(response, master, master.hostWish === undefined ? noAccess : master.hostWish(wish));
    } else {
        if ("stop" in wish) {
            master.stop();
        } else {
            master.close();
        }

        sendJson(response, 200, shown(master));
    }
}

/**
 * What tells the table's chat the rolls the player may see made since the last look, as the Rolls card gets them; never a hidden one. One look at a time;
 * the first only notes where the log stands, as do looks with no chat open. None where no table keeps a chat.
 */
export function rollTeller(served: Served): () => Promise<void>
{
    // The last roll the player may see that was looked at, by id, empty with none yet; and the look under way.
    let seen: string | undefined;
    let looking: Promise<void> = Promise.resolve();

    const look = async (): Promise<void> => {
        const ids = await publicRolls(served);
        // A log gone back, as after a load, holds no new roll.
        const from = seen === undefined ? ids.length : seen === "" ? 0 : ids.includes(seen) ? ids.lastIndexOf(seen) + 1 : ids.length;
        seen = ids.at(-1) ?? "";
        await tellNewRolls(served, ids.length - from);
    };

    return () => {
        if (served.master !== undefined) {
            looking = looking.then(look).catch(() => undefined);
        }

        return looking;
    };
}

/** The chat as it is after a wish, or why the table refused it. */
function answered(response: ServerResponse, master: PageMaster, refused: string | undefined): void
{
    sendJson(response, refused === undefined ? 200 : 409, refused === undefined ? shown(master) : { error: refused, ...shown(master) });
}

function shown(master: PageMaster): { table: true; } & PageChat
{
    return { table: true, ...master.shown() };
}

/** The ids of the log's rolls the player may see, in order. */
async function publicRolls(served: Served): Promise<string[]>
{
    await served.session.ready();
    return withFiles(served.session, () => {
        const root = findCampaign(served.context.folder);
        return root === undefined ? [] : readLog(root).filter((entry) => entry.type === "roll" && entry.visibility === "public").map((entry) => entry.id);
    });
}

/** The last `fresh` rolls the player may see, told to the table's chat while one is open, as the Rolls card gets them. */
async function tellNewRolls(served: Served, fresh: number): Promise<void>
{
    if (fresh === 0 || served.master?.active() !== true) {
        return;
    }

    const result = await view.run(view.input.parse({ rolls: String(fresh) }), { ...served.context, texts: served.texts });

    for (const roll of result.kind === "overview" ? result.rolls : []) {
        served.master.rolled(rollLine(roll), roll);
    }
}
