// The world map's twin: the places the character knows, nearest the party first, then the regions and the ways.
import type { WorldMap } from "../data.ts";
import { fromLabel, terrainLabel } from "../parts/game-words.ts";
import { biomeLabel, biomes, placeKindLabel } from "../parts/map-symbols.ts";
import { t } from "../text.ts";
import { BiomeSwatch, wayLabel } from "./key.tsx";
import { type Area, lengthText, type MapLayout } from "./map.ts";

/** The map's twin: every place the character knows, nearest the party first, with how far and which way; then the regions and the ways. */
export function PlacesList({ map, full, layout, onChoose }: { map: WorldMap; full: WorldMap; layout: MapLayout; onChoose: (name: string) => void; })
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
