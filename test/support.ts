import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { Context } from "../src/core/context.ts";
import type { LogEntry } from "../src/core/log.ts";

/** A context with dice that always show 4, a fixed time and ids id1, id2…, working in `folder` as the master. */
export function testContext(folder: string): Context
{
    let idCount = 0;
    return {
        folder,
        random: () => 4,
        now: () => new Date("2026-10-02T10:00:00Z"),
        newId: () => `id${++idCount}`,
        newSalt: () => "salt",
        actor: "master",
    };
}

export function makeTempFolder(): string
{
    return mkdtempSync(join(tmpdir(), "rpg-test-"));
}

export function removeFolder(folder: string): void
{
    rmSync(folder, { recursive: true, force: true });
}

export function readLogFile(folder: string): LogEntry[]
{
    return readFileSync(join(folder, "log.jsonl"), "utf8").trim().split("\n").map((line) => JSON.parse(line) as LogEntry);
}
