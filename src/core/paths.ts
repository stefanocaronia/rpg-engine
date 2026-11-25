// Paths of this computer compared as the system compares them: the same folder however it is written.
import { resolve } from "node:path";

/** A path as the same file, however it is written: in any case on Windows, where a path is the same in any case. */
export function pathKey(path: string): string
{
    return process.platform === "win32" ? resolve(path).toLowerCase() : resolve(path);
}

/** Whether two paths are the same, however written: in any case on Windows. */
export function samePath(one: string, other: string): boolean
{
    return pathKey(one) === pathKey(other);
}
