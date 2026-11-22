// The doorbell for the player's sentences on the dashboard (D-495, D-578): `rpg --listen`, the Stop hook init writes for Claude Code and Antigravity, which
// OpenCode's plugin runs too, waits at the dashboard of its own chat and, when the player says a sentence, tells the chat to call status, the sentence
// reaching the master in that call; in OpenCode, whose plugin speaks as the player, it brings the sentence itself, as Codex's queue does.
import { findCampaign } from "../../campaign/index.ts";
import { samePath } from "../../library/index.ts";
import { askDashboard, campaignPorts, type DashboardAt, dashboardAt } from "../dashboard/ports.ts";
import { isSubagentConversation, watchNewTurn } from "./antigravity.ts";

/** What the chat hears from the doorbell: never the player's words, only where to read them. */
export const bellLine = "The player acted on the dashboard: call status to read what they did.";

/** The hosts whose hook runs `rpg --listen`, as its argument names them: Claude Code with none; OpenCode through the campaign's plugin. */
export const listeningHosts = ["claude", "codex", "antigravity", "opencode"] as const;

export type ListeningHost = (typeof listeningHosts)[number];

/**
 * Reads the hook's input, waits for the doorbell, and ends the process as the host reads it: for Claude Code's asyncRewake, 2 with the line on stderr; for
 * Codex's and Antigravity's Stop hooks, 0 with their answer on stdout; for OpenCode's plugin, 0 with the player's words, or the line, on stdout, which it sends to the chat. Else 0.
 * Antigravity's hook holds the chat: it lets it go, without the bell, as soon as the player writes in the chat or stops it; OpenCode's, once OpenCode is gone.
 */
export async function listen(host: ListeningHost = "claude"): Promise<void>
{
    let input = "";

    for await (const chunk of process.stdin) {
        input += String(chunk);
    }

    const hook = hookInput(input);

    // A subagent's conversation, as the character agent's, is not the master's: its end lets it go at once (D-580).
    if (host === "antigravity" && hook.session !== undefined && isSubagentConversation(hook.session)) {
        process.stdout.write(`${hookAnswer(host, false)}\n`, () => process.exit(0));
        return;
    }

    const turn = host === "antigravity" && hook.session !== undefined ? watchNewTurn(hook.session) : undefined;
    const opener = hook.hostPid === undefined ? undefined : watchProcessEnd(hook.hostPid);
    const unheard: Heard = { rang: false };
    const heard = await Promise.race([
        bellHeard(input, { words: host === "opencode" }).catch(() => unheard),
        ...(turn === undefined ? [] : [turn.started.then(() => unheard)]),
        ...(opener === undefined ? [] : [opener.ended.then(() => unheard)]),
    ]);
    turn?.stop();
    opener?.stop();
    const answer = hookAnswer(host, heard.rang, heard.words);

    // It ends as soon as it knows, whatever else the process holds: the chat hears the hook only once it ends, and the dashboard sees its wait gone.
    if (answer === undefined) {
        process.exit(0);
    } else if (host === "claude") {
        process.stderr.write(`${answer}\n`, () => process.exit(2));
    } else {
        process.stdout.write(`${answer}\n`, () => process.exit(0));
    }
}

/**
 * What the hook says as it ends, by its host: the doorbell's line, or the answer that carries it, when it rang, and for OpenCode the player's `words` when the
 * page gave them; else nothing, but Antigravity's empty answer.
 */
export function hookAnswer(host: ListeningHost, rang: boolean, words?: string): string | undefined
{
    if (host === "antigravity") {
        return rang ? JSON.stringify({ decision: "continue", reason: bellLine }) : "{}";
    }

    if (!rang) {
        return undefined;
    }

    if (host === "opencode") {
        return words ?? bellLine;
    }

    return host === "codex" ? JSON.stringify({ decision: "block", reason: bellLine }) : bellLine;
}

/** What the hook heard at its chat's dashboard: whether it rang, and the player's words when it asked for them and the page gave some. */
export interface Heard
{
    rang: boolean;
    words?: string;
}

/**
 * Waits at the dashboard of the hook's chat until the player says a sentence: true then; false when there is none to wait at, or it goes away. The chat's own
 * server is the one with its session; after /clear, which gives the hook a new one, and in hosts whose server does not know its session, the only server of
 * its campaign, while no other chat waits there for the page (D-577): better no ring than one in a chat that cannot read the page. The hook may come before its
 * chat's page answers, as in Antigravity: while the campaign has none, it looks again `looks.times` times, every `looks.every` ms.
 */
export async function waitForBell(input: string, ports?: number[], looks = { every: 500, times: 10 }): Promise<boolean>
{
    return (await bellHeard(input, { ports, looks })).rang;
}

/**
 * Waits as waitForBell does, at `ports` or the campaign's, looking again as `looks` says, and says what it heard; with `words`, it asks the page for the
 * player's sentences themselves, which the page holds for the master's next call (D-578).
 */
export async function bellHeard(input: string, options: { ports?: number[]; looks?: { every: number; times: number; }; words?: boolean; } = {}): Promise<Heard>
{
    const { ports, looks = { every: 500, times: 10 }, words = false } = options;
    const hook = hookInput(input);
    // Antigravity runs its hooks in .agents: the campaign is found upwards.
    const root = findCampaign(hook.cwd ?? process.cwd());

    if (root === undefined) {
        return { rang: false };
    }

    let ours = await campaignPages(root, ports ?? campaignPorts(root));

    for (let look = 1; ours.length === 0 && look <= looks.times; look++) {
        await new Promise((done) => setTimeout(done, looks.every));
        ours = await campaignPages(root, ports ?? campaignPorts(root));
    }

    // The only page of the campaign, once nobody else waits for it: a chat that does could be this one, and a wrong chat cannot read the page. An older
    // engine's page does not say who waits, so it is never taken as this chat's.
    const only = ours.length === 1 && ours[0].said.others?.length === 0 ? ours[0] : undefined;
    const port = (ours.find((one) => hook.session !== undefined && one.said.session === hook.session) ?? only)?.port;
    const said = port === undefined ? undefined : await askDashboard(port, words ? "/api/bell?words" : "/api/bell");

    // An older engine's page, or one with no words to give, rings alone.
    if (said === "ring") {
        return { rang: true };
    }

    // The words, after a first line with their ids: the page hears they were taken before the chat is given them.
    const head = said?.match(/^ring(?: ([\w,-]*))?\n/);

    if (said === undefined || head === null || head === undefined) {
        return { rang: false };
    }

    if (port !== undefined && head[1] !== undefined && head[1] !== "") {
        await askDashboard(port, `/api/bell?took=${encodeURIComponent(head[1])}`, 2000);
    }

    const text = said.slice(head[0].length).trim();
    return { rang: true, ...(text === "" ? {} : { words: text }) };
}

/** The campaign's dashboards that answer at these ports, with what each says of itself. */
async function campaignPages(root: string, ports: number[]): Promise<{ port: number; said: DashboardAt; }[]>
{
    const probes = await Promise.all(ports.filter((port) => port !== 0).map(async (port) => ({ port, said: await dashboardAt(port) })));
    return probes.flatMap((one) => (one.said !== undefined && one.said.root !== null && samePath(one.said.root, root) ? [{ port: one.port, said: one.said }] : []));
}

/** What the hook reads of its host's input: the chat's session, Antigravity's conversation; its folder; the process of OpenCode, which its plugin names. */
function hookInput(input: string): { session?: string; cwd?: string; hostPid?: number; }
{
    try {
        const parsed = JSON.parse(input) as { session_id?: unknown; conversationId?: unknown; cwd?: unknown; host_pid?: unknown; };
        const session = typeof parsed.session_id === "string" ? parsed.session_id : parsed.conversationId;
        return {
            ...(typeof session === "string" ? { session } : {}),
            ...(typeof parsed.cwd === "string" ? { cwd: parsed.cwd } : {}),
            ...(Number.isInteger(parsed.host_pid) && (parsed.host_pid as number) > 0 ? { hostPid: parsed.host_pid as number } : {}),
        };
    } catch {
        return {};
    }
}

/** Looks every `every` ms whether the process `pid` still runs: `ended` once it does not. On macOS and Linux a closed terminal does not end the hook. */
function watchProcessEnd(pid: number, every = 2000): { ended: Promise<void>; stop: () => void; }
{
    let timer: NodeJS.Timeout | undefined;
    const ended = new Promise<void>((done) => {
        timer = setInterval(() => {
            if (!processRuns(pid)) {
                done();
            }
        }, every);
        timer.unref();
    });
    return { ended, stop: () => clearInterval(timer) };
}

// A process another user runs answers EPERM: it runs.
function processRuns(pid: number): boolean
{
    try {
        process.kill(pid, 0);
        return true;
    } catch (error) {
        return (error as NodeJS.ErrnoException).code === "EPERM";
    }
}
