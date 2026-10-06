#!/usr/bin/env node
import { runCommandLine } from "./command-line.ts";

const args = process.argv.slice(2);

// "rpg mcp" turns the process into a server for an AI host; everything else is a command.
if (args.length === 1 && args[0] === "mcp") {
    // The server and its SDK load only here: every other command starts faster without them (D-194).
    const { startMcpServer } = await import("./mcp-server.ts");
    await startMcpServer();
} else {
    const { output, exitCode } = await runCommandLine(args);

    if (exitCode === 0) {
        console.log(output);
    } else {
        console.error(output);
    }

    process.exitCode = exitCode;
}
