// The coins of a campaign as several commands use them: read from campaign.yaml on their own, checked, and shown (D-126–D-129).
import { readCoinsSetting } from "../campaign/index.ts";
import type { Problem } from "../core/problem.ts";
import { type Coin, coinList, coinsProblem, coinsText } from "../money/index.ts";

/**
 * The coins of the campaign, or the problem that keeps campaign.yaml from giving them; neither when the game has no money (MON-1).
 * They are read on their own, so that a mistake in another setting does not turn every purse into text.
 */
export function campaignCoins(root: string): { coins?: Coin[]; problem?: Problem; }
{
    let value: unknown;

    try {
        value = readCoinsSetting(root);
    } catch (error) {
        return { problem: { path: "campaign.yaml", message: error instanceof Error ? error.message : String(error), fix: "fix campaign.yaml by hand" } };
    }

    if (value === undefined || value === null) {
        return {};
    }

    const problem = coinsProblem(value);
    return problem === undefined
        ? { coins: coinList(value as Record<string, unknown>) }
        : { problem: { path: "campaign.yaml", message: `coins: ${problem}`, fix: "fix the coins in campaign.yaml by hand, or set them again with config, each with its value in the smallest coin" } };
}

/** The coins as config shows them: "gp/mo 100, pp 1000 rare, sp 10, cp 1", or what is wrong with them. */
export function coinsShown(root: string): string
{
    const { coins, problem } = campaignCoins(root);
    return problem !== undefined ? `cannot be read: ${problem.message}` : coins === undefined ? "(none: a game without money)" : coinsText(coins);
}

/** The problem of the list of coins, for validate (MON-8); a campaign.yaml that cannot be read is reported with the settings. */
export function moneyProblems(root: string): Problem[]
{
    const { problem } = campaignCoins(root);
    return problem === undefined || !problem.message.startsWith("coins:") ? [] : [problem];
}
