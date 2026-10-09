// The widgets of a value (D-273): pips, a bar, a track centred on zero, chips; each says its value in words for a screen reader.
import type { Member, SheetValue } from "./data.ts";
import { shownText } from "./labels.ts";
import { trackPlaces, widgetOf } from "./layout.ts";

// Below this share of its maximum a bar is low: hatched, not only red.
const low = 0.25;

/** A value drawn by its kind, with its text beside it when the drawing alone does not say it. */
export function ValueDrawing({ value, label }: { value: SheetValue; label: string; })
{
    switch (widgetOf(value)) {
        case "pips":
            return <Pips value={value} label={label} />;
        case "bar":
            return <Bar value={value} label={label} />;
        case "track":
            return <Track value={value} label={label} />;
        case "list":
            return <Chips value={value} />;
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

/** A list as chips; what the character's parts add to it apart, with where it comes from (PRO-7). */
export function Chips({ value }: { value: SheetValue; })
{
    return (
        <span class="chips-block">
            <ul class="chips">{(value.items ?? []).map((item) => <li key={item}>{item}</li>)}</ul>
            {value.always && (
                <span class="always">
                    always, from {value.always.from.join(" and ")}:
                    <ul class="chips">{value.always.items.map((item) => <li key={item}>{item}</li>)}</ul>
                </span>
            )}
        </span>
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
