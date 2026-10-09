// The rolls the player may see (D-279), the newest first: theirs with their character's token, the master's shown ones with the robot and for whom; hidden
// rolls never come here.
import type { Member, ShownRoll } from "./data.ts";
import { Token } from "./party.tsx";

export function RollLog({ rolls, party, fresh }: { rolls: ShownRoll[]; party: Member[]; fresh: Set<string>; })
{
    const lead = party.find((member) => member.role === "pc");
    return (
        <aside class="rolls" aria-labelledby="rolls-title">
            <h2 id="rolls-title" class="rolls-title">Rolls</h2>
            {rolls.length === 0
                ? <p class="rolls-none">The checks the master asks of you come here, and the master's rolls you may see.</p>
                : (
                    <ol class="roll-list">
                        {[...rolls].reverse().map((roll) => <RollRow key={roll.id} roll={roll} member={party.find((member) => member.name === roll.who) ?? lead} fresh={fresh.has(roll.id)} />)}
                    </ol>
                )}
        </aside>
    );
}

/** One roll: who threw it, for whom or for which check, its total, and its dice as the chat writes them. */
function RollRow({ roll, member, fresh }: { roll: ShownRoll; member?: Member; fresh: boolean; })
{
    const player = roll.by === "player";
    const what = player ? roll.check ?? roll.who ?? "" : roll.who ?? "the master";
    return (
        <li class={["roll", player ? "by-player" : "by-master", fresh ? "changed" : ""].filter((name) => name !== "").join(" ")}>
            {!player ? <img class="roll-robot" src="/assets/favicon.svg" alt="" /> : member === undefined ? <span class="token pc" aria-hidden="true" /> : <Token member={member} />}
            <span class="roll-what">
                <span class="visually-hidden">{player ? "Your roll: " : "The master's roll: "}</span>
                {what}
            </span>
            <span class="roll-total num">{roll.total}</span>
            <span class="roll-text">{roll.text}</span>
        </li>
    );
}
