// The open scene as several commands use it: read from state.yaml, written back, and checked against the world.
import { z } from "zod";
import { changeStateAt, readStateValues } from "../campaign/index.ts";
import { readLog } from "../core/log.ts";
import type { Problem } from "../core/problem.ts";
import { findPage, isEmptyField, parsePageReference, type World } from "../pages/index.ts";
import { readScene, type Scene, type SceneCopy } from "../scene/index.ts";

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

/** A copy's counters: all its fields but the creature it copies. */
export function copyCounters(copy: SceneCopy): Record<string, unknown>
{
    return Object.fromEntries(Object.entries(copy).filter(([field]) => field !== "creature"));
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

    const links = [scene.place, ...scene.with, ...Object.values(scene.copies).map((copy) => copy.creature)].filter((link) => link !== undefined);
    const missing = links.filter((link) => findPage(world, parsePageReference(link).name) === undefined).map((link) => ({
        path: "state.yaml",
        message: `The open scene links to ${link}, which does not exist.`,
        fix: "create that page, or close the scene and open it again",
    }));
    const clashes = Object.keys(scene.copies).filter((name) => findPage(world, name) !== undefined).map((name) => ({
        path: "state.yaml",
        message: `${name} is both a copy in the open scene and a page, so change cannot tell which one is meant.`,
        fix: "close the scene, which removes the copy, or rename the page",
    }));
    return [...missing, ...clashes];
}
