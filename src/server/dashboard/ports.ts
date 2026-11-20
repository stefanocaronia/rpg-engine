// The ports of the dashboard, apart from its server, so that the doorbell reads them without loading the server and its commands (D-495); and how to ask
// a port whose dashboard answers there, and whether any program does.
import { get } from "node:http";
import { connect } from "node:net";
import { savedPort } from "../../campaign/index.ts";

/**
 * The ports the dashboard tries in turn, taking the first that is free: the same link from one chat to the next (D-272). Windows may keep ranges of ports
 * from boot to boot (netsh int ipv4 show excludedportrange): then the next range, and at last any free port, whose link status gives all the same (D-338).
 */
export const dashboardPorts = [...[4747, 5747, 6747, 7747, 8747].flatMap((first) => Array.from({ length: 10 }, (_, index) => first + index)), 0];

/**
 * The ports for a campaign's dashboard: the one campaign.yaml keeps (D-577), then its own in each range, worked out from its folder, then the others (D-353).
 * Its link stays the same from one chat to the next, and as the folder moves, so that the player can keep it, and a page left open comes back by itself.
 */
export function campaignPorts(root: string): number[]
{
    const saved = savedPort(root);
    const offset = [...root.replaceAll("\\", "/").toLowerCase()].reduce((sum, letter) => (sum * 31 + letter.charCodeAt(0)) % 100003, 0) % 10;
    const derived = [4747, 5747, 6747, 7747, 8747].map((first) => first + offset);
    const own = saved === undefined ? derived : [saved, ...derived.filter((port) => port !== saved)];
    return [...own, ...dashboardPorts.filter((port) => !own.includes(port))];
}

/**
 * Whose dashboard answers at a port: its chat's session, its campaign, and the other chats of that campaign that wait for it (D-577), undefined from an
 * engine older than that, which does not know them; the whole undefined where none answers.
 */
export interface DashboardAt
{
    session: string | null;
    root: string | null;
    others?: string[];
}

// How long a port may take to say whose dashboard it is: one of this computer answers at once.
const probeWait = 1000;

/** Whose dashboard answers at a port; undefined where none does. With `also`, this chat's session, which waits there for the page (D-577). */
export async function dashboardAt(port: number, also?: string): Promise<DashboardAt | undefined>
{
    const said = await askDashboard(port, `/api/bell?probe${also === undefined ? "" : `&also=${encodeURIComponent(also)}`}`, probeWait);

    try {
        const parsed = said === undefined ? undefined : JSON.parse(said) as { session?: unknown; root?: unknown; others?: unknown; };
        return parsed === undefined ? undefined : {
            session: typeof parsed.session === "string" ? parsed.session : null,
            root: typeof parsed.root === "string" ? parsed.root : null,
            ...(Array.isArray(parsed.others) ? { others: parsed.others.filter((one): one is string => typeof one === "string") } : {}),
        };
    } catch {
        return undefined;
    }
}

/** The body a dashboard of this computer answers with, once it ends; undefined when it does not answer, or not with 200. */
export function askDashboard(port: number, path: string, wait?: number): Promise<string | undefined>
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

/** Whether a program answers at a port of this machine, on 127.0.0.1 or on ::1. */
export async function answers(port: number): Promise<boolean>
{
    const answersAt = (host: string): Promise<boolean> =>
        new Promise((done) => {
            const socket = connect({ host, port });

            const end = (answered: boolean): void => {
                socket.destroy();
                done(answered);
            };

            socket.setTimeout(300, () => end(false));
            socket.once("connect", () => end(true));
            socket.once("error", () => end(false));
        });
    return (await Promise.all(["127.0.0.1", "::1"].map(answersAt))).some((answer) => answer);
}
