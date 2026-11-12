// The world map's card: the maps the character knows as tabs, the view that moves and zooms with the mouse, the wheel, touch and the keys, its tools.
import { useEffect, useMemo, useRef, useState } from "preact/hooks";
import type { MapPoint, Member, WorldMap } from "../data.ts";
import { Icon, type IconName } from "../parts/icons.tsx";
import { t } from "../text.ts";
import { Drawing } from "./drawing.tsx";
import { Key } from "./key.tsx";
import { clampScale, fitView, type Lifted, liftedOf, type MapLayout, mapNameOf, type MapPart, type MapView, type Spot, trailCourse, waterOf, wayShapes, zoomedView } from "./map.ts";
import { PlaceCard } from "./place-card.tsx";

// How wide the map shows around the party at first on a phone, in km; how much a step of the zoom and of the keys moves.
const phoneSpan = 46;
const zoomStep = 1.5;
const keyStep = 60;
// How far a pointer moves before a press is a drag, not a click, in pixels.
const dragFrom = 4;

/**
 * The map's card: its head, with the maps the character knows as tabs; the map with its tools and the card of the chosen place; the key under it. `map` is what
 * the current map draws, `full` the whole world map, for the ways that lead to other maps.
 */
export function MapCard(
    { map, full, part, layout, lead, chosen, focus, onChoose, onGo, readMore }: {
        map: WorldMap;
        full: WorldMap;
        part: MapPart;
        layout: MapLayout;
        lead?: Member;
        chosen?: string;
        focus: { name: string; count: number; };
        onChoose: (name: string | undefined) => void;
        onGo: (map: string, place?: string) => void;
        readMore: (place: string) => string | undefined;
    },
)
{
    const box = useRef<HTMLDivElement>(null);
    const [size, setSize] = useState<{ width: number; height: number; }>();
    const [view, setView] = useState<MapView>();
    // The ways drawn by hand and the trail along them, once for each map: the same at every drawing.
    const ways = useMemo(() => wayShapes(map), [map]);
    const trails = useMemo(() => part.trails.map((run) => trailCourse(run, ways, waterOf(map))), [part, ways, map]);
    const lifted = useMemo(() => liftedOf(map, layout, ways, trails), [map, layout, ways, trails]);
    // Under a map aligned with another, the other one as a ghost: its ways and its places, faint (D-320).
    const ghost = useMemo(() => {
        if (part.ghost === undefined) {
            return undefined;
        }

        const { places, roads } = part.ghost;
        return { ways: wayShapes({ ...full, places, roads }), spots: places.filter((place): place is Spot => place.x !== undefined && place.y !== undefined && place.radius === undefined) };
    }, [part, full]);
    const pointers = useRef(new Map<number, { x: number; y: number; }>());
    const drag = useRef<{ view: MapView; x: number; y: number; spread: number; moved: boolean; } | undefined>(undefined);
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

    // The first view: all the character knows; on a phone, the land around the party; with a place already chosen, as from the Lore's Show on the map, that place.
    useEffect(() => {
        if (size !== undefined && view === undefined) {
            const spot = shownPoint(map, layout, focus.name);
            const start = startView(map, lifted, size);
            setView(spot === undefined ? start : roomFor(spot, start, size, size.width < 600));
        }
    }, [size]);

    // A place chosen: the map brings it where the card leaves room, right of it on a wide screen, above it on a phone.
    useEffect(() => {
        const spot = shownPoint(map, layout, focus.name);

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
    const label = layout.partySpot === undefined ? t("World map") : t("World map, your party at {place}", { place: layout.partySpot.name });
    const here = full.maps.find((known) => known.name === part.name);
    const partyMap = full.party === undefined ? undefined : mapNameOf(full, full.party);
    return (
        <section class="card map-card" aria-labelledby="map-title">
            <header class="map-head">
                <h3 id="map-title">{t("Map")}</h3>
                <span class="map-sub">
                    {[
                        layout.spots.length === 1 ? t("1 place you know") : t("{count} places you know", { count: layout.spots.length }),
                        here?.under === undefined ? undefined : t("under {map}", { map: here.under }),
                        here?.mirror === undefined ? undefined : t("the mirror of {map}", { map: here.mirror }),
                        partyMap === undefined || partyMap === part.name ? undefined : t("your party is on {map}", { map: partyMap }),
                    ].filter((text) => text !== undefined).join(" · ")}
                </span>
                <button type="button" class="map-to-list" onClick={() => document.getElementById("places-title")?.scrollIntoView({ block: "start", behavior: "smooth" })}>
                    <Icon name="list" />
                    <span>{t("List")}</span>
                </button>
            </header>
            {full.maps.length > 1 && (
                <nav class="map-tabs" aria-label={t("Maps")}>
                    {full.maps.map((known) => (
                        <button key={known.name} type="button" class="map-tab" aria-current={known.name === part.name ? "true" : undefined} onClick={() => onGo(known.name)}>
                            {known.name}
                            {known.name === partyMap && <span class="map-tab-party" aria-label={t("your party is here")} />}
                        </button>
                    ))}
                </nav>
            )}
            <div
                ref={box}
                class="map"
                tabIndex={0}
                role="region"
                aria-roledescription="map"
                aria-label={label}
                aria-describedby="map-help"
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                onPointerCancel={onPointerUp}
                onKeyDown={onKeyDown}
            >
                {size !== undefined && view !== undefined && (
                    <Drawing
                        map={map}
                        layout={layout}
                        ways={ways}
                        trails={trails}
                        lifted={lifted}
                        ghost={ghost}
                        passages={part.passages.map((passage) => passage.place)}
                        lead={lead}
                        view={view}
                        size={size}
                        narrow={narrow}
                        chosen={chosen}
                    />
                )}
                <div class="map-tools" role="toolbar" aria-label={t("Map")}>
                    <Tool name="plus" label={t("Zoom in")} onClick={() => zoom(zoomStep)} />
                    <Tool name="minus" label={t("Zoom out")} onClick={() => zoom(1 / zoomStep)} />
                    <Tool
                        name="locate"
                        label={t("Your party")}
                        onClick={() => (map.party !== undefined && view !== undefined ? setView({ ...view, x: map.party.x, y: map.party.y }) : partyMap !== undefined && onGo(partyMap))}
                    />
                    <Tool name="fit" label={t("All you know")} onClick={() => size !== undefined && setView(fitView(lifted, size.width, size.height))} />
                </div>
                <p id="map-help" class="visually-hidden">{t("Arrows move the map, plus and minus zoom, Escape closes a place's card. The list of places below says the same.")}</p>
                {spot !== undefined && <PlaceCard place={spot} map={full} layout={layout} narrow={narrow} onClose={() => onChoose(undefined)} onGo={onGo} readMore={readMore(spot.name)} />}
            </div>
            <Key map={map} layout={layout} narrow={narrow} trail={trails.length > 0} passages={part.passages.length > 0} />
        </section>
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

/** Where the map brings a name chosen: a place, the middle of a region, or the middle of a way; none for a name it does not draw. */
function shownPoint(map: WorldMap, layout: MapLayout, name: string | undefined): MapPoint | undefined
{
    const points = map.roads.find((road) => road.name === name)?.points;
    return layout.spots.find((one) => one.name === name) ?? layout.regions.find((one) => one.name === name) ?? points?.[Math.floor((points?.length ?? 0) / 2)];
}

function middleOf(points: { x: number; y: number; }[]): { x: number; y: number; }
{
    return { x: points.reduce((sum, point) => sum + point.x, 0) / points.length, y: points.reduce((sum, point) => sum + point.y, 0) / points.length };
}

function spreadOf(points: { x: number; y: number; }[]): number
{
    return points.length > 1 ? Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y) : 0;
}
