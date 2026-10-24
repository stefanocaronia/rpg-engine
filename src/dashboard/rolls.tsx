// The rolls the player may see (D-279), the newest first: theirs with their character's token, the master's shown ones with the robot and for whom; hidden
// rolls never come here. The player's free rolls come in too, dashed and dimmed, from this browser alone (D-330 (4)). A card like the sheet's, which shows the
// newest roll while it is closed (D-284), on the table beside the sheet too. Those of the last half hour, older ones at a click at the end of the
// list; Clear starts the list again, the log untouched, and forgets the free rolls; Restore brings the log back, never them (D-302, D-304).
import { useEffect, useRef, useState } from "preact/hooks";
import { CardHeader, useOpen } from "./card.tsx";
import type { Member, ShownRoll } from "./data.ts";
import { DiceFaces } from "./faces.tsx";
import type { PageRoll } from "./free-rolls.ts";
import { gameDateLabel, notationLabel } from "./game-words.ts";
import { cardIcons, Icon } from "./icons.tsx";
import { notationModifier, strangerLabel } from "./labels.ts";
import { rollWindow } from "./layout.ts";
import { Token, type Tokened } from "./party.tsx";
import { t } from "./text.ts";

// Where the browser remembers when the player last cleared the list of a campaign; how many older rolls each Load more shows.
const clearedKey = "rpg-engine.rolls-cleared";
const moreRolls = 10;

// How long a new roll keeps its mark, which the style sheet fades at the end (D-303).
const markLength = 9000;

export function RollLog(
    { rolls, free, unread, campaign, party, several = false, fresh, onMore, onClearFree }: {
        rolls: ShownRoll[];
        free: PageRoll[];
        unread: boolean;
        campaign?: string;
        party: Member[];
        /** More than one player character: the tray's free dice are no one's (D-480 (7)). */
        several?: boolean;
        fresh: Set<string>;
        onMore: () => void;
        onClearFree: () => void;
    },
)
{
    // With more than one player character the tray's free dice, of no sheet, are no one's: the die for a face, "Free roll" for a name.
    const of: Whose = { lead: party.find((member) => member.role === "pc"), nobody: several };
    const [chosen, toggle] = useOpen("Rolls");
    const [cleared, setCleared] = useState(() => readCleared(campaign));
    const [older, setOlder] = useState(0);
    // The rolls already drawn: a new one comes in only the first time, not again when the column comes back.
    const greeted = useRef(new Set<string>());
    const [scroller, setScroller] = useState<HTMLElement | null>(null);
    const open = chosen;
    // The log's rolls and the free ones, by when each was rolled.
    const all = [...rolls, ...free].toSorted((first, second) => Date.parse(first.at) - Date.parse(second.at));
    const listed = rollWindow(all, { now: Date.now(), cleared, older, unread });
    const newest = listed.shown.at(-1);
    const below = useMoreBelow(scroller);

    const clear = (): void => {
        const now = Date.now();
        setCleared(now);
        setOlder(0);
        writeCleared(campaign, now);
        onClearFree();
    };

    // The whole log again, from the last half hour, older rolls at Load more as before the clearing.
    const restore = (): void => {
        setCleared(0);
        setOlder(0);
        writeCleared(campaign, 0);
    };

    // Older rolls: those read already, then more of the log once the page has shown all it read.
    const loadMore = (): void => {
        setOlder(older + moreRolls);

        if (listed.before < older + moreRolls && unread) {
            onMore();
        }
    };

    return (
        <aside class="rolls" aria-labelledby="rolls-title">
            <details class="rolls-card" open={open}>
                <CardHeader
                    icon={cardIcons.rolls}
                    title={<h2 id="rolls-title" class="rolls-title">{t("Rolls")}</h2>}
                    preview={newest === undefined ? undefined : `${[nameOf(newest, of), newest.check].filter((part) => part !== undefined && part !== "").join(" · ")} · ${newest.total}`}
                    open={open}
                    onToggle={toggle}
                />
                <div class="rolls-tools folding">
                    {(listed.shown.length > 0 || listed.more) && (
                        <button type="button" class="icon-button tip-left" aria-label={t("Clear the rolls")} data-tip={t("Clear the list")} onClick={clear}>
                            <Icon name="clearAll" />
                        </button>
                    )}
                </div>
                <div class="roll-frame">
                    <div class="roll-scroll" ref={setScroller}>
                        {listed.shown.length === 0
                            ? <p class="rolls-none">{emptyText(rolls.length, listed.before)}</p>
                            : (
                                <ol class="roll-list">
                                    {[...listed.shown].reverse().map((roll) => (
                                        <RollRow key={roll.id} roll={roll} name={nameOf(roll, of)} token={tokenOf(roll, party, of)} fresh={fresh.has(roll.id)} greeted={greeted.current} several={several} />
                                    ))}
                                </ol>
                            )}
                        {listed.more
                            ? <button type="button" class="rolls-more" onClick={loadMore}>{t("Load more")}</button>
                            : cleared > 0 && <button type="button" class="rolls-more" onClick={restore}>{t("Restore the cleared rolls")}</button>}
                    </div>
                    {below && <div class="rolls-below" aria-hidden="true" />}
                </div>
            </details>
        </aside>
    );
}

/**
 * One roll, in three lines (D-292): whom it is for, by their token and name; what it is; its dice as chips and the number added. Its total on the right; in
 * its tooltip the whole roll, which the lines may cut, with the notation in words; the chat's text for a screen reader. A new one first opens its place, then
 * appears in it, with a yellow corner for a while (D-303): as it first shows, whatever the readings after, and once.
 */
function RollRow({ roll, name, token, fresh, greeted, several }: { roll: ShownRoll; name: string; token?: Tokened | "die"; fresh: boolean; greeted: Set<string>; several: boolean; })
{
    const [entering] = useState(() => fresh && !greeted.has(roll.id));
    const [marked, setMarked] = useState(entering);

    useEffect(() => {
        greeted.add(roll.id);

        if (!entering) {
            return;
        }

        const timer = window.setTimeout(() => setMarked(false), markLength);
        return () => window.clearTimeout(timer);
    }, []);

    const player = roll.by === "player";
    const free = "free" in roll;
    // The whole roll, which the lines may cut: whom and what, the dice as the chat writes them, the notation in words, and when (D-299).
    const said = [roll.check === undefined ? name : `${name} · ${roll.check}`, roll.text, notationLabel(roll.words), rolledWhen(roll), free ? t("Free roll · not logged") : undefined]
        .filter((line) => line !== undefined && line !== "")
        .join("\n");
    return (
        <li class={["roll", player ? "by-player" : "by-master", free ? "free" : "", entering ? "entering" : ""].filter((part) => part !== "").join(" ")} data-roll={roll.id} title={said}>
            {marked && <span class="roll-flag" aria-hidden="true">!</span>}
            {token === undefined
                ? <img class="roll-robot" src="/assets/favicon.svg" alt="" />
                : token === "die"
                ? (
                    <span class="token roll-die" aria-hidden="true">
                        <Icon name="dice" />
                    </span>
                )
                : <Token member={token} />}
            <span class="roll-who">
                <span class="visually-hidden">{`${marked ? t("New.") + " " : ""}${free ? t("Your free roll, not logged:") : player ? (several ? t("The players' roll:") : t("Your roll:")) : t("The master's roll:")} `}</span>
                {name}
            </span>
            {roll.check && <span class="roll-check">{roll.check}</span>}
            <span class="roll-total num">{roll.total}</span>
            <span class="roll-dice">
                <DiceFaces dice={roll.dice} modifier={notationModifier(roll.notation)} />
                <span class="visually-hidden">{roll.text}</span>
            </span>
        </li>
    );
}

/** What the list says with no roll in it: what comes there, that the last half hour had none, or that the player cleared it. */
function emptyText(read: number, older: number): string
{
    if (read === 0) {
        return t("The checks the master asks of you come here, and the master's rolls you may see.");
    }

    return older > 0 ? t("No rolls in the last half hour.") : t("Cleared: the new rolls come here.");
}

/** Whose the player's rolls are that name no one: the first player character's, or no one's for free dice among several (D-480 (7)). */
interface Whose
{
    lead: Member | undefined;
    nobody: boolean;
}

/**
 * Whom a roll is for, by name: the player's character for the player's own, whom the master named, or the master for a roll for no one; the tray's free dice
 * among several player characters are a free roll of no one's.
 */
function nameOf(roll: ShownRoll, of: Whose): string
{
    if (freeOfNobody(roll, of)) {
        return t("Free roll");
    }

    return roll.who === undefined ? (roll.by === "player" ? of.lead?.name ?? "" : t("The master")) : roll.stranger ? strangerLabel(roll.who) : roll.who;
}

/** Whether a roll is the tray's free dice, of no sheet, while more than one player character plays: no one's. */
function freeOfNobody(roll: ShownRoll, of: Whose): boolean
{
    return of.nobody && "free" in roll && roll.who === undefined;
}

/**
 * The token of whom a roll is for (D-286): the player's character for the player's own; a member of the party; anyone else with their picture, or a question mark
 * for someone the character does not know; none, so the robot, for a roll the master makes for no one; a die for free dice of no one's.
 */
function tokenOf(roll: ShownRoll, party: Member[], of: Whose): Tokened | "die" | undefined
{
    const member = party.find((candidate) => candidate.name === roll.who);

    if (freeOfNobody(roll, of)) {
        return "die";
    }

    if (roll.by === "player") {
        return member ?? of.lead ?? { name: "?", role: "pc" };
    }

    if (member !== undefined || roll.who === undefined) {
        return member;
    }

    return { name: roll.stranger ? "?" : roll.who, role: "other", ...(roll.image === undefined ? {} : { image: roll.image }) };
}

function readCleared(campaign: string | undefined): number
{
    try {
        return Number(localStorage.getItem(`${clearedKey}:${campaign ?? ""}`) ?? 0) || 0;
    } catch {
        return 0;
    }
}

function writeCleared(campaign: string | undefined, at: number): void
{
    try {
        if (at === 0) {
            localStorage.removeItem(`${clearedKey}:${campaign ?? ""}`);
        } else {
            localStorage.setItem(`${clearedKey}:${campaign ?? ""}`, String(at));
        }
    } catch {
        // The page forgets it at the next reload.
    }
}

/** Whether a list that scrolls has more under what it shows (D-304): as it scrolls, and as it, its rolls or its end change. */
function useMoreBelow(scroller: HTMLElement | null): boolean
{
    const [below, setBelow] = useState(false);

    useEffect(() => {
        if (scroller === null) {
            return;
        }

        const update = (): void => setBelow(scroller.scrollTop + scroller.clientHeight < scroller.scrollHeight - 2);
        const sizes = new ResizeObserver(update);

        const watch = (): void => {
            sizes.disconnect();
            sizes.observe(scroller);

            for (const child of scroller.children) {
                sizes.observe(child);
            }

            update();
        };

        const children = new MutationObserver(watch);
        children.observe(scroller, { childList: true });
        scroller.addEventListener("scroll", update, { passive: true });
        watch();

        return () => {
            sizes.disconnect();
            children.disconnect();
            scroller.removeEventListener("scroll", update);
        };
    }, [scroller]);

    return below;
}

/** When a roll was made: the game's day and hour, and the real time, as "day 1, 18:00 in the game · rolled at 18:15". */
function rolledWhen(roll: ShownRoll): string
{
    const real = new Date(roll.at);
    const time = Number.isNaN(real.getTime()) ? undefined : t("rolled at {time}", { time: real.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) });
    return [roll.date === undefined ? undefined : t("{date} in the game", { date: gameDateLabel(roll.date) }), time].filter((part) => part !== undefined).join(" · ");
}
