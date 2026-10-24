// What the engine gives as data, written in the page's language (D-403): game dates, the ends of effects, where places are, what the points say of the levels,
// the facts of the story, dice in words, where someone is. The chat has its own English words for the same data.
import type { CalendarDay, DiceCondition, EffectEnd, JournalFact, Member, NotationPart, SheetValue } from "./data.ts";
import { fieldLabel, phraseLabel } from "./labels.ts";
import { isolated, listText, systemWord, t } from "./text.ts";

/** A game date in the page's language: day 3, 06:00, or day 3; any other text as it is. */
export function gameDateLabel(date: string): string
{
    const read = readDate(date);
    return read === undefined ? date : read.time === undefined ? t("day {day}", read) : t("day {day}, {time}", read);
}

/** A day of the game's calendar in the page's language, its month and season in the words of who brought them: 1 maggio, primavera (TIM-8). */
export function calendarDayLabel(date: CalendarDay): string
{
    const real = realMonths.indexOf(date.month);
    const day = real >= 0 ? realDayLabel(date, real) : date.year === undefined
        ? t("{day} {month}", { day: date.day, month: systemWord("words", date.month) ?? date.month })
        : t("{day} {month} {year}", { day: date.day, month: systemWord("words", date.month) ?? date.month, year: date.year });
    const season = date.season === undefined ? undefined : seasonLabel(date.season);
    return season === undefined ? day : t("{date}, {season}", { date: day, season });
}

/** A season in the page's language, in the words of who brought it: autumn, autunno. */
export function seasonLabel(season: string): string
{
    const seasons: Record<string, string> = { winter: t("winter"), spring: t("spring"), summer: t("summer"), autumn: t("autumn") };
    return seasons[season] ?? systemWord("words", season) ?? season;
}

/** A month of the calendar with its year, in the page's language: October 1491, ottobre 1491; a month of the story's own calendar in the words of who brought it. */
export function calendarMonthLabel(month: string, year?: number): string
{
    const real = realMonths.indexOf(month);

    if (real < 0) {
        const name = systemWord("words", month) ?? month;
        return year === undefined ? name : t("{month} {year}", { month: name, year });
    }

    const at = new Date(Date.UTC(2001, real, 1));

    if (year !== undefined) {
        at.setUTCFullYear(year);
    }

    const options: Intl.DateTimeFormatOptions = { month: "long", timeZone: "UTC", ...(year === undefined ? {} : { year: "numeric" }) };
    return new Intl.DateTimeFormat(document.documentElement.lang || "en", options).format(at);
}

// The core's real months (TIM-8), which the page's language names on its own, as it bends them: 1 мая, 1. května.
const realMonths = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

/** A day of a real month as the page's language writes it, with its year when the story has one. */
function realDayLabel(date: CalendarDay, month: number): string
{
    const at = new Date(Date.UTC(2001, month, date.day));

    if (date.year !== undefined) {
        at.setUTCFullYear(date.year);
    }

    const options: Intl.DateTimeFormatOptions = { day: "numeric", month: "long", timeZone: "UTC", ...(date.year === undefined ? {} : { year: "numeric" }) };
    return new Intl.DateTimeFormat(document.documentElement.lang || "en", options).format(at);
}

// A date within a phrase is put in it by its day and hour, which each language bends as the phrase needs: до дня 3, jusqu'au jour 3.

/** Until a game date, in the page's language: until day 3, 06:00. */
export function untilDateLabel(date: string): string
{
    const read = readDate(date);
    return read === undefined ? t("until {date}", { date }) : read.time === undefined ? t("until day {day}", read) : t("until day {day}, {time}", read);
}

/** By a game date, as a deadline: by day 3, 06:00. */
export function byDateLabel(date: string): string
{
    const read = readDate(date);
    return read === undefined ? t("by {date}", { date }) : read.time === undefined ? t("by day {day}", read) : t("by day {day}, {time}", read);
}

/** Since a game date: since day 1, 18:00. */
export function sinceDateLabel(date: string): string
{
    const read = readDate(date);
    return read === undefined ? t("since {when}", { when: date }) : read.time === undefined ? t("since day {day}", read) : t("since day {day}, {time}", read);
}

/** When an effect ends, in the page's language: until day 1, 18:01, until the scene ends, until the next long rest, as the game system says it. */
export function effectEndLabel(end: EffectEnd): string
{
    if ("date" in end) {
        return untilDateLabel(end.date);
    }

    if ("round" in end) {
        return t("until {name}'s turn in round {round}", { name: nameLabel(end.turn), round: end.round });
    }

    return "scene" in end ? t("until the scene ends") : systemWord("words", `until ${end.occasion}`) ?? t("until {occasion}", { occasion: systemWord("words", end.occasion) ?? end.occasion });
}

/** An effect in the page's language, with its end: Benedizione until day 1, 18:01. */
export function effectLabel(effect: { name: string; end?: EffectEnd; burns?: { fuel: string; left: number; }; }): string
{
    const name = effectName(effect.name);
    const told = effect.end === undefined ? name : `${name} ${effectEndLabel(effect.end)}`;
    return effect.burns === undefined ? told : `${told} · ${burnsLabel(effect.name, effect.burns)}`;
}

/** What something that burns has left, as a torch: 5 left, or Oil: 3 left when it spends another thing. */
export function burnsLabel(name: string, burns: { fuel: string; left: number; }): string
{
    return burns.fuel === name ? t("{count} left", { count: burns.left }) : t("{fuel}: {count} left", { fuel: effectName(burns.fuel), count: burns.left });
}

/** An effect's name in the page's language: a condition of the system in its words, as Unconscious in Italian; any other as written. */
export function effectName(name: string): string
{
    return systemWord("words", name) ?? name;
}

/** Where a place is from the party, in the page's language: 12 km north-east, Here; the length as `length` writes it in the player's units. */
export function fromLabel(from: { km: number; direction?: string; }, length: (km: number) => string): string
{
    return from.direction === undefined ? t("Here") : t("{distance} {direction}", { distance: length(from.km), direction: directionLabel(from.direction) });
}

/** A point of the compass in the page's language: north-east. */
export function directionLabel(direction: string): string
{
    const labels: Record<string, string> = {
        "north": t("north"),
        "north-north-east": t("north-north-east"),
        "north-east": t("north-east"),
        "east-north-east": t("east-north-east"),
        "east": t("east"),
        "east-south-east": t("east-south-east"),
        "south-east": t("south-east"),
        "south-south-east": t("south-south-east"),
        "south": t("south"),
        "south-south-west": t("south-south-west"),
        "south-west": t("south-west"),
        "west-south-west": t("west-south-west"),
        "west": t("west"),
        "west-north-west": t("west-north-west"),
        "north-west": t("north-west"),
        "north-north-west": t("north-north-west"),
    };
    return labels[direction] ?? direction;
}

/** What the points say of the levels, in the page's language: 1200 to level 4, level 4 due, at least 900 at level 3. */
export function levelNeedLabel(need: NonNullable<SheetValue["levelNeed"]>): string
{
    if ("least" in need) {
        return t("at least {points} at level {level}", { points: need.least, level: need.level });
    }

    return "due" in need ? t("level {level} due", { level: need.due }) : t("{points} to level {level}", { points: need.needs, level: need.level });
}

/** What the sheet shows beside a value: what the points say of the levels, in the page's language, else the engine's text, as +2 beside a score. */
export function besideLabel(value: SheetValue): string | undefined
{
    return value.levelNeed === undefined ? value.beside : levelNeedLabel(value.levelNeed);
}

/** Where someone of the party is: the places that hold them, the nearest first; elsewhere, or in the open. */
export function memberPlaceLabel(place: NonNullable<Member["place"]>): string
{
    return Array.isArray(place) ? place.map(isolated).join(" › ") : place === "open" ? t("In the open") : t("Elsewhere");
}

/** A region's terrain in the page's language, as the game system says it: difficult terrain. */
export function terrainLabel(terrain: string): string
{
    return systemWord("words", `${terrain} terrain`) ?? t("{terrain} terrain", { terrain: systemWord("words", terrain) ?? terrain });
}

/** A name of the story as the character knows it, in the page's language: someone, a creature, somewhere for those it does not know. */
export function nameLabel(name: string): string
{
    const labels: Record<string, string> = { someone: t("someone"), creature: t("a creature"), somewhere: t("somewhere") };
    return labels[name] ?? name;
}

/** A fact of the story in the page's language, as a sentence: Ettore: PF 14 → 12. */
export function factLabel(fact: JournalFact): string
{
    const told = ((): string => {
        switch (fact.kind) {
            case "counter":
                // A stack goes by the name its entry gives it (STK-12), never a field's word.
                return t("{who}: {field} {before} → {after}", { who: subjectLabel(fact.who), field: fact.stack === true ? fact.field : fieldLabel(fact.field), before: fact.before, after: fact.after });
            case "time":
                return fact.from === undefined
                    ? storyStartLabel(fact.to)
                    : t("Time passes: {from} → {to}", { from: gameDateLabel(fact.from), to: gameDateLabel(fact.to) });
            case "moved":
                return fact.to === undefined
                    ? t("{who} to the open", { who: listText(fact.who.map((name, index) => (index === 0 ? subjectLabel(name) : nameLabel(name)))) })
                    : t("{who} to {place}", { who: listText(fact.who.map((name, index) => (index === 0 ? subjectLabel(name) : nameLabel(name)))), place: nameLabel(fact.to) });
            case "learned":
                return t("{who} learned: {what}", { who: fact.who, what: listText(fact.what.map((link) => link.replace("#", " › "))) });
            case "effect":
                return t("{who}: {effect}", { who: subjectLabel(fact.who), effect: effectLabel(fact) });
            case "effect-ended":
                return t("{who}: {effect} ended", { who: subjectLabel(fact.who), effect: fact.effect });
            case "back":
                return t("Back to save {save}: what came after it is gone", { save: fact.save });
            case "quest":
                return fact.status === "open" ? t("Quest taken: {quest}", { quest: fact.quest }) : fact.status === "done" ? t("Quest completed: {quest}", { quest: fact.quest }) : t("Quest failed: {quest}", { quest: fact.quest });
        }
    })();
    return told;
}

/** When the story starts: on day 1, 18:00. */
function storyStartLabel(date: string): string
{
    const read = readDate(date);
    return read === undefined ? t("The story starts on {date}", { date }) : read.time === undefined ? t("The story starts on day {day}", read) : t("The story starts on day {day}, {time}", read);
}

/** A game date's day and hour as the engine writes them, day 3, 06:00; undefined for any other text. */
function readDate(date: string): { day: string; time?: string; } | undefined
{
    const read = /^day\s+(\d+)(?:\s*,\s*(\d{1,2}:\d{2}))?$/i.exec(date.trim());
    return read === null ? undefined : { day: read[1], ...(read[2] === undefined ? {} : { time: read[2] }) };
}

/** Who does something, opening a fact: Someone and A creature with their capital, a name as it is written, as al-Mansur. */
function subjectLabel(name: string): string
{
    return name === "someone" || name === "creature" ? phraseLabel(nameLabel(name)) : name;
}

/** A notation in words, in the page's language: 2d20, keep the highest, +5 (D-292); none for none. */
export function notationLabel(parts: NotationPart[] | undefined): string | undefined
{
    return parts?.map((part) => ("add" in part ? part.add : [part.dice, ...diceRuleLabels(part)].join(", "))).join(", ");
}

/** What dice do past rolling them, in the page's language: keep, drop, reroll, explode, count successes. */
function diceRuleLabels(part: Exclude<NotationPart, { add: string; }>): string[]
{
    const { keep, drop, rerollOnce, explode, success } = part;
    return [
        keep === undefined
            ? undefined
            : keep.count === 1
            ? keep.which === "highest" ? t("keep the highest") : t("keep the lowest")
            : keep.which === "highest"
            ? t("keep the {count} highest", { count: keep.count })
            : t("keep the {count} lowest", { count: keep.count }),
        drop === undefined
            ? undefined
            : drop.count === 1
            ? drop.which === "highest" ? t("drop the highest") : t("drop the lowest")
            : drop.which === "highest"
            ? t("drop the {count} highest", { count: drop.count })
            : t("drop the {count} lowest", { count: drop.count }),
        rerollOnce === undefined ? undefined : t("reroll once {condition}", { condition: conditionLabel(rerollOnce) }),
        explode === undefined
            ? undefined
            : explode.compound
            ? t("add a die to the die {condition}", { condition: conditionLabel(explode.condition) })
            : t("roll one more {condition}", { condition: conditionLabel(explode.condition) }),
        success === undefined ? undefined : t("count the dice {condition}", { condition: conditionLabel(success) }),
    ].filter((rule) => rule !== undefined);
}

function conditionLabel({ operator, value }: DiceCondition): string
{
    const labels = { "=": t("on {value}", { value }), "<=": t("on {value} or less", { value }), ">=": t("on {value} or more", { value }), "<": t("below {value}", { value }), ">": t("above {value}", { value }) };
    return labels[operator];
}
