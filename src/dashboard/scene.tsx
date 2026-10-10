// The Scene section (D-309, VIEW-6): where the party is, its picture with the places around it, its name and what holds there; the open scene, who is in it and
// whose turn it is; outside a scene who is there of those the character knows; then the place's text.
import { sectionAddress } from "./address.ts";
import type { ShownPerson, ShownPlace, ShownScene } from "./data.ts";
import { cardIcons, Icon } from "./icons.tsx";
import { Markdown, plainLine } from "./markdown.tsx";
import { Token } from "./party.tsx";
import { Card } from "./sheet.tsx";

export function SceneView({ place, scene }: { place?: ShownPlace; scene?: ShownScene; })
{
    if (place === undefined && scene === undefined) {
        return (
            <section class="upcoming" aria-labelledby="place-name">
                <h2 id="place-name">In the open</h2>
                <p>The party is in no place the character knows, as on a road between two.</p>
            </section>
        );
    }

    return (
        <section class={scene === undefined ? "place-view" : "place-view with-scene"} aria-labelledby="place-name">
            {place && <PlaceBand place={place} />}
            {scene && <SceneCard scene={scene} />}
            <div class="groups">
                {scene === undefined && place && place.here.length > 0 && (
                    <Card name="Here" icon={cardIcons.here} layout="lore" preview={place.here.map((person) => person.name).join(" · ")}>
                        <People people={place.here} />
                    </Card>
                )}
                {place && place.text.trim() !== "" && (
                    <Card name="Description" icon={cardIcons.description} layout="lore" preview={plainLine(place.text)}>
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
                <ol class="place-path" aria-label="Within">
                    {place.within.map((name) => <li key={name}>{name}</li>)}
                </ol>
            )}
            <h2 id="place-name">{place.name}</h2>
            {place.around.length > 0 && (
                <ul class="place-env" aria-label="Around">
                    {place.around.map((item) => <Surrounding key={`${item.text} ${item.place ?? ""}`} text={item.text} place={item.place} name={place.name} />)}
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

/** One thing that holds there: an entry of the environment as its name and value, as light dim; an effect with its end; the place it comes from, when another. */
function Surrounding({ text, place, name }: { text: string; place?: string; name: string; })
{
    const entry = /^([^:]+):\s*(.+)$/.exec(text);
    const from = place === undefined || place === name ? undefined : place;
    return (
        <li>
            {entry === null ? text : (
                <>
                    <span class="k">{entry[1]}</span>
                    {entry[2]}
                </>
            )}
            {from && <span class="from">{` · ${from}`}</span>}
        </li>
    );
}

/** The open scene (D-309): its title, type and since when, who is in it, and in a fight the round and whose turn it is. */
function SceneCard({ scene }: { scene: ShownScene; })
{
    const turn = scene.turn === undefined ? undefined : [scene.round === undefined ? undefined : `Round ${scene.round}`, `${scene.turn}'s turn`].filter((part) => part !== undefined).join(" · ");
    return (
        <section class="scene-now" aria-labelledby="scene-title">
            <header>
                <p class="eyebrow">Scene</p>
                <h3 id="scene-title">{scene.title}</h3>
                <span class={`scene-type ${scene.type}`}>{scene.type}</span>
                {scene.since && <span class="scene-since">{`since ${scene.since}`}</span>}
            </header>
            {scene.now && <p class="scene-line">{scene.now}</p>}
            <People people={scene.who} />
            {/* In a fight, the line leads to Combat, where the turns are (D-314). */}
            {scene.type === "combat"
                ? (
                    <p class="scene-turn">
                        {turn && `${turn} · `}
                        <a href={sectionAddress("combat")}>Turn order</a>
                    </p>
                )
                : turn && <p class="scene-turn">{turn}</p>}
        </section>
    );
}

/** Who is there: their tokens with their names under them, the party first; someone the character does not know as a hood, the copies with how many. */
function People({ people }: { people: ShownPerson[]; })
{
    return (
        <ul class="present">
            {people.map((person, index) => (
                <li key={`${person.name} ${index}`} class={person.role === "other" && index > 0 && people[index - 1].role !== "other" ? "after-party" : undefined}>
                    {person.stranger
                        ? (
                            <span class="token stranger" aria-hidden="true">
                                <Icon name="stranger" />
                            </span>
                        )
                        : <Token member={{ name: person.name, role: person.role, ...(person.image === undefined ? {} : { image: person.image }) }} />}
                    <span>
                        {person.stranger ? capitalized(person.name) : person.name}
                        {person.count !== undefined && person.count > 1 && <span class="count">{` ×${person.count}`}</span>}
                    </span>
                </li>
            ))}
        </ul>
    );
}

function capitalized(text: string): string
{
    return `${text[0]?.toUpperCase() ?? ""}${text.slice(1)}`;
}
