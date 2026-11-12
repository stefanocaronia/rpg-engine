// The World section (D-276, D-318), in four tabs: the world map as the player character knows it, hexes on paper that stays light in both themes, the names in
// the story's serif, and the places as a list, its twin; what the character knows, its documents and the calendar. The map moves and zooms with the mouse, the
// wheel, touch and the keys; a place opens its card. The page draws only what view gives with map and world (VIEW-7, VIEW-11): a place the character does not
// know never reaches it.
import { useEffect, useMemo, useRef, useState } from "preact/hooks";
import { sectionAddress } from "../address.ts";
import { readMap, readWorld, type WorldView as World } from "../api.ts";
import type { Member, WorldMap } from "../data.ts";
import { WidgetCards } from "../packages/widgets.tsx";
import { biomeLabel } from "../parts/map-symbols.ts";
import { PageHead } from "../shell/pages.tsx";
import { PageTabs } from "../shell/tabs.tsx";
import { t } from "../text.ts";
import { CalendarTab } from "./calendar.tsx";
import { wayLabel } from "./key.tsx";
import { DocumentsTab, LoreTab } from "./lore.tsx";
import { MapCard } from "./map-card.tsx";
import { mapLayout, mapNameOf, mapPart } from "./map.ts";
import { PlacesList } from "./places.tsx";

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

/** The map that draws a name: a place's or a region's own, the middle of a way's; none for a name it does not draw. */
function mapHolding(map: WorldMap, name: string): string | undefined
{
    const points = map.roads.find((road) => road.name === name)?.points;
    const point = map.places.find((one) => one.name === name && one.x !== undefined) ?? points?.[Math.floor(points.length / 2)];
    return point === undefined ? undefined : mapNameOf(map, point);
}
