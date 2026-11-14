// Reads and checks a system.yaml, with its version and layers, into a frozen GameSystem
import { join } from "node:path";
import type { z } from "zod";
import { type Formula, type FormulaData, formulaOf, readFormulas, type SystemFormulas } from "../core/formula.ts";
import { frozen } from "../core/frozen.ts";
import { readParts } from "../core/instruction-parts.ts";
import { readLength, readSpeed } from "../core/length.ts";
import { declaredWidgets, packagePartsIssues } from "../core/packages/declarations.ts";
import type { ProgressionRule } from "../core/progression-rule.ts";
import { comparableText, sameName } from "../core/text.ts";
import { readYamlValues } from "../core/yaml-file.ts";
import { type SystemLayer, withCampaignData } from "./campaign-data.ts";
import { systemApiProblem, systemHasCode } from "./code.ts";
import { actVerbs, type CheckAtom, type CheckOperator, type Down, type GameSystem, type GridRules, plainRoll, rulesetSetting, type SheetGroup, type SheetVerb, systemFileName, type Travel } from "./game-system.ts";
import { isMap } from "./maps.ts";
import { checkFieldPattern, type gridSchema, sheetEntryPattern, systemSchema, type travelSchema } from "./schema.ts";
import { chosenVersion, withVersion } from "./versions.ts";

export function readSystem(folder: string, name: string, layers: SystemLayer[] = [], ruleset?: string): GameSystem
{
    const file = join(folder, systemFileName);
    let own: unknown;

    // The YAML's own error names only system.yaml: the system and its folder are said, so that one played is found and fixed.
    try {
        own = readYamlValues(file, 'what the system is, such as "title: ..."');
    } catch (error) {
        throw new Error(`The game system ${name} cannot be read, because ${file} is not valid: ${error instanceof Error ? error.message : String(error)}`);
    }

    const version = chosenVersion(own, file, name, ruleset);
    const read = version === undefined ? file : `${file} with its version ${version.name}`;
    const path = layers.length === 0 ? read : `${read} with the additions of ${layers.map((layer) => layer.from).join(", ")}`;
    const raw = version === undefined || !isMap(own) ? own : withVersion(own, version.data);
    let merged: unknown = raw;

    try {
        merged = layers.reduce((below: unknown, layer) => withCampaignData(below, layer.data), raw);
    } catch (error) {
        throw new Error(`The game system ${name} cannot be read, because ${path} is not valid: ${error instanceof Error ? error.message : String(error)}`);
    }

    const parsed = systemSchema.safeParse(merged);

    if (!parsed.success) {
        // One made for a newer API may declare what this engine does not know yet (D-515).
        const unread = systemApiProblem(folder);
        throw new Error(`The game system ${name} cannot be read, because ${path} is not valid: ${issuesText(parsed.error)}${unread === undefined ? "" : ` Besides, ${unread}.`}`);
    }

    const data = parsed.data;
    const parts = packagePartsIssues(data, "a game system")[0];

    if (parts !== undefined) {
        throw new Error(`The game system ${name} cannot be read, because ${path} is not valid: ${[...parts.path, ""].join(".").replace(/\.$/, ": ")}${parts.message}.`);
    }

    // What a counter shields is no limit of it: a counter with only that has none (DAT-14).
    const limited = Object.entries(data.counters ?? {}).flatMap(([counter, { min, max, refill }]) => min === undefined && max === undefined && refill === undefined ? [] : [[counter, { min, max, refill }] as const]);
    const formulas = systemFormulas({ ...data, counters: Object.fromEntries(limited) }, name, path);
    const stray = strayOccasion(data, formulas);

    if (stray !== undefined) {
        throw new Error(`The game system ${name} cannot be read, because ${path} is not valid: ${stray}`);
    }

    const sheet = sheetOf(data, name, path);
    const values = data.values ?? {};
    const sheetValues = data["sheet-values"] ?? {};
    const kindOf = (field: string): string | undefined => Object.entries(data.fields ?? {}).find(([declared]) => comparableText(declared) === comparableText(field))?.[1];
    // Closed names for a list, as the skills, or for a text, as an alignment.
    const notList = [...Object.keys(values), ...Object.keys(sheetValues)].find((field) => kindOf(field) !== "list" && kindOf(field) !== "text");

    if (notList !== undefined) {
        throw new Error(`The game system ${name} cannot be read, because ${path} is not valid: values.${notList}: declare ${notList} as a list or a text in fields, or give no values to it.`);
    }

    // What breaks what someone keeps, and what a counter shields, read counters (EFF-14, DAT-14).
    const counted = [
        ...(data.keeping === undefined ? [] : [{ where: "keeping.counter", field: data.keeping.counter }]),
        ...(data.damage === undefined ? [] : [{ where: "damage.counter", field: data.damage.counter }]),
        ...(data.combat === undefined ? [] : [{ where: "combat.track", field: data.combat.track }]),
        ...(data.down === undefined ? [] : [{ where: "down.at", field: data.down.at.split(" ")[0] }]),
        ...Object.entries(data.counters ?? {}).flatMap(([counter, limits]) => (limits.shields === undefined ? [] : [{ where: `counters.${counter}.shields`, field: limits.shields }])),
    ].find((entry) => kindOf(entry.field) !== "counter");

    const unknownCondition = [
        ...(data.keeping?.conditions ?? []).map((condition) => ({ where: "keeping.conditions", condition })),
        ...(data.combat?.inactive ?? []).map((condition) => ({ where: "combat.inactive", condition })),
    ].find((entry) => !(data.conditions ?? []).some((named) => comparableText(named) === comparableText(entry.condition)));

    if (unknownCondition !== undefined) {
        const named = (data.conditions ?? []).length === 0 ? "" : ` (${(data.conditions ?? []).join(", ")})`;
        const what = `${unknownCondition.where}: ${unknownCondition.condition} is not one of its conditions${named}; write it as one of them, or add it to conditions.`;
        throw new Error(`The game system ${name} cannot be read, because ${path} is not valid: ${what}`);
    }

    const gridField = [data.grid?.speed, data.grid?.size].find((field) => field !== undefined && kindOf(field) === undefined);

    if (gridField !== undefined) {
        throw new Error(`The game system ${name} cannot be read, because ${path} is not valid: grid: ${gridField} is not declared in fields.`);
    }

    if (counted !== undefined) {
        throw new Error(`The game system ${name} cannot be read, because ${path} is not valid: ${counted.where}: ${counted.field} is not declared as a counter in fields.`);
    }

    // A state check compares a field the system declares, written as one, and its line names only the page and such fields (CHK-2).
    const checks = data.checks ?? [];
    const atoms = checks.flatMap((check) => [check.when, check.needs]);
    const miswritten = atoms.find((atom) => /[<>=!]/.test(atom) && !checkFieldPattern.test(atom.trim()));
    const checkField = atoms.map(checkAtom).find((atom) => "field" in atom && kindOf(atom.field) === undefined);
    const placeholder = checks.flatMap((check) => [...check.say.matchAll(/\{([^{}]+)\}/g)].map((found) => found[1])).find((named) => named !== "page" && kindOf(named) === undefined);
    const checkProblem = miswritten !== undefined
        ? `"${miswritten}" is no comparison: write a field, one of < <= = != >= >, and a whole number, such as hp <= 0`
        : checkField !== undefined && "field" in checkField
        ? `${checkField.field} is not declared in fields`
        : placeholder === undefined
        ? undefined
        : `{${placeholder}} in say is neither {page} nor a field declared in fields`;

    if (checkProblem !== undefined) {
        throw new Error(`The game system ${name} cannot be read, because ${path} is not valid: checks: ${checkProblem}.`);
    }

    // A use of a turn goes within another the system names (TRN-3).
    const turnUses = data["turn-uses"] ?? {};
    const looseUse = Object.entries(turnUses).find(([, rule]) => rule.within !== undefined && !Object.keys(turnUses).some((use) => comparableText(use) === comparableText(rule.within ?? "")));

    if (looseUse !== undefined) {
        throw new Error(`The game system ${name} cannot be read, because ${path} is not valid: turn-uses.${looseUse[0]}: ${looseUse[1].within} is not one of its turn-uses; name one, or add it.`);
    }

    // The lists whose types change damage are lists (DMG-1).
    const damageLists = data.damage === undefined ? [] : (["halves", "ignores", "doubles"] as const).map((key) => ({ where: `damage.${key}`, field: data.damage?.[key] ?? "" }));
    const notListed = damageLists.find((entry) => kindOf(entry.field) !== "list");

    if (notListed !== undefined) {
        throw new Error(`The game system ${name} cannot be read, because ${path} is not valid: ${notListed.where}: ${notListed.field} is not declared as a list in fields.`);
    }

    const notMarking = [...(data.marks ?? []), ...[data.progression?.list, data.progression?.parts?.list].filter((field) => field !== undefined)].find((field) => kindOf(field) !== "list");

    if (notMarking !== undefined) {
        throw new Error(`The game system ${name} cannot be read, because ${path} is not valid: ${notMarking} is not declared as a list in fields, as marks and progression need.`);
    }

    // Each number rolled with dice is a declared field, and has one set of dice (D-280).
    const rolled = Object.entries(data["sheet-dice"] ?? {}).flatMap(([dice, fields]) => fields.map((field): [string, string] => [field, dice]));
    const undeclared = rolled.find(([field]) => kindOf(field) === undefined);
    const twice = rolled.find(([field], index) => rolled.findIndex(([other]) => comparableText(other) === comparableText(field)) !== index);

    if (undeclared !== undefined) {
        throw new Error(`The game system ${name} cannot be read, because ${path} is not valid: sheet-dice.${undeclared[1]}: ${undeclared[0]} is not declared in fields.`);
    }

    if (twice !== undefined) {
        throw new Error(`The game system ${name} cannot be read, because ${path} is not valid: sheet-dice: ${twice[0]} is listed twice; give each field one set of dice.`);
    }

    const unknownKnowledge = (data["sheet-knowledge"] ?? []).find((field) => kindOf(field) === undefined);

    if (unknownKnowledge !== undefined) {
        throw new Error(`The game system ${name} cannot be read, because ${path} is not valid: sheet-knowledge: ${unknownKnowledge} is not declared in fields.`);
    }

    // The cards the dashboard places are groups of the sheet (D-295); at hand in a fight, its fields too (D-315).
    for (const [key, names] of Object.entries(data["sheet-cards"] ?? {})) {
        const fields = key === "at-hand" ? sheet.flatMap((group) => group.entries.map((entry) => comparableText(entry.field))) : [];
        const stray = (names ?? []).find((group) => !sheet.some((declared) => comparableText(declared.name) === comparableText(group)) && !fields.includes(comparableText(group)));

        if (stray !== undefined) {
            const kinds = key === "at-hand" ? "group or field" : "group";
            throw new Error(`The game system ${name} cannot be read, because ${path} is not valid: sheet-cards.${key}: the sheet has no ${kinds} ${stray}; its groups are ${sheet.map((group) => group.name).join(", ")}.`);
        }
    }

    // The fields the player acts with are fields of the sheet (D-495).
    const actless = Object.keys(data["sheet-actions"] ?? {}).find((field) => !sheet.some((group) => group.entries.some((entry) => entry.field === field)));

    if (actless !== undefined) {
        throw new Error(`The game system ${name} cannot be read, because ${path} is not valid: sheet-actions: the sheet has no field ${actless}.`);
    }

    // Each verb is the engine's or one the system declares, never both (D-514).
    const ownVerbs = Object.keys(data["sheet-verbs"] ?? {});
    const taken = ownVerbs.find((verb) => (actVerbs as readonly string[]).includes(verb));
    const verbs = [...actVerbs, ...ownVerbs];
    const unknownVerb = Object.entries(data["sheet-actions"] ?? {}).flatMap(([field, listed]) => listed.filter((verb) => !verbs.includes(verb)).map((verb) => `${field}: ${verb}`))[0];

    if (taken !== undefined) {
        throw new Error(`The game system ${name} cannot be read, because ${path} is not valid: sheet-verbs: ${taken} is one of the engine's verbs, whose words the dashboard has; leave it out.`);
    }

    if (unknownVerb !== undefined) {
        throw new Error(
            `The game system ${name} cannot be read, because ${path} is not valid: sheet-actions.${unknownVerb} is no verb: give one of ${verbs.join(", ")}, or declare it in sheet-verbs.`,
        );
    }

    // Each field the headline names is a declared one (D-288).
    const unnamed = [...(data["sheet-headline"] ?? "").matchAll(headlineFieldPattern)].map((match) => match[1]).find((field) => kindOf(field) === undefined);

    if (unnamed !== undefined) {
        throw new Error(`The game system ${name} cannot be read, because ${path} is not valid: sheet-headline: ${unnamed} is not declared in fields.`);
    }

    // The tokens' icons read a declared field (D-414).
    const iconField = data["token-icons"]?.field;

    if (iconField !== undefined && kindOf(iconField) === undefined) {
        throw new Error(`The game system ${name} cannot be read, because ${path} is not valid: token-icons.field: ${iconField} is not declared in fields.`);
    }

    const asking = settingsAsking(data.settings ?? {});

    if (asking !== undefined) {
        throw new Error(`The game system ${name} cannot be read, because ${path} is not valid: settings.${asking}.`);
    }

    const experience = data.progression?.experience?.table;

    if (experience !== undefined && !Object.keys(formulas.tables).some((table) => comparableText(table) === comparableText(experience))) {
        throw new Error(`The game system ${name} cannot be read, because ${path} is not valid: progression.experience.table: there is no table ${experience} in tables.`);
    }

    return frozen({
        name,
        folder,
        ...(version === undefined ? {} : { version: { name: version.name, ...(version.title === undefined ? {} : { title: version.title }), folder: version.folder } }),
        code: systemHasCode(folder),
        title: data.title,
        language: data.language,
        attribution: data.attribution,
        ...(data.theme === undefined ? {} : { theme: join(folder, data.theme) }),
        fields: data.fields ?? {},
        coins: data.coins,
        coinMetals: data["coin-metals"] ?? {},
        roundSeconds: data.round === undefined ? undefined : Number.parseInt(data.round, 10),
        ...(data.dawn === undefined ? {} : { dawn: minuteOfDay(data.dawn) }),
        ...(data.imperial === undefined ? {} : { imperial: { mile: readLength(data.imperial.mile) ?? 0, foot: readLength(data.imperial.foot) ?? 0 } }),
        ...(data.imperial?.pound === undefined ? {} : { pound: Number.parseFloat(data.imperial.pound) }),
        ...(data["length-unit"] === undefined ? {} : { lengthUnit: data["length-unit"] }),
        bonusLists: data["bonus-lists"] ?? [],
        bonusWhile: Object.fromEntries(Object.entries(data.bonds ?? {}).flatMap(([list, bond]) => (bond.while === undefined ? [] : [[list, bond.while]]))),
        ...(data.load === undefined ? {} : {
            load: {
                field: data.load.field,
                // Formulas in order, the first with a value counts, as a computed field's (D-210).
                limit: Array.isArray(data.load.limit)
                    ? { kind: "first", options: data.load.limit.map((option, index) => formulaAt(String(option), `load.limit.${index}`, name, path)) }
                    : formulaAt(data.load.limit, "load.limit", name, path),
                ...(data.load.coins === undefined ? {} : { coins: data.load.coins }),
                ...(data.load.weightless === undefined ? {} : { weightless: data.load.weightless }),
                ...(data.load.bundle === undefined ? {} : { bundle: data.load.bundle }),
                ...(data.load.stages === undefined ? {} : { stages: data.load.stages.map((stage) => ({ name: stage.name, formula: formulaAt(stage.when, `load.stages.${stage.name}`, name, path) })) }),
            },
        }),
        ...(data.travel === undefined ? {} : { travel: travelOf(data.travel) }),
        ...(data.grid === undefined ? {} : { grid: gridOf(data.grid) }),
        sheet,
        sheetDice: Object.fromEntries(rolled),
        sheetKnowledge: data["sheet-knowledge"] ?? [],
        ...(data["sheet-odds"] === undefined ? {} : {
            sheetOdds: {
                better: data["sheet-odds"].better,
                worse: data["sheet-odds"].worse,
                when: data["sheet-odds"].when.map((when) => ({
                    fields: when.fields,
                    ...(when.better === undefined ? {} : { better: formulaAt(when.better, "sheet-odds.when.better", name, path) }),
                    ...(when.worse === undefined ? {} : { worse: formulaAt(when.worse, "sheet-odds.when.worse", name, path) }),
                    ...(when.why === undefined ? {} : { why: when.why }),
                })),
            },
        }),
        rollNames: Object.fromEntries(Object.entries(data["roll-names"] ?? {}).map(([dice, names]) => [plainRoll(dice), typeof names === "string" ? { [data.language]: names } : names])),
        ...(data["sheet-headline"] === undefined ? {} : { sheetHeadline: data["sheet-headline"] }),
        ...(data["token-icons"] === undefined ? {} : { tokenIcons: data["token-icons"] }),
        ...(data["sheet-actions"] === undefined ? {} : { sheetActions: data["sheet-actions"] }),
        sheetVerbs: Object.fromEntries(Object.entries(data["sheet-verbs"] ?? {}).map(([verb, words]) => [verb, sheetVerbOf(words)])),
        ...(data["sheet-cards"] === undefined ? {} : { sheetCards: { rail: data["sheet-cards"].rail ?? [], order: data["sheet-cards"].order ?? [], atHand: data["sheet-cards"]["at-hand"] ?? [] } }),
        values,
        sheetValues,
        marks: data.marks ?? [],
        statusLine: (data["status-line"] ?? []).map((entry) => ({ field: entry.replace(/\?$/, ""), whenSet: entry.endsWith("?") })),
        thresholds: Object.entries(data.thresholds ?? {}).map(([key, rule]) => {
            const [field, value] = key.split(" ");
            return { field, value: value === undefined ? undefined : Number(value), rule };
        }),
        recipes: Object.entries(data.recipes ?? {}).map(([recipe, value]) => ({
            name: recipe,
            set: value.set ?? {},
            regain: regainOf(value.regain ?? {}, name, path, recipe),
            lower: Object.fromEntries(Object.entries(value.lower ?? {}).map(([field, amount]) => [field, formulaAt(String(amount), `recipes.${recipe}.lower.${field}`, name, path)])),
            ...(value.needs === undefined ? {} : { needs: value.needs }),
            ...(value["once-per"] === undefined ? {} : { oncePer: value["once-per"] }),
            ...(value.lasts === undefined ? {} : { lasts: value.lasts }),
            spend: Object.fromEntries(Object.entries(value.spend ?? {}).map(([field, rule]) => [field, { gives: rule.gives, adds: formulaAt(String(rule.adds ?? 0), `recipes.${recipe}.spend.${field}`, name, path) }])),
            ends: value.ends ?? [],
            rules: value.rules ?? [],
        })),
        conditions: data.conditions ?? [],
        conditionIcons: data["condition-icons"] ?? {},
        icons: data.icons ?? {},
        widgets: declaredWidgets(data.widgets),
        figures: data.figures ?? {},
        bonds: data.bonds ?? {},
        ...(data.upkeep === undefined ? {} : { upkeep: data.upkeep }),
        burning: data.burning ?? {},
        ...(data.immune === undefined ? {} : { immune: data.immune }),
        ...(data.oracle === undefined ? {} : { oracleYes: data.oracle.yes }),
        turnUses: Object.fromEntries(
            Object.entries(data["turn-uses"] ?? {}).map(([use, rule]) => [use, {
                ...(rule.most === undefined ? {} : { most: formulaAt(String(rule.most), `turn-uses.${use}.most`, name, path) }),
                ...(rule.within === undefined ? {} : { within: rule.within }),
                ...(rule.needs === undefined ? {} : { needs: formulaAt(rule.needs, `turn-uses.${use}.needs`, name, path) }),
                anyTurn: rule["any-turn"] ?? false,
                resets: rule.resets ?? "own turn",
                ...(rule.note === undefined ? {} : { note: rule.note }),
                ...(rule["note-when"] === undefined ? {} : { noteWhen: formulaAt(rule["note-when"], `turn-uses.${use}.note-when`, name, path) }),
            }]),
        ),
        atMost: Object.fromEntries(Object.entries(data["at-most"] ?? {}).map(([field, most]) => [field, formulaAt(String(most), `at-most.${field}`, name, path)])),
        ...(data.damage === undefined ? {} : { damage: data.damage }),
        ...(data.keeping === undefined ? {} : { keeping: { counter: data.keeping.counter, conditions: data.keeping.conditions ?? [], rules: data.keeping.rules } }),
        ...(data.combat === undefined ? {} : { combat: { track: data.combat.track, inWords: data.combat["in-words"] ?? [], inactive: data.combat.inactive ?? [] } }),
        ...(data.down === undefined ? {} : { down: downRule(data.down.at) }),
        checks: (data.checks ?? []).map((check) => ({ when: checkAtom(check.when), needs: checkAtom(check.needs), say: check.say })),
        shields: Object.fromEntries(Object.entries(data.counters ?? {}).flatMap(([counter, limits]) => (limits.shields === undefined ? [] : [[counter, limits.shields]]))),
        formulas,
        ...(data.progression === undefined ? {} : { progression: progressionRule(data.progression) }),
        itemFormulas: data["item-formulas"] ?? {},
        alwaysIn: data["always-in"] ?? {},
        uses: usesOf(data),
        // The versions first, as the setup asks them before what they may change; one alone is no choice, and no setting (VER-1).
        settings: [...(Object.keys(data.versions ?? {}).filter((key) => key !== "about").length < 2 ? [] : [[rulesetSetting, data.versions ?? {}] as const]), ...Object.entries(data.settings ?? {})].map(([setting, values]) => ({
            name: setting,
            ...(typeof values.about === "string" ? { about: values.about } : {}),
            values: Object.entries(values).flatMap(([value, meaning]) =>
                typeof meaning === "string" ? [] : [{
                    value,
                    means: meaning.means,
                    ...(meaning.player === undefined ? {} : { player: meaning.player }),
                    without: meaning.without ?? [],
                    engineSettings: meaning["engine-settings"] ?? {},
                    asks: meaning.asks ?? [],
                    ...(meaning.suggested === true ? { suggested: true as const } : {}),
                }]
            ),
        })),
        engineSettings: data["engine-settings"] ?? {},
        leftOut: [],
        rewards: Object.entries(data.rewards ?? {}).map(([field, reward]) => {
            const [counter, value] = reward.overcome.split(" ");
            return { field, from: reward.from, counter, value: Number(value) };
        }),
        // A part of its version takes the place of its own of that name (VER-3).
        parts: { ...readParts(folder, `The game system ${name}`), ...(version === undefined ? {} : readParts(version.folder, `The game system ${name}, its version ${version.name},`)) },
    });
}

// A field named in the headline under a character's name: {level} (D-288).
const headlineFieldPattern = /\{([^{}]+)\}/g;

/** What is wrong in the settings a value asks, or in the value a setting suggests (DAT-17): "die.d6: asks die, which is its own setting"; undefined when nothing is. */
function settingsAsking(settings: Record<string, Record<string, string | { asks?: string[]; suggested?: true; }>>): string | undefined
{
    const names = Object.keys(settings);

    for (const [setting, values] of Object.entries(settings)) {
        const shown = Object.entries(values).flatMap(([value, meaning]) => (typeof meaning === "string" ? [] : [[value, meaning] as const]));

        if (shown.filter(([, meaning]) => meaning.suggested === true).length > 1) {
            return `${setting}: suggest one value at most`;
        }

        for (const [value, meaning] of shown) {
            const stray = (meaning.asks ?? []).find((asked) => comparableText(asked) === comparableText(setting) || !names.some((name) => comparableText(name) === comparableText(asked)));

            if (stray !== undefined) {
                return `${setting}.${value}: asks ${stray}, which is ${comparableText(stray) === comparableText(setting) ? "its own setting" : "no setting of the system"}: name another of its settings`;
            }
        }
    }

    return undefined;
}

/**
 * "counters.bulwark-dice: unknown key "Bulwark)", a formula with commas goes in quotes": the problems of a system's data, one after the other on
 * a line, each at its place.
 */
function issuesText(error: z.ZodError): string
{
    return error.issues.map((issue) => {
        const place = issue.path.map(String).join(".");
        const keys = issue.code === "unrecognized_keys" ? issue.keys : [];
        const quotes = keys.some((key) => /[()]/.test(key)) ? ": a formula with commas goes in quotes" : "";
        const vague = issue.message === "Invalid input" ? "not a value it takes, as system.yaml writes it" : issue.message;
        const message = keys.length > 0 ? `unknown ${keys.length === 1 ? "key" : "keys"} ${keys.map((key) => `"${key}"`).join(", ")}${quotes}` : vague;
        return place === "" ? `${message}.` : `${place}: ${message}.`;
    }).join(" ");
}

/**
 * A recipe that sets kept rolls (KEP-4), or a refill on an occasion that no recipe ends, which would never bring the use back (DAT-9): where it is and why;
 * undefined when there is none.
 */
function strayOccasion(data: z.infer<typeof systemSchema>, formulas: SystemFormulas): string | undefined
{
    const occasions = Object.values(data.recipes ?? {}).flatMap((recipe) => recipe.ends ?? []).filter((occasion, index, all) => all.findIndex((other) => comparableText(other) === comparableText(occasion)) === index);

    // Kept rolls come back as the player rolls them again (KEP-4), never at a value a recipe gives.
    for (const [recipe, value] of Object.entries(data.recipes ?? {})) {
        const rolls = Object.keys(value.set ?? {}).find((field) => Object.entries(data.fields ?? {}).some(([declared, kind]) => kind === "rolls" && comparableText(declared) === comparableText(field)));

        if (rolls !== undefined) {
            return `recipes.${recipe}.set.${rolls}: ${rolls} keeps rolls, which come back as they are rolled again with roll and keep, not at a value.`;
        }
    }

    for (const [counter, limits] of Object.entries(formulas.counters)) {
        const occasion = Object.keys(limits.refill ?? {}).find((candidate) => !occasions.some((other) => comparableText(other) === comparableText(candidate)));

        if (occasion !== undefined) {
            const known = occasions.length === 0 ? "no recipe ends one yet: give a recipe its ends" : `the occasions are ${occasions.join(", ")}`;
            return `counters.${counter}.refill: ${occasion} is no occasion a recipe ends, so it would never come back; ${known}.`;
        }
    }

    return undefined;
}

/** The progression as the system declares it (PRO-1–PRO-4, PRO-6). */
function progressionRule(data: NonNullable<z.infer<typeof systemSchema>["progression"]>): ProgressionRule
{
    const { skip, ...rule } = data;
    return { ...rule, skip: skip ?? [] };
}

/** The groups of a system's sheet, each with its note and its icon; a note or an icon for a group the sheet does not have is refused. */
function sheetOf(data: z.infer<typeof systemSchema>, name: string, path: string): SheetGroup[]
{
    const groups = Object.entries(data.sheet ?? {});
    const notes = Object.entries(data["sheet-notes"] ?? {});
    const icons = Object.entries(data["sheet-icons"] ?? {});
    const byGroup = (pairs: [string, string][], group: string): string | undefined => pairs.find(([other]) => comparableText(other) === comparableText(group))?.[1];

    for (const [key, pairs] of [["sheet-notes", notes], ["sheet-icons", icons]] as const) {
        const stray = pairs.find(([group]) => !groups.some(([other]) => comparableText(other) === comparableText(group)));

        if (stray !== undefined) {
            throw new Error(`The game system ${name} cannot be read, because ${path} is not valid: ${key}.${stray[0]}: the sheet has no group ${stray[0]}; its groups are ${groups.map(([group]) => group).join(", ")}.`);
        }
    }

    return groups.map(([group, entries]) => {
        const note = byGroup(notes, group);
        const icon = byGroup(icons, group);
        return {
            name: group,
            entries: entries.map((entry) => {
                const [, field, optional, beside] = sheetEntryPattern.exec(entry) ?? [];
                return { field, optional: optional === "?", ...(beside === undefined ? {} : { beside }) };
            }),
            ...(note === undefined ? {} : { note }),
            ...(icon === undefined ? {} : { icon }),
        };
    });
}

/** A verb of the system as the dashboard reads it (D-514): with its sentences on someone, at a square and on oneself only when it lets the player choose. */
function sheetVerbOf(words: { label: string; title: string; says: string; "says-on"?: string; "says-at"?: string; "says-self"?: string; }): SheetVerb
{
    const choosing = words["says-on"] === undefined ? {} : { on: words["says-on"], at: words["says-at"], self: words["says-self"] };
    return { label: words.label, title: words.title, says: words.says, ...choosing };
}

/** How the system's map of a place counts, as the engine reads it (GRD-4): the square in metres. */
function gridOf(data: z.infer<typeof gridSchema>): GridRules
{
    const { square, size, footprints, leaving, ...rest } = data;
    return { ...rest, square: readLength(square) ?? 0, ...(size === undefined ? {} : { size }), footprints: footprints ?? {}, ...(leaving === undefined ? {} : { leaving }) };
}

/** The system's travel as the engine reads it (TRV-1–TRV-3): speeds in metres an hour, factors as numbers. */
function travelOf(data: z.infer<typeof travelSchema>): Travel
{
    const paces = Object.fromEntries(Object.entries(data.paces ?? {}).map(([name, speed]) => [name, readSpeed(speed) ?? 0]));
    return {
        paces,
        pace: data.pace === undefined ? Object.keys(paces)[0] : sameName(Object.keys(paces), data.pace),
        hours: data.hours,
        rule: data.rule,
        beyond: data.beyond,
        terrain: Object.fromEntries(Object.entries(data.terrain ?? {}).map(([value, factor]) => [value, factorOf(factor)])),
        vehicles: Object.entries(data.vehicles ?? {}).flatMap(([field, values]) => [values].flat().map((value) => ({ field, value }))),
        kinds: Object.entries(data.kinds ?? {}).map(([name, kind]) => {
            const [field, value] = Object.entries(kind.vehicle ?? {})[0] ?? [];
            return {
                name,
                ...(field === undefined || value === undefined || kind.speed === undefined ? {} : { vehicle: { field, value, speed: kind.speed } }),
                hours: kind.hours,
                current: kind.current === undefined ? undefined : readSpeed(kind.current),
            };
        }),
    };
}

/** A factor of speed as a number: 1/2 is 0.5. */
function factorOf(factor: number | string): number
{
    if (typeof factor === "number") {
        return factor;
    }

    const [numerator, denominator] = factor.split("/").map(Number);
    return numerator / denominator;
}

/** The counters that come back with a rest (DAT-9): those with a refill, and those a recipe sets or regains. */
function usesOf(data: z.infer<typeof systemSchema>): string[]
{
    const names = [
        ...Object.entries(data.counters ?? {}).filter(([, limits]) => limits.refill !== undefined).map(([name]) => name),
        ...Object.values(data.recipes ?? {}).flatMap((recipe) => [...Object.keys(recipe.set ?? {}), ...Object.keys(recipe.regain ?? {})]),
    ];
    return names.filter((name, index) => names.findIndex((other) => comparableText(other) === comparableText(name)) === index);
}

/** The formulas of a recipe's regain, each read at its place (FOR-9). */
function regainOf(regain: Record<string, number | string>, name: string, path: string, recipe: string): Record<string, Formula>
{
    return Object.fromEntries(Object.entries(regain).map(([field, amount]) => [field, formulaAt(amount, `recipes.${recipe}.regain.${field}`, name, path)]));
}

/** A formula of a system's file, refused with the key it stands at (FOR-9). */
function formulaAt(written: number | string, place: string, name: string, path: string): Formula
{
    try {
        return formulaOf(written);
    } catch (error) {
        throw new Error(`The game system ${name} cannot be read, because ${path} is not valid: ${place}: ${error instanceof Error ? error.message : String(error)}`);
    }
}

/** The formulas of a system, read once; a system whose formulas do not read cannot be read either (FOR-9). */
function systemFormulas(data: FormulaData, name: string, path: string): SystemFormulas
{
    try {
        return readFormulas(data);
    } catch (error) {
        throw new Error(`The game system ${name} cannot be read, because ${path} is not valid: ${error instanceof Error ? error.message : String(error)}`);
    }
}

/** What a state check reads, as written (CHK-2): "hp <= 0" a field against a number, anything else an effect's name. */
function checkAtom(text: string): CheckAtom
{
    const field = checkFieldPattern.exec(text.trim());
    return field === null ? { effect: text.trim() } : { field: field[1], op: field[2] as CheckOperator, value: Number(field[3]) };
}

/** When one is down as the system writes it: "hp 0" read as a field and a number. */
function downRule(at: string): Down
{
    const [field, value] = at.split(" ");
    return { field, value: Number(value) };
}

/** An hour as the schema took it, as 06:00, in minutes since midnight. */
function minuteOfDay(hour: string): number
{
    const [hours, minutes] = hour.split(":").map(Number);
    return (hours ?? 0) * 60 + (minutes ?? 0);
}
