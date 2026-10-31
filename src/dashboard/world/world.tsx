// The World section (D-276, D-318), in four tabs: the world map as the player character knows it, hexes on paper that stays light in both themes, the names in
// the story's serif, and the places as a list, its twin; what the character knows, its documents and the calendar. The map moves and zooms with the mouse, the
// wheel, touch and the keys; a place opens its card. The page draws only what view gives with map and world (VIEW-7, VIEW-11): a place the character does not
// know never reaches it.
import { useEffect, useMemo, useRef, useState } from "preact/hooks";
import { sectionAddress } from "../address.ts";
import { pictureAddress, readMap, readView, readWorld, type WorldView as World } from "../api.ts";
import type { MapPlace, MapPoint, Member, WorldMap } from "../data.ts";
import { fromLabel, terrainLabel } from "../game-words.ts";
import { Glass, GlassDefs } from "../glass.tsx";
import { Icon, type IconName } from "../icons.tsx";
import { biomeLabel, biomes, placeKindLabel, placeKinds, symbolRadius } from "../map-symbols.ts";
import { plainLine } from "../markdown.tsx";
import { WidgetCards } from "../packages/widgets.tsx";
import { PageHead } from "../pages.tsx";
import { PageTabs } from "../tabs.tsx";
import { t } from "../text.ts";
import { CalendarTab } from "./calendar.tsx";
import { DocumentsTab, LoreTab } from "./lore.tsx";
import {
    type Area,
    type Box,
    clampScale,
    fading,
    fitView,
    hexCorners,
    hexesOf,
    lengthText,
    type Lifted,
    liftedOf,
    type MapLayout,
    mapLayout,
    mapNameOf,
    type MapPart,
    mapPart,
    type MapView,
    marksOf,
    nameRun,
    nameShares,
    pathOf,
    placeAreaLabels,
    placeLabels,
    regionEdges,
    riverOutline,
    scaleBar,
    type Spot,
    trailCourse,
    waterOf,
    type WayShape,
    wayShapes,
    waysOf,
    zoomedView,
} from "./map.ts";

// How wide the map shows around the party at first on a phone, in km; how much a step of the zoom and of the keys moves.
const phoneSpan = 46;
const zoomStep = 1.5;
const keyStep = 60;
// How far a pointer moves before a press is a drag, not a click, in pixels.
const dragFrom = 4;
// The ways in the order they are drawn, the rivers under the roads.
const wayOrder = ["river", "road", "path"];

// The section's tabs, the map's first: its address is the section's own.
const worldTabs = ["map", "lore", "documents", "calendar"] as const;

/**
 * The World section: the tab the address says, and what is open in it, as #/world/lore/Bertoldo, or a place on the map, #/world/map/Guadoscuro. `players` are
 * the player characters when there is more than one, named in what they know and carry (D-480 (7)).
 */
export function WorldView({ version, lead, players, tab, item }: { version: number; lead?: Member | undefined; players?: Member[] | undefined; tab?: string | undefined; item?: string | undefined; })
{
    const [map, setMap] = useState<WorldMap>();
    const [problem, setProblem] = useState<string>();
    // What the character knows: undefined until it is read, null from a server older than the page or before there is a player character, which have the map
    // alone; a reading that fails keeps the last one.
    const [world, setWorld] = useState<World | null>();
    const [worldProblem, setWorldProblem] = useState<string>();
    const reads = useRef(0);

    // Read again whenever the game changes; only the last reading counts.
    useEffect(() => {
        const reading = ++reads.current;
        const last = (): boolean => reading === reads.current;
        const said = (error: unknown): string => error instanceof Error ? error.message : String(error);
        readMap().then((read) => {
            if (last()) {
                setMap(read);
                setProblem(undefined);
            }
        }, (error: unknown) => last() && setProblem(said(error)));
        readWorld().then((read) => {
            if (last()) {
                setWorld(read ?? null);
                setWorldProblem(undefined);
            }
        }, (error: unknown) => last() && setWorldProblem(said(error)));
    }, [version]);

    const shown: readonly string[] = world === null ? ["map"] : worldTabs;
    const chosen = shown.find((one) => one === tab) ?? "map";
    const names: Record<string, string> = { map: t("Map"), lore: t("Lore"), documents: t("Documents"), calendar: t("Calendar") };

    // A page of the lore that is on the map, a place, a region or a way, leads there; a place on the map to all the character knows of it.
    const onMap = (places: string[]): string | undefined => {
        const spot = places.find((place) => map?.places.some((one) => one.name === place && one.x !== undefined) || map?.roads.some((road) => road.name === place));
        return spot === undefined ? undefined : sectionAddress("world", "map", spot);
    };

    // What a region or a way is, by its name, as the map's list says it, for the lore (D-548).
    const kinds = useMemo(() =>
        new Map<string, string>([
            ...(map?.places ?? []).filter((one) => one.radius !== undefined).map((one): [string, string] => [one.name, [t("Region"), biomeLabel(one.biome)].filter((part) => part !== undefined).join(" · ")]),
            ...(map?.roads ?? []).map((road): [string, string] => [road.name, wayLabel(road.kind)]),
        ]), [map]);

    const readMore = (place: string): string | undefined => world?.known.some((entry) => entry.name === place) ? sectionAddress("world", "lore", place) : undefined;
    return (
        <section class="world" aria-labelledby="world-title">
            <PageHead section="world" id="world-title" />
            {shown.length > 1 && <PageTabs section="world" label={t("World")} chosen={chosen} tabs={shown.map((key) => ({ key, name: names[key] }))} />}
            <div class="world-panel" id="world-panel" {...(shown.length > 1 ? { role: "tabpanel", "aria-labelledby": `world-tab-${chosen}` } : {})}>
                {chosen === "map" && <MapTab map={map} problem={problem} lead={lead} place={item} readMore={readMore} />}
                {chosen !== "map" && world === undefined && <p class="browse-none">{worldProblem ?? t("Reading…")}</p>}
                {chosen === "lore" && world && <LoreTab world={world} version={version} open={item} onMap={onMap} kinds={kinds} {...(players === undefined ? {} : { players })} />}
                {chosen === "documents" && world && <DocumentsTab world={world} open={item} {...(players === undefined ? {} : { players })} />}
                {chosen === "calendar" && world && <CalendarTab calendar={world.calendar} />}
            </div>
            <WidgetCards place="page" page="world" />
        </section>
    );
}

/** The world map's tab: the map's card, and the places as a list, its twin; `place` opens one on its own map, as the lore's Show on the map. */
function MapTab(
    { map, problem, lead, place, readMore }: { map?: WorldMap | undefined; problem?: string | undefined; lead?: Member | undefined; place?: string | undefined; readMore: (place: string) => string | undefined; },
)
{
    const [chosen, setChosen] = useState<string>();
    // A place chosen from the list or on the map: the map brings it where the card leaves room.
    const [focus, setFocus] = useState({ name: "", count: 0 });
    // The map shown (POS-8): the one the player picked, else the party's, else the first the character knows.
    const [picked, setPicked] = useState<string>();
    const current = map === undefined ? undefined : [picked, map.party === undefined ? undefined : mapNameOf(map, map.party), map.maps[0]?.name].find((name) => name !== undefined && map.maps.some((known) => known.name === name));
    const part = useMemo(() => (map === undefined || current === undefined ? undefined : mapPart(map, current)), [map, current]);
    // What the current map draws, as the drawing reads a world map: its places, its roads, its party.
    const drawn = useMemo(() => (map === undefined || part === undefined ? undefined : { ...map, places: part.places, roads: part.roads, party: part.party, trail: [] }), [map, part]);
    const layout = useMemo(() => (drawn === undefined ? undefined : mapLayout(drawn)), [drawn]);
    const ready = map !== undefined;

    // Another map, and a place on it: the map changes, the place opens (ROA-8).
    const goTo = (name: string, to?: string): void => {
        setPicked(name);
        setChosen(to);

        if (to !== undefined) {
            setFocus((before) => ({ name: to, count: before.count + 1 }));
        }
    };

    // A place, a region or a way the address names, on its own map: a place with its card open, a region or a way marked.
    useEffect(() => {
        const there = map === undefined || place === undefined ? undefined : mapHolding(map, place);

        if (there !== undefined && place !== undefined) {
            goTo(there, place);
            // The map in sight, wherever the page was scrolled to in the lore.
            requestAnimationFrame(() => document.querySelector(".map-card")?.scrollIntoView({ block: "start" }));
        }
    }, [place, ready]);

    if (map === undefined || drawn === undefined || part === undefined || layout === undefined || (layout.spots.length === 0 && layout.regions.length === 0)) {
        return <p class="browse-none">{problem ?? (map === undefined ? t("Reading the map…") : t("Your character knows no place on the map yet: it grows as the master writes where places are."))}</p>;
    }

    // A card closed leaves the place the address named: the map's own address again.
    const choose = (name: string | undefined): void => {
        setChosen(name);

        if (name !== undefined) {
            setFocus((before) => ({ name, count: before.count + 1 }));
        } else if (place !== undefined) {
            location.replace(sectionAddress("world"));
        }
    };

    return (
        <div class="world-map">
            <MapCard key={part.name} map={drawn} full={map} part={part} layout={layout} lead={lead} chosen={chosen} focus={focus} onChoose={choose} onGo={goTo} readMore={readMore} />
            <PlacesList map={drawn} full={map} layout={layout} onChoose={choose} />
        </div>
    );
}

/**
 * The map's card: its head, with the maps the character knows as tabs; the map with its tools and the card of the chosen place; the key under it. `map` is what
 * the current map draws, `full` the whole world map, for the ways that lead to other maps.
 */
/** A biome's own picture, as the map draws its land: a tile in its colour with its mark, or the bare land for one the page does not know. */
export function BiomeSwatch({ look }: { look: string; })
{
    return (
        <svg class="key-swatch" viewBox="0 0 22 16" aria-hidden="true">
            <rect class={`hex lit ${look}`} x={1} y={1} width={20} height={14} rx={3} />
            {biomes[look] !== undefined && <path class={`tuft ${look}`} transform="translate(11 9)" d={biomes[look].mark} />}
        </svg>
    );
}

function MapCard(
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

/**
 * The drawing, from the view: the paper, the hexes lit and fogged with the marks of their biome and the ink round each region, the ways drawn by hand with
 * their tails into the fog, the trail, the places, the party, the labels, the compass and the scale.
 */
function Drawing(
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

/** A place's symbol by its kind: a disc with its picture, in four sizes; a kind the page does not know, a plain dot. */
function PlaceSymbol({ spot, x, y, chosen }: { spot: Spot; x: number; y: number; chosen: boolean; })
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

/** The card of a place: its picture, what it is and where, its text as the character knows it, what it holds, its ways, the scene when the party is there. */
function PlaceCard(
    { place, map, layout, narrow, onClose, onGo, readMore }: {
        place: Spot;
        map: WorldMap;
        layout: MapLayout;
        narrow: boolean;
        onClose: () => void;
        onGo: (map: string, place?: string) => void;
        readMore?: string | undefined;
    },
)
{
    const [text, setText] = useState<string>();
    const here = place === layout.partySpot;
    const region = layout.regions.find((one) => place.within.includes(one.name));
    const inside = layout.inside(place.name);
    const ways = waysOf(map, place.name);
    const closer = useRef<HTMLButtonElement>(null);

    // Its text, read when the card opens: the first lines as the character knows them.
    useEffect(() => {
        // Only this place's: an answer for the one opened before, which came late, is left.
        let live = true;
        setText(undefined);
        readView(place.name).then((page) => live && setText(page.kind === "page" ? plainLine(page.text) : undefined), () => live && setText(undefined));
        closer.current?.focus({ preventScroll: true });

        return () => {
            live = false;
        };
    }, [place.name]);

    const eyebrow = [placeKindLabel(place.kind) ?? t("Place"), region?.name, here || place.from?.direction === undefined ? undefined : t("{distance} from you", { distance: fromLabel(place.from, (km) => lengthText(km, map.unit)) })].filter((
        part,
    ) => part !== undefined);
    return (
        <div class={narrow ? "place-card sheet" : "place-card"} role="dialog" aria-labelledby="place-card-title" onPointerDown={(event) => event.stopPropagation()} onPointerUp={(event) => event.stopPropagation()}>
            {place.image !== undefined && <img class="pc-image" src={pictureAddress(place.image)} alt="" />}
            <button ref={closer} type="button" class="pc-close icon-button" aria-label={t("Close")} onClick={onClose}>
                <Icon name="close" />
            </button>
            <div class="pc-body">
                <p class="eyebrow pc-eyebrow">{eyebrow.join(" · ")}</p>
                <h3 id="place-card-title">{place.name}</h3>
                {here && (
                    <p class="pc-here">
                        <span class="here-dot" aria-hidden="true" />
                        {t("Your party is here")}
                    </p>
                )}
                {text !== undefined && <p class="pc-text">{text}</p>}
                {readMore !== undefined && <a class="pc-more md-link" href={readMore}>{t("Read all you know")}</a>}
                {inside.length > 0 && (
                    <>
                        <h4 class="eyebrow pc-sub">{t("Inside")}</h4>
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
                        <h4 class="eyebrow pc-sub">{t("Ways")}</h4>
                        <ul class="pc-ways">
                            {ways.map((way, index) => (
                                <li key={index}>
                                    <Icon name={wayIcon(way.kind)} />
                                    <span>
                                        <b>{way.road}</b>
                                        {` ${t("to")} `}
                                        {way.map === undefined || way.to === undefined ? way.to ?? t("somewhere you do not know") : (
                                            <button type="button" class="way-to-map" onClick={() => onGo(way.map as string, way.to)}>
                                                {t("{place}, on {map}", { place: way.to, map: way.map })}
                                            </button>
                                        )}
                                        {way.km !== undefined && " · "}
                                        {way.km !== undefined && <span class="way-km num">{lengthText(way.km, map.unit)}</span>}
                                    </span>
                                </li>
                            ))}
                        </ul>
                    </>
                )}
                {here && (
                    <a class="pc-scene" href={sectionAddress("scene")}>
                        <Icon name="scene" />
                        <span>{t("Scene")}</span>
                    </a>
                )}
            </div>
        </div>
    );
}

/** The key under the map: the ways, the trail and the party; the land's biomes, difficult terrain and the fog; the kinds of place on this map. */
function Key({ map, layout, narrow, trail, passages }: { map: WorldMap; layout: MapLayout; narrow: boolean; trail: boolean; passages: boolean; })
{
    // A passage is no line on the map: its ring says it (ROA-8).
    const ways = [...new Set(map.roads.filter((road) => road.kind !== "portal").map((road) => wayLook(road.kind)))].sort((first, second) => wayRank(first) - wayRank(second));
    const lands = [...new Set(layout.regions.map((region) => biomeLook(region.biome)))].filter((look) => look !== "open");
    const kinds = [...new Set(layout.spots.map((spot) => (spot.kind !== undefined && placeKinds[spot.kind] !== undefined ? spot.kind : "other")))];
    return (
        <details class="map-key" open={!narrow}>
            <summary>{t("Key")}</summary>
            <div class="key-groups">
                <div class="key-group">
                    <h4 class="eyebrow key-title">{t("Ways")}</h4>
                    <ul>
                        {ways.map((look) => (
                            <li key={look}>
                                <svg class="key-way" viewBox="0 0 30 16" aria-hidden="true">
                                    {look === "river" && <path class="river-water" d="M2 9.6Q8 5.8 15 8.2T28 6.6L28 9.6Q22 12 15 10.4T2 10.8Z" />}
                                    {look === "road" && (
                                        <>
                                            <path class="road-ink" d="M2 9q7-4 13-1t13-1" stroke-width={3.8} />
                                            <path class="road-paper" d="M2 9q7-4 13-1t13-1" stroke-width={1.5} />
                                        </>
                                    )}
                                    {(look === "path" || look === "other") && <path class={`${look}-ink`} d="M2 9q7-4 13-1t13-1" stroke-width={1.4} />}
                                </svg>
                                {wayLabel(look)}
                            </li>
                        ))}
                        {trail && (
                            <li>
                                <svg class="key-way" viewBox="0 0 30 16" aria-hidden="true">
                                    <path class="trail" d="M4 8h22" />
                                </svg>
                                {t("Your trail")}
                            </li>
                        )}
                        <li>
                            <svg class="key-symbol" viewBox="-9 -9 18 18" aria-hidden="true">
                                <circle class="party-ring" r={7.5} />
                                <circle class="party-disc" r={5.5} />
                            </svg>
                            {t("Your party")}
                        </li>
                        {passages && (
                            <li>
                                <svg class="key-symbol" viewBox="-12 -12 24 24" aria-hidden="true">
                                    <circle class="passage-ring" r={9} />
                                </svg>
                                {t("Passage to another map")}
                            </li>
                        )}
                    </ul>
                </div>
                <div class="key-group">
                    <h4 class="eyebrow key-title">{t("Land")}</h4>
                    <ul>
                        {lands.map((look) => (
                            <li key={look}>
                                <BiomeSwatch look={look} />
                                {biomeLabel(look) ?? t("Other land")}
                            </li>
                        ))}
                        <li>
                            <svg class="key-swatch" viewBox="0 0 22 16" aria-hidden="true">
                                <rect class="hex fogged" x={1} y={1} width={20} height={14} rx={3} />
                            </svg>
                            {t("Not found yet")}
                        </li>
                    </ul>
                </div>
                <div class="key-group">
                    <h4 class="eyebrow key-title">{t("Places")}</h4>
                    <ul>
                        {kinds.map((kind) => (
                            <li key={kind}>
                                <svg class="key-symbol" viewBox="-17 -17 34 34" aria-hidden="true">
                                    <PlaceSymbol spot={{ name: kind, x: 0, y: 0, within: [], ...(kind === "other" ? {} : { kind }) }} x={0} y={0} chosen={false} />
                                </svg>
                                {placeKindLabel(kind) ?? t("Other place")}
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
        </details>
    );
}

/** The map's twin: every place the character knows, nearest the party first, with how far and which way; then the regions and the ways. */
function PlacesList({ map, full, layout, onChoose }: { map: WorldMap; full: WorldMap; layout: MapLayout; onChoose: (name: string) => void; })
{
    const choose = (name: string): void => {
        onChoose(name);
        document.querySelector(".map")?.scrollIntoView({ block: "nearest", behavior: "smooth" });
    };

    return (
        <section class="card map-list" aria-labelledby="places-title">
            <header class="map-head">
                <h3 id="places-title">{t("Places you know")}</h3>
                <span class="map-sub">{map.party === undefined ? t("on the map") : t("from your party, as the crow flies")}</span>
            </header>
            <ol class="places">
                {layout.spots.map((spot) => (
                    <li key={spot.name}>
                        <button type="button" class="place-row" onClick={() => choose(spot.name)}>
                            <span class="pr-name">{spot.name}</span>
                            <span class="pr-kind">{[placeKindLabel(spot.kind) ?? t("Place"), ...(layout.inside(spot.name).length > 0 ? [t("{count} inside", { count: layout.inside(spot.name).length })] : [])].join(" · ")}</span>
                            <span class="pr-far num" dir="auto">{spot.from === undefined ? "" : fromLabel(spot.from, (km) => lengthText(km, map.unit))}</span>
                        </button>
                    </li>
                ))}
            </ol>
            {(layout.regions.length > 0 || map.roads.length > 0) && <h4 class="eyebrow pc-sub">{t("Regions and ways")}</h4>}
            <ul class="places">
                {layout.regions.map((region) => <RegionRow key={region.name} region={region} unit={map.unit} />)}
                {waysListed(map.roads, full.roads).map((road) => (
                    <li key={road.name}>
                        <span class="place-row static">
                            <span class="pr-name">{road.name}</span>
                            <span class="pr-kind">{wayLabel(road.kind)}</span>
                            <span class="pr-far num">{lengthText(road.km, map.unit)}</span>
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
                <span class="pr-kind">
                    {region.biome !== undefined && biomes[region.biome] !== undefined && <BiomeSwatch look={region.biome} />}
                    {[t("Region"), biomeLabel(region.biome), region.terrain === undefined ? undefined : terrainLabel(region.terrain)].filter((part) => part !== undefined).join(" · ")}
                </span>
                <span class="pr-far num" dir="auto">{t("{length} across", { length: lengthText(region.radius * 2, unit) })}</span>
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

/** A kind of way by its name in the page's language: River, Road, Path. */
function wayLabel(kind: string): string
{
    const labels: Record<string, string> = { river: t("River"), road: t("Road"), path: t("Path"), portal: t("Portal"), other: t("Other way") };
    return labels[kind] ?? `${kind[0]?.toUpperCase() ?? ""}${kind.slice(1)}`;
}

/**
 * The ways of a map as its list names them: each once, with its whole length, on this map and the others it leads to, its pieces together; a portal, which
 * has none, left out.
 */
function waysListed(roads: WorldMap["roads"], whole: WorldMap["roads"]): { name: string; kind: string; km: number; }[]
{
    const names = [...new Set(roads.filter((road) => road.kind !== "portal").map((road) => road.name))];
    return names.map((name) => {
        const pieces = whole.filter((road) => road.name === name);
        const km = pieces.reduce((sum, road) => sum + road.points.slice(1).reduce((length, point) => length + point.km, 0), 0);
        return { name, kind: pieces[0]?.kind ?? "other", km };
    });
}

/** The map that draws a name: a place's or a region's own, the middle of a way's; none for a name it does not draw. */
function mapHolding(map: WorldMap, name: string): string | undefined
{
    const points = map.roads.find((road) => road.name === name)?.points;
    const point = map.places.find((one) => one.name === name && one.x !== undefined) ?? points?.[Math.floor(points.length / 2)];
    return point === undefined ? undefined : mapNameOf(map, point);
}

/** Where the map brings a name chosen: a place, the middle of a region, or the middle of a way; none for a name it does not draw. */
function shownPoint(map: WorldMap, layout: MapLayout, name: string | undefined): MapPoint | undefined
{
    const points = map.roads.find((road) => road.name === name)?.points;
    return layout.spots.find((one) => one.name === name) ?? layout.regions.find((one) => one.name === name) ?? points?.[Math.floor((points?.length ?? 0) / 2)];
}
