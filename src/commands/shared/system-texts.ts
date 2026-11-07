// A game system's pages in the campaign's language where the system has no translation of its own (D-539): translated in the background on this computer,
// as the player first reads them, and kept in the player's data folder with the print of the text they come from, so that a page the system changes is
// translated again.
import { join } from "node:path";
import { stringify } from "yaml";
import type { Context, SystemTexts } from "../../core/context.ts";
import { translationFolder } from "../../core/files.ts";
import { files } from "../../core/store.ts";
import { textPrint } from "../../core/text.ts";
import { baseChain, findPage, linksIn, type Page, versionTranslations, type World } from "../../pages/index.ts";
import { answerOf, isGarbled, languageName } from "./page-words.ts";
import { campaignSystem, ownTranslationFolder } from "./world.ts";

// How much of the system's text goes in one request, in characters, and at most how many pages.
const batchLetters = 12_000;
const batchPages = 12;

// How long a language whose translation brought nothing waits before it is tried again, so that a writer that fails is not called at every reading.
const pause = 10 * 60 * 1000;

// How many times a page whose translation is refused is asked for in a process.
const mostTries = 2;

/**
 * Asks for the game system's pages that these pages show the player in the campaign's language: themselves and their bases, and for a character the pages
 * its fields link, as its class, its spells and its items (D-539); nothing where the system has its own translation, or nothing translates.
 */
export function wantTexts(root: string, context: Context, world: World, shown: Page[]): void
{
    const texts = context.texts;
    const language = world.language?.trim().toLowerCase();
    const system = world.system;

    if (texts === undefined || system === undefined || language === undefined || language === "" || language.split("-")[0] === system.language.split("-")[0]) {
        return;
    }

    const found = campaignSystem(root, context);

    if (found === undefined) {
        return;
    }

    const wanted = new Map<string, { path: string; name: string; body: string; }>();

    const add = (page: Page | undefined): void => {
        for (const one of page === undefined ? [] : [page, ...baseChain(world, page)]) {
            // A page of the version of the system's rules is the version's, with a translation of its own (VER-3).
            const version = found.version !== undefined && files().exists(join(found.version.folder, one.path)) ? found.version : undefined;
            const path = version === undefined ? one.path : join(versionTranslations(version.name), one.path);

            if (one.system !== undefined && one.translated === undefined && translationFolder(version?.folder ?? found.folder, language) === undefined) {
                wanted.set(path, { path, name: one.name, body: one.body });
            }
        }
    };

    for (const page of shown) {
        add(page);

        if (page.type === "character") {
            Object.values(page.fields).flatMap(linksIn).forEach((name) => add(pageOrNone(world, name)));
        }
    }

    if (wanted.size > 0) {
        texts.want(language, { name: system.name, title: system.title }, [...wanted.values()], world.words ?? {});
    }
}

/** The campaign's language, when this computer is translating the game system's pages into it (D-539). */
export function translatingTexts(context: Context, world: World): string | undefined
{
    const language = world.language?.trim().toLowerCase();
    return language !== undefined && context.texts?.translating(language) === true ? language : undefined;
}

/** The game system's pages translated in the background with the player's writer (D-539); `notify` tells the pages when some have come, and when the work ends. */
export function systemTexts(context: Context, notify: () => void): SystemTexts
{
    const waiting = new Map<string, Map<string, Wanted>>();
    const running = new Set<string>();
    const sent = new Set<string>();
    const tries = new Map<string, number>();
    const stopped = new Map<string, number>();

    const run = async (language: string, write: (file: string, text: string) => void): Promise<boolean> => {
        const queue = waiting.get(language) ?? new Map<string, Wanted>();

        for (;;) {
            const batch = nextBatch([...queue.values()]);
            const writer = context.writer;

            if (batch.length === 0 || writer === undefined) {
                return true;
            }

            batch.forEach((one) => {
                queue.delete(one.file);
                sent.add(one.file);
            });

            try {
                const answer = answerOf(await writer.write(textsBrief(language, batch)));
                // A try counts once the writer answered: one that failed, as offline, leaves the pages to the next time.
                batch.forEach((one) => tries.set(one.file, (tries.get(one.file) ?? 0) + 1));
                const kept = batch.flatMap((one, index) => {
                    const translation = keptTranslation(answer[`p${index + 1}`], one.page.body);
                    return translation === undefined ? [] : [{ one, translation }];
                });
                kept.forEach(({ one, translation }) => write(one.file, translatedFile(translation, one.page.body)));

                // A request that brings nothing ends the work for a while: the pages stay in the system's language.
                if (kept.length === 0) {
                    queue.clear();
                    return false;
                }

                notify();
            } finally {
                batch.forEach((one) => sent.delete(one.file));
            }
        }
    };

    return {
        want: (language, system, pages, glossary) => {
            const folder = ownTranslationFolder(context, system.name, language);

            if (context.writer?.ready() !== true || folder === undefined) {
                return;
            }

            const queue = waiting.get(language) ?? new Map<string, Wanted>();
            waiting.set(language, queue);

            for (const page of pages) {
                const file = join(folder, page.path);

                if (!sent.has(file) && (tries.get(file) ?? 0) < mostTries) {
                    queue.set(file, { file, page, system, glossary });
                }
            }

            const resting = context.now().getTime() - (stopped.get(language) ?? -pause) < pause;

            if (queue.size === 0 || running.has(language) || resting) {
                return;
            }

            running.add(language);
            // Through the store the pages are read with, so that the world reads them as they come.
            const store = files();
            void run(language, (file, text) => store.write(file, text))
                .then((finished) => finished || stopped.set(language, context.now().getTime()), () => stopped.set(language, context.now().getTime()))
                .finally(() => {
                    running.delete(language);
                    notify();
                });
        },
        translating: (language) => running.has(language),
    };
}

/** A page waiting to be translated: the file it goes to, its text, its system, and the system's words in the language. */
interface Wanted
{
    file: string;
    page: { path: string; name: string; body: string; };
    system: { name: string; title: string; };
    glossary: Record<string, string>;
}

/** The pages of the next request, in the order they were asked: up to the letters of a batch, and always one, however long. */
function nextBatch(queue: Wanted[]): Wanted[]
{
    const batch: Wanted[] = [];
    let letters = 0;

    for (const one of queue) {
        if (batch.length === batchPages || (batch.length > 0 && letters + one.page.body.length > batchLetters)) {
            break;
        }

        batch.push(one);
        letters += one.page.body.length;
    }

    return batch;
}

/** The request for some of a system's pages in a language, with the words of the system there that their texts use. */
function textsBrief(language: string, batch: Wanted[]): string
{
    const name = languageName(language);
    const texts = batch.map((one) => one.page.body).join("\n");
    const glossary = Object.fromEntries(Object.entries(batch[0].glossary).filter(([english]) => english.length > 2 && texts.includes(english)));
    return [
        `Translate pages of the rules of a tabletop role-playing game, the game system ${batch[0].system.title}, into ${name} (${language}), for a player who reads them while playing.`,
        "- Each page is markdown: keep it as it is, its headings, lists, tables, bold and italics, and secret blocks (> [!secret]); translate the words.",
        "- Keep each link [[Target]] to the same Target, untouched; you may add the words to show after a bar, as [[Target|words]].",
        `- Keep numbers and dice such as 2d6+3 as they are; never convert a unit (feet stay feet), but write its name in ${name}.`,
        `- Where the game has an official translation in ${name}, use its terms; else the words its players use. The glossary gives the terms the game already uses in ${name}: keep to them.`,
        `- name: the page's name in ${name}, as the game's translation would call it.`,
        'Answer with a JSON object alone, from each id exactly as given to an object {"name": "…", "text": "…"}.',
        "",
        `Glossary: ${JSON.stringify(glossary)}`,
        "",
        JSON.stringify(batch.map((one, index) => ({ id: `p${index + 1}`, name: one.page.name, text: one.page.body }))),
    ].join("\n");
}

/** A translation kept: a name and a text that keep the page's headings, secrets and links, and are not garbled; undefined otherwise. */
function keptTranslation(given: unknown, body: string): { name: string; text: string; } | undefined
{
    if (given === null || typeof given !== "object") {
        return undefined;
    }

    const { name, text } = given as Record<string, unknown>;

    if (typeof name !== "string" || typeof text !== "string" || name.trim() === "" || name.includes("\n") || text.trim() === "") {
        return undefined;
    }

    const same = (pattern: RegExp): boolean => count(text, pattern) === count(body, pattern);
    const kept = same(/^#{1,6}\s/gm) && same(/^>\s*\[!secret\]/gim) && linkTargets(text) === linkTargets(body) && !isGarbled(text, body);
    return kept ? { name: name.trim(), text: text.trim() } : undefined;
}

// What a page translated on this computer says of itself: the system's licence goes with its text, and a translation made by an AI is no official one.
const note = "An unofficial translation made on this computer by the player's AI, from the game system's text, under that text's licence and with its attribution; the system's own text prevails.";

/** The file of a page translated on this computer: its name in the language, the print of the text it comes from, and its text. */
function translatedFile(translation: { name: string; text: string; }, body: string): string
{
    return `---\n${stringify({ name: translation.name, source: textPrint(body), note }, { lineWidth: 0 })}---\n\n${translation.text}\n`;
}

/** The pages a text links to, each once, in order of name. */
function linkTargets(text: string): string
{
    return [...new Set([...text.matchAll(/\[\[([^\]|#]+)/g)].map((match) => match[1].trim()))].sort().join("|");
}

function count(text: string, pattern: RegExp): number
{
    return text.match(pattern)?.length ?? 0;
}

/** The page with this name, the campaign's or the system's; none where there is none, or where two of the campaign's have it. */
function pageOrNone(world: World, name: string): Page | undefined
{
    try {
        return findPage(world, name);
    } catch {
        return undefined;
    }
}
