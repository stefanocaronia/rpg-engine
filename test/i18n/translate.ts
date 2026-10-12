// Completes the page's words in every language the package ships (D-394): each phrase of the page a language's file lacks is translated by Claude Code
// (Sonnet at medium effort, with the developer's own login, without tools, settings or a session kept), kept only when it keeps its {names}, and written to
// src/dashboard/i18n/<code>.json; phrases the page no longer has go. The Italian, curated, shows each phrase's meaning on the page.
//   npm run translate                 every shipped language
//   npm run translate -- --only fr,de
// Not part of the tests; run it after adding or changing phrases, then look at what it wrote.
import { spawn } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { shippedLanguages } from "../../src/dashboard/text.ts";
import { pageFolder, pagePhrases, phraseNames } from "./phrases.ts";

// How many phrases go in one request, and how many requests run at once.
const batchSize = 130;
const together = 6;

const only = process.argv.includes("--only") ? process.argv[process.argv.indexOf("--only") + 1].split(",") : undefined;
const languages = shippedLanguages.filter((language) => only === undefined || only.includes(language));
const phrases = await pagePhrases();
const italian = readPhrases("it");
const jobs = languages.flatMap((language) => {
    const own = readPhrases(language);
    const missing = [...phrases].filter((phrase) => !(phrase in own));
    return Array.from({ length: Math.ceil(missing.length / batchSize) }, (_, index) => ({ language, batch: missing.slice(index * batchSize, (index + 1) * batchSize) }));
});

console.log(`${phrases.size} phrases; ${jobs.length} requests for ${languages.join(", ")}`);
const done = new Map<string, Record<string, string>>();
await inTurn(jobs, async ({ language, batch }) => {
    const answer = await translated(language, batch);
    const kept = Object.fromEntries(batch.flatMap((phrase) => {
        const own = answer[phrase];
        return typeof own === "string" && own.trim() !== "" && phraseNames(own).join() === phraseNames(phrase).join() ? [[phrase, own]] : [];
    }));
    done.set(language, { ...done.get(language), ...kept });
    const unanswered = batch.filter((phrase) => typeof answer[phrase] !== "string").length;
    console.log(`${language}: ${Object.keys(kept).length} of ${batch.length}${unanswered > 0 ? `, ${unanswered} not answered` : ""}`);
});

for (const language of languages) {
    const own = { ...readPhrases(language), ...done.get(language) };
    const written = Object.fromEntries(Object.entries(own).filter(([phrase]) => phrases.has(phrase)).sort(([first], [second]) => first.toLowerCase().localeCompare(second.toLowerCase()) || first.localeCompare(second)));
    writeFileSync(fileOf(language), `${JSON.stringify(written, null, 2)}\n`);
    const left = [...phrases].filter((phrase) => !(phrase in written)).length;
    console.log(`${language}: ${Object.keys(written).length} phrases written${left > 0 ? `, ${left} still missing: run it again` : ""}`);
}

/** A language's phrases from its file; none when it has no file yet. */
function readPhrases(language: string): Record<string, string>
{
    return existsSync(fileOf(language)) ? JSON.parse(readFileSync(fileOf(language), "utf8")) as Record<string, string> : {};
}

function fileOf(language: string): string
{
    return join(pageFolder, "i18n", `${language}.json`);
}

/** Runs the jobs a few at a time. */
async function inTurn<Job>(jobs: Job[], run: (job: Job) => Promise<void>): Promise<void>
{
    const queue = [...jobs];
    await Promise.all(Array.from({ length: together }, async () => {
        for (let job = queue.shift(); job !== undefined; job = queue.shift()) {
            await run(job).catch((error: unknown) => console.error(error instanceof Error ? error.message : String(error)));
        }
    }));
}

/** The phrases in a language, as Claude answers them: an object from each English phrase to its translation; none it could not read. */
function translated(language: string, batch: string[]): Promise<Record<string, unknown>>
{
    const name = new Intl.DisplayNames(["en"], { type: "language" }).of(language) ?? language;
    const pairs = batch.map((phrase) => ({ english: phrase, ...(italian[phrase] === undefined ? {} : { italian: italian[phrase] }) }));
    const brief = [
        `Translate the user interface of a web page into ${name} (${language}). The page is the dashboard of a tabletop role-playing game played with an AI game master`,
        "in a chat: the player's character sheet, the dice and the rolls, the quests and the story, the maps, the saves and the settings.",
        "- Write natural, concise " + name + ", as a well-made game app would: buttons and labels short. Address the player informally, where the language has an informal you.",
        "- Keep every {name} in braces exactly as it is, untranslated; move it where the language wants it.",
        "- Keep names of products and programs as they are: RPG Engine, Codex, Claude, Claude Code, ChatGPT, /clear, and file names such as .saves.",
        '- "the master" is the game master: use the word players of tabletop role-playing games use in ' + name + ".",
        "- Where a phrase speaks of the player or a character, prefer words that do not mark gender.",
        "- Each phrase stands alone: some are single words, labels or values of a setting. The Italian beside a phrase, written for the same page, shows what it means there.",
        "Answer with a JSON object alone, from each English phrase exactly as given to its translation.",
        "",
        JSON.stringify(pairs, null, 1),
    ].join("\n");
    const folder = mkdtempSync(join(tmpdir(), "rpg-translate-"));
    const command = `claude -p --model sonnet --effort medium --output-format json --tools "" --setting-sources "" --strict-mcp-config --no-session-persistence `
        + `--disable-slash-commands --system-prompt "You translate the words of software interfaces. You reply with a JSON object alone."`;

    return new Promise((done) => {
        const child = spawn(command, { shell: true, windowsHide: true, cwd: folder, env: ownEnvironment(), stdio: ["pipe", "pipe", "pipe"] });
        let output = "";
        child.stdout.setEncoding("utf8");
        child.stdout.on("data", (chunk: string) => (output += chunk));
        child.stderr.on("data", () => undefined);
        child.on("close", () => {
            rmSync(folder, { recursive: true, force: true });
            done(answerOf(output));
        });
        child.stdin.end(brief);
    });
}

/** The translations in Claude Code's answer: the JSON object in its result, whatever came around it. */
function answerOf(output: string): Record<string, unknown>
{
    try {
        const result = (JSON.parse(output) as { result?: unknown; }).result;
        const text = typeof result === "string" ? result : "";
        return JSON.parse(text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1)) as Record<string, unknown>;
    } catch {
        return {};
    }
}

/** This process's environment without the chat's own variables or an API key: Claude Code uses the developer's login. */
function ownEnvironment(): NodeJS.ProcessEnv
{
    const kept = new Set(["CLAUDE_CONFIG_DIR", "CLAUDE_CODE_GIT_BASH_PATH"]);
    return Object.fromEntries(Object.entries(process.env).filter(([name]) => kept.has(name.toUpperCase()) || !/^(CLAUDE|ANTHROPIC)/i.test(name)));
}
