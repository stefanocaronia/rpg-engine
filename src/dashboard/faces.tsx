// The dice of a roll as chips (D-284, D-292): each with its picture and its face, a dropped one empty, a reroll's first face struck out, an explosion's faces
// added, a dF as −, 0 or +, a rare face in its colour; then the number added. The plate shows them large, the rolls small.
import type { ThrownDie, Tone } from "./data.ts";
import { rareFace } from "./dice/models.ts";
import { DieIcon } from "./icons.tsx";
import { signed } from "./labels.ts";

/** The dice as chips; with how each turned out, when a package's roll says it, a good one green and a bad one red (D-507). */
export function DiceFaces({ dice, modifier, className, tones }: { dice: ThrownDie[]; modifier: number; className?: string; tones?: (Tone | null)[] | undefined; })
{
    const toned = tones !== undefined && tones.length === dice.length;
    return (
        <ol class={className === undefined ? "dice-faces" : `dice-faces ${className}`} aria-hidden="true">
            {dice.map((die, index) => <DieChip key={index} die={die} tone={toned ? tones[index] ?? undefined : undefined} />)}
            {modifier !== 0 && <li class="die-modifier">{signed(modifier)}</li>}
        </ol>
    );
}

function DieChip({ die, tone }: { die: ThrownDie; tone?: Tone | undefined; })
{
    const rare = rareFace(die);
    const faces = die.faces !== undefined && die.faces.length > 1 ? die.faces.map((value) => faceText(die.sides, value)).join("+") : faceText(die.sides, die.value);
    return (
        <li class={["die-chip", die.dropped === true ? "dropped" : "", rare === undefined ? "" : `rare-${rare}`, tone === undefined ? "" : `tone-${tone}`].filter((name) => name !== "").join(" ")}>
            <DieIcon sides={die.sides} />
            <span>
                {die.rerolledFrom !== undefined && (
                    <>
                        <s>{faceText(die.sides, die.rerolledFrom)}</s>→
                    </>
                )}
                {faces}
            </span>
        </li>
    );
}

/** A face as a chip shows it: a number, or a dF's −, 0 and +. */
function faceText(sides: number | "F", value: number): string
{
    return sides === "F" ? (value < 0 ? "−" : value > 0 ? "+" : "0") : String(value);
}
