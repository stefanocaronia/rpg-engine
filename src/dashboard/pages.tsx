// The pages' head, their section's icon and name in the accent (D-409); the sections still to come (D-276, D-309), each saying what it will hold; Help, how to
// play with the engine, its parts as cards; and About: the product with its links, the game system, then small the licences, the credits and how it was made.
import { useState } from "preact/hooks";
import type { Section } from "./address.ts";
import { sectionLabel } from "./address.ts";
import { CardHeader } from "./card.tsx";
import { footLinks } from "./footer.tsx";
import { Icon, type IconName, iconPath } from "./icons.tsx";
import { systemTitleLabel } from "./labels.ts";
import { t } from "./text.ts";

/** A page's head, out of Party and Scene: its section's icon and its title, both in the accent (D-409). */
export function PageHead({ section, id, title }: { section: Section; id: string; title?: string; })
{
    return (
        <div class="page-head">
            <span class="page-mark">
                <Icon name={section} />
            </span>
            <h2 id={id}>{title ?? sectionLabel(section)}</h2>
        </div>
    );
}

/** A section the page does not have yet: what it will hold. */
export function Upcoming({ section }: { section: Section; })
{
    return (
        <section class="page-stack" aria-labelledby="upcoming-title">
            <PageHead section={section} id="upcoming-title" />
            <div class="upcoming">
                <p>{upcoming(section)}</p>
                <p class="upcoming-note">{t("It comes in a next step.")}</p>
            </div>
        </section>
    );
}

/** How to play with the engine (D-409): what it is, an index of chips, and each part a card that folds, the first two open. */
export function Help()
{
    const parts: { icon: IconName; title: string; text: string; }[] = [
        {
            icon: "chat",
            title: t("In the chat"),
            text: t("Write what your character does or says, in your own words, and ask the master anything: a rule, what your character knows, how something works. Out of the story, write between brackets."),
        },
        {
            icon: "dice",
            title: t("The rolls"),
            text: t("When a roll is yours, the master asks it and its buttons appear at the top of this page: a click rolls the dice. With By hand you roll your own dice and type their faces; you may also write what you do instead."),
        },
        { icon: "party", title: sectionLabel("party"), text: t("Your character's sheet and the companions'. A click on a number rolls it for fun, never counted; the game's rolls are in the column beside it.") },
        {
            icon: "scene",
            title: `${sectionLabel("scene")} · ${sectionLabel("combat")}`,
            text: t("Where the party is, its map and who stands where. In a fight, Combat shows the order of the turns and whose turn it is."),
        },
        { icon: "journal", title: sectionLabel("journal"), text: t("The quests, the story by its scenes and your notes: follow a quest with its star, share a note with the master.") },
        { icon: "world", title: sectionLabel("world"), text: t("The map of the places your character knows, with how far they are.") },
        {
            icon: "saves",
            title: `${sectionLabel("saves")} · ${sectionLabel("settings")}`,
            text: t("Save, or go back, as the campaign's saves allow. In Settings you change how the game plays: the master hears of it at their next move."),
        },
    ];
    const [open, setOpen] = useState(() => new Set([0, 1]));

    const toggle = (index: number, event: MouseEvent): void => {
        event.preventDefault();
        setOpen((before) => new Set(before.has(index) ? [...before].filter((one) => one !== index) : [...before, index]));
    };

    // A chip of the index opens its card and brings it into sight, the keyboard on its header.
    const go = (index: number): void => {
        setOpen((before) => new Set([...before, index]));
        const card = document.getElementById(`help-${index}`);
        card?.scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" });
        card?.querySelector("summary")?.focus({ preventScroll: true });
    };

    return (
        <section class="page-stack help" aria-labelledby="help-title">
            <PageHead section="help" id="help-title" />
            <p class="help-lead">
                {t("You play by talking with the master in the chat: you say what your character does, the master tells the story and runs the rules. This page stays open beside the chat and follows the game as it goes.")}
            </p>
            <nav class="help-index" aria-label={t("Contents")}>
                {parts.map((part, index) => (
                    <button key={part.title} type="button" class="help-chip" onClick={() => go(index)}>
                        <Icon name={part.icon} />
                        {part.title}
                    </button>
                ))}
            </nav>
            <div class="help-cards">
                {parts.map((part, index) => (
                    <details key={part.title} id={`help-${index}`} class="group help-card" open={open.has(index)}>
                        <CardHeader icon={iconPath(part.icon)} title={<h3>{part.title}</h3>} preview={part.text} open={open.has(index)} onToggle={(event) => toggle(index, event)} />
                        <p>{part.text}</p>
                    </details>
                ))}
            </div>
        </section>
    );
}

/**
 * What the page is (D-409): a card of the product, with the robot and its links; a card of the game system the campaign plays; then, out of the cards and small,
 * how it was made, the licences, the system's credits and ours.
 */
export function About({ product, system }: { product: string; system?: { name: string; title: string; attribution?: string; }; })
{
    return (
        <section class="page-stack about" aria-labelledby="about-title">
            <PageHead section="about" id="about-title" />
            <article class="about-hero">
                <img src="/assets/icon-180.png" alt="" />
                <div>
                    <h3>{product}</h3>
                    <p>{t("The dashboard of the campaign, beside the chat where you play.")}</p>
                    <p class="about-links">
                        <a class="about-link" href={footLinks.github} target="_blank" rel="noreferrer">
                            <Icon name="github" />
                            GitHub
                        </a>
                        <a class="about-link" href={footLinks.npm} target="_blank" rel="noreferrer">
                            <Icon name="npm" />
                            npm
                        </a>
                        <a class="about-link" href={footLinks.support} target="_blank" rel="noreferrer">
                            <Icon name="heart" />
                            {t("Support {product}", { product })}
                        </a>
                    </p>
                </div>
            </article>
            {system && (
                <details class="group about-system" open>
                    <CardHeader icon={iconPath("dice")} title={<h3>{t("Game system")}</h3>} open onToggle={() => undefined} fixed />
                    <p>
                        <span class="system-chip">{system.name}</span>
                        {systemTitleLabel(system.title)}
                    </p>
                </details>
            )}
            <footer class="about-fine">
                <p class="about-made">{t("Made with the help of AI. We invite everyone to use AI to make what they need: the people should take control of the means of production.")}</p>
                <p>{t("The code is under the MIT licence; each game system under its own, as its credits say.")}</p>
                {system?.attribution && <p>{system.attribution}</p>}
                <p>{`© 2026 Stefano Caronia · ${product}`}</p>
            </footer>
        </section>
    );
}

/** What a section to come will hold, as the plan says (D-269). */
function upcoming(section: Section): string | undefined
{
    return section === "world" ? t("What your character knows, the documents found and the calendar; the world map later.") : undefined;
}
