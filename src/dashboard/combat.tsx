// The Combat section (D-314, D-315): only while the open scene is a fight. On top the band: the round, who acts, who comes next, the line of now; gold when it is
// the player's turn. Under it the order of the turns, fixed, the mark moving, each one a small card (D-419): their place in a strip that lights up on their
// turn, their counter, the party's as numbers and a foe's in words, their state as icons, what they keep, the death saves at 0. Beside it what the player's
// character has at hand, the fields and groups of its sheet the system names; every card with its header. The page never decides a rule: it shows.
import { sectionAddress } from "./address.ts";
import { CardHead } from "./card.tsx";
import type { Fighter, Member, SheetCards, SheetGroup, ShownGrid, ShownScene } from "./data.ts";
import { Icon, iconPath } from "./icons.tsx";
import { fieldLabel, shownText, strangerLabel } from "./labels.ts";
import { stripCounter } from "./layout.ts";
import { PageHead } from "./pages.tsx";
import { sideOf, Token } from "./party.tsx";
import { PlaceMap } from "./place-map-view.tsx";
import { type FreeRoll, SheetAtHand } from "./sheet.tsx";
import { StatusIcons, StatusPip, type TokenStatus } from "./status.tsx";
import { t } from "./text.ts";
import { Bar, DeathSaves } from "./widgets.tsx";

/** The player character's sheet as the page read it, for what it has at hand. */
interface OwnSheet
{
    sheet: SheetGroup[];
    cards?: SheetCards;
    version: number;
    onRoll: FreeRoll;
}

export function CombatView({ scene, lead, party, own, map, place }: { scene?: ShownScene; lead?: Member; party: Member[]; own: OwnSheet; map?: ShownGrid; place?: string; })
{
    const fighters = scene?.type === "combat" ? scene.fighters ?? [] : undefined;

    if (scene === undefined || fighters === undefined) {
        return (
            <section class="page-stack" aria-labelledby="combat-title">
                <PageHead section="combat" id="combat-title" />
                <div class="upcoming">
                    <p>{t("There is no fight now.")}</p>
                    <p class="upcoming-note">
                        <a href={sectionAddress("scene")}>{t("Where the party is")}</a>
                    </p>
                </div>
            </section>
        );
    }

    const acting = fighters.findIndex((fighter) => fighter.name === scene.turn);
    const next = acting < 0 || fighters.length < 2 ? undefined : fighters[(acting + 1) % fighters.length];
    const mine = lead !== undefined && scene.turn === lead.name;
    const self = fighters.find((fighter) => fighter.role === "pc");
    const order = (
        <section class="turns-card" aria-labelledby="turns-title">
            <CardHead
                icon={iconPath("list")}
                title={<h3 id="turns-title">{t("Turns")}</h3>}
                {...(scene.round === undefined ? {} : { note: t("Round {round}", { round: scene.round }) })}
            />
            <ol class="turn-order" aria-label={t("The order of the turns")}>
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
        </section>
    );
    const atHand = lead && self && (own.cards?.atHand.length ?? 0) > 0 ? <AtHand lead={lead} fighter={self} own={own} /> : null;
    return (
        <section class="combat" aria-labelledby="combat-title">
            <header class={mine ? "turn-band mine" : `turn-band ${acting < 0 ? "" : fighters[acting].role}`}>
                {scene.round !== undefined && (
                    <p class="round">
                        <span class="eyebrow">{t("Round")}</span>
                        <span class="round-number">{scene.round}</span>
                    </p>
                )}
                <div class="turn-now">
                    {acting >= 0 && <FighterToken fighter={fighters[acting]} />}
                    {/* Told again when the turn passes: who acts, in one line. */}
                    <div aria-live="polite" aria-atomic="true">
                        <p class="eyebrow">{mine ? t("Your turn") : t("Now acting")}</p>
                        <h2 id="combat-title">{mine ? lead?.name : acting < 0 ? scene.title : shownName(fighters[acting])}</h2>
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
                {scene.now && <p class="scene-line">{scene.now}</p>}
            </header>
            {map === undefined
                ? (
                    <div class="combat-body">
                        {order}
                        {atHand}
                    </div>
                )
                : (
                    // The map of the place beside the order and what is at hand, in a column (D-325).
                    <div class="combat-body with-map">
                        <div class="lm-side">
                            {order}
                            {atHand}
                        </div>
                        <PlaceMap map={map} place={place ?? scene.title} acting={scene.turn} />
                    </div>
                )}
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
                    {shownName(fighter)}
                    {fighter.role === "pc" && <span class="you">{t("You")}</span>}
                </p>
                {counter !== undefined && <Bar value={counter} label={fieldLabel(counter.field)} />}
                <div class="turn-facts">
                    {counter === undefined && fighter.health && (fighter.role === "other" ? <span class={`wound ${fighter.health}`}>{healthLabel(fighter.health)}</span> : <span class="turn-health num">{shownText(fighter.health)}</span>)}
                    <StatusIcons status={fighterStatus(fighter)} />
                </div>
                {fighter.keeps && <p class="keeping">{t("Keeping {what}", { what: fighter.keeps.join(", ") })}</p>}
                {fighter.dying && <DeathSaves dying={fighter.dying} />}
            </div>
        </li>
    );
}

/** What the player's character has at hand (D-315): what it keeps, the fields and groups of its sheet the system names; at 0 only the death saves. */
function AtHand({ lead, fighter, own }: { lead: Member; fighter: Fighter; own: OwnSheet; })
{
    return (
        <aside class="at-hand" aria-labelledby="at-hand-title">
            <CardHead icon={iconPath("party")} title={<h3 id="at-hand-title">{lead.name}</h3>} note={t("At hand")} />
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
                {...(status === undefined ? {} : { status })}
                number={number}
            />
        );
}

/** A fighter's state: what is on them, whether they act, and at 0 the party's dying point or a foe down. */
function fighterStatus(fighter: Fighter): TokenStatus
{
    return { effects: fighter.effects, inactive: fighter.inactive === true, down: fighter.dying !== undefined || fighter.health === "down" };
}

/** A fighter's name as the page writes it: Creature 2 for "creature 2", Someone for "someone". */
function shownName(fighter: Fighter): string
{
    return fighter.stranger ? strangerLabel(fighter.name) : fighter.name;
}

/** How hurt a foe looks, in the page's language (D-314): unhurt, hurt, bloodied, down. */
function healthLabel(health: string): string
{
    const labels: Record<string, string> = { unhurt: t("unhurt"), hurt: t("hurt"), bloodied: t("bloodied"), down: t("down") };
    return labels[health] ?? health;
}
