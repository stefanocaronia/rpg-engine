// Plays one session of a playtest: an AI master in Claude Code that knows only the campaign, and an AI player that sees only the master's text.
// How to prepare and run it: README.md in this folder.
import { spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { appendFileSync, cpSync, existsSync, mkdirSync, readdirSync, readFileSync, realpathSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, isAbsolute, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";

const usage = [
    "Usage, from the repo (see playtests/README.md):",
    '  node playtests/run-playtest.mjs --campaign <folder> --profile <player.md> --out <folder> --session 1 --first "<the player\'s first message>" [--max 50] [--hard 60] [--budget 15]',
    "  node playtests/run-playtest.mjs --profile <player.md> --out <folder> --questionnaire <questionnaire.md>",
].join("\n");
const options = readOptions();
const repo = fileURLToPath(new URL("..", import.meta.url));
const out = resolve(options.out);
const playerFolder = join(out, "player");
const playerChatFile = join(out, "player-session.txt");
const environment = Object.fromEntries(Object.entries(process.env).filter(([name]) => !name.toUpperCase().startsWith("CLAUDE")));
const playerSchema = JSON.stringify({
    type: "object",
    required: ["message", "endSession"],
    properties: {
        message: { type: "string", description: "what you write to the master" },
        endSession: { type: "boolean", description: "true when you are ending the evening with this message" },
    },
});

try {
    if (options.questionnaire) {
        askQuestionnaire();
    } else {
        playSession();
    }
} catch (error) {
    fail(error.message);
}

/** Checks the repo, the build, the folders and the campaign, then alternates player and master; end.json and the campaign's copy are written however it ends. */
function playSession()
{
    const commit = cleanCommit();
    const campaign = resolve(options.campaign);
    const folder = join(out, `session-${Number(options.session)}`);
    checkFolders(campaign);
    checkCampaign(campaign);
    checkRestart(folder, campaign);
    const rpg = checkBuild();
    mkdirSync(join(folder, "turns"), { recursive: true });
    mkdirSync(playerFolder, { recursive: true });
    const masterSession = { id: randomUUID(), started: false };
    const claudeVersion = claude(["--version"], out, "").stdout.trim();
    writeJson(join(folder, "meta.json"), { started: new Date().toISOString(), commit, rpg, claude: claudeVersion, node: process.version, campaign, masterSession: masterSession.id, options });
    checkIsolation(campaign, join(folder, "context.md"));
    const progress = { stop: "error", count: 0, masterCost: 0, playerRunCost: 0 };

    try {
        playTurns(campaign, folder, masterSession, progress);

        if (progress.stop === "isolation" || progress.stop === "error") {
            throw new Error(`Master turn M${progress.count}: ${progress.detail}. ${progress.stop === "isolation" ? "The run is void: fix the setup and start a new run." : "See the turn in turns/."}`);
        }
    } catch (error) {
        progress.detail = error.message;
        throw error;
    } finally {
        writeJson(join(folder, "end.json"), { at: new Date().toISOString(), ...progress });
        cpSync(campaign, join(folder, "campaign-after"), { recursive: true });
    }

    console.log(`Session ${options.session} ended (${progress.stop}) after ${progress.count} player messages; master $${progress.masterCost.toFixed(2)}, player $${progress.playerRunCost.toFixed(2)} since the run began. Output: ${folder}`);
}

/** After the last session played the player answers the questionnaire in its own chat, which the master never sees; the answers go in that session's folder. */
function askQuestionnaire()
{
    checkFolders();

    if (!existsSync(playerChatFile)) {
        throw new Error(`${out} holds no player's chat: play the sessions first, with the same --out.`);
    }

    const answersFile = join(out, lastSessionFolder(), "questionnaire-answers.md");

    if (existsSync(answersFile)) {
        throw new Error(`${answersFile} already exists: the questionnaire is asked once after a session.`);
    }

    const answers = playerTurn(readFileSync(options.questionnaire, "utf8"), false);
    writeFileSync(answersFile, answers.message + "\n");
}

/** The folder of the last session played in this run, such as session-2. */
function lastSessionFolder()
{
    const numbers = readdirSync(out).filter((name) => existsSync(join(out, name, "end.json"))).map((name) => Number(name.match(/^session-(\d+)$/)?.[1])).filter((number) => number > 0);

    if (numbers.length === 0) {
        throw new Error(`${out} holds no session that ended: play the sessions first, with the same --out.`);
    }

    return `session-${Math.max(...numbers)}`;
}

/** Master and player take turns until the player ends the evening or a limit stops the session; `progress` says how far it got and why it stopped. */
function playTurns(campaign, folder, masterSession, progress)
{
    const max = Number(options.max);
    const hard = Number(options.hard ?? max + 10);
    const lateNote = "(Organizer: it is getting late. End the evening at the next good point, in your own words.)";
    let note = `(Organizer: a new evening begins. You open it by writing «${options.first}»; the master's answer follows.)`;
    let player = { message: options.first, endSession: false };

    for (let count = 1;; count++) {
        progress.count = count;
        record(folder, `P${count}`, player.message);
        const master = masterTurn(campaign, masterSession, player.message, join(folder, "turns", `M${count}.jsonl`));
        record(folder, `M${count}`, master.text);
        progress.masterCost = master.cost;
        const stop = stopReason(master, player.endSession, count >= hard);

        if (stop) {
            progress.stop = stop;
            progress.detail = master.isolation || master.error || undefined;
            return;
        }

        if (count === max) {
            note = [note, lateNote].filter(Boolean).join("\n");
        }

        if (note) {
            record(folder, "Organizer", note);
        }

        player = playerTurn([note, master.text].filter(Boolean).join("\n\n"), true);
        progress.playerRunCost = player.cost;
        note = "";
    }
}

/** Why the session ends after this master turn, if it does: a broken isolation voids the run; then errors, the budget, the player's goodbye, the hard cap. */
function stopReason(master, playerEnded, atHardCap)
{
    if (master.isolation) {
        return "isolation";
    }

    if (master.error) {
        return "error";
    }

    if (master.cost > Number(options.budget)) {
        return "budget";
    }

    if (playerEnded) {
        return "player";
    }

    return atHardCap ? "hard cap" : "";
}

/** Claude Code as a new user would have it, with only the campaign: no personal settings, instructions, plugins, connectors or auto memory. */
function masterArgs()
{
    const isolation = "--setting-sources project,local --strict-mcp-config --mcp-config .mcp.json --permission-mode dontAsk --allowedTools mcp__rpg WebSearch WebFetch";
    return ["--model", options["master-model"], "--settings", '{"autoMemoryEnabled":false}', ...isolation.split(" ")];
}

/** One master turn; returns the text the player sees, the session's cost so far, and what went wrong, if anything. */
function masterTurn(campaign, session, prompt, streamFile)
{
    const args = ["-p", "--output-format", "stream-json", "--verbose", ...masterArgs(), ...(session.started ? ["--resume", session.id] : ["--session-id", session.id])];
    const run = claude(args, campaign, prompt);
    session.started = true;
    writeFileSync(streamFile, run.stdout);
    const events = run.stdout.split("\n").map(parseJson).filter(Boolean);
    const result = events.find((event) => event.type === "result");
    const blocks = events.filter((event) => event.type === "assistant" && !event.parent_tool_use_id).flatMap((event) => event.message.content);
    const text = blocks.filter((block) => block.type === "text").map((block) => block.text.trim()).join("\n\n");
    const failed = run.status !== 0 || !result || result.is_error;
    return { text, cost: result?.total_cost_usd ?? 0, isolation: turnIsolationProblem(events), error: failed ? (run.stderr || result?.result || "no result").trim() : "" };
}

/** What breaks the master's isolation in this turn, from Claude Code's first event: rpg not connected, another server, another model or permission mode. */
function turnIsolationProblem(events)
{
    const start = events.find((event) => event.type === "system" && event.subtype === "init");
    const servers = (start?.mcp_servers ?? []).map((server) => `${server.name} ${server.status}`);
    const problems = [];

    if (servers.join(", ") !== "rpg connected") {
        problems.push(`MCP servers: ${servers.join(", ") || "none"}`);
    }

    if (start?.model !== options["master-model"]) {
        problems.push(`model ${start?.model}`);
    }

    if (start?.permissionMode !== "dontAsk") {
        problems.push(`permission mode ${start?.permissionMode}`);
    }

    return problems.join("; ");
}

/** One player turn: the player sees only the text given here, and answers with its message and, in play, whether it ends the evening. */
function playerTurn(prompt, inPlay)
{
    const resume = existsSync(playerChatFile);
    const id = resume ? readFileSync(playerChatFile, "utf8").trim() : randomUUID();
    const isolation = ["--tools", "", "--setting-sources", "project,local", "--strict-mcp-config"];
    const answerFormat = inPlay ? ["--output-format", "json", "--json-schema", playerSchema] : ["--output-format", "json"];
    const chat = resume ? ["--resume", id] : ["--session-id", id];
    // Claude Code would keep the profile a chat began with; with no snapshot, a profile changed between sessions reaches the player.
    const profile = ["--system-prompt-file", resolve(options.profile), "--system-prompt-snapshot", "off"];
    const args = ["-p", "--model", options["player-model"], ...profile, ...isolation, ...answerFormat, ...chat];
    const run = claude(args, playerFolder, prompt);
    writeFileSync(playerChatFile, id);
    appendFileSync(join(out, "player-turns.jsonl"), run.stdout.trim() + "\n");
    const result = parseJson(run.stdout);
    const answer = inPlay ? result?.structured_output : { message: result?.result };

    if (!result || result.is_error || !answer?.message) {
        throw new Error(`The player did not answer: ${run.stdout || run.stderr}`);
    }

    return { ...answer, cost: result.total_cost_usd ?? 0 };
}

/** The commit under test: the run refuses uncommitted changes, so the report can name exactly what it tested. */
function cleanCommit()
{
    const changes = git("status", "--porcelain");

    if (changes) {
        throw new Error(`The repo has uncommitted changes, so the run could not name the commit it tests. Commit them, then run again:\n${changes}`);
    }

    return git("rev-parse", "HEAD");
}

/** Builds dist/ from the commit and checks that the rpg command the campaign's .mcp.json starts is this build; returns its cli.js. */
function checkBuild()
{
    const build = spawnSync("npm run build", { cwd: repo, shell: true, encoding: "utf8", env: environment });

    if (build.status !== 0) {
        throw new Error(`npm run build failed in ${repo}: fix the build, commit, and run again.\n${build.stdout}${build.stderr}`);
    }

    const linked = join(npmText("root -g"), "rpg-engine");

    if (!existsSync(linked) || !isSame(realpathSync(linked), repo)) {
        throw new Error(`The global rpg is not this repo's build: run npm link in ${repo}.`);
    }

    const onPath = (spawnSync(process.platform === "win32" ? "where" : "which", ["rpg"], { encoding: "utf8", env: environment }).stdout ?? "").split(/\r?\n/)[0].trim();
    const npmBin = process.platform === "win32" ? npmText("prefix -g") : join(npmText("prefix -g"), "bin");

    if (!onPath || !isSame(dirname(onPath), npmBin)) {
        throw new Error(`The rpg command on the PATH is ${onPath || "missing"}, not npm's global one in ${npmBin}: run npm link in ${repo} and remove any other rpg from the PATH.`);
    }

    return realpathSync(join(linked, "dist", "cli.js"));
}

/** The output, and the campaign when given, sit outside the home folder and the repo and apart from each other: Claude Code loads the instructions of every folder above its own. */
function checkFolders(campaign)
{
    for (const folder of [out, campaign].filter(Boolean)) {
        if (isInside(folder, homedir()) || isInside(folder, repo)) {
            throw new Error(`${folder} is inside ${isInside(folder, repo) ? "the repo" : "the home folder"}, whose instructions Claude Code would load too: use a folder outside both.`);
        }
    }

    if (campaign && (isInside(out, campaign) || isInside(campaign, out))) {
        throw new Error(`${out} and ${campaign} must not hold each other: the master would see the transcripts, or the copy would hold itself.`);
    }
}

/** A run only goes forward: each session is played once; session 1 starts a new player's chat on a campaign never played, later sessions continue the chat and the campaign of the session before. */
function checkRestart(folder, campaign)
{
    if (existsSync(folder)) {
        throw new Error(`${folder} already exists: a session is played once. To play it again, start a new run, with a new campaign and a new --out.`);
    }

    if (Number(options.session) === 1) {
        checkUnplayed(campaign);
    } else {
        checkPreviousSession(campaign);
    }
}

/** Session 1 starts from the campaign as the scenario makes it: a new player's chat, nothing logged after the campaign's creation, and no player's character. */
function checkUnplayed(campaign)
{
    if (existsSync(playerChatFile)) {
        throw new Error(`${playerChatFile} is the player's chat of an earlier run: start session 1 with a new --out.`);
    }

    const log = join(campaign, "log.jsonl");
    const logged = (existsSync(log) ? readFileSync(log, "utf8") : "").split("\n").filter((line) => line.trim() !== "" && parseJson(line)?.type !== "campaign-created");
    const playerCharacters = worldPages(campaign).filter((page) => /^role:[ \t]*["']?pc["']?[ \t]*(#.*)?$/m.test(frontmatter(readFileSync(page, "utf8"))));
    const signs = [...(logged.length > 0 ? [`log.jsonl has entries after campaign-created (${logged.length})`] : []), ...playerCharacters.map((page) => `${page} has role: pc`)];

    if (signs.length > 0) {
        throw new Error(`${campaign} has been played already (${signs.join("; ")}): every run starts from a new campaign, made as the scenario's start.md says.`);
    }
}

/** A later session continues the player's chat and the campaign of the session before, which must have ended in play, not on an error or a broken isolation. */
function checkPreviousSession(campaign)
{
    const previous = Number(options.session) - 1;
    const metaFile = join(out, `session-${previous}`, "meta.json");
    const endFile = join(out, `session-${previous}`, "end.json");
    const stop = existsSync(endFile) ? parseJson(readFileSync(endFile, "utf8"))?.stop : undefined;

    if (existsSync(endFile) && !["player", "hard cap", "budget"].includes(stop)) {
        throw new Error(`Session ${previous} stopped on ${JSON.stringify(stop) ?? "nothing readable"} (${endFile}), not in play, so the run cannot go on: start a new run, with a new campaign and a new --out.`);
    }

    const missing = [playerChatFile, metaFile, endFile].filter((file) => !existsSync(file));

    if (missing.length > 0) {
        throw new Error(`Session ${options.session} continues session ${previous}, but ${missing.join(", ")} ${missing.length > 1 ? "are" : "is"} missing: play session ${previous} first, with the same --out.`);
    }

    const playedCampaign = parseJson(readFileSync(metaFile, "utf8"))?.campaign;

    if (!playedCampaign || !isSame(playedCampaign, campaign)) {
        throw new Error(`Session ${options.session} must continue the campaign of session ${previous}, ${playedCampaign ?? `unreadable in ${metaFile}`}, not ${campaign}.`);
    }
}

/** The page files of a campaign's world, where the engine reads pages from. */
function worldPages(campaign)
{
    const world = join(campaign, "world");
    const entries = existsSync(world) ? readdirSync(world, { recursive: true, withFileTypes: true }) : [];
    return entries.filter((entry) => entry.isFile() && /\.md$/i.test(entry.name)).map((entry) => join(entry.parentPath, entry.name));
}

/** The YAML between the first two --- lines of a page, or "" if it has none. */
function frontmatter(text)
{
    return text.replace(/\r\n/g, "\n").match(/^\uFEFF?---[ \t]*\n([\s\S]*?)\n---[ \t]*(?:\n|$)/)?.[1] ?? "";
}

/** The campaign's instructions are this commit's start lines and nothing else: AGENTS.md sends the master to the instructions and status tools, CLAUDE.md only imports it, and no Claude Code settings or local instructions sit beside them. */
function checkCampaign(campaign)
{
    const text = (name) => existsSync(join(campaign, name)) ? readFileSync(join(campaign, name), "utf8").replace(/\r\n/g, "\n") : undefined;

    if (text("campaign.yaml") === undefined) {
        throw new Error(`${campaign} is not a campaign: make it as the scenario's start.md says.`);
    }

    if (text("AGENTS.md") !== readFileSync(join(repo, "instructions", "start.md"), "utf8").replace(/\r\n/g, "\n")) {
        throw new Error(`${join(campaign, "AGENTS.md")} is not this commit's instructions/start.md: copy it again.`);
    }

    if (text("CLAUDE.md") !== "@AGENTS.md\n") {
        throw new Error(`${join(campaign, "CLAUDE.md")} must hold only the line @AGENTS.md: write it again.`);
    }

    const extras = [".claude", "CLAUDE.local.md"].filter((name) => existsSync(join(campaign, name)));

    if (extras.length > 0) {
        throw new Error(`The campaign holds ${extras.join(" and ")}, which Claude Code would load: remove it.`);
    }
}

/** Stops unless the master would load exactly the campaign's CLAUDE.md and AGENTS.md and only the rpg server; /context costs nothing. */
function checkIsolation(campaign, contextFile)
{
    const run = claude(["-p", "/context", "--output-format", "json", "--no-session-persistence", ...masterArgs()], campaign, "");
    const context = parseJson(run.stdout)?.result;

    if (typeof context !== "string") {
        throw new Error(`Claude Code did not answer /context in ${campaign}: ${run.stderr || run.stdout}`);
    }

    writeFileSync(contextFile, context);
    const memoryFiles = memoryFilesOf(context);
    const servers = new Set([...context.matchAll(/\| mcp__(.+?)__/g)].map((match) => match[1]));
    const expected = ["CLAUDE.md", "AGENTS.md"].map((name) => join(campaign, name));
    const problems = [
        ...memoryFiles.filter((file) => !expected.some((path) => isSame(file, path))),
        ...expected.filter((path) => !memoryFiles.some((file) => isSame(file, path))).map((path) => `${path} not loaded`),
        ...[...servers].filter((server) => server !== "rpg"),
        ...(servers.has("rpg") ? [] : ["the rpg server is missing"]),
        ...(context.includes("### Custom Agents") ? ["custom agents"] : []),
    ];

    if (problems.length > 0) {
        throw new Error(`The master is not isolated: ${problems.join(", ")}. See ${contextFile}; fix the setup, delete ${dirname(contextFile)} and run again.`);
    }
}

/** The path of every row of /context's "Memory Files" table, whatever its type: user, project, local, auto memory or any other. */
function memoryFilesOf(context)
{
    const table = context.replace(/\r\n/g, "\n").split(/^### Memory Files[ \t]*$/m)[1]?.split(/\n#/)[0] ?? "";
    const rows = table.split("\n").filter((line) => line.startsWith("|") && !/^\|[\s:|-]*$/.test(line)).slice(1);
    return rows.map((row) => row.split("|")[2]?.trim() || row);
}

/** Runs Claude Code without the CLAUDE* variables of the shell it was started from, so a session it runs in cannot leak into the playtest. */
function claude(args, cwd, input)
{
    const run = spawnSync("claude", args, { cwd, input, encoding: "utf8", env: environment, maxBuffer: 256 * 1024 * 1024 });

    if (run.error) {
        throw new Error(`Could not start claude (${run.error.message}): install Claude Code and log in.`);
    }

    return { status: run.status, stdout: run.stdout ?? "", stderr: run.stderr ?? "" };
}

function readOptions()
{
    try {
        const { values } = parseArgs({
            options: {
                campaign: { type: "string" },
                profile: { type: "string" },
                out: { type: "string" },
                session: { type: "string", default: "1" },
                first: { type: "string" },
                max: { type: "string", default: "50" },
                hard: { type: "string" },
                budget: { type: "string", default: "15" },
                questionnaire: { type: "string" },
                "master-model": { type: "string", default: "claude-opus-5-5" },
                "player-model": { type: "string", default: "claude-sonnet-5-5" },
            },
        });
        const required = values.questionnaire ? ["profile", "out"] : ["campaign", "profile", "out", "first"];
        const missing = required.filter((name) => !values[name]);
        const notCounts = ["session", "max", "hard"].filter((name) => values[name] !== undefined && !(Number.isInteger(Number(values[name])) && Number(values[name]) > 0));
        const notFiles = ["profile", "questionnaire"].filter((name) => values[name] && !existsSync(values[name]));

        if (missing.length > 0) {
            throw new Error(`Missing ${missing.map((name) => `--${name}`).join(", ")}.`);
        }

        if (notCounts.length > 0 || !(Number(values.budget) > 0)) {
            throw new Error("--session, --max and --hard take a whole number from 1, --budget a number of dollars above 0.");
        }

        if (notFiles.length > 0) {
            throw new Error(notFiles.map((name) => `--${name} ${values[name]}: no such file.`).join(" "));
        }

        return values;
    } catch (error) {
        fail(`${error.message}\n\n${usage}`);
    }
}

function record(folder, label, text)
{
    appendFileSync(join(folder, "dialogue.md"), `**${label}**\n\n${text}\n\n`);
}

function git(...args)
{
    const run = spawnSync("git", ["-C", repo, ...args], { encoding: "utf8", env: environment });

    if (run.status !== 0) {
        throw new Error(`git ${args.join(" ")} failed in ${repo}: ${run.stderr || run.error?.message}`);
    }

    return run.stdout.trim();
}

function npmText(command)
{
    const run = spawnSync(`npm ${command}`, { shell: true, encoding: "utf8", env: environment });

    if (run.status !== 0 || !run.stdout.trim()) {
        throw new Error(`npm ${command} failed: ${run.stderr || run.error?.message}`);
    }

    return run.stdout.trim();
}

function writeJson(path, value)
{
    writeFileSync(path, JSON.stringify(value, null, 2) + "\n");
}

function parseJson(text)
{
    try {
        return JSON.parse(text);
    } catch {
        return undefined;
    }
}

function isInside(path, folder)
{
    const fromFolder = relative(folder, path);
    return fromFolder === "" || (!fromFolder.startsWith("..") && !isAbsolute(fromFolder));
}

function isSame(path, other)
{
    return relative(path, other) === "";
}

function fail(message)
{
    console.error(`run-playtest: ${message}`);
    process.exit(1);
}
