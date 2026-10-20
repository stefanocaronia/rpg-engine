// The page in a language the package does not ship, translated on the fly (D-406): the writer of this computer, Codex or Claude Code with the player's login,
// translates in the background all the page's phrases a language lacks, those the page asks first first, then the game system's words, and keeps them in the
// player's data folder for every campaign; the page reads them as they come, in English until then. A translation that loses a {name} is dropped.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { stringify } from "yaml";
import type { Context } from "./core/context.ts";
import { files } from "./core/store.ts";
import { languagePackFor, packPhrases } from "./languages/index.ts";
import { type SystemWords, systemWords } from "./systems/index.ts";

/** What the page has of a language: its phrases so far, whether they are being translated, whether this computer can, and how many it still lacks. */
export interface PageWords
{
    phrases: Record<string, string>;
    translating: boolean;
    can: boolean;
    missing: number;
}

/** A game system as the translation needs it: its name, and its folder, where words/it.yaml lists its words with their meaning. */
export interface WordsSystem
{
    name: string;
    folder: string;
}

/** The page's words on the fly: what a language has, and the phrases the page asks first; `notify` tells the pages when more have come. */
export interface PageTranslator
{
    read(language: string, system?: WordsSystem): PageWords;
    ask(language: string, first: string[]): void;
}

// How many phrases go in one request.
const batchSize = 130;

// How long a language whose translation stopped short waits before it is tried again, so that a writer that fails is not called at every reading.
const pause = 10 * 60 * 1000;

/** The page's words on the fly for the page in `page`, whose i18n/it.json lists every phrase with its meaning. */
export function pageTranslator(context: Context, page: string, notify: () => void): PageTranslator
{
    // Every phrase of the page, with its curated Italian as its meaning, read when first needed.
    let phrases: Record<string, string> | undefined;
    const reference = (): Record<string, string> => (phrases ??= readJson(join(page, "i18n", "it.json")));
    const running = new Map<string, Set<string>>();
    const stopped = new Map<string, number>();

    const run = async (language: string, system: WordsSystem | undefined): Promise<void> => {
        const writer = context.writer;
        const home = context.home;

        if (writer === undefined || home === undefined) {
            return;
        }

        const file = join(home, "i18n", `${language}.json`);

        for (;;) {
            const own = readJson(file);
            const first = running.get(language) ?? new Set<string>();
            const missing = Object.keys(reference()).filter((phrase) => !(phrase in own));
            const batch = [...missing.filter((phrase) => first.has(phrase)), ...missing.filter((phrase) => !first.has(phrase))].slice(0, batchSize);

            if (batch.length === 0) {
                break;
            }

            const answer = answerOf(await writer.write(pageBrief(language, batch.map((phrase) => ({ id: phrase, english: phrase, italian: reference()[phrase] })))));
            const kept = keptOf(answer, batch.map((phrase) => ({ id: phrase, source: phrase })));

            // A request that brings nothing ends the work: the page stays in English where it lacks a phrase.
            if (Object.keys(kept).length === 0) {
                break;
            }

            writeJson(file, { ...readJson(file), ...kept });
            notify();
        }

        if (system !== undefined) {
            await translateSystem(writer, home, language, system);
            notify();
        }
    };

    return {
        read: (language, system) => {
            // A translation made by hand, installed as a package, comes before the one made on the fly (D-485 (3)).
            const pack = languagePackFor(context.extensionFolders ?? [], language);
            const own = { ...(context.home === undefined ? {} : readJson(join(context.home, "i18n", `${language}.json`))), ...(pack === undefined ? {} : packPhrases(pack)) };
            const missing = Object.keys(reference()).filter((phrase) => !(phrase in own)).length;
            const can = context.writer?.ready() === true && context.home !== undefined;

            const waiting = context.now().getTime() - (stopped.get(language) ?? -pause) < pause;

            if (can && !waiting && !running.has(language) && (missing > 0 || (system !== undefined && systemMissing(context.home as string, language, system)))) {
                running.set(language, new Set());
                void run(language, system).finally(() => {
                    running.delete(language);
                    stopped.set(language, context.now().getTime());
                });
            }

            return { phrases: own, translating: running.has(language), can, missing };
        },
        ask: (language, first) => {
            first.filter((phrase) => phrase in reference()).forEach((phrase) => running.get(language)?.add(phrase));
        },
    };
}

/** A batch the master translates in the chat (D-423): the page's phrases, then the game system's words, each by a short id, with what the language still lacks. */
export interface ChatBatch
{
    part: "page" | "system";
    entries: { id: string; english: string; italian: string; kind?: string; }[];
    /** How many the language still lacks, this batch included. */
    left: number;
}

// How many phrases the master translates in one call: the page's in four, the system's in three.
const chatBatchSize = 160;

/** Whether the built page in `page` ships a language: its own file, its base language's (pt-BR, pt), or English. */
export function shipsLanguage(page: string, language: string): boolean
{
    const base = language.toLowerCase().split("-")[0];
    return base === "en" || [language.toLowerCase(), base, base === "no" ? "nb" : ""].some((code) => code !== "" && existsSync(join(page, "i18n", `${code}.json`)));
}

/** The next batch the master translates in the chat, the page's phrases first; undefined once the language lacks none. */
export function chatBatch(home: string, page: string, language: string, system: WordsSystem | undefined): ChatBatch | undefined
{
    const pagePart = missingPhrases(home, page, language);
    const systemPart = system === undefined ? [] : missingWords(home, language, system);
    const [part, entries] = pagePart.length > 0 ? ["page" as const, pagePart] : ["system" as const, systemPart];
    return entries.length === 0 ? undefined : { part, entries: entries.slice(0, chatBatchSize).map(({ key: _key, ...entry }) => entry), left: pagePart.length + systemPart.length };
}

/** Keeps what the master translated in the chat, by id, as the background work keeps its own; returns how many it kept, and the ids dropped for a lost {name}. */
export function keepChatAnswer(home: string, page: string, language: string, system: WordsSystem | undefined, answer: Record<string, unknown>): { kept: number; dropped: string[]; }
{
    const phrases = missingPhrases(home, page, language).filter((entry) => entry.id in answer);
    const words = system === undefined ? [] : missingWords(home, language, system).filter((entry) => entry.id in answer);
    const keptPhrases = keptOf(answer, phrases.map(({ id, english }) => ({ id, source: english })));
    const keptWords = keptOf(answer, words.map(({ id, italian }) => ({ id, source: italian })));

    if (Object.keys(keptPhrases).length > 0) {
        const file = join(home, "i18n", `${language}.json`);
        writeJson(file, { ...readJson(file), ...Object.fromEntries(phrases.filter((entry) => entry.id in keptPhrases).map((entry) => [entry.key, keptPhrases[entry.id]])) });
    }

    if (system !== undefined && Object.keys(keptWords).length > 0) {
        writeSystemWords(home, language, system, Object.fromEntries(words.filter((entry) => entry.id in keptWords).map((entry) => [entry.key, keptWords[entry.id]])));
    }

    const kept = [...Object.keys(keptPhrases), ...Object.keys(keptWords)];
    return { kept: kept.length, dropped: [...phrases, ...words].map((entry) => entry.id).filter((id) => !kept.includes(id)) };
}

/** A language's name in English, as Vietnamese for vi; its code where the runtime does not know it. */
export function languageName(language: string): string
{
    try {
        return new Intl.DisplayNames(["en"], { type: "language" }).of(language) ?? language;
    } catch {
        return language;
    }
}

/** The game system's words in a language translated on the fly, in the player's data folder; none where it has none there. */
export function homeSystemWords(home: string | undefined, system: WordsSystem, language: string): SystemWords | undefined
{
    return home === undefined ? undefined : systemWords(join(home, "systems", system.name), language);
}

/** The system's words a language still lacks in the player's data folder, against its Italian list. */
function systemMissing(home: string, language: string, system: WordsSystem): boolean
{
    const italian = systemWords(system.folder, "it");
    const own = homeSystemWords(home, system, language);
    return italian !== undefined && Object.keys(wordEntries(italian)).some((id) => !(id in wordEntries(own ?? { groups: {}, fields: {}, words: {} })));
}

/** The game system's words translated at once, all in one request so that one concept has one term, after its Italian list. */
async function translateSystem(writer: NonNullable<Context["writer"]>, home: string, language: string, system: WordsSystem): Promise<void>
{
    const italian = systemWords(system.folder, "it");

    if (italian === undefined || !systemMissing(home, language, system)) {
        return;
    }

    const entries = Object.entries(wordEntries(italian)).map(([id, word]) => ({ id, english: id.includes(": ") ? id.slice(id.indexOf(": ") + 2) : id, italian: word }));
    const kept = keptOf(answerOf(await writer.write(systemBrief(language, entries))), entries.map(({ id, italian: source }) => ({ id, source })));
    writeSystemWords(home, language, system, kept);
}

/** The game system's words translated, by id ("fields: str"), added to those this computer already has of the language. */
function writeSystemWords(home: string, language: string, system: WordsSystem, kept: Record<string, string>): void
{
    const all = { ...wordEntries(homeSystemWords(home, system, language) ?? { groups: {}, fields: {}, words: {} }), ...kept };
    const words = (section: "groups" | "fields" | "words"): Record<string, string> => Object.fromEntries(Object.entries(all).filter(([id]) => id.startsWith(`${section}: `)).map(([id, word]) => [id.slice(section.length + 2), word]));
    // Through the store the words are read with, so that a read after it in the same call finds them.
    files().write(
        join(home, "systems", system.name, "words", `${language}.yaml`),
        stringify({ groups: words("groups"), fields: words("fields"), words: words("words"), ...(all.headline === undefined ? {} : { headline: all.headline }) }, { lineWidth: 0 }),
    );
}

/** The page's phrases a language still lacks on this computer, each by a short id from its place in the page's Italian list, which gives its meaning. */
function missingPhrases(home: string, page: string, language: string): { id: string; key: string; english: string; italian: string; }[]
{
    const own = readJson(join(home, "i18n", `${language}.json`));
    return Object.entries(readJson(join(page, "i18n", "it.json"))).flatMap(([phrase, italian], index) => (phrase in own ? [] : [{ id: `p${index}`, key: phrase, english: phrase, italian }]));
}

/** The game system's words a language still lacks on this computer, each by a short id from its place in the system's Italian list, with what it is. */
function missingWords(home: string, language: string, system: WordsSystem): { id: string; key: string; english: string; italian: string; kind: string; }[]
{
    const italian = systemWords(system.folder, "it");
    const own = wordEntries(homeSystemWords(home, system, language) ?? { groups: {}, fields: {}, words: {} });
    return Object.entries(italian === undefined ? {} : wordEntries(italian)).flatMap(([key, word], index) => {
        const section = key.includes(": ") ? key.slice(0, key.indexOf(": ")) : key;
        return key in own ? [] : [{ id: `w${index}`, key, english: key.slice(section.length + 2) || key, italian: word, kind: section.replace(/s$/, "") }];
    });
}

/** A system's words by id: "fields: str", "words: Cleric", "headline". */
function wordEntries(words: SystemWords): Record<string, string>
{
    const sections = ["groups", "fields", "words"] as const;
    return {
        ...Object.fromEntries(sections.flatMap((section) => Object.entries(words[section]).map(([key, word]) => [`${section}: ${key}`, word]))),
        ...(words.headline === undefined ? {} : { headline: words.headline }),
    };
}

/** The request for the page's phrases in a language. */
function pageBrief(language: string, entries: { id: string; english: string; italian?: string; }[]): string
{
    const name = languageName(language);
    return [
        `Translate the user interface of a web page into ${name} (${language}). The page is the dashboard of a tabletop role-playing game played with an AI`,
        "game master in a chat: the player's character sheet, the dice and the rolls, the quests and the story, the maps, the saves and the settings.",
        `- Write natural, concise ${name}, as a well-made game app would: buttons and labels short; address the player informally where the language can.`,
        "- Keep every {name} in braces exactly as it is, untranslated; move it where the language wants it.",
        "- Keep names of products and programs as they are: RPG Engine, Codex, Claude, Claude Code, ChatGPT, and file names.",
        "- Each phrase stands alone; the Italian beside it, written for the same page, shows what it means there.",
        "Answer with a JSON object alone, from each id exactly as given to its translation.",
        "",
        JSON.stringify(entries),
    ].join("\n");
}

/** The request for a game system's words in a language. */
function systemBrief(language: string, entries: { id: string; english: string; italian?: string; }[]): string
{
    const name = languageName(language);
    return [
        `Translate the words a game system shows on the dashboard of a tabletop role-playing game into ${name} (${language}).`,
        `- Where the game has an official translation in ${name}, use its terms exactly; else the words its players use.`,
        "- Each id says what it is: group (a heading of the character sheet), field (a short label), word (a name the game uses), headline (the line under a",
        "  character's name). One concept, one term in every entry, only its case following the entry's; an entry such as until long rest is a whole phrase.",
        "- Keep every {name} in braces exactly as it is. The Italian beside an entry shows what it means.",
        "Answer with a JSON object alone, from each id exactly as given to its translation.",
        "",
        JSON.stringify(entries),
    ].join("\n");
}

/** The translations of an answer that keep every {name} of what they translate and are not garbled; none of any other. */
function keptOf(answer: Record<string, unknown>, entries: { id: string; source: string; }[]): Record<string, string>
{
    const names = (text: string): string => [...text.matchAll(/\{\w+\}/g)].map(String).sort().join();
    return Object.fromEntries(entries.flatMap(({ id, source }) => {
        const own = answer[id];
        return typeof own === "string" && own.trim() !== "" && names(own) === names(source) && !isGarbled(own, source) ? [[id, own]] : [];
    }));
}

// What UTF-8 read as another encoding leaves, as a model writing a long answer sometimes does: signs no language writes in a word ("Đ·∫øn" for "Đến"), or
// Ã and Â before a sign of Latin-1 ("Ã©" for "é").
const garbledMarks = /[√∫∞∑≈∂Ω¬ƒ†∆]|·ª|[ÃÂ][ -¿]/;

/** Whether a translation is garbled: it has what a misread encoding leaves, and what it translates has not. */
function isGarbled(text: string, source: string): boolean
{
    return garbledMarks.test(text) && !garbledMarks.test(source);
}

/** The JSON object in a writer's answer, whatever came around it; none when there is none. */
function answerOf(text: string | undefined): Record<string, unknown>
{
    try {
        return text === undefined ? {} : JSON.parse(text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1)) as Record<string, unknown>;
    } catch {
        return {};
    }
}

function readJson(file: string): Record<string, string>
{
    try {
        return existsSync(file) ? JSON.parse(readFileSync(file, "utf8")) as Record<string, string> : {};
    } catch {
        return {};
    }
}

function writeJson(file: string, value: Record<string, string>): void
{
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);
}
