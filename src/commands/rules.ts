import { join } from "node:path";
import { z } from "zod";
import { houseRulesFolderName, readListSetting, readTextSetting, requireCampaign } from "../campaign/index.ts";
import type { Context } from "../core/context.ts";
import { defineCommand } from "../core/registry.ts";
import { comparableText } from "../core/text.ts";
import { findPage, type Page, pageFileNamed, pageNamed as pageWithName, sectionTitles } from "../pages/index.ts";
import { bookTitles, findRules, hasAllWords, readRuleBook, type RuleFinding, type RuleSection, shownRules } from "../rules/index.ts";
import { disagreementAdvice, houseRules, precedentRule } from "./game-rules.ts";
import { campaignSystem, campaignWorld, foreignLanguage } from "./game-world.ts";

// About how many words an answer shows: a section of the system has about 80 words in the middle (D-178).
const answerWords = 800;
// What the rules add when the text is the name of a page, which holds the answer: a spell, an item (D-195).
const answerWordsBesidePage = 150;
// How many more sections an answer names after those it shows.
const namedSections = 8;

/** A section of a page that a search names, with where the page comes from. */
interface PageSection
{
    page: string;
    section: string;
    type?: string;
    system?: string;
}

/** What an answer shows of one source of rules, the house rules or the game system's: some sections with their text, the others by their path. */
interface Answer
{
    shown: { path: string[]; text: string; parts: string[]; }[];
    others: string[];
    used: number;
}

export const rules = defineCommand({
    name: "rules",
    description: "Find the exact text of a rule: the campaign's house rules first, then the game system's rules, then the table's precedents. "
        + "Use it whenever you are unsure how a rule works, before you rule and say what is at stake, and when the player questions a ruling. "
        + "Give the book's words, such as grappled, opportunity attack or long rest; a heading, or headings joined by ›, reads that section.",
    group: "game",
    readOnly: true,
    positionals: ["text"],
    input: z.object({
        text: z.string().optional().describe("the words of the rule, or the heading of a section; the chapters when left out"),
    }),

    run(input, context)
    {
        const root = requireCampaign(context.folder);
        const system = campaignSystem(root, context);
        const named = readTextSetting(root, "system");
        // Read one by one, as the system is (SYS-1): a mistake elsewhere in campaign.yaml does not stop the rules.
        const precedents = readListSetting(root, "precedents");
        const house = readRuleBook(join(root, houseRulesFolderName), houseRules);
        const book = system === undefined ? [] : readRuleBook(join(system.folder, "rules"), system.name);
        const text = input.text?.trim() ?? "";
        const common = {
            text,
            system: system?.name,
            missingSystem: named !== undefined && system === undefined ? named : undefined,
            language: system === undefined ? undefined : foreignLanguage(system.language, readTextSetting(root, "language")),
            houseRules: bookTitles(house),
            chapters: chaptersOf(book),
        };

        if (text === "") {
            return { ...common, house: undefined, found: undefined, precedents };
        }

        // One search over both, so that a word is rare or common among all the rules (RUL-5); the house rules come first. A page by that name holds the
        // answer, and the rules add little.
        const page = pageNamed(root, context, system, text);
        // Or the sections of pages it names, as a class's features: Cleric › Domain Spells, or Domain Spells alone (RUL-6).
        const pageSections = page === undefined ? sectionsNamed(root, context, text) : [];
        const budget = page === undefined && pageSections.length === 0 ? answerWords : answerWordsBesidePage;
        const found = findRules([...house, ...book], text);
        const houseAnswer = answerOf(found.filter((finding) => finding.section.source === houseRules), budget);
        const systemAnswer = answerOf(found.filter((finding) => finding.section.source !== houseRules), budget - houseAnswer.used);
        const shownTitles = [...houseAnswer.shown, ...systemAnswer.shown].map((shown) => shown.path.at(-1) ?? "");
        return {
            ...common,
            house: houseAnswer,
            found: systemAnswer,
            precedents: precedents.filter((precedent) => hasAllWords(precedent, text) || isAboutAny(precedent, text, shownTitles)),
            page,
            pageSections,
        };
    },

    format(result)
    {
        if (result.house === undefined || result.found === undefined) {
            return [contents(result), precedentsLine(result.precedents), houseRulesLine(result.houseRules)].filter((line) => line !== "").join("\n");
        }

        const sections = [...shownBlocks(result.house, "house rule"), ...shownBlocks(result.found, result.system ?? "")];
        const others = [...result.house.others, ...result.found.others];
        const lines = [
            missingSystemLine(result.missingSystem),
            pageLine(result.page),
            sectionsLine(result.pageSections),
            ...sections,
            others.length === 0 ? "" : `Also: ${others.slice(0, namedSections).join("; ")}. Read one by its heading.`,
            sections.length === 0 ? notFound(result) : "",
            precedentsLine(result.precedents),
            result.precedents.length > 0 && result.found.shown.length > 0 ? disagreementAdvice : "",
            houseRulesLine(result.houseRules),
        ];
        return lines.filter((line) => line !== "").join("\n\n");
    },
});

/** Whether a precedent is about a rule that the search names, or about the title of a section shown: "Poisoned: …" goes with Poisoned (D-179). */
function isAboutAny(precedent: string, text: string, titles: string[]): boolean
{
    const rule = precedentRule(precedent);
    return rule !== undefined && (hasAllWords(text, rule) || titles.some((title) => comparableText(rule) === comparableText(title)));
}

/**
 * The page of the campaign, or else of the game system, whose name or alias is the text: it holds rules too, such as a spell or how long a potion takes to drink.
 */
function pageNamed(root: string, context: Context, system: { name: string; folder: string; } | undefined, text: string): { name: string; type?: string; system?: string; } | undefined
{
    const page = pageFileNamed(root, text);
    const systemPage = page === undefined && system !== undefined ? pageFileNamed(system.folder, text) : undefined;

    if (page !== undefined) {
        return page;
    }

    if (systemPage !== undefined) {
        return { ...systemPage, system: system?.name };
    }

    // By an alias, as "Shield spell": the world knows them.
    try {
        const aliased = pageWithName(campaignWorld(root, context), text);
        return aliased === undefined ? undefined : { name: aliased.name, type: aliased.type, system: aliased.system };
    } catch {
        return undefined;
    }
}

/** The sections of pages, the campaign's or else the game system's, that a text names: Page › Section, or a section's title alone (RUL-6). */
function sectionsNamed(root: string, context: Context, text: string): PageSection[]
{
    const titles = text.split(/\s*[›>/]\s*/).map((title) => title.trim().replace(/[.:]$/, "")).filter((title) => title !== "");
    let pages: Page[];

    // A world that cannot be read, or two pages with the first title's name, leave the rules to answer alone.
    try {
        const world = campaignWorld(root, context);
        const named = titles.length > 1 ? findPage(world, titles[0]) : undefined;
        pages = titles.length === 1 ? [...world.pages, ...(world.system?.pages ?? [])] : named === undefined ? [] : [named];
    } catch {
        return [];
    }

    return pages.flatMap((page) => {
        const section = sectionTitles(page.body).find((title) => comparableText(title) === comparableText(titles.at(-1) ?? ""));
        return section === undefined ? [] : [{ page: page.name, section, type: page.type, system: page.system }];
    });
}

/** "Domain Spells is a section of Cleric, a page of the system 5e (topic): show Cleric#Domain Spells reads it.": first, as for a page (RUL-6). */
function sectionsLine(sections: PageSection[] | undefined): string
{
    const [first] = sections ?? [];

    if (first === undefined || sections === undefined) {
        return "";
    }

    if (sections.length === 1) {
        return `${first.section} is a section of ${first.page}, a page of ${first.system === undefined ? "the campaign" : `the system ${first.system}`} (${first.type ?? "page"}): `
            + `show ${first.page}#${first.section} reads it. What the rules say of it:`;
    }

    const more = sections.length > namedSections ? `, and ${sections.length - namedSections} more` : "";
    return `${first.section} is a section of several pages: ${sections.slice(0, namedSections).map(({ page, section }) => `show ${page}#${section}`).join("; ")}${more}. What the rules say of it:`;
}

/** "Fireball is a page of the system 5e (topic): show Fireball reads it.": first, since the page holds the answer, and the rules after it add to it. */
function pageLine(page: { name: string; type?: string; system?: string; } | undefined): string
{
    return page === undefined ? "" : `${page.name} is a page of ${page.system === undefined ? "the campaign" : `the system ${page.system}`} (${page.type ?? "page"}): show ${page.name} reads it. What the rules say of it:`;
}

function answerOf(found: RuleFinding[], words: number): Answer
{
    const { shown, others, used } = shownRules(found, Math.max(words, 0));
    return { shown: shown.map(({ section, text, parts }) => ({ path: section.path, text, parts })), others: others.map((section) => section.path.join(" › ")), used };
}

function shownBlocks(answer: Answer, source: string): string[]
{
    return answer.shown.map((shown) => {
        const parts = shown.parts.length === 0 ? "" : `\n(Its parts: ${shown.parts.join("; ")}. Read one by its heading.)`;
        return `${shown.path.join(" › ")} (${source}):\n${shown.text}${parts}`;
    });
}

/** The chapters of a game system with the sections each opens with: "Combat: The Order of Combat, Movement and Position, …". */
function chaptersOf(book: RuleSection[]): string[]
{
    const files = [...new Set(book.map((section) => section.file))];
    return files.map((file) => {
        const top = book.find((section) => section.file === file);
        return top === undefined || top.parts.length === 0 ? file : `${file}: ${top.parts.join(", ")}`;
    });
}

function contents(result: { system?: string; chapters: string[]; missingSystem?: string; language?: string; }): string
{
    if (result.system === undefined) {
        return missingSystemLine(result.missingSystem) || "The campaign has no game system: only its own rules can be read.";
    }

    const language = result.language === undefined ? "" : `, in ${result.language}`;
    return result.chapters.length === 0 ? `The system ${result.system} has no rules to read.` : `The rules of the system ${result.system}${language}, by chapter:\n${result.chapters.join("\n")}`;
}

/** What rules says when no text matches: how to search the book, and, when no precedent holds and the system is there, how to record the ruling as one (D-179). */
function notFound(result: { text: string; system?: string; chapters: string[]; language?: string; precedents: string[]; }): string
{
    if (result.precedents.length > 0) {
        return `No text of the rules matches "${result.text}": the table's precedent below holds.`;
    }

    const chapters = result.chapters.map((chapter) => chapter.split(":")[0]);
    const words = "the book's words, such as a condition, an action or a heading";
    const search = result.language === undefined ? `Search with ${words}.` : `The system ${result.system} writes its rules in ${result.language}: search with ${words}.`;
    const book = result.system === undefined || chapters.length === 0 ? "" : ` ${search} The chapters of ${result.system}: ${chapters.join(", ")}.`;
    const name = result.language === undefined ? "the rule's name" : `the rule's name in ${result.language}`;
    const precedent = result.system === undefined ? "" : ` If you rule without the text, tell the player it is your call, and add it to the precedents: `
        + `config, setting precedents, add "<${name}>: what you said".`;
    return `No rule matches "${result.text}".${book}${precedent}`;
}

function precedentsLine(precedents: string[]): string
{
    return precedents.length === 0 ? "" : `Precedents: ${precedents.join("; ")}`;
}

function houseRulesLine(houseRules: string[]): string
{
    return houseRules.length === 0 ? "" : `House rules of the campaign: ${houseRules.join(", ")}.`;
}

function missingSystemLine(missing: string | undefined): string
{
    return missing === undefined ? "" : `The campaign's system, ${missing}, is not installed, so its rules cannot be read: validate says how to fix it.`;
}
