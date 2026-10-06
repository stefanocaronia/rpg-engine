// The performance bench (step 11, D-194): times the commands on campaigns of several sizes, in one process as the MCP server runs them, with the files kept
// for the session (D-193), and from the command line.
// Run it with: node test/bench/bench.ts [sizes, such as 100,1000,5000] [--big for a game system as large as a whole SRD]. The command line runs dist/cli.js when
// the engine is built, else src/cli.ts, which loads more slowly.
import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { runCommandLine } from "../../src/command-line.ts";
import type { Context } from "../../src/core/context.ts";
import { SessionStore } from "../../src/core/session-store.ts";
import { enlargeSystem, generateWorld } from "./generate.ts";

const engine = fileURLToPath(new URL("../../", import.meta.url));
const sizes = (process.argv.find((argument) => /^\d+(,\d+)*$/.test(argument)) ?? "100,1000").split(",").map(Number);
const big = process.argv.includes("--big");
const warmRuns = 5;

// What the master does in a session, as the commands' arguments; a call that changes what it acts on runs once.
const calls: { args: string[]; once?: boolean; }[] = [
    { args: ["instructions"] },
    { args: ["status"] },
    { args: ["show", "Abitante 3"] },
    { args: ["find", "nebbia"] },
    { args: ["change", "Ennio", "hp", "--by=-1"] },
    { args: ["write", "Abitante 5", "--set", "umore=teso"] },
    { args: ["write", "Abitante 9", "--set", "status=dead"], once: true },
    { args: ["effect", "add", "Abitante 7", "Benedetto", "--for", "1h"] },
    { args: ["advance", "--by", "10m"], once: true },
    { args: ["scene", "open", "--title", "Scontro", "--type", "combat", "--with", "Ennio", "--creatures", "Bestia 1=4"], once: true },
    { args: ["change", "Bestia 1 2", "hp", "--by=-3"] },
    { args: ["scene", "close", "--summary", "Finito."], once: true },
    { args: ["rules", "grappled"] },
    { args: ["validate"] },
];

const scratch = mkdtempSync(join(tmpdir(), "rpg-bench-"));
const systems = join(scratch, "systems");
const cli = existsSync(join(engine, "dist", "cli.js")) ? join(engine, "dist", "cli.js") : join(engine, "src", "cli.ts");
enlargeSystem(join(engine, "systems", "5e"), join(systems, "5e"), big ? 45 : 1);
console.log(`| pages | command | first call | then (median of ${warmRuns}) |\n|---|---|---|---|`);

for (const size of sizes) {
    const folder = join(scratch, `campaign-${size}`);
    const session = new SessionStore();
    const context = { ...benchContext(folder, [systems]), files: session };
    await must(context, ["init", "--name", "Banco", "--language", "it", "--system", "5e", "--difficulty", "normal", "--lethality", "dice"]);
    await must(context, ["advance", "--to", "day 1, 18:00"]);
    generateWorld(folder, size);
    // The world was written by hand: the server's first call reads it all, as after a chat starts.
    await session.ready(true);

    for (const { args, once } of calls) {
        const first = await timed(context, args);
        const then = [];

        for (let run = 0; !once && run < warmRuns; run++) {
            then.push(await timed(context, args));
        }

        then.sort((one, other) => one - other);
        console.log(`| ${size} | ${args.join(" ")} | ${first} ms | ${once ? "once" : `${then[Math.floor(warmRuns / 2)]} ms`} |`);
    }

    const started = performance.now();
    // The command line reads the systems of the package: the game system is the 5e as it ships.
    const run = spawnSync(process.execPath, [cli, "status"], { cwd: folder });
    console.log(`| ${size} | status from the command line (${cli.endsWith(".js") ? "dist" : "src"}), with the 5e as it ships | ${Math.round(performance.now() - started)} ms (exit ${run.status}) | |`);
    session.close();
}

rmSync(scratch, { recursive: true, force: true });

/** A context like the tests': fixed dice, time and ids, in `folder`, with these game systems. */
function benchContext(folder: string, systemFolders: string[]): Context
{
    let idCount = 0;
    return { folder, random: () => 4, now: () => new Date("2026-10-02T10:00:00Z"), newId: () => `id${++idCount}`, newSalt: () => "salt", actor: "master", platform: process.platform, systemFolders };
}

/** How long a call takes, with the session made ready first as the MCP server does; one that fails stops the bench, since it would measure something else. */
async function timed(context: Context, args: string[]): Promise<number>
{
    const started = performance.now();
    await (context.files as SessionStore).ready(args[0] === "instructions");
    await must(context, args);
    return Math.round(performance.now() - started);
}

async function must(context: Context, args: string[]): Promise<void>
{
    const result = await runCommandLine(args, context);

    if (result.exitCode !== 0) {
        throw new Error(`${args.join(" ")}: ${result.output}`);
    }
}
