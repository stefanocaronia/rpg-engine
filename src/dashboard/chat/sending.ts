// The table's chat with the master as the page holds it (D-582): read again whenever the server says something changed, and what the player asks of it,
// each answered with the chat as it is after; an answer that comes after a newer one is left out.
import { useRef, useState } from "preact/hooks";
import { changeMaster, type HostWish, type MasterWish, readMaster } from "../api.ts";
import type { ChatChoice, MasterNow, MasterShown } from "../data.ts";
import { t } from "../text.ts";
import { hostState } from "./chat.ts";

/** The chat as the page shows it, and what the page does with it; its functions never change what they do, for a read() that lives as long as the page. */
export interface MasterChat
{
    /** Whether a table keeps a chat: undefined until the page has read it once. */
    table: boolean | undefined;
    /** The chat, where a table keeps one. */
    shown: MasterShown | undefined;
    /** What went wrong with the last thing the player asked here, in the table's words. */
    problem: string | undefined;
    /** Something the player asked is on its way. */
    sending: boolean;
    /** The player's words as they write them, kept while the chat changes place in the page. */
    draft: string;
    setDraft(text: string): void;
    read(): Promise<void>;
    /** Lets go of what went wrong, as when the chat has moved on. */
    forget(): void;
    /** Each true when the table took it. */
    open(choice: ChatChoice, fresh: boolean): Promise<boolean>;
    say(text: string): Promise<boolean>;
    stop(): Promise<boolean>;
    close(): Promise<boolean>;
    /** Another model, or another level of thinking, for the open chat, between two turns. */
    switchModel(model: string, effort: string | undefined): Promise<boolean>;
    /** What the player asks of an app: to install it, to sign in to it, to look at the apps again. */
    wish(wish: HostWish): Promise<boolean>;
}

export function useMasterChat(): MasterChat
{
    const [now, setNow] = useState<MasterNow>();
    const [problem, setProblem] = useState<string>();
    const [sending, setSending] = useState(false);
    const [draft, setDraft] = useState("");
    // The readings and the requests in the order they left: an answer older than the one shown says nothing new.
    const order = useRef({ asked: 0, shown: 0 });

    const take = (number: number, read: MasterNow | undefined): void => {
        if (read !== undefined && number > order.current.shown) {
            order.current.shown = number;
            // The same chat read again, as at every change of the campaign, draws nothing anew.
            setNow((before) => (JSON.stringify(before) === JSON.stringify(read) ? before : read));
        }
    };

    const ask = async (wish: MasterWish): Promise<boolean> => {
        const number = ++order.current.asked;
        setProblem(undefined);
        setSending(true);
        const answer = await changeMaster(wish);
        setSending(false);
        take(number, answer.shown);
        setProblem(answer.code === "signin" ? signInProblem(wish, answer.shown) : answer.error);
        return answer.error === undefined;
    };

    return {
        table: now?.table,
        shown: now?.table === true ? now : undefined,
        problem,
        sending,
        draft,
        setDraft,
        read: async () => {
            const number = ++order.current.asked;
            take(number, await readMaster().catch(() => undefined));
        },
        forget: () => setProblem(undefined),
        open: (choice, fresh) => ask({ open: { ...choice, fresh } }),
        say: (text) => ask({ say: text }),
        stop: () => ask({ stop: true }),
        close: () => ask({ close: true }),
        switchModel: (model, effort) => ask({ model: { model, ...(effort === undefined ? {} : { effort }) } }),
        // Looking at the apps again is no request of the player's: what went wrong stays said, and nothing waits on it.
        wish: async (wish) => {
            if (!("hosts" in wish)) {
                return ask(wish);
            }

            const number = ++order.current.asked;
            const answer = await changeMaster(wish);
            take(number, answer.shown);
            return answer.error === undefined;
        },
    };
}

/**
 * A chat that did not open as the player is not signed in to its app: nothing over the words where the app to set up shows in the model's place, as it
 * says so itself; else that, in the page's words, never the table's.
 */
function signInProblem(wish: MasterWish, shown: MasterNow | undefined): string | undefined
{
    const id = "open" in wish ? wish.open.host : undefined;
    const host = shown?.table === true ? shown.hosts.find((one) => one.id === id) : undefined;
    const state = host === undefined ? undefined : hostState(host);
    return state === "signIn" || state === "signingIn" ? undefined : t("{name} asks you to sign in first.", { name: host?.name ?? id ?? "" });
}
