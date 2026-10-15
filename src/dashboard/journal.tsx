// The Journal section (D-367, D-369, D-371, D-384, D-388): the quests the character knows as a video game's quest log, each with the time left before its deadline at its top, its
// goals, its counters as bars and its clock with its name, the main ones first and in gold; the ones the player follows, the main one until they choose, shown
// small beside the page, or in Scene and Combat on a narrow screen; the story by its scenes, as chapters, the last first, each with what the diary tells of it; and the player's own notes.
import { useEffect, useRef, useState } from "preact/hooks";
import { sectionAddress } from "./address.ts";
import { type JournalView as Journal, readJournal } from "./api.ts";
import { CardHeader, useOpen } from "./card.tsx";
import type { JournalFact, ShownChapter, ShownQuest } from "./data.ts";
import { byDateLabel, factLabel, gameDateLabel } from "./game-words.ts";
import { Icon, iconPath } from "./icons.tsx";
import { fieldLabel, phraseLabel, sceneTypeLabel } from "./labels.ts";
import { followedQuests, keptFollowed } from "./layout.ts";
import { placeKinds } from "./map-symbols.ts";
import { Markdown } from "./markdown.tsx";
import { Notes } from "./notes.tsx";
import { PageHead } from "./pages.tsx";
import { useChoice, useKeptText } from "./prefs.ts";
import { arrowStep, t } from "./text.ts";

// The tab the player last chose, kept in this browser.
const tabChoice = { key: "rpg-engine.journal-tab", initial: "quests", values: ["quests", "story", "notes"] } as const;

export function JournalView({ version, campaign }: { version: number; campaign?: string; })
{
    const journal = useJournal(version);
    const [tab, setTab] = useChoice(tabChoice);
    const [followed, setFollowed] = useFollowed(campaign, journal.read?.quests);
    const tabs = useRef<HTMLDivElement>(null);

    // The arrows move along the tabs, as in a tab list: the focus goes with the choice.
    const move = (event: KeyboardEvent): void => {
        const step = arrowStep(event.key, true);

        if (step === 0) {
            return;
        }

        event.preventDefault();
        const next = tabChoice.values[(tabChoice.values.indexOf(tab as "quests") + step + tabChoice.values.length) % tabChoice.values.length];
        setTab(next);
        tabs.current?.querySelector<HTMLElement>(`#journal-tab-${next}`)?.focus();
    };

    return (
        <section class="journal" aria-labelledby="journal-title">
            <PageHead section="journal" id="journal-title" />
            <div class="journal-tabs" role="tablist" aria-label={t("Journal")} ref={tabs} onKeyDown={move}>
                {tabChoice.values.map((value) => (
                    <button
                        key={value}
                        type="button"
                        role="tab"
                        id={`journal-tab-${value}`}
                        aria-selected={tab === value}
                        aria-controls={tab === value ? "journal-panel" : undefined}
                        tabIndex={tab === value ? 0 : -1}
                        onClick={() => setTab(value)}
                    >
                        {tabName(value)}
                    </button>
                ))}
            </div>
            <div id="journal-panel" role="tabpanel" aria-labelledby={`journal-tab-${tab}`}>
                {journal.problem !== undefined && <p class="journal-problem" role="alert">{journal.problem}</p>}
                {journal.read !== undefined && tab === "quests" && <QuestLog quests={journal.read.quests} followed={followed} onFollow={setFollowed} />}
                {journal.read !== undefined && tab === "story" && <Story chapters={journal.read.chapters} now={journal.read.now} />}
                {tab === "notes" && <Notes version={version} />}
                {journal.read === undefined && journal.problem === undefined && journal.done && tab !== "notes" && <p class="journal-none">{t("The journal starts with the player character.")}</p>}
            </div>
        </section>
    );
}

/**
 * The quests the player follows (D-369), the main ones first, then the others, each group in the order they were followed. Beside the page one card, as a video
 * game's quest tracker, that closes to its header: for each its mark, its name, its next goal, its clock and time left, with no command; a click opens it where
 * it stands into its goals, done ones ticked, and a button that stops following it. On a narrow screen the first, as a strip at the top of Scene and Combat.
 * A quest done or failed leaves by itself.
 */
export function FollowedQuests({ version, campaign, beside = false }: { version: number; campaign?: string; beside?: boolean; })
{
    const journal = useJournal(version);
    const [followed, follow] = useFollowed(campaign, journal.read?.quests);
    const quests = followed.flatMap((name) => journal.read?.quests.find((quest) => quest.name === name) ?? []).toSorted((first, second) => Number(second.main) - Number(first.main));

    if (quests.length === 0) {
        return null;
    }

    return beside ? <QuestTracker quests={quests} onUnfollow={(name) => follow(name, false)} /> : <FollowedStrip quest={quests[0]} onUnfollow={() => follow(quests[0].name, false)} />;
}

/** The card of the quests followed, beside the page: a line for each, which opens where it stands; the way to the Journal in its header. */
function QuestTracker({ quests, onUnfollow }: { quests: ShownQuest[]; onUnfollow(name: string): void; })
{
    const [open, toggle] = useOpen("Quests followed");
    return (
        <section class="quest-tracker" aria-labelledby="tracker-title">
            <details class="table-card" open={open}>
                <CardHeader icon={iconPath("journal")} title={<h2 id="tracker-title">{t("Quests")}</h2>} preview={quests.map((quest) => quest.name).join(" · ")} open={open} onToggle={toggle} />
                <ul class="tracker-list">
                    {quests.map((quest) => <TrackedQuest key={quest.name} quest={quest} onUnfollow={() => onUnfollow(quest.name)} />)}
                </ul>
            </details>
            <a class="icon-button tracker-journal tip-left" href={sectionAddress("journal")} aria-label={t("Journal")} data-tip={t("Journal")}>
                <Icon name="journal" />
            </a>
        </section>
    );
}

/**
 * A followed quest on the table: its mark, main or not; its name, the button that opens it into its goals, open or closed as the player left it, and while
 * closed its next goal; its clock and time left; open, its goals and the button that stops following it.
 */
function TrackedQuest({ quest, onUnfollow }: { quest: ShownQuest; onUnfollow(): void; })
{
    const [open, toggle] = useOpen(`Quest ${quest.name}`, false, false);
    const next = quest.goals.find((goal) => !goal.done);
    const id = `tracked-${quest.name.replace(/[^\p{L}\p{N}]+/gu, "-")}`;
    const kind = quest.main ? t("Main") : t("Side quest");
    return (
        <li class={open ? "tracked open" : "tracked"}>
            <span class="tracked-mark" role="img" aria-label={kind} data-tip={kind}>
                <svg class={quest.main ? "main" : undefined} viewBox="0 0 24 24" aria-hidden="true">
                    <path d={questFlag} />
                </svg>
            </span>
            <button type="button" class="tracked-what" aria-expanded={open} aria-controls={id} onClick={toggle}>
                <span class="followed-name">{quest.name}</span>
                {!open && next !== undefined && <span class="followed-next">{plainText(next.text)}</span>}
            </button>
            <span class="tracked-time">
                {quest.clock !== undefined && <ClockTip clock={quest.clock} />}
                {quest.deadline !== undefined && <Deadline deadline={quest.deadline} />}
            </span>
            {open && (
                <div class="tracked-more" id={id}>
                    <Goals quest={quest} />
                    <button type="button" class="tracked-unfollow" onClick={onUnfollow}>{t("Stop following")}</button>
                </div>
            )}
        </li>
    );
}

/** A quest's clock, small, with its name and count as its tooltip. */
function ClockTip({ clock }: { clock: NonNullable<ShownQuest["clock"]>; })
{
    const label = clockLabel(clock);
    return (
        <span class="clock-tip" role="img" aria-label={label} data-tip={label}>
            <ClockFace clock={clock} small hidden />
        </span>
    );
}

/** One followed quest as a strip, on a narrow screen: its star, which stops following it, its picture, its name and next goal leading to the Journal, its clock and time left. */
function FollowedStrip({ quest, onUnfollow }: { quest: ShownQuest; onUnfollow(): void; })
{
    const next = quest.goals.find((goal) => !goal.done);
    return (
        <aside class="followed" aria-label={t("The quest you follow")}>
            <button type="button" class="followed-star on" aria-label={t("Follow {quest}", { quest: quest.name })} aria-pressed={true} onClick={onUnfollow}>
                <Star />
            </button>
            <QuestFace quest={quest} small />
            <a class="followed-what" href={sectionAddress("journal")}>
                <span class="followed-name">{quest.name}</span>
                {next !== undefined && <span class="followed-next">{plainText(next.text)}</span>}
            </a>
            {quest.clock !== undefined && <ClockFace clock={quest.clock} small />}
            {quest.deadline !== undefined && <Deadline deadline={quest.deadline} />}
        </aside>
    );
}

/** A quest's goals, done ones ticked; a failed quest's undone ones marked missed. */
function Goals({ quest }: { quest: ShownQuest; })
{
    const open = quest.status === "open";
    return (
        <ul class="quest-goals" aria-label={t("Goals")}>
            {quest.goals.map((goal, index) => (
                <li key={index} class={goal.done ? "done" : quest.status === "failed" ? "missed" : undefined}>
                    <span class="quest-tick" aria-hidden="true">{goal.done ? "✓" : quest.status === "failed" ? "–" : ""}</span>
                    <span>
                        <Markdown text={goal.text} />
                    </span>
                    <span class="visually-hidden">{goal.done ? t("done") : open ? t("to do") : t("not done")}</span>
                </li>
            ))}
        </ul>
    );
}

/** The quests in three groups, open ones whole, done and failed ones folded. */
function QuestLog({ quests, followed, onFollow }: { quests: ShownQuest[]; followed: string[]; onFollow(name: string, follow: boolean): void; })
{
    const open = quests.filter((quest) => quest.status === "open");
    const done = quests.filter((quest) => quest.status === "done");
    const failed = quests.filter((quest) => quest.status === "failed");

    if (quests.length === 0) {
        return <p class="journal-none">{t("No quests yet: the ones your character takes come here.")}</p>;
    }

    const card = (quest: ShownQuest) => <QuestCard key={quest.name} quest={quest} followed={followed.includes(quest.name)} onFollow={onFollow} />;
    return (
        <div class="quest-log">
            <h3 class="quest-group">
                {t("Active")} <span>{open.length}</span>
            </h3>
            {open.length === 0 ? <p class="journal-none">{t("None open now.")}</p> : <div class="quest-cards">{open.map(card)}</div>}
            {done.length > 0 && (
                <details class="quest-folded">
                    <summary class="quest-group">
                        {t("Completed")} <span>{done.length}</span>
                    </summary>
                    <div class="quest-cards">{done.map(card)}</div>
                </details>
            )}
            {failed.length > 0 && (
                <details class="quest-folded">
                    <summary class="quest-group">
                        {t("Failed")} <span>{failed.length}</span>
                    </summary>
                    <div class="quest-cards">{failed.map(card)}</div>
                </details>
            )}
        </div>
    );
}

/** A quest as its card shows it: the star that follows it, its name, its badge and the time left; who gave it, where and by when; its text, goals and measures. */
function QuestCard({ quest, followed, onFollow }: { quest: ShownQuest; followed: boolean; onFollow(name: string, follow: boolean): void; })
{
    const id = `quest-${quest.name.replace(/[^\p{L}\p{N}]+/gu, "-")}`;
    const open = quest.status === "open";
    const from = [
        quest.giver === undefined ? undefined : t("from {who}", { who: quest.giver }),
        quest.place === undefined ? undefined : t("at {place}", { place: quest.place }),
        quest.deadline === undefined ? undefined : byDateLabel(quest.deadline.date),
    ].filter((part) => part !== undefined);
    return (
        <article class={["quest-card", quest.main ? "main" : "", quest.status].filter((name) => name !== "").join(" ")} aria-labelledby={id}>
            {/* The card's head is its picture, as a video game's quest log has it: the star, the time left and Main over its top, its name over its foot (D-388, D-389). */}
            <header class="quest-cover">
                <QuestFace quest={quest} />
                <div class="quest-cover-top">
                    {open && (
                        <button
                            type="button"
                            class={followed ? "followed-star on" : "followed-star"}
                            aria-pressed={followed}
                            aria-label={t("Follow {quest}", { quest: quest.name })}
                            data-tip={t("Follow {quest}", { quest: quest.name })}
                            onClick={() => onFollow(quest.name, !followed)}
                        >
                            <Star />
                        </button>
                    )}
                    {open && quest.deadline !== undefined && <Deadline deadline={quest.deadline} />}
                    {quest.main && <span class="quest-badge">{t("Main")}</span>}
                </div>
                <h4 class="quest-name" id={id} title={quest.name}>{quest.name}</h4>
            </header>
            {from.length > 0 && <p class="quest-from">{from.join(" · ")}</p>}
            {quest.text !== "" && (
                <div class="quest-text">
                    <Markdown text={quest.text} />
                </div>
            )}
            {quest.goals.length > 0 && <Goals quest={quest} />}
            {(quest.counters.length > 0 || quest.clock !== undefined) && (
                <div class="quest-measures">
                    {quest.counters.map((counter) => <QuestBar key={counter.field} counter={counter} />)}
                    {quest.clock !== undefined && (
                        <span class="quest-clock">
                            <ClockFace clock={quest.clock} hidden />
                            <span>{quest.clock.name ?? t("Clock")} {quest.clock.value}/{quest.clock.max}</span>
                        </span>
                    )}
                </div>
            )}
        </article>
    );
}

// The mark of a quest whose place has no kind the map draws: a flag.
const questFlag = "M6 21V3.5 M6 4.5h11l-2.6 4 2.6 4H6";

/**
 * A quest's face (D-389), always there: its picture, else its place's, else the mark of its place's kind, or a flag, on the night's blue, the main quest's on
 * dark gold; as the head of its card, or small in the followed quest's strip.
 */
function QuestFace({ quest, small = false }: { quest: ShownQuest; small?: boolean; })
{
    const picture = quest.picture ?? quest.placePicture;

    if (picture !== undefined) {
        return <img class={small ? "followed-picture" : undefined} src={pictureAddress(picture)} alt="" aria-hidden="true" loading="lazy" />;
    }

    return (
        <div class={small ? "followed-picture quest-cover-mark" : "quest-cover-mark"} aria-hidden="true">
            <svg viewBox="0 0 24 24">
                <path d={placeKinds[quest.placeKind ?? ""]?.glyph ?? questFlag} />
            </svg>
        </div>
    );
}

/** A counter of a quest as a bar: clues 3/5. */
function QuestBar({ counter }: { counter: ShownQuest["counters"][number]; })
{
    const share = Math.max(0, Math.min(1, counter.value / counter.max));
    const label = phraseLabel(fieldLabel(counter.field));
    return (
        <span class="quest-bar">
            <span class="quest-bar-label">{label}</span>
            <span
                class="quest-bar-track"
                role="progressbar"
                aria-label={label}
                aria-valuemin={0}
                aria-valuemax={counter.max}
                aria-valuenow={counter.value}
                aria-valuetext={t("{value} of {max}", { value: counter.value, max: counter.max })}
            >
                <span style={{ width: `${share * 100}%` }} />
            </span>
            <span class="quest-bar-value" aria-hidden="true">{counter.value}/{counter.max}</span>
        </span>
    );
}

/** A clock as a game draws one: a circle in as many slices as it has, those filled in gold; hidden from a screen reader where its words say it. */
function ClockFace({ clock, small = false, hidden = false }: { clock: NonNullable<ShownQuest["clock"]>; small?: boolean; hidden?: boolean; })
{
    const slices = Math.max(1, Math.min(clock.max, 24));
    const filled = Math.max(0, Math.min(clock.value, slices));
    const size = small ? 22 : 34;
    const radius = size / 2 - 1.5;
    const centre = size / 2;

    const point = (index: number): string => {
        const angle = (index / slices) * 2 * Math.PI - Math.PI / 2;
        return `${centre + radius * Math.cos(angle)} ${centre + radius * Math.sin(angle)}`;
    };

    const label = clockLabel(clock);
    return (
        <svg class="clock-face" width={size} height={size} viewBox={`0 0 ${size} ${size}`} {...(hidden ? { "aria-hidden": "true" } : { role: "img", "aria-label": label })}>
            {Array.from({ length: slices }, (_, index) => (
                <path
                    key={index}
                    class={index < filled ? "clock-slice filled" : "clock-slice"}
                    d={slices === 1
                        ? `M ${centre} ${centre - radius} A ${radius} ${radius} 0 1 1 ${centre - 0.01} ${centre - radius} Z`
                        : `M ${centre} ${centre} L ${point(index)} A ${radius} ${radius} 0 0 1 ${point(index + 1)} Z`}
                />
            ))}
        </svg>
    );
}

/** The time left before a deadline, as a game's timer: an hourglass and 1d 12h left, red under a day; Time is up once it has come. */
function Deadline({ deadline }: { deadline: NonNullable<ShownQuest["deadline"]>; })
{
    const minutes = deadline.minutes;
    const near = minutes !== undefined && minutes < 24 * 60;
    const text = minutes === undefined ? byDateLabel(deadline.date) : minutes <= 0 ? t("Time is up") : durationText(minutes);
    // Its word apart, which the followed quest's strip leaves to a screen reader on a phone.
    const left = minutes !== undefined && minutes > 0;
    return (
        <span class={near ? "quest-deadline near" : "quest-deadline"} data-tip={phraseLabel(byDateLabel(deadline.date))}>
            <Icon name="hourglass" />
            <span>
                {text}
                {left && <span class="quest-deadline-left">{` ${t("left")}`}</span>}
            </span>
        </span>
    );
}

/** The story by its scenes, the last first: each with its place and date, its summary, and what the diary tells of it, folded. */
function Story({ chapters, now }: { chapters: ShownChapter[]; now?: string; })
{
    if (chapters.length === 0) {
        return <p class="journal-none">{t("The story starts with the first scene.")}</p>;
    }

    return (
        <ol class="story">
            <li class="story-mark now">
                <b>{t("Now")}</b>
                {now !== undefined && <span>{phraseLabel(gameDateLabel(now))}</span>}
            </li>
            {chapters.map((chapter, index) =>
                chapter.title === undefined
                    ? <Between key={index} chapter={chapter} />
                    : (
                        <li key={index} class={["chapter", chapter.open ? "now" : "", chapter.picture === undefined && placeKinds[chapter.kind ?? ""] === undefined ? "bare" : ""].join(" ").trim()}>
                            <ChapterPicture chapter={chapter} />
                            <div class="chapter-body">
                                <header class="chapter-head">
                                    {chapter.number !== undefined && <span class="chapter-number">{t("Chapter {number}", { number: chapter.number })}</span>}
                                    <h3>{chapter.title}</h3>
                                    {chapter.open && <span class="chapter-now">{t("Now")}</span>}
                                    {chapter.type !== undefined && <span class="chapter-type">{phraseLabel(sceneTypeLabel(chapter.type))}</span>}
                                </header>
                                {(chapter.place !== undefined || chapter.date !== undefined) && (
                                    <p class="chapter-when">{[chapter.place, chapter.date === undefined ? undefined : phraseLabel(gameDateLabel(chapter.date))].filter((part) => part !== undefined).join(" · ")}</p>
                                )}
                                {chapter.summary !== undefined && <p class="chapter-summary">{chapter.summary}</p>}
                                {chapter.facts.length > 0 && (
                                    <details class="chapter-facts">
                                        <summary>{chapter.facts.length === 1 ? t("1 thing that happened") : t("{count} things that happened", { count: chapter.facts.length })}</summary>
                                        <Facts facts={chapter.facts} />
                                    </details>
                                )}
                            </div>
                        </li>
                    )
            )}
            <li class="story-mark start">
                <b>{t("The start")}</b>
            </li>
        </ol>
    );
}

/** The picture of a chapter's place, or the mark of its kind on the map's paper, as Saves has them; nothing for a place with neither (D-384). */
function ChapterPicture({ chapter }: { chapter: ShownChapter; })
{
    const kind = placeKinds[chapter.kind ?? ""];

    if (chapter.picture !== undefined) {
        return (
            <div class="chapter-picture" aria-hidden="true">
                <img src={pictureAddress(chapter.picture)} alt="" loading="lazy" />
            </div>
        );
    }

    return kind === undefined ? null : (
        <div class="chapter-picture kind" aria-hidden="true">
            <svg viewBox="0 0 24 24">
                <path d={kind.glyph} />
            </svg>
        </div>
    );
}

/** What happened between two scenes, as a thin folded line between their chapters. */
function Between({ chapter }: { chapter: ShownChapter; })
{
    return (
        <li class="chapter between">
            <details class="chapter-facts">
                <summary>{`${t("Between scenes")} · ${chapter.facts.length === 1 ? t("1 thing") : t("{count} things", { count: chapter.facts.length })}`}</summary>
                <Facts facts={chapter.facts} />
            </details>
        </li>
    );
}

/** The facts of a chapter, the game date written once whenever it changes, as the days in a chat. */
function Facts({ facts }: { facts: JournalFact[]; })
{
    let last: string | undefined;
    return (
        <ul>
            {facts.flatMap((fact, at) => {
                const header = fact.date !== undefined && fact.date !== last ? [<li key={`date-${at}`} class="fact-date">{phraseLabel(gameDateLabel(fact.date))}</li>] : [];
                last = fact.date ?? last;
                return [...header, <li key={at}>{factLabel(fact)}</li>];
            })}
        </ul>
    );
}

function Star()
{
    return (
        <svg class="star" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 3.2l2.6 5.5 6 .8-4.4 4.1 1.1 6-5.3-2.9-5.3 2.9 1.1-6L3.4 9.5l6-.8Z" />
        </svg>
    );
}

/** The journal, read again whenever the campaign changes; only the last reading counts. */
function useJournal(version: number): { read?: Journal; problem?: string; done: boolean; }
{
    const [state, setState] = useState<{ read?: Journal; problem?: string; done: boolean; }>({ done: false });
    const reads = useRef(0);

    useEffect(() => {
        const reading = ++reads.current;
        void readJournal().then(
            (read) => reading === reads.current && setState({ read, done: true }),
            (error: unknown) => reading === reads.current && setState({ problem: error instanceof Error ? error.message : String(error), done: true }),
        );
    }, [version]);

    return state;
}

/**
 * The quests the player follows in this campaign, kept in this browser (D-369), in the order they were followed; until they choose, the main open quest, or the
 * only open one; none once they chose none. A list kept by an older page, a name alone, is read as it was.
 */
function useFollowed(campaign: string | undefined, quests: ShownQuest[] | undefined): [string[], (name: string, follow: boolean) => void]
{
    const [kept, keep] = useKeptText(`rpg-engine.followed-quest.${campaign ?? ""}`);
    const followed = followedQuests(kept, quests ?? []);
    return [followed, (name, follow) => keep(keptFollowed(followed, name, follow))];
}

/** A clock's name and count, as a screen reader and a tooltip say it. */
function clockLabel(clock: NonNullable<ShownQuest["clock"]>): string
{
    return `${clock.name ?? t("Clock")}: ${t("{value} of {max}", { value: clock.value, max: clock.max })}`;
}

/** A picture's address, with when its file last changed, so that it comes again only when it changes. */
function pictureAddress(picture: { file: string; version: number; }): string
{
    return `/images/${encodeURIComponent(picture.file)}?v=${picture.version}`;
}

/** "1d 12h", "3h 20m", "45m": time in the game's days, hours and minutes. */
function durationText(minutes: number): string
{
    const days = Math.floor(minutes / (24 * 60));
    const hours = Math.floor((minutes % (24 * 60)) / 60);
    const rest = minutes % 60;

    if (days > 0) {
        return [t("{days}d", { days }), hours > 0 ? t("{hours}h", { hours }) : ""].filter((part) => part !== "").join(" ");
    }

    return hours > 0 ? [t("{hours}h", { hours }), rest > 0 ? t("{minutes}m", { minutes: rest }) : ""].filter((part) => part !== "").join(" ") : t("{minutes}m", { minutes: rest });
}

/** A goal's words without the marks of markdown, for the small strip. */
function plainText(text: string): string
{
    return text.replace(/\[\[([^\]|#]+)(?:#[^\]|]*)?(?:\|([^\]]+))?\]\]/g, (_, page: string, label?: string) => label ?? page).replace(/[*_`]/g, "");
}

/** A tab's name in the page's language. */
function tabName(tab: string): string
{
    return tab === "quests" ? t("Quests") : tab === "story" ? t("Story") : t("Notes");
}
