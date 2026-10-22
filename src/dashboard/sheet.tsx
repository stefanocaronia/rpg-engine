// Someone's sheet (D-273, D-276, D-284): a band with their line and effects, then the system's groups as cards, those of a few short numbers in a rail beside
// the others in columns that stay as the player opens and closes them (D-383), and the page's text the whole width, in two columns where there is room, the
// player character's story in a card of its own, where the player writes their own character's story (D-373); a click on a number the system rolls throws it for fun (D-280), and its tooltip says how it is made
// (FOR-8). While the master asks a roll, the number its check names lights up and answers it (D-330, ASK-12). A companion who keeps no sheet shows the stat
// block of its creature (D-275).
import { type ComponentChildren, Fragment } from "preact";
import { useEffect, useId, useRef, useState } from "preact/hooks";
import { ActName, usePlayerActs } from "./act-names.tsx";
import { itemVerbs } from "./acts.ts";
import { readExplanations } from "./api.ts";
import { CardHeader, useOpen } from "./card.tsx";
import { FixedColumns } from "./columns.tsx";
import type { Member, SheetCards, SheetGroup, SheetRoll, SheetValue, ShownScene } from "./data.ts";
import { DeathSaves } from "./dying.tsx";
import { besideLabel, memberPlaceLabel } from "./game-words.ts";
import { cardIcons, DieIcon, Icon } from "./icons.tsx";
import { fieldLabel, groupLabels, phraseLabel, readableIds, rollLabel, shownNotation, shownText } from "./labels.ts";
import { arrangedGroups, groupLayout, orderedValues, widgetOf } from "./layout.ts";
import { Markdown, plainLine } from "./markdown.tsx";
import { MoodFace, moodLabel } from "./mood.tsx";
import { MemberToken } from "./party.tsx";
import { requestedRow, useRequested } from "./requested.ts";
import { memberStatus } from "./status.tsx";
import { StoryBox } from "./story.tsx";
import { arrowStep, systemWord, t } from "./text.ts";
import { Effects, ProgressBar, ValueDrawing } from "./widgets.tsx";

// The cards of the page's text, after the system's groups, the whole width: the player character's story in the player's words, then the rest of the text.
const descriptionCard = "Description";
const backstoryCard = "Backstory";

/** What rolls a number of the sheet for fun: its roll, the number's label, and whose sheet it is. */
export type FreeRoll = (roll: SheetRoll, label: string, who?: string) => void;

export function MemberSheet(
    { member, headline, sheet, cards, text, story, version, onRoll, scene }: {
        member: Member;
        headline?: string;
        sheet: SheetGroup[];
        cards?: SheetCards;
        text: string;
        story?: string;
        version: number;
        onRoll: FreeRoll;
        scene?: ShownScene;
    },
)
{
    const { rail, others } = arrangedGroups(sheet, cards);
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
                    <MemberToken member={member} large status={memberStatus(member, scene)} />
                    <div class="who">
                        <h2>{member.name}</h2>
                        {/* The system's headline, and the mood: only here, its face before its word (D-305, D-419). */}
                        {(headline !== undefined && headline !== "") || member.mood !== undefined
                            ? (
                                <p class="headline">
                                    {headline}
                                    {headline !== undefined && headline !== "" && member.mood !== undefined && " · "}
                                    {member.mood !== undefined && (
                                        <span class="mood-word">
                                            <MoodFace mood={member.mood} />
                                            {moodLabel(member.mood)}
                                        </span>
                                    )}
                                </p>
                            )
                            : null}
                        {member.place && (
                            <p class="place">
                                <Icon name="place" />
                                {memberPlaceLabel(member.place)}
                            </p>
                        )}
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
        const step = arrowStep(event.key);
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
            {layout === "table" && values.length > 0 && (
                <div class="rows" onKeyDown={onKeyDown}>
                    {values.map((value) => <Row key={value.field} {...line(value)} />)}
                </div>
            )}
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
    const beside = besideLabel(value);
    return (
        <NumberBox {...props} kind="tile" said={`${label} ${shownText(beside ?? value.text)}`}>
            <span class="label">{label}</span>
            <Changing text={beside ?? value.text}>
                <span class="big num">{shownText(beside ?? value.text)}</span>
            </Changing>
            <span class="small num">{beside === undefined ? "" : shownText(value.text)}</span>
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
    const beside = besideLabel(value);
    const marks = value.marks === 0 ? null : <span class="marks" aria-label={value.marks === 1 ? t("1 mark") : t("{count} marks", { count: value.marks })}>{"●".repeat(value.marks)}</span>;
    return (
        <NumberBox {...props} label={shownLabel} kind={`row row-${widget}`} said={[shownLabel, shownText(value.text), beside === undefined ? "" : shownText(beside)].filter((part) => part !== "").join(" ")}>
            <span class="label">
                {marks}
                {shownLabel}
            </span>
            <Changing text={value.text}>
                {value.roll && <RollMark roll={value.roll} />}
                {widget === "progress" || widget === "bar" ? <span class="num">{shownText(value.text)}</span> : <ValueDrawing value={value} label={shownLabel} fields={props.fields} />}
            </Changing>
            {beside !== undefined && <span class="beside num" dir={value.levelNeed === undefined ? undefined : "auto"}>{shownText(beside)}</span>}
            {widget === "progress" && <ProgressBar value={value} label={shownLabel} />}
        </NumberBox>
    );
}

/**
 * What a number is drawn in: a button that throws it for fun when the system rolls it (D-280), or answers the master's check that names it, lit (ASK-12);
 * else, when it has a tooltip, a box the keyboard reaches. Its tooltip says how it is made (FOR-8), shown when pointed at or reached, and read to a screen
 * reader as its description.
 */
function NumberBox({ value, label, fields, tip, tabIndex, onRoll, answers, kind, said, children }: Line & { kind: string; said: string; children: ComponentChildren; })
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
                onClick={() => (answers === undefined ? value.roll && onRoll(value.roll, rollLabel(value.field, fields)) : answers.answer())}
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

/**
 * A group the items of a list give, as the attacks: a head with the labels of their values, then an item a line, with its values. What is inside another
 * thing stands under it, a step in for each level, and its container opens and closes it, as a tree of files (D-431).
 */
function ItemsTable({ group, fields }: { group: SheetGroup; fields: ReadonlySet<string>; })
{
    const acts = usePlayerActs();
    const [closed, setClosed] = useState<ReadonlySet<string>>(new Set());
    const items = group.items ?? [];
    const columns = items[0]?.values.map((value) => value.field) ?? [];
    const labels = groupLabels(columns, fields);
    const depths = items.map((item) => item.depth ?? 0);
    const holds = (index: number): boolean => (depths[index + 1] ?? 0) > depths[index];
    const key = (index: number): string => `${depths[index]} ${items[index].inside ?? ""} ${items[index].item}`;
    const toggle = (index: number): void => setClosed((before) => (before.has(key(index)) ? new Set([...before].filter((one) => one !== key(index))) : new Set([...before, key(index)])));
    const shown = shownLines(depths, (index) => closed.has(key(index)));
    // When something is equipped or holds other things, every name has its picture, golden on what is equipped; a container's chevron stands where the
    // picture of a thing at its level would, so that only what is inside steps in (Stefano, 15 October).
    const marked = items.some((item, index) => item.equipped === true || holds(index));
    // What is carried tells how many after its name, as Torce (6), with no column of its own (Stefano, 15 October).
    const carried = columns.length === 1 && columns[0] === "quantity";
    const count = (item: typeof items[number]): string => (carried ? item.values[0]?.text ?? "" : "");
    return (
        <table class={["items", marked ? "marked" : "", carried ? "carried" : ""].filter((name) => name !== "").join(" ")}>
            <thead class={carried ? "visually-hidden" : undefined}>
                <tr>
                    <th scope="col">
                        <span class="visually-hidden">{t("Name")}</span>
                    </th>
                    {!carried && columns.map((field) => <th key={field} scope="col">{phraseLabel(labels.get(field) ?? fieldLabel(field, fields))}</th>)}
                </tr>
            </thead>
            <tbody>
                {items.map((item, index) => {
                    if (!shown[index]) {
                        return null;
                    }

                    const name = itemName(item.item);
                    const said = [
                        item.inside === undefined ? undefined : t("in {container}", { container: itemName(item.inside) }),
                        item.equipped === true ? t("Equipped") : undefined,
                    ].filter((part) => part !== undefined).map((part) => `, ${part}`).join("");
                    const words = (
                        <>
                            {/* The thing's own picture, in the colour of its words, else a thing's; in gold when it is equipped (D-431). */}
                            {marked && <ItemPicture image={item.image} equipped={item.equipped === true} />}
                            <span>{name}</span>
                            {count(item) !== "" && <span class="item-count">{` (${count(item)})`}</span>}
                            {said !== "" && <span class="visually-hidden">{said}</span>}
                        </>
                    );
                    // The name acts, when the system names a verb for it; a container's opens and closes what it holds (D-495).
                    const verbs = holds(index) ? undefined : itemVerbs(acts?.actions, item);
                    return (
                        <tr key={key(index)} class={item.depth === undefined ? undefined : "inside"}>
                            <th scope="row" class={holds(index) ? "holds" : undefined} style={item.depth === undefined ? undefined : { "--depth": item.depth }}>
                                {holds(index)
                                    ? (
                                        <button type="button" class="fold" aria-expanded={!closed.has(key(index))} onClick={() => toggle(index)}>
                                            <Icon name="fold" />
                                            {words}
                                        </button>
                                    )
                                    : verbs === undefined
                                    ? words
                                    : <ActName verbs={verbs} item={name} said={`${count(item) === "" ? "" : ` (${count(item)})`}${said}`}>{words}</ActName>}
                            </th>
                            {!carried && item.values.map((value) => <td key={value.field} class={widgetOf(value) === "text" ? undefined : "num"}>{shownText(value.text)}</td>)}
                        </tr>
                    );
                })}
            </tbody>
        </table>
    );
}

/** A thing's picture, one colour as the words beside it, gold when equipped: the game's drawing of its kind as a mask, or the page's own of any thing. */
function ItemPicture({ image, equipped }: { image?: { file: string; version: number; } | undefined; equipped: boolean; })
{
    const kind = ["item-picture", image === undefined ? "" : "drawn", equipped ? "equipped" : ""].filter((name) => name !== "").join(" ");
    const title = equipped ? t("Equipped") : undefined;
    return image === undefined
        ? (
            <span class={kind} title={title} aria-hidden="true">
                <Icon name="thing" />
            </span>
        )
        : <span class={kind} title={title} aria-hidden="true" style={{ "--picture-url": `url("/images/${encodeURIComponent(image.file)}?v=${image.version}")` }} />;
}

/** Which lines of a list show: those whose containers are all open, by the lines' depths. */
function shownLines(depths: number[], isClosed: (index: number) => boolean): boolean[]
{
    // The containers above the line, as the index of each, from the outermost.
    const above: number[] = [];
    return depths.map((depth, index) => {
        above.splice(depth);
        const shown = above.every((container) => !isClosed(container));
        above[depth] = index;
        return shown;
    });
}

/** A thing's name as the page writes it, with a capital, whatever the page that has it says: "torce" as "Torce". */
function itemName(name: string): string
{
    // A thing of the system, as Unarmed Strike, in the campaign's language (playtest 15).
    const said = systemWord("words", name) ?? name;
    return said.charAt(0).toLocaleUpperCase() + said.slice(1);
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
        // The group's own values first, as the money above the things carried: their text alone, as the card is narrow.
        return [...group.values.map((value) => shownText(value.text)), ...group.items.map((item) => itemName(item.item))].join(" · ");
    }

    return group.values.slice(0, 4).map((value) => `${label(value.field)} ${shownText(besideLabel(value) ?? value.text)}`).join(" · ");
}
