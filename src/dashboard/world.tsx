// The World section (D-318): the world map as the player character knows it, hexes on paper that stays light in both themes, the names in the story's serif,
// and the places as a list, its twin. It moves and zooms with the mouse, the wheel, touch and the keys; a place opens its card. The page draws only what view
// gives with map (VIEW-7): a place the character does not know never reaches it.
import { useEffect, useMemo, useRef, useState } from "preact/hooks";
import { sectionAddress } from "./address.ts";
import { readMap, readView } from "./api.ts";
import type { MapPlace, MapPoint, Member, WorldMap } from "./data.ts";
import { Icon, type IconName } from "./icons.tsx";
import { biomes, placeKinds, symbolRadius } from "./map-symbols.ts";
import { plainLine } from "./markdown.tsx";
import {
    type Area,
    type Box,
    clampScale,
    fitView,
    hexCorners,
    hexesOf,
    lengthText,
    type Lifted,
    liftedOf,
    longestStretch,
    type MapLayout,
    mapLayout,
    type MapView,
    placeAreaLabels,
    placeLabels,
    scaleBar,
    type Spot,
    waysOf,
    zoomedView,
} from "./world-map.ts";

// How wide the map shows around the party at first on a phone, in km; how much a step of the zoom and of the keys moves.
const phoneSpan = 46;
const zoomStep = 1.5;
const keyStep = 60;
// How far a pointer moves before a press is a drag, not a click, in pixels.
const dragFrom = 4;
// The ways in the order they are drawn, the rivers under the roads.
const wayOrder = ["river", "road", "path"];

export function WorldView({ version, lead }: { version: number; lead?: Member; })
{
    const [map, setMap] = useState<WorldMap>();
    const [problem, setProblem] = useState<string>();
    const [chosen, setChosen] = useState<string>();
    // A place chosen from the list or on the map: the map brings it where the card leaves room.
    const [focus, setFocus] = useState({ name: "", count: 0 });
    const layout = useMemo(() => (map === undefined ? undefined : mapLayout(map)), [map]);

    // Read again whenever the game changes.
    useEffect(() => {
        readMap().then((read) => {
            setMap(read);
            setProblem(undefined);
        }, (error: unknown) => setProblem(error instanceof Error ? error.message : String(error)));
    }, [version]);

    if (map === undefined || layout === undefined || (layout.spots.length === 0 && layout.regions.length === 0)) {
        return (
            <section class="upcoming" aria-labelledby="world-title">
                <h2 id="world-title">World</h2>
                <p>{problem ?? (map === undefined ? "Reading the map…" : "Your character knows no place on the map yet: it grows as the master writes where places are.")}</p>
            </section>
        );
    }

    const choose = (name: string | undefined): void => {
        setChosen(name);

        if (name !== undefined) {
            setFocus((before) => ({ name, count: before.count + 1 }));
        }
    };

    return (
        <section class="world" aria-labelledby="world-title">
            <h2 id="world-title" class="visually-hidden">World</h2>
            <MapCard map={map} layout={layout} lead={lead} chosen={chosen} focus={focus} onChoose={choose} />
            <PlacesList map={map} layout={layout} onChoose={choose} />
        </section>
    );
}

/** The map's card: its head, the map with its tools and the card of the chosen place, the key under it. */
function MapCard(
    { map, layout, lead, chosen, focus, onChoose }: { map: WorldMap; layout: MapLayout; lead?: Member; chosen?: string; focus: { name: string; count: number; }; onChoose: (name: string | undefined) => void; },
)
{
    const box = useRef<HTMLDivElement>(null);
    const [size, setSize] = useState<{ width: number; height: number; }>();
    const [view, setView] = useState<MapView>();
    const lifted = useMemo(() => liftedOf(map, layout), [map, layout]);
    const pointers = useRef(new Map<number, { x: number; y: number; }>());
    const drag = useRef<{ view: MapView; x: number; y: number; spread: number; moved: boolean; }>();
    const narrow = size !== undefined && size.width < 600;

    // The map's size, as the window changes it.
    useEffect(() => {
        const element = box.current;

        if (element === null) {
            return;
        }

        const observer = new ResizeObserver(() => setSize({ width: element.clientWidth, height: element.clientHeight }));
        observer.observe(element);
        return () => observer.disconnect();
    }, []);

    // The first view: all the character knows; on a phone, the land around the party.
    useEffect(() => {
        if (size !== undefined && view === undefined) {
            setView(startView(map, lifted, size));
        }
    }, [size]);

    // A place chosen: the map brings it where the card leaves room, right of it on a wide screen, above it on a phone.
    useEffect(() => {
        const spot = layout.spots.find((one) => one.name === focus.name);

        if (spot !== undefined && size !== undefined && view !== undefined) {
            setView(roomFor(spot, view, size, narrow));
        }
    }, [focus.count]);

    // The wheel zooms around the pointer; the page does not scroll under it.
    useEffect(() => {
        const element = box.current;

        if (element === null || size === undefined) {
            return;
        }

        const wheel = (event: WheelEvent): void => {
            event.preventDefault();
            const bounds = element.getBoundingClientRect();
            setView((before) => before === undefined ? before : zoomedView(before, event.deltaY < 0 ? 1.2 : 1 / 1.2, { x: event.clientX - bounds.left, y: event.clientY - bounds.top }, size.width, size.height));
        };

        element.addEventListener("wheel", wheel, { passive: false });
        return () => element.removeEventListener("wheel", wheel);
    }, [size]);

    const zoom = (factor: number): void => {
        if (size !== undefined) {
            setView((before) => before === undefined ? before : zoomedView(before, factor, { x: size.width / 2, y: size.height / 2 }, size.width, size.height));
        }
    };

    // One pointer moves the map, two pinch it: mouse, pen and touch alike. A press that hardly moves is a click.
    const begin = (moved: boolean): void => {
        const points = [...pointers.current.values()];
        const centre = middleOf(points);
        drag.current = view === undefined ? undefined : { view, ...centre, spread: spreadOf(points), moved };
    };

    const onPointerDown = (event: PointerEvent): void => {
        pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
        begin(false);
    };

    const onPointerMove = (event: PointerEvent): void => {
        const start = drag.current;

        if (start === undefined || !pointers.current.has(event.pointerId)) {
            return;
        }

        pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
        const points = [...pointers.current.values()];
        const centre = middleOf(points);
        const spread = spreadOf(points);

        if (!start.moved && Math.hypot(centre.x - start.x, centre.y - start.y) < dragFrom && points.length === 1) {
            return;
        }

        if (!start.moved) {
            (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
            start.moved = true;
        }

        const s = start.spread > 0 && spread > 0 ? clampScale(start.view.s * spread / start.spread) : start.view.s;
        setView({ s, x: start.view.x - (centre.x - start.x) / s, y: start.view.y + (centre.y - start.y) / s });
    };

    const onPointerUp = (event: PointerEvent): void => {
        pointers.current.delete(event.pointerId);
        const moved = drag.current?.moved === true;

        if (pointers.current.size > 0) {
            begin(moved);
        } else if (!moved) {
            // A click on a place opens its card; on the land, it closes it.
            const name = (event.target as Element).closest<SVGElement>("[data-place]")?.dataset.place;
            onChoose(name);
            drag.current = undefined;
        } else {
            drag.current = undefined;
        }
    };

    const onKeyDown = (event: KeyboardEvent): void => {
        // Escape closes the card from anywhere in the map, and the map takes the keys again.
        if (event.key === "Escape" && chosen !== undefined) {
            onChoose(undefined);
            box.current?.focus();
            return;
        }

        if (event.target !== box.current || view === undefined) {
            return;
        }

        const step = keyStep / view.s;
        const moves: Record<string, [number, number]> = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, step], ArrowDown: [0, -step] };
        const move = moves[event.key];

        if (move !== undefined) {
            event.preventDefault();
            setView({ ...view, x: view.x + move[0], y: view.y + move[1] });
        } else if (event.key === "+" || event.key === "=") {
            zoom(zoomStep);
        } else if (event.key === "-") {
            zoom(1 / zoomStep);
        }
    };

    const spot = layout.spots.find((one) => one.name === chosen);
    const where = layout.partySpot === undefined ? "" : `, your party at ${layout.partySpot.name}`;
    return (
        <section class="map-card" aria-labelledby="map-title">
            <header class="map-head">
                <h3 id="map-title">Map</h3>
                <span class="map-sub">{`${layout.spots.length} ${layout.spots.length === 1 ? "place" : "places"} you know`}</span>
                <button type="button" class="map-to-list" onClick={() => document.getElementById("places-title")?.scrollIntoView({ block: "start", behavior: "smooth" })}>
                    <Icon name="list" />
                    <span>List</span>
                </button>
            </header>
            <div
                ref={box}
                class="map"
                tabIndex={0}
                role="region"
                aria-roledescription="map"
                aria-label={`World map${where}`}
                aria-describedby="map-help"
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                onPointerCancel={onPointerUp}
                onKeyDown={onKeyDown}
            >
                {size !== undefined && view !== undefined && <Drawing map={map} layout={layout} lifted={lifted} lead={lead} view={view} size={size} narrow={narrow} chosen={chosen} />}
                <div class="map-tools" role="toolbar" aria-label="Map">
                    <Tool name="plus" label="Zoom in" onClick={() => zoom(zoomStep)} />
                    <Tool name="minus" label="Zoom out" onClick={() => zoom(1 / zoomStep)} />
                    <Tool name="locate" label="Your party" onClick={() => map.party !== undefined && view !== undefined && setView({ ...view, x: map.party.x, y: map.party.y })} />
                    <Tool name="fit" label="All you know" onClick={() => size !== undefined && setView(fitView(lifted, size.width, size.height))} />
                </div>
                <p id="map-help" class="visually-hidden">Arrows move the map, plus and minus zoom, Escape closes a place's card. The list of places below says the same.</p>
                {spot !== undefined && <PlaceCard place={spot} map={map} layout={layout} narrow={narrow} onClose={() => onChoose(undefined)} />}
            </div>
            <Key map={map} layout={layout} narrow={narrow} />
        </section>
    );
}

/** The drawing, from the view: the paper, the hexes lit and fogged, the ways, the trail, the places, the party, the labels, north and the scale. */
function Drawing(
    { map, layout, lifted, lead, view, size, narrow, chosen }: {
        map: WorldMap;
        layout: MapLayout;
        lifted: Lifted;
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
    const line = (points: MapPoint[]): string => points.map((point, index) => `${index === 0 ? "M" : "L"}${X(point.x).toFixed(1)} ${Y(point.y).toFixed(1)}`).join(" ");
    const { across, hexes } = hexesOf(view, width, height, lifted, layout.regions);
    const marks = across * view.s >= 24;
    const scale = scaleBar(view.s, map.unit);
    const image = lead?.image === undefined ? undefined : `/images/${encodeURIComponent(lead.image.file)}?v=${lead.image.version}`;
    const party = map.party;
    // What the labels must leave free: the tools, north, the scale and the places' symbols; the regions' names go first, below their middle, above, across it.
    const reserved: Box[] = [{ x: width - 64, y: 0, width: 64, height: 220 }, { x: 0, y: 0, width: 60, height: 64 }, { x: 0, y: height - 50, width: 210, height: 50 }];
    const markBoxes = layout.spots.map((spot) => ({ x: X(spot.x) - symbolOf(spot).r, y: Y(spot.y) - symbolOf(spot).r, width: symbolOf(spot).r * 2, height: symbolOf(spot).r * 2 }));
    const regionWishes = layout.regions.map((region) => ({
        x: X(region.x),
        ys: [-0.55, 0.55, 0, -0.8, 0.8].map((share) => Y(region.y + region.radius * share)),
        width: region.name.length * 14,
        height: region.terrain === undefined ? 20 : 34,
    }));
    const regionLabels = placeAreaLabels(regionWishes, markBoxes, reserved, width, height);
    const regionBoxes = regionLabels.flatMap((placed, index) => placed === undefined ? [] : [{ x: placed.x - regionWishes[index].width / 2 - 3, y: placed.y - 15, width: regionWishes[index].width + 6, height: regionWishes[index].height }]);
    const ways = [...map.roads].sort((first, second) => wayRank(first.kind) - wayRank(second.kind));
    // A way's name along its longest stretch on the screen, away from the stops, when the stretch holds it.
    const wayNames = ways.map((road) => {
        const stretch = longestStretch(road.points.map((point) => ({ x: X(point.x), y: Y(point.y) })));
        return stretch !== undefined && Math.hypot(stretch[1].x - stretch[0].x, stretch[1].y - stretch[0].y) >= road.name.length * 7.5 + 40 ? stretch : undefined;
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
                <filter id="map-grain" x="0" y="0" width="100%" height="100%">
                    <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves={3} seed={2} />
                    <feColorMatrix values="0 0 0 0 0.35  0 0 0 0 0.25  0 0 0 0 0.12  0 0 0 0.09 0" />
                    <feComposite in2="SourceGraphic" operator="in" />
                </filter>
                <filter id="map-ink" x="-5%" y="-5%" width="110%" height="110%">
                    <feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves={2} seed={4} />
                    <feDisplacementMap in="SourceGraphic" scale={3.5} />
                </filter>
                <clipPath id="map-token">
                    <circle r={13} />
                </clipPath>
                {wayNames.map((stretch, index) =>
                    stretch === undefined ? null : <path key={index} id={`world-way-name-${index}`} d={`M${stretch[0].x.toFixed(1)} ${stretch[0].y.toFixed(1)} L${stretch[1].x.toFixed(1)} ${stretch[1].y.toFixed(1)}`} />
                )}
            </defs>
            <rect class="map-fog" width={width} height={height} />
            {hexes.map((hex, index) => (
                <polygon
                    key={index}
                    class={hex.lit ? `hex lit ${biomeLook(hex.biome)}` : "hex fogged"}
                    points={hexCorners(hex, across).map((corner) => `${X(corner.x).toFixed(1)},${Y(corner.y).toFixed(1)}`).join(" ")}
                />
            ))}
            {marks && (
                <g class="tufts">
                    {hexes.filter((hex) => hex.lit && hex.biome !== undefined && biomes[hex.biome] !== undefined).map((hex, index) => (
                        <path key={index} class={`tuft ${hex.biome}`} transform={`translate(${X(hex.x).toFixed(1)} ${(Y(hex.y) + 2).toFixed(1)})`} d={biomes[hex.biome ?? ""].mark} />
                    ))}
                </g>
            )}
            <rect class="map-grain" width={width} height={height} filter="url(#map-grain)" />
            {/* Where the party has been: a band under the ways, as a highlighter would mark it. */}
            {map.trail.length > 1 && <path class="trail" d={line(map.trail)} />}
            {ways.map((road) => (
                <g key={road.name} class={`way-group ${wayLook(road.kind)}`}>
                    <path class="way casing" d={line(road.points)} filter="url(#map-ink)" />
                    <path class="way" d={line(road.points)} filter="url(#map-ink)" />
                    {road.before !== undefined && road.points[0] !== undefined && <path class="way stub" d={line([road.points[0], road.before])} />}
                    {road.after !== undefined && road.points.at(-1) !== undefined && <path class="way stub" d={line([road.points.at(-1) as MapPoint, road.after])} />}
                </g>
            ))}
            {ways.map((road, index) =>
                wayNames[index] === undefined ? null : (
                    <text key={road.name} class={`way-label ${wayLook(road.kind)}`} dy={wayLook(road.kind) === "river" ? -6 : -5}>
                        <textPath href={`#world-way-name-${index}`} startOffset="50%" text-anchor="middle">{road.name}</textPath>
                    </text>
                )
            )}
            {layout.spots.filter((spot) => spot !== layout.partySpot).map((spot) => <PlaceSymbol key={spot.name} spot={spot} x={X(spot.x)} y={Y(spot.y)} chosen={spot.name === chosen} />)}
            {party !== undefined && (
                <g
                    class={layout.partySpot !== undefined && layout.partySpot.name === chosen ? "party-mark selected" : "party-mark"}
                    transform={`translate(${X(party.x).toFixed(1)} ${Y(party.y).toFixed(1)})`}
                    data-place={layout.partySpot?.name}
                >
                    <circle class="party-pulse" r={17} />
                    <circle class="party-ring" r={17} />
                    <circle class="party-disc" r={14.5} />
                    {image !== undefined && <image href={image} x={-13} y={-13} width={26} height={26} clip-path="url(#map-token)" />}
                </g>
            )}
            <g class="labels">
                {layout.regions.map((region, index) => {
                    const placed = regionLabels[index];
                    return placed === undefined ? null : (
                        <g key={region.name}>
                            <text class="label region-label" x={placed.x} y={placed.y} text-anchor="middle">{region.name}</text>
                            {region.terrain !== undefined && <text class="label region-note" x={placed.x} y={placed.y + 15} text-anchor="middle">{`${region.terrain} terrain`}</text>}
                        </g>
                    );
                })}
                {layout.spots.map((spot, index) => {
                    const label = labels[index];
                    const big = spot === layout.partySpot || (placeKinds[spot.kind ?? ""]?.size ?? 0) >= 2;
                    return label.hidden ? null : <text key={spot.name} class={`label place-label${big ? " big" : ""}`} x={label.x} y={label.y} text-anchor={label.anchor}>{label.text}</text>;
                })}
            </g>
            <g class="north" transform={`translate(${narrow ? 26 : 30} ${narrow ? 30 : 34})`}>
                <circle class="north-disc" r={15} />
                <path class="north-arrow" d="M0 -10 5 6 0 3 -5 6Z" />
                <text class="north-n" y={-17} text-anchor="middle">N</text>
            </g>
            <g class="scale" transform={`translate(16 ${height - 22})`}>
                <rect class="scale-back" x={-8} y={-20} width={scale.width + 64} height={34} rx={6} />
                <rect class="scale-a" width={scale.width / 2} height={5} />
                <rect class="scale-b" x={scale.width / 2} width={scale.width / 2} height={5} />
                <text class="scale-text" x={0} y={-8}>0</text>
                <text class="scale-text" x={scale.width} y={-8} text-anchor="middle">{scale.value}</text>
                <text class="scale-text" x={scale.width + 8} y={5}>{map.unit.name === "km" ? "km" : "miles"}</text>
            </g>
        </svg>
    );
}

/** A place's symbol by its kind: a disc with its picture, in four sizes; a kind the page does not know, a plain dot. */
function PlaceSymbol({ spot, x, y, chosen }: { spot: Spot; x: number; y: number; chosen: boolean; })
{
    const kind = spot.kind === undefined ? undefined : placeKinds[spot.kind];
    const { r } = symbolOf(spot);
    const scale = r * 1.62 / 24;
    return (
        <g class={`spot size-${kind?.size ?? "dot"}${chosen ? " selected" : ""}`} transform={`translate(${x.toFixed(1)} ${y.toFixed(1)})`} data-place={spot.name}>
            {kind === undefined ? <circle class="spot-dot" r={4} /> : (
                <>
                    <circle class="spot-disc" r={r} />
                    <path class="spot-glyph" transform={`translate(${-12 * scale} ${-12 * scale}) scale(${scale})`} d={kind.glyph} />
                </>
            )}
            <circle class="spot-hit" r={Math.max(r, 16)} />
        </g>
    );
}

/** The card of a place: its picture, what it is and where, its text as the character knows it, what it holds, its ways, the scene when the party is there. */
function PlaceCard({ place, map, layout, narrow, onClose }: { place: Spot; map: WorldMap; layout: MapLayout; narrow: boolean; onClose: () => void; })
{
    const [text, setText] = useState<string>();
    const here = place === layout.partySpot;
    const region = layout.regions.find((one) => place.within.includes(one.name));
    const inside = layout.inside(place.name);
    const ways = waysOf(map, place.name);
    const closer = useRef<HTMLButtonElement>(null);

    // Its text, read when the card opens: the first lines as the character knows them.
    useEffect(() => {
        setText(undefined);
        readView(place.name).then((page) => setText(page.kind === "page" ? plainLine(page.text) : undefined), () => setText(undefined));
        closer.current?.focus({ preventScroll: true });
    }, [place.name]);

    const eyebrow = [placeKinds[place.kind ?? ""]?.label ?? "Place", region?.name, here || place.from === undefined ? undefined : `${place.from} from you`].filter((part) => part !== undefined);
    return (
        <div class={narrow ? "place-card sheet" : "place-card"} role="dialog" aria-labelledby="place-card-title" onPointerDown={(event) => event.stopPropagation()} onPointerUp={(event) => event.stopPropagation()}>
            {place.image !== undefined && <img class="pc-image" src={`/images/${encodeURIComponent(place.image.file)}?v=${place.image.version}`} alt="" />}
            <button ref={closer} type="button" class="pc-close icon-button" aria-label="Close" onClick={onClose}>
                <Icon name="close" />
            </button>
            <div class="pc-body">
                <p class="pc-eyebrow">{eyebrow.join(" · ")}</p>
                <h3 id="place-card-title">{place.name}</h3>
                {here && (
                    <p class="pc-here">
                        <span class="here-dot" aria-hidden="true" />
                        Your party is here
                    </p>
                )}
                {text !== undefined && <p class="pc-text">{text}</p>}
                {inside.length > 0 && (
                    <>
                        <h4 class="pc-sub">Inside</h4>
                        <ul class="in-chips">
                            {inside.flatMap((child) => [
                                <li key={child.name} class="in-chip">{child.name}</li>,
                                ...layout.inside(child.name).map((grandchild) => (
                                    <li key={grandchild.name} class="in-chip">
                                        <span class="in-path">›</span> {grandchild.name}
                                    </li>
                                )),
                            ])}
                        </ul>
                    </>
                )}
                {ways.length > 0 && (
                    <>
                        <h4 class="pc-sub">Ways</h4>
                        <ul class="pc-ways">
                            {ways.map((way, index) => (
                                <li key={index}>
                                    <Icon name={wayIcon(way.kind)} />
                                    <span>
                                        <b>{way.road}</b>
                                        {` to ${way.to ?? "somewhere you do not know"}`}
                                        {way.km !== undefined && <span class="way-km num">{` · ${lengthText(way.km, map.unit)}`}</span>}
                                    </span>
                                </li>
                            ))}
                        </ul>
                    </>
                )}
                {here && (
                    <a class="pc-scene" href={sectionAddress("scene")}>
                        <Icon name="scene" />
                        <span>Scene</span>
                    </a>
                )}
            </div>
        </div>
    );
}

/** The key under the map: the ways, the trail and the party; the land's biomes, difficult terrain and the fog; the kinds of place on this map. */
function Key({ map, layout, narrow }: { map: WorldMap; layout: MapLayout; narrow: boolean; })
{
    const ways = [...new Set(map.roads.map((road) => wayLook(road.kind)))].sort((first, second) => wayRank(first) - wayRank(second));
    const lands = [...new Set(layout.regions.map((region) => biomeLook(region.biome)))].filter((look) => look !== "open");
    const kinds = [...new Set(layout.spots.map((spot) => (spot.kind !== undefined && placeKinds[spot.kind] !== undefined ? spot.kind : "other")))];
    return (
        <details class="map-key" open={!narrow}>
            <summary>Key</summary>
            <div class="key-groups">
                <div class="key-group">
                    <h4 class="key-title">Ways</h4>
                    <ul>
                        {ways.map((look) => (
                            <li key={look}>
                                <svg class="key-way" viewBox="0 0 28 10" aria-hidden="true">
                                    <g class={`way-group ${look}`}>
                                        <path class="way casing" d="M1 5h26" />
                                        <path class="way" d="M1 5h26" />
                                    </g>
                                </svg>
                                {look === "other" ? "Other way" : `${look[0].toUpperCase()}${look.slice(1)}`}
                            </li>
                        ))}
                        {map.trail.length > 1 && (
                            <li>
                                <svg class="key-way" viewBox="0 0 28 10" aria-hidden="true">
                                    <path class="trail" d="M1 5h26" />
                                </svg>
                                Your trail
                            </li>
                        )}
                        <li>
                            <svg class="key-symbol" viewBox="-9 -9 18 18" aria-hidden="true">
                                <circle class="party-ring" r={7.5} />
                                <circle class="party-disc" r={5.5} />
                            </svg>
                            Your party
                        </li>
                    </ul>
                </div>
                <div class="key-group">
                    <h4 class="key-title">Land</h4>
                    <ul>
                        {lands.map((look) => (
                            <li key={look}>
                                <svg class="key-swatch" viewBox="0 0 22 16" aria-hidden="true">
                                    <rect class={`hex lit ${look}`} x={1} y={1} width={20} height={14} rx={3} />
                                    {biomes[look] !== undefined && <path class={`tuft ${look}`} transform="translate(11 9)" d={biomes[look].mark} />}
                                </svg>
                                {biomes[look]?.label ?? "Other land"}
                            </li>
                        ))}
                        <li>
                            <svg class="key-swatch" viewBox="0 0 22 16" aria-hidden="true">
                                <rect class="hex fogged" x={1} y={1} width={20} height={14} rx={3} />
                            </svg>
                            Not found yet
                        </li>
                    </ul>
                </div>
                <div class="key-group">
                    <h4 class="key-title">Places</h4>
                    <ul>
                        {kinds.map((kind) => (
                            <li key={kind}>
                                <svg class="key-symbol" viewBox="-17 -17 34 34" aria-hidden="true">
                                    <PlaceSymbol spot={{ name: kind, x: 0, y: 0, within: [], ...(kind === "other" ? {} : { kind }) }} x={0} y={0} chosen={false} />
                                </svg>
                                {placeKinds[kind]?.label ?? "Other place"}
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
        </details>
    );
}

/** The map's twin: every place the character knows, nearest the party first, with how far and which way; then the regions and the ways. */
function PlacesList({ map, layout, onChoose }: { map: WorldMap; layout: MapLayout; onChoose: (name: string) => void; })
{
    const choose = (name: string): void => {
        onChoose(name);
        document.querySelector(".map")?.scrollIntoView({ block: "nearest", behavior: "smooth" });
    };

    return (
        <section class="map-list" aria-labelledby="places-title">
            <header class="map-head">
                <h3 id="places-title">Places you know</h3>
                <span class="map-sub">{map.party === undefined ? "on the map" : "from your party, as the crow flies"}</span>
            </header>
            <ol class="places">
                {layout.spots.map((spot) => (
                    <li key={spot.name}>
                        <button type="button" class="place-row" onClick={() => choose(spot.name)}>
                            <span class="pr-name">{spot.name}</span>
                            <span class="pr-kind">{[placeKinds[spot.kind ?? ""]?.label ?? "Place", ...(layout.inside(spot.name).length > 0 ? [`${layout.inside(spot.name).length} inside`] : [])].join(" · ")}</span>
                            <span class="pr-far num">{spot.from === undefined ? "" : spot.from === "here" ? "Here" : spot.from}</span>
                        </button>
                    </li>
                ))}
            </ol>
            {(layout.regions.length > 0 || map.roads.length > 0) && <h4 class="pc-sub">Regions and ways</h4>}
            <ul class="places">
                {layout.regions.map((region) => <RegionRow key={region.name} region={region} unit={map.unit} />)}
                {map.roads.map((road) => (
                    <li key={road.name}>
                        <span class="place-row static">
                            <span class="pr-name">{road.name}</span>
                            <span class="pr-kind">{`${road.kind[0].toUpperCase()}${road.kind.slice(1)}`}</span>
                            <span class="pr-far num">{lengthText(road.points.slice(1).reduce((sum, point) => sum + point.km, 0), map.unit)}</span>
                        </span>
                    </li>
                ))}
            </ul>
        </section>
    );
}

function RegionRow({ region, unit }: { region: Area; unit: WorldMap["unit"]; })
{
    return (
        <li>
            <span class="place-row static">
                <span class="pr-name">{region.name}</span>
                <span class="pr-kind">{["Region", biomes[region.biome ?? ""]?.label, region.terrain === undefined ? undefined : `${region.terrain} terrain`].filter((part) => part !== undefined).join(" · ")}</span>
                <span class="pr-far num">{`${lengthText(region.radius * 2, unit)} across`}</span>
            </span>
        </li>
    );
}

function Tool({ name, label, onClick }: { name: IconName; label: string; onClick: () => void; })
{
    return (
        <button type="button" class="map-tool" aria-label={label} data-tip={label} onClick={onClick} onPointerDown={(event) => event.stopPropagation()} onPointerUp={(event) => event.stopPropagation()}>
            <Icon name={name} />
        </button>
    );
}

/** The view at first: all the character knows; on a phone, the land around the party. */
function startView(map: WorldMap, lifted: Lifted, size: { width: number; height: number; }): MapView
{
    return size.width < 600 && map.party !== undefined ? { x: map.party.x, y: map.party.y, s: clampScale(size.width / phoneSpan) } : fitView(lifted, size.width, size.height);
}

/** The view that brings a place where the card leaves room: right of it on a wide screen, in the upper part on a phone. */
function roomFor(spot: MapPoint, view: MapView, size: { width: number; height: number; }, narrow: boolean): MapView
{
    const freeX = narrow ? size.width / 2 : (340 + size.width - 60) / 2;
    const freeY = narrow ? size.height * 0.2 : size.height / 2;
    return { ...view, x: spot.x - (freeX - size.width / 2) / view.s, y: spot.y - (size.height / 2 - freeY) / view.s };
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

/** The look of a biome: its own when the page draws it, the bare land for none, another for one it does not know. */
function biomeLook(biome: string | undefined): string
{
    return biome === undefined ? "open" : biomes[biome] !== undefined ? biome : "unknown-biome";
}

function wayLook(kind: string): string
{
    return wayOrder.includes(kind) ? kind : "other";
}

function wayRank(kind: string): number
{
    const rank = wayOrder.indexOf(wayLook(kind));
    return rank < 0 ? wayOrder.length : rank;
}

function wayIcon(kind: string): IconName
{
    return kind === "river" ? "river" : kind === "path" ? "path" : "road";
}

function middleOf(points: { x: number; y: number; }[]): { x: number; y: number; }
{
    return { x: points.reduce((sum, point) => sum + point.x, 0) / points.length, y: points.reduce((sum, point) => sum + point.y, 0) / points.length };
}

function spreadOf(points: { x: number; y: number; }[]): number
{
    return points.length > 1 ? Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y) : 0;
}
