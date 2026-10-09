// The master's avatar, the robot (D-274): its picture inline, so that the page can move it. It shows one mood at a time, blinks now and then, and breathes
// unless the player asked for less motion; the moods will come from a command of the engine.
import { useEffect, useRef, useState } from "preact/hooks";

// A blink lasts this long, every few seconds.
const blinkLength = 140;
const blinkEvery = { least: 3500, most: 7000 };

export function Master({ mood = "neutral" }: { mood?: string; })
{
    const holder = useRef<HTMLSpanElement>(null);
    const [markup, setMarkup] = useState<string>();

    useEffect(() => {
        fetch("/assets/master.svg").then((response) => (response.ok ? response.text() : undefined)).then(setMarkup, () => undefined);
    }, []);

    // One mood shows, the one asked for, or the neutral one when the picture has no such mood.
    useEffect(() => {
        const moods = holder.current?.querySelectorAll(".robot-mood") ?? [];
        const wanted = holder.current?.querySelector(`.robot-mood-${CSS.escape(mood)}`) ?? holder.current?.querySelector(".robot-mood-neutral");
        moods.forEach((group) => group.classList.toggle("shown", group === wanted));
        holder.current?.setAttribute("data-mood", wanted === undefined || wanted === null ? "neutral" : mood);
    }, [markup, mood]);

    useEffect(() => {
        let timer: number | undefined;

        const blink = (): void => {
            holder.current?.classList.add("blink");
            window.setTimeout(() => holder.current?.classList.remove("blink"), blinkLength);
            timer = window.setTimeout(blink, blinkEvery.least + Math.random() * (blinkEvery.most - blinkEvery.least));
        };

        timer = window.setTimeout(blink, blinkEvery.least);
        return () => window.clearTimeout(timer);
    }, []);

    return markup === undefined
        ? <span class="master" aria-hidden="true" />
        : <span ref={holder} class="master" role="img" aria-label="The game master" dangerouslySetInnerHTML={{ __html: markup }} />;
}
