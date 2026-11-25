// A master of the demo's own, for the chat in the page (D-582) with no program started and nothing spent: it opens, answers each sentence with a prose that
// comes in pieces over a couple of seconds, through a command, stops, closes, as the table's chat does (src/server/table/chat.ts). A word in the player's
// sentence shows the other states:
//   fail       the turn fails, with the table's word
//   crash      the program ends, with why
//   long       a long answer, to read back while it comes
//   elsewhere  the chat closes, and for a while a chat opened by hand plays the campaign
//   missing    the chat closes, and the app is no longer on this computer; said again in a new chat, it is back
//   codex      a second app to choose, or none again
//   ask        the master asks the player the demo's first question, as with the ask command, and waits for the answer; then goes on. With a number,
//              as ask 3, that question of the demo's. Stop leaves it without an answer
//   ooc        an answer with words out of the game, a paragraph of them and some among the story's, and brackets that are the story's
// A question the demo asks, by the chat or by its own means (look.ts --ask), and the rolls the player may see stand among its messages, as the table's
// chat keeps them: a question waits, then is answered or left; the player's words in the chat answer the one that takes them. In the middle of an answer
// the master rolls where the player may see, where the demo gives it the means.
// Not part of the tests.
import type { PageMaster, PageMessage } from "../../src/server/dashboard/index.ts";

/** The demo's master, which tells whoever listens that the chat changed. */
export interface DemoMaster extends PageMaster
{
    onChange(changed: () => void): void;
    /** What asks the player one of the demo's questions, by its number from 0, as the ask command does: it ends when the player has answered, or `stopped` says to leave it. */
    onAsk(asker: (question: number, stopped: AbortSignal) => Promise<unknown>): void;
    /** What rolls for the demo's master where the player may see it. */
    onRoll(roller: () => Promise<unknown>): void;
}

type Message = PageMessage;
type Words = Extract<Message, { from: "player" | "master" | "table"; }>;
type AskedMessage = Extract<Message, { from: "asked"; }>;

interface Chat
{
    host: string;
    model: string;
    effort?: string;
    state: "idle" | "turn" | "ended";
    why?: string;
    tool?: string;
}

// How long a chat opened by hand sits at the demo's table, and the pause between the pieces of an answer.
const elsewhereFor = 15_000;
const pieceEvery = 60;
const efforts = ["low", "medium", "high", "xhigh", "max"];
// The models the demo's Claude Code offers, as the host lists them; the hosts with no driver yet.
export const demoModels = [
    { id: "opus", name: "Opus 5.5", about: "For complex work and everyday tasks", efforts },
    { id: "claude-fable-5-2", name: "Fable 5.2", about: "For your toughest challenges", efforts },
    { id: "sonnet", name: "Sonnet 5.5", about: "Most efficient for simpler tasks", efforts },
    { id: "claude-haiku-4-5-20251001", name: "Haiku 4.5", about: "Fastest for quick answers", efforts: [] },
];
export const hostsNotReady = [
    { id: "antigravity", name: "Antigravity", ready: false, found: false, model: "", efforts: [], models: [] },
    { id: "openCode", name: "OpenCode", ready: false, found: false, model: "", efforts: [], models: [] },
];

const answer = [
    "La porta della locanda cigola, e il vento del guado entra prima di te: sa di *fango e di legna bagnata*.",
    "Dietro il banco l'oste alza appena gli occhi dal boccale che sta asciugando.\n«Si chiude al tramonto» dice. «**Dopo, il guado non perdona.**»",
    "Tre cose attirano il tuo sguardo:\n\n- un mantello fradicio appeso accanto al fuoco, che nessuno reclama;\n- una mappa inchiodata alla trave, con un segno rosso sulla Torre;\n- la botola della cantina, socchiusa.\n\nChe cosa fai?",
];

const offGame = [
    "*[OOC: prima di andare avanti: vuoi che i tiri dei mostri li faccia io di nascosto, o li vuoi vedere?]*",
    "La pioggia batte sulle imposte. L'oste ti guarda le mani *[OOC: qui serve una prova, te la chiedo fra un attimo]* e poi torna al suo boccale, come se niente fosse.",
    "Sulla trave qualcuno ha inciso [non entrare], con la punta di un coltello.\n\nChe cosa fai?",
];

const afterAsking = [
    "L'acqua ti arriva al ginocchio e tira forte, ma il piede trova la pietra.",
    "Dall'altra riva la lanterna del traghettatore si ferma, come se qualcuno ti avesse visto.\n\nChe cosa fai?",
];

const longAnswer = [
    ...answer.slice(0, 2),
    "La pioggia batte sulle imposte per tutta la sera. I pellegrini al tavolo lungo parlano a bassa voce di *luci viste sulla Torre*, e tacciono quando ti avvicini.",
    "L'oste posa il boccale. «Erano in sei, quando sono partiti» dice senza che tu lo chieda. «Ne sono tornati due, e non dicono una parola da allora.»",
    "Il fuoco si abbassa. Dalla cantina sale un odore di terra smossa, e per un attimo ti pare di sentire un passo sulle scale di legno: uno solo, poi niente.",
    "Lupa drizza le orecchie verso la botola e ringhia piano, il pelo dritto sulla schiena.",
    "Fuori, il guado è una riga scura tra le canne. La lanterna del traghettatore oscilla sull'altra riva, **troppo lontana** per dire se qualcuno la regge.",
    "Uno dei pellegrini si alza, barcolla fino al banco e lascia cadere una moneta che non è di queste parti: *un sole inciso su un lato, niente sull'altro*.",
    "«Per la stanza» mormora, e l'oste non la tocca.",
    "Quando il pellegrino torna al tavolo, vedi che ha gli stivali asciutti. Fuori piove da ore.",
    "La mappa sulla trave ha un secondo segno, più piccolo, che prima non avevi notato: non sulla Torre, ma **qui**, sulla locanda.",
    "Qualcuno, di sopra, sposta un mobile. Poi il silenzio torna, più pesante di prima.",
    "Hai ancora una torcia accesa e la notte davanti.\n\nChe cosa fai?",
];

/** The demo's master: a chat kept in this process's memory alone. */
export function demoMaster(): DemoMaster
{
    const messages: Message[] = [];
    const timers = new Set<NodeJS.Timeout>();
    let changed = (): void => undefined;
    let asker: ((question: number, stopped: AbortSignal) => Promise<unknown>) | undefined;
    let roller: (() => Promise<unknown>) | undefined;
    // The question that waits, with what answers it in the player's own words where it takes them; and what stops the one the master asked.
    let waiting: { id: string; message: AskedMessage; answer?: (words: string) => void; } | undefined;
    let asking: AbortController | undefined;
    let lastId = 0;
    let chat: Chat | undefined;
    let last: { host: string; model: string; effort?: string; } | undefined;
    let elsewhere = false;
    let missing = false;
    let second = false;

    const add = (from: Words["from"], text: string): Words => {
        const message = { id: ++lastId, from, text };
        messages.push(message);
        return message;
    };

    const isOpen = (): boolean => chat !== undefined && chat.state !== "ended";

    const later = (delay: number, does: () => void): void => {
        const timer = setTimeout(() => {
            timers.delete(timer);
            does();
            changed();
        }, delay);
        timers.add(timer);
    };

    // The answer stops where it is, and so does the question the master asked, which is left.
    const halt = (): void => {
        timers.forEach((timer) => clearTimeout(timer));
        timers.clear();
        asking?.abort();
        asking = undefined;
    };

    // The answer in pieces of a few words, each paragraph a block of its own, through a command at its start; with more than one paragraph the master
    // rolls between two of them, about halfway, and what they write after the roll is a message of its own, as at the table.
    const tell = (open: Chat, paragraphs: string[]): void => {
        const rollBefore = paragraphs.length > 1 ? Math.ceil(paragraphs.length / 2) : -1;
        let at = 900;
        let reply: Words | undefined;
        open.tool = "view";
        later(at, () => (open.tool = undefined));

        paragraphs.forEach((paragraph, index) => {
            if (index === rollBefore) {
                later(at += pieceEvery, () => {
                    open.tool = "roll";
                    reply = undefined;
                    void roller?.();
                });
                later(at += 600, () => (open.tool = undefined));
            }

            const words = paragraph.match(/\S+\s*/g) ?? [];

            for (let from = 0; from < words.length; from += 3) {
                const piece = words.slice(from, from + 3).join("");
                later(at += pieceEvery, () => {
                    if (reply === undefined) {
                        reply = add("master", piece);
                    } else {
                        reply.text += from === 0 ? `\n\n${piece}` : piece;
                    }
                });
            }
        });

        later(at + pieceEvery, () => (open.state = "idle"));
    };

    const heard = (open: Chat, text: string): void => {
        const said = text.toLowerCase();

        if (/\bfail\b/.test(said)) {
            later(900, () => {
                open.state = "idle";
                add("table", "The master's turn failed: the app answered nothing. Say it again.");
            });
        } else if (/\bcrash\b/.test(said)) {
            later(900, () => Object.assign(open, { state: "ended", why: "the app closed by itself (exit code 1)." }));
        } else if (/\belsewhere\b/.test(said)) {
            later(400, () => {
                chat = undefined;
                elsewhere = true;
                later(elsewhereFor, () => (elsewhere = false));
            });
        } else if (/\bmissing\b/.test(said)) {
            later(400, () => {
                chat = undefined;
                missing = !missing;
            });
        } else if (/\bask\b/.test(said) && asker !== undefined) {
            // The master asks and waits, as long as the player takes; then goes on from the answer, unless the turn was stopped meanwhile.
            const stopped = new AbortController();
            asking = stopped;
            open.tool = "ask";
            void asker(Math.max(0, Number(/\bask (\d+)/.exec(said)?.[1] ?? 1) - 1), stopped.signal).then(() => {
                if (chat === open && open.state === "turn" && !stopped.signal.aborted) {
                    asking = undefined;
                    tell(open, afterAsking);
                    changed();
                }
            });
        } else if (/\booc\b/.test(said)) {
            tell(open, offGame);
        } else if (/\bcodex\b/.test(said)) {
            second = !second;
            tell(open, [second ? "Ora puoi scegliere anche *Codex*, quando la chat è chiusa." : "Ora c'è di nuovo una sola app."]);
        } else {
            tell(open, /\blong\b/.test(said) ? longAnswer : answer);
        }
    };

    return {
        onChange: (listener) => (changed = listener),
        onAsk: (asks) => (asker = asks),
        onRoll: (rolls) => (roller = rolls),
        shown: () => ({
            hosts: [
                { id: "claudeCode", name: "Claude Code", ready: true, found: !missing, model: "sonnet", efforts, models: missing ? [] : demoModels },
                { id: "codex", name: "Codex", ready: second, found: second, model: second ? "gpt-codex" : "", efforts: second ? efforts.slice(0, 4) : [], models: [] },
                ...hostsNotReady,
            ],
            ...(last === undefined ? {} : { last: { ...last, resumable: true } }),
            ...(chat === undefined ? {} : { chat: { ...chat, ...(isOpen() && waiting?.answer !== undefined ? { answers: true as const } : {}) } }),
            messages: messages.map((message) => ({ ...message })),
            elsewhere,
        }),
        open: (choice) => {
            if (chat !== undefined && chat.state !== "ended") {
                return "A chat with the master is open already: close it first.";
            }

            if (elsewhere) {
                return "A chat opened by hand plays this campaign: close it, then open the chat here.";
            }

            if (choice.host === "claudeCode" && missing) {
                return "Claude Code is not on this computer: install it, then try again.";
            }

            if (choice.fresh === true || last?.host !== choice.host) {
                messages.length = 0;
                waiting = undefined;
            }

            halt();
            last = { host: choice.host, model: choice.model, ...(choice.effort === undefined ? {} : { effort: choice.effort }) };
            chat = { ...last, state: "idle" };
            changed();
            return undefined;
        },
        say: (text, shown) => {
            const open = chat;

            if (open === undefined || open.state === "ended") {
                return "closed";
            }

            // A question waits that takes the player's own words: these answer it, and the master's turn goes on.
            const answer = waiting?.answer;

            if (answer !== undefined) {
                add("player", shown ?? text);
                answer(text);
                changed();
                return "sent";
            }

            if (open.state === "turn") {
                return "busy";
            }

            add("player", shown ?? text);
            open.state = "turn";
            heard(open, text);
            changed();
            return "sent";
        },
        stop: () => {
            if (chat?.state === "turn") {
                halt();
                Object.assign(chat, { state: "idle", tool: undefined });
                changed();
            }
        },
        close: () => {
            if (chat !== undefined) {
                halt();
                chat = undefined;
                changed();
            }
        },
        active: isOpen,
        askBegins: (question, answer) => {
            if (!isOpen()) {
                return;
            }

            // One question at a time: one left waiting ended with no answer.
            if (waiting !== undefined) {
                waiting.message.state = "left";
            }

            const message: AskedMessage = { id: ++lastId, from: "asked", text: question.text, ...(question.title === undefined ? {} : { title: question.title }), options: [...question.options], state: "waiting" };
            messages.push(message);
            waiting = { id: question.id, message, ...(answer === undefined ? {} : { answer }) };
            changed();
        },
        askEnds: (id, answer) => {
            if (waiting?.id !== id) {
                return;
            }

            Object.assign(waiting.message, answer === undefined ? { state: "left" } : { state: "answered", answer });
            waiting = undefined;
            changed();
        },
        rolled: (text, roll) => {
            if (isOpen()) {
                messages.push({ id: ++lastId, from: "roll", text, roll });
                changed();
            }
        },
    };
}
