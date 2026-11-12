// write with layer: the campaign's layer over a page of its game system (SYS-11), and the campaign pages that follow it
import type { Context } from "../../core/context.ts";
import { appendLogEntry } from "../../core/log.ts";
import type { Coin } from "../../money/index.ts";
import { type FieldChange, findPage, type Page, pageWithPath, systemLabel, type TextMode, type World, writeLayer } from "../../pages/index.ts";
import { campaignSystem, campaignWorld } from "../shared/campaign/world.ts";
import type { readOpenScene } from "../shared/scene/scene.ts";
import { newDatedLogEntry } from "../shared/time/time.ts";
import { checkLayerFieldWrite } from "./checks.ts";
import { followersOfWrite, logCounterChanges } from "./inheritance.ts";

/** What a write did to a layer, as write says it. */
export interface LayerResult
{
    page: string;
    type?: Page["type"];
    path: string;
    changed: boolean;
    set: string[];
    again: string[];
    unset: string[];
    section?: string;
    mode?: TextMode;
    followers: string[];
    followersWhy: string;
    notes: string[];
}

/** What write with layer is given, beside the fields. */
interface LayerInput
{
    name: string;
    type?: string;
    text?: string;
    section?: string;
    append?: boolean;
    secret?: boolean;
    why?: string;
    copy?: string;
}

/**
 * Writes the campaign's layer over a page of its game system (SYS-11): refused on a page of the campaign, a copy, a new type, and while copies of the page are in the
 * open scene (INH-10). One hidden line in the log; a public one for each counter of the player's party that changes with it (INH-11).
 */
export function writeCampaignLayer(
    root: string,
    context: Context,
    world: World,
    open: ReturnType<typeof readOpenScene>,
    input: LayerInput,
    fields: FieldChange,
    coins: Coin[] | undefined,
): LayerResult
{
    if (input.copy !== undefined) {
        throw new Error(`${input.copy} is a copy in the open scene: a layer changes a page of the game system for the whole campaign. Write the copy without layer. Nothing changed.`);
    }

    const page = findPage(world, input.name);

    if (page === undefined) {
        throw new Error(`There is no page named ${input.name}: a layer changes a page of the game system that exists, by its name. Nothing changed.`);
    }

    if (page.system === undefined) {
        throw new Error(`${page.name} is a page of the campaign: write it without layer, which is only for a page of the game system, to change it for the whole campaign. Nothing changed.`);
    }

    if (input.type !== undefined) {
        throw new Error(`A layer changes neither the type nor the name of ${page.name}, ${page.type ?? "a page"} of the system ${page.system}: leave type out. Nothing changed.`);
    }

    checkLayerFieldWrite(world, campaignSystem(root, context), open, page, fields);
    const written = writeLayer(world, page, { ...fields, text: input.text, section: input.section, append: input.append, secret: input.secret });
    const mode = textMode(input);
    const result = { page: page.name, type: page.type, path: written.path, section: input.section, mode, set: written.set, again: written.again.map((field) => `${field} again as the system's`), unset: written.unset };

    if (!written.changed) {
        return { ...result, changed: false, followers: [], followersWhy: "", notes: [] };
    }

    appendLogEntry(root, newDatedLogEntry(root, context, "page-updated", "hidden", { page: page.name, layer: written.path, ...fields, section: input.section, text: input.text, mode, why: input.why }));
    const now = campaignWorld(root, context);
    const after = findPage(now, page.name) ?? page;
    const followers = followersOfWrite(now, page, after);
    logCounterChanges(root, context, world, now, followers.pages.map((follower): [Page, Page] => [pageWithPath(world, follower.path) ?? follower, follower]), coins);
    const note = written.removed
        ? `The campaign's layer over ${page.name} is empty now, and its file is gone: ${page.name} reads as the system ${page.system} writes it again.`
        : `${page.name} stays ${systemLabel(page)}, with the campaign's layer ${written.path} over it: show ${page.name} says what it changes.`;
    return { ...result, changed: true, followers: followers.pages.map((follower) => follower.name), followersWhy: followers.why, notes: [note] };
}

/** How a write writes its text: added at the end, in place of the old text, or, empty for a section, removing it. */
function textMode(input: LayerInput): TextMode | undefined
{
    if (input.text === undefined) {
        return undefined;
    }

    return input.append === true ? "append" : input.section !== undefined && input.text.trim() === "" ? "remove" : "replace";
}
