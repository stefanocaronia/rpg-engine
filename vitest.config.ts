import { defineConfig } from "vitest/config";

// Only the tests in test/ and in each system's own test/ (D-172): private/ and Claude Code's worktrees hold other copies of the repo.
// The command tests run many commands each, and slow down when the files run side by side: a longer limit than vitest's 5 s.
export default defineConfig({ test: { include: ["test/**/*.test.ts", "systems/*/test/**/*.test.ts"], testTimeout: 30_000, hookTimeout: 30_000 } });
