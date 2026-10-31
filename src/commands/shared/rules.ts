// A rule by its title, as rules finds it (D-179, DAT-3, DAT-6): a house rule of the campaign first, else the game system's, with the table's precedents on it.
import { join } from "node:path";
import { houseRulesFolderName, readListSetting, readTextSetting } from "../../campaign/index.ts";
import { translationFolder } from "../../core/files.ts";
import { comparableText } from "../../core/text.ts";
import { isTitled, readRuleBook, type RuleSection } from "../../rules/index.ts";
import { type GameSystem, layeredSystemWords, systemContentFolders } from "../../systems/index.ts";

/** The source of the campaign's own rules, in the campaign's rules folder. */
export const houseRules = "house rules";

/** What to do when a precedent and the book disagree (D-181). */
export const disagreementAdvice = "When the text and a precedent disagree, tell the player and ask whether to keep the precedent: if so, write it again saying it is a house rule, against the book; if not, remove it. Both with config.";

/** A rule found by its title: where it comes from, "house rules" or the game system's name, its text, and the precedents about it. */
export interface TitledRule
{
    source: string;
    text: string;
    precedents: string[];
}

/**
 * The rule with this title: a house rule first, else the game system's, in the campaign's language where the system has its rules in it, by the title's word
 * there, Prono for Prone (D-542); undefined when neither has a section so titled.
 */
export function ruleTitled(root: string, system: GameSystem, title: string): TitledRule | undefined
{
    const titled = (section: RuleSection): boolean => isTitled(section, title);
    const language = readTextSetting(root, "language");
    const own = ownWord(system, language, title);
    const house = readRuleBook(join(root, houseRulesFolderName), houseRules).find(titled);
    const section = house ?? systemRuleBook(system, language).find((one) => titled(one) || (own !== undefined && isTitled(one, own))) ?? systemRuleBook(system).find(titled);

    if (section === undefined) {
        return undefined;
    }

    const precedents = readListSetting(root, "precedents").filter((precedent) => comparableText(precedentRule(precedent) ?? "") === comparableText(title));
    return { source: section.source, text: section.text, precedents };
}

/**
 * The rules of a game system, its own with those of the version of its rules (VER-3): a chapter of the version takes the place of a common one of its file.
 * In a language the system has its rules in, a chapter translated takes the place of its English one (D-542).
 */
export function systemRuleBook(system: GameSystem, language?: string): RuleSection[]
{
    const words = language === undefined ? undefined : systemWordsIn(system, language);
    const [own, version] = systemContentFolders(system).map((folder) => translatedBook(readRuleBook(join(folder, "rules"), system.name), translationFolder(folder, language), system.name, words));
    return version === undefined ? own : [...own.filter((section) => !version.some((other) => other.file === section.file)), ...version];
}

/** Whether a game system has its rules in a language, in one of its folders (D-542). */
export function hasTranslatedRules(system: GameSystem, language: string | undefined): boolean
{
    return systemContentFolders(system).some((folder) => {
        const translations = translationFolder(folder, language);
        return translations !== undefined && readRuleBook(join(translations, "rules"), system.name).length > 0;
    });
}

/** A word of the system in a language, by its English, as Prono for Prone; none without it, or when its words do not read, which validate says. */
function ownWord(system: GameSystem, language: string | undefined, english: string): string | undefined
{
    return language === undefined ? undefined : systemWordsIn(system, language)?.[english];
}

/** The system's words in a language, by their English; none when it has none, or they do not read, which validate says. */
function systemWordsIn(system: GameSystem, language: string): Record<string, string> | undefined
{
    try {
        return layeredSystemWords(systemContentFolders(system), language)?.words;
    } catch {
        return undefined;
    }
}

/**
 * A book with its chapters in a language in place of its own; a chapter whose sections match its own one by one, at the same levels and with the titles the
 * system's words give, gives each the path it has there, so that the system's own titles, as its outputs name them, still find it (D-542).
 */
function translatedBook(book: RuleSection[], translations: string | undefined, system: string, words: Record<string, string> | undefined): RuleSection[]
{
    const translated = translations === undefined ? [] : readRuleBook(join(translations, "rules"), system);
    const files = [...new Set(translated.map((section) => section.file))];

    if (files.length === 0) {
        return book;
    }

    const aliased = files.flatMap((file) => {
        const own = book.filter((section) => section.file === file);
        const other = translated.filter((section) => section.file === file);
        return isParallel(own, other, words) ? other.map((section, index) => ({ ...section, alias: own[index].path })) : other;
    });
    return [...book.filter((section) => !files.includes(section.file)), ...aliased].sort((first, second) => (first.file < second.file ? -1 : first.file > second.file ? 1 : 0));
}

/** Whether a chapter's translation has its sections in the same order: as many, at the same levels, none named otherwise than the system's words name it. */
function isParallel(own: RuleSection[], other: RuleSection[], words: Record<string, string> | undefined): boolean
{
    return own.length === other.length && own.every((section, index) => {
        const word = words?.[section.path.at(-1) ?? ""];
        return section.level === other[index].level && (word === undefined || comparableText(word) === comparableText(other[index].path.at(-1) ?? ""));
    });
}

/** "Poisoned is a condition of the system 5e, by a house rule:" and the text, then the precedents on it, with what to do when they disagree with the book. */
export function ruleBlock(rule: TitledRule): string
{
    const precedents = rule.precedents.length === 0 ? "" : `\n\nPrecedents of the table: ${rule.precedents.join(" · ")}`;
    const advice = rule.precedents.length > 0 && rule.source !== houseRules ? `\n${disagreementAdvice}` : "";
    return `${rule.text}${precedents}${advice}`;
}

/** The rule a precedent is about: the name before its colon, as in "Poisoned: …" (D-179); undefined when it has none. */
export function precedentRule(precedent: string): string | undefined
{
    return precedent.includes(":") ? precedent.split(":")[0].trim() : undefined;
}
