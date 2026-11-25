// The table's own chat with the master: opened from the page in the host the player chose, its messages kept for the page in this process's memory, its
// last choice in the player's data folder, so that the next chat takes it up.
import { randomBytes } from "node:crypto";
import { type HostId, hosts } from "../../core/hosts.ts";
import { askModels, effortRefused, type HostOffered, hostProgram, hostsOffered, isHostName, type MasterChat, type MasterDriver, masterDriver, type MasterEvent, masterHosts, modelKeeper, openMaster } from "../../master/index.ts";
import type { PageChat, PageMaster } from "../dashboard/index.ts";
import { type LastChat, readLastChat, writeLastChat } from "./last-chat.ts";

/** The table's chat with the master, one at a time. */
export interface TableChat extends PageMaster
{
    /** What the page shows of the chat: the hosts, the last choice, the chat and its messages. */
    shown(): ChatShown;
    /** Opens a chat with a host, taking up the campaign's last one in that host unless `fresh`; a refusal in words when it cannot. */
    open(choice: ChatChoice): string | undefined;
    /** The player's words to the master; the message kept for the page is `shown` where given, as the sentence without what was added to it. */
    say(text: string, shown?: string): "sent" | "busy" | "closed";
    /** Stops the master's turn. */
    stop(): void;
    /** Closes the chat; the campaign's last choice stays for the next. */
    close(): void;
    /** Whether a chat is open, and whether its turn runs. */
    active(): boolean;
    inTurn(): boolean;
    /** Whether a chat's hello, by the environment it gave, is the open chat's own server. */
    owns(environment: Record<string, string>): boolean;
    /** Whether a chat's hello carries a token this table's chat gave a host, open or not: its server, never a chat opened by hand. */
    gave(environment: Record<string, string>): boolean;
}

/** The host, model and effort the player chose for a chat, and whether it starts anew. */
export interface ChatChoice
{
    host: HostId;
    model: string;
    effort?: string;
    fresh?: boolean;
}

export interface ChatShown extends PageChat
{
    hosts: HostOffered[];
    last?: { host: HostId; model: string; effort?: string; resumable: boolean; };
    chat?: { host: HostId; model: string; effort?: string; state: "idle" | "turn" | "ended"; why?: string; tool?: string; };
    messages: ChatMessage[];
    /** A chat opened by hand sits at the table: the table's own cannot open. */
    elsewhere: boolean;
}

export interface ChatMessage
{
    id: number;
    from: "player" | "master" | "table";
    text: string;
}

/** What the table's chat takes from outside. */
export interface TableChatOptions
{
    /** The campaign's folder, where the host runs, and the engine's data folder, where the last choice is kept. */
    root: string;
    home: string;
    /** The table's own environment and platform, and the player's home, where a host's program is looked for. */
    environment: NodeJS.ProcessEnv;
    platform: string;
    userHome: string;
    open?: typeof openMaster;
    driver?: typeof masterDriver;
    /** A host's program installed with npm, which its driver does not look for. */
    npmProgram?: (host: HostId) => { command: string; args: string[]; } | undefined;
    /** Whether a chat opened by hand sits at the table. */
    elsewhere: () => boolean;
    /** Something the page shows of the chat changed, as the models a host offers; a turn ended. */
    changed: () => void;
    idle: () => void;
    /** A chat closed or ended: its server, which says hello with this token, leaves the table. */
    left?: (token: string) => void;
    /** A chat opened, closed or ended: what else the page shows follows, as whether a sentence said on it reaches the master at once. */
    switched?: () => void;
    newToken?: () => string;
    now?: () => number;
    log?: (line: string) => void;
}

/** The open chat: the choice, the token its server says hello with, and how its turn stands. */
interface OpenChat
{
    host: HostId;
    model: string;
    effort?: string;
    token: string;
    master: MasterChat;
    state: "idle" | "turn" | "ended";
    why?: string;
    tool?: string;
    /** The master's message of this turn, and the block of text it ends with. */
    reply?: ChatMessage;
    block?: number;
    /** Whether it takes up a chat of the host's, and whether the host said its session yet. */
    resumed: boolean;
    sessionTold: boolean;
}

/** A host's program on this computer. */
type Program = { command: string; args: string[]; };

// The messages the page keeps, and how long one may grow.
const mostMessages = 200;
const mostText = 200_000;
// How long whether a host is on this computer stays known.
const foundFor = 5000;
// The kinds of tools the master may use at the table.
const allowed = ["rpg", "read", "web", "agent"] as const;

/** The table's chat with the master, for the campaign at `options.root`. */
export function tableChat(options: TableChatOptions): TableChat
{
    const open = options.open ?? openMaster;
    const driverOf = options.driver ?? masterDriver;
    const now = options.now ?? Date.now;
    const newToken = options.newToken ?? (() => randomBytes(16).toString("hex"));
    const messages: ChatMessage[] = [];
    let lastId = 0;
    let last = readLastChat(options.home, options.root);
    let chat: OpenChat | undefined;
    let found: { at: number; hosts: Map<HostId, boolean>; } | undefined;
    // Every token given to a host in this process.
    const tokens = new Set<string>();

    const programOf = (host: HostId): Program | undefined => hostProgram(host, options, driverOf);
    // The models each host offers, asked of it in the campaign's folder.
    const models = modelKeeper({ ask: (host) => askModels(host, { ...options, folder: options.root }, driverOf), changed: () => options.changed(), now });

    const add = (from: ChatMessage["from"], text: string): ChatMessage => {
        const message = { id: ++lastId, from, text: text.slice(0, mostText) };
        messages.push(message);
        messages.splice(0, Math.max(0, messages.length - mostMessages));
        return message;
    };

    const remember = (changes: Partial<LastChat>): void => {
        if (last !== undefined) {
            last = { ...last, ...changes };
            writeLastChat(options.home, options.root, last);
        }
    };

    // A chat taken up that ended before the host said its session: that session is not taken up again, and the next chat starts new.
    const forgetLostSession = (opened: OpenChat): void => {
        if (opened.resumed && !opened.sessionTold && last !== undefined) {
            last = { root: last.root, host: last.host, model: last.model, ...(last.effort === undefined ? {} : { effort: last.effort }) };
            writeLastChat(options.home, options.root, last);
        }
    };

    const heard = (opened: OpenChat, event: MasterEvent): void => {
        if (chat !== opened) {
            return;
        }

        if (event.type === "session") {
            opened.model = event.model;
            opened.sessionTold = true;
            remember({ session: event.session, model: event.model });
        } else if (event.type === "text") {
            prose(opened, event.block, event.text);
        } else if (event.type === "tool") {
            opened.tool = event.state === "started" ? event.name : undefined;
        } else if (event.type === "permission") {
            if (!event.allowed) {
                options.log?.(`The master asked for ${event.name} (${event.kind}), which the table does not give it.`);
            }

            return;
        } else if (event.type === "turnEnd") {
            Object.assign(opened, { state: "idle", tool: undefined, reply: undefined, block: undefined });

            if (event.reason === "failed") {
                add("table", event.why ?? "The master's turn failed.");
            }

            options.changed();
            options.idle();
            return;
        } else {
            Object.assign(opened, { state: "ended", why: event.why, tool: undefined, reply: undefined, block: undefined });
            forgetLostSession(opened);
            options.left?.(opened.token);
            options.switched?.();
        }

        options.changed();
    };

    // A piece of the master's prose joins their message of this turn; a new block of text, a new paragraph.
    const prose = (opened: OpenChat, block: number, text: string): void => {
        if (opened.reply === undefined) {
            opened.reply = add("master", text);
        } else {
            const joined = opened.block === block ? text : `\n\n${text}`;
            opened.reply.text = `${opened.reply.text}${joined}`.slice(0, mostText);
        }

        opened.block = block;
    };

    // The host's driver and program for a choice, or why the chat cannot open.
    const startable = (choice: ChatChoice): { driver: MasterDriver; program: Program; } | string => {
        const name = hosts[choice.host].name;
        const driver = driverOf(choice.host);

        if (chat !== undefined && chat.state !== "ended") {
            return "A chat with the master is open already: close it first.";
        }

        if (options.elsewhere()) {
            return "A chat opened by hand plays this campaign: close it, then open the chat here.";
        }

        if (driver === undefined) {
            return `The page cannot open a chat with ${name} yet: choose ${masterHosts().map((host) => hosts[host].name).join(" or ")}.`;
        }

        const program = programOf(choice.host);

        if (program === undefined) {
            return `${name} is not on this computer: install it, then try again.`;
        }

        if (choice.model.trim() === "") {
            return `Choose the model ${name} plays the master with.`;
        }

        if (!isHostName(choice.model)) {
            return `That is no name of a model: ${choice.model}.`;
        }

        return effortRefused(choice.host, driver, models.known(choice.host), choice.model, choice.effort) ?? driver.missing(options.root) ?? { driver, program };
    };

    // The host's chat opened, or why not in words, as where its program does not start.
    const start = (choice: ChatChoice, driver: MasterDriver, program: Program, token: string, session: string | undefined): MasterChat | string => {
        const name = hosts[choice.host].name;

        try {
            const master = open(choice.host, {
                folder: options.root,
                program,
                model: choice.model,
                ...(choice.effort === undefined ? {} : { effort: choice.effort }),
                ...(session === undefined ? {} : { session }),
                allowed: [...allowed],
                environment: { ...driver.environment(options.environment), RPG_TABLE_MASTER: token },
                failed: (error) => options.log?.(`The table's chat failed while hearing the master: ${error instanceof Error ? error.message : String(error)}`),
            });
            return master ?? `The page cannot open a chat with ${name} yet.`;
        } catch (error) {
            return `${name} could not start: ${error instanceof Error ? error.message : String(error)}.`;
        }
    };

    return {
        shown: () => {
            if (found === undefined || now() - found.at >= foundFor) {
                found = { at: now(), hosts: new Map(masterHosts().map((host) => [host, programOf(host) !== undefined])) };
            }

            const known = found.hosts;
            return {
                hosts: hostsOffered((id) => known.get(id) === true, driverOf, (id) => models.models(id)),
                ...(last === undefined ? {} : { last: { host: last.host, model: last.model, ...(last.effort === undefined ? {} : { effort: last.effort }), resumable: last.session !== undefined } }),
                ...(chat === undefined ? {} : { chat: chatShown(chat) }),
                messages: messages.map((message) => ({ ...message })),
                elsewhere: options.elsewhere(),
            };
        },
        open: (choice) => {
            const ready = startable(choice);

            if (typeof ready === "string") {
                return ready;
            }

            const host = choice.host;
            const again = choice.fresh !== true && last?.host === host;
            const session = again ? last?.session : undefined;
            const token = newToken();
            tokens.add(token);
            const master = start(choice, ready.driver, ready.program, token, session);

            if (typeof master === "string") {
                return master;
            }

            if (!again) {
                messages.length = 0;
            }

            last = { root: options.root, host, model: choice.model, ...(choice.effort === undefined ? {} : { effort: choice.effort }), ...(session === undefined ? {} : { session }) };
            writeLastChat(options.home, options.root, last);
            const opened: OpenChat = {
                host,
                model: choice.model,
                ...(choice.effort === undefined ? {} : { effort: choice.effort }),
                token,
                master,
                state: "idle",
                resumed: session !== undefined,
                sessionTold: false,
            };
            chat = opened;
            master.onEvent((event) => heard(opened, event));
            options.changed();
            options.switched?.();
            return undefined;
        },
        say: (text, shown) => {
            const current = chat;

            if (current === undefined || current.state === "ended") {
                return "closed";
            }

            if (current.state === "turn") {
                return "busy";
            }

            // The player's words and the turn first: a host that fails the turn at once tells it while it is sent.
            add("player", shown ?? text);
            Object.assign(current, { state: "turn", reply: undefined, block: undefined });

            if (!current.master.send(text)) {
                // The words just added, the last message: never said.
                messages.pop();
                current.state = "idle";
                return "busy";
            }

            options.changed();
            return "sent";
        },
        stop: () => {
            if (chat?.state === "turn") {
                chat.master.interrupt();
            }
        },
        close: () => {
            const closing = chat;

            if (closing !== undefined) {
                closing.master.close();
                chat = undefined;
                options.left?.(closing.token);
                options.changed();
                options.switched?.();
            }
        },
        active: () => chat !== undefined && chat.state !== "ended",
        inTurn: () => chat?.state === "turn",
        owns: (environment) => chat !== undefined && chat.state !== "ended" && environment.RPG_TABLE_MASTER === chat.token,
        gave: (environment) => environment.RPG_TABLE_MASTER !== undefined && tokens.has(environment.RPG_TABLE_MASTER),
    };
}

function chatShown(chat: OpenChat): NonNullable<ChatShown["chat"]>
{
    return {
        host: chat.host,
        model: chat.model,
        ...(chat.effort === undefined ? {} : { effort: chat.effort }),
        state: chat.state,
        ...(chat.why === undefined ? {} : { why: chat.why }),
        ...(chat.tool === undefined ? {} : { tool: chat.tool }),
    };
}
