// What the master asks the player (D-279): the question, and a button for each check or answer; the click goes to the engine, which rolls the check and gives
// the master its result. A banner over the page, which never changes section by itself (D-276).
import { useEffect, useState } from "preact/hooks";
import { answer } from "./api.ts";
import type { Asked } from "./data.ts";
import { checkOf } from "./labels.ts";

export function AskedBanner({ asked, onAnswered }: { asked: Asked; onAnswered(): void; })
{
    const [sent, setSent] = useState<number>();
    const [problem, setProblem] = useState<string>();
    const checks = asked.labels.map((label) => checkOf(label, asked.title));
    const roll = checks.some((check) => check !== undefined);

    // A question asked again takes the place of the one before: its buttons start unclicked.
    useEffect(() => {
        setSent(undefined);
        setProblem(undefined);
    }, [asked.id]);

    const click = async (choice: number): Promise<void> => {
        setSent(choice);
        setProblem(undefined);

        try {
            // A click that comes too late counts for nothing: the page reads what the master asks now.
            await answer(asked.id, choice);
        } catch {
            setSent(undefined);
            setProblem("The click did not reach the game: try again.");
        }

        onAnswered();
    };

    return (
        <section class={roll ? "asked asked-roll" : "asked"} aria-labelledby={`asked-${asked.id}`}>
            <img class="asked-robot" src="/assets/favicon.svg" alt="" />
            <div class="asked-body">
                <h2 class="asked-title">{asked.title}</h2>
                <p id={`asked-${asked.id}`} class="asked-question" role="alert">{asked.question}</p>
                <div class="asked-buttons">
                    {asked.labels.map((label, index) => {
                        const check = checks[index];
                        const kind = check !== undefined ? "asked-check" : roll ? "asked-other" : "asked-answer";
                        return (
                            <button key={label} type="button" class={sent === index ? `${kind} sent` : kind} disabled={sent !== undefined} onClick={() => void click(index)}>
                                {check === undefined ? label : (
                                    <>
                                        <span class="asked-check-name">{check.check}</span> <span class="asked-dice">{check.dice}</span>
                                    </>
                                )}
                            </button>
                        );
                    })}
                </div>
                {problem && <p class="asked-problem" role="alert">{problem}</p>}
            </div>
        </section>
    );
}
