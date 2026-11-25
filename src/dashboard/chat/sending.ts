// The table's chat with the master as the page holds it (D-582): read again whenever the server says something changed, and what the player asks of it,
// each answered with the chat as it is after; an answer that comes after a newer one is left out.
import { useRef, useState } from "preact/hooks";
import { changeMaster, type MasterWish, readMaster } from "../api.ts";
import type { ChatChoice, MasterNow, MasterShown } from "../data.ts";

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
        setProblem(answer.error);
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
    };
}
