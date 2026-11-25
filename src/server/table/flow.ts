// The flow of the table's chats with the master as the campaign keeps it: a file a chat in sessions/table-chats, named by when the chat was opened, one message
// a line as JSON, written once each is complete, and a line where each turn of the master's ended; read back when the chat is taken up again. Each line is
// appended whole, so that a table cut short leaves at most a last line that does not read.
import { join } from "node:path";
import { sessionsFolderName } from "../../campaign/index.ts";
import { FileStore } from "../../core/store.ts";
import type { PageMessage } from "../dashboard/index.ts";

/** The folder of the campaign's `sessions/` where the table keeps its chats. */
export const flowFolderName = "table-chats";

const flowExtension = ".jsonl";
const senders = ["player", "master", "table", "asked", "roll"];
const questionStates = ["waiting", "answered", "left"];

/** The line that says a turn of the master's ended, which a chat cut short by its table's end lacks. */
export const turnEnded = { turn: "ended" } as const;

/** A chat's file read back: its last messages; the questions it left waiting, now left; whether its table ended in the middle of it; whether it ends torn. */
export interface FlowRead
{
    messages: PageMessage[];
    left: PageMessage[];
    cutShort: boolean;
    torn: boolean;
}

/** A name for the file of a chat opened at `time`, which no file of the campaign's table chats has yet: `2026-11-25 21-04-17.jsonl`. */
export function newFlowName(root: string, time: number): string
{
    const stamp = new Date(time).toISOString().slice(0, 19).replace("T", " ").replaceAll(":", "-");
    const store = new FileStore();
    let name = `${stamp}${flowExtension}`;

    for (let count = 2; store.exists(flowPath(root, name)); count++) {
        name = `${stamp} ${count}${flowExtension}`;
    }

    return name;
}

/** Whether `name` may be the name of a chat's file: a plain file name of ours, never a path. */
export function isFlowName(name: unknown): name is string
{
    return typeof name === "string" && name.endsWith(flowExtension) && name.length <= 100 && !/[\\/:\u0000-\u001f]/.test(name) && !name.startsWith(".");
}

/**
 * Adds lines, messages as they are now or the end of a turn, at the end of the chat's file in one write, when they were `at`; after a torn last line where
 * `mend`, on a line of their own. What fails is thrown, for the caller to tell.
 */
export function writeFlow(root: string, name: string, lines: (PageMessage | typeof turnEnded)[], at: number, mend = false): void
{
    const store = new FileStore();
    const when = new Date(at).toISOString();
    store.makeFolder(join(root, sessionsFolderName, flowFolderName));
    store.append(flowPath(root, name), `${mend ? "\n" : ""}${lines.map((line) => `${JSON.stringify({ at: when, ...line })}\n`).join("")}`);
}

/**
 * A chat's file read back: the messages in order, each in the last state written, the last `most` of them; a line that does not read is left out, and a file
 * that does not read gives none. A question still waiting was left: whoever asked it is gone with its table. The chat was cut short where a question was left
 * so, or where the player's last words have no end of a turn after them.
 */
export function readFlow(root: string, name: string, most: number): FlowRead
{
    let text: string;

    try {
        text = new FileStore().text(flowPath(root, name)) ?? "";
    } catch {
        return { messages: [], left: [], cutShort: false, torn: false };
    }

    const read = new Map<number, PageMessage>();
    let lastSaid = -1;
    let lastTurnEnd = -1;

    text.split("\n").forEach((line, index) => {
        if (isTurnEnd(line)) {
            lastTurnEnd = index;
            return;
        }

        const message = flowMessage(line);

        if (message !== undefined) {
            read.set(message.id, message);
            lastSaid = message.from === "player" ? index : lastSaid;
        }
    });

    // By id, as the chat made them: the master's words of a turn are written once complete, after what came while they wrote.
    const all = [...read.values()].sort((one, other) => one.id - other.id);
    const left = all.filter((message) => message.from === "asked" && message.state === "waiting").map((message) => ({ ...message, state: "left" as const }));
    const messages = all.map((message) => left.find((question) => question.id === message.id) ?? message).slice(-most);
    return { messages, left, cutShort: left.length > 0 || lastSaid > lastTurnEnd, torn: text !== "" && !text.endsWith("\n") };
}

function flowPath(root: string, name: string): string
{
    return join(root, sessionsFolderName, flowFolderName, name);
}

function isTurnEnd(line: string): boolean
{
    try {
        const parsed: unknown = JSON.parse(line);
        return isRecord(parsed) && parsed.turn === turnEnded.turn && parsed.id === undefined;
    } catch {
        return false;
    }
}

/** A line of a chat's file as a message, or undefined where it is none. */
function flowMessage(line: string): PageMessage | undefined
{
    let parsed: unknown;

    try {
        parsed = JSON.parse(line);
    } catch {
        return undefined;
    }

    if (!isRecord(parsed) || !Number.isSafeInteger(parsed.id) || (parsed.id as number) < 1 || !senders.includes(parsed.from as string) || typeof parsed.text !== "string") {
        return undefined;
    }

    const { id, from, text } = parsed as { id: number; from: PageMessage["from"]; text: string; };

    if (from === "asked") {
        const { title, options, state, answer } = parsed;
        const valid = optionalText(title) && Array.isArray(options) && options.every((option) => typeof option === "string") && questionStates.includes(state as string)
            && optionalText(answer);
        return valid
            ? {
                id,
                from,
                text,
                ...(title === undefined ? {} : { title: title as string }),
                options: options as string[],
                state: state as "waiting" | "answered" | "left",
                ...(answer === undefined ? {} : { answer: answer as string }),
            }
            : undefined;
    }

    if (from === "roll") {
        const roll = parsed.roll;
        return isRecord(roll) && typeof roll.id === "string" && typeof roll.at === "string" ? { id, from, text, roll: roll as unknown as Extract<PageMessage, { from: "roll"; }>["roll"] } : undefined;
    }

    return { id, from, text };
}

function isRecord(value: unknown): value is Record<string, unknown>
{
    return typeof value === "object" && value !== null && !Array.isArray(value);
}

function optionalText(value: unknown): boolean
{
    return value === undefined || typeof value === "string";
}
