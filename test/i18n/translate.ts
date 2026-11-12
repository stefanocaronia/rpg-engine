// Completes the page's words in every language the package ships (D-394), the words of each game system or extension that has them in Italian (D-403,
// D-502), and the guide (D-413), translated from the English where a language lacks a part or has one from an older English, only the paragraphs that
// changed, kept only when they keep the English's headings, links and code (test/i18n/guide.ts). Each phrase of the page, or word of a package, that a
// language's file lacks is translated by Claude Code (Sonnet at medium effort, with the developer's own login, without tools, settings or a session kept),
// kept only when it keeps its {names}, and written to src/dashboard/i18n/<code>.json or <package>/words/<code>.yaml; what the page or the Italian list no
// longer has goes. The Italian, curated, shows what each phrase or word means; the glossary (test/i18n/glossary.json) gives the language's voice and the
// game's terms each batch holds, as its players say them; a system's words follow its official translation where one is.
//   npm run translate                         every shipped language
//   npm run translate -- --only fr,de
//   npm run translate -- --only zh --again    translates again the phrases and words that hold a term of the glossary (never the curated Italian)
//   npm run translate -- --again master,save  only those that hold these terms
//   npm run translate -- --package ../rpg-engine-5e,../rpg-engine-weather   the words of packages in their own repositories, in place of the engine's systems
// A translation that fails keeps the one the file had; to translate a language anew, delete its file. Not part of the tests: run it after adding or
// changing phrases, the Italian words of a package or the glossary, then look at what it wrote.
import { spawn } from "node:child_process";
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parse, parseDocument, stringify } from "yaml";
import { fieldLabel } from "../../src/dashboard/parts/labels.ts";
import { shippedLanguages } from "../../src/dashboard/text.ts";
import { englishGuide, guideFolder, guideIn, guideParts, guidePlan, guideShape, isUpToDate, markOf, paragraphsOf, translationHead } from "./guide.ts";
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

/** A file of translations in each language: the page's phrases, or a package's words; how to read and write it, and what a request must say of it. */
interface Target
{
    name: string;
    entries: Entry[];
    /** How many entries go in one request: a package's words all at once, so that one concept has one term in every entry. */
    batch: number;
    languages: string[];
    read(language: string): Record<string, string>;
    write(language: string, translations: Record<string, string>): void;
    brief(language: string, name: string): string[];
    /** The words a request shows beside a batch, to keep their terms: the file's own in the language, and the game system's an extension is made for. */
    context?(language: string, batch: Entry[]): string[];
}

// How many phrases of the page go in one request, and how many requests run at once.
const batchSize = 130;
const together = 6;
const curated = "it";
const systemsFolder = fileURLToPath(new URL("../../systems/", import.meta.url));
// The line before each paragraph of the guide asked and answered alone.
const paragraphMark = "<!-- next paragraph -->";

const glossary = JSON.parse(readFileSync(new URL("glossary.json", import.meta.url), "utf8")) as { voice: Record<string, string>; terms: Record<string, Term>; };
const only = listAfter("--only");
const again = process.argv.includes("--again") ? listAfter("--again") ?? Object.keys(glossary.terms) : [];
// The folders of packages in their own repositories, game systems or extensions, whose words to translate, in place of the engine's systems.
const givenPackages = listAfter("--package")?.map((folder) => resolve(folder));
const unknown = again.filter((term) => !(term in glossary.terms));

if (process.argv.includes("--system")) {
    throw new Error("--system is now --package, which takes the folders of game systems and extensions alike: npm run translate -- --package ../rpg-engine-5e.");
}

if (unknown.length > 0) {
    throw new Error(`No term ${unknown.join(", ")} in test/i18n/glossary.json: --again takes its terms, such as ${Object.keys(glossary.terms).slice(0, 3).join(",")}.`);
}

const languages = shippedLanguages.filter((language) => only === undefined || only.includes(language));
const targets = [await pageTarget(), ...packageTargets()];
const jobs = targets.flatMap((target) =>
    target.languages.filter((language) => languages.includes(language)).flatMap((language) => {
        const own = target.read(language);
        const wanted = target.entries.filter((entry) => !(entry.id in own) || (language !== curated && again.some((term) => names(entry.english, term))));
        return Array.from({ length: Math.ceil(wanted.length / target.batch) }, (_, index) => ({ target, language, batch: wanted.slice(index * target.batch, (index + 1) * target.batch) }));
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
        const before = target.read(language);
        const own = { ...before, ...done.get(`${target.name} ${language}`) };
        const written = Object.fromEntries(target.entries.flatMap((entry) => (entry.id in own ? [[entry.id, own[entry.id]]] : [])));
        const left = target.entries.length - Object.keys(written).length;
        const missing = left > 0 ? `, ${left} still missing: run it again` : "";

        // A file that would come out the same is left as it is.
        if (sameEntries(before, written)) {
            console.log(`${target.name} ${language}: up to date${missing}`);
            continue;
        }

        target.write(language, written);
        console.log(`${target.name} ${language}: ${Object.keys(written).length} written${missing}`);
    }
}

await translateGuides();

/** The page's phrases (D-394): a JSON file for each shipped language, the phrases in order. */
async function pageTarget(): Promise<Target>
{
    const phrases = await pagePhrases();
    const italian = readPhrases(curated);
    return {
        name: "page",
        entries: [...phrases].map((phrase) => ({ id: phrase, english: phrase, ...(italian[phrase] === undefined ? {} : { italian: italian[phrase] }) })),
        batch: batchSize,
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
 * The words of each package that has them in Italian (D-403, D-502): a YAML file for each other shipped language beside words/it.yaml, in the Italian's order.
 * The Italian, taken from a game's official translation where it has one, is the list of what to translate.
 */
function packageTargets(): Target[]
{
    const folders = givenPackages ?? readdirSync(systemsFolder).map((name) => join(systemsFolder, name));
    return folders.filter((folder) => existsSync(join(folder, "words", `${curated}.yaml`))).map((folder) => wordsTarget(folder, existsSync(join(folder, "extension.yaml")) ? extensionWords(folder) : systemWords(folder)));
}

/** What a package's words hold: their sections and their single entries, the English of an entry, and what a request says of them. */
interface WordsKind
{
    kind: string;
    title: string;
    sections: string[];
    singles: string[];
    english(id: string, englishWords: Record<string, string>): string;
    brief(language: string, label: string): string[];
    /** The game system an extension is made for, by its name, whose words in the language a request shows. */
    system?: string;
}

/** A game system's words: its groups, fields, words, names and headline. */
function systemWords(folder: string): WordsKind
{
    const system = parse(readFileSync(join(folder, "system.yaml"), "utf8")) as { title?: string; "sheet-headline"?: string; };
    return {
        kind: "system",
        title: system.title ?? packageName(folder),
        sections: ["groups", "fields", "words", "names"],
        singles: ["headline"],
        english: (id, englishWords) => {
            const [section, key] = splitId(id);
            return section === "headline" ? system["sheet-headline"] ?? "" : section === "fields" ? fieldLabel(key) : section === "names" ? englishWords[id] ?? key : key;
        },
        brief: (language, label) => [
            `Translate the words a game system shows on the dashboard of a tabletop role-playing game into ${label} (${language}). The system is ${system.title ?? packageName(folder)}.`,
            `- Where the game has an official translation in ${label}, use its terms exactly, as its books write them; else the words its players use in ${label}.`,
            "- Each entry has an id: group (a heading of the character sheet), field (the label of a value of the sheet, short; an ability score as the translation",
            "  abbreviates it, as FOR for Strength in Italian), word (a name the game uses: races, classes, conditions, damage types, sizes, languages, armor and",
            "  weapons a character is proficient in, the words of a setting), name (the whole name of a field whose label is short, as a roll tells it:",
            "  Charisma for cha, Charisma saving throw for cha-save), headline (the line under a character's name, as Level 3 Cleric).",
            "- One concept, one term in every entry: a skill, a condition, an armor or a rest is written the same as a field, as a word, alone or in a list,",
            "  only its case following the entry's. An entry such as until long rest or difficult terrain is a whole phrase: bend the words as the language needs.",
            "- Keep each word's case as given: a lowercase word stays lowercase, a capitalized name stays capitalized.",
            "- Keep every {name} in braces exactly as it is; move it where the language wants it.",
            "- The Italian beside an entry shows what it means.",
        ],
    };
}

/** An extension's words: its title and about, the names of the fields it adds, and the texts its widgets and questions write. */
function extensionWords(folder: string): WordsKind
{
    const extension = parse(readFileSync(join(folder, "extension.yaml"), "utf8")) as { title?: string; about?: string; needs?: { system?: string; }; };
    const made = extension.needs?.system === undefined ? "" : `, made for the game system ${extension.needs.system}`;
    return {
        kind: "extension",
        title: extension.title ?? packageName(folder),
        system: extension.needs?.system,
        sections: ["fields", "words"],
        singles: ["title", "about"],
        english: (id) => {
            const [section, key] = splitId(id);
            return section === "title" ? extension.title ?? "" : section === "about" ? extension.about ?? "" : section === "fields" ? fieldLabel(key) : key;
        },
        brief: (language, label) => [
            `Translate the words an extension shows on the dashboard of a tabletop role-playing game into ${label} (${language}). The extension is ${extension.title ?? packageName(folder)}${made}.`,
            "- Each entry has an id: title and about (its name and its line on the dashboard's page of packages), field (the name of a value it adds to the",
            "  character sheet or to a page), word (a text its cards and questions write: a label, a button, a line of what happened).",
            `- Write natural, concise ${label}, as a well-made game app would: buttons and labels short. The game's terms as its players say them in ${label}.`,
            "- One concept, one term in every entry, and the term the extension's own words and its game system's already use in the language.",
            `- The punctuation of ${label}: its own colon, comma and quotes. A question or a button addresses the player as the dashboard does, without marking gender.`,
            "- Keep each word's case as given: a lowercase word stays lowercase, a capitalized name stays capitalized.",
            "- Keep every {name} in braces exactly as it is; move it where the language wants it.",
            "- The Italian beside an entry shows what it means.",
        ],
    };
}

/** A package's words as a target: read and written in its words folder, its file in a language changed only where its words do. */
function wordsTarget(folder: string, kind: WordsKind): Target
{
    const name = packageName(folder);
    const file = (language: string): string => join(folder, "words", `${language}.yaml`);
    const read = (language: string): Record<string, string> => (existsSync(file(language)) ? wordEntries(parse(readFileSync(file(language), "utf8")) as Words, kind) : {});
    const italian = read(curated);
    const englishWords = read("en");
    return {
        name: givenPackages === undefined ? `systems/${name}` : folder,
        entries: Object.keys(italian).map((id) => ({ id, english: kind.english(id, englishWords), italian: italian[id] })),
        batch: Math.max(1, Object.keys(italian).length),
        languages: shippedLanguages.filter((language) => language !== curated && language !== "en"),
        read,
        write: (language, translations) => {
            const label = new Intl.DisplayNames(["en"], { type: "language" }).of(language) ?? language;
            const head = `# The words of the ${name} ${kind.kind} in ${label}, as the dashboard shows them: translated by npm run translate (test/i18n/translate.ts) from the\n`
                + "# words of words/it.yaml; with the terms of the game's official translation in this language, where one is.\n";
            // A file there already changes only where its words do: its comments and its order stay.
            writeFileSync(file(language), existsSync(file(language)) ? changedWords(readFileSync(file(language), "utf8"), read(language), translations) : head + stringify(wordsOf(translations, kind), { lineWidth: 0 }));
        },
        brief: kind.brief,
        context: (language, batch) => {
            const label = new Intl.DisplayNames(["en"], { type: "language" }).of(language) ?? language;
            const own = Object.fromEntries(Object.entries(read(language)).filter(([id]) => !batch.some((entry) => entry.id === id)));
            const system = kind.system === undefined ? {} : systemWordsIn(kind.system, language);
            return [
                ...(Object.keys(own).length === 0 ? [] : [`- Already in this file in ${label}, to keep their terms (not to translate again): ${JSON.stringify(own)}`]),
                ...(Object.keys(system).length === 0 ? [] : [`- The words of the game system ${kind.system} in ${label}, whose terms to use: ${JSON.stringify(system)}`]),
            ];
        },
    };
}

/** The words of a game system in a language, from its folder among the packages given or the engine's systems; none where it is not found. */
function systemWordsIn(system: string, language: string): Record<string, string>
{
    const folders = [...givenPackages ?? [], ...readdirSync(systemsFolder).map((name) => join(systemsFolder, name))];
    const folder = folders.find((one) => existsSync(join(one, "system.yaml")) && packageName(one) === system);
    return folder === undefined ? {} : wordsTarget(folder, systemWords(folder)).read(language);
}

/** A package's words file as read: its single entries, and its sections, each from the English to the language's own. */
type Words = Record<string, string | Record<string, string> | undefined>;

/** A package's words as entries by id: "fields: str", "words: Cleric", "headline". */
function wordEntries(words: Words, kind: WordsKind): Record<string, string>
{
    const section = (name: string): Record<string, string> => (typeof words[name] === "object" && words[name] !== null ? words[name] : {});
    return {
        ...Object.fromEntries(kind.singles.flatMap((single) => (typeof words[single] === "string" ? [[single, words[single]]] : []))),
        ...Object.fromEntries(kind.sections.flatMap((name) => Object.entries(section(name)).map(([key, word]) => [`${name}: ${key}`, String(word)]))),
    };
}

/** A package's words file from its entries by id, its single entries first, then its sections. */
function wordsOf(translations: Record<string, string>, kind: WordsKind): Words
{
    const singles = Object.fromEntries(kind.singles.flatMap((single) => (translations[single] === undefined ? [] : [[single, translations[single]]])));
    const sections = kind.sections.map((section) => [section, Object.fromEntries(Object.entries(translations).flatMap(([id, word]) => (splitId(id)[0] === section ? [[splitId(id)[1], word]] : [])))]);
    return { ...singles, ...Object.fromEntries(sections) };
}

/** Whether two files of translations hold the same entries, in any order. */
function sameEntries(one: Record<string, string>, other: Record<string, string>): boolean
{
    return Object.keys(one).length === Object.keys(other).length && Object.entries(one).every(([id, text]) => other[id] === text);
}

/** A package's words file with its entries changed to these, the others gone, as its YAML document: its comments and its order kept. */
function changedWords(text: string, before: Record<string, string>, after: Record<string, string>): string
{
    const document = parseDocument(text);
    const path = (id: string): string[] => (splitId(id)[1] === "" ? [id] : splitId(id));
    Object.keys(before).filter((id) => !(id in after)).forEach((id) => document.deleteIn(path(id)));
    Object.entries(after).filter(([id, word]) => before[id] !== word).forEach(([id, word]) => document.setIn(path(id), word));
    return document.toString({ lineWidth: 0 });
}

/** The section and the key of a word's id: ["fields", "str"], or ["headline", ""]. */
function splitId(id: string): [string, string]
{
    const at = id.indexOf(": ");
    return at < 0 ? [id, ""] : [id.slice(0, at), id.slice(at + 2)];
}

/** A package's name as a campaign gives it: its npm name without its scope and its "system-" (@rpgengine/system-5e is 5e), else its folder's. */
function packageName(folder: string): string
{
    const manifest = join(folder, "package.json");
    const packageName = existsSync(manifest) ? (JSON.parse(readFileSync(manifest, "utf8")) as { name?: string; }).name : undefined;
    return basename(packageName ?? folder).replace(/^system-/, "");
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

/**
 * The guide in each language (D-413): the parts a language lacks, or whose English changed whole, in one request for the language; the paragraphs whose
 * English changed in another, with their part in English and as translated now; with the page's words they name and the game's terms. The rest is kept as
 * it is, by the marks of its English. Written only when what was translated keeps the English's headings, links and code.
 */
async function translateGuides(): Promise<void>
{
    const english = englishGuide();
    const parts = guideParts(english);
    const jobs = languages.map((language) => ({ language, own: guideIn(language) ?? "", plan: guidePlan(english, guideIn(language) ?? "") }));
    const stale = jobs.filter((job) => !isUpToDate(job.own, english)).length;
    console.log(`guide: ${stale === 0 ? "every language up to date" : `${stale} languages to bring up to date`}`);
    await inTurn(jobs, async ({ language, own, plan }) => {
        const wholes = parts.filter((_, index) => "whole" in (plan[index] ?? {}));
        const pieces = parts.flatMap((part, index) => {
            const planned = plan[index];
            return planned !== undefined && "paragraphs" in planned ? [{ english: part, context: planned.context, paragraphs: planned.paragraphs }] : [];
        });
        const changed = pieces.flatMap((piece) => {
            const part = (piece.english.split("\n")[0] ?? "").replace(/<!--.*?-->/g, "").trim();
            return paragraphsOf(piece.english).flatMap((text, at) => (piece.paragraphs[at] === undefined ? [{ text, part }] : []));
        });
        const translated = wholes.length === 0 ? [] : await translatedParts(language, wholes);
        const paragraphs = changed.length === 0 ? [] : await translatedParagraphs(language, pieces, changed);

        if (translated === undefined || paragraphs === undefined) {
            console.log(`guide ${language}: not kept, Claude gave no answer or one that loses the English's headings, links or code: run it again`);
            return;
        }

        const text = parts.map((part, index) => {
            const planned = plan[index] ?? { whole: true };
            return "kept" in planned ? planned.kept : "whole" in planned ? translated[wholes.indexOf(part)] ?? "" : planned.paragraphs.map((paragraph) => paragraph ?? paragraphs.shift() ?? "").join("\n\n");
        });
        // A part's paragraphs are marked one by one when the translation's match them in number and shape, so that a change to one translates it alone.
        const marks = parts.map((part, index) => (sameParagraphs(text[index] ?? "", part) ? paragraphsOf(part).map(markOf) : [markOf(part)]));
        const written = `${translationHead(marks)}\n${text.join("\n\n")}\n`;

        // A guide that would come out the same is left as it is.
        if (written !== own) {
            writeFileSync(join(guideFolder, `${language}.md`), written);
            const done = wholes.length + changed.length === 0 ? "its marks written paragraph by paragraph" : `${wholes.length} of ${parts.length} parts and ${changed.length} paragraphs translated`;
            console.log(`guide ${language}: ${done}`);
        }
    });
}

/** Whether a translated part's paragraphs match the English part's one by one: as many, each with its headings, links and code. */
function sameParagraphs(translation: string, english: string): boolean
{
    const own = paragraphsOf(translation);
    const englishParagraphs = paragraphsOf(english);
    return own.length === englishParagraphs.length && own.every((paragraph, index) => guideShape(paragraph) === guideShape(englishParagraphs[index] ?? ""));
}

/** Paragraphs of the English guide in a language, in their order; undefined when the answer has not as many, or one loses its headings, links or code. */
async function translatedParagraphs(language: string, pieces: { english: string; context: string; }[], paragraphs: { text: string; part: string; }[]): Promise<string[] | undefined>
{
    const english = paragraphs.map((paragraph) => paragraph.text);
    const tail = [
        "Some paragraphs of these parts changed in English. Translate only the paragraphs listed under Paragraphs, in their order, so that they read well with the",
        `translation around them; keep its words. Answer with the translated paragraphs alone, each after a line ${paragraphMark}.`,
        "",
        ...pieces.flatMap((piece) => ["Part, in English:", "", piece.english, "", "The same part, as translated now from an older English:", "", piece.context, ""]),
        "Paragraphs:",
        ...paragraphs.flatMap((paragraph) => [paragraphMark.replace(" -->", `, of the part ${paragraph.part} -->`), paragraph.text]),
    ];
    const answer = await claudeSays([...guideRules(language, english.join("\n\n")), ...tail].join("\n"), "You translate a user guide written in markdown. You reply with the translated markdown alone.");
    const own = markdownOf(answer).split(/<!-- next paragraph[^>]*-->/).map((paragraph) => paragraph.trim()).filter((paragraph) => paragraph !== "");
    return own.length === english.length && own.every((paragraph, index) => guideShape(paragraph) === guideShape(english[index] ?? "")) ? own : undefined;
}

/** Parts of the English guide in a language, in their order; undefined when the answer has not as many, or one loses its headings, links or code. */
async function translatedParts(language: string, englishParts: string[]): Promise<string[] | undefined>
{
    const english = englishParts.join("\n\n");
    const brief = [...guideRules(language, english), "Answer with the translation alone, in markdown, from its first line to its end, its parts in the same order.", "", english];
    const answer = markdownOf(await claudeSays(brief.join("\n"), "You translate a user guide written in markdown. You reply with the translated markdown alone."));
    // The lead comes first when it is asked, and is empty when it is not.
    const answered = guideParts(answer);
    const own = englishParts[0]?.startsWith("## ") === true ? answered.slice(1) : answered;
    return own.length === englishParts.length && own.every((part, index) => guideShape(part) === guideShape(englishParts[index] ?? "")) ? own : undefined;
}

/** What a request for the guide in a language says first: how to translate it, and the page's words and the game's terms the English to translate holds. */
function guideRules(language: string, english: string): string[]
{
    const name = new Intl.DisplayNames(["en"], { type: "language" }).of(language) ?? language;
    const phrases = readPhrases(language);
    const marked = new Set([...english.matchAll(/\*\*([^*]+)\*\*|\*([^*]+)\*/g)].map((match) => (match[1] ?? match[2] ?? "").replace(/[.:,]$/, "")));
    const pageWords = [...marked].flatMap((words) => (phrases[words] === undefined ? [] : [`  - ${words}: ${phrases[words]}`]));
    const terms = termLines(language, name, [{ id: "guide", english }]);
    return [
        `Translate this user guide of RPG Engine, or these parts of it, into ${name} (${language}). RPG Engine lets a player play a tabletop role-playing game`,
        "with an AI game master in a chat (Claude Code or Codex), with a page in the browser beside it, the dashboard. The reader is a player who does not program.",
        `- Write natural, clear ${name}, in short sentences, as the manual of a well-made game would.`,
        `- How it speaks: ${glossary.voice[language] ?? "address the player informally, where the language has an informal you."}`,
        "- Keep the markdown as it is: the same headings, in the same order and levels, their words translated, each with its <!-- icon: ... --> comment untouched; the same lists,",
        "  tables, quotes and blank lines.",
        "- Keep each link's target in parentheses exactly, such as (#24-connect-your-ai) or a web address; translate the link's words.",
        "- Keep each block of code between ``` exactly: commands, and what a command prints. In `inline code`, keep commands, file names, keys and paths as",
        "  they are; translate a line the player writes to the master, such as `[What's the dashboard link?]`.",
        "- Keep the names of products and programs: RPG Engine, Claude Code, Codex, ChatGPT, Node.js, npm, Obsidian. What Claude Code and Codex show stays in",
        `  English, as they show it (Yes, I trust this folder; No, exit). Menu items of Windows and macOS as those systems name them in ${name}.`,
        "- The Italian terms the guide gives as examples (Classe Armatura, tiro salvezza, vantaggio) stay as they are.",
        "- Where it speaks of the player or a character, prefer words that do not mark gender.",
        ...(pageWords.length === 0 ? [] : [`- The dashboard's own words, in bold or italic in the guide, exactly as the page shows them in ${name}:`, ...pageWords]),
        ...(terms.length === 0 ? [] : [`- The game's terms, as players of tabletop role-playing games say them in ${name}: use these words, the same everywhere.`, ...terms]),
    ];
}

/** The markdown of Claude's answer, without a fence around the whole of it. */
function markdownOf(answer: string): string
{
    return answer.trim().replace(/^```(?:markdown|md)?\n([\s\S]*)\n```$/, "$1").trim();
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
        ...target.context?.(language, batch) ?? [],
        "Answer with a JSON object alone, from each id exactly as given to its translation.",
        "",
        JSON.stringify(batch, null, 1),
    ].join("\n");
    return claudeSays(brief, "You translate the words of software interfaces. You reply with a JSON object alone.").then(answerOf);
}

/** What Claude Code answers a brief, with the system prompt given: the text of its result, empty when it gave none. */
function claudeSays(brief: string, system: string): Promise<string>
{
    const folder = mkdtempSync(join(tmpdir(), "rpg-translate-"));
    const command = `claude -p --model sonnet --effort medium --output-format json --tools "" --setting-sources "" --strict-mcp-config --no-session-persistence `
        + `--disable-slash-commands --system-prompt "${system}"`;

    return new Promise((done) => {
        const child = spawn(command, { shell: true, windowsHide: true, cwd: folder, env: ownEnvironment(), stdio: ["pipe", "pipe", "pipe"] });
        let output = "";
        child.stdout.setEncoding("utf8");
        child.stdout.on("data", (chunk: string) => (output += chunk));
        child.stderr.on("data", () => undefined);
        child.on("close", () => {
            rmSync(folder, { recursive: true, force: true });
            done(resultOf(output));
        });
        child.stdin.end(brief);
    });
}

/** The text of Claude Code's result, from its JSON output; empty when it has none. */
function resultOf(output: string): string
{
    try {
        const result = (JSON.parse(output) as { result?: unknown; }).result;
        return typeof result === "string" ? result : "";
    } catch {
        return "";
    }
}

/** The translations in Claude's answer: the JSON object in it, whatever came around it. */
function answerOf(text: string): Record<string, unknown>
{
    try {
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
