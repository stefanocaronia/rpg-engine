// The Packages section (D-485, D-486, D-488), in three tabs: Installed first, what is here by kind: the game system, with the pages of it the campaign changed
// under the one it plays (D-564), the campaign's adventures with its own export last, the extensions with whether the campaign uses each, the languages; its
// tab counts the updates and marks what the campaign lacks. Then Add: one card to add a package: the catalog of what npm and GitHub offer first, always open,
// then a link, an npm name, a folder or a file. Then Library: the folders of the player's books for this campaign alone (D-491 (13)). One work at a time; one
// not ours with code, or a folder added to the library, waits for the player's yes in a window of their computer, said in every tab.
import { useEffect, useRef, useState } from "preact/hooks";
import { sectionAddress } from "../address.ts";
import {
    addFile,
    addSource,
    type Catalog,
    type CatalogEntry,
    changeLibrary,
    changePackage,
    type EngineView,
    type LibraryView,
    type PackageAction,
    type PackageKind,
    type PackageOutcome,
    type PackagesView,
    type PackageWork,
    readCatalog,
    readEngine,
    readLibrary,
    readPackages,
    updateEngine,
} from "../api.ts";
import type { ShownLayer } from "../data.ts";
import { CardHead } from "../parts/card.tsx";
import { Icon, iconPath } from "../parts/icons.tsx";
import { phraseLabel } from "../parts/labels.ts";
import { Confirm } from "../settings/saves.tsx";
import { PageHead } from "../shell/pages.tsx";
import { PageTabs } from "../shell/tabs.tsx";
import { t } from "../text.ts";
import { AddField, CatalogList, entryOf, entryTitle, newerOf, updateCount } from "./catalog.tsx";
import { ChangedPages } from "./changes.tsx";
import { EngineCard, engineName, type EngineUpdated, focusEngine, keepUpdate, keptUpdate, NeedsEngine } from "./engine.tsx";
import { AdventureRow, ExtensionRow, LanguageRow, languageTitle, MissingRow, SystemRow } from "./installed.tsx";
import { libraryReading, LibraryTab } from "./library.tsx";
import { addedText, doneText, failure, uninstallText } from "./outcomes.tsx";
import { CardSaid, type RowState, type Said, SaidNote, WorkNote } from "./rows.tsx";
import { ShareCampaign } from "./share.tsx";

/** The page's three tabs (D-488, D-491 (13)): what is here, first, what can be added, and the campaign's library. */
type PackagesTab = "installed" | "add" | "library";

/** A package's work as this page started it, before the server says it: with where it was asked. */
type Sending = PackageWork & { at: string; };

/** A change that asks first. */
type Asking =
    | { kind: "adventure"; title: string; }
    | { kind: "uninstall"; what: "system" | "extension" | "language"; name: string; target: string; at: string; }
    | { kind: "library"; path: string; name: string; };

/**
 * The page as the game last changed (`version`), at the tab the address names and what it names in it (`item`); with the pages of the game system the
 * campaign changed, as the overview gives them (D-564), whether a scene is being played, when none is put back, and what reads the game again once one is.
 */
export function PackagesPage({ version, tab, item, layers = [], sceneOpen = false, onChanged }: {
    version: number;
    tab?: string | undefined;
    item?: string | undefined;
    layers?: ShownLayer[] | undefined;
    sceneOpen?: boolean;
    onChanged(): void;
})
{
    const [view, setView] = useState<PackagesView>();
    const [problem, setProblem] = useState<string>();
    const [catalog, setCatalog] = useState<{ asking: boolean; read?: Catalog; error?: string; }>({ asking: true });
    const [sending, setSending] = useState<Sending>();
    const [said, setSaid] = useState<Said>();
    const [asking, setAsking] = useState<Asking>();
    const reads = useRef(0);
    const catalogReads = useRef(0);
    const before = useRef<PackageWork | undefined>(undefined);
    const mine = useRef(0);
    // The rows here before the last addition: those not among them are new.
    const known = useRef<Set<string> | undefined>(undefined);
    const seeing = useRef<PackageKind | undefined>(undefined);
    const shownTab: PackagesTab = tab === "add" || tab === "library" ? tab : "installed";
    const [library, setLibrary] = useState<LibraryView>();
    const [libraryProblem, setLibraryProblem] = useState<string>();
    const libraryBusy = library?.entries.some((entry) => entry.reading > 0) ?? false;
    const [engine, setEngine] = useState<{ asking: boolean; read?: EngineView; hidden?: boolean; }>({ asking: true });
    const [updated, setUpdated] = useState<EngineUpdated | undefined>(keptUpdate);
    // Asked from a row whose package needs a newer engine: the focus goes to the engine's card once Installed shows.
    const toEngine = useRef(false);

    // Only the last reading counts, as after a change made here and the one the game sends.
    const read = (): void => {
        const reading = ++reads.current;
        void readPackages().then(
            (read) => {
                if (reading === reads.current) {
                    setView(read);
                    setProblem(undefined);
                }
            },
            (error: unknown) => setProblem(error instanceof Error ? error.message : String(error)),
        );
    };

    // npm and GitHub, slower: what is here does not wait for them.
    const askCatalog = (fresh: boolean): void => {
        const reading = ++catalogReads.current;
        setCatalog((was) => ({ ...was, asking: true }));
        void readCatalog(fresh).then(
            (read) => reading === catalogReads.current && setCatalog({ asking: false, read }),
            (error: unknown) => reading === catalogReads.current && setCatalog({ asking: false, error: error instanceof Error ? error.message : String(error) }),
        );
    };

    const readShelves = (): void => {
        void readLibrary().then(
            (read) => {
                setLibrary(read);
                setLibraryProblem(undefined);
            },
            (error: unknown) => setLibraryProblem(error instanceof Error ? error.message : String(error)),
        );
    };

    // The engine and npm's latest, once: npm is asked each time. Only the game's own server has it; elsewhere its card is not shown.
    const askEngine = (): void => {
        void readEngine().then(
            (read) => {
                setEngine({ asking: false, ...(read === undefined ? { hidden: true } : { read }) });

                // A new chat brought the engine installed here: the way to it is said no more.
                if (read !== undefined && read.version === updated?.to) {
                    keepUpdate(undefined);
                    setUpdated(undefined);
                }
            },
            () => setEngine({ asking: false, hidden: true }),
        );
    };

    useEffect(read, [version]);
    useEffect(readShelves, [version]);
    useEffect(() => askCatalog(false), []);
    useEffect(askEngine, []);

    // While books are being read in their own process, their counts are read again now and then.
    useEffect(() => {
        if (!libraryBusy) {
            return;
        }

        const timer = window.setInterval(readShelves, libraryReading);
        return () => window.clearInterval(timer);
    }, [libraryBusy]);

    // A work another page started, or this one before a reload, changes what is here: the catalog says it again once it ends.
    useEffect(() => {
        if (before.current !== undefined && view?.working === undefined && sending === undefined && Date.now() - mine.current > 3000) {
            askCatalog(true);
        }

        before.current = view?.working;
    }, [view?.working]);

    const fresh = known.current === undefined || view === undefined ? [] : rowKeys(view).filter((key) => !known.current?.has(key));

    // Seen from Add, what was added gets the focus among the installed: its new row, else its card.
    useEffect(() => {
        const kind = seeing.current;

        if (shownTab === "installed" && toEngine.current) {
            toEngine.current = false;
            focusEngine();
            return;
        }

        if (shownTab !== "installed" || kind === undefined) {
            return;
        }

        seeing.current = undefined;
        const row = fresh.find((key) => key.startsWith(`${kind}:`));
        const target = (row === undefined ? null : document.querySelector<HTMLElement>(`[data-row="${CSS.escape(row)}"]`)) ?? document.getElementById(cardOf[kind]);
        target?.focus({ preventScroll: true });
        target?.scrollIntoView({ block: "center" });
    }, [shownTab]);

    const work: Sending | undefined = sending ?? (view?.working === undefined ? undefined : { ...view.working, at: workPlace(view.working, view, catalog.read) });
    const busy = work !== undefined;
    // The tab stays as the player chose it, the work's own included: one in the other tab is said at the top of this one.
    const choose = (chosen: PackagesTab): void => location.replace(sectionAddress("packages", chosen === "installed" ? undefined : chosen));

    const see = (kind: PackageKind): void => {
        seeing.current = kind;
        choose("installed");
    };

    // From a package that needs a newer engine, to the engine's card, in Installed.
    const goEngine = (): void => {
        if (shownTab === "installed") {
            focusEngine();
            return;
        }

        toEngine.current = true;
        choose("installed");
    };

    const rowState = (at: string): RowState => ({ ...(work?.at === at ? { work } : {}), ...(said?.at === at ? { said } : {}), busy, ...(tabOf(at) === "add" ? { onSee: see } : {}) });

    /** One change, from where it was asked: the work shown there while it lasts, then what came of it; what is here read again, and the catalog when it changed. */
    const run = async (at: string, action: PackageWork["action"], name: string, call: () => Promise<PackageOutcome>, done: (kind?: PackageKind) => string, after?: string): Promise<void> => {
        if (busy) {
            return;
        }

        setSaid(undefined);
        setSending({ name, action, phase: "working", at });
        known.current = view === undefined ? undefined : new Set(rowKeys(view));
        const outcome = await call();
        setSending(undefined);
        const place = outcome.done && after !== undefined ? after : at;
        const added = outcome.done && action === "add" && outcome.kind !== undefined ? { added: outcome.kind } : {};
        setSaid(outcome.done ? { at: place, problem: false, text: `✓ ${done(outcome.kind)}`, ...added } : failure(at, action, name, outcome));
        read();

        if (outcome.done) {
            mine.current = Date.now();
            askCatalog(true);
        }
    };

    /**
     * npm's latest engine installed, as it was installed: the work said in its card while it lasts; then how a new chat, or the app opened again, takes it, kept
     * in this tab until the engine the page is served by is that one.
     */
    const updateTheEngine = async (): Promise<void> => {
        const from = engine.read?.version;

        if (busy || from === undefined) {
            return;
        }

        setSaid(undefined);
        setSending({ name: "rpg-engine", action: "engine", phase: "working", at: "engine" });
        const outcome = await updateEngine();
        setSending(undefined);

        if (outcome.done) {
            const done = { from, to: outcome.version, restart: outcome.restart };
            keepUpdate(done);
            setUpdated({ ...done, now: true });
        } else {
            setSaid({
                at: "engine",
                problem: true,
                ...(outcome.code === "busy"
                    ? { text: t("One package at a time: wait for the one under way, then try again.") }
                    : { text: t("RPG Engine was not updated."), why: outcome.error }),
            });
            askEngine();
        }

        read();
    };

    const add = (at: string, source: string): Promise<void> => run(at, "add", source, () => addSource(source), addedText);
    const addTheFile = (file: File): Promise<void> => run("add", "add", file.name, () => addFile(file), addedText);
    const change = (at: string, action: PackageAction, name: string, label: string, after?: string): Promise<void> => run(at, action, name, () => changePackage(action, name), () => doneText(action, label), after);
    const addToLibrary = (path: string): Promise<void> =>
        run("library", "library", path, () => changeLibrary("add", path), () => t("The folder is on this computer and in this campaign: its books are read now, then the master searches them."));
    // One the computer has not leaves the list once taken out: what came of it is said under the field.
    const useInCampaign = (path: string, use: boolean, away: boolean): Promise<void> =>
        run(
            `library:${path}`,
            "library",
            path,
            () => changeLibrary(use ? "add" : "remove", path),
            () => (use ? t("In this campaign: the master searches its books.") : away ? t("{name} is out of the campaign.", { name: path }) : t("Off in this campaign: it stays on this computer.")),
            away && !use ? "library" : undefined,
        );

    const confirmed = (asked: Asking): void => {
        setAsking(undefined);

        if (asked.kind === "adventure") {
            void run(`adventure:${asked.title}`, "remove", asked.title, () => changePackage("remove", asked.title), () => t("{name} is out of the campaign.", { name: asked.title }), "adventures");
        } else if (asked.kind === "library") {
            void run(
                `library:${asked.path}`,
                "library",
                asked.path,
                () => changeLibrary("forget", asked.path),
                () => t("Off this computer: the text RPG Engine read of its books is deleted; the books stay where they are."),
                "library",
            );
        } else {
            void change(asked.at, "uninstall", asked.target, asked.name, `${asked.what}s`);
        }
    };

    const systems = view?.systems ?? [];
    const adventures = view?.adventures ?? [];
    const languages = view?.languages ?? [];
    // The engine npm has that this page may install: one more update on the Installed tab, and the way for a package that needs it.
    const engineNew = engine.read?.update === true && engine.read.install === "global" && updated === undefined ? engine.read.latest : undefined;
    const updates = (view === undefined ? 0 : updateCount(view, catalog.read)) + (engineNew === undefined ? 0 : 1);
    const needs = (newer: CatalogEntry["newer"]) => newer === undefined ? null : <NeedsEngine newer={newer} canUpdate={engineNew !== undefined} onGo={goEngine} />;
    const missing = view?.missing.length ?? 0;
    const away = library?.entries.filter((entry) => !entry.onComputer).length ?? 0;
    const elsewhere = work !== undefined && tabOf(work.at) !== shownTab ? work : undefined;
    const saidElsewhere = said !== undefined && tabOf(said.at) !== shownTab ? said : undefined;
    return (
        <section class="page-stack packages" aria-labelledby="packages-title">
            <PageHead section="packages" id="packages-title" />
            <p class="packages-lead">{t("What is added to the game. The master hears of each change at their next move.")}</p>
            {problem !== undefined && <p class="saves-said problem" role="alert">{problem}</p>}
            <PageTabs
                section="packages"
                label={t("Packages")}
                chosen={shownTab}
                tabs={[
                    { key: "installed", name: t("Installed"), label: [t("Installed"), ...marksText(updates, missing)].join(", "), marks: <TabMarks updates={updates} missing={missing} /> },
                    { key: "add", name: t("Add") },
                    { key: "library", name: t("Library"), label: [t("Library"), ...marksText(0, away)].join(", "), marks: <TabMarks updates={0} missing={away} /> },
                ]}
            />
            {view !== undefined && (
                <div class="package-panel" id="packages-panel" role="tabpanel" aria-label={shownTab === "add" ? t("Add") : shownTab === "library" ? t("Library") : t("Installed")}>
                    {elsewhere !== undefined && <WorkNote work={elsewhere} whose={workTitle(elsewhere, catalog.read)} />}
                    {saidElsewhere !== undefined && <SaidNote said={saidElsewhere} />}
                    {shownTab === "library" && (
                        <LibraryTab
                            view={library}
                            problem={libraryProblem}
                            state={rowState}
                            onAdd={(path) => void addToLibrary(path)}
                            onUse={(path, use, away) => void useInCampaign(path, use, away)}
                            onForget={(path, name) => setAsking({ kind: "library", path, name })}
                        />
                    )}
                    {shownTab === "add" && (
                        <section class="card" aria-label={t("Add")}>
                            <div class="card-body package-body">
                                {/* The catalog first, for whoever picks with a click; a link, an npm name, a folder or a file after it, for whoever knows what they want (D-488). */}
                                <CatalogList
                                    catalog={catalog}
                                    view={view}
                                    state={(entry) => rowState(`catalog:${entry.source}`)}
                                    needs={(entry) => needs(entry.newer)}
                                    onAdd={(entry) => void add(`catalog:${entry.source}`, entry.source)}
                                    onUpdate={(entry) => void change(`catalog:${entry.source}`, "update", entry.source, entryTitle(entry))}
                                    onRetry={() => askCatalog(true)}
                                />
                                <AddField state={rowState("add")} onAdd={(source) => void add("add", source)} onFile={(file) => void addTheFile(file)} />
                            </div>
                        </section>
                    )}
                    {shownTab === "installed" && (
                        <>
                            {!engine.hidden && <EngineCard engine={engine.read} updated={updated} newer={engineNew} state={rowState("engine")} onUpdate={() => void updateTheEngine()} />}
                            <section class="card" aria-labelledby="packages-systems">
                                <CardHead icon={iconPath("dice")} title={<h3 id="packages-systems" tabIndex={-1}>{t("Game system")}</h3>} />
                                <div class="card-body package-body">
                                    <ul class="package-list">
                                        {systems.map((system) => (
                                            <SystemRow
                                                key={system.name}
                                                system={system}
                                                newer={system.package === undefined ? undefined : newerOf(system.package, "system", catalog.read)}
                                                needs={system.package === undefined ? null : needs(entryOf(system.package, "system", catalog.read)?.newer)}
                                                changes={system.used ? <ChangedPages layers={layers} sceneOpen={sceneOpen} open={item} onChanged={onChanged} /> : undefined}
                                                fresh={fresh.includes(`system:${system.name}`)}
                                                state={rowState(`system:${system.name}`)}
                                                onUpdate={(target) => void change(`system:${system.name}`, "update", target, system.name)}
                                                onUninstall={(target) => setAsking({ kind: "uninstall", what: "system", name: system.name, target, at: `system:${system.name}` })}
                                            />
                                        ))}
                                    </ul>
                                    <CardSaid said={said} at="systems" />
                                </div>
                            </section>
                            <section class="card" aria-labelledby="packages-adventures">
                                <CardHead
                                    icon={iconPath("world")}
                                    title={<h3 id="packages-adventures" tabIndex={-1}>{t("Adventures")}</h3>}
                                    {...(adventures.length === 0 ? {} : { note: String(adventures.length) })}
                                />
                                <div class="card-body package-body">
                                    {adventures.length === 0 && <p class="package-note">{t("None yet: add one in Add, from the catalog, a .zip or a link.")}</p>}
                                    {adventures.length > 0 && (
                                        <ul class="package-list">
                                            {adventures.map((adventure) => (
                                                <AdventureRow
                                                    key={adventure.title}
                                                    adventure={adventure}
                                                    fresh={fresh.includes(`adventure:${adventure.title}`)}
                                                    state={rowState(`adventure:${adventure.title}`)}
                                                    onTakeOut={() => setAsking({ kind: "adventure", title: adventure.title })}
                                                />
                                            ))}
                                        </ul>
                                    )}
                                    <CardSaid said={said} at="adventures" />
                                    <ShareCampaign />
                                </div>
                            </section>
                            <section class="card" aria-labelledby="packages-extensions">
                                <CardHead
                                    icon={iconPath("packages")}
                                    title={<h3 id="packages-extensions" tabIndex={-1}>{t("Extensions")}</h3>}
                                    {...(view.installed.length + view.missing.length === 0 ? {} : { note: t("{count} in use", { count: usedCount(view) }) })}
                                />
                                <div class="card-body package-body">
                                    {view.installed.length + view.missing.length === 0 && <p class="package-note">{t("None: an extension adds rules and tools to the game; you find them in Add, in the catalog.")}</p>}
                                    {view.installed.length + view.missing.length > 0 && (
                                        <ul class="package-list">
                                            {view.installed.map((extension) => (
                                                <ExtensionRow
                                                    key={extension.package}
                                                    extension={extension}
                                                    newer={newerOf(extension.package, "extension", catalog.read)}
                                                    needs={needs(entryOf(extension.package, "extension", catalog.read)?.newer)}
                                                    fresh={fresh.includes(`extension:${extension.package}`)}
                                                    state={rowState(`extension:${extension.package}`)}
                                                    onUse={(use) =>
                                                        void (use
                                                            ? add(`extension:${extension.package}`, extension.package)
                                                            : change(`extension:${extension.package}`, "remove", extension.package, phraseLabel(extension.name)))}
                                                    onUpdate={() => void change(`extension:${extension.package}`, "update", extension.package, phraseLabel(extension.name))}
                                                    onUninstall={() => setAsking({ kind: "uninstall", what: "extension", name: phraseLabel(extension.name), target: extension.package, at: `extension:${extension.package}` })}
                                                />
                                            ))}
                                            {view.missing.map((name) => <MissingRow key={name} name={name} state={rowState(`extension:${name}`)} onInstall={() => void add(`extension:${name}`, name)} />)}
                                        </ul>
                                    )}
                                    <CardSaid said={said} at="extensions" />
                                </div>
                            </section>
                            <section class="card" aria-labelledby="packages-languages">
                                <CardHead icon={iconPath("language")} title={<h3 id="packages-languages" tabIndex={-1}>{t("Languages")}</h3>} />
                                <div class="card-body package-body">
                                    {languages.length === 0 && <p class="package-note">{t("None. The dashboard has its own languages; a language package takes the place of one with a translation made by hand.")}</p>}
                                    {languages.length > 0 && (
                                        <ul class="package-list">
                                            {languages.map((language) => (
                                                <LanguageRow
                                                    key={language.package}
                                                    language={language}
                                                    newer={newerOf(language.package, "language", catalog.read)}
                                                    needs={needs(entryOf(language.package, "language", catalog.read)?.newer)}
                                                    fresh={fresh.includes(`language:${language.code}`)}
                                                    state={rowState(`language:${language.code}`)}
                                                    onUpdate={() => void change(`language:${language.code}`, "update", language.package, languageTitle(language))}
                                                    onUninstall={() => setAsking({ kind: "uninstall", what: "language", name: languageTitle(language), target: language.package, at: `language:${language.code}` })}
                                                />
                                            ))}
                                        </ul>
                                    )}
                                    <CardSaid said={said} at="languages" />
                                </div>
                            </section>
                        </>
                    )}
                </div>
            )}
            {asking?.kind === "adventure" && (
                <Confirm title={t("Take {name} out of the campaign?", { name: asking.title })} onClose={() => setAsking(undefined)}>
                    <p>{t("Its places, people and pages leave the world. To have it again, add it once more.")}</p>
                    <div class="confirm-buttons">
                        <button type="button" class="button" autoFocus onClick={() => setAsking(undefined)}>{t("Cancel")}</button>
                        <button type="button" class="button danger final" onClick={() => confirmed(asking)}>{t("Take out")}</button>
                    </div>
                </Confirm>
            )}
            {asking?.kind === "library" && (
                <Confirm title={t("Take {path} off this computer?", { path: asking.name })} onClose={() => setAsking(undefined)}>
                    <p>{t("No campaign searches it any more, and the text RPG Engine read of its books is deleted. The books stay where they are.")}</p>
                    <div class="confirm-buttons">
                        <button type="button" class="button" autoFocus onClick={() => setAsking(undefined)}>{t("Cancel")}</button>
                        <button type="button" class="button danger final" onClick={() => confirmed(asking)}>{t("Take off")}</button>
                    </div>
                </Confirm>
            )}
            {asking?.kind === "uninstall" && (
                <Confirm title={t("Uninstall {name} from this computer?", { name: asking.name })} onClose={() => setAsking(undefined)}>
                    {uninstallText(asking.what)}
                    <div class="confirm-buttons">
                        <button type="button" class="button" autoFocus onClick={() => setAsking(undefined)}>{t("Cancel")}</button>
                        <button type="button" class="button danger final" onClick={() => confirmed(asking)}>{t("Uninstall")}</button>
                    </div>
                </Confirm>
            )}
        </section>
    );
}

/** On the Installed tab, what asks for the player: the updates npm has, with their count, and a mark when the campaign lists what this computer lacks. */
function TabMarks({ updates, missing }: { updates: number; missing: number; })
{
    const [updatesText, missingText] = [updates > 0 ? marksText(updates, 0)[0] : "", missing > 0 ? marksText(0, missing)[0] : ""];
    return (
        <>
            {updates > 0 && (
                <span class="tab-mark" data-tip={updatesText} aria-hidden="true">
                    <Icon name="update" />
                    {updates}
                </span>
            )}
            {missing > 0 && (
                <span class="tab-mark missing" data-tip={missingText} aria-hidden="true">
                    <Icon name="alert" />
                </span>
            )}
        </>
    );
}

/** The marks of the Installed tab in words, for its tips and its name. */
function marksText(updates: number, missing: number): string[]
{
    return [
        updates === 0 ? "" : updates === 1 ? t("1 update") : t("{count} updates", { count: updates }),
        missing === 0 ? "" : missing === 1 ? t("1 missing on this computer") : t("{count} missing on this computer", { count: missing }),
    ].filter((one) => one !== "");
}

/** The rows among the installed by their keys, as the page names where a change was made. */
function rowKeys(view: PackagesView): string[]
{
    return [
        ...(view.systems ?? []).map((one) => `system:${one.name}`),
        ...(view.adventures ?? []).map((one) => `adventure:${one.title}`),
        ...view.installed.map((one) => `extension:${one.package}`),
        ...(view.languages ?? []).map((one) => `language:${one.code}`),
    ];
}

/** Whose a work is, said away from its row: a catalog's package by its title, else as it was asked. */
function workTitle(work: Sending, catalog: Catalog | undefined): string
{
    const entry = catalog?.entries.find((one) => `catalog:${one.source}` === work.at);
    return work.action === "engine" ? engineName : entry === undefined ? work.name.replace(/^npm:/, "") : entryTitle(entry);
}

/** The tab of a place of the page: the field and the catalog are Add's, the library's field and folders the Library's, the rest Installed's. */
function tabOf(at: string): PackagesTab
{
    return at === "add" || at.startsWith("catalog:") ? "add" : at === "library" || at.startsWith("library:") ? "library" : "installed";
}

// The card of each kind among the installed, by its heading's id.
const cardOf: Record<PackageKind, string> = { system: "packages-systems", adventure: "packages-adventures", extension: "packages-extensions", language: "packages-languages" };

/** How many extensions the campaign uses, those this computer lacks among them. */
function usedCount(view: PackagesView): number
{
    return view.installed.filter((one) => !("broken" in one) && one.used).length + view.missing.length;
}

/** Where the server's work shows when this page did not start it, as after a reload: on its row, else under the field. */
function workPlace(work: PackageWork, view: PackagesView, catalog: Catalog | undefined): string
{
    const name = work.name.toLowerCase();
    const same = (...names: (string | undefined)[]): boolean => names.some((one) => one?.toLowerCase() === name);
    const extension = [...view.installed.map((one) => one.package), ...view.missing].find((one) => same(one, one.replace(/^@rpgengine\//, "")));
    const adventure = view.adventures?.find((one) => same(one.title));
    const system = view.systems?.find((one) => same(one.name, one.package));
    const language = view.languages?.find((one) => same(one.code, one.package));
    const entry = catalog?.entries.find((one) => same(one.source));

    if (work.action === "library" || work.action === "engine") {
        return work.action;
    }

    if (work.action === "add") {
        return entry !== undefined ? `catalog:${entry.source}` : extension !== undefined ? `extension:${extension}` : "add";
    }

    return extension !== undefined
        ? `extension:${extension}`
        : adventure !== undefined
        ? `adventure:${adventure.title}`
        : system !== undefined
        ? `system:${system.name}`
        : language !== undefined
        ? `language:${language.code}`
        : entry !== undefined
        ? `catalog:${entry.source}`
        : "add";
}
