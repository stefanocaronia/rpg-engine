// Antigravity's Stop hook holds the chat until it ends: a message the player writes meanwhile waits behind it, and Esc leaves it running. Antigravity's own
// files tell either: the history of what the player typed, with the conversation it went to, and its log, which notes the conversation stopped; in its app,
// the messages it keeps to send once the turn ends.
import { closeSync, openSync, readdirSync, readSync, statSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

/** Antigravity's own folder, where its command line keeps its history and its log. */
export function antigravityFolder(userHome = homedir()): string
{
    return join(userHome, ".gemini", "antigravity-cli");
}

/**
 * Watches, from now on, whether the player starts a new turn in the conversation: writes in the chat, or stops it with Esc. `started` resolves then, never
 * otherwise; `stop` ends the watch.
 */
export function watchNewTurn(conversation: string, folder = antigravityFolder(), every = 500, appFolder = join(folder, "..", "antigravity")): { started: Promise<void>; stop: () => void; }
{
    const history = join(folder, "history.jsonl");
    const log = join(folder, "cli.log");
    const read = { [history]: placeOf(history), [log]: placeOf(log) };
    let timer: NodeJS.Timeout | undefined;

    const started = new Promise<void>((done) => {
        timer = setInterval(() => {
            if (wrote(newText(history, read), conversation) || stopped(newText(log, read), conversation) || queued(appFolder, conversation)) {
                clearInterval(timer);
                done();
            }
        }, every);
        timer.unref();
    });

    return { started, stop: () => clearInterval(timer) };
}

/**
 * Whether Antigravity's app holds a message the player wrote in the conversation while its turn has not ended: the app keeps one file for each in the
 * conversation's own folder, and sends them once the turn ends.
 */
function queued(appFolder: string, conversation: string): boolean
{
    try {
        return readdirSync(join(appFolder, "brain", conversation, ".system_generated", "messages", "undelivered")).length > 0;
    } catch {
        return false;
    }
}

/** Whether these lines of Antigravity's history hold something the player typed in the conversation: a message, or a command such as /clear. */
function wrote(lines: string, conversation: string): boolean
{
    return lines.split("\n").some((line) => {
        try {
            return (JSON.parse(line) as { conversationId?: unknown; }).conversationId === conversation;
        } catch {
            return false;
        }
    });
}

/** Whether these lines of Antigravity's log say the conversation was stopped, as Esc does. */
function stopped(lines: string, conversation: string): boolean
{
    return lines.includes(`Cancelling conversation ${conversation}`);
}

/** Where a file was read up to, and which file it was: one written anew in its place is read from its start. */
interface Place
{
    offset: number;
    identity: number;
}

/**
 * The whole lines a file gained since it was last read, as `read` keeps its place: what follows its last line's end waits for the next read, as a line written
 * in two parts. A file that shrank, or was written anew in its place, is read from its start.
 */
function newText(file: string, read: Record<string, Place>): string
{
    const now = placeOf(file);
    const before = read[file];
    const from = before === undefined || now.offset < before.offset || now.identity !== before.identity ? 0 : before.offset;

    if (now.offset <= from) {
        read[file] = { offset: now.offset, identity: now.identity };
        return "";
    }

    try {
        const descriptor = openSync(file, "r");

        try {
            const buffer = Buffer.alloc(now.offset - from);
            const length = readSync(descriptor, buffer, 0, buffer.length, from);
            const whole = buffer.subarray(0, buffer.subarray(0, length).lastIndexOf(10) + 1);
            read[file] = { offset: from + whole.length, identity: now.identity };
            return whole.toString("utf8");
        } finally {
            closeSync(descriptor);
        }
    } catch {
        return "";
    }
}

function placeOf(file: string): Place
{
    try {
        const stats = statSync(file);
        return { offset: stats.size, identity: stats.ino };
    } catch {
        return { offset: 0, identity: 0 };
    }
}
