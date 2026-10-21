// Rules as text (D-161, D-178, RUL): the sections of markdown files, found by their words and read exactly as they are written; and the pages of the player's
// books, found as BM25 counts them, each shown by the section the words are in (D-491, LIB-6, LIB-7).
export { findPages, type PageExcerpt, pageExcerpt, type PageFinding, pageTitle, type SearchedBook } from "./page-search.ts";
export { bookTitles, readRuleBook, ruleFiles, type RuleSection, ruleSections } from "./rule-book.ts";
export { findRules, hasAllWords, isTitled, type RuleFinding } from "./search.ts";
export { type ShownRule, shownRules } from "./shown.ts";
