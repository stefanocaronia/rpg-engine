// The character agent (D-490, D-580): the agent init gives Claude Code, OpenCode, Codex and Antigravity in a campaign, kept as the engine writes it, and the part of the instructions that tells
// the master when to call it, in play and only in the host whose agent the chat found.
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { refreshHostFiles } from "../src/campaign/index.ts";
import { runCommandLine } from "../src/cli/command-line.ts";
import type { Context } from "../src/core/context.ts";
import { hostInstructions } from "../src/instructions/index.ts";
import { inPlay, makeTempFolder, removeFolder, testContext } from "./support.ts";

let folder: string;
let context: Context;

beforeEach(async () => {
    folder = makeTempFolder();
    context = testContext(folder);
    await runCommandLine(["init", "--name", "Prova", "--language", "it"], context);
});

afterEach(() => removeFolder(folder));

describe("the character agent (D-490)", () => {
    it("is an agent of Claude Code in the campaign, which reads only the view and not the master's instructions, and comes back as the engine writes it", () => {
        const path = join(folder, ".claude", "agents", "rpg-character.md");
        const agent = readFileSync(path, "utf8");
        expect(agent).toMatch(/^---\n# Written by rpg.+\nname: rpg-character\ndescription: .+\ntools: mcp__rpg__view\nmodel: inherit\nomitClaudeMd: true\n---\n\n/);
        expect(agent).toContain(hostInstructions().character);
        writeFileSync(path, "---\nname: rpg-character\n---\nAltro.\n");
        refreshHostFiles(folder, hostInstructions(), context.platform);
        expect(readFileSync(path, "utf8")).toBe(agent);
    });

    it("is called as Voices says, in play and in Claude Code only, when the chat found the agent", async () => {
        const voices = (host: string | undefined, claudeCode = true): Promise<string> => runCommandLine(["instructions"], { ...context, host: () => host, characterAgents: { claudeCode } }).then((result) => result.output);
        expect(await voices("claude-code")).not.toContain("## Voices");
        inPlay(folder);
        expect(await voices("claude-code")).toContain("## Voices");
        expect(await voices("claude-code")).not.toContain("subagent");
        expect(await voices("codex-mcp-client")).not.toContain("## Voices");
        expect(await voices(undefined)).not.toContain("## Voices");
        // Claude Code's agent is not OpenCode's.
        expect(await voices("opencode")).not.toContain("## Voices");
        // An agent written as this chat's server started reaches only the next chat: until then the master voices everyone.
        expect(await voices("claude-code", false)).not.toContain("## Voices");
    });

    it("is an OpenCode subagent too, with only the rpg server's view, written and taken away as Claude Code's", async () => {
        const path = join(folder, ".opencode", "agents", "rpg-character.md");
        const agent = readFileSync(path, "utf8");
        expect(agent).toBe([
            "---",
            "# Written by rpg, which writes it again as the game starts: a change made here does not last.",
            "description: Voices one character of the campaign at a key moment, knowing only what they know. Begin with their name, then the moment, as Voices says.",
            "mode: subagent",
            "permissions:",
            '  - action: "*"',
            '    resource: "*"',
            "    effect: deny",
            '  - action: "execute"',
            '    resource: "*"',
            "    effect: allow",
            '  - action: "rpg_view"',
            '    resource: "*"',
            "    effect: allow",
            "---",
            "",
            hostInstructions().character,
            "",
            'Your tool: tools.rpg.view, called through execute, as await tools.rpg.view({ as: "your name" }).',
            "",
        ].join("\n"));
        writeFileSync(path, "---\nmode: primary\n---\nAltro.\n");
        refreshHostFiles(folder, hostInstructions(), context.platform);
        expect(readFileSync(path, "utf8")).toBe(agent);
        await runCommandLine(["config", "voices", "master"], context);
        expect(existsSync(path)).toBe(false);
        await runCommandLine(["config", "voices", "auto"], context);
        expect(readFileSync(path, "utf8")).toBe(agent);
    });

    it("is called in OpenCode with its subagent tool, the turn ended until its lines come, when that chat found it", async () => {
        inPlay(folder);
        const voices = (host: string, characterAgents: Context["characterAgents"]): Promise<string> => runCommandLine(["instructions"], { ...context, host: () => host, characterAgents }).then((result) => result.output);
        const told = await voices("opencode", { openCode: true });
        expect(told).toContain("## Voices");
        expect(told).toContain("Here the agent is the subagent rpg-character, started with the subagent tool (agent rpg-character, prompt your words to them).");
        expect(told).toContain("end your turn with one short line of the story and nothing else");
        // Only OpenCode's file counts for OpenCode's chat, and never for another host's.
        expect(await voices("opencode", { claudeCode: true })).not.toContain("## Voices");
        expect(await voices("claude-code", { openCode: true })).not.toContain("## Voices");
        expect(await voices("codex-mcp-client", { claudeCode: true, openCode: true })).not.toContain("## Voices");
        expect(await voices("antigravity-client", { claudeCode: true, openCode: true })).not.toContain("## Voices");
    });

    it("is a Codex role and an Antigravity subagent too, exactly as each host reads it, written with voices unset or auto and taken away with master (D-580)", async () => {
        const header = "# Written by rpg, which writes it again as the game starts: a change made here does not last.";
        const description = "Voices one character of the campaign at a key moment, knowing only what they know. Begin with their name, then the moment, as Voices says.";
        const codexPath = join(folder, ".codex", "agents", "rpg-character.toml");
        const antigravityPath = join(folder, ".agents", "agents", "rpg-character.md");
        const codex = [
            header,
            'name = "rpg-character"',
            `description = "${description}"`,
            'developer_instructions = """',
            hostInstructions().character,
            '"""',
            "",
            "[features]",
            "shell_tool = false",
            "apps = false",
            "plugins = false",
            "",
            "[skills]",
            "include_instructions = false",
            "",
            "[skills.bundled]",
            "enabled = false",
            "",
        ].join("\n");
        const antigravity = [
            "---",
            header,
            "name: rpg-character",
            `description: ${description}`,
            "mainAgent: false",
            "subagent: true",
            "model: inherit",
            "---",
            "",
            hostInstructions().character,
            "",
        ].join("\n");
        expect(readFileSync(codexPath, "utf8")).toBe(codex);
        expect(readFileSync(antigravityPath, "utf8")).toBe(antigravity);
        writeFileSync(codexPath, 'name = "altro"\n');
        writeFileSync(antigravityPath, "---\nname: altro\n---\n");
        refreshHostFiles(folder, hostInstructions(), context.platform);
        expect(readFileSync(codexPath, "utf8")).toBe(codex);
        expect(readFileSync(antigravityPath, "utf8")).toBe(antigravity);
        await runCommandLine(["config", "voices", "master"], context);
        expect(existsSync(codexPath)).toBe(false);
        expect(existsSync(antigravityPath)).toBe(false);
        await runCommandLine(["config", "voices", "auto"], context);
        expect(readFileSync(codexPath, "utf8")).toBe(codex);
        expect(readFileSync(antigravityPath, "utf8")).toBe(antigravity);
    });

    it("has instructions that fit in Codex's TOML string as they are, with no triple quote and no backslash", () => {
        // Codex's role holds them in a multi-line basic string: """ would end it and a backslash would start an escape, and a broken file drops the whole role.
        expect(hostInstructions().character).not.toContain('"""');
        expect(hostInstructions().character).not.toContain("\\");
    });

    it("is called in Codex and in Antigravity with each host's own line, when that chat found it, and not where the master voices everyone (D-580)", async () => {
        inPlay(folder);
        const voices = (host: string, characterAgents: Context["characterAgents"]): Promise<string> => runCommandLine(["instructions"], { ...context, host: () => host, characterAgents }).then((result) => result.output);
        const codexLine = "start it with spawn_agent, with agent_type rpg-character, fork_turns none";
        const antigravityLine = "started with invoke_subagent (TypeName rpg-character, Role the character's name, Prompt your words to them)";
        const codex = await voices("codex-mcp-client", { codex: true });
        expect(codex).toContain("## Voices");
        expect(codex).toContain(codexLine);
        expect(codex).not.toContain(antigravityLine);
        const antigravity = await voices("antigravity-client", { antigravity: true });
        expect(antigravity).toContain("## Voices");
        expect(antigravity).toContain(antigravityLine);
        expect(antigravity).not.toContain(codexLine);
        expect(await voices("codex-mcp-client", { antigravity: true })).not.toContain("## Voices");
        await runCommandLine(["config", "voices", "master"], context);
        expect(await voices("codex-mcp-client", { codex: true })).not.toContain("## Voices");
        expect(await voices("antigravity-client", { antigravity: true })).not.toContain("## Voices");
    });

    it("comes with play's part when mode reaches play in a chat that has the agent, as one where session zero is played (playtest 01)", async () => {
        const chat = { ...context, host: () => "claude-code", characterAgents: { claudeCode: true } };
        const steps = [
            ["config", "system", "free"],
            ["config", "mentor", "off"],
            ["config", "premise", "fantasy"],
            ["config", "preparation", "on the fly"],
            ["config", "length", "open"],
            ["config", "difficulty", "normal"],
            ["config", "lethality", "dice"],
            ["config", "saves", "checkpoint"],
            ["config", "rigor", "rules"],
            ["config", "dice", "digital"],
            ["config", "master-rolls", "behind the screen"],
            ["config", "units", "metric"],
            ["config", "character", "made with the player"],
            ["config", "companions", "none"],
            ["config", "calendar-start", "day 1"],
            ["config", "pictures", "none"],
            ["config", "pictures-by", "chat"],
            ["config", "lines", "none"],
            ["config", "veils", "none"],
            ["config", "outcomes", "tossed"],
            ["mode", "session zero"],
        ];

        for (const step of steps) {
            await runCommandLine(step, chat);
        }

        await runCommandLine(["write", "Ada", "--type", "character", "--set", "role=pc", "--set", "concept=Una guaritrice", "--add", "abilities=Erbe"], chat);
        const play = await runCommandLine(["mode", "play"], chat);
        expect(play.output).toContain("## Play");
        expect(play.output).toContain("## Voices");
    });

    it("is gone when the player wants the master to voice every character, and comes back when they want it again", async () => {
        const path = join(folder, ".claude", "agents", "rpg-character.md");
        // At once, not when the server starts again.
        await runCommandLine(["config", "voices", "master"], context);
        expect(existsSync(path)).toBe(false);
        inPlay(folder);
        expect((await runCommandLine(["instructions"], { ...context, host: () => "claude-code", characterAgents: { claudeCode: true } })).output).not.toContain("## Voices");
        await runCommandLine(["config", "voices", "auto"], context);
        expect(existsSync(path)).toBe(true);
        const told = (): Promise<string> => runCommandLine(["instructions"], { ...context, host: () => "claude-code", characterAgents: { claudeCode: true } }).then((result) => result.output);
        expect(await told()).not.toMatch(/at every line they speak/);
        // Always for the main characters, or for everyone, as the player chose: on top of the key moments.
        await runCommandLine(["config", "voices", "important"], context);
        expect(await told()).toContain("those whose page has `kind: main`, answer through the agent at every line they speak");
        await runCommandLine(["config", "voices", "always"], context);
        expect(await told()).toContain("each one answers through the agent at every line they speak");
    });
});
