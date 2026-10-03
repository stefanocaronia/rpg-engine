import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { repeatedNames, writeText } from "./markdown.ts";
import { changeFields, type FieldChange, joinPageFile, readFields, splitPageFile } from "./page-file.ts";
import { type PageType, pageTypeNames, pageTypes, worldFolderName } from "./page-types.ts";
import { checkStandardFields, containerFields } from "./standard-fields.ts";
import { checkPageName, findPage, holdersOf, linksIn, type Page, readPage, type World } from "./world.ts";

const fieldNamePattern = /^\p{L}[\p{L}\p{N}_-]*$/u;

/** What to change on a page: its fields, and the text of its introduction, of one section or of one secret. */
export interface PageChange extends FieldChange
{
    text?: string;
    /** The section or secret that `text` is for; the introduction if left out. */
    section?: string;
    /** Add `text` at the end instead of replacing. */
    append?: boolean;
}

/** Writes a page: creates it when there is no page with that name and `type` is given, then applies the change. A change that leaves the page as it was writes nothing. */
export function writePage(world: World, name: string, type: PageType | undefined, change: PageChange): { page: Page; created: boolean; changed: boolean; }
{
    const existing = findPage(world, name);
    checkChange(existing, type, change);
    const path = existing?.path ?? newPagePath(world, name, type);
    const fullPath = join(world.root, path);
    const file = existing === undefined ? { body: "" } : splitPageFile(readFileSync(fullPath, "utf8"));
    const changedFields = [...Object.keys(change.set ?? {}), ...Object.keys(change.add ?? {}), ...Object.keys(change.remove ?? {})];
    const frontmatter = changedFields.length > 0 || change.unset !== undefined ? changeFields(file.frontmatter, change, path) : file.frontmatter;
    const body = change.text === undefined ? file.body : writeText(file.body, change.text, change);
    checkNames(name, file.body, body);

    if (changedFields.length > 0) {
        const fields = readFields(frontmatter, path);
        checkStandardFields(existing?.type ?? type, fields, changedFields);
        checkContainers(world, existing, fields, changedFields);
    }

    const newText = joinPageFile({ frontmatter, body });

    if (existing !== undefined && newText === joinPageFile(file)) {
        return { page: existing, created: false, changed: false };
    }

    mkdirSync(dirname(fullPath), { recursive: true });
    writeFileSync(fullPath, newText, "utf8");
    return { page: readPage(world.root, fullPath), created: existing === undefined, changed: true };
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

    for (const name of [...Object.keys(change.set ?? {}), ...Object.keys(change.add ?? {})]) {
        if (!fieldNamePattern.test(name)) {
            throw new Error(`"${name}" cannot be a field name: start with a letter, and use only letters, digits, - and _.`);
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
    const alreadyRepeated = repeatedNames(oldBody).map((name) => name.toLowerCase());
    const repeated = repeatedNames(newBody).filter((name) => !alreadyRepeated.includes(name.toLowerCase()));

    if (repeated.length > 0) {
        throw new Error(`${page} would have two sections or secrets named "${repeated[0]}": names must be unique in a page. To change that section, write ${page}#${repeated[0]}.`);
    }
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
