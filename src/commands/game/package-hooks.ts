// Where the commands call the hooks of the campaign's packages (D-448, D-511, D-514): its game system's first, then its extensions' in the order campaign.yaml
// lists them, after the engine's own writes, each with its line in the log, given the game a package's code reaches. They are called at once: one that fails,
// gives a promise, or whose code is not there, is a line for the master, and the change stands.
import type { Context } from "../../core/context.ts";
import type { CounterChange, PackageCode, Rolled } from "../../core/package-api.ts";
import type { CodePackage } from "../../extensions/index.ts";
import type { Told } from "../ask.ts";
import { campaignExtensions } from "./extension-list.ts";
import { campaignSystemPackage, cappedLines, codeRefused, firstLine, gameOf, gameViewOf, loadedCode, packageLabel, toldOf } from "./package-code.ts";
import { campaignSystem } from "./world.ts";

/**
 * What the packages' code said after a command's change: the system's lines, which may take the place of the engine's own note, as a death save does; the
 * extensions' lines, which come after it; and apart why some did not run or failed, which the caller adds to its notes, never deciding by it.
 */
export interface PackagesSaid
{
    lines: string[];
    added: string[];
    problem?: string;
}

/** All the packages' code said, its problems last. */
export function allSaid(said: PackagesSaid): string[]
{
    return [...said.lines, ...said.added, ...(said.problem === undefined ? [] : [said.problem])];
}

/** After a counter of a page changed, as by change or the dice of a rest: the packages' lines. */
export function packagesCounterChanged(root: string, context: Context, change: CounterChange): PackagesSaid
{
    return called(root, context, "this change", (code, game) => code.counterChanged?.(change, game));
}

/** As someone's turn starts in a scene: the packages' lines. */
export function packagesTurnStarted(root: string, context: Context, who: string): PackagesSaid
{
    return called(root, context, "this turn began", (code, game) => code.turnStarted?.({ who }, game));
}

/** After a roll for someone was logged, never a hidden one: the packages' lines. */
export function packagesRolled(root: string, context: Context, roll: Rolled & { who: string; }): PackagesSaid
{
    return called(root, context, "this roll", (code, game) => code.rolled?.(roll, game));
}

/** After an effect was added to a page, never to a copy: the packages' lines. */
export function packagesEffectAdded(root: string, context: Context, added: { page: string; effect: string; }): PackagesSaid
{
    return called(root, context, "this effect", (code, game) => code.effectAdded?.(added, game));
}

/**
 * How the packages' code asks a roll of the core's ask, or the dice of a rest (D-507, D-514): in the words of the first that gives them, the system first,
 * maybe in the card of its widget. Nothing when none says anything, or one fails: ask asks as always.
 */
export function packagesAsking(root: string, context: Context, question: { who: string; checks: string[]; notations: string[]; recipe?: string; }): Told | undefined
{
    for (const { own, code } of hooked(root, context)) {
        const told = attempt(() => {
            const asking = code?.asking?.(question, gameViewOf(root, context, own));
            return asking === undefined || isPromise(asking) ? undefined : toldOf(root, context, own, asking, question.who);
        });

        if (told !== undefined) {
            return told;
        }
    }

    return undefined;
}

// Hooks at work: a change made from inside one, as with game.change, calls no hook again. And what was said once of code that is refused.
let calling = 0;
const saidOnce = new Set<string>();

/** What a call gives, or nothing when it throws; a promise it gives is let go, its failure caught. */
function attempt<Given>(call: () => Given | undefined): Given | undefined
{
    try {
        const given = call();

        if (isPromise(given)) {
            given.then(undefined, () => undefined);
            return undefined;
        }

        return given;
    } catch {
        return undefined;
    }
}

/**
 * A hook called with each package's game: the system's lines and the extensions', each cut at the most a package says; apart, a line for each that fails or
 * gives a promise, and for code that should run and is not there, said once for code that is refused.
 */
function called(root: string, context: Context, after: string, call: (code: PackageCode, game: ReturnType<typeof gameOf>) => unknown): PackagesSaid
{
    const said: PackagesSaid = { lines: [], added: [] };
    const problems: string[] = [];

    if (calling > 0) {
        return said;
    }

    for (const { own, code, why } of hooked(root, context)) {
        const byHand = `meanwhile apply its rules yourself, as its ${own.kind === "system" ? "pages" : "instructions"} say`;
        const name = packageLabel(own);
        const lines = own.kind === "system" ? said.lines : said.added;

        if (why !== undefined) {
            const key = `${own.package}@${own.version}: ${why}`;

            if (!codeRefused(own, context) || !saidOnce.has(key)) {
                problems.push(`The ${name}'s code ${why}, so nothing of it followed ${after}; ${byHand}.`);
                saidOnce.add(key);
            }

            continue;
        }

        let given: unknown;
        calling += 1;

        try {
            given = call(code ?? {}, gameOf(root, context, own, { hook: true }));
        } catch (error) {
            problems.push(`The ${name} failed after ${after}: ${firstLine(error)}. It is done all the same; ${byHand}.`);
            continue;
        } finally {
            calling -= 1;
        }

        if (isPromise(given)) {
            // Never a rejection that nothing handles: the process would end with it.
            given.then(undefined, () => undefined);
            problems.push(`The ${name} gave a promise after ${after}: its hooks give their lines at once, never waiting, so nothing of it followed; ${byHand}.`);
        } else if (given !== undefined && (!Array.isArray(given) || !given.every((line) => typeof line === "string"))) {
            problems.push(`The ${name} gave no lines after ${after}: its hooks give a list of lines. It is done all the same; ${byHand}.`);
        } else {
            lines.push(...cappedLines(own, (given ?? []) as string[]));
        }
    }

    return { ...said, ...(problems.length === 0 ? {} : { problem: problems.join("\n") }) };
}

/** The campaign's packages that bring code, the system first, each with its code, or why it is not there though it should run. */
function hooked(root: string, context: Context): { own: CodePackage; code?: PackageCode; why?: string; }[]
{
    const system = campaignSystem(root, context)?.code === true ? campaignSystemPackage(root, context) : undefined;
    const packages = [...(system === undefined ? [] : [system]), ...campaignExtensions(root, context).extensions];
    return packages.flatMap((own) => {
        const code = loadedCode(own, context);
        return code === undefined ? [] : [typeof code === "string" ? { own, why: code } : { own, code }];
    });
}

function isPromise(value: unknown): value is Promise<unknown>
{
    return typeof value === "object" && value !== null && typeof (value as { then?: unknown; }).then === "function";
}
