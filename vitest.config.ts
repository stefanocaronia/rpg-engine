import { defineConfig } from "vitest/config";

// Only the tests in test/ and in each system's own test/ (D-172): private/ and Claude Code's worktrees hold other copies of the repo.
export default defineConfig({ test: { include: ["test/**/*.test.ts", "systems/*/test/**/*.test.ts"] } });
