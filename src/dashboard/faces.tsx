// The dice of a roll as chips (D-284, D-292): each with its picture and its face, a dropped one empty, a reroll's first face struck out, an explosion's faces
// added, a dF as −, 0 or +, a rare face in its colour; then the number added. The plate shows them large, the rolls small. The coins of a toss as the coin
// shows them, in the design, the metal or the dice's material the player chose, or the master's dice's (D-524 (1), D-526).
import { useId } from "preact/hooks";
import type { ThrownDie, Tone } from "./data.ts";
import { coinPictures } from "./dice/coin-pictures.ts";
import { rareFace } from "./dice/models.ts";
import { coinDesignPref, coinLook, type DiceLook, texturePath } from "./dice/sets.ts";
import { DieIcon } from "./icons.tsx";
import { signed } from "./labels.ts";
import { readChoice } from "./prefs.ts";
import { t } from "./text.ts";

/** A coin's face, as the log keeps it (COIN-3). */
export type CoinSide = "heads" | "tails";

/** The coins of a toss in the page's language, in the order they fell: "heads, tails". */
export function tossWords(toss: readonly CoinSide[]): string
{
    return toss.map((side) => (side === "heads" ? t("heads") : t("tails"))).join(", ");
}

/**
 * The coins of a toss as pictures, each its face: for heads the sun in the ink on the coin's body, for tails the moon in the body on a field of the ink; their
 * words are said beside them. In the look given, by default the player's coins'.
 */
export function CoinFaces({ toss, className, look }: { toss: readonly CoinSide[]; className?: string; look?: DiceLook; })
{
    const shown = look ?? coinLook();
    return (
        <ol class={className === undefined ? "coin-faces" : `coin-faces ${className}`} aria-hidden="true">
            {toss.map((side, index) => (
                <li key={index}>
                    <CoinFace side={side} look={shown} />
                </li>
            ))}
        </ol>
    );
}

/**
 * One face of the coin, on a grid of 24, as make-coin.py draws it: the rim, the field sunk in it, and its picture, part by part; of the design and in the look
 * given, by default the player's.
 */
export function CoinFace({ side, look = coinLook(), design = readChoice(coinDesignPref) }: { side: CoinSide; look?: DiceLook; design?: string; })
{
    // A clear die's body is its reflections: its picture in Settings stands for it. A grain is laid on the body, as on the die.
    const body = look.swatch ?? look.body;
    // Each face its own grain: a pattern another face holds may be in a part not drawn, as the plate's twin measured unseen.
    const own = useId();
    const grain = look.finish.texture === undefined ? undefined : `coin-grain-${own}`;
    const metal = grain === undefined ? body : `url(#${grain})`;
    const [field, picture] = side === "heads" ? [metal, look.ink] : [look.ink, metal];
    const parts = (coinPictures[design] ?? coinPictures.sun)[side];
    return (
        <svg class={`coin-face ${side}`} viewBox="0 0 24 24" aria-hidden="true">
            {grain !== undefined && look.finish.texture !== undefined && (
                <defs>
                    <pattern id={grain} patternUnits="userSpaceOnUse" width="24" height="24">
                        <image href={texturePath(look.finish.texture)} width="48" height="48" x="-12" y="-12" />
                    </pattern>
                </defs>
            )}
            <circle class="coin-rim" cx="12" cy="12" r="11" fill={metal} stroke={darker(body, 0.45)} />
            <circle class="coin-field" cx="12" cy="12" r="9.5" fill={field} stroke={side === "heads" ? darker(body, 0.25) : "none"} />
            {/* A part cut back from the picture is drawn over it in the field's colour, as the coin's relief is cut. */}
            {parts.map(([step, outline], index) => <path key={index} class={step === "add" ? "coin-picture" : "coin-field"} d={outline} fill={step === "add" ? picture : field} />)}
        </svg>
    );
}

/** A colour of the form #rrggbb, darker by the share given. */
function darker(colour: string, share: number): string
{
    const parts = [1, 3, 5].map((start) => Math.round(Number.parseInt(colour.slice(start, start + 2), 16) * (1 - share)));
    return `#${parts.map((part) => part.toString(16).padStart(2, "0")).join("")}`;
}

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
