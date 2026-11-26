// A master of the demo's own, for the chat in the page (D-582) with no program started and nothing spent: it opens, answers each sentence with a prose that
// comes in pieces over a couple of seconds, through a command, stops, closes, as the table's chat does (src/server/table/chat.ts). A word in the player's
// sentence shows the other states:
//   fail       the turn fails, with the table's word
//   crash      the program ends, with why
//   long       a long answer, to read back while it comes
//   elsewhere  the chat closes, and for a while a chat opened by hand plays the campaign
//   missing    the chat closes, and the app is no longer on this computer; said again in a new chat, it is back
//   codex      Codex signed in, or out again
//   expired    the chat ends as the app's sign-in ran out, which the page is told by its code; the app is to set up again
//   signout    the chat closes, and the app's sign-in runs out unseen: the page still reads it signed in, and opening the chat again with it is refused
//              with the code of the sign-in, as the table finds it out
//   ask        the master asks the player the demo's first question, as with the ask command, and waits for the answer; then goes on. With a number,
//              as ask 3, that question of the demo's. Stop leaves it without an answer
//   (with `takes`, the campaign has a chat to take up, which the demo takes up by itself as the first page listens, as the table does: "cut", cut as
//   the game was closed, its flow as it was written with a question left without an answer at its end, cut short until the next turn begins; "whole",
//   its flow ending with the master's words, taken up until the player says something; "empty", taken up with no flow kept, as an old chat)
//   ooc        an answer with words out of the game, a paragraph of them and some among the story's, and brackets that are the story's
// The apps (test/demo/hosts.ts) are installed and signed in to from the page; the model of an open chat changes between two turns, in every app, and the
// table's line says so, with its mark, once the app takes it half a second later: until then the chat shows the model before. Haiku 4.5 takes no effort,
// and the one before is left. Claude Code does not take Fable 5.2, nor the effort max, and the table's one line says that in place of the change's. OpenCode says the efforts of a model a moment after it is chosen, as the host's session event.
// A question the demo asks, by the chat or by its own means (look.ts --ask), and the rolls the player may see stand among its messages, as the table's
// chat keeps them: a question waits, then is answered or left; the player's words in the chat answer the one that takes them. In the middle of an answer
// the master rolls where the player may see, where the demo gives it the means, and its words after hold the engine's mark of that roll, [roll <id>].
// Not part of the tests.
import type { ModelMark, PageChat, PageMaster, PageMessage } from "../../src/server/dashboard/index.ts";
import { type DemoHosts, demoHosts, effortsOnceChosen } from "./hosts.ts";

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
    /** The app's own name for the model it runs, and its efforts where the app says them only once it is chosen. */
    runs?: string;
    efforts?: string[];
    state: "idle" | "turn" | "ended";
    why?: string;
    code?: "signin";
    tool?: string;
}

/** A change of model asked of the open chat, before its app answers: what was asked, the chat before it, and the table's line once it is taken. */
interface Pending
{
    model: string;
    effort: string | undefined;
    name: string;
    before: { model: string; effort: string | undefined; runs: string | undefined; efforts: string[] | undefined; };
    line: { text: string; mark: ModelMark; };
}

// How long a chat opened by hand sits at the demo's table, and the pause between the pieces of an answer.
const elsewhereFor = 15_000;
const pieceEvery = 60;
// How long an app takes to say the model it runs, after the chat opens or its model changes.
const sessionAfter = 500;
// The model and the effort the demo's Claude Code does not take in an open chat.
const refusedModel = "claude-fable-5-2";
const refusedEffort = "max";

const answer = [
    "La porta della locanda cigola, e il vento del guado entra prima di te: sa di *fango e di legna bagnata*.",
    "Dietro il banco l'oste alza appena gli occhi dal boccale che sta asciugando.\n«Si chiude al tramonto» dice. «**Dopo, il guado non perdona.**»",
    // The engine's mark of the roll just made, {roll} its id, with bold around it; brackets of the master's own, which stay as written; and the mark of a
    // roll the chat does not have, which shows nothing.
    "Un'ombra scatta verso la porta sul retro, e Lupa le taglia la strada **[roll {roll}]** ma l'ombra è svelta: [Fuga 1/4]. Qui c'è il segno di un tiro che la chat non ha, e non si vede [roll 0badf00d].",
    "Tre cose attirano il tuo sguardo:\n\n- un mantello fradicio appeso accanto al fuoco, che nessuno reclama;\n- una mappa inchiodata alla trave, con un segno rosso sulla Torre;\n- la botola della cantina, socchiusa.\n\nChe cosa fai?",
];

const offGame = [
    "*[OOC: prima di andare avanti: vuoi che i tiri dei mostri li faccia io di nascosto, o li vuoi vedere?]*",
    "La pioggia batte sulle imposte. L'oste ti guarda le mani *[OOC: qui serve una prova, te la chiedo fra un attimo]* e poi torna al suo boccale, come se niente fosse.",
    "Sulla trave qualcuno ha inciso [non entrare], con la punta di un coltello.\n\nChe cosa fai?",
];

const afterAsking = [
    // The mark of the player's roll, which the question's answer made; the master's roll that follows has none, and keeps its line.
    "L'acqua ti arriva al ginocchio e tira forte [roll {roll}], ma il piede trova la pietra.",
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

// The flow of a chat cut as the game was closed, as the campaign kept it: the story so far, a roll, and a question that was waiting, left.
const flowBefore: (Omit<Words, "id"> | Omit<AskedMessage, "id"> | Omit<Extract<Message, { from: "roll"; }>, "id">)[] = [
    { from: "player", text: "Entro nella locanda." },
    { from: "master", text: answer.slice(0, 2).join("\n\n") },
    { from: "roll", text: "Lupa: 1d6 = 5 [5]", roll: { id: "0ddba11d", at: "2026-11-25T18:00:00.000Z", by: "master", who: "Lupa", check: "Fiuto", notation: "1d6", total: 5, text: "1d6 = 5 [5]", dice: [{ sides: 6, value: 5 }] } },
    { from: "master", text: answer.slice(2).join("\n\n").replaceAll("{roll}", "0ddba11d") },
    { from: "player", text: "Mi avvicino al banco e poso il sigillo spezzato davanti all'oste." },
    { from: "master", text: "L'oste guarda la cera rossa, poi te. Posa il boccale.\n\n«Dove l'hai trovato?»" },
    { from: "asked", text: "L'oste aspetta una risposta: che cosa gli dici?", title: "Scelta", options: ["La verità", "Una mezza verità", "Niente"], state: "left" },
];

/**
 * The demo's master: a chat kept in this process's memory alone; with `takes`, one to take up: cut as the game was closed, whole, or with no flow kept;
 * `hosts`, the apps it opens in, shared with the demo's launcher.
 */
export function demoMaster({ takes, hosts = demoHosts() }: { takes?: "cut" | "whole" | "empty" | undefined; hosts?: DemoHosts; } = {}): DemoMaster
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
    // Whether a page listened yet, and whether the chat taken up is still as the closing cut it.
    let pageCame = false;
    // The id of the last roll told, which the master's words mark.
    let lastRoll: string | undefined;
    let cutShort = false;
    let takenUp = false;
    let elsewhere = false;
    let missing = false;
    // The app whose sign-in ran out while the page still reads it signed in.
    let signedOut: string | undefined;
    // The change of model asked of the open chat that its app has not answered yet.
    let pending: Pending | undefined;

    hosts.onChange(() => changed());

    const add = (from: Words["from"], text: string): Words => {
        const message = { id: ++lastId, from, text };
        messages.push(message);
        return message;
    };

    const isOpen = (): boolean => chat !== undefined && chat.state !== "ended";

    // The app says the model it runs, and its efforts where it says them only now: an effort the model does not take is left out, as the table does.
    const sessionTold = (open: Chat): void => {
        later(sessionAfter, () => {
            if (chat !== open) {
                return;
            }

            const efforts = effortsOnceChosen(open.host, open.model);
            open.runs = open.model;

            if (efforts !== undefined) {
                open.efforts = efforts;

                if (open.effort !== undefined && !efforts.includes(open.effort)) {
                    delete open.effort;
                }
            }
        });
    };

    // The open chat plays with that model and effort from now on, and so does the campaign's last chat.
    const choose = (open: Chat, model: string, effort: string | undefined): void => {
        if (model !== open.model) {
            Object.assign(open, { runs: undefined, efforts: undefined });
        }

        open.model = model;

        if (effort === undefined) {
            delete open.effort;
        } else {
            open.effort = effort;
        }

        last = { host: open.host, model, ...(effort === undefined ? {} : { effort }) };
    };

    // A line of the table's about the master's model, with its mark, as the table writes it.
    const tableLine = (text: string, mark: ModelMark): void => {
        messages.push({ id: ++lastId, from: "table", text, ...mark });
    };

    // The app did not take what was asked, in one line: the model, and the one before stays with its effort, its name and efforts as the app said them;
    // else the effort, and the model asked plays with the effort before.
    const refused = (open: Chat, change: Pending): void => {
        const { before, model, name } = change;
        const app = hosts.find(open.host);
        const kept = app?.models.find((one) => one.id === before.model)?.name ?? before.model;

        if (model === refusedModel) {
            choose(open, before.model, before.effort);
            Object.assign(open, { runs: before.runs, efforts: before.efforts });
            tableLine(`${app?.name ?? open.host} did not take ${name}: the master goes on with ${kept}.`, { code: "model-kept", model: kept, asked: name });
            return;
        }

        choose(open, model, before.effort);
        tableLine(`${app?.name ?? open.host} did not take that effort: the master plays with ${name}, its effort as before.`, {
            code: "model",
            model: name,
            ...(before.effort === undefined ? {} : { effort: before.effort }),
            dropped: true,
        });
        sessionTold(open);
    };

    // The app answers a change a moment after it is asked: until then the chat shows the model before, and the line is written as it takes it.
    const answerChange = (open: Chat, change: Pending): void => {
        later(sessionAfter, () => {
            if (chat !== open || pending !== change) {
                return;
            }

            pending = undefined;

            if (open.host === "claudeCode" && (change.model === refusedModel || change.effort === refusedEffort)) {
                refused(open, change);
                return;
            }

            choose(open, change.model, change.effort);
            tableLine(change.line.text, change.line.mark);
            sessionTold(open);
        });
    };

    if (takes !== undefined) {
        last = { host: "claudeCode", model: "sonnet", effort: "medium" };
        // Whole, the flow ends with the master's words: the question that was waiting is the cut one's.
        (takes === "empty" ? [] : takes === "whole" ? flowBefore.slice(0, -1) : flowBefore).forEach((message) => messages.push({ ...message, id: ++lastId } as Message));
    }

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
        pending = undefined;
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
                    // The mark of the last roll made, by its id as it is known now.
                    const written = piece.replaceAll("{roll}", lastRoll ?? "00000000");

                    if (reply === undefined) {
                        reply = add("master", written);
                    } else {
                        reply.text += from === 0 ? `\n\n${written}` : written;
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
            const codex = hosts.find("codex");
            const signed = codex?.account !== "in";
            Object.assign(codex ?? {}, { account: signed ? "in" : "out" });
            tell(open, [signed ? "Ora *Codex* è pronta, quando la chat è chiusa." : "Ora Codex è di nuovo da attivare."]);
        } else if (/\bsignout\b/.test(said)) {
            later(400, () => {
                chat = undefined;
                signedOut = open.host;
            });
        } else if (/\bexpired\b/.test(said)) {
            later(900, () => {
                Object.assign(open, { state: "ended", why: "the app answered 401 Unauthorized.", code: "signin" });
                Object.assign(hosts.find(open.host) ?? {}, { account: "out" });
            });
        } else {
            tell(open, /\blong\b/.test(said) ? longAnswer : answer);
        }
    };

    return {
        onChange: (listener) => (changed = listener),
        onAsk: (asks) => (asker = asks),
        onRoll: (rolls) => (roller = rolls),
        hostWish: (wish) => hosts.wish(wish),
        // Another model for the open chat between two turns, checked as the table does: an effort the model's list does not have is refused, unless
        // the app says its efforts only once it is chosen; none keeps the one before where the model takes it, else leaves it, and the line says so. The
        // table's line says the change with its mark. Claude Code does not take Fable 5.2, nor the effort max, a moment later, as an app refuses.
        changeModel: (model, effort) => {
            const open = chat;

            if (open === undefined || open.state === "ended") {
                return "No chat with the master is open: open one first.";
            }

            if (open.state === "turn") {
                return "The master is answering: change the model once they have finished.";
            }

            const host = hosts.find(open.host);
            const listed = host?.models.find((one) => one.id === model);
            const efforts = listed?.efforts ?? host?.efforts ?? [];
            const notKnown = effortsOnceChosen(open.host, model) !== undefined && listed !== undefined && listed.efforts.length === 0;
            const takes = (one: string): boolean => notKnown || efforts.includes(one);
            const name = listed?.name ?? model;

            if (effort !== undefined && !takes(effort)) {
                return efforts.length === 0
                    ? `${name} takes no effort in ${host?.name ?? open.host}: leave the effort to the host.`
                    : `${name} takes no effort ${effort} in ${host?.name ?? open.host}: choose one of ${efforts.join(", ")}.`;
            }

            // A change asked and not taken yet is the one the next starts from, as at the table.
            const was = pending ?? { model: open.model, effort: open.effort };
            const stays = effort === undefined && was.effort !== undefined && takes(was.effort);
            const asked = effort ?? (stays ? was.effort : undefined);
            const dropped = effort === undefined && was.effort !== undefined && !stays ? was.effort : undefined;

            if (model === was.model && asked === was.effort) {
                return undefined;
            }

            // Until the app confirms, the chat shows what it runs still, as at the table.
            const before = pending?.before ?? { model: open.model, effort: open.effort, runs: open.runs, efforts: open.efforts };

            const line = dropped === undefined
                ? { text: `From now on the master plays with ${name}${asked === undefined ? "" : `, effort ${asked}`}.`, mark: { code: "model" as const, model: name, ...(asked === undefined ? {} : { effort: asked }) } }
                : { text: `From now on the master plays with ${name}, which takes no effort ${dropped}: the app chooses its own.`, mark: { code: "model" as const, model: name, dropped: true as const } };
            pending = { model, effort: asked, name, before, line };
            answerChange(open, pending);
            changed();
            return undefined;
        },
        shown: () =>
            ({
                hosts: hosts.list().map((host) => (host.id === "claudeCode" && missing ? { ...host, found: false, models: [] } : host)),
                ...(last === undefined ? {} : { last: { ...last, resumable: true } }),
                ...(chat === undefined
                    ? {}
                    : {
                        chat: {
                            ...chat,
                            ...(cutShort ? { cutShort: true as const } : {}),
                            ...(takenUp ? { takenUp: true as const } : {}),
                            ...(isOpen() && waiting?.answer !== undefined ? { answers: true as const } : {}),
                            // Every app's driver changes the model of an open chat.
                            ...(chat.state === "ended" ? {} : { changes: true as const }),
                        },
                    }),
                messages: messages.map((message) => ({ ...message })),
                elsewhere,
            }) as PageChat,
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

            const host = hosts.find(choice.host);

            // A sign-in that ran out unseen: the table finds it out now, and the page reads the app to set up.
            if (host !== undefined && (host.account === "out" || signedOut === choice.host)) {
                signedOut = undefined;
                host.account = "out";
                changed();
                return { error: `${host.name} is not signed in on this computer: sign in here, then open the chat.`, code: "signin" };
            }

            if (choice.fresh === true || last?.host !== choice.host) {
                messages.length = 0;
                waiting = undefined;
            }

            halt();
            cutShort = false;
            takenUp = false;
            last = { host: choice.host, model: choice.model, ...(choice.effort === undefined ? {} : { effort: choice.effort }) };
            chat = { ...last, state: "idle" };
            sessionTold(chat);
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
            cutShort = false;
            takenUp = false;
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
        // The campaign's last chat is taken up by itself as the first page listens, once.
        listened: () => {
            if (!pageCame && takes !== undefined && chat === undefined && last !== undefined) {
                chat = { ...last, runs: "claude-sonnet-5-5", state: "idle" };
                cutShort = takes === "cut";
                takenUp = takes !== "cut";
                changed();
            }

            pageCame = true;
        },
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
                lastRoll = roll.id;
                changed();
            }
        },
    };
}
