// A roll the player may see, in one line of the chat (D-582): who rolled, small, the player's character by their portrait, the master by the robot; the
// die; for whom and what; and the result in a pill, the total in evidence. The dice one by one are in its tooltip and for a screen reader: the roll's
// card is the Rolls section's alone. No colour of success or failure: the engine does not know it.
import type { Member, ShownRoll } from "../data.ts";
import { tossWords } from "../parts/faces.tsx";
import { rollWho } from "../play/rolls.tsx";
import { Token } from "../sheet/party.tsx";
import { capitalized, t } from "../text.ts";
import { rollLine } from "./chat.ts";
import { FirstDie } from "./drawn-marks.tsx";

export function ChatRollLine({ roll, party, several }: { roll: ShownRoll; party: Member[]; several: boolean; })
{
    const who = rollWho(roll, party, several);
    const player = roll.by === "player";
    const line = rollLine(roll, who.name, roll.toss === undefined ? undefined : capitalized(tossWords(roll.toss)));
    return (
        <li class={player ? "chat-message from-roll by-player" : "chat-message from-roll by-master"} title={line.detail}>
            {/* The master's own token for every roll of theirs, whomever it is for: who rolled, not for whom. */}
            {!player || who.token === undefined || who.token === "die" ? <img class="chat-roll-robot" src="/assets/favicon.svg" alt="" /> : <Token member={who.token} />}
            {roll.toss === undefined && <FirstDie notation={roll.notation} />}
            <span class="chat-roll-what" dir="auto">
                <span class="visually-hidden">{`${player ? (several ? t("The players' roll:") : t("Your roll:")) : t("The master's roll:")} `}</span>
                {line.what}
            </span>
            <b class="chat-roll-result">{line.result}</b>
            <span class="visually-hidden">{line.detail}</span>
        </li>
    );
}
