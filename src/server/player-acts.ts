// What the player does on the dashboard, in their own words (D-493 (1), D-495): sentences the master hears at their next call as said in chat, kept in the
// chat's memory only, never in the log, and lost with the chat; the player takes one back until the master hears it, or is called for it.

/** A sentence the player said on the dashboard; rung once the doorbell called the master for it. */
export interface Act
{
    id: string;
    text: string;
    /** The thing of the sheet it starts from, by its page, whose known text the master hears with it (T-218). */
    item?: string;
    rung?: boolean;
    /** Held for a hook that speaks it as the player: whether the hook said it took it (D-578). */
    taken?: boolean;
}

/**
 * The sentences said and not yet heard, in order; those given to a hook that speaks them as the player, held until the master's next call begins (D-578);
 * and the ids of those heard lately, for the page to tell.
 */
export interface Acts
{
    pending: Act[];
    held: Act[];
    heard: string[];
}

// How many heard ids the page can still ask about: the strip shows one sentence or two.
const heardKept = 20;

// What does not show, or breaks a line in the player's words, from a single sentence: control characters, which no process could take either.
const unseen = /[\u0000-\u001f\u007f]+/g;

export function newActs(): Acts
{
    return { pending: [], held: [], heard: [] };
}

/** The player's words as one sentence: what does not show taken away, every break a space; empty when nothing is left. */
export function actText(text: string): string
{
    return text.replace(unseen, " ").replace(/\s+/g, " ").trim();
}

/** Takes back a sentence the master has not heard yet, nor been called for: what became of it. */
export function withdrawAct(acts: Acts, id: string): "withdrawn" | "heard" | "unknown"
{
    const index = acts.pending.findIndex((act) => act.id === id);

    if (index === -1) {
        return acts.heard.includes(id) || acts.held.some((act) => act.id === id) ? "heard" : "unknown";
    }

    // The doorbell rang for it: the master is called, and would find nothing.
    if (acts.pending[index].rung === true) {
        return "heard";
    }

    acts.pending.splice(index, 1);
    return "withdrawn";
}

/** Marks the sentences waiting as rung for: the master is called for them. */
export function markRung(acts: Acts): void
{
    acts.pending.forEach((act) => (act.rung = true));
}

/** Marks sentences heard, as a call or Codex's queue took them. */
export function markHeard(acts: Acts, ids: string[]): void
{
    acts.pending = acts.pending.filter((act) => !ids.includes(act.id));
    acts.heard = [...acts.heard.filter((id) => !ids.includes(id)), ...ids].slice(-heardKept);
}

/** Holds the sentences waiting, as given to a hook that speaks them as the player, until it says it took them, then until the master's next call begins. */
export function holdActs(acts: Acts): Act[]
{
    const taken = acts.pending;
    acts.pending = [];
    acts.held = [...acts.held, ...taken.map((act) => ({ ...act, rung: true, taken: false }))];
    return taken;
}

/** Marks held sentences as taken by the hook they were given to: they are on their way to the chat. */
export function takeHeld(acts: Acts, ids: string[]): void
{
    acts.held = acts.held.map((act) => (ids.includes(act.id) ? { ...act, taken: true } : act));
}

/**
 * As a call of the master begins: the held sentences their hook took are heard; those it never took, as from a hook killed meanwhile, go back to the head of
 * those waiting, for this call to take.
 */
export function hearHeld(acts: Acts): void
{
    const held = acts.held;
    acts.held = [];
    markHeard(acts, held.filter((act) => act.taken === true).map((act) => act.id));
    acts.pending = [...held.filter((act) => act.taken !== true).map(waiting), ...acts.pending];
}

/**
 * Gives the held sentences among `ids` that the hook never took back to the head of those waiting, as the master never began a call after them; whether any
 * came back. One the hook took is in the chat already, however long the master takes to call: given back, it would be said twice.
 */
export function giveBackHeld(acts: Acts, ids: string[]): boolean
{
    const back = acts.held.filter((act) => ids.includes(act.id) && act.taken !== true);
    acts.held = acts.held.filter((act) => !back.includes(act));
    acts.pending = [...back.map(waiting), ...acts.pending];
    return back.length > 0;
}

/** A held sentence as one waiting again, neither rung for nor taken. */
function waiting(act: Act): Act
{
    const { rung: _, taken: __, ...rest } = act;
    return rest;
}

/** Gives a sentence back to the head of those waiting, as one Codex never took. */
export function giveBackAct(acts: Acts, act: Act): void
{
    acts.pending.unshift(act);
    acts.heard = acts.heard.filter((id) => id !== act.id);
}

/**
 * The sentences for the head of the master's call, marked heard; given back, in order, when that call never answers. `known` gives what the player character
 * already knows of a sentence's thing, for the master to tell only what is new (T-218).
 */
export function takeActs(acts: Acts, quoted: (text: string) => string, known: (item: string) => string | undefined = () => undefined): { lines: string[]; restore(): void; }
{
    const taken = [...acts.pending];
    markHeard(acts, taken.map((act) => act.id));
    return {
        lines: taken.map((act) => {
            const already = act.item === undefined ? undefined : known(act.item);
            return already === undefined ? actNews(act.text, quoted) : `${actNews(act.text, quoted)}
${already}`;
        }),
        restore: () => {
            acts.pending = [...taken, ...acts.pending];
            acts.heard = acts.heard.filter((id) => !taken.some((act) => act.id === id));
        },
    };
}

/** What the master hears of a sentence: the player's words quoted, as their move in the story, which the master rules as any other (D-493 (1)). */
function actNews(text: string, quoted: (text: string) => string): string
{
    return `The player acts on the dashboard, in their own words, as if said in chat:\n${
        quoted(text)
    }\nRule it as the player's move, and answer as to their words in chat. If you need what they left unsaid to rule it, ask them with buttons.`;
}
