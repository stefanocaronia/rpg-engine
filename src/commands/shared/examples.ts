// The examples of the commands' descriptions in the names of the campaign's game system (D-518): its counter, its dice, its coins, its turn, its rests and
// what an effect adds to; neutral where it names none.
import { readTextSetting } from "../../campaign/index.ts";
import type { Context } from "../../core/context.ts";
import { type Examples, neutralExamples } from "../../core/examples.ts";
import { comparableText } from "../../core/text.ts";
import type { Coin } from "../../money/index.ts";
import type { GameSystem, SystemWords } from "../../systems/index.ts";
import { campaignCoins } from "./money.ts";
import { campaignSystem, systemWordsOf } from "./world.ts";

/** The examples for a campaign: its system's names, in its language where the system has words for them; neutral without a campaign or a system. */
export function campaignExamples(root: string | undefined, context: Context): Examples
{
    const system = root === undefined ? undefined : campaignSystem(root, context);

    if (root === undefined || system === undefined) {
        return neutralExamples;
    }

    const language = readTextSetting(root, "language");
    const words = language === undefined ? undefined : systemWordsOf(root, system, language, context);
    return systemExamples(system, words, campaignCoins(root, context).coins ?? []);
}

/** A coin and a smaller one of a campaign for an example, as gp and sp, never a rare one; neutral names without them. */
export function coinExamples(coins: Coin[] | undefined): { coin: string; smallCoin: string; }
{
    const [coin, smallCoin] = (coins ?? []).filter((one) => !one.rare).sort((one, other) => other.value - one.value);
    return { coin: coin?.name ?? neutralExamples.coin, smallCoin: smallCoin?.name ?? neutralExamples.smallCoin };
}

/** A rest of a game system for an example, one that spends no dice first; a neutral name without one (D-514). */
export function restExample(system: GameSystem | undefined): string
{
    const recipes = system?.recipes ?? [];
    return (recipes.find((recipe) => Object.keys(recipe.spend).length === 0) ?? recipes[0])?.name ?? neutralExamples.rest;
}

/** A rest whose dice are spent and a counter of its pool, as a game system has them, for an example; neutral without one (D-514). */
export function poolExample(system: GameSystem | undefined): { recipe: string; field: string; }
{
    const recipe = system?.recipes.find((candidate) => Object.keys(candidate.spend).length > 0);
    const pool = recipe === undefined ? undefined : Object.keys(recipe.spend)[0];
    const field = pool?.endsWith("*") === true ? Object.keys(system?.fields ?? {}).find((name) => name.startsWith(pool.slice(0, -1))) : pool;
    return recipe === undefined || field === undefined ? { recipe: "breather", field: neutralExamples.pool } : { recipe: recipe.name, field };
}

/** The examples a game system gives, with the labels of its words and the campaign's coins. */
function systemExamples(system: GameSystem, words: SystemWords | undefined, coins: Coin[]): Examples
{
    const [check, otherCheck] = rolledFields(system);
    const checkText = (field: string): string => `${checkLabel(field, words)} ${system.sheetDice[field]}+${field}`;
    const uses = Object.keys(system.turnUses).slice(0, 3);
    return {
        counter: system.damage?.counter ?? system.combat?.track ?? neutralExamples.counter,
        roll: check === undefined ? neutralExamples.roll : `${system.sheetDice[check]}+${check}`,
        check: check === undefined ? neutralExamples.check : checkText(check),
        otherCheck: otherCheck === undefined ? neutralExamples.otherCheck : checkText(otherCheck),
        ...coinExamples(coins),
        uses: uses.length === 0 ? neutralExamples.uses : uses.join(", "),
        rest: restExample(system),
        pool: poolExample(system).field,
        bonus: bonusExample(system),
    };
}

/** The fields an effect adds to in a game system, those it declares bonuses. */
function bonusFields(system: GameSystem): string[]
{
    return Object.entries(system.fields).filter(([, kind]) => kind === "bonus").map(([name]) => name);
}

/** Two numbers of the sheet rolled with dice, those shown beside no score first, as the saves of the 5e before its ability modifiers. */
function rolledFields(system: GameSystem): string[]
{
    const beside = new Set(system.sheet.flatMap((group) => group.entries.map((entry) => entry.beside)));
    const rolled = Object.keys(system.sheetDice);
    return [...rolled.filter((field) => !beside.has(field)), ...rolled.filter((field) => beside.has(field))].slice(0, 2);
}

/** A check's name as the player reads it: the field's whole name or label in the campaign's language, else the field. */
function checkLabel(field: string, words: SystemWords | undefined): string
{
    return words?.names?.[field] ?? words?.fields[field] ?? field;
}

/** A bonus of the system for an example: one that adds to a number of the sheet by its name, as bonus-ac to ac or guard-bonus to guard; else its first. */
function bonusExample(system: GameSystem): string
{
    const onSheet = system.sheet.flatMap((group) => group.entries.flatMap((entry) => [entry.field, entry.beside ?? ""]));
    const bonuses = bonusFields(system);
    const adding = bonuses.find((name) => onSheet.some((field) => field !== "" && [`bonus-${field}`, `${field}-bonus`].some((form) => comparableText(form) === comparableText(name))));
    return adding ?? bonuses[0] ?? neutralExamples.bonus;
}
