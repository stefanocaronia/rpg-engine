import { join } from "node:path";
import { z } from "zod";
import { requireCampaign } from "../campaign/index.ts";
import { appendLogEntry } from "../core/log.ts";
import { defineCommand } from "../core/registry.ts";
import { files } from "../core/store.ts";
import { comparableText } from "../core/text.ts";
import { pageNamed, renamedLinks, renamePage, writePage } from "../pages/index.ts";
import { readOpenScene, updateScene } from "./game-scene.ts";
import { newDatedLogEntry } from "./game-time.ts";
import { campaignWorld } from "./game-world.ts";

interface RenameResult
{
    from: string;
    to: string;
    path: string;
    /** How many links now name it, and in which pages. */
    links: number;
    pages: string[];
}

export const rename = defineCommand({
    name: "rename",
    description: "Give a page of the campaign a new name, as when the player names their wolf or the character learns a place's true name (D-417). "
        + "Its file moves, and every link to it in the campaign's pages follows, with its section and its words, as does the open scene; "
        + "the old name stays among its aliases, so that the log and the player's notes, which keep it as it was, still find the page. "
        + "Example: page Lupa, to Neve.",
    group: "game",
    positionals: ["page", "to"],
    input: z.object({
        page: z.string().describe("the page to rename"),
        to: z.string().describe("its new name"),
    }),

    run(input, context): RenameResult
    {
        const root = requireCampaign(context.folder);
        const world = campaignWorld(root, context);
        const page = pageNamed(world, input.page);
        const to = input.to.trim().normalize("NFC");

        if (page === undefined) {
            throw new Error(`There is no page ${input.page}: look for its name with find. Nothing changed.`);
        }

        if (to === page.name) {
            throw new Error(`${page.name} is already its name. Nothing changed.`);
        }

        const { scene } = readOpenScene(root);
        const copy = Object.keys(scene?.copies ?? {}).find((name) => comparableText(name) === comparableText(to));

        if (copy !== undefined) {
            throw new Error(`${copy} is a copy in the open scene: give ${page.name} another name, or close the scene first. Nothing changed.`);
        }

        const from = page.name;
        const renamed = renamePage(world, page, to);
        renameInState(root, from, to);

        // The old name stays among its aliases, but for a change of case alone.
        if (comparableText(from) !== comparableText(to)) {
            writePage(campaignWorld(root, context), to, undefined, { add: { aliases: [from] } });
        }

        appendLogEntry(root, newDatedLogEntry(root, context, "page-renamed", "public", { from, to, path: renamed.path }));
        return { from, to, ...renamed };
    },

    format(result)
    {
        const links = result.pages.length === 0 ? "" : ` Links renamed in ${result.pages.join(", ")}.`;
        return `Renamed ${result.from} to ${result.to} (${result.path}).${links} ${result.from} stays among its aliases, so that what keeps the old name still finds it.`;
    },
});

/** The present follows the new name: its links, and the open scene's names, as its order, its turn and who is hostile (D-415, D-416). */
function renameInState(root: string, from: string, to: string): void
{
    const path = join(root, "state.yaml");
    const text = files().fresh(path);

    if (text !== undefined) {
        const { renamed, count } = renamedLinks(text, from, to);

        if (count > 0) {
            files().write(path, renamed);
        }
    }

    const { scene } = readOpenScene(root);

    if (scene === undefined) {
        return;
    }

    const named = (name: string): string => (comparableText(name) === comparableText(from) ? to : name);
    const list = (names: string[] | undefined): string[] | undefined => names?.map(named);
    const changes: [string[], unknown][] = [];

    for (const [key, names] of [["order", scene.order], ["left", scene.left], ["hostile", scene.hostile]] as const) {
        if (names !== undefined && names.some((name) => named(name) !== name)) {
            changes.push([[key], list(names)]);
        }
    }

    if (scene.turn !== undefined && named(scene.turn) !== scene.turn) {
        changes.push([["turn"], to]);
    }

    if (scene.seen !== undefined && Object.keys(scene.seen).some((name) => named(name) !== name)) {
        changes.push([["seen"], Object.fromEntries(Object.entries(scene.seen).map(([name, said]) => [named(name), said]))]);
    }

    if (scene.moved !== undefined && named(scene.moved.turn) !== scene.moved.turn) {
        changes.push([["moved", "turn"], to]);
    }

    if (changes.length > 0) {
        updateScene(root, changes);
    }
}
