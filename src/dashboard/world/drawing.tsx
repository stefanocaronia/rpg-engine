// The world map drawn: the paper, the hexes lit and fogged, the regions' ink, the ways by hand, the trail, the places, the party, the labels, compass and scale.
import type { MapPlace, MapPoint, Member, WorldMap } from "../data.ts";
import { terrainLabel } from "../parts/game-words.ts";
import { Glass, GlassDefs } from "../parts/glass.tsx";
import { biomes, placeKinds, symbolRadius } from "../parts/map-symbols.ts";
import { t } from "../text.ts";
import { type Box, fading, hexCorners, hexesOf, type Lifted, type MapLayout, type MapView, marksOf, nameRun, nameShares, pathOf, placeAreaLabels, placeLabels, regionEdges, riverOutline, scaleBar, type Spot, type WayShape } from "./map.ts";

// The ways in the order they are drawn, the rivers under the roads.
const wayOrder = ["river", "road", "path"];

/**
 * The drawing, from the view: the paper, the hexes lit and fogged with the marks of their biome and the ink round each region, the ways drawn by hand with
 * their tails into the fog, the trail, the places, the party, the labels, the compass and the scale.
 */
export function Drawing(
    { map, layout, ways, trails, lifted, ghost, passages, lead, view, size, narrow, chosen }: {
        map: WorldMap;
        layout: MapLayout;
        ways: WayShape[];
        trails: MapPoint[][];
        lifted: Lifted;
        ghost?: { ways: WayShape[]; spots: Spot[]; };
        passages: string[];
        lead?: Member;
        view: MapView;
        size: { width: number; height: number; };
        narrow: boolean;
        chosen?: string;
    },
)
{
    const { width, height } = size;
    const X = (x: number): number => width / 2 + (x - view.x) * view.s;
    const Y = (y: number): number => height / 2 - (y - view.y) * view.s;
    const screen = (points: MapPoint[]): MapPoint[] => points.map((point) => ({ x: X(point.x), y: Y(point.y) }));
    const line = (points: MapPoint[]): string => pathOf(screen(points));
    const { across, hexes } = hexesOf(view, width, height, lifted, layout.regions);
    const hexPixels = across * view.s;
    const edges = regionEdges(hexes, across);
    const scale = scaleBar(view.s, map.unit);
    const image = lead?.image === undefined ? undefined : `/images/${encodeURIComponent(lead.image.file)}?v=${lead.image.version}`;
    const party = map.party;
    // Ink a little bolder near, finer far.
    const weight = Math.min(1.5, Math.max(0.7, view.s / 8));
    const drawn = [...ways].sort((first, second) => wayRank(first.kind) - wayRank(second.kind));
    // What the labels must leave free: the tools, the compass, the scale and the places' symbols; the regions' names go first, below their middle, above, across it.
    const reserved: Box[] = [{ x: width - 64, y: 0, width: 64, height: 220 }, { x: 0, y: 0, width: 80, height: 86 }, { x: 0, y: height - 50, width: 210, height: 50 }];
    const markBoxes = layout.spots.map((spot) => ({ x: X(spot.x) - symbolOf(spot).r, y: Y(spot.y) - symbolOf(spot).r, width: symbolOf(spot).r * 2, height: symbolOf(spot).r * 2 }));
    const regionWishes = layout.regions.map((region) => ({
        x: X(region.x),
        ys: nameShares(region, hexes).map((share) => Y(region.y + region.radius * share)),
        width: region.name.length * 14,
        height: region.terrain === undefined ? 20 : 34,
    }));
    const regionLabels = placeAreaLabels(regionWishes, markBoxes, reserved, width, height);
    const regionBoxes = regionLabels.flatMap((placed, index) => placed === undefined ? [] : [{ x: placed.x - regionWishes[index].width / 2 - 3, y: placed.y - 15, width: regionWishes[index].width + 6, height: regionWishes[index].height }]);
    // A way's name along its longest run between two stops on the screen, following its bends, when the run holds it.
    const wayNames = drawn.map((way) => {
        const run = nameRun(screen(way.course), way.stops, way.name.length * 7.5 + 60);
        // The bends of a river or a path would scatter its name: it goes along their way instead, beside them.
        return run === undefined || wayLook(way.kind) === "road" ? run : [run[0], run.at(-1) as MapPoint];
    });
    const labels = placeLabels(
        layout.spots.map((spot) => {
            const isParty = spot === layout.partySpot;
            const big = isParty || (placeKinds[spot.kind ?? ""]?.size ?? 0) >= 2;
            return { text: spot.name, x: X(spot.x), y: Y(spot.y), r: isParty ? 19 : symbolOf(spot).r + 1, size: big ? 16 : 13.5, weight: weightOf(spot, layout) };
        }),
        markBoxes,
        [...reserved, ...regionBoxes],
        width,
        height,
    );
    return (
        <svg class="map-svg" viewBox={`0 0 ${width} ${height}`} aria-hidden="true">
            <defs>
                <GlassDefs prefix="map" />
                <filter id="map-grain" x="0" y="0" width="100%" height="100%">
                    <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves={3} seed={2} />
                    <feColorMatrix values="0 0 0 0 0.35  0 0 0 0 0.25  0 0 0 0 0.12  0 0 0 0.09 0" />
                    <feComposite in2="SourceGraphic" operator="in" />
                </filter>
                <filter id="map-ink" x="-5%" y="-5%" width="110%" height="110%">
                    <feTurbulence type="fractalNoise" baseFrequency="0.05" numOctaves={2} seed={4} />
                    <feDisplacementMap in="SourceGraphic" scale={2.2} />
                </filter>
                <radialGradient id="map-age" cx="50%" cy="50%" r="72%">
                    <stop offset="0.62" stop-color="#6e5028" stop-opacity="0" />
                    <stop offset="1" stop-color="#6e5028" stop-opacity="0.3" />
                </radialGradient>
                <clipPath id="map-token">
                    <circle r={13} />
                </clipPath>
                {wayNames.map((run, index) => run === undefined ? null : <path key={index} id={`world-way-name-${index}`} d={pathOf(run)} />)}
            </defs>
            <rect class="map-fog" width={width} height={height} />
            {hexes.map((hex, index) => (
                <polygon
                    key={index}
                    class={hex.lit ? `hex lit ${biomeLook(hex.biome)}` : "hex fogged"}
                    fill-opacity={hex.lit ? (0.8 + hex.tone * 0.2).toFixed(2) : undefined}
                    points={hexCorners(hex, across).map((corner) => `${X(corner.x).toFixed(1)},${Y(corner.y).toFixed(1)}`).join(" ")}
                />
            ))}
            {hexPixels >= 24 && (
                <g class="tufts">
                    {hexes.filter((hex) => hex.lit && hex.biome !== undefined && biomes[hex.biome] !== undefined).flatMap((hex, index) =>
                        marksOf(hex, hexPixels).map((mark, at) => (
                            <path
                                key={`${index} ${at}`}
                                class={`tuft ${hex.biome}`}
                                transform={`translate(${(X(hex.x) + mark.x).toFixed(1)} ${(Y(hex.y) + mark.y).toFixed(1)}) scale(${mark.scale.toFixed(2)})`}
                                d={biomes[hex.biome ?? ""].mark}
                            />
                        ))
                    )}
                </g>
            )}
            {[...edges].map(([region, segments]) => (
                <path
                    key={region}
                    class={`region-edge ${biomeLook(layout.regions.find((one) => one.name === region)?.biome)}${region === chosen ? " selected" : ""}`}
                    d={segments.map(([from, to]) => `M${X(from.x).toFixed(1)} ${Y(from.y).toFixed(1)}L${X(to.x).toFixed(1)} ${Y(to.y).toFixed(1)}`).join("")}
                    filter="url(#map-ink)"
                />
            ))}
            <rect class="map-grain" width={width} height={height} filter="url(#map-grain)" />
            {/* Where the party has been: a band under the ways, as a highlighter would mark it. */}
            {trails.map((run, index) => <path key={index} class="trail" d={line(run)} />)}
            {/* A way chosen, as from the Lore's Show on the map: a band of gold under it. */}
            {drawn.filter((way) => way.name === chosen).map((way, index) => <path key={index} class="chosen-way" d={line(way.course)} />)}
            {/* The map this one lies under or mirrors, as a ghost under its ways: it shares its coordinates (D-320). */}
            {ghost !== undefined && (
                <g class="ghost">
                    {ghost.ways.map((way, index) => <WayDrawing key={`${way.name} ${index}`} way={way} look={wayLook(way.kind)} screen={screen} weight={weight} />)}
                    {ghost.spots.map((spot) => <PlaceSymbol key={spot.name} spot={spot} x={X(spot.x)} y={Y(spot.y)} chosen={false} />)}
                </g>
            )}
            {drawn.map((way, index) => <WayDrawing key={`${way.name} ${index}`} way={way} look={wayLook(way.kind)} screen={screen} weight={weight} />)}
            {drawn.map((way, index) =>
                wayNames[index] === undefined ? null : (
                    <text key={`${way.name} ${index}`} class={`way-label ${wayLook(way.kind)}`} dy={wayLook(way.kind) === "river" ? -16 : -6}>
                        <textPath href={`#world-way-name-${index}`} startOffset="50%" text-anchor="middle">{way.name}</textPath>
                    </text>
                )
            )}
            <rect class="map-age" width={width} height={height} fill="url(#map-age)" />
            {/* A passage to another map: a ring round its place (ROA-8). */}
            {layout.spots.filter((spot) => passages.includes(spot.name)).map((spot) => <circle key={spot.name} class="passage-ring" cx={X(spot.x)} cy={Y(spot.y)} r={symbolOf(spot).r + 5} />)}
            {layout.spots.filter((spot) => spot !== layout.partySpot).map((spot) => <PlaceSymbol key={spot.name} spot={spot} x={X(spot.x)} y={Y(spot.y)} chosen={spot.name === chosen} />)}
            {party !== undefined && (
                <g
                    class={layout.partySpot !== undefined && layout.partySpot.name === chosen ? "party-mark selected" : "party-mark"}
                    transform={`translate(${X(party.x).toFixed(1)} ${Y(party.y).toFixed(1)})`}
                    data-place={layout.partySpot?.name}
                >
                    <circle class="party-pulse" r={17} />
                    {/* The party's token under glass, as the places' symbols, its shadow on the paper. */}
                    <g filter="url(#map-drop)">
                        <circle class="party-ring" r={17} />
                        <circle class="party-disc" r={14.5} />
                        {image !== undefined && <image href={image} x={-13} y={-13} width={26} height={26} clip-path="url(#map-token)" />}
                        <Glass r={14.5} prefix="map" />
                    </g>
                </g>
            )}
            <g class="labels">
                {layout.regions.map((region, index) => {
                    const placed = regionLabels[index];
                    return placed === undefined ? null : (
                        <g key={region.name}>
                            <text class="label region-label" x={placed.x} y={placed.y} text-anchor="middle">{region.name}</text>
                            {region.terrain !== undefined && <text class="label region-note" x={placed.x} y={placed.y + 15} text-anchor="middle">{terrainLabel(region.terrain)}</text>}
                        </g>
                    );
                })}
                {layout.spots.map((spot, index) => {
                    const label = labels[index];
                    const big = spot === layout.partySpot || (placeKinds[spot.kind ?? ""]?.size ?? 0) >= 2;
                    return label.hidden ? null : <text key={spot.name} class={`label place-label${big ? " big" : ""}`} x={label.x} y={label.y} text-anchor={label.anchor}>{label.text}</text>;
                })}
            </g>
            <g class="compass" transform={`translate(${narrow ? 34 : 40} ${narrow ? 42 : 46}) scale(${narrow ? 0.85 : 1})`}>
                <circle class="compass-ring" r={15} />
                <path class="compass-diagonals" d="M-12-12 12 12 M-12 12 12-12" />
                <path class="compass-point" d="M0-26 5-5 26 0 5 5 0 26-5 5-26 0-5-5Z" />
                <path class="compass-shade" d="M0-26 5-5 0 0Z M26 0 5 5 0 0Z M0 26-5 5 0 0Z M-26 0-5-5 0 0Z" />
                <text class="compass-n" y={-30} text-anchor="middle">N</text>
            </g>
            <g class="scale" transform={`translate(16 ${height - 22})`}>
                <rect class="scale-back" x={-8} y={-20} width={scale.width + 64} height={34} rx={6} />
                <rect class="scale-a" width={scale.width / 2} height={5} />
                <rect class="scale-b" x={scale.width / 2} width={scale.width / 2} height={5} />
                <text class="scale-text" x={0} y={-8}>0</text>
                <text class="scale-text" x={scale.width} y={-8} text-anchor="middle">{scale.value}</text>
                <text class="scale-text" x={scale.width + 8} y={5}>{map.unit.name === "km" ? "km" : t("miles")}</text>
            </g>
        </svg>
    );
}

/** A place's symbol by its kind: a disc with its picture, in four sizes; a kind the page does not know, a plain dot. */
export function PlaceSymbol({ spot, x, y, chosen }: { spot: Spot; x: number; y: number; chosen: boolean; })
{
    const kind = spot.kind === undefined ? undefined : placeKinds[spot.kind];
    const { r } = symbolOf(spot);
    const scale = r * 1.62 / 24;
    return (
        <g class={`spot size-${kind?.size ?? "dot"}${chosen ? " selected" : ""}`} transform={`translate(${x.toFixed(1)} ${y.toFixed(1)})`} data-place={spot.name}>
            {kind === undefined ? <circle class="spot-dot" r={4} /> : (
                // A place's symbol is a token under glass, its shadow on the paper.
                <g filter="url(#map-drop)">
                    <circle class="spot-disc" r={r} />
                    <path class="spot-glyph" transform={`translate(${-12 * scale} ${-12 * scale}) scale(${scale})`} d={kind.glyph} />
                    <Glass r={r} prefix="map" />
                </g>
            )}
            <circle class="spot-hit" r={Math.max(r, 16)} />
        </g>
    );
}

/** The look of a biome: its own when the page draws it, the bare land for none, another for one it does not know. */
export function biomeLook(biome: string | undefined): string
{
    return biome === undefined ? "open" : biomes[biome] !== undefined ? biome : "unknown-biome";
}

export function wayLook(kind: string): string
{
    return wayOrder.includes(kind) ? kind : "other";
}

export function wayRank(kind: string): number
{
    const rank = wayOrder.indexOf(wayLook(kind));
    return rank < 0 ? wayOrder.length : rank;
}

/**
 * A way drawn by hand, in the map's ink: a road as two lines, a path dashed, a river in water widening toward its mouth, outlined in ink; its tails fade into
 * the fog.
 */
function WayDrawing({ way, look, screen, weight }: { way: WayShape; look: string; screen: (points: MapPoint[]) => MapPoint[]; weight: number; })
{
    const course = screen(way.course);
    return (
        <g class={`way-drawing ${look}`}>
            {way.tails.map((tail) =>
                fading(screen(tail.course)).map((piece, index) => (
                    <path
                        key={`${tail.from} ${index}`}
                        class={`tail ${look}`}
                        d={pathOf(piece.points)}
                        stroke-opacity={piece.opacity.toFixed(2)}
                        stroke-width={(look === "river" ? (tail.from === "before" ? 1.6 : 4.4) : look === "road" ? 2.2 : 1.3) * weight}
                    />
                ))
            )}
            {look === "river" && <path class="river-water" d={riverOutline(course, 1.6 * weight, 4.6 * weight)} filter="url(#map-ink)" />}
            {look === "road" && (
                <>
                    <path class="road-ink" d={pathOf(course)} stroke-width={3.8 * weight} filter="url(#map-ink)" />
                    <path class="road-paper" d={pathOf(course)} stroke-width={1.5 * weight} />
                </>
            )}
            {(look === "path" || look === "other") && <path class={`${look}-ink`} d={pathOf(course)} stroke-width={1.4 * weight} filter="url(#map-ink)" />}
        </g>
    );
}

function symbolOf(spot: MapPlace): { r: number; }
{
    const kind = spot.kind === undefined ? undefined : placeKinds[spot.kind];
    return { r: kind === undefined ? 5 : symbolRadius[kind.size] };
}

/** How much a place's name weighs for its room: the party's place, then the larger kinds, then those holding more. */
function weightOf(spot: Spot, layout: MapLayout): number
{
    return (spot === layout.partySpot ? 100 : 0) + (placeKinds[spot.kind ?? ""]?.size ?? -1) * 20 + layout.inside(spot.name).length * 5;
}
