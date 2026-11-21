// RPG Engine's plugin for OpenCode (D-578), which rpg writes as .opencode/plugins/rpg.js in a campaign. OpenCode runs no hooks, so this runs the doorbell
// on its events: a turn that ends waits for the player on the dashboard (`rpg --listen opencode`), whose line comes to the chat as a message; a turn that
// starts meanwhile, or the player's message, lets that wait go. Nothing here ever stops OpenCode: what fails is left alone.
import { spawn } from "node:child_process";
import { resolve } from "node:path";

export default {
    id: "rpg",
    /** Follows OpenCode's events until it lets the plugin go. `run` starts a program as Node's spawn does: the tests give their own. */
    async setup(context, run)
    {
        const chats = campaignChats(context, typeof run === "function" ? run : spawn);
        const controller = new AbortController();

        void (async () => {
            try {
                for await (const event of context.event.subscribe({ signal: controller.signal })) {
                    try {
                        chats.heard(event);
                    } catch {
                        // An event of a shape this plugin does not know: the next one is heard all the same.
                    }
                }
            } catch {
                // OpenCode stopped telling its events: the doorbell waits no more, and the game goes on in the chat.
            }
        })();

        return () => {
            controller.abort();
            chats.stop();
        };
    },
};

/** What the plugin does with OpenCode's events in the campaign's folder: its chats, and the doorbell of each. */
function campaignChats(context, run)
{
    const folder = context?.location?.directory ?? process.cwd();
    const ours = new Set();
    const agents = new Set();
    const listeners = new Map();

    // A chat's doorbell, which the player's sentence on the dashboard rings: its words are sent to the chat, which starts a turn. Words the chat could not
    // take come back to the page, which rings again: a doorbell waits for them.
    const listen = (session) => {
        letGo(session);
        const waiting = hook({ cwd: folder, session_id: session, hook_event_name: "Stop", host_pid: process.pid }, (code, output) => {
            if (listeners.get(session) !== waiting) {
                return;
            }

            listeners.delete(session);

            if (code === 0) {
                say(session, output);
            }
        });

        if (waiting !== undefined) {
            listeners.set(session, waiting);
        }
    };

    const say = (session, output) => {
        const line = output.trim();

        if (line !== "") {
            Promise.resolve().then(() => context.session.prompt({ sessionID: session, text: line })).catch(() => listen(session));
        }
    };

    // `rpg --listen opencode` in the folder, with its input on stdin, as a host runs a hook: `ended` hears its exit code and what it wrote; `said` what it
    // wrote so far.
    const hook = (input, ended) => {
        try {
            const child = run("rpg --listen opencode", { cwd: folder, shell: true, windowsHide: true, stdio: ["pipe", "pipe", "ignore"], detached: process.platform !== "win32" });
            let output = "";
            child.stdout?.on("data", (chunk) => {
                output += String(chunk);
            });
            child.stdin?.on("error", () => undefined);
            child.on("error", () => undefined);
            child.on("close", (code) => ended(code, output));
            child.stdin?.end(JSON.stringify(input));
            return { child, said: () => output };
        } catch {
            return undefined;
        }
    };

    // The doorbell of a chat whose turn starts: ended, with what it started; the dashboard sees it gone. Words it already had still go to the chat, after
    // the player's message: the page counts them as the master's.
    const letGo = (session) => {
        const waiting = listeners.get(session);

        if (waiting !== undefined) {
            listeners.delete(session);
            end(waiting.child, run);
            say(session, waiting.said());
        }
    };

    return {
        heard: (event) => {
            const session = event?.data?.sessionID;

            if (typeof session !== "string") {
                return;
            }

            // OpenCode's background service runs this plugin for every folder and tells it the events of all: only the chats of this folder are its own.
            // The turn's start and end say no folder: the session's earlier events, its creation or its messages, have said it.
            const place = event.location?.directory ?? event.data.location?.directory;

            if (typeof place === "string" && sameFolder(place, folder)) {
                ours.add(session);
            }

            if (!ours.has(session)) {
                return;
            }

            // A subagent's session is born with its parent's: it is no chat, and nobody waits for the player after its turns.
            if (event.type === "session.created" && typeof event.data.parentID === "string") {
                agents.add(session);
            }

            if (agents.has(session)) {
                return;
            }

            // A message of the player's, or the doorbell's own, which comes once its wait has ended, lets the wait go; a turn's end waits again, a failed one too.
            if ((event.type === "session.inbox.enqueued" && event.data.item?.type === "user") || event.type === "session.execution.started") {
                letGo(session);
            } else if (event.type === "session.execution.succeeded" || event.type === "session.execution.failed") {
                listen(session);
            }
        },
        stop: () => {
            for (const session of [...listeners.keys()]) {
                letGo(session);
            }
        },
    };
}

/** Ends a hook with what its shell started: on Windows its whole tree, else its process group; the process alone when neither can be. */
function end(child, run)
{
    try {
        if (child.pid === undefined) {
            child.kill();
        } else if (process.platform === "win32") {
            run("taskkill", ["/T", "/F", "/PID", String(child.pid)], { windowsHide: true, stdio: "ignore" }).on("error", () => child.kill());
        } else {
            process.kill(-child.pid, "SIGTERM");
        }
    } catch {
        try {
            child.kill();
        } catch {
            // Gone already.
        }
    }
}

/** Whether OpenCode's folder of a session is this one, as the system compares paths: on Windows and macOS without the case. */
function sameFolder(place, folder)
{
    const caseless = process.platform === "win32" || process.platform === "darwin";
    const plain = (path) => (caseless ? resolve(path).toLowerCase() : resolve(path));
    return plain(place) === plain(folder);
}
