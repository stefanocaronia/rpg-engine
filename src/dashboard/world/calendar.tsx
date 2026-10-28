// The calendar of the World section (D-276, TIM-8): today, as large as a game's date; the deadlines the character knows, the soonest first, with the time left;
// the month with its season along the year, its days in rows of ten (five on a phone), never weeks, which a calendar of months alone does not have; the days of
// the story lit, the scenes and deadlines marked, and the day chosen with what it holds, its scenes with their place leading to the Journal. Without a
// calendar start, the days of the story in the same rows, by their number.
import { useEffect, useRef, useState } from "preact/hooks";
import { sectionAddress } from "../address.ts";
import { CardHead, useMedia } from "../card.tsx";
import type { ShownCalendar } from "../data.ts";
import { calendarDayLabel, calendarMonthLabel, gameDateLabel, seasonLabel } from "../game-words.ts";
import { Icon, iconPath } from "../icons.tsx";
import { Deadline } from "../journal.tsx";
import { arrowStep, capitalized, isolated, listText, t } from "../text.ts";
import { calendarDateOf, type CalendarMonth, dayMarks, monthAt, monthOffsetOf, storyDays } from "./days.ts";

export function CalendarTab({ calendar }: { calendar: ShownCalendar; })
{
    const narrow = useMedia("(max-width: 600px)");
    const row = narrow ? 5 : 10;
    const [offset, setOffset] = useState(0);
    const [chosen, setChosen] = useState(calendar.today ?? 1);
    const grid = useRef<HTMLDivElement>(null);
    const keyed = useRef(false);
    const month = monthAt(calendar, offset);
    const days = month === undefined ? storyDays(calendar, row) : Array.from({ length: month.days }, (_, index) => month.first + index);

    // A day chosen with the keys takes the focus, in this month or the next one the arrows went to.
    useEffect(() => {
        if (keyed.current) {
            keyed.current = false;
            grid.current?.querySelector<HTMLElement>(`[data-day="${chosen}"]`)?.focus();
        }
    }, [chosen, offset]);

    const choose = (day: number, byKeys = false): void => {
        keyed.current = byKeys;
        setChosen(day);

        if (month !== undefined && (day < month.first || day >= month.first + month.days)) {
            setOffset(monthOffsetOf(calendar, day));
        }
    };

    // The day the keys reach the grid on: the one chosen, or the month's first when it is in another month.
    const focusable = days.includes(chosen) ? chosen : days[0];

    const move = (event: KeyboardEvent): void => {
        const across = arrowStep(event.key, true);
        const step = across !== 0 ? across : event.key === "ArrowDown" ? row : event.key === "ArrowUp" ? -row : 0;
        // From the day that has the focus, which may not be the one chosen, as when the chosen day is in another month.
        const from = Number((event.target as HTMLElement).dataset.day ?? focusable);
        const to = event.key === "Home" ? days[0] : event.key === "End" ? days.at(-1) : step === 0 ? undefined : from + step;

        if (to !== undefined && (month !== undefined || days.includes(to))) {
            event.preventDefault();
            choose(to, true);
        }
    };

    const backToday = (): void => {
        setOffset(0);
        setChosen(calendar.today ?? 1);
    };

    return (
        <div class="calendar">
            <div class="calendar-side">
                <Today calendar={calendar} />
                {calendar.deadlines.length > 0 && <Deadlines calendar={calendar} />}
            </div>
            <section class="card calendar-month" aria-labelledby="calendar-month-title">
                <CardHead icon={iconPath("calendar")} title={<h3 id="calendar-month-title" class="calendar-month-name">{month === undefined ? t("The days of the story") : calendarMonthLabel(month.name, month.year)}</h3>}>
                    {month !== undefined && (
                        <span class="calendar-steps">
                            {(offset !== 0 || chosen !== calendar.today) && <button type="button" class="button quiet" onClick={backToday}>{t("Today")}</button>}
                            <button type="button" class="icon-button calendar-back" aria-label={t("Previous month")} data-tip={t("Previous month")} onClick={() => setOffset(offset - 1)}>
                                <Icon name="fold" />
                            </button>
                            <button type="button" class="icon-button tip-left" aria-label={t("Next month")} data-tip={t("Next month")} onClick={() => setOffset(offset + 1)}>
                                <Icon name="fold" />
                            </button>
                        </span>
                    )}
                </CardHead>
                <div class="card-body">
                    {month !== undefined && <Year calendar={calendar} month={month} />}
                    <div class={`calendar-days rows-${row}`} role="group" aria-label={t("Days")} ref={grid} onKeyDown={move}>
                        {days.map((day) => (
                            <DayCell
                                key={day}
                                calendar={calendar}
                                day={day}
                                label={month === undefined ? day : day - month.first + 1}
                                chosen={day === chosen}
                                focusable={day === focusable}
                                onChoose={() => choose(day)}
                            />
                        ))}
                    </div>
                    <p class="calendar-key" aria-hidden="true">
                        <span class="calendar-key-today">{t("Today")}</span>
                        <span class="calendar-key-lived">{t("Days of the story")}</span>
                        <span class="calendar-key-scene">{t("Scene")}</span>
                        <span class="calendar-key-deadline">
                            <Icon name="hourglass" />
                            {t("Deadline")}
                        </span>
                    </p>
                    <DayDetails calendar={calendar} day={chosen} />
                </div>
            </section>
        </div>
    );
}

/** Today, large: the day of the calendar with its season, or the game's day; the game's date and hour under it. */
function Today({ calendar }: { calendar: ShownCalendar; })
{
    const date = calendar.today === undefined ? undefined : calendarDateOf(calendar, calendar.today);
    return (
        <section class="card calendar-today" aria-labelledby="calendar-today-title">
            <CardHead icon={iconPath("clock")} title={<h3 id="calendar-today-title">{t("Today")}</h3>} />
            <div class="card-body">
                {calendar.now === undefined ? <p class="browse-none">{t("The story has no date yet: the master sets it when the play begins.")}</p> : (
                    <>
                        <p class="calendar-date">{date === undefined ? capitalized(gameDateLabel(`day ${calendar.today}`)) : calendarDayLabel({ day: date.day, month: date.name, ...(date.year === undefined ? {} : { year: date.year }) })}</p>
                        <p class="calendar-now">
                            {date?.season !== undefined && <Season season={date.season} />}
                            <span>{date === undefined ? /\d{1,2}:\d{2}/.exec(calendar.now)?.[0] : capitalized(gameDateLabel(calendar.now))}</span>
                        </p>
                    </>
                )}
            </div>
        </section>
    );
}

/** The deadlines the character knows, the soonest first: the quest, the day it falls on, the time left; each leads to the quests in the Journal. */
function Deadlines({ calendar }: { calendar: ShownCalendar; })
{
    return (
        <section class="card" aria-labelledby="calendar-deadlines-title">
            <CardHead icon={iconPath("hourglass")} title={<h3 id="calendar-deadlines-title">{t("Deadlines")}</h3>} />
            <ul class="calendar-deadlines">
                {calendar.deadlines.map((deadline) => (
                    <li key={deadline.quest}>
                        <a class={deadline.main ? "calendar-deadline main" : "calendar-deadline"} href={sectionAddress("journal", "quests")}>
                            <span class="browse-words">
                                <span class="browse-name">{deadline.quest}</span>
                                <span class="browse-meta">{[deadline.main ? t("Main quest") : undefined, dayName(calendar, deadline.day)].filter((part) => part !== undefined).join(" · ")}</span>
                            </span>
                            <Deadline deadline={deadline} />
                        </a>
                    </li>
                ))}
            </ul>
        </section>
    );
}

/** The months of the year as a ribbon, each as long as its days and in its season's colour; the month shown raised, today's with a dot. */
function Year({ calendar, month }: { calendar: ShownCalendar; month: CalendarMonth; })
{
    const months = calendar.months ?? [];
    return (
        <div class="calendar-year" aria-hidden="true">
            {months.map((one, index) => (
                <span
                    key={index}
                    class={["calendar-year-month", `season-${seasonClass(one.season)}`, index === month.month ? "shown" : "", index === calendar.date?.month ? "now" : ""].filter((name) => name !== "").join(" ")}
                    style={{ flexGrow: String(one.days) }}
                />
            ))}
            {month.season !== undefined && <Season season={month.season} />}
        </div>
    );
}

/** A day of the grid: its number, today ringed, the story's days lit, a dot for each scene, the hourglass of a deadline; its words for a screen reader. */
function DayCell({ calendar, day, label, chosen, focusable, onChoose }: { calendar: ShownCalendar; day: number; label: number; chosen: boolean; focusable: boolean; onChoose: () => void; })
{
    const marks = dayMarks(calendar, day);
    const classes = ["calendar-day", marks.today ? "today" : "", marks.lived ? "lived" : "", day < 1 ? "before" : "", marks.deadlines.length > 0 ? "due" : ""].filter((name) => name !== "").join(" ");
    const words = [
        dayName(calendar, day),
        marks.today ? t("today") : undefined,
        marks.scenes.length === 0 ? undefined : marks.scenes.length === 1 ? t("1 scene") : t("{count} scenes", { count: marks.scenes.length }),
        marks.deadlines.length === 0 ? undefined : t("deadline of {quests}", { quests: listText(marks.deadlines.map((deadline) => deadline.quest)) }),
    ].filter((part) => part !== undefined);
    return (
        <button type="button" class={classes} data-day={day} aria-pressed={chosen} aria-label={words.join(", ")} tabIndex={focusable ? 0 : -1} onClick={onChoose}>
            <span class="calendar-day-number num" aria-hidden="true">{label}</span>
            <span class="calendar-day-marks" aria-hidden="true">
                {marks.scenes.slice(0, 3).map((scene) => <span key={scene.number} class="calendar-scene-dot" />)}
                {marks.deadlines.length > 0 && <Icon name="hourglass" />}
            </span>
        </button>
    );
}

/** What the chosen day holds: its name, its deadlines and its scenes, each scene leading to its chapter in the Journal. */
function DayDetails({ calendar, day }: { calendar: ShownCalendar; day: number; })
{
    const marks = dayMarks(calendar, day);
    const empty = marks.scenes.length === 0 && marks.deadlines.length === 0;
    return (
        <div class="calendar-chosen">
            <h4 class="calendar-chosen-title">
                {capitalized(dayName(calendar, day))}
                {marks.today && <span class="eyebrow accent calendar-chosen-now">{t("Today")}</span>}
            </h4>
            {empty && <p class="browse-none">{day > (calendar.today ?? 1) ? t("Nothing your character knows of is due on this day.") : t("No scene of the story on this day.")}</p>}
            {!empty && (
                <ul class="calendar-chosen-list">
                    {marks.deadlines.map((deadline) => (
                        <li key={deadline.quest}>
                            <a class="calendar-line" href={sectionAddress("journal", "quests")}>
                                <Icon name="hourglass" />
                                <span>{t("Deadline of {quest}", { quest: isolated(deadline.quest) })}</span>
                            </a>
                        </li>
                    ))}
                    {marks.scenes.map((scene) => (
                        <li key={scene.number}>
                            <a class="calendar-line" href={sectionAddress("journal", "story", String(scene.number))}>
                                <Icon name="journal" />
                                <span class="calendar-scene">
                                    <span>
                                        <span class="calendar-chapter">{t("Chapter {number}", { number: scene.number })}</span>
                                        {` ${scene.title}`}
                                    </span>
                                    {scene.place !== undefined && <span class="calendar-scene-place">{scene.place}</span>}
                                </span>
                            </a>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}

/** A season by its word, after a dot of its colour. */
function Season({ season }: { season: string; })
{
    return (
        <span class={`calendar-season season-${seasonClass(season)}`}>
            <span class="calendar-season-dot" aria-hidden="true" />
            {seasonLabel(season)}
        </span>
    );
}

/** A game day by its name: the day of the calendar with its game day, as 30 October 1491 · day 3, or day 3 without a calendar start. */
function dayName(calendar: ShownCalendar, day: number): string
{
    const date = calendarDateOf(calendar, day);
    const game = day >= 1 ? gameDateLabel(`day ${day}`) : undefined;
    return date === undefined ? game ?? "" : [calendarDayLabel({ day: date.day, month: date.name, ...(date.year === undefined ? {} : { year: date.year }) }), game].filter((part) => part !== undefined).join(" · ");
}

/** The four seasons have their colours; any other season is plain. */
function seasonClass(season: string | undefined): string
{
    return season !== undefined && ["winter", "spring", "summer", "autumn"].includes(season) ? season : "other";
}
