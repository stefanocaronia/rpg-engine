import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { comparableText, withArticle } from "../core/text.ts";
import { holdRefusal } from "./containers.ts";
import { baseChain, baseValue, ownFieldChange, sameAsBase } from "./inheritance.ts";
import { introductionText, partContent, readSection, repeatedNames, secretNames, sectionTitles, type TextMode, writeText } from "./markdown.ts";
import { changeFields, type FieldChange, holdsNestedList, joinPageFile, readFields, splitPageFile } from "./page-file.ts";
import { type PageType, pageTypeNames, pageTypes, worldFolderName } from "./page-types.ts";
import { canHold, checkStandardFields, containerFieldOf, containerFields, isFieldName, isStandardField, misspelledStandardField, newPageFields } from "./standard-fields.ts";
import { checkPageName, findPage, holdersOf, linksIn, locate, type Page, readPage, withPage, type World } from "./world.ts";

/** What to change on a page: its fields, and the text of its introduction, of one section or of one secret. */
export interface PageChange extends FieldChange
{
    text?: string;
    /** The section or secret that `text` is for; the introduction if left out. */
    section?: string;
    /** Add `text` at the end instead of replacing. */
    append?: boolean;
    /** Create the missing `section` as a secret block, `> [!secret] Name`, instead of a heading. */
    secret?: boolean;
}

/**
 * Writes a page: creates it when there is no page with that name and `type` is given, then applies the change. A change that leaves the page as it was writes nothing.
 * Fields keep the names the page gives them, and a list it inherits becomes its own before items are added or removed (INH-5, INH-7).
 */
export function writePage(world: World, name: string, type: PageType | undefined, requested: PageChange): { page: Page; created: boolean; changed: boolean; mode?: TextMode; }
{
    const existing = findPage(world, name);
    checkChange(existing, type, requested);
    const fields = existing === undefined ? requested : { ...requested, ...ownFieldChange(world, existing, requested) };
    checkUnset(world, existing, requested.unset ?? [], fields.unset ?? []);
    const change = existing === undefined && type !== undefined ? { ...fields, set: { ...newPageFields(type), ...fields.set } } : fields;
    const mode = textMode(change);
    const path = existing?.path ?? newPagePath(world, name, type);
    const fullPath = join(world.root, path);
    const file = existing === undefined ? { body: "" } : splitPageFile(readFileSync(fullPath, "utf8"));
    const changedFields = [...Object.keys(change.set ?? {}), ...Object.keys(change.add ?? {}), ...Object.keys(change.remove ?? {})];
    const frontmatter = withoutBaseValues(world, existing, { name, type, path }, changedFields, changedFields.length > 0 || change.unset !== undefined ? changeFields(file.frontmatter, change, path) : file.frontmatter);
    const written = { name: existing?.name ?? name, type: existing?.type ?? type, path, fields: readFields(frontmatter, path), body: file.body };
    const body = change.text === undefined || mode === undefined ? file.body : writeOwnText(withPage(world, existing, written), written, { ...change, text: change.text, mode });
    checkNames(name, file.body, body);

    if (changedFields.length > 0) {
        const fields = readFields(frontmatter, path);
        checkStandardFields(existing?.type ?? type, fields, changedFields);
        checkContainers(world, existing, { name: existing?.name ?? name, type: existing?.type ?? type }, fields, changedFields);
    }

    const newText = joinPageFile({ frontmatter, body });

    if (existing !== undefined && newText === joinPageFile(file)) {
        return { page: existing, created: false, changed: false, mode };
    }

    mkdirSync(dirname(fullPath), { recursive: true });
    writeFileSync(fullPath, newText, "utf8");
    return { page: readPage(world.root, fullPath), created: existing === undefined, changed: true, mode };
}

/**
 * Writes the text of a change on the page as it will be written, with its creature. A section or secret, or the introduction, that the page shows only from a base
 * becomes its own, of the same kind: a secret stays a secret, and text added to it starts from the base's text, as items added to an inherited list (INH-13, D-124).
 * The base does not change.
 */
function writeOwnText(world: World, page: Page, change: PageChange & { text: string; mode: TextMode; }): string
{
    const body = page.body;

    if (change.section === undefined) {
        const introducer = change.mode === "append" && introductionText(body) === "" ? baseChain(world, page).find((base) => introductionText(base.body) !== "") : undefined;
        return introducer === undefined ? writeText(body, change.text, { mode: change.mode }) : writeText(body, joinTexts(introductionText(introducer.body), change.text), { mode: "replace" });
    }

    const inherited = readSection(body, change.section) !== undefined ? undefined : basePart(world, page, change.section);

    if (inherited !== undefined && change.mode === "remove") {
        throw new Error(`${page.name} has no section or secret "${change.section}" of its own: it shows the one of ${inherited.base.name}. To remove it for everything that derives from ${inherited.base.name}, remove it there.`);
    }

    const text = inherited === undefined || change.mode !== "append" ? change.text : joinTexts(inherited.content, change.text);
    return writeText(body, text, { section: change.section, mode: change.mode, secret: change.secret === true || inherited?.secret === true });
}

function joinTexts(first: string, second: string): string
{
    return [first, second.trim()].filter((part) => part !== "").join("\n\n");
}

/** The nearest base that has a section or secret with this name, with its own text and kind. */
function basePart(world: World, page: Page, name: string): { base: Page; secret: boolean; content: string; } | undefined
{
    for (const base of baseChain(world, page)) {
        const part = partContent(base.body, name);

        if (part !== undefined) {
            return { base, ...part };
        }
    }

    return undefined;
}

/** The frontmatter without the changed fields whose value the page would read from its bases all the same: a page holds only its differences (INH-9, D-125). */
function withoutBaseValues(world: World, existing: Page | undefined, page: { name: string; type?: PageType; path: string; }, changed: string[], frontmatter: string | undefined): string | undefined
{
    if (changed.length === 0) {
        return frontmatter;
    }

    // When the creature changes, every value the page holds is checked against the new one.
    const written = { name: existing?.name ?? page.name, type: existing?.type ?? page.type, path: page.path, fields: readFields(frontmatter, page.path), body: "" };
    const now = withPage(world, existing, written);
    const checked = changed.some((field) => comparableText(field) === "creature") ? Object.keys(written.fields) : changed;
    const same = checked.filter((field) => Object.hasOwn(written.fields, field) && sameAsBase(now, written, field));
    return same.length === 0 ? frontmatter : changeFields(frontmatter, { unset: same }, page.path);
}

/** How a change writes its text: added at the end, in place of the old text, or, empty for a section or secret, removing it. */
function textMode(change: PageChange): TextMode | undefined
{
    if (change.text === undefined) {
        return undefined;
    }

    if (change.append) {
        return "append";
    }

    return change.section !== undefined && change.text.trim() === "" ? "remove" : "replace";
}

function checkChange(existing: Page | undefined, type: PageType | undefined, change: PageChange): void
{
    if (existing !== undefined && type !== undefined && existing.type !== type) {
        throw new Error(`${existing.name} already exists, as ${withArticle(existing.type ?? "free page")} (${existing.path}): leave the type out to change it, or pick another name.`);
    }

    const changesSomething = [change.set, change.unset, change.add, change.remove, change.text].some((part) => part !== undefined);

    if (existing !== undefined && !changesSomething) {
        throw new Error(`Nothing to write on ${existing.name}: give fields to set, add or remove, or text.`);
    }

    if (change.section?.trim() === "") {
        throw new Error("Give the title of the section, or leave the section out to write the introduction.");
    }

    if (/\[!secret\]/i.test(change.section ?? "")) {
        throw new Error("Give only the secret's name, as Page#Name, and add secret to create it: the [!secret] mark is written for you.");
    }

    if (/[\r\n]/.test(change.section ?? "")) {
        throw new Error("A section or secret name must be one line: write the name without line breaks.");
    }

    if (change.secret && change.section === undefined) {
        throw new Error("Give the secret's name, as Page#Name, to write a secret.");
    }

    if (change.append && change.text?.trim() === "") {
        throw new Error("Give the text to add. To remove a section or secret, write empty text without append.");
    }

    checkFieldChange(existing?.type ?? type, change);
}

/** Only a field the page writes can be removed: one it only inherits is held by its base, which the message names. `written` are the names as the page writes them. */
function checkUnset(world: World, existing: Page | undefined, requested: string[], written: string[]): void
{
    requested.forEach((name, index) => {
        if (existing === undefined || !Object.hasOwn(existing.fields, written[index] ?? name)) {
            const base = existing === undefined ? undefined : baseValue(world, existing, name);
            const from = base === undefined ? "" : ` It reads ${base.name} from ${base.base.name}: remove it there, or set it on ${existing?.name} to hold a value of its own.`;
            throw new Error(`${existing?.name ?? "A new page"} has no field "${name}" to remove.${from}`);
        }
    });
}

/** Checks the fields of a change on a page of a type: names a field can have, no list inside a list, and each field given once. Items may be added to a list and removed from it together. */
export function checkFieldChange(type: PageType | undefined, change: FieldChange): void
{
    for (const name of [...Object.keys(change.set ?? {}), ...Object.keys(change.add ?? {})]) {
        if (!isFieldName(name)) {
            throw new Error(`"${name}" cannot be a field name: start with a letter, and use only letters, digits, - and _.`);
        }
    }

    for (const [name, value] of [...Object.entries(change.set ?? {}), ...Object.entries(change.add ?? {})]) {
        if (holdsNestedList(value)) {
            throw new Error(`"${name}" would hold a list inside a list, which a field cannot hold. Give a list of links or text, such as ["[[A]]", "[[B]]"].`);
        }
    }

    const set = Object.keys(change.set ?? {});
    const unset = change.unset ?? [];

    // Removing a field in two spellings removes both, as written: only giving a value twice is unclear.
    for (const names of [set, Object.keys(change.add ?? {}), Object.keys(change.remove ?? {})]) {
        const [repeated] = repeatedFieldNames(type, names);

        if (repeated !== undefined) {
            throw new Error(`The field ${repeated} is given twice: give each field once.`);
        }
    }

    // A list changed item by item counts once, however many items are added and removed; so does a field removed in several spellings.
    const lists = new Map([...Object.keys(change.add ?? {}), ...Object.keys(change.remove ?? {})].map((name) => [fieldKey(type, name), name]));
    const removed = new Map(unset.map((name) => [fieldKey(type, name), name]));
    const [twice] = repeatedFieldNames(type, [...set, ...removed.values(), ...lists.values()]);

    if (twice !== undefined) {
        throw new Error(`The field ${twice} is given in two ways (set, unset, or add and remove): give it in one.`);
    }
}

/** The names that give the same field more than once. */
function repeatedFieldNames(type: PageType | undefined, names: string[]): string[]
{
    const keys = names.map((name) => fieldKey(type, name));
    return names.filter((_, index) => keys.indexOf(keys[index]) !== index);
}

/** How fields are told apart: a free field in any case (INH-5); a standard one only as written, since in another case it is another field, which the engine does not read. */
function fieldKey(type: PageType | undefined, name: string): string
{
    return isStandardField(type, name) || misspelledStandardField(type, name) !== undefined ? name : comparableText(name);
}

/** Sections and secrets need unique names within a page, so that Page#Name always finds one place. */
function checkNames(page: string, oldBody: string, newBody: string): void
{
    const alreadyRepeated = repeatedNames(oldBody).map(comparableText);
    const [repeated] = repeatedNames(newBody).filter((name) => !alreadyRepeated.includes(comparableText(name)));

    if (repeated === undefined) {
        return;
    }

    if (sectionAndSecretNames(oldBody).includes(comparableText(repeated))) {
        throw new Error(`${page} already has a section or secret named "${repeated}", and names must be unique in a page. To change it, write ${page}#${repeated}; for a new one, pick another name.`);
    }

    throw new Error(`The text names "${repeated}" twice: give each section or secret of ${page} its own name.`);
}

function sectionAndSecretNames(body: string): string[]
{
    return [...sectionTitles(body), ...secretNames(body)].map(comparableText);
}

/**
 * A container lists only what it can hold, never what holds it, nor what is already elsewhere (CON-1, CON-3, CON-7). Only the entries a write adds are checked:
 * the others are validate's.
 */
function checkContainers(world: World, existing: Page | undefined, page: { name: string; type?: PageType; }, fields: Record<string, unknown>, changedFields: string[]): void
{
    const own = containerFieldOf(page.type);

    for (const field of containerFields.filter((candidate) => changedFields.includes(candidate))) {
        const before = new Set(linksIn(existing?.fields[field]).map(comparableText));
        const added = linksIn(fields[field]).filter((name) => !before.has(comparableText(name)));

        // In a field the type does not use, taking things out is always allowed: it is how such a field is cleaned.
        if (field !== own) {
            if (added.length > 0) {
                throw new Error(wrongContainerField(page, field));
            }

            continue;
        }

        for (const target of added) {
            const problem = holdProblem(world, existing ?? { ...page, path: "", fields: {}, body: "" }, target);

            if (problem !== undefined) {
                throw new Error(problem);
            }
        }
    }
}

/** Why `holder` cannot list the page named `target` (CON-1, CON-3): it cannot hold its type, it is that page or inside it, or the page is already elsewhere. */
function holdProblem(world: World, holder: Page, target: string): string | undefined
{
    const page = findPage(world, target);

    if (page !== undefined && !canHold(holder.type, page.type)) {
        return holdRefusal(holder, page);
    }

    if (comparableText(target) === comparableText(holder.name) || (page !== undefined && locate(world, holder).chain.includes(page))) {
        return `${holder.name} cannot hold ${target}, which ${comparableText(target) === comparableText(holder.name) ? "is itself" : `holds ${holder.name}`}: a thing is never inside itself.`;
    }

    // A page that lists itself holds itself nowhere (CON-3): that is validate's to report.
    const elsewhere = holdersOf(world, target).find((other) => other.path !== holder.path && comparableText(other.name) !== comparableText(target) && (page === undefined || canHold(other.type, page.type)));
    // A page still to create cannot be a destination yet: create it first.
    const how = holder.path === "" ? `create ${holder.name} without it, then move, page ${target}, to ${holder.name}` : `use move, page ${target}, to ${holder.name}`;
    return elsewhere === undefined ? undefined : `${target} is already in ${elsewhere.name}: a thing can be in one place only. To move it, ${how}.`;
}

/** Why a type does not list things in this field (CON-1): a character carries in inventory, places and items hold in contains, the other types hold nothing. */
function wrongContainerField(page: { name: string; type?: PageType; }, field: string): string
{
    const own = containerFieldOf(page.type);
    const what = `${page.name} is ${withArticle(page.type ?? "free page")}`;
    return own === undefined
        ? `${what}, which holds nothing, so ${field} would put nothing anywhere. A place holds places, characters and items; a character carries items; an item holds items.`
        : `${what}: what it holds goes in ${own}, not ${field}.`;
}

function newPagePath(world: World, name: string, type: PageType | undefined): string
{
    if (type === undefined) {
        throw new Error(`There is no page named ${name}. To create it, give its type: ${pageTypeNames.join(", ")}.`);
    }

    checkPageName(name);
    const path = `${worldFolderName}/${pageTypes[type]}/${name}.md`;

    if (existsSync(join(world.root, path))) {
        const problem = world.problems.find((candidate) => candidate.includes(path));
        throw new Error(`${path} already exists, but it cannot be read as a page${problem === undefined ? "" : `: ${problem}`}. Fix it or remove it by hand.`);
    }

    return path;
}
