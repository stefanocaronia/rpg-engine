// The dice of a roll as chips (D-284, D-292): each with its picture and its face, a dropped one empty, a reroll's first face struck out, an explosion's faces
// added, a dF as −, 0 or +, a rare face in its colour; then the number added. The plate shows them large, the rolls small. The coins of a toss as the coin
// shows them, the sun or the moon on the gold (D-524 (1)).
import type { ThrownDie, Tone } from "./data.ts";
import { rareFace } from "./dice/models.ts";
import { DieIcon } from "./icons.tsx";
import { signed } from "./labels.ts";
import { t } from "./text.ts";

/** A coin's face, as the log keeps it (COIN-3). */
export type CoinSide = "heads" | "tails";

/** The coins of a toss in the page's language, in the order they fell: "heads, tails". */
export function tossWords(toss: readonly CoinSide[]): string
{
    return toss.map((side) => (side === "heads" ? t("heads") : t("tails"))).join(", ");
}

/** The coins of a toss as pictures, each its face: the dark sun on the gold for heads, the gold moon on the dark for tails; their words are said beside them. */
export function CoinFaces({ toss, className }: { toss: readonly CoinSide[]; className?: string; })
{
    return (
        <ol class={className === undefined ? "coin-faces" : `coin-faces ${className}`} aria-hidden="true">
            {toss.map((side, index) => (
                <li key={index}>
                    <CoinFace side={side} />
                </li>
            ))}
        </ol>
    );
}

/** One face of the coin, on a grid of 24, as make-coin.py draws it: the rim, the field sunk in it, and its picture. */
export function CoinFace({ side }: { side: CoinSide; })
{
    return (
        <svg class={`coin-face ${side}`} viewBox="0 0 24 24" aria-hidden="true">
            <circle class="coin-rim" cx="12" cy="12" r="11" />
            {side === "heads"
                ? (
                    <>
                        <circle class="coin-field" cx="12" cy="12" r="9.4" />
                        <path class="coin-picture" d={sunPath} />
                    </>
                )
                : (
                    <>
                        <circle class="coin-field" cx="12" cy="12" r="9.4" />
                        <circle class="coin-picture" cx="10.6" cy="12" r="6.3" />
                        <circle class="coin-field" cx="13.1" cy="11" r="5.5" />
                        <path class="coin-picture" d={starsPath} />
                    </>
                )}
        </svg>
    );
}

// The sun: a disc and sixteen rays, long and short in turn, the first upward; the moon's two stars, five points each. As make-coin.py, on the coin's 11.
const sunPath = [
    "M12 8.6a3.4 3.4 0 1 0 0 6.8a3.4 3.4 0 1 0 0-6.8Z",
    ...Array.from({ length: 16 }, (_, ray) => {
        const angle = Math.PI / 2 + (2 * Math.PI * ray) / 16;
        const half = ((ray % 2 === 0 ? 7 : 6) * Math.PI) / 180;
        const length = ray % 2 === 0 ? 8 : 6.5;
        const at = (radius: number, turn: number): string => `${(12 + radius * Math.cos(turn)).toFixed(2)} ${(12 - radius * Math.sin(turn)).toFixed(2)}`;
        return `M${at(4.1, angle - half)}L${at(length, angle)}L${at(4.1, angle + half)}Z`;
    }),
].join(" ");

const starsPath = [[16.5, 9.25, 1.65], [15.4, 15.6, 1.1]].map(([x, y, outer]) =>
    `M${
        Array.from({ length: 10 }, (_, point) => {
            const radius = point % 2 === 0 ? outer : outer * 0.42;
            const turn = Math.PI / 2 + (Math.PI * point) / 5;
            return `${(x + radius * Math.cos(turn)).toFixed(2)} ${(y - radius * Math.sin(turn)).toFixed(2)}`;
        }).join("L")
    }Z`
).join(" ");

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
