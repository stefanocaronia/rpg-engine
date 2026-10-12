// The Scene section (D-309, VIEW-6): where the party is, its picture with the places around it, its name and what holds there; the open scene, who is in it and
// whose turn it is; outside a scene who is there of those the character knows; then the place's text.
import { sectionAddress } from "./address.ts";
import type { ShownPerson, ShownPlace, ShownScene } from "./data.ts";
import { effectLabel, sinceDateLabel, terrainLabel } from "./game-words.ts";
import { cardIcons, Icon } from "./icons.tsx";
import { phraseLabel, sceneTypeLabel, strangerLabel } from "./labels.ts";
import { biomeLabel } from "./map-symbols.ts";
import { Markdown, plainLine } from "./markdown.tsx";
import { Token } from "./party.tsx";
import { PlaceMap } from "./place-map-view.tsx";
import { Card } from "./sheet.tsx";
import { t } from "./text.ts";

export function SceneView({ place, scene }: { place?: ShownPlace; scene?: ShownScene; })
{
    if (place === undefined && scene === undefined) {
        return (
            <section class="upcoming" aria-labelledby="place-name">
                <h2 id="place-name">{t("In the open")}</h2>
                <p>{t("The party is in no place the character knows, as on a road between two.")}</p>
            </section>
        );
    }

    return (
        // With a map the place's picture is the low strip it is with a scene, and the map rises (D-325).
        <section class={scene === undefined && place?.map === undefined ? "place-view" : "place-view with-scene"} aria-labelledby="place-name">
            {place && <PlaceBand place={place} />}
            {scene && <SceneCard scene={scene} />}
            {place?.map && <PlaceMap map={place.map} place={place.name} fight={scene?.type === "combat"} />}
            <div class="groups">
                {/* Who is here: under the map, who is where says it (D-325). */}
                {scene === undefined && place && place.here.length > 0 && place.map === undefined && (
                    <Card name="Here" title={t("Here")} icon={cardIcons.here} layout="lore" preview={place.here.map((person) => person.name).join(" · ")}>
                        <People people={place.here} />
                    </Card>
                )}
                {place && place.text.trim() !== "" && (
                    <Card name="Description" title={t("Description")} icon={cardIcons.description} layout="lore" preview={plainLine(place.text)}>
                        <Markdown text={place.text} />
                    </Card>
                )}
            </div>
        </section>
    );
}

/** The place's band (D-309): its picture with its name over it, or without one a compact band; the places that hold it, and what holds there. */
function PlaceBand({ place }: { place: ShownPlace; })
{
    const caption = (
        <div class="place-caption">
            {place.within.length > 0 && (
                <ol class="place-path" aria-label={t("Within")}>
                    {place.within.map((name) => <li key={name}>{name}</li>)}
                </ol>
            )}
            <h2 id="place-name">{place.name}</h2>
            {place.around.length > 0 && (
                <ul class="place-env" aria-label={t("Around")}>
                    {place.around.map((item) => <Surrounding key={`${"effect" in item ? item.effect : item.name} ${item.place ?? ""}`} item={item} name={place.name} />)}
                </ul>
            )}
        </div>
    );

    return place.image === undefined
        ? (
            <header class="place-band compact">
                <div class="place-disc">
                    <Icon name="house" />
                </div>
                {caption}
            </header>
        )
        : (
            <header class="place-band over">
                <figure class="place-image">
                    <img src={`/images/${encodeURIComponent(place.image.file)}?v=${place.image.version}`} alt="" />
                </figure>
                {caption}
            </header>
        );
}

/**
 * One thing that holds there: an entry of the environment as its name and value, as light dim, the biome and the terrain the engine reads in the page's language;
 * an effect with its end; the place it comes from, when another.
 */
function Surrounding({ item, name }: { item: ShownPlace["around"][number]; name: string; })
{
    const from = item.place === undefined || item.place === name ? undefined : item.place;
    const entry = "effect" in item ? undefined : environmentLabel(item.name, item.value);
    return (
        <li>
            {"effect" in item ? effectLabel({ name: item.effect, end: item.end }) : (
                <>
                    {entry?.name !== "" && <span class="k">{entry?.name}</span>}
                    {entry?.value}
                </>
            )}
            {from && <span class="from">{` · ${from}`}</span>}
        </li>
    );
}

/** An entry of a place's environment: the biome and the terrain, which the engine reads, in the page's language; any other as the master wrote it. */
function environmentLabel(name: string, value: string): { name: string; value: string; }
{
    const known = name.trim().toLowerCase();
    return known === "biome" ? { name: t("biome"), value: biomeLabel(value)?.toLowerCase() ?? value } : known === "terrain" ? { name: "", value: phraseLabel(terrainLabel(value)) } : { name, value };
}

/** The open scene (D-309): its title, type and since when, who is in it, and in a fight the round and whose turn it is. */
function SceneCard({ scene }: { scene: ShownScene; })
{
    const turn = scene.turn === undefined
        ? undefined
        : [scene.round === undefined ? undefined : t("Round {round}", { round: scene.round }), t("{name}'s turn", { name: strangerLabel(scene.turn) })].filter((part) => part !== undefined).join(" · ");
    return (
        <section class="scene-now" aria-labelledby="scene-title">
            <header>
                <p class="eyebrow">{t("Scene")}</p>
                <h3 id="scene-title">{scene.title}</h3>
                <span class="scene-type" data-type={scene.type}>{sceneTypeLabel(scene.type)}</span>
                {scene.since && <span class="scene-since">{sinceDateLabel(scene.since)}</span>}
            </header>
            {scene.now && <p class="scene-line">{scene.now}</p>}
            <People people={scene.who} fight={scene.type === "combat"} />
            {/* In a fight, the line leads to Combat, where the turns are (D-314). */}
            {scene.type === "combat"
                ? (
                    <p class="scene-turn">
                        {turn && `${turn} · `}
                        <a href={sectionAddress("combat")}>{t("Turn order")}</a>
                    </p>
                )
                : turn && <p class="scene-turn">{turn}</p>}
        </section>
    );
}

/**
 * Who is there: their tokens with their names under them, the party first; someone the character does not know as a hood, the copies with how many; in a fight
 * the others glow red a little, as foes (D-409).
 */
function People({ people, fight }: { people: ShownPerson[]; fight?: boolean; })
{
    return (
        <ul class="present">
            {people.map((person, index) => (
                <li key={`${person.name} ${index}`} class={person.role === "other" && index > 0 && people[index - 1].role !== "other" ? "after-party" : undefined}>
                    {person.stranger
                        ? (
                            // A kind of creature by its letter, as in Combat and on the map (D-331); anyone else unknown as a hood.
                            <span class={["token stranger", letterOf(person.name) === undefined ? "" : "numbered", fight === true && person.role === "other" ? "hostile" : ""].filter((name) => name !== "").join(" ")} aria-hidden="true">
                                {letterOf(person.name) ?? <Icon name="stranger" />}
                            </span>
                        )
                        : <Token member={{ name: person.name, role: person.role, ...(person.image === undefined ? {} : { image: person.image }) }} hostile={fight === true && person.role === "other"} />}
                    <span>
                        {person.stranger ? strangerLabel(person.name) : person.name}
                        {person.count !== undefined && person.count > 1 && <span class="count">{` ×${person.count}`}</span>}
                    </span>
                </li>
            ))}
        </ul>
    );
}

/** The letter of a kind of creature the character does not know, as "creature B" has: none for one kind alone, or for someone. */
function letterOf(name: string): string | undefined
{
    return /^creature ([A-Z])$/.exec(name)?.[1];
}
