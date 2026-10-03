import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { comparableText } from "../core/text.ts";
import { repeatedNames, secretNames, sectionTitles, type TextMode, writeText } from "./markdown.ts";
import { changeFields, type FieldChange, holdsNestedList, joinPageFile, readFields, splitPageFile } from "./page-file.ts";
import { type PageType, pageTypeNames, pageTypes, worldFolderName } from "./page-types.ts";
import { checkStandardFields, containerFields, newPageFields } from "./standard-fields.ts";
import { checkPageName, findPage, holdersOf, linksIn, type Page, readPage, type World } from "./world.ts";

const fieldNamePattern = /^\p{L}[\p{L}\p{M}\p{N}_-]*$/u;

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

/** Writes a page: creates it when there is no page with that name and `type` is given, then applies the change. A change that leaves the page as it was writes nothing. */
export function writePage(world: World, name: string, type: PageType | undefined, requested: PageChange): { page: Page; created: boolean; changed: boolean; mode?: TextMode; }
{
    const existing = findPage(world, name);
    checkChange(existing, type, requested);
    const change = existing === undefined && type !== undefined ? { ...requested, set: { ...newPageFields(type), ...requested.set } } : requested;
    const mode = textMode(change);
    const path = existing?.path ?? newPagePath(world, name, type);
    const fullPath = join(world.root, path);
    const file = existing === undefined ? { body: "" } : splitPageFile(readFileSync(fullPath, "utf8"));
    const changedFields = [...Object.keys(change.set ?? {}), ...Object.keys(change.add ?? {}), ...Object.keys(change.remove ?? {})];
    const frontmatter = changedFields.length > 0 || change.unset !== undefined ? changeFields(file.frontmatter, change, path) : file.frontmatter;
    const body = change.text === undefined || mode === undefined ? file.body : writeText(file.body, change.text, { section: change.section, mode, secret: change.secret });
    checkNames(name, file.body, body);

    if (changedFields.length > 0) {
        const fields = readFields(frontmatter, path);
        checkStandardFields(existing?.type ?? type, fields, changedFields);
        checkContainers(world, existing, fields, changedFields);
    }

    const newText = joinPageFile({ frontmatter, body });

    if (existing !== undefined && newText === joinPageFile(file)) {
        return { page: existing, created: false, changed: false, mode };
    }

    mkdirSync(dirname(fullPath), { recursive: true });
    writeFileSync(fullPath, newText, "utf8");
    return { page: readPage(world.root, fullPath), created: existing === undefined, changed: true, mode };
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
        throw new Error(`${existing.name} already exists, as a ${existing.type ?? "free page"} (${existing.path}): leave the type out to change it, or pick another name.`);
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

    for (const name of [...Object.keys(change.set ?? {}), ...Object.keys(change.add ?? {})]) {
        if (!fieldNamePattern.test(name)) {
            throw new Error(`"${name}" cannot be a field name: start with a letter, and use only letters, digits, - and _.`);
        }
    }

    for (const [name, value] of [...Object.entries(change.set ?? {}), ...Object.entries(change.add ?? {})]) {
        if (holdsNestedList(value)) {
            throw new Error(`"${name}" would hold a list inside a list, which a field cannot hold. Give a list of links or text, such as ["[[A]]", "[[B]]"].`);
        }
    }

    for (const name of change.unset ?? []) {
        if (existing === undefined || !(name in existing.fields)) {
            throw new Error(`${existing?.name ?? "A new page"} has no field "${name}" to remove.`);
        }
    }
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

/** A thing can be in one place only: a place's contents or a character's inventory cannot list what another page already holds. */
function checkContainers(world: World, existing: Page | undefined, fields: Record<string, unknown>, changedFields: string[]): void
{
    for (const field of containerFields.filter((candidate) => changedFields.includes(candidate))) {
        for (const target of linksIn(fields[field])) {
            const holder = holdersOf(world, target).find((page) => page !== existing);

            if (holder !== undefined) {
                throw new Error(`${target} is already in ${holder.name}: a thing can be in one place only. Remove it from ${holder.name} first.`);
            }
        }
    }
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
