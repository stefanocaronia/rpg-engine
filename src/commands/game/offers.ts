// What the campaign's game system offers of the engine's settings (DAT-16), the settings of its own that a value asks (DAT-17), and the parts its values choose (DAT-18).
import { readSettings, type SettingName, settingNames } from "../../campaign/index.ts";
import type { Context } from "../../core/context.ts";
import { sameWord } from "../../core/text.ts";
import { engineOfferings, engineSettingValue, heldSettings, offeredEngineValues, playedValueOf, readableSystems, type SystemSetting } from "../../systems/index.ts";
import { partText } from "./parts.ts";
import { campaignSystem, playedSettingValue, valuesText } from "./world.ts";

/** The settings of the system that hold in the campaign, in the system's order (DAT-17): those no value asks, and those a value it plays asks. */
export function heldSystemSettings(root: string, context: Context): SystemSetting[]
{
    const system = campaignSystem(root, context);
    return system === undefined ? [] : heldSettings(system, played(root, context));
}

/** The values the game offers of an engine's setting (DAT-16): those the system and the values it plays share; undefined when none of them narrows it. */
export function offeredValues(root: string, context: Context, name: string): string[] | undefined
{
    return offeredEngineValues(campaignSystem(root, context), played(root, context), name);
}

/** An engine's setting as the campaign plays it (DAT-16): the one value the game offers, else the written one when the game offers it; undefined while it is to be asked. */
export function playedEngineSetting(root: string, context: Context, name: string): unknown
{
    return engineSettingValue(campaignSystem(root, context), played(root, context), name, (readSettings(root) as Record<string, unknown>)[name]);
}

/** Whether the game plays an engine's setting with one value alone (DAT-16): no choice, never asked nor shown to the player. */
export function isFixedSetting(root: string, context: Context, name: string): boolean
{
    return offeredValues(root, context, name)?.length === 1;
}

/**
 * What the setup or the game still has to ask, with the system first and the settings of the system that hold (DAT-10, DAT-17): of the engine's, without
 * those the game plays with one value, and with those written with a value it does not offer (DAT-16).
 */
export function missingWithSystems(root: string, missing: string[], context: Context): string[]
{
    const names = readableSystems(context.systemFolders).map((system) => system.name);
    const system = names.length > 0 ? `system (installed: ${names.join(", ")})` : "system";
    const written = readSettings(root) as Record<string, unknown>;
    const unoffered = (name: string): boolean => written[name] !== undefined && written[name] !== null && playedEngineSetting(root, context, name) === undefined;
    const engine = settingNames.filter((name) => (missing.includes(name) || unoffered(name)) && !isFixedSetting(root, context, name));
    // What the system adds to the setup, with its values: config says what each means (DAT-10); first those the others depend on (DAT-16, DAT-17).
    const added = heldSystemSettings(root, context).filter((setting) => playedSettingValue(root, context, setting) === undefined);
    const named = (settings: SystemSetting[]): string[] => settings.map((setting) => `${setting.name} (${valuesText(setting)})`);
    const first = named(added.filter(isLeading));
    // The system first (D-167): the other settings may depend on the game.
    return [...(engine.includes("system") ? [system, ...first, ...engine.filter((name) => name !== "system")] : [...first, ...engine]), ...named(added.filter((setting) => !isLeading(setting)))];
}

/** A setting of the system other settings depend on, which the setup asks first (DAT-16, DAT-17): a value of it offers values of the engine's, or asks another. */
export function isLeading(setting: SystemSetting): boolean
{
    return setting.values.some((value) => value.asks.length > 0 || Object.keys(value.engineSettings).length > 0);
}

/**
 * "lethality dice does not go with outcomes told: ask the player for narrative or epic, then set it with config", for each engine's setting campaign.yaml
 * writes with a value the game does not offer (DAT-16).
 */
export function unofferedLines(root: string, context: Context): string[]
{
    const system = campaignSystem(root, context);
    const written = readSettings(root) as Record<string, unknown>;
    return system === undefined ? [] : settingNames.flatMap((name) => {
        const value = written[name];
        const offered = offeredValues(root, context, name);

        if (typeof value !== "string" || offered === undefined || offered.length < 2 || offered.some((one) => sameWord(one, value))) {
            return [];
        }

        return [`${name} ${value} does not go with ${excluding(root, context, name, value)}: ask the player for ${orList(offered)}, then set it with config.`];
    });
}

/** Why the game takes no such value of an engine's setting (DAT-16), as config refuses it; undefined when it takes it, or offers them all. */
export function offerRefusal(root: string, context: Context, name: string, value: string): string | undefined
{
    const offered = offeredValues(root, context, name);

    if (offered === undefined || offered.some((one) => sameWord(one, value))) {
        return undefined;
    }

    return offered.length === 1
        ? `${name} is no choice in this game: ${excluding(root, context, name, value)} plays it ${offered[0]} alone. Nothing changed.`
        : `${name} ${value.trim()} does not go with ${excluding(root, context, name, value)}: give ${orList(offered)}. Nothing changed.`;
}

/** "outcomes told, which offers only narrative or epic": the settings of the system whose values ask a setting of its own (DAT-17), as config names them. */
export function askedBy(root: string, context: Context, name: string): string
{
    const askers = (campaignSystem(root, context)?.settings ?? []).flatMap((setting) => setting.values.filter((value) => value.asks.some((asked) => sameWord(asked, name))).map((value) => `${setting.name} ${value.value}`));
    return orList(askers);
}

/** "lethality (narrative, epic)": an engine's setting as the setup asks it, with the values the game offers; undefined when it offers them all. */
export function offeredLabel(root: string, context: Context, name: SettingName): string | undefined
{
    const offered = offeredValues(root, context, name);
    return offered === undefined ? undefined : `${name} (${offered.join(", ")})`;
}

/** The parts of the values the campaign plays (DAT-18), each after the other, as they follow the part of play. */
export function valueParts(root: string, context: Context): string
{
    return heldSystemSettings(root, context).flatMap((setting) => {
        const value = playedValueOf(setting, played(root, context));
        const text = value === undefined ? undefined : valuePart(root, context, setting.name, value.value);
        return text === undefined ? [] : [text];
    }).join("\n\n");
}

/** The part of a value of the system's setting (DAT-18), its file <setting>-<value>, with the values of the system's settings in place of {setting}; undefined when there is none. */
export function valuePart(root: string, context: Context, setting: string, value: string): string | undefined
{
    const text = partText(`${setting}-${value}`, campaignSystem(root, context));

    if (text === undefined) {
        return undefined;
    }

    // The player's choices as they are: replaceAll would read a $ in them.
    return heldSystemSettings(root, context).reduce((part, held) => {
        const chosen = playedValueOf(held, played(root, context));
        return chosen === undefined ? part : part.split(`{${held.name}}`).join(chosen.value);
    }, text);
}

/** Who keeps an engine's setting from a value: the system, or a value it plays (DAT-16). */
function excluding(root: string, context: Context, name: string, value: string): string
{
    const system = campaignSystem(root, context);
    const offering = system === undefined
        ? undefined
        : engineOfferings(system, played(root, context)).find((one) => Object.entries(one.offers).some(([setting, values]) => sameWord(setting, name) && !values.some((other) => sameWord(other, value))));
    return offering?.from ?? "this game";
}

/** The value the campaign plays of a setting of its system. */
function played(root: string, context: Context): (setting: SystemSetting) => string | undefined
{
    return (setting) => playedSettingValue(root, context, setting);
}

/** "narrative or epic". */
function orList(values: string[]): string
{
    return values.length === 1 ? values[0] : `${values.slice(0, -1).join(", ")} or ${values.at(-1) ?? ""}`;
}
