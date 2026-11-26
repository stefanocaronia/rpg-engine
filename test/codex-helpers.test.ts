// Codex as the importer (D-489 (1)): the line that starts its run, read per platform, as no real Codex starts in a test.
import { describe, expect, it } from "vitest";
import { readingLine } from "../src/helpers/codex.ts";

describe("Codex's run of the importer", () => {
    it("gives itself a sandbox on Windows, where the player's config is never read and workspace-write would fall to read-only (D-589 (3))", () => {
        const windows = readingLine("codex", "win32");
        expect(windows).toContain("-s workspace-write -c windows.sandbox=unelevated ");
        expect(windows).toContain("--ignore-user-config");
        expect(readingLine("codex", "linux")).not.toContain("windows.sandbox");
        expect(readingLine("codex", "darwin")).not.toContain("windows.sandbox");
    });
});
