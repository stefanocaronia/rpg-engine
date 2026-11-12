// The paper of the place's map: the size of a square, its patterns and filters, the ground of a square, difficult ground, the doors and where squares lead.
import type { ComponentChildren } from "preact";
import type { ShownGrid } from "../data.ts";
import { isSolid, kindAt, type Square, squareName } from "./map.ts";

// How wide a square is drawn, in pixels.
export const size = 40;

/** The patterns and filters of the map: Dyson's hatching in bundles, the grounds' textures, the ink's tremble, the washes, the soft edge. */
export function Patterns()
{
    let seed = 11;

    const random = (): number => {
        seed = (seed * 16807) % 2147483647;
        return seed / 2147483647;
    };

    const bundles = Array.from(
        { length: 36 },
        (_, index) => ({ x: (index % 6) * 16 + 8 + (random() - 0.5) * 5, y: Math.floor(index / 6) * 16 + 8 + (random() - 0.5) * 5, turn: Math.round(random() * 180), lengths: [0, 1, 2, 3].map(() => 6 + random() * 2.5) }),
    );
    return (
        <>
            <pattern id="lm-hatch" width={96} height={96} patternUnits="userSpaceOnUse">
                {bundles.map((bundle, index) => (
                    <g key={index} transform={`translate(${bundle.x.toFixed(1)} ${bundle.y.toFixed(1)}) rotate(${bundle.turn})`}>
                        {[-3.6, -1.2, 1.2, 3.6].map((offset, line) => <line key={line} class="lm-hatch-line" x1={-bundle.lengths[line]} y1={offset} x2={bundle.lengths[line]} y2={offset} />)}
                    </g>
                ))}
            </pattern>
            <pattern id="lm-cobbles" width={20} height={20} patternUnits="userSpaceOnUse">
                <rect class="lm-paving" width={20} height={20} />
                {[[1, 1, 8], [10, 1, 9], [1, 11, 5], [7, 11, 7], [15, 11, 4]].map(([x, y, w], index) => <rect key={index} class="lm-cobble" x={x} y={y} width={w} height={8} rx={2.5} />)}
            </pattern>
            <pattern id="lm-grass" width={46} height={46} patternUnits="userSpaceOnUse">
                <rect class="lm-meadow" width={46} height={46} />
                {[[8, 12], [30, 6], [20, 30], [40, 36], [4, 40]].map(([x, y], index) => <path key={index} class="lm-tuft" d={`M${x - 3} ${y}l1.5 -4M${x} ${y}v-5M${x + 3} ${y}l-1.5 -4`} />)}
            </pattern>
            <pattern id="lm-speckle" width={30} height={30} patternUnits="userSpaceOnUse">
                <rect class="lm-rockfloor" width={30} height={30} />
                {[[5, 7, 1.1], [19, 4, 0.8], [12, 18, 1.3], [26, 22, 0.9], [4, 26, 0.7], [22, 13, 0.6]].map(([x, y, r], index) => <circle key={index} class="lm-dot" cx={x} cy={y} r={r} />)}
            </pattern>
            <filter id="lm-ink" x="-5%" y="-5%" width="110%" height="110%">
                <feTurbulence type="fractalNoise" baseFrequency="0.05" numOctaves={2} seed={7} />
                <feDisplacementMap in="SourceGraphic" scale={2.6} />
            </filter>
            <filter id="lm-wash" x="-20%" y="-20%" width="140%" height="140%">
                <feTurbulence type="fractalNoise" baseFrequency="0.09" numOctaves={2} seed={3} result="noise" />
                <feDisplacementMap in="SourceGraphic" in2="noise" scale={9} result="moved" />
                <feGaussianBlur in="moved" stdDeviation={1.6} />
            </filter>
            <filter id="lm-blur" x="-10%" y="-10%" width="120%" height="120%">
                <feGaussianBlur stdDeviation={4} />
            </filter>
            <filter id="lm-soft" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation={size * 0.45} />
            </filter>
        </>
    );
}

/** The mark of difficult ground: a fold in the square's corner, so that colour is never the only sign (D-325). */
export function Corner({ x, y, side }: { x: number; y: number; side: number; })
{
    return <path class="lm-corner" d={`M${x + 1} ${y + 1}h${side * 0.3}l${-side * 0.3} ${side * 0.3}z`} />;
}

/** Ground drawn on its square, under the things: water, rubble, mud, brush, open ground, a road. */
export function Ground({ kind, x, y, side, seed }: { kind: string; x: number; y: number; side: number; seed: Square; })
{
    const turn = (seed.column * 7 + seed.row * 13) % 5;
    const at = (share: number): number => share * side / 40;
    let marks: ComponentChildren = null;

    if (kind.endsWith("water")) {
        marks = <path class="lm-wave" d={`M${x + at(8)} ${y + at(14 + turn)}q4 -4 8 0t8 0M${x + at(18)} ${y + at(28 - turn)}q4 -4 8 0t8 0`} />;
    } else if (kind === "rubble") {
        marks = [[10, 12, 4], [24, 9, 3], [30, 24, 5], [14, 28, 3.5], [22, 19, 2.5]].map(([px, py, r], index) => <path key={index} class="lm-pebble" d={pebble(x + at((px + turn * 3) % 34 + 3), y + at(py), at(r))} />);
    } else if (kind === "brush" || kind === "ground") {
        marks = (kind === "brush" ? [[10, 14], [26, 10], [18, 28], [31, 27]] : [[12, 16], [28, 30]]).map(([px, py], index) => (
            <path key={index} class="lm-tuft" d={`M${x + at(px) - 4} ${y + at(py)}l2 -5M${x + at(px)} ${y + at(py)}v-6M${x + at(px) + 4} ${y + at(py)}l-2 -5`} />
        ));
    } else if (kind === "road") {
        marks = <path class="lm-rut" d={`M${x} ${y + side * 0.3}h${side}M${x} ${y + side * 0.7}h${side}M${x + side * 0.3} ${y}v${side}M${x + side * 0.7} ${y}v${side}`} />;
    } else if (kind === "mud") {
        marks = <path class="lm-wave" d={`M${x + at(8)} ${y + at(16)}q3 3 6 0t6 0M${x + at(18)} ${y + at(28)}q3 3 6 0t6 0`} />;
    }

    return (
        <g class={`lm-ground-${kind}`}>
            <rect class="lm-ground-fill" x={x} y={y} width={side} height={side} filter="url(#lm-wash)" />
            {marks}
        </g>
    );
}

/** A door: its leaf across the gap in the wall, along the wall it is in; open, swung; secret and found, dashed. */
export function Door({ kind, name, square, map, x, y }: { kind: string; name: string; square: Square; map: ShownGrid; x: number; y: number; })
{
    const closed = (column: number, row: number): boolean => isSolid(map, { column, row }) || kindAt(map, { column, row }) === "building";
    const across = closed(square.column - 1, square.row) && closed(square.column + 1, square.row);
    const leaf = across ? { x: x + 2, y: y + size * 0.38, width: size - 4, height: size * 0.24 } : { x: x + size * 0.38, y: y + 2, width: size * 0.24, height: size - 4 };
    return (
        <g class={`lm-door ${kind}`}>
            <title>{`${name}, ${squareName(square)}`}</title>
            {kind === "open-door"
                ? (
                    <path
                        class="lm-door-swing"
                        d={across ? `M${x + 2} ${y + size / 2}A${size - 4} ${size - 4} 0 0 1 ${x + size - 2} ${y - size / 2 + 4}` : `M${x + size / 2} ${y + 2}A${size - 4} ${size - 4} 0 0 0 ${x + size + size / 2 - 4} ${y + size - 2}`}
                    />
                )
                : <rect {...leaf} class={kind === "secret-door" ? "lm-door-leaf secret" : "lm-door-leaf"} />}
        </g>
    );
}

/** Where a square leads: on the map's edge an arrow out of it and the place's name, as the world goes on there; inside, the name over the door. */
export function Exit({ side, to, x, y, letters }: { side: string; to?: string; x: number; y: number; letters: number; })
{
    if (side === "inside") {
        return to === undefined ? null : <text class="lm-exit-name inside" x={x} y={y - size / 2 - 8} text-anchor="middle">{to}</text>;
    }

    const [dx, dy] = side === "bottom" ? [0, 1] : side === "top" ? [0, -1] : side === "left" ? [-1, 0] : [1, 0];
    // Past the squares' names on the top and the left.
    const skip = side === "top" || side === "left" ? 22 : 0;
    const [sx, sy] = [x + dx * (size * 0.5 + skip), y + dy * (size * 0.5 + skip)];
    const [ex, ey] = [sx + dx * 16, sy + dy * 16];
    return (
        <g class="lm-exit">
            <path d={`M${sx} ${sy}L${ex} ${ey}M${ex - dy * 5 - dx * 5} ${ey - dx * 5 - dy * 5}L${ex} ${ey}L${ex + dy * 5 - dx * 5} ${ey + dx * 5 - dy * 5}`} />
            {to !== undefined && (dx === 0
                ? <text class="lm-exit-name" x={ex} y={ey + dy * 15} text-anchor="middle" dominant-baseline="middle" font-size={letters}>{to}</text>
                : <text class="lm-exit-name" x={ex + dx * 12} y={ey} text-anchor="middle" dominant-baseline="middle" font-size={letters} transform={`rotate(${dx < 0 ? -90 : 90} ${ex + dx * 12} ${ey})`}>{to}</text>)}
        </g>
    );
}

/** A pebble of rubble. */
function pebble(x: number, y: number, r: number): string
{
    return `M${x - r} ${y}l${r * 0.6} ${-r * 0.9}l${r} ${r * 0.2}l${r * 0.4} ${r}l${-r * 0.9} ${r * 0.6}z`;
}
