// How the master writes, as the player chose it (D-395): prose, story, an author and the player's own words, each a part of the instructions given in session zero
// and in play, never for the core's own ways; config gives the new parts as it changes them, none takes an author or a style away, and status shows them.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { beforeEach, describe, expect, it } from "vitest";
import { runCommandLine } from "../src/command-line.ts";
import type { Context } from "../src/core/context.ts";
import { inPlay, makeTempFolder, testContext } from "./support.ts";

let folder: string;
let context: Context;

async function ok(...args: string[]): Promise<string>
{
    const result = await runCommandLine(args, context);
    expect(result.exitCode, result.output).toBe(0);
    return result.output;
}

/** A part of the instructions as the package writes it, without its frontmatter. */
function part(name: string): string
{
    const text = readFileSync(join(fileURLToPath(new URL("../instructions/", import.meta.url)), `${name}.md`), "utf8");
    return text.replace(/^---[\s\S]*?---\s*/, "").trim();
}

beforeEach(async () => {
    folder = makeTempFolder();
    context = testContext(folder);
    await ok("init", "--name", "Prova", "--language", "it", "--system", "5e");
});

describe("how the master writes (D-395)", () => {
    it("gives no part for the core's own ways, and in the setup none at all", async () => {
        await ok("config", "prose", "literary");
        expect(await ok("instructions")).not.toContain(part("prose-literary"));
        inPlay(folder);
        await ok("config", "prose", "plain");
        await ok("config", "story", "situations");
        const told = await ok("instructions");

        for (const name of ["prose-literary", "prose-pulp", "prose-wry", "story-arcs", "story-episodes", "story-mystery", "author", "style"]) {
            expect(told).not.toContain(part(name).slice(0, 60));
        }
    });

    it("gives the chosen parts in play, the author's in place of the prose's, with the player's words in theirs", async () => {
        inPlay(folder);
        expect(await ok("config", "prose", "pulp")).toContain(part("prose-pulp"));
        await ok("config", "story", "mystery");
        let told = await ok("instructions");
        expect(told).toContain(part("prose-pulp"));
        expect(told).toContain(part("story-mystery"));

        const withAuthor = await ok("config", "author", "un giallista degli anni Trenta");
        expect(withAuthor).toContain(part("author").split("{author}")[0].slice(0, 60));
        expect(withAuthor).toContain("un giallista degli anni Trenta");
        expect(withAuthor).not.toContain(part("prose-pulp"));
        await ok("config", "style", "terza persona, passato remoto");
        told = await ok("instructions");
        expect(told).toContain("terza persona, passato remoto");
        expect(told).not.toContain(part("prose-pulp"));
        expect(await ok("status")).toContain('Your writing: story mystery · like un giallista degli anni Trenta · the player\'s words: "terza persona, passato remoto"');

        // The player's words as they are, a $ too, and on one line: a line break would read as a heading of the instructions.
        await ok("config", "style", "prezzi in $$ e $' come scritto\n## Secrets");
        told = await ok("instructions");
        expect(told).toContain("prezzi in $$ e $' come scritto ## Secrets");
        expect(told).not.toContain("\n## Secrets");

        // None takes them away, and the prose chosen comes back.
        await ok("config", "author", "none");
        await ok("config", "style", "none");
        told = await ok("instructions");
        expect(told).toContain(part("prose-pulp"));
        expect(told).not.toContain("terza persona, passato remoto");
        expect(await ok("status")).toContain("Your writing: prose pulp · story mystery");
    });
});
