#!/usr/bin/env node
import { getVersion } from "./version.js";

const [arg] = process.argv.slice(2);

if (arg === "--version" || arg === "-v") {
  console.log(getVersion());
} else {
  console.log(`rpg-engine ${getVersion()}: work in progress, no commands yet.`);
}
