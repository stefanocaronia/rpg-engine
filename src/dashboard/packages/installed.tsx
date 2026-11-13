// The rows of what is installed: the game systems, the campaign's adventures, the extensions, those the campaign lacks, the languages.
import type { ComponentChildren } from "preact";
import type { ShownAdventure, ShownExtension, ShownLanguage, ShownSystem } from "../api.ts";
import { gameDateLabel, sinceDateLabel } from "../parts/game-words.ts";
import { Icon } from "../parts/icons.tsx";
import { phraseLabel, systemTitleLabel } from "../parts/labels.ts";
import { languageName } from "../settings/languages.ts";
import { t } from "../text.ts";
import { OwnPageLinks } from "./page.tsx";
import { PackageRow, pageLanguage, ReportLink, type RowState, SaidNote, Trust, UninstallButton, UpdateButton, VersionMeta, WorkNote } from "./rows.tsx";

/**
 * A game system here: the campaign's, chosen in its setup and locked; another, for a new campaign, which can go off this computer when npm installed it; npm's
 * newer version, to update it.
 */
export function SystemRow(
    { system, newer, needs, changes, fresh, state, onUpdate, onUninstall }: {
        system: ShownSystem;
        newer?: string | undefined;
        needs: ComponentChildren;
        /** Under the campaign's system, the pages of it the campaign changed (D-564). */
        changes?: ComponentChildren;
        fresh: boolean;
        state: RowState;
        onUpdate(target: string): void;
        onUninstall(target: string): void;
    },
)
{
    const target = system.package ?? system.name;
    return (
        <PackageRow
            tile="dice"
            tone={system.used ? undefined : "dim"}
            name={<span class="system-chip">{system.name}</span>}
            badges={<Trust verified={system.verified} code={system.code} />}
            about={systemTitleLabel(system.title)}
            meta={
                <>
                    <VersionMeta version={system.version} newer={newer} />
                    <ReportLink issues={system.issues} name={system.name} after={system.version !== undefined || newer !== undefined} />
                    <OwnPageLinks name={system.package} />
                </>
            }
            needs={needs}
            row={`system:${system.name}`}
            fresh={fresh}
            actions={
                <>
                    {newer !== undefined && <UpdateButton name={system.name} version={newer} busy={state.busy} onClick={() => onUpdate(target)} />}
                    {system.used
                        ? (
                            <span class="package-lock">
                                <Icon name="lock" />
                                {t("In use · chosen in the setup")}
                            </span>
                        )
                        : (
                            <>
                                <span class="package-quiet">{t("Not in this campaign")}</span>
                                {system.package !== undefined && <UninstallButton name={system.name} busy={state.busy} onClick={() => onUninstall(target)} />}
                            </>
                        )}
                </>
            }
        >
            <WorkNote work={state.work} />
            <SaidNote said={state.said} />
            {changes}
        </PackageRow>
    );
}

/** An adventure of the campaign: the day it came in on and its version; taken out while the story has not touched it, else part of the story. */
export function AdventureRow({ adventure, fresh, state, onTakeOut }: { adventure: ShownAdventure; fresh: boolean; state: RowState; onTakeOut(): void; })
{
    const since = adventure.since === undefined ? undefined : sinceDateLabel(adventure.since);
    return (
        <PackageRow
            tile="world"
            tone="cover"
            name={adventure.title}
            meta={since === undefined ? adventure.version : <span title={gameDateLabel(adventure.since ?? "")}>{`${since} · ${adventure.version}`}</span>}
            row={`adventure:${adventure.title}`}
            fresh={fresh}
            actions={adventure.removable
                ? (
                    <button
                        type="button"
                        class="button package-button"
                        aria-label={t("Take {name} out of the campaign…", { name: adventure.title })}
                        aria-disabled={state.busy}
                        onClick={() => !state.busy && onTakeOut()}
                    >
                        <Icon name="minus" />
                        {t("Take out…")}
                    </button>
                )
                : (
                    <span class="package-lock">
                        <Icon name="lock" />
                        {t("Part of the story")}
                    </span>
                )}
        >
            <WorkNote work={state.work} />
            <SaidNote said={state.said} />
        </PackageRow>
    );
}

/** An extension here: whose it is, what it is, its version and npm's newer one; whether the campaign uses it, as a switch; one that does not read, in red. */
export function ExtensionRow(
    { extension, newer, needs, fresh, state, onUse, onUpdate, onUninstall }: {
        extension: ShownExtension;
        newer?: string | undefined;
        needs: ComponentChildren;
        fresh: boolean;
        state: RowState;
        onUse(use: boolean): void;
        onUpdate(): void;
        onUninstall(): void;
    },
)
{
    const name = phraseLabel(extension.name);

    if ("broken" in extension) {
        return (
            <PackageRow
                tile="alert"
                tone="broken"
                name={name}
                about={<span class="package-red">{t("It does not read: install it again.")}</span>}
                meta={
                    <>
                        <bdi class="package-why">{extension.broken}</bdi>
                        <ReportLink issues={extension.issues} name={name} after />
                    </>
                }
                actions={
                    <>
                        <button type="button" class="button package-button" aria-label={t("Install {name} again", { name })} aria-disabled={state.busy} onClick={() => !state.busy && onUpdate()}>
                            <Icon name="update" />
                            {t("Install it again")}
                        </button>
                        <UninstallButton name={name} busy={state.busy} onClick={onUninstall} />
                    </>
                }
            >
                <WorkNote work={state.work} />
                <SaidNote said={state.said} />
            </PackageRow>
        );
    }

    return (
        <PackageRow
            tile="packages"
            name={name}
            badges={<Trust verified={extension.verified} code={false} />}
            about={`${phraseLabel(extension.about.replace(/\.$/, ""))}.`}
            meta={
                <>
                    <VersionMeta version={extension.version} newer={newer} />
                    <ReportLink issues={extension.issues} name={name} after />
                    <OwnPageLinks name={extension.package} />
                </>
            }
            needs={needs}
            row={`extension:${extension.package}`}
            fresh={fresh}
            actions={
                <>
                    {newer !== undefined && <UpdateButton name={name} version={newer} busy={state.busy} onClick={onUpdate} />}
                    <label class="package-use">
                        <input
                            type="checkbox"
                            role="switch"
                            checked={extension.used}
                            aria-label={t("{name}: in use", { name })}
                            aria-disabled={state.busy}
                            onClick={(event) => {
                                event.preventDefault();

                                if (!state.busy) {
                                    onUse(!extension.used);
                                }
                            }}
                        />
                        {t("In use")}
                    </label>
                    <UninstallButton name={name} busy={state.busy} onClick={onUninstall} />
                </>
            }
        >
            <WorkNote work={state.work} />
            <SaidNote said={state.said} />
        </PackageRow>
    );
}

/** An extension the campaign lists and this computer lacks: in red, with Install. */
export function MissingRow({ name, state, onInstall }: { name: string; state: RowState; onInstall(): void; })
{
    const shown = phraseLabel(name.replace(/^@[^/]+\//, ""));
    return (
        <PackageRow
            tile="alert"
            tone="broken"
            name={shown}
            about={<span class="package-red">{t("Missing on this computer: the master does not use it until you install it.")}</span>}
            actions={
                <button type="button" class="button package-button" aria-label={t("Install {name}", { name: shown })} aria-disabled={state.busy} onClick={() => !state.busy && onInstall()}>
                    <Icon name="download" />
                    {t("Install")}
                </button>
            }
        >
            <WorkNote work={state.work} />
            <SaidNote said={state.said} />
        </PackageRow>
    );
}

/** A language package: its name, whose it is, its version and npm's newer one, and whether this page is written in it. */
export function LanguageRow(
    { language, newer, needs, fresh, state, onUpdate, onUninstall }: {
        language: ShownLanguage;
        newer?: string | undefined;
        needs: ComponentChildren;
        fresh: boolean;
        state: RowState;
        onUpdate(): void;
        onUninstall(): void;
    },
)
{
    const page = pageLanguage().toLowerCase().split("-")[0] === language.code.toLowerCase().split("-")[0];
    const name = languageTitle(language);
    return (
        <PackageRow
            tile="language"
            name={name}
            badges={<Trust verified={language.verified} code={false} />}
            meta={
                <>
                    <VersionMeta version={language.version} newer={newer} />
                    {page && ` · ${t("the language of this page")}`}
                    <ReportLink issues={language.issues} name={name} after />
                </>
            }
            needs={needs}
            row={`language:${language.code}`}
            fresh={fresh}
            actions={
                <>
                    {newer !== undefined && <UpdateButton name={name} version={newer} busy={state.busy} onClick={onUpdate} />}
                    <UninstallButton name={name} busy={state.busy} onClick={onUninstall} />
                </>
            }
        >
            <WorkNote work={state.work} />
            <SaidNote said={state.said} />
        </PackageRow>
    );
}

/** A language package's name in the page's language, else its own. */
export function languageTitle(language: ShownLanguage): string
{
    return phraseLabel(languageName(language.code, pageLanguage()) ?? language.name);
}
