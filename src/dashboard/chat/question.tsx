// A question of the master's among the chat's messages (D-582), where it was asked between their words. The one that waits is answered here, with the
// buttons the question over the page has (play/answers.tsx) and the same way to the engine, or with the player's own words in the chat's field; one that
// has a place of its own on the page, as the dice of a rest, is said here with the way to it. Once it ended it stays, with what was answered, or left.
import type { Asked, ChatAsked, Member } from "../data.ts";
import { Icon } from "../parts/icons.tsx";
import { asksRoll } from "../play/answering.ts";
import { AnswerButtons, AnswerLabel, HandNote, HandSwitch, useAnswering, useByHand } from "../play/answers.tsx";
import { t } from "../text.ts";
import { speaker } from "./chat.ts";

/** The question that waits, as the page is asked it now, and where it is answered. */
export interface ChatAsking
{
    asked: Asked;
    /** Answered here, with its buttons; else at its own place on the page, which the chat leads to. */
    here: boolean;
    /** With more than one player character, the one it asks. */
    who?: Member | undefined;
    /** The sheet or the tray answered it meanwhile. */
    answered: boolean;
    /** The player's own words, written in the chat's field, answer it: never a forced roll, whatever the table takes (D-507). */
    words: boolean;
    onAnswered(): void;
}

/**
 * A question in the chat. `asking` for the one that waits, once the page has it; `answer` what it shows as answered, none when the player's own words right
 * after it say it.
 */
export function ChatQuestion({ message, asking, answer }: { message: ChatAsked; asking?: ChatAsking | undefined; answer?: string | undefined; })
{
    const waits = message.state === "waiting";

    if (waits && asking?.here === true) {
        return (
            <li class="chat-message from-asked waiting here">
                <span class="visually-hidden">{speaker("master")}</span>
                <WaitingQuestion asking={asking} />
            </li>
        );
    }

    return (
        <li class={`chat-message from-asked ${message.state}`}>
            <span class="visually-hidden">{speaker("master")}</span>
            {message.title !== undefined && <p class="eyebrow chat-question-title">{message.title}</p>}
            <p class="asked-question" dir="auto">{message.text}</p>
            {/* It waits at its own place on the page: the way there. */}
            {waits && asking !== undefined && (
                <p class="chat-question-way">
                    {t("Answer from the question at the top of the page.")}
                    <button type="button" class="button quiet" onClick={toQuestion}>{t("Open the question")}</button>
                </p>
            )}
            {answer !== undefined && (
                <p class="chat-question-answer" dir="auto">
                    <Icon name="check" />
                    <span class="visually-hidden">{`${t("Your answer")}: `}</span>
                    <span class="chat-answer">
                        <AnswerLabel label={answer} asked={{ title: message.title ?? "" }} />
                    </span>
                </p>
            )}
            {message.state === "left" && <p class="chat-question-left">{t("No answer")}</p>}
        </li>
    );
}

/** The question that waits, answered here: its word, its text, the checks by hand when the player rolls so, its buttons, and the switch to roll by hand. */
function WaitingQuestion({ asking }: { asking: ChatAsking; })
{
    const { asked, who } = asking;
    const answering = useAnswering(asked, asking.answered, asking.onAnswered);
    const [byHand, setByHand] = useByHand();
    return (
        <>
            <p class="eyebrow chat-question-title">{who === undefined ? asked.title : `${asked.title} · ${t("For {name}", { name: who.name })}`}</p>
            {/* Said to a screen reader as it comes, as the question over the page is. */}
            <p class="asked-question" dir="auto" role="alert">{asked.question}</p>
            {byHand && <HandNote asked={asked} who={who} />}
            <div class="asked-buttons">
                <AnswerButtons asked={asked} answering={answering} byHand={byHand} />
            </div>
            {asksRoll(asked) && (
                <div class="chat-question-foot">
                    <HandSwitch byHand={byHand} onChange={setByHand} />
                </div>
            )}
            {answering.problem !== undefined && <p class="asked-problem" role="alert">{answering.problem}</p>}
        </>
    );
}

/**
 * Brings the player to the master's question on the page. Folded, it opens as by its own button, which keeps the focus as the question has it; open, the
 * focus goes to its first answer, or to the question itself.
 */
function toQuestion(): void
{
    const question = document.querySelector<HTMLElement>(".asked");
    const folded = question?.querySelector<HTMLElement>('.asked-fold[aria-expanded="false"]') ?? undefined;

    if (folded !== undefined) {
        folded.focus();
        folded.click();
    } else {
        const first = question?.querySelector<HTMLElement>(".asked-buttons button:not(:disabled)") ?? question?.querySelector<HTMLElement>("button:not(:disabled), a[href]") ?? undefined;
        question?.scrollIntoView({ block: "nearest" });

        // A package's card may draw its buttons where the page cannot reach them: then the card itself takes the focus.
        if (first === undefined && question !== null) {
            question.tabIndex = -1;
        }

        (first ?? question)?.focus();
    }
}
