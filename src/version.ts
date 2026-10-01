import { readFileSync } from "node:fs";

/** Version of the installed rpg-engine package, read from its package.json. */
export function getVersion(): string {
  const pkg = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8")) as { version: string };
  return pkg.version;
}
