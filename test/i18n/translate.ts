// Completes the page's words in every language the package ships (D-394): each phrase of the page a language's file lacks is translated by Claude Code
// (Sonnet at medium effort, with the developer's own login, without tools, settings or a session kept), kept only when it keeps its {names}, and written to
// src/dashboard/i18n/<code>.json; phrases the page no longer has go. The Italian, curated, shows each phrase's meaning on the page; the glossary
// (test/i18n/glossary.json) gives the language's voice and the game's terms each batch holds, as its players say them.
//   npm run translate                         every shipped language
//   npm run translate -- --only fr,de
//   npm run translate -- --only zh --again    translates again the phrases that hold a term of the glossary (never the curated Italian)
//   npm run translate -- --again master,save  only those that hold these terms
// A translation that fails keeps the one the file had; to translate a language anew, delete its file. Not part of the tests: run it after adding or
// changing phrases or the glossary, then look at what it wrote.
import { spawn } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { shippedLanguages } from "../../src/dashboard/text.ts";
import { pageFolder, pagePhrases, phraseNames } from "./phrases.ts";

/** A game term of the glossary: what it means on the page, the other English forms it takes, and its word in each language by code. */
interface Term
{
    note: string;
    forms?: string[];
    [language: string]: string | string[] | undefined;
}

// How many phrases go in one request, and how many requests run at once.
const batchSize = 130;
const together = 6;
const curated = "it";

const glossary = JSON.parse(readFileSync(new URL("glossary.json", import.meta.url), "utf8")) as { voice: Record<string, string>; terms: Record<string, Term>; };
const only = listAfter("--only");
const again = process.argv.includes("--again") ? listAfter("--again") ?? Object.keys(glossary.terms) : [];
const unknown = again.filter((term) => !(term in glossary.terms));

if (unknown.length > 0) {
    throw new Error(`No term ${unknown.join(", ")} in test/i18n/glossary.json: --again takes its terms, such as ${Object.keys(glossary.terms).slice(0, 3).join(",")}.`);
}

const languages = shippedLanguages.filter((language) => only === undefined || only.includes(language));
const phrases = await pagePhrases();
const italian = readPhrases(curated);
const jobs = languages.flatMap((language) => {
    const own = readPhrases(language);
    const wanted = [...phrases].filter((phrase) => !(phrase in own) || (language !== curated && again.some((term) => names(phrase, term))));
    return Array.from({ length: Math.ceil(wanted.length / batchSize) }, (_, index) => ({ language, batch: wanted.slice(index * batchSize, (index + 1) * batchSize) }));
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

/** The comma-separated list after an option, when one follows it. */
function listAfter(option: string): string[] | undefined
{
    const value = process.argv[process.argv.indexOf(option) + 1];
    return process.argv.includes(option) && value !== undefined && !value.startsWith("--") ? value.split(",") : undefined;
}

/** Whether a phrase names a term of the glossary, by the term, its plural or one of its forms, its {names} aside. */
function names(phrase: string, term: string): boolean
{
    const words = phrase.replace(/\{\w+\}/g, " ");
    return [`${term}(?:s|es)?`, ...glossary.terms[term].forms ?? []].some((form) => new RegExp(`\\b${form}\\b`, "i").test(words));
}

/** The brief's lines on the game's terms a batch holds: each with its word in the language, or the players' own when the glossary has none. */
function termLines(language: string, name: string, batch: string[]): string[]
{
    return Object.entries(glossary.terms).filter(([term]) => batch.some((phrase) => names(phrase, term))).map(([term, entry]) => {
        const forms = entry.forms === undefined ? "" : ` (also ${entry.forms.join(", ")})`;
        const word = typeof entry[language] === "string" ? entry[language] : `the word players use in ${name}`;
        return `  - ${term}${forms}: ${word}. It is ${entry.note}.`;
    });
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
    const terms = termLines(language, name, batch);
    const brief = [
        `Translate the user interface of a web page into ${name} (${language}). The page is the dashboard of a tabletop role-playing game played with an AI game master`,
        "in a chat: the player's character sheet, the dice and the rolls, the quests and the story, the maps, the saves and the settings.",
        "- Write natural, concise " + name + ", as a well-made game app would: buttons and labels short.",
        `- How the page speaks: ${glossary.voice[language] ?? "address the player informally, where the language has an informal you."}`,
        ...(terms.length === 0 ? [] : [
            `- The game's terms, as players of tabletop role-playing games say them in ${name}: use these words, in the form each phrase needs, the same in every phrase.`,
            ...terms,
        ]),
        "- Keep every {name} in braces exactly as it is, untranslated; move it where the language wants it.",
        "- Keep names of products and programs as they are: RPG Engine, Codex, Claude, Claude Code, ChatGPT, /clear, and file names such as .saves.",
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
