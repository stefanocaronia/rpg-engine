// What a campaign or an extension adds to its system, merged over it (CAM-1, CAM-2)
import { comparableText } from "../core/text.ts";
import { isMap, nameIn } from "./maps.ts";

/** What campaign.yaml adds to the game system, as it writes it: checked when the system is read with it (CAM-3). */
export type CampaignData = Partial<Record<(typeof campaignDataNames)[number], unknown>>;

/** What an extension or the campaign adds to the game system (CAM-1, CAM-2): from where, as messages name it, and what. */
export interface SystemLayer
{
    from: string;
    data: CampaignData;
}

/** What a campaign may add to its game system in campaign.yaml (CAM-1): its own fields, tables, formulas, counters, recipes, line of the player character and travel. */
export const campaignDataNames = ["fields", "tables", "computed", "counters", "recipes", "status-line", "travel", "values", "condition-icons"] as const;

/**
 * A system's data with a campaign's additions over it (CAM-2): fields, tables, formulas and counters by name, the campaign's taking the place of the system's
 * with that name; a recipe added to the system's of that name, field by field, with its occasions and rules; the line's fields after the system's; travel key
 * by key, its paces, terrain, vehicles and kinds by name.
 */
export function withCampaignData(raw: unknown, data: CampaignData): Record<string, unknown>
{
    const base = isMap(raw) ? raw : {};
    const merged: Record<string, unknown> = { ...base };

    for (const key of ["fields", "tables", "computed", "counters", "condition-icons"] as const) {
        const added = mapOf(data[key], key);
        merged[key] = added === undefined ? base[key] : { ...withoutNames(isMap(base[key]) ? base[key] : {}, Object.keys(added)), ...added };
    }

    const recipes = mapOf(data.recipes, "recipes");

    if (recipes !== undefined) {
        const own = isMap(base.recipes) ? base.recipes : {};
        merged.recipes = { ...own, ...Object.fromEntries(Object.entries(recipes).map(([recipe, added]) => [nameIn(own, recipe) ?? recipe, recipeWith(own[nameIn(own, recipe) ?? ""], added, recipe)])) };
    }

    const travel = mapOf(data.travel, "travel");

    if (travel !== undefined) {
        const own = isMap(base.travel) ? base.travel : {};
        const byName = (key: string): unknown => (isMap(travel[key]) ? { ...withoutNames(isMap(own[key]) ? own[key] : {}, Object.keys(travel[key])), ...travel[key] } : own[key]);
        merged.travel = Object.fromEntries(Object.entries({ ...own, ...travel, paces: byName("paces"), terrain: byName("terrain"), vehicles: byName("vehicles"), kinds: byName("kinds") }).filter(([, value]) => value !== undefined));
    }

    const names = mapOf(data.values, "values");

    if (names !== undefined) {
        // A campaign's own names, as a language of its world, join the system's list, on the sheet or everywhere (D-435).
        const onSheet = isMap(base["sheet-values"]) ? { ...base["sheet-values"] } : {};
        const everywhere = isMap(base.values) ? { ...base.values } : {};

        for (const [field, added] of Object.entries(names)) {
            if (!Array.isArray(added)) {
                throw new Error(`values.${field}: give the names the campaign adds as a list, such as ${field}: [Lingua dei Guadi].`);
            }

            const target = nameIn(onSheet, field) !== undefined ? onSheet : everywhere;
            const key = nameIn(target, field) ?? field;
            const own = Array.isArray(target[key]) ? target[key].map(String) : [];
            target[key] = [...own, ...added.map(String).filter((name) => !own.some((other) => comparableText(other) === comparableText(name)))];
        }

        merged.values = everywhere;
        merged["sheet-values"] = onSheet;
    }

    const line = data["status-line"];

    if (line !== undefined && line !== null) {
        if (!Array.isArray(line)) {
            throw new Error("status-line: give it as a list of fields, such as [portent?].");
        }

        const own = Array.isArray(base["status-line"]) ? base["status-line"].map(String) : [];
        const plain = (entry: string): string => comparableText(entry.replace(/\?$/, ""));
        const added = line.map(String).filter((entry, index, all) => all.findIndex((other) => plain(other) === plain(entry)) === index);
        merged["status-line"] = [...own, ...added.filter((entry) => !own.some((other) => plain(other) === plain(entry)))];
    }

    return merged;
}

/** A system's recipe with a campaign's over it (CAM-2): what both set and regain, the campaign's first, and the occasions and rules of both. */
function recipeWith(own: unknown, added: unknown, name: string): Record<string, unknown>
{
    if (!isMap(added)) {
        throw new Error(`recipes.${name}: give it as what it sets, regains, ends and the rules to read, such as {set: {bulwark-dice: max}}.`);
    }

    const base = isMap(own) ? own : {};
    const map = (key: string): Record<string, unknown> | undefined =>
        isMap(base[key]) || isMap(added[key]) ? { ...withoutNames(isMap(base[key]) ? base[key] : {}, Object.keys(isMap(added[key]) ? added[key] : {})), ...(isMap(added[key]) ? added[key] : {}) } : undefined;

    const list = (key: string): unknown[] | undefined => {
        const items = [...(Array.isArray(base[key]) ? base[key] : []), ...(Array.isArray(added[key]) ? added[key] : [])];
        return items.length === 0 ? undefined : items.filter((item, index) => items.findIndex((other) => comparableText(String(other)) === comparableText(String(item))) === index);
    };

    const merged = { ...base, ...added, set: map("set"), regain: map("regain"), lower: map("lower"), ends: list("ends"), rules: list("rules") };
    return Object.fromEntries(Object.entries(merged).filter(([, value]) => value !== undefined));
}

/** An addition that must be a map by name, such as counters; undefined when the campaign gives none. */
function mapOf(value: unknown, key: string): Record<string, unknown> | undefined
{
    if (value === undefined || value === null) {
        return undefined;
    }

    if (!isMap(value)) {
        throw new Error(`${key}: give it as a map by name, such as {bulwark-dice: ...}.`);
    }

    return value;
}

/** The entries of a map whose names are none of these, as names are compared. */
function withoutNames(map: Record<string, unknown>, names: string[]): Record<string, unknown>
{
    return Object.fromEntries(Object.entries(map).filter(([name]) => !names.some((other) => comparableText(other) === comparableText(name))));
}
