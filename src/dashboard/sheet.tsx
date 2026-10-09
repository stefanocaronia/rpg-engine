// Someone's sheet (D-273): a band with their line and effects, then the system's groups as boxes; a click on a number says how it is made (FOR-8).
import { type ComponentChildren, Fragment } from "preact";
import { useEffect, useRef, useState } from "preact/hooks";
import { readExplanations } from "./api.ts";
import type { Member, SheetGroup, SheetValue } from "./data.ts";
import { fieldLabel, groupLabels, shownText } from "./labels.ts";
import { groupLayout, orderedValues, widgetOf } from "./layout.ts";
import { Token } from "./party.tsx";
import { Effects, ValueDrawing } from "./widgets.tsx";

// Up to this width the groups start closed, and the band says the most.
const narrow = "(max-width: 600px)";

export function MemberSheet({ member, sheet, version }: { member: Member; sheet: SheetGroup[]; version: number; })
{
    const fields = new Set(sheet.flatMap((group) => group.values.map((value) => value.field)));
    return (
        <section class="sheet" role="tabpanel" aria-label={member.name}>
            <header class="band">
                <Token member={member} version={version} large />
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
            <div class="groups">
                {sheet.map((group) => <Group key={group.name} member={member.name} group={group} fields={fields} version={version} />)}
            </div>
        </section>
    );
}

function Group({ member, group, fields, version }: { member: string; group: SheetGroup; fields: ReadonlySet<string>; version: number; })
{
    const [open, setOpen] = useState(() => storedOpen(group.name));
    const [explained, setExplained] = useState<{ field: string; parts: string[]; }>();
    const layout = groupLayout(group);
    const labels = groupLabels(group.values.map((value) => value.field), fields);
    const label = (field: string): string => labels.get(field) ?? fieldLabel(field, fields);

    // What was explained is told again from the new numbers, after a change.
    useEffect(() => setExplained(undefined), [version, member]);

    const explain = async (field: string): Promise<void> => {
        if (explained?.field === field) {
            setExplained(undefined);
            return;
        }

        const parts = (await readExplanations(member, group.name)).get(field);
        setExplained(parts === undefined ? undefined : { field, parts });
    };

    // Only the player's click opens or closes a group, and is remembered: the page setting it is not.
    const toggle = (event: MouseEvent): void => {
        event.preventDefault();
        setOpen(!open);
        storeOpen(group.name, !open);
    };

    return (
        <details class={`group group-${layout}`} open={open}>
            <summary onClick={toggle}>
                <h3>{group.name}</h3>
                {!open && <span class="preview">{preview(group, label)}</span>}
            </summary>
            {layout === "table" && <ItemsTable group={group} />}
            {layout === "tiles" && (
                <div class="tiles">
                    {group.values.map((value) => <Tile key={value.field} value={value} label={label(value.field)} onExplain={explain} />)}
                </div>
            )}
            {layout === "tiles" && explained && <How label={label(explained.field)} parts={explained.parts} />}
            {layout === "rows" && (
                <div class="rows">
                    {orderedValues(group.values).map((value) => (
                        <Fragment key={value.field}>
                            <Row value={value} label={label(value.field)} onExplain={explain} />
                            {explained?.field === value.field && <How label={label(value.field)} parts={explained.parts} />}
                        </Fragment>
                    ))}
                </div>
            )}
        </details>
    );
}

/** How a number is made, what it came from one after the other (FOR-8). */
function How({ label, parts }: { label: string; parts: string[]; })
{
    return (
        <p class="how" role="status">
            <span class="how-field">{label}</span>
            {parts.map((part) => <span key={part} class="part">{shownText(part)}</span>)}
        </p>
    );
}

/** A short number in a box: what is beside it large, such as a modifier, and the value small, as on a paper sheet. */
function Tile({ value, label, onExplain }: { value: SheetValue; label: string; onExplain: (field: string) => void; })
{
    return (
        <button type="button" class="tile" onClick={() => onExplain(value.field)} aria-label={`${label} ${value.beside ?? value.text}, how it is made`}>
            <span class="label">{label}</span>
            <Changing text={value.beside ?? value.text}>
                <span class="big num">{shownText(value.beside ?? value.text)}</span>
            </Changing>
            {value.beside !== undefined && <span class="small num">{shownText(value.text)}</span>}
        </button>
    );
}

/** A value on a line: its marks, its label, its drawing; a number tells how it is made when clicked. */
function Row({ value, label, onExplain }: { value: SheetValue; label: string; onExplain: (field: string) => void; })
{
    const widget = widgetOf(value);
    const marks = value.marks === 0 ? null : <span class="marks" aria-label={`${value.marks} ${value.marks === 1 ? "mark" : "marks"}`}>{"●".repeat(value.marks)}</span>;
    const content = (
        <>
            <span class="marks-place">{marks}</span>
            <span class="label">{label}</span>
            <Changing text={value.text}>
                <ValueDrawing value={value} label={label} />
            </Changing>
            {value.beside !== undefined && <span class="beside num">{shownText(value.beside)}</span>}
        </>
    );

    return widget === "number"
        ? <button type="button" class={`row row-${widget}`} onClick={() => onExplain(value.field)}>{content}</button>
        : <div class={`row row-${widget}`}>{content}</div>;
}

/** A group the items of a list give, as the attacks: an item a line, with its values. */
function ItemsTable({ group }: { group: SheetGroup; })
{
    return (
        <table class="items">
            <tbody>
                {(group.items ?? []).map((item) => (
                    <tr key={item.item}>
                        <th scope="row">{item.item}</th>
                        {item.values.map((value) => <td key={value.field} class="num">{shownText(value.text)}</td>)}
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

// Whether a group is open is kept in the browser, by its name; a narrow screen starts with them closed.
function storedOpen(name: string): boolean
{
    try {
        const stored = localStorage.getItem(`rpg-group:${name}`);

        if (stored !== null) {
            return stored === "open";
        }
    } catch {
        // No storage, as in a private window: the default.
    }

    return !matchMedia(narrow).matches;
}

function storeOpen(name: string, open: boolean): void
{
    try {
        localStorage.setItem(`rpg-group:${name}`, open ? "open" : "closed");
    } catch {
        // No storage: it is only remembered while the page is open.
    }
}
