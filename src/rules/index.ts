// Rules as text (D-161, D-178, RUL): the sections of markdown files, found by their words and read exactly as they are written.
export { bookTitles, readRuleBook, ruleFiles, type RuleSection, ruleSections } from "./rule-book.ts";
export { findRules, hasAllWords, isTitled, type RuleFinding } from "./search.ts";
export { type ShownRule, shownRules } from "./shown.ts";
