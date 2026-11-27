// What the engine says by a code, in the page's language (T-162, T-267): the server gives a code and its values beside the engine's own words, which the
// master and the logs read; the page says each code it knows in its words, written for who plays, and the engine's for one it does not know. What is not the
// engine's own, as an app's or npm's words, stays as it came. The words are in refusals/, a file for each part of the game they belong to.
import { appRefusals, installReasons, signInReasons } from "./refusals/apps.ts";
import { chatRefusals, tableLines } from "./refusals/chat.ts";
import { gameRefusals } from "./refusals/game.ts";
import { campaignReasons, launcherRefusals } from "./refusals/launcher.ts";
import { failures } from "./refusals/master.ts";
import { packageRefusals } from "./refusals/packages.ts";
import type { Phrases, Values } from "./refusals/phrases.ts";

/** What the server answered of a refusal: the engine's words, and a code with its values when it has one. */
export interface Refused
{
    error?: string | undefined;
    code?: string | undefined;
    values?: Values | undefined;
}

/** What the page was refused, whoever refused it: each code is of one part alone. */
const refusals: Phrases = { ...packageRefusals, ...gameRefusals, ...chatRefusals, ...appRefusals, ...launcherRefusals };

/** A refusal in the page's words by its code and values; the engine's words for a code the page does not know, or `otherwise` without any. */
export function refusalText(refused: Refused, otherwise: string): string
{
    return phraseOf(refusals, refused.code, refused.values) ?? refused.error ?? otherwise;
}

/**
 * Why a turn of the master's failed or their chat ended, in the page's words by its code; none for a code the page does not know. `host`, the name of the
 * chat's app, which the page's words name: without it, where the values bring none, there are none.
 */
export function failureText(code: string | undefined, values: Values | undefined, host: string | undefined): string | undefined
{
    const named = values?.host ?? host;
    return named === undefined ? undefined : phraseOf(failures, code, { ...values, host: named });
}

/** A line of the table's among the chat's messages in the page's words by its code: the table's own, or why a turn failed; none for a code the page does not know. */
export function tableLineText(code: string | undefined, values: Values | undefined, host: string | undefined): string | undefined
{
    return phraseOf(tableLines, code, values) ?? failureText(code, values, host);
}

/** Why an app's last sign-in did not finish, to say after that it did not; none for a code the page does not know. `host`, the app's name. */
export function signInWhy(code: string | undefined, values: Values | undefined, host: string): string | undefined
{
    return phraseOf(signInReasons, code, { host, ...values });
}

/** Why an app's last install failed, to say after that it did; none for a code the page does not know. */
export function installWhy(code: string | undefined, values: Values | undefined): string | undefined
{
    return phraseOf(installReasons, code, values);
}

/** Why a listed campaign does not read, to say after that it does not; none for a code the page does not know. */
export function campaignWhy(code: string | undefined, values: Values | undefined): string | undefined
{
    return phraseOf(campaignReasons, code, values);
}

/** A code's words from its table, with the values that came; none for a code the table does not have, or words that did not come. */
function phraseOf(phrases: Phrases, code: string | undefined, values: Values = {}): string | undefined
{
    return code === undefined || !Object.hasOwn(phrases, code) ? undefined : phrases[code](values);
}
