// The sections still to come (D-276, D-309), each saying what it will hold; Help, how to play with the engine; and About: the product, how it was made, the
// game system and its source's credit.
import type { Section } from "./address.ts";
import { sectionLabel } from "./address.ts";
import { footLinks } from "./footer.tsx";
import { systemTitleLabel } from "./labels.ts";
import { t } from "./text.ts";

/** A section the page does not have yet: what it will hold. */
export function Upcoming({ section }: { section: Section; })
{
    return (
        <section class="upcoming" aria-labelledby="upcoming-title">
            <h2 id="upcoming-title">{sectionLabel(section)}</h2>
            <p>{upcoming(section)}</p>
            <p class="upcoming-note">{t("It comes in a next step.")}</p>
        </section>
    );
}

/** How to play with the engine: the chat with the master, and this page beside it, section by section. */
export function Help()
{
    const parts: [string, string][] = [
        [t("In the chat"), t("Write what your character does or says, in your own words, and ask the master anything: a rule, what your character knows, how something works. Out of the story, write between brackets.")],
        [
            t("The rolls"),
            t("When a roll is yours, the master asks it and its buttons appear at the top of this page: a click rolls the dice. With By hand you roll your own dice and type their faces; you may also write what you do instead."),
        ],
        [sectionLabel("party"), t("Your character's sheet and the companions'. A click on a number rolls it for fun, never counted; the game's rolls are in the column beside it.")],
        [`${sectionLabel("scene")} · ${sectionLabel("combat")}`, t("Where the party is, its map and who stands where. In a fight, Combat shows the order of the turns and whose turn it is.")],
        [sectionLabel("journal"), t("The quests, the story by its scenes and your notes: follow a quest with its star, share a note with the master.")],
        [sectionLabel("world"), t("The map of the places your character knows, with how far they are.")],
        [`${sectionLabel("saves")} · ${sectionLabel("settings")}`, t("Save, or go back, as the campaign's saves allow. In Settings you change how the game plays: the master hears of it at their next move.")],
    ];
    return (
        <section class="upcoming help" aria-labelledby="help-title">
            <h2 id="help-title">{sectionLabel("help")}</h2>
            <p>{t("You play by talking with the master in the chat: you say what your character does, the master tells the story and runs the rules. This page stays open beside the chat and follows the game as it goes.")}</p>
            {parts.map(([title, text]) => (
                <div key={title}>
                    <h3>{title}</h3>
                    <p>{text}</p>
                </div>
            ))}
        </section>
    );
}

/** What the page is: the product, how it was made, where it lives and how to support it, the licences, and the game system the campaign plays with its credit. */
export function About({ product, system }: { product: string; system?: { name: string; title: string; attribution?: string; }; })
{
    return (
        <section class="upcoming about" aria-labelledby="about-title">
            <h2 id="about-title">{t("About")}</h2>
            <p>{t("{product}: the dashboard of the campaign, beside the chat where you play.", { product })}</p>
            <p>{t("Made with the help of AI. We invite everyone to use AI to make what they need: the people should take control of the means of production.")}</p>
            <p class="about-links">
                <a href={footLinks.github} target="_blank" rel="noreferrer">GitHub</a>
                <a href={footLinks.npm} target="_blank" rel="noreferrer">npm</a>
                <a href={footLinks.support} target="_blank" rel="noreferrer">{t("Support {product}", { product })}</a>
            </p>
            <p class="upcoming-note">{t("The code is under the MIT licence; each game system under its own, as its credits say.")}</p>
            {system && <h3>{`${system.name} · ${systemTitleLabel(system.title)}`}</h3>}
            {system?.attribution && <p class="upcoming-note">{system.attribution}</p>}
        </section>
    );
}

/** What a section to come will hold, as the plan says (D-269). */
function upcoming(section: Section): string | undefined
{
    return section === "world" ? t("What your character knows, the documents found and the calendar; the world map later.") : undefined;
}
