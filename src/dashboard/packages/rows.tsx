// The pieces every row of the Packages page is made of: the row itself, whose a package is, its version, its buttons, the work under way and what happened.
import type { ComponentChildren } from "preact";
import { useEffect, useRef } from "preact/hooks";
import type { PackageKind, PackageWork } from "../api.ts";
import { Icon, type IconName } from "../parts/icons.tsx";
import { Command } from "../settings/settings.tsx";
import { pageLocale, t } from "../text.ts";

/** What happened to the player's last change, said where it was made: a row, a card, or the field. */
export interface Said
{
    at: string;
    problem: boolean;
    text: string;
    /** The engine's own words, under the page's. */
    why?: string;
    /** The command that does it from the terminal, when no window for the player's yes opens here. */
    command?: string;
    /** What was added, to see it among the installed. */
    added?: PackageKind;
}

/** What a row is given of the page's work: the work under way there, what happened there, and whether another holds the server. */
export interface RowState
{
    work?: PackageWork;
    said?: Said;
    busy: boolean;
    /** Shows what was added among the installed, from the tab where it was added. */
    onSee?(kind: PackageKind): void;
}

/** A row of the page: the tile, the words, what can be done at the end; under them, the work going on and what happened. */
export function PackageRow(
    { tile, tone, name, badges, about, meta, needs, actions, focusable, row, fresh, children }: {
        tile: IconName;
        tone?: "cover" | "dim" | "broken";
        name: ComponentChildren;
        badges?: ComponentChildren;
        about?: ComponentChildren;
        meta?: ComponentChildren;
        /** What its latest needs of the engine, under its meta. */
        needs?: ComponentChildren;
        actions?: ComponentChildren;
        focusable?: boolean;
        /** Its key among the installed, by which what was added is found. */
        row?: string;
        /** Just added: lit for a moment, and where the focus goes when it is seen from Add. */
        fresh?: boolean;
        children?: ComponentChildren;
    },
)
{
    return (
        <li class={fresh ? "package-row fresh" : "package-row"} {...(focusable || fresh ? { tabIndex: -1 } : {})} {...(row === undefined ? {} : { "data-row": row })}>
            <span class={tone === undefined ? "package-tile" : `package-tile ${tone}`} aria-hidden="true">
                <Icon name={tile} />
            </span>
            <span class="package-text">
                <span class="package-name">
                    <strong class="package-title">{name}</strong>
                    {badges}
                </span>
                {about !== undefined && about !== "" && <span class="package-about">{typeof about === "string" ? <bdi>{about}</bdi> : about}</span>}
                {meta !== undefined && meta !== false && <span class="package-meta">{meta}</span>}
                {needs}
            </span>
            {actions !== undefined && <span class="package-actions">{actions}</span>}
            {children}
        </li>
    );
}

/** Whose a package is: ours, a shield with its tick; someone else's with code, in red with the shield's mark and the word, never the colour alone. */
export function Trust({ verified, code, author }: { verified: boolean; code: boolean; author?: string | undefined; })
{
    if (verified) {
        return (
            <span class="package-trust">
                <Icon name="verified" />
                {t("Verified")}
            </span>
        );
    }

    // Someone else's without code is only text and pictures: who wrote it is said with its facts.
    if (!code && author !== undefined) {
        return null;
    }

    return (
        <span class={code ? "package-trust risky" : "package-trust"}>
            <Icon name="unverified" />
            {author === undefined ? t("Someone else's") : t("Someone else's · {author}", { author })}
        </span>
    );
}

/** A version here, and npm's newer one. */
export function VersionMeta({ version, newer }: { version: string | undefined; newer: string | undefined; })
{
    return (
        <>
            {version}
            {version !== undefined && newer !== undefined && " · "}
            {newer !== undefined && (
                <span class="package-update">
                    <Icon name="update" />
                    {t("new {version}", { version: newer })}
                </span>
            )}
        </>
    );
}

/** Where the package's problems are reported, as its package.json says: after what its meta says before it, on a line of its own on a phone; nothing when it says nowhere. */
export function ReportLink({ issues, name, after }: { issues: string | undefined; name: string; after: boolean; })
{
    if (issues === undefined) {
        return null;
    }

    return (
        <>
            {after && <span class="package-report-gap">{" · "}</span>}
            <a class="package-report" href={issues} target="_blank" rel="noreferrer" aria-label={t("Report a problem with {name}", { name })}>
                {t("Report a problem")}
            </a>
        </>
    );
}

/** Update, for a row npm has a newer version of. */
export function UpdateButton({ id, name, version, busy, onClick }: { id?: string; name: string; version: string; busy: boolean; onClick(): void; })
{
    return (
        <button type="button" id={id} class="button package-button accent" aria-label={t("Update {name} to {version}", { name, version })} aria-disabled={busy} onClick={() => !busy && onClick()}>
            <Icon name="update" />
            {t("Update")}
        </button>
    );
}

/** The bin that takes a package off this computer, after asking. */
export function UninstallButton({ name, busy, onClick }: { name: string; busy: boolean; onClick(): void; })
{
    return (
        <button
            type="button"
            class="icon-button package-bin tip-left"
            aria-label={t("Uninstall {name} from this computer…", { name })}
            data-tip={t("Uninstall from this computer…")}
            aria-disabled={busy}
            onClick={() => !busy && onClick()}
        >
            <Icon name="clear" />
        </button>
    );
}

/** The work under way here: a bar and what is done, or the window where the player's yes is asked, which may hide behind the browser (D-478). */
export function WorkNote({ work, whose }: { work: PackageWork | undefined; whose?: string; })
{
    if (work === undefined) {
        return null;
    }

    // Said in the tab other than its row's: with whose work it is.
    const named = whose === undefined ? null : <span class="package-whose">{whose}</span>;

    if (work.phase === "yes") {
        return (
            <div class="package-window" role="status">
                <Icon name="window" />
                <span>
                    {named}
                    <strong>{t("Answer in the window of your computer.")}</strong> {work.action === "library"
                        ? t("It asks whether RPG Engine may read the documents of that folder. Can't see it? It is behind the browser.")
                        : t("It asks whether code that RPG Engine did not publish may run here. Can't see it? It is behind the browser.")}
                </span>
            </div>
        );
    }

    return (
        <div class="package-progress" role="status">
            <span class="package-bar" aria-hidden="true" />
            <span>
                {named}
                <strong>{workingText(work.action)}</strong> {t("You can go to another page: it goes on by itself.")}
            </span>
        </div>
    );
}

/** What happened, where it happened: the page's words, the engine's under them, and the terminal's command when no window opens here. */
export function SaidNote({ said, focus, onSee }: { said: Said | undefined; focus?: boolean; onSee?: ((kind: PackageKind) => void) | undefined; })
{
    const note = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (focus && said !== undefined) {
            note.current?.focus({ preventScroll: true });
            note.current?.scrollIntoView({ block: "nearest" });
        }
    }, [said, focus]);

    return said === undefined ? null : (
        <div ref={note} class={said.problem ? "package-said problem" : "package-said"} role="status" {...(focus ? { tabIndex: -1 } : {})}>
            <p>{said.text}</p>
            {said.why !== undefined && (
                <p class="package-why">
                    <bdi>{said.why}</bdi>
                </p>
            )}
            {said.command !== undefined && <Command text={said.command} />}
            {said.added !== undefined && onSee !== undefined && (
                <button type="button" class="package-see" onClick={() => said.added !== undefined && onSee(said.added)}>
                    {t("See it in Installed")}
                    <Icon name="fold" />
                </button>
            )}
        </div>
    );
}

/** What happened to a row that went from its card: said at the card's foot, with the focus, which the row's button had. */
export function CardSaid({ said, at }: { said: Said | undefined; at: string; })
{
    return said?.at === at ? <SaidNote said={said} focus /> : null;
}

/** The language this page is written in. */
export function pageLanguage(): string
{
    return pageLocale();
}

/** What the server is doing, in words. */
function workingText(action: PackageWork["action"]): string
{
    const texts: Record<PackageWork["action"], string> = {
        add: t("Adding…"),
        update: t("Updating…"),
        remove: t("Taking it out of the campaign…"),
        uninstall: t("Uninstalling…"),
        library: t("Changing the library…"),
        engine: t("Updating RPG Engine…"),
    };
    return texts[action];
}
