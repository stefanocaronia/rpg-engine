// What the master asks the player (D-279): the question, and a button for each check or answer; the click goes to the engine, which rolls the check and gives
// the master its result. Or the player's own words, in place of a button (ASK-10). A banner over the page, which never changes section by itself (D-276).
import { useEffect, useRef, useState } from "preact/hooks";
import { answer } from "./api.ts";
import type { Asked } from "./data.ts";
import { Icon, NotationIcons } from "./icons.tsx";
import { checkOf, notationModifier, signed } from "./labels.ts";

// How far below the top the banner stays, as in the style sheet; how many characters the player's own words may have, as the server takes them.
const bannerTop = 8;
const mostWords = 500;

export function AskedBanner({ asked, onAnswered }: { asked: Asked; onAnswered(): void; })
{
    const [sent, setSent] = useState<number | "words">();
    const [problem, setProblem] = useState<string>();
    const [words, setWords] = useState("");
    const banner = useRef<HTMLElement>(null);
    const checks = asked.labels.map((label) => checkOf(label, asked.title));
    const roll = checks.some((check) => check !== undefined);

    // While the banner is there, the rolls beside the sheet stay in sight under it, as tall as it is, even as it folds away (D-291).
    useEffect(() => {
        const element = banner.current;

        if (element === null) {
            return;
        }

        const root = document.documentElement;
        const observer = new ResizeObserver(() => root.style.setProperty("--asked-space", `${element.offsetHeight + bannerTop}px`));
        observer.observe(element);

        return () => {
            observer.disconnect();
            root.style.removeProperty("--asked-space");
        };
    }, []);

    // A question asked again takes the place of the one before: its buttons start unclicked.
    useEffect(() => {
        setSent(undefined);
        setProblem(undefined);
        setWords("");
    }, [asked.id]);

    // A button by its place, or the player's own words.
    const reply = async (given: number | string): Promise<void> => {
        setSent(typeof given === "number" ? given : "words");
        setProblem(undefined);

        try {
            // A click that comes too late counts for nothing: the page reads what the master asks now.
            await answer(asked.id, given);
        } catch {
            setSent(undefined);
            setProblem("The answer did not reach the game: try again.");
        }

        onAnswered();
    };

    const own = (event: Event): void => {
        event.preventDefault();

        if (words.trim() !== "") {
            void reply(words.trim());
        }
    };

    return (
        // Once clicked, the banner folds away while the engine rolls, so that the page does not jump when it goes.
        <section ref={banner} class={["asked", roll ? "asked-roll" : "", sent !== undefined ? "leaving" : ""].filter((name) => name !== "").join(" ")} aria-labelledby={`asked-${asked.id}`}>
            <img class="asked-robot" src="/assets/favicon.svg" alt="" />
            <div class="asked-body">
                <h2 class="asked-title">{asked.title}</h2>
                <p id={`asked-${asked.id}`} class="asked-question" role="alert">{asked.question}</p>
                <div class="asked-buttons">
                    {asked.labels.map((label, index) => {
                        const check = checks[index];
                        const kind = check !== undefined ? "asked-check" : roll ? "asked-other" : "asked-answer";
                        return (
                            <button
                                key={label}
                                type="button"
                                class={sent === index ? `${kind} sent` : kind}
                                disabled={sent !== undefined}
                                title={check === undefined ? undefined : [asked.words?.[index], check.dice].filter((part) => part !== undefined && part !== null).join(" · ")}
                                onClick={() => void reply(index)}
                            >
                                {check === undefined ? label : <CheckLabel check={check.check} dice={check.dice} />}
                            </button>
                        );
                    })}
                </div>
                <form class="asked-own" onSubmit={own}>
                    <input
                        type="text"
                        value={words}
                        maxLength={mostWords}
                        placeholder="Or write what you do…"
                        aria-label="Or write what you do"
                        disabled={sent !== undefined}
                        onInput={(event) => setWords(event.currentTarget.value)}
                    />
                    <button type="submit" class="icon-button" aria-label="Send" data-tip="Send" disabled={sent !== undefined || words.trim() === ""}>
                        <Icon name="send" />
                    </button>
                </form>
                {problem && <p class="asked-problem" role="alert">{problem}</p>}
            </div>
        </section>
    );
}

/** A check's button (D-297): its dice as pictures, one of two faded when only one counts, its name and the number added; the notation is in the tooltip. */
function CheckLabel({ check, dice }: { check: string; dice: string; })
{
    const modifier = notationModifier(dice);
    return (
        <>
            <NotationIcons notation={dice} />
            <span class="asked-check-name">{check}</span>
            {modifier !== 0 && <span class="asked-dice">{signed(modifier)}</span>}
            <span class="visually-hidden">{dice}</span>
        </>
    );
}
