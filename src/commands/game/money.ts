// The coins of a campaign as several commands use them: from campaign.yaml, read on their own, or else from its game system (DAT-1); checked, and shown (D-126–D-129, D-182).
import { readOneSetting } from "../../campaign/index.ts";
import type { Context } from "../../core/context.ts";
import type { Problem } from "../../core/problem.ts";
import { type Coin, coinList, coinsProblem, coinsText, readCoins } from "../../money/index.ts";
import { campaignSystem } from "./world.ts";

/**
 * The coins of the campaign, or the problem that keeps campaign.yaml from giving them; neither when the game has no money (MON-1).
 * They are read on their own, so that a mistake in another setting does not turn every purse into text. A campaign without coins of its own
 * has those of its game system, if it gives them (DAT-1); `from` names that system.
 */
export function campaignCoins(root: string, context: Context): { coins?: Coin[]; problem?: Problem; from?: string; }
{
    let value: unknown;

    try {
        value = readOneSetting(root, "coins");
    } catch (error) {
        return { problem: { path: "campaign.yaml", message: error instanceof Error ? error.message : String(error), fix: "fix campaign.yaml by hand" } };
    }

    if (value === undefined || value === null) {
        return systemCoins(root, context);
    }

    const problem = coinsProblem(value);
    // Without coins of its own, the campaign has those of its game system: removing the line is a fix too.
    const fallback = systemCoins(root, context).from;
    const remove = fallback === undefined ? "" : `, or remove them from campaign.yaml to have those of the system ${fallback}`;
    return problem === undefined
        ? { coins: coinList(value as Record<string, unknown>) }
        : { problem: { path: "campaign.yaml", message: `coins: ${problem}`, fix: `fix the coins in campaign.yaml by hand, or set them again with config, each with its value in the smallest coin${remove}` } };
}

/** The coins as config shows them: "gp/mo 100, pp 1000 rare, sp 10, cp 1", with where they come from when it is the game system, or what is wrong with them. */
export function coinsShown(root: string, context: Context): string
{
    const { coins, problem, from } = campaignCoins(root, context);

    if (problem !== undefined) {
        return `cannot be read: ${problem.message}`;
    }

    return coins === undefined ? "(none: neither the campaign nor its game system gives coins)" : `${coinsText(coins)}${from === undefined ? "" : ` (from the system ${from})`}`;
}

/** The problem of the list of coins, for validate (MON-8); a campaign.yaml that cannot be read is reported with the settings. */
export function moneyProblems(root: string, context: Context): Problem[]
{
    const { problem } = campaignCoins(root, context);
    return problem === undefined || !problem.message.startsWith("coins:") ? [] : [problem];
}

/** The coins of the campaign's game system; none when it gives none, or its list cannot be read (the checks every system passes look after that). */
function systemCoins(root: string, context: Context): { coins?: Coin[]; from?: string; }
{
    const system = campaignSystem(root, context);

    if (system?.coins === undefined) {
        return {};
    }

    try {
        const value = typeof system.coins === "string" ? readCoins(system.coins) : system.coins;
        return coinsProblem(value) === undefined ? { coins: coinList(value), from: system.name } : {};
    } catch {
        return {};
    }
}
