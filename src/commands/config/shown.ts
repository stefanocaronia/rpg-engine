// A setting as config shows it
import { type CampaignSettings, entrySettingNames, listSettingNames, readTextSetting, settingMeaning, type SettingName, setupSettingNames } from "../../campaign/index.ts";
import { type Context, engineSystemsFolder } from "../../core/context.ts";
import { isInside } from "../../core/store.ts";
import { getVersion } from "../../core/version.ts";
import { findSystem, readableSystems, rulesetSetting, systemPackage, type SystemSetting } from "../../systems/index.ts";
import { libraryShown } from "../shared/books/library.ts";
import { coinsShown } from "../shared/campaign/money.ts";
import { isFixedSetting, offeredValues, playedEngineSetting } from "../shared/campaign/offers.ts";
import { campaignSystem, countedByGame, playedRules, playedSettingValue } from "../shared/campaign/world.ts";
import { customWritten } from "./custom-levels.ts";

/** A setting as config shows it: a list or entries by name, none when missing; the coins and the system as they read (MON-7, D-173); difficulty and rigor with what they mean (D-263). */
export function shownValue(root: string, context: Context, settings: CampaignSettings, name: SettingName): unknown
{
    const meaning = settingMeaning(name, settings[name], countedByGame(campaignSystem(root, context)), customWritten(root, name));

    if (meaning !== undefined) {
        return `${String(settings[name])}: ${meaning}`;
    }

    // The library with what is read of each entry, and what is skipped (LIB-5).
    if (name === "library") {
        return libraryShown(root, context);
    }

    // Lines and veils not yet answered are missing: [] is the answer none (MOD-3).
    if (listSettingNames.includes(name)) {
        return settings[name] ?? (setupSettingNames.includes(name) ? undefined : []);
    }

    if (entrySettingNames.includes(name)) {
        return settings[name] ?? {};
    }

    // How the master writes, unset: the core's own ways, never missing (D-395).
    // And the master's effort, unset: each app's own, the player's to choose (D-462); who voices the characters, unset: auto (D-490); the master's rolls, behind the screen (D-287); the game time between sessions, stopped (D-133).
    const own: Record<string, string> = {
        prose: "plain (as your instructions write)",
        story: "situations (as your instructions write)",
        author: "(none)",
        style: "(none)",
        effort: "(the app's own: the player's to choose)",
        voices: "auto (a subagent at key moments, as you choose, where the app has them)",
        "master-rolls": "behind the screen (unset: roll hides your rolls for foes and NPCs)",
        "between-sessions": "stops (unset: no game time passes between sessions)",
    };

    if (settings[name] === undefined && Object.hasOwn(own, name)) {
        return own[name];
    }

    return name === "coins" ? coinsShown(root, context) : name === "system" ? systemShown(root, settings.system, context) : settings[name];
}

/** An engine's setting as config shows it where the game offers only some of its values (DAT-16): the one it plays alone, or missing with those it offers. */
export function offeredShown(root: string, context: Context, name: string, shown: unknown): unknown
{
    const offered = offeredValues(root, context, name);

    if (offered === undefined) {
        return shown;
    }

    if (isFixedSetting(root, context, name)) {
        return `${offered[0]} (the only one this game plays: no choice)`;
    }

    return playedEngineSetting(root, context, name) === undefined ? `(missing; ${offered.join(", ")})` : shown;
}

/** A setting of the system as config shows it: its value with what it means, or missing with every value and what it means (DAT-10). */
export function systemShownValue(root: string, context: Context, setting: SystemSetting): string
{
    const value = playedSettingValue(root, context, setting);
    const chosen = setting.values.find((candidate) => candidate.value === value);
    return chosen === undefined ? `(missing; ${setting.values.map((candidate) => `${candidate.value}: ${candidate.means}`).join("; ")})` : `${chosen.value}: ${chosen.means}`;
}

/**
 * The system as config shows it (D-173): what it is, the version of its rules it is played with (VER-1), and the package that brings it with its version, or the
 * engine for one it ships without a package; missing or not installed, with those that are (D-167).
 */
function systemShown(root: string, system: string | undefined, context: Context): string
{
    const installed = `installed: ${readableSystems(context.systemFolders).map((installedSystem) => installedSystem.name).join(", ") || "none"}`;

    if (system === undefined) {
        return `(missing; ${installed})`;
    }

    const found = findSystem(context.systemFolders, system, readTextSetting(root, rulesetSetting));

    if (found === undefined) {
        return `${system} (not installed; ${installed})`;
    }

    const own = systemPackage(found.folder);
    const shipped = isInside(engineSystemsFolder, found.folder);
    const from = own !== undefined ? ` (${own.package} ${own.version})` : shipped ? ` (rpg-engine ${getVersion()})` : "";
    return `${found.name}, ${found.title}${playedRules(root, context, found)}${from}`;
}
