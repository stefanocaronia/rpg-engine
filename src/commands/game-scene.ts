// The open scene as several commands use it: read from state.yaml, written back, and checked against the world.
import { z } from "zod";
import { changeStateAt, readStateValues } from "../campaign/index.ts";
import { readLog } from "../core/log.ts";
import type { Problem } from "../core/problem.ts";
import { comparableText, sameName } from "../core/text.ts";
import { baseChain, isEmptyField, type Page, parsePageReference, type World } from "../pages/index.ts";
import { readScene, type Scene, type SceneCopy } from "../scene/index.ts";
import { countersText, pageCounters } from "./page-counters.ts";

/** A scene that has been closed, as the log keeps it. */
export interface ClosedScene
{
    title: string;
    type: string;
    summary: string;
}

const closedSceneSchema = z.looseObject({ title: z.string(), type: z.string(), summary: z.string() });

/** The open scene, or the problem that keeps state.yaml from giving it; neither when no scene is open. */
export function readOpenScene(root: string): { scene?: Scene; problem?: Problem; }
{
    let value: unknown;

    try {
        value = rawScene(root);
    } catch (error) {
        return { problem: { message: error instanceof Error ? error.message : String(error), fix: "fix state.yaml by hand" } };
    }

    if (isEmptyField(value)) {
        return {};
    }

    try {
        return { scene: readScene(value) };
    } catch (error) {
        const message = `The open scene in state.yaml is not valid: ${error instanceof Error ? error.message : String(error)}`;
        return { problem: { path: "state.yaml", message, fix: "close it with scene close and a summary, then open it again" } };
    }
}

/** The open scene; undefined when there is none. A scene that cannot be read stops the command, with how to fix it. */
export function openScene(root: string): Scene | undefined
{
    const { scene, problem } = readOpenScene(root);

    if (problem !== undefined) {
        throw new Error(`${problem.message} To fix it, ${problem.fix}.`);
    }

    return scene;
}

/** The scene as state.yaml holds it, unchecked: what is left of a scene that cannot be read. */
export function rawScene(root: string): unknown
{
    return readStateValues(root).scene;
}

/** What a copy changed: all its fields but the creature it copies (D-110). */
export function copyChanges(copy: SceneCopy): Record<string, unknown>
{
    return Object.fromEntries(Object.entries(copy).filter(([field]) => field !== "creature"));
}

/** A copy seen as a page that derives from its creature (INH-14): what it changed are its fields, the scene is where it is written. */
export function copyPage(name: string, copy: SceneCopy): Page
{
    return { name, type: "creature", path: "state.yaml", fields: { creature: copyLink(copy), ...copyChanges(copy) }, body: "" };
}

/** The creature a copy copies, as a link: one written by hand without brackets is a link all the same. */
export function copyLink(copy: SceneCopy): string
{
    return `[[${parsePageReference(copy.creature).name}]]`;
}

/** A copy's counters as the outputs show them (INH-12): what it changed, and the current/max ones it reads from its creature. */
export function copyCounters(world: World, copy: SceneCopy): Record<string, unknown>
{
    return pageCounters(world, copyPage("copy", copy));
}

/** The copy in the open scene that `name` names, ignoring case; undefined when none does. A page with the same name leaves unclear which one is meant: refused. */
export function copyName(world: World, scene: Scene | undefined, name: string): string | undefined
{
    const copy = scene === undefined ? undefined : sameName(Object.keys(scene.copies), name);

    if (copy !== undefined && world.pages.some((page) => comparableText(page.name) === comparableText(copy))) {
        throw new Error(`${copy} is both a copy in the open scene and a page, so it is not clear which one is meant. Close the scene, which removes the copy, or rename the page. Nothing changed.`);
    }

    return copy;
}

/**
 * A creature whose copies are in the open scene, directly or through a variant, gives them what they do not change: what is meant for a copy must not land on it (INH-10, INH-11).
 * A scene that cannot be read may hold copies of any creature.
 */
export function checkNotCopied(world: World, open: { scene?: Scene; problem?: Problem; }, page: Page): void
{
    if (open.problem !== undefined && page.type === "creature") {
        throw new Error(`${page.name} is a creature, and the open scene, which may hold its copies, cannot be read: ${open.problem.message} To fix it, ${open.problem.fix}. Nothing changed.`);
    }

    const copies = open.scene === undefined ? [] : copiesReadingFrom(world, open.scene, page);

    if (copies.length > 0) {
        throw new Error(`${page.name} has copies in the open scene, which read from it what they do not change: ${copies.join(", ")}. Change a copy; to change ${page.name} for all, close the scene first. Nothing changed.`);
    }
}

/** The copies in the scene that read from a page, directly or through a variant, with their counters: "Annegato 1 (hp 22/22)". */
export function copiesReadingFrom(world: World, scene: Scene, page: Page): string[]
{
    return Object.entries(scene.copies).filter(([name, copy]) => baseChain(world, copyPage(name, copy)).includes(page)).map(([name, copy]) => {
        const counters = countersText(copyCounters(world, copy));
        return counters === "" ? name : `${name} (${counters})`;
    });
}

/** Writes a whole new scene into state.yaml, or, undefined, removes it when the scene closes. */
export function saveScene(root: string, scene: Scene | undefined): void
{
    changeStateAt(root, [[["scene"], scene]]);
}

/** Changes values inside the open scene, each at its path, such as ["copies", "Annegato 1", "hp"]; the rest of the scene stays as it is. */
export function updateScene(root: string, changes: [string[], unknown][]): void
{
    changeStateAt(root, changes.map(([path, value]) => [["scene", ...path], value]));
}

/** The scenes closed so far, newest first, from the log; lines written wrongly by hand are left out. */
export function closedScenes(root: string): ClosedScene[]
{
    return readLog(root).filter((entry) => entry.type === "scene-closed").flatMap((entry) => {
        const parsed = closedSceneSchema.safeParse(entry.data);
        return parsed.success ? [parsed.data] : [];
    }).reverse();
}

/** The problems of the open scene: a scene that cannot be read, links to pages that do not exist, copies named like pages. A state.yaml that cannot be read at all is reported with the game date. */
export function sceneProblems(root: string, world: World): Problem[]
{
    try {
        readStateValues(root);
    } catch {
        return [];
    }

    const { scene, problem } = readOpenScene(root);

    if (problem !== undefined) {
        return [problem];
    }

    if (scene === undefined) {
        return [];
    }

    const exists = (name: string): boolean => world.pages.some((page) => comparableText(page.name) === comparableText(name));
    const links = [scene.place, ...scene.with, ...Object.values(scene.copies).map((copy) => copy.creature)].filter((link) => link !== undefined);
    const missing = links.filter((link) => !exists(parsePageReference(link).name)).map((link) => ({
        path: "state.yaml",
        message: `The open scene links to ${link}, which does not exist.`,
        fix: "create that page, or close the scene and open it again",
    }));
    const clashes = Object.keys(scene.copies).filter(exists).map((name) => ({
        path: "state.yaml",
        message: `${name} is both a copy in the open scene and a page, so change cannot tell which one is meant.`,
        fix: "close the scene, which removes the copy, or rename the page",
    }));
    return [...missing, ...clashes];
}
