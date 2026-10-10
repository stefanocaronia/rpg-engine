// The glass over a token on a map (Stefano, 10 October): a bevelled dome, as on a game's cardboard token under a lens; the light from the top left, its rim
// darker, a gleam, a bevel round the edge, and its shadow on the paper.

/** The gradients and the shadow of the glass, once in a drawing's defs, their ids starting with `prefix`. */
export function GlassDefs({ prefix }: { prefix: string; })
{
    return (
        <>
            <radialGradient id={`${prefix}-glass`} cx="0.38" cy="0.3" r="0.78">
                <stop offset="0" stop-color="#fff" stop-opacity="0.5" />
                <stop offset="0.38" stop-color="#fff" stop-opacity="0.1" />
                <stop offset="0.72" stop-color="#fff" stop-opacity="0" />
                <stop offset="1" stop-color="#000" stop-opacity="0.3" />
            </radialGradient>
            <linearGradient id={`${prefix}-gleam`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stop-color="#fff" stop-opacity="0.85" />
                <stop offset="1" stop-color="#fff" stop-opacity="0" />
            </linearGradient>
            <linearGradient id={`${prefix}-bevel`} x1="0.15" y1="0.1" x2="0.85" y2="0.9">
                <stop offset="0" stop-color="#fff" stop-opacity="0.9" />
                <stop offset="0.45" stop-color="#fff" stop-opacity="0.15" />
                <stop offset="1" stop-color="#000" stop-opacity="0.5" />
            </linearGradient>
            <filter id={`${prefix}-drop`} x="-40%" y="-40%" width="180%" height="180%">
                <feDropShadow dx="0" dy="1.5" stdDeviation="1.3" flood-color="#2a1d10" flood-opacity="0.5" />
            </filter>
        </>
    );
}

/** The glass over a token of radius `r` centred at x, y: the dome's light, a gleam at the top left, the bevel round its rim. */
export function Glass({ x = 0, y = 0, r, prefix }: { x?: number; y?: number; r: number; prefix: string; })
{
    return (
        <g class="glass" pointer-events="none">
            <circle cx={x} cy={y} r={r} fill={`url(#${prefix}-glass)`} />
            <ellipse cx={x - r * 0.18} cy={y - r * 0.48} rx={r * 0.52} ry={r * 0.28} fill={`url(#${prefix}-gleam)`} opacity={0.75} />
            <circle cx={x} cy={y} r={r - 0.9} fill="none" stroke={`url(#${prefix}-bevel)`} stroke-width={1.8} />
        </g>
    );
}
