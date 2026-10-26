// Someone's state (D-419): on their token a small pip at the lower right, the mark that counts most (dead, at 0, kept from acting, then the last condition put
// on), a second coin behind it when there are more, all of them in its tooltip; in Combat's order each mark as an icon. The conditions' drawings are the game
// system's (`condition-icons`); one it does not draw, or a system without them, has a plain mark. The player chooses when the pips show (Settings).
import type { Member, SeenEffect, ShownScene, ShownWidget, Tone, WidgetText, WidgetValue } from "./data.ts";
import { effectLabel } from "./game-words.ts";
import { statusIcons } from "./icons.tsx";
import { saysState } from "./person-panel.tsx";
import { conditionsPref, useChoice } from "./prefs.ts";
import { numberText, t } from "./text.ts";

/** What a token's pip reads of someone: what is on them, whether they act, are at 0 or dead. */
export interface TokenStatus
{
    effects?: SeenEffect[] | undefined;
    inactive?: boolean | undefined;
    down?: boolean | undefined;
    dead?: boolean | undefined;
    /** One of the party, whose 0 is what a package's widget on them says; anyone else's is their fall to the ground (D-461, D-516). */
    party?: boolean | undefined;
    /** What a package's widget on them says of their state (D-514), which names it in place of the page's own. */
    person?: PersonState | undefined;
}

/** The word of someone's state a package's widget on them gives (D-514): its chip, its icon, its lead's tone; dead by the package's rules (D-516). */
export interface PersonState
{
    word: string;
    icon?: string;
    tone?: Tone;
    dead?: true;
}

/** How someone at 0 is tinted, on their token and in their marks (D-461): by the tone of a widget on them, dying or stable; dead; or fallen, as a foe. */
export type DownTint = "dying" | "stable" | "dead" | "down";

/**
 * The state of someone of the party as the first widget on them that gives a word says it (D-514): its chip, the icon it shows or the widget's, its lead's
 * tone; none where no widget on them gives one.
 */
export function personState(widgets: ShownWidget[], name: string): PersonState | undefined
{
    const shown = widgets.filter((widget) => widget.place === "person").sort((first, second) => first.order - second.order)
        .flatMap((widget) => (widget.people?.[name] === undefined ? [] : [{ widget, shows: widget.people[name] }])).find(saysState);

    if (shown?.shows.chip === undefined) {
        return undefined;
    }

    const icon = shown.shows.icon ?? shown.widget.icon;
    const tone = shown.shows.parts?.find((part) => "lead" in part && part.tone !== undefined);
    return {
        word: wordOf(shown.shows.chip),
        ...(icon === undefined ? {} : { icon }),
        ...(tone !== undefined && "lead" in tone && tone.tone !== undefined ? { tone: tone.tone } : {}),
        ...(shown.shows.dead === true ? { dead: true as const } : {}),
    };
}

/** A mark of someone's state: its drawing, its words, and whether it is one of the engine's states, a condition, or another effect (`other`: `.effect` is the chips of the effects). */
export interface StatusMark
{
    icon: string;
    label: string;
    kind: "state" | "condition" | "other";
    /** Where one at 0 stands, which tints the mark: dying, stable, dead, or a foe down (D-461). */
    tone?: DownTint;
    /** A drawing filled, its holes empty, as the skull of the dead; else a line. */
    filled?: true;
}

/** The marks of someone's state, the one that counts most first: dead, at 0, kept from acting, then the conditions, the last put on first; with `all`, their other effects after them. */
export function statusMarks(status: TokenStatus, all = false): StatusMark[]
{
    // Never the effect the word of their state already says, as a widget's Down beside the condition Down, or the 5e's Stable (D-514, playtest 11).
    const effects = besideWord(status.effects ?? [], status.party === true ? status.person : undefined);
    // At 0 one of the party has the word a package's widget on them gives, its tone tinting it (D-514); anyone else, or one of the party with none, falls to
    // the ground. The dead a red skull (D-461).
    const person = status.party === true ? status.person : undefined;
    const down: StatusMark = person !== undefined
        ? { icon: person.icon ?? statusIcons.fallen, label: person.word, kind: "state", tone: toneState(person.tone) }
        : { icon: statusIcons.fallen, label: t("down"), kind: "state", tone: "down" };
    const states: StatusMark[] = status.dead === true
        ? [{ icon: statusIcons.dead, label: t("dead"), kind: "state", tone: "dead", filled: true }]
        : [
            ...(status.down === true ? [down] : []),
            ...(status.inactive === true ? [{ icon: statusIcons.inactive, label: t("Can't act"), kind: "state" as const }] : []),
        ];
    const conditions = effects.filter((effect) => effect.condition === true).reverse().map((effect): StatusMark => ({ icon: effect.icon ?? statusIcons.condition, label: effectLabel(effect), kind: "condition" }));
    const others = all ? effects.filter((effect) => effect.condition !== true).map((effect): StatusMark => ({ icon: effect.icon ?? statusIcons.condition, label: effectLabel(effect), kind: "other" })) : [];
    return [...states, ...conditions, ...others];
}

/**
 * The state of one of the party: their effects, whether dead or at the system's down point, whether the open scene says they cannot act, and what a package's
 * widget on them says of it (D-514), dead by its rules too (D-516).
 */
export function memberStatus(member: Member, scene?: ShownScene, widgets: ShownWidget[] = []): TokenStatus
{
    const inScene = scene?.fighters?.find((fighter) => fighter.name === member.name) ?? scene?.who.find((person) => person.name === member.name);
    const person = personState(widgets, member.name);
    return {
        effects: member.effects,
        dead: member.dead || person?.dead === true,
        down: member.down === true,
        inactive: inScene?.inactive === true,
        party: true,
        ...(person === undefined ? {} : { person }),
    };
}

/** How someone at 0 is tinted, on their token and in their marks: dead; by the tone of a widget on them; else as fallen. */
export function downTint(status: TokenStatus): DownTint | undefined
{
    return status.dead === true ? "dead" : status.down !== true ? undefined : status.person !== undefined ? toneState(status.person.tone) : "down";
}

/** The pip of someone's state on their token, its marks in its tooltip; none without a mark, or while the player keeps them off. */
export function StatusPip({ status }: { status: TokenStatus | undefined; })
{
    const [shown] = useChoice(conditionsPref);
    const marks = status === undefined ? [] : statusMarks(status);

    if (shown === "never" || marks.length === 0) {
        return null;
    }

    const classes = ["status-pip", marks[0].kind === "state" ? "strong" : "", marks[0].tone ?? "", marks.length > 1 ? "stacked" : "", shown === "hover" ? "on-hover" : ""];
    return (
        <span class={classes.filter((name) => name !== "").join(" ")} data-tip={marks.map((mark) => mark.label).join(", ")}>
            <svg viewBox="-3 -3 30 30" aria-hidden="true">
                <path d={marks[0].icon} class={marks[0].filled ? "filled" : undefined} />
            </svg>
        </span>
    );
}

/**
 * Each mark of someone's state as an icon with its words, for a screen reader too and for the keyboard, as Combat's order shows them (D-419); a foe's fall only
 * drawn when its words already say it.
 */
export function StatusIcons({ status, said = [] }: { status: TokenStatus; said?: StatusMark["tone"][]; })
{
    const marks = statusMarks(status, true);
    return marks.length === 0 ? null : (
        <span class="status-icons">
            {marks.map((mark, index) => {
                // A state the row already says in words, hidden from a screen reader.
                const hidden = mark.kind === "state" && mark.tone !== undefined && said.includes(mark.tone);
                return (
                    <span
                        key={`${mark.label} ${index}`}
                        class={["status-icon", mark.kind, mark.tone ?? ""].filter((name) => name !== "").join(" ")}
                        {...(hidden ? { "aria-hidden": "true" } : { role: "img", "aria-label": mark.label, tabIndex: 0 })}
                        data-tip={mark.label}
                    >
                        <svg viewBox="0 0 24 24" aria-hidden="true">
                            <path d={mark.icon} class={mark.filled ? "filled" : undefined} />
                        </svg>
                    </span>
                );
            })}
        </span>
    );
}

/** Someone's effects but the one the word of their state already says, as a widget's Down beside the condition Down (D-514). */
export function besideWord<Effect extends SeenEffect>(effects: Effect[], person: PersonState | undefined): Effect[]
{
    const said = person?.word.toLowerCase();
    return said === undefined ? effects : effects.filter((effect) => effectLabel(effect).toLowerCase() !== said);
}

/** A tone of a widget as the tint of a state: good as stable, bad as dying, none as fallen. */
function toneState(tone: Tone | undefined): "stable" | "dying" | "down"
{
    return tone === "good" ? "stable" : tone === "bad" ? "dying" : "down";
}

/** A widget's words as one string, its values as they are: a mark's tooltip and name. */
function wordOf(text: WidgetText): string
{
    return typeof text === "string" ? text : text.text.replace(/\{(\w+)\}/g, (whole, name: string) => (name in text.values ? valueWord(text.values[name]) : whole));
}

/** A value of a widget's words in a word: a number as the page writes it. */
function valueWord(value: WidgetValue): string
{
    return typeof value === "number" ? numberText(value) : typeof value === "string" ? value : "number" in value ? numberText(value.number) : `${numberText(value.from)}–${numberText(value.to)}`;
}

/** The words of someone's state for a screen reader, as a token's name says them. */
export function statusWords(status: TokenStatus): string[]
{
    return statusMarks(status, true).map((mark) => mark.label);
}
