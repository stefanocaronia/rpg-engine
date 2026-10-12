// Someone's sheet (D-273, D-276, D-284): a band with their line and effects, then the system's groups as cards, those of a few short numbers in a rail beside
// the others in columns that stay as the player opens and closes them (D-383), and the page's text the whole width, in two columns where there is room, the
// player character's story in a card of its own, where the player writes their own character's story (D-373); a click on a number the system rolls throws it for fun (D-280), and its tooltip says how it is made
// (FOR-8). While the master asks a roll, the number its check names lights up and answers it (D-330, ASK-12). A companion who keeps no sheet shows the stat
// block of its creature (D-275).
import { type ComponentChildren, Fragment } from "preact";
import { useEffect, useId, useRef, useState } from "preact/hooks";
import { readExplanations } from "./api.ts";
import { CardHeader, useOpen } from "./card.tsx";
import { FixedColumns } from "./columns.tsx";
import type { Member, SheetCards, SheetGroup, SheetRoll, SheetValue } from "./data.ts";
import { cardIcons, DieIcon } from "./icons.tsx";
import { fieldLabel, groupLabels, phraseLabel, readableIds, shownNotation, shownText } from "./labels.ts";
import { arrangedGroups, groupLayout, orderedValues, widgetOf } from "./layout.ts";
import { Markdown, plainLine } from "./markdown.tsx";
import { moodLabel } from "./mood.tsx";
import { MemberToken } from "./party.tsx";
import { requestedRow, useRequested } from "./requested.ts";
import { StoryBox } from "./story.tsx";
import { systemWord, t } from "./text.ts";
import { DeathSaves, Effects, ProgressBar, ValueDrawing } from "./widgets.tsx";

// The cards of the page's text, after the system's groups, the whole width: the player character's story in the player's words, then the rest of the text.
const descriptionCard = "Description";
const backstoryCard = "Backstory";

/** What rolls a number of the sheet for fun: its roll, the number's label, and whose sheet it is. */
export type FreeRoll = (roll: SheetRoll, label: string, who?: string) => void;

export function MemberSheet(
    { member, headline, sheet, cards, text, story, version, onRoll }: {
        member: Member;
        headline?: string;
        sheet: SheetGroup[];
        cards?: SheetCards;
        text: string;
        story?: string;
        version: number;
        onRoll: FreeRoll;
    },
)
{
    const { rail, others } = arrangedGroups(sheet, cards);
    // The system's headline, and the mood in words, which the badge's tooltip never shows on a touch screen (D-306).
    const title = [headline, member.mood === undefined ? undefined : moodLabel(member.mood)].filter((part) => part !== undefined && part !== "").join(" · ");
    const fields = sheetFields(member, sheet);
    const group = (shown: SheetGroup) => <Group key={shown.name} member={member.name} group={shown} fields={fields} version={version} onRoll={onRoll} first={shown === others[0]} />;
    // At the dying point its counters leave the line for their panel, large, under the name (D-310, 7).
    const dying = new Set(member.dying?.map((counter) => counter.field));
    // The player character's story has its own card: the rest of the page's text is its description (D-386).
    const described = story !== undefined && story.trim() !== "" && text.startsWith(story) ? text.slice(story.length).trimStart() : text;
    return (
        <section class="sheet" aria-label={member.name}>
            <header class="band">
                <div class="identity">
                    <MemberToken member={member} large />
                    <div class="who">
                        <h2>{member.name}</h2>
                        {title !== "" && <p class="headline">{title}</p>}
                        {member.place && <p class="place">{member.place}</p>}
                    </div>
                </div>
                {member.dying && <DeathSaves dying={member.dying} />}
                <ValueLine values={member.counters.filter((value) => !dying.has(value.field))} fields={fields} />
                <Effects effects={member.effects} />
            </header>
            <div class="sheet-body">
                {rail.length > 0 && <div class="rail">{rail.map(group)}</div>}
                <div class="sheet-main">
                    <FixedColumns cards={others.map((shown) => ({ key: shown.name, node: group(shown) }))} />
                    <div class="wide-cards">
                        {story !== undefined && (
                            <Card name={backstoryCard} title={t("Backstory")} icon={cardIcons.backstory} layout="lore" preview={plainLine(story) ?? t("Not written yet")}>
                                {story.trim() !== "" && <Markdown text={story} />}
                                <StoryBox story={story} />
                            </Card>
                        )}
                        {described.trim() !== "" && (
                            <Card name={descriptionCard} title={t("Description")} icon={cardIcons.description} layout="lore" preview={plainLine(described)}>
                                <Markdown text={described} />
                            </Card>
                        )}
                    </div>
                </div>
            </div>
        </section>
    );
}

/** What of someone's sheet the Combat section keeps at hand (D-315): the fields it names in a line of boxes, as under the name, then the groups it names as their cards. */
export function SheetAtHand({ member, sheet, names, version, onRoll }: { member: Member; sheet: SheetGroup[]; names: string[]; version: number; onRoll: FreeRoll; })
{
    const fields = sheetFields(member, sheet);
    const same = (name: string, wanted: string): boolean => name.toLowerCase() === wanted.toLowerCase();
    const line = names.flatMap((wanted) => sheet.flatMap((group) => group.values).filter((value) => same(value.field, wanted)));
    const groups = names.flatMap((wanted) => sheet.filter((group) => same(group.name, wanted)));
    return (
        <>
            {line.length > 0 && <ValueLine values={line} fields={fields} />}
            {groups.map((group) => <Group key={group.name} member={member.name} group={group} fields={fields} version={version} onRoll={onRoll} />)}
        </>
    );
}

/** Values in a line of boxes, as under someone's name (D-299): each its label and its drawing, flashing when it changes. */
function ValueLine({ values, fields }: { values: SheetValue[]; fields: ReadonlySet<string>; })
{
    return (
        <div class="line">
            {values.map((value) => (
                <span key={value.field} class="line-value">
                    <span class="label">{fieldLabel(value.field, fields)}</span>
                    <Changing text={value.text}>
                        <ValueDrawing value={value} label={fieldLabel(value.field, fields)} />
                    </Changing>
                </span>
            ))}
        </div>
    );
}

/** A group of the sheet as its card; the `first` after the rail starts open on a phone too, the one play needs most as the system orders them. */
function Group({ member, group, fields, version, onRoll, first }: { member: string; group: SheetGroup; fields: ReadonlySet<string>; version: number; onRoll: FreeRoll; first?: boolean; })
{
    const [explanations, setExplanations] = useState<Map<string, string[]>>();
    const [current, setCurrent] = useState(0);
    const requested = useRequested();
    // The reading asked last, and whether one is on its way: one from before a change is left out.
    const asked = useRef(0);
    const reading = useRef(false);
    const layout = groupLayout(group);
    const labels = groupLabels(group.values.map((value) => value.field), fields);
    const label = (field: string): string => labels.get(field) ?? fieldLabel(field, fields);
    const values = layout === "rows" ? orderedValues(group.values) : group.values;

    // How the numbers are made is read again after a change.
    useEffect(() => {
        asked.current++;
        reading.current = false;
        setExplanations(undefined);
    }, [version, member]);

    // How each number is made (FOR-8), read when the pointer or the keyboard first comes into the card: the numbers' tooltips.
    const explain = (): void => {
        if (reading.current) {
            return;
        }

        reading.current = true;
        const question = ++asked.current;
        void readExplanations(member, group.name).then((all) => question === asked.current && setExplanations(all), () => (reading.current = false));
    };

    // The check the master asks that a number answers, on the sheet of whom it is asked of (ASK-12).
    const answersOf = (value: SheetValue): Line["answers"] => {
        const index = requestedRow(requested, member, value.field) ?? (value.besideField === undefined ? undefined : requestedRow(requested, member, value.besideField));
        const check = requested?.checks.find((one) => one.index === index);
        return requested === undefined || index === undefined || check === undefined ? undefined : { check: check.check, dice: check.dice, answer: () => requested.answer(index) };
    };

    // A number's tooltip: the check it answers, how it is made, without its own name, and else its free roll when the system rolls it (D-280).
    const tip = (value: SheetValue): string | undefined => {
        const parts = explanations?.get(value.field)?.map((part) => shownText(readableIds(part, fields)));
        const answers = answersOf(value);
        const free = value.roll === undefined || answers !== undefined ? undefined : t("Free roll {dice} · not logged", { dice: shownNotation(value.roll.notation) });
        const lines = [answers === undefined ? undefined : t("Answers the master: {check}", { check: answers.check }), parts?.join(" · "), free].filter((line) => line !== undefined);
        return lines.length === 0 ? undefined : lines.join("\n");
    };

    // One stop of the Tab key for a group's numbers; the arrows move among them.
    const onKeyDown = (event: KeyboardEvent): void => {
        const step = ["ArrowDown", "ArrowRight"].includes(event.key) ? 1 : ["ArrowUp", "ArrowLeft"].includes(event.key) ? -1 : 0;
        const stops = [...(event.currentTarget as HTMLElement).querySelectorAll<HTMLElement>("[data-stop]")];
        const at = stops.indexOf(document.activeElement as HTMLElement);

        if (step !== 0 && at >= 0) {
            event.preventDefault();
            const next = Math.min(stops.length - 1, Math.max(0, at + step));
            setCurrent(next);
            stops[next].focus();
        }
    };

    const reachable = values.filter((value) => value.roll !== undefined || tip(value) !== undefined).map((value) => value.field);
    const stop = (field: string): number | undefined => (!reachable.includes(field) ? undefined : reachable.indexOf(field) === Math.min(current, reachable.length - 1) ? 0 : -1);
    const throwOf: FreeRoll = (roll, shown) => onRoll(roll, shown, member);
    const line = (value: SheetValue): Line => ({ value, label: label(value.field), fields, tip: tip(value), tabIndex: stop(value.field), onRoll: throwOf, answers: answersOf(value) });
    // A card with the number the master asks stays open while it is asked.
    const lit = values.some((value) => answersOf(value) !== undefined);
    return (
        <Card name={group.name} title={systemWord("groups", group.name)} icon={group.icon ?? cardIcons.plain} layout={layout} preview={preview(group, label)} onReach={explain} held={lit} first={first}>
            {layout === "table" && <ItemsTable group={group} fields={fields} />}
            {layout === "tiles" && (
                <div class="tiles" onKeyDown={onKeyDown}>
                    {values.map((value) => <Tile key={value.field} {...line(value)} />)}
                </div>
            )}
            {layout === "rows" && (
                <div class="rows" onKeyDown={onKeyDown}>
                    {values.map((value) => <Row key={value.field} {...line(value)} />)}
                </div>
            )}
        </Card>
    );
}

/** A card of the sheet the player opens and closes (D-284): its icon and title on the left, what it holds while closed, the chevron on the right. */
export function Card(
    { name, title, icon, layout, preview, onReach, held, first, children }: {
        name: string;
        /** Its title in the page's language, where its name, which keeps it open or closed, is English. */
        title?: string;
        /** Whether it starts open on a phone too. */
        first?: boolean;
        icon: string;
        layout: string;
        preview?: string;
        onReach?: () => void;
        held?: boolean;
        children: ComponentChildren;
    },
)
{
    const [chosen, toggle] = useOpen(name, first);
    const open = chosen || held === true;
    return (
        <details class={`group group-${layout}`} open={open} onPointerEnter={onReach} onFocusIn={onReach}>
            <CardHeader icon={icon} title={<h3>{title ?? name}</h3>} preview={preview} open={open} onToggle={toggle} />
            {children}
        </details>
    );
}

/** A number of a card: its value, label, tooltip, its stop of the Tab key, what throws it, and the check the master asks that it answers. */
interface Line
{
    value: SheetValue;
    label: string;
    fields: ReadonlySet<string>;
    tip?: string;
    tabIndex?: number;
    onRoll: FreeRoll;
    answers?: { check: string; dice: string; answer(): void; };
}

/** A short number in a box: what is beside it large, such as a modifier, and the value in a little tab below, as on a paper sheet. */
function Tile(props: Line)
{
    const { value, label } = props;
    return (
        <NumberBox {...props} kind="tile" said={`${label} ${shownText(value.beside ?? value.text)}`}>
            <span class="label">{label}</span>
            <Changing text={value.beside ?? value.text}>
                <span class="big num">{shownText(value.beside ?? value.text)}</span>
            </Changing>
            <span class="small num">{value.beside === undefined ? "" : shownText(value.text)}</span>
            {value.roll && <RollMark roll={value.roll} />}
        </NumberBox>
    );
}

/** A value on a line: its marks, its label as a phrase, its drawing, what is beside it, and under a number's progress its bar; a counter that the band shows as a bar, as hit points, reads here as its number. */
function Row(props: Line)
{
    const { value, label } = props;
    const widget = widgetOf(value);
    const shownLabel = phraseLabel(label);
    const marks = value.marks === 0 ? null : <span class="marks" aria-label={`${value.marks} ${value.marks === 1 ? "mark" : "marks"}`}>{"●".repeat(value.marks)}</span>;
    return (
        <NumberBox {...props} label={shownLabel} kind={`row row-${widget}`} said={[shownLabel, shownText(value.text), value.beside === undefined ? "" : shownText(value.beside)].filter((part) => part !== "").join(" ")}>
            <span class="label">
                {marks}
                {shownLabel}
            </span>
            <Changing text={value.text}>
                {value.roll && <RollMark roll={value.roll} />}
                {widget === "progress" || widget === "bar" ? <span class="num">{shownText(value.text)}</span> : <ValueDrawing value={value} label={shownLabel} fields={props.fields} />}
            </Changing>
            {value.beside !== undefined && <span class="beside num">{shownText(value.beside)}</span>}
            {widget === "progress" && <ProgressBar value={value} label={shownLabel} />}
        </NumberBox>
    );
}

/**
 * What a number is drawn in: a button that throws it for fun when the system rolls it (D-280), or answers the master's check that names it, lit (ASK-12);
 * else, when it has a tooltip, a box the keyboard reaches. Its tooltip says how it is made (FOR-8), shown when pointed at or reached, and read to a screen
 * reader as its description.
 */
function NumberBox({ value, label, tip, tabIndex, onRoll, answers, kind, said, children }: Omit<Line, "fields"> & { kind: string; said: string; children: ComponentChildren; })
{
    const described = useId();
    const shared = {
        class: [kind, tip === undefined ? "" : "tip-wide", answers === undefined ? "" : "requested"].filter((name) => name !== "").join(" "),
        "data-field": value.field,
        "data-tip": tip,
        "data-stop": tabIndex === undefined ? undefined : "",
        tabIndex,
        "aria-describedby": tip === undefined ? undefined : described,
    };
    const description = tip !== undefined && <span id={described} class="visually-hidden">{tip}</span>;
    return value.roll === undefined && answers === undefined
        ? (
            <div {...shared} aria-label={tip === undefined ? undefined : said} role={tip === undefined ? undefined : "group"}>
                {children}
                {description}
            </div>
        )
        : (
            <button
                type="button"
                {...shared}
                aria-label={answers === undefined ? said : t("{said}: answer the master", { said })}
                onClick={() => (answers === undefined ? value.roll && onRoll(value.roll, label) : answers.answer())}
            >
                {children}
                {description}
            </button>
        );
}

/** The die inside a number the system rolls: a click throws it. */
function RollMark({ roll }: { roll: SheetRoll; })
{
    return (
        <span class="roll-mark" aria-hidden="true">
            <DieIcon sides={roll.dice[0] ?? 20} />
        </span>
    );
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
                        <span class="visually-hidden">{t("Name")}</span>
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

/** The fields of someone's line and sheet, which the labels read to tell a field's short name. */
function sheetFields(member: Member, sheet: SheetGroup[]): ReadonlySet<string>
{
    return new Set([...member.counters, ...sheet.flatMap((group) => group.values)].map((value) => value.field));
}

/** What a closed group says of itself: its first values, or its items. */
function preview(group: SheetGroup, label: (field: string) => string): string
{
    if (group.items !== undefined) {
        return group.items.map((item) => item.item).join(" · ");
    }

    return group.values.slice(0, 4).map((value) => `${label(value.field)} ${shownText(value.beside ?? value.text)}`).join(" · ");
}
