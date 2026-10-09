// How the robot reacts to a new roll, for a moment (D-305, 7): where the kept dice fall in their range, without what is added to them, as a master at the table
// reacts. For the party it marvels at the top, smiles when high, worries when low and is sorry at the bottom; for anyone else it grins when high and is
// disappointed when low, surprised by the very bottom. It never changes the master's mood.
import type { Moment, Mood, ShownRoll, ThrownDie } from "./data.ts";

/** Where the kept dice fall in their range: at the very top or bottom, or near them. */
export type RollReach = "top" | "high" | "low" | "bottom";

// Near the top or the bottom: within this share of the range, as 18–19 and 2–3 on a d20.
const near = 0.15;

const faces: Record<"party" | "others", Record<RollReach, Mood>> = {
    party: { top: "surprised", high: "happy", low: "worried", bottom: "sad" },
    others: { top: "mischievous", high: "mischievous", low: "sad", bottom: "surprised" },
};

/** The robot's moment for a new roll, or none when the roll is unremarkable; `party` names the party's members, whose rolls the robot cheers. */
export function rollReaction(roll: ShownRoll, party: string[]): Moment | undefined
{
    const reach = rollReach(roll.dice);

    if (reach === undefined) {
        return undefined;
    }

    const forParty = roll.who === undefined ? roll.by === "player" : party.includes(roll.who);
    return { id: `roll-${roll.id}`, mood: faces[forParty ? "party" : "others"][reach] };
}

/** Where the kept dice of a roll fall in their range; none for a roll without dice that can fall, or in the middle. */
export function rollReach(dice: ThrownDie[]): RollReach | undefined
{
    const kept = dice.filter((die) => !die.dropped);
    const least = kept.reduce((sum, die) => sum + (die.sides === "F" ? -1 : 1), 0);
    const most = kept.reduce((sum, die) => sum + (die.sides === "F" ? 1 : die.sides), 0);
    const total = kept.reduce((sum, die) => sum + die.value, 0);

    if (kept.length === 0 || most <= least) {
        return undefined;
    }

    // An exploded die can go past the top.
    const share = (total - least) / (most - least);
    return share >= 1 ? "top" : share <= 0 ? "bottom" : share >= 1 - near ? "high" : share <= near ? "low" : undefined;
}
