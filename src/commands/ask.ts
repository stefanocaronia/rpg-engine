import { z } from "zod";
import { readSettings, requireCampaign } from "../campaign/index.ts";
import type { Context, Said } from "../core/context.ts";
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

// What the call asked, for the master to ask it again in words: the player has not seen it.
type InWords = { kind: "unanswered" | "unavailable" | "absent" | "physical"; asked: string; };

type AskResult =
    | { kind: "roll"; id: string; who: string; check: string; text: string; total: number; }
    | { kind: "changed"; }
    | { kind: "chose"; answer: string; }
    | { kind: "said"; words: string; }
    | InWords;

export const ask = defineCommand({
    name: "ask",
    description: "Ask the player with buttons: every roll of the player's character, and every choice that is truly theirs to make. "
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

        if (context.player === undefined && context.page === undefined) {
            throw new Error("The player cannot be asked with buttons here: ask them in words, without a word about buttons, and stop.");
        }

        const question = input.question.trim();
        const options = readOptions(input.options);

        if (question === "") {
            throw new Error("Give the question: for a roll, what is at stake either way; for a choice, what the player chooses.");
        }

        const checks = options.filter((option) => option.notation !== undefined);
        const words = buttonWords[(readSettings(root).language ?? "en").split("-")[0]] ?? buttonWords.en;

        // One answer alone is no choice: a roll whose dice are not at the end would become one, and nothing would be rolled (ASK-2, D-266).
        if (checks.length === 0 && options.length === 1) {
            throw new Error(`"${options[0].label}" alone is no choice: a roll ends with its dice, such as Danni radianti 1d8; a choice gives two answers or more.`);
        }

        if (checks.length === 0) {
            return answer(root, context, question, options, words);
        }

        if (checks.length < options.length) {
            throw new Error(
                `Give every check its dice, such as Atletica 1d20+5; for a choice, give only the answers, such as Sì and No. A roll already has its button to change one's mind (${words.change}): leave out an answer such as No.`,
            );
        }

        // The player rolls their own dice: a roll is asked in words, and they tell the values (ASK-8).
        if (readSettings(root).dice === "physical") {
            return { kind: "physical", asked: askedText(question, "checks", options) };
        }

        const who = playerCharacter(loadWorld(root), input.who);
        return rollChosen(root, context, question, checks, who, words);
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
            case "said":
                return `The player answered in their own words, without a button: «${result.words}». Take it as what they do, as if they had written it in the chat; nothing was rolled.`;
            case "unavailable":
                return `The player saw no buttons: ask them in words what the call held, which they have not seen: ${result.asked}. No word about buttons; then stop. From now on, always in words.`;
            case "absent":
                return `The player has no buttons open now: ask them in words this time what the call held, which they have not seen: ${result.asked}. No word about buttons; then stop.`;
            case "physical":
                return `The player rolls their own dice: ask the roll in words, with what is at stake and the checks: ${result.asked}. Then stop; they will tell the values.`;
            default:
                return `No answer from the buttons: ask the player in words what the call held: ${result.asked}. Then stop.`;
        }
    },
});

/** The buttons of a roll: the checks and a change of mind (ASK-3, ASK-4). The chosen check is rolled with the engine's dice and logged as the player's roll. */
async function rollChosen(root: string, context: Context, question: string, checks: Option[], who: string, words: typeof buttonWords.en): Promise<AskResult>
{
    const labels = [...checks.map((check) => `${words.roll}: ${check.label} (${check.notation})`), words.change];
    const chosen = await choose(context, question, words.roll, labels);

    const asked = askedText(question, "checks", checks);

    // A call the user stopped logs nothing (ASK-9).
    if (chosen === "absent" || context.signal?.aborted === true) {
        return { kind: chosen === "absent" ? "absent" : "unanswered", asked };
    }

    if (isSaid(chosen)) {
        return said(root, context, question, labels, chosen);
    }

    if (chosen === "unavailable") {
        logAnswer(root, context, question, labels, undefined);
        return { kind: "unavailable", asked };
    }

    const check = chosen === undefined ? undefined : checks[chosen];

    if (check?.notation === undefined) {
        logAnswer(root, context, question, labels, chosen === checks.length ? words.change : undefined);
        return chosen === checks.length ? { kind: "changed" } : { kind: "unanswered", asked };
    }

    const diceRoll = rollDice(check.notation, { random: context.random });
    const data = { notation: diceRoll.notation, total: diceRoll.total, result: diceRoll.text, why: `${check.label}: ${question}`, check: check.label, who, physical: false, dice: diceRoll.dice };
    const entry = newDatedLogEntry(root, { ...context, actor: "player" }, "roll", "public", data);
    appendLogEntry(root, entry);
    return { kind: "roll", id: entry.id, who, check: check.label, text: diceRoll.text, total: diceRoll.total };
}

/** The buttons of a forced choice: the answers as given (ASK-5). */
async function answer(root: string, context: Context, question: string, options: Option[], words: typeof buttonWords.en): Promise<AskResult>
{
    const labels = options.map((option) => option.label);
    const chosen = await choose(context, question, words.choice, labels);
    const asked = askedText(question, "answers", options);

    if (chosen === "absent" || context.signal?.aborted === true) {
        return { kind: chosen === "absent" ? "absent" : "unanswered", asked };
    }

    if (isSaid(chosen)) {
        return said(root, context, question, labels, chosen);
    }

    const answered = chosen === undefined || chosen === "unavailable" ? undefined : labels[chosen];
    logAnswer(root, context, question, labels, answered);

    if (chosen === "unavailable") {
        return { kind: "unavailable", asked };
    }

    return answered === undefined ? { kind: "unanswered", asked } : { kind: "chose", answer: answered };
}

/** The player's own words in place of a button (ASK-10): no roll, a public line with them as the answer, and the master takes them as what the player does. */
function said(root: string, context: Context, question: string, labels: string[], words: Said): AskResult
{
    logAnswer(root, context, question, labels, words.said);
    return { kind: "said", words: words.said };
}

function isSaid(chosen: number | Said | undefined | "unavailable"): chosen is Said
{
    return typeof chosen === "object";
}

/** "Scavalcare il muro… (the checks: Atletica 1d20+5, Acrobazia 1d20-1)": the call as the master gave it, to ask in words. */
function askedText(question: string, what: "checks" | "answers", options: Option[]): string
{
    return `${question} (the ${what}: ${options.map((option) => (option.notation === undefined ? option.label : `${option.label} ${option.notation}`)).join(", ")})`;
}

/**
 * The player's answer: on the dashboard's page while one is open, else in the host's form, if it shows one (ASK-1, D-279). A form that does not show, while
 * the dashboard runs, is only absent this time: a page may open.
 */
async function choose(context: Context, question: string, title: string, labels: string[]): Promise<number | Said | undefined | "unavailable" | "absent">
{
    const onPage = context.page === undefined ? "absent" : await context.page.choose(question, title, labels, context.signal);

    if (onPage !== "absent" || context.player === undefined) {
        return onPage;
    }

    const inForm = await context.player.choose(question, title, labels, context.signal);
    return inForm === "unavailable" && context.page !== undefined ? "absent" : inForm;
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
