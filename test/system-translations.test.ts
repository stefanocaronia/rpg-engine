// A game system's text in the campaign's language (D-542): the pages and the rules a system translates, read in their place where the campaign plays in that
// language; their fields, and the names they are found by, stay the system's.
import { cpSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { beforeEach, describe, expect, it } from "vitest";
import { runCommandLine } from "../src/cli/command-line.ts";
import type { Context } from "../src/core/context.ts";
import { makeTempFolder, testContext, testSystemFolders } from "./support.ts";

let folder: string;
let context: Context;

beforeEach(() => {
    const systems = makeTempFolder();
    cpSync(join(testSystemFolders[1], "fake"), join(systems, "fake"), { recursive: true });
    translate(systems, "world/topics/Scout.md", "---\nname: Esploratore\n---\n\n**L'esploratore** cammina avanti e torna a dire cosa c'è.\n");
    translate(systems, "world/creatures/Bog Hound.md", "---\nname: Segugio di palude\n---\n\nUn lungo cane delle paludi, grigio come le canne.\n\n## Morso\n\nDue dadi e tre, a chi gli sta accanto.\n");
    writeFileSync(join(systems, "fake", "rules", "Endings.md"), "# Endings\n\n## Last Breath\n\nOne roll more, then the dark.\n\n## Sudden End\n\nA blow twice the grit ends it.\n");
    translate(systems, "rules/Endings.md", "# Finali\n\n## Ultimo respiro\n\nUn tiro ancora, poi il buio.\n\n## Fine improvvisa\n\nUn colpo pari al doppio della tempra la chiude.\n");
    translate(systems, "rules/Basics.md", "# Basi\n\n## Cadere\n\nA 0 di tempra si cade.\n\n## Bloccato\n\nChi è bloccato non può muoversi finché non si libera.\n");
    folder = makeTempFolder();
    context = { ...testContext(folder), systemFolders: [systems, ...testSystemFolders] };
});

async function ok(...args: string[]): Promise<string>
{
    const result = await runCommandLine(args, context);
    expect(result.exitCode, result.output).toBe(0);
    return result.output;
}

function translate(systems: string, path: string, text: string): void
{
    const file = join(systems, "fake", "translations", "it", path);
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, text);
}

describe("a system's text in the campaign's language (D-542)", () => {
    it("shows a page's text and its name in the campaign's language, keeping its fields and the name it is found by", async () => {
        await ok("init", "--name", "Guadoscuro", "--language", "it", "--system", "fake", "--difficulty", "normal", "--lethality", "dice");
        const shown = await ok("show", "Scout");
        expect(shown).toContain("Named in the campaign's language: Esploratore.");
        expect(shown).toContain("**L'esploratore** cammina avanti");
        expect(shown).not.toContain("walks ahead");
        expect(shown).toContain("stamina-die: d4");
        expect(await ok("find", "Scout")).toContain("Scout «Esploratore» (topic, system fake)");
        // A page the system has not translated stays as it is.
        expect(await ok("show", "Warden")).not.toContain("Named in the campaign's language");
    });

    it("gives the player a companion's text from its creature in the campaign's language, and the creature's name there for the dashboard", async () => {
        await ok("init", "--name", "Guadoscuro", "--language", "it", "--system", "fake", "--difficulty", "normal", "--lethality", "dice");
        await ok("write", "Ettore", "--type", "character", "--set", "role=pc");
        await ok("write", "Fumo", "--type", "character", "--set", "role=companion", "--set", "creature=[[Bog Hound]]");
        const seen = await ok("view", "Fumo");
        expect(seen).toContain("Un lungo cane delle paludi");
        expect(seen).toContain("Due dadi e tre, a chi gli sta accanto.");
        expect(seen).not.toContain("hunts in pairs");
        const words = (JSON.parse(await ok("view", "--json")) as { words: { words: Record<string, string>; }; }).words.words;
        expect(words["Bog Hound"]).toBe("Segugio di palude");
    });

    it("reads the rules in the campaign's language, found by the system's words or the campaign's, and the condition's rule by its word there", async () => {
        await ok("init", "--name", "Guadoscuro", "--language", "it", "--system", "fake", "--difficulty", "normal", "--lethality", "dice");
        expect(await ok("rules", "cadere")).toContain("A 0 di tempra si cade.");
        const falling = await ok("rules", "Falling");
        expect(falling).toContain("A 0 di tempra si cade.");
        expect(falling).not.toContain("At 0 grit one falls.");
        // A chapter translated section by section is found by the system's own titles too, as its outputs name them.
        expect(await ok("rules", "Sudden End")).toContain("Un colpo pari al doppio della tempra la chiude.");
        expect(await ok("rules", "Endings › Last Breath")).toContain("Un tiro ancora, poi il buio.");
        // No note that the rules are in English.
        expect(await ok("rules")).not.toContain(", in English");
        await ok("write", "Ettore", "--type", "character", "--set", "role=pc");
        expect(await ok("effect", "add", "Ettore", "Pinned")).toContain("Chi è bloccato non può muoversi");
        // A precedent written by the rule's English name goes with it in the campaign's language too.
        await ok("config", "precedents", "--add", "Pinned: one pinned may still shout");
        expect(await ok("rules", "bloccato")).toContain("Pinned: one pinned may still shout");
    });

    it("keeps the system's own text for a campaign in another language", async () => {
        await ok("init", "--name", "Darkford", "--language", "en", "--system", "fake", "--difficulty", "normal", "--lethality", "dice");
        expect(await ok("show", "Scout")).toContain("walks ahead");
        expect(await ok("rules", "Falling")).toContain("At 0 grit one falls.");
    });
});
