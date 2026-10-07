import { join, resolve } from "node:path";
import { campaignFileName, readCampaignData, readTextSetting } from "../campaign/index.ts";
import type { Context } from "../core/context.ts";
import type { Problem } from "../core/problem.ts";
import { files, isInside } from "../core/store.ts";
import { comparableText } from "../core/text.ts";
import { loadWorld, type PageType, searchSystemPages, type World, worldFolderName } from "../pages/index.ts";
import { findCampaignSystem, findSystem, type GameSystem, installedSystems, type SystemSetting, withSettings } from "../systems/index.ts";

/** The world of the campaign in `root`, with the pages of its game system when campaign.yaml names one that is installed (SYS-1, SYS-3). */
export function campaignWorld(root: string, context: Context): World
{
    // The same world until one of its pages or campaign.yaml changes: in a session, across calls (D-137). A game system does not change while the server runs.
    const from = [join(root, worldFolderName), join(root, campaignFileName)].map((path) => resolve(path));
    const dependsOn = (path: string): boolean => from.some((source) => source === path || isInside(source, path) || isInside(path, source));
    return files().remember(`world ${resolve(root)}`, dependsOn, () => {
        const named = readTextSetting(root, "system");
        const system = campaignSystem(root, context);
        return loadWorld(root, { system, language: readTextSetting(root, "language"), missingSystem: system === undefined ? named : undefined, noSystem: named === undefined });
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
 * The game system campaign.yaml names, with its additions or why they do not read, and as its settings have it (DAT-10), read once until campaign.yaml changes:
 * a call asks for it many times.
 */
function systemOf(root: string, context: Context): { system?: GameSystem; problem?: string; }
{
    const settings = resolve(join(root, campaignFileName));
    return files().remember(`system ${resolve(root)}`, (path) => path === settings, () => {
        const name = readTextSetting(root, "system");
        const found = name === undefined ? {} : findCampaignSystem(context.systemFolders, name, readCampaignData(root));
        return found.system === undefined ? found : { ...found, system: withSettings(found.system, (setting) => readTextSetting(root, setting)) };
    });
}

/** A setting the campaign's game system adds to the setup (DAT-10), by its name in any case; undefined when the system has none by that name. */
export function systemSetting(root: string, context: Context, name: string): SystemSetting | undefined
{
    return campaignSystem(root, context)?.settings.find((setting) => comparableText(setting.name) === comparableText(name.trim()));
}

/** The value campaign.yaml gives a setting of the system, when it is one the system has (DAT-10). */
export function systemSettingValue(root: string, setting: SystemSetting): string | undefined
{
    const written = readTextSetting(root, setting.name);
    return setting.values.find((value) => written !== undefined && comparableText(value.value) === comparableText(written))?.value;
}

/** A setting of the system written by hand with a value the system does not have (DAT-10): what it takes instead. */
export function systemSettingProblems(root: string, context: Context): Problem[]
{
    return (campaignSystem(root, context)?.settings ?? []).flatMap((setting): Problem[] => {
        const written = readTextSetting(root, setting.name);
        return written === undefined || systemSettingValue(root, setting) !== undefined ? [] : [{
            path: campaignFileName,
            message: `${setting.name} is "${written}", which the system ${campaignSystem(root, context)?.name ?? ""} does not take: ${valuesText(setting)}.`,
            fix: `config, setting ${setting.name}, value ${setting.values[0].value}`,
        }];
    });
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

    // What the campaign adds that does not read: the campaign plays with the system alone (CAM-3).
    if (found?.problem !== undefined) {
        return [{
            path: "campaign.yaml",
            message: `What campaign.yaml adds to the system ${name ?? ""} does not read, so the campaign plays with the system alone: ${found.problem}`,
            fix: "fix it first, with the config command or by hand: until then validate does not check what the system works out on the pages",
        }];
    }

    if (name === undefined || found?.system !== undefined) {
        return [];
    }

    const [first] = installedSystems(context.systemFolders);
    return [{
        path: "campaign.yaml",
        message: `The system ${name} is not installed: no creatures, items or rules come from a system. ${installedText(context)}`,
        fix: first === undefined ? "install the game system" : `ask the player which game you play, then config, setting system, value ${first.name}`,
    }];
}

/** The name of an installed game system, as it is installed; refused, with those that are, when none has it (D-167). */
export function installedSystemName(name: string, context: Context, how: "init" | "config"): string
{
    const system = findSystem(context.systemFolders, name);

    if (system === undefined) {
        const [first] = installedSystems(context.systemFolders);
        const example = first === undefined ? "" : ` Give one of them, such as ${how === "init" ? "system" : "setting system, value"} ${first.name}.`;
        throw new Error(`"${name}" is not an installed system. ${installedText(context)}${example} Nothing changed.`);
    }

    return system.name;
}

/** "Installed: 5e (the fifth edition, from the SRD 5.1)." */
export function installedText(context: Context): string
{
    const systems = installedSystems(context.systemFolders);
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

/** The settings still missing, with the installed game systems beside system, the one to ask for among them (D-167): "system (installed: 5e)". */
export function missingWithSystems(root: string, missing: string[], context: Context): string[]
{
    const names = installedSystems(context.systemFolders).map((system) => system.name);
    const system = names.length > 0 ? `system (installed: ${names.join(", ")})` : "system";
    // What the system adds to the setup, with its values: config says what each means (DAT-10).
    const added = (campaignSystem(root, context)?.settings ?? []).filter((setting) => systemSettingValue(root, setting) === undefined).map((setting) => `${setting.name} (${valuesText(setting)})`);
    // The system first (D-167): the other settings may depend on the game.
    return [...(missing.includes("system") ? [system, ...missing.filter((name) => name !== "system")] : missing), ...added];
}

/**
 * The campaign's system as status shows it, so that the master always knows which rules are played (D-173): "5e, the fifth edition from the SRD 5.1, the 2014 rules";
 * one that is not installed says so, with the fix (D-167). Undefined when campaign.yaml names none.
 */
export function systemInStatus(root: string, context: Context): string | undefined
{
    const name = readTextSetting(root, "system");
    const system = name === undefined ? undefined : findSystem(context.systemFolders, name);

    if (name === undefined || system !== undefined) {
        return system === undefined ? undefined : `${system.name}, ${system.title}`;
    }

    const [first] = installedSystems(context.systemFolders);
    return `${name} ${first === undefined ? "(not installed)" : `(not installed: ask the player, then config, setting system, value ${first.name})`}`;
}

/** A language as messages name it, such as English for en. */
function languageName(code: string): string
{
    try {
        return new Intl.DisplayNames(["en"], { type: "language" }).of(code) ?? code;
    } catch {
        return code;
    }
}
