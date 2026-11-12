// The Add tab: the catalog of what npm and GitHub offer, the field that adds from a link, a name, a folder or a file, and how the catalog sees what is here.
import type { ComponentChildren } from "preact";
import { useEffect, useRef, useState } from "preact/hooks";
import type { Catalog, CatalogEntry, PackageKind, PackagesView } from "../api.ts";
import { useMedia } from "../parts/card.tsx";
import { Icon, type IconName } from "../parts/icons.tsx";
import { phraseLabel, systemNameLabel } from "../parts/labels.ts";
import { languageName } from "../settings/languages.ts";
import { arrowStep, foldedText, isolated, pageDirection, t } from "../text.ts";
import { PackageRow, pageLanguage, type RowState, SaidNote, Trust, WorkNote } from "./rows.tsx";

// The rows of the catalog shown before "Show more": fewer on a phone, where the installed come after it.
const shownWide = 5;
const shownNarrow = 3;

/**
 * The one field that adds (D-485 (1)): a link, a GitHub repository's too, an npm name or a folder written by hand, as the browser gives no folder's path; or a
 * file. The field keeps the focus and what was written while the work goes; it empties once added.
 */
export function AddField({ state, onAdd, onFile }: { state: RowState; onAdd(source: string): void; onFile(file: File): void; })
{
    const [source, setSource] = useState("");
    const [empty, setEmpty] = useState(false);
    const picker = useRef<HTMLInputElement>(null);
    const sent = useRef<string | undefined>(undefined);

    // Added: the field is ready for the next one.
    useEffect(() => {
        if (state.said?.problem === false && sent.current === source) {
            setSource("");
        }
    }, [state.said]);

    const submit = (): void => {
        // A path copied with its quotes, as the file manager copies it, without them; an address copied without its scheme, as github.com/someone/an-adventure, as https.
        const given = source.trim().replace(/^"(.*)"$/, "$1").replace(/^(?=[\w-]+(?:\.[\w-]+)+\/)/, "https://");

        if (state.busy) {
            return;
        }

        setEmpty(given === "");

        if (given !== "") {
            sent.current = source;
            onAdd(given);
        }
    };

    return (
        <form
            class="package-add"
            noValidate
            onSubmit={(event) => {
                event.preventDefault();
                submit();
            }}
        >
            <label class="package-label" for="package-source">{t("From a link, an npm name or a folder of this computer")}</label>
            <div class="package-add-line">
                <input
                    id="package-source"
                    dir="auto"
                    type="text"
                    inputMode="url"
                    enterKeyHint="go"
                    autocomplete="off"
                    spellcheck={false}
                    maxLength={2000}
                    value={source}
                    readOnly={state.work !== undefined}
                    aria-invalid={state.said?.problem === true || empty}
                    aria-describedby="package-source-about"
                    placeholder={t("github.com/someone/an-adventure")}
                    onInput={(event) => setSource(event.currentTarget.value)}
                />
                <button type="submit" class="button package-button" aria-disabled={state.busy}>
                    <Icon name="plus" />
                    {t("Add")}
                </button>
                <button type="button" class="button package-button" aria-disabled={state.busy} onClick={() => !state.busy && picker.current?.click()}>
                    <Icon name="file" />
                    {t("From a file…")}
                </button>
                <input
                    ref={picker}
                    type="file"
                    accept=".zip,.tgz,.gz,application/zip,application/gzip"
                    hidden
                    onChange={(event) => {
                        const file = event.currentTarget.files?.[0];
                        event.currentTarget.value = "";

                        if (file !== undefined) {
                            onFile(file);
                        }
                    }}
                />
            </div>
            <p class="package-note" id="package-source-about">{t("It tells the kind by itself: a game system, an adventure, an extension or a language. A file is a .zip or a .tgz.")}</p>
            {empty && state.work === undefined && <p class="package-said problem" role="status">{t("Write a link, an npm name or a folder first.")}</p>}
            <WorkNote work={state.work} />
            <SaidNote said={state.said} onSee={state.onSee} />
        </form>
    );
}

/**
 * The catalog (D-486), always open: a search, chips for the kinds with how many each has, wrapping on a phone; the first rows, five or three on a phone, then
 * the others on asking. A source that does not answer is said in the page's words, with its own under them.
 */
export function CatalogList(
    { catalog, view, state, needs, onAdd, onUpdate, onRetry }: {
        catalog: { asking: boolean; read?: Catalog; error?: string; };
        view: PackagesView;
        state(entry: CatalogEntry): RowState;
        needs(entry: CatalogEntry): ComponentChildren;
        onAdd(entry: CatalogEntry): void;
        onUpdate(entry: CatalogEntry): void;
        onRetry(): void;
    },
)
{
    const [kind, setKind] = useState<PackageKind | "all">("all");
    const [query, setQuery] = useState("");
    const [all, setAll] = useState(false);
    const narrow = useMedia("(max-width: 600px)");
    const list = useRef<HTMLUListElement>(null);
    const chips = useRef<HTMLDivElement>(null);
    const limit = narrow ? shownNarrow : shownWide;
    const entries = catalog.read?.entries ?? [];
    const found = entries.filter((entry) => matchesQuery(entry, query));
    const kinds = kindOrder.filter((one) => entries.some((entry) => entry.kind === one));
    const chosen = kinds.includes(kind as PackageKind) ? kind : "all";
    const shown = found.filter((entry) => chosen === "all" || entry.kind === chosen);
    // A row past the first ones stays in view while it is worked on or says what happened, as after a reload.
    const visible = all ? shown : shown.filter((entry, index) => index < limit || state(entry).work !== undefined || state(entry).said !== undefined);
    const failed = catalog.error === undefined ? catalog.read?.failed ?? {} : { npm: catalog.error, github: catalog.error };

    // The rows asked for come after those shown: the focus goes to the first of them.
    const showAll = (): void => {
        setAll(true);
        requestAnimationFrame(() => (list.current?.children[limit] as HTMLElement | undefined)?.focus());
    };

    // The chips are one stop of Tab; the arrows go along them, as the page reads.
    const chipKey = (event: KeyboardEvent): void => {
        const buttons = [...chips.current?.querySelectorAll("button") ?? []];
        const at = buttons.indexOf(event.target as HTMLButtonElement);
        const step = arrowStep(event.key, true);
        const to = event.key === "Home" ? 0 : event.key === "End" ? buttons.length - 1 : step === 0 ? -1 : (at + step + buttons.length) % buttons.length;

        if (to >= 0) {
            event.preventDefault();
            buttons[to]?.focus();
            buttons[to]?.click();
        }
    };

    const chip = (one: PackageKind | "all", count: number) => (
        <button type="button" key={one} aria-pressed={chosen === one} tabIndex={chosen === one ? 0 : -1} onClick={() => setKind(one)}>
            {one === "all" ? t("All") : kindsLabel(one)}
            <span class="package-count">{count}</span>
        </button>
    );

    return (
        <div class="package-catalog">
            <div class="package-catalog-head">
                <h4 class="eyebrow package-sub" id="package-catalog-title">{t("Catalog")}</h4>
                {entries.length > 0 && (
                    <span class="search">
                        <Icon name="search" />
                        <input type="search" value={query} placeholder={t("Search")} aria-label={t("Search the catalog")} onInput={(event) => setQuery(event.currentTarget.value)} />
                    </span>
                )}
            </div>
            {kinds.length > 1 && (
                <div class="filter-chips" role="group" aria-label={t("Kind")} ref={chips} onKeyDown={chipKey}>
                    {chip("all", found.length)}
                    {kinds.map((one) => chip(one, found.filter((entry) => entry.kind === one).length))}
                </div>
            )}
            {(failed.npm !== undefined || failed.github !== undefined) && <CatalogAway failed={failed} asking={catalog.asking} onRetry={onRetry} />}
            {catalog.asking && catalog.read === undefined && catalog.error === undefined && <p class="package-note" role="status">{t("Asking npm and GitHub…")}</p>}
            {!catalog.asking && entries.length === 0 && failed.npm === undefined && failed.github === undefined && <p class="package-note">{t("Nothing to add for now.")}</p>}
            {entries.length > 0 && shown.length === 0 && <p class="package-note">{t("Nothing matches “{query}”.", { query: query.trim() })}</p>}
            {visible.length > 0 && (
                <ul class="package-list" ref={list} aria-labelledby="package-catalog-title">
                    {visible.map((entry) => (
                        <CatalogRow
                            key={`${entry.kind}:${entry.source}`}
                            entry={entry}
                            named={chosen === "all"}
                            view={view}
                            state={state(entry)}
                            needs={needs(entry)}
                            onAdd={() => onAdd(entry)}
                            onUpdate={() => onUpdate(entry)}
                        />
                    ))}
                </ul>
            )}
            {shown.length > visible.length && (
                <button type="button" class="package-show" onClick={showAll}>
                    {t("Show the other {count}", { count: shown.length - visible.length })}
                    <Icon name="more" />
                </button>
            )}
        </div>
    );
}

/** npm's newer version of a package here, as the catalog says it. */
export function newerOf(name: string, kind: PackageKind, catalog: Catalog | undefined): string | undefined
{
    const entry = entryOf(name, kind, catalog);
    return entry?.update === true ? entry.version : undefined;
}

/** A package here as the catalog has it. */
export function entryOf(name: string, kind: PackageKind, catalog: Catalog | undefined): CatalogEntry | undefined
{
    return catalog?.entries.find((one) => one.kind === kind && samePackage(one, name));
}

/** How many packages here npm has a newer version of: the count on the Installed tab. */
export function updateCount(view: PackagesView, catalog: Catalog | undefined): number
{
    const systems = (view.systems ?? []).filter((one) => one.package !== undefined && newerOf(one.package, "system", catalog) !== undefined);
    const extensions = view.installed.filter((one) => newerOf(one.package, "extension", catalog) !== undefined);
    const languages = (view.languages ?? []).filter((one) => newerOf(one.package, "language", catalog) !== undefined);
    return systems.length + extensions.length + languages.length;
}

/** A catalog's title: an adventure's as its author wrote it; an npm package's name with its first letter a capital, as the rows of what is here. */
export function entryTitle(entry: CatalogEntry): string
{
    // A language by its code, as lang-de: named in the page's language.
    const code = entry.kind === "language" ? /^(?:lang-)?([a-z]{2,3}(?:-[a-z0-9]+)?)$/i.exec(entry.title)?.[1] : undefined;
    const language = code === undefined ? undefined : languageName(code, pageLanguage());
    return entry.kind === "adventure" ? entry.title : phraseLabel(language ?? entry.title);
}

/** npm or GitHub away, or both: the rest is added all the same; the engine's words under the page's, and Try again. */
function CatalogAway({ failed, asking, onRetry }: { failed: Catalog["failed"]; asking: boolean; onRetry(): void; })
{
    const both = failed.npm !== undefined && failed.github !== undefined;
    const [headline, line] = both
        ? [t("The catalog does not answer."), t("A file, a link or a folder can be added all the same.")]
        : failed.npm !== undefined
        ? [t("npm does not answer."), t("Game systems, extensions and languages come from npm: a file, a link or a folder can be added all the same.")]
        : [t("GitHub does not answer."), t("The catalog's adventures come from GitHub: a .zip or a link can be added all the same.")];
    const why = [...new Set([failed.npm, failed.github].filter((one) => one !== undefined))];
    return (
        <div class="package-offline" role="status">
            <Icon name="offline" />
            <div>
                <p>
                    <strong>{headline}</strong> {line}
                </p>
                {why.map((one) => (
                    <p class="package-why" key={one}>
                        <bdi>{one}</bdi>
                    </p>
                ))}
                <button type="button" class="button package-button" aria-disabled={asking} onClick={() => !asking && onRetry()}>
                    <Icon name="update" />
                    {t("Try again")}
                </button>
            </div>
        </div>
    );
}

/**
 * A row of the catalog (D-486 (4)): its tile, its title with its kind in All and whose it is, a line of what it is, its facts; then what can be done: add it,
 * with "…" when a window will ask the player's yes; update it; download a game system for a new campaign; or where it is already.
 */
function CatalogRow(
    { entry, named, view, state, needs, onAdd, onUpdate }: { entry: CatalogEntry; named: boolean; view: PackagesView; state: RowState; needs: ComponentChildren; onAdd(): void; onUpdate(): void; },
)
{
    const here = hereState(entry, view);
    const asksYes = !entry.verified && entry.code;
    // An extension made for another game system than the campaign's says so in the place of Add: it would be refused once downloaded (D-548).
    const elsewhere = entry.kind === "extension" && entry.system !== undefined && view.system !== null && foldedText(entry.system) !== foldedText(view.system.name);
    const facts = [
        entry.author !== undefined && !entry.verified && !entry.code ? t("by {author}", { author: entry.author }) : "",
        entry.levels === undefined ? "" : levelsText(entry.levels),
        entry.length ?? "",
        entry.language === undefined ? "" : languageName(entry.language, pageLanguage()) ?? entry.language,
        entry.stars === undefined || entry.stars === 0 ? "" : `★ ${entry.stars}`,
        asksYes ? t("has code: asks your yes") : "",
        entry.kind === "system" && here === "none" && view.system !== null ? t("for a new campaign: this one stays in {system}", { system: systemNameLabel(view.system.name) }) : "",
    ].filter((fact) => fact !== "");
    const version = entry.update && entry.installed !== undefined && entry.version !== undefined
        ? (
            <span class="package-update">
                <Icon name="update" />
                {`${isolated(entry.installed)} ${pageDirection() === "rtl" ? "←" : "→"} ${isolated(entry.version)}`}
            </span>
        )
        : entry.version;
    const action = (word: string, label: string, icon: IconName, onClick: () => void, accent = false) => (
        <button
            type="button"
            class={accent ? "button package-button accent" : "button package-button"}
            aria-label={label}
            aria-disabled={state.busy}
            onClick={() => !state.busy && onClick()}
        >
            <Icon name={icon} />
            {word}
        </button>
    );
    return (
        <PackageRow
            tile={kindIcon[entry.kind]}
            tone={entry.kind === "adventure" ? "cover" : undefined}
            name={entryTitle(entry)}
            badges={
                <>
                    {named && <span class="package-kind">{kindLabel(entry.kind)}</span>}
                    <Trust verified={entry.verified} code={entry.code} author={entry.author} />
                </>
            }
            about={entry.description === undefined || entry.kind === "adventure" ? entry.description : phraseLabel(entry.description)}
            meta={(version !== undefined || facts.length > 0) && (
                <>
                    {version}
                    {version !== undefined && facts.length > 0 && " · "}
                    {facts.map(isolated).join(" · ")}
                </>
            )}
            needs={needs}
            focusable
            actions={entry.update && entry.kind !== "adventure"
                ? action(t("Update"), t("Update {name} to {version}", { name: entryTitle(entry), version: entry.version ?? "" }), "update", onUpdate, true)
                : here === "used" || (here === "here" && entry.kind !== "extension")
                ? (
                    <span class="package-here">
                        <Icon name="check" />
                        {entry.kind === "adventure" || entry.kind === "extension" ? t("In the campaign") : t("On this computer")}
                    </span>
                )
                : elsewhere && here === "none"
                ? (
                    <span class="package-here">
                        <Icon name="lock" />
                        {t("for {system}: this campaign plays {campaign}", { system: entry.system ?? "", campaign: view.system === null ? "" : systemNameLabel(view.system.name) })}
                    </span>
                )
                : entry.kind === "system" && here === "none"
                ? action(t("Download"), t("Download {name}", { name: entryTitle(entry) }), "download", onAdd)
                : action(asksYes ? t("Add…") : t("Add"), t("Add {name}", { name: entryTitle(entry) }), "plus", onAdd)}
        >
            <WorkNote work={state.work} />
            <SaidNote said={state.said} onSee={state.onSee} />
        </PackageRow>
    );
}

// The kinds in the order of the chips, each with its tile.
const kindOrder: PackageKind[] = ["system", "adventure", "extension", "language"];
const kindIcon: Record<PackageKind, IconName> = { system: "dice", adventure: "world", extension: "packages", language: "language" };

/** A kind, for one package. */
function kindLabel(kind: PackageKind): string
{
    const labels: Record<PackageKind, string> = { system: t("System"), adventure: t("Adventure"), extension: t("Extension"), language: t("Language") };
    return labels[kind];
}

/** A kind, for its chip. */
function kindsLabel(kind: PackageKind): string
{
    const labels: Record<PackageKind, string> = { system: t("Systems"), adventure: t("Adventures"), extension: t("Extensions"), language: t("Languages") };
    return labels[kind];
}

/** Whether an entry matches what the player searched: by its title, what it is or who wrote it, case and accents aside. */
function matchesQuery(entry: CatalogEntry, query: string): boolean
{
    const wanted = foldedText(query.trim());
    return wanted === "" || [entry.title, entry.description ?? "", entry.author ?? ""].some((text) => foldedText(text).includes(wanted));
}

/** Where a catalog's package is here: in the campaign, only on this computer, or not here. */
function hereState(entry: CatalogEntry, view: PackagesView): "used" | "here" | "none"
{
    if (entry.installed === undefined) {
        return "none";
    }

    if (entry.kind === "adventure") {
        return "used";
    }

    if (entry.kind !== "extension") {
        return "here";
    }

    const extension = view.installed.find((one) => samePackage(entry, one.package));
    return extension !== undefined && !("broken" in extension) && extension.used ? "used" : "here";
}

/** Whether a catalog's entry is this package: ours by its name alone, another's by its npm name. */
function samePackage(entry: CatalogEntry, name: string): boolean
{
    const source = entry.source.replace(/^npm:/, "");
    return name === source || name === `@rpgengine/${source}`;
}

/** An adventure's levels: one, or from one to another. */
function levelsText(levels: string): string
{
    return levels.includes("-") ? t("levels {levels}", { levels: levels.replace("-", "–") }) : t("level {level}", { level: levels });
}
