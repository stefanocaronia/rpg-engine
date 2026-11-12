// The items of a custom difficulty or rigor: which setting holds them, as written, as given (T-132)
import { customSettings, leveled, type LeveledSetting, readOneSetting } from "../../campaign/index.ts";
import { comparableText } from "../../core/text.ts";
import { entriesOf } from "./entries.ts";

/** The difficulty or rigor whose items a setting holds: difficulty for custom-difficulty; undefined for any other (T-132). */
export function customOf(name: string): LeveledSetting | undefined
{
    return name.trim() === customSettings.difficulty ? "difficulty" : name.trim() === customSettings.rigor ? "rigor" : undefined;
}

/** The items of a custom difficulty or rigor as campaign.yaml writes them, for its meaning; undefined for another setting. */
export function customWritten(root: string, name: string): unknown
{
    return name === "difficulty" || name === "rigor" ? readOneSetting(root, customSettings[name]) : undefined;
}

/** The items of a custom difficulty or rigor as config takes them, food: rules, each checked and named as the engine names it (T-132). */
export function customEntries(setting: LeveledSetting, text: string): Record<string, string>
{
    const { items, levels } = leveled[setting];
    // food: rules, load: smooth as the master says it, and as YAML writes it, {food: rules, load: smooth}.
    const written = text.trim().startsWith("{") ? text : `{${text}}`;
    const entries = Object.entries(entriesOf(customSettings[setting], written)).map(([item, level]) => {
        const known = items.find((one) => comparableText(one) === comparableText(item));
        const at = levels.find((one) => typeof level === "string" && comparableText(one) === comparableText(level));

        if (known === undefined) {
            throw new Error(`${item} is no item of the custom ${setting}: they are ${items.join(", ")}. Nothing changed.`);
        }

        if (at === undefined) {
            throw new Error(
                level === null
                    ? `${known} needs its level, ${levels.join(", ")}: write it as ${known}: ${levels[1]}. Nothing changed.`
                    : `${known} takes ${levels.join(", ")}, not ${String(level)}. Nothing changed.`,
            );
        }

        return [known, at];
    });
    return Object.fromEntries(entries);
}
