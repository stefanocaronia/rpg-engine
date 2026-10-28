import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// The engine by its own package's name, from its source, as an extension's tests import it from npm (D-506).
const source = (path: string): string => fileURLToPath(new URL(path, import.meta.url));

// Only the tests in test/: the 5e's and the extensions' are in their own repos (D-506, D-514); private/ and Claude Code's worktrees hold other copies of the repo.
// The command tests run many commands each, and slow down when the files run side by side: a longer limit than vitest's 5 s. test/setup.ts removes the
// temporary folders of each file when its tests end, and test/global-setup.ts those left over a day ago by runs stopped half way.
export default defineConfig({
    resolve: { alias: [{ find: /^rpg-engine\/testing$/, replacement: source("./src/testing/index.ts") }, { find: /^rpg-engine$/, replacement: source("./src/index.ts") }] },
    test: { include: ["test/**/*.test.ts"], setupFiles: ["test/setup.ts"],
        globalSetup: ["test/global-setup.ts"], testTimeout: 30_000, hookTimeout: 30_000 },
});
