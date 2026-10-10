// The glass over a token on a map (Stefano, 10 October): a low lens with bevelled edges, as a button, not a dome. Its flat top takes the light in a band
// with a crisp edge, as flat glass does; its chamfer is lit at the top left and shaded at the bottom right, its inner edge the other way; and the token's
// shadow falls on the paper.

/** The gradients and the shadow of the glass, once in a drawing's defs, their ids starting with `prefix`. */
export function GlassDefs({ prefix }: { prefix: string; })
{
    return (
        <>
            <linearGradient id={`${prefix}-sheen`} x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" stop-color="#fff" stop-opacity="0.34" />
                <stop offset="0.44" stop-color="#fff" stop-opacity="0.1" />
                <stop offset="0.45" stop-color="#fff" stop-opacity="0" />
                <stop offset="0.6" stop-color="#fff" stop-opacity="0" />
                <stop offset="0.61" stop-color="#fff" stop-opacity="0.06" />
                <stop offset="0.68" stop-color="#fff" stop-opacity="0" />
            </linearGradient>
            <linearGradient id={`${prefix}-bevel`} x1="0.15" y1="0.1" x2="0.85" y2="0.9">
                <stop offset="0" stop-color="#fff" stop-opacity="0.95" />
                <stop offset="0.48" stop-color="#fff" stop-opacity="0.2" />
                <stop offset="0.56" stop-color="#000" stop-opacity="0.12" />
                <stop offset="1" stop-color="#000" stop-opacity="0.55" />
            </linearGradient>
            <linearGradient id={`${prefix}-edge`} x1="0.15" y1="0.1" x2="0.85" y2="0.9">
                <stop offset="0" stop-color="#000" stop-opacity="0.4" />
                <stop offset="0.5" stop-color="#000" stop-opacity="0" />
                <stop offset="1" stop-color="#fff" stop-opacity="0.75" />
            </linearGradient>
            <filter id={`${prefix}-drop`} x="-40%" y="-40%" width="180%" height="180%">
                <feDropShadow dx="0" dy="1.5" stdDeviation="1.3" flood-color="#2a1d10" flood-opacity="0.5" />
            </filter>
        </>
    );
}

/** The glass over a token of radius `r` centred at x, y: its flat top's sheen, its chamfer, the edge between them. */
export function Glass({ x = 0, y = 0, r, prefix }: { x?: number; y?: number; r: number; prefix: string; })
{
    const bevel = Math.max(1.4, r * 0.17);
    const top = r - bevel;
    return (
        <g class="glass" pointer-events="none">
            <circle cx={x} cy={y} r={top} fill={`url(#${prefix}-sheen)`} />
            <circle cx={x} cy={y} r={r - bevel / 2} fill="none" stroke={`url(#${prefix}-bevel)`} stroke-width={bevel} />
            <circle cx={x} cy={y} r={top} fill="none" stroke={`url(#${prefix}-edge)`} stroke-width={0.9} />
        </g>
    );
}
