// The player's sentences to the master (D-495), as the page holds them: the verbs of the sheet, the sentence being written, those said or copied and how the
// server holds them, sent, taken back, copied and gone from the strip after a while. The page's read() sets the acts and the verbs it reads, by their setters.
import { type Dispatch, type StateUpdater, useEffect, useState } from "preact/hooks";
import { answer, readView, sayAct, withdrawAct } from "../api.ts";
import type { ActsShown, Asked, Member, ShownPlace } from "../data.ts";
import { t } from "../text.ts";
import { type ActStart, type SaidAct, saidStates, type SheetActions } from "./acts.ts";
import type { PlayerActs } from "./names.tsx";
import type { ActReply } from "./sheet.tsx";

// How long a sentence the master heard, or one copied for the chat, stays in the strip (D-495).
const heardTime = 6000;

/** What the page knows that the player's sentences follow. */
export interface ActsAround
{
    read: () => Promise<void>;
    live: boolean;
    asked: Asked | undefined;
    foreground: string | undefined;
    version: number;
    players: Member[];
    member: Member | undefined;
    several: boolean;
}

/** The player's sentences as the page shows them, and what it does with them; the setters never change, for a read() that lives as long as the page. */
export interface PlayerSentences
{
    setActs: Dispatch<StateUpdater<ActsShown | undefined>>;
    setActions: Dispatch<StateUpdater<SheetActions | undefined>>;
    playerActs: PlayerActs | undefined;
    acting: { start: ActStart; opener: HTMLElement | SVGElement; } | undefined;
    actsElsewhere: string | undefined;
    actPlace: { who: string; place?: ShownPlace; } | undefined;
    reply: ActReply;
    strip: ReturnType<typeof saidStates>;
    actProblem: string | undefined;
    sendAct(text: string): Promise<string | undefined>;
    closeAct(): void;
    withdraw(id: string): Promise<void>;
    copyFromStrip(id: string, text: string): void;
    dismissAct(...ids: string[]): void;
}

/** The player's sentences to the master and what the page does with them (D-495). */
export function useActs({ read, live, asked, foreground, version, players, member, several }: ActsAround): PlayerSentences
{
    // The verbs of the player character's sheet, the sentences said or copied and how the server holds them, and the action the player is writing, with
    // what started it, which has the focus back.
    const [actions, setActions] = useState<SheetActions>();
    const [acts, setActs] = useState<ActsShown>();
    const [said, setSaid] = useState<SaidAct[]>([]);
    const [actProblem, setActProblem] = useState<string>();
    const [acting, setActing] = useState<{ start: ActStart; opener: HTMLElement | SVGElement; }>();
    // Who acts from a sheet acts where they are: the place of one not in the foreground, read for them (VIEW-12).
    const actsElsewhere = acting !== undefined && several && member?.role === "pc" && member.name !== foreground ? member.name : undefined;
    const [actPlace, setActPlace] = useState<{ who: string; place?: ShownPlace; }>();

    useEffect(() => {
        if (actsElsewhere === undefined) {
            return;
        }

        let current = true;
        void readView(undefined, 1, actsElsewhere).then((view) => {
            if (current) {
                setActPlace({ who: actsElsewhere, ...(view.kind === "overview" && view.place !== undefined ? { place: view.place } : {}) });
            }
        }, () => undefined);

        return () => {
            current = false;
        };
    }, [actsElsewhere, version]);

    // The game gone, what the master had not heard is lost with the chat: the strip says so, even once the game is back (D-495).
    useEffect(() => {
        if (!live) {
            setSaid((before) => before.map((one) => (acts?.heard.includes(one.id) === true ? one : { ...one, lost: true })));
        }
    }, [live]);

    const strip = saidStates(said, acts, live);
    const leaving = strip.filter((entry) => entry.state === "heard" || entry.state === "copied").map((entry) => entry.act.id).join();

    // A sentence heard, or copied, goes from the strip after a while.
    useEffect(() => {
        if (leaving === "") {
            return;
        }

        const timer = window.setTimeout(() => dismissAct(...leaving.split(",")), heardTime);
        return () => window.clearTimeout(timer);
    }, [leaving]);

    const dismissAct = (...ids: string[]): void => {
        setSaid((before) => before.filter((one) => !ids.includes(one.id)));
        setActProblem(undefined);
    };

    // With a question of the master's open, the sentence answers it (ASK-10); else it rings the master, or, in a chat that hears nothing by itself, is copied.
    const question = asked !== undefined && asked.spend === undefined && asked.forced !== true ? asked : undefined;
    const reply: ActReply = question !== undefined ? "answer" : acts?.bell === true ? "tell" : "copy";

    const sendAct = async (text: string): Promise<string | undefined> => {
        setActProblem(undefined);

        if (reply === "answer" && question !== undefined) {
            const taken = await answer(question.id, text).catch(() => false);
            void read();
            return taken ? undefined : t("The answer did not reach the game: try again.");
        }

        if (reply === "copy") {
            return await copyAct(text) ? undefined : t("Copy did not work: select the words and copy them yourself.");
        }

        const result = await sayAct(text);

        if ("error" in result) {
            return result.error;
        }

        setSaid((before) => [...before, { id: result.id, text }]);
        setActs(result.shown);
        return undefined;
    };

    const copyAct = async (text: string): Promise<boolean> => {
        try {
            await navigator.clipboard.writeText(text);
            setSaid((before) => [...before.filter((one) => one.copied !== true || one.text !== text), { id: `copied ${Date.now()}`, text, copied: true }]);
            return true;
        } catch {
            return false;
        }
    };

    // A sentence copied again from the strip goes from it; one that would not copy says so.
    const copyFromStrip = (id: string, text: string): void => void copyAct(text).then((done) => (done ? dismissAct(id) : setActProblem(t("Copy did not work: select the words and copy them yourself."))));

    const withdraw = async (id: string): Promise<void> => {
        const result = await withdrawAct(id);

        if (result === "heard") {
            setActProblem(t("The master has already heard it."));
            void read();
        } else if (result === undefined) {
            setActProblem(t("It did not reach the game: try again."));
        } else {
            setActs(result);
            dismissAct(id);
        }
    };

    // The sheet closed, the focus goes back to what started the action.
    const closeAct = (): void => {
        const opener = acting?.opener;
        setActing(undefined);
        requestAnimationFrame(() => opener?.isConnected === true && opener.focus());
    };

    const playerActs: PlayerActs | undefined = actions === undefined || players.length === 0 ? undefined : { actions, start: (start, opener) => setActing({ start, opener }) };

    return { setActs, setActions, playerActs, acting, actsElsewhere, actPlace, reply, strip, actProblem, sendAct, closeAct, withdraw, copyFromStrip, dismissAct };
}
