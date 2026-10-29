import { spawn, spawnSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, renameSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { isAbsolute, join, resolve } from "node:path";
import { ourScope } from "../core/consents.ts";
import type { PackageInfo, PackageManager } from "../core/context.ts";
import { packageApi, readsApi } from "../core/package-declarations.ts";
import { isNewerVersion } from "../core/version.ts";
import { isTarball, tarballText, unpackTarball } from "./tarball.ts";

/** The keyword of the packages for rpg-engine on npm, by which they are found (D-439). */
export const packageKeyword = "rpg-engine-package";

/** The npm scope of the packages we publish, the verified ones (D-428, D-441). */
export const verifiedScope = ourScope;

const registry = "https://registry.npmjs.org";
// Where the packages given as a .tgz are unpacked, in the packages' folder (D-452).
const localFolder = "local";

// An npm name with a version or a tag, or nothing a shell would read otherwise: the master writes it, and npm runs in a shell.
const npmSpec = /^(@[a-z0-9][a-z0-9._-]*\/)?[a-z0-9][a-z0-9._-]*(@[0-9A-Za-z.+-]+)?$/;
const installWait = 5 * 60 * 1000;
// An npm package's name alone, without a version: a .tgz's becomes the name of its folder.
const packageName = /^(@[a-z0-9][a-z0-9._-]*\/)?[a-z0-9][a-z0-9._-]*$/;
// A folder's copy installed as files, never as a link, which Node may not follow where the app keeps the player's data; npm's package.json still names it
// as file:, by which D-441 tells it from a package of npm's.
const installOptions = "--install-links=true --ignore-scripts --save-exact --no-audit --no-fund --json --loglevel=error";

/** What running npm gave: its exit code and what it wrote. */
export interface NpmRun
{
    code: number | null;
    out: string;
    errors: string;
}

/**
 * npm on this computer, installing in this folder (D-436): never globally, never running a package's scripts, always linking a folder (D-441 tells a package
 * from a folder by its link). Its registry is read directly; `run` runs npm, a fake in tests.
 */
export function npmPackages(folder: string, run: (args: string) => Promise<NpmRun> = runNpm): PackageManager
{
    // What each .tgz said of itself when it was described, before the player's yes: the file installed must still say the same.
    const described = new Map<string, string>();

    return {
        describe: async (spec) => {
            const read = isLocalSpec(spec) ? localPackage(spec) : await registryPackage(spec).then((found) => ("unreachable" in found ? cachedPackage(spec, run) : found));

            if (isLocalSpec(spec) && !("failed" in read)) {
                described.set(resolve(spec), `${read.name}@${read.version}`);
            }

            return read;
        },
        install: async (spec) => {
            // A file or a folder is copied, so that the yes holds for the code it held then, whatever the folder holds later (D-452, D-478).
            if (isLocalSpec(spec)) {
                return await installCopy(folder, spec, described.get(resolve(spec)), inTurn(run));
            }

            // What npm is given is checked before anything moves.
            const [prefix, checked] = [quotedFolder(folder), checkedSpec(spec)];
            // What npm installed of the same version goes aside first, as it would keep it whatever it holds now: the files are npm's (D-510).
            const named = spec.replace(/(?<=.)@[^@/]*$/, "");
            const aside = join(folder, "aside", ...named.split("/"));
            mkdirSync(join(aside, ".."), { recursive: true });

            // Without the registry, from what npm keeps of it on this computer (D-452).
            const install = async (): Promise<NpmRun> => {
                const ran = await inTurn(run)(`install --prefix ${prefix} ${checked} ${installOptions}`);
                return ran.code !== 0 && isUnreachable(ran) ? await inTurn(run)(`install --prefix ${prefix} ${checked} ${installOptions} --offline`) : ran;
            };

            const ran = await installedAside(join(folder, "node_modules", ...named.split("/")), aside, install);
            return ran.code === 0 ? undefined : npmErrorCode(ran) === "ENOTCACHED" ? offlineAdvice(named) : `npm said: ${npmError(ran)}`;
        },
        uninstall: async (name) => {
            const ran = await inTurn(run)(`uninstall --prefix ${quotedFolder(folder)} ${checkedSpec(name)} --ignore-scripts --no-audit --no-fund --json --loglevel=error`);

            if (ran.code !== 0) {
                return `npm said: ${npmError(ran)}`;
            }

            // What a .tgz was unpacked to goes with it, and its scope's folder when nothing else is left in it (D-452).
            rmSync(join(folder, localFolder, name), { recursive: true, force: true });
            const scope = join(folder, localFolder, name.split("/")[0]);

            if (name.includes("/") && existsSync(scope) && readdirSync(scope).length === 0) {
                rmSync(scope, { recursive: true, force: true });
            }

            return undefined;
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

/** Whether a text is an npm package's name alone, such as notes or @me/notes: never a path, nor a version. */
export function isPackageName(name: string): boolean
{
    return packageName.test(name);
}

/** Whether a package is given by its folder or its .tgz on this computer rather than by its name on npm (D-452): a .tgz by its file name alone too. */
export function isLocalSpec(spec: string): boolean
{
    return spec.startsWith(".") || isAbsolute(spec) || isTarball(spec);
}

/** Whether an installed package is ours, verified: in our scope and installed from npm, never from a folder, which anyone can name so (D-428, D-441). */
export function isVerified(name: string, linked: boolean): boolean
{
    return name.startsWith(verifiedScope) && !linked;
}

/**
 * Where a package takes reports of its problems, by its package.json: its `bugs` page, else the issues of its repository on GitHub; undefined when it says
 * neither, or not over https.
 */
export function issuesPage(manifest: { bugs?: unknown; repository?: unknown; }): string | undefined
{
    const bugs = httpsLink(typeof manifest.bugs === "string" ? manifest.bugs : fieldOf(manifest.bugs, "url"));

    if (bugs !== undefined) {
        return bugs;
    }

    const repository = typeof manifest.repository === "string" ? manifest.repository : fieldOf(manifest.repository, "url");
    const github = repository === undefined ? null : githubRepository.exec(repository.trim());
    return github === null ? undefined : `https://github.com/${github[1]}/${github[2]}/issues`;
}

// A repository on GitHub as package.json may write it: a git, https or ssh address, github:owner/name, or owner/name alone, which npm reads as GitHub's.
const githubRepository = /^(?:(?:git\+)?(?:https?|git|ssh):\/\/(?:[^@/]+@)?github\.com[/:]|git@github\.com:|github:)?([\w.-]+)\/([\w.-]+?)(?:\.git)?\/?(?:#.*)?$/i;

/** The code npm's JSON error gives, as ENOTCACHED; undefined when it wrote none. */
export function npmErrorCode(ran: NpmRun): string | undefined
{
    try {
        return (JSON.parse(ran.out) as { error?: { code?: string; }; }).error?.code;
    } catch {
        return undefined;
    }
}

/** What npm said went wrong: its JSON error, with --json, else the last line it wrote that is not the pointer to its log. */
export function npmError(ran: NpmRun): string
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
export function runNpm(args: string): Promise<NpmRun>
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

/** A field of an object read from JSON, when it is a string. */
function fieldOf(value: unknown, field: string): string | undefined
{
    const read = typeof value === "object" && value !== null ? (value as Record<string, unknown>)[field] : undefined;
    return typeof read === "string" ? read : undefined;
}

/** A link over https, as a page may open it; undefined for anything else. */
function httpsLink(text: string | undefined): string | undefined
{
    try {
        return text !== undefined && new URL(text).protocol === "https:" ? new URL(text).href : undefined;
    } catch {
        return undefined;
    }
}

/**
 * What npm says of a package when its registry does not answer here: by npm itself, which reaches it through the proxy it is told of, else from what it keeps
 * of it on this computer (D-452); with the two ways to have it when it has nothing.
 */
async function cachedPackage(spec: string, run: (args: string) => Promise<NpmRun>): Promise<PackageInfo | { failed: string; missing?: true; }>
{
    const online = await run(`view ${checkedSpec(spec)} --json --loglevel=error`);
    const ran = online.code !== 0 && isUnreachable(online) ? await run(`view ${checkedSpec(spec)} --json --offline --loglevel=error`) : online;

    if (ran.code !== 0) {
        const code = npmErrorCode(ran);
        return code === "E404" ? { failed: `npm has no package ${spec}`, missing: true } : { failed: code === "ENOTCACHED" || isUnreachable(ran) ? offlineAdvice(spec) : `npm said: ${npmError(ran)}` };
    }

    try {
        // A version range gives a list, its newest last.
        const read = JSON.parse(ran.out) as Manifest | Manifest[];
        const manifest = Array.isArray(read) ? read.at(-1) : read;
        return manifest?.name === undefined ? { failed: `npm has no package ${spec}`, missing: true } : infoOf(manifest);
    } catch {
        return { failed: `npm said of ${spec} what does not read: ${ran.out.slice(0, 200)}` };
    }
}

/** What to do when npm can reach neither its registry nor a copy of the package on this computer (D-452): connect once, or give it as a file or a folder. */
function offlineAdvice(spec: string): string
{
    const name = spec.replace(/(?<=.)@[^@/]*$/, "");
    const file = `${name.replace(/^@/, "").replace("/", "-")}-<version>.tgz`;
    return `npm cannot reach its registry from this computer, and has no copy of ${name} from before: connect the computer to the internet once and install it again, `
        + `or give the package as a .tgz file or a folder of this computer, such as package install D:/Downloads/${file}`;
}

// What npm says when it cannot reach its registry, by the codes of Node and of npm's fetch.
const unreachableCodes = new Set(["ECONNREFUSED", "ENOTFOUND", "EAI_AGAIN", "ETIMEDOUT", "ECONNRESET", "EHOSTUNREACH", "ENETUNREACH", "ENETDOWN", "ERR_SOCKET_TIMEOUT"]);

/** Whether npm failed because it could not reach its registry, rather than for what it was asked. */
function isUnreachable(ran: NpmRun): boolean
{
    return unreachableCodes.has(npmErrorCode(ran) ?? "") || /FetchError|network|ECONNREFUSED|ENOTFOUND|EAI_AGAIN|ETIMEDOUT/i.test(npmError(ran));
}

/** What npm's registry says of a package, at a version or its latest, with what its package.json says for rpg-engine; unreachable when it does not answer. */
async function registryPackage(spec: string): Promise<PackageInfo | { failed: string; missing?: true; } | { failed: string; unreachable: true; }>
{
    const checked = checkedSpec(spec);
    const at = checked.lastIndexOf("@");
    const [name, version] = at > 0 ? [checked.slice(0, at), checked.slice(at + 1)] : [checked, "latest"];

    try {
        const read = await json(`${registry}/${name.replace("/", "%2f")}/${version}`) as Manifest | undefined;

        if (read === undefined) {
            return { failed: `npm has no package ${spec}`, missing: true };
        }

        // Asked by its name alone, the newest version this engine reads, with the newer one and the engine it needs (D-515 (2)).
        const info = infoOf(read);
        return at > 0 || !madeForNewer(info) ? info : await readableVersion(name, info);
    } catch (error) {
        return { failed: `npm's registry could not be reached: ${error instanceof Error ? error.message : String(error)}`, unreachable: true };
    }
}

/** Whether a package is an extension or a game system made for a newer API than this engine reads (D-515). */
function madeForNewer(info: PackageInfo): boolean
{
    return (info.kind === "extension" || info.kind === "system") && info.api !== undefined && info.api > packageApi;
}

/**
 * The newest version of a package this engine reads, beside its latest, which needs a newer engine (D-515 (2)): with that one and the first rpg-engine on npm
 * that reads it. The latest alone when no version reads, which is then refused.
 */
async function readableVersion(name: string, latest: PackageInfo): Promise<PackageInfo>
{
    const all = await json(`${registry}/${name.replace("/", "%2f")}`) as { versions?: Record<string, Manifest>; } | undefined;
    const kind = latest.kind === "system" ? "system" : "extension";
    const readable = Object.values(all?.versions ?? {}).map(infoOf).filter((one) => !one.version.includes("-") && readsApi(one.api, kind));
    const newest = readable.reduce<PackageInfo | undefined>((best, one) => (best === undefined || isNewerVersion(one.version, best.version) ? one : best), undefined);
    const engine = await engineReading(latest.api ?? 0);
    const newer = { version: latest.version, ...(engine === undefined ? {} : { engine }) };
    return newest === undefined ? latest : { ...newest, newer };
}

/** The first version of rpg-engine on npm that reads a package made for this API, as its package.json says; undefined when none does yet, or npm does not say. */
async function engineReading(api: number): Promise<string | undefined>
{
    try {
        const all = await json(`${registry}/rpg-engine`) as { versions?: Record<string, Manifest>; } | undefined;
        const reads = (one: Manifest): boolean => typeof one["rpg-engine"]?.api === "number" && one["rpg-engine"].api >= api;
        const reading = Object.values(all?.versions ?? {}).filter((one) => typeof one.version === "string" && !one.version.includes("-") && reads(one));
        return reading.reduce<string | undefined>((first, one) => (first === undefined || isNewerVersion(first, one.version ?? "") ? one.version : first), undefined);
    } catch {
        return undefined;
    }
}

/** What a package's folder or .tgz says of it, by its package.json: a .tgz's name must be one npm takes, as it becomes a folder's. */
function localPackage(spec: string): PackageInfo | { failed: string; }
{
    const what = isTarball(spec) ? "the .tgz of a package" : "the folder of a package";

    if (!existsSync(spec)) {
        return { failed: `There is no ${isTarball(spec) ? "file" : "folder"} ${spec} on this computer (${resolve(spec)}): give its full path` };
    }

    let text: string | undefined;

    try {
        text = isTarball(spec) ? tarballText(spec, "package.json") : readFileSync(join(resolve(spec), "package.json"), "utf8");
    } catch (error) {
        // An archive refused whole says why; a folder without the file is simply not a package's.
        return { failed: isTarball(spec) && error instanceof Error ? error.message : `${spec} is not ${what}: it has no package.json that reads` };
    }

    let read: Manifest;

    try {
        read = JSON.parse(text ?? "") as Manifest;
    } catch {
        return { failed: `${spec} is not ${what}: it has no package.json that reads` };
    }

    if (read.name === undefined || read.version === undefined) {
        return { failed: `${spec} has a package.json without its name and version` };
    }

    return isTarball(spec) && !packageName.test(read.name) ? { failed: `${spec} is named "${read.name}", which is not an npm package's name, such as notes or @me/notes` } : infoOf(read);
}

/**
 * Installs a .tgz or a folder of this computer (D-452, D-478): unpacked or copied beside the copy it replaces, swapped in, then linked by npm as a folder of the
 * player's; when npm fails, the copy before comes back. The file or the folder may then be moved, changed or deleted: what runs is the copy.
 */
async function installCopy(folder: string, spec: string, expected: string | undefined, run: (args: string) => Promise<NpmRun>): Promise<string | undefined>
{
    let read: Manifest;

    try {
        read = JSON.parse((isTarball(spec) ? tarballText(spec, "package.json") : readFileSync(join(resolve(spec), "package.json"), "utf8")) ?? "{}") as Manifest;
    } catch (error) {
        return error instanceof Error ? error.message : String(error);
    }

    if (read.name === undefined || !packageName.test(read.name) || (expected !== undefined && expected !== `${read.name}@${read.version}`)) {
        return `${spec} is no longer the package that was asked about: install it again`;
    }

    const target = join(folder, localFolder, read.name);
    const [staged, before] = [`${target}.new`, `${target}.old`];
    rmSync(staged, { recursive: true, force: true });
    rmSync(before, { recursive: true, force: true });

    try {
        if (isTarball(spec)) {
            unpackTarball(spec, staged);
        } else {
            // What npm or git keep beside a package's own files is no part of it.
            cpSync(resolve(spec), staged, { recursive: true, filter: (path) => !/[\\/](node_modules|\.git)([\\/]|$)/.test(path.slice(resolve(spec).length)) });
        }
    } catch (error) {
        rmSync(staged, { recursive: true, force: true });
        return error instanceof Error ? error.message : String(error);
    }

    const had = existsSync(target);

    if (had) {
        renameSync(target, before);
    }

    renameSync(staged, target);
    // npm keeps what it installed of the same version, so the copy it installed goes aside first: what runs is the one just given.
    const installed = join(folder, "node_modules", read.name);
    const aside = `${target}.installed`;
    rmSync(aside, { recursive: true, force: true });
    const ran = await installedAside(installed, aside, () => run(`install --prefix ${quotedFolder(folder)} ${quotedFolder(target)} ${installOptions}`));

    if (ran.code === 0) {
        rmSync(before, { recursive: true, force: true });
        return undefined;
    }

    rmSync(target, { recursive: true, force: true });

    if (had) {
        renameSync(before, target);
    }

    return `npm said: ${npmError(ran)}`;
}

/** Runs npm with what it installed moved aside, taken away when npm succeeds and put back when it fails. */
async function installedAside(installed: string, aside: string, install: () => Promise<NpmRun>): Promise<NpmRun>
{
    const moved = existsSync(installed);

    if (moved) {
        renameSync(installed, aside);
    }

    // What npm installed comes back when the new one fails, or when npm could not even be run.
    const putBack = (): void => {
        if (moved) {
            rmSync(installed, { recursive: true, force: true });
            renameSync(aside, installed);
        }
    };

    let ran: NpmRun;

    try {
        ran = await install();
    } catch (error) {
        putBack();
        throw error;
    }

    if (ran.code !== 0) {
        putBack();
    }

    rmSync(aside, { recursive: true, force: true });
    return ran;
}

interface Manifest
{
    name?: string;
    version?: string;
    description?: string;
    // A string as package.json writes it, or a name as the registry gives it back.
    author?: string | { name?: string; };
    main?: unknown;
    exports?: unknown;
    bin?: unknown;
    dependencies?: Record<string, unknown>;
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
        // What runs: a main, exports or a command; a package of texts alone has none.
        code: read.main !== undefined || read.exports !== undefined || read.bin !== undefined,
        dependencies: Object.keys(read.dependencies ?? {}).length > 0,
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

// The installs and uninstalls of this process, one at a time: two npm runs at once in one folder keep only one of them in its package.json.
let npmTurn: Promise<unknown> = Promise.resolve();

/** An npm run that waits for the one before it to end. */
function inTurn(run: (args: string) => Promise<NpmRun>): (args: string) => Promise<NpmRun>
{
    return (args) => {
        const next = npmTurn.then(() => run(args));
        npmTurn = next.catch(() => undefined);
        return next;
    };
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
