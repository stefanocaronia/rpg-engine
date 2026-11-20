// A picture of the player's own for a page the character knows, sent from the page (D-572 (3)): written as image with a file writes it, the same checks, the
// same 5 MB and the same line in the log; the master hears of it once, at the head of their next call.
import type { IncomingMessage, ServerResponse } from "node:http";
import { requireCampaign } from "../../campaign/index.ts";
import { placeImage } from "../../commands/image.ts";
import { campaignWorld } from "../../commands/shared/campaign/world.ts";
import { knowsPage, playerKnowledge } from "../../commands/shared/characters/knowledge.ts";
import { Refusal, refusalBody } from "../../core/refusal.ts";
import { withFiles } from "../../core/store.ts";
import { imageOfBytes, largestImage } from "../../images/index.ts";
import { pageNamed } from "../../pages/index.ts";
import { decoded, mostSaid, readBytes, sendJson } from "./files.ts";
import type { Served } from "./index.ts";

/**
 * Gives `page` the picture in the request's body: a page of the campaign the character knows, never one of the game system; a body over the largest picture
 * is refused by its declared length before it is read, or as soon as it passes it.
 */
export async function givePicture(request: IncomingMessage, response: ServerResponse, served: Served, page: string): Promise<void>
{
    const size = largestImage / 1024 / 1024;
    const tooBig = { error: `The picture is more than ${size} MB: make it smaller (512 pixels a side are enough).`, code: "picture-big", values: { size: String(size) } };

    // The connection closes after the refusal: the rest of the body is never read.
    if (Number(request.headers["content-length"] ?? 0) > largestImage) {
        response.setHeader("Connection", "close");
        sendJson(response, 413, tooBig);
        return;
    }

    const name = page.trim();

    if (name === "" || name.length > mostSaid) {
        sendJson(response, 400, { error: "Send the picture as the body, with the page it is for: /api/picture?page=<name>." });
        return;
    }

    const bytes = await readBytes(request, largestImage);

    if (bytes === undefined) {
        response.setHeader("Connection", "close");
        sendJson(response, 413, tooBig);
        return;
    }

    const file = decoded(String(request.headers["x-file-name"] ?? "")) ?? "";

    try {
        await served.session.ready();
        const given = withFiles(served.session, () => {
            const root = requireCampaign(served.context.folder);
            const world = campaignWorld(root, served.context);
            const found = pageNamed(world, name);
            const knowledge = playerKnowledge(root, world);

            // A page the character does not know reads as none: the refusal never tells it is there.
            if (found === undefined || knowledge === undefined || !knowsPage(knowledge, found)) {
                throw new Refusal(`Your character knows no page called ${name}: reload the page.`, "no-page", { page: name });
            }

            if (found.system !== undefined) {
                throw new Refusal(`${found.name} is a page of the game system: it shows the system's picture.`, "system-page", { page: found.name });
            }

            const picture = imageOfBytes(bytes, file === "" ? "The file" : file);

            if ("problem" in picture) {
                throw new Refusal(picture.problem, "not-picture", { name: file === "" ? name : file });
            }

            return placeImage(root, { ...served.context, actor: "player" }, world, found, picture);
        });
        served.context.later?.add(`The player gave ${given.page} a picture of their own, on the dashboard: it is ${given.image ?? ""} now.`);
        served.notify();
        sendJson(response, 200, { page: given.page });
    } catch (error) {
        sendJson(response, error instanceof Refusal && error.code === "no-page" ? 404 : 400, refusalBody(error));
    }
}
