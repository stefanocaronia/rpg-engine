// Getting the chat ready: the protocol begun, the session opened or taken up, the model and effort set and confirmed before the player's first words.
import type { Failure } from "../chat.ts";
import { answerTooLong, asNotSignedIn, chatNotOpened, effortNotTaken, effortOther, hostSaid, modelNotTaken, modelOther, modelRefusal, modelStayed, noProtocol, noResume, notReady, tooManySteps, turnStopped } from "../failures.ts";
import { failureOf, isObject, type Message } from "../lines.ts";
import { chatReady, endTurn, modelChanged, refused, tell } from "../state.ts";
import { configOption, effortsOf, initializeParams } from "./protocol.ts";
import type { State, Turn } from "./state.ts";

// How long the agent may take to get ready: its program started, its session opened with its MCP servers, the model set.
const readyWait = 60_000;

/** Begins the protocol; the rest follows each answer. */
export function begin(state: State): void
{
    waitReady(state);
    state.requests.ask("initialize", initializeParams(), (answer) => {
        if (failureOf(answer) !== undefined || !isObject(answer.result)) {
            refused(state, answerFailure(state, answer, noProtocol));
            return;
        }

        state.capabilities = isObject(answer.result.agentCapabilities) ? answer.result.agentCapabilities : {};
        openSession(state);
    });
}

/** Another model asked in an open chat, and the effort where given: the player's next words wait until the agent confirms them. */
export function changeModel(state: State, model: string, effort: string | undefined): void
{
    const { before, ...running } = state.model;
    state.model = { asked: model, ...(effort === undefined ? {} : { effort }), before: before ?? running };
    askModelAgain(state);
}

/** Asks the model again after the agent changed it: the player's next words wait for its answer. */
export function askModelAgain(state: State): void
{
    state.ready = false;
    state.model.confirmed = undefined;
    waitReady(state);
    askModel(state);
}

/** Writes the player's words: the session is told first where it or the model changed. */
export function writePrompt(state: State, turn: Turn, text: string): void
{
    turn.held = undefined;
    const session = state.session ?? "";
    const model = state.model.confirmed ?? "";

    if (state.told?.session !== session || state.told.model !== model) {
        state.told = { session, model };
        tell(state, { type: "session", session, model, efforts: effortsOf(state.config) });
    }

    state.requests.ask("session/prompt", { sessionId: session, prompt: [{ type: "text", text }] }, (answer) => promptAnswered(state, turn, answer));
}

function waitReady(state: State): void
{
    state.cancelReadyWait?.();
    state.cancelReadyWait = state.later(readyWait, () => refused(state, notReady(state.model.asked, readyWait / 1000)));
}

/** A new session, or the one taken up: by loading it, or resuming it where the agent cannot load. */
function openSession(state: State): void
{
    const sessions = isObject(state.capabilities.sessionCapabilities) ? state.capabilities.sessionCapabilities : {};
    const where = { cwd: state.folder, mcpServers: [] };
    const resumed = state.resumed;

    if (resumed === undefined) {
        state.requests.ask("session/new", where, (answer) => sessionOpened(state, answer));
    } else if (state.capabilities.loadSession === true) {
        state.requests.ask("session/load", { ...where, sessionId: resumed }, (answer) => sessionOpened(state, answer));
    } else if (sessions.resume !== undefined) {
        state.requests.ask("session/resume", { ...where, sessionId: resumed }, (answer) => sessionOpened(state, answer));
    } else {
        refused(state, noResume());
    }
}

function sessionOpened(state: State, answer: Message): void
{
    const opened = isObject(answer.result) ? answer.result : {};
    const session = state.resumed ?? opened.sessionId;

    if (failureOf(answer) !== undefined || typeof session !== "string") {
        refused(state, answerFailure(state, answer, (why) => chatNotOpened(why, "it named no session")));
        return;
    }

    state.session = session;
    state.config = opened.configOptions;
    askModel(state);
}

/** Sets the model by the session's option of configuration, or by the protocol's call for models where it has no such option. */
function askModel(state: State): void
{
    const asked = state.model.asked;
    const option = configOption(state.config, "model", "model");

    if (option !== undefined && typeof option.id === "string") {
        setOption(state, option.id, asked, "model", (confirmed) => {
            state.model.confirmed = confirmed;
            askEffort(state);
        });
    } else {
        // Without such an option, the protocol's own call: its success is the confirmation, and a host that has no such call says so in its error.
        state.requests.ask("session/set_model", { sessionId: state.session, modelId: asked }, (answer) => {
            if (failureOf(answer) !== undefined) {
                notTaken(state, "model", answerFailure(state, answer, (why) => modelNotTaken(asked, why)));
                return;
            }

            state.model.confirmed = asked;
            askEffort(state);
        });
    }
}

/**
 * Sets the effort where the model in play takes it, as the options say once the model is set: one it does not take is left out, its own default kept, and
 * the efforts it takes reach the table with the session.
 */
function askEffort(state: State): void
{
    const effort = state.model.effort;
    const option = configOption(state.config, "thought_level", "effort");

    if (effort === undefined || option === undefined || typeof option.id !== "string" || !effortsOf(state.config).includes(effort)) {
        modelReady(state);
        return;
    }

    setOption(state, option.id, effort, "effort", () => modelReady(state));
}

/** The model and effort are set: the chat is ready, and a model changed after a turn is told now. */
function modelReady(state: State): void
{
    const changed = state.model.before !== undefined;
    state.model.before = undefined;
    chatReady(state);
    modelChanged(state, state.model.confirmed ?? state.model.asked, effortsOf(state.config), changed ? state.model.asked : undefined);
}

/** Sets an option of the session and calls `confirmed` once the agent's answer shows it set; else the chat ends saying what the agent did. */
function setOption(state: State, id: string, value: string, what: "model" | "effort", confirmed: (value: string) => void): void
{
    state.requests.ask("session/set_config_option", { sessionId: state.session, configId: id, value }, (answer) => {
        const result = isObject(answer.result) ? answer.result : {};

        if (failureOf(answer) !== undefined) {
            notTaken(state, what, answerFailure(state, answer, (why) => (what === "model" ? modelNotTaken(value, why) : effortNotTaken(value, why))));
            return;
        }

        // An answer that lists no options says nothing against the value set: its success confirms it.
        if (!Array.isArray(result.configOptions)) {
            confirmed(value);
            return;
        }

        state.config = result.configOptions;
        const now = result.configOptions.filter(isObject).find((option) => option.id === id)?.currentValue;

        if (now === value) {
            confirmed(value);
        } else if (what === "model" && now !== undefined && now === state.model.before?.confirmed) {
            // The agent stayed on the model it ran: the change was not taken, and the chat goes on with it.
            notTaken(state, what, modelStayed(value, String(now)));
        } else {
            refused(state, what === "model" ? modelOther(value, now) : effortOther(value, now));
        }
    });
}

/**
 * The agent answered the model or effort asked with an error: asked in the open chat, the chat goes on with the model it ran before, or with the model
 * taken and the effort it ran before, and the table is told; asked at the opening, or for a player no longer signed in, the chat cannot play.
 */
function notTaken(state: State, what: "model" | "effort", failure: Failure): void
{
    const before = state.model.before;

    if (before === undefined || failure.code === "signin") {
        refused(state, failure);
        return;
    }

    const asked = state.model.asked;

    if (what === "model") {
        state.model = { ...before };
        tell(state, { type: "changeRefused", asked, model: before.asked, ...(before.effort === undefined ? {} : { effort: before.effort }), why: failure.why });
        chatReady(state);
        return;
    }

    state.model.effort = before.effort;
    tell(state, { type: "changeRefused", asked, model: asked, ...(before.effort === undefined ? {} : { effort: before.effort }), why: failure.why });
    modelReady(state);
}

/** The turn's end: done, interrupted when the table asked it, else failed with why. */
function promptAnswered(state: State, turn: Turn, answer: Message): void
{
    if (state.turn !== turn) {
        return;
    }

    const why = failureOf(answer);
    const reason = isObject(answer.result) ? answer.result.stopReason : undefined;

    if (turn.failure !== undefined) {
        endTurn(state, "failed", turn.failure);
    } else if (turn.interrupted || reason === "cancelled") {
        endTurn(state, "interrupted");
    } else if (why !== undefined && isNotSignedIn(state, answer)) {
        // The player is no longer signed in: no turn plays until they are, so the chat ends saying so.
        refused(state, answerFailure(state, answer, (said) => hostSaid(said ?? why)));
    } else if (why !== undefined) {
        endTurn(state, "failed", hostSaid(why));
    } else if (reason === "end_turn") {
        endTurn(state, "done");
    } else {
        endTurn(state, "failed", stopFailure(reason));
    }
}

/** Why the agent stopped a turn, by the protocol's reason: in words a player can read where the table knows it, else the reason as the agent named it. */
function stopFailure(reason: unknown): Failure
{
    switch (reason) {
        case "max_tokens":
            return answerTooLong();
        case "max_turn_requests":
            return tooManySteps();
        case "refusal":
            return modelRefusal();
        default:
            return turnStopped("stopped", String(reason));
    }
}

// The protocol's error for an agent whose player is not signed in.
const authRequired = -32000;

/**
 * The failure `told` makes of why an answer failed, undefined for an answer that failed in no words of its own. For a host not signed in, its words end
 * with how to sign it in, and its code says so, with what the host said.
 */
function answerFailure(state: State, answer: Message, told: (why: string | undefined) => Failure): Failure
{
    const why = failureOf(answer);

    if (why === undefined || !isNotSignedIn(state, answer)) {
        return told(why);
    }

    const withLogin = `${why}: ${state.host.login}`;
    return asNotSignedIn(told(withLogin), state.name, why);
}

/** Whether an answer failed as the player is not signed in to the host: by the protocol's own error, or by the host's words for it. */
function isNotSignedIn(state: State, answer: Message): boolean
{
    const why = failureOf(answer);
    const code = isObject(answer.error) ? answer.error.code : undefined;
    return why !== undefined && (code === authRequired || state.host.signInWords?.test(why) === true);
}
