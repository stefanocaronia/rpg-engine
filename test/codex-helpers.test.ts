// Codex as the importer (D-489 (1)), the painter and the writer: the lines that start their runs, read per platform, as no real Codex starts in a test.
import { describe, expect, it } from "vitest";
import { paintingLine, readingLine, writingLine } from "../src/helpers/codex.ts";

describe("Codex's run of the importer", () => {
    it("gives itself a sandbox on Windows, where the player's config is never read and workspace-write would fall to read-only (D-589 (3))", () => {
        const windows = readingLine("codex", "win32");
        expect(windows).toContain("-s workspace-write -c windows.sandbox=unelevated ");
        expect(windows).toContain("--ignore-user-config");
        expect(readingLine("codex", "linux")).not.toContain("windows.sandbox");
        expect(readingLine("codex", "darwin")).not.toContain("windows.sandbox");
    });

    it("works off the web: no search, and its commands with no network (D-589 (3))", () => {
        for (const platform of ["win32", "linux"] as const) {
            expect(readingLine("codex", platform)).toContain(' -c web_search="disabled" -c sandbox_workspace_write.network_access=false ');
        }
    });
});

describe("Codex's runs of the painter and the writer", () => {
    it("have no shell, no look at the computer's pictures and no web: the painter its image tool alone, the writer none (D-589 (3))", () => {
        for (const line of [paintingLine("codex", "/tmp/p", "/tmp/p/last.txt"), writingLine("codex", "/tmp/w", "/tmp/w/last.txt")]) {
            expect(line).toContain(' -s read-only -c features.shell_tool=false -c features.view_image=false -c web_search="disabled" ');
            expect(line).toContain("--ignore-user-config");
        }

        expect(paintingLine("codex", "/tmp/p", "/tmp/p/last.txt")).toContain(' -C "/tmp/p" --json -o "/tmp/p/last.txt" ');
    });
});
