// The table's own chat with the master: opened from the page in the host the player chose, its messages kept for the page in this process's memory and in
// the campaign, its last choice in the player's data folder, so that the next chat takes it up, by itself as the next table's first page comes.
import { randomBytes } from "node:crypto";
import type { Helpers } from "../../core/context.ts";
import { type HostId, hosts } from "../../core/hosts.ts";
import { accessKeeper, heldBack, type HostAccess, hostHelper } from "../../helpers/index.ts";
import {
    askModels,
    effortRefused,
    type EndCode,
    type HostOffered,
    hostProgram,
    hostsOffered,
    isHostName,
    type MasterChat,
    type MasterDriver,
    masterDriver,
    type MasterEvent,
    masterHosts,
    modelKeeper,
    openMaster,
    traceVariable,
    withoutTrace,
} from "../../master/index.ts";
import type { ChatQuestion, HostWish, MasterRefusal, ModelMark, PageChat, PageMaster, PageMessage } from "../dashboard/index.ts";
import { newFlowName, readFlow, turnEnded, writeFlow } from "./flow.ts";
import { type LastChat, readLastChat, writeLastChat } from "./last-chat.ts";

/** The table's chat with the master, one at a time. */
export interface TableChat extends PageMaster
{
    /** What the page shows of the chat: the hosts, the last choice, the chat and its messages. */
    shown(): ChatShown;
    /** Opens a chat with a host, taking up the campaign's last one in that host unless `fresh`; a refusal in words when it cannot, with its code where it has one. */
    open(choice: ChatChoice): MasterRefusal | undefined;
    /** What the page asks of an AI app: its sign-in started or cancelled, its installation, a look again at each one's account; why not, in words. */
    hostWish(wish: HostWish): string | undefined;
    /** Another model, and effort where given, for the open chat between two turns; why not, in words. */
    changeModel(model: string, effort?: string): string | undefined;
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
    untold(): { id: string; check?: string; } | undefined;
    owed(id: string): void;
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
    hosts: (HostOffered & Partial<HostAccess>)[];
    last?: { host: HostId; model: string; effort?: string; resumable: boolean; };
    chat?: {
        host: HostId;
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
    /** Codex and Claude Code on this computer: each host's account, its sign-in and its installation; without them the page reads none. */
    helpers?: Helpers;
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
    /** The host's own name for the model it runs, once it said it; the efforts that model takes, where the host says them only once it is chosen. */
    runs?: string;
    efforts?: string[];
    token: string;
    master: MasterChat;
    state: "idle" | "turn" | "ended";
    why?: string;
    /** Why it ended beside the words, as the player no longer signed in. */
    code?: EndCode;
    tool?: string;
    /** The master's message of this turn, and the block of text it ends with. */
    reply?: Words;
    block?: number;
    /** Whether it takes up a chat of the host's, and whether the host said its session yet. */
    resumed: boolean;
    sessionTold: boolean;
    /** Whether the player said anything in it yet, since it was opened. */
    said: boolean;
    /** Whether the master wrote anything in this turn, and the tool the table refused it in it; whether the table wrote to it once in this turn of the player's. */
    spoke?: boolean;
    refused?: string;
    nudged?: boolean;
    /** Whether the turn that runs is one the host began by itself: the player's turn goes on, its rolls still owed. */
    byHost?: boolean;
    /** Whether another model was asked between turns, until the next turn ends. */
    changed?: true;
    /**
     * That change until the host takes it: the model and effort asked, which the chat and the campaign's last choice take only then, and the table's line
     * for it, never written for a change the host did not take; and the host's name for it and its efforts, where the host said them before it took it.
     */
    pending?: { model: string; effort?: string; line: { text: string; mark: ModelMark; }; runs?: string; efforts?: string[]; };
}

/** A host's program on this computer. */
type Program = { command: string; args: string[]; };

// The messages the page keeps, and how long one may grow.
const mostMessages = 200;
const mostText = 200_000;
// How long whether a host is on this computer stays known.
const foundFor = 5000;
// What the page says of a turn the master ended without a word, and of the tool it was refused in it.
const silentTurn = "The master ended its turn without writing anything. Write to it again.";
const refusedTool = (name: string): string => `It tried to use ${name.slice(0, 60)}, which the master may not use here.`;
// What the table writes to the master, once in a turn of the player's, where the host ended a turn without a word after a tool it was refused.
const goOnLine = (name: string): string => `The table refused ${name.slice(0, 60)}: you cannot use it here. Go on with the game's commands, and answer the player.`;
// The kinds of tools the master may use at the table: the game's commands and the web, never a file read, written or run by the host's own tools (D-589).
const allowed = ["rpg", "web", "fetch", "agent", "image"] as const;
// What the page reads where the table was given no programs to ask, as a table a test started; and of another model asked while the master answers.
const noAccess = "This table cannot sign in to the AI apps or install them: start it again with rpg table in the campaign's folder, then try again.";
const answering = "The master is answering: change the model once they have finished.";

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
    // The last chat while it waits for its host's models before it is taken up.
    let takingUp: LastChat | undefined;
    // What the next write brings to the file first: a new line after a torn one, the questions it left waiting now left. Whether the chat taken up was cut
    // short as its table ended, until the next turn begins; and whether the player's words are being sent, a turn that ends meanwhile told after them.
    let mend = false;
    let corrected: ChatMessage[] = [];
    let cutShort = false;
    let sending: { ended: boolean; } | undefined;
    // The id of the player's words that began the turn that runs: the rolls and the master's words after it are the turn's.
    let turnFrom: number | undefined;
    // The player's rolls of the turn whose mark a command handed the master, and how many times each was given as untold.
    const owedRolls = new Set<string>();
    const untoldTimes = new Map<string, number>();

    const programOf = (host: HostId): Program | undefined => hostProgram(host, options, driverOf);
    // The file the host's lines are copied to, for whoever looks into a problem: none unless the table's environment names one.
    const trace = options.environment[traceVariable]?.trim() || undefined;
    // Whether a chat in this host is open, or opening: none of its programs is started meanwhile but the chat's own.
    const chatIn = (host: HostId): boolean => chat !== undefined && chat.state !== "ended" && chat.host === host;
    // The models each host offers, asked of it in the campaign's folder.
    const models = modelKeeper({ ask: (host) => askModels(host, { ...options, folder: options.root }, driverOf), changed: () => options.changed(), now });
    // Each host's account, looked at in the background; once it changes, as an installation ended, whether each host is on this computer is looked at again.
    const access = options.helpers === undefined ? undefined : accessKeeper({
        helpers: options.helpers,
        changed: () => {
            found = undefined;
            options.changed();
        },
        // Never while the host's chat is open or opening: it tells by itself when the player is signed out.
        busy: (host) => chatIn(host),
        // Signed in or out, installed: the host's models are asked again, as a list asked before may have come empty.
        accountChanged: (host) => models.forget(host),
        ...(options.log === undefined ? {} : { log: options.log }),
        now,
    });

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
            opened.sessionTold = true;
            remember({ session: event.session });
            const pending = opened.pending;

            // The model chosen stays the choice; the host's own name for it is shown apart, and for a change not taken yet only once it is.
            if (pending === undefined) {
                opened.runs = event.model;
            } else {
                pending.runs = event.model;
            }

            if (event.efforts !== undefined) {
                tookEfforts(opened, event.efforts);
            }
        } else if (event.type === "changeRefused") {
            changeRefused(opened, event);
        } else if (event.type === "changeTaken") {
            changeTaken(opened);
        } else if (event.type === "turnStart") {
            // The host goes on by itself, as OpenCode tells a subagent's answer: what the master writes now is a new message, as after every turn's end.
            Object.assign(opened, { state: "turn", tool: undefined, spoke: undefined, refused: undefined, byHost: true });
        } else if (event.type === "text") {
            prose(opened, event.block, event.text);
        } else if (event.type === "tool") {
            opened.tool = event.state === "started" ? event.name : undefined;
        } else if (event.type === "permission") {
            if (!event.allowed) {
                options.log?.(`The master asked for ${event.name} (${event.kind}), which the table does not give it.`);
                opened.refused = event.name;
            }

            return;
        } else if (event.type === "turnEnd") {
            // A turn the host began by itself answers no words of the player's: it is never followed, nor said empty.
            const byHost = opened.byHost === true;

            if (!byHost && goOn(opened, event)) {
                return;
            }

            replyDone(opened);
            Object.assign(opened, { state: "idle", tool: undefined });

            if (event.reason === "failed") {
                add("table", event.why ?? "The master's turn failed.");
            } else if (event.reason === "done" && opened.spoke !== true && !byHost) {
                // A turn that ends with nothing for the player to read, as some hosts end one after a tool they were refused: the page says so.
                add("table", opened.refused === undefined ? silentTurn : `${silentTurn} ${refusedTool(opened.refused)}`);
            }

            Object.assign(opened, { spoke: undefined, refused: undefined, nudged: undefined, byHost: undefined, changed: undefined, pending: undefined });

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
            Object.assign(opened, { state: "ended", why: event.why, tool: undefined, ...(event.code === undefined ? {} : { code: event.code }) });

            // The player is no longer signed in: the page reads the hosts' accounts anew, to offer the sign-in.
            if (event.code === "signin") {
                access?.lookAgain(opened.host);
            }

            forgetLostSession(opened);
            options.left?.(opened.token);
            options.switched?.();
        }

        options.changed();
    };

    // The efforts the model in play takes, as the host says them once it is chosen: an effort it does not take was left out, and the choice forgets it.
    // After another model asked between turns, the chat says so.
    const tookEfforts = (opened: OpenChat, efforts: string[]): void => {
        const pending = opened.pending;

        // Said of a change not taken yet, as the host says them before it confirms it: shown once it is; the change leaves the effort, and its line says so.
        if (pending !== undefined) {
            pending.efforts = efforts;

            if (pending.effort !== undefined && !efforts.includes(pending.effort)) {
                pending.line = modelLine(shownModel(opened.host, pending.model), undefined, pending.effort);
                delete pending.effort;
            }

            return;
        }

        opened.efforts = efforts;
        const left = opened.effort;

        if (left !== undefined && !efforts.includes(left)) {
            chooseEffort(opened, undefined);

            if (opened.changed === true) {
                tableLine(modelLine(shownModel(opened.host, opened.model), undefined, left));
            }
        }
    };

    // The host took the change asked: the chat and the campaign's last choice follow it now, and the chat says so.
    const changeTaken = (opened: OpenChat): void => {
        const pending = opened.pending;

        if (pending === undefined) {
            return;
        }

        delete opened.pending;
        takeShown(opened, pending.model, pending);
        opened.model = pending.model;
        chooseEffort(opened, pending.effort);
        tableLine(pending.line);
    };

    // What the chat shows of the model it runs from now: another model's name and efforts as the host said them meanwhile, none where it did not; the same
    // model keeps its own, but where the host said them again.
    const takeShown = (opened: OpenChat, model: string, said: { runs?: string; efforts?: string[]; } | undefined): void => {
        const same = model === opened.model;
        Object.assign(opened, { runs: said?.runs ?? (same ? opened.runs : undefined), efforts: said?.efforts ?? (same ? opened.efforts : undefined) });
    };

    // The effort of the open chat, and of the campaign's last choice with its model: none, the host's own.
    const chooseEffort = (opened: OpenChat, effort: string | undefined): void => {
        if (effort === undefined) {
            delete opened.effort;
        } else {
            opened.effort = effort;
        }

        if (last !== undefined) {
            last = { ...last, model: opened.model };

            if (effort === undefined) {
                delete last.effort;
            } else {
                last.effort = effort;
            }

            writeLastChat(options.home, options.root, last);
        }
    };

    // The host did not take the model or effort asked: the chat goes on as the host says, as it was where that is the model before, and the page reads why.
    const changeRefused = (opened: OpenChat, refusal: Extract<MasterEvent, { type: "changeRefused"; }>): void => {
        const name = hosts[opened.host].name;
        const pending = opened.pending;
        delete opened.pending;
        options.log?.(`${name} did not take ${refusal.asked}: ${refusal.why}`);
        takeShown(opened, refusal.model, pending?.model === refusal.model ? pending : undefined);
        opened.model = refusal.model;
        chooseEffort(opened, refusal.effort);
        const kept = shownModel(opened.host, refusal.model);

        if (refusal.asked === refusal.model) {
            // The model was taken, not the effort asked with it: the one before stays, as `effort` says where there is one.
            tableLine({
                text: `${name} did not take that effort: the master plays with ${kept}, its effort as before.`,
                mark: { code: "model", model: kept, ...(refusal.effort === undefined ? {} : { effort: refusal.effort }), dropped: true },
            });
        } else {
            const asked = shownModel(opened.host, refusal.asked);
            tableLine({ text: `${name} did not take ${asked}: the master goes on with ${kept}.`, mark: { code: "model-kept", model: kept, asked } });
        }
    };

    // A model's name as the page shows it, else its id.
    const shownModel = (host: HostId, model: string): string => models.known(host).find((one) => one.id === model)?.name ?? model;

    // A line of the table, with its mark for a page that knows it.
    const tableLine = (line: { text: string; mark: ModelMark; }): void => {
        keep({ id: ++lastId, from: "table", text: line.text.slice(0, mostText), ...line.mark });
    };

    // A turn the host ended without a word after a tool the table refused, as Antigravity ends one by itself: once in the player's turn, the table writes
    // to the master to go on, and the player's turn goes on with the master's next; their page shows nothing of it.
    const goOn = (opened: OpenChat, end: Extract<MasterEvent, { type: "turnEnd"; }>): boolean => {
        if (end.reason !== "done" || opened.spoke === true || opened.refused === undefined || opened.nudged === true) {
            return false;
        }

        opened.nudged = true;
        opened.tool = undefined;
        const sent = opened.master.send(goOnLine(opened.refused));

        if (sent) {
            options.changed();
        }

        return sent;
    };

    // A piece of the master's prose joins their message of this turn; a new block of text, a new paragraph.
    const prose = (opened: OpenChat, block: number, text: string): void => {
        opened.spoke = true;

        if (opened.reply === undefined) {
            opened.reply = add("master", text, false);
        } else {
            const joined = opened.block === block ? text : `\n\n${text}`;
            opened.reply.text = `${opened.reply.text}${joined}`.slice(0, mostText);
        }

        opened.block = block;
    };

    // The host's driver and program for a choice, or why the chat cannot open; a host the player is not signed in to is never started.
    const startable = (choice: ChatChoice): { driver: MasterDriver; program: Program; } | MasterRefusal => {
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

        if (access?.known(choice.host).account === "out" && !keyHeldBack(choice.host, driver)) {
            // Signed in since, elsewhere: the next try knows it.
            access.lookAgain(choice.host);
            return { error: `${name} is not signed in on this computer: sign in here, then open the chat.`, code: "signin" };
        }

        if (choice.model.trim() === "") {
            return `Choose the model ${name} plays the master with.`;
        }

        if (!isHostName(choice.model)) {
            return `That is no name of a model: ${choice.model}.`;
        }

        return effortRefused(choice.host, driver, models.known(choice.host), choice.model, choice.effort) ?? driver.missing(options.root) ?? { driver, program };
    };

    // Whether the chat's environment holds a key the host's status was asked without: its "out" then says nothing of the chat, which finds it by itself.
    const keyHeldBack = (host: HostId, driver: MasterDriver): boolean => {
        const helper = hostHelper[host];
        return helper !== undefined && heldBack(helper, driver.environment(options.environment));
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
                environment: { ...withoutTrace(driver.environment(options.environment)), RPG_TABLE_MASTER: token },
                failed: (error) => options.log?.(`The table's chat failed while hearing the master: ${error instanceof Error ? error.message : String(error)}`),
                ...(options.log === undefined ? {} : { log: options.log }),
                ...(trace === undefined ? {} : { trace }),
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

    const openChat = (choice: ChatChoice): MasterRefusal | undefined => {
        const ready = startable(choice);

        if (typeof ready === "string" || "error" in ready) {
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
        // The last chat waiting for its host's models is not taken up.
        takingUp = undefined;

        if (closing === undefined) {
            return;
        }

        replyDone(closing);
        // Whoever closes it, its host's program ends by itself, as one that may be saving the player's login: the page is free at once, the program let go.
        closing.master.close(true);
        chat = undefined;

        if (byPlayer) {
            remember({ closed: true });
        }

        options.left?.(closing.token);
        options.changed();
        options.switched?.();
    };

    // The campaign's last chat, taken up by itself as the table's first page comes, once: where its host's session is known and the player did not close it.
    // Its host's models are asked first where none are known, and the chat opens once they came, as none is asked beside the chat's own program; it does
    // not open where the player opened or closed a chat meanwhile, a chat opened by hand sits at the table, or the table let its chat go.
    const takeUpLast = (): void => {
        if (pageCame) {
            return;
        }

        pageCame = true;
        const taking = last;

        if (taking?.session === undefined || taking.closed === true || chat !== undefined || options.elsewhere()) {
            return;
        }

        const takeUp = (): void => {
            if (last !== taking || takingUp !== taking || chat !== undefined || options.elsewhere()) {
                return;
            }

            takingUp = undefined;
            const refused = openChat({ host: taking.host, model: taking.model, ...(taking.effort === undefined ? {} : { effort: taking.effort }) });

            if (refused !== undefined) {
                options.log?.(`The table did not take up the campaign's last chat: ${typeof refused === "string" ? refused : refused.error}`);
            }
        };

        takingUp = taking;

        if (models.known(taking.host).length > 0) {
            takeUp();
            return;
        }

        void models.ready(taking.host).then(takeUp);
    };

    // What the page asks of an AI app: a host already on this computer is never installed again.
    const hostWish = (wish: HostWish): string | undefined => {
        if (access === undefined) {
            return noAccess;
        }

        if ("signIn" in wish) {
            return wish.signIn.cancel === true ? access.cancelSignIn(wish.signIn.host) : access.signIn(wish.signIn.host);
        }

        if ("install" in wish) {
            const host = wish.install.host;
            return programOf(host) === undefined ? access.install(host) : `${hosts[host].name} is on this computer already: choose it, and open the chat.`;
        }

        found = undefined;
        access.lookAgain();
        return undefined;
    };

    // Another model for the open chat, checked as at its opening, between two turns: the campaign's last choice follows, and the chat says so.
    const changeModel = (model: string, effort?: string): string | undefined => {
        const current = chat;

        if (current === undefined || current.state === "ended") {
            return "No chat with the master is open: open one first.";
        }

        if (current.state === "turn") {
            return answering;
        }

        const name = hosts[current.host].name;
        const driver = driverOf(current.host);

        if (current.master.setModel === undefined || driver === undefined) {
            return `${name} cannot change its model in an open chat: close the chat, then open it with another model.`;
        }

        if (model.trim() === "") {
            return `Choose the model ${name} plays the master with.`;
        }

        if (!isHostName(model)) {
            return `That is no name of a model: ${model}.`;
        }

        const known = models.known(current.host);
        const refused = effortRefused(current.host, driver, known, model, effort);

        if (refused !== undefined) {
            return refused;
        }

        // An effort not given stays, where the model takes it or its efforts are not known yet; one it does not take is left, and the line says so. A change
        // asked and not taken yet is the one the next starts from.
        const was = current.pending ?? { model: current.model, effort: current.effort };
        const before = was.effort;
        const stays = effort === undefined && before !== undefined && effortRefused(current.host, driver, known, model, before) === undefined;
        const asked = effort ?? (stays ? before : undefined);
        const dropped = effort === undefined && before !== undefined && !stays ? before : undefined;

        if (model === was.model && asked === was.effort) {
            return undefined;
        }

        if (!current.master.setModel(model, asked)) {
            return "The master is getting ready: change the model in a moment.";
        }

        current.changed = true;

        // The chat shows the model it runs, with its name and efforts, until the host takes this one, and the line is written then: one it does not take
        // has only its own line.
        current.pending = { model, ...(asked === undefined ? {} : { effort: asked }), line: modelLine(shownModel(current.host, model), asked, dropped) };
        options.changed();
        return undefined;
    };

    return {
        shown: () => {
            if (found === undefined || now() - found.at >= foundFor) {
                found = { at: now(), hosts: new Map(masterHosts().map((host) => [host, programOf(host) !== undefined])) };
            }

            const known = found.hosts;
            // The models of the host whose chat is open are those known: its program is never started beside the chat's.
            const offered = hostsOffered((id) => known.get(id) === true, driverOf, (id) => (chatIn(id) ? models.known(id) : models.models(id)));
            return {
                hosts: access === undefined ? offered : offered.map((host) => ({ ...host, ...access.access(host.id) })),
                ...(last === undefined ? {} : { last: { host: last.host, model: last.model, ...(last.effort === undefined ? {} : { effort: last.effort }), resumable: last.session !== undefined } }),
                ...(chat === undefined ? {} : { chat: { ...chatShown(chat, cutShort), ...(isOpen() && waiting?.answer !== undefined ? { answers: true as const } : {}) } }),
                messages: messages.map((message) => ({ ...message })),
                elsewhere: options.elsewhere(),
            };
        },
        open: openChat,
        hostWish,
        changeModel,
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
            Object.assign(current, { state: "turn", reply: undefined, block: undefined, spoke: undefined, refused: undefined, nudged: undefined });
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

            // A new turn: the chat is no longer one cut short, nor one just taken up; the rolls of the turns before are no longer the master's to tell.
            cutShort = false;
            turnFrom = said.id;
            owedRolls.clear();
            untoldTimes.clear();
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
        untold: () => {
            const roll = chat?.state === "turn" && turnFrom !== undefined ? untoldRoll(messages, turnFrom, owedRolls) : undefined;

            if (roll === undefined) {
                return undefined;
            }

            // Given that many times already: the master cannot write the mark, so the question goes through and the roll keeps only its own line.
            const times = (untoldTimes.get(roll.id) ?? 0) + 1;
            untoldTimes.set(roll.id, times);

            if (times > mostUntold) {
                owedRolls.delete(roll.id);
                return undefined;
            }

            return roll;
        },
        owed: (id) => {
            owedRolls.add(id);
        },
    };
}

// How many times the same roll is given as untold before the question goes through: a master that cannot write its mark is not refused for ever.
const mostUntold = 3;

/**
 * The first roll of the player's after the message `from`, among those whose mark a command handed the master, that no words of the master's after `from`
 * hold, the message being written included: a roll's id is new, so no mark of it comes before it.
 */
function untoldRoll(messages: ChatMessage[], from: number, owed: Set<string>): { id: string; check?: string; } | undefined
{
    const turn = messages.filter((message) => message.id > from);
    const told = turn.filter((message) => message.from === "master").map((message) => message.text);
    // The mark whatever its case and spaces, a colon after roll, or a backslash before each bracket, as \[roll id\]; and never alone: a mark with no
    // words of story around it, in the same message, tells the player nothing.
    const mark = (id: string): RegExp => new RegExp(`\\\\?\\[\\s*roll(?:\\s*:\\s*|\\s+)${id.replace(/[^\w-]/g, "")}\\s*\\\\?\\]`, "i");
    const marked = (id: string): boolean => told.some((text) => mark(id).test(text) && storyWords(text) >= leastStory);
    const roll = turn.find((message) => message.from === "roll" && message.roll.by === "player" && owed.has(message.roll.id) && !marked(message.roll.id));
    return roll?.from === "roll" ? { id: roll.roll.id, ...(roll.roll.check === undefined ? {} : { check: roll.roll.check }) } : undefined;
}

// How many words of story a message holds at least, beside its brackets, for the mark in it to tell a roll.
const leastStory = 6;

/** The words of a text that are story: those with a letter, outside any pair of square brackets. */
function storyWords(text: string): number
{
    return text.replace(/\\?\[[^[\]\n]*\\?\]/g, " ").split(/\s+/).filter((word) => /\p{L}/u.test(word)).length;
}

/** A question's text and title as the chat keeps them, each cut as any text of it. */
function askedText(question: ChatQuestion): { text: string; title?: string; }
{
    return { text: question.text.slice(0, mostText), ...(question.title === undefined ? {} : { title: question.title.slice(0, mostText) }) };
}

/** The table's line for another model: with its effort, or with the effort before left where that model takes none such. */
function modelLine(model: string, effort: string | undefined, dropped: string | undefined): { text: string; mark: ModelMark; }
{
    if (dropped !== undefined) {
        return { text: `From now on the master plays with ${model}, which takes no effort ${dropped}: the app chooses its own.`, mark: { code: "model", model, dropped: true } };
    }

    return { text: `From now on the master plays with ${model}${effort === undefined ? "" : `, effort ${effort}`}.`, mark: { code: "model", model, ...(effort === undefined ? {} : { effort }) } };
}

function chatShown(chat: OpenChat, cutShort: boolean): NonNullable<ChatShown["chat"]>
{
    return {
        host: chat.host,
        model: chat.model,
        ...(chat.effort === undefined ? {} : { effort: chat.effort }),
        ...(chat.runs === undefined ? {} : { runs: chat.runs }),
        ...(chat.efforts === undefined ? {} : { efforts: [...chat.efforts] }),
        ...(cutShort ? { cutShort: true as const } : {}),
        // Taken up from the host's own chat, with nothing said in it yet: the page offers to ask the master where the story stands.
        ...(!cutShort && chat.resumed && !chat.said ? { takenUp: true as const } : {}),
        state: chat.state,
        ...(chat.why === undefined ? {} : { why: chat.why }),
        ...(chat.code === undefined ? {} : { code: chat.code }),
        ...(chat.tool === undefined ? {} : { tool: chat.tool }),
        // Its model changes between two turns, where its host's driver lets it.
        ...(chat.state !== "ended" && chat.master.setModel !== undefined ? { changes: true as const } : {}),
    };
}
