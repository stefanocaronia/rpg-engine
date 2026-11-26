// The messages of the chat with the master, in order: the player's words at the end side, the master's as the text they write, with the engine's marks
// in them drawn, as a roll where the story tells it, a word of the table's as a notice, a question of the master's where it was asked, with its buttons
// while it waits, and the rolls the player may see, a line each until the master's words tell them. Words out of the game, the master's and the player's, stand apart from the story's, in a quieter look, without
// their brackets. The list scrolls with no bar in sight, a shade at its top or its foot where there is more; it follows what comes while its end is in
// sight; farther up the player is reading, and it stays, with a pill that leads back to now. What the chat offers the player, as to take up the story,
// stands at the list's end.
import type { ComponentChildren } from "preact";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "preact/hooks";
import type { ChatMessage, ChatSaid, Member, ShownRoll } from "../data.ts";
import { Icon } from "../parts/icons.tsx";
import { InlineText, Markdown, type OwnParts } from "../parts/markdown.tsx";
import { t } from "../text.ts";
import { aboutModel, answerShown, atEnd, speaker, tableWords } from "./chat.ts";
import { marksDrawer } from "./drawn-marks.tsx";
import { rollsTold } from "./marks.ts";
import { type ChatRun, masterBlocks, playerRuns } from "./ooc.ts";
import { type ChatAsking, ChatQuestion } from "./question.tsx";
import { ChatRollLine } from "./roll.tsx";

/** What the chat draws of the game: the party, for whom a roll is for, and whether more than one player character plays. */
export interface ChatGame
{
    party: Member[];
    several: boolean;
}

// How near its top or its end, in pixels, the list still counts as there: no shade for a pixel or two left.
const edge = 4;

export function ChatLog({ messages, asking, game, app, foot }: {
    messages: ChatMessage[];
    /** The name of the chat's app, which the table's lines about the master's model name. */
    app?: string | undefined;
    /** The question that waits, as the page is asked it now. */
    asking?: ChatAsking | undefined;
    game: ChatGame;
    /** What stands at the list's end, an item of it: what the chat offers the player. */
    foot?: ComponentChildren;
})
{
    const list = useRef<HTMLDivElement>(null);
    // Whether the list shows its end, and so follows.
    const following = useRef(true);
    // The list's height when it was last brought to its end.
    const room = useRef(0);
    // What the player sees of where they are: more over what is in sight, more under it, far enough from the end for the way back to now, and whether
    // something came there meanwhile.
    const [where, setWhere] = useState({ above: false, below: false, away: false });
    const [came, setCame] = useState(false);
    const last = messages.at(-1);
    // The chat's rolls by their id, for the marks the master's words hold of them; and those the words tell already, whose own line goes.
    const marks = useMemo(() => marksDrawer(new Map(messages.flatMap((message): [string, ShownRoll][] => (message.from === "roll" ? [[message.roll.id.toLowerCase(), message.roll]] : [])))), [messages]);
    const told = useMemo(() => rollsTold(messages), [messages]);
    // How the questions stand, each drawn anew as it is answered or left.
    const questions = messages.map((message) => (message.from === "asked" ? message.state[0] : "")).join("");

    // Where the list stands, told again only when it changed.
    const look = (): void => {
        const element = list.current;

        if (element !== null) {
            const under = element.scrollHeight - element.scrollTop - element.clientHeight;
            const now = { above: element.scrollTop > edge, below: under > edge, away: !atEnd(element) };
            setWhere((before) => (before.above === now.above && before.below === now.below && before.away === now.away ? before : now));
        }
    };

    // At once, never smoothly: the end moves while the master writes, and a scroll on its way there would stop short of it.
    const toEnd = (): void => {
        const element = list.current;

        if (element !== null) {
            element.scrollTop = element.scrollHeight;
            room.current = element.clientHeight;
            look();
        }
    };

    // Back to now, by the pill: the list follows again, and the keyboard goes on from the list itself, as the pill goes.
    const follow = (): void => {
        following.current = true;
        setCame(false);
        toEnd();
        list.current?.focus({ preventScroll: true });
    };

    // A message comes, the last one grows, a question gets its buttons or ends: the player's own words always show, and so does a question that waits for
    // them; the rest only to who is at the end.
    useLayoutEffect(() => {
        if (following.current || last?.from === "player" || (last?.from === "asked" && last.state === "waiting")) {
            following.current = true;
            toEnd();
        } else {
            setCame(true);
            look();
        }
    }, [messages.length, last?.id, last?.text.length, questions, asking?.asked.id, asking?.here, foot !== undefined && foot !== null && foot !== false]);

    // The list's own room changes, as the window does or the player's words grow under it: its end stays in sight for who was there.
    useEffect(() => {
        const element = list.current;

        if (element === null) {
            return;
        }

        const sizes = new ResizeObserver(() => {
            if (following.current) {
                toEnd();
            } else {
                look();
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
        look();

        if (following.current) {
            setCame(false);
        }
    };

    return (
        <div class={["chat-log-frame", where.above ? "more-above" : "", where.below ? "more-below" : ""].filter((name) => name !== "").join(" ")}>
            {/* No live region: a screen reader hears once that the master answered, then reads the words here. */}
            <div ref={list} class="chat-log" role="log" aria-live="off" aria-label={t("Chat with the master")} tabIndex={0} onScroll={scrolled}>
                <ol class="chat-messages">
                    {messages.map((message, index) =>
                        message.from === "asked"
                            ? <ChatQuestion key={message.id} message={message} asking={message.state === "waiting" ? asking : undefined} answer={answerShown(messages, index)} />
                            : message.from === "roll"
                            ? !told.has(message.roll.id.toLowerCase()) && <ChatRollLine key={message.id} roll={message.roll} party={game.party} several={game.several} />
                            : <Said key={message.id} message={message} marks={marks} app={app} />
                    )}
                    {foot}
                </ol>
            </div>
            {/* Away from the end: the way back to now, in the middle of the list's foot, with a dot when something came there meanwhile. */}
            {where.away && (
                <button type="button" class={came ? "chat-to-now came" : "chat-to-now"} onClick={follow}>
                    <Icon name="arrowDown" />
                    {t("Go to now")}
                </button>
            )}
        </div>
    );
}

/**
 * Words: the player's, the master's text in its blocks, with the engine's marks in it drawn by `marks`, or a word of the table's with its icon, quiet and in
 * the page's words where it only says what became of the master's model; what is out of the game apart in each.
 */
function Said({ message, marks, app }: { message: ChatSaid; marks: OwnParts; app: string | undefined; })
{
    if (message.from === "master") {
        return (
            <li class="chat-message from-master">
                <span class="visually-hidden">{speaker("master")}</span>
                <div class="chat-prose" dir="auto">
                    {masterBlocks(message.text).map((block, index) =>
                        block.kind === "text"
                            ? <Markdown key={index} text={block.text} lines own={marks} />
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
                                        <Runs runs={block.runs} marks={marks} />
                                    </p>
                                </div>
                            )
                    )}
                </div>
            </li>
        );
    }

    const said = message.from === "player" ? playerRuns(message.text) : { runs: [{ ooc: false, text: tableWords(message, app) }], whole: false };
    const quiet = aboutModel(message);
    return (
        <li class={said.whole ? "chat-message from-player off-game" : quiet ? "chat-message from-table about-model" : `chat-message from-${message.from}`}>
            <span class="visually-hidden">{speaker(message.from)}</span>
            {message.from === "table" && <Icon name={quiet ? "info" : "alert"} />}
            {said.whole && <OffGameMark />}
            <p class="chat-text" dir="auto">
                {said.whole ? <OffGame text={said.runs.map((run) => run.text).join(" ")} markdown={false} /> : <Runs runs={said.runs} />}
            </p>
        </li>
    );
}

/**
 * The runs of a line: the story's words as they are, the master's, which come with what draws their marks, with their bold and italics too; those out of the
 * game in their own look.
 */
function Runs({ runs, marks }: { runs: ChatRun[]; marks?: OwnParts; })
{
    const markdown = marks !== undefined;
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
                    ? <InlineText key={index} text={run.text} own={marks} />
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
