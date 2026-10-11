// The map of the place where the party is (GRD-6, D-323, D-325), in Joseph's ink and washes on light paper in both themes: walls hatched in bundles with a
// shade along them, the floor's outline rounded where it meets rock, the ground by the place's look and its kinds, the things of the legend drawn by kind, by
// square or by piece, doors and where squares lead, the squares' names; who stands where as tokens ringed by side, the one acting haloed; then the key, and who
// is where in words, the map's twin.
import { type ComponentChildren, Fragment } from "preact";
import { useEffect, useRef, useState } from "preact/hooks";
import type { ShownGrid } from "./data.ts";
import { Glass, GlassDefs } from "./glass.tsx";
import { columnName, exitSide, floorLoops, groundKinds, isSolid, isStandable, isWalled, kindAt, nextTo, piecesOf, type Square, squareName, squareOf, symbolAt, tracedLoop } from "./place-map.ts";

// How wide a square is drawn, in pixels.
const size = 40;
// The order of who is where under the map.
const roles = ["pc", "companion", "other"];

type Feature = ShownGrid["legend"][number];

/** Where the player's character goes, when the master asks (ASK-11): the square chosen so far, and what a touch on a square does. */
export interface Picking
{
    selected?: string;
    onSelect(square: string): void;
}

export function PlaceMap({ map, place, acting, picking }: { map: ShownGrid; place: string; acting?: string; picking?: Picking; })
{
    const svg = useRef<SVGSVGElement>(null);
    const scale = useScale(svg);
    const sides = map.exits.map((exit) => exitSide(map, squareOf(exit.square) ?? { column: 0, row: 0 }));
    const [left, top] = [30 + (sides.includes("left") ? 30 : 0), 30 + (sides.includes("top") ? 36 : 0)];
    const [right, bottom] = [14 + (sides.includes("right") ? 30 : 0), 14 + (sides.includes("bottom") ? 34 : 0)];
    const X = (column: number): number => left + column * size;
    const Y = (row: number): number => top + row * size;
    const [width, height] = [left + map.columns * size + right, top + map.rows * size + bottom];
    const squares = Array.from({ length: map.rows }, (_, row) => Array.from({ length: map.columns }, (_, column) => ({ column, row }))).flat();
    const open = squares.filter((square) => !isSolid(map, square));
    const loops = floorLoops(map, X, Y);
    const walled = isWalled(map);
    const floor = loops.map((loop) => tracedLoop(loop, false, size * 0.5)).join("");
    const outline = walled ? loops.map((loop) => tracedLoop(loop, true, size * 0.5)).join("") : "";
    const featureAt = (square: Square): Feature | undefined => map.legend.find((feature) => feature.symbol === symbolAt(map, square));
    // Hatching only next to the rooms: farther the rock or the masonry is left as paper.
    const nearRoom = (square: Square): boolean => [-1, 0, 1].some((dc) => [-1, 0, 1].some((dr) => !isSolid(map, { column: square.column + dc, row: square.row + dr })));
    const things = map.legend.filter((feature) => !["wall", "rock", "floor", "door", "open-door", "secret-door", "opening", ...groundKinds].includes(feature.kind));
    const standing = map.at.flatMap((one) => {
        const square = squareOf(one.square);
        return square === undefined ? [] : [{ ...one, at: square }];
    });
    const self = standing.find((one) => one.role === "pc");
    // What one fills, in squares a side: a large creature stands on the square at the top left of its own (GRD-4).
    const middle = (one: { at: Square; side?: number; }): [number, number] => [X(one.at.column) + (size * (one.side ?? 1)) / 2, Y(one.at.row) + (size * (one.side ?? 1)) / 2];
    const reach = (map.reach ?? []).flatMap((name) => {
        const square = squareOf(name);
        return square === undefined ? [] : [square];
    });
    const letters = Math.max(11, 11 / scale);
    const drawn = (
        <>
            <path class="lm-floor-fill" d={floor} fill-rule="evenodd" />
            <g class="lm-ground" clip-path="url(#lm-open)">
                {open.filter((square) => groundKinds.includes(kindAt(map, square))).map((square) => <Ground key={squareName(square)} kind={kindAt(map, square)} x={X(square.column)} y={Y(square.row)} side={size} seed={square} />)}
            </g>
            <path class="lm-grid" d={open.map((square) => `M${X(square.column)} ${Y(square.row)}h${size}v${size}h${-size}z`).join("")} clip-path="url(#lm-open)" />
            {open.filter((square) => featureAt(square)?.difficult).map((square) => <Corner key={squareName(square)} x={X(square.column)} y={Y(square.row)} side={size} />)}
            {things.map((feature) =>
                piecesOf(map, feature.symbol, feature.kind).map((piece) => (
                    <g key={`${feature.symbol} ${piece.left} ${piece.top}`} class={`lm-thing ${feature.kind}`}>
                        <title>{[feature.name, feature.blocks ? "blocks" : "", feature.difficult ? "difficult" : ""].filter((part) => part !== "").join(", ")}</title>
                        <Thing
                            kind={feature.kind}
                            symbol={feature.symbol}
                            x={X(piece.left)}
                            y={Y(piece.top)}
                            w={(piece.right - piece.left) * size}
                            h={(piece.bottom - piece.top) * size}
                            cells={piece.squares.map((square) => [X(square.column), Y(square.row)])}
                        />
                    </g>
                ))
            )}
            <path class="lm-shade" d={outline} clip-path="url(#lm-open)" filter="url(#lm-blur)" />
        </>
    );
    return (
        <section class="lm" aria-labelledby="lm-title">
            <header class="lm-head">
                <h3 id="lm-title">Map</h3>
                <span class="lm-sub">{place}</span>
            </header>
            <div class={picking === undefined ? "lm-frame" : "lm-frame panned"}>
                {/* To choose a square, each at least 44 px wide, the map scrolls rather than shrinks (D-325 (6)). */}
                <svg
                    ref={svg}
                    class={`lm-svg lm-look-${map.ground}`}
                    viewBox={`0 0 ${width} ${height}`}
                    {...(picking === undefined ? {} : { width: width * 1.2 })}
                    role="img"
                    aria-label={`Map of ${place}`}
                >
                    <defs>
                        <Patterns />
                        <GlassDefs prefix="lm" />
                        <clipPath id="lm-open">
                            <path d={floor} clip-rule="evenodd" />
                        </clipPath>
                        {!walled && (
                            // An open map has no outline: its ground fades into the paper at its edges, as the world goes on.
                            <mask id="lm-fade" maskUnits="userSpaceOnUse" x={0} y={0} width={width} height={height}>
                                <rect x={X(0) + size * 0.35} y={Y(0) + size * 0.35} width={map.columns * size - size * 0.7} height={map.rows * size - size * 0.7} fill="#fff" filter="url(#lm-soft)" />
                            </mask>
                        )}
                        {standing.map((one, index) => (
                            <clipPath key={index} id={`lm-token-${index}`}>
                                <circle cx={middle(one)[0]} cy={middle(one)[1]} r={size * (one.side ?? 1) * 0.43 - 2} />
                            </clipPath>
                        ))}
                    </defs>
                    <rect class="lm-paper" width={width} height={height} />
                    <g class="lm-walls">
                        {squares.filter((square) => ["wall", "rock", "window"].includes(kindAt(map, square)) && nearRoom(square)).map((square) => (
                            <Fragment key={squareName(square)}>
                                <rect class="lm-wall-under" x={X(square.column)} y={Y(square.row)} width={size} height={size} />
                                <rect class={`lm-wall ${kindAt(map, square)}`} x={X(square.column)} y={Y(square.row)} width={size} height={size} />
                            </Fragment>
                        ))}
                    </g>
                    {walled ? drawn : <g mask="url(#lm-fade)">{drawn}</g>}
                    {/* On the player's turn, the squares of the floor their character can no longer reach veiled, the others left as they are (D-328, D-340). */}
                    {reach.length > 0 && (
                        <g class="lm-out" aria-hidden="true" clip-path="url(#lm-open)">
                            {open.filter((square) => !reach.some((near) => near.column === square.column && near.row === square.row)).map((square) => (
                                <rect key={squareName(square)} x={X(square.column)} y={Y(square.row)} width={size} height={size} />
                            ))}
                        </g>
                    )}
                    <path class="lm-outline" d={outline} filter="url(#lm-ink)" />
                    {squares.filter((square) => ["door", "open-door", "secret-door"].includes(kindAt(map, square))).map((square) => (
                        <Door key={squareName(square)} kind={kindAt(map, square)} name={featureAt(square)?.name ?? "door"} square={square} map={map} x={X(square.column)} y={Y(square.row)} />
                    ))}
                    {map.exits.map((exit, index) => {
                        const square = squareOf(exit.square);
                        return square === undefined ? null : <Exit key={exit.square} side={sides[index]} to={exit.to} x={X(square.column) + size / 2} y={Y(square.row) + size / 2} letters={Math.max(13, 12 / scale)} />;
                    })}
                    <g class="lm-coordinates" font-size={letters}>
                        {Array.from({ length: map.columns }, (_, column) => <text key={`c${column}`} x={X(column) + size / 2} y={top - 10} text-anchor="middle">{columnName(column)}</text>)}
                        {Array.from({ length: map.rows }, (_, row) => <text key={`r${row}`} x={left - 10} y={Y(row) + size / 2} text-anchor="end" dominant-baseline="middle">{row + 1}</text>)}
                    </g>
                    <g class="lm-tokens">
                        {standing.map((one, index) => <Token key={index} one={one} index={index} acting={one.name === acting} x={middle(one)[0]} y={middle(one)[1]} />)}
                    </g>
                    {picking !== undefined && (
                        <g class="lm-picks">
                            {squares.filter((square) => isStandable(map, square)).map((square) => (
                                <rect
                                    key={squareName(square)}
                                    class={picking.selected === squareName(square) ? "lm-pick selected" : "lm-pick"}
                                    x={X(square.column) + 1}
                                    y={Y(square.row) + 1}
                                    width={size - 2}
                                    height={size - 2}
                                    rx={4}
                                    onClick={() => picking.onSelect(squareName(square))}
                                >
                                    <title>{squareName(square)}</title>
                                </rect>
                            ))}
                        </g>
                    )}
                </svg>
            </div>
            <ul class="lm-key" aria-label="Legend">
                {/* What the veil on the player's turn is (D-335, D-340). */}
                {reach.length > 0 && (
                    <li>
                        <svg class={`lm-swatch lm-look-${map.ground}`} viewBox="0 0 40 40" aria-hidden="true">
                            <rect class="lm-floor-fill" width={40} height={40} />
                            <g class="lm-out">
                                <rect width={40} height={40} />
                            </g>
                        </svg>
                        <span class="lm-key-name">out of your move this turn</span>
                    </li>
                )}
                {map.legend.filter((feature) => !["floor", "ground"].includes(feature.kind)).map((feature) => (
                    <li key={feature.symbol}>
                        <Swatch feature={feature} ground={map.ground} />
                        <span class="lm-key-name">{feature.name}</span>
                        {feature.blocks && !["wall", "rock"].includes(feature.kind) && <span class="lm-key-note">blocks</span>}
                        {feature.difficult && <span class="lm-key-note">difficult</span>}
                    </li>
                ))}
                {map.exits.map((exit) => (
                    <li key={exit.square} class="lm-key-exit">
                        <span class="lm-key-square">{exit.square}</span>
                        <span>{`→ ${exit.to ?? "somewhere"}`}</span>
                    </li>
                ))}
            </ul>
            {standing.length > 0 && (
                <ul class="lm-where" aria-label="Who is where">
                    {/* The player's character first, then the companions, then the others, each as the map lists them. */}
                    {standing.toSorted((first, second) => roles.indexOf(first.role) - roles.indexOf(second.role)).map((one, index) => (
                        <li key={index} class={`lm-where-${one.role}`}>
                            <span class="lm-where-name">{capitalized(one.name)}</span>
                            <span class="lm-key-square">{one.square}</span>
                            {one.distance !== undefined
                                ? <span class="lm-where-far">{one.distance}</span>
                                : self !== undefined && one !== self && (nextTo(one.at, self.at) || one.square === self.square) && <span class="lm-where-far">next to you</span>}
                        </li>
                    ))}
                </ul>
            )}
        </section>
    );
}

/** How much the map is scaled on the screen, from its drawn width to its shown one: the letters around it keep a readable size on a phone. */
function useScale(svg: { current: SVGSVGElement | null; }): number
{
    const [scale, setScale] = useState(1);

    useEffect(() => {
        const element = svg.current;

        if (element === null || typeof ResizeObserver === "undefined") {
            return;
        }

        const measure = (): void => setScale(element.getBoundingClientRect().width / (element.viewBox.baseVal?.width || 1));
        const observer = new ResizeObserver(measure);
        observer.observe(element);
        measure();
        return () => observer.disconnect();
    }, []);

    return scale;
}

/** The patterns and filters of the map: Dyson's hatching in bundles, the grounds' textures, the ink's tremble, the washes, the soft edge. */
function Patterns()
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
function Corner({ x, y, side }: { x: number; y: number; side: number; })
{
    return <path class="lm-corner" d={`M${x + 1} ${y + 1}h${side * 0.3}l${-side * 0.3} ${side * 0.3}z`} />;
}

/** Ground drawn on its square, under the things: water, rubble, mud, brush, open ground, a road. */
function Ground({ kind, x, y, side, seed }: { kind: string; x: number; y: number; side: number; seed: Square; })
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

/** A thing of the legend, by its kind (D-325), in its box; the kinds drawn one a square draw each of their squares. Any other is a box with its symbol. */
function Thing({ kind, symbol, x, y, w, h, cells }: { kind: string; symbol: string; x: number; y: number; w: number; h: number; cells: number[][]; })
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

/** A door: its leaf across the gap in the wall, along the wall it is in; open, swung; secret and found, dashed. */
function Door({ kind, name, square, map, x, y }: { kind: string; name: string; square: Square; map: ShownGrid; x: number; y: number; })
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
function Exit({ side, to, x, y, letters }: { side: string; to?: string; x: number; y: number; letters: number; })
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

/** Someone on the map: a disc ringed by side, their picture, or a stranger's number, as Creature 2's, or the hood; the player's character ringed twice. */
function Token({ one, index, acting, x, y }: { one: ShownGrid["at"][number]; index: number; acting: boolean; x: number; y: number; })
{
    const side = one.side ?? 1;
    const r = size * side * 0.43;
    const number = one.stranger ? /[A-Z]?\d+$/.exec(one.name)?.[0] : undefined;
    return (
        <g class={`lm-token ${one.role}${acting ? " acting" : ""}`}>
            <title>{`${capitalized(one.name)}, ${one.square}`}</title>
            {acting && (
                <>
                    <circle class="lm-halo" cx={x} cy={y} r={r + 6} />
                    <circle class="lm-halo-edge" cx={x} cy={y} r={r + 9} />
                </>
            )}
            {/* A token under glass, its shadow on the paper. */}
            <g filter="url(#lm-drop)">
                <circle class="lm-disc" cx={x} cy={y} r={r} />
                {one.image && !one.stranger
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
                <circle class="lm-ring" cx={x} cy={y} r={r} />
                {one.role === "pc" && <circle class="lm-ring outer" cx={x} cy={y} r={r + 3.2} />}
            </g>
        </g>
    );
}

/** A thing of the legend drawn small, as on the map, for the key. */
function Swatch({ feature, ground }: { feature: Feature; ground: string; })
{
    return (
        <svg class={`lm-swatch lm-look-${ground}`} viewBox="0 0 40 40" aria-hidden="true">
            <rect class="lm-paper" width={40} height={40} />
            {["wall", "rock", "window"].includes(feature.kind)
                ? <rect class={`lm-wall ${feature.kind}`} width={40} height={40} />
                : (
                    <>
                        <rect class="lm-floor-fill" width={40} height={40} />
                        {["door", "open-door", "secret-door", "opening"].includes(feature.kind)
                            ? (
                                <>
                                    <path class="lm-outline" d="M0 0V40M40 0V40" />
                                    {feature.kind !== "opening" && <rect class={feature.kind === "secret-door" ? "lm-door-leaf secret" : "lm-door-leaf"} x={14} y={2} width={12} height={36} />}
                                </>
                            )
                            : groundKinds.includes(feature.kind)
                            ? <Ground kind={feature.kind} x={0} y={0} side={40} seed={{ column: 0, row: 0 }} />
                            : <Thing kind={feature.kind} symbol={feature.symbol} x={0} y={0} w={40} h={40} cells={[[0, 0]]} />}
                        {feature.difficult && <Corner x={0} y={0} side={40} />}
                    </>
                )}
        </svg>
    );
}

/** A flame, from its foot. */
function flame(x: number, y: number, height: number): string
{
    return `M${x} ${y}c${-height * 0.45} ${-height * 0.25} ${-height * 0.3} ${-height * 0.7} 0 ${-height}c${height * 0.05} ${height * 0.3} ${height * 0.35} ${height * 0.35} ${height * 0.3} ${height * 0.65}`
        + `c${-height * 0.02} ${height * 0.2} ${-height * 0.15} ${height * 0.33} ${-height * 0.3} ${height * 0.35}z`;
}

/** A pebble of rubble. */
function pebble(x: number, y: number, r: number): string
{
    return `M${x - r} ${y}l${r * 0.6} ${-r * 0.9}l${r} ${r * 0.2}l${r * 0.4} ${r}l${-r * 0.9} ${r * 0.6}z`;
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

function capitalized(text: string): string
{
    return `${text[0]?.toUpperCase() ?? ""}${text.slice(1)}`;
}
