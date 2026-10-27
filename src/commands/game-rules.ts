// A rule by its title, as rules finds it (D-179, DAT-3, DAT-6): a house rule of the campaign first, else the game system's, with the table's precedents on it.
import { join } from "node:path";
import { houseRulesFolderName, readListSetting } from "../campaign/index.ts";
import { comparableText } from "../core/text.ts";
import { isTitled, readRuleBook, type RuleSection } from "../rules/index.ts";
import { type GameSystem, systemContentFolders } from "../systems/index.ts";

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

/** The rule with this title: a house rule first, else the game system's; undefined when neither has a section so titled. */
export function ruleTitled(root: string, system: GameSystem, title: string): TitledRule | undefined
{
    const titled = (section: RuleSection): boolean => isTitled(section, title);
    const house = readRuleBook(join(root, houseRulesFolderName), houseRules).find(titled);
    const section = house ?? systemRuleBook(system).find(titled);

    if (section === undefined) {
        return undefined;
    }

    const precedents = readListSetting(root, "precedents").filter((precedent) => comparableText(precedentRule(precedent) ?? "") === comparableText(title));
    return { source: section.source, text: section.text, precedents };
}

/** The rules of a game system, its own with those of the version of its rules (VER-3): a chapter of the version takes the place of a common one of its file. */
export function systemRuleBook(system: GameSystem): RuleSection[]
{
    const [own, version] = systemContentFolders(system).map((folder) => readRuleBook(join(folder, "rules"), system.name));
    return version === undefined ? own : [...own.filter((section) => !version.some((other) => other.file === section.file)), ...version];
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
