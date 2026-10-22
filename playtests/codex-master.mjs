// The master played by Codex instead of Claude Code (--master-host codex): `codex exec` in the campaign, resumed turn by turn, as a new user would have it,
// with only the campaign: a Codex home of its own holding the login and the campaign's trust, so that Codex reads the AGENTS.md and the .codex/config.toml
// rpg init wrote, and nothing of the developer's. Each turn's events are written in Claude Code's stream shape, so that count-playtest.mjs reads them as they are.
import { spawnSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { delimiter, join } from "node:path";

// Shell commands may only read: the master writes through rpg alone, which the campaign's config approves.
const config = ["-c", 'sandbox_mode="read-only"'];

/** A Codex home for the run, in its output folder: the login copied from the user's, and the campaign trusted, so that its own config is read. */
export function codexHome(out, campaign)
{
    const home = join(out, "codex-home");
    const login = join(process.env.CODEX_HOME ?? join(homedir(), ".codex"), "auth.json");

    if (!existsSync(login)) {
        throw new Error(`Codex is not logged in (no ${login}): run codex and log in, then run again.`);
    }

    mkdirSync(home, { recursive: true });
    copyFileSync(login, join(home, "auth.json"));
    writeFileSync(join(home, "config.toml"), `[projects.${JSON.stringify(campaign)}]\ntrust_level = "trusted"\n`);
    return home;
}

/** Codex's version, for meta.json. */
export function codexVersion(environment)
{
    const [command, first] = codexCommand();
    return spawnSync(command, [...first, "--version"], { encoding: "utf8", env: environment }).stdout?.trim() ?? "";
}

/**
 * One master turn by Codex; `session` keeps the thread across turns. Returns the events in Claude Code's shape, the text the player sees and what went wrong:
 * a tool of a server other than rpg breaks the isolation.
 */
export function codexTurn({ campaign, home, environment, session, prompt, oss })
{
    const started = Date.now();
    // A local model through Ollama (--master-oss): Codex knows no metadata for it, so the rpg tools are given whole instead of behind a tool search it lacks.
    const local = oss === undefined ? [] : ["-c", 'model_provider="ollama"', "-m", oss, "--disable", "tool_search_always_defer_mcp_tools"];
    const args = session.started ? ["exec", "resume", session.id, "--json", "--skip-git-repo-check", ...config, ...local, "-"] : ["exec", "--json", "--skip-git-repo-check", ...config, ...local, "-"];
    const [command, first] = codexCommand();
    const run = spawnSync(command, [...first, ...args], { cwd: campaign, input: prompt, encoding: "utf8", env: { ...environment, CODEX_HOME: home }, maxBuffer: 1 << 28 });
    const raw = (run.stdout ?? "").split("\n").map((line) => {
        try {
            return JSON.parse(line);
        } catch {
            return undefined;
        }
    }).filter(Boolean);
    const thread = raw.find((event) => event.type === "thread.started")?.thread_id;

    if (!session.started && thread !== undefined) {
        session.id = thread;
        session.started = true;
    }

    const items = raw.filter((event) => event.type === "item.completed").map((event) => event.item);
    const done = raw.find((event) => event.type === "turn.completed");
    const text = items.filter((item) => item.type === "agent_message").map((item) => item.text.trim()).join("\n\n");
    const otherServers = items.filter((item) => item.type === "mcp_tool_call" && item.server !== "rpg").map((item) => `${item.server}.${item.tool}`);
    const error = run.status !== 0 || done === undefined ? (run.stderr || run.error?.message || "no turn.completed").trim().slice(-1500) : "";
    const events = [...items.flatMap(claudeShaped), { type: "result", num_turns: items.length, duration_ms: Date.now() - started, total_cost_usd: 0, usage: done?.usage ?? {} }];
    return { raw, events, text, cost: 0, isolation: otherServers.length > 0 ? `tools of other servers: ${otherServers.join(", ")}` : "", error };
}

/** How to start Codex: on Windows npm's codex is a .cmd, which needs a shell, so its script is run with node instead; elsewhere codex itself. */
function codexCommand()
{
    if (process.platform !== "win32") {
        return ["codex", []];
    }

    const script = (process.env.PATH ?? "").split(delimiter).map((folder) => join(folder, "node_modules", "@openai", "codex", "bin", "codex.js")).find((file) => existsSync(file));

    if (script === undefined) {
        throw new Error("Codex is not installed where npm puts it (node_modules/@openai/codex beside codex.cmd on the PATH): install it with npm install -g @openai/codex.");
    }

    return [process.execPath, [script]];
}

/** An item of Codex's turn as Claude Code streams the same: its text, or a tool's call and result. */
function claudeShaped(item)
{
    if (item.type === "agent_message") {
        return [{ type: "assistant", message: { id: item.id, content: [{ type: "text", text: item.text }] } }];
    }

    const call = item.type === "mcp_tool_call"
        ? { name: `mcp__${item.server}__${item.tool}`, input: item.arguments ?? {}, content: item.result?.content ?? [{ type: "text", text: item.error?.message ?? "" }], failed: item.status !== "completed" || item.result?.isError === true }
        : item.type === "command_execution"
        ? { name: "Bash", input: { command: item.command }, content: [{ type: "text", text: item.aggregated_output ?? "" }], failed: item.exit_code !== 0 }
        : undefined;

    if (call === undefined) {
        return [];
    }

    return [
        { type: "assistant", message: { id: item.id, content: [{ type: "tool_use", id: item.id, name: call.name, input: call.input }] } },
        { type: "user", message: { content: [{ type: "tool_result", tool_use_id: item.id, content: call.content, is_error: call.failed }] } },
    ];
}
