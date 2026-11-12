// RPG Engine itself on the Packages page: its card, how a new chat takes the version installed, and what a package's latest needs of it.
import { useEffect, useRef } from "preact/hooks";
import type { EngineView } from "../api.ts";
import { CardHead } from "../parts/card.tsx";
import { Icon, iconPath } from "../parts/icons.tsx";
import { t } from "../text.ts";
import { PackageRow, type RowState, SaidNote, UpdateButton, VersionMeta, WorkNote } from "./rows.tsx";

/** RPG Engine installed from the page, and how the chat comes to use it; `now` when it was installed since this page was drawn. */
export interface EngineUpdated
{
    from: string;
    to: string;
    restart: "chat" | "app";
    now?: boolean;
}

// The engine's own name, never translated.
export const engineName = "RPG Engine";
// Where the engine installed from this page is kept while the chat goes on with the one before it: in this tab, through a reload.
const updatedKey = "rpg-engine-updated";

/** The engine installed from this page in this tab, if any. */
export function keptUpdate(): EngineUpdated | undefined
{
    try {
        const kept = JSON.parse(sessionStorage.getItem(updatedKey) ?? "null") as EngineUpdated | null;
        return kept !== null && typeof kept.to === "string" && typeof kept.from === "string" ? { from: kept.from, to: kept.to, restart: kept.restart === "app" ? "app" : "chat" } : undefined;
    } catch {
        return undefined;
    }
}

export function keepUpdate(updated: EngineUpdated | undefined): void
{
    try {
        if (updated === undefined) {
            sessionStorage.removeItem(updatedKey);
        } else {
            sessionStorage.setItem(updatedKey, JSON.stringify(updated));
        }
    } catch {
        // A browser that keeps nothing says it until the page is drawn again.
    }
}

/** The focus to the engine's card: its Update, else its title. */
export function focusEngine(): void
{
    const target = document.getElementById("engine-update") ?? document.getElementById("packages-engine");
    target?.focus({ preventScroll: true });
    target?.scrollIntoView({ block: "center" });
}

/**
 * RPG Engine itself (D-515 (3)), first among the installed: its version and npm's newer one, with Update when npm installed it globally; installed another way,
 * why the page does not update it; once updated, how a new chat, or the app opened again, brings it, as the chat and this page go on with this one.
 */
export function EngineCard({ engine, updated, newer, state, onUpdate }: { engine: EngineView | undefined; updated: EngineUpdated | undefined; newer: string | undefined; state: RowState; onUpdate(): void; })
{
    const folder = engine?.folder ?? "";
    const why = engine === undefined
        ? t("Asking npm for the newest version…")
        : engine.install === "link"
        ? t("Installed with npm link from {folder}, for its development: update it there, with git pull and npm run build.", { folder })
        : engine.install === "other"
        ? t("Installed another way, in {folder}: update it the way you installed it.", { folder })
        : engine.failed !== undefined
        ? t("npm does not answer: a newer version cannot be checked now.")
        : undefined;
    // A newer one this page does not install is still said, by its version.
    const shownNewer = updated === undefined && engine?.update === true ? engine.latest : undefined;
    return (
        <section class="card" aria-labelledby="packages-engine">
            <CardHead icon={iconPath("engine")} title={<h3 id="packages-engine" tabIndex={-1}>{t("Engine")}</h3>} />
            <div class="card-body package-body">
                <ul class="package-list">
                    <PackageRow
                        tile="engine"
                        name={engineName}
                        about={t("What runs the game: the master's tools and this page.")}
                        meta={engine !== undefined && <VersionMeta version={engine.version} newer={shownNewer} />}
                        needs={why === undefined ? undefined : <span class="package-needs">{why}</span>}
                        actions={newer !== undefined
                            ? <UpdateButton id="engine-update" name={engineName} version={newer} busy={state.busy} onClick={onUpdate} />
                            : engine?.update === false && engine.install === "global" && updated === undefined && (
                                <span class="package-here">
                                    <Icon name="check" />
                                    {t("Up to date")}
                                </span>
                            )}
                    >
                        <WorkNote work={state.work} />
                        <SaidNote said={state.said} />
                        {updated !== undefined && <RestartNote updated={updated} />}
                    </PackageRow>
                </ul>
            </div>
        </section>
    );
}

/**
 * What a package's latest needs of the engine (D-515 (2)), under its meta: which version of it, and the way to the engine's card, to update it first; the
 * version offered meanwhile is the newest this engine reads.
 */
export function NeedsEngine({ newer, canUpdate, onGo }: { newer: { version: string; engine?: string; }; canUpdate: boolean; onGo(): void; })
{
    const { version, engine } = newer;
    return (
        <span class="package-needs">
            <span>
                {engine === undefined ? t("Version {version} needs a newer RPG Engine.", { version }) : t("Version {version} needs RPG Engine {engine}.", { version, engine })}
            </span>
            <button type="button" class="package-see" onClick={onGo}>
                {canUpdate ? t("Update RPG Engine first") : t("See RPG Engine")}
                <Icon name="fold" />
            </button>
        </span>
    );
}

/**
 * The engine installed, and how the master comes to use it, in the player's words: this chat goes on with the one it started with; a new chat, or the app
 * opened again, takes the new one, and this page is read again after it, never by itself, as the running game would serve it the new one's files.
 */
function RestartNote({ updated }: { updated: EngineUpdated; })
{
    const note = useRef<HTMLDivElement>(null);

    // Just updated, the focus Update had comes here; kept from before a reload, it stays where the page puts it.
    useEffect(() => {
        if (updated.now) {
            note.current?.focus({ preventScroll: true });
            note.current?.scrollIntoView({ block: "nearest" });
        }
    }, []);

    const steps = updated.restart === "app"
        ? [t("Quit the app you play in completely, not just its window, then open it again."), t("Start a new chat in the campaign, as you always do."), t("Reload this page.")]
        : [t("Close this chat."), t("Start a new chat in the campaign, as you always do."), t("Reload this page.")];
    return (
        <div ref={note} class="package-said package-restart" role="status" tabIndex={-1}>
            <p>{`✓ ${t("RPG Engine {version} is installed.", { version: updated.to })}`}</p>
            <p>{t("The master goes on with {version} in this chat. To play with {next}:", { version: updated.from, next: updated.to })}</p>
            <ol>
                {steps.map((step) => <li key={step}>{step}</li>)}
            </ol>
        </div>
    );
}
