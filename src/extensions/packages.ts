import { spawn, spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { isAbsolute, join, resolve } from "node:path";
import type { PackageInfo, PackageManager } from "../core/context.ts";

/** The keyword of the packages for rpg-engine on npm, by which they are found (D-439). */
export const packageKeyword = "rpg-engine-package";

/** The npm scope of the packages we publish, the verified ones (D-428, D-441). */
export const verifiedScope = "@rpgengine/";

const registry = "https://registry.npmjs.org";

// An npm name with a version or a tag, or nothing a shell would read otherwise: the master writes it, and npm runs in a shell.
const npmSpec = /^(@[a-z0-9][a-z0-9._-]*\/)?[a-z0-9][a-z0-9._-]*(@[0-9A-Za-z.+-]+)?$/;
const installWait = 5 * 60 * 1000;

/** npm on this computer, installing in this folder (D-436): never globally, never running a package's scripts. Its registry is read directly. */
export function npmPackages(folder: string): PackageManager
{
    return {
        describe: async (spec) => (isFolderSpec(spec) ? folderPackage(spec) : await registryPackage(spec)),
        install: async (spec) => {
            const what = isFolderSpec(spec) ? quotedFolder(spec) : checkedSpec(spec);
            const ran = await npm(`install --prefix ${quotedFolder(folder)} ${what} --ignore-scripts --save-exact --no-audit --no-fund --json --loglevel=error`);
            return ran.code === 0 ? undefined : `npm said: ${npmError(ran)}`;
        },
        uninstall: async (name) => {
            const ran = await npm(`uninstall --prefix ${quotedFolder(folder)} ${checkedSpec(name)} --ignore-scripts --no-audit --no-fund --json --loglevel=error`);
            return ran.code === 0 ? undefined : `npm said: ${npmError(ran)}`;
        },
        search: async () => {
            try {
                const found = await json(`${registry}/-/v1/search?text=keywords:${packageKeyword}&size=250`) as { objects?: { package: Manifest; }[]; } | undefined;
                // The keyword is only a hint: each package's latest package.json must say what it is for rpg-engine.
                const described = await Promise.all((found?.objects ?? []).map(async ({ package: listed }) => {
                    const read = await registryPackage(listed.name ?? "");
                    // Who wrote it, as its package.json says; never who published it, which may be a workflow.
                    const author = authorOf(listed);
                    return "failed" in read || read.author !== undefined || author === undefined ? read : { ...read, author };
                }));
                return described.filter((one): one is PackageInfo => !("failed" in one) && one.kind !== undefined);
            } catch (error) {
                return { failed: `npm's registry could not be reached: ${error instanceof Error ? error.message : String(error)}` };
            }
        },
    };
}

/** Whether a package is given by its folder on this computer rather than by its name on npm. */
export function isFolderSpec(spec: string): boolean
{
    return spec.startsWith(".") || isAbsolute(spec);
}

/** Whether an installed package is ours, verified: in our scope and installed from npm, never from a folder, which anyone can name so (D-428, D-441). */
export function isVerified(name: string, linked: boolean): boolean
{
    return name.startsWith(verifiedScope) && !linked;
}

/** What npm's registry says of a package, at a version or its latest, with what its package.json says for rpg-engine. */
async function registryPackage(spec: string): Promise<PackageInfo | { failed: string; missing?: true; }>
{
    const checked = checkedSpec(spec);
    const at = checked.lastIndexOf("@");
    const [name, version] = at > 0 ? [checked.slice(0, at), checked.slice(at + 1)] : [checked, "latest"];

    try {
        const read = await json(`${registry}/${name.replace("/", "%2f")}/${version}`) as Manifest | undefined;
        return read === undefined ? { failed: `npm has no package ${spec}`, missing: true } : infoOf(read);
    } catch (error) {
        return { failed: `npm's registry could not be reached: ${error instanceof Error ? error.message : String(error)}` };
    }
}

/** What a package's folder says of it, by its package.json. */
function folderPackage(spec: string): PackageInfo | { failed: string; }
{
    try {
        const read = JSON.parse(readFileSync(join(resolve(spec), "package.json"), "utf8")) as Manifest;
        return read.name === undefined || read.version === undefined ? { failed: `${spec} has a package.json without its name and version` } : infoOf(read);
    } catch {
        return { failed: `${spec} is not the folder of a package: it has no package.json that reads` };
    }
}

interface Manifest
{
    name?: string;
    version?: string;
    description?: string;
    // A string as package.json writes it, or a name as the registry gives it back.
    author?: string | { name?: string; };
    "rpg-engine"?: { kind?: unknown; api?: unknown; };
}

function infoOf(read: Manifest): PackageInfo
{
    const marker = read["rpg-engine"];
    return {
        name: read.name ?? "",
        version: read.version ?? "",
        ...(typeof marker?.kind === "string" ? { kind: marker.kind } : {}),
        ...(typeof marker?.api === "number" ? { api: marker.api } : {}),
        ...(read.description === undefined ? {} : { description: read.description }),
        ...(authorOf(read) === undefined ? {} : { author: authorOf(read) }),
    };
}

/** Who wrote a package, as its package.json or the registry gives it. */
function authorOf(read: Manifest): string | undefined
{
    return typeof read.author === "string" ? read.author : read.author?.name;
}

/** A JSON answer of the registry; undefined when it has none, 404. */
async function json(url: string): Promise<unknown>
{
    const answer = await fetch(url, { headers: { accept: "application/json" }, signal: AbortSignal.timeout(20_000) });

    if (answer.status === 404) {
        return undefined;
    }

    if (!answer.ok) {
        throw new Error(`${answer.status} ${answer.statusText}`);
    }

    return await answer.json() as unknown;
}

function checkedSpec(spec: string): string
{
    if (!npmSpec.test(spec)) {
        throw new Error(`"${spec}" is not the name of an npm package, with its version if wanted, such as @rpgengine/weather or @rpgengine/weather@0.1.0.`);
    }

    return spec;
}

/** A folder in quotes for the shell; one with characters a shell would read is refused. */
function quotedFolder(folder: string): string
{
    const path = resolve(folder);

    if (/["%$`!&]/.test(path)) {
        throw new Error(`The folder ${path} has characters npm cannot be given safely ("%$\`!&): move it to another path.`);
    }

    return `"${path}"`;
}

/** What npm said went wrong: its JSON error, with --json, else the last line it wrote that is not the pointer to its log. */
function npmError(ran: { out: string; errors: string; }): string
{
    try {
        const read = JSON.parse(ran.out) as { error?: { code?: string; summary?: string; }; };

        if (read.error?.summary !== undefined) {
            return `${read.error.code === undefined ? "" : `${read.error.code}, `}${read.error.summary}`;
        }
    } catch {
        // Not JSON: the lines it wrote say it.
    }

    const lines = ran.errors.split("\n").map((line) => line.trim()).filter((line) => line !== "" && !/complete log of this run/i.test(line));
    return lines.at(-1) ?? "nothing";
}

/** Runs npm with these arguments, in a folder of no campaign, stopped with all it started after a while. */
function npm(args: string): Promise<{ code: number | null; out: string; errors: string; }>
{
    return new Promise((done) => {
        const child = spawn(`npm ${args}`, { shell: true, windowsHide: true, cwd: tmpdir(), env: { ...process.env, NoDefaultCurrentDirectoryInExePath: "1" }, stdio: ["ignore", "pipe", "pipe"] });
        let [out, errors] = ["", ""];
        const timer = setTimeout(() => stopTree(child.pid), installWait);
        child.stdout.setEncoding("utf8").on("data", (chunk: string) => (out += chunk));
        child.stderr.setEncoding("utf8").on("data", (chunk: string) => (errors += chunk));
        child.on("error", (error) => (errors += error.message));
        child.on("close", (code) => {
            clearTimeout(timer);
            done({ code, out, errors });
        });
    });
}

/** Stops a process with the ones it started: on Windows the shell's child, npm, outlives a kill of the shell alone. */
function stopTree(pid: number | undefined): void
{
    if (pid === undefined) {
        return;
    }

    if (process.platform === "win32") {
        spawnSync("taskkill", ["/pid", String(pid), "/T", "/F"], { windowsHide: true });
    } else {
        process.kill(pid, "SIGKILL");
    }
}
