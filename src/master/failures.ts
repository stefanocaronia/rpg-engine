// Every failure a driver tells, written once: its words, which the table's log and the master read, and its code with its values, which a page says in its own
// language. The same thing said by two drivers has one code. What the host said, a path or a model's id is a value, as it came.
import type { EndCode, Failure } from "./chat.ts";

// The host's program and its protocol.

/** The program is gone: how it ended, as the system says it, and its last lines on its stderr. */
export function programEnded(reason: string, errors: string[]): Failure
{
    const said = errors.length === 0 ? undefined : errors.join(" | ");
    return failure("program-ended", `the host's program ended (${reason})${said === undefined ? "" : `: ${said}`}`, { reason, why: said });
}

export function notStopped(): Failure
{
    return failure("not-stopped", "the host did not stop its turn and was closed");
}

export function notReady(model: string, seconds: number): Failure
{
    return failure("not-ready", `the host was not ready to play with the model ${model} within ${String(seconds)} seconds`, { model, seconds: String(seconds) });
}

export function noProtocol(why: string | undefined): Failure
{
    return failure("no-protocol", `the host did not begin the protocol: ${why ?? "its answer is no answer"}`, { why });
}

/** The host opened no chat, or took none up again (`resumed`): why, in its words, else `unnamed`, what its answer lacks. */
export function chatNotOpened(why: string | undefined, unnamed: string, resumed = false): Failure
{
    return failure(resumed ? "chat-not-resumed" : "chat-not-opened", `the host did not ${resumed ? "take the chat up again" : "open the chat"}: ${why ?? unnamed}`, { why });
}

export function noResume(): Failure
{
    return failure("no-resume", "the host cannot take a chat up again: open a new one");
}

/** The player is not signed in to the host, which signs in from the page. */
export function notSignedIn(host: string): Failure
{
    return failure("signin", `${host} is not signed in on this computer: sign in here, then open the chat`, { host });
}

/** A failure the host answered as the player is not signed in: its words stay, and its code says so, with what the host said. */
export function asNotSignedIn(told: Failure, host: string, said: string): Failure
{
    return failure("signin", told.why, { host, why: said });
}

// The model and the effort asked.

export function modelNotTaken(model: string, why: string | undefined): Failure
{
    return failure("model-not-taken", `the host did not take the model ${model}: ${why ?? "it gave no reason"}`, { model, why });
}

export function effortNotTaken(effort: string, why: string | undefined): Failure
{
    return failure("effort-not-taken", `the host did not take the effort ${effort}: ${why ?? "it gave no reason"}`, { effort, why });
}

export function modelNotConfirmed(model: string, seconds: number): Failure
{
    return failure("model-not-confirmed", `the host did not confirm the model ${model} within ${String(seconds)} seconds`, { model, seconds: String(seconds) });
}

/** Asked for a model, the host stayed on the one it ran. */
export function modelStayed(asked: string, model: string): Failure
{
    return failure("model-stayed", `the host was asked for the model ${asked} and stayed on ${model}`, { asked, model });
}

/** Asked for a model, the host answered with another: anything but a name, and it is not said. */
export function modelOther(asked: string, model: unknown): Failure
{
    const named = typeof model === "string" ? model : undefined;
    return failure("model-other", `the host was asked for the model ${asked} and runs ${named ?? "another, unnamed"}`, { asked, model: named });
}

export function effortOther(asked: string, effort: unknown): Failure
{
    const named = typeof effort === "string" ? effort : undefined;
    return failure("effort-other", `the host was asked for the effort ${asked} and runs ${named ?? "another, unnamed"}`, { asked, effort: named });
}

/** In a turn, the host runs another model than the one it confirmed. */
export function modelSwitched(model: string, asked: string): Failure
{
    return failure("model-switched", `the host runs the model ${model} instead of ${asked}`, { model, asked });
}

export function effortSwitched(effort: string, asked: string): Failure
{
    return failure("effort-switched", `the host runs the effort ${effort} instead of ${asked}`, { effort, asked });
}

// A turn the host ended.

/** The host's own words, and nothing of the table's around them. */
export function hostSaid(why: string): Failure
{
    return failure("host-said", why, { why });
}

export function modelFailed(why: string): Failure
{
    return failure("model-failed", `the host's model failed: ${why}`, { why });
}

export function wordsNotTaken(why: string): Failure
{
    return failure("words-not-taken", `the host did not take the player's words: ${why}`, { why });
}

/** The host ended a turn for a reason of its protocol the table has no words for: `did`, how the driver says it, "ended" or "stopped". */
export function turnStopped(did: "ended" | "stopped", why: string): Failure
{
    return failure("turn-stopped", `the host ${did} the turn: ${why}`, { why });
}

export function answerTooLong(): Failure
{
    return failure("answer-too-long", "the master's answer reached the longest its model may write");
}

export function tooManySteps(): Failure
{
    return failure("too-many-steps", "the master took more steps than one turn allows");
}

export function modelRefusal(): Failure
{
    return failure("model-refused", "the model refused to go on");
}

// What the table does not let the master use.

/** A tool of a kind the table does not allow. */
export function toolNotAllowed(tool: string): Failure
{
    return failure("tool-unasked", `the table does not let the master use ${tool}`, { tool });
}

/** A tool that read outside the campaign's folder: the path it asked, or none where it did not say what it read. */
export function readOutside(tool: string, path: string | undefined): Failure
{
    return path === undefined
        ? failure("read-unsaid", `${tool} read a path it did not say, and the table lets the master read only the campaign's folder`, { tool })
        : failure("read-outside", `${tool} read ${path}, and the table lets the master read only the campaign's folder`, { tool, path });
}

export function agentUnknown(): Failure
{
    return failure("agent-unknown", "the table does not know which agent the master started");
}

export function agentOther(): Failure
{
    return failure("agent-other", "the table lets the master start only the agent that plays a character");
}

export function agentUnasked(): Failure
{
    return failure("agent-unasked", "the host ran a subagent the table did not let the master start");
}

/** What the host ran with no leave of the table's: the turn fails saying so, with the code and values of what it ran. */
export function ranWithoutAsking(what: Failure): Failure
{
    return { ...what, why: `the host ran a tool without asking: ${what.why}` };
}

// What keeps a chat from opening, known before the host's program starts.

/** The campaign lacks the file that tells the host how to start the game's server. */
export function noServerFile(file: string, host: string): Failure
{
    return failure("no-server-file", `This campaign has no ${file}, which tells ${host} how to start the game's server: run rpg init in the campaign's folder, then try again.`, { file, host });
}

/** An effort the host does not know, for a model it did not list. */
export function effortUnknown(host: string, effort: string, efforts: string[]): Failure
{
    return failure("effort-unknown", `${host} knows no effort ${effort}: choose one of ${efforts.join(", ")}.`, { host, effort, efforts: efforts.join(", ") });
}

/** A model that takes no effort at all. */
export function effortNone(model: string, host: string): Failure
{
    return failure("effort-none", `${model} takes no effort in ${host}: leave the effort to the host.`, { model, host });
}

/** An effort the model does not take, among those it does. */
export function effortNotOfModel(model: string, effort: string, host: string, efforts: string[]): Failure
{
    return failure("effort-not-of-model", `${model} takes no effort ${effort} in ${host}: choose one of ${efforts.join(", ")}.`, { model, effort, host, efforts: efforts.join(", ") });
}

/** A failure with the values that have one: none at all where every one is left out. */
function failure(code: EndCode, why: string, values: Record<string, string | undefined> = {}): Failure
{
    const given = Object.fromEntries(Object.entries(values).flatMap(([name, value]): [string, string][] => (value === undefined ? [] : [[name, value]])));
    return { why, code, ...(Object.keys(given).length === 0 ? {} : { values: given }) };
}
