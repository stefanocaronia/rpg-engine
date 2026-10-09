// Someone's sheet (D-273, D-276, D-284): a band with their line and effects, then the system's groups as cards, those of a few short numbers in a rail beside
// the others, and the page's text as a card of its own; a click on a number says how it is made (FOR-8), and offers a free roll of it when the system rolls
// it (D-280). A companion who keeps no sheet shows the stat block of its creature (D-275).
import { type ComponentChildren, Fragment } from "preact";
import { useEffect, useRef, useState } from "preact/hooks";
import { readExplanations } from "./api.ts";
import { CardHeader, useOpen } from "./card.tsx";
import type { Member, SheetGroup, SheetRoll, SheetValue } from "./data.ts";
import { cardIcons, NotationIcons } from "./icons.tsx";
import { fieldLabel, groupLabels, phraseLabel, readableIds, shownText } from "./labels.ts";
import { groupLayout, isExplained, orderedValues, widgetOf } from "./layout.ts";
import { Markdown, plainLine } from "./markdown.tsx";
import { Token } from "./party.tsx";
import { Effects, ProgressBar, ValueDrawing } from "./widgets.tsx";

// The card of the page's text, after the system's groups.
const descriptionCard = "Description";

/** What rolls a number of the sheet for fun: its roll, and the number's label. */
export type FreeRoll = (roll: SheetRoll, label: string) => void;

export function MemberSheet({ member, sheet, text, version, onRoll }: { member: Member; sheet: SheetGroup[]; text: string; version: number; onRoll: FreeRoll; })
{
    const fields = new Set([...member.counters, ...sheet.flatMap((group) => group.values)].map((value) => value.field));
    const group = (shown: SheetGroup) => <Group key={shown.name} member={member.name} group={shown} fields={fields} version={version} onRoll={onRoll} />;
    return (
        <section class="sheet" aria-label={member.name}>
            <header class="band">
                <Token member={member} large />
                <div class="who">
                    <h2>{member.name}</h2>
                    {member.place && <p class="place">{member.place}</p>}
                </div>
                <div class="line">
                    {member.counters.map((value) => (
                        <span key={value.field} class="line-value">
                            <span class="label">{fieldLabel(value.field, fields)}</span>
                            <Changing text={value.text}>
                                <ValueDrawing value={value} label={fieldLabel(value.field, fields)} />
                            </Changing>
                        </span>
                    ))}
                </div>
                <Effects effects={member.effects} />
            </header>
            <div class="sheet-body">
                {sheet.some((shown) => groupLayout(shown) === "tiles") && <div class="rail">{sheet.filter((shown) => groupLayout(shown) === "tiles").map(group)}</div>}
                <div class="groups">
                    {sheet.filter((shown) => groupLayout(shown) !== "tiles").map(group)}
                    {text.trim() !== "" && (
                        <Card name={descriptionCard} icon={cardIcons.description} layout="lore" preview={plainLine(text)}>
                            <Markdown text={text} />
                        </Card>
                    )}
                </div>
            </div>
        </section>
    );
}

function Group({ member, group, fields, version, onRoll }: { member: string; group: SheetGroup; fields: ReadonlySet<string>; version: number; onRoll: FreeRoll; })
{
    const [explained, setExplained] = useState<{ field: string; parts: string[]; }>();
    const [current, setCurrent] = useState(0);
    // The question asked last: an answer to an older one, or one from before a change, is left out.
    const asked = useRef(0);
    const layout = groupLayout(group);
    const labels = groupLabels(group.values.map((value) => value.field), fields);
    const label = (field: string): string => labels.get(field) ?? fieldLabel(field, fields);
    const values = layout === "rows" ? orderedValues(group.values) : group.values;

    // What was explained is told again from the new numbers, after a change.
    useEffect(() => {
        asked.current++;
        setExplained(undefined);
    }, [version, member]);

    const explain = async (field: string): Promise<void> => {
        const question = ++asked.current;

        if (explained?.field === field) {
            setExplained(undefined);
            return;
        }

        // A number the sheet takes as written says so, rather than nothing.
        const parts = await readExplanations(member, group.name).then((all) => all.get(field) ?? ["as written on the sheet"], () => ["cannot be read now: try again"]);

        if (question === asked.current) {
            setExplained({ field, parts: parts.map((part) => readableIds(part, fields)) });
        }
    };

    // One stop of the Tab key for a group's numbers; the arrows move among them.
    const onKeyDown = (event: KeyboardEvent): void => {
        const step = ["ArrowDown", "ArrowRight"].includes(event.key) ? 1 : ["ArrowUp", "ArrowLeft"].includes(event.key) ? -1 : 0;
        const buttons = [...(event.currentTarget as HTMLElement).querySelectorAll<HTMLElement>("button.explains")];
        const at = buttons.indexOf(document.activeElement as HTMLElement);

        if (step !== 0 && at >= 0) {
            event.preventDefault();
            const next = Math.min(buttons.length - 1, Math.max(0, at + step));
            setCurrent(next);
            buttons[next].focus();
        }
    };

    const explainable = values.filter((value) => layout === "tiles" || isExplained(value)).map((value) => value.field);
    const stop = (field: string): number => (explainable.indexOf(field) === Math.min(current, explainable.length - 1) ? 0 : -1);
    const how = (field: string) => explained?.field === field && <How label={label(field)} parts={explained.parts} roll={values.find((value) => value.field === field)?.roll} onRoll={onRoll} />;
    return (
        <Card name={group.name} icon={group.icon ?? cardIcons.plain} layout={layout} preview={preview(group, label)}>
            {layout === "table" && <ItemsTable group={group} fields={fields} />}
            {layout === "tiles" && (
                <div class="tiles" onKeyDown={onKeyDown}>
                    {values.map((value) => <Tile key={value.field} value={value} label={label(value.field)} expanded={explained?.field === value.field} tabIndex={stop(value.field)} onExplain={explain} />)}
                </div>
            )}
            {layout === "tiles" && explained && how(explained.field)}
            {layout === "rows" && (
                <div class="rows" onKeyDown={onKeyDown}>
                    {values.map((value) => (
                        <Fragment key={value.field}>
                            <Row value={value} label={label(value.field)} expanded={explained?.field === value.field} tabIndex={stop(value.field)} onExplain={explain} />
                            {how(value.field)}
                        </Fragment>
                    ))}
                </div>
            )}
        </Card>
    );
}

/** A card of the sheet the player opens and closes (D-284): its icon and title on the left, what it holds while closed, the chevron on the right. */
function Card({ name, icon, layout, preview, children }: { name: string; icon: string; layout: string; preview?: string; children: ComponentChildren; })
{
    const [open, toggle] = useOpen(name);
    return (
        <details class={`group group-${layout}`} open={open}>
            <CardHeader icon={icon} title={<h3>{name}</h3>} preview={preview} open={open} onToggle={toggle} />
            {children}
        </details>
    );
}

/** How a number is made, what it came from one after the other (FOR-8); and its free roll, which counts for nothing, when the system rolls it (D-280). */
function How({ label, parts, roll, onRoll }: { label: string; parts: string[]; roll?: SheetRoll; onRoll: FreeRoll; })
{
    return (
        <p class="how" role="status">
            <span class="how-field">{label}</span>
            {parts.map((part) => <span key={part} class="part">{shownText(part)}</span>)}
            {roll && (
                <button type="button" class="how-roll" data-tip="Free roll · not logged" onClick={() => onRoll(roll, label)}>
                    <NotationIcons notation={roll.notation} />
                    Roll {shownText(roll.notation)} <span class="how-free">free roll</span>
                </button>
            )}
        </p>
    );
}

interface Explaining
{
    value: SheetValue;
    label: string;
    expanded: boolean;
    tabIndex: number;
    onExplain: (field: string) => void;
}

/** A short number in a box: what is beside it large, such as a modifier, and the value in a little tab below, as on a paper sheet. */
function Tile({ value, label, expanded, tabIndex, onExplain }: Explaining)
{
    return (
        <button type="button" class="tile explains" tabIndex={tabIndex} aria-expanded={expanded} onClick={() => onExplain(value.field)}>
            <span class="label">{label}</span>
            <Changing text={value.beside ?? value.text}>
                <span class="big num">{shownText(value.beside ?? value.text)}</span>
            </Changing>
            <span class="small num">{value.beside === undefined ? "" : shownText(value.text)}</span>
        </button>
    );
}

/** A value on a line: its marks, its label as a phrase, its drawing, what is beside it, and under a number's progress its bar; a number tells how it is made when clicked. */
function Row({ value, label, expanded, tabIndex, onExplain }: Explaining)
{
    const widget = widgetOf(value);
    const shownLabel = phraseLabel(label);
    const marks = value.marks === 0 ? null : <span class="marks" aria-label={`${value.marks} ${value.marks === 1 ? "mark" : "marks"}`}>{"●".repeat(value.marks)}</span>;
    const content = (
        <>
            <span class="label">
                {marks}
                {shownLabel}
            </span>
            <Changing text={value.text}>
                {widget === "progress" ? <span class="num">{shownText(value.text)}</span> : <ValueDrawing value={value} label={shownLabel} />}
            </Changing>
            {value.beside !== undefined && <span class="beside num">{shownText(value.beside)}</span>}
            {widget === "progress" && <ProgressBar value={value} label={shownLabel} />}
        </>
    );

    return isExplained(value)
        ? <button type="button" class={`row row-${widget} explains`} tabIndex={tabIndex} aria-expanded={expanded} onClick={() => onExplain(value.field)}>{content}</button>
        : <div class={`row row-${widget}`}>{content}</div>;
}

/** A group the items of a list give, as the attacks: a head with the labels of their values, then an item a line, with its values. */
function ItemsTable({ group, fields }: { group: SheetGroup; fields: ReadonlySet<string>; })
{
    const items = group.items ?? [];
    const columns = items[0]?.values.map((value) => value.field) ?? [];
    const labels = groupLabels(columns, fields);
    return (
        <table class="items">
            <thead>
                <tr>
                    <th scope="col">
                        <span class="visually-hidden">Name</span>
                    </th>
                    {columns.map((field) => <th key={field} scope="col">{phraseLabel(labels.get(field) ?? fieldLabel(field, fields))}</th>)}
                </tr>
            </thead>
            <tbody>
                {items.map((item) => (
                    <tr key={item.item}>
                        <th scope="row">{item.item}</th>
                        {item.values.map((value) => <td key={value.field} class={widgetOf(value) === "text" ? undefined : "num"}>{shownText(value.text)}</td>)}
                    </tr>
                ))}
            </tbody>
        </table>
    );
}

/** Flashes its content once when its text changes, as when a number goes down. */
function Changing({ text, children }: { text: string; children: ComponentChildren; })
{
    const before = useRef(text);
    const [flash, setFlash] = useState(0);

    useEffect(() => {
        if (before.current !== text) {
            before.current = text;
            setFlash((count) => count + 1);
        }
    }, [text]);

    return <span key={flash} class={flash === 0 ? "changing" : "changing changed"}>{children}</span>;
}

/** What a closed group says of itself: its first values, or its items. */
function preview(group: SheetGroup, label: (field: string) => string): string
{
    if (group.items !== undefined) {
        return group.items.map((item) => item.item).join(" · ");
    }

    return group.values.slice(0, 4).map((value) => `${label(value.field)} ${shownText(value.beside ?? value.text)}`).join(" · ");
}
