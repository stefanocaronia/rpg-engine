import { join } from "node:path";
import { parseDocument } from "yaml";
import { z } from "zod";
import { requireCampaign } from "../campaign/index.ts";
import { appendLogEntry } from "../core/log.ts";
import { defineCommand } from "../core/registry.ts";
import { files } from "../core/store.ts";
import { comparableText } from "../core/text.ts";
import { applyRename, type Page, pageNamed, pageWithPath, planRename, renamedLinks, type World } from "../pages/index.ts";
import { readOpenScene, updateScene } from "./shared/scene.ts";
import { newDatedLogEntry } from "./shared/time.ts";
import { campaignWorld } from "./shared/world.ts";

interface RenameResult
{
    from: string;
    to: string;
    path: string;
    /** How many links now name it, and in which pages. */
    links: number;
    pages: string[];
    /** The other page that keeps the old name, whose links are left as they are. */
    kept?: string;
}

export const rename = defineCommand({
    name: "rename",
    description: "Give a page of the campaign a new name, as when the player names their wolf or the character learns a place's true name. "
        + "Every link to it follows, in the pages and the open scene; the old name stays among its aliases. "
        + "Of two pages with the same name, give the one to rename by its path, as validate shows it: the links to that name stay with the other. "
        + "Example: page Lupa, to Neve.",
    group: "game",
    positionals: ["page", "to"],
    input: z.object({
        page: z.string().describe("the page to rename: its name, or its path, as world/characters/Varro.md"),
        to: z.string().describe("its new name"),
    }),

    run(input, context): RenameResult
    {
        const root = requireCampaign(context.folder);
        const world = campaignWorld(root, context);
        const page = pageAtPath(world, input.page) ?? pageNamed(world, input.page);
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
        // Everything is checked before anything is written: the open scene first, then the page's new file, the links, and the old file last.
        const plan = planRename(world, page, to);

        if (plan.kept === undefined) {
            renameInState(root, from, to);
        }

        try {
            applyRename(plan);
        } catch (error) {
            const reason = error instanceof Error ? error.message : String(error);
            throw new Error(`${from} was renamed only in part (${reason}). Fix what stopped it, such as a file read-only or open in another program, then call rename ${from} ${to} again to finish.`);
        }

        appendLogEntry(root, newDatedLogEntry(root, context, "page-renamed", "public", { from, to, path: plan.path }));
        return { from, to, path: plan.path, links: plan.links, pages: plan.pages, ...(plan.kept === undefined ? {} : { kept: plan.kept }) };
    },

    format(result)
    {
        const links = result.pages.length === 0 ? "" : ` Links renamed in ${result.pages.join(", ")}.`;
        const alias = comparableText(result.from) === comparableText(result.to) ? "" : ` ${result.from} stays among its aliases, so that what keeps the old name still finds it.`;
        const kept = result.kept === undefined
            ? ""
            : ` The links to ${result.from}, in the pages and in the open scene, stay as they are and lead to ${result.kept}, which keeps that name: write [[${result.to}]] by hand in those meant for this page.`;
        return `Renamed ${result.from} to ${result.to} (${result.path}).${links}${alias}${kept}`;
    },
});

/** The page at a path of the campaign, as world/characters/Varro.md, with or without .md; undefined for a name. */
function pageAtPath(world: World, given: string): Page | undefined
{
    const path = given.trim().split("\\").join("/").replace(/^\.\//, "");

    if (!path.includes("/")) {
        return undefined;
    }

    const page = pageWithPath(world, path.toLowerCase().endsWith(".md") ? path : `${path}.md`);

    if (page === undefined) {
        throw new Error(`There is no page at ${given}: give the path as validate shows it, such as world/characters/Varro.md, or the page's name. Nothing changed.`);
    }

    return page;
}

/**
 * The present follows the new name: its links, and the open scene's names, as its order, its turn and who is hostile (D-415, D-416). Refused, changing
 * nothing, when the links renamed would leave state.yaml unreadable.
 */
function renameInState(root: string, from: string, to: string): void
{
    const path = join(root, "state.yaml");
    const text = files().fresh(path);
    const { renamed, count } = renamedLinks(text ?? "", from, to);

    if (count > 0 && parseDocument(text ?? "").errors.length === 0 && parseDocument(renamed).errors.length > 0) {
        throw new Error(
            `Renaming ${from} to ${to} would leave state.yaml unreadable, as a ' in a link written between '…' quotes: choose a name without ', or rewrite that line of state.yaml by hand between "…" quotes, then rename again. Nothing changed.`,
        );
    }

    if (count > 0) {
        files().write(path, renamed);
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

    if (scene.used !== undefined && Object.keys(scene.used).some((name) => named(name) !== name)) {
        changes.push([["used"], Object.fromEntries(Object.entries(scene.used).map(([name, used]) => [named(name), used]))]);
    }

    if (scene.moved !== undefined && named(scene.moved.turn) !== scene.moved.turn) {
        changes.push([["moved", "turn"], to]);
    }

    if (changes.length > 0) {
        updateScene(root, changes);
    }
}
