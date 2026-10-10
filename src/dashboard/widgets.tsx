// The widgets of a value (D-273, D-284): pips, a bar, a track centred on zero, a number's progress, chips or a list of sentences; each says its value in words
// for a screen reader.
import type { DyingCounter, Member, SheetValue } from "./data.ts";
import { fieldLabel, itemLabel, phraseLabel, shownText } from "./labels.ts";
import { progressShare, trackPlaces, widgetOf } from "./layout.ts";

// Below this share of its maximum a bar is low: hatched, not only red.
const low = 0.25;

// A list with an item of so many words is of sentences, as "advantage on saving throws against poison": lines, not chips.
const sentenceWords = 5;

/** A value drawn by its kind, with its text beside it when the drawing alone does not say it. */
export function ValueDrawing({ value, label, fields }: { value: SheetValue; label: string; fields?: ReadonlySet<string>; })
{
    switch (widgetOf(value)) {
        case "pips":
            return <Pips value={value} label={label} />;
        case "bar":
            return <Bar value={value} label={label} />;
        case "track":
            return <Track value={value} label={label} />;
        case "progress":
            return <Progress value={value} label={label} />;
        case "list":
            return <Chips value={value} fields={fields} />;
        default:
            return <span class={value.text.length > 40 ? "text" : "num"}>{shownText(value.text)}</span>;
    }
}

export function Pips({ value, label }: { value: SheetValue; label: string; })
{
    const { value: current, max = 0 } = value.counter ?? { value: 0 };
    return (
        <span class="pips" role="img" aria-label={`${label}: ${current} of ${max}`}>
            {Array.from({ length: Math.min(max, 10) }, (_, index) => <span key={index} class={index < current ? "pip on" : "pip"} />)}
        </span>
    );
}

export function Bar({ value, label }: { value: SheetValue; label: string; })
{
    const { value: current, max = 0 } = value.counter ?? { value: 0 };
    const share = max === 0 ? 0 : Math.min(1, Math.max(0, current / max));
    return (
        <span class="bar-line">
            <span class={share < low ? "bar low" : "bar"} role="meter" aria-label={label} aria-valuemin={0} aria-valuemax={max} aria-valuenow={current} aria-valuetext={value.text}>
                <span class="fill" style={{ "--fill": String(share) }} />
            </span>
            <span class="num">{shownText(value.text)}</span>
        </span>
    );
}

/** A number on its way to the next mark, as the experience toward the next level: the number, what the next mark needs, a bar under them (D-284). */
export function Progress({ value, label }: { value: SheetValue; label: string; })
{
    return (
        <span class="progress-line">
            <span class="progress-first">
                <span class="num">{shownText(value.text)}</span>
                {value.beside !== undefined && <span class="progress-next">{shownText(value.beside)}</span>}
            </span>
            <ProgressBar value={value} label={label} />
        </span>
    );
}

/** The bar of a number's progress, in the accent, never low: it is no resource that runs out. */
export function ProgressBar({ value, label }: { value: SheetValue; label: string; })
{
    const progress = value.progress ?? { value: 0, from: 0, to: 0 };
    const said = [value.text, value.beside].filter((part) => part !== undefined).join(", ");
    return (
        <span class="bar progress" role="progressbar" aria-label={label} aria-valuemin={progress.from} aria-valuemax={progress.to} aria-valuenow={progress.value} aria-valuetext={said}>
            <span class="fill" style={{ "--fill": String(progressShare(progress)) }} />
        </span>
    );
}

/** A counter that goes below zero, such as momentum: a track from its minimum to its maximum, filled from zero to its value. */
export function Track({ value, label }: { value: SheetValue; label: string; })
{
    const counter = value.counter ?? { value: 0 };
    const places = trackPlaces(counter);
    const style = { "--from": String(Math.min(places.zero, places.value)), "--to": String(Math.max(places.zero, places.value)), "--zero": String(places.zero) };
    return (
        <span class="bar-line">
            <span class="num limit">{shownText(String(counter.min ?? 0))}</span>
            <span class="track" role="meter" aria-label={label} aria-valuemin={counter.min} aria-valuemax={counter.max} aria-valuenow={counter.value} aria-valuetext={value.text} style={style}>
                <span class="fill" />
                <span class="zero" />
            </span>
            <span class="num">{shownText(value.text)}</span>
        </span>
    );
}

/** A list as chips, or as lines when it is of sentences; what the character's parts add to it apart, with where it comes from (PRO-7). */
export function Chips({ value, fields }: { value: SheetValue; fields?: ReadonlySet<string>; })
{
    return (
        <span class="chips-block">
            <Items items={value.items ?? []} fields={fields} />
            {value.always && (
                <span class="always">
                    <span class="always-from">Always, from {value.always.from.join(" and ")}</span>
                    <Items items={value.always.items} fields={fields} />
                </span>
            )}
        </span>
    );
}

function Items({ items, fields }: { items: string[]; fields?: ReadonlySet<string>; })
{
    const sentences = items.some((item) => item.trim().split(/\s+/).length >= sentenceWords);
    return <ul class={sentences ? "notes" : "chips"}>{items.map((item) => <li key={item}>{itemLabel(item, fields)}</li>)}</ul>;
}

/** The death saves, large (D-310 (7), D-314): the successes and the failures, by shape as well as colour. */
export function DeathSaves({ dying }: { dying: DyingCounter[]; })
{
    return (
        <div class="death-saves">
            {dying.map((counter, index) => (
                <p key={counter.field} class="saves-row">
                    <span class="saves-label">{phraseLabel(fieldLabel(counter.field))}</span>
                    {Array.from({ length: counter.limit ?? Math.max(counter.value, 1) }, (_, mark) => <span key={mark} class={`save ${index === 0 ? "success" : "failure"}${mark < counter.value ? " marked" : ""}`} aria-hidden="true" />)}
                    <span class="visually-hidden">{`${counter.value} of ${counter.limit ?? "?"}`}</span>
                </p>
            ))}
        </div>
    );
}

/** Someone's effects as tags, each with its end; past `most`, how many more. */
export function Effects({ effects, most }: { effects: Member["effects"]; most?: number; })
{
    const shown = most === undefined ? effects : effects.slice(0, most);
    return effects.length === 0 ? null : (
        <span class="effects">
            {shown.map((effect) => <span key={effect.text} class="effect" title={effect.text}>{effect.name}{effect.end && most === undefined ? <span class="end">· until {effect.end}</span> : null}</span>)}
            {effects.length > shown.length && <span class="effect more">+{effects.length - shown.length}</span>}
        </span>
    );
}
