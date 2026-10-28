// Claude Code's doorbell for the player's sentences on the dashboard (D-495): `rpg --listen`, the Stop hook init writes, waits at the dashboard of its own
// chat and, when the player says a sentence, tells the chat to call status. It never carries the sentence, which reaches the master in that call.
import { get } from "node:http";
import { findCampaign } from "./campaign/index.ts";
import { samePath } from "./library/index.ts";
import { campaignPorts } from "./server/dashboard/index.ts";

/** What the chat hears from the doorbell: never the player's words, only where to read them. */
export const bellLine = "The player acted on the dashboard: call status to read what they did.";

/** Reads the hook's input, waits for the doorbell, and ends the process as Claude Code's asyncRewake reads it: 2 with the line to wake the chat, else 0. */
export async function listenHere(): Promise<void>
{
    let input = "";

    for await (const chunk of process.stdin) {
        input += String(chunk);
    }

    // It ends as soon as it knows, whatever else the process holds: the chat hears the hook only once it ends.
    if (await waitForBell(input)) {
        process.stderr.write(`${bellLine}\n`, () => process.exit(2));
    } else {
        process.exit(0);
    }
}

/**
 * Waits at the dashboard of the hook's chat until the player says a sentence: true then; false when there is none to wait at, or it goes away. The chat's own
 * server is the one with its session; after /clear, which gives the hook a new one, the only server of its campaign.
 */
export async function waitForBell(input: string, ports?: number[]): Promise<boolean>
{
    const hook = hookInput(input);
    const root = findCampaign(hook.cwd ?? process.cwd());

    if (root === undefined) {
        return false;
    }

    const probes = await Promise.all((ports ?? campaignPorts(root)).filter((port) => port !== 0).map(async (port) => ({ port, said: await probe(port) })));
    const ours = probes.filter((one) => one.said !== undefined && one.said.root !== null && samePath(one.said.root, root));
    const port = (ours.find((one) => hook.session !== undefined && one.said?.session === hook.session) ?? (ours.length === 1 ? ours[0] : undefined))?.port;
    return port === undefined ? false : (await body(port, "/api/bell")) === "ring";
}

function hookInput(input: string): { session?: string; cwd?: string; }
{
    try {
        const parsed = JSON.parse(input) as { session_id?: unknown; cwd?: unknown; };
        return {
            ...(typeof parsed.session_id === "string" ? { session: parsed.session_id } : {}),
            ...(typeof parsed.cwd === "string" ? { cwd: parsed.cwd } : {}),
        };
    } catch {
        return {};
    }
}

// How long a port may take to say whose dashboard it is: one of this computer answers at once.
const probeWait = 1000;

/** Whose dashboard answers at a port: its chat's session and campaign; undefined where none does. */
async function probe(port: number): Promise<{ session: string | null; root: string | null; } | undefined>
{
    const said = await body(port, "/api/bell?probe", probeWait);

    try {
        const parsed = said === undefined ? undefined : JSON.parse(said) as { session?: unknown; root?: unknown; };
        return parsed === undefined
            ? undefined
            : { session: typeof parsed.session === "string" ? parsed.session : null, root: typeof parsed.root === "string" ? parsed.root : null };
    } catch {
        return undefined;
    }
}

/** The body a dashboard of this computer answers with, once it ends; undefined when it does not answer, or not with 200. */
function body(port: number, path: string, wait?: number): Promise<string | undefined>
{
    return new Promise((done) => {
        // A connection of its own: Node's shared one ends a request idle for five seconds, and the doorbell waits for hours.
        const request = get({ host: "127.0.0.1", port, path, agent: false, ...(wait === undefined ? {} : { timeout: wait }) }, (response) => {
            let text = "";
            response.setEncoding("utf8");
            response.on("data", (chunk: string) => {
                text += chunk;
            });
            response.on("end", () => done(response.statusCode === 200 ? text : undefined));
            response.on("error", () => done(undefined));
        });

        if (wait !== undefined) {
            request.on("timeout", () => request.destroy());
        }

        request.on("error", () => done(undefined));
    });
}
