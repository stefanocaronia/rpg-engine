// The saves and what the mode allows
import type { Context } from "../../core/context.ts";
import { readLog } from "../../core/log.ts";
import { locate, pagesWithNameOrAlias, type World } from "../../pages/index.ts";
import { shownImage } from "../shared/campaign/images.ts";
import { campaignSaves, loadRefusal, loadRule, mayGoBack, resetPoints, resetSave, saveMode, savesWhy, wentBackTo } from "../shared/campaign/saves.ts";
import { campaignWorld } from "../shared/campaign/world.ts";
import type { ShownSave, ViewResult } from "./result.ts";

/** The saves, newest first, each with whether the mode lets the player go back to it; whether they may make one, and the points they may start over from (D-359). */
export function shownSaves(root: string, context: Context): Extract<ViewResult, { kind: "saves"; }>
{
    const mode = saveMode(root);
    const saves = campaignSaves(root);
    const why = savesWhy(root);
    const points = new Map(resetPoints.flatMap((point) => {
        const save = resetSave(saves, why, point);
        return save === undefined ? [] : [[save.number, point] as const];
    }));
    const world = campaignWorld(root, context);
    const dead = mayGoBack(root, world);
    const made = new Map(readLog(root).filter((entry) => entry.type === "saved").map((entry) => [Number((entry.data as { save?: unknown; }).save), entry]));

    const madeOf = (number: number): Partial<ShownSave> => {
        const entry = made.get(number);
        const { label, place } = (entry?.data ?? {}) as { label?: unknown; place?: unknown; };
        return {
            ...(typeof label === "string" ? { name: label } : {}),
            ...(entry?.date === undefined ? {} : { date: entry.date }),
            ...(entry === undefined ? {} : { at: entry.at }),
            ...(typeof place === "string" ? savedPlace(root, context, world, place) : {}),
        };
    };

    return {
        kind: "saves",
        mode,
        rule: loadRule(mode),
        saves: saves.map((save) => ({
            number: save.number,
            label: save.label,
            ...madeOf(save.number),
            ...(points.has(save.number) ? { point: points.get(save.number) } : {}),
            load: !points.has(save.number) && loadRefusal(mode, saves, save, dead) === undefined,
        })).toReversed(),
        make: mode === "free",
        reset: resetPoints.filter((point) => [...points.values()].includes(point)),
        // Until the player confirms a new chat with the master (D-362).
        ...(wentBackTo(root) === undefined ? {} : { wentBack: wentBackTo(root) }),
    };
}

/** The place a save was made in, with its picture, else that of the nearest place that holds it, as a room of the inn shows the inn. */
function savedPlace(root: string, context: Context, world: World, name: string): { place: string; kind?: string; picture?: { file: string; version: number; }; }
{
    const page = pagesWithNameOrAlias(world, name)[0];
    const kind = page?.fields.kind;
    const picture = page === undefined
        ? undefined
        : [page, ...locate(world, page).chain].map((holder) => shownImage(root, context, world, holder)).find((image) => image !== undefined);
    return { place: name, ...(typeof kind === "string" ? { kind } : {}), ...(picture === undefined ? {} : { picture }) };
}
