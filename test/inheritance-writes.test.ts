// D-125 on writes made at random through the command line: a page never keeps a value it would read from its bases all the same (D-118).
import fc from "fast-check";
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { runCommandLine } from "../src/command-line.ts";
import { comparableText } from "../src/core/text.ts";
import { findPage, loadWorld, sameAsBase } from "../src/pages/index.ts";
import { makeTempFolder, removeFolder, testContext } from "./support.ts";

const write = fc.record({
    page: fc.constantFrom("Lupo", "Zanna"),
    field: fc.constantFrom("ac", "fiuto", "Fiuto", "attacchi"),
    value: fc.constantFrom("11", "12", "forte", "[morso]", "[morso, coda]"),
});

describe("writes made at random", () => {
    it("D-125: after every write, the page written holds no value it would read from its bases all the same", async () => {
        await fc.assert(
            fc.asyncProperty(fc.array(write, { minLength: 1, maxLength: 4 }), async (writes) => {
                const folder = makeTempFolder();
                const context = testContext(folder);

                try {
                    await runCommandLine(["init", "--name", "Prova", "--language", "it"], context);
                    writeFileSync(join(folder, "world", "creatures", "Lupo.md"), "---\nac: 12\nfiuto: forte\nattacchi: [morso]\n---\n");
                    writeFileSync(join(folder, "world", "characters", "Zanna.md"), '---\nrole: companion\ncreature: "[[Lupo]]"\n---\n');

                    for (const { page, field, value } of writes) {
                        if ((await runCommandLine(["write", page, "--set", `${field}=${value}`], context)).exitCode !== 0) {
                            continue;
                        }

                        const world = loadWorld(folder);
                        const written = findPage(world, page);
                        const same = Object.keys(written?.fields ?? {}).filter((name) => comparableText(name) === comparableText(field) && written !== undefined && sameAsBase(world, written, name));
                        expect(same, `${page} ${field}=${value}`).toEqual([]);
                    }
                } finally {
                    removeFolder(folder);
                }
            }),
            { numRuns: 40 },
        );
    }, 60_000);
});
