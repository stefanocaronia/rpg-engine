// The system's conditions written in the campaign's language (D-403): Bloccato is the fake's Pinned, A terra its Down, in every command that reads them, as the
// dashboard already does; the 5e's Avvelenato is Poisoned against a creature's immunities.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { runCommandLine } from "../src/cli/command-line.ts";
import { allStateChecks } from "../src/commands/shared/checks.ts";
import type { Context } from "../src/core/context.ts";
import { inPlay, makeTempFolder, removeFolder, testContext } from "./support.ts";

let folder: string;
let context: Context;

beforeEach(async () => {
    folder = makeTempFolder();
    context = { ...testContext(folder), told: new Set() };
    await ok("init", "--name", "Guadoscuro", "--language", "it", "--system", "fake", "--difficulty", "normal", "--lethality", "dice");
    inPlay(folder);
    await ok("write", "Ettore", "--type", "character", "--set", "role=pc", "--set", "grit=20/20", "--set", "guard=13");
    await ok("write", "Lena", "--type", "character", "--set", "role=companion", "--set", "grit=12/12");
    await ok("advance", "--to", "day 1, 10:00");
});

afterEach(() => removeFolder(folder));

function rpg(...args: string[])
{
    return runCommandLine(args, context);
}

async function ok(...args: string[]): Promise<string>
{
    const result = await rpg(...args);
    expect(result.exitCode, result.output).toBe(0);
    return result.output;
}

function effects(name: string): string
{
    return readFileSync(join(folder, "world", "characters", `${name}.md`), "utf8").split("effects:")[1] ?? "";
}

describe("a condition written in the campaign's language", () => {
    it("gives its rule as the system's name does, saying which it is", async () => {
        expect(await ok("effect", "add", "Ettore", "Bloccato")).toContain("\n\nPinned (Bloccato) is a condition of the system fake:\n## Pinned");
        // Its own name says it alone.
        expect(await ok("effect", "add", "Lena", "Pinned")).toContain("\n\nPinned is a condition of the system fake:\n## Pinned");
    });

    it("is refused on who is immune to it, whichever language the condition or the list is written in (EFF-17)", async () => {
        await ok("write", "Statua", "--type", "character", "--set", "grit=30/30", "--set", "immune-to=[Pinned]");
        expect((await rpg("effect", "add", "Statua", "Bloccato")).output).toBe("Statua is immune to Pinned, in its immune-to: it does not take it. Nothing changed.");
        await ok("write", "Golem", "--type", "character", "--set", "grit=30/30", "--set", "immune-to=[Bloccato]");
        expect((await rpg("effect", "add", "Golem", "Pinned")).output).toBe("Golem is immune to Pinned, in its immune-to: it does not take it. Nothing changed.");
        expect(await ok("effect", "add", "Golem", "Pinned in fiamme")).toContain("Golem: Pinned in fiamme");
    });

    it("breaks what one keeps alive, as it is added and in the checks (EFF-14, CHK-2)", async () => {
        await ok("effect", "add", "Lena", "Benedizione", "--by", "[[Ettore]]");
        expect(await ok("effect", "add", "Ettore", "Bloccato")).toContain("Ettore keeps Benedizione (Lena): now Bloccato, which breaks it");
        expect(allStateChecks(folder, context).map((found) => found.line)).toEqual(["Ettore keeps Benedizione (Lena) but is Bloccato, which breaks it: effect end, by [[Ettore]]. Read rules Holding."]);
    });

    it("keeps one at 0 from acting: no check that says otherwise, no uses of the turn to mark, the warning on a use (DIE-1, TRN-1)", async () => {
        await ok("change", "Lena", "grit", "--by=-12");
        await ok("effect", "end", "Lena", "Down");
        await ok("effect", "add", "Lena", "A terra");
        expect(allStateChecks(folder, context)).toEqual([]);
        await ok("effect", "add", "Ettore", "A terra");
        await ok("scene", "open", "--title", "Al guado", "--type", "combat", "--with", "Ettore", "--with", "Lena");
        expect(await ok("scene", "order", "--order", "Ettore", "--order", "Lena")).not.toContain("Mark with scene use");
        expect(await ok("scene", "use", "--who", "Ettore", "--uses", "move")).toContain("Ettore is A terra: read what it may still do.");
    });

    it("is said on a roll with the values it gives, as the system's name is (DAT-6)", async () => {
        await ok("effect", "add", "Ettore", "Bloccato", "--set", "guard=10");
        expect(await ok("roll", "2d6", "--who", "Ettore")).toContain("\nEttore has Bloccato: if they change this roll");
    });

    it("is the system's to its code: has, sameName, ended and not added twice, and a check that reads it (D-514, CHK-2)", async () => {
        // A terra written by the master, then grit given back: the fake's code ends Down, which is A terra.
        await ok("change", "Lena", "grit", "--by=-12");
        await ok("effect", "end", "Lena", "Down");
        await ok("effect", "add", "Lena", "A terra");
        expect(await ok("change", "Lena", "grit", "--by=3")).toContain("Lena rises: Down ended, fading 0.");
        expect(effects("Lena")).not.toContain("A terra");
        // Written again before the fall: the code adds no Down beside it.
        await ok("effect", "add", "Lena", "A terra");
        await ok("change", "Lena", "grit", "--by=-3");
        expect(effects("Lena")).not.toContain("Down");
        // Rinsaldato is the fake's Steadied: its code clears the fading, and its check holds above 0 grit.
        await ok("change", "Lena", "fading", "--by=1");
        expect(await ok("effect", "add", "Lena", "Rinsaldato")).toContain("Lena is steadied: fading 0.");
        await ok("change", "Lena", "grit", "--by=5");
        expect(allStateChecks(folder, context).map((found) => found.line)).toContain("Lena is Steadied with grit 5/12: Steadied holds only at 0 grit; effect end Lena Steadied.");
    });

    it("counts in the system's formulas, as has(effects, Pinned) (FOR-2)", async () => {
        await ok("write", "Ettore", "--set", "stride=30");
        expect(await ok("show", "Ettore")).toContain("speed 30 m");
        await ok("effect", "add", "Ettore", "Bloccato");
        expect(await ok("show", "Ettore")).toContain("speed 0 m");
    });

    it("is the effect of the system's name: added in its place, never beside it, and ended by it (EFF-1, EFF-5)", async () => {
        await ok("effect", "add", "Ettore", "Bloccato");
        expect(await ok("effect", "add", "Ettore", "Pinned", "--for", "1h")).toContain("It takes the place of Bloccato.");
        expect(effects("Ettore")).not.toContain("Bloccato");
        await ok("effect", "add", "Ettore", "Bloccato");
        expect(await ok("effect", "end", "Ettore", "Pinned")).toBe("Ettore: Bloccato ended.");
        expect(effects("Ettore")).toBe("");
    });
});
