// Someone's sheet (D-273, D-276, D-284): a band with their line and effects, then the system's groups as cards, those of a few short numbers in a rail beside
// the others in columns that stay as the player opens and closes them (D-383), and the page's text the whole width, in two columns where there is room, the
// player character's story in a card of its own, where the player writes their own character's story (D-373); a click on a number the system rolls throws it for fun (D-280), and its tooltip says how it is made
// (FOR-8). While the master asks a roll, the number its check names lights up and answers it (D-330, ASK-12). A companion who keeps no sheet shows the stat
// block of its creature (D-275).
import type { ComponentChildren } from "preact";
import { useContext, useEffect, useId, useRef, useState } from "preact/hooks";
import { itemVerbs } from "./acts/acts.ts";
import { ActName, usePlayerActs } from "./acts/names.tsx";
import { readExplanations } from "./api.ts";
import { CardHeader, useOpen } from "./card.tsx";
import { FixedColumns } from "./columns.tsx";
import type { Member, SheetCards, SheetGroup, SheetRoll, SheetValue, ShownScene } from "./data.ts";
import { besideLabel, memberPlaceLabel } from "./game-words.ts";
import { cardIcons, DieIcon, Icon } from "./icons.tsx";
import { fieldLabel, groupLabels, itemLabel, phraseLabel, readableIds, rollLabel, shownNotation, shownText } from "./labels.ts";
import { arrangedGroups, groupLayout, orderedValues, widgetOf } from "./layout.ts";
import { knowersOf, Markdown, plainLine } from "./markdown.tsx";
import { MoodFace, moodLabel } from "./mood.tsx";
import { WidgetCards, WidgetsContext } from "./packages/widgets.tsx";
import { MemberToken } from "./party.tsx";
import { PersonBoxes, personBoxes, personFields, PersonPanel, type PersonShown, personShown } from "./person-panel.tsx";
import { requestedRow, useRequested } from "./requested.ts";
import { besideWord, memberStatus } from "./status.tsx";
import { StoryBox } from "./story.tsx";
import { arrowStep, listText, systemWord, t } from "./text.ts";
import { Effects, ProgressBar, ValueDrawing } from "./widgets.tsx";

// The cards of the page's text, after the system's groups, the whole width: the player character's story in the player's words, then the rest of the text.
const descriptionCard = "Description";
const backstoryCard = "Backstory";

/** What rolls a number of the sheet for fun: its roll, the number's label, and whose sheet it is. */
export type FreeRoll = (roll: SheetRoll, label: string, who?: string) => void;

export function MemberSheet(
    { member, headline, sheet, cards, text, knownBy, story, version, onRoll, scene }: {
        member: Member;
        headline?: string;
        sheet: SheetGroup[];
        cards?: SheetCards;
        text: string;
        /** The text's secrets that only some of the player characters discovered, each with who (D-480 (7)). */
        knownBy?: { secret: string; who: string[]; }[] | undefined;
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
    const widgets = useContext(WidgetsContext);
    const status = memberStatus(member, scene, widgets);
    // At 0 the panels of the packages' widgets that say their state, large, under the name, their counters out of the line (D-310 (7), D-516). The others
    // are small cards of their packages among the line's boxes, the counters they count left out of it.
    const person = personShown(widgets, member.name);
    const boxes = personBoxes(widgets, member.name);
    const shownApart = personFields([...person, ...boxes]);
    // The player character's story has its own card: the rest of the page's text is its description (D-386).
    const described = story !== undefined && story.trim() !== "" && text.startsWith(story) ? text.slice(story.length).trimStart() : text;
    return (
        <section class="sheet" aria-label={member.name}>
            <header class="band">
                <div class="identity">
                    <MemberToken member={member} large status={status} />
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
                {person.map((shown) => <PersonPanel key={shown.widget.id} shown={shown} />)}
                <ValueLine values={member.counters.filter((value) => !shownApart.has(value.field))} fields={fields} boxes={boxes} />
                <Effects effects={besideWord(member.effects, status.person)} />
            </header>
            <div class="sheet-body">
                {rail.length > 0 && <div class="rail">{rail.map(group)}</div>}
                <div class="sheet-main">
                    <FixedColumns cards={others.map((shown) => ({ key: shown.name, node: group(shown) }))} />
                    <div class="wide-cards">
                        {story !== undefined && (
                            <Card name={backstoryCard} title={t("Backstory")} icon={cardIcons.backstory} layout="lore" preview={plainLine(story) ?? t("Not written yet")}>
                                {story.trim() !== "" && <Markdown text={story} />}
                                <StoryBox story={story} who={member.name} />
                            </Card>
                        )}
                        {described.trim() !== "" && (
                            <Card name={descriptionCard} title={t("Description")} icon={cardIcons.description} layout="lore" preview={plainLine(described)}>
                                <Markdown text={described} secretKnowers={knowersOf(knownBy)} />
                            </Card>
                        )}
                    </div>
                    <WidgetCards place="page" page="sheet" who={member.name} view={member} />
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
    // The packages' small cards on them too, as under the name (D-516), the counters they count left out.
    const boxes = personBoxes(useContext(WidgetsContext), member.name);
    const counted = personFields(boxes);
    const line = names.flatMap((wanted) => sheet.flatMap((group) => group.values).filter((value) => same(value.field, wanted) && !counted.has(value.field)));
    const groups = names.flatMap((wanted) => sheet.filter((group) => same(group.name, wanted)));
    return (
        <>
            {(line.length > 0 || boxes.length > 0) && <ValueLine values={line} fields={fields} boxes={boxes} />}
            {groups.map((group) => <Group key={group.name} member={member.name} group={group} fields={fields} version={version} onRoll={onRoll} />)}
        </>
    );
}

/** What a row shows beside its value, when it says something more: a written speed equal to the one that counts now says nothing. */
function shownBeside(value: SheetValue): string | undefined
{
    const beside = besideLabel(value);
    return beside === value.text ? undefined : beside;
}

/** Values in a line of boxes, as under someone's name (D-299): each its label and its drawing, flashing when it changes; then the packages' boxes (D-516). */
function ValueLine({ values, fields, boxes = [] }: { values: SheetValue[]; fields: ReadonlySet<string>; boxes?: PersonShown[]; })
{
    return (
        <div class="line">
            {values.map((value) => (
                <span key={value.field} class="line-value">
                    <span class="label">{fieldLabel(value.field, fields)}</span>
                    <Changing text={value.text}>
                        <ValueDrawing value={value} label={fieldLabel(value.field, fields)} />
                    </Changing>
                    {/* What is written beside a number worked out, as the speed written beside the one that counts now. */}
                    {shownBeside(value) !== undefined && widgetOf(value) !== "progress" && <span class="beside num">{shownText(shownBeside(value) ?? "")}</span>}
                </span>
            ))}
            <PersonBoxes shown={boxes} />
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
        const lines = [answers === undefined ? undefined : t("Answers the master: {check}", { check: answers.check }), stageLine(value), parts?.join(" · "), oddsLine(value.roll), free].filter((line) => line !== undefined);
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
        <Card
            name={group.name}
            title={systemWord("groups", group.name) ?? systemWord("words", group.name)}
            icon={group.icon ?? cardIcons.plain}
            layout={layout}
            preview={preview(group, label, fields)}
            onReach={explain}
            held={lit}
            first={first}
        >
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
            <span class="small num">{beside === undefined ? "" : shownText(value.text, value.kind)}</span>
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
    const beside = shownBeside(value);
    const marks = value.marks === 0 ? null : <span class="marks" aria-label={value.marks === 1 ? t("1 mark") : t("{count} marks", { count: value.marks })}>{"●".repeat(value.marks)}</span>;
    // A list of bonds says how many it holds of the most it may, as 2/3; a load the stage it reaches, as Encumbered.
    const held = value.most === undefined ? undefined : { count: value.items?.length ?? 0, most: value.most };
    const stage = value.load?.stage === undefined ? undefined : systemText(value.load.stage);
    const said = [shownLabel, held === undefined ? "" : t("{count} of {most}", held), shownText(value.text, value.kind), stage ?? "", beside === undefined ? "" : shownText(beside)]
        .filter((part) => part !== "")
        .join(" ");
    return (
        <NumberBox {...props} label={shownLabel} kind={["row", `row-${widget}`, stage === undefined ? "" : "staged"].filter((name) => name !== "").join(" ")} said={said}>
            <span class="label">
                {marks}
                {shownLabel}
                {held !== undefined && (
                    <span class={held.count > held.most ? "row-most over num" : "row-most num"}>
                        <span aria-hidden="true">{`${held.count}/${held.most}`}</span>
                        <span class="visually-hidden">{t("{count} of {most}", held)}</span>
                    </span>
                )}
            </span>
            <Changing text={value.text}>
                {value.roll && <RollMark roll={value.roll} />}
                {stage !== undefined && <span class="load-stage" aria-hidden="true">{stage}</span>}
                {widget === "progress" || widget === "bar" ? <span class="num">{shownText(value.text, value.kind)}</span> : <ValueDrawing value={value} label={shownLabel} fields={props.fields} />}
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

/** The die inside a number the system rolls, a click throws it; an arrow up when the roll is better, down when worse, both when the two cancel out. */
function RollMark({ roll }: { roll: SheetRoll; })
{
    const odds = oddsOf(roll);
    return (
        <span class={odds === undefined ? "roll-mark" : `roll-mark ${odds}`} aria-hidden="true">
            <DieIcon sides={roll.dice[0] ?? 20} />
            {odds !== undefined && <Icon name={odds} />}
        </span>
    );
}

/** Whether a roll is better, worse, or both, which cancel out; undefined when nothing changes it. */
function oddsOf(roll: SheetRoll): "better" | "worse" | "even" | undefined
{
    const better = (roll.odds?.better.length ?? 0) > 0;
    const worse = (roll.odds?.worse.length ?? 0) > 0;
    return better && worse ? "even" : better ? "better" : worse ? "worse" : undefined;
}

/** Why a roll is better or worse, in the system's words, for its tooltip: Rolled worse: Poisoned; both, and that they cancel out. */
function oddsLine(roll: SheetRoll | undefined): string | undefined
{
    const odds = roll === undefined ? undefined : oddsOf(roll);
    const better = listText((roll?.odds?.better ?? []).map(systemText));
    const worse = listText((roll?.odds?.worse ?? []).map(systemText));
    return odds === undefined
        ? undefined
        : odds === "even"
        ? t("Better for {better} and worse for {worse}: they cancel out", { better, worse })
        : odds === "better"
        ? t("Rolled better: {why}", { why: better })
        : t("Rolled worse: {why}", { why: worse });
}

/** The stage a load reaches, for its tooltip: the system's word, and that the master knows what it brings. */
function stageLine(value: SheetValue): string | undefined
{
    return value.load?.stage === undefined ? undefined : t("{stage}, by the weight you carry: the master knows what it brings", { stage: systemText(value.load.stage) });
}

/** A word of the system, as a load's stage or what makes a roll worse, in the campaign's language. */
function systemText(word: string): string
{
    return systemWord("words", word) ?? word;
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
    // Two of the same thing in one place, as two ropes, are two lines: each its key by how many came before it.
    const bases = items.map((item, index) => `${depths[index]} ${item.inside ?? ""} ${item.item}`);
    const keys = bases.map((base, index) => `${base} ${bases.slice(0, index).filter((other) => other === base).length}`);
    const key = (index: number): string => keys[index];
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
                    const bonds = (item.bonds ?? []).map((list) => fieldLabel(list, fields));
                    const said = [
                        item.inside === undefined ? undefined : t("in {container}", { container: itemName(item.inside) }),
                        item.equipped === true ? t("Equipped") : undefined,
                        ...bonds,
                    ].filter((part) => part !== undefined).map((part) => `, ${part}`).join("");
                    const words = (
                        <>
                            {/* The thing's own picture, in the colour of its words, else a thing's; in gold when it is equipped (D-431). */}
                            {marked && <ItemPicture image={item.image} equipped={item.equipped === true} />}
                            <span>{name}</span>
                            {count(item) !== "" && <span class="item-count">{` (${count(item)})`}</span>}
                            {/* In a list of bonds, as attuned: a mark after its name, the list's name in its tooltip. */}
                            {bonds.length > 0 && (
                                <span class="item-bond" data-tip={bonds.join(", ")} aria-hidden="true">
                                    <Icon name="bond" />
                                </span>
                            )}
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
                            {!carried && item.values.map((value) => <td key={value.field} class={widgetOf(value) === "text" ? undefined : "num"}>{shownText(value.text, value.kind)}</td>)}
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

/** What a closed group says of itself: its first values, or its items, in the words its open card writes them. */
function preview(group: SheetGroup, label: (field: string) => string, fields: ReadonlySet<string>): string
{
    if (group.items !== undefined) {
        // The group's own values first, as the money above the things carried: their text alone, as the card is narrow.
        return [...group.values.map((value) => valueWords(value, fields)), ...group.items.map((item) => itemName(item.item))].join(" · ");
    }

    // A value named as the card is, as Features in Features, by its words alone.
    const title = (systemWord("groups", group.name) ?? group.name).toLocaleLowerCase();
    return group.values.slice(0, 4).map((value) => {
        const name = label(value.field);
        const words = valueWords(value, fields);
        return name.toLocaleLowerCase() === title ? words : `${name} ${words}`;
    }).join(" · ");
}

/** A value in a line of words, as its card writes it: a list's items by their names, money by its coins, any other its text. */
function valueWords(value: SheetValue, fields: ReadonlySet<string>): string
{
    if (widgetOf(value) === "list") {
        return listText((value.items ?? []).map((item) => itemLabel(item, fields)));
    }

    if (value.coins !== undefined && value.coins.length > 0) {
        return value.coins.map(({ coin, count }) => `${count} ${shownText(coin)}`).join(" ");
    }

    return shownText(besideLabel(value) ?? value.text, value.kind);
}
