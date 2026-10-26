import { join } from "node:path";
import { type Document, isMap, isScalar, isSeq, parseDocument, type YAMLSeq } from "yaml";
import { z } from "zod";
import { unitSystems } from "../core/length.ts";
import type { Problem } from "../core/problem.ts";
import { files } from "../core/store.ts";
import { comparableText } from "../core/text.ts";
import { readYamlFile, readYamlValues, writeYamlFile } from "../core/yaml-file.ts";
import { campaignFileName } from "./find-campaign.ts";

const settingsHold = 'settings, such as "name: ..."';

/** How hard the world plays (D-13, D-141). */
export const difficulties = ["story", "easy", "normal", "hard", "brutal"] as const;

/** What a fall means (D-13, D-141): the character never dies, dies only when it matters, or as the dice say. */
export const lethalities = ["narrative", "epic", "dice"] as const;

/** When the game may go back (D-55): never, to the last end of a scene once the player character dies, or to any save, which the player may also ask for. */
export const saveModes = ["permadeath", "checkpoint", "free"] as const;

/** How closely the rules are followed, apart from difficulty (D-42): the master glosses over them, as they are written, or beyond them. */
export const rigors = ["smooth", "rules", "simulation"] as const;

/** What each difficulty means in play, from the GDD's table, which status and config give for the chosen one (D-263); fights in the words of a budget of low, moderate and high (D-266). */
export const difficultyMeanings: Record<(typeof difficulties)[number], string> = {
    story: "fights low; foes naive, at their weakest, quick to flee; clues obvious, four or more; resources plentiful; random encounters rare; threat clocks slow; you may soften your own rolls",
    easy: "fights low to moderate; foes with simple tactics, below average toughness; three clues or more; resources generous; random encounters rare; threat clocks slow",
    normal: "fights moderate to high; foes with sensible tactics, average toughness, normal morale; three clues to every conclusion; resources standard (treasure, supplies, prices); "
        + "random encounters normal; threat clocks at their pace",
    hard: "fights high and beyond; foes smart (focus, control), above average toughness, tenacious; three subtle clues; resources scarce; random encounters frequent; threat clocks fast",
    brutal: "fights far beyond high; foes optimized (retreats, ambushes, finishing the fallen), at their toughest, fanatical; three subtle clues; resources very scarce; "
        + "random encounters frequent; threat clocks fast; rests at their harshest",
};

/** What each rigor means in play (D-42, D-263): what the master counts, which status and config give for the chosen one. */
export const rigorMeanings: Record<(typeof rigors)[number], string> = {
    smooth: "you gloss over food and water, light, encumbrance, fatigue and the like: count them only when the story turns on them",
    rules: "as written: charge with change what is used up; encumbrance, fatigue and the like as the rules say; warn before something runs out, and once it has, the rule applies",
    simulation: "as rules, and beyond what is written: wear, spoilage, weather and the like",
};

/** What the game system counts itself (UPK-1, UPK-3): the day's food, and what burns as it is lit, by its first name; what a rigor's meaning adds of them. */
export interface CountedByGame
{
    upkeep: boolean;
    burning?: string;
}

/** A rigor's meaning with what the game counts itself said (review of 17 October): a game that counts no food is never promised it. */
function rigorMeaning(rigor: string, counted: CountedByGame | undefined): string | undefined
{
    const meaning = (rigorMeanings as Record<string, string>)[rigor];
    const burns = counted?.burning === undefined ? "" : `an effect named after what burns, such as ${counted.burning}, spends it as it is lit`;

    if (meaning === undefined || rigor === "simulation" || counted === undefined) {
        return meaning;
    }

    if (rigor === "smooth") {
        return burns === "" ? meaning : `${meaning}; a light you put on as an effect, as a ${counted.burning}, still spends one`;
    }

    const food = counted.upkeep ? "advance spends the day's food outside a settlement; water, lifestyle and wages are yours to charge" : "";
    const counts = [food, burns].filter((part) => part !== "").join("; ");
    return counts === "" ? meaning : meaning.replace("charge with change what is used up; ", `charge with change what is used up; ${counts}; `);
}

/** How much the master teaches the game, out of the story (D-347): the story alone, a hint now and then, or each rule as it first comes up. */
export const mentorWays = ["off", "hints", "tutorial"] as const;

/** What each way of the mentor means to the master, which config gives for the chosen one, and the player's change of it on the dashboard (D-347). */
export const mentorMeanings: Record<(typeof mentorWays)[number], string> = {
    off: "the story alone: no tips or explanations of yours, only your answers to what the player asks between brackets",
    hints: "a tip of a sentence or two, in brackets, before a choice that matters and when a rule slips by, as the mentor's part of your instructions says; no lessons",
    tutorial: "each mechanic explained the first time it comes up, the whole sum of a roll shown, a debrief after fights and at the end of a session, "
        + "as the mentor's part of your instructions says",
};

/**
 * What the chosen difficulty, rigor or mentor means, as status and config give it, the rigor with what the game counts itself; undefined for another setting
 * or a value it does not take.
 */
export function settingMeaning(name: string, value: unknown, counted?: CountedByGame): string | undefined
{
    if (name === "rigor" && typeof value === "string") {
        return rigorMeaning(value, counted);
    }

    const meanings: Record<string, Record<string, string> | undefined> = { difficulty: difficultyMeanings, rigor: rigorMeanings, mentor: mentorMeanings, ...styleMeanings };
    const own = Object.hasOwn(meanings, name) ? meanings[name] : undefined;
    return typeof value === "string" && own !== undefined && Object.hasOwn(own, value) ? own[value] : undefined;
}

/** Who rolls the player character's dice (D-241): rpg, or the player with their own, telling the values; the master's are always rolled by rpg. */
export const diceWays = ["digital", "physical"] as const;

/** Whether the master's rolls for anyone outside the party are hidden (D-287): behind the screen, unset too, or in view; the party's are always shown. */
export const masterRollWays = ["behind the screen", "in view"] as const;

/**
 * Who voices the characters (D-490), where the AI app has subagents: a character as a subagent of its own at key moments, the master chooses (auto); the master
 * always; always for the companions and the main characters; always for everyone.
 */
export const voiceWays = ["master", "auto", "important", "always"] as const;

export { unitSystems };

/** Which pictures the engine has made, where it can (D-308, D-388, D-420): none, only those the player asks for, or one for each new place, quest and one met. */
export const pictureWays = ["none", "on request", "new elements"] as const;

/** How much the master thinks before each answer, written for each AI app in the campaign's folder (D-462). */
export const efforts = ["low", "medium", "high"] as const;

/** How the companions come (D-76, D-221): none, made in session zero with the player or by the master, or met in play. */
export const companionWays = ["none", "made with the player", "made by the master", "met in play"] as const;

/** How far ahead a world without a written campaign is made (D-80): as it is needed, or all at the start. */
export const preparations = ["on the fly", "all at the start"] as const;

/** How the master writes (D-395): plain, the core's own, literary, pulp or wry; the tone stays in the premise, and an author takes its place. */
export const proseWays = ["plain", "literary", "pulp", "wry"] as const;

/** How the master builds what they invent (D-395): situations, the core's own, arcs, episodes or a mystery; a written adventure keeps its own. */
export const storyWays = ["situations", "arcs", "episodes", "mystery"] as const;

/** The longest text the player's own words of how the master writes may be, by setting (D-395). */
export const styleTextLengths = { author: 80, style: 300 } as const;

/** What each way of writing and of building the story means to the master, which config gives for the chosen one (D-395). */
const styleMeanings: Record<string, Record<string, string>> = {
    prose: {
        plain: "short sentences, one concrete detail a thing, as your instructions write",
        literary: "more room at the high points, images and subtext, as the prose part of your instructions says",
        pulp: "tense action, strong colours, every message ending on a threat or a hook, as the prose part of your instructions says",
        wry: "a narrator with a half smile at the world, never at the character, as the prose part of your instructions says",
    },
    story: {
        situations: "a world of factions, threats with their clocks and places with secrets, no main plot, as your instructions write",
        arcs: "a central threat that advances by stages, the party's own arcs woven in, as the story part of your instructions says",
        episodes: "a story that closes each session, with a thread that comes back, as the story part of your instructions says",
        mystery: "every story an investigation, its truth written first in the secrets, as the story part of your instructions says",
    },
};

/** An item of a list setting. Written by hand without quotes, "Poisoned: la benda…" is YAML for a pair: it is read as the text it was meant to be (D-179). */
const listItem = z.preprocess((item) => pairText(item) ?? item, z.string().min(1));

/** A list setting; an empty item written by hand, as - "", holds nothing and is left out, so that it never stops the game. */
const listSetting = z.preprocess((items) => (Array.isArray(items) ? items.filter((item) => item !== null && String(item).trim() !== "") : items), z.array(listItem)).nullish();

/** The player's own words in a setting, on one line: a line break in them would be read as a heading of the instructions they go into (D-395). */
function oneLine(most: number)
{
    return z.preprocess((value) => (typeof value === "string" ? value.replace(/\s+/g, " ").trim() : value), z.string().min(1).max(most));
}

/** The settings of a campaign, kept in campaign.yaml. Other keys are kept: systems and extensions will add their own. */
export const settingsSchema = z.object({
    name: z.string().min(1).describe("name of the campaign"),
    language: z.string().regex(/^[a-z]{2,3}(-[A-Za-z0-9]{2,8})*$/, "use a language code such as it, en or pt-BR").optional().describe("language of the game, as a code such as it or en"),
    system: z.string().min(1).optional().describe("game system of the campaign: one of those installed, such as 5e"),
    mentor: z.enum(mentorWays).optional().describe(
        "how much the master teaches the game, out of the story: off, hints or tutorial; asked as how well the player knows the game: never played (tutorial), a little (hints), well (off)",
    ),
    premise: z.string().min(1).optional().describe("without a written campaign: the genre, the tone and a few elements of the world, in the player's words"),
    preparation: z.enum(preparations).optional().describe("without a written campaign: on the fly (the master makes the world just before it is needed) or all at the start"),
    prose: z.enum(proseWays).optional().describe("how the master writes, as the player chose it: plain, literary, pulp or wry; the tone stays in the premise; an author takes its place"),
    story: z.enum(storyWays).optional().describe("how the master builds what they invent: situations, arcs, episodes or mystery; a written adventure keeps its own"),
    author: oneLine(styleTextLengths.author).optional().describe("an author the master writes like, as the player named them: their way, never their sentences, names or places"),
    style: oneLine(styleTextLengths.style).optional().describe("the player's own wishes for how the master writes, in a few words, such as third person, past tense"),
    difficulty: z.enum(difficulties).optional().describe(`how hard the world plays: ${difficulties.join(", ")}`),
    lethality: z.enum(lethalities).optional().describe("what a fall means: narrative (the character never dies), epic (only when it matters) or dice (the dice decide)"),
    saves: z.enum(saveModes).optional().describe(
        "when the game may go back: permadeath (never, but to the start, the campaign starting over), checkpoint (to the last end of a scene, once the player character dies) or free (to any save, and saves when the player asks)",
    ),
    rigor: z.enum(rigors).optional().describe("how closely travel, fatigue, food and the like follow the rules: smooth (the master glosses over them), rules (as written) or simulation (beyond them)"),
    dice: z.enum(diceWays).optional().describe("the player character's dice: digital (rpg rolls them) or physical (the player rolls their own and tells the values)"),
    "master-rolls": z.enum(masterRollWays).optional().describe(
        "the master's rolls for foes and anyone else outside the party: behind the screen (roll hides them, the master telling only the outcome) or in view (roll shows them); "
            + "the party's rolls are always shown; unset, behind the screen",
    ),
    units: z.enum(unitSystems).optional().describe("the units of measure of the story: metric or imperial"),
    voices: z.enum(voiceWays).optional().describe(
        "who voices the characters, where the AI app has subagents, from the master to the characters: master (the master, always), auto (at key moments, as the master chooses, "
            + "a character answers as a subagent of its own, knowing only what it knows), important (always a subagent for the companions and the characters with kind main), "
            + "always (always a subagent, for everyone); unset, auto",
    ),
    companions: z.enum(companionWays).optional().describe("how the companions come: none, made with the player or made by the master in session zero, or met in play"),
    // Checked by the time module against the calendar (TIM-8).
    "calendar-start": z.string().min(1).optional().describe("when the story starts: day 1 to count only the days, or the day of the world's calendar that is day 1, such as 14 April 1491"),
    // new places and new places and quests, as campaigns wrote it before quests and then those met had pictures, are read as the value that took their place (D-388, D-420).
    pictures: z.preprocess((value) => (value === "new places" || value === "new places and quests" ? "new elements" : value), z.enum(pictureWays)).optional().describe(
        "the pictures of places, quests and those met the engine has made on this computer, which spend the player's plan, Codex's or Claude's: none, on request (those the player asks for) "
            + "or new elements (one for each new place and quest, and for each character and kind of creature the character meets)",
    ),
    effort: z.enum(efforts).optional().describe(
        "how much the master thinks before each answer, the player's to choose: low, medium or high, written where Claude Code and Codex read it in the campaign's folder; "
            + "unset, each app keeps its own",
    ),
    lines: listSetting.describe("what never appears in the game"),
    veils: listSetting.describe("what happens only off screen, without details"),
    table: listSetting.describe("the table's agreements: what the master promised about how the game is played"),
    precedents: listSetting.describe("the rulings made without the text, each starting with the name of the rule in the system's language: Poisoned: …"),
    learned: listSetting.describe("the game's mechanics the master has explained, by their names in the system's language: explained again only when the player gets one wrong"),
    library: listSetting.describe("the player's library (D-491): folders of their books, or books, by full path, which rules searches after the game system"),
    // Checked by the money module (MON-1): coins written wrongly by hand must not stop the other settings from being read.
    coins: z.unknown().optional().describe("the coins, for a game with money: each with its value in the smallest coin, such as gp 100, sp 10, cp 1"),
    // Checked by the time module (TIM-8): a mistake there never stops the game, whose date stays day N.
    calendar: z.unknown().optional().describe("the months of the campaign's own calendar, in place of the real ones and an extension's: months: [{name: January, days: 31, season: winter}, ...]"),
    // What the campaign adds to its game system (CAM-1): checked by the systems module when it reads the system with them, so that a mistake there never hides the
    // other settings.
    fields: z.unknown().optional().describe("fields the campaign adds to its game system, by name with their kind, such as portent: rolls"),
    tables: z.unknown().optional().describe("tables the campaign adds to its game system, by name, such as bulwark-dice-by-level: {3: 4, 7: 5, 15: 6}"),
    computed: z.unknown().optional().describe("formulas the campaign adds to its game system or puts in place of its own, as a house rule, by field"),
    counters: z.unknown().optional().describe("counters the campaign adds to its game system or changes: their limits and what comes back with a rest, by name"),
    recipes: z.unknown().optional().describe("what the campaign adds to the rests of its game system, by recipe, such as short rest: {set: {bulwark-dice: max}}"),
    "status-line": z.unknown().optional().describe("fields the campaign adds to the line of the player character and the companions, such as portent?"),
    travel: z.unknown().optional().describe("what the campaign adds to how its game system travels, by key: paces, hours, terrain and kinds of road, such as kinds: {canal: {}}"),
    values: z.unknown().optional().describe("names the campaign adds to the closed lists of its game system, by field, such as languages: [Lingua dei Guadi]"),
    "condition-icons": z.unknown().optional().describe("the drawings of effects on the dashboard by their names, over the game system's: the d of an SVG path on a grid of 24, such as Benedizione: M12 3v18"),
    // Checked against the campaign's extensions when it is written (D-502): one written wrongly by hand leaves the extension's place.
    widgets: z.unknown().optional().describe("where the dashboard shows the extensions' widgets, by extension.widget: top, side, scene, sheet, world, journal or off, such as weather.today: side"),
}).loose();

export type CampaignSettings = z.infer<typeof settingsSchema>;
export type SettingName = keyof typeof settingsSchema.shape;

/** The settings that the config command shows and changes. */
export const settingNames = Object.keys(settingsSchema.shape) as SettingName[];

/** The settings that hold a list, changed one item at a time; none of them is ever missing in play. */
export const listSettingNames: SettingName[] = ["lines", "veils", "table", "precedents", "learned", "library", "status-line"];

/** The settings that hold entries by name, what the campaign adds to its game system (CAM-1): given or removed one entry at a time. */
export const mapSettingNames: SettingName[] = ["fields", "tables", "computed", "counters", "recipes", "travel", "values", "condition-icons"];

/** The settings that hold entries by name: what the campaign adds to its game system, and where the dashboard shows the extensions' widgets (D-502). */
export const entrySettingNames: SettingName[] = [...mapSettingNames, "widgets"];

/**
 * What only the setup asks (D-241, MOD-3, D-347, D-287): how much the master teaches the game, whether the master's rolls are shown, how the companions come,
 * when the story starts, and the lines and veils, which "none" answers too.
 */
export const setupSettingNames: SettingName[] = ["mentor", "master-rolls", "companions", "calendar-start", "lines", "veils"];

/** What the setup asks only of a campaign without a written world (D-79, D-80, MOD-3). */
export const premiseSettingNames: SettingName[] = ["premise", "preparation"];

// Settings that only some games have, or that only the setup asks: never asked for in play when missing.
// The pictures: status asks for them once, only where they can be made (D-308).
// How the master writes: the core's own until the player chooses (D-395).
const styleSettingNames: SettingName[] = ["prose", "story", "author", "style"];
const optionalSettingNames: SettingName[] = ["coins", "pictures", "effort", "voices", "calendar", "calendar-start", ...entrySettingNames, ...setupSettingNames, ...premiseSettingNames, ...styleSettingNames];

export function readSettings(root: string): CampaignSettings
{
    return validateSettings(readYamlValues(join(root, campaignFileName), settingsHold));
}

/** The coins as campaign.yaml writes them, unchecked and read on their own, so that a mistake in another setting does not hide them; the money module checks them (MON-1). */
export function readCoinsSetting(root: string): unknown
{
    return readOneSetting(root, "coins");
}

/**
 * A text setting as campaign.yaml writes it, such as the system or the language, read even when another setting breaks the file: YAML still gives the keys it can (SYS-1).
 * Undefined when it is missing, not text, or the file cannot be read.
 */
export function readTextSetting(root: string, name: string): string | undefined
{
    try {
        const value: unknown = parseDocument(files().text(join(root, campaignFileName)) ?? "").get(name);
        return typeof value === "string" ? value : undefined;
    } catch {
        return undefined;
    }
}

/** A list setting as campaign.yaml writes it, read even when another setting breaks the file, as the system is (SYS-1): what rules reads. Empty when it cannot be read. */
export function readListSetting(root: string, name: SettingName): string[]
{
    try {
        const value: unknown = parseDocument(files().text(join(root, campaignFileName)) ?? "").toJS()?.[name];
        return Array.isArray(value) ? value.map((item: unknown) => pairText(item) ?? item).filter((item): item is string => typeof item === "string" && item.trim() !== "") : [];
    } catch {
        return [];
    }
}

export function readOneSetting(root: string, name: string): unknown
{
    const values = readYamlValues(join(root, campaignFileName), settingsHold);
    return values !== null && typeof values === "object" ? (values as Record<string, unknown>)[name] : undefined;
}

/**
 * Changes one setting and keeps the rest of campaign.yaml, comments included, as it is. Nothing is written if the setting already has that value, or if the settings would not be valid.
 * Returns whether it changed. The value is text, or for coins the list already read.
 */
export function changeSetting(root: string, name: string, value: unknown): boolean
{
    const setting = checkSettingName(name);

    if (listSettingNames.includes(setting)) {
        throw new Error(`"${setting}" is a list: change it one item at a time with add and remove, or give the value none when the player wants none.`);
    }

    const parsed = settingsSchema.shape[setting].safeParse(value);

    if (!parsed.success) {
        throw new Error(`"${String(value)}" is not a valid ${setting}:\n${z.prettifyError(parsed.error)}`);
    }

    const document = readSettingsDocument(root);

    if (JSON.stringify((document.toJS() as Record<string, unknown> | null)?.[setting]) === JSON.stringify(parsed.data)) {
        return false;
    }

    document.set(setting, parsed.data);
    saveSettings(root, document);
    return true;
}

/** Takes away a setting the player may leave unset again, as the author the master writes like (D-395). Returns whether it changed. */
export function clearSetting(root: string, name: string): boolean
{
    const setting = checkSettingName(name);
    const document = readSettingsDocument(root);

    if (!document.has(setting)) {
        return false;
    }

    document.delete(setting);
    saveSettings(root, document);
    return true;
}

/**
 * Writes a setting that is not the campaign's own but one a game system adds (DAT-10), as text, keeping the rest of campaign.yaml as it is; its value is checked by
 * who knows the system. Returns whether it changed.
 */
export function changeOtherSetting(root: string, name: string, value: string): boolean
{
    if ((settingNames as string[]).some((setting) => comparableText(setting) === comparableText(name))) {
        throw new Error(`${name} is a setting of the campaign: change it as one.`);
    }

    const document = readSettingsDocument(root);

    if ((document.toJS() as Record<string, unknown> | null)?.[name] === value) {
        return false;
    }

    document.set(name, value);
    saveSettings(root, document);
    return true;
}

/** Adds items to a list setting, or removes them, keeping the rest of campaign.yaml as it is. Returns whether it changed. */
export function changeListSetting(root: string, name: string, change: { add?: string[]; remove?: string[]; }): boolean
{
    const setting = checkSettingName(name);

    if (!listSettingNames.includes(setting)) {
        throw new Error(`"${setting}" holds one value: give the new value instead of add or remove.`);
    }

    if ([...(change.add ?? []), ...(change.remove ?? [])].some((item) => item.trim() === "")) {
        throw new Error("Give the text of each item to add or remove.");
    }

    const document = readSettingsDocument(root);
    const list = listNode(document, setting);
    const before = JSON.stringify(list.toJSON());
    const items = (): string[] => list.items.map((node) => String(isScalar(node) ? node.value : node));

    const held = items();
    const missing = (change.remove ?? []).find((item) => !held.some((other) => sameText(other, item)));

    if (missing !== undefined) {
        throw new Error(`"${setting}" does not hold "${missing}", so nothing changed. It holds: ${held.length > 0 ? held.join("; ") : "nothing"}.`);
    }

    list.items = list.items.filter((_, index) => !(change.remove ?? []).some((item) => sameText(held[index], item)));

    for (const item of change.add ?? []) {
        if (!items().some((other) => sameText(other, item))) {
            list.add(document.createNode(item.trim().normalize("NFC")));
        }
    }

    // A list emptied stays, as []: it still answers the setup (MOD-3).
    if (JSON.stringify(list.toJSON()) === before) {
        return false;
    }

    saveSettings(root, document);
    return true;
}

/** Answers a list setting with none (MOD-3): an empty list, refused while it holds items, which are removed one by one. Returns whether it changed. */
export function changeListSettingToNone(root: string, name: string): boolean
{
    const setting = checkSettingName(name);

    if (!listSettingNames.includes(setting)) {
        throw new Error(`"${setting}" holds one value: give one of its values, not none.`);
    }

    const document = readSettingsDocument(root);
    const before = (document.toJS() as Record<string, unknown> | null)?.[setting];
    const held = listNode(document, setting).items.map((node) => String(isScalar(node) ? node.value : node));

    if (held.length > 0) {
        throw new Error(`"${setting}" holds ${held.join("; ")}: remove each one with remove, if the player no longer wants it. Nothing changed.`);
    }

    if (Array.isArray(before)) {
        return false;
    }

    saveSettings(root, document);
    return true;
}

/** Writes the extensions the campaign uses, by package with the version each was added with (D-27), keeping the rest of campaign.yaml; none takes the key away. */
export function changeExtensions(root: string, extensions: Record<string, string>): void
{
    const document = readSettingsDocument(root);

    if (Object.keys(extensions).length === 0) {
        document.delete("extensions");
    } else {
        document.set("extensions", document.createNode(extensions, { flow: false }));
    }

    saveSettings(root, document);
}

/** What campaign.yaml adds to the game system, as it writes it, read even when another setting breaks the file (CAM-1); empty when it cannot be read. */
export function readCampaignData(root: string): Record<string, unknown>
{
    try {
        const values: unknown = parseDocument(files().text(join(root, campaignFileName)) ?? "").toJS();
        const names: string[] = [...mapSettingNames, "status-line"];
        return values !== null && typeof values === "object" ? Object.fromEntries(Object.entries(values).filter(([name]) => names.includes(name))) : {};
    } catch {
        return {};
    }
}

/**
 * Gives entries by name to a setting that holds them, such as counters, each in place of one with that name, or removes entries by name (CAM-1); keeps the
 * rest of campaign.yaml as it is. Returns whether it changed.
 */
export function changeMapSetting(root: string, name: string, change: { set?: Record<string, unknown>; remove?: string[]; }): boolean
{
    const setting = checkSettingName(name);

    if (!entrySettingNames.includes(setting)) {
        throw new Error(`"${setting}" holds no entries by name: ${listSettingNames.includes(setting) ? "change it with add and remove" : "give the new value"}.`);
    }

    const document = readSettingsDocument(root);
    const held = document.get(setting);
    const before = (held !== null && typeof held === "object" && "toJSON" in held ? (held as { toJSON(): unknown; }).toJSON() : held) ?? {};

    if (typeof before !== "object" || Array.isArray(before)) {
        throw new Error(`"${setting}" in ${campaignFileName} is not entries by name; write it by hand as ${setting}: {name: value}.`);
    }

    const entries = { ...(before as Record<string, unknown>) };
    const named = (wanted: string): string | undefined => Object.keys(entries).find((key) => sameText(key, wanted));
    const missing = (change.remove ?? []).find((item) => named(item) === undefined);

    if (missing !== undefined) {
        const keys = Object.keys(entries);
        throw new Error(`"${setting}" has no entry "${missing}", so nothing changed. It has: ${keys.length > 0 ? keys.join(", ") : "none"}.`);
    }

    for (const item of change.remove ?? []) {
        delete entries[named(item) as string];
    }

    for (const [key, value] of Object.entries(change.set ?? {})) {
        delete entries[named(key) ?? key];
        entries[key] = value;
    }

    if (JSON.stringify(entries) === JSON.stringify(before)) {
        return false;
    }

    if (Object.keys(entries).length === 0) {
        document.delete(setting);
    } else {
        document.set(setting, document.createNode(entries, { flow: false }));
    }

    saveSettings(root, document);
    return true;
}

/** What is wrong in campaign.yaml, one problem for each setting, with how to fix it. */
export function checkSettings(root: string): Problem[]
{
    const fix = "fix campaign.yaml by hand (a list is written as [item, item]), or set a single value with the config command";
    let values: unknown;

    try {
        values = readYamlValues(join(root, campaignFileName), settingsHold);
    } catch (error) {
        return [{ path: campaignFileName, message: error instanceof Error ? error.message : String(error) }];
    }

    const parsed = settingsSchema.safeParse(values);
    return parsed.success ? [] : parsed.error.issues.map((issue) => ({ path: campaignFileName, message: `${issue.path.join(".") || "the settings"}: ${issue.message}.`, fix }));
}

/** The settings that are still missing: the AI asks the player for them. */
export function missingSettings(settings: CampaignSettings): SettingName[]
{
    return settingNames.filter((name) => !listSettingNames.includes(name) && !optionalSettingNames.includes(name) && settings[name] === undefined);
}

/**
 * The settings the setup still has to ask, in order (MOD-3): those every campaign needs, how the companions come, the lines and veils until answered, even
 * with none, and, for a campaign without a written world, its premise and preparation.
 */
export function unansweredSettings(settings: CampaignSettings, writtenWorld: boolean): SettingName[]
{
    const asked = [...setupSettingNames, ...(writtenWorld ? [] : premiseSettingNames)];
    return settingNames.filter((name) => missingSettings(settings).includes(name) || (asked.includes(name) && (settings[name] === undefined || settings[name] === null)));
}

export function checkSettingName(name: string): SettingName
{
    if (!(settingNames as string[]).includes(name)) {
        throw new Error(`There is no setting "${name}". The settings are: ${settingNames.join(", ")}.`);
    }

    return name as SettingName;
}

/** The YAML list of a list setting, edited in place so that its comments stay; created when missing. */
function listNode(document: Document, setting: SettingName): YAMLSeq
{
    const node = document.get(setting, true);

    if (node === undefined || node === null || (isScalar(node) && node.value === null)) {
        const list = document.createNode([]) as YAMLSeq;
        document.set(setting, list);
        return list;
    }

    if (isSeq(node)) {
        // Items written by hand as pairs become the text they were meant to be, and are written back in quotes.
        node.items = node.items.map((item) => (isMap(item) && pairText(item.toJSON()) !== undefined ? document.createNode(pairText(item.toJSON())) : item));
    }

    if (!isSeq(node) || !node.items.every((item) => isScalar(item) && typeof item.value === "string")) {
        throw new Error(`"${setting}" in ${campaignFileName} is not a list of text; write it by hand as ${setting}: [item, item].`);
    }

    return node;
}

/** Writes campaign.yaml, if the settings are still valid; long values stay on one line. */
function saveSettings(root: string, document: Document): void
{
    validateSettings(document.toJS());
    writeYamlFile(join(root, campaignFileName), document);
}

/** "Poisoned: la benda…" for the YAML pair { Poisoned: "la benda…" } that a list item written without quotes becomes; undefined for anything else. */
function pairText(item: unknown): string | undefined
{
    if (item === null || typeof item !== "object" || Array.isArray(item)) {
        return undefined;
    }

    const entries = Object.entries(item);
    return entries.length === 1 && ["string", "number", "boolean"].includes(typeof entries[0][1]) ? `${entries[0][0]}: ${String(entries[0][1])}` : undefined;
}

/** The same item of a list setting, ignoring case, accents written either way and the spaces around it. */
function sameText(one: string, other: string): boolean
{
    return comparableText(one.trim()) === comparableText(other.trim());
}

function validateSettings(values: unknown): CampaignSettings
{
    const parsed = settingsSchema.safeParse(values);

    if (!parsed.success) {
        throw new Error(`${campaignFileName} is not valid:\n${z.prettifyError(parsed.error)}\nFix it by hand (a list is written as [item, item]); a single value can also be set with the config command.`);
    }

    return parsed.data;
}

function readSettingsDocument(root: string): Document
{
    return readYamlFile(join(root, campaignFileName), settingsHold);
}
