// The dashboard translated by the master in the chat (D-423), where the package does not ship the campaign's language and nothing on the computer translates it in
// the background: status offers it in the setup; translate gives batches by short ids, the page's phrases then the game system's words, and keeps what comes back
// in the player's data folder, as the background work does, dropping a phrase that loses a {name}.
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { beforeEach, describe, expect, it } from "vitest";
import { runCommandLine } from "../src/cli/command-line.ts";
import type { Context } from "../src/core/context.ts";
import { homeSystemWords } from "../src/server/dashboard/words.ts";
import { makeTempFolder, readLogFile, testContext, testSystemFolders } from "./support.ts";

let folder: string;
let context: Context;

async function ok(...args: string[]): Promise<string>
{
    const result = await runCommandLine(args, context);
    expect(result.exitCode, result.output).toBe(0);
    return result.output;
}

async function refused(...args: string[]): Promise<string>
{
    const result = await runCommandLine(args, context);
    expect(result.exitCode, result.output).not.toBe(0);
    return result.output;
}

/** A built page whose Italian lists 200 phrases, the first with a {name}. */
function page(): string
{
    const built = makeTempFolder();
    mkdirSync(join(built, "i18n"));
    const phrases = ["Hello {name}", ...Array.from({ length: 199 }, (_, index) => `phrase ${index}`)];
    writeFileSync(join(built, "i18n", "it.json"), JSON.stringify(Object.fromEntries(phrases.map((phrase) => [phrase, `IT ${phrase}`]))));
    return built;
}

/** The ids a batch gives, one a line. */
function idsOf(output: string): string[]
{
    return [...output.matchAll(/^([pw]\d+)\b/gm)].map((match) => match[1]);
}

/** Every id translated as VI and its id, with the {names} its Italian has. */
function answered(output: string): string
{
    return JSON.stringify(Object.fromEntries(
        output.split("\n").flatMap((line) => {
            const id = /^([pw]\d+)\b/.exec(line)?.[1];
            return id === undefined ? [] : [[id, `VI ${id} ${[...(line.split(" · it: ")[1] ?? "").matchAll(/\{\w+\}/g)].join(" ")}`.trim()]];
        }),
    ));
}

beforeEach(async () => {
    folder = makeTempFolder();
    context = { ...testContext(folder), home: makeTempFolder(), pageFolder: page(), dashboard: "http://127.0.0.1:4747/" };
    await ok("init", "--name", "Prova", "--language", "vi", "--system", "fake");
});

describe("the dashboard translated in the chat (D-423)", () => {
    it("is offered by status in the setup, then translated batch by batch, the page's phrases and then the game system's words, for every campaign", async () => {
        expect(await ok("status")).toContain(
            "The dashboard is not in Vietnamese on this computer, and nothing here translates it in the background: offer the player once to translate it now, in a couple of minutes, with translate",
        );
        let output = await ok("translate");
        expect(idsOf(output)).toHaveLength(160);
        expect(output).toContain("p0: Hello {name} · it: IT Hello {name}");

        // One phrase loses its {name} and one comes garbled, as UTF-8 misread: the rest is kept, and they come again first.
        const first = JSON.parse(answered(output)) as Record<string, string>;
        first.p0 = "Xin chào";
        first.p1 = "Đ·∫øn l∆∞·ª£t b·∫°n";
        output = await ok("translate", "--phrases", JSON.stringify(first));
        expect(output).toContain("Kept 158. p0, p1 lost a {name} or came garbled: they come again.");
        expect(idsOf(output).slice(0, 3)).toEqual(["p0", "p1", "p160"]);

        let calls = 2;

        while (!output.includes("The dashboard is now in Vietnamese")) {
            output = await ok("translate", "--phrases", answered(output));
            calls++;
            expect(calls).toBeLessThan(12);
        }

        // The game system's words came after the page's, by what each is.
        const home = context.home as string;
        expect(homeSystemWords(home, { name: "fake", folder: join(testSystemFolders[1], "fake") }, "vi")?.groups.Traits).toMatch(/^VI w\d+$/);
        expect(readLogFile(folder).filter((entry) => entry.type === "page-translated").every((entry) => entry.visibility === "hidden")).toBe(true);
        expect(await ok("status")).not.toContain("The dashboard is not in Vietnamese");
        expect(await refused("translate", "--phrases", "{}")).toContain("None of these phrases was kept");
    });

    it("has nothing to do where the page ships the language, where the computer translates it by itself, and offers nothing out of the setup", async () => {
        await ok("config", "language", "it");
        expect(await refused("translate")).toContain("The dashboard is already written in Italian: nothing to translate.");
        await ok("config", "language", "vi");
        context = { ...context, writer: { ready: () => true, write: () => Promise.resolve(undefined) } };
        expect(await refused("translate")).toContain("This computer translates the dashboard into Vietnamese by itself, in the background");
        expect(await ok("status")).not.toContain("translate it now");
    });
});
