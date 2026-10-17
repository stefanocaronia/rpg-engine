// One answer from the player to each question the master asks, though it shows both on the page and in the chat's form (D-455): whichever of the two
// gets it first asks the player, and the other waits for that answer and gives it, by the index of the choice, as both list the choices in the same order.
// They meet in the session's folder, as the form is a process of its own that Claude Code starts for each question; there they also keep what the player
// has read of the master's turn, so that no paragraph reaches the player twice.
import { createHash } from "node:crypto";
import { closeSync, existsSync, mkdirSync, openSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";

// How long the one that waits gives the other to answer, before it asks the player itself, in milliseconds.
const waitForOther = 180_000;
// An answer older than this, which one side never took, belongs to an earlier question with the same words.
const staleAfter = 120_000;
const pollEvery = 200;

/**
 * The player's answer to `question`, asked once for both sides: `side` is "page" or "form", `ask()` asks the player and gives { index } for a choice,
 * { words } or { square } for what only the page takes. Gives the answer, with `from` set to the side that asked when it was the other.
 */
export async function oneAnswer({ folder, question, side, ask })
{
    const base = join(folder, "answers");
    mkdirSync(base, { recursive: true });
    const key = createHash("sha1").update(question.trim()).digest("hex").slice(0, 12);

    // The same words asked again later have their own entry: the first this side has not yet taken.
    for (let number = 1;; number++) {
        const entry = join(base, `${key}-${number}`);
        const taken = `${entry}.${side}`;

        if (existsSync(taken)) {
            continue;
        }

        if (existsSync(`${entry}.json`) && Date.now() - statSync(`${entry}.json`).mtimeMs > staleAfter) {
            writeFileSync(taken, "stale");
            continue;
        }

        const answer = claim(`${entry}.claim`) ? await asked(entry, ask) : (await waited(entry, side)) ?? (await asked(entry, ask));
        writeFileSync(taken, "taken");
        return answer;
    }
}

/** A master's turn begins: nothing of it has been read yet. */
export function turnBegins(folder)
{
    mkdirSync(join(folder, "answers"), { recursive: true });
    writeFileSync(join(folder, "answers", "read.json"), "[]");
}

/**
 * What the player has not yet read of the master's words in this turn, which from now on they have: a question shows the words so far, and the end of the turn
 * only the rest, so that no paragraph reaches the player twice. Paragraphs, as the chat, the page's stream and the transcript each split the same blocks.
 */
export function notYetRead(folder, text)
{
    const file = join(folder, "answers", "read.json");
    const read = existsSync(file) ? JSON.parse(readFileSync(file, "utf8")) : [];
    const left = [...read];
    const unread = paragraphs(text).filter((paragraph) => {
        const index = left.indexOf(paragraph);

        if (index === -1) {
            return true;
        }

        left.splice(index, 1);
        return false;
    });
    mkdirSync(join(folder, "answers"), { recursive: true });
    writeFileSync(file, JSON.stringify([...read, ...unread]));
    return unread.join("\n\n");
}

function paragraphs(text)
{
    return text.split(/\n\s*\n/).map((paragraph) => paragraph.trim()).filter(Boolean);
}

/** Whether this side is the first to the question, made sure by creating its claim, which fails when the other side already has. */
function claim(file)
{
    try {
        closeSync(openSync(file, "wx"));
        return true;
    } catch {
        return false;
    }
}

async function asked(entry, ask)
{
    const answer = await ask();
    writeFileSync(`${entry}.json`, JSON.stringify(answer));
    return answer;
}

/** The other side's answer, once it has written it; undefined when it never does. */
async function waited(entry, side)
{
    const until = Date.now() + waitForOther;

    while (Date.now() < until) {
        if (existsSync(`${entry}.json`)) {
            const answer = JSON.parse(readFileSync(`${entry}.json`, "utf8"));
            return { ...answer, from: side === "page" ? "form" : "page" };
        }

        await new Promise((resolve) => setTimeout(resolve, pollEvery));
    }

    return undefined;
}
