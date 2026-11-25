// The paths a tool that reads asks for, held to the campaign's folder: the master reads its campaign, nothing else on the player's computer.
import { isAbsolute, resolve, sep } from "node:path";
import { isObject } from "./protocol.ts";

/** The first path a tool of kind read asks for outside `folder`, as the host gave it; undefined where every path given is inside. */
export function pathOutside(tool: string, input: unknown, folder: string): string | undefined
{
    const given = isObject(input) ? input : {};
    // Read's file is required; Glob's and Grep's path is the folder where none is given.
    const paths = tool === "Read" ? [given.file_path] : given.path === undefined ? [] : [given.path];
    // A path missing where one is needed, or not text, is refused as one outside.
    const outside = paths.filter((path) => typeof path !== "string" || !inside(path, folder));

    if (outside.length > 0) {
        return String(outside[0]);
    }

    return tool === "Glob" && !staysInside(given.pattern) ? String(given.pattern) : undefined;
}

/** Whether Glob's pattern stays in the path it is read from: neither absolute nor climbing out of it. */
function staysInside(pattern: unknown): boolean
{
    return typeof pattern === "string" && !isAbsolute(pattern) && !/^([a-zA-Z]:|[\\/~])/.test(pattern) && !pattern.split(/[\\/]/).includes("..");
}

/** Whether a path, a relative one from the folder, is the folder or within it; on Windows whatever the case of its letters. A path from the home (~) never is. */
function inside(path: string, folder: string): boolean
{
    if (path.startsWith("~")) {
        return false;
    }

    const fold = (text: string): string => (process.platform === "win32" ? text.toLowerCase() : text);
    const base = fold(resolve(folder));
    const target = fold(resolve(base, path));
    return target === base || target.startsWith(base.endsWith(sep) ? base : `${base}${sep}`);
}
