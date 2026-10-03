import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { writeText } from "./markdown.ts";
import { changeFields, joinPageFile, splitPageFile } from "./page-file.ts";
import { type PageType, pageTypeNames, pageTypes, worldFolderName } from "./page-types.ts";
import { checkPageName, findPage, type Page, readPage, type World } from "./world.ts";

const fieldNamePattern = /^\p{L}[\p{L}\p{N}_-]*$/u;

/** What to change on a page: fields to set or remove, and text for the whole page or for one section. */
export interface PageChange
{
    set?: Record<string, unknown>;
    unset?: string[];
    text?: string;
    /** The heading of the section that `text` is for; the whole text if left out. */
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
    const changesFields = change.set !== undefined || change.unset !== undefined;
    const frontmatter = changesFields ? changeFields(file.frontmatter, change.set ?? {}, change.unset ?? [], path) : file.frontmatter;
    const body = change.text === undefined ? file.body : writeText(file.body, change.text, change);
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

    if (existing !== undefined && change.set === undefined && change.unset === undefined && change.text === undefined) {
        throw new Error(`Nothing to write on ${existing.name}: give fields to set or to remove, or text.`);
    }

    if (change.section?.trim() === "") {
        throw new Error("Give the title of the section, or leave the section out to write the whole text.");
    }

    for (const name of Object.keys(change.set ?? {})) {
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
