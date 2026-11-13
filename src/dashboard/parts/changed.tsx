// A page of the game system that the campaign changed (D-564), wherever the page shows one: a small pencil after its name, its words in its tooltip and for a
// screen reader; in the head of a page read whole, the words too, which lead to what changed, listed in Packages under the game system.
import { sectionAddress } from "../address.ts";
import type { ShownLayer } from "../data.ts";
import { foldedText, t } from "../text.ts";

/** What the address names in Packages' Installed tab to show the pages the campaign changed. */
export const changedItem = "changed";

// The pages the campaign changed in what the character knows, by their names and titles without case and accents, as the page last read them; and whether
// it changed any, which the page lists.
let changed: ReadonlySet<string> = new Set();
let listed = false;

/**
 * Sets the pages the campaign changed, as the view gives them; none, no page. One changed only in what the character does not know, as a creature never met,
 * is told by no name of a list: a sheet holds none of it, and its name may be another thing's, as a language's.
 */
export function setChangedPages(layers: readonly ShownLayer[] | undefined): void
{
    const known = (layers ?? []).filter((layer) => layer.fields.length > 0 || layer.sections.length > 0 || layer.introduction === true);
    changed = new Set(known.flatMap((layer) => [layer.name, ...(layer.title === undefined ? [] : [layer.title])]).map(foldedText));
    listed = (layers ?? []).length > 0;
}

/** Whether a name of a list, as a spell's on a sheet, which is only a name, is of a page the campaign changed. */
export function isChanged(name: string): boolean
{
    return changed.has(foldedText(name.trim()));
}

/** The pencil after a name: no control, its words for a screen reader and in its tooltip. */
export function ChangedMark()
{
    return (
        <span class="changed-mark" role="img" aria-label={t("Changed in this campaign")} data-tip={t("Changed in this campaign: Packages lists what changed")}>
            <Pencil />
        </span>
    );
}

/** In the head of a page read whole: the pencil and its words, a link to what changed while the page lists it, else words. */
export function ChangedLine()
{
    const words = (
        <>
            <Pencil />
            {t("Changed in this campaign")}
        </>
    );
    return <p class="changed-line">{listed ? <a href={sectionAddress("packages", "installed", changedItem)}>{words}</a> : <span>{words}</span>}</p>;
}

/** A pencil, filled, as the marks of 12 px are: its body and tip, and its end apart. */
function Pencil()
{
    return (
        <svg class="changed-icon" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M3.5 20.5l1.2-5.2L14.6 5.4l4 4L8.7 19.3Z M16.2 3.8l1-1a1.4 1.4 0 0 1 2 0l2 2a1.4 1.4 0 0 1 0 2l-1 1Z" />
        </svg>
    );
}
