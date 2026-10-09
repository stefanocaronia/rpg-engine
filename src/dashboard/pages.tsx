// The sections still to come (D-276, D-309), each saying what it will hold; and About: the product, the game system and its source's credit.
import type { Section } from "./address.ts";
import { sectionLabel } from "./address.ts";
import { phraseLabel } from "./labels.ts";

// What each section to come will hold, as the plan says (D-269).
const upcoming: Partial<Record<Section, string>> = {
    journal: "The summary of the last session, the diary, your private notes and the quests.",
    world: "What your character knows, the documents found and the calendar; the world map later.",
    rules: "The rules of the game, to look up.",
    saves: "The saves of the campaign.",
    settings: "The settings of the campaign.",
};

/** A section the page does not have yet: what it will hold. */
export function Upcoming({ section }: { section: Section; })
{
    return (
        <section class="upcoming" aria-labelledby="upcoming-title">
            <h2 id="upcoming-title">{sectionLabel(section)}</h2>
            <p>{upcoming[section]}</p>
            <p class="upcoming-note">It comes in a next step.</p>
        </section>
    );
}

/** What the page is: the product, and the game system the campaign plays with its source's credit. */
export function About({ product, system }: { product: string; system?: { name: string; title: string; attribution?: string; }; })
{
    return (
        <section class="upcoming" aria-labelledby="about-title">
            <h2 id="about-title">About</h2>
            <p>{product}: the dashboard of the campaign, beside the chat where you play.</p>
            {system && <p>{`${system.name} · ${phraseLabel(system.title)}`}</p>}
            {system?.attribution && <p class="upcoming-note">{system.attribution}</p>}
        </section>
    );
}
