// What the player does on the dashboard, in their own words (D-493 (1), D-495): sentences the master hears at their next call as said in chat, kept in the
// chat's memory only, never in the log, and lost with the chat; the player takes one back until the master hears it, or is called for it.

/** A sentence the player said on the dashboard; rung once the doorbell called the master for it. */
export interface Act
{
    id: string;
    text: string;
    rung?: boolean;
}

/** The sentences said and not yet heard, in order, and the ids of those heard lately, for the page to tell. */
export interface Acts
{
    pending: Act[];
    heard: string[];
}

// How many heard ids the page can still ask about: the strip shows one sentence or two.
const heardKept = 20;

// What does not show, or breaks a line in the player's words, from a single sentence: control characters, which no process could take either.
const unseen = /[\u0000-\u001f\u007f]+/g;

export function newActs(): Acts
{
    return { pending: [], heard: [] };
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
        return acts.heard.includes(id) ? "heard" : "unknown";
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

/** Gives a sentence back to the head of those waiting, as one Codex never took. */
export function giveBackAct(acts: Acts, act: Act): void
{
    acts.pending.unshift(act);
    acts.heard = acts.heard.filter((id) => id !== act.id);
}

/** The sentences for the head of the master's call, marked heard; given back, in order, when that call never answers. */
export function takeActs(acts: Acts, quoted: (text: string) => string): { lines: string[]; restore(): void; }
{
    const taken = [...acts.pending];
    markHeard(acts, taken.map((act) => act.id));
    return {
        lines: taken.map((act) => actNews(act.text, quoted)),
        restore: () => {
            acts.pending = [...taken, ...acts.pending];
            acts.heard = acts.heard.filter((id) => !taken.some((act) => act.id === id));
        },
    };
}

/** What the master hears of a sentence: the player's words quoted, as their move in the story, which the master rules as any other (D-493 (1)). */
function actNews(text: string, quoted: (text: string) => string): string
{
    return `The player acts on the dashboard, in their own words, as if said in chat:\n${quoted(text)}\nRule it as the player's move, and answer as to their words in chat.`;
}
