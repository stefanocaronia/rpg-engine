// The turns of a scene that goes by them (D-314, D-315, D-444), a fight for now: the band on top of the Scene, the round, who acts, who comes next, the scene's
// title and line of now, gold when it is the player's turn; the order of the turns, fixed, the mark moving, each one a small card (D-419): their place in a
// strip that lights up on their turn, their counter, the party's as numbers and a foe's in words, their state as icons, what they keep, the death saves at 0;
// and the player's character's card, the fields and groups of its sheet the system names. The page never decides a rule: it shows.
import { useEffect, useRef } from "preact/hooks";
import { TalkName } from "./act-names.tsx";
import { CardHead, CardHeader, useOpen } from "./card.tsx";
import type { Fighter, Member, SheetCards, SheetGroup, ShownScene } from "./data.ts";
import { DeathSaves } from "./dying.tsx";
import { Icon, iconPath } from "./icons.tsx";
import { fieldLabel, itemLabel, phraseLabel, shownText, strangerLabel } from "./labels.ts";
import { stripCounter } from "./layout.ts";
import { sideOf, Token } from "./party.tsx";
import { dyingState } from "./save-outcome.ts";
import { type FreeRoll, SheetAtHand } from "./sheet.tsx";
import { StatusIcons, StatusPip, type TokenStatus } from "./status.tsx";
import { t } from "./text.ts";
import { Bar } from "./widgets.tsx";

/** The player character's sheet as the page read it, for its card. */
export interface OwnSheet
{
    sheet: SheetGroup[];
    cards?: SheetCards;
    version: number;
    onRoll: FreeRoll;
}

/** A scene that goes by turns: it has an order of them, as a fight has. */
export type TurnScene = ShownScene & { fighters: Fighter[]; };

/** Whether the open scene goes by turns. */
export function hasTurns(scene: ShownScene | undefined): scene is TurnScene
{
    return (scene?.fighters?.length ?? 0) > 0;
}

/** The band of the turns (D-315, D-444): the round, who acts, told again as the turn passes, who comes next; the scene's title and its line of now. */
export function TurnBand({ scene, lead, motion }: { scene: TurnScene; lead?: Member; motion?: "in" | "out"; })
{
    const fighters = scene.fighters;
    const acting = fighters.findIndex((fighter) => fighter.name === scene.turn);
    const next = acting < 0 || fighters.length < 2 ? undefined : fighters[(acting + 1) % fighters.length];
    const mine = lead !== undefined && scene.turn === lead.name;
    const kinds = ["turn-band", mine ? "mine" : acting < 0 ? "" : fighters[acting].role, motion === undefined ? "" : `band-${motion}`];
    return (
        <header class={kinds.filter((kind) => kind !== "").join(" ")}>
            {scene.round !== undefined && (
                <p class="round">
                    <span class="eyebrow">{t("Round")}</span>
                    <span class="round-number">{scene.round}</span>
                </p>
            )}
            <div class="turn-now">
                {acting >= 0 && <FighterToken fighter={fighters[acting]} />}
                <div class="turn-who">
                    {/* Told again when the turn passes: who acts, in one line; the marks stay out of it, or each use would read the band again. */}
                    <div aria-live="polite" aria-atomic="true">
                        <p class="eyebrow">{mine ? t("Your turn") : t("Now acting")}</p>
                        <h2 id="turn-title">{mine ? lead?.name : acting < 0 ? scene.title : shownName(fighters[acting])}</h2>
                    </div>
                    {scene.marks && <TurnMarks marks={scene.marks} />}
                </div>
            </div>
            {next && (
                <p class="turn-next">
                    <span class="eyebrow">{t("Next")}</span>
                    <span class="next-who">
                        <FighterToken fighter={next} pip={false} />
                        {next.role === "pc" ? t("You") : shownName(next)}
                    </span>
                </p>
            )}
            <p class="scene-line">
                <b class="scene-line-title">{scene.title}</b>
                {scene.now && <span>{` — ${scene.now}`}</span>}
            </p>
        </header>
    );
}

/** What who acts has of the turn (D-453, TRN-4): each use the game names, full while free, faded once used. */
function TurnMarks({ marks }: { marks: { use: string; used: boolean; }[]; })
{
    return (
        <ul class="turn-marks" aria-label={t("This turn")}>
            {marks.map((mark) => {
                const label = itemLabel(mark.use);
                const state = mark.used ? t("used") : t("free");
                return (
                    <li key={mark.use} class={mark.used ? "used" : "free"}>
                        <span class="mark-sign tip-below" data-tip={`${label}: ${state}`} aria-hidden="true">
                            <span class="mark-pip" />
                            <span class="mark-word">{label}</span>
                        </span>
                        <span class="visually-hidden">{`${label}: ${state}`}</span>
                    </li>
                );
            })}
        </ul>
    );
}

/**
 * The player's character's card while the scene goes by turns (D-315, D-444): its name, what it is, and the way to its whole sheet in its header; what it keeps,
 * the fields and groups of its sheet the system names; at 0 only the death saves. Nothing when the system names none.
 */
export function CharacterCard({ lead, scene, own }: { lead?: Member; scene: TurnScene; own: OwnSheet; })
{
    const fighter = scene.fighters.find((one) => one.role === "pc");

    if (lead === undefined || fighter === undefined || (own.cards?.atHand.length ?? 0) === 0) {
        return null;
    }

    return (
        <aside class="at-hand" aria-labelledby="at-hand-title">
            <CardHead icon={iconPath("party")} title={<h3 id="at-hand-title">{lead.name}</h3>} {...(lead.headline === undefined ? {} : { note: lead.headline })}>
                <a class="icon-button tip-left" href={`#/party/${encodeURIComponent(lead.name)}`} aria-label={t("The whole sheet")} data-tip={t("The whole sheet")}>
                    <Icon name="party" />
                </a>
            </CardHead>
            {fighter.dying ? <DeathSaves dying={fighter.dying} /> : (
                <>
                    {fighter.keeps && <p class="keeping">{t("Keeping {what}", { what: fighter.keeps.join(", ") })}</p>}
                    <SheetAtHand member={lead} sheet={own.sheet} names={own.cards?.atHand ?? []} version={own.version} onRoll={own.onRoll} />
                </>
            )}
        </aside>
    );
}

/**
 * The order of the turns (D-315, D-419), fixed, the mark moving: on the table beside the page, where its list scrolls inside past eight or so and keeps
 * whoever acts in sight; on a narrow screen in the Scene, under the band. Nothing while the scene does not go by turns.
 */
export function TurnsCard({ scene, party, beside = false }: { scene?: ShownScene; party: Member[]; beside?: boolean; })
{
    const list = useRef<HTMLOListElement>(null);
    const [open, toggle] = useOpen("Turns");
    const fighters = scene?.fighters ?? [];
    const acting = fighters.findIndex((fighter) => fighter.name === scene?.turn);

    // As the turn passes, the list that scrolls brings whoever acts into its sight, the page left where it is.
    useEffect(() => {
        const element = list.current;
        const row = acting < 0 ? null : element?.children[acting];

        if (element === null || !(row instanceof HTMLElement) || element.scrollHeight <= element.clientHeight) {
            return;
        }

        if (row.offsetTop < element.scrollTop || row.offsetTop + row.offsetHeight > element.scrollTop + element.clientHeight) {
            element.scrollTop = row.offsetTop - (element.clientHeight - row.offsetHeight) / 2;
        }
    }, [acting, fighters.length]);

    if (scene === undefined || fighters.length === 0) {
        return null;
    }

    const round = scene.round === undefined ? undefined : t("Round {round}", { round: scene.round });
    const rows = (
        <ol class="turn-order" aria-label={t("The order of the turns")} ref={list}>
            {fighters.map((fighter, index) => (
                <FighterRow
                    key={`${fighter.name} ${index}`}
                    fighter={fighter}
                    member={party.find((one) => one.role === fighter.role && one.name === fighter.name)}
                    place={index + 1}
                    acting={index === acting}
                />
            ))}
        </ol>
    );

    // On the table a card that closes to its header, who acts in it while it is closed; in Combat always open.
    if (beside) {
        return (
            <section class="turns-card on-table" aria-labelledby="turns-title">
                <details class="table-card" open={open}>
                    <CardHeader
                        icon={iconPath("list")}
                        title={<h2 id="turns-title">{t("Turns")}</h2>}
                        preview={acting < 0 ? undefined : shownName(fighters[acting])}
                        {...(round === undefined ? {} : { note: round })}
                        open={open}
                        onToggle={toggle}
                    />
                    {rows}
                </details>
            </section>
        );
    }

    return (
        <section class="turns-card" aria-labelledby="turns-title">
            <CardHead icon={iconPath("list")} title={<h3 id="turns-title">{t("Turns")}</h3>} {...(round === undefined ? {} : { note: round })} />
            {rows}
        </section>
    );
}

/**
 * One in the order (D-315), as a small card (D-419): their place, token and name, their counter, their state as icons (whether they act, at 0, what is on
 * them), what they keep; the death saves at 0. Their token has no pip of state: the icons beside it say it.
 */
function FighterRow({ fighter, member, place, acting }: { fighter: Fighter; member: Member | undefined; place: number; acting: boolean; })
{
    // One of the party has the bar of their strip (D-419), the icons under it.
    const counter = member === undefined ? undefined : stripCounter(member);
    return (
        <li class={["turn-row", fighter.role, acting ? "now" : ""].filter((part) => part !== "").join(" ")} aria-current={acting ? "step" : undefined}>
            <span class="turn-place">{place}</span>
            <FighterToken fighter={fighter} state={false} />
            <div class="turn-main">
                <p class="turn-name">
                    {fighter.role === "pc"
                        ? (
                            <>
                                {shownName(fighter)}
                                <span class="you">{t("You")}</span>
                            </>
                        )
                        : <TalkName name={shownName(fighter)}>{shownName(fighter)}</TalkName>}
                </p>
                {counter !== undefined && <Bar value={counter} label={fieldLabel(counter.field)} />}
                <div class="turn-facts">
                    {counter === undefined && fighter.health
                        && (fighter.role === "other"
                            ? <span class={fighter.wound === undefined ? "wound" : `wound ${fighter.wound}`}>{phraseLabel(itemLabel(fighter.health))}</span>
                            : <span class="turn-health num">{shownText(fighter.health)}</span>)}
                    <StatusIcons status={fighterStatus(fighter)} downSaid={counter === undefined && fighter.role === "other" && fighter.wound === "down"} />
                </div>
                {fighter.keeps && <p class="keeping">{t("Keeping {what}", { what: fighter.keeps.join(", ") })}</p>}
                {fighter.dying && <DeathSaves dying={fighter.dying} compact />}
            </div>
        </li>
    );
}

/**
 * A fighter's token; a foe the master marked glows red a little, with no pip (D-415); one of the party with the pip of their side unless it is too small for one
 * (D-414); with the pip of their state unless `state` is false (D-419).
 */
function FighterToken({ fighter, pip = true, state = true }: { fighter: Fighter; pip?: boolean; state?: boolean; })
{
    const status = state ? fighterStatus(fighter) : undefined;
    // A stranger's number, as Creature 2's or, with more kinds, Creature B1's, the same on their token on the map (D-325, D-331).
    const number = fighter.stranger ? /[A-Z]?\d+$/.exec(fighter.name)?.[0] : undefined;
    const hostile = fighter.hostile === true;
    // A stranger with a picture of their own, made from what is seen, shows it, with their number in its corner (D-420).
    return fighter.stranger && fighter.image === undefined
        ? (
            <span class={["token stranger", number === undefined ? "" : "numbered", hostile ? "hostile" : ""].filter((name) => name !== "").join(" ")} aria-hidden="true">
                {number ?? <Icon name="stranger" />}
                <StatusPip status={status} />
            </span>
        )
        : (
            <Token
                member={{ name: fighter.name, role: fighter.role, ...(fighter.image === undefined ? {} : { image: fighter.image }), ...(fighter.icon === undefined ? {} : { icon: fighter.icon }) }}
                hostile={hostile}
                side={pip ? sideOf(fighter.role) : undefined}
                dying={dyingState(fighter.dying) ?? (fighter.wound === "down" ? "down" : undefined)}
                {...(status === undefined ? {} : { status })}
                number={number}
            />
        );
}

/** A fighter's state: what is on them, whether they act, and at 0 the party's dying point or a foe down. */
function fighterStatus(fighter: Fighter): TokenStatus
{
    return {
        effects: fighter.effects,
        inactive: fighter.inactive === true,
        down: fighter.dying !== undefined || fighter.wound === "down",
        dying: dyingState(fighter.dying),
        counters: fighter.dying,
        party: fighter.role !== "other",
    };
}

/** A fighter's name as the page writes it: Creature 2 for "creature 2", Someone for "someone". */
function shownName(fighter: Fighter): string
{
    return fighter.stranger ? strangerLabel(fighter.name) : fighter.name;
}
