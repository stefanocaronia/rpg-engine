// The dashboard a chat's own server opens (D-270, D-577), and what any server, a table's too, sets in its context as its page opens.
import { findCampaign } from "../../campaign/index.ts";
import type { Context } from "../../core/context.ts";
import type { SessionStore } from "../../core/session-store.ts";
import { withFiles } from "../../core/store.ts";
import { lookUntil } from "../../core/wait.ts";
import { answers } from "../page/index.ts";
import { campaignPageElsewhere, type Dashboard, isCampaignPage, startDashboard } from "./index.ts";
import { campaignPorts, dashboardAt } from "./ports.ts";

// How often a chat asks after its campaign's page, which another chat serves, to serve it once that one closes (D-577).
const heldAskEvery = 3000;

// How often, and how long, a chat that gave its page to the campaign's table looks for the page served again, before it serves it itself once more.
const givenAskEvery = 500;
const givenWait = 20_000;

/**
 * Opens the player's dashboard as the chat starts and before the first call that finds a campaign in the server's folder, as after init, and lets that call
 * wait for it, so that its status gives the link (D-270, D-277, D-577); never in a folder without a campaign. Where another chat of the campaign serves its
 * page, the link is that page's, and this chat asks after it every few seconds, to serve it at the same port once that chat closes. The campaign's table
 * that asks for the page gets it: this chat keeps its link, and serves it again once the table ends, or where the table never serves it. The game goes on
 * without it.
 */
export function dashboardOpener(context: Context, session: SessionStore, ports?: number[]): { open(): Promise<void>; close(): Promise<void>; }
{
    let opening: Promise<Dashboard | undefined> | undefined;
    // The page another chat serves, and the wait for it to go.
    let held: string | undefined;
    let waiting: NodeJS.Timeout | undefined;
    let closed = false;
    // The page given to the table, until it serves it: no call serves it again meanwhile.
    let giving = false;

    // Where the page that kept this chat from serving it went before it was found, as a table that ends at once, this chat tries once more.
    const attempt = async (again: boolean): Promise<void> => {
        if (giving) {
            showPage(context, undefined, held);
            return;
        }

        const root = withFiles(session, () => findCampaign(context.folder));
        opening ??= root === undefined ? undefined : startDashboard(context, session, { ports, giveWay }).catch(() => undefined);
        const asked = opening;
        const dashboard = await asked;

        if (giving) {
            showPage(context, undefined, held);
            return;
        }

        if (dashboard === undefined && root !== undefined && held === undefined && waiting === undefined && !closed) {
            const elsewhere = await campaignPageElsewhere(root, ports ?? campaignPorts(root));

            if (elsewhere !== undefined && !closed && waiting === undefined) {
                held = elsewhere.url;
                waitFor(root, elsewhere.port);
            } else if (elsewhere === undefined && again && !closed) {
                // The same start is never made twice: a call that tried meanwhile waits for this one's.
                opening = opening === asked ? undefined : opening;
                await attempt(false);
                return;
            }
        }

        showPage(context, dashboard, held);
    };

    const open = (): Promise<void> => attempt(true);

    // Asks after the page, saying this chat waits there, so that the doorbell does not take that chat's for this one's; once it goes, serves it. A page
    // that does not answer while its port still takes calls is a chat busy with its world: it is still there.
    const waitFor = (root: string, port: number): void => {
        waiting = setInterval(() => {
            void dashboardAt(port, process.env.CLAUDE_CODE_SESSION_ID).then(async (there) => {
                const gone = there === undefined ? !(await answers(port)) : !isCampaignPage(there, root);

                if (closed || waiting === undefined || !gone) {
                    return;
                }

                clearInterval(waiting);
                waiting = undefined;
                held = undefined;
                opening = undefined;
                void open().catch(() => undefined);
            });
        }, heldAskEvery);
        waiting.unref();
    };

    // The table asked for the page: this chat closes its own, keeps its link, and once the page answers again, served by the table or by none, opens again.
    const giveWay = (): void => {
        if (closed || giving) {
            return;
        }

        giving = true;
        void (async () => {
            const given = await opening;
            opening = undefined;
            held = given?.url;
            showPage(context, undefined, held);
            await given?.close();
            const root = withFiles(session, () => findCampaign(context.folder));
            const servedAgain = async (): Promise<true | undefined> => (closed || root === undefined || await campaignPageElsewhere(root, ports ?? campaignPorts(root)) !== undefined ? true : undefined);
            await lookUntil(servedAgain, () => true, { within: givenWait, every: givenAskEvery });
            giving = false;
            held = undefined;

            if (!closed) {
                await open();
            }
        })().catch(() => undefined);
    };

    return {
        open,
        close: async () => {
            closed = true;
            clearInterval(waiting);
            await (await opening)?.close();
        },
    };
}

/**
 * What a server sets as its page opens: the link, the page that asks the player, and what the player did there; where another chat of the campaign serves
 * the page, `held`, that page's link alone.
 */
export function showPage(context: Context, dashboard: Dashboard | undefined, held?: string): void
{
    context.dashboard = dashboard?.url ?? held;
    context.dashboardHeld = dashboard === undefined && held !== undefined;
    context.page = dashboard?.player;
    context.news = dashboard?.news;
}
