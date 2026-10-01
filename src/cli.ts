#!/usr/bin/env node
import { main } from "./main.js";

const { output, exitCode } = await main(process.argv.slice(2));
if (exitCode === 0) console.log(output);
else console.error(output);
process.exitCode = exitCode;
