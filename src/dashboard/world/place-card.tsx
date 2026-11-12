// The card of a place on the world map: its picture, what it is and where, its text as the character knows it, what it holds, its ways.
import { useEffect, useRef, useState } from "preact/hooks";
import { sectionAddress } from "../address.ts";
import { pictureAddress, readView } from "../api.ts";
import type { WorldMap } from "../data.ts";
import { fromLabel } from "../parts/game-words.ts";
import { Icon, type IconName } from "../parts/icons.tsx";
import { placeKindLabel } from "../parts/map-symbols.ts";
import { plainLine } from "../parts/markdown.tsx";
import { t } from "../text.ts";
import { lengthText, type MapLayout, type Spot, waysOf } from "./map.ts";

/** The card of a place: its picture, what it is and where, its text as the character knows it, what it holds, its ways, the scene when the party is there. */
export function PlaceCard(
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

function wayIcon(kind: string): IconName
{
    return kind === "river" ? "river" : kind === "path" ? "path" : "road";
}
