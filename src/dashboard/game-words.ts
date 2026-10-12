// What the engine gives as data, written in the page's language (D-403): game dates, the ends of effects, where places are, what the points say of the levels,
// the facts of the story, dice in words, where someone is. The chat has its own English words for the same data.
import type { DiceCondition, EffectEnd, JournalFact, Member, NotationPart, SheetValue } from "./data.ts";
import { fieldLabel, phraseLabel } from "./labels.ts";
import { listText, systemWord, t } from "./text.ts";

/** A game date in the page's language: day 3, 06:00, or day 3; any other text as it is. */
export function gameDateLabel(date: string): string
{
    const read = /^day\s+(\d+)(?:\s*,\s*(\d{1,2}:\d{2}))?$/i.exec(date.trim());

    if (read === null) {
        return date;
    }

    return read[2] === undefined ? t("day {day}", { day: read[1] }) : t("day {day}, {time}", { day: read[1], time: read[2] });
}

/** When an effect ends, in the page's language: until day 1, 18:01, until the scene ends, until long rest. */
export function effectEndLabel(end: EffectEnd): string
{
    if ("date" in end) {
        return t("until {date}", { date: gameDateLabel(end.date) });
    }

    if ("round" in end) {
        return t("until {name}'s turn in round {round}", { name: nameLabel(end.turn), round: end.round });
    }

    return "scene" in end ? t("until the scene ends") : t("until {occasion}", { occasion: systemWord("words", end.occasion) ?? end.occasion });
}

/** An effect in the page's language, with its end: Benedizione until day 1, 18:01. */
export function effectLabel(effect: { name: string; end?: EffectEnd; }): string
{
    return effect.end === undefined ? effect.name : `${effect.name} ${effectEndLabel(effect.end)}`;
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
    return Array.isArray(place) ? place.join(" › ") : place === "open" ? t("In the open") : t("Elsewhere");
}

/** A kind of terrain of the game system in the page's language, by its words: difficult. */
export function terrainLabel(terrain: string): string
{
    return systemWord("words", terrain) ?? terrain;
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
                return t("{who}: {field} {before} → {after}", { who: nameLabel(fact.who), field: fieldLabel(fact.field), before: fact.before, after: fact.after });
            case "time":
                return fact.from === undefined
                    ? t("The story starts on {date}", { date: gameDateLabel(fact.to) })
                    : t("Time passes: {from} → {to}", { from: gameDateLabel(fact.from), to: gameDateLabel(fact.to) });
            case "moved":
                return fact.to === undefined
                    ? t("{who} to the open", { who: listText(fact.who.map(nameLabel)) })
                    : t("{who} to {place}", { who: listText(fact.who.map(nameLabel)), place: nameLabel(fact.to) });
            case "learned":
                return t("{who} learned: {what}", { who: fact.who, what: listText(fact.what) });
            case "effect":
                return t("{who}: {effect}", { who: nameLabel(fact.who), effect: effectLabel(fact) });
            case "effect-ended":
                return t("{who}: {effect} ended", { who: nameLabel(fact.who), effect: fact.effect });
            case "back":
                return t("Back to save {save}: what came after it is gone", { save: fact.save });
            case "quest":
                return fact.status === "open" ? t("Quest taken: {quest}", { quest: fact.quest }) : fact.status === "done" ? t("Quest completed: {quest}", { quest: fact.quest }) : t("Quest failed: {quest}", { quest: fact.quest });
        }
    })();
    return phraseLabel(told);
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
