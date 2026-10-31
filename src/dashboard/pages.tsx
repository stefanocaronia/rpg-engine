// The pages' head, their section's icon and name in the accent (D-409); and About:
// the product with its links, the game system, then small the licences, the credits and how it was made.
import type { Section } from "./address.ts";
import { sectionLabel } from "./address.ts";
import { CardHeader } from "./card.tsx";
import { footLinks } from "./footer.tsx";
import { Icon, iconPath } from "./icons.tsx";
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

/**
 * What the page is (D-409): a card of the product, with the robot and its links; a card of the game system the campaign plays; a card of how it was made, with
 * Stefano's motto, as in the READMEs; a card of the licences and the system's credits; then, out of the cards and small, the copyright.
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
                <details class="group about-card about-system" open>
                    <CardHeader icon={iconPath("dice")} title={<h3>{t("Game system")}</h3>} open onToggle={() => undefined} fixed />
                    <p>
                        <span class="system-chip">{system.name}</span>
                        {systemTitleLabel(system.title)}
                    </p>
                </details>
            )}
            <details class="group about-card" open>
                <CardHeader icon={iconPath("pencil")} title={<h3>{t("Development notes")}</h3>} open onToggle={() => undefined} fixed />
                <p>{t("Developed with the help of AI coding agents. Everything is designed, reviewed and tested by the project's human maintainer.")}</p>
                {/* Stefano's motto, as in his READMEs. */}
                <p class="about-motto">
                    <strong>{t("We encourage everyone to use AI for their own purposes.")}</strong>
                    <br />
                    {t("The means of production should belong to the people.")}
                    <br />
                    {t("Fight corporate control of technology, not our right to use it.")}
                </p>
            </details>
            <details class="group about-card" open>
                <CardHeader icon={iconPath("licence")} title={<h3>{t("Licence")}</h3>} open onToggle={() => undefined} fixed />
                <div class="about-licence">
                    <Icon name="github" />
                    <div>
                        <h4>{product}</h4>
                        <p>{t("Open source, under the MIT licence.")}</p>
                        <a class="about-link" href={mitLicence} target="_blank" rel="noreferrer">
                            <Icon name="licence" />
                            {t("Read the MIT licence")}
                        </a>
                    </div>
                </div>
                {system?.attribution && (
                    <div class="about-licence">
                        <Icon name="dice" />
                        <div>
                            <h4>{`${t("Credits")} · ${system.name}`}</h4>
                            <p class="about-credits">{withLinks(system.attribution)}</p>
                        </div>
                    </div>
                )}
                <div class="about-licence">
                    <Icon name="journal" />
                    <div>
                        <h4>{t("Your game")}</h4>
                        <p>
                            {t(
                                "{product} ships only original or open-licensed content. Anything else that appears in your game is written by your AI or by you, as pages of your campaign on your computer: it is not part of {product}, and we do not distribute it.",
                                { product },
                            )}
                        </p>
                    </div>
                </div>
            </details>
        </section>
    );
}

/** The MIT licence's text, where it is read. */
const mitLicence = "https://opensource.org/license/mit";

/** A credit's text with its addresses as links, the full stop after one left out of it. */
function withLinks(text: string)
{
    return text.split(/(https?:\/\/[^\s]*[^\s.,;)])/).map((part, index) => (index % 2 === 1 ? <a key={index} href={part} target="_blank" rel="noreferrer">{part}</a> : part));
}
