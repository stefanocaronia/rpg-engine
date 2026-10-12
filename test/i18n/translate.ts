// Completes the page's words in every language the package ships (D-394), and the words of each game system that has them in Italian (D-403): each phrase of
// the page, or word of a system, that a language's file lacks is translated by Claude Code (Sonnet at medium effort, with the developer's own login, without
// tools, settings or a session kept), kept only when it keeps its {names}, and written to src/dashboard/i18n/<code>.json or systems/<name>/words/<code>.yaml;
// what the page or the Italian list no longer has goes. The Italian, curated, shows what each phrase or word means; the glossary (test/i18n/glossary.json)
// gives the language's voice and the game's terms each batch holds, as its players say them; a system's words follow its official translation where one is.
//   npm run translate                         every shipped language
//   npm run translate -- --only fr,de
//   npm run translate -- --only zh --again    translates again the phrases and words that hold a term of the glossary (never the curated Italian)
//   npm run translate -- --again master,save  only those that hold these terms
// A translation that fails keeps the one the file had; to translate a language anew, delete its file. Not part of the tests: run it after adding or
// changing phrases, the Italian words of a system or the glossary, then look at what it wrote.
import { spawn } from "node:child_process";
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { parse, stringify } from "yaml";
import { fieldLabel } from "../../src/dashboard/labels.ts";
import { shippedLanguages } from "../../src/dashboard/text.ts";
import { pageFolder, pagePhrases, phraseNames } from "./phrases.ts";

/** A game term of the glossary: what it means on the page, the other English forms it takes, and its word in each language by code. */
interface Term
{
    note: string;
    forms?: string[];
    [language: string]: string | string[] | undefined;
}

/** What is translated: a phrase or a word by its id, its English, and the curated Italian that shows what it means. */
interface Entry
{
    id: string;
    english: string;
    italian?: string;
}

/** A file of translations in each language: the page's phrases, or a game system's words; how to read and write it, and what a request must say of it. */
interface Target
{
    name: string;
    entries: Entry[];
    languages: string[];
    read(language: string): Record<string, string>;
    write(language: string, translations: Record<string, string>): void;
    brief(language: string, name: string): string[];
}

// How many entries go in one request, and how many requests run at once.
const batchSize = 130;
const together = 6;
const curated = "it";
const systemsFolder = fileURLToPath(new URL("../../systems/", import.meta.url));
const sections = ["groups", "fields", "words"] as const;

const glossary = JSON.parse(readFileSync(new URL("glossary.json", import.meta.url), "utf8")) as { voice: Record<string, string>; terms: Record<string, Term>; };
const only = listAfter("--only");
const again = process.argv.includes("--again") ? listAfter("--again") ?? Object.keys(glossary.terms) : [];
const unknown = again.filter((term) => !(term in glossary.terms));

if (unknown.length > 0) {
    throw new Error(`No term ${unknown.join(", ")} in test/i18n/glossary.json: --again takes its terms, such as ${Object.keys(glossary.terms).slice(0, 3).join(",")}.`);
}

const languages = shippedLanguages.filter((language) => only === undefined || only.includes(language));
const targets = [await pageTarget(), ...systemTargets()];
const jobs = targets.flatMap((target) =>
    target.languages.filter((language) => languages.includes(language)).flatMap((language) => {
        const own = target.read(language);
        const wanted = target.entries.filter((entry) => !(entry.id in own) || (language !== curated && again.some((term) => names(entry.english, term))));
        return Array.from({ length: Math.ceil(wanted.length / batchSize) }, (_, index) => ({ target, language, batch: wanted.slice(index * batchSize, (index + 1) * batchSize) }));
    })
);

console.log(`${targets.map((target) => `${target.name}: ${target.entries.length}`).join("; ")}; ${jobs.length} requests for ${languages.join(", ")}`);
const done = new Map<string, Record<string, string>>();
await inTurn(jobs, async ({ target, language, batch }) => {
    const answer = await translated(target, language, batch);
    const kept = Object.fromEntries(batch.flatMap((entry) => {
        const own = answer[entry.id];
        return typeof own === "string" && own.trim() !== "" && phraseNames(own).join() === phraseNames(entry.english).join() ? [[entry.id, own]] : [];
    }));
    const key = `${target.name} ${language}`;
    done.set(key, { ...done.get(key), ...kept });
    const unanswered = batch.filter((entry) => typeof answer[entry.id] !== "string").length;
    console.log(`${key}: ${Object.keys(kept).length} of ${batch.length}${unanswered > 0 ? `, ${unanswered} not answered` : ""}`);
});

for (const target of targets) {
    for (const language of target.languages.filter((one) => languages.includes(one))) {
        const own = { ...target.read(language), ...done.get(`${target.name} ${language}`) };
        const written = Object.fromEntries(target.entries.flatMap((entry) => (entry.id in own ? [[entry.id, own[entry.id]]] : [])));
        target.write(language, written);
        const left = target.entries.length - Object.keys(written).length;
        console.log(`${target.name} ${language}: ${Object.keys(written).length} written${left > 0 ? `, ${left} still missing: run it again` : ""}`);
    }
}

/** The page's phrases (D-394): a JSON file for each shipped language, the phrases in order. */
async function pageTarget(): Promise<Target>
{
    const phrases = await pagePhrases();
    const italian = readPhrases(curated);
    return {
        name: "page",
        entries: [...phrases].map((phrase) => ({ id: phrase, english: phrase, ...(italian[phrase] === undefined ? {} : { italian: italian[phrase] }) })),
        languages: shippedLanguages,
        read: readPhrases,
        write: (language, translations) => {
            const sorted = Object.entries(translations).sort(([first], [second]) => first.toLowerCase().localeCompare(second.toLowerCase()) || first.localeCompare(second));
            writeFileSync(phrasesFile(language), `${JSON.stringify(Object.fromEntries(sorted), null, 2)}\n`);
        },
        brief: (language, name) => [
            `Translate the user interface of a web page into ${name} (${language}). The page is the dashboard of a tabletop role-playing game played with an AI`,
            "game master in a chat: the player's character sheet, the dice and the rolls, the quests and the story, the maps, the saves and the settings.",
            "- Write natural, concise " + name + ", as a well-made game app would: buttons and labels short.",
            `- How the page speaks: ${glossary.voice[language] ?? "address the player informally, where the language has an informal you."}`,
            "- Keep every {name} in braces exactly as it is, untranslated; move it where the language wants it.",
            "- Keep names of products and programs as they are: RPG Engine, Codex, Claude, Claude Code, ChatGPT, /clear, and file names such as .saves.",
            "- Where a phrase speaks of the player or a character, prefer words that do not mark gender.",
            "- Each phrase stands alone: some are single words, labels or values of a setting. The Italian beside a phrase, written for the same page, shows what it means there.",
        ],
    };
}

/**
 * The words of each game system that has them in Italian (D-403): a YAML file for each other shipped language beside words/it.yaml, its groups, fields, words
 * and headline in the Italian's order. The Italian, taken from the system's official translation, is the list of what to translate.
 */
function systemTargets(): Target[]
{
    return readdirSync(systemsFolder).filter((name) => existsSync(join(systemsFolder, name, "words", `${curated}.yaml`))).map((name) => {
        const file = (language: string): string => join(systemsFolder, name, "words", `${language}.yaml`);
        const read = (language: string): Record<string, string> => (existsSync(file(language)) ? wordEntries(parse(readFileSync(file(language), "utf8")) as Words) : {});
        const italian = read(curated);
        const system = parse(readFileSync(join(systemsFolder, name, "system.yaml"), "utf8")) as { title?: string; "sheet-headline"?: string; };

        const english = (id: string): string => {
            const [section, key] = splitId(id);
            return section === "headline" ? system["sheet-headline"] ?? "" : section === "fields" ? fieldLabel(key) : key;
        };

        return {
            name: `systems/${name}`,
            entries: Object.keys(italian).map((id) => ({ id, english: english(id), italian: italian[id] })),
            languages: shippedLanguages.filter((language) => language !== curated),
            read,
            write: (language, translations) => {
                const words: Words = Object.fromEntries(sections.map((section) => [section, Object.fromEntries(Object.entries(translations).filter(([id]) => splitId(id)[0] === section).map(([id, word]) => [splitId(id)[1], word]))]));
                const headline = translations.headline === undefined ? {} : { headline: translations.headline };
                const label = new Intl.DisplayNames(["en"], { type: "language" }).of(language) ?? language;
                const head = `# The words of the ${name} system in ${label}, as the dashboard shows them (D-403): translated by npm run translate (test/i18n/translate.ts) from the\n`
                    + "# words of words/it.yaml, which come from the system's official Italian translation; with the terms of the official translation in this language, where one is.\n";
                writeFileSync(file(language), head + stringify({ ...words, ...headline }, { lineWidth: 0 }));
            },
            brief: (language, label) => [
                `Translate the words a game system shows on the dashboard of a tabletop role-playing game into ${label} (${language}). The system is ${system.title ?? name}:`,
                "the fifth edition of the world's oldest fantasy role-playing game, in its System Reference Document 5.1.",
                `- Where the game has an official translation in ${label}, use its terms exactly, as its books write them (the SRD 5.1 itself was published in French,`,
                `  German, Italian and Spanish); else the words its players use in ${label}.`,
                "- Each entry has an id: group (a heading of the character sheet), field (the label of a value of the sheet, short; an ability score as the translation",
                "  abbreviates it, as FOR for Strength in Italian), word (a name the game uses: races, classes, conditions, damage types, sizes, languages, armor and",
                "  weapons a character is proficient in, the words of a setting), headline (the line under a character's name, as Level 3 Cleric).",
                "- Keep each word's case as given: a lowercase word stays lowercase, a capitalized name stays capitalized.",
                "- Keep every {name} in braces exactly as it is; move it where the language wants it.",
                "- The Italian beside an entry, from the official Italian translation, shows what it means.",
            ],
        };
    });
}

/** A system's words file as read: its sections, each from the English to the language's own, and its headline. */
type Words = Partial<Record<(typeof sections)[number], Record<string, string>>> & { headline?: string; };

/** A system's words as entries by id: "fields: str", "words: Cleric", "headline". */
function wordEntries(words: Words): Record<string, string>
{
    return {
        ...Object.fromEntries(sections.flatMap((section) => Object.entries(words[section] ?? {}).map(([key, word]) => [`${section}: ${key}`, String(word)]))),
        ...(words.headline === undefined ? {} : { headline: words.headline }),
    };
}

/** The section and the key of a word's id: ["fields", "str"], or ["headline", ""]. */
function splitId(id: string): [string, string]
{
    const at = id.indexOf(": ");
    return at < 0 ? [id, ""] : [id.slice(0, at), id.slice(at + 2)];
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
function termLines(language: string, name: string, batch: Entry[]): string[]
{
    return Object.entries(glossary.terms).filter(([term]) => batch.some((entry) => names(entry.english, term))).map(([term, entry]) => {
        const forms = entry.forms === undefined ? "" : ` (also ${entry.forms.join(", ")})`;
        const word = typeof entry[language] === "string" ? entry[language] : `the word players use in ${name}`;
        return `  - ${term}${forms}: ${word}. It is ${entry.note}.`;
    });
}

/** A language's phrases from its file; none when it has no file yet. */
function readPhrases(language: string): Record<string, string>
{
    return existsSync(phrasesFile(language)) ? JSON.parse(readFileSync(phrasesFile(language), "utf8")) as Record<string, string> : {};
}

function phrasesFile(language: string): string
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

/** The entries in a language, as Claude answers them: an object from each id to its translation; none it could not read. */
function translated(target: Target, language: string, batch: Entry[]): Promise<Record<string, unknown>>
{
    const name = new Intl.DisplayNames(["en"], { type: "language" }).of(language) ?? language;
    const terms = termLines(language, name, batch);
    const brief = [
        ...target.brief(language, name),
        ...(terms.length === 0 ? [] : [
            `- The game's terms, as players of tabletop role-playing games say them in ${name}: use these words, in the form each entry needs, the same in every entry.`,
            ...terms,
        ]),
        "Answer with a JSON object alone, from each id exactly as given to its translation.",
        "",
        JSON.stringify(batch, null, 1),
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
