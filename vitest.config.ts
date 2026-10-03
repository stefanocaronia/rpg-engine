import { defineConfig } from "vitest/config";

// Only the tests in test/: private/ and Claude Code's worktrees hold other copies of the repo.
export default defineConfig({ test: { include: ["test/**/*.test.ts"] } });
