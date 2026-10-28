// A path with "&" (AGENTS.md): on Windows npm's .cmd shims cut it, so the engine never hands one to a shell; a campaign under it still plays, as its commands
// run without a shell, and npm is never given such a folder.
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { runCommandLine } from "../src/cli/command-line.ts";
import { npmPackages } from "../src/packages/npm.ts";
import { inPlay, makeTempFolder, readLogFile, testContext } from "./support.ts";

describe("a path with an ampersand", () => {
    it("holds a campaign that plays", async () => {
        const folder = join(makeTempFolder(), "Dungeons & Dragons");
        mkdirSync(folder);
        const context = testContext(folder);
        await runCommandLine(["init", "--name", "Guadoscuro", "--language", "en", "--system", "fake", "--difficulty", "normal", "--lethality", "dice"], context);
        inPlay(folder);
        const written = await runCommandLine(["write", "Ettore", "--type", "character"], context);
        expect(written.exitCode, written.output).toBe(0);
        expect((await runCommandLine(["roll", "1d6"], context)).exitCode).toBe(0);
        expect(readLogFile(folder).some((entry) => entry.type === "roll")).toBe(true);
    });

    it("is never given to npm, and the refusal says to move the folder", async () => {
        const ran: string[] = [];
        const packages = npmPackages(join(makeTempFolder(), "R&D"), (args) => {
            ran.push(args);
            return Promise.resolve({ code: 0, out: "", errors: "" });
        });
        await expect(packages.install("@rpgengine/weather")).rejects.toThrow(/has characters npm cannot be given safely.*move it to another path/);
        expect(ran).toEqual([]);
    });
});
