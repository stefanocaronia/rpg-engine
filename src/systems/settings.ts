// The system as a campaign's settings play it (DAT-10, DAT-16, DAT-17)
import { frozen } from "../core/frozen.ts";
import type { ProgressionRule } from "../core/progression-rule.ts";
import { comparableText } from "../core/text.ts";
import type { GameSystem, SystemSetting } from "./game-system.ts";

/** The settings of a system that hold, in its order (DAT-17): those no value asks, and those a value played asks; `valueOf` gives the value played. */
export function heldSettings(system: GameSystem, valueOf: (setting: SystemSetting) => string | undefined): SystemSetting[]
{
    const asked = (setting: SystemSetting): boolean => system.settings.some((other) => other.values.some((value) => value.asks.some((name) => comparableText(name) === comparableText(setting.name))));
    const held = system.settings.filter((setting) => !asked(setting));

    for (let index = 0; index < held.length; index++) {
        for (const name of playedValueOf(held[index], valueOf)?.asks ?? []) {
            const found = system.settings.find((setting) => comparableText(setting.name) === comparableText(name));

            if (found !== undefined && !held.includes(found)) {
                held.push(found);
            }
        }
    }

    return system.settings.filter((setting) => held.includes(setting));
}

/** The value of a system's setting played, with what it offers and asks; undefined while it is to be chosen. */
export function playedValueOf(setting: SystemSetting, valueOf: (setting: SystemSetting) => string | undefined): SystemSetting["values"][number] | undefined
{
    const value = valueOf(setting);
    return setting.values.find((one) => value !== undefined && comparableText(one.value) === comparableText(value));
}

/** What narrows the engine's settings (DAT-16): the system, then each value played, with whom to name. */
export function engineOfferings(system: GameSystem, valueOf: (setting: SystemSetting) => string | undefined): { from: string; offers: Record<string, string[]>; }[]
{
    return [
        { from: `the game system ${system.name}`, offers: system.engineSettings },
        ...heldSettings(system, valueOf).flatMap((setting) => {
            const value = playedValueOf(setting, valueOf);
            return value === undefined ? [] : [{ from: `${setting.name} ${value.value}`, offers: value.engineSettings }];
        }),
    ];
}

/** The values a game offers of an engine's setting (DAT-16): those the system and the values played share; undefined when none of them narrows it. */
export function offeredEngineValues(system: GameSystem | undefined, valueOf: (setting: SystemSetting) => string | undefined, name: string): string[] | undefined
{
    const lists = (system === undefined ? [] : engineOfferings(system, valueOf)).flatMap((offering) => Object.entries(offering.offers).filter(([setting]) => comparableText(setting) === comparableText(name)).map(([, values]) => values));
    return lists.length === 0 ? undefined : lists.reduce((shared, list) => shared.filter((value) => list.some((other) => comparableText(other) === comparableText(value))));
}

/** An engine's setting as a game plays it (DAT-16): the one value it offers, else the written one when it offers it; undefined while it is to be asked. */
export function engineSettingValue(system: GameSystem | undefined, valueOf: (setting: SystemSetting) => string | undefined, name: string, written: unknown): unknown
{
    const offered = offeredEngineValues(system, valueOf, name);

    if (offered === undefined) {
        return written;
    }

    return offered.length === 1 ? offered[0] : offered.find((value) => typeof written === "string" && comparableText(value) === comparableText(written));
}

/**
 * The system as a campaign plays it, with the values its settings have (DAT-10): the fields a value leaves out are gone from the sheet, the line, the experience
 * and the rewards. A setting without a value, or with one the system lacks, leaves out nothing.
 */
export function withSettings(system: GameSystem, valueOf: (setting: string) => string | undefined): GameSystem
{
    // A setting asked by a value the campaign does not play does not hold, nor what its value leaves out (DAT-17).
    const leftOut = heldSettings(system, (setting) => valueOf(setting.name)).flatMap((setting) => {
        const chosen = valueOf(setting.name);
        return setting.values.find((value) => chosen !== undefined && comparableText(value.value) === comparableText(chosen))?.without ?? [];
    });

    if (leftOut.length === 0) {
        return system;
    }

    const kept = (field: string): boolean => !leftOut.some((name) => comparableText(name) === comparableText(field));
    const progression = system.progression === undefined ? undefined : withoutExperience(system.progression, kept);
    return frozen({
        ...system,
        sheet: system.sheet.map((group) => ({ ...group, entries: group.entries.filter((entry) => kept(entry.field)) })).filter((group) => group.entries.length > 0),
        statusLine: system.statusLine.filter((entry) => kept(entry.field)),
        ...(progression === undefined ? {} : { progression }),
        rewards: system.rewards.filter((reward) => kept(reward.field)),
        leftOut,
    });
}

/** The progression without its experience, when a setting leaves its field out (DAT-10). */
function withoutExperience(progression: ProgressionRule, kept: (field: string) => boolean): ProgressionRule
{
    if (progression.experience === undefined || kept(progression.experience.field)) {
        return progression;
    }

    const rest = { ...progression };
    delete rest.experience;
    return rest;
}
