// A page renamed with what points to it (D-417): its file moves beside itself, and every link to it in the campaign's pages follows, with its section and its
// words, as Obsidian does; the old name stays among its aliases, so that what keeps it as it was, as the log, still finds it.
import { dirname, join } from "node:path";
import { files } from "../core/store.ts";
import { comparableText } from "../core/text.ts";
import { changeFields, type FieldChange, joinPageFile, readFields, splitPageFile } from "./page-file.ts";
import { checkPageName, otherPagesWithAlias, type Page, pagesWithName, systemPageNamed, textsIn, type World } from "./world.ts";

/** A page renamed: its new file, and the pages whose links now name it so. */
export interface Renamed
{
    path: string;
    links: number;
    pages: string[];
    /** The other page that keeps the old name, whose links are left as they are. */
    kept?: string;
}

/** A rename checked and ready to write: the page's new file, the pages whose links change, and the old file to remove, as full paths. */
export interface RenamePlan extends Renamed
{
    own: { path: string; text: string; };
    others: { path: string; text: string; }[];
    old: { path: string; text: string; };
}

/**
 * Plans the rename of a page of the campaign and of every link to it in the campaign's pages, writing nothing; refused for a page of the game system, a name
 * or an alias another page has, or a name that would leave a frontmatter unreadable. A rename stopped half way is planned again, to finish it.
 */
export function planRename(world: World, page: Page, to: string): RenamePlan
{
    checkPageName(to);

    if (page.system !== undefined) {
        throw new Error(`${page.name} is a page of the game system ${page.system}: read-only, it keeps its name. Nothing changed.`);
    }

    const path = join(dirname(page.path), `${to}.md`).split("\\").join("/");
    // The new page a rename stopped half way already wrote, with the old name among its aliases, is no other page.
    const halfDone = (other: Page): boolean => other.path === path && textsIn(other.fields.aliases).some((alias) => comparableText(alias.trim()) === comparableText(page.name));
    const taken = pagesWithName(world, to).find((other) => other !== page && !halfDone(other)) ?? systemPageNamed(world, to);

    if (taken !== undefined) {
        throw new Error(`${taken.name} is already a page${taken.system === undefined ? "" : ` of the game system ${taken.system}`}: give ${page.name} a name no page has. Nothing changed.`);
    }

    const aliased = otherPagesWithAlias(world, page, to).filter((other) => !halfDone(other));

    if (aliased.length > 0) {
        const holders = aliased.map((other) => other.name).join(" and ");
        throw new Error(
            `${to} is an alias of ${holders}, whose links would lead to ${page.name}: give ${page.name} another name, or first take ${to} out of the aliases of ${holders} with write ${
                aliased[0].name
            } --remove aliases=${to}. Nothing changed.`,
        );
    }

    // One of two pages with the same name, given by its path: the links to that name are left to the other, which keeps it.
    const kept = pagesWithName(world, page.name).find((other) => other !== page);
    const edited = world.pages.filter((other) => other.system === undefined).flatMap((other) => {
        const full = join(world.root, other.path);
        const text = files().fresh(full) ?? "";
        const { renamed, count } = kept === undefined ? renamedLinks(text, page.name, to) : { renamed: text, count: 0 };

        if (count > 0 && isReadable(text, other.path) && !isReadable(renamed, other.path)) {
            throw new Error(
                `Renaming ${page.name} to ${to} would leave the frontmatter of ${other.path} unreadable, as a ' in a link written between '…' quotes: choose a name without ', or rewrite that field of ${other.path} by hand between "…" quotes, then rename again. Nothing changed.`,
            );
        }

        return count === 0 && other !== page ? [] : [{ other, full, text, renamed, count }];
    });
    const self = edited.find((one) => one.other === page);
    const old = { path: join(world.root, page.path), text: self?.text ?? "" };
    // The old name stays among its aliases, but for a change of case alone.
    const sameName = comparableText(page.name) === comparableText(to);
    const own = { path: join(world.root, path), text: sameName ? (self?.renamed ?? "") : withOldName(self?.renamed ?? "", page.path, page.name, to) };
    const others = edited.filter((one) => one.other !== page);
    return {
        path,
        links: edited.reduce((sum, one) => sum + one.count, 0),
        pages: others.map((one) => one.other.name),
        own,
        others: others.map((one) => ({ path: one.full, text: one.renamed })),
        old,
        ...(kept === undefined ? {} : { kept: kept.path }),
    };
}

/**
 * Writes a planned rename: the page's new file first, then the links, and the old file goes last, so that a rename stopped half way leaves the page whole
 * and is finished by planning it again. A change of case alone is the same file on Windows and macOS: the links first, then the file anew.
 */
export function applyRename(plan: RenamePlan): void
{
    if (comparableText(plan.own.path) !== comparableText(plan.old.path)) {
        files().write(plan.own.path, plan.own.text);
        plan.others.forEach((other) => files().write(other.path, other.text));
        files().remove(plan.old.path);
        return;
    }

    plan.others.forEach((other) => files().write(other.path, other.text));
    files().remove(plan.old.path);

    try {
        files().write(plan.own.path, plan.own.text);
    } catch (error) {
        files().write(plan.old.path, plan.old.text);
        throw error;
    }
}

/** A text with its links to a page renamed, [[Lupa]], [[Lupa#Morso]] and [[Lupa|la lupa]] alike, in any case; and how many it renamed. */
export function renamedLinks(text: string, from: string, to: string): { renamed: string; count: number; }
{
    let count = 0;
    const renamed = text.replace(/\[\[([^\][|#^]+?)(\s*[#^][^\][|]*)?(\|[^\][]*)?\]\]/g, (link: string, name: string, section: string | undefined, words: string | undefined) => {
        if (comparableText(name.trim()) !== comparableText(from)) {
            return link;
        }

        count += 1;
        return `[[${to}${section ?? ""}${words ?? ""}]]`;
    });
    return { renamed, count };
}

/** Whether a page's frontmatter can be read. */
function isReadable(text: string, path: string): boolean
{
    try {
        readFields(splitPageFile(text).frontmatter, path);
        return true;
    } catch {
        return false;
    }
}

/** A page's text with its old name among its aliases, and its new one out of them; aliases written as one text become a list. */
function withOldName(text: string, path: string, from: string, to: string): string
{
    const file = splitPageFile(text);
    const aliases = readFields(file.frontmatter, path).aliases;
    const kept = textsIn(aliases).filter((alias) => comparableText(alias.trim()) !== comparableText(to));
    const listed = kept.some((alias) => comparableText(alias.trim()) === comparableText(from));
    const change: FieldChange = Array.isArray(aliases) && kept.length === aliases.length
        ? { add: { aliases: listed ? [] : [from] } }
        : { set: { aliases: listed ? kept : [...kept, from] } };
    return joinPageFile({ ...file, frontmatter: changeFields(file.frontmatter, change, path) });
}
