// The way back from a campaign's page to the campaigns of this computer: the launcher's link where it answers, and the campaign's folder, by which the
// launcher opens it again; at a table, the launcher started from the page.
import type { IncomingMessage, ServerResponse } from "node:http";
import { z } from "zod";
import { findCampaign } from "../../campaign/index.ts";
import { refusalWords } from "../../core/refusal.ts";
import { withFiles } from "../../core/store.ts";
import { readBody, sendJson } from "../page/index.ts";
import type { Served } from "./index.ts";

/** The launcher's link where it answers, at a table alone, and the campaign's folder; null where the page serves none. */
export async function homeNow(response: ServerResponse, served: Served): Promise<void>
{
    const root = withFiles(served.session, () => findCampaign(served.context.folder)) ?? null;
    const there = await served.launcher?.find();
    sendJson(response, 200, there === undefined ? { root } : { url: there.url, root });
}

/**
 * Reaches the launcher from the page, at a table alone, started first where none answers, then opens its page in an application window of its own: its
 * link, and whether that window opened, else the page goes there itself; or why not.
 */
export async function startHome(request: IncomingMessage, response: ServerResponse, served: Served): Promise<void>
{
    const parsed = z.object({ start: z.literal(true) }).strict().safeParse(await readBody(request));

    if (!parsed.success) {
        sendJson(response, 400, { error: "Send { start: true } to start the launcher." });
        return;
    }

    if (served.launcher === undefined) {
        sendJson(response, 409, refusalWords("Only a campaign's table starts the launcher: start it with rpg open.", "no-launcher-way"));
        return;
    }

    const reached = await served.launcher.reach();

    if (!("url" in reached)) {
        sendJson(response, 409, reached);
        return;
    }

    sendJson(response, 200, { url: reached.url, window: await served.launcher.open(reached.url) });
}
