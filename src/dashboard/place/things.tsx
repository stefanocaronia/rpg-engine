// The things of the place's legend, drawn by kind in their box: furniture, fire, stairs, trees, rocks, roofs and the rest.
import { Fragment } from "preact";
import { size } from "./paper.tsx";

/** A thing of the legend, by its kind (D-325), in its box; the kinds drawn one a square draw each of their squares. Any other is a box with its symbol. */
export function Thing({ kind, symbol, x, y, w, h, cells }: { kind: string; symbol: string; x: number; y: number; w: number; h: number; cells: number[][]; })
{
    const inset = (share: number) => ({ x: x + size * share, y: y + size * share, width: w - size * share * 2, height: h - size * share * 2 });
    const [cx, cy, small] = [x + w / 2, y + h / 2, Math.min(w, h)];
    const along = w >= h;

    switch (kind) {
        case "table":
            return <rect {...inset(0.14)} rx={5} class="lm-wood" />;
        case "counter":
            return (
                <>
                    <rect {...inset(0.12)} rx={2} class="lm-wood dark" />
                    <line x1={x + size * 0.2} y1={y + h - size * 0.32} x2={x + w - size * 0.2} y2={y + h - size * 0.32} class="lm-detail" />
                </>
            );
        case "seat":
            return <rect {...inset(0.3)} rx={3} class="lm-wood" />;

        case "bed": {
            const box = inset(0.1);
            return (
                <>
                    <rect {...box} rx={3} class="lm-cloth" />
                    <rect x={box.x + 4} y={box.y + 4} width={box.width - 8} height={Math.min(10, box.height / 4)} rx={3} class="lm-paper-fill" />
                </>
            );
        }

        case "shelf": {
            const box = inset(0.1);
            return (
                <>
                    <rect {...box} class="lm-wood dark" />
                    {[0.25, 0.5, 0.75].map((share) => (
                        along
                            ? <line key={share} x1={box.x + box.width * share} y1={box.y} x2={box.x + box.width * share} y2={box.y + box.height} class="lm-detail" />
                            : <line key={share} x1={box.x} y1={box.y + box.height * share} x2={box.x + box.width} y2={box.y + box.height * share} class="lm-detail" />
                    ))}
                </>
            );
        }

        case "hearth":
            return (
                <>
                    <rect {...inset(0.06)} rx={3} class="lm-stone" />
                    <path class="lm-flame" d={flame(cx, cy + small * 0.24, small * 0.42)} />
                </>
            );
        case "fire":
            return (
                <>
                    <circle cx={cx} cy={cy} r={small * 0.34} class="lm-stone ring" />
                    <path class="lm-flame" d={flame(cx, cy + small * 0.17, small * 0.36)} />
                </>
            );
        case "barrel":
            return (
                <>
                    {cells.map(([cellX, cellY]) => (
                        <Fragment key={`${cellX} ${cellY}`}>
                            <circle cx={cellX + size / 2} cy={cellY + size / 2} r={size * 0.33} class="lm-wood" />
                            <circle cx={cellX + size / 2} cy={cellY + size / 2} r={size * 0.19} class="lm-detail" />
                        </Fragment>
                    ))}
                </>
            );
        case "crate":
            return (
                <>
                    {cells.map(([cellX, cellY]) => (
                        <Fragment key={`${cellX} ${cellY}`}>
                            <rect x={cellX + 6} y={cellY + 6} width={size - 12} height={size - 12} class="lm-wood" />
                            <path d={`M${cellX + 6} ${cellY + 6}L${cellX + size - 6} ${cellY + size - 6}M${cellX + size - 6} ${cellY + 6}L${cellX + 6} ${cellY + size - 6}`} class="lm-detail" />
                        </Fragment>
                    ))}
                </>
            );

        case "stairs": {
            const box = inset(0.05);
            const steps = Math.max(4, Math.round((along ? box.width : box.height) / 8));
            return (
                <>
                    <rect {...box} class="lm-paper-fill" />
                    {Array.from({ length: steps - 1 }, (_, step) => {
                        const share = (step + 1) / steps;
                        return along
                            ? <line key={step} x1={box.x + box.width * share} y1={box.y} x2={box.x + box.width * share} y2={box.y + box.height} class="lm-detail" />
                            : <line key={step} x1={box.x} y1={box.y + box.height * share} x2={box.x + box.width} y2={box.y + box.height * share} class="lm-detail" />;
                    })}
                </>
            );
        }

        case "ladder":
            return (
                <path
                    class="lm-detail strong"
                    d={`M${cx - 7} ${y + 5}V${y + h - 5}M${cx + 7} ${y + 5}V${y + h - 5}${Array.from({ length: Math.max(1, Math.round(h / 8) - 1) }, (_, rung) => `M${cx - 7} ${y + 8 + rung * 8}h14`).join("")}`}
                />
            );

        case "trapdoor": {
            const box = inset(0.12);
            return (
                <>
                    <rect {...box} class="lm-wood" />
                    <path class="lm-detail" d={`M${box.x} ${box.y + box.height / 3}h${box.width}M${box.x} ${box.y + box.height * 2 / 3}h${box.width}`} />
                </>
            );
        }

        case "pit": {
            const box = inset(0.06);
            return (
                <>
                    <rect {...box} class="lm-pit" />
                    <rect x={box.x + 6} y={box.y + 6} width={Math.max(0, box.width - 12)} height={Math.max(0, box.height - 12)} class="lm-pit deep" />
                </>
            );
        }

        case "pillar":
            return <>{cells.map(([cellX, cellY]) => <circle key={`${cellX} ${cellY}`} cx={cellX + size / 2} cy={cellY + size / 2} r={size * 0.3} class="lm-ink-fill" />)}</>;
        case "statue":
            return (
                <>
                    <rect {...inset(0.14)} class="lm-stone" />
                    <circle cx={cx} cy={cy} r={small * 0.2} class="lm-ink-fill" />
                </>
            );
        case "altar":
            return (
                <>
                    <rect {...inset(0.16)} rx={1} class="lm-stone" />
                    <path class="lm-detail" d={`M${x + size * 0.24} ${y + size * 0.3}h${w - size * 0.48}`} />
                </>
            );
        case "well":
            return (
                <>
                    <circle cx={cx} cy={cy} r={small * 0.36} class="lm-stone" />
                    <circle cx={cx} cy={cy} r={small * 0.22} class="lm-pit deep" />
                </>
            );
        case "tree":
            // A tree a square, the crowns overlapping: a wood, not a blob.
            return (
                <>
                    {cells.map(([cellX, cellY]) => {
                        const jitter = ((cellX * 7 + cellY * 3) / size) % 5 - 2;
                        return <path key={`${cellX} ${cellY}`} class="lm-canopy" d={canopy(cellX + size / 2 + jitter, cellY + size / 2 - jitter, size * 0.56)} />;
                    })}
                    {cells.map(([cellX, cellY]) => <circle key={`t${cellX} ${cellY}`} cx={cellX + size / 2} cy={cellY + size / 2} r={size * 0.07} class="lm-ink-fill" />)}
                </>
            );
        case "rocks":
            return (
                <>
                    {cells.map(([cellX, cellY]) => (
                        <Fragment key={`${cellX} ${cellY}`}>
                            <path class="lm-stone" d={`M${cellX + 8} ${cellY + 26}l5 -13l9 -5l8 6l3 12l-9 8z`} />
                            <path class="lm-detail" d={`M${cellX + 22} ${cellY + 8}l-3 10l11 4`} />
                        </Fragment>
                    ))}
                </>
            );
        case "low-wall":
            return (
                <>
                    <path class="lm-low-wall" d={along ? `M${x + 2} ${cy}H${x + w - 2}` : `M${cx} ${y + 2}V${y + h - 2}`} />
                    {cells.map(([cellX, cellY]) => <rect key={`${cellX} ${cellY}`} x={cellX + size / 2 - 3} y={cellY + size / 2 - 3} width={6} height={6} class="lm-ink-fill" />)}
                </>
            );
        case "bridge":
            return (
                <>
                    <rect {...inset(0.1)} class="lm-wood" />
                    <path
                        class="lm-detail"
                        d={Array.from(
                            { length: Math.round((along ? w : h) / 8) },
                            (_, plank) => (along ? `M${x + size * 0.1 + plank * 8} ${y + size * 0.1}v${h - size * 0.2}` : `M${x + size * 0.1} ${y + size * 0.1 + plank * 8}h${w - size * 0.2}`),
                        ).join("")}
                    />
                </>
            );
        case "machine":
            return (
                <>
                    <rect {...inset(0.12)} rx={3} class="lm-metal" />
                    <circle cx={cx} cy={cy} r={small * 0.16} class="lm-detail" />
                </>
            );
        case "vehicle":
            return (
                <>
                    <rect {...inset(0.16)} rx={4} class="lm-wood" />
                    <path class="lm-detail strong" d={`M${x + size * 0.1} ${y + size * 0.3}v8M${x + w - size * 0.1} ${y + size * 0.3}v8M${x + size * 0.1} ${y + h - size * 0.3}v-8M${x + w - size * 0.1} ${y + h - size * 0.3}v-8`} />
                </>
            );
        case "tent":
            return (
                <>
                    <rect {...inset(0.08)} class="lm-cloth" />
                    <path class="lm-detail" d={`M${x + size * 0.08} ${y + size * 0.08}L${x + w - size * 0.08} ${y + h - size * 0.08}M${x + w - size * 0.08} ${y + size * 0.08}L${x + size * 0.08} ${y + h - size * 0.08}`} />
                </>
            );
        case "building":
            return <Roof x={x} y={y} w={w} h={h} cells={cells} />;
        case "stall":
            return (
                <>
                    <rect {...inset(0.1)} class="lm-awning" />
                    <path class="lm-detail" d={Array.from({ length: Math.max(1, Math.round(w / 10) - 1) }, (_, stripe) => `M${x + size * 0.1 + (stripe + 1) * 9} ${y + size * 0.1}v${h - size * 0.2}`).join("")} />
                </>
            );
        case "fountain":
            return (
                <>
                    <circle cx={cx} cy={cy} r={small * 0.44} class="lm-stone" />
                    <circle cx={cx} cy={cy} r={small * 0.36} class="lm-basin" />
                    <circle cx={cx} cy={cy} r={small * 0.1} class="lm-stone" />
                    <path class="lm-wave" d={`M${cx - small * 0.26} ${cy + small * 0.18}q4 -4 8 0t8 0`} />
                </>
            );
        case "cliff":
            // The drop: a line along the top, teeth falling from it.
            return (
                <>
                    <path class="lm-detail strong" d={`M${x} ${y + 4}H${x + w}`} />
                    <path class="lm-cliff" d={Array.from({ length: Math.round(w / 8) }, (_, tooth) => `M${x + 2 + tooth * 8} ${y + 5}l3 ${h * 0.55}l3 ${-h * 0.55}`).join("")} />
                </>
            );
        case "hedge":
            return <path class="lm-canopy" d={along ? `M${x + 6} ${cy - 7}h${w - 12}a7 7 0 0 1 0 14h${-(w - 12)}a7 7 0 0 1 0 -14z` : `M${cx - 7} ${y + 6}v${h - 12}a7 7 0 0 0 14 0v${-(h - 12)}a7 7 0 0 0 -14 0z`} />;
        case "hazard":
            return (
                <>
                    {cells.map(([cellX, cellY]) => (
                        <Fragment key={`${cellX} ${cellY}`}>
                            <path class="lm-hazard" d={`M${cellX + size / 2} ${cellY + size / 2 - 12}l12 21h-24z`} />
                            <text class="lm-hazard-mark" x={cellX + size / 2} y={cellY + size / 2 + 6} text-anchor="middle">!</text>
                        </Fragment>
                    ))}
                </>
            );
        case "mark":
            return (
                <>
                    <circle cx={cx} cy={cy} r={small * 0.38} class="lm-mark" />
                    <circle cx={cx} cy={cy} r={small * 0.24} class="lm-mark" />
                </>
            );
        default:
            return (
                <>
                    <rect {...inset(0.2)} rx={6} class="lm-thing-any" />
                    <text class="lm-thing-symbol" x={cx} y={cy + 1} text-anchor="middle" dominant-baseline="middle">{symbol}</text>
                </>
            );
    }
}

/** Roofs: the piece's squares in tiles, its outline, the ridge along its longer side. */
function Roof({ x, y, w, h, cells }: { x: number; y: number; w: number; h: number; cells: number[][]; })
{
    const inPiece = (cellX: number, cellY: number): boolean => cells.some(([px, py]) => px === cellX && py === cellY);
    const edges = cells.flatMap(([cellX, cellY]) =>
        ([[cellX, cellY - size, `M${cellX} ${cellY}h${size}`], [cellX + size, cellY, `M${cellX + size} ${cellY}v${size}`], [cellX, cellY + size, `M${cellX} ${cellY + size}h${size}`], [
            cellX - size,
            cellY,
            `M${cellX} ${cellY}v${size}`,
        ]] as const)
            .filter(([nx, ny]) => !inPiece(nx, ny))
            .map(([, , path]) => path)
    );
    const along = w >= h;
    const middle = along ? y + Math.floor(h / size / 2) * size + (h / size % 2 === 1 ? size / 2 : 0) : x + Math.floor(w / size / 2) * size + (w / size % 2 === 1 ? size / 2 : 0);
    const ridge = cells.filter(([cellX, cellY]) => (along ? cellY <= middle && cellY + size >= middle : cellX <= middle && cellX + size >= middle))
        .map(([cellX, cellY]) => (along ? `M${cellX} ${middle}h${size}` : `M${middle} ${cellY}v${size}`)).join("");
    return (
        <g class={`lm-roof tone-${Math.round((x + y) / size) % 3}`}>
            {cells.map(([cellX, cellY]) => <rect key={`${cellX} ${cellY}`} class="lm-roof-tiles" x={cellX} y={cellY} width={size} height={size} />)}
            <path class="lm-roof-edge" d={edges.join("")} />
            <path class="lm-ridge" d={ridge} />
        </g>
    );
}

/** A flame, from its foot. */
function flame(x: number, y: number, height: number): string
{
    return `M${x} ${y}c${-height * 0.45} ${-height * 0.25} ${-height * 0.3} ${-height * 0.7} 0 ${-height}c${height * 0.05} ${height * 0.3} ${height * 0.35} ${height * 0.35} ${height * 0.3} ${height * 0.65}`
        + `c${-height * 0.02} ${height * 0.2} ${-height * 0.15} ${height * 0.33} ${-height * 0.3} ${height * 0.35}z`;
}

/** A tree's crown: a circle of lobes. */
function canopy(x: number, y: number, r: number): string
{
    const bumps = 9;
    return Array.from({ length: bumps + 1 }, (_, index) => {
        const angle = (index / bumps) * Math.PI * 2;
        const [px, py] = [x + Math.cos(angle) * r, y + Math.sin(angle) * r];
        return index === 0 ? `M${px} ${py}` : `A${r * 0.36} ${r * 0.36} 0 0 1 ${px} ${py}`;
    }).join("") + "z";
}
