// Every case of a counter on a page that derives from a creature (INH-9, INH-11): what Zanna holds, what Lupo holds, and what is asked (D-118).
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { runCommandLine } from "../src/command-line.ts";
import { write } from "../src/commands/write.ts";
import type { Context } from "../src/core/context.ts";
import { makeTempFolder, removeFolder, testContext } from "./support.ts";

let folder: string;
let context: Context;

beforeEach(async () => {
    folder = makeTempFolder();
    context = testContext(folder);
    await runCommandLine(["init", "--name", "Guadoscuro", "--language", "it", "--system", "fake", "--difficulty", "normal", "--lethality", "dice"], context);
});

afterEach(() => removeFolder(folder));

/** One case: Zanna's own grit and Lupo's grit (none when left out), what is asked, and what Zanna then holds, or the start of the refusal. */
interface Case
{
    rule: string;
    own?: string;
    base?: string;
    ask: string[] | { set: Record<string, unknown>; };
    holds?: string;
    refused?: string;
}

const writeCases: Case[] = [
    { rule: "INH-11", base: "13/13", ask: ["write", "--set", "grit=5/13"], refused: "grit is a counter that Zanna reads from Lupo: use change" },
    { rule: "D-125", base: "13/13", ask: ["write", "--set", "grit=13/13"] },
    { rule: "D-125", own: "morto", base: "13/13", ask: ["write", "--set", "grit=13/13"] },
    { rule: "INH-11", base: "13/13", ask: ["write", "--set", "grit=morto"], holds: "morto" },
    { rule: "INH-11", base: "13/13", ask: ["write", "--unset", "grit"], refused: 'Zanna has no field "grit" to remove. It reads grit from Lupo' },
    {
        rule: "INH-11",
        own: "5/13",
        base: "13/13",
        ask: ["write", "--set", "grit=7/13"],
        refused: 'grit is a counter: use change, page "Zanna", field grit, to 7/13 (or by an amount). To make it something else, set a value that is not a counter.',
    },
    { rule: "INH-11", own: "5/13", base: "13/13", ask: ["write", "--set", "grit=morto"], holds: "morto" },
    { rule: "INH-11", own: "5/13", base: "13/13", ask: ["write", "--unset", "grit"], refused: "grit on Zanna is a counter: without it, Zanna would read 13/13 from Lupo" },
    { rule: "INH-6", own: "5/13", base: "13/13", ask: { set: { grit: "" } }, refused: "Give grit a value. To remove a field, use unset." },
    { rule: "INH-6", own: "5/13", base: "13/13", ask: { set: { grit: null } }, refused: "Give grit a value. To remove a field, use unset." },
    { rule: "INH-6", base: "13/13", ask: { set: { grit: "" } }, refused: "Give grit a value. To remove a field, use unset." },
    { rule: "INH-11", own: "5/13", ask: ["write", "--set", "grit=7/13"], refused: 'grit is a counter: use change, page "Zanna", field grit, to 7/13 (or by an amount). To make it something else, unset it, then set it.' },
    { rule: "INH-11", own: "5/13", ask: ["write", "--set", "grit=morto"], refused: "grit is a counter: use change" },
    { rule: "INH-11", own: "5/13", ask: ["write", "--unset", "grit"] },
    { rule: "INH-11", own: "5/13", base: "20", ask: ["write", "--unset", "grit"] },
    { rule: "INH-11", own: "5", base: "13/13", ask: ["write", "--unset", "grit"] },
    // grit has a maximum in the system: as a number alone it is a statistic of a stat block, which write changes (CNT-7).
    { rule: "INH-11", own: "5", base: "13/13", ask: ["write", "--set", "grit=7"], holds: "7" },
    { rule: "INH-11", base: "20", ask: ["write", "--set", "grit=7"], holds: "7" },
    { rule: "INH-11", own: "morto", base: "13/13", ask: ["write", "--set", "grit=7/13"], holds: "7/13" },
    { rule: "INH-6", own: "", base: "13/13", ask: ["write", "--set", "grit=5/13"], refused: "grit is a counter that Zanna reads from Lupo: use change" },
    { rule: "INH-6", own: "", base: "13/13", ask: ["write", "--unset", "grit"] },
    { rule: "INH-9", base: "13/13", ask: ["change", "--by=-3"], holds: "10/13" },
    { rule: "INH-9", own: "10/13", base: "13/13", ask: ["change", "--by=3"] },
    { rule: "INH-9", own: "10/13", base: "13/13", ask: ["change", "--to", "max"] },
    { rule: "INH-9", own: "10/15", base: "13/13", ask: ["change", "--to", "max"], holds: "15/15" },
    { rule: "INH-9", own: "10/13", base: "13/13", ask: ["change", "--to", "13/13"] },
    { rule: "INH-9", base: "13", ask: ["change", "--by=-1"], holds: "12" },
    { rule: "INH-9", own: "12", base: "13", ask: ["change", "--by=1"] },
    { rule: "INH-6", own: "", base: "13/13", ask: ["change", "--by=-3"], holds: "10/13" },
    { rule: "INH-9", own: "5/13", ask: ["change", "--by=-1"], holds: "4/13" },
];

describe("a counter on a page that derives from a creature", () => {
    it.each(writeCases)("$rule: Zanna holds $own, Lupo $base; $ask", async (example) => {
        const lupo = example.base === undefined ? "" : `grit: ${example.base}\n`;
        const zanna = example.own === undefined ? "" : `grit: ${example.own === "" ? "" : example.own}\n`;
        writeFileSync(join(folder, "world", "creatures", "Lupo.md"), `---\n${lupo}ac: 12\n---\n`);
        writeFileSync(join(folder, "world", "characters", "Zanna.md"), `---\nrole: npc\ncreature: "[[Lupo]]"\n${zanna}---\n`);
        const before = readFileSync(join(folder, "world", "characters", "Zanna.md"), "utf8");
        const result = await ask(example.ask);

        if (example.refused !== undefined) {
            expect(result.exitCode).toBe(1);
            expect(result.output).toContain(example.refused);
            expect(readFileSync(join(folder, "world", "characters", "Zanna.md"), "utf8")).toBe(before);
            return;
        }

        expect(result.exitCode, result.output).toBe(0);
        const fields = JSON.parse((await runCommandLine(["show", "Zanna", "--json"], context)).output).fields as Record<string, unknown>;
        expect(fields.grit === undefined ? undefined : String(fields.grit)).toBe(example.holds);
    });
});

async function ask(request: Case["ask"]): Promise<{ exitCode: number; output: string; }>
{
    if (!Array.isArray(request)) {
        try {
            write.run(write.input.parse({ page: "Zanna", ...request }), context);
            return { exitCode: 0, output: "" };
        } catch (error) {
            return { exitCode: 1, output: error instanceof Error ? error.message : String(error) };
        }
    }

    const [command, ...options] = request;
    return runCommandLine([command, "Zanna", ...(command === "change" ? ["grit"] : []), ...options], context);
}
