// Claude Code's doorbell for the player's sentences on the dashboard (D-495): `rpg --listen`, the Stop hook init writes, waits at the dashboard of its own
// chat and, when the player says a sentence, tells the chat to call status. It never carries the sentence, which reaches the master in that call.
import { findCampaign } from "../campaign/index.ts";
import { samePath } from "../library/index.ts";
import { askDashboard, campaignPorts, dashboardAt } from "./dashboard/ports.ts";

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
 * server is the one with its session; after /clear, which gives the hook a new one, the only server of its campaign, while no other chat waits there for the
 * page (D-577): better no ring than one in a chat that cannot read the page.
 */
export async function waitForBell(input: string, ports?: number[]): Promise<boolean>
{
    const hook = hookInput(input);
    const root = findCampaign(hook.cwd ?? process.cwd());

    if (root === undefined) {
        return false;
    }

    const probes = await Promise.all((ports ?? campaignPorts(root)).filter((port) => port !== 0).map(async (port) => ({ port, said: await dashboardAt(port) })));
    const ours = probes.flatMap((one) => (one.said !== undefined && one.said.root !== null && samePath(one.said.root, root) ? [{ port: one.port, said: one.said }] : []));
    // The only page of the campaign, once nobody else waits for it: a chat that does could be this one, and a wrong chat cannot read the page.
    const only = ours.length === 1 && ours[0].said.others.length === 0 ? ours[0] : undefined;
    const port = (ours.find((one) => hook.session !== undefined && one.said.session === hook.session) ?? only)?.port;
    return port === undefined ? false : (await askDashboard(port, "/api/bell")) === "ring";
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
