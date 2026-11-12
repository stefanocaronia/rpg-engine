// The map of the place where the party is (GRD-6, D-323, D-325), in ink and washes on light paper in both themes: walls hatched in bundles with a
// shade along them, the floor's outline rounded where it meets rock, the ground by the place's look and its kinds, the things of the legend drawn by kind, by
// square or by piece, doors and where squares lead, the squares' names; who stands where as coins, the one acting raised off the paper, a foe the master marked glowing (D-415); then the key, and who
// is where in words, the map's twin.
import { Fragment } from "preact";
import { useContext, useEffect, useRef, useState } from "preact/hooks";
import { TalkName, usePlayerActs } from "../acts/names.tsx";
import type { ShownGrid } from "../data.ts";
import { WidgetsContext } from "../packages/widgets.tsx";
import { CardHead } from "../parts/card.tsx";
import { GlassDefs } from "../parts/glass.tsx";
import { iconPath } from "../parts/icons.tsx";
import { shownText, strangerLabel } from "../parts/labels.ts";
import { personState } from "../parts/status.tsx";
import { t } from "../text.ts";
import { type Feature, featureName, MapKey } from "./key.tsx";
import { columnName, exitSide, floorLoops, groundKinds, isSolid, isStandable, isWalled, kindAt, nextTo, piecesOf, type Square, squareName, squareOf, symbolAt, tracedLoop } from "./map.ts";
import { Corner, Door, Exit, Ground, Patterns, size } from "./paper.tsx";
import { Thing } from "./things.tsx";
import { standingOf, Token } from "./tokens.tsx";

// The order of who is where under the map.
const roles = ["pc", "companion", "other"];

/** Where the player's character goes, when the master asks (ASK-11): the square chosen so far, and what a touch on a square does. */
export interface Picking
{
    selected?: string;
    onSelect(square: string): void;
}

/** Whom the player chooses for an action (D-495): the one chosen so far, by the name the page shows, and what a touch on a token does; undefined for their own. */
export interface Choosing
{
    selected?: string | undefined;
    onChoose(name: string | undefined): void;
}

export function PlaceMap({ map, place, acting, picking, choosing, bare = false, self: selfName }: {
    map: ShownGrid;
    place: string;
    acting?: string;
    picking?: Picking;
    choosing?: Choosing;
    /** Without its key and who is where, as in a sheet whose list says it. */
    bare?: boolean;
    /** With more than one player character, the one in the foreground, whom the distances are from (VIEW-12). */
    self?: string | undefined;
})
{
    const svg = useRef<SVGSVGElement>(null);
    const where = useRef<HTMLUListElement>(null);
    const acts = usePlayerActs();
    const widgets = useContext(WidgetsContext);
    // On the page, a token touched starts talking to them, the focus coming back to their line of who is where (D-495).
    const talking: Choosing | undefined = acts === undefined || picking !== undefined ? undefined : {
        onChoose: (name) => {
            const line = [...(where.current?.querySelectorAll<HTMLElement>("button.talk") ?? [])].find((button) => button.dataset.name === name);
            return name !== undefined && acts.start({ talk: name }, line ?? svg.current ?? document.body);
        },
    };
    const tokens = choosing ?? talking;
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
    const self = standing.find((one) => one.role === "pc" && (selfName === undefined || one.name === selfName));
    // What one fills, in squares a side: a large creature stands on the square at the top left of its own (GRD-4).
    const middle = (one: { at: Square; side?: number; }): [number, number] => [X(one.at.column) + (size * (one.side ?? 1)) / 2, Y(one.at.row) + (size * (one.side ?? 1)) / 2];
    // The squares the character can still reach, and those it stands on, which are never out of its reach (D-328).
    const reach = [
        ...(map.reach ?? []).flatMap((name) => {
            const square = squareOf(name);
            return square === undefined ? [] : [square];
        }),
        ...(map.reach === undefined || self === undefined
            ? []
            : Array.from({ length: (self.side ?? 1) ** 2 }, (_, index) => ({ column: self.at.column + (index % (self.side ?? 1)), row: self.at.row + Math.floor(index / (self.side ?? 1)) }))),
    ];
    const letters = Math.max(11, 11 / scale);
    const frame = useRef<HTMLDivElement>(null);

    // On a phone the map keeps squares a finger can read and scrolls aside (D-547): it opens with the player's character in the middle.
    useEffect(() => {
        const box = frame.current;

        if (box === null || self === undefined || box.scrollWidth <= box.clientWidth) {
            return;
        }

        const [x] = middle(self);
        const shown = box.scrollWidth / width;
        // The frame keeps its squares left to right in every language, so its scroll does too.
        box.scrollLeft = Math.max(0, x * shown - box.clientWidth / 2);
    }, [map.columns, map.rows, self?.at.column, self?.at.row]);
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
                        <title>{[featureName(feature), feature.blocks ? t("blocks") : "", feature.difficult ? t("difficult") : ""].filter((part) => part !== "").join(", ")}</title>
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
            <CardHead icon={iconPath("world")} title={<h3 id="lm-title">{t("Map")}</h3>} note={place} />
            <div ref={frame} class={picking === undefined && choosing === undefined ? "lm-frame" : "lm-frame panned"} style={{ "--map-width": String(width) }}>
                {/* To choose a square or someone, each at least 44 px wide, the map scrolls rather than shrinks (D-325 (6)). */}
                <svg
                    ref={svg}
                    class={`lm-svg lm-look-${map.ground}`}
                    viewBox={`0 0 ${width} ${height}`}
                    {...(picking === undefined && choosing === undefined ? {} : { width: width * 1.2 })}
                    role="img"
                    aria-label={t("Map of {place}", { place })}
                >
                    <defs>
                        <Patterns />
                        <GlassDefs prefix="lm" />
                        {/* A foe's glow (D-415): red, close round the token's edge. */}
                        <radialGradient id="lm-hostile-glow">
                            <stop offset="0.75" stop-color="#c8321f" stop-opacity="0.3" />
                            <stop offset="1" stop-color="#c8321f" stop-opacity="0" />
                        </radialGradient>
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
                                <circle cx={middle(one)[0]} cy={middle(one)[1]} r={size * (one.side ?? 1) * 0.43} />
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
                        {standing.map((one, index) => {
                            // Talking needs someone else, never one of the player characters; choosing for an action takes the one acting too, as themselves, and
                            // with more than one the others by name.
                            const other = one.role !== "pc" || (choosing !== undefined && selfName !== undefined && one !== self);
                            const shown = !other ? undefined : one.stranger ? strangerLabel(one.name) : one.name;
                            const choice = tokens === undefined || (shown === undefined && choosing === undefined) ? undefined : {
                                chosen: choosing !== undefined && choosing.selected === shown && shown !== undefined,
                                onChoose: () => tokens.onChoose(shown),
                            };
                            return (
                                <Token
                                    key={index}
                                    one={standingOf(one, one.role === "other" ? undefined : personState(widgets, one.name))}
                                    index={index}
                                    acting={one.name === acting}
                                    hostile={one.hostile === true}
                                    x={middle(one)[0]}
                                    y={middle(one)[1]}
                                    scale={scale}
                                    {...(choice === undefined ? {} : { choice })}
                                />
                            );
                        })}
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
            {!bare && <MapKey map={map} reach={reach.length > 0} self={selfName} />}
            {!bare && standing.length > 0 && (
                <ul ref={where} class="lm-where" aria-label={t("Who is where")}>
                    {/* The player's character first, the one measured from on top with more (D-480 (7)), then the companions, then the others, as the map lists them. */}
                    {standing.toSorted((first, second) => measuredFirst(first, second, selfName === undefined ? undefined : self) || roles.indexOf(first.role) - roles.indexOf(second.role)).map((one, index) => (
                        <li key={index} class={`lm-where-${one.role}${one.hostile === true ? " hostile" : ""}`}>
                            {one.role === "pc"
                                ? <span class="lm-where-name">{one.name}</span>
                                : (
                                    <TalkName name={one.stranger ? strangerLabel(one.name) : one.name}>
                                        <span class="lm-where-name">{one.stranger ? strangerLabel(one.name) : one.name}</span>
                                    </TalkName>
                                )}
                            <span class="lm-key-square">{one.square}</span>
                            {selfName !== undefined && one === self
                                ? <span class="lm-where-far">{t("from here")}</span>
                                : one.distance !== undefined
                                ? <span class="lm-where-far">{shownText(one.distance)}</span>
                                : self !== undefined && one !== self && (nextTo(one.at, self.at) || one.square === self.square) && (
                                    <span class="lm-where-far">{selfName === undefined ? t("next to you") : t("next to {name}", { name: selfName })}</span>
                                )}
                        </li>
                    ))}
                </ul>
            )}
        </section>
    );
}

/** The one the distances are from before anyone else, when named: a negative number puts the first before the second. */
function measuredFirst(first: object, second: object, from: object | undefined): number
{
    return from === undefined ? 0 : first === from ? -1 : second === from ? 1 : 0;
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
