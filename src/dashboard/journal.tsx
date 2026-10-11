// The Journal section (D-367, D-369, D-371): the quests the character knows as a video game's quest log, each with the time left before its deadline at its top, its
// goals, its counters as bars and its clock with its name, the main ones first and in gold; the one the player follows, the main one until they choose, shown
// small in Scene and Combat too; the story by its scenes, as chapters, the last first, each with what the diary tells of it; and the player's own notes.
import { useEffect, useRef, useState } from "preact/hooks";
import { sectionAddress } from "./address.ts";
import { type JournalView as Journal, readJournal } from "./api.ts";
import type { ShownChapter, ShownQuest } from "./data.ts";
import { Icon } from "./icons.tsx";
import { fieldLabel, phraseLabel } from "./labels.ts";
import { Markdown } from "./markdown.tsx";
import { Notes } from "./notes.tsx";
import { useChoice, useKeptText } from "./prefs.ts";

// The tab the player last chose, kept in this browser.
const tabChoice = { key: "rpg-engine.journal-tab", initial: "quests", values: ["quests", "story", "notes"] } as const;
const tabNames: Record<string, string> = { quests: "Quests", story: "Story", notes: "Notes" };

export function JournalView({ version, campaign }: { version: number; campaign?: string; })
{
    const journal = useJournal(version);
    const [tab, setTab] = useChoice(tabChoice);
    const [followed, setFollowed] = useFollowed(campaign, journal.read?.quests);
    const tabs = useRef<HTMLDivElement>(null);

    // The arrows move along the tabs, as in a tab list: the focus goes with the choice.
    const move = (event: KeyboardEvent): void => {
        const step = event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0;

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
            <h2 id="journal-title">Journal</h2>
            <div class="journal-tabs" role="tablist" aria-label="Journal" ref={tabs} onKeyDown={move}>
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
                        {tabNames[value]}
                    </button>
                ))}
            </div>
            <div id="journal-panel" role="tabpanel" aria-labelledby={`journal-tab-${tab}`}>
                {journal.problem !== undefined && <p class="journal-problem" role="alert">{journal.problem}</p>}
                {journal.read !== undefined && tab === "quests" && <QuestLog quests={journal.read.quests} followed={followed} onFollow={setFollowed} />}
                {journal.read !== undefined && tab === "story" && <Story chapters={journal.read.chapters} />}
                {tab === "notes" && <Notes />}
                {journal.read === undefined && journal.problem === undefined && journal.done && tab !== "notes" && <p class="journal-none">The journal starts with the player character.</p>}
            </div>
        </section>
    );
}

/** The quest the player follows, shown small at the top of Scene and Combat, with its next goal, its clock and the time left; nothing when it is none. */
export function FollowedQuest({ version, campaign }: { version: number; campaign?: string; })
{
    const journal = useJournal(version);
    const [followed, setFollowed] = useFollowed(campaign, journal.read?.quests);
    const quest = journal.read?.quests.find((one) => one.name === followed && one.status === "open");

    if (quest === undefined) {
        return null;
    }

    const next = quest.goals.find((goal) => !goal.done);
    return (
        <aside class="followed" aria-label="The quest you follow">
            <button type="button" class="followed-star on" aria-label={`Follow ${quest.name}`} aria-pressed={true} onClick={() => setFollowed(undefined)}>
                <Star />
            </button>
            <a class="followed-what" href={sectionAddress("journal")}>
                <span class="followed-name">{quest.name}</span>
                {next !== undefined && <span class="followed-next">{plainText(next.text)}</span>}
            </a>
            {quest.clock !== undefined && <ClockFace clock={quest.clock} small />}
            {quest.deadline !== undefined && <Deadline deadline={quest.deadline} />}
        </aside>
    );
}

/** The quests in three groups, open ones whole, done and failed ones folded. */
function QuestLog({ quests, followed, onFollow }: { quests: ShownQuest[]; followed?: string; onFollow(name: string | undefined): void; })
{
    const open = quests.filter((quest) => quest.status === "open");
    const done = quests.filter((quest) => quest.status === "done");
    const failed = quests.filter((quest) => quest.status === "failed");

    if (quests.length === 0) {
        return <p class="journal-none">No quests yet: the ones your character takes come here.</p>;
    }

    const card = (quest: ShownQuest) => <QuestCard key={quest.name} quest={quest} followed={quest.name === followed} onFollow={onFollow} />;
    return (
        <div class="quest-log">
            <h3 class="quest-group">
                Active <span>{open.length}</span>
            </h3>
            {open.length === 0 ? <p class="journal-none">None open now.</p> : <div class="quest-cards">{open.map(card)}</div>}
            {done.length > 0 && (
                <details class="quest-folded">
                    <summary class="quest-group">
                        Completed <span>{done.length}</span>
                    </summary>
                    <div class="quest-cards">{done.map(card)}</div>
                </details>
            )}
            {failed.length > 0 && (
                <details class="quest-folded">
                    <summary class="quest-group">
                        Failed <span>{failed.length}</span>
                    </summary>
                    <div class="quest-cards">{failed.map(card)}</div>
                </details>
            )}
        </div>
    );
}

/** A quest as its card shows it: the star that follows it, its name, its badge and the time left; who gave it, where and by when; its text, goals and measures. */
function QuestCard({ quest, followed, onFollow }: { quest: ShownQuest; followed: boolean; onFollow(name: string | undefined): void; })
{
    const id = `quest-${quest.name.replace(/[^\p{L}\p{N}]+/gu, "-")}`;
    const open = quest.status === "open";
    const from = [
        quest.giver === undefined ? undefined : `from ${quest.giver}`,
        quest.place === undefined ? undefined : `at ${quest.place}`,
        quest.deadline === undefined ? undefined : `by ${quest.deadline.date}`,
    ].filter((part) => part !== undefined);
    return (
        <article class={["quest-card", quest.main ? "main" : "", quest.status].filter((name) => name !== "").join(" ")} aria-labelledby={id}>
            <header class="quest-head">
                {open && (
                    <button
                        type="button"
                        class={followed ? "followed-star on" : "followed-star"}
                        aria-pressed={followed}
                        aria-label={`Follow ${quest.name}`}
                        data-tip="Shown in Scene and Combat"
                        onClick={() => onFollow(followed ? undefined : quest.name)}
                    >
                        <Star />
                    </button>
                )}
                <h4 class="quest-name" id={id}>{quest.name}</h4>
                {open && quest.deadline !== undefined && <Deadline deadline={quest.deadline} />}
                {quest.main && <span class="quest-badge">Main</span>}
            </header>
            {from.length > 0 && <p class="quest-from">{from.join(" · ")}</p>}
            {quest.text !== "" && (
                <div class="quest-text">
                    <Markdown text={quest.text} />
                </div>
            )}
            {quest.goals.length > 0 && (
                <ul class="quest-goals" aria-label="Goals">
                    {quest.goals.map((goal, index) => (
                        <li key={index} class={goal.done ? "done" : quest.status === "failed" ? "missed" : undefined}>
                            <span class="quest-tick" aria-hidden="true">{goal.done ? "✓" : quest.status === "failed" ? "–" : ""}</span>
                            <span>
                                <Markdown text={goal.text} />
                            </span>
                            <span class="visually-hidden">{goal.done ? "done" : open ? "to do" : "not done"}</span>
                        </li>
                    ))}
                </ul>
            )}
            {(quest.counters.length > 0 || quest.clock !== undefined) && (
                <div class="quest-measures">
                    {quest.counters.map((counter) => <QuestBar key={counter.field} counter={counter} />)}
                    {quest.clock !== undefined && (
                        <span class="quest-clock">
                            <ClockFace clock={quest.clock} hidden />
                            <span>{quest.clock.name ?? "Clock"} {quest.clock.value}/{quest.clock.max}</span>
                        </span>
                    )}
                </div>
            )}
        </article>
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
                aria-valuetext={`${counter.value} of ${counter.max}`}
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

    const label = `${clock.name ?? "Clock"}: ${clock.value} of ${clock.max}`;
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
    const text = minutes === undefined ? `by ${deadline.date}` : minutes <= 0 ? "Time is up" : `${durationText(minutes)} left`;
    return (
        <span class={near ? "quest-deadline near" : "quest-deadline"} data-tip={`By ${deadline.date}`}>
            <Icon name="hourglass" />
            <span>{text}</span>
        </span>
    );
}

/** The story by its scenes, the last first: each with its place and date, its summary, and what the diary tells of it, folded. */
function Story({ chapters }: { chapters: ShownChapter[]; })
{
    if (chapters.length === 0) {
        return <p class="journal-none">The story starts with the first scene.</p>;
    }

    return (
        <ol class="story">
            {chapters.map((chapter, index) =>
                chapter.title === undefined ? <Between key={index} chapter={chapter} /> : (
                    <li key={index} class={chapter.open ? "chapter now" : "chapter"}>
                        <header class="chapter-head">
                            <h3>{chapter.title}</h3>
                            {chapter.open && <span class="chapter-now">Now</span>}
                            {chapter.type !== undefined && <span class="chapter-type">{phraseLabel(chapter.type)}</span>}
                        </header>
                        {(chapter.place !== undefined || chapter.date !== undefined) && (
                            <p class="chapter-when">{[chapter.place, chapter.date === undefined ? undefined : phraseLabel(chapter.date)].filter((part) => part !== undefined).join(" · ")}</p>
                        )}
                        {chapter.summary !== undefined && <p class="chapter-summary">{chapter.summary}</p>}
                        {chapter.facts.length > 0 && (
                            <details class="chapter-facts">
                                <summary>{chapter.facts.length === 1 ? "1 thing that happened" : `${chapter.facts.length} things that happened`}</summary>
                                <Facts facts={chapter.facts} />
                            </details>
                        )}
                    </li>
                )
            )}
        </ol>
    );
}

/** What happened between two scenes, as a thin folded line between their chapters. */
function Between({ chapter }: { chapter: ShownChapter; })
{
    return (
        <li class="chapter between">
            <details class="chapter-facts">
                <summary>Between scenes · {chapter.facts.length === 1 ? "1 thing" : `${chapter.facts.length} things`}</summary>
                <Facts facts={chapter.facts} />
            </details>
        </li>
    );
}

/** The facts of a chapter, the game date written once whenever it changes, as the days in a chat. */
function Facts({ facts }: { facts: string[]; })
{
    let last: string | undefined;
    return (
        <ul>
            {facts.flatMap((fact, at) => {
                const [, date, rest] = /^(day [^·]+?) · (.*)$/.exec(fact) ?? [undefined, undefined, fact];
                const header = date !== undefined && date !== last ? [<li key={`date-${at}`} class="fact-date">{phraseLabel(date)}</li>] : [];
                last = date ?? last;
                return [...header, <li key={at}>{rest}</li>];
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
 * The quest the player follows in this campaign, kept in this browser (D-369): until they choose, the main open quest, or the only open one; none once they
 * chose none.
 */
function useFollowed(campaign: string | undefined, quests: ShownQuest[] | undefined): [string | undefined, (name: string | undefined) => void]
{
    const [kept, keep] = useKeptText(`rpg-engine.followed-quest.${campaign ?? ""}`);
    const open = (quests ?? []).filter((quest) => quest.status === "open");
    const usual = open.find((quest) => quest.main)?.name ?? (open.length === 1 ? open[0].name : undefined);
    return [kept === undefined ? usual : kept === "" ? undefined : kept, (name) => keep(name ?? "")];
}

/** "1d 12h", "3h 20m", "45m": time in the game's days, hours and minutes. */
function durationText(minutes: number): string
{
    const days = Math.floor(minutes / (24 * 60));
    const hours = Math.floor((minutes % (24 * 60)) / 60);
    const rest = minutes % 60;

    if (days > 0) {
        return `${days}d${hours > 0 ? ` ${hours}h` : ""}`;
    }

    return hours > 0 ? `${hours}h${rest > 0 ? ` ${rest}m` : ""}` : `${rest}m`;
}

/** A goal's words without the marks of markdown, for the small strip. */
function plainText(text: string): string
{
    return text.replace(/\[\[([^\]|#]+)(?:#[^\]|]*)?(?:\|([^\]]+))?\]\]/g, (_, page: string, label?: string) => label ?? page).replace(/[*_`]/g, "");
}
