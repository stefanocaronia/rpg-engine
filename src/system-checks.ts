// The checks every game system passes (SYS-2, SYS-5, SYS-8, D-172, D-267), for its own tests through the test kit: pages that read like a campaign's, each
// name once, no bases it lacks, every field declared and of its kind, rules in chapters, the pictures its pages link, and where it comes from.
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { basename, join } from "node:path";
import { parseRollFormula } from "./core/formula.ts";
import { FileStore, withFiles } from "./core/store.ts";
import { comparableText } from "./core/text.ts";
import { findImage, imageFileName, imagesFolderName } from "./images/index.ts";
import { coinsProblem, readCoins } from "./money/index.ts";
import { checkWorld, isStandardField, listFieldNames, loadWorld } from "./pages/index.ts";
import { isTitled, readRuleBook } from "./rules/index.ts";
import { type GameSystem, systemInFolder } from "./systems/index.ts";

/** What the checks find in a game system's folder: how much it holds, and what is wrong by check, each list empty when it passes. */
export interface SystemChecks
{
    /** Its name, as a campaign gives it: its package's, as @rpgengine/system-5e is 5e, else its folder's. */
    name: string;
    /** How many pages it has, and chapters of rules. */
    pages: number;
    chapters: number;
    /** Where it says it comes from, if it says. */
    attribution?: string;
    /** A page that does not read, and what validate finds in its pages. */
    unread: string[];
    /** A name two of its pages share among all its types, or one with a curly apostrophe (SYS-2, SYS-5). */
    names: string[];
    /** A page with a value YAML reads as a number, as the +2 of a shield, without quotes. */
    unquoted: string[];
    /** A page that derives from one it does not have (SYS-2, D-201). */
    bases: string[];
    /** What its system.yaml declares that does not read: coins, fields it does not declare, rules its chapters lack (DAT-1–DAT-7). */
    declarations: string[];
    /** A section of its rules outside a chapter, or whose title its path does not find (RUL-1, RUL-3). */
    rules: string[];
    /** A value not of its field's kind, or ending in a period; a formula of an item that does not read (SYS-8, PRO-5). */
    values: string[];
    /** A field of its pages it does not declare (SYS-8). */
    undeclared: string[];
    /** A picture its pages link that its images/ lacks, or one there no page links (D-267). */
    pictures: string[];
}

/** Checks the game system in this folder, the one with its system.yaml, as the engine reads it; it throws when its system.yaml does not read. */
export function systemChecks(folder: string): SystemChecks
{
    const system = systemInFolder(folder, systemName(folder));
    // Read as a campaign would be: the checks of validate apply to its pages too.
    const world = loadWorld(system.folder);
    const book = readRuleBook(join(system.folder, "rules"), system.name);
    return {
        name: system.name,
        pages: world.pages.length,
        chapters: book.length,
        ...(system.attribution === undefined ? {} : { attribution: system.attribution }),
        unread: [...world.problems, ...checkWorld(world).map((problem) => `${problem.path === undefined ? "" : `${problem.path}: `}${problem.message}`)],
        names: namesTwice(world.pages.map((page) => page.name)),
        unquoted: world.pages.filter((page) => /^[\w-]+: [+-]\d/m.test(readFileSync(join(system.folder, page.path), "utf8"))).map((page) => page.name),
        bases: world.pages.filter((page) => {
            const base = page.fields.creature ?? page.fields.item;
            return base !== undefined && !world.pages.some((other) => other.name === String(base).replace(/^\[\[|\]\]$/g, ""));
        }).map((page) => page.name),
        declarations: declarationProblems(system, world.pages.map((page) => page.name), book),
        rules: [
            ...book.filter((section) => section.level === 0).map((section) => `${section.file}: no chapter heading`),
            // A title with ›, > or / in it could not be read by its path.
            ...book.filter((section) => !isTitled(section, section.path.join(" › "))).map((section) => section.path.join(" › ")),
        ],
        values: wrongValues(system, world.pages),
        undeclared: undeclaredFields(system, world.pages),
        pictures: pictureProblems(system.folder, world.pages),
    };
}

type Pages = ReturnType<typeof loadWorld>["pages"];
type RuleBook = ReturnType<typeof readRuleBook>;

/** The name a campaign gives the system in this folder: its package's, without system-, else the folder's. */
function systemName(folder: string): string
{
    try {
        const manifest = JSON.parse(readFileSync(join(folder, "package.json"), "utf8")) as { name?: unknown; };

        if (typeof manifest.name === "string") {
            return basename(manifest.name).replace(/^system-/, "");
        }
    } catch {
        // A system of data alone has no package.json.
    }

    return basename(folder).replace(/^system-/, "");
}

/** The names given twice, without minding case and accents, and those with a curly apostrophe. */
function namesTwice(names: string[]): string[]
{
    const seen = new Set<string>();
    const twice = names.filter((name) => {
        const comparable = comparableText(name);
        const again = seen.has(comparable);
        seen.add(comparable);
        return again;
    });
    return [...twice.map((name) => `${name}: twice`), ...names.filter((name) => /[‘’]/.test(name)).map((name) => `${name}: a curly apostrophe`)];
}

/** What system.yaml declares that does not read: its coins, the fields its sheet, dice, line and values name, its thresholds, recipes and conditions. */
function declarationProblems(system: GameSystem, pageNames: string[], book: RuleBook): string[]
{
    const hasRule = (title: string): boolean => book.some((section) => isTitled(section, title));
    const declared = (field: string): boolean => Object.keys(system.fields).some((name) => (field.endsWith("*") ? name.startsWith(field.slice(0, -1)) : comparableText(name) === comparableText(field)));
    const coins = system.coins === undefined ? undefined : coinsProblem(typeof system.coins === "string" ? readCoins(system.coins) : system.coins);
    // The sheet may show a fixed field of the core, such as creature, the race (D-201), what the character has equipped (CON-12), or the purse a trade pays from, money (STK-8).
    const onSheet = system.sheet.flatMap((group) => group.entries.flatMap((entry) => (entry.beside === undefined ? [entry.field] : [entry.field, entry.beside]))).filter((field) => !isStandardField("character", field) && field !== "money");
    const named = [...onSheet, ...Object.keys(system.sheetDice), ...system.statusLine.map((entry) => entry.field), ...Object.keys(system.values)];
    // What every character with a sheet has in a list (D-235): a list of the system or of the core, and pages the system has.
    const lists = Object.keys(system.alwaysIn).filter((list) => system.fields[list] !== "list" && !(isStandardField("character", list) && listFieldNames.includes(list)));
    const always = Object.values(system.alwaysIn).flat().filter((name) => !pageNames.some((page) => comparableText(page) === comparableText(name)));
    return [
        ...(coins === undefined ? [] : [`coins: ${coins}`]),
        ...named.filter((field) => !declared(field)).map((field) => `${field}: named, not declared in fields`),
        ...system.thresholds.filter((threshold) => system.fields[threshold.field] !== "counter" || !hasRule(threshold.rule)).map((threshold) => `threshold ${threshold.field}: no counter, or no rule ${threshold.rule}`),
        ...system.recipes.flatMap((recipe) => [
            ...Object.keys(recipe.set).filter((field) => !declared(field)).map((field) => `recipe ${recipe.name}: ${field} not declared`),
            ...recipe.rules.filter((rule) => !hasRule(rule)).map((rule) => `recipe ${recipe.name}: no rule ${rule}`),
        ]),
        ...system.conditions.filter((condition) => !hasRule(condition)).map((condition) => `condition ${condition}: no rule of that title`),
        ...(system.roundSeconds === undefined || system.roundSeconds > 0 ? [] : ["round: not above 0 seconds"]),
        ...lists.map((list) => `always-in ${list}: not a list`),
        ...always.map((name) => `always-in ${name}: no page of that name`),
    ];
}

/** The values of declared fields that are not of their kind, or end in a period; a formula of an item that does not read (PRO-5). */
function wrongValues(system: GameSystem, pages: Pages): string[]
{
    const fits: Record<string, (value: unknown) => boolean> = {
        number: (value) => typeof value === "number",
        "at-least": (value) => typeof value === "number",
        modifier: (value) => typeof value === "number",
        bonus: (value) => typeof value === "number",
        // Text, or true and false, which write reads as such: a spell's ritual.
        text: (value) => typeof value === "string" || typeof value === "boolean",
        list: (value) => Array.isArray(value),
        counter: (value) => typeof value === "number" || (typeof value === "string" && /^\d+\/\d+$/.test(value)),
    };
    const kinds = new Map(Object.entries(system.fields).map(([field, kind]) => [comparableText(field), kind]));
    // A field whose value the classes' pages give as a formula holds that formula there (PRO-5).
    const formulas = new Set(Object.values(system.itemFormulas).flat().map(comparableText));
    return pages.flatMap((page) =>
        Object.entries(page.fields).filter(([field, value]) => {
            if (formulas.has(comparableText(field))) {
                return typeof value !== "string" || !readsAsFormula(value);
            }

            const kind = kinds.get(comparableText(field));
            return kind !== undefined && (!(fits[kind]?.(value) ?? true) || (typeof value === "string" && value.endsWith(".")));
        }).map(([field, value]) => `${page.name}: ${field} ${JSON.stringify(value)}`)
    );
}

/** The fields of its pages a system does not declare, beside the core's own. */
function undeclaredFields(system: GameSystem, pages: Pages): string[]
{
    const declared = new Set(Object.keys(system.fields).map(comparableText));
    return pages.flatMap((page) => Object.keys(page.fields).filter((field) => !isStandardField(page.type, field) && !declared.has(comparableText(field))).map((field) => `${page.name}: ${field}`));
}

/** The pictures its pages link that its images folder lacks, and those it has that no page links. */
function pictureProblems(folder: string, pages: Pages): string[]
{
    const linked = new Set(pages.map((page) => imageFileName(page.fields.image)).filter((name) => name !== undefined));
    const missing = [...linked].filter((name) => withFiles(new FileStore(), () => findImage([folder], name)) === undefined);
    const images = join(folder, imagesFolderName);
    const files = existsSync(images) ? readdirSync(images, { recursive: true, withFileTypes: true }).filter((entry) => entry.isFile()).map((entry) => entry.name) : [];
    return [...missing.map((name) => `${name}: linked, not in images/`), ...files.filter((name) => !linked.has(name)).map((name) => `${name}: in images/, linked by no page`)];
}

/** Whether a text reads as a formula, which may begin with dice and end with words, as a weapon's damage (PRO-5). */
function readsAsFormula(text: string): boolean
{
    try {
        parseRollFormula(text);
        return true;
    } catch {
        return false;
    }
}
