// The page's foot, under a line across the whole page as the head's: our copyright, the code on GitHub and the package on npm, a heart to support the project,
// and the game system with the credit its source asks for (PLAN, phase 2).
import { Icon } from "./icons.tsx";
import { systemNameLabel, systemTitleLabel } from "./labels.ts";
import { t } from "./text.ts";

/** Where the project lives, and how to support it. */
export const footLinks = {
    author: "https://stefanocaronia.it",
    github: "https://github.com/stefanocaronia/rpg-engine",
    npm: "https://www.npmjs.com/package/rpg-engine",
    support: "https://www.paypal.com/paypalme/stefanocaronia",
};

/** The foot of the page: who made it and where it lives, how to support it, and the game system's credits. */
export function PageFoot({ product, system }: { product: string; system?: { name: string; title: string; attribution?: string; }; })
{
    return (
        <footer class="page-foot">
            <p class="foot-own">
                <span>
                    {"© 2026 "}
                    <a href={footLinks.author} target="_blank" rel="noreferrer">Stefano Caronia</a>
                    {` · ${product}`}
                </span>
                <a href={footLinks.github} target="_blank" rel="noreferrer" aria-label={t("{product} on GitHub", { product })} data-tip="GitHub">
                    <Icon name="github" />
                </a>
                <a href={footLinks.npm} target="_blank" rel="noreferrer" aria-label={t("{product} on npm", { product })} data-tip="npm">
                    <Icon name="npm" />
                </a>
                <a class="foot-support" href={footLinks.support} target="_blank" rel="noreferrer">
                    <Icon name="heart" />
                    {t("Support {product}", { product })}
                </a>
            </p>
            {system && (
                <p class="foot-system">
                    <span>{`${systemNameLabel(system.name)} · ${systemTitleLabel(system.title)}`}</span>
                    {system.attribution && (
                        <details>
                            <summary>{t("Credits")}</summary>
                            <p>{system.attribution}</p>
                        </details>
                    )}
                </p>
            )}
        </footer>
    );
}
