// The Scene section (D-309, VIEW-6, D-444): where the party is, its picture with the places around it, its name, what holds there and its text; the open
// scene and who is in it; outside a scene who is there of those the character knows; the map. While the scene goes by turns, the turns first.
import { useEffect, useRef, useState } from "preact/hooks";
import type { Member, ShownPerson, ShownPlace, ShownScene } from "./data.ts";
import { effectLabel, sinceDateLabel, terrainLabel } from "./game-words.ts";
import { cardIcons, Icon } from "./icons.tsx";
import { phraseLabel, sceneTypeLabel, strangerLabel } from "./labels.ts";
import { biomeLabel, biomes } from "./map-symbols.ts";
import { Markdown } from "./markdown.tsx";
import { sideOf, Token } from "./party.tsx";
import { PlaceMap } from "./place-map-view.tsx";
import { Card } from "./sheet.tsx";
import { StatusPip } from "./status.tsx";
import { t } from "./text.ts";
import { CharacterCard, hasTurns, type OwnSheet, TurnBand, TurnsCard, type TurnScene } from "./turns.tsx";
import { BiomeSwatch } from "./world.tsx";

// How long the band takes to come in or go out, as the style sheet has it, as the master's question folds.
const bandTime = 220;

/**
 * The Scene (D-309, D-444), the one page of where the party is. Outside turns the place, its picture with its text under it, the open scene and the map; while
 * the scene goes by turns the band of the turns on top, the place closed to a line, the player's character's card beside the map, and on a narrow screen the
 * order of the turns. The map is the same through both, never drawn anew; only the band moves, coming and going.
 */
export function SceneView(
    { place, scene, lead, party, own, turnsBeside = false }: { place?: ShownPlace; scene?: ShownScene; lead?: Member; party: Member[]; own: OwnSheet; turnsBeside?: boolean; },
)
{
    const turns = hasTurns(scene) ? scene : undefined;
    const band = useBandMotion(turns);

    if (place === undefined && scene === undefined) {
        return (
            <section class="upcoming" aria-labelledby="place-name">
                <h2 id="place-name">{t("In the open")}</h2>
                <p>{t("The party is in no place the character knows, as on a road between two.")}</p>
            </section>
        );
    }

    const kinds = ["place-view", turns === undefined ? "" : "in-turns", scene === undefined && place?.map === undefined ? "" : "with-scene"];
    return (
        <section class={kinds.filter((kind) => kind !== "").join(" ")} aria-labelledby={turns === undefined ? "place-name" : "turn-title"}>
            <div class="scene-body">
                {band && <TurnBand key="band" scene={band.scene} lead={lead} {...(band.motion === undefined ? {} : { motion: band.motion })} />}
                {place && (turns === undefined ? <PlaceBand key="place" place={place} /> : <PlaceLine key={`line ${turns.title}`} place={place} />)}
                {scene && turns === undefined && <SceneCard key="scene" scene={scene} />}
                {turns && (
                    <div key="side" class="turn-side">
                        {!turnsBeside && <TurnsCard scene={turns} party={party} />}
                        <CharacterCard lead={lead} scene={turns} own={own} />
                    </div>
                )}
                {place?.map && <PlaceMap key="map" map={place.map} place={place.name} {...(turns?.turn === undefined ? {} : { acting: turns.turn })} />}
                {/* Who is here: under the map, who is where says it (D-325). */}
                {turns === undefined && scene === undefined && place && place.here.length > 0 && place.map === undefined && (
                    <div key="groups" class="groups">
                        <Card name="Here" title={t("Here")} icon={cardIcons.here} layout="lore" preview={place.here.map((person) => person.name).join(" · ")}>
                            <People people={place.here} />
                        </Card>
                    </div>
                )}
            </div>
        </section>
    );
}

/**
 * The band while it comes and goes (D-444): with a scene that goes by turns, coming in when it starts while the page is open; kept a moment when they end, going
 * out. None at the first drawing: the page is simply as it is.
 */
function useBandMotion(turns: TurnScene | undefined): { scene: TurnScene; motion?: "in" | "out"; } | undefined
{
    const last = useRef(turns);
    const was = useRef(turns !== undefined);
    const [motion, setMotion] = useState<"in" | "out">();
    const now = turns !== undefined;

    if (turns !== undefined) {
        last.current = turns;
    }

    useEffect(() => {
        if (now === was.current) {
            return;
        }

        was.current = now;
        setMotion(now ? "in" : "out");

        if (now) {
            return;
        }

        const timer = window.setTimeout(() => setMotion(undefined), bandTime);
        return () => window.clearTimeout(timer);
    }, [now]);

    if (turns !== undefined) {
        return motion === "in" ? { scene: turns, motion } : { scene: turns };
    }

    return motion === "out" && last.current !== undefined ? { scene: last.current, motion } : undefined;
}

/**
 * The place while the scene goes by turns (D-444): a low strip of its picture with its name and what holds there over it, or without a picture its mark, name
 * and what holds there in one line; it opens where it stands into the whole band and its text, closed at each new scene.
 */
function PlaceLine({ place }: { place: ShownPlace; })
{
    const [open, setOpen] = useState(false);
    const text = place.text.trim();

    if (place.image !== undefined) {
        return <PlaceBand place={place} fold={{ open, onToggle: () => setOpen(!open) }} />;
    }

    return (
        <section class="place-line" aria-labelledby="place-name">
            <div class="place-line-head">
                <span class="place-line-mark" role="img" aria-label={t("Place")} data-tip={t("Place")}>
                    <Icon name="scene" />
                </span>
                <h2 id="place-name">{place.name}</h2>
                {place.around.length > 0 && (
                    <ul class="place-env" aria-label={t("Around")}>
                        {place.around.map((item) => <Surrounding key={`${"effect" in item ? item.effect : item.name} ${item.place ?? ""}`} item={item} name={place.name} />)}
                    </ul>
                )}
                {text !== "" && <DescriptionToggle open={open} controls="place-line-text" onToggle={() => setOpen(!open)} />}
            </div>
            {open && (
                <div id="place-line-text" class="place-line-text">
                    <Markdown text={text} />
                </div>
            )}
        </section>
    );
}

/** The button that opens a place's text where it stands, its chevron saying which way. */
function DescriptionToggle({ open, controls, onToggle }: { open: boolean; controls: string; onToggle(): void; })
{
    return (
        <button type="button" class="place-line-toggle" aria-expanded={open} aria-controls={controls} onClick={onToggle}>
            {t("Description")}
            <span class="chevron-tip tip-left" aria-hidden="true" data-tip={open ? t("Close") : t("Open")}>
                <svg class="chevron" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M6 9.5l6 6 6-6" />
                </svg>
            </span>
        </button>
    );
}

/** A place's text under its picture (D-444): three lines, and the rest at a click, which closes it again. */
function PlaceAbout({ text }: { text: string; })
{
    const [open, setOpen] = useState(false);
    const [long, setLong] = useState(false);
    const body = useRef<HTMLDivElement>(null);

    // Whether three lines cut it: measured as it or the page's width changes, never as the page scrolls.
    useEffect(() => {
        const element = body.current;

        if (element === null || open) {
            return;
        }

        const check = (): void => setLong(element.scrollHeight > element.clientHeight + 1);
        const sizes = new ResizeObserver(check);
        sizes.observe(element);
        return () => sizes.disconnect();
    }, [text, open]);

    return (
        <div class="place-about">
            <div ref={body} id="place-about-text" class={open ? "place-about-text" : "place-about-text clamped"}>
                <Markdown text={text} />
            </div>
            {(long || open) && (
                <button type="button" class="place-about-more" aria-expanded={open} aria-controls="place-about-text" onClick={() => setOpen(!open)}>
                    {open ? t("less") : t("more")}
                </button>
            )}
        </div>
    );
}

/**
 * The place's band (D-309, D-444): its picture with its name over it, or without one a compact band; the places that hold it, what holds there; its text under
 * it. While the scene goes by turns, `fold` makes it a low strip of its picture, which opens where it stands into the whole band and the whole text.
 */
function PlaceBand({ place, fold }: { place: ShownPlace; fold?: { open: boolean; onToggle(): void; }; })
{
    const text = place.text.trim();
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
            {fold && text !== "" && <DescriptionToggle open={fold.open} controls="place-band-text" onToggle={fold.onToggle} />}
        </div>
    );

    return place.image === undefined
        ? (
            <header class="place-band compact">
                <div class="place-shot">
                    <div class="place-disc">
                        <Icon name="house" />
                    </div>
                    {caption}
                </div>
                {text !== "" && <PlaceAbout text={text} />}
            </header>
        )
        : (
            <header class={fold === undefined ? "place-band over" : `place-band over folding${fold.open ? "" : " low"}`}>
                <div class="place-shot">
                    <figure class="place-image">
                        <img src={`/images/${encodeURIComponent(place.image.file)}?v=${place.image.version}`} alt="" />
                    </figure>
                    {caption}
                </div>
                {fold === undefined && text !== "" && <PlaceAbout text={text} />}
                {fold?.open === true && text !== "" && (
                    <div class="place-about" id="place-band-text">
                        <div class="place-about-text">
                            <Markdown text={text} />
                        </div>
                    </div>
                )}
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
    // A biome the page draws has its picture, as on the map, for the word before it.
    const look = "effect" in item || item.name.trim().toLowerCase() !== "biome" ? undefined : item.value.trim().toLowerCase();
    const biome = look !== undefined && biomes[look] !== undefined ? look : undefined;
    return (
        <li class={biome === undefined ? undefined : "biome"}>
            {"effect" in item ? effectLabel({ name: item.effect, end: item.end }) : (
                <>
                    {biome !== undefined && <BiomeSwatch look={biome} />}
                    {entry?.name !== "" && <span class={biome === undefined ? "k" : "visually-hidden"}>{entry?.name}</span>}
                    {/* A real space, which right-to-left keeps between two words in Latin letters, where a margin goes to the wrong side. */}
                    {entry?.name !== "" && biome === undefined && " "}
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

/** The open scene (D-309): its title, type and since when, who is in it, and the round and whose turn it is when it has them. */
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
            <People people={scene.who} />
            {turn && <p class="scene-turn">{turn}</p>}
        </section>
    );
}

/**
 * Who is there: their tokens with their names under them, the party first; someone the character does not know as a hood, the copies with how many; a foe the
 * master marked glows red a little (D-415); one of the party with the pip of their side (D-414); anyone with the pip of their state (D-419).
 */
function People({ people }: { people: ShownPerson[]; })
{
    return (
        <ul class="present">
            {people.map((person, index) => (
                <li key={`${person.name} ${index}`} class={person.role === "other" && index > 0 && people[index - 1].role !== "other" ? "after-party" : undefined}>
                    {person.stranger && person.image === undefined
                        ? (
                            // A kind of creature by its letter, as in Combat and on the map (D-331); anyone else unknown as a hood.
                            <span class={["token stranger", letterOf(person.name) === undefined ? "" : "numbered", person.hostile === true ? "hostile" : ""].filter((name) => name !== "").join(" ")} aria-hidden="true">
                                {letterOf(person.name) ?? <Icon name="stranger" />}
                                <StatusPip status={person} />
                            </span>
                        )
                        : (
                            <Token
                                member={{ name: person.name, role: person.role, ...(person.image === undefined ? {} : { image: person.image }), ...(person.icon === undefined ? {} : { icon: person.icon }) }}
                                hostile={person.hostile === true}
                                side={sideOf(person.role)}
                                status={person}
                                number={person.stranger ? letterOf(person.name) : undefined}
                            />
                        )}
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
