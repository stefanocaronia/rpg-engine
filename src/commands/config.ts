import { z } from "zod";
import { changeListSetting, changeSetting, checkSettingName, listSettingNames, missingSettings, readSettings, requireCampaign, type SettingName, settingNames } from "../campaign/index.ts";
import { appendLogEntry } from "../core/log.ts";
import { defineCommand } from "../core/registry.ts";
import { coinList, readAmount, readCoins } from "../money/index.ts";
import { loadWorld } from "../pages/index.ts";
import { campaignCoins, coinsShown } from "./game-money.ts";
import { readOpenScene } from "./game-scene.ts";
import { newDatedLogEntry } from "./game-time.ts";
import { missingSettingsNote } from "./notes.ts";

export const config = defineCommand({
    name: "config",
    description: "Show or change the campaign settings. "
        + "Without a setting it shows them all and says which are still missing; with a setting and a value it changes that one. "
        + "Use it at the start of a campaign, to learn what to ask the player, and whenever the player changes a setting. "
        + "lines (what never appears in the game) and veils (what happens only off screen) are lists, changed with add and remove: when the player signals stop, add that content to lines. "
        + 'coins, for a game with money whose system does not give them, lists each coin with its value in the smallest coin, with other names after a slash and "rare" for a coin never given as change; the first is the one totals are counted in. '
        + 'Example: setting language, value it; or setting lines, add "spiders"; or setting coins, value "gp 100, pp 1000 rare, ep 50 rare, sp 10, cp 1".',
    group: "campaign",
    positionals: ["setting", "value"],
    input: z.object({
        setting: z.string().optional().describe(`setting to show or change: ${settingNames.join(", ")}`),
        value: z.string().optional().describe("new value of the setting"),
        add: z.array(z.string()).optional().describe(`items to add to a list setting (${listSettingNames.join(", ")}), repeatable`),
        remove: z.array(z.string()).optional().describe(`items to remove from a list setting (${listSettingNames.join(", ")}), repeatable`),
    }),

    run(input, context)
    {
        const root = requireCampaign(context.folder);
        const listChange = input.add !== undefined || input.remove !== undefined;

        if (listChange && (input.setting === undefined || input.value !== undefined)) {
            throw new Error('Give add or remove with a list setting and no value, such as setting lines, add "spiders".');
        }

        const shown = input.setting === undefined ? settingNames : [checkSettingName(input.setting)];

        if (input.setting !== undefined && listChange && changeListSetting(root, input.setting, { add: input.add, remove: input.remove })) {
            appendLogEntry(root, newDatedLogEntry(root, context, "config-changed", "public", { setting: input.setting, add: input.add, remove: input.remove }));
        } else if (input.setting !== undefined && input.value !== undefined && changeSetting(root, input.setting, input.setting === "coins" ? newCoins(root, input.value) : input.value)) {
            appendLogEntry(root, newDatedLogEntry(root, context, "config-changed", "public", { setting: input.setting, value: input.value }));
        }

        const settings = readSettings(root);
        const valueOf = (name: SettingName) => (listSettingNames.includes(name) ? (settings[name] ?? []) : name === "coins" ? coinsShown(root) : settings[name]);
        return { settings: Object.fromEntries(shown.map((name) => [name, valueOf(name)])), missing: missingSettings(settings) };
    },

    format(result)
    {
        const lines = Object.entries(result.settings).map(([name, value]) => `${name}: ${formatValue(value)}`);
        return [lines.join("\n"), missingSettingsNote(result.missing)].filter((block) => block !== "").join("\n\n");
    },
});

/** The coins given to config, refused when money already written in the world would no longer read as money with them (MON-1). */
function newCoins(root: string, text: string): Record<string, number | string>
{
    const coins = readCoins(text);
    const before = campaignCoins(root).coins;

    if (before === undefined) {
        return coins;
    }

    const after = coinList(coins);
    const scene = readOpenScene(root).scene;
    const holders = [...loadWorld(root).pages.map((page) => ({ name: page.name, fields: page.fields })), ...Object.entries(scene?.copies ?? {}).map(([name, copy]) => ({ name, fields: copy }))];
    const lost = holders.flatMap((holder) =>
        Object.entries(holder.fields).filter(([, value]) => readAmount(value, before) !== undefined && readAmount(value, after) === undefined).map(([field, value]) => `${holder.name}: ${field} ${String(value)}`)
    );

    if (lost.length > 0) {
        const more = lost.length > 5 ? `, and ${lost.length - 5} more` : "";
        throw new Error(
            `With these coins, money already written would no longer be money: ${lost.slice(0, 5).join("; ")}${more}. Keep their coins in the list (another name works too, such as gp/mo), or change those first. Nothing changed.`,
        );
    }

    return coins;
}

function formatValue(value: unknown): string
{
    if (Array.isArray(value)) {
        return value.length > 0 ? value.join("; ") : "(none)";
    }

    return value === undefined ? "(missing)" : String(value);
}
