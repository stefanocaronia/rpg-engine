// A page renamed with what points to it (D-417): its file moves beside itself, and every link to it in the campaign's pages follows, with its section and its
// words, as Obsidian does; the old name stays among its aliases, so that what keeps it as it was, as the log, still finds it.
import { dirname, join } from "node:path";
import { files } from "../core/store.ts";
import { comparableText } from "../core/text.ts";
import { checkPageName, type Page, pagesWithName, systemPageNamed, type World } from "./world.ts";

/** A page renamed: its new file, and the pages whose links now name it so. */
export interface Renamed
{
    path: string;
    links: number;
    pages: string[];
}

/** Renames a page of the campaign and every link to it in the campaign's pages; refused for a page of the game system, or a name another page has. */
export function renamePage(world: World, page: Page, to: string): Renamed
{
    checkPageName(to);

    if (page.system !== undefined) {
        throw new Error(`${page.name} is a page of the game system ${page.system}: read-only, it keeps its name. Nothing changed.`);
    }

    const taken = pagesWithName(world, to).find((other) => other !== page) ?? systemPageNamed(world, to);

    if (taken !== undefined) {
        throw new Error(`${taken.name} is already a page${taken.system === undefined ? "" : ` of the game system ${taken.system}`}: give ${page.name} a name no page has. Nothing changed.`);
    }

    const path = join(dirname(page.path), `${to}.md`).split("\\").join("/");
    const linked = world.pages.filter((other) => other.system === undefined).flatMap((other) => {
        const full = join(world.root, other.path);
        const text = files().fresh(full) ?? "";
        const { renamed, count } = renamedLinks(text, page.name, to);
        return count === 0 ? [] : [{ other, full, renamed, count }];
    });

    for (const { other, full, renamed } of linked) {
        if (other !== page) {
            files().write(full, renamed);
        }
    }

    // The page itself, with its own links renamed, moves: a change of case alone is the same file on Windows and macOS, so the old one goes first.
    const own = linked.find((one) => one.other === page)?.renamed ?? files().fresh(join(world.root, page.path)) ?? "";
    const sameFile = comparableText(page.name) === comparableText(to);

    if (sameFile) {
        files().remove(join(world.root, page.path));
        files().write(join(world.root, path), own);
    } else {
        files().write(join(world.root, path), own);
        files().remove(join(world.root, page.path));
    }

    return { path, links: linked.reduce((sum, one) => sum + one.count, 0), pages: linked.filter((one) => one.other !== page).map((one) => one.other.name) };
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
