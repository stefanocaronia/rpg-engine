#!/usr/bin/env node
import { hosts } from "../core/hosts.ts";
import { runCommandLine } from "./command-line.ts";

const args = process.argv.slice(2);

// "rpg mcp" turns the process into a server for an AI host, or, where its campaign's table is on, a pipe to it; "rpg table" is that table, which serves
// the campaign's page with no chat open and runs its chats' commands (D-582), "rpg table --stop" asks it to end; "rpg --read-library" reads the player's books apart, as rules starts it (LIB-3);
// "rpg --listen" is the doorbell for the player's sentences on the dashboard (D-495), Claude Code's, or with its host's name another's (D-578);
// "rpg --approve" is Antigravity's hook that lets the rpg tools run, "rpg --fence" the hook that fences Antigravity's importer; everything else is a command.
if (args.length === 1 && args[0] === "mcp" && process.env.RPG_HELPER === "1") {
    // A run of the engine's helper gets no rpg server, not even one with no tools, which would empty its host's tool cache (D-579 (1)).
    console.error("rpg mcp: not started, this is a run of RPG Engine's own helper (RPG_HELPER=1)");
    process.exitCode = 0;
} else if (args.length === 1 && args[0] === "mcp") {
    const { serverInput } = await import("../server/route/index.ts");
    const { pipeHere, tableBusy } = await import("../server/table/index.ts");
    // Outside a campaign the router serves (D-578), through children, for Antigravity's app; in one, its table when it is on (D-582), else the server as always.
    const input = serverInput();
    const piped = input === undefined ? undefined : await pipeHere(input);

    if (typeof piped === "number") {
        // The chat left the table, or the table ended: this process goes with it, once what it wrote is out.
        process.stdout.write("", () => process.exit(piped));
    } else if (input !== undefined) {
        // The server and its SDK load only here: every other command, and a chat's pipe to its table, start faster without them (D-194). A chat the table
        // sent away as another plays there only looks, so that one engine writes the campaign (D-588 (2)).
        const { startMcpServer } = await import("../server/mcp.ts");
        await startMcpServer(input, piped === "busy" ? tableBusy : undefined);
    }
} else if (args.length === 2 && args[0] === "table" && args[1] === "--stop") {
    // Asks the campaign's table to end, and waits until it did: never a kill, which would cut short the AI apps it started.
    const { runTableStop } = await import("../server/table/index.ts");
    process.exit(await runTableStop());
} else if (args.length === 1 && args[0] === "table") {
    // The table finds and starts the launcher through what the launcher gives here: neither the table nor its page imports the launcher.
    // Its end waits for the AI apps it started to end by themselves, before this process's exit stops them.
    const { runTable } = await import("../server/table/index.ts");
    const { launcherWay } = await import("../server/launcher/index.ts");
    const { userDataFolder } = await import("../core/context.ts");
    const { getVersion } = await import("../core/version.ts");
    const { computerHelpers } = await import("../helpers/index.ts");
    process.exit(await runTable(undefined, { launcher: launcherWay(userDataFolder(), getVersion()), master: { helpers: computerHelpers() } }));
} else if (args.length === 1 && args[0] === "launcher") {
    // The launcher, which lists the campaigns of this computer and opens them; "rpg open" shows its page in a window, "rpg icon" puts that on the desktop.
    // As the table's, its end waits for the AI apps it started.
    const { runLauncher } = await import("../server/launcher/index.ts");
    const { computerHelpers } = await import("../helpers/index.ts");
    process.exit(await runLauncher({ helpers: computerHelpers() }));
} else if (args[0] === "open" || args[0] === "icon") {
    const { runIcon, runOpen, sayAndEnd } = await import("./open.ts");
    // The icon runs it in a console nobody reads: it ends once its line is out, whatever was left open.
    sayAndEnd(await (args[0] === "open" ? runOpen : runIcon)(args.slice(1)));
} else if (args[0] === "--read-library") {
    const { readLibraryHere } = await import("../commands/shared/books/library-reader.ts");
    await readLibraryHere();
} else if (args[0] === "--listen" && process.env.RPG_TABLE_MASTER !== undefined) {
    // In a chat the table opened, what the player does on the page reaches the master as a message the table sends: the hook has nothing to wait for, and
    // lets the turn end with its host's answer of no ring, Antigravity's empty one.
    const { hookAnswer, listeningHosts } = await import("../server/bell/index.ts");
    const host = listeningHosts.find((one) => one === args[1]);
    const answer = host === undefined ? undefined : hookAnswer(host, false);
    process.stdout.write(answer === undefined ? "" : `${answer}\n`);
    process.exitCode = 0;
} else if (args[0] === "--listen" && args.length <= 2) {
    const { listen, listeningHosts } = await import("../server/bell/index.ts");
    const host = listeningHosts.find((one) => one === (args[1] ?? hosts.claudeCode.hook));

    if (host === undefined) {
        console.error(`rpg --listen does not know the host ${args[1]}: give one of ${listeningHosts.join(", ")}, or none for Claude Code.`);
        process.exitCode = 1;
    } else {
        await listen(host);
    }
} else if (args.length === 1 && args[0] === "--approve") {
    const { approveHere } = await import("../server/approver.ts");
    await approveHere();
} else if (args.length === 2 && args[0] === "--fence") {
    const { fenceHere } = await import("../server/fence.ts");
    await fenceHere(args[1]);
} else {
    const { endProgramsAtInterrupt } = await import("../core/process.ts");
    endProgramsAtInterrupt();
    const { output, exitCode } = await runCommandLine(args);

    if (exitCode === 0) {
        console.log(output);
    } else {
        console.error(output);
    }

    process.exitCode = exitCode;
    await waitForGit();
    await sayIconOnFirstRun();
}

/** The first command in a terminal of this machine puts RPG Engine's icon on the desktop and in the menu, and says so in a line. */
async function sayIconOnFirstRun(): Promise<void>
{
    const { iconOnFirstRun } = await import("./icon.ts");
    const { userDataFolder } = await import("../core/context.ts");
    const { homedir } = await import("node:os");
    // The icon never fails a command: a data folder that cannot be written only leaves it for another time.
    const icon = await iconOnFirstRun({ home: userDataFolder(), userHome: homedir(), platform: process.platform }).catch(() => undefined);

    if (icon !== undefined) {
        console.log(icon);
    }
}

/** The commit a command started, and its push, which the process waits for anyway: said, then what went wrong, if anything (D-576). */
async function waitForGit(): Promise<void>
{
    const { gitProblem, gitUnderWay } = await import("../commands/shared/campaign/git.ts");

    for (const { root, pushes, done } of gitUnderWay()) {
        if (pushes) {
            console.error("Pushing the campaign to git…");
        }

        await done;
        const problem = gitProblem(root);

        if (problem !== undefined) {
            console.error(`git: the ${problem.act} failed: ${problem.why}`);
        }
    }
}
