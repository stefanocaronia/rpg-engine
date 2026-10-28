// The code of the campaign's packages, its game system's and its extensions', with one contract (D-63, D-428, D-436, D-514): their commands, what they do
// when time passes, and the game they reach it through.
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { parse, stringify } from "yaml";
import { z } from "zod";
import { campaignFileName, findCampaign, readTextSetting, requireCampaign } from "../campaign/index.ts";
import type { CardAsked, Context } from "../core/context.ts";
import { installedFromFolder, realPath } from "../core/files.ts";
import { type Formula, parseFormula } from "../core/formula.ts";
import { appendLogEntry } from "../core/log.ts";
import type { Asked, Asking, ButtonWords, Game, GameMoment, GamePage, GameView, PackageCode, PackageCommand, PackageEntry, Rolled, RollFor, WidgetText, WidgetValue } from "../core/package-api.ts";
import type { Problem } from "../core/problem.ts";
import { type Command, defineCommand } from "../core/registry.ts";
import { files } from "../core/store.ts";
import { sameName, sameWord, valueNamed } from "../core/text.ts";
import { getVersion } from "../core/version.ts";
import { readCounter } from "../counters/index.ts";
import { rollDice } from "../dice/index.ts";
import { withEffect } from "../effects/index.ts";
import { type CodePackage, type Extension, type ExtensionWords, wordIn } from "../extensions/index.ts";
import { concernsPlayer, environmentAt, isInParty, isPartyMember, isPlayerCharacter, locate, type Page, pagesWithNameOrAlias, playerCharacters, type World } from "../pages/index.ts";
import { type GameSystem, givenCode, loadSystemCode, systemHasCode, systemPackage, systemPageModule } from "../systems/index.ts";
import { formatGameDate, type GameDate } from "../time/index.ts";
import { askedRoll, type AskResult, type Button, isCheckDice, type Told, tonesOf } from "./ask.ts";
import { change } from "./change.ts";
import { effectiveFields, effectsOf } from "./effect-layer.ts";
import { checkEffectsReadable, saveEffects } from "./game-effects.ts";
import { campaignExtensions, packageWords, runsCode } from "./game-extension-list.ts";
import { behindTheScreen, sealHiddenRoll } from "./game-master-rolls.ts";
import { keepingConditionNote } from "./game-reminders.ts";
import { readOpenScene } from "./game-scene.ts";
import { calendarDayOf, newDatedLogEntry, presentDate } from "./game-time.ts";
import { widgetCard } from "./game-widgets.ts";
import { campaignSystem, campaignSystemWords, campaignWorld } from "./game-world.ts";
import { formulaValue } from "./worked-out.ts";
import { writePackageFields } from "./write.ts";

/** The folder of the campaign where a package keeps its own files, its state among them (D-433, D-436): an extension's, or its game system's. */
const extensionsFolderName = "extensions";

/** The longest description a command of a package may give the master, in words (D-441): it is read in every chat. */
const descriptionWords = 150;
// The longest a package's timePassed may take, a question to the player included: past it, or after the call is stopped, the time has passed all the same.
const longestPackageWait = 10 * 60 * 1000;

/** The packages that bring code to the campaign (D-514): its game system first, then its extensions in the order campaign.yaml lists them. */
export function campaignPackages(root: string, context: Context): CodePackage[]
{
    const system = campaignSystemPackage(root, context);
    return [...(system === undefined ? [] : [system]), ...campaignExtensions(root, context).extensions];
}

/** The campaign's game system as a package of the campaign (D-514): its package.json's name and version, or, for one that is data alone, its name and the engine's version. */
export function campaignSystemPackage(root: string, context: Context): CodePackage | undefined
{
    const system = campaignSystem(root, context);
    return system === undefined ? undefined : systemCodePackage(system);
}

/** A package as messages name it: the game system 5e, the extension weather. */
export function packageLabel(code: CodePackage): string
{
    return `${code.kind === "system" ? "game system" : "extension"} ${code.name}`;
}

/**
 * The commands of the campaign's packages whose code may run (D-63, D-428, D-441), as commands of rpg-engine: each runs with the game of D-436 and gives the
 * master its text; by name, the package and version that give it, so that a server knows when another takes its place.
 */
export async function packageCommands(root: string, context: Context, taken: string[]): Promise<{ commands: Command[]; sources: Record<string, string>; problems: Problem[]; }>
{
    const commands: Command[] = [];
    const sources: Record<string, string> = {};
    const problems: Problem[] = [];

    for (const code of campaignPackages(root, context)) {
        try {
            const own: Command[] = [];
            const given = await packageCode(code, context);

            for (const command of given?.commands ?? []) {
                own.push(asCommand(code, command, [...taken, ...commands.map((other) => other.name), ...own.map((other) => other.name)]));
            }

            commands.push(...own);
            own.forEach((command) => (sources[command.name] = `${code.package}@${code.version}#${installs}`));
            refused.delete(codeKey(code));
        } catch (error) {
            problems.push(codeProblem(code, error));
            refused.set(codeKey(code), firstLine(error));
        }
    }

    return { commands, sources, problems };
}

/** The names of a package's commands, its code loaded and checked as the campaign would use it; it throws what keeps it from being used. */
export async function packageCommandNames(code: CodePackage, context: Context, taken: string[]): Promise<string[]>
{
    const names: string[] = [];

    for (const command of (await packageCode(code, context))?.commands ?? []) {
        names.push(asCommand(code, command, [...taken, ...names]).name);
    }

    return names;
}

/** Tells the loader npm has just installed: code installed again at the same version is read anew. */
export function packagesInstalled(): void
{
    installs += 1;
}

/** What keeps the code of the campaign's packages from being used, for validate and status: it loads them. */
export async function packageCodeProblems(root: string, context: Context, taken: string[]): Promise<Problem[]>
{
    return (await packageCommands(root, context, taken)).problems;
}

/**
 * What the campaign's packages say after time passed from one date to another, or as the game starts, when both are the same (D-436). The time has passed
 * whatever they do: one that fails says so in its line, never in place of the output.
 */
export async function timePassedLines(root: string, context: Context, from: GameDate, to: GameDate): Promise<string[]>
{
    const lines: string[] = [];

    for (const code of campaignPackages(root, context)) {
        try {
            const given = await packageCode(code, context);

            if (given?.timePassed !== undefined) {
                const said: unknown = await withinCall(given.timePassed({ from: momentOf(root, context, from), to: momentOf(root, context, to) }, gameOf(root, context, code)), context.signal);

                if (said !== undefined && (!Array.isArray(said) || !said.every((line) => typeof line === "string"))) {
                    throw new Error("its timePassed gave no list of lines, which is what it gives");
                }

                lines.push(...cappedLines(code, (said ?? []) as string[]));
            }
        } catch (error) {
            // One line: the master reads it among others.
            lines.push(`The ${packageLabel(code)} failed after the time passed: ${firstLine(error)}. The time did pass: do not advance again; validate says how to fix it.`);
        }
    }

    return lines;
}

/**
 * The code of a package, when it may run (D-441, D-514): an extension's module's default export, given the kit, loaded as it is first needed; a game system's
 * as the engine loaded it when it started. It throws why a system's code is not there.
 */
export async function packageCode(code: CodePackage, context: Context): Promise<PackageCode | undefined>
{
    if (isExtension(code)) {
        return await extensionCode(code);
    }

    const loaded = context.systemCode?.[code.name];

    // What broke it, without the fix the master reads after a change: the problem says its own.
    if (loaded !== undefined && "problem" in loaded) {
        throw new Error(loaded.problem);
    }

    const state = systemCode(code, context);

    if (typeof state === "string") {
        throw new Error(`it ${state}`);
    }

    return state;
}

/**
 * A package's code as loaded already, for the hooks the commands call at once (D-448, D-514): its code, or why it is not there; undefined where it brings none
 * or does not run. An extension's is there once its import has ended, as an entry starts or as its commands were read; one whose commands are refused is not.
 */
export function loadedCode(code: CodePackage, context: Context): PackageCode | string | undefined
{
    if (!isExtension(code)) {
        return systemCode(code, context);
    }

    const url = extensionAddress(code);
    const left = refused.get(codeKey(code));

    if (url === undefined) {
        return undefined;
    }

    return left !== undefined ? `is left out (${left}): validate says how to fix it` : ready.get(url) ?? "is not loaded yet: start the MCP server again (/mcp in Claude Code), or open a new chat";
}

/**
 * Loads the code of the campaign's packages, as an entry that calls their hooks starts (D-514), and again after package installs one: their hooks are called at
 * once, never waiting for an import. What keeps one from being used is kept for its hooks, and left to validate.
 */
export async function loadCampaignCode(context: Context): Promise<void>
{
    try {
        const root = findCampaign(context.folder);

        if (root !== undefined) {
            await packageCommands(root, context, []);
        }
    } catch {
        // A campaign that does not read loads nothing: the command says why.
    }
}

/**
 * The code of the campaign's game system when this process has not loaded it, as one installed in the chat that plays it (D-513 (1)): new to the process, it
 * is imported now, with the commands of the campaign's packages; a system loaded already, refused or broken, stays as it was.
 */
export async function loadNewSystemCode(context: Context): Promise<void>
{
    let system: GameSystem | undefined;

    // A campaign or a system that does not read loads nothing: the commands say why.
    try {
        const root = findCampaign(context.folder);
        system = root === undefined ? undefined : campaignSystem(root, context);
    } catch {
        return;
    }

    if (system === undefined || context.systemCode === undefined || context.systemCode[system.name] !== undefined || !systemHasCode(system.folder)) {
        return;
    }

    const loaded = (await loadSystemCode(context.systemFolders))[system.name];

    if (loaded !== undefined) {
        context.systemCode[system.name] = loaded;
        await loadCampaignCode(context);
    }
}

/** The most a package says in one call, after the engine's writes or as time passes, in lines and in characters; what is more is cut, with a line. */
const mostLines = 5;
const mostCharacters = 600;

/** A package's lines for the master, cut at the most it may say in one call, with a line that says so. */
export function cappedLines(code: CodePackage, lines: string[]): string[]
{
    const kept: string[] = [];
    let length = 0;

    for (const line of lines) {
        if (kept.length === mostLines || length + line.length > mostCharacters) {
            return [...kept, `The ${packageLabel(code)} said more: cut.`];
        }

        kept.push(line);
        length += line.length;
    }

    return kept;
}

/** A package that is an extension. */
function isExtension(code: CodePackage): code is Extension
{
    return code.kind === "extension";
}

/**
 * The game as a package's code reaches it (D-436, D-505, D-514): what a widget reads, the dice, asking the player, its own state, the fields it may write and
 * the log; nothing else is written. A command's or time's game writes nothing once the call is stopped (ASK-9); a hook's finishes what the engine began.
 */
export function gameOf(root: string, context: Context, code: CodePackage, options: { asked?: { card?: CardAsked; }; hook?: boolean; } = {}): Game
{
    const view = gameViewOf(root, context, code);
    const asked = options.asked ?? {};

    const live = (): void => {
        if (options.hook !== true && context.signal?.aborted === true) {
            throw new Error("The call was stopped: nothing more is written.");
        }
    };

    return {
        ...view,
        roll: (notation, by) => {
            if (by !== undefined) {
                live();
                return rollFor(root, context, notation, by, (text) => packageText(root, code, text));
            }

            const rolled = rollDice(notation, { random: context.random });
            return { notation: rolled.notation, total: rolled.total, faces: rolled.faces, dice: rolled.dice, text: rolled.text };
        },
        set: (page, values, why) => {
            live();
            setPackageFields(root, context, code, page, values, why);
        },
        addEffect: (page, effect, why) => {
            live();
            return addEffect(root, context, page, effect, why);
        },
        endEffect: (page, effect, why) => {
            live();
            return endEffect(root, context, page, effect, why);
        },
        change: (page, field, amount, why) => {
            live();
            // By, to or spend alone, as the kit's types say: never a recipe or faces, which code written by hand could slip in.
            const { by, to, spend } = amount as { by?: unknown; to?: unknown; spend?: unknown; };
            const result = change.run(change.input.parse({ page, field, by, to, spend, why }), context);

            if (result instanceof Promise) {
                throw new Error("game.change changes a counter or money at once: give it by, to or spend. Nothing changed.");
            }

            return change.format(result);
        },
        ask: (wanted) => {
            // Refused at once, never as a promise a hook lets go.
            if (options.hook === true) {
                throw new Error("ask waits for the player, and a hook is called at once, never waiting: ask from a command of the package instead.");
            }

            return (async () => {
                live();
                const { who, question, check, notation } = wanted;
                const told = toldOf(root, context, code, wanted, who);
                asked.card = told.card ?? asked.card;
                return askedOf(await askedRoll(root, context, askedQuestion(packageText(root, code, question), check, notation), [{ label: check.trim(), notation }], who, told));
            })();
        },
        state: {
            read: view.state.read,
            write: (value) => {
                live();
                files().write(statePath(root, code), `# The state of the ${code.kind === "system" ? "game system" : "extension"} ${code.package}, kept by its code.\n${stringify(value, { lineWidth: 0 })}`);
            },
        },
        log: (text, visibility = "hidden") => {
            live();
            // An extension's line as it always was; a system's of its own kind.
            const entry = code.kind === "system" ? newDatedLogEntry(root, context, "system", visibility, { system: code.name, text }) : newDatedLogEntry(root, context, "extension", visibility, { extension: code.name, text });
            appendLogEntry(root, entry);
        },
    };
}

/**
 * The game as a widget of a package reads it (D-502, D-505): the time, where the party is and who is in it, a page, the scene, the campaign's settings and the
 * package's state.
 */
export function gameViewOf(root: string, context: Context, code: CodePackage): GameView
{
    return {
        now: () => {
            const now = presentDate(root);
            return now === undefined ? undefined : momentOf(root, context, now);
        },
        calendarDay: (day) => calendarDayOf(root, context, day),
        units: () => (readTextSetting(root, "units") === "imperial" ? "imperial" : "metric"),
        party: () => {
            const world = campaignWorld(root, context);
            const player = playerCharacters(world).find(isInParty);
            return player === undefined
                ? undefined
                : {
                    places: locate(world, player).chain.filter((page) => page.type === "place").map((page) => page.name),
                    environment: Object.fromEntries(environmentAt(world, player).map(({ entry }) => [entry.name, entry.value])),
                    members: world.pages.filter(isInParty).map((page) => ({ name: page.name, pc: isPlayerCharacter(page) })),
                };
        },
        page: (name) => {
            const world = campaignWorld(root, context);
            const found = pagesWithNameOrAlias(world, name);
            return found.length === 1 ? gamePage(world, found[0], campaignSystemWords(root, context)) : undefined;
        },
        scene: () => {
            const scene = readOpenScene(root).scene;
            return scene === undefined ? undefined : {
                title: scene.title,
                ...(scene.opened === undefined ? {} : { opened: scene.opened }),
                ...(scene.round === undefined ? {} : { round: scene.round }),
                ...(scene.turn === undefined ? {} : { turn: scene.turn }),
            };
        },
        setting: (name) => readTextSetting(root, name),
        // A name in the campaign's language is the system's by its words, Prono its Prone (D-403).
        sameName: (one, other) => sameWord(one, other, campaignSystemWords(root, context)),
        state: { read: () => parse(files().text(statePath(root, code)) ?? "null") as unknown },
    };
}

/**
 * How a package's code words a roll it asks (D-507): its buttons and its rule translated, what its faces mean and how they turned out, and the card of its
 * widget, read for its key and whose roll it is, refused when the package has no widget by that name.
 */
export function toldOf(root: string, context: Context, code: CodePackage, wanted: Asking, who?: string): Told
{
    const words = (text: WidgetText): string => packageText(root, code, text);
    const button = (given: ButtonWords): Button => (typeof given === "object" && "label" in given ? { name: words(given.label), note: words(given.note) } : { name: words(given) });
    const { roll, decline, rule, card, says, tones } = wanted;

    if (card !== undefined && !code.widgets.some((widget) => widget.name === card.widget)) {
        const its = code.widgets.length === 0 ? "it declares none" : `its own are ${code.widgets.map((widget) => widget.name).join(", ")}`;
        throw new Error(`The ${packageLabel(code)} asks in the card of a widget ${card.widget} it does not have: ${its}. Nothing was asked.`);
    }

    return {
        ...(roll === undefined ? {} : { roll: button(roll) }),
        ...(decline === undefined ? {} : { decline: decline === false ? false : button(decline) }),
        ...(rule === undefined ? {} : { rule: words(rule) }),
        ...(card === undefined ? {} : { card: { widget: `${code.name}.${card.widget}`, key: card.key, shows: () => widgetCard(root, context, code, card.widget, card.key, who) } }),
        ...(says === undefined ? {} : { says: (faces: number[]) => words(says(faces)) }),
        ...(tones === undefined ? {} : { tones }),
    };
}

/** The first line of what went wrong, without its last stop, for a line among others. */
export function firstLine(error: unknown): string
{
    return (error instanceof Error ? error.message : String(error)).split("\n")[0].replace(/[:.]$/, "");
}

function systemCodePackage(system: GameSystem): CodePackage
{
    const own = systemPackage(system.folder);
    const page = systemPageModule(system.folder);
    return {
        kind: "system",
        package: own === undefined || own.package === "" ? system.name : own.package,
        name: system.name,
        version: own?.version ?? getVersion(),
        folder: system.folder,
        title: system.title,
        language: system.language,
        icons: system.icons,
        widgets: system.widgets,
        figures: system.figures,
        ...(page === undefined ? {} : { page: page.file }),
        linked: installedFromFolder(system.folder),
    };
}

/** A command of a package as a command of rpg-engine, refused when its name is not the package's or is taken, or its description is too long. */
function asCommand(code: CodePackage, command: PackageCommand, taken: string[]): Command
{
    checkCommandShape(command);
    const name = command.name.trim();
    const words = command.description.split(/\s+/).length;

    if (name !== code.name && !name.startsWith(`${code.name}-`)) {
        throw new Error(`its command ${name} must be named ${code.name}, or start with ${code.name}-`);
    }

    if (taken.includes(name)) {
        throw new Error(`its command ${name} has the name of another command`);
    }

    if (words > descriptionWords) {
        throw new Error(`its command ${name} has a description of ${words} words, and ${descriptionWords} at most are read`);
    }

    return defineCommand({
        name,
        description: command.description,
        group: "game",
        input: command.input,
        readOnly: command.readOnly,
        positionals: command.positionals,
        waitsForPlayer: command.needsPlayer,
        forPlayer: command.player === true,
        async run(input, called)
        {
            const campaign = requireCampaign(called.folder);
            const asked: { card?: CardAsked; } = {};

            try {
                const text: unknown = await command.run(input, gameOf(campaign, called, code, { asked }));

                if (typeof text !== "string") {
                    throw new Error(`The extension ${code.package}'s command ${name} gave no text: a command gives the master its answer as text. Tell its author.`);
                }

                return { text };
            } finally {
                // The card of its last question, as it is after the dice, read once the call ends, however it ends (D-507).
                if (asked.card !== undefined) {
                    called.page?.cardEnded?.(asked.card);
                }
            }
        },
        format: (result) => result.text,
    });
}

/** What a package's code gives, unless the call is stopped first or it takes longer than any answer of the player's should: then why not. */
async function withinCall<T>(work: T | Promise<T>, signal: AbortSignal | undefined): Promise<T>
{
    // Never a rejection that nothing handles, when it ends after the call went on without it.
    Promise.resolve(work).catch(() => undefined);
    let timer: NodeJS.Timeout | undefined;
    let abort = (): void => undefined;
    const stopped = new Promise<never>((_, refuse) => {
        timer = setTimeout(() => refuse(new Error(`it gave nothing for ${longestPackageWait / 60_000} minutes`)), longestPackageWait);
        abort = () => refuse(new Error("the call was stopped before it gave anything"));

        if (signal?.aborted === true) {
            abort();
        }

        signal?.addEventListener("abort", abort, { once: true });
    });

    try {
        return await Promise.race([Promise.resolve(work), stopped]);
    } finally {
        clearTimeout(timer);
        signal?.removeEventListener("abort", abort);
    }
}

/** A package's command as its code must give it, for an author who writes it by hand: refused with the shape it takes. */
function checkCommandShape(command: PackageCommand): void
{
    const given = command as Partial<Record<keyof PackageCommand, unknown>>;
    const name = typeof given.name === "string" ? given.name.trim() : "";

    if (name === "") {
        throw new Error("a command has no name: give each command a name, the package's or one starting with it");
    }

    if (typeof given.description !== "string" || given.description.trim() === "") {
        throw new Error(`its command ${name} has no description: give it one, written for an AI`);
    }

    if (!(given.input instanceof z.ZodObject)) {
        throw new Error(`its command ${name} gives its input in another shape: give it as z.object({...}), with the z the kit gives`);
    }

    if (typeof given.run !== "function") {
        throw new Error(`its command ${name} has no run: give it run(input, game), which gives its answer as text`);
    }
}

// The code of each extension, by its file and version, loaded once for the process: an import is never undone, a new version is another. What each gave,
// once loaded, is kept apart too, for the hooks the commands call at once.
const loaded = new Map<string, Promise<PackageCode | undefined>>();
const ready = new Map<string, PackageCode>();
// Why the code of a package at a version and its installs is left out, as its commands are refused: its hooks are not called.
const refused = new Map<string, string>();
let installs = 0;

/** An extension's code, when it may run (D-441): its module's default export, given the kit; where the engine runs from its source, as in the tests, from its own. */
function extensionCode(extension: Extension): Promise<PackageCode | undefined>
{
    const url = extensionAddress(extension);

    if (url === undefined) {
        return Promise.resolve(undefined);
    }

    const code = loaded.get(url) ?? import(url).then((module: { default?: unknown; }) => {
        if (typeof module.default !== "function") {
            throw new Error(`its code, ${url.replace(/\?.*$/, "")}, has no default export that gives its commands`);
        }

        const given = givenCode((module.default as PackageEntry)({ z }), fileURLToPath(url.replace(/\?.*$/, "")));
        ready.set(url, given);
        return given;
    });
    loaded.set(url, code);
    return code;
}

/** A package at its version and the installs so far, as what is kept of its code is keyed. */
function codeKey(code: CodePackage): string
{
    return `${code.package}@${code.version}#${installs}`;
}

/**
 * A system's code as the engine loaded it, or why it is not there: not loaded, loaded at another version than the one installed now, refused or broken; undefined
 * when it brings none.
 */
/** Whether a package's code is refused, as another's without the player's yes, one made for another API or with commands refused: said once, not at each call. */
export function codeRefused(code: CodePackage, context: Context): boolean
{
    const loaded = context.systemCode?.[code.name];
    return isExtension(code) ? refused.has(codeKey(code)) : loaded !== undefined && "refused" in loaded;
}

function systemCode(code: CodePackage, context: Context): PackageCode | string | undefined
{
    if (!systemHasCode(code.folder)) {
        return undefined;
    }

    const loaded = context.systemCode?.[code.name];
    const again = "start the MCP server again (/mcp in Claude Code), or open a new chat";

    if (loaded === undefined) {
        return `is not loaded: ${again}`;
    }

    if (loaded.version !== undefined && loaded.version !== code.version) {
        return `is loaded at version ${loaded.version}, and ${code.version} is installed now: ${again}`;
    }

    if ("refused" in loaded) {
        return loaded.refused;
    }

    return "problem" in loaded
        ? `cannot load (${loaded.problem}): install it again with package install ${code.name}, or run npm run build in its repository, then start the MCP server again`
        : (loaded.code as PackageCode);
}

/** The address an extension's code is imported from, for its version and the installs so far; undefined when its code does not run. */
function extensionAddress(extension: Extension): string | undefined
{
    const source = join(extension.folder, "src", "index.ts");
    const entry = !runsCode(extension) ? undefined : import.meta.url.endsWith(".ts") && files().exists(source) ? source : extension.code;
    // By its real path, as Node would resolve it: a package linked from a folder of the player's is read from that folder, its own settings beside it.
    return entry === undefined ? undefined : `${pathToFileURL(realPath(entry)).href}?v=${encodeURIComponent(extension.version)}&installs=${installs}`;
}

/** A game date as the API gives it: as written, its day and minute, and its day of the calendar. */
function momentOf(root: string, context: Context, date: GameDate): GameMoment
{
    const calendar = calendarDayOf(root, context, date.day);
    return { date: formatGameDate(date), day: date.day, ...(date.minute === undefined ? {} : { minute: date.minute }), ...(calendar === undefined ? {} : { calendar }) };
}

function statePath(root: string, code: CodePackage): string
{
    return join(root, extensionsFolderName, code.name, "state.yaml");
}

/**
 * A page as a package reads it (D-505): in the party or not, the player's or not, its fields as show gives them, effects and what the system works out included;
 * an effect it has by the system's name or its word in the campaign's language (D-403).
 */
function gamePage(world: World, page: Page, words: Record<string, string> | undefined): GamePage
{
    const fields = effectiveFields(world, page);
    return {
        name: page.name,
        party: isPartyMember(page),
        pc: isPlayerCharacter(page),
        value: (field) => plainValue(valueNamed(fields, field)),
        counter: (field) => {
            const counter = readCounter(valueNamed(fields, field));
            return counter === undefined ? undefined : { value: counter.value, ...(counter.max === undefined ? {} : { max: counter.max }) };
        },
        has: (effect) => effectsOf(page).some((one) => sameWord(effect, one.name, words)),
        formula: (text) => {
            let formula: Formula;

            try {
                formula = parseFormula(text);
            } catch (error) {
                throw new Error(`The formula ${text} does not read: ${error instanceof Error ? error.message : String(error)} Write it as the game system's computed fields are written.`);
            }

            return formulaValue(world, fields, formula);
        },
    };
}

/** A field's value as the API gives it: a number, text, or a list as text; undefined for anything else, as a map. */
function plainValue(value: unknown): number | string | string[] | undefined
{
    if (typeof value === "number" || typeof value === "string") {
        return value;
    }

    if (typeof value === "boolean") {
        return String(value);
    }

    return Array.isArray(value) ? value.map((item) => (typeof item === "object" && item !== null ? JSON.stringify(item) : String(item))) : undefined;
}

/** The page a name, or an alias, gives alone; it throws, with nothing changed, when none or more than one has it. */
function onePage(world: World, name: string): Page
{
    const found = pagesWithNameOrAlias(world, name);

    if (found.length !== 1) {
        throw new Error(`${found.length === 0 ? `No page alone is named ${name}` : `${found.length} pages are named ${name}`}: give the name of one page of the campaign. Nothing changed.`);
    }

    return found[0];
}

/**
 * Sets fields on a page for a package's code, any field of any page (D-505, D-511), as write --set does: each under the name the game system with its additions
 * gives it, whatever the case it came in.
 */
function setPackageFields(root: string, context: Context, code: CodePackage, name: string, values: Record<string, number | string>, why: string): void
{
    const odd = Object.entries(values).find(([, value]) => typeof value !== "string" && (typeof value !== "number" || !Number.isFinite(value)));

    if (odd !== undefined) {
        throw new Error(`The ${packageLabel(code)} gave ${odd[0]} the value ${String(odd[1])}: give a number or text. Nothing changed.`);
    }

    const world = campaignWorld(root, context);
    const declared = Object.keys(world.system?.fields ?? {});
    writePackageFields(root, context, world, onePage(world, name), Object.fromEntries(Object.entries(values).map(([field, value]) => [sameName(declared, field) ?? field, value])), why);
}

/**
 * Adds an effect without end, for a package's code: the engine's notes on what it breaks of what one keeps; undefined when the page has it already, maybe in the
 * campaign's language (D-403).
 */
function addEffect(root: string, context: Context, name: string, effect: string, why: string): string[] | undefined
{
    const world = campaignWorld(root, context);
    const page = onePage(world, name);
    const words = campaignSystemWords(root, context);
    // Effects written by hand that do not read are never written over (EFF-12).
    checkEffectsReadable(page);

    if (effectsOf(page).some((one) => sameWord(effect, one.name, words))) {
        return undefined;
    }

    const keeping = keepingConditionNote(world, readOpenScene(root).scene, campaignSystem(root, context), page.name, effect, words);
    saveEffects(root, context, world, { page, copy: false }, withEffect(effectsOf(page), { name: effect, values: [] }, words));
    appendLogEntry(root, newDatedLogEntry(root, context, "effect-added", concernsPlayer(world, page) ? "public" : "hidden", { page: page.name, effect, why }));
    return keeping === "" ? [] : [keeping];
}

/** Ends an effect, for a package's code, by its name or the system's word for it in the campaign's language (D-403); whether the page had it. */
function endEffect(root: string, context: Context, name: string, effect: string, why: string): boolean
{
    const world = campaignWorld(root, context);
    const page = onePage(world, name);
    const words = campaignSystemWords(root, context);
    checkEffectsReadable(page);
    const effects = effectsOf(page);
    const ended = effects.filter((one) => sameWord(effect, one.name, words));

    if (ended.length === 0) {
        return false;
    }

    saveEffects(root, context, world, { page, copy: false }, effects.filter((one) => !ended.includes(one)));
    // The log names what the page had, as it was written.
    const visibility = concernsPlayer(world, page) ? "public" : "hidden";
    ended.forEach((one) => appendLogEntry(root, newDatedLogEntry(root, context, "effect-ended", visibility, { page: page.name, effect: one.name, why })));
    return true;
}

/**
 * A roll for who, as the master's for them (D-287, D-505): a line in the log, in view for the party and behind the screen for anyone else as master-rolls says;
 * the player's physical dice, given as their faces, always in view.
 */
function rollFor(root: string, context: Context, notation: string, by: RollFor, words: (text: WidgetText) => string): Rolled
{
    const rolled = rollDice(notation, by.values === undefined ? { random: context.random } : { values: by.values });
    const physical = by.values !== undefined;
    const hidden = !physical && behindTheScreen(root, context, by.who);
    const checked = by.check === undefined ? {} : { check: by.check };
    const says = by.says === undefined ? {} : { says: words(by.says(rolled.faces)) };
    const tones = tonesOf(by.tones?.(rolled.faces), rolled.faces);
    const entry = newDatedLogEntry(root, context, "roll", hidden ? "hidden" : "public", {
        notation: rolled.notation,
        total: rolled.total,
        result: rolled.text,
        ...says,
        ...tones,
        why: by.why,
        who: by.who,
        ...checked,
        physical,
        dice: rolled.dice,
    });

    if (hidden) {
        sealHiddenRoll(entry, rolled.text, context);
    }

    appendLogEntry(root, entry);
    return { notation: rolled.notation, total: rolled.total, faces: rolled.faces, dice: rolled.dice, text: rolled.text, id: entry.id, hidden };
}

/** Words of a package in the campaign's language, by its words as a widget's are, with their {names} filled; as written where its words lack them. */
function packageText(root: string, code: CodePackage, text: WidgetText): string
{
    let words: ExtensionWords | undefined;

    try {
        words = packageWords(code, readTextSetting(root, "language") ?? code.language);
    } catch {
        // Words that do not read leave the text as written, as validate says.
    }

    const { text: written, values } = typeof text === "string" ? { text, values: {} as Record<string, WidgetValue> } : text;
    return wordIn(words, written).replace(/\{(\w+)\}/g, (whole, name: string) => (Object.hasOwn(values, name) ? valueText(values[name]) : whole));
}

/** A value as plain text in a line of the log. */
function valueText(value: WidgetValue): string
{
    const unit = (given: string | undefined): string => (given === undefined ? "" : ` ${given}`);
    return typeof value === "number" || typeof value === "string" ? String(value) : "number" in value ? `${value.number}${unit(value.unit)}` : `${value.from}–${value.to}${unit(value.unit)}`;
}

/** The question of a roll asked, refused without words, a check's name or dice (ASK-2). */
function askedQuestion(question: string, check: string, notation: string): string
{
    if (question.trim() === "" || check.trim() === "" || !isCheckDice(notation)) {
        const dice = isCheckDice(notation) ? "" : `: ${notation} are no dice`;
        throw new Error(`Give ask the question, what is at stake either way, the check's name, such as Stealth, and its dice, such as 2d6+1${dice}. Nothing was asked.`);
    }

    return question.trim();
}

/** What ask answered, as a package's code gets it. */
function askedOf(result: AskResult): Asked
{
    switch (result.kind) {
        case "roll":
            return { rolled: { id: result.id, total: result.total, faces: result.faces, text: result.text } };
        case "changed":
            return { declined: true };
        case "said":
            return { said: result.words };
        default:
            return { inWords: "asked" in result ? result.asked : "", physical: result.kind === "physical" || result.kind === "dice in words" };
    }
}

function codeProblem(code: CodePackage, error: unknown): Problem
{
    const why = error instanceof Error ? error.message : String(error);
    const kind = code.kind === "system" ? "game system" : "extension";
    // The engine brings no system with code (D-513 (1)): a system's comes back with its package, as an extension's.
    const fix = `install it again, or another version, with package install ${code.name}`;
    return { path: campaignFileName, message: `The code of the ${kind} ${code.package} cannot be used: ${why}. Its commands are left out.`, fix };
}
