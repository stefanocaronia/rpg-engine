// Run by vitest once, before the tests: the temporary folders older than a day go, those of runs stopped half way, as by mutation testing (D-345). A run
// that is going on keeps its own, which are minutes old.
import { readdirSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const day = 24 * 60 * 60 * 1000;

export default function removeOldTestFolders(): void
{
    for (const name of readdirSync(tmpdir()).filter((one) => one.startsWith("rpg-test-"))) {
        const folder = join(tmpdir(), name);

        try {
            if (Date.now() - statSync(folder).mtimeMs > day) {
                rmSync(folder, { recursive: true, force: true });
            }
        } catch {
            // Gone meanwhile, or another run's: it goes next time.
        }
    }
}
