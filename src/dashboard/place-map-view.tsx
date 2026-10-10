// The map of the place where the party is (GRD-6, D-323): its squares on light paper in both themes, the walls hatched in ink, the doors, the things of its
// legend drawn by their kind, who stands where as tokens ringed by side, and the squares' names around it, as the player says them: C4.
import type { ShownGrid } from "./data.ts";
import { columnName, outlineOf, type Piece, piecesOf, type Square, squareOf, symbolAt } from "./place-map.ts";

// How wide a square is drawn, in pixels, and the room for the names of the columns and the rows.
const size = 40;
const margin = 26;

type Draw = { X: (column: number) => number; Y: (row: number) => number; map: ShownGrid; };

export function PlaceMap({ map, place }: { map: ShownGrid; place: string; })
{
    const width = margin * 2 + map.columns * size;
    const height = margin * 2 + map.rows * size;
    const X = (column: number): number => margin + column * size;
    const Y = (row: number): number => margin + row * size;
    const squares = Array.from({ length: map.rows }, (_, row) => Array.from({ length: map.columns }, (_, column) => ({ column, row }))).flat();
    const inside = (square: Square): boolean => !["#", " "].includes(symbolAt(map, square));
    const key = (square: Square): string => `${square.column},${square.row}`;
    const outline = outlineOf(map).map(([from, to]) => `M${X(from.column)} ${Y(from.row)}L${X(to.column)} ${Y(to.row)}`).join("");
    const standing = map.at.flatMap((one) => {
        const square = squareOf(one.square);
        return square === undefined ? [] : [{ ...one, at: square }];
    });
    return (
        <section class="local-map" aria-labelledby="local-map-title">
            <header class="local-map-head">
                <h3 id="local-map-title">Map</h3>
                <span class="local-map-sub">{place}</span>
            </header>
            <div class="local-map-frame">
                <svg class="local-map-svg" viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`Map of ${place}`}>
                    <defs>
                        <pattern id="lm-hatch" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                            <line x1="0" y1="0" x2="0" y2="7" class="lm-hatch-line" />
                        </pattern>
                        <filter id="lm-ink" x="-5%" y="-5%" width="110%" height="110%">
                            <feTurbulence type="fractalNoise" baseFrequency="0.06" numOctaves={2} seed={7} />
                            <feDisplacementMap in="SourceGraphic" scale={2.4} />
                        </filter>
                        {standing.map((one, index) => (
                            <clipPath key={index} id={`lm-token-${index}`}>
                                <circle cx={X(one.at.column) + size / 2} cy={Y(one.at.row) + size / 2} r={size * 0.38} />
                            </clipPath>
                        ))}
                    </defs>
                    <rect class="lm-paper" width={width} height={height} />
                    {squares.filter((square) => symbolAt(map, square) === "#").map((square) => <rect key={key(square)} class="lm-wall" x={X(square.column)} y={Y(square.row)} width={size} height={size} />)}
                    {squares.filter(inside).map((square) => <rect key={key(square)} class="lm-floor" x={X(square.column)} y={Y(square.row)} width={size} height={size} />)}
                    {map.legend.map((feature) => <Thing key={feature.symbol} kind={feature.kind} name={feature.name} symbol={feature.symbol} map={map} X={X} Y={Y} />)}
                    <path class="lm-outline" d={outline} filter="url(#lm-ink)" />
                    {squares.filter((square) => symbolAt(map, square) === "+").map((square) => <Door key={key(square)} square={square} map={map} X={X} Y={Y} />)}
                    {map.exits.map((exit) => {
                        const square = squareOf(exit.square);
                        return square === undefined ? null : <Exit key={exit.square} square={square} to={exit.to} map={map} X={X} Y={Y} />;
                    })}
                    {standing.map((one, index) => {
                        const [cx, cy] = [X(one.at.column) + size / 2, Y(one.at.row) + size / 2];
                        return (
                            <g key={index} class={`lm-token ${one.role}`}>
                                <title>{`${one.name}, ${one.square}`}</title>
                                <circle class="lm-token-disc" cx={cx} cy={cy} r={size * 0.42} />
                                {one.image
                                    ? (
                                        <image
                                            href={`/images/${encodeURIComponent(one.image.file)}?v=${one.image.version}`}
                                            x={cx - size * 0.38}
                                            y={cy - size * 0.38}
                                            width={size * 0.76}
                                            height={size * 0.76}
                                            clip-path={`url(#lm-token-${index})`}
                                        />
                                    )
                                    : <text class="lm-token-initial" x={cx} y={cy + 5} text-anchor="middle">{one.stranger ? "?" : one.name.slice(0, 1).toUpperCase()}</text>}
                                <circle class="lm-token-ring" cx={cx} cy={cy} r={size * 0.42} />
                            </g>
                        );
                    })}
                    {Array.from({ length: map.columns }, (_, column) => <text key={`c${column}`} class="lm-coordinate" x={X(column) + size / 2} y={margin - 9} text-anchor="middle">{columnName(column)}</text>)}
                    {Array.from({ length: map.rows }, (_, row) => <text key={`r${row}`} class="lm-coordinate" x={margin - 9} y={Y(row) + size / 2 + 4} text-anchor="end">{row + 1}</text>)}
                </svg>
            </div>
            <ul class="local-map-key">
                {map.legend.map((feature) => (
                    <li key={feature.symbol}>
                        <span class={`lm-key-swatch ${feature.kind}`} aria-hidden="true" />
                        {feature.name}
                        {feature.blocks && <span class="lm-key-note">blocks</span>}
                        {feature.difficult && <span class="lm-key-note">difficult</span>}
                    </li>
                ))}
                {map.exits.map((exit) => <li key={exit.square}>{`${exit.square} → ${exit.to ?? "?"}`}</li>)}
            </ul>
        </section>
    );
}

/** A thing of the legend, by its kind: a table, a counter, a hearth, barrels, stairs, water; any other as a disc with its symbol. */
function Thing({ kind, name, symbol, map, X, Y }: Draw & { kind: string; name: string; symbol: string; })
{
    return (
        <g class={`lm-thing ${kind}`}>
            <title>{name}</title>
            {piecesOf(map, symbol).map((piece, index) => <PieceDrawing key={index} kind={kind} symbol={symbol} piece={piece} X={X} Y={Y} />)}
        </g>
    );
}

function PieceDrawing({ kind, symbol, piece, X, Y }: { kind: string; symbol: string; piece: Piece; X: Draw["X"]; Y: Draw["Y"]; })
{
    const box = (inset: number) => ({ x: X(piece.left) + size * inset, y: Y(piece.top) + size * inset, width: (piece.right - piece.left) * size - size * inset * 2, height: (piece.bottom - piece.top) * size - size * inset * 2 });
    const centre = { x: (X(piece.left) + X(piece.right)) / 2, y: (Y(piece.top) + Y(piece.bottom)) / 2 };

    switch (kind) {
        case "table":
            return <rect {...box(0.16)} rx={5} />;
        case "counter":
            return <rect {...box(0.14)} rx={2} />;

        case "hearth": {
            const outer = box(0.08);
            return (
                <g>
                    <rect {...outer} rx={3} />
                    <path class="lm-flame" d={flame(outer.x + outer.width / 2, outer.y + outer.height * 0.72, Math.min(outer.width, outer.height) * 0.45)} />
                </g>
            );
        }

        case "barrel":
            return (
                <g>
                    {piece.squares.map((square) => (
                        <g key={`${square.column},${square.row}`}>
                            <circle cx={X(square.column) + size / 2} cy={Y(square.row) + size / 2} r={size * 0.33} />
                            <circle class="lm-barrel-hoop" cx={X(square.column) + size / 2} cy={Y(square.row) + size / 2} r={size * 0.2} />
                        </g>
                    ))}
                </g>
            );

        case "stairs": {
            const outer = box(0.06);
            const across = outer.width >= outer.height;
            const steps = Math.max(3, Math.round((across ? outer.width : outer.height) / 9));
            return (
                <g>
                    <rect {...outer} />
                    {Array.from({ length: steps - 1 }, (_, step) => {
                        const share = (step + 1) / steps;
                        return across
                            ? <line key={step} x1={outer.x + outer.width * share} y1={outer.y} x2={outer.x + outer.width * share} y2={outer.y + outer.height} />
                            : <line key={step} x1={outer.x} y1={outer.y + outer.height * share} x2={outer.x + outer.width} y2={outer.y + outer.height * share} />;
                    })}
                </g>
            );
        }

        case "water":
            return (
                <g>
                    {piece.squares.map((square) => (
                        <g key={`${square.column},${square.row}`}>
                            <rect x={X(square.column)} y={Y(square.row)} width={size} height={size} />
                            <path class="lm-wave" d={`M${X(square.column) + 8} ${Y(square.row) + size / 2}q5 -5 10 0t10 0t10 0`} />
                        </g>
                    ))}
                </g>
            );
        default:
            return (
                <g>
                    <circle cx={centre.x} cy={centre.y} r={size * 0.3} />
                    <text class="lm-thing-symbol" x={centre.x} y={centre.y + 4} text-anchor="middle">{symbol}</text>
                </g>
            );
    }
}

/** A door: its leaf across the gap in the wall, along the wall it is in. */
function Door({ square, map, X, Y }: Draw & { square: Square; })
{
    const across = symbolAt(map, { column: square.column - 1, row: square.row }) === "#" || symbolAt(map, { column: square.column + 1, row: square.row }) === "#";
    const [x, y] = [X(square.column), Y(square.row)];
    return across
        ? <rect class="lm-door" x={x + size * 0.1} y={y + size * 0.36} width={size * 0.8} height={size * 0.28} />
        : <rect class="lm-door" x={x + size * 0.36} y={y + size * 0.1} width={size * 0.28} height={size * 0.8} />;
}

/** Where a square on the map's edge leads: an arrow out of the map and the place's name, when the character knows it. */
function Exit({ square, to, map, X, Y }: Draw & { square: Square; to?: string; })
{
    const [cx, cy] = [X(square.column) + size / 2, Y(square.row) + size / 2];
    const [dx, dy] = square.row === map.rows - 1 ? [0, 1] : square.row === 0 ? [0, -1] : square.column === 0 ? [-1, 0] : [1, 0];
    const [ex, ey] = [cx + dx * size * 0.75, cy + dy * size * 0.75];
    // A chevron at the arrow's end, pointing away from the map.
    const chevron = `M${ex - dy * 5 - dx * 5} ${ey - dx * 5 - dy * 5}L${ex} ${ey}L${ex + dy * 5 - dx * 5} ${ey + dx * 5 - dy * 5}`;
    return (
        <g class="lm-exit">
            <path d={`M${cx + dx * size * 0.3} ${cy + dy * size * 0.3}L${ex} ${ey}${chevron}`} />
            {to !== undefined && <text x={ex + dx * 8} y={ey + (dy === 0 ? 4 : dy * 15)} text-anchor={dx === 0 ? "middle" : dx > 0 ? "start" : "end"}>{to}</text>}
        </g>
    );
}

/** A flame, from its foot. */
function flame(x: number, y: number, height: number): string
{
    return `M${x} ${y}c${-height * 0.45} ${-height * 0.25} ${-height * 0.3} ${-height * 0.7} 0 ${-height}c${height * 0.05} ${height * 0.3} ${height * 0.35} ${height * 0.35} ${height * 0.3} ${height * 0.65}`
        + `c${-height * 0.02} ${height * 0.2} ${-height * 0.15} ${height * 0.33} ${-height * 0.3} ${height * 0.35}z`;
}
