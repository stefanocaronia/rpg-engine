// The importer's soft fence in Antigravity (D-579 (1)): `rpg --fence <file>`, the hook the engine writes in agy's working folder, refuses a call outside the
// import's folder, so that the model hears why and goes on, where the settings would close the whole run. A file is read only in the folders to read and
// written only in those to write; the tools the fence names pass as they are; every other tool is refused, commands and the web among them. Its yes opens nothing the settings close: they stay the hard fence.
import { readFileSync } from "node:fs";
import { isAbsolute, relative, resolve, sep } from "node:path";

/** The folders a run may read and write, by their full paths, those to write read too; and the tools let through as they are, as the painter's image tool. */
export interface Fence
{
    read: string[];
    write: string[];
    tools?: string[];
}

/** Antigravity's answer to a tool call: refused, with what the model can do instead, or allowed, which the settings may still refuse. */
export type FenceDecision = { decision: "deny"; reason: string; } | { decision: "allow"; };

/** Reads the hook's input and answers it on its output, by the fence of `file`. */
export async function fenceHere(file: string): Promise<void>
{
    let input = "";

    for await (const chunk of process.stdin) {
        input += String(chunk);
    }

    process.stdout.write(JSON.stringify(fenceDecision(input, readFence(file))));
}

/** The fence in `file`; undefined where it does not read, which lets nothing through. */
export function readFence(file: string): Fence | undefined
{
    try {
        const fence = JSON.parse(readFileSync(file, "utf8")) as { read?: unknown; write?: unknown; tools?: unknown; };
        const names = (value: unknown): string[] | undefined => (Array.isArray(value) && value.every((one) => typeof one === "string") ? value : undefined);
        const read = names(fence.read);
        const write = names(fence.write);
        const tools = fence.tools === undefined ? [] : names(fence.tools);
        return read === undefined || write === undefined || tools === undefined ? undefined : { read, write, ...(tools.length === 0 ? {} : { tools }) };
    } catch {
        return undefined;
    }
}

/** The decision for a tool call, as Antigravity's hook gives it, by `fence`. */
export function fenceDecision(input: string, fence: Fence | undefined): FenceDecision
{
    if (fence === undefined) {
        return { decision: "deny", reason: "This run's fence does not read, so nothing can be done here: stop and say so." };
    }

    const { name, args, cwd } = hookCall(input);

    if (name !== undefined && fence.tools?.includes(name) === true) {
        return { decision: "allow" };
    }

    const refused: FenceDecision = {
        decision: "deny",
        reason: `Only reading in ${fence.read[0] ?? "the import's folder"} and writing in ${fence.write.join(", ") || "no folder"} is possible here, by full paths; no command and no web: go on without this.`,
    };
    // The file a tool names, by the argument that holds a path, whatever the tool calls it: Path, TargetFile, DirectoryPath.
    const given = Object.entries(args).find(([key, value]) => typeof value === "string" && /path|file|directory|dir/i.test(key))?.[1];

    if (name === undefined || typeof given !== "string" || !(readingTools.test(name) || writingTools.test(name))) {
        return refused;
    }

    const path = resolve(typeof cwd === "string" ? cwd : process.cwd(), given);
    const allowed = readingTools.test(name) ? [...fence.read, ...fence.write] : fence.write;
    return allowed.some((folder) => isInside(path, folder)) ? { decision: "allow" } : refused;
}

// Antigravity's tools that read a file or a folder, and those that write one, as the probe of 22 November met them; any other tool is refused.
const readingTools = /^(read_file|view_file|view_file_outline|list_dir|list_directory|find_by_name|grep_search|find|grep)$/;
const writingTools = /^(write_file|write_to_file|replace_file_content|multi_replace_file_content|edit_file)$/;

/** Whether `path` is `folder` or inside it, by path segments; on Windows without regard to case. */
export function isInside(path: string, folder: string): boolean
{
    const fold = (one: string): string => (process.platform === "win32" ? resolve(one).toLowerCase() : resolve(one));
    const between = relative(fold(folder), fold(path));
    return between === "" || (between !== ".." && !between.startsWith(`..${sep}`) && !isAbsolute(between));
}

function hookCall(input: string): { name?: string; args: Record<string, unknown>; cwd?: unknown; }
{
    try {
        const parsed = JSON.parse(input) as { toolCall?: { name?: unknown; args?: unknown; }; cwd?: unknown; } | null;
        const call = parsed?.toolCall;
        const args = call?.args !== null && typeof call?.args === "object" ? call.args as Record<string, unknown> : {};
        return { ...(typeof call?.name === "string" ? { name: call.name } : {}), args, cwd: parsed?.cwd };
    } catch {
        return { args: {} };
    }
}
