// The Library tab: the folders of the player's books on this computer, which this campaign uses, and the field that adds one.
import type { ComponentChildren } from "preact";
import { useEffect, useRef, useState } from "preact/hooks";
import type { LibraryEntry, LibraryView } from "../api.ts";
import { CardHead } from "../parts/card.tsx";
import { Icon, iconPath } from "../parts/icons.tsx";
import { t } from "../text.ts";
import { PackageRow, type RowState, SaidNote, WorkNote } from "./rows.tsx";

// How often the library is read again while its books are being read, for their counts.
export const libraryReading = 5000;

/**
 * This computer's library (D-491 (13)): said first to be added once to the computer and turned on in each campaign, as packages are, with how many this one
 * uses; its folders, each with its books read, being read and skipped, whether this campaign uses it, and the bin; then the field that adds a folder or a book.
 */
export function LibraryTab(
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
        <section class="card" aria-labelledby="packages-library">
            <CardHead
                icon={iconPath("library")}
                title={<h3 id="packages-library" tabIndex={-1}>{t("Your books")}</h3>}
                {...(entries.length === 0 ? {} : { note: t("{count} in this campaign", { count: used }) })}
            />
            <div class="card-body package-body">
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
    const sent = useRef<string | undefined>(undefined);

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
                    placeholder="D:\Books\RPG"
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
