#!/usr/bin/env node
import { runCommandLine } from "./command-line.js";

const { output, exitCode } = await runCommandLine(process.argv.slice(2));
if (exitCode === 0) {
    console.log(output);
} else {
    console.error(output);
}
process.exitCode = exitCode;
