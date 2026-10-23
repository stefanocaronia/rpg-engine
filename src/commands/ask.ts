import { z } from "zod";
import { readSettings, requireCampaign } from "../campaign/index.ts";
import type { Context, Rows, Said, SpendAsked, Spending } from "../core/context.ts";
import { appendLogEntry } from "../core/log.ts";
import { defineCommand } from "../core/registry.ts";
import { comparableText, valueNamed } from "../core/text.ts";
import { readCounter } from "../counters/index.ts";
import { DiceError, parseNotation, rollDice } from "../dice/index.ts";
import { closedSquare, readSquare } from "../grid/index.ts";
import { findPage, loadWorld, locate, type Page, playerCharacters, type World } from "../pages/index.ts";
import { rollName } from "../systems/index.ts";
import { effectiveFields } from "./effect-layer.ts";
import { placeGrid } from "./game-grids.ts";
import { type RestDice, restDice, spendDice } from "./game-hit-dice.ts";
import { recipeNamed } from "./game-recipes.ts";
import { allSaid, systemAsking, systemRolled } from "./game-system-code.ts";
import { newDatedLogEntry } from "./game-time.ts";
import { campaignSystem, campaignWorld, systemWordsOf } from "./game-world.ts";
import { placeOnMap } from "./move.ts";
import { hasNames, namesAsZero, rollerOf, withSheetValues } from "./roll.ts";

// The words of the buttons, in the campaign's language, as the dashboard's languages (playtest 15); English for the others (ASK-7).
const buttonWords: Record<string, { roll: string; change: string; choice: string; square: string; rest: string; done: string; }> = {
    en: { roll: "Roll", change: "Change my mind", choice: "Choice", square: "Move", rest: "Rest", done: "Done" },
    it: { roll: "Tiro", change: "Cambio idea", choice: "Scelta", square: "Movimento", rest: "Riposo", done: "Ho finito" },
    ar: { roll: "رمية", change: "غيّرت رأيي", choice: "اختيار", square: "حركة", rest: "استراحة", done: "انتهيت" },
    cs: { roll: "Hod", change: "Rozmyslet si to", choice: "Volba", square: "Pohyb", rest: "Odpočinek", done: "Hotovo" },
    da: { roll: "Slag", change: "Jeg fortryder", choice: "Valg", square: "Bevægelse", rest: "Hvile", done: "Færdig" },
    de: { roll: "Wurf", change: "Ich überlege es mir anders", choice: "Wahl", square: "Bewegung", rest: "Rast", done: "Fertig" },
    el: { roll: "Ζαριά", change: "Άλλαξα γνώμη", choice: "Επιλογή", square: "Κίνηση", rest: "Ανάπαυση", done: "Τελείωσα" },
    es: { roll: "Tirada", change: "Cambio de idea", choice: "Elección", square: "Movimiento", rest: "Descanso", done: "He terminado" },
    fi: { roll: "Heitto", change: "Muutan mieleni", choice: "Valinta", square: "Liike", rest: "Lepo", done: "Valmis" },
    fr: { roll: "Jet", change: "Je change d'avis", choice: "Choix", square: "Déplacement", rest: "Repos", done: "J'ai fini" },
    he: { roll: "הטלה", change: "שיניתי את דעתי", choice: "בחירה", square: "תנועה", rest: "מנוחה", done: "סיימתי" },
    hi: { roll: "पासा", change: "मैंने मन बदल लिया", choice: "चुनाव", square: "चाल", rest: "विश्राम", done: "हो गया" },
    hu: { roll: "Dobás", change: "Meggondoltam magam", choice: "Választás", square: "Mozgás", rest: "Pihenő", done: "Kész" },
    is: { roll: "Kast", change: "Ég skipti um skoðun", choice: "Val", square: "Hreyfing", rest: "Hvíld", done: "Búið" },
    ja: { roll: "判定", change: "やっぱりやめる", choice: "選択", square: "移動", rest: "休息", done: "終わり" },
    ko: { roll: "굴림", change: "마음을 바꿀게요", choice: "선택", square: "이동", rest: "휴식", done: "다 했어요" },
    nb: { roll: "Kast", change: "Jeg ombestemmer meg", choice: "Valg", square: "Forflytning", rest: "Hvile", done: "Ferdig" },
    nl: { roll: "Worp", change: "Ik bedenk me", choice: "Keuze", square: "Verplaatsen", rest: "Rust", done: "Klaar" },
    pl: { roll: "Rzut", change: "Zmieniam zdanie", choice: "Wybór", square: "Ruch", rest: "Odpoczynek", done: "Gotowe" },
    pt: { roll: "Rolagem", change: "Mudei de ideia", choice: "Escolha", square: "Movimento", rest: "Descanso", done: "Terminei" },
    ro: { roll: "Aruncare", change: "M-am răzgândit", choice: "Alegere", square: "Mișcare", rest: "Odihnă", done: "Am terminat" },
    ru: { roll: "Бросок", change: "Передумать", choice: "Выбор", square: "Перемещение", rest: "Отдых", done: "Готово" },
    sv: { roll: "Slag", change: "Jag ångrar mig", choice: "Val", square: "Förflyttning", rest: "Vila", done: "Klar" },
    tr: { roll: "Zar", change: "Fikrimi değiştirdim", choice: "Seçim", square: "Hareket", rest: "Dinlenme", done: "Bitirdim" },
    uk: { roll: "Кидок", change: "Передумати", choice: "Вибір", square: "Переміщення", rest: "Відпочинок", done: "Готово" },
    zh: { roll: "掷骰", change: "我改主意了", choice: "选择", square: "移动", rest: "休息", done: "完成" },
};

// A list, or one text, as an MCP client may send it.
const textList = z.union([z.string(), z.array(z.string())]);

/** One button: a check with its dice and the field of the sheet it rolls, when it names one; or an answer. */
interface Option
{
    label: string;
    notation?: string;
    field?: string;
}

// What the call asked, for the master to ask it again in words: the player has not seen it.
type InWords = { kind: "unanswered" | "unavailable" | "absent" | "physical" | "dice in words"; asked: string; };

type AskResult =
    | { kind: "roll"; id: string; who: string; check: string; text: string; total: number; notes?: string[]; }
    | { kind: "changed"; }
    | { kind: "chose"; answer: string; }
    | { kind: "said"; words: string; }
    | { kind: "moved"; text: string; }
    | { kind: "stays"; }
    | { kind: "spent"; text: string; }
    | InWords;

export const ask = defineCommand({
    name: "ask",
    description: "Ask the player with buttons: every roll of the player's character, and every choice that is truly theirs to make. "
        + "The call returns when the player clicks: for a check, the engine rolls it, logs it as the player's roll, and gives you the result. "
        + "For a roll: the question says what is at stake either way, in about 100 characters (apps may cut it); give the checks that fit, each with its dice, "
        + "naming the sheet's numbers by their fields as roll does: the engine works them out, and only then the player's sheet lights that row; the player may also change their mind. "
        + "In a fight, each roll the player's character makes is its own ask, in the order the game's rules give them. "
        + "For a choice the rules or the story force (a reaction, a fork): give the answers. Never to offer actions, which are the player's to say, and never for hidden rolls. "
        + "square, without options, once the player says their character moves on the map of its place but not to which square: the engine moves them to the square the player touches and gives you the way. "
        + "recipe, without options, when change with a rest's recipe says so: the player spends their character's dice, as hit dice, one at a time, and you get what they gave. "
        + "Write nothing before the call: the question carries what is at stake, and the story goes on after the click. "
        + 'Example: question "Scavalcare il muro prima della ronda: se fallisci, cadi e ti sentono", options ["Atletica 1d20+athletics", "Acrobazia 1d20+acrobatics"], who Bruna.',
    group: "game",
    needsPlayer: true,
    input: z.object({
        question: z.string().describe("what is at stake either way, or the choice, in one line, in the player's language"),
        options: textList.optional().describe("for a roll, the checks that fit with their dice, such as Atletica 1d20+athletics; for a choice, the answers, such as Sì and No; from 1 to 4"),
        who: z.string().optional().describe("for a roll or a square, the player's character, such as Bruna; the only one there is, if left out"),
        square: z.boolean().optional().describe("true to ask where the player's character moves on its place's map"),
        recipe: z.string().optional().describe("the rest's recipe, such as short rest"),
    }),

    async run(input, context): Promise<AskResult>
    {
        const root = requireCampaign(context.folder);

        if (context.player === undefined && context.page === undefined) {
            throw new Error("The player cannot be asked with buttons here: ask them in words, without a word about buttons, and stop.");
        }

        const question = input.question.trim();
        const words = buttonWords[(readSettings(root).language ?? "en").split("-")[0]] ?? buttonWords.en;

        if (question === "") {
            throw new Error("Give the question: for a roll, what is at stake either way; for a choice, what the player chooses.");
        }

        if (input.recipe !== undefined) {
            if (input.options !== undefined || input.square === true) {
                throw new Error("Give recipe without options or square: the player spends the dice the recipe lets their character spend, one at a time, and says when they are done.");
            }

            return diceSpent(root, context, question, input.recipe, input.who, words);
        }

        if (input.square === true) {
            if (input.options !== undefined) {
                throw new Error("Give square without options: the player touches a square of the map, and the engine moves their character there.");
            }

            return squareChosen(root, context, question, input.who, words);
        }

        const options = readOptions(input.options ?? []);
        const checks = options.filter((option) => option.notation !== undefined);

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

        const who = playerCharacter(loadWorld(root), input.who);
        const worked = sheetChecks(root, context, checks, who);

        // The player rolls their own dice: a roll is asked in words, and they tell the values (ASK-8).
        if (readSettings(root).dice === "physical") {
            return { kind: "physical", asked: askedText(question, "checks", worked) };
        }

        return rollChosen(root, context, question, worked, who, words);
    },

    format(result)
    {
        switch (result.kind) {
            case "roll":
                return `${result.id} ${result.who}, ${result.check}: ${result.text}, rolled by the player. Tell the outcome in the story, with the roll in brackets right after the moment it decides; write nothing until your message is ready.${
                    (result.notes ?? []).map((line) => `\n${line}`).join("")
                }`;
            case "changed":
                return "The player changed their mind: no roll. Ask what they do instead, and stop.";
            case "chose":
                return `The player chose: ${result.answer}.`;
            case "said":
                return `The player answered in their own words, without a button: «${result.words}». Take it as what they do, as if they had written it in the chat; nothing was rolled.`;
            case "moved":
                return `The player chose where to go: ${result.text}`;
            case "stays":
                return "The player changed their mind: their character does not move. Ask what they do instead, and stop.";
            case "unavailable":
                return `The player saw no buttons: ask them what the call held, which they have not seen: ${result.asked}. Ask with your app's own tool for questions with options, if it has one: each check an option, and a change of mind; then roll the chosen check with roll. Else in words. No word about buttons; then stop. From now on, the same way.`;
            case "absent":
                return `The player has no buttons open now: ask them this time what the call held, which they have not seen: ${result.asked}. Ask with your app's own tool for questions with options, if it has one: each check an option, and a change of mind; then roll the chosen check with roll. Else in words. No word about buttons; then stop.`;
            case "physical":
                return `The player rolls their own dice: tell first in the story what happened before this roll, such as the blow that calls for it, then ask it in words, with what is at stake and the checks: ${result.asked}. Then stop; they will tell the values.`;
            case "spent":
                return result.text;
            case "dice in words":
                return `Ask the player in words, without a word about buttons: ${result.asked}. Then stop.`;
            default:
                return `No answer from the buttons: ask the player in words what the call held: ${result.asked}. Then stop.`;
        }
    },
});

/**
 * The buttons of a roll: the checks and a change of mind (ASK-3, ASK-4); a death save, only its check, as no one turns it down (D-460). The chosen check is
 * rolled with the engine's dice and logged as the player's roll.
 */
async function rollChosen(root: string, context: Context, question: string, checks: Option[], who: string, words: typeof buttonWords.en): Promise<AskResult>
{
    const system = campaignSystem(root, context);
    const save = systemAsking(root, context, { who, notations: checks.map((check) => check.notation ?? "") });
    const change = save === undefined ? [words.change] : [];
    const labels = [...checks.map((check) => `${words.roll}: ${check.label} (${check.notation})`), ...change];
    const language = readSettings(root).language ?? system?.language ?? "en";
    const shown = [...checks.map((check) => formLabel(check, (dice) => (system === undefined ? undefined : rollName(system, dice, language)))), ...change];
    const rows = { who, fields: [...checks.map((check) => check.field ?? null), ...change.map(() => null)], ...(save === undefined ? {} : { save }) };
    const chosen = await chooseAnswer(context, question, words.roll, labels, rows, shown);

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
    // A check of a dying character is their death save, which the engine writes (DIE-4, D-460).
    const notes = allSaid(systemRolled(root, context, { who, notation: diceRoll.notation, total: diceRoll.total, dice: diceRoll.dice }));
    return { kind: "roll", id: entry.id, who, check: check.label, text: diceRoll.text, total: diceRoll.total, ...(notes.length === 0 ? {} : { notes }) };
}

/**
 * Where the player's character moves on the map of its place (ASK-11): only the page can show the map; the square touched moves it, as move with at, and the
 * master gets what move says. Refused when it stands on no map.
 */
async function squareChosen(root: string, context: Context, question: string, given: string | undefined, words: typeof buttonWords.en): Promise<AskResult>
{
    const world = loadWorld(root);
    const who = playerCharacter(world, given);
    const { place, map } = standingOn(world, who);

    if (place === undefined || map === undefined) {
        throw new Error(`${who} stands in no place with a map: ask in words where they go, and stop.`);
    }

    // Without a page no map is in sight: the master asks where in the story's words, and puts them on the square that fits.
    const asked = `${question} (where their character goes in ${place.name}, in the story's words; then move them with move and at to the square that fits)`;
    const chosen = context.page?.chooseSquare === undefined ? "absent" : await context.page.chooseSquare(question, words.square, words.change, context.signal);

    // A call the user stopped logs nothing (ASK-9).
    if (chosen === "absent" || context.signal?.aborted === true) {
        return { kind: chosen === "absent" ? "absent" : "unanswered", asked };
    }

    if (isSaid(chosen)) {
        return said(root, context, question, [words.change], chosen);
    }

    if (chosen === undefined || chosen === 0) {
        logAnswer(root, context, question, [words.change], chosen === 0 ? words.change : undefined);
        return chosen === 0 ? { kind: "stays" } : { kind: "unanswered", asked };
    }

    // The world may have changed while the player chose: the square counts only on the map they were shown, as it is now.
    const now = standingOn(loadWorld(root), who);

    if (now.place?.name !== place.name || now.map === undefined) {
        throw new Error(`${who} is no longer in ${place.name}, on whose map the player chose ${chosen.square}: nothing moved. Ask again where they go, and stop.`);
    }

    const square = readSquare(chosen.square);
    const closed = square === undefined ? `${chosen.square} is no square of the map` : closedSquare(now.map.grid, square);

    // A square no one stands on, as one a hidden thing blocks, moves no one and logs nothing.
    if (closed !== undefined) {
        throw new Error(`The player chose ${chosen.square}, but ${closed}: ${who} cannot stand there, and nothing moved. Ask again where they go, and stop.`);
    }

    logAnswer(root, context, question, [words.change], chosen.square);
    return { kind: "moved", text: placeOnMap(root, context, who, chosen.square) };
}

/**
 * The dice a rest lets the player's character spend, one at a time (ASK-14): only the page shows them. Each click spends one as change with spend and recipe,
 * as the player's roll, and the question stays with the numbers as they are now, until the button that ends it; the master gets what the dice gave.
 */
async function diceSpent(root: string, context: Context, question: string, recipeName: string, given: string | undefined, words: typeof buttonWords.en): Promise<AskResult>
{
    const world = campaignWorld(root, context);
    const who = playerCharacter(world, given);
    const spending = recipeNamed(campaignSystem(root, context), recipeName);
    const { system, recipe } = spending;

    if (Object.keys(recipe.spend).length === 0) {
        throw new Error(`${recipe.name} lets one spend no dice: there is nothing to ask.`);
    }

    const before = restDice(world, recipe, pageNamed(world, who));
    const left = before.filter((dice) => dice.value > 0);
    const settings = readSettings(root);

    if (left.length === 0) {
        throw new Error(`${who} has no dice left that ${recipe.name} lets one spend${before.length === 0 ? "" : ` (${before.map(diceText).join(", ")})`}: there is nothing to ask.`);
    }

    const gives = left[0].gives;
    const offered = `the dice of ${who}: ${left.map((dice) => `${diceText(dice)}, each 1d${dice.sides}${signedText(dice.adds)}`).join("; ")}; they give ${gives}`;
    const inWords = `${question} (${offered}; then change with page ${who}, the dice's counter, spend and recipe "${recipe.name}", which rolls them)`;

    // The page shows one counter the dice give to: dice that give to several are spent in words (D-230).
    if (left.some((dice) => comparableText(dice.gives) !== comparableText(gives))) {
        const each = left.map((dice) => `${dice.field} to ${dice.gives}`).join(", ");
        throw new Error(`${recipe.name} lets ${who} spend dice that give to more than one counter (${each}): ask in words, then change with spend and recipe.`);
    }

    // The player rolls their own dice: asked in words, and the master writes what each gives (ASK-8).
    if (settings.dice === "physical") {
        return { kind: "dice in words", asked: `${question} (${offered}; they roll them with their own dice: then change with page ${who}, the dice's counter, spend, recipe "${recipe.name}" and values, the faces they tell)` };
    }

    if (context.page?.spendDice === undefined) {
        return { kind: "dice in words", asked: inWords };
    }

    const fieldWords = systemWordsOf(system, settings.language ?? system.language ?? "en", context)?.fields ?? {};
    const label = (field: string): string => String(valueNamed(fieldWords, field) ?? field);
    const from = counterOn(world, who, gives)?.value ?? 0;
    const rolls: SpendAsked["rolls"] = [];
    const notes: string[] = [];
    // The dice as last read: what the page and the master are told when the campaign does not read for a moment, as while a page is rewritten.
    let last: SpendAsked = { who, dice: before.map(shownDice), gives: { field: gives, from, value: from }, rolls: [] };

    const page: Spending = {
        shown: () => {
            try {
                const now = campaignWorld(root, context);
                const target = counterOn(now, who, gives);
                const dice = restDice(now, recipe, pageNamed(now, who)).map(shownDice);
                last = { who, dice, gives: { field: gives, from, value: target?.value ?? 0, ...(target?.max === undefined ? {} : { max: target.max }) }, rolls: [...rolls] };
            } catch {
                last = { ...last, rolls: [...rolls] };
            }

            return last;
        },
        spend: (asked) => {
            try {
                const now = campaignWorld(root, context);
                const field = restDice(now, recipe, pageNamed(now, who)).find((dice) => comparableText(dice.field) === comparableText(asked))?.field;

                if (field === undefined) {
                    return `${who} has no ${asked} that ${recipe.name} lets one spend.`;
                }

                const spent = spendDice(root, { ...context, actor: "player" }, now, spending, who, field, 1, { why: `${label(field)}: ${question}`, check: label(field) });
                rolls.push({ id: spent.id, field, face: spent.faces[0] ?? 0, adds: spent.adds, total: spent.total });
                notes.push(...spent.notes.filter((note) => !notes.includes(note)));
                return undefined;
            } catch (error) {
                return error instanceof Error ? error.message : String(error);
            }
        },
        // A call stopped after some dice: what they gave reaches the master at the next one (ASK-14).
        spent: () => (rolls.length === 0 ? undefined : [`While your ask was stopped, ${spentText(before, page.shown())}`, ...notes].join("\n")),
    };

    const done = await context.page.spendDice(question, words.rest, words.done, page, context.signal);

    if (done === 0) {
        logAnswer(root, context, question, [words.done], words.done);
    }

    const now = page.shown();

    if (rolls.length === 0) {
        const kept = now.dice.filter((dice) => dice.value > 0).map(diceText).join(", ");
        return done === 0 ? { kind: "spent", text: `The player spends none of ${who}'s dice (${kept === "" ? "none left" : kept}).` } : { kind: "dice in words", asked: inWords };
    }

    // A page closed before the button that ends it, with dice left: what was spent stays, and the master asks in words whether there is more (ASK-14).
    const more = done === 0 || now.dice.every((dice) => dice.value <= 0)
        ? ""
        : ` The player closed the page before they were done: ask in words whether they spend more, then change with page ${who}, the dice's counter, spend and recipe "${recipe.name}".`;
    const spent = spentText(before, now);
    return { kind: "spent", text: [`${spent.charAt(0).toUpperCase()}${spent.slice(1)}${more}`, ...notes].join("\n") };
}

/** "the player spent 2 of Bruna's dice: hit-dice-d10 4 + 2 = 6, …; hp 5/26 → 17/26; hit-dice-d10 3/3 → 1/3. Already written: tell it in the story." */
function spentText(before: RestDice[], now: SpendAsked): string
{
    const max = now.gives.max === undefined ? "" : `/${now.gives.max}`;
    const counters = before.filter((dice) => now.rolls.some((roll) => roll.field === dice.field)).map((dice) => {
        const after = now.dice.find((counter) => counter.field === dice.field)?.value ?? dice.value;
        return `${dice.field} ${dice.value}/${dice.max} → ${after}/${dice.max}`;
    });
    const faces = now.rolls.map((roll) => `${roll.field} ${roll.face}${roll.adds === 0 ? "" : ` ${roll.adds > 0 ? "+" : "-"} ${Math.abs(roll.adds)}`} = ${roll.total}`).join(", ");
    return `the player spent ${now.rolls.length} of ${now.who}'s dice: ${faces}; ${[`${now.gives.field} ${now.gives.from}${max} → ${now.gives.value}${max}`, ...counters].join("; ")}. Already written: tell it in the story.`;
}

/** A counter of dice as the page shows it, without the counter it gives to. */
function shownDice({ field, sides, value, max, adds }: RestDice): SpendAsked["dice"][number]
{
    return { field, sides, value, max, adds };
}

/** "hit-dice-d8 2/3": a counter of dice as it stands. */
function diceText(dice: { field: string; value: number; max: number; }): string
{
    return `${dice.field} ${dice.value}/${dice.max}`;
}

/** What a die adds, as written after it: "+2", "-1", or nothing. */
function signedText(adds: number): string
{
    return adds === 0 ? "" : `${adds > 0 ? "+" : "-"}${Math.abs(adds)}`;
}

/** A counter of a page as the page reads it, effects included. */
function counterOn(world: World, name: string, field: string): { value: number; max?: number; } | undefined
{
    return readCounter(valueNamed(effectiveFields(world, pageNamed(world, name)), field));
}

/** The page of the player's character, which ask has found. */
function pageNamed(world: World, name: string): Page
{
    const page = findPage(world, name);

    if (page === undefined) {
        throw new Error(`There is no page named ${name}. Nothing changed.`);
    }

    return page;
}

/** The place the character is right in, with its map, as the world is. */
function standingOn(world: World, who: string): { place?: Page; map?: ReturnType<typeof placeGrid>; }
{
    const page = findPage(world, who);
    const place = page === undefined ? undefined : locate(world, page).chain[0];
    return place === undefined ? {} : { place, map: placeGrid(place) };
}

/** The buttons of a forced choice: the answers as given (ASK-5). */
async function answer(root: string, context: Context, question: string, options: Option[], words: typeof buttonWords.en): Promise<AskResult>
{
    const labels = options.map((option) => option.label);
    const chosen = await chooseAnswer(context, question, words.choice, labels);
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

function isSaid(chosen: unknown): chosen is Said
{
    return typeof chosen === "object" && chosen !== null && "said" in chosen;
}

/** "Scavalcare il muro… (the checks: Atletica 1d20+5, Acrobazia 1d20-1)": the call as the master gave it, to ask in words. */
function askedText(question: string, what: "checks" | "answers", options: Option[]): string
{
    return `${question} (the ${what}: ${options.map((option) => (option.notation === undefined ? option.label : `${option.label} ${option.notation}`)).join(", ")})`;
}

/**
 * A check as a form shows it, in words as the dashboard's button shows it in pictures (D-297, D-399): "Furtività · d20 +5, con vantaggio", "Spada corta · d6 +3",
 * the dice the game names as one die and the name; `named` gives the name a game has for some dice.
 */
function formLabel(check: Option, named: (dice: string) => string | undefined): string
{
    const terms = (check.notation ?? "").replace(/\s+/g, "").split(/(?=[+-])/).filter((term) => term !== "");
    const dice = terms.filter((term) => /d/i.test(term));
    const modifier = terms.filter((term) => !/d/i.test(term)).reduce((sum, term) => sum + Number(term), 0);
    const name = dice.length === 1 ? named(dice[0].replace(/^\+/, "")) : undefined;
    const shown = dice.map((term, index) => {
        const sign = term.startsWith("-") ? "−" : "+";
        const body = term.replace(/^[+-]/, "").replace(name === undefined ? /^1(?=d)/i : /^\d*(d(?:\d+|%)).*$/i, name === undefined ? "" : "$1");
        return index === 0 && sign === "+" ? body : `${sign} ${body}`;
    });
    const added = modifier === 0 ? "" : ` ${modifier < 0 ? "−" : "+"}${Math.abs(modifier)}`;
    return `${check.label} · ${shown.join(" ")}${added}${name === undefined ? "" : `, ${name}`}`;
}

/**
 * The player's answer, on the dashboard's page and in the host's form at once, where both are (ASK-13, D-455): the first answer wins and takes the other
 * away; one that never showed, a page not open or a form the host does not show, leaves the other to answer. Neither shown is absent: the master asks in words.
 * A form shows `shown` in place of the labels, when they are as many and each its own.
 */
export async function chooseAnswer(context: Context, question: string, title: string, labels: string[], rows?: Rows, shown?: string[]): Promise<Answer>
{
    const formLabels = shown?.length === labels.length && new Set(shown).size === shown.length ? shown : labels;
    const { page, player } = context;

    if (page === undefined && player === undefined) {
        return "absent";
    }

    // One stop for both: the call's own, and the first answer's (ASK-9).
    const stop = new AbortController();
    const outer = context.signal;
    const cancel = (): void => stop.abort();
    outer?.addEventListener("abort", cancel);

    if (outer?.aborted === true) {
        stop.abort();
    }

    const ways = [...(page === undefined ? [] : [page.choose(question, title, labels, stop.signal, rows)]), ...(player === undefined ? [] : [player.choose(question, title, formLabels, stop.signal)])];
    const answer = await firstAnswer(ways, page === undefined ? "unavailable" : "absent");
    outer?.removeEventListener("abort", cancel);
    stop.abort();
    return answer;
}

type Answer = number | Said | undefined | "unavailable" | "absent";

/** The first of the ways that showed and settled, a click or nothing; when none showed, `none` says why: no page open, or no form at all. */
function firstAnswer(ways: Promise<Answer>[], none: "unavailable" | "absent"): Promise<Answer>
{
    return new Promise((done) => {
        let left = ways.length;

        for (const way of ways) {
            void way.then((answer) => {
                left -= 1;

                if (answer !== "absent" && answer !== "unavailable") {
                    done(answer);
                } else if (left === 0) {
                    done(none);
                }
            });
        }
    });
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
    // The dice from the first word that is a die, so that 1d20+athletics - 1 and 1d20 + athletics are dice too; else the last word.
    const spaced = /^(.+?)\s+(\d*d(?:\d+|%|F)\S*(?:\s*[+-]\s*\S+)*)$/i.exec(text);
    const last = /^(.+?)\s+(\S+)$/.exec(text);
    const match = [spaced, last].find((candidate) => candidate !== null && isDice(namesAsZero(candidate[2])));
    return match === undefined || match === null ? { label: text } : { label: match[1].trim(), notation: match[2] };
}

/**
 * The checks with the numbers of who's sheet their dice name worked out, effects included, as roll does (ASK-12, DAT-8); each with the field it rolls when it
 * names one alone, whose row of the sheet the page lights.
 */
function sheetChecks(root: string, context: Context, checks: Option[], who: string): Option[]
{
    const named = checks.filter((check) => check.notation !== undefined && hasNames(check.notation));
    const roller = named.length === 0 ? undefined : rollerOf(root, context, who, true);
    const system = named.length === 0 ? undefined : campaignSystem(root, context);
    return checks.map((check) => {
        if (!named.includes(check) || check.notation === undefined) {
            return check;
        }

        const { notation, taken } = withSheetValues(check.notation, roller, who, system);
        const fields = Object.keys(taken);
        return { ...check, notation: notation.replace(/\s+/g, ""), ...(fields.length === 1 ? { field: fields[0] } : {}) };
    });
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
    const players = playerCharacters(world);

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
