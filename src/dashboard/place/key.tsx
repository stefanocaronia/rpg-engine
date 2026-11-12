// The place map's key: the veil of the player's turn, the things of the legend drawn small with their names, where the squares lead.
import type { ShownGrid } from "../data.ts";
import { pageDirection, t } from "../text.ts";
import { groundKinds } from "./map.ts";
import { Corner, Ground } from "./paper.tsx";
import { Thing } from "./things.tsx";

export type Feature = ShownGrid["legend"][number];

/** The map's key: the veil of the player's turn, named with more than one player character, the things of the legend, where the squares lead. */
export function MapKey({ map, reach, self }: { map: ShownGrid; reach: boolean; self?: string | undefined; })
{
    return (
        <ul class="lm-key" aria-label={t("Legend")}>
            {/* What the veil on the player's turn is (D-335, D-340). */}
            {reach && (
                <li>
                    <svg class={`lm-swatch lm-look-${map.ground}`} viewBox="0 0 40 40" aria-hidden="true">
                        <rect class="lm-floor-fill" width={40} height={40} />
                        <g class="lm-out">
                            <rect width={40} height={40} />
                        </g>
                    </svg>
                    <span class="lm-key-name">{self === undefined ? t("out of your move this turn") : t("out of {name}'s move this turn", { name: self })}</span>
                </li>
            )}
            {map.legend.filter((feature) => !["floor", "ground"].includes(feature.kind)).map((feature) => (
                <li key={feature.symbol}>
                    <Swatch feature={feature} ground={map.ground} />
                    <span class="lm-key-name">{featureName(feature)}</span>
                    {feature.blocks && !["wall", "rock"].includes(feature.kind) && <span class="lm-key-note">{t("blocks")}</span>}
                    {feature.difficult && <span class="lm-key-note">{t("difficult")}</span>}
                </li>
            ))}
            {map.exits.map((exit) => (
                <li key={exit.square} class="lm-key-exit">
                    <span class="lm-key-square">{exit.square}</span>
                    <span>{`${pageDirection() === "rtl" ? "←" : "→"} ${exit.to ?? t("somewhere")}`}</span>
                </li>
            ))}
        </ul>
    );
}

/** A symbol of the map by its name: those every map has (GRD-1), a wall, the floor, a door, in the page's language; the others as the master named them. */
export function featureName(feature: { name: string; kind: string; }): string
{
    const builtIn: Record<string, string> = { wall: t("wall"), floor: t("floor"), door: t("door") };
    return feature.name === feature.kind ? builtIn[feature.kind] ?? feature.name : feature.name;
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
