// The messages of the chat with the master, in order: the player's words at the end side, the master's as the text they write, a word of the table's as a
// notice, a question of the master's where it was asked, with its buttons while it waits, and the rolls the player may see as the Rolls card draws them.
// Words out of the game, the master's and the player's, stand apart from the story's, in a quieter look, without their brackets. The list follows what
// comes while its end is in sight; farther up the player is reading, and it stays, with a button that leads back to the end. A chat taken up after the
// game was closed in the middle of the story ends with a notice that says so, and asks the master to go on.
import { useEffect, useLayoutEffect, useRef, useState } from "preact/hooks";
import type { ChatMessage, ChatSaid, Member } from "../data.ts";
import { Icon } from "../parts/icons.tsx";
import { InlineText, Markdown } from "../parts/markdown.tsx";
import { RollLine } from "../play/rolls.tsx";
import { t } from "../text.ts";
import { answerShown, atEnd, speaker } from "./chat.ts";
import { type ChatRun, masterBlocks, playerRuns } from "./ooc.ts";
import { type ChatAsking, ChatQuestion } from "./question.tsx";

/** What the chat draws of the game: the party, for whom a roll is for, whether more than one player character plays, and the campaign, for the master's dice. */
export interface ChatGame
{
    party: Member[];
    several: boolean;
    campaign?: string | undefined;
}

export function ChatLog({ messages, asking, game, cutShort }: {
    messages: ChatMessage[];
    /** The question that waits, as the page is asked it now. */
    asking?: ChatAsking | undefined;
    game: ChatGame;
    /** The chat taken up was cut as the game was closed: what asks the master to go on, and whether something is on its way. */
    cutShort?: { busy: boolean; onResume(): void; } | undefined;
})
{
    const list = useRef<HTMLDivElement>(null);
    // Whether the list shows its end, and so follows; and whether words came under what is in sight.
    const following = useRef(true);
    // The list's height when it was last brought to its end.
    const room = useRef(0);
    const [below, setBelow] = useState(false);
    const last = messages.at(-1);
    // How the questions stand, each drawn anew as it is answered or left.
    const questions = messages.map((message) => (message.from === "asked" ? message.state[0] : "")).join("");

    // At once, never smoothly: the end moves while the master writes, and a scroll on its way there would stop short of it.
    const toEnd = (): void => {
        const element = list.current;

        if (element !== null) {
            element.scrollTop = element.scrollHeight;
            room.current = element.clientHeight;
        }
    };

    const follow = (): void => {
        following.current = true;
        setBelow(false);
        toEnd();
    };

    // A message comes, the last one grows, a question gets its buttons or ends: the player's own words always show, and so does a question that waits for
    // them; the rest only to who is at the end.
    useLayoutEffect(() => {
        if (following.current || last?.from === "player" || (last?.from === "asked" && last.state === "waiting")) {
            following.current = true;
            toEnd();
        } else {
            setBelow(true);
        }
    }, [messages.length, last?.id, last?.text.length, questions, asking?.asked.id, asking?.here, cutShort !== undefined]);

    // The list's own room changes, as the window does or the player's words grow under it: its end stays in sight for who was there.
    useEffect(() => {
        const element = list.current;

        if (element === null) {
            return;
        }

        const sizes = new ResizeObserver(() => {
            if (following.current) {
                toEnd();
            }
        });
        sizes.observe(element);
        return () => sizes.disconnect();
    }, []);

    const scrolled = (): void => {
        const element = list.current;

        // The list's room changed under who was at its end, as the page's question opens over the chat: not the player's scrolling, and the end stays.
        if (element !== null && following.current && element.clientHeight !== room.current) {
            toEnd();
            return;
        }

        following.current = element === null || atEnd(element);

        if (following.current) {
            setBelow(false);
        }
    };

    return (
        <div class="chat-log-frame">
            {/* No live region: a screen reader hears once that the master answered, then reads the words here. */}
            <div ref={list} class="chat-log" role="log" aria-live="off" aria-label={t("Chat with the master")} tabIndex={0} onScroll={scrolled}>
                <ol class="chat-messages">
                    {messages.map((message, index) =>
                        message.from === "asked"
                            ? <ChatQuestion key={message.id} message={message} asking={message.state === "waiting" ? asking : undefined} answer={answerShown(messages, index)} />
                            : message.from === "roll"
                            ? <RollLine key={message.id} roll={message.roll} party={game.party} several={game.several} campaign={game.campaign} className="chat-message from-roll" />
                            : <Said key={message.id} message={message} />
                    )}
                    {/* The game was closed in the middle of the story: a word of the table's at the list's end, with what asks the master to go on. */}
                    {cutShort !== undefined && (
                        <li class="chat-message from-table cut-short">
                            <span class="visually-hidden">{speaker("table")}</span>
                            <Icon name="info" />
                            <div class="chat-cut-short">
                                <p>{t("The game was closed in the middle of the story: ask the master to pick up from here, or write to them yourself.")}</p>
                                <button type="button" class="button" aria-disabled={cutShort.busy} onClick={() => !cutShort.busy && cutShort.onResume()}>{t("Pick up from here")}</button>
                            </div>
                        </li>
                    )}
                </ol>
            </div>
            {below && (
                <button type="button" class="icon-button tonal chat-to-end" aria-label={t("Go to the last words")} data-tip={t("Go to the last words")} onClick={follow}>
                    <Icon name="more" />
                </button>
            )}
        </div>
    );
}

/** Words: the player's, the master's text in its blocks, or a word of the table's with its icon; what is out of the game apart in each. */
function Said({ message }: { message: ChatSaid; })
{
    if (message.from === "master") {
        return (
            <li class="chat-message from-master">
                <span class="visually-hidden">{speaker("master")}</span>
                <div class="chat-prose" dir="auto">
                    {masterBlocks(message.text).map((block, index) =>
                        block.kind === "text"
                            ? <Markdown key={index} text={block.text} lines />
                            : block.kind === "ooc"
                            ? (
                                <p key={index} class="chat-ooc" dir="auto">
                                    <OffGameMark />
                                    <OffGame text={block.text} />
                                </p>
                            )
                            : (
                                <div key={index} class="markdown">
                                    <p class="md-lines" dir="auto">
                                        <Runs runs={block.runs} markdown />
                                    </p>
                                </div>
                            )
                    )}
                </div>
            </li>
        );
    }

    const said = message.from === "player" ? playerRuns(message.text) : { runs: [{ ooc: false, text: message.text }], whole: false };
    return (
        <li class={said.whole ? "chat-message from-player off-game" : `chat-message from-${message.from}`}>
            <span class="visually-hidden">{speaker(message.from)}</span>
            {message.from === "table" && <Icon name="alert" />}
            {said.whole && <OffGameMark />}
            <p class="chat-text" dir="auto">
                {said.whole ? <OffGame text={said.runs.map((run) => run.text).join(" ")} markdown={false} /> : <Runs runs={said.runs} />}
            </p>
        </li>
    );
}

/** The runs of a line: the story's words as they are, the master's with their bold and italics; those out of the game in their own look. */
function Runs({ runs, markdown = false }: { runs: ChatRun[]; markdown?: boolean; })
{
    return (
        <>
            {runs.map((run, index) =>
                run.ooc
                    ? (
                        <span key={index} class="chat-ooc">
                            <OffGame text={run.text} markdown={markdown} />
                        </span>
                    )
                    : markdown
                    ? <InlineText key={index} text={run.text} />
                    : run.text
            )}
        </>
    );
}

/**
 * Words out of the game, without their brackets: the look says so, and a screen reader hears it said before them. What it hears has a direction of its own,
 * so that it never gives one to the words it stands before.
 */
function OffGame({ text, markdown = true }: { text: string; markdown?: boolean; })
{
    return (
        <>
            <span class="visually-hidden" dir="auto">{`${t("Out of the game")}: `}</span>
            {markdown ? <InlineText text={text} /> : text}
        </>
    );
}

/**
 * The mark of a whole block out of the game, on its dashed edge at the start corner, as a fieldset's legend: the letters the master writes there, OOC, the
 * same in every language. For who sees: a screen reader hears the words said before the block.
 */
function OffGameMark()
{
    return <span class="chat-ooc-mark" dir="ltr" title={t("Out of the game")} aria-hidden="true">OOC</span>;
}
