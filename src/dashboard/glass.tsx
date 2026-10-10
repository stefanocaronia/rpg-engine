// The glass over a token on a map (D-326): a low lens over the picture, which shows to the edge; never written into it. Its flat top takes the light in a
// band with a crisp edge, as flat glass does; at its rim the bevel is glass too, seen through: a little lighter at the top left, a little darker at the bottom
// right, a thin gleam where the light catches it. No border of its own; and the token's shadow falls on the paper.

/** The gradients, the rim's mask and the shadow of the glass, once in a drawing's defs, their ids starting with `prefix`. */
export function GlassDefs({ prefix }: { prefix: string; })
{
    return (
        <>
            <linearGradient id={`${prefix}-sheen`} x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" stop-color="#fff" stop-opacity="0.3" />
                <stop offset="0.44" stop-color="#fff" stop-opacity="0.08" />
                <stop offset="0.45" stop-color="#fff" stop-opacity="0" />
                <stop offset="0.6" stop-color="#fff" stop-opacity="0" />
                <stop offset="0.61" stop-color="#fff" stop-opacity="0.05" />
                <stop offset="0.68" stop-color="#fff" stop-opacity="0" />
            </linearGradient>
            <linearGradient id={`${prefix}-rim`} x1="0.15" y1="0.1" x2="0.85" y2="0.9">
                <stop offset="0" stop-color="#fff" stop-opacity="0.32" />
                <stop offset="0.45" stop-color="#fff" stop-opacity="0" />
                <stop offset="0.55" stop-color="#000" stop-opacity="0" />
                <stop offset="1" stop-color="#000" stop-opacity="0.26" />
            </linearGradient>
            <radialGradient id={`${prefix}-rim-fade`}>
                <stop offset="0.8" stop-color="#fff" stop-opacity="0" />
                <stop offset="0.88" stop-color="#fff" stop-opacity="1" />
            </radialGradient>
            <mask id={`${prefix}-rim-mask`} maskContentUnits="objectBoundingBox">
                <circle cx="0.5" cy="0.5" r="0.5" fill={`url(#${prefix}-rim-fade)`} />
            </mask>
            <filter id={`${prefix}-drop`} x="-40%" y="-40%" width="180%" height="180%">
                <feDropShadow dx="0" dy="1.5" stdDeviation="1.3" flood-color="#2a1d10" flood-opacity="0.5" />
            </filter>
        </>
    );
}

/** The glass over a token of radius `r` centred at x, y: its flat top's sheen, the bevel seen through at its rim, the gleam at the top left. */
export function Glass({ x = 0, y = 0, r, prefix }: { x?: number; y?: number; r: number; prefix: string; })
{
    const bevel = Math.max(1.4, r * 0.17);

    const arc = (radius: number, from: number, to: number): string => {
        const point = (angle: number): string => `${(x + radius * Math.cos(angle * Math.PI / 180)).toFixed(2)} ${(y + radius * Math.sin(angle * Math.PI / 180)).toFixed(2)}`;
        return `M${point(from)}A${radius} ${radius} 0 0 1 ${point(to)}`;
    };

    return (
        <g class="glass" pointer-events="none">
            <circle cx={x} cy={y} r={r} fill={`url(#${prefix}-sheen)`} />
            <circle cx={x} cy={y} r={r} fill={`url(#${prefix}-rim)`} mask={`url(#${prefix}-rim-mask)`} />
            <path d={arc(r - bevel * 0.45, 170, 285)} fill="none" stroke="#fff" stroke-opacity={0.35} stroke-width={Math.max(0.8, bevel * 0.35)} stroke-linecap="round" />
            <path d={arc(r - bevel * 0.45, 200, 255)} fill="none" stroke="#fff" stroke-opacity={0.7} stroke-width={Math.max(0.8, bevel * 0.35)} stroke-linecap="round" />
        </g>
    );
}
