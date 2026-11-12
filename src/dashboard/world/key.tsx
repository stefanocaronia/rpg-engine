// The world map's key: the ways, the trail and the party, the land's biomes and the fog, the kinds of place; and the names of the kinds of way.
import type { WorldMap } from "../data.ts";
import { biomeLabel, biomes, placeKindLabel, placeKinds } from "../parts/map-symbols.ts";
import { t } from "../text.ts";
import { biomeLook, PlaceSymbol, wayLook, wayRank } from "./drawing.tsx";
import type { MapLayout } from "./map.ts";

/** The key under the map: the ways, the trail and the party; the land's biomes, difficult terrain and the fog; the kinds of place on this map. */
export function Key({ map, layout, narrow, trail, passages }: { map: WorldMap; layout: MapLayout; narrow: boolean; trail: boolean; passages: boolean; })
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

/** A kind of way by its name in the page's language: River, Road, Path. */
export function wayLabel(kind: string): string
{
    const labels: Record<string, string> = { river: t("River"), road: t("Road"), path: t("Path"), portal: t("Portal"), other: t("Other way") };
    return labels[kind] ?? `${kind[0]?.toUpperCase() ?? ""}${kind.slice(1)}`;
}
