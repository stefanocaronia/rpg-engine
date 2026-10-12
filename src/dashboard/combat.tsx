// The Combat section (D-314, D-315): only while the open scene is a fight. On top the band: the round, who acts, who comes next, the line of now; gold when it is
// the player's turn. Under it the order of the turns, fixed, the mark moving: each one's counter, the party's as numbers and a foe's in words, what is on them,
// "can't act", what they keep, the death saves at 0. Beside it what the player's character has at hand, the fields and groups of its sheet the system names. The
// page never decides a rule: it shows.
import { sectionAddress } from "./address.ts";
import type { Fighter, Member, SheetCards, SheetGroup, ShownGrid, ShownScene } from "./data.ts";
import { Icon } from "./icons.tsx";
import { shownText, strangerLabel } from "./labels.ts";
import { Token } from "./party.tsx";
import { PlaceMap } from "./place-map-view.tsx";
import { type FreeRoll, SheetAtHand } from "./sheet.tsx";
import { t } from "./text.ts";
import { DeathSaves, Effects } from "./widgets.tsx";

/** The player character's sheet as the page read it, for what it has at hand. */
interface OwnSheet
{
    sheet: SheetGroup[];
    cards?: SheetCards;
    version: number;
    onRoll: FreeRoll;
}

export function CombatView({ scene, lead, own, map, place }: { scene?: ShownScene; lead?: Member; own: OwnSheet; map?: ShownGrid; place?: string; })
{
    const fighters = scene?.type === "combat" ? scene.fighters ?? [] : undefined;

    if (scene === undefined || fighters === undefined) {
        return (
            <section class="upcoming" aria-labelledby="combat-title">
                <h2 id="combat-title">{t("Combat")}</h2>
                <p>{t("There is no fight now.")}</p>
                <p class="upcoming-note">
                    <a href={sectionAddress("scene")}>{t("Where the party is")}</a>
                </p>
            </section>
        );
    }

    const acting = fighters.findIndex((fighter) => fighter.name === scene.turn);
    const next = acting < 0 || fighters.length < 2 ? undefined : fighters[(acting + 1) % fighters.length];
    const mine = lead !== undefined && scene.turn === lead.name;
    const self = fighters.find((fighter) => fighter.role === "pc");
    const order = (
        <ol class="turn-order" aria-label={t("The order of the turns")}>
            {fighters.map((fighter, index) => <FighterRow key={`${fighter.name} ${index}`} fighter={fighter} place={index + 1} acting={index === acting} />)}
        </ol>
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
                            <FighterToken fighter={next} />
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

/** One in the order (D-315): their place, token and name, their counter, what is on them, whether they act, what they keep; the death saves at 0. */
function FighterRow({ fighter, place, acting }: { fighter: Fighter; place: number; acting: boolean; })
{
    return (
        <li class={["turn-row", fighter.role, acting ? "now" : ""].filter((part) => part !== "").join(" ")} aria-current={acting ? "step" : undefined}>
            <span class="turn-place">{place}</span>
            <FighterToken fighter={fighter} />
            <div class="turn-main">
                <p class="turn-name">
                    {shownName(fighter)}
                    {fighter.role === "pc" && <span class="you">{t("You")}</span>}
                    {fighter.inactive && <span class="cant-act">{t("Can't act")}</span>}
                </p>
                {fighter.health && (fighter.role === "other" ? <span class={`wound ${fighter.health}`}>{healthLabel(fighter.health)}</span> : <span class="turn-health num">{shownText(fighter.health)}</span>)}
                <Effects effects={fighter.effects} />
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
            <h3 id="at-hand-title">
                <Icon name="party" />
                {lead.name}
                <span class="at-hand-note">{t("At hand")}</span>
            </h3>
            {fighter.dying ? <DeathSaves dying={fighter.dying} /> : (
                <>
                    {fighter.keeps && <p class="keeping">{t("Keeping {what}", { what: fighter.keeps.join(", ") })}</p>}
                    <SheetAtHand member={lead} sheet={own.sheet} names={own.cards?.atHand ?? []} version={own.version} onRoll={own.onRoll} />
                </>
            )}
        </aside>
    );
}

function FighterToken({ fighter }: { fighter: Fighter; })
{
    // A stranger's number, as Creature 2's or, with more kinds, Creature B1's, the same on their token on the map (D-325, D-331).
    const number = fighter.stranger ? /[A-Z]?\d+$/.exec(fighter.name)?.[0] : undefined;
    return fighter.stranger
        ? (
            <span class={number === undefined ? "token stranger" : "token stranger numbered"} aria-hidden="true">
                {number ?? <Icon name="stranger" />}
            </span>
        )
        : <Token member={{ name: fighter.name, role: fighter.role, ...(fighter.image === undefined ? {} : { image: fighter.image }) }} />;
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
