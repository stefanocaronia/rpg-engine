// Who stands where on the place's map, as coins: their picture or mark under glass, the pip of their side, a stranger's number, the pip of their state.
import type { ShownGrid } from "../data.ts";
import { Glass } from "../parts/glass.tsx";
import { strangerLabel } from "../parts/labels.ts";
import { type PersonState, statusMarks, statusWords } from "../parts/status.tsx";
import { type Side, sideIcons, sideOf } from "../sheet/party.tsx";
import { conditionsPref, tokenSymbolsPref, useChoice, usePref } from "../shell/prefs.ts";
import { size } from "./paper.tsx";

/**
 * Someone on the map, as a coin (D-409): their picture to its edge, or a stranger's number, as Creature 2's, or the hood, under glass, its edge bevelled, lit
 * above and shaded below, its shadow low on the paper; no ring of a side. Whoever acts is raised off the paper, a little larger, its shadow wide and soft (D-419); a foe the master marked glows
 * red a little (D-415); one of the party has the pip of their side at the lower left, with their class's symbol or the side's (D-414); anyone the pip of
 * their state at the lower right, and its words in the token's title (D-419).
 */
export function Token(
    { one, index, acting, hostile, x, y, scale, choice }: {
        one: Standing;
        index: number;
        acting: boolean;
        hostile: boolean;
        x: number;
        y: number;
        scale: number;
        /** A token touched to choose them, or to talk to them (D-495), ringed when chosen. */
        choice?: { chosen: boolean; onChoose(): void; };
    },
)
{
    const [symbols] = usePref(tokenSymbolsPref);
    const side = one.side ?? 1;
    const r = size * side * 0.43;
    const number = one.stranger ? /[A-Z]?\d+$/.exec(one.name)?.[0] : undefined;
    const pip = symbols ? sideOf(one.role) : undefined;
    // On a map shown small, as on a phone, the marks grow to stay readable, each toward the token's middle by as much as it grows, its paper too, so that the
    // box round it keeps its outer edges and two tokens side by side keep their marks apart as at full size.
    const grow = Math.min(1.4, Math.max(1, 0.65 / scale));
    // The two pips below share the square's width with their neighbours' on either side: past 1.12 the player's character's, gold-ringed, would touch the
    // state's pip, on the token or the next one; the number, alone above, grows on.
    const below = Math.min(grow, 1.12);
    const inward = (radius: number, paper: number, by = below): number => (by - 1) * (radius + paper);
    const pipPaper = pip === "you" ? 3 : 1.5;
    return (
        // Whoever acts grows from the middle of their square, which stays where it is seen from above.
        <g
            class={["lm-token", one.role, acting ? "acting" : "", fallenOf(one), choice === undefined ? "" : "choosable", choice?.chosen === true ? "chosen" : ""].filter((name) => name !== "").join(" ")}
            style={acting ? { transformOrigin: `${x}px ${y}px` } : undefined}
            onClick={choice?.onChoose}
        >
            <title>{[`${one.stranger ? strangerLabel(one.name) : one.name}, ${one.square}`, ...statusWords(one)].join(" · ")}</title>
            {hostile && (
                <>
                    <circle class="lm-hostile-glow" cx={x} cy={y} r={r + 7} fill="url(#lm-hostile-glow)" />
                    <circle class="lm-hostile" cx={x} cy={y} r={r + 2.4} />
                </>
            )}
            {choice !== undefined && <circle class="lm-choice" cx={x} cy={y} r={r + 4} />}
            {/* A token under glass, its shadow on the paper. */}
            <g filter="url(#lm-drop)">
                <circle class="lm-disc" cx={x} cy={y} r={r} />
                {/* The coin's dark edge, under the picture: seen only where there is none. */}
                <circle class="lm-ring" cx={x} cy={y} r={r - 0.5} />
                {one.image
                    ? <image href={`/images/${encodeURIComponent(one.image.file)}?v=${one.image.version}`} x={x - r} y={y - r} width={r * 2} height={r * 2} clip-path={`url(#lm-token-${index})`} />
                    : (
                        // The mark grows with the token, a large creature's too.
                        <g transform={`translate(${x} ${y}) scale(${side})`}>
                            {number !== undefined
                                ? <text class="lm-number" y={1} text-anchor="middle" dominant-baseline="middle">{number}</text>
                                : one.stranger
                                ? <path class="lm-stranger" d="M12 3c-4 0-6.5 3.5-6.5 8v3.5L4 20.5h16l-1.5-6V11c0-4.5-2.5-8-6.5-8Z" transform="translate(-10.8 -11) scale(0.9)" />
                                : <text class="lm-number" y={1} text-anchor="middle" dominant-baseline="middle">{one.name.slice(0, 1).toUpperCase()}</text>}
                        </g>
                    )}
                <Glass x={x} y={y} r={r} prefix="lm" />
                <path class="lm-bevel-lit" d={crescent(x, y, r, 1.5)} />
                <path class="lm-bevel-shade" d={crescent(x, y, r, -1.5)} />
            </g>
            {pip !== undefined && <MapPip side={pip} icon={one.stranger ? undefined : one.icon} x={x - r * 0.725 + inward(pipRadius, pipPaper)} y={y + r * 0.725 - inward(pipRadius, pipPaper)} grow={below} />}
            {one.image !== undefined && number !== undefined && <MapNumber number={number} x={x + r * 0.725 - inward(numberRadius, 1.5, grow)} y={y - r * 0.725 + inward(numberRadius, 1.5, grow)} grow={grow} />}
            {/* Further in than the side's pip, so that two tokens side by side keep a pixel between their pips, the player's character's gold-ringed one too. */}
            <MapStatus one={one} x={x + r * 0.56 - inward(statusRadius, 1.5)} y={y + r * 0.56 - inward(statusRadius, 1.5)} grow={below} />
        </g>
    );
}

/** Someone on the map with what a widget on them says: dead by its rules too. */
export function standingOf(one: ShownGrid["at"][number], person: PersonState | undefined): Standing
{
    return { ...one, party: one.role !== "other", person, ...(person?.dead === true ? { dead: true as const } : {}) };
}

/** Someone on the map, with whether they are of the party and what a package's widget on them says of their state (D-461, D-516). */
type Standing = ShownGrid["at"][number] & { party?: boolean; person?: PersonState | undefined; };

/** At 0 a token greyed, until its counter rises again; dead, greyer and faded, as in the party's strip (D-461). */
function fallenOf(one: Standing): string
{
    return one.dead === true ? "dead" : one.down === true ? "fallen" : "";
}

// The marks on a token as on one of 40 pixels on the page: the side's pip of 17, the state's of 12, a number's coin 13 high.
const pipRadius = size * 0.43 * (17 / 40);
const statusRadius = size * 0.43 * (12 / 40);
const numberRadius = size * 0.43 * (13 / 40);

/**
 * A token's pip on the map (D-414): as on the page, a disc of the side's colour with its symbol, ringed in the paper's colour; the same size for any creature,
 * larger by `grow` on a map shown small.
 */
function MapPip({ side, icon, x, y, grow }: { side: Side; icon: string | undefined; x: number; y: number; grow: number; })
{
    const radius = pipRadius * grow;
    // A symbol of 12 in the pip of 17.
    const scale = (radius * 2 * (12 / 17)) / 24;
    return (
        <g class={`lm-pip ${side}`} aria-hidden="true">
            <circle class="lm-pip-paper" cx={x} cy={y} r={radius + (side === "you" ? 3 : 1.5) * grow} />
            {side === "you" && <circle class="lm-pip-gold" cx={x} cy={y} r={radius + 1.5 * grow} />}
            <circle class="lm-pip-disc" cx={x} cy={y} r={radius} />
            <path class="lm-pip-symbol" d={icon ?? sideIcons[side]} transform={`translate(${x - 12 * scale} ${y - 12 * scale}) scale(${scale})`} />
        </g>
    );
}

/**
 * A stranger's number over their picture (D-420): as on the page, a small dark coin at the token's upper right, ringed in the paper's colour; wider for two
 * letters; larger by `grow` on a map shown small.
 */
function MapNumber({ number, x, y, grow }: { number: string; x: number; y: number; grow: number; })
{
    // Figures of 8.5 on the coin.
    const height = numberRadius * 2 * grow;
    const width = Math.max(height, (number.length * 6 + 4) * grow);
    return (
        <g class="lm-number-pip" aria-hidden="true" font-size={8.5 * grow}>
            <rect class="lm-pip-paper" x={x - width / 2 - 1.5 * grow} y={y - height / 2 - 1.5 * grow} width={width + 3 * grow} height={height + 3 * grow} rx={height / 2 + 1.5 * grow} />
            <rect class="lm-number-disc" x={x - width / 2} y={y - height / 2} width={width} height={height} rx={height / 2} />
            <text class="lm-number-small" x={x} y={y + 0.5 * grow} text-anchor="middle" dominant-baseline="middle">{number}</text>
        </g>
    );
}

/**
 * The pip of someone's state on the map (D-419): as on the page, smaller than the side's, a second coin behind when there are more; the same size for any
 * creature, larger by `grow` on a map shown small.
 */
function MapStatus({ one, x, y, grow }: { one: Standing; x: number; y: number; grow: number; })
{
    const [shown] = useChoice(conditionsPref);
    const marks = statusMarks(one);

    if (shown === "never" || marks.length === 0) {
        return null;
    }

    const radius = statusRadius * grow;
    const paper = 1.5 * grow;
    // A symbol of 9.6 in the pip of 12.
    const scale = (radius * 2 * (24 / 30)) / 24;
    // The second coin up more than out, within the token's square: a crescent of about 3 of the token's 40 past the paper round the first (D-420).
    const behind = { x: radius * 0.3, y: radius * 0.85 };
    const strong = marks[0].kind === "state";
    return (
        <g class={["lm-status", strong ? "strong" : "", marks[0].tone ?? "", shown === "hover" ? "on-hover" : ""].filter((name) => name !== "").join(" ")} aria-hidden="true">
            {marks.length > 1 && (
                <>
                    <circle class="lm-pip-paper" cx={x + behind.x} cy={y - behind.y} r={radius + paper} />
                    <circle class="lm-status-back" cx={x + behind.x} cy={y - behind.y} r={radius} />
                </>
            )}
            <circle class="lm-pip-paper" cx={x} cy={y} r={radius + paper} />
            <circle class="lm-status-disc" cx={x} cy={y} r={radius} />
            <path class={marks[0].filled ? "lm-status-symbol filled" : "lm-status-symbol"} d={marks[0].icon} transform={`translate(${x - 12 * scale} ${y - 12 * scale}) scale(${scale})`} />
        </g>
    );
}

/** The thin crescent a coin's bevel lights, from its top when `offset` is positive or shades at its bottom when negative: the circle less itself moved by it. */
function crescent(x: number, y: number, r: number, offset: number): string
{
    const half = Math.sqrt(r * r - (offset / 2) ** 2);
    const middle = y + offset / 2;
    const [outer, inner] = offset > 0 ? [1, 0] : [0, 1];
    return `M${x - half} ${middle}A${r} ${r} 0 1 ${outer} ${x + half} ${middle}A${r} ${r} 0 0 ${inner} ${x - half} ${middle}Z`;
}
