// A package's code written wrongly, as an author may write it by hand (D-537): a command that is not one, an answer that is not text, a timePassed that gives
// no list of lines or never ends. Each says what is wrong, and leaves the others, and the time, as they are.
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { appendFileSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { beforeEach, describe, expect, it } from "vitest";
import { runCommandLine } from "../src/command-line.ts";
import type { Context } from "../src/core/context.ts";
import { createMcpServer } from "../src/mcp-server.ts";
import { inPlay, makeTempFolder, readLogFile, testContext } from "./support.ts";

let folder: string;
let context: Context;

const rpg = async (...args: string[]): Promise<{ output: string; exitCode: number; }> => await runCommandLine(args, context);

/** An extension of the campaign, made of these lines of code. */
function extension(name: string, code: string): void
{
    const own = join(folder, "packages", name);
    mkdirSync(join(own, "src"), { recursive: true });
    writeFileSync(join(own, "package.json"), JSON.stringify({ name: `@rpgengine/${name}`, version: "1.0.0", main: "dist/index.js", "rpg-engine": { kind: "extension", api: 6 } }));
    writeFileSync(join(own, "extension.yaml"), `title: ${name}\nabout: a test extension\nlanguage: en\n`);
    writeFileSync(join(own, "src", "index.ts"), `${code}\n`);
    const listed = context.extensionFolders?.[0] === join(folder, "packages");
    context = { ...context, extensionFolders: [join(folder, "packages")] };
    appendFileSync(join(folder, "campaign.yaml"), `${listed ? "" : "extensions:\n"}  "@rpgengine/${name}": 1.0.0\n`);
}

/** The tools of the packages an AI host sees, after a call. */
async function packageTools(): Promise<string[]>
{
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    await createMcpServer(context).connect(serverTransport);
    const client = new Client({ name: "test", version: "1.0.0" });
    await client.connect(clientTransport);

    try {
        await client.callTool({ name: "status", arguments: {} });
        return (await client.listTools()).tools.map((tool) => tool.name).filter((name) => /^(aaa|bbb)/.test(name));
    } finally {
        await client.close();
    }
}

beforeEach(async () => {
    folder = makeTempFolder();
    context = testContext(folder);
    await rpg("init", "--name", "Fenmoor", "--language", "en", "--system", "fake", "--difficulty", "normal", "--lethality", "dice");
    inPlay(folder);
    await rpg("write", "Tamsin", "--type", "character", "--set", "role=pc");
});

describe("a package's command written wrongly", () => {
    it.each([["a string schema", "z.string()"], ["a plain object", "{}"], ["no input", "undefined"]])("with %s for input is named by validate, and takes no other package's tools away", async (_, input) => {
        extension("aaa", `export default ({ z }) => ({ commands: [{ name: "aaa", description: "Broken.", input: ${input}, run: () => "a" }] });`);
        extension("bbb", 'export default ({ z }) => ({ commands: [{ name: "bbb", description: "Fine.", input: z.object({}), run: () => "b" }] });');
        expect((await rpg("validate")).output).toContain("its command aaa gives its input in another shape: give it as z.object({...}), with the z the kit gives");
        expect(await packageTools()).toEqual(["bbb"]);
    });

    it("without a description says to give one", async () => {
        extension("aaa", 'export default ({ z }) => ({ commands: [{ name: "aaa", input: z.object({}), run: () => "a" }] });');
        expect((await rpg("validate")).output).toContain("its command aaa has no description: give it one, written for an AI");
    });

    it("that gives no text answers with what its author must fix", async () => {
        extension("aaa", 'export default ({ z }) => ({ commands: [{ name: "aaa", description: "None.", input: z.object({}), run: () => undefined }] });');
        const ran = await rpg("aaa");
        expect(ran.exitCode).toBe(1);
        expect(ran.output).toContain("command aaa gave no text: a command gives the master its answer as text");
    });
});

describe("a package's timePassed written wrongly", () => {
    it("that gives text, not a list of lines, says so in one line, and the time passes", async () => {
        extension("aaa", 'export default () => ({ timePassed: () => "The wind turns cold." });');
        await rpg("advance", "--to", "day 1, 08:00");
        const ran = await rpg("advance", "--by", "2h");
        expect(ran.output).toContain("failed after the time passed: its timePassed gave no list of lines, which is what it gives");
        expect(ran.output).not.toMatch(/^T$/m);
    });

    it("that never ends gives up when the call is stopped, the time passed all the same", async () => {
        await rpg("advance", "--to", "day 1, 08:00");
        extension("slow", "export default () => ({ timePassed: () => new Promise(() => undefined) });");
        const stop = new AbortController();
        context = { ...context, signal: stop.signal };
        setTimeout(() => stop.abort(), 300);
        const ran = await rpg("advance", "--by", "2h");
        expect(ran.output).toContain("gave nothing before the call was stopped. The time did pass: do not advance again.");
        expect(readLogFile(folder).filter((entry) => entry.type === "time-advanced")).toHaveLength(2);
    }, 10_000);

    it("writes nothing more once the call is stopped, though its code goes on", async () => {
        await rpg("advance", "--to", "day 1, 08:00");
        extension("late", "export default () => ({ timePassed: async (_p, game) => { await new Promise((done) => setTimeout(done, 600)); game.log('LATE WRITE', 'public'); return []; } });");
        const stop = new AbortController();
        context = { ...context, signal: stop.signal };
        setTimeout(() => stop.abort(), 200);
        await rpg("advance", "--by", "2h");
        await new Promise((done) => setTimeout(done, 800));
        expect(JSON.stringify(readLogFile(folder))).not.toContain("LATE WRITE");
    }, 10_000);
});
