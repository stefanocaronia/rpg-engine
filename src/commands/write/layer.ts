// write with layer: the campaign's layer over a page of its game system (SYS-11), and the campaign pages that follow it
import type { Context } from "../../core/context.ts";
import { appendLogEntry } from "../../core/log.ts";
import type { Coin } from "../../money/index.ts";
import { type FieldChange, findPage, type Page, pageWithPath, removeLayer, systemLabel, type TextMode, type World, writeLayer } from "../../pages/index.ts";
import { campaignSystem, campaignWorld } from "../shared/campaign/world.ts";
import { checkNotCopied, type readOpenScene } from "../shared/scene/scene.ts";
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
    /** Take the whole layer off, in place of writing it. */
    reset?: boolean;
}

/** What write is given that reset never goes with: anything to write, which would be lost with the layer. */
type WrittenInput = Partial<Record<"type" | "set" | "unset" | "add" | "remove" | "text" | "append" | "secret" | "here", unknown>>;

/** reset takes the campaign's whole layer off a page, and nothing else (SYS-11): refused without layer, and with anything to write. */
export function checkReset(input: WrittenInput & { layer?: boolean; }, name: string, section: string | undefined): void
{
    if (input.layer !== true) {
        throw new Error("reset goes with layer: it takes the campaign's whole layer off a page of the game system, which reads as the system writes it again. Nothing changed.");
    }

    const given = (value: unknown): boolean => value !== undefined && value !== false && !(typeof value === "object" && value !== null && Object.keys(value).length === 0);
    const others = [...(["type", "set", "unset", "add", "remove", "text", "append", "secret", "here"] as const).filter((part) => given(input[part])), ...(section === undefined ? [] : ["section"])];

    if (others.length > 0) {
        throw new Error(
            `reset takes the campaign's whole layer off ${name}, and nothing else: leave out ${others.join(", ")}. To give back one field or one section, leave reset out: unset for a field, empty text for a section. Nothing changed.`,
        );
    }
}

/**
 * Writes the campaign's layer over a page of its game system (SYS-11), or with reset takes it off whole: refused on a page of the campaign, a copy, a new type, and
 * while copies of the page are in the open scene (INH-10). One hidden line in the log; a public one for each counter of the player's party that changes with it (INH-11).
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

    const reset = input.reset === true;

    // The copies read the fields the layer gives, never its text (INH-11).
    if (reset && (page.layer?.fields.length ?? 0) > 0) {
        checkNotCopied(world, open, page);
    } else if (!reset) {
        checkLayerFieldWrite(world, campaignSystem(root, context), open, page, fields);
    }

    const written = reset ? removeLayer(world, page) : writeLayer(world, page, { ...fields, text: input.text, section: input.section, append: input.append, secret: input.secret });
    const mode = textMode(input);
    const result = { page: page.name, type: page.type, path: written.path, section: input.section, mode, set: written.set, again: written.again.map((field) => `${field} again as the system's`), unset: written.unset };

    if (!written.changed) {
        return { ...result, changed: false, followers: [], followersWhy: "", notes: [] };
    }

    const data = reset ? { reset: true } : { ...fields, section: input.section, text: input.text, mode };
    appendLogEntry(root, newDatedLogEntry(root, context, "page-updated", "hidden", { page: page.name, layer: written.path, ...data, why: input.why }));
    const now = campaignWorld(root, context);
    const after = findPage(now, page.name) ?? page;
    const followers = followersOfWrite(now, page, after);
    logCounterChanges(root, context, world, now, followers.pages.map((follower): [Page, Page] => [pageWithPath(world, follower.path) ?? follower, follower]), coins);
    const note = written.removed
        ? `The campaign's layer over ${page.name} is ${reset ? "taken off" : "empty now"}, and its file is gone: ${page.name} reads as the system ${page.system} writes it again.`
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
