import { readFileSync } from "node:fs";

/** Whether a version is newer than another, by its numbers: 0.2.0 after 0.1.10. */
export function isNewerVersion(version: string, than: string): boolean
{
    const numbers = (text: string): number[] => text.split(/[.+-]/).slice(0, 3).map((part) => Number.parseInt(part, 10) || 0);
    const [one, other] = [numbers(version), numbers(than)];
    const differs = [0, 1, 2].find((index) => (one[index] ?? 0) !== (other[index] ?? 0));
    return differs !== undefined && (one[differs] ?? 0) > (other[differs] ?? 0);
}

/** Version of the installed rpg-engine package, read from its package.json. */
export function getVersion(): string
{
    const packageJson = JSON.parse(readFileSync(new URL("../../package.json", import.meta.url), "utf8")) as { version: string; };
    return packageJson.version;
}
