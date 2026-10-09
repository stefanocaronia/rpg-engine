// The rolls the player may see (D-279), the newest first: theirs with their character's token, the master's shown ones with the robot and for whom; hidden
// rolls never come here. A card like the sheet's, which shows the newest roll while it is closed (D-284); beside the sheet, it is always open (D-289). Those
// of the last half hour, older ones at a click; Clear starts the list again, the log untouched (D-302).
import { useEffect, useRef, useState } from "preact/hooks";
import { CardHeader, useMedia, useOpen } from "./card.tsx";
import type { Member, ShownRoll } from "./data.ts";
import { DiceFaces } from "./faces.tsx";
import { cardIcons, DieIcon, Icon } from "./icons.tsx";
import { notationModifier } from "./labels.ts";
import { rollWindow } from "./layout.ts";
import { Token, type Tokened } from "./party.tsx";

// From this width the rolls are a column beside the sheet, as in the style sheet; where the browser remembers that the player put it away, and when they last
// cleared the list of a campaign; how many older rolls each Load more shows.
const besideSheet = "(min-width: 900px)";
const awayKey = "rpg-engine.rolls-away";
const clearedKey = "rpg-engine.rolls-cleared";
const moreRolls = 10;

// How long a new roll keeps its mark, which the style sheet fades at the end (D-303).
const markLength = 9000;

export function RollLog({ rolls, unread, campaign, party, fresh, onMore }: { rolls: ShownRoll[]; unread: boolean; campaign?: string; party: Member[]; fresh: Set<string>; onMore: () => void; })
{
    const lead = party.find((member) => member.role === "pc");
    const [chosen, toggle] = useOpen("Rolls");
    const beside = useMedia(besideSheet);
    const [away, setAway] = useState(readAway);
    const [cleared, setCleared] = useState(() => readCleared(campaign));
    const [older, setOlder] = useState(0);
    // The rolls already drawn: a new one comes in only the first time, not again when the column comes back.
    const greeted = useRef(new Set<string>());
    const open = beside || chosen;
    const listed = rollWindow(rolls, { now: Date.now(), cleared, older, unread });
    const newest = listed.shown.at(-1);

    const clear = (): void => {
        const now = Date.now();
        setCleared(now);
        setOlder(0);
        writeCleared(campaign, now);
    };

    // Older rolls: those read already, then more of the log once the page has shown all it read.
    const loadMore = (): void => {
        setOlder(older + moreRolls);

        if (listed.before < older + moreRolls && unread) {
            onMore();
        }
    };

    const putAway = (now: boolean): void => {
        setAway(now);
        writeAway(now);
    };

    if (beside && away) {
        return (
            <aside class="rolls away" aria-label="Rolls">
                <button type="button" class="rolls-tab" aria-label="Show the rolls" onClick={() => putAway(false)}>
                    <DieIcon sides={20} />
                    <span>Rolls</span>
                </button>
            </aside>
        );
    }

    return (
        <aside class="rolls" aria-labelledby="rolls-title">
            <details class="rolls-card" open={open}>
                <CardHeader
                    icon={cardIcons.rolls}
                    title={<h2 id="rolls-title" class="rolls-title">Rolls</h2>}
                    preview={newest === undefined ? undefined : `${[nameOf(newest, lead), newest.check].filter((part) => part !== undefined && part !== "").join(" · ")} · ${newest.total}`}
                    open={open}
                    onToggle={toggle}
                    fixed={beside}
                />
                <div class={beside ? "rolls-tools" : "rolls-tools folding"}>
                    {(listed.shown.length > 0 || listed.more) && (
                        <button type="button" class="icon-button tip-left" aria-label="Clear the rolls" data-tip="Clear the list" onClick={clear}>
                            <Icon name="clearAll" />
                        </button>
                    )}
                    {beside && (
                        <button type="button" class="icon-button tip-left" aria-label="Hide the rolls" data-tip="Hide" onClick={() => putAway(true)}>
                            <Icon name="aside" />
                        </button>
                    )}
                </div>
                {listed.shown.length === 0
                    ? <p class="rolls-none">{emptyText(rolls.length, listed.before)}</p>
                    : (
                        <ol class="roll-list">
                            {[...listed.shown].reverse().map((roll) => <RollRow key={roll.id} roll={roll} name={nameOf(roll, lead)} token={tokenOf(roll, party, lead)} fresh={fresh.has(roll.id)} greeted={greeted.current} />)}
                        </ol>
                    )}
                {listed.more && <button type="button" class="rolls-more" onClick={loadMore}>Load more</button>}
            </details>
        </aside>
    );
}

/**
 * One roll, in three lines (D-292): whom it is for, by their token and name; what it is; its dice as chips and the number added. Its total on the right; in
 * its tooltip the whole roll, which the lines may cut, with the notation in words; the chat's text for a screen reader. A new one first opens its place, then
 * appears in it, with a yellow corner for a while (D-303): as it first shows, whatever the readings after, and once.
 */
function RollRow({ roll, name, token, fresh, greeted }: { roll: ShownRoll; name: string; token?: Tokened; fresh: boolean; greeted: Set<string>; })
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
    // The whole roll, which the lines may cut: whom and what, the dice as the chat writes them, the notation in words, and when (D-299).
    const said = [roll.check === undefined ? name : `${name} · ${roll.check}`, roll.text, roll.words, rolledWhen(roll)].filter((line) => line !== undefined && line !== "").join("\n");
    return (
        <li class={["roll", player ? "by-player" : "by-master", entering ? "entering" : ""].filter((part) => part !== "").join(" ")} data-roll={roll.id} title={said}>
            {marked && <span class="roll-flag" aria-hidden="true">!</span>}
            {token === undefined ? <img class="roll-robot" src="/assets/favicon.svg" alt="" /> : <Token member={token} />}
            <span class="roll-who">
                <span class="visually-hidden">{`${marked ? "New. " : ""}${player ? "Your roll: " : "The master's roll: "}`}</span>
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
        return "The checks the master asks of you come here, and the master's rolls you may see.";
    }

    return older > 0 ? "No rolls in the last half hour." : "Cleared: the new rolls come here.";
}

/** Whom a roll is for, by name: the player's character for the player's own, whom the master named, or the master for a roll for no one. */
function nameOf(roll: ShownRoll, lead: Member | undefined): string
{
    return roll.who ?? (roll.by === "player" ? lead?.name ?? "" : "The master");
}

/**
 * The token of whom a roll is for (D-286): the player's character for the player's own; a member of the party; anyone else with their picture, or a question mark
 * for someone the character does not know; none, so the robot, for a roll the master makes for no one.
 */
function tokenOf(roll: ShownRoll, party: Member[], lead: Member | undefined): Tokened | undefined
{
    const member = party.find((candidate) => candidate.name === roll.who);

    if (roll.by === "player") {
        return member ?? lead ?? { name: "?", role: "pc" };
    }

    if (member !== undefined || roll.who === undefined) {
        return member;
    }

    return { name: roll.stranger ? "?" : roll.who, role: "other", ...(roll.image === undefined ? {} : { image: roll.image }) };
}

function readAway(): boolean
{
    try {
        return localStorage.getItem(awayKey) === "away";
    } catch {
        return false;
    }
}

function writeAway(away: boolean): void
{
    try {
        localStorage.setItem(awayKey, away ? "away" : "beside");
    } catch {
        // The page forgets it at the next reload.
    }
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
        localStorage.setItem(`${clearedKey}:${campaign ?? ""}`, String(at));
    } catch {
        // The page forgets it at the next reload.
    }
}

/** When a roll was made: the game's day and hour, and the real time, as "day 1, 18:00 in the game · rolled at 18:15". */
function rolledWhen(roll: ShownRoll): string
{
    const real = new Date(roll.at);
    const time = Number.isNaN(real.getTime()) ? undefined : `rolled at ${real.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
    return [roll.date === undefined ? undefined : `${roll.date} in the game`, time].filter((part) => part !== undefined).join(" · ");
}
