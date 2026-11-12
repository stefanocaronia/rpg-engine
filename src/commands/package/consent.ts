// The player's own yes to a package not ours (D-441, D-478)
import { plainText } from "../../confirm/index.ts";
import type { Context } from "../../core/context.ts";
import { Refusal } from "../../core/refusal.ts";
import { isTarball } from "../../packages/index.ts";

/** The player's yes to a package not ours, not given (D-478): they said no or closed the question, or no window could be shown here. */
export class YesRefused extends Refusal
{
    constructor(message: string, code: "declined" | "no-window", values: Record<string, string> = {})
    {
        super(message, code, values);
    }
}

/**
 * The player's own yes to a package not ours (D-441, D-478), where the master cannot give it with its own tools: the host's form first, never the dashboard's
 * page, whose click a local program can forge; else a window of their operating system; else none, and it throws.
 */
export async function playerYes(context: Context, name: string, pack: string, local: boolean, holds = "", replaces = ""): Promise<void>
{
    // A no in a window holds for the package npm describes, however it was written, until the server starts again (D-510).
    if (context.declined?.has(pack) === true) {
        throw new YesRefused(`The player said no to ${pack} in this session: it is not asked again until the game's server starts again. Nothing changed.`, "declined", { name: pack });
    }

    // Said in plain words, the fixed text before the name its author chose; and where the request comes from (D-510). The package's own words cut short, so
    // that a window, which shows so much at most, never loses the warning to them.
    const clean = (text: string, most: number): string => plainText(text.replace(/\s+/g, " "), most);
    [name, holds] = [clean(name, 120), holds.trim() === "" ? "" : ` ${clean(holds, 160)}`];
    const from = context.actor === "player" ? "the dashboard" : context.host === undefined ? "the command line" : "the chat";
    const can = "Its code runs on this computer with your permissions, and in the dashboard, where it can see the whole campaign, its secrets included, and press buttons and speak to the master for you.";
    const warning = local
        ? `Not verified by RPG Engine: ${name}${holds}, ${isTarball(name) ? "a file" : "a folder"} of this computer, asked from ${from}. ${can} RPG Engine takes no responsibility for it: install it only if you trust who made it.${replaces}`
        : `Not verified by RPG Engine: ${name}, from npm, asked from ${from}. ${can} RPG Engine takes no responsibility for it: install it only if you trust who made it.`;
    const question = `Install ${name}? ${warning}`;
    const title = "A package not ours";
    const answer = context.player === undefined ? "unavailable" : await context.player.choose(question, title, ["Install it, at my risk", "Do not install it"], context.signal);

    if (answer === 0) {
        return;
    }

    if (answer === 1 || (typeof answer === "object" && answer !== null)) {
        throw new YesRefused(`The player did not want ${name}. Nothing changed.`, "declined", { name });
    }

    // Closed without an answer is no yes, never a reason to ask again some other way.
    if (answer === undefined) {
        throw new YesRefused(`The player closed the question without a yes to ${name}. Nothing changed: ask again only if they bring it up.`, "declined", { name });
    }

    const window = context.confirm === undefined ? "none" : await context.confirm.ask(title, question, context.signal);

    if (window === "yes") {
        return;
    }

    if (window === "no") {
        context.declined?.add(pack);
        throw new YesRefused(`The player did not want ${name}. Nothing changed.`, "declined", { name });
    }

    throw new YesRefused(
        `${warning} Only the player can say yes to it, in the host's form or in a window of their computer, and neither can be shown here (no desktop, as over SSH; `
            + `on Linux zenity or kdialog shows it): install it where one can be. Nothing changed.`,
        "no-window",
    );
}
