// The Packages section (D-485, D-486, D-488), in three tabs: Installed first, what is here by kind: the game system, the campaign's adventures with its own
// export last, the extensions with whether the campaign uses each, the languages; its tab counts the updates and marks what the campaign lacks. Then Add: one
// card to add a package: the catalog of what npm and GitHub offer first, always open, then a link, an npm name, a folder or a file. Then Library: the folders
// of the player's books for this campaign alone (D-491 (13)). One work at a time; one not ours with code, or a folder added to the library, waits for the
// player's yes in a window of their computer, said in every tab.
import type { ComponentChildren } from "preact";
import { useEffect, useRef, useState } from "preact/hooks";
import { sectionAddress } from "./address.ts";
import {
    addFile,
    addSource,
    type Catalog,
    type CatalogEntry,
    changeLibrary,
    changePackage,
    exportCampaign,
    type LibraryEntry,
    type LibraryView,
    type PackageAction,
    type PackageKind,
    type PackageOutcome,
    type PackagesView,
    type PackageWork,
    readCatalog,
    readLibrary,
    readPackages,
    type ShownAdventure,
    type ShownExtension,
    type ShownLanguage,
    type ShownSystem,
} from "./api.ts";
import { CardHead, useMedia } from "./card.tsx";
import { gameDateLabel, sinceDateLabel } from "./game-words.ts";
import { Icon, type IconName, iconPath } from "./icons.tsx";
import { phraseLabel, systemTitleLabel } from "./labels.ts";
import { languageName } from "./languages.ts";
import { PageHead } from "./pages.tsx";
import { Confirm } from "./saves.tsx";
import { Command } from "./settings.tsx";
import { PageTabs } from "./tabs.tsx";
import { arrowStep, foldedText, isolated, pageDirection, t } from "./text.ts";

/** What happened to the player's last change, said where it was made: a row, a card, or the field. */
interface Said
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

/** The page's three tabs (D-488, D-491 (13)): what is here, first, what can be added, and the campaign's library. */
type PackagesTab = "installed" | "add" | "library";

/** A package's work as this page started it, before the server says it: with where it was asked. */
type Sending = PackageWork & { at: string; };

/** A change that asks first. */
type Asking =
    | { kind: "adventure"; title: string; }
    | { kind: "uninstall"; what: "system" | "extension" | "language"; name: string; target: string; at: string; }
    | { kind: "library"; path: string; name: string; };

/** What a row is given of the page's work: the work under way there, what happened there, and whether another holds the server. */
interface RowState
{
    work?: PackageWork;
    said?: Said;
    busy: boolean;
    /** Shows what was added among the installed, from the tab where it was added. */
    onSee?(kind: PackageKind): void;
}

// The rows of the catalog shown before "Show more": fewer on a phone, where the installed come after it.
const shownWide = 5;
const shownNarrow = 3;

export function PackagesPage({ version, tab }: { version: number; tab?: string | undefined; })
{
    const [view, setView] = useState<PackagesView>();
    const [problem, setProblem] = useState<string>();
    const [catalog, setCatalog] = useState<{ asking: boolean; read?: Catalog; error?: string; }>({ asking: true });
    const [sending, setSending] = useState<Sending>();
    const [said, setSaid] = useState<Said>();
    const [asking, setAsking] = useState<Asking>();
    const reads = useRef(0);
    const catalogReads = useRef(0);
    const before = useRef<PackageWork>();
    const mine = useRef(0);
    // The rows here before the last addition: those not among them are new.
    const known = useRef<Set<string>>();
    const seeing = useRef<PackageKind>();
    const shownTab: PackagesTab = tab === "add" || tab === "library" ? tab : "installed";
    const [library, setLibrary] = useState<LibraryView>();
    const [libraryProblem, setLibraryProblem] = useState<string>();
    const libraryBusy = library?.entries.some((entry) => entry.reading > 0) ?? false;

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

    useEffect(read, [version]);
    useEffect(readShelves, [version]);
    useEffect(() => askCatalog(false), []);

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
    const updates = view === undefined ? 0 : updateCount(view, catalog.read);
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
                        <section class="package-card" aria-label={t("Add")}>
                            <div class="package-body">
                                {/* The catalog first, for whoever picks with a click; a link, an npm name, a folder or a file after it, for whoever knows what they want (D-488). */}
                                <CatalogList
                                    catalog={catalog}
                                    view={view}
                                    state={(entry) => rowState(`catalog:${entry.source}`)}
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
                            <section class="package-card" aria-labelledby="packages-systems">
                                <CardHead icon={iconPath("dice")} title={<h3 id="packages-systems" tabIndex={-1}>{t("Game system")}</h3>} />
                                <div class="package-body">
                                    <ul class="package-list">
                                        {systems.map((system) => (
                                            <SystemRow
                                                key={system.name}
                                                system={system}
                                                newer={system.package === undefined ? undefined : newerOf(system.package, "system", catalog.read)}
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
                            <section class="package-card" aria-labelledby="packages-adventures">
                                <CardHead
                                    icon={iconPath("world")}
                                    title={<h3 id="packages-adventures" tabIndex={-1}>{t("Adventures")}</h3>}
                                    {...(adventures.length === 0 ? {} : { note: String(adventures.length) })}
                                />
                                <div class="package-body">
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
                            <section class="package-card" aria-labelledby="packages-extensions">
                                <CardHead
                                    icon={iconPath("packages")}
                                    title={<h3 id="packages-extensions" tabIndex={-1}>{t("Extensions")}</h3>}
                                    {...(view.installed.length + view.missing.length === 0 ? {} : { note: t("{count} in use", { count: usedCount(view) }) })}
                                />
                                <div class="package-body">
                                    {view.installed.length + view.missing.length === 0 && <p class="package-note">{t("None: an extension adds rules and tools to the game; you find them in Add, in the catalog.")}</p>}
                                    {view.installed.length + view.missing.length > 0 && (
                                        <ul class="package-list">
                                            {view.installed.map((extension) => (
                                                <ExtensionRow
                                                    key={extension.package}
                                                    extension={extension}
                                                    newer={newerOf(extension.package, "extension", catalog.read)}
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
                            <section class="package-card" aria-labelledby="packages-languages">
                                <CardHead icon={iconPath("language")} title={<h3 id="packages-languages" tabIndex={-1}>{t("Languages")}</h3>} />
                                <div class="package-body">
                                    {languages.length === 0 && <p class="package-note">{t("None. The dashboard has its own languages; a language package takes the place of one with a translation made by hand.")}</p>}
                                    {languages.length > 0 && (
                                        <ul class="package-list">
                                            {languages.map((language) => (
                                                <LanguageRow
                                                    key={language.package}
                                                    language={language}
                                                    newer={newerOf(language.package, "language", catalog.read)}
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

// How often the library is read again while its books are being read, for their counts.
const libraryReading = 5000;

/**
 * This computer's library (D-491 (13)): said first to be added once to the computer and turned on in each campaign, as packages are, with how many this one
 * uses; its folders, each with its books read, being read and skipped, whether this campaign uses it, and the bin; then the field that adds a folder or a book.
 */
function LibraryTab(
    { view, problem, state, onAdd, onUse, onForget }: {
        view: LibraryView | undefined;
        problem: string | undefined;
        state(at: string): RowState;
        onAdd(path: string): void;
        onUse(path: string, use: boolean, away: boolean): void;
        onForget(path: string, name: string): void;
    },
)
{
    const entries = view?.entries ?? [];
    const used = entries.filter((entry) => entry.used && entry.onComputer).length;
    // A folder by its name; by its path when another has the same name.
    const label = (entry: LibraryEntry): string => (entries.filter((other) => shelfName(other.path) === shelfName(entry.path)).length > 1 ? entry.path : shelfName(entry.path));
    return (
        <section class="package-card" aria-labelledby="packages-library">
            <CardHead
                icon={iconPath("library")}
                title={<h3 id="packages-library" tabIndex={-1}>{t("Your books")}</h3>}
                {...(entries.length === 0 ? {} : { note: t("{count} in this campaign", { count: used }) })}
            />
            <div class="package-body">
                <p class="library-scope">
                    <Icon name="info" />
                    <span>
                        <strong>{t("Added once to this computer.")}</strong> {t("Each campaign then turns on its own; the master searches them after the game system, citing the book and the page.")}
                    </span>
                </p>
                {problem !== undefined && <p class="package-said problem" role="alert">{problem}</p>}
                {view !== undefined && entries.length === 0 && <p class="package-note">{t("None yet: add the folder of your manuals.")}</p>}
                {entries.length > 0 && (
                    <ul class="package-list">
                        {entries.map((entry) => (
                            <LibraryRow
                                key={entry.path}
                                entry={entry}
                                label={label(entry)}
                                state={state(`library:${entry.path}`)}
                                onUse={(use) => onUse(entry.path, use, !entry.onComputer)}
                                onForget={() => onForget(entry.path, label(entry))}
                            />
                        ))}
                    </ul>
                )}
                <LibraryField state={state("library")} onAdd={onAdd} />
            </div>
        </section>
    );
}

/**
 * A folder or a book of the library: its name, its path under it, what is read of it, what was skipped with the engine's words; whether this campaign uses it,
 * as a switch, and the bin that takes it off this computer. One the campaign lists and the computer has not, in red, with Add and Take out of this campaign.
 */
function LibraryRow({ entry, label, state, onUse, onForget }: { entry: LibraryEntry; label: string; state: RowState; onUse(use: boolean): void; onForget(): void; })
{
    const path = (
        <bdi dir="ltr" class="library-path">
            {breakablePath(entry.path)}
        </bdi>
    );
    const name = <bdi>{shelfName(entry.path)}</bdi>;

    if (!entry.onComputer) {
        return (
            <PackageRow
                tile="alert"
                tone="broken"
                name={name}
                about={
                    <>
                        {path}
                        <span class="package-red">{t("Not on this computer: the master does not search it until you add it again.")}</span>
                    </>
                }
                row={`library:${entry.path}`}
                actions={
                    <>
                        <button type="button" class="button package-button" aria-label={t("Add {path} again", { path: label })} aria-disabled={state.busy} onClick={() => !state.busy && onUse(true)}>
                            <Icon name="plus" />
                            {t("Add")}
                        </button>
                        <button
                            type="button"
                            class="button package-button"
                            aria-label={t("Take {name} out of this campaign", { name: label })}
                            aria-disabled={state.busy}
                            onClick={() => !state.busy && onUse(false)}
                        >
                            <Icon name="minus" />
                            {t("Take out of this campaign")}
                        </button>
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
            tile="folder"
            tone={entry.missing ? "dim" : undefined}
            name={name}
            about={path}
            meta={libraryMeta(entry)}
            row={`library:${entry.path}`}
            actions={
                <>
                    <label class="package-use">
                        <input
                            type="checkbox"
                            role="switch"
                            checked={entry.used}
                            aria-label={t("{path}: in this campaign", { path: label })}
                            aria-disabled={state.busy}
                            onClick={(event) => {
                                event.preventDefault();

                                if (!state.busy) {
                                    onUse(!entry.used);
                                }
                            }}
                        />
                        {t("In this campaign")}
                    </label>
                    <button
                        type="button"
                        class="icon-button package-bin tip-left"
                        aria-label={t("Take {path} off this computer…", { path: label })}
                        data-tip={t("Take off this computer…")}
                        aria-disabled={state.busy}
                        onClick={() => !state.busy && onForget()}
                    >
                        <Icon name="clear" />
                    </button>
                </>
            }
        >
            {entry.skipped.length > 0 && (
                <ul class="library-skipped">
                    {entry.skipped.map((one) => (
                        <li key={one.name}>
                            <bdi>{one.name}</bdi>: {skippedText(one.kind)}
                        </li>
                    ))}
                </ul>
            )}
            <WorkNote work={state.work} />
            <SaidNote said={state.said} />
        </PackageRow>
    );
}

/** Why a book was skipped, in the player's words, with what to do. */
function skippedText(kind: LibraryEntry["skipped"][number]["kind"]): string
{
    const texts: Record<typeof kind, string> = {
        password: t("it asks for a password to open: save a copy without one."),
        drm: t("it is locked by DRM, which RPG Engine never opens."),
        stuck: t("it stopped the reader twice: too big or damaged, or kept busy by another program. Close that program, or save the file again."),
        denied: t("this computer does not let it be read: check who may open it."),
        broken: t("it does not read: the file is damaged, or is not what its name says."),
    };
    return texts[kind];
}

/** The name a folder or a book of the library goes by: its last part, without a book's kind; a disk's whole path. */
function shelfName(path: string): string
{
    const last = path.replace(/[\\/]+$/, "").split(/[\\/]/).at(-1) ?? "";
    return last === "" || /^[a-z]:$/i.test(last) ? path : last.replace(/\.(md|txt|pdf|docx|odt|epub|html?)$/i, "");
}

/** What is read of a folder of the library, in the page's words: its books read and being read, those skipped, or that it is not there now, or holds too many. */
function libraryMeta(entry: LibraryEntry): string
{
    if (entry.missing) {
        return t("Not there now, as a disk taken out: its books stay known for when it is back.");
    }

    return [
        entry.books === 1 ? t("1 book read") : t("{count} books read", { count: entry.books }),
        entry.reading === 0 ? "" : entry.reading === 1 ? t("1 being read") : t("{count} being read", { count: entry.reading }),
        entry.skipped.length === 0 ? "" : entry.skipped.length === 1 ? t("1 skipped") : t("{count} skipped", { count: entry.skipped.length }),
        entry.crowded ? t("more than 300 documents: only the first are read; give the folder of this game's books") : "",
    ].filter((part) => part !== "").join(" · ");
}

/** A path that goes to a new line after its separators, as words do, and is copied as it is. */
function breakablePath(path: string): ComponentChildren
{
    return path.split(/(?<=[\\/])/).flatMap((part, index) => (index === 0 ? [part] : [<wbr key={index} />, part]));
}

/**
 * The field that adds to the library: a folder or a book written by hand, as the browser gives no folder's path; what to give it, and that the computer asks the
 * player's yes and never changes the folder. It empties once added.
 */
function LibraryField({ state, onAdd }: { state: RowState; onAdd(path: string): void; })
{
    const [path, setPath] = useState("");
    const [empty, setEmpty] = useState(false);
    const sent = useRef<string>();

    useEffect(() => {
        if (state.said?.problem === false && sent.current === path) {
            setPath("");
        }
    }, [state.said]);

    const submit = (): void => {
        const given = path.trim().replace(/^"(.*)"$/, "$1");

        if (state.busy) {
            return;
        }

        setEmpty(given === "");

        if (given !== "") {
            sent.current = path;
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
            <label class="package-label" for="library-path">{t("A folder or a book of this computer")}</label>
            <div class="package-add-line">
                <input
                    id="library-path"
                    dir="ltr"
                    type="text"
                    enterKeyHint="go"
                    autocomplete="off"
                    spellcheck={false}
                    maxLength={1000}
                    value={path}
                    readOnly={state.work !== undefined}
                    aria-invalid={state.said?.problem === true || empty}
                    aria-describedby="library-path-about"
                    placeholder="D:\Books\5e"
                    onInput={(event) => setPath(event.currentTarget.value)}
                />
                <button type="submit" class="button package-button" aria-disabled={state.busy}>
                    <Icon name="plus" />
                    {t("Add")}
                </button>
            </div>
            <p class="package-note" id="library-path-about">
                {t("Write or paste its full path: the browser does not give a folder's. Your computer asks your yes in a window, once, and nothing in the folder is ever changed.")}{" "}
                {t("Text, or PDFs whose text can be selected, read best; a scanned PDF is read from the pictures of its pages, on Windows only, in a few minutes.")}
            </p>
            {empty && state.work === undefined && <p class="package-said problem" role="status">{t("Write the path of a folder or a book first.")}</p>}
            <WorkNote work={state.work} />
            <SaidNote said={state.said} />
        </form>
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

/**
 * The one field that adds (D-485 (1)): a link, a GitHub repository's too, an npm name or a folder written by hand, as the browser gives no folder's path; or a
 * file. The field keeps the focus and what was written while the work goes; it empties once added.
 */
function AddField({ state, onAdd, onFile }: { state: RowState; onAdd(source: string): void; onFile(file: File): void; })
{
    const [source, setSource] = useState("");
    const [empty, setEmpty] = useState(false);
    const picker = useRef<HTMLInputElement>(null);
    const sent = useRef<string>();

    // Added: the field is ready for the next one.
    useEffect(() => {
        if (state.said?.problem === false && sent.current === source) {
            setSource("");
        }
    }, [state.said]);

    const submit = (): void => {
        // An address copied without its scheme, as github.com/someone/an-adventure, is taken as https.
        const given = source.trim().replace(/^(?=[\w-]+(?:\.[\w-]+)+\/)/, "https://");

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
function CatalogList(
    { catalog, view, state, onAdd, onUpdate, onRetry }: {
        catalog: { asking: boolean; read?: Catalog; error?: string; };
        view: PackagesView;
        state(entry: CatalogEntry): RowState;
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
                    <span class="package-search">
                        <Icon name="search" />
                        <input type="search" value={query} placeholder={t("Search")} aria-label={t("Search the catalog")} onInput={(event) => setQuery(event.currentTarget.value)} />
                    </span>
                )}
            </div>
            {kinds.length > 1 && (
                <div class="package-chips" role="group" aria-label={t("Kind")} ref={chips} onKeyDown={chipKey}>
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
function CatalogRow({ entry, named, view, state, onAdd, onUpdate }: { entry: CatalogEntry; named: boolean; view: PackagesView; state: RowState; onAdd(): void; onUpdate(): void; })
{
    const here = hereState(entry, view);
    const asksYes = !entry.verified && entry.code;
    const facts = [
        entry.author !== undefined && !entry.verified && !entry.code ? t("by {author}", { author: entry.author }) : "",
        entry.levels === undefined ? "" : levelsText(entry.levels),
        entry.length ?? "",
        entry.language === undefined ? "" : languageName(entry.language, pageLanguage()) ?? entry.language,
        entry.stars === undefined || entry.stars === 0 ? "" : `★ ${entry.stars}`,
        asksYes ? t("has code: asks your yes") : "",
        entry.kind === "system" && here === "none" && view.system !== null ? t("for a new campaign: this one stays in {system}", { system: view.system.name }) : "",
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
                : entry.kind === "system" && here === "none"
                ? action(t("Download"), t("Download {name}", { name: entryTitle(entry) }), "download", onAdd)
                : action(asksYes ? t("Add…") : t("Add"), t("Add {name}", { name: entryTitle(entry) }), "plus", onAdd)}
        >
            <WorkNote work={state.work} />
            <SaidNote said={state.said} onSee={state.onSee} />
        </PackageRow>
    );
}

/**
 * A game system here: the campaign's, chosen in its setup and locked; another, for a new campaign, which can go off this computer when npm installed it; npm's
 * newer version, to update it.
 */
function SystemRow(
    { system, newer, fresh, state, onUpdate, onUninstall }: {
        system: ShownSystem;
        newer?: string | undefined;
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
            meta={<VersionMeta version={system.version} newer={newer} />}
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
        </PackageRow>
    );
}

/** An adventure of the campaign: the day it came in on and its version; taken out while the story has not touched it, else part of the story. */
function AdventureRow({ adventure, fresh, state, onTakeOut }: { adventure: ShownAdventure; fresh: boolean; state: RowState; onTakeOut(): void; })
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
function ExtensionRow(
    { extension, newer, fresh, state, onUse, onUpdate, onUninstall }: {
        extension: ShownExtension;
        newer?: string | undefined;
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
                meta={<bdi class="package-why">{extension.broken}</bdi>}
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
            meta={<VersionMeta version={extension.version} newer={newer} />}
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
function MissingRow({ name, state, onInstall }: { name: string; state: RowState; onInstall(): void; })
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
function LanguageRow(
    { language, newer, fresh, state, onUpdate, onUninstall }: {
        language: ShownLanguage;
        newer?: string | undefined;
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
                </>
            }
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

/** A row of the page: the tile, the words, what can be done at the end; under them, the work going on and what happened. */
function PackageRow(
    { tile, tone, name, badges, about, meta, actions, focusable, row, fresh, children }: {
        tile: IconName;
        tone?: "cover" | "dim" | "broken";
        name: ComponentChildren;
        badges?: ComponentChildren;
        about?: ComponentChildren;
        meta?: ComponentChildren;
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
            </span>
            {actions !== undefined && <span class="package-actions">{actions}</span>}
            {children}
        </li>
    );
}

/** Whose a package is: ours, a shield with its tick; someone else's with code, in red with the shield's mark and the word, never the colour alone. */
function Trust({ verified, code, author }: { verified: boolean; code: boolean; author?: string | undefined; })
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
function VersionMeta({ version, newer }: { version: string | undefined; newer: string | undefined; })
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

/** Update, for a row npm has a newer version of. */
function UpdateButton({ name, version, busy, onClick }: { name: string; version: string; busy: boolean; onClick(): void; })
{
    return (
        <button type="button" class="button package-button accent" aria-label={t("Update {name} to {version}", { name, version })} aria-disabled={busy} onClick={() => !busy && onClick()}>
            <Icon name="update" />
            {t("Update")}
        </button>
    );
}

/** The bin that takes a package off this computer, after asking. */
function UninstallButton({ name, busy, onClick }: { name: string; busy: boolean; onClick(): void; })
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
function WorkNote({ work, whose }: { work: PackageWork | undefined; whose?: string; })
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
function SaidNote({ said, focus, onSee }: { said: Said | undefined; focus?: boolean; onSee?: ((kind: PackageKind) => void) | undefined; })
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
function CardSaid({ said, at }: { said: Said | undefined; at: string; })
{
    return said?.at === at ? <SaidNote said={said} focus /> : null;
}

/**
 * The campaign shared as an adventure (D-483), the last row of Adventures (D-486): Export… opens who wrote it and its licence, each optional, and whose it is
 * to share; then the link to download it.
 */
function ShareCampaign()
{
    const [open, setOpen] = useState(false);
    const [author, setAuthor] = useState("");
    const [license, setLicense] = useState("");
    const [exporting, setExporting] = useState(false);
    const [made, setMade] = useState<Awaited<ReturnType<typeof exportCampaign>>>();
    const ready = useRef<HTMLAnchorElement>(null);
    const first = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (made !== undefined && "download" in made) {
            ready.current?.focus();
        }
    }, [made]);

    // The button stays where the focus is while the export goes: a second press waits for the first.
    const share = async (): Promise<void> => {
        if (exporting) {
            return;
        }

        setExporting(true);
        setMade(undefined);
        const credits = { ...(author.trim() === "" ? {} : { author: author.trim() }), ...(license.trim() === "" ? {} : { license: license.trim() }) };
        setMade(await exportCampaign(credits));
        setExporting(false);
    };

    return (
        <div class="package-export">
            <span class="package-tile plain" aria-hidden="true">
                <Icon name="share" />
            </span>
            <span class="package-text">
                <strong class="package-title" id="package-export-title">{t("This campaign, as an adventure")}</strong>
                <span class="package-about">{t("The world as it was at the start, without the player characters: a .zip to give to others.")}</span>
            </span>
            <span class="package-actions">
                <button
                    type="button"
                    class="button package-button"
                    aria-expanded={open}
                    aria-controls="package-credits"
                    onClick={() => {
                        setOpen(!open);

                        if (!open) {
                            requestAnimationFrame(() => first.current?.focus());
                        }
                    }}
                >
                    <Icon name="share" />
                    {t("Export…")}
                </button>
            </span>
            {open && (
                <form
                    class="package-credits"
                    id="package-credits"
                    aria-labelledby="package-export-title"
                    onSubmit={(event) => {
                        event.preventDefault();
                        void share();
                    }}
                >
                    <label>
                        <span>{t("Author")}</span>
                        <input ref={first} type="text" value={author} maxLength={200} placeholder={t("Optional")} autocomplete="name" onInput={(event) => setAuthor(event.currentTarget.value)} />
                    </label>
                    <label>
                        <span>{t("Licence")}</span>
                        <input
                            type="text"
                            value={license}
                            maxLength={200}
                            list="package-licences"
                            placeholder={t("Optional")}
                            aria-describedby="package-license-about"
                            onInput={(event) => setLicense(event.currentTarget.value)}
                        />
                    </label>
                    <datalist id="package-licences">
                        <option value="CC BY 4.0" />
                        <option value="CC BY-SA 4.0" />
                        <option value="CC0 1.0" />
                    </datalist>
                    <p class="package-why" id="package-license-about">{t("Without a licence, all rights are reserved.")}</p>
                    <p class="package-rights">
                        <Icon name="licence" />
                        {t("Share it only if you have the right to: a world taken from a book or from someone else's adventure is not yours to give.")}
                    </p>
                    <button type="submit" class="button package-button" aria-disabled={exporting}>
                        <Icon name="share" />
                        {exporting ? t("Exporting…") : t("Export")}
                    </button>
                    {made !== undefined && "download" in made && (
                        <p class="package-said package-ready" role="status">
                            <span>{`✓ ${t("{file} is ready.", { file: made.file })}`}</span>
                            <a ref={ready} class="button gold package-button" href={made.download} download={made.file}>
                                <Icon name="download" />
                                {t("Download")}
                            </a>
                        </p>
                    )}
                    {made !== undefined && "error" in made && <p class="package-said problem" role="status">{made.error}</p>}
                </form>
            )}
        </div>
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

/** npm's newer version of a package here, as the catalog says it. */
function newerOf(name: string, kind: PackageKind, catalog: Catalog | undefined): string | undefined
{
    const entry = catalog?.entries.find((one) => one.kind === kind && samePackage(one, name));
    return entry?.update === true ? entry.version : undefined;
}

/** How many packages here npm has a newer version of: the count on the Installed tab. */
function updateCount(view: PackagesView, catalog: Catalog | undefined): number
{
    const systems = (view.systems ?? []).filter((one) => one.package !== undefined && newerOf(one.package, "system", catalog) !== undefined);
    const extensions = view.installed.filter((one) => newerOf(one.package, "extension", catalog) !== undefined);
    const languages = (view.languages ?? []).filter((one) => newerOf(one.package, "language", catalog) !== undefined);
    return systems.length + extensions.length + languages.length;
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
    return entry === undefined ? work.name.replace(/^npm:/, "") : entryTitle(entry);
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

    if (work.action === "library") {
        return "library";
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

/** What went wrong, in the page's words, with the engine's under them: the no, a computer with no window for the yes, the work of another package. */
function failure(at: string, action: PackageWork["action"], name: string, outcome: Extract<PackageOutcome, { done: false; }>): Said
{
    if (outcome.code === "declined") {
        return { at, problem: true, text: t("You said no: nothing changed.") };
    }

    if (outcome.code === "no-window") {
        const command = action === "library" ? `rpg config library --add "${name}"` : `rpg package install ${name}`;
        return { at, problem: true, text: t("No window for your yes opens on this computer: add it from your terminal, in the campaign's folder."), command };
    }

    if (outcome.code === "busy") {
        return { at, problem: true, text: action === "library" ? t("One change at a time: wait for the one under way, then try again.") : t("One package at a time: wait for the one under way, then try again.") };
    }

    return { at, problem: true, text: action === "add" ? t("Nothing was added.") : t("Nothing changed."), why: outcome.error };
}

/** What an addition did, by the kind the engine recognized. */
function addedText(kind: PackageKind | undefined): string
{
    const texts: Record<PackageKind, string> = {
        adventure: t("The adventure is in the campaign: the master brings it into the story when you want it."),
        extension: t("The extension is in the campaign: it counts from now on."),
        system: t("The game system is on this computer, for a new campaign."),
        language: t("The language is on this computer, for every campaign."),
    };
    return kind === undefined ? t("Done.") : texts[kind];
}

/** What a change did, once done. */
function doneText(action: PackageAction, name: string): string
{
    const texts: Record<PackageAction, string> = {
        update: t("{name} is updated.", { name }),
        remove: t("{name} is out of the campaign: it stays on this computer.", { name }),
        uninstall: t("{name} is off this computer.", { name }),
    };
    return texts[action];
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
    };
    return texts[action];
}

/** What uninstalling does, by kind. */
function uninstallText(what: "system" | "extension" | "language")
{
    if (what === "system") {
        return <p>{t("It goes off this computer: a new campaign can no longer choose it. This campaign does not change.")}</p>;
    }

    if (what === "language") {
        return <p>{t("It goes off this computer: the dashboard goes back to its own words in this language.")}</p>;
    }

    return (
        <>
            <p>{t("It goes off this computer, and out of this campaign. Another campaign that uses it asks to install it again.")}</p>
            <p class="confirm-note">{t("What it wrote in the campaign stays, and comes back if you install it again.")}</p>
        </>
    );
}

/** An adventure's levels: one, or from one to another. */
function levelsText(levels: string): string
{
    return levels.includes("-") ? t("levels {levels}", { levels: levels.replace("-", "–") }) : t("level {level}", { level: levels });
}

/** A language package's name in the page's language, else its own. */
function languageTitle(language: ShownLanguage): string
{
    return phraseLabel(languageName(language.code, pageLanguage()) ?? language.name);
}

/** A catalog's title: an adventure's as its author wrote it; an npm package's name with its first letter a capital, as the rows of what is here. */
function entryTitle(entry: CatalogEntry): string
{
    // A language by its code, as lang-de: named in the page's language.
    const code = entry.kind === "language" ? /^(?:lang-)?([a-z]{2,3}(?:-[a-z0-9]+)?)$/i.exec(entry.title)?.[1] : undefined;
    const language = code === undefined ? undefined : languageName(code, pageLanguage());
    return entry.kind === "adventure" ? entry.title : phraseLabel(language ?? entry.title);
}

/** The language this page is written in. */
function pageLanguage(): string
{
    return document.documentElement.lang || "en";
}
