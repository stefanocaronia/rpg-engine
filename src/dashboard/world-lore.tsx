// What the character knows and the documents it found (D-276), each as a list and a reader, as a video game's codex: the list to browse by kind and to search,
// the page open beside it on a wide screen, in its place on a phone, in the address so that Back returns to it. Every page and text as the character knows it
// (VIEW-3, VIEW-11): a link of a text leads only to a page the character knows; the others stay words.
import type { ComponentChildren } from "preact";
import { useEffect, useRef, useState } from "preact/hooks";
import { sectionAddress } from "./address.ts";
import { pictureAddress, readView, type WorldView } from "./api.ts";
import { useMedia } from "./card.tsx";
import type { KnownEntry, Member, ShownDocument } from "./data.ts";
import { Icon } from "./icons.tsx";
import { documentLook, foundLore, groupedLore, knownTo, type LoreGroup, loreGroupOf } from "./lore.ts";
import { placeKindLabel, placeKinds } from "./map-symbols.ts";
import { type LinkTo, Markdown, plainLine, type SecretNote } from "./markdown.tsx";
import { Token } from "./party.tsx";
import { arrowStep, capitalized, foldedText, listText, t } from "./text.ts";

// From this width the reader stands beside the list.
const wide = "(min-width: 900px)";

/**
 * The pages the character knows: the list by kind with its search, and the one open, read again as the game changes (`version`). `onMap` is the address of a
 * place on the world map, or of the nearest that holds it. With more than one player character (`players`), a chip for each among the kinds shows what that
 * one knows (D-480 (7)).
 */
export function LoreTab({ world, version, open, onMap, players = [] }: {
    world: WorldView;
    version: number;
    open?: string | undefined;
    onMap: (places: string[]) => string | undefined;
    players?: Member[];
})
{
    const [search, setSearch] = useState("");
    // A kind of page, or a player character's name after "@".
    const [filter, setFilter] = useState<string>();
    const besides = useMedia(wide);
    const found = foundLore(world.known, search);
    const kept = (entry: KnownEntry, key: string | undefined): boolean => key === undefined || (key.startsWith("@") ? knownTo(entry, key.slice(1)) : loreGroupOf(entry) === key);
    const shownFilter = filter !== undefined && found.some((entry) => kept(entry, filter)) ? filter : undefined;
    const listed = found.filter((entry) => kept(entry, shownFilter));
    const groups = groupedLore(listed);
    const each = players.length > 1 ? players : [];
    // A name the address gives that the character does not know: said so over the list.
    const asked = world.known.find((one) => one.name === open);
    const entry = asked ?? (besides ? groups[0]?.entries[0] : undefined);
    const link = linksOf(world);

    if (world.known.length === 0) {
        return <p class="browse-none">{t("Your character knows no one and nothing yet: whom they meet and what they learn comes here, as the master writes it.")}</p>;
    }

    return (
        <Browse open={entry?.name} explicit={asked !== undefined} back={sectionAddress("world", "lore")} backLabel={t("All you know")}>
            <div class="browse-list">
                {open !== undefined && asked === undefined && <p class="browse-none" role="status">{t("Your character knows nothing called “{name}”.", { name: open })}</p>}
                <div class="browse-find">
                    <span class="search">
                        <Icon name="search" />
                        <input type="search" value={search} placeholder={t("Search")} aria-label={t("Search what your character knows")} onInput={(event) => setSearch(event.currentTarget.value)} />
                    </span>
                </div>
                {(groupedLore(world.known).length > 1 || each.length > 0) && (
                    <FilterChips
                        label={t("Kinds")}
                        chosen={shownFilter}
                        onChoose={setFilter}
                        all={found.length}
                        options={[
                            ...groupedLore(found).map((part) => ({ key: part.group, name: groupLabel(part.group), count: part.entries.length })),
                            ...each.map((member) => ({ key: `@${member.name}`, name: member.name, count: found.filter((entry) => knownTo(entry, member.name)).length, member })),
                        ]}
                    />
                )}
                {found.length === 0 && (
                    <p class="browse-none" role="status">
                        {t("Nothing your character knows matches “{search}”.", { search })} <button type="button" class="button quiet" onClick={() => setSearch("")}>{t("Clear the search")}</button>
                    </p>
                )}
                {groups.map((part) => (
                    <section key={part.group} class="browse-group" aria-labelledby={`lore-${part.group}`}>
                        <h3 class="eyebrow" id={`lore-${part.group}`}>
                            {groupLabel(part.group)}
                            <span class="browse-count num">{part.entries.length}</span>
                        </h3>
                        <ul class="browse-rows">
                            {part.entries.map((one, index) => (
                                <li key={one.name}>
                                    <a
                                        class="browse-row"
                                        href={sectionAddress("world", "lore", one.name)}
                                        aria-current={one.name === entry?.name ? "true" : undefined}
                                        aria-describedby={`lore-${part.group}-${index}`}
                                        data-name={one.name}
                                    >
                                        <LoreThumb entry={one} />
                                        <span class="browse-words">
                                            <span class="browse-name">{one.name}</span>
                                            <span class="browse-meta" id={`lore-${part.group}-${index}`}>{entryMeta(one)}</span>
                                        </span>
                                    </a>
                                </li>
                            ))}
                        </ul>
                    </section>
                ))}
            </div>
            {entry !== undefined && (
                <LoreReader
                    key={entry.name}
                    entry={entry}
                    version={version}
                    link={link}
                    several={each.length > 0}
                    onMap={entry.type === "place" ? onMap([entry.name, ...entry.within ?? []]) : undefined}
                    focus={asked !== undefined}
                />
            )}
        </Browse>
    );
}

/**
 * The documents the character has or read: those it carries, then the others; the one open on its paper, as what it is. With more than one player character
 * (`players`), a group for each who carries some, by name (D-480 (7)).
 */
export function DocumentsTab({ world, open, players = [] }: { world: WorldView; open?: string | undefined; players?: Member[]; })
{
    const besides = useMedia(wide);
    const asked = world.documents.find((one) => one.name === open);
    const document = asked ?? (besides ? world.documents[0] : undefined);
    const link = linksOf(world);

    if (world.documents.length === 0) {
        return <p class="browse-none">{t("No documents yet: the letters, notices and pages your character finds or reads come here, to read again.")}</p>;
    }

    const several = players.length > 1;
    const carriers = several ? players.map((member) => member.name) : [];
    const parts = [
        ...carriers.map((name, index) => ({ key: `carried-${index}`, name: t("With {name}", { name }), documents: world.documents.filter((one) => one.carried && one.carrier === name) })),
        { key: "carried", name: t("With you"), documents: world.documents.filter((one) => one.carried && (one.carrier === undefined || !carriers.includes(one.carrier))) },
        { key: "read", name: t("Read elsewhere"), documents: world.documents.filter((one) => !one.carried) },
    ].filter((part) => part.documents.length > 0);
    return (
        <Browse open={document?.name} explicit={asked !== undefined} back={sectionAddress("world", "documents")} backLabel={t("All documents")}>
            <div class="browse-list">
                {open !== undefined && asked === undefined && <p class="browse-none" role="status">{t("Your character has no document called “{name}”.", { name: open })}</p>}
                {parts.map((part) => (
                    <section key={part.key} class="browse-group" aria-labelledby={`documents-${part.key}`}>
                        <h3 class="eyebrow" id={`documents-${part.key}`}>
                            {part.name}
                            <span class="browse-count num">{part.documents.length}</span>
                        </h3>
                        <ul class="browse-rows">
                            {part.documents.map((one, index) => (
                                <li key={one.name}>
                                    <a
                                        class="browse-row"
                                        href={sectionAddress("world", "documents", one.name)}
                                        aria-current={one.name === document?.name ? "true" : undefined}
                                        aria-describedby={`documents-${part.key}-${index}`}
                                        data-name={one.name}
                                    >
                                        <span class={`browse-thumb paper-thumb look-${documentLook(one.document)}`} aria-hidden="true">
                                            <DocumentGlyph look={documentLook(one.document)} />
                                        </span>
                                        <span class="browse-words">
                                            <span class="browse-name">{one.name}</span>
                                            <span class="browse-meta" id={`documents-${part.key}-${index}`}>{[documentLabel(one.document), plainLine(one.text)].filter((part) => part !== undefined).join(" · ")}</span>
                                        </span>
                                    </a>
                                </li>
                            ))}
                        </ul>
                    </section>
                ))}
            </div>
            {document !== undefined && <DocumentReader key={document.name} document={document} link={link} focus={asked !== undefined} several={several} />}
        </Browse>
    );
}

/** Who knows a secret, after its title, when not all the player characters do: "known to Mira alone". */
function secretKnowers(knowers: { secret: string; who: string[]; }[]): SecretNote
{
    return (title) => {
        const who = knowers.find((one) => foldedText(one.secret.trim()) === foldedText(title))?.who ?? [];
        return who.length === 0 ? undefined : who.length === 1 ? t("known to {name} alone", { name: who[0] }) : t("known to {names} alone", { names: listText(who) });
    };
}

/** Whether a document is carried, in words: by the player's character, or with more than one by the one named, as its group says; nothing of one read elsewhere. */
function carriedWords(document: ShownDocument, several: boolean): string | undefined
{
    if (!several) {
        return document.carried ? t("You carry it") : t("You read it");
    }

    return document.carried && document.carrier !== undefined ? t("With {name}", { name: document.carrier }) : undefined;
}

/** A document in the page's language, by what it is: Letter; one the page does not know as its own word. */
function documentLabel(document: string): string
{
    const labels: Record<string, string> = {
        letter: t("Letter"),
        note: t("Note"),
        notice: t("Notice"),
        page: t("Page"),
        book: t("Book"),
        diary: t("Diary"),
        journal: t("Diary"),
        map: t("Map"),
        scroll: t("Scroll"),
        inscription: t("Inscription"),
    };
    const word = document.trim();
    return labels[word.toLowerCase()] ?? capitalized(word);
}

/**
 * The list and its reader: side by side on a wide screen; under it the reader in the list's place once a page is open, with the way back at its top. Back from
 * a page, the focus goes to its row.
 */
function Browse({ open, explicit, back, backLabel, children }: { open?: string | undefined; explicit: boolean; back: string; backLabel: string; children: ComponentChildren; })
{
    const box = useRef<HTMLDivElement>(null);
    const last = useRef<string>();

    useEffect(() => {
        if (explicit) {
            last.current = open;
            return;
        }

        const row = last.current === undefined ? undefined : [...box.current?.querySelectorAll<HTMLElement>(".browse-row") ?? []].find((one) => one.dataset.name === last.current);
        last.current = undefined;

        if (row !== undefined) {
            row.focus({ preventScroll: true });
            row.scrollIntoView({ block: "center" });
        }
    }, [open, explicit]);

    return (
        <div class={explicit ? "browse open" : "browse"} ref={box}>
            {explicit && (
                <a class="browse-back button quiet" href={back}>
                    <Icon name="fold" />
                    {backLabel}
                </a>
            )}
            {children}
        </div>
    );
}

/** A page the character knows, read whole as it knows it: its picture, what it is and where, its text with its links, and where it leads on the page. */
function LoreReader({ entry, version, link, onMap, focus, several }: { entry: KnownEntry; version: number; link: LinkTo; onMap?: string | undefined; focus: boolean; several: boolean; })
{
    const [text, setText] = useState<string>();
    // Who knows each secret, when not all the player characters do: said after its title, the one place the page names them (D-480 (7)).
    const [knowers, setKnowers] = useState<{ secret: string; who: string[]; }[]>([]);
    const [problem, setProblem] = useState(false);
    const reads = useRef(0);
    const title = useRef<HTMLHeadingElement>(null);

    // Its whole text, read when it opens and again as the game changes, the last reading alone; the opening the list has until then.
    useEffect(() => {
        const reading = ++reads.current;
        readView(entry.name).then(
            (page) => {
                if (reading === reads.current) {
                    setText(page.kind === "page" ? page.text : "");
                    setKnowers(page.kind === "page" ? page.knownBy ?? [] : []);
                    setProblem(false);
                }
            },
            () => reading === reads.current && text === undefined && setProblem(true),
        );
    }, [entry.name, version]);

    useOpened(title, focus);
    const person = entry.type === "character" || entry.type === "creature";
    const banner = entry.picture !== undefined && !person;
    return (
        <article class="browse-reader" aria-labelledby="reader-title">
            {banner && <img class="reader-banner" src={pictureAddress(entry.picture as NonNullable<KnownEntry["picture"]>)} alt="" />}
            <header class="reader-head">
                {person && <Token member={{ name: entry.name, image: entry.picture, role: entry.companion ? "companion" : "other" }} large {...(entry.companion ? { side: "ally" as const } : {})} />}
                <div>
                    <p class="eyebrow">{entryKind(entry)}</p>
                    <h3 id="reader-title" tabIndex={-1} ref={title}>{entry.name}</h3>
                    {entry.within !== undefined && (
                        <p class="reader-where">
                            <Icon name="place" />
                            <span class="reader-path">
                                {entry.within.toReversed().map((place, index) => (
                                    <span key={place}>
                                        {index > 0 && <span class="reader-step" aria-hidden="true" />}
                                        <a class="md-link" href={sectionAddress("world", "lore", place)}>{place}</a>
                                    </span>
                                ))}
                            </span>
                        </p>
                    )}
                </div>
            </header>
            {(onMap !== undefined || entry.companion) && (
                <p class="reader-actions">
                    {onMap !== undefined && (
                        <a class="button package-button" href={onMap}>
                            <Icon name="world" />
                            {t("Show on the map")}
                        </a>
                    )}
                    {entry.companion && (
                        <a class="button package-button" href={`#/party/${encodeURIComponent(entry.name)}`}>
                            <Icon name="party" />
                            {t("Open the sheet")}
                        </a>
                    )}
                </p>
            )}
            <div class="reader-text">
                {text === undefined && !problem && entry.summary !== "" && <Markdown text={entry.summary} link={link} />}
                {text !== undefined && text.trim() !== "" && <Markdown text={text} link={link} {...(several ? { secretNote: secretKnowers(knowers) } : {})} />}
                {((text !== undefined && text.trim() === "") || (text === undefined && entry.summary === "")) && !problem && (
                    <p class="browse-none">{text === undefined ? t("Reading…") : t("Your character knows its name, and nothing more yet.")}</p>
                )}
                {problem && <p class="browse-none">{t("This page could not be read now: try again in a moment.")}</p>}
            </div>
        </article>
    );
}

/** A document on its paper, as what it is: a letter, a notice, a torn page; its picture first, larger at a click, for a map above all. */
function DocumentReader({ document, link, focus, several }: { document: ShownDocument; link: LinkTo; focus: boolean; several: boolean; })
{
    const title = useRef<HTMLHeadingElement>(null);
    const look = documentLook(document.document);
    useOpened(title, focus);
    return (
        <article class="browse-reader" aria-labelledby="reader-title">
            <header class="reader-head">
                <div>
                    <p class="eyebrow">{[documentLabel(document.document), carriedWords(document, several)].filter((part) => part !== undefined).join(" · ")}</p>
                    <h3 id="reader-title" tabIndex={-1} ref={title}>{document.name}</h3>
                </div>
            </header>
            <div class={`paper look-${look}`}>
                <span class="paper-mark" aria-hidden="true" />
                {document.picture !== undefined && (
                    <a class="paper-picture" href={pictureAddress(document.picture)} target="_blank" rel="noreferrer">
                        <img src={pictureAddress(document.picture)} alt={t("{name}, as drawn", { name: document.name })} />
                    </a>
                )}
                {document.text.trim() !== "" && <Markdown text={document.text} link={link} />}
            </div>
        </article>
    );
}

/** A row of filter chips: All, then each option with its count; one stop of Tab, the arrows along it. */
function FilterChips<Key extends string>(
    { label, options, chosen, all, onChoose }: {
        label: string;
        options: { key: Key; name: string; count: number; member?: Member; }[];
        chosen: Key | undefined;
        all: number;
        onChoose: (key: Key | undefined) => void;
    },
)
{
    const row = useRef<HTMLDivElement>(null);

    const move = (event: KeyboardEvent): void => {
        const buttons = [...row.current?.querySelectorAll("button") ?? []];
        const at = buttons.indexOf(event.target as HTMLButtonElement);
        const step = arrowStep(event.key, true);
        const to = event.key === "Home" ? 0 : event.key === "End" ? buttons.length - 1 : step === 0 ? -1 : (at + step + buttons.length) % buttons.length;

        if (to >= 0) {
            event.preventDefault();
            buttons[to]?.focus();
            buttons[to]?.click();
        }
    };

    const chip = (key: Key | undefined, name: string, count: number, member?: Member) => (
        <button
            type="button"
            key={key ?? ""}
            class={member === undefined ? undefined : "with-token"}
            aria-pressed={chosen === key}
            tabIndex={chosen === key ? 0 : -1}
            onClick={() => onChoose(key)}
        >
            {member !== undefined && <Token member={member} />}
            {name}
            <span class="package-count">{count}</span>
        </button>
    );

    return (
        <div class="filter-chips" role="group" aria-label={label} ref={row} onKeyDown={move}>
            {chip(undefined, t("All"), all)}
            {options.map((option) => chip(option.key, option.name, option.count, option.member))}
        </div>
    );
}

/** A page's small picture in its row: a person's token, a place's picture or the mark of its kind, else the first letter of its name. */
function LoreThumb({ entry }: { entry: KnownEntry; })
{
    if (entry.type === "character" || entry.type === "creature") {
        return <Token member={{ name: entry.name, image: entry.picture, role: entry.companion ? "companion" : "other" }} {...(entry.companion ? { side: "ally" as const } : {})} />;
    }

    if (entry.picture !== undefined) {
        return (
            <span class="browse-thumb" aria-hidden="true">
                <img src={pictureAddress(entry.picture)} alt="" loading="lazy" />
            </span>
        );
    }

    const kind = entry.kind === undefined ? undefined : placeKinds[entry.kind];
    return (
        <span class={`browse-thumb mark ${loreGroupOf(entry)}`} aria-hidden="true">
            {kind === undefined ? <span class="browse-letter">{[...entry.name][0]?.toUpperCase()}</span> : (
                <svg viewBox="0 0 24 24">
                    <path d={kind.glyph} />
                </svg>
            )}
        </span>
    );
}

/** A document's drawing in its row: an envelope, a nailed sheet, an open book, a map… */
function DocumentGlyph({ look }: { look: string; })
{
    const glyphs: Record<string, string> = {
        letter: "M3.5 6.5h17v11h-17Z M3.5 6.5 12 13l8.5-6.5",
        note: "M6 3.5h8.5L18 7v13.5H6Z M14.5 3.5V7H18 M9 11h6 M9 14.5h6 M9 18h3.5",
        notice: "M5.5 6h13v14.5h-13Z M12 3v5 M8.5 11.5h7 M8.5 14.5h7 M8.5 17.5h4.5",
        page: "M12 6.5C10 5 7 4.5 3.5 5v13.5C7 18 10 18.5 12 20c2-1.5 5-2 8.5-1.5V5C17 4.5 14 5 12 6.5Z M12 6.5V20",
        diary: "M6.5 3.5h11v17h-11Z M9.5 3.5v17 M14 3.5v6l1.5-1.2 1.5 1.2v-6",
        map: "M3.5 6.5 9 4.5l6 2 5.5-2v13l-5.5 2-6-2-5.5 2Z M9 4.5v13 M15 6.5v13",
        scroll: "M7 4.5h10.5a2 2 0 0 1 0 4H7 M7 4.5a2 2 0 0 0 0 4v9.5a2 2 0 0 0 2 2h10 M17.5 8.5v11.5 M10 12h5 M10 15.5h5",
        inscription: "M6 20.5V9a6 6 0 0 1 12 0v11.5Z M9 11h6 M9 14h6 M9 17h4",
        plain: "M6 3.5h12v17H6Z M9 8h6 M9 12h6 M9 16h4",
    };
    return (
        <svg viewBox="0 0 24 24">
            <path d={glyphs[look] ?? glyphs.plain} />
        </svg>
    );
}

/** The opened page's title takes the focus when the player opened it, so that a screen reader reads it; on a phone the page goes back to its top. */
function useOpened(title: { current: HTMLHeadingElement | null; }, focus: boolean): void
{
    useEffect(() => {
        if (!focus) {
            return;
        }

        title.current?.focus({ preventScroll: true });

        if (!matchMedia(wide).matches) {
            title.current?.closest(".browse")?.scrollIntoView({ block: "start" });
        }
    }, [focus]);
}

/** Where a link of a text leads: a page the character knows to its reader, a document to its paper; any other stays words. */
function linksOf(world: WorldView): LinkTo
{
    // By the name without case and accents, as a link of Obsidian finds its page.
    const known = new Map(world.known.map((entry) => [foldedText(entry.name), entry.name]));
    const documents = new Map(world.documents.map((document) => [foldedText(document.name), document.name]));

    return (name) => {
        const page = known.get(foldedText(name));
        const document = documents.get(foldedText(name));
        return page !== undefined ? sectionAddress("world", "lore", page) : document !== undefined ? sectionAddress("world", "documents", document) : undefined;
    };
}

/** What a page is, in the reader's eyebrow: a companion, a person, the kind of a place, a faction… */
function entryKind(entry: KnownEntry): string
{
    if (entry.companion) {
        return t("Companion");
    }

    const kinds: Record<string, string> = { character: t("Person"), faction: t("Faction"), creature: t("Creature"), item: t("Item"), event: t("Event"), topic: t("Topic") };
    return entry.type === "place" ? placeKindLabel(entry.kind) ?? t("Place") : kinds[entry.type] ?? capitalized(entry.type);
}

/** A row's line under the name: what the page is, then the opening of its text, or for a place where it is. */
function entryMeta(entry: KnownEntry): string
{
    const opening = plainLine(entry.summary);
    const where = entry.within?.[0];
    return [entryKind(entry), opening ?? where].filter((part) => part !== undefined && part !== "").join(" · ");
}

/** A group of the list in the page's language. */
function groupLabel(group: LoreGroup): string
{
    const labels: Record<LoreGroup, string> = {
        people: t("People"),
        places: t("Places"),
        factions: t("Factions"),
        creatures: t("Creatures"),
        items: t("Items"),
        tales: t("Tales and events"),
        other: t("Other"),
    };
    return labels[group];
}
