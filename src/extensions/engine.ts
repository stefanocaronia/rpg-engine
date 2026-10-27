// rpg-engine itself on npm (D-515 (3)): its latest version, how this one is installed, and its update with npm, globally as it was installed; a development
// link, or any other install, is told and never touched.
import { lstatSync, readFileSync, realpathSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import type { EngineInstall, EngineUpdater } from "../core/context.ts";
import { npmError, npmErrorCode, type NpmRun, runNpm } from "./packages.ts";

const registry = "https://registry.npmjs.org";

/** rpg-engine on npm, for the engine in this folder, from src/ and dist/ alike its package's own; `run` runs npm, a fake in tests. */
export function npmEngine(folder = fileURLToPath(new URL("../../", import.meta.url)), run: (args: string) => Promise<NpmRun> = runNpm): EngineUpdater
{
    return {
        latest: async () => {
            try {
                const answer = await fetch(`${registry}/rpg-engine/latest`, { headers: { accept: "application/json" }, signal: AbortSignal.timeout(20_000) });
                const read = answer.ok ? (await answer.json() as { version?: unknown; }) : undefined;
                return typeof read?.version === "string" ? { version: read.version } : { failed: `npm's registry answered ${answer.status} ${answer.statusText}` };
            } catch (error) {
                return { failed: `npm's registry could not be reached: ${error instanceof Error ? error.message : String(error)}` };
            }
        },
        installed: async () => engineInstall(folder, await run("root -g")),
        onDisk: () => {
            try {
                return (JSON.parse(readFileSync(join(folder, "package.json"), "utf8")) as { version?: string; }).version ?? "0.0.0";
            } catch {
                return "0.0.0";
            }
        },
        update: async (version) => {
            if (!/^\d+\.\d+\.\d+$/.test(version)) {
                return `${version} is not a version of rpg-engine`;
            }

            const ran = await run(`install -g rpg-engine@${version} --no-audit --no-fund --json --loglevel=error`);
            return ran.code === 0 ? undefined : updateProblem(ran);
        },
    };
}

/** How the engine in this folder is installed, by npm's global folder: the package there, a link to this folder, or neither. */
function engineInstall(folder: string, root: NpmRun): EngineInstall
{
    const own = realFolder(folder);

    if (root.code !== 0 || own === undefined) {
        return { how: "other", folder: own ?? folder };
    }

    const global = join(root.out.trim(), "rpg-engine");

    try {
        const linked = lstatSync(global).isSymbolicLink();
        return realFolder(global) !== own ? { how: "other", folder: own } : linked ? { how: "link", folder: own } : { how: "global" };
    } catch {
        return { how: "other", folder: own };
    }
}

/** A folder as the file system resolves it, through links; undefined when it is not there. */
function realFolder(folder: string): string | undefined
{
    try {
        return realpathSync(folder);
    } catch {
        return undefined;
    }
}

/** Why npm did not update rpg-engine, with what the player can do. */
function updateProblem(ran: NpmRun): string
{
    const code = npmErrorCode(ran);

    // On Windows a file another program holds is refused as EPERM.
    if (code === "EBUSY" || (code === "EPERM" && process.platform === "win32")) {
        return "a file of rpg-engine is in use by another program: close the other chats with RPG Engine, then update it again";
    }

    if (code === "EACCES" || code === "EPERM") {
        return `npm may not write its global folder (${code}): update it in a terminal with npm install -g rpg-engine, as the computer's administrator if it asks`;
    }

    return `npm said: ${npmError(ran)}`;
}
