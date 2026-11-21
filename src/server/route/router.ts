// The router of `rpg mcp` started outside a campaign, as Antigravity's app starts it (D-578): one server for all its folders, which names in each call only the
// conversation. It keeps one child `rpg mcp` for each campaign a call plays, started the first time it is needed with the client's handshake, and one in its own
// folder for everything else: each call goes to the child of its conversation's noted campaign, the others to its own folder's, never to another campaign's.
import { isAbsolute } from "node:path";
import { samePath } from "../../library/index.ts";

/** A child `rpg mcp` as the router drives it: the lines it is given, the lines it writes, its end, as when it exits or its folder is gone, and stopping it. */
export interface ChildServer
{
    write(line: string): void;
    onLine(listener: (line: string) => void): void;
    onEnd(listener: (reason: string) => void): void;
    stop(): void;
}

export interface RouterOptions
{
    /** The folder the server was started in, where the child for every call without a noted campaign runs. */
    folder: string;
    /** Starts a child `rpg mcp` in a folder. */
    start: (folder: string) => ChildServer;
    /** The campaign a conversation plays, as noted; undefined until noted. */
    campaignOf: (conversation: string) => string | undefined;
    /** Writes a line to the client. */
    toClient: (line: string) => void;
    /** How long a conversation's first call waits for its note, which may come a moment after it: so many looks, so many ms apart. */
    noteLooks?: { every: number; times: number; };
    /** A line about what the router does, for the player who looks at its stderr. */
    log?: (line: string) => void;
}

/** The client's meta key that names Antigravity's conversation in every call. */
export const conversationKey = "antigravity.google/conversation_id";

/** A router between the client and its children: give it each line the client writes, in order; `stop` ends every child, as the client goes. */
export function mcpRouter(options: RouterOptions): { fromClient(line: string): Promise<void>; stop(): void; }
{
    const looks = options.noteLooks ?? { every: 200, times: 10 };
    const log = options.log ?? (() => undefined);
    const children: Child[] = [];
    let handshake: { initialize?: string; initialized?: string; } = {};
    // The child that answered the client's last tools/list, and the one its last request went to.
    let listedBy: Child | undefined;
    let current: Child | undefined;
    // The children's own requests to the client, by the id the router gave them.
    const asked = new Map<string, { child: Child; id: unknown; }>();
    let askedCount = 0;
    // The conversations whose note was looked for with patience already: later calls look once.
    const waited = new Set<string>();
    let queue = Promise.resolve();

    const childIn = (folder: string): Child => {
        const found = children.find((child) => samePath(child.folder, folder));
        return found ?? startChild(folder);
    };

    const startChild = (folder: string): Child => {
        const child: Child = { folder, pending: new Map(), server: options.start(folder) };
        children.push(child);
        child.server.onLine((line) => fromChild(child, line));
        child.server.onEnd((reason) => ended(child, reason));

        // A child started after the handshake gets it again; its answer to initialize is its own, the client had one.
        if (handshake.initialize !== undefined) {
            child.replayed = parsed(handshake.initialize)?.id;
            child.server.write(handshake.initialize);
        }

        if (handshake.initialized !== undefined) {
            child.server.write(handshake.initialized);
        }

        return child;
    };

    const fromChild = (child: Child, line: string): void => {
        const message = parsed(line);

        if (message === undefined || !children.includes(child)) {
            return;
        }

        if (message.method === undefined && message.id !== undefined) {
            if (child.replayed !== undefined && message.id === child.replayed) {
                child.replayed = undefined;
                return;
            }

            const request = child.pending.get(message.id);
            child.pending.delete(message.id);

            if (request?.method === "tools/list") {
                listedBy = child;
            }

            options.toClient(request?.advice === undefined ? line : JSON.stringify(withAdvice(message, request.advice)));
            return;
        }

        // A request of the child's own to the client, as a form: an id no other child's can take.
        if (message.method !== undefined && message.id !== undefined) {
            askedCount++;
            const id = `rpg-route-${askedCount}`;
            asked.set(id, { child, id: message.id });
            options.toClient(JSON.stringify({ ...message, id }));
            return;
        }

        // The child takes back a request of its own: the client knows it by the id the router gave it.
        if (message.method === "notifications/cancelled") {
            const requestId = (message.params as { requestId?: unknown; } | undefined)?.requestId;
            const given = [...asked].find(([, request]) => request.child === child && request.id === requestId)?.[0];

            if (given !== undefined) {
                options.toClient(JSON.stringify({ ...message, params: { ...(message.params as object), requestId: given } }));
                return;
            }
        }

        options.toClient(line);
    };

    // A child that ends is forgotten, and the client's requests it held are answered: the next call for its folder starts another.
    const ended = (child: Child, reason: string): void => {
        const index = children.indexOf(child);

        if (index === -1) {
            return;
        }

        children.splice(index, 1);
        listedBy = listedBy === child ? undefined : listedBy;
        current = current === child ? undefined : current;
        log(`rpg mcp router: the server in ${child.folder} ended (${reason})`);

        for (const [id] of child.pending) {
            options.toClient(JSON.stringify({ jsonrpc: "2.0", id, error: { code: -32603, message: `The rpg server in ${child.folder} stopped (${reason}): call again.` } }));
        }

        for (const [id, request] of asked) {
            if (request.child === child) {
                asked.delete(id);
            }
        }
    };

    const route = async (line: string): Promise<void> => {
        const message = parsed(line);

        if (message === undefined) {
            return;
        }

        // An answer of the client's to a child's request goes back to that child, with the id it gave.
        if (message.method === undefined) {
            const request = typeof message.id === "string" ? asked.get(message.id) : undefined;

            if (request !== undefined) {
                asked.delete(message.id as string);
                request.child.server.write(JSON.stringify({ ...message, id: request.id }));
            }

            return;
        }

        if (message.method === "initialize") {
            handshake = { initialize: line };
        } else if (message.method === "notifications/initialized") {
            handshake.initialized = line;
        }

        if (message.id === undefined) {
            notify(message, line);
            return;
        }

        const request: Pending = { method: String(message.method) };
        const child = message.method === "tools/call" ? await callChild(message, request) : (current ?? childIn(options.folder));

        if (child === undefined) {
            return;
        }

        child.pending.set(message.id, request);
        child.server.write(line);
    };

    // A notification of the client's: one that cancels a request goes to the child that has it; the handshake's to the children there are; any other to all.
    const notify = (message: Message, line: string): void => {
        const cancelled = (message.params as { requestId?: unknown; } | undefined)?.requestId;
        const holder = cancelled === undefined ? undefined : children.find((child) => child.pending.has(cancelled));
        const targets = holder !== undefined ? [holder] : children.length > 0 ? children : [childIn(options.folder)];
        targets.forEach((child) => child.server.write(line));
    };

    // The child a call goes to: its conversation's campaign as noted, else the router's own folder; a call there of a conversation the hooks never noted gets
    // the advice it needs, or is answered at once when it would make a campaign in the app's own folder.
    const callChild = async (message: Message, request: Pending): Promise<Child | undefined> => {
        const conversation = conversationOf(message);
        const root = conversation === undefined ? undefined : await noted(conversation);
        const child = childIn(root ?? options.folder);

        if (conversation !== undefined && root === undefined) {
            const call = message.params as { name?: unknown; arguments?: { folder?: unknown; }; } | undefined;
            const folder = call?.arguments?.folder;

            if (call?.name === "init" && (typeof folder !== "string" || !isAbsolute(folder))) {
                log(`rpg mcp router: call ${String(message.id)} of conversation ${conversation} asks init with no full path: answered without a server`);
                options.toClient(JSON.stringify({ jsonrpc: "2.0", id: message.id, result: { content: [{ type: "text", text: initWhere }], isError: true } }));
                return undefined;
            }

            request.advice = call?.name === "init" ? openThere(folder as string) : openThere();
        }

        log(`rpg mcp router: call ${String(message.id)}${conversation === undefined ? "" : ` of conversation ${conversation}`} goes to the server in ${child.folder}${
            root === undefined && conversation !== undefined ? " (no campaign noted for it)" : ""
        }`);

        // The client lists its tools from one child: one whose tools it did not list may have others, as another campaign's packages give.
        if (listedBy !== undefined && listedBy !== child) {
            options.toClient(JSON.stringify({ jsonrpc: "2.0", method: "notifications/tools/list_changed" }));
            listedBy = undefined;
        }

        current = child;
        return child;
    };

    const noted = async (conversation: string): Promise<string | undefined> => {
        let root = options.campaignOf(conversation);

        for (let look = 1; root === undefined && !waited.has(conversation) && look <= looks.times; look++) {
            await new Promise((done) => setTimeout(done, looks.every));
            root = options.campaignOf(conversation);
        }

        waited.add(conversation);
        return root;
    };

    // The child in the router's own folder serves from the start, as the server alone would.
    childIn(options.folder);

    return {
        // One line at a time, in order: a call that waits for its note holds those after it.
        fromClient: (line) => {
            queue = queue.then(() => route(line)).catch(() => undefined);
            return queue;
        },
        stop: () => {
            for (const child of children.splice(0)) {
                child.server.stop();
            }
        },
    };
}

interface Child
{
    folder: string;
    server: ChildServer;
    /** The client's requests it has not answered yet, by id. */
    pending: Map<unknown, Pending>;
    /** The id of the initialize replayed to it, whose answer stays with the router. */
    replayed?: unknown;
}

interface Pending
{
    method: string;
    /** What the master is told after the answer, for a conversation the hooks never noted. */
    advice?: string;
}

type Message = { method?: unknown; id?: unknown; params?: unknown; result?: unknown; error?: unknown; };

// What init answers, called from the app's own folder with no full path: it would make a campaign among the app's files.
const initWhere = "This chat runs in no campaign's folder, so init needs where to make the campaign: ask the player which folder, and pass its full path as folder.";

/** What the master is told after a call from the app's own folder: the chat must start in the campaign's folder, where its hooks load. */
function openThere(folder?: string): string
{
    const where = folder === undefined ? "the campaign's folder" : folder;
    return `Tell the player: open ${where} in Antigravity and start a new chat there. This chat runs outside the campaign, and the game's hooks load only when a chat starts in its folder.`;
}

/** An answer of a call with a line added after its content; an error answer keeps its error and gets the line as its message's end. */
function withAdvice(message: Message, advice: string): Message
{
    const result = message.result as { content?: unknown[]; } | undefined;

    if (result !== undefined && Array.isArray(result.content)) {
        return { ...message, result: { ...result, content: [...result.content, { type: "text", text: advice }] } };
    }

    const error = message.error as { message?: unknown; } | undefined;
    return error === undefined ? message : { ...message, error: { ...error, message: `${String(error.message ?? "")} ${advice}`.trim() } };
}

function parsed(line: string): Message | undefined
{
    try {
        const message = JSON.parse(line) as unknown;
        return message !== null && typeof message === "object" && !Array.isArray(message) ? message as Message : undefined;
    } catch {
        return undefined;
    }
}

function conversationOf(message: Message): string | undefined
{
    const meta = (message.params as { _meta?: Record<string, unknown>; } | undefined)?._meta;
    const conversation = meta?.[conversationKey];
    return typeof conversation === "string" && conversation !== "" ? conversation : undefined;
}
