// The rolls the player may see (D-279), the newest first: theirs with their character's token, the master's shown ones with the robot and for whom; hidden
// rolls never come here. A card like the sheet's, which shows the newest roll while it is closed (D-284); beside the sheet, it is always open (D-289).
import { CardHeader, useMedia, useOpen } from "./card.tsx";
import type { Member, ShownRoll } from "./data.ts";
import { cardIcons } from "./icons.tsx";
import { Token, type Tokened } from "./party.tsx";

// From this width the rolls are a column beside the sheet, as in the style sheet.
const besideSheet = "(min-width: 900px)";

export function RollLog({ rolls, party, fresh }: { rolls: ShownRoll[]; party: Member[]; fresh: Set<string>; })
{
    const lead = party.find((member) => member.role === "pc");
    const [chosen, toggle] = useOpen("Rolls");
    const beside = useMedia(besideSheet);
    const open = beside || chosen;
    const newest = rolls.at(-1);
    return (
        <aside class="rolls" aria-labelledby="rolls-title">
            <details class="rolls-card" open={open}>
                <CardHeader
                    icon={cardIcons.rolls}
                    title={<h2 id="rolls-title" class="rolls-title">Rolls</h2>}
                    preview={newest === undefined ? undefined : `${rollWhat(newest)} · ${newest.total}`}
                    open={open}
                    onToggle={toggle}
                    fixed={beside}
                />
                {rolls.length === 0
                    ? <p class="rolls-none">The checks the master asks of you come here, and the master's rolls you may see.</p>
                    : (
                        <ol class="roll-list">
                            {[...rolls].reverse().map((roll) => <RollRow key={roll.id} roll={roll} token={tokenOf(roll, party, lead)} fresh={fresh.has(roll.id)} />)}
                        </ol>
                    )}
            </details>
        </aside>
    );
}

/** One roll: whom it is for, by their token, for which check, its total, and its dice as the chat writes them. */
function RollRow({ roll, token, fresh }: { roll: ShownRoll; token?: Tokened; fresh: boolean; })
{
    const player = roll.by === "player";
    return (
        <li class={["roll", player ? "by-player" : "by-master", fresh ? "changed" : ""].filter((name) => name !== "").join(" ")} data-roll={roll.id}>
            {token === undefined ? <img class="roll-robot" src="/assets/favicon.svg" alt="" /> : <Token member={token} />}
            <span class="roll-what">
                <span class="visually-hidden">{player ? "Your roll: " : "The master's roll: "}</span>
                {rollWhat(roll)}
            </span>
            <span class="roll-total num">{roll.total}</span>
            <span class="roll-text">{roll.text}</span>
        </li>
    );
}

/** What a roll was: the check the player threw, or for whom; for whom the master threw it. */
function rollWhat(roll: ShownRoll): string
{
    return roll.by === "player" ? roll.check ?? roll.who ?? "" : roll.who ?? "the master";
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
