// The campaign's world and game system as the commands read them: the system with the layers over it, the settings it plays with, and the world built from both.
import { join, resolve } from "node:path";
import { campaignFileName, type CountedByGame, readCampaignData, readOneSetting, readTextSetting } from "../../campaign/index.ts";
import type { Context } from "../../core/context.ts";
import { ourSystems } from "../../core/package-declarations.ts";
import type { Problem } from "../../core/problem.ts";
import { files, isInside } from "../../core/store.ts";
import { comparableText } from "../../core/text.ts";
import { type Extension, extensionWords } from "../../extensions/index.ts";
import { languagePackFor, packSystemFolder } from "../../languages/index.ts";
import { loadWorld, type PageType, playerCharacters, searchSystemPages, type World, worldFolderName } from "../../pages/index.ts";
import {
    type CampaignData,
    engineSettingValue,
    findCampaignSystem,
    findSystem,
    type GameSystem,
    layeredSystemWords,
    readableSystems,
    rulesetSetting,
    systemContentFolders,
    type SystemLayer,
    type SystemSetting,
    type SystemWords,
    systemWords,
    withSettings,
} from "../../systems/index.ts";
import { campaignExtensions, extensionSources, layeredParts } from "./packages/extensions.ts";
import { homeSystemWords } from "./page-words.ts";

/** The world of the campaign in `root`, with the pages of its game system when campaign.yaml names one that is installed (SYS-1, SYS-3). */
export function campaignWorld(root: string, context: Context): World
{
    // The same world until one of its pages or campaign.yaml changes: in a session, across calls (D-137). A game system does not change while the server runs.
    const from = [join(root, worldFolderName), join(root, campaignFileName)].map((path) => resolve(path));
    const dependsOn = (path: string): boolean => from.some((source) => source === path || isInside(source, path) || isInside(path, source));
    return files().remember(`world ${resolve(root)}`, dependsOn, () => {
        const named = readTextSetting(root, "system");
        const system = campaignSystem(root, context);
        return loadWorld(root, {
            system,
            language: readTextSetting(root, "language"),
            words: campaignSystemWords(root, context),
            missingSystem: system === undefined ? named : undefined,
            noSystem: named === undefined,
            // As the game plays it, with the values of its settings campaign.yaml writes (DAT-16).
            rigor: rigorPlayed(root, system),
        });
    });
}

/** The rigor as the game plays it (DAT-16): with the values of the system's settings as campaign.yaml writes them, as the world reads before its players. */
function rigorPlayed(root: string, system: GameSystem | undefined): string | undefined
{
    const value = engineSettingValue(system, (setting) => systemSettingValue(root, setting), "rigor", readTextSetting(root, "rigor"));
    return typeof value === "string" ? value : undefined;
}

/**
 * The game system's words in the campaign's language (D-403): its own, else those translated on the fly on this computer (D-406); with the names of the
 * fields the campaign's extensions add, from their words, layered as their additions are (CAM-2, D-505).
 */
export function systemWordsOf(root: string, system: GameSystem, language: string, context: Context): SystemWords | undefined
{
    // A language package's words come first, then the system's own, then those translated on the fly (D-485 (3)).
    const pack = languagePackFor(context.extensionFolders ?? [], language);
    const packed = pack === undefined ? undefined : packSystemFolder(pack, system.name);
    const own = (packed === undefined ? undefined : systemWords(packed, language)) ?? layeredSystemWords(systemContentFolders(system), language) ?? homeSystemWords(context.home, system, language);
    const added = campaignExtensions(root, context).extensions.reduce((fields, extension) => ({ ...fields, ...extensionFieldWords(extension, language) }), {});
    return Object.keys(added).length === 0 ? own : { ...(own ?? { groups: {}, words: {} }), fields: { ...own?.fields, ...added } };
}

/**
 * The game system's words in the campaign's language, by their English (D-403), by which a name written in it is the system's, Prono its Prone; none without a
 * language, or when they do not read. Kept until campaign.yaml, an extension or a translation of this computer changes.
 */
export function campaignSystemWords(root: string, context: Context): Record<string, string> | undefined
{
    const sources = extensionSources(root, context);
    const translated = context.home === undefined ? undefined : resolve(join(context.home, "systems"));
    const dependsOn = (path: string): boolean => sources(path) || (translated !== undefined && (isInside(translated, path) || isInside(path, translated)));
    return files().remember(`system words ${resolve(root)}`, dependsOn, () => {
        const system = campaignSystem(root, context);
        const language = readTextSetting(root, "language");

        try {
            return system === undefined || language === undefined ? undefined : systemWordsOf(root, system, language, context)?.words;
        } catch {
            return undefined;
        }
    });
}

/**
 * The installed game system that campaign.yaml names, with what the campaign adds to it (CAM-1, CAM-2): alone when the additions do not read (CAM-3). Undefined
 * when it names none, or one that is not installed (SYS-1).
 */
export function campaignSystem(root: string, context: Context): GameSystem | undefined
{
    return systemOf(root, context).system;
}

/**
 * The game system campaign.yaml names, with what its extensions and then the campaign add to it (CAM-2), and the layers left out with why (CAM-3), as its
 * settings have it (DAT-10), read once until campaign.yaml changes: a call asks for it many times.
 */
function systemOf(root: string, context: Context): { system?: GameSystem; refused: { from: string; problem: string; }[]; }
{
    // campaign.yaml, and the extensions' packages, whose parts and additions it gives.
    return files().remember(`system ${resolve(root)}`, extensionSources(root, context), () => {
        const name = readTextSetting(root, "system");
        const found = name === undefined ? { refused: [] } : findCampaignSystem(context.systemFolders, name, systemLayers(root, context, readCampaignData(root)), readTextSetting(root, rulesetSetting));
        // And the parts of the instructions of its extensions over its own (D-121).
        const played = found.system === undefined ? undefined : withSettings(found.system, (setting) => readTextSetting(root, setting));
        return played === undefined ? found : { ...found, system: { ...played, parts: layeredParts(played.parts, campaignExtensions(root, context).extensions) } };
    });
}

/** What the campaign's extensions add to its game system, in the order campaign.yaml lists them, then the campaign's own additions, which win (CAM-2). */
export function systemLayers(root: string, context: Context, campaign: CampaignData): SystemLayer[]
{
    const extensions = campaignExtensions(root, context).extensions.map((extension) => ({ from: extensionLayer(extension.name), data: extension.adds }));
    return [...extensions, { from: campaignFileName, data: campaign }];
}

/** The name of an extension's layer of additions, as messages give it. */
function extensionLayer(name: string): string
{
    return `the extension ${name}`;
}

/** The names an extension's words give the fields it adds; none when its words do not read, which validate names. */
function extensionFieldWords(extension: Extension, language: string): Record<string, string>
{
    try {
        return extensionWords(extension.folder, language)?.fields ?? {};
    } catch {
        return {};
    }
}

/** A setting the campaign's game system adds to the setup (DAT-10), by its name in any case; undefined when the system has none by that name. */
export function systemSetting(root: string, context: Context, name: string): SystemSetting | undefined
{
    return campaignSystem(root, context)?.settings.find((setting) => comparableText(setting.name) === comparableText(name.trim()));
}

/**
 * The value a setting of the system has in the campaign (DAT-10): the one campaign.yaml gives, when the system has it; for the version of the rules, once the game
 * has begun, the one it plays unwritten, the first (VER-2). Undefined while it is still to be chosen.
 */
export function playedSettingValue(root: string, context: Context, setting: SystemSetting): string | undefined
{
    const written = systemSettingValue(root, setting);
    return written !== undefined || setting.name !== rulesetSetting || playersOfTheGame(root, context).length === 0 ? written : campaignSystem(root, context)?.version?.name;
}

/** The names of the player characters the game has begun with (D-519): from the first, the campaign keeps its system and the version of its rules (SYS-9, VER-4). */
export function playersOfTheGame(root: string, context: Context): string[]
{
    return playerCharacters(campaignWorld(root, context)).map((page) => page.name);
}

/** The value campaign.yaml gives a setting of the system, when it is one the system has (DAT-10). */
function systemSettingValue(root: string, setting: SystemSetting): string | undefined
{
    const written = readTextSetting(root, setting.name);
    return setting.values.find((value) => written !== undefined && comparableText(value.value) === comparableText(written))?.value;
}

/** "xp is not kept with advancement milestones": said when a field the campaign's settings leave out is written or changed (DAT-10); undefined for any other. */
export function leftOutNote(root: string, context: Context, field: string): string | undefined
{
    const setting = (campaignSystem(root, context)?.settings ?? []).find((candidate) => {
        const value = candidate.values.find((other) => other.value === systemSettingValue(root, candidate));
        return value?.without.some((name) => comparableText(name) === comparableText(field)) === true;
    });
    return setting === undefined ? undefined : `${field} is not kept with ${setting.name} ${systemSettingValue(root, setting) ?? ""}: config says what it means.`;
}

/** A setting of the system written by hand with a value the system does not have (DAT-10): what it takes instead. */
export function systemSettingProblems(root: string, context: Context): Problem[]
{
    return (campaignSystem(root, context)?.settings ?? []).flatMap((setting): Problem[] => {
        const written = rawSetting(root, setting.name);
        return written === undefined || written === null || systemSettingValue(root, setting) !== undefined ? [] : [{
            path: campaignFileName,
            message: `${setting.name} is ${JSON.stringify(written)}, which the system ${campaignSystem(root, context)?.name ?? ""} does not take: ${valuesText(setting)}.`,
            fix: `ask the player, then config, setting ${setting.name}, with ${setting.values.map((value) => `value ${value.value}`).join(" or ")}`,
        }];
    });
}

/** A setting as campaign.yaml writes it, of any kind; undefined when the file does not read, which validate reports on its own. */
function rawSetting(root: string, name: string): unknown
{
    try {
        return readOneSetting(root, name);
    } catch {
        return undefined;
    }
}

/** "xp or milestones": the values of a setting of the system. */
export function valuesText(setting: SystemSetting): string
{
    const values = setting.values.map((value) => value.value);
    return values.length === 1 ? values[0] : `${values.slice(0, -1).join(", ")} or ${values.at(-1) ?? ""}`;
}

/** The occasions of a game system that end effects (DAT-5): those its recipes name, such as long rest. */
export function occasionsOf(system: GameSystem | undefined): string[]
{
    return [...new Set((system?.recipes ?? []).flatMap((recipe) => recipe.ends))];
}

/** The occasions of the campaign's game system, with its name; undefined without one. */
export function systemOccasions(root: string, context: Context): { system: string; names: string[]; } | undefined
{
    const system = campaignSystem(root, context);
    return system === undefined ? undefined : { system: system.name, names: occasionsOf(system) };
}

/** A game system named in campaign.yaml that is not installed (SYS-1, D-167): the commands go on without its pages. */
export function systemProblems(root: string, context: Context): Problem[]
{
    const name = readTextSetting(root, "system");
    const found = name === undefined ? undefined : systemOf(root, context);

    // What an extension or the campaign adds that does not read: the campaign plays without it (CAM-3).
    if (found !== undefined && found.refused.length > 0) {
        return found.refused.map(({ from, problem }) => ({
            path: campaignFileName,
            message: `What ${from} adds to the system ${name ?? ""} does not read, so the campaign plays without it: ${problem}`,
            fix: from === campaignFileName
                ? "fix it first, with the config command or by hand: until then validate does not check what the system works out on the pages"
                : `install another version of it with package install ${from.replace(/^the extension /, "")}, or take it away with package remove`,
        }));
    }

    if (name === undefined || found?.system !== undefined) {
        return [];
    }

    return [{
        path: "campaign.yaml",
        message: `The system ${name} is not installed: no creatures, items or rules come from a system. ${installedText(context)}`,
        fix: missingSystemFix(name, context),
    }];
}

/** How a campaign gets the system it names that is not installed: one of ours with package install (D-513), else another of those installed, asked of the player. */
function missingSystemFix(name: string, context: Context): string
{
    const ours = ourSystems.find((one) => comparableText(one.name) === comparableText(name.trim()));

    if (ours !== undefined) {
        return `install it, one of RPG Engine's own, with package install ${ours.name}; until then, play on without its pages`;
    }

    const [first] = readableSystems(context.systemFolders);
    return first === undefined ? "install the game system" : `ask the player which game you play, then config, setting system, value ${first.name}`;
}

/** The name of an installed game system, as it is installed; refused, with those that are, when none has it (D-167). */
export function installedSystemName(name: string, context: Context, how: "init" | "config"): string
{
    const system = findSystem(context.systemFolders, name);

    if (system === undefined) {
        const [first] = readableSystems(context.systemFolders);
        const ours = ourSystems.find((one) => comparableText(one.name) === comparableText(name.trim()));
        // One of ours is installed first, once the player wants it (D-513 (1)).
        const example = ours !== undefined
            ? ` It is one of RPG Engine's own: install it with package install ${ours.name} once the player wants it, then give it again.`
            : first === undefined
            ? ""
            : ` Give one of them, such as ${how === "init" ? "system" : "setting system, value"} ${first.name}.`;
        throw new Error(`"${name}" is not an installed system. ${installedText(context)}${example} Nothing changed.`);
    }

    return system.name;
}

/** "Installed: 5e (the fifth edition, from the SRD 5.1)." */
function installedText(context: Context): string
{
    const systems = readableSystems(context.systemFolders);
    return systems.length === 0 ? "No system is installed." : `Installed: ${systems.map((system) => `${system.name} (${system.title})`).join(", ")}.`;
}

/** " The campaign's system, Quinta edizione, is not installed, so none of its pages can be found: validate says how to fix it.": for a name not found (SYS-1). Empty otherwise. */
export function missingSystemHint(world: World): string
{
    if (world.noSystem === true) {
        return " The campaign has no game system yet, so none of its pages can be found: choose it with config.";
    }

    return world.missingSystem === undefined ? "" : ` The campaign's system, ${world.missingSystem}, is not installed, so none of its pages can be found: validate says how to fix it.`;
}

/**
 * " find looks for the pages of the system 5e in their names and fields, in English.": how a page of the game system is found, for a name that was not (SYS-3, D-165);
 * the language only when it is not the campaign's. Empty when there is no system.
 */
export function systemSearchHint(world: World): string
{
    const language = foreignSystemLanguage(world);
    return world.system === undefined ? "" : ` find looks for the pages of the system ${world.system.name} in their names and fields${language === undefined ? "" : `, in ${language}`}.`;
}

/** The language the game system names its pages in, such as English, when it is not the campaign's (D-165); undefined when it is, or there is no system. */
export function foreignSystemLanguage(world: World): string | undefined
{
    return world.system === undefined ? undefined : foreignLanguage(world.system.language, world.language);
}

/** The language a game system writes in, such as English, when the campaign plays in another one (D-165); undefined when it is the same, or the campaign's is not set. */
export function foreignLanguage(systemLanguage: string, campaignLanguage: string | undefined): string | undefined
{
    return campaignLanguage === undefined || campaignLanguage.split("-")[0] === systemLanguage.split("-")[0] ? undefined : languageName(systemLanguage);
}

/**
 * " If it is a kind of one of the system 5e (named in English: find, type creature, with a text in English), set creature to it, and its numbers come from there.": for a page
 * created without the base its type may have, when the game system has pages of that type (D-165, SYS-7). Empty otherwise.
 */
export function systemBaseHint(world: World, type: PageType, field: string): string
{
    if (world.system === undefined || searchSystemPages(world, { type }).length === 0) {
        return "";
    }

    const language = foreignSystemLanguage(world);
    const named = language === undefined ? "" : ` (named in ${language}: find, type ${type}, with part of its name in ${language})`;
    return ` If it is a kind of one of the system ${world.system.name}${named}, set ${field} to it, and its numbers come from there.`;
}

/**
 * " The system 5e has 8 more creatures, named in English: find one with find, type creature and a text in English, then give its name here.": the pages of a type
 * the game system has, for a message that lists the campaign's (SYS-3). Empty when it has none.
 */
export function systemPagesHint(world: World, type: PageType): string
{
    const count = world.system === undefined ? 0 : searchSystemPages(world, { type }).length;

    if (world.system === undefined || count === 0) {
        return "";
    }

    const language = foreignSystemLanguage(world);
    const named = language === undefined ? "" : `, named in ${language}`;
    const inLanguage = language === undefined ? "" : ` in ${language}`;
    return ` The system ${world.system.name} has ${count} ${count === 1 ? type : `${type}s`}${named}: find one with find, type ${type} and part of its name${inLanguage}, then give its name here.`;
}

/**
 * The campaign's system as status shows it, so that the master always knows which rules are played (D-173): "5e, the fifth edition from the SRD 5.1, the 2014 rules";
 * one that is not installed says so, with the fix (D-167). Undefined when campaign.yaml names none.
 */
export function systemInStatus(root: string, context: Context): string | undefined
{
    const name = readTextSetting(root, "system");
    const system = name === undefined ? undefined : findSystem(context.systemFolders, name, readTextSetting(root, rulesetSetting));

    // With the version of its rules the campaign plays (VER-1).
    if (name === undefined || system !== undefined) {
        return system === undefined ? undefined : `${system.name}, ${system.title}${playedRules(root, context, system)}`;
    }

    return `${name} (not installed: ${missingSystemFix(name, context)})`;
}

/**
 * ", the second rules": the version of its rules a system is played with, when it has more than one to choose from (VER-1), or that it is still to ask, so
 * that the first, read meanwhile, is never taken as chosen; empty otherwise.
 */
export function playedRules(root: string, context: Context, system: GameSystem): string
{
    const setting = system.settings.find((one) => one.name === rulesetSetting);

    if (system.version === undefined || setting === undefined) {
        return "";
    }

    return playedSettingValue(root, context, setting) === undefined ? ", the version of its rules still to ask" : `, ${system.version.title ?? system.version.name}`;
}

/** A language as messages name it, such as English for en. */
export function languageName(code: string): string
{
    try {
        return new Intl.DisplayNames(["en"], { type: "language" }).of(code) ?? code;
    } catch {
        return code;
    }
}

/** What the game system counts itself, for a rigor's meaning (UPK-1, UPK-3): the day's food, and what burns, by its first name. */
export function countedByGame(system: GameSystem | undefined): CountedByGame
{
    const burning = Object.keys(system?.burning ?? {})[0];
    return { upkeep: system?.upkeep !== undefined, ...(burning === undefined ? {} : { burning }) };
}
