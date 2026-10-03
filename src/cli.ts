#!/usr/bin/env node
import { runCommandLine } from "./command-line.ts";
import { startMcpServer } from "./mcp-server.ts";

const args = process.argv.slice(2);

// "rpg mcp" turns the process into a server for an AI host; everything else is a command.
if (args.length === 1 && args[0] === "mcp") {
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
