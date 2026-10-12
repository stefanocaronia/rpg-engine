// The master's avatar, the robot (D-274): its picture inline, so that the page can move it. It shows the master's mood (D-305), a moment's face for a little while
// when one comes, its eyes closed while the master is away; unless the player asked for less motion, it blinks now and then and breathes.
import { useEffect, useRef, useState } from "preact/hooks";
import type { Moment, Mood } from "./data.ts";
import { moodLabel } from "./mood.tsx";
import { t } from "./text.ts";

// A blink lasts this long, every few seconds.
const blinkLength = 140;
const blinkEvery = { least: 3500, most: 7000 };

// A moment's face shows this long; one that came longer ago than its freshness was missed, and is not shown late.
const momentLength = 2200;
const momentFreshness = 10_000;

/** The robot: the master's mood; a moment, shown once when its id is new; asleep, with its eyes closed, while the game is away. */
export function Master({ mood = "neutral", moment, poke, asleep = false }: { mood?: Mood; moment?: Moment; poke?: Moment; asleep?: boolean; })
{
    const holder = useRef<HTMLSpanElement>(null);
    const [markup, setMarkup] = useState<string>();
    const flash = useMoment(moment, asleep);
    // A face for a click on the robot, which wakes it for a moment too.
    const poked = useMoment(poke, false);
    const shown = poked ?? (asleep ? "neutral" : flash ?? mood);

    useEffect(() => {
        fetch("/assets/master.svg").then((response) => (response.ok ? response.text() : undefined)).then(setMarkup, () => undefined);
    }, []);

    // One mood shows, the one asked for, or the neutral one when the picture has no such mood.
    useEffect(() => {
        const moods = holder.current?.querySelectorAll(".robot-mood") ?? [];
        const wanted = holder.current?.querySelector(`.robot-mood-${CSS.escape(shown)}`) ?? holder.current?.querySelector(".robot-mood-neutral");
        moods.forEach((group) => group.classList.toggle("shown", group === wanted));
        holder.current?.setAttribute("data-mood", wanted === undefined || wanted === null ? "neutral" : shown);
    }, [markup, shown]);

    // Asleep, the eyes stay shut; awake, they blink now and then.
    useEffect(() => {
        let timer: number | undefined;

        if (asleep) {
            holder.current?.classList.add("blink");
            return () => holder.current?.classList.remove("blink");
        }

        // Blinking is the one motion that never stops: none when the player asked for less.
        if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
            return;
        }

        const blink = (): void => {
            holder.current?.classList.add("blink");
            window.setTimeout(() => holder.current?.classList.remove("blink"), blinkLength);
            timer = window.setTimeout(blink, blinkEvery.least + Math.random() * (blinkEvery.most - blinkEvery.least));
        };

        timer = window.setTimeout(blink, blinkEvery.least);
        return () => window.clearTimeout(timer);
    }, [asleep, markup]);

    const classes = ["master", asleep ? "asleep" : "", flash === undefined ? "" : "moment"].filter((name) => name !== "").join(" ");
    const label = asleep ? t("The game master, away") : mood === "neutral" ? t("The game master") : t("The game master, {mood}", { mood: moodLabel(mood) });
    return markup === undefined
        ? <span class="master" aria-hidden="true" />
        : <span ref={holder} class={classes} role="img" aria-label={label} dangerouslySetInnerHTML={{ __html: markup }} />;
}

/** The face of a moment while it shows: a new one, by its id, that is not stale, and never while asleep. */
function useMoment(moment: Moment | undefined, asleep: boolean): Mood | undefined
{
    const [flash, setFlash] = useState<Mood>();

    useEffect(() => {
        const stale = moment?.at !== undefined && Date.now() - Date.parse(moment.at) > momentFreshness;

        if (moment === undefined || stale || asleep) {
            return;
        }

        setFlash(moment.mood);
        const timer = window.setTimeout(() => setFlash(undefined), momentLength);
        return () => window.clearTimeout(timer);
    }, [moment?.id]);

    return flash;
}
