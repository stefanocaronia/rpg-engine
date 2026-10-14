import { defineConfig } from "vitest/config";

// Only the tests in test/ and in each system's and extension's own test/ (D-172): private/ and Claude Code's worktrees hold other copies of the repo.
// The command tests run many commands each, and slow down when the files run side by side: a longer limit than vitest's 5 s. test/setup.ts removes the
// temporary folders of each file when its tests end, and test/global-setup.ts those left over a day ago by runs stopped half way.
export default defineConfig({
    test: { include: ["test/**/*.test.ts", "systems/*/test/**/*.test.ts", "extensions/*/test/**/*.test.ts"], setupFiles: ["test/setup.ts"],
        globalSetup: ["test/global-setup.ts"], testTimeout: 30_000, hookTimeout: 30_000 },
});
