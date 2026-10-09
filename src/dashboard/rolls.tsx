// The rolls the player may see (D-279), the newest first: theirs with their character's token, the master's shown ones with the robot and for whom; hidden
// rolls never come here. A card like the sheet's, which shows the newest roll while it is closed (D-284); beside the sheet, it is always open (D-289).
import { useState } from "preact/hooks";
import { CardHeader, useMedia, useOpen } from "./card.tsx";
import type { Member, ShownRoll } from "./data.ts";
import { DiceFaces } from "./faces.tsx";
import { cardIcons, DieIcon, Icon } from "./icons.tsx";
import { notationModifier } from "./labels.ts";
import { Token, type Tokened } from "./party.tsx";

// From this width the rolls are a column beside the sheet, as in the style sheet; where the browser remembers that the player put it away.
const besideSheet = "(min-width: 900px)";
const awayKey = "rpg-engine.rolls-away";

export function RollLog({ rolls, party, fresh }: { rolls: ShownRoll[]; party: Member[]; fresh: Set<string>; })
{
    const lead = party.find((member) => member.role === "pc");
    const [chosen, toggle] = useOpen("Rolls");
    const beside = useMedia(besideSheet);
    const [away, setAway] = useState(readAway);
    const open = beside || chosen;
    const newest = rolls.at(-1);

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
                {beside && (
                    <button type="button" class="icon-button rolls-hide tip-left" aria-label="Hide the rolls" data-tip="Hide" onClick={() => putAway(true)}>
                        <Icon name="aside" />
                    </button>
                )}
                {rolls.length === 0
                    ? <p class="rolls-none">The checks the master asks of you come here, and the master's rolls you may see.</p>
                    : (
                        <ol class="roll-list">
                            {[...rolls].reverse().map((roll) => <RollRow key={roll.id} roll={roll} name={nameOf(roll, lead)} token={tokenOf(roll, party, lead)} fresh={fresh.has(roll.id)} />)}
                        </ol>
                    )}
            </details>
        </aside>
    );
}

/**
 * One roll, in three lines (D-292): whom it is for, by their token and name; what it is; its dice as chips and the number added. Its total on the right; in
 * its tooltip the whole roll, which the lines may cut, with the notation in words; the chat's text for a screen reader.
 */
function RollRow({ roll, name, token, fresh }: { roll: ShownRoll; name: string; token?: Tokened; fresh: boolean; })
{
    const player = roll.by === "player";
    // The whole roll, which the lines may cut: whom and what, the dice as the chat writes them, the notation in words, and when (D-299).
    const said = [roll.check === undefined ? name : `${name} · ${roll.check}`, roll.text, roll.words, rolledWhen(roll)].filter((line) => line !== undefined && line !== "").join("\n");
    return (
        <li class={["roll", player ? "by-player" : "by-master", fresh ? "changed" : ""].filter((part) => part !== "").join(" ")} data-roll={roll.id} title={said}>
            {token === undefined ? <img class="roll-robot" src="/assets/favicon.svg" alt="" /> : <Token member={token} />}
            <span class="roll-who">
                <span class="visually-hidden">{player ? "Your roll: " : "The master's roll: "}</span>
                {name}
                {fresh && <span class="roll-new">New</span>}
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

/** When a roll was made: the game's day and hour, and the real time, as "day 1, 18:00 in the game · rolled at 18:15". */
function rolledWhen(roll: ShownRoll): string
{
    const real = new Date(roll.at);
    const time = Number.isNaN(real.getTime()) ? undefined : `rolled at ${real.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
    return [roll.date === undefined ? undefined : `${roll.date} in the game`, time].filter((part) => part !== undefined).join(" · ");
}
