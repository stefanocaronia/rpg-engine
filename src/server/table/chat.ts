// The table's own chat with the master: opened from the page in the host the player chose, its messages kept for the page in this process's memory and in
// the campaign, its last choice in the player's data folder, so that the next chat takes it up, by itself as the next table's first page comes.
import { randomBytes } from "node:crypto";
import { type HostId, hosts } from "../../core/hosts.ts";
import { askModels, effortRefused, type HostOffered, hostProgram, hostsOffered, isHostName, type MasterChat, type MasterDriver, masterDriver, type MasterEvent, masterHosts, modelKeeper, openMaster } from "../../master/index.ts";
import type { ChatQuestion, PageChat, PageMaster, PageMessage } from "../dashboard/index.ts";
import { newFlowName, readFlow, turnEnded, writeFlow } from "./flow.ts";
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
    /** Closes the chat at the player's word; the campaign's last choice stays for the next, which the next table no longer takes up by itself. */
    close(): void;
    /** Closes the chat as the table ends, or as no page is there: the next table takes it up again. */
    release(): void;
    /** A page listens to the table's events: the first takes up the campaign's last chat, where it can be and the player did not close it. */
    listened(): void;
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
    chat?: { host: HostId; model: string; effort?: string; runs?: string; cutShort?: true; takenUp?: true; state: "idle" | "turn" | "ended"; why?: string; tool?: string; answers?: true; };
    messages: ChatMessage[];
    /** A chat opened by hand sits at the table: the table's own cannot open. */
    elsewhere: boolean;
}

export type ChatMessage = PageMessage;

/** Words of the player's, the master's or the table's. */
type Words = Extract<ChatMessage, { from: "player" | "master" | "table"; }>;
type AskedMessage = Extract<ChatMessage, { from: "asked"; }>;

/** What the table's chat takes from outside. */
export interface TableChatOptions
{
    /** The campaign's folder, where the host runs and the chat's flow is kept, and the engine's data folder, where the last choice is kept. */
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
    /** The host's own name for the model it runs, once it said it. */
    runs?: string;
    token: string;
    master: MasterChat;
    state: "idle" | "turn" | "ended";
    why?: string;
    tool?: string;
    /** The master's message of this turn, and the block of text it ends with. */
    reply?: Words;
    block?: number;
    /** Whether it takes up a chat of the host's, and whether the host said its session yet. */
    resumed: boolean;
    sessionTold: boolean;
    /** Whether the player said anything in it yet, since it was opened. */
    said: boolean;
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
    // The master's question that waits for the player, and what answers it with the player's own words, where it takes them.
    let waiting: { id: string; message: AskedMessage; answer?: (words: string) => void; } | undefined;
    let found: { at: number; hosts: Map<HostId, boolean>; } | undefined;
    // Every token given to a host in this process.
    const tokens = new Set<string>();
    // The campaign's file of the chat whose messages these are, and whether a page came yet, the first of which takes up the last chat.
    let flow: string | undefined;
    let pageCame = false;
    // What the next write brings to the file first: a new line after a torn one, the questions it left waiting now left. Whether the chat taken up was cut
    // short as its table ended, until the next turn begins; and whether the player's words are being sent, a turn that ends meanwhile told after them.
    let mend = false;
    let corrected: ChatMessage[] = [];
    let cutShort = false;
    let sending: { ended: boolean; } | undefined;

    const programOf = (host: HostId): Program | undefined => hostProgram(host, options, driverOf);
    // The models each host offers, asked of it in the campaign's folder.
    const models = modelKeeper({ ask: (host) => askModels(host, { ...options, folder: options.root }, driverOf), changed: () => options.changed(), now });

    // Lines at the end of the chat's file in the campaign, in one write; what cannot be written is logged, and the chat goes on.
    const write = (lines: (ChatMessage | typeof turnEnded)[]): void => {
        if (flow === undefined) {
            return;
        }

        try {
            writeFlow(options.root, flow, [...corrected, ...lines], now(), mend);
            mend = false;
            corrected = [];
        } catch (error) {
            options.log?.(`The table could not keep a message of its chat in the campaign: ${error instanceof Error ? error.message : String(error)}`);
        }
    };

    // A message as it is now, at the end of the chat's file.
    const save = (message: ChatMessage): void => write([message]);

    // A message for the page, and in the campaign unless it is not complete yet, as the master's words of a turn.
    const keep = <Kept extends ChatMessage>(message: Kept, complete = true): Kept => {
        messages.push(message);
        messages.splice(0, Math.max(0, messages.length - mostMessages));

        if (complete) {
            save(message);
        }

        return message;
    };

    const add = (from: Words["from"], text: string, complete = true): Words => keep({ id: ++lastId, from, text: text.slice(0, mostText) }, complete);

    const isOpen = (): boolean => chat !== undefined && chat.state !== "ended";

    // The master's message of this turn is complete: kept in the campaign, and what they write after it starts a new one.
    const replyDone = (opened: OpenChat): void => {
        if (opened.reply !== undefined) {
            save(opened.reply);
        }

        Object.assign(opened, { reply: undefined, block: undefined });
    };

    // What the engine tells comes between the master's words: their reply in course closes, and what they write after it starts a new message.
    const between = (): void => {
        if (chat !== undefined) {
            replyDone(chat);
        }
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
            last = { ...last };
            delete last.session;
            writeLastChat(options.home, options.root, last);
        }
    };

    const heard = (opened: OpenChat, event: MasterEvent): void => {
        if (chat !== opened) {
            return;
        }

        if (event.type === "session") {
            // The model chosen stays the choice; the host's own name for it is shown apart.
            opened.runs = event.model;
            opened.sessionTold = true;
            remember({ session: event.session });
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
            replyDone(opened);
            Object.assign(opened, { state: "idle", tool: undefined });

            if (event.reason === "failed") {
                add("table", event.why ?? "The master's turn failed.");
            }

            // The turn's end follows the player's words that began it, in the file too.
            if (sending === undefined) {
                write([turnEnded]);
            } else {
                sending.ended = true;
            }

            options.changed();
            options.idle();
            return;
        } else {
            replyDone(opened);
            Object.assign(opened, { state: "ended", why: event.why, tool: undefined });
            forgetLostSession(opened);
            options.left?.(opened.token);
            options.switched?.();
        }

        options.changed();
    };

    // A piece of the master's prose joins their message of this turn; a new block of text, a new paragraph.
    const prose = (opened: OpenChat, block: number, text: string): void => {
        if (opened.reply === undefined) {
            opened.reply = add("master", text, false);
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

    // The messages of the chat's file, the one the campaign's last chat writes where it is taken up, else a new one: read back where they are not here yet.
    const takeFlow = (again: boolean): void => {
        const taken = again && last?.flow !== undefined ? last.flow : newFlowName(options.root, now());

        if (taken === flow) {
            return;
        }

        messages.length = 0;
        waiting = undefined;
        flow = taken;
        const read = again ? readFlow(options.root, taken, mostMessages) : undefined;
        messages.push(...(read?.messages ?? []));
        lastId = Math.max(lastId, ...messages.map((message) => message.id));
        mend = read?.torn === true;
        cutShort = read?.cutShort === true;
        corrected = read?.left ?? [];
    };

    const openChat = (choice: ChatChoice): string | undefined => {
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

        takeFlow(again);
        last = {
            root: options.root,
            host,
            model: choice.model,
            ...(choice.effort === undefined ? {} : { effort: choice.effort }),
            ...(session === undefined ? {} : { session }),
            ...(flow === undefined ? {} : { flow }),
        };
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
            said: false,
        };
        chat = opened;
        master.onEvent((event) => heard(opened, event));
        options.changed();
        options.switched?.();
        return undefined;
    };

    // Closes the chat; what the master wrote of their message so far is kept. Closed by the player, the next table does not take it up by itself.
    const closeChat = (byPlayer: boolean): void => {
        const closing = chat;

        if (closing === undefined) {
            return;
        }

        replyDone(closing);
        closing.master.close();
        chat = undefined;

        if (byPlayer) {
            remember({ closed: true });
        }

        options.left?.(closing.token);
        options.changed();
        options.switched?.();
    };

    // The campaign's last chat, taken up by itself as the table's first page comes, once: where its host's session is known and the player did not close it.
    const takeUpLast = (): void => {
        if (pageCame) {
            return;
        }

        pageCame = true;

        if (last?.session === undefined || last.closed === true || chat !== undefined || options.elsewhere()) {
            return;
        }

        const refused = openChat({ host: last.host, model: last.model, ...(last.effort === undefined ? {} : { effort: last.effort }) });

        if (refused !== undefined) {
            options.log?.(`The table did not take up the campaign's last chat: ${refused}`);
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
                ...(chat === undefined ? {} : { chat: { ...chatShown(chat, cutShort), ...(isOpen() && waiting?.answer !== undefined ? { answers: true as const } : {}) } }),
                messages: messages.map((message) => ({ ...message })),
                elsewhere: options.elsewhere(),
            };
        },
        open: openChat,
        say: (text, shown) => {
            const current = chat;

            if (current === undefined || current.state === "ended") {
                return "closed";
            }

            // A question of the master's waits that takes the player's own words: these answer it, as on the page's bar; the master's turn goes on.
            const answer = waiting?.answer;

            if (answer !== undefined) {
                add("player", shown ?? text);
                answer(text);
                options.changed();
                return "sent";
            }

            if (current.state === "turn") {
                return "busy";
            }

            // The player's words and the turn first: a host that fails the turn at once tells it while it is sent. They go in the campaign once said.
            const said = add("player", shown ?? text, false);
            Object.assign(current, { state: "turn", reply: undefined, block: undefined });
            const sent = { ended: false };
            sending = sent;
            const accepted = current.master.send(text);
            sending = undefined;

            if (!accepted) {
                // The words just added, the last message: never said.
                messages.pop();
                current.state = "idle";
                return "busy";
            }

            // A new turn: the chat is no longer one cut short, nor one just taken up.
            cutShort = false;
            current.said = true;
            write(sent.ended ? [said, turnEnded] : [said]);
            options.changed();
            return "sent";
        },
        stop: () => {
            if (chat?.state === "turn") {
                chat.master.interrupt();
            }
        },
        close: () => closeChat(true),
        release: () => closeChat(false),
        listened: takeUpLast,
        active: isOpen,
        inTurn: () => chat?.state === "turn",
        owns: (environment) => chat !== undefined && chat.state !== "ended" && environment.RPG_TABLE_MASTER === chat.token,
        gave: (environment) => environment.RPG_TABLE_MASTER !== undefined && tokens.has(environment.RPG_TABLE_MASTER),
        askBegins: (question, answer) => {
            if (!isOpen()) {
                return;
            }

            // One question at a time: one left waiting ended with no answer.
            if (waiting !== undefined) {
                waiting.message.state = "left";
                save(waiting.message);
            }

            between();
            const message = keep<AskedMessage>({ id: ++lastId, from: "asked", ...askedText(question), options: [...question.options], state: "waiting" });
            waiting = { id: question.id, message, ...(answer === undefined ? {} : { answer }) };
            options.changed();
        },
        askEnds: (id, answer) => {
            if (waiting?.id !== id) {
                return;
            }

            Object.assign(waiting.message, answer === undefined ? { state: "left" } : { state: "answered", answer: answer.slice(0, mostText) });
            save(waiting.message);
            waiting = undefined;
            options.changed();
        },
        rolled: (text, roll) => {
            if (!isOpen()) {
                return;
            }

            between();
            keep({ id: ++lastId, from: "roll", text: text.slice(0, mostText), roll });
            options.changed();
        },
    };
}

/** A question's text and title as the chat keeps them, each cut as any text of it. */
function askedText(question: ChatQuestion): { text: string; title?: string; }
{
    return { text: question.text.slice(0, mostText), ...(question.title === undefined ? {} : { title: question.title.slice(0, mostText) }) };
}

function chatShown(chat: OpenChat, cutShort: boolean): NonNullable<ChatShown["chat"]>
{
    return {
        host: chat.host,
        model: chat.model,
        ...(chat.effort === undefined ? {} : { effort: chat.effort }),
        ...(chat.runs === undefined ? {} : { runs: chat.runs }),
        ...(cutShort ? { cutShort: true as const } : {}),
        // Taken up from the host's own chat, with nothing said in it yet: the page offers to ask the master where the story stands.
        ...(!cutShort && chat.resumed && !chat.said ? { takenUp: true as const } : {}),
        state: chat.state,
        ...(chat.why === undefined ? {} : { why: chat.why }),
        ...(chat.tool === undefined ? {} : { tool: chat.tool }),
    };
}
