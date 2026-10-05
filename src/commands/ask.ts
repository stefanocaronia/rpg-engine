import { z } from "zod";
import { readSettings, requireCampaign } from "../campaign/index.ts";
import type { Context } from "../core/context.ts";
import { appendLogEntry } from "../core/log.ts";
import { defineCommand } from "../core/registry.ts";
import { DiceError, parseNotation, rollDice } from "../dice/index.ts";
import { findPage, loadWorld, type World } from "../pages/index.ts";
import { newDatedLogEntry } from "./game-time.ts";

// The words of the buttons, in the campaign's language; English for the others (ASK-7).
const buttonWords: Record<string, { roll: string; change: string; choice: string; }> = {
    en: { roll: "Roll", change: "Change my mind", choice: "Choice" },
    it: { roll: "Tiro", change: "Cambio idea", choice: "Scelta" },
};

// A list, or one text, as an MCP client may send it.
const textList = z.union([z.string(), z.array(z.string())]);

/** One button: a check with its dice, or an answer. */
interface Option
{
    label: string;
    notation?: string;
}

type AskResult =
    | { kind: "roll"; id: string; who: string; check: string; text: string; total: number; }
    | { kind: "changed"; }
    | { kind: "chose"; answer: string; }
    | { kind: "unanswered"; };

export const ask = defineCommand({
    name: "ask",
    description: "Ask the player with buttons, in apps that show them a form: every roll of the player's character, and every choice that is truly theirs to make. "
        + "The call returns when the player clicks: for a check, the engine rolls it, logs it as the player's roll, and gives you the result. "
        + "For a roll: put in the question what is at stake either way, in one line of about 100 characters (apps may cut it), and give the checks that fit, each with its dice; "
        + "the player may also change their mind. In a fight: the attack, then the damage if it hits, each with its own ask; saving throws and rolls to stay alive too. "
        + "For a choice the rules or the story force (a reaction, a fork): give the answers. Never to offer actions, which are the player's to say, and never for hidden rolls. "
        + "Write nothing before the call: the question carries what is at stake, and the story goes on after the click. "
        + 'Example: question "Scavalcare il muro prima della ronda: se fallisci, cadi e ti sentono", options ["Atletica 1d20+5", "Acrobazia 1d20+3"], who Bruna.',
    group: "game",
    needsPlayer: true,
    input: z.object({
        question: z.string().describe("what is at stake either way, or the choice, in one line, in the player's language"),
        options: textList.describe("for a roll, the checks that fit with their dice, such as Atletica 1d20+5; for a choice, the answers, such as Sì and No; from 1 to 4"),
        who: z.string().optional().describe("for a roll, the player's character, such as Bruna; the only one there is, if left out"),
    }),

    async run(input, context): Promise<AskResult>
    {
        const root = requireCampaign(context.folder);
        const player = context.player;

        if (player === undefined) {
            throw new Error("The player cannot be asked with buttons here: ask them in words, and stop (core 6.2).");
        }

        const question = input.question.trim();
        const options = readOptions(input.options);

        if (question === "") {
            throw new Error("Give the question: for a roll, what is at stake either way; for a choice, what the player chooses.");
        }

        const checks = options.filter((option) => option.notation !== undefined);
        const words = buttonWords[(readSettings(root).language ?? "en").split("-")[0]] ?? buttonWords.en;

        if (checks.length === 0) {
            return answer(root, context, player, question, options, words);
        }

        if (checks.length < options.length) {
            throw new Error("Give every check its dice, such as Atletica 1d20+5; for a choice, give only the answers, such as Sì and No.");
        }

        const who = playerCharacter(loadWorld(root), input.who);
        return rollChosen(root, context, player, question, checks, who, words);
    },

    format(result)
    {
        switch (result.kind) {
            case "roll":
                return `${result.id} ${result.who}, ${result.check}: ${result.text}, rolled by the player. Tell the outcome in the story, with the roll in brackets right after the moment it decides.`;
            case "changed":
                return "The player changed their mind: no roll. Ask what they do instead, and stop.";
            case "chose":
                return `The player chose: ${result.answer}.`;
            default:
                return "No answer from the buttons: ask the player in words, and stop.";
        }
    },
});

/** The buttons of a roll: the checks and a change of mind (ASK-3, ASK-4). The chosen check is rolled with the engine's dice and logged as the player's roll. */
async function rollChosen(root: string, context: Context, player: NonNullable<Context["player"]>, question: string, checks: Option[], who: string, words: typeof buttonWords.en): Promise<AskResult>
{
    const labels = [...checks.map((check) => `${words.roll}: ${check.label} (${check.notation})`), words.change];
    const chosen = await player.choose(question, words.roll, labels);
    const check = chosen === undefined ? undefined : checks[chosen];

    if (check?.notation === undefined) {
        logAnswer(root, context, question, labels, chosen === checks.length ? words.change : undefined);
        return chosen === checks.length ? { kind: "changed" } : { kind: "unanswered" };
    }

    const diceRoll = rollDice(check.notation, { random: context.random });
    const data = { notation: diceRoll.notation, total: diceRoll.total, result: diceRoll.text, why: `${check.label}: ${question}`, who, physical: false };
    const entry = newDatedLogEntry(root, { ...context, actor: "player" }, "roll", "public", data);
    appendLogEntry(root, entry);
    return { kind: "roll", id: entry.id, who, check: check.label, text: diceRoll.text, total: diceRoll.total };
}

/** The buttons of a forced choice: the answers as given (ASK-5). */
async function answer(root: string, context: Context, player: NonNullable<Context["player"]>, question: string, options: Option[], words: typeof buttonWords.en): Promise<AskResult>
{
    const labels = options.map((option) => option.label);
    const chosen = await player.choose(question, words.choice, labels);
    const answered = chosen === undefined ? undefined : labels[chosen];
    logAnswer(root, context, question, labels, answered);
    return answered === undefined ? { kind: "unanswered" } : { kind: "chose", answer: answered };
}

/** A public line for what the player answered, or that no one did (ASK-6); a roll has its own line instead. */
function logAnswer(root: string, context: Context, question: string, labels: string[], answered: string | undefined): void
{
    appendLogEntry(root, newDatedLogEntry(root, { ...context, actor: answered === undefined ? context.actor : "player" }, "asked", "public", { question, options: labels, answer: answered ?? null }));
}

/** The options as buttons: a check ends with its dice, such as Atletica 1d20+5; anything else is an answer (ASK-2). */
function readOptions(given: string | string[]): Option[]
{
    const options = (typeof given === "string" ? [given] : given).map((text) => text.trim()).filter((text) => text !== "").map(readOption);

    if (options.length === 0 || options.length > 4) {
        throw new Error(`Give from 1 to 4 options; ${options.length === 0 ? "none was given" : `${options.length} were given`}.`);
    }

    const repeated = options.find((option, index) => options.findIndex((other) => other.label.toLowerCase() === option.label.toLowerCase()) !== index);

    if (repeated !== undefined) {
        throw new Error(`${repeated.label} is given twice: each button needs its own words.`);
    }

    return options;
}

function readOption(text: string): Option
{
    const match = /^(.+?)\s+(\S+)$/.exec(text);
    return match !== null && isDice(match[2]) ? { label: match[1].trim(), notation: match[2] } : { label: text };
}

/** Whether a text is dice to roll, such as 1d20+5 or 2d20kh1+3: a number alone is not. */
function isDice(text: string): boolean
{
    try {
        return parseNotation(text).some((term) => term.kind === "dice");
    } catch (error) {
        if (error instanceof DiceError) {
            return false;
        }

        throw error;
    }
}

/** The player's character the roll belongs to: the one named, or the only one there is (ASK-2). */
function playerCharacter(world: World, who: string | undefined): string
{
    const players = world.pages.filter((page) => page.type === "character" && page.fields.role === "pc");

    if (who === undefined || who.trim() === "") {
        if (players.length !== 1) {
            throw new Error(players.length === 0 ? "There is no player character yet (role pc): ask rolls only theirs." : `Give who rolls: ${players.map((page) => page.name).join(" or ")}.`);
        }

        return players[0].name;
    }

    const page = findPage(world, who);

    if (page === undefined || !players.includes(page)) {
        throw new Error(`${who.trim()} is not the player's character (role pc): ask rolls only theirs; roll for the others with roll.`);
    }

    return page.name;
}
