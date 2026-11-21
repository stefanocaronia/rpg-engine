#!/usr/bin/env node
import { runCommandLine } from "./command-line.ts";

const args = process.argv.slice(2);

// "rpg mcp" turns the process into a server for an AI host; "rpg --read-library" reads the player's books apart, as rules starts it (LIB-3); "rpg --listen"
// is the doorbell for the player's sentences on the dashboard (D-495), Claude Code's, or with its host's name another's (D-578); "rpg --approve" is
// Antigravity's hook that lets the rpg tools run; everything else is a command.
if (args.length === 1 && args[0] === "mcp") {
    // The server and its SDK load only here: every other command starts faster without them (D-194).
    const { startMcpServer } = await import("../server/mcp.ts");
    const { serverInput } = await import("../server/route/index.ts");
    // Outside a campaign the router serves (D-578), through children, for Antigravity's app; in one, the server as always.
    const input = serverInput();

    if (input !== undefined) {
        await startMcpServer(input);
    }
} else if (args[0] === "--read-library") {
    const { readLibraryHere } = await import("../commands/shared/books/library-reader.ts");
    await readLibraryHere();
} else if (args[0] === "--listen" && args.length <= 2) {
    const { listen, listeningHosts } = await import("../server/bell/index.ts");
    const host = listeningHosts.find((one) => one === (args[1] ?? "claude"));

    if (host === undefined) {
        console.error(`rpg --listen does not know the host ${args[1]}: give one of ${listeningHosts.join(", ")}, or none for Claude Code.`);
        process.exitCode = 1;
    } else {
        await listen(host);
    }
} else if (args.length === 1 && args[0] === "--approve") {
    const { approveHere } = await import("../server/approver.ts");
    await approveHere();
} else {
    const { output, exitCode } = await runCommandLine(args);

    if (exitCode === 0) {
        console.log(output);
    } else {
        console.error(output);
    }

    process.exitCode = exitCode;
    await waitForGit();
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
