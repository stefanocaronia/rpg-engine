// A page of the game system that the campaign changed (D-564), wherever the page shows one: a small asterisk after its name, as a note's in a book, its words in its tooltip and for a
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

/** The asterisk after a name: no control, its words for a screen reader and in its tooltip. */
export function ChangedMark()
{
    return (
        <span class="changed-mark" role="img" aria-label={t("Changed in this campaign")} data-tip={t("Changed in this campaign: Packages lists what changed")}>
            <Asterisk />
        </span>
    );
}

/** In the head of a page read whole: the asterisk and its words, as the note it stands for, a link to what changed while the page lists it, else words. */
export function ChangedLine()
{
    const words = (
        <>
            <Asterisk />
            {t("Changed in this campaign")}
        </>
    );
    return <p class="changed-line">{listed ? <a href={sectionAddress("packages", "installed", changedItem)}>{words}</a> : <span>{words}</span>}</p>;
}

/** An asterisk of six arms, never five, which at 12 px read as a favourite's star: it says there is a note, never that something can be edited. */
function Asterisk()
{
    return (
        <svg class="changed-icon" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 2.4v19.2M3.7 7.2l16.6 9.6M3.7 16.8l16.6-9.6" />
        </svg>
    );
}
