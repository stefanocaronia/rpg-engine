import { z } from "zod";
import { requireCampaign } from "../campaign/index.ts";
import type { Context } from "../core/context.ts";
import { numberOf } from "../core/formula.ts";
import { appendLogEntry, readLog } from "../core/log.ts";
import { defineCommand } from "../core/registry.ts";
import { comparableText, sameName, valueNamed } from "../core/text.ts";
import { readCounter } from "../counters/index.ts";
import { askOracle, DiceError, type DiceRoll, type FaceSource, rollDice, sha256, type ThrownDie } from "../dice/index.ts";
import { declaredKind, findPage, type Page, pagesWithName, type World, writePage } from "../pages/index.ts";
import type { GameSystem } from "../systems/index.ts";
import { effectiveFields, effectsOf } from "./effect-layer.ts";
import { behindTheScreen, namesNoOne, ofTheParty, screenUp, sealHiddenRoll } from "./game-master-rolls.ts";
import { copyPage, readOpenScene } from "./game-scene.ts";
import { systemRolled } from "./game-system-code.ts";
import { rollPageTable } from "./game-tables.ts";
import { newDatedLogEntry } from "./game-time.ts";
import { campaignSystem, campaignWorld, missingSystemHint } from "./game-world.ts";
import { itemList, signedText, workedFields } from "./worked-out.ts";

// Faces arrive as "14,7" or "14 7" from a shell (PowerShell turns 14,7 into "14 7"), or as an array.
export const faceValues = z.preprocess(
    (value) => (typeof value === "string" ? value.split(/[\s,;]+/).filter(Boolean).map(Number) : value),
    z.array(z.number()),
);

// A name in a notation, at the start of a term: a field of the sheet of who rolls, such as athletics or sleight-of-hand (DAT-8). A hyphen inside a name is the
// name's, as in formulas (FOR-2); a die such as d20 or dF is no name.
const namePattern = /(^|[+-])(\s*)(\p{L}[\p{L}0-9]*(?:-[\p{L}0-9]+)*)/gu;
const diePattern = /^\d*d(\d+|%|F)/i;

type RollOutput =
    | { kind: "roll"; id: string; text: string; total: number; why?: string; who?: string; check?: string; physical: boolean; hidden: boolean; screened?: true; stranger?: true; fingerprint?: string; note?: string; kept?: string; }
    | { kind: "reveal"; id: string; text: string; proof: string; sha256: string; fingerprint: string; };

export const roll = defineCommand({
    name: "roll",
    description: "Roll dice and log the roll. "
        + "Give why and, if it belongs to someone, who; for a roll the player sees, check names it for them, while why stays yours. "
        + "When the player rolls physical dice, pass their faces as values. Make it hidden when the player must not see the result; "
        + "left out, a roll for a foe or anyone outside the party is hidden or shown as the master-rolls setting says. "
        + "keep stores the dice rolled for later, such as the two d20 of a diviner's Portent, rolled by the player for the player character, by you for a companion; "
        + "use takes one of those instead of the die and logs which roll it replaced. "
        + "Instead of a notation, table rolls on a random table of a page and gives its row, for you to tell; oracle answers a yes/no question with its odds. "
        + 'Example: notation 1d20+perception, why "notice the trap", who Lena; table "Colli di Vallerana#Incontri", why "a night on the hills"; oracle likely, why "is the ferryman awake?".',
    group: "game",
    positionals: ["notation"],
    input: z.object({
        notation: z.string().optional().describe(
            "dice to roll: 1d20+5, 2d20kh1 (keep the highest), 4d6dl1 (drop the lowest), 2d6ro<=2 (reroll once), 1d6! (exploding), 6d10>=8 (count successes), 4dF, d%; "
                + "with who, a field of their sheet stands for its value, such as 1d20+athletics",
        ),
        why: z.string().optional().describe("what the roll is for"),
        check: z.string().optional().describe("what the roll is, as the player sees it in the dashboard's rolls, such as Bite or Stealth: never what only you know"),
        who: z.string().optional().describe("character the roll belongs to, or a copy in the open scene, the damage and heals they deal too, never who takes them; leave it out only for a roll that is no one's, such as an oracle"),
        values: faceValues.optional().describe("faces rolled by the player with physical dice, separated by commas; on the command line write --values=-1,0,1 for negative faces"),
        hidden: z.boolean().optional().describe(
            "only the master sees the result; its fingerprint goes to the player only if they ask for it; left out, the master-rolls setting decides for who outside the party",
        ),
        reveal: z.string().optional().describe("id of a hidden roll whose proof to show, later"),
        keep: z.string().optional().describe("a field of who that keeps rolls for later, such as portent: the dice rolled go there, in place of what it held"),
        use: z.string().optional().describe("a kept roll to use instead of the die, as field=value, such as portent=3: the notation has one die"),
        from: z.string().optional().describe("who keeps the roll that use takes, when it is not who rolls"),
        double: z.boolean().optional().describe("roll twice the dice, never the numbers added, as a critical hit's damage: 1d8+3 rolls 2d8+3"),
        table: z.string().optional().describe(
            "a random table to roll on, as Page#Section: the first table under that heading, its die in the first header cell (d8, 2d6, d100, d66) or as big as its highest row",
        ),
        oracle: z.string().optional().describe("odds of a yes/no question, on a d100: almost certain, likely, 50/50, unlikely or small chance; why is the question asked; a double makes the answer extreme"),
    }),

    run(input, context): RollOutput
    {
        const root = requireCampaign(context.folder);

        if (input.reveal !== undefined) {
            if (input.notation !== undefined || input.table !== undefined || input.oracle !== undefined) {
                throw new Error("Give either the dice to roll, a table or the oracle, or the id of a hidden roll to reveal, not both.");
            }

            return revealHiddenRoll(input.reveal, root, context);
        }

        if ([input.notation, input.table, input.oracle].filter((given) => given !== undefined).length > 1) {
            throw new Error("Give one of the dice to roll, table or oracle, not more: each is a roll of its own. Nothing rolled.");
        }

        if (input.notation === undefined && input.table === undefined && input.oracle === undefined) {
            throw new Error("Give the dice to roll, for example 1d20+5; or table, for a random table, or oracle, for a yes/no question.");
        }

        if (input.values && input.hidden) {
            throw new Error("Physical dice are rolled by the player, so they cannot be hidden.");
        }

        if (input.notation === undefined) {
            return answerRoll(input, root, context);
        }

        if (input.use !== undefined && (input.keep !== undefined || input.values !== undefined || input.hidden === true)) {
            throw new Error("A kept roll takes the place of the die: give use without keep or values, and not hidden.");
        }

        const physical = input.values !== undefined;
        // Left out, hidden follows the master-rolls setting for anyone outside the party (D-287); never for the player's dice, nor a kept roll used.
        const screened = input.hidden === undefined && !physical && input.use === undefined && behindTheScreen(root, context, input.who);
        const hidden = input.hidden === true || screened;
        const system = campaignSystem(root, context);
        const roller = rollerOf(root, context, input.who, hasNames(input.notation));
        // The notation as it is rolled, twice the dice for a critical hit (D-449).
        const rolled = input.double === true ? doubledDice(input.notation) : input.notation;
        const named = withSheetValues(rolled, roller, input.who, system);
        const keeper = input.keep === undefined ? undefined : keptField(root, context, input.who, input.keep);
        const used = input.use === undefined ? undefined : keptRoll(root, context, input.from ?? input.who, input.use);
        const diceRoll = rollWith(named.notation, used, input.values ? { values: input.values } : { random: context.random });
        // The notation as it was given, with the values its names took from the sheet (DAT-8).
        const taken = Object.entries(named.taken).map(([field, value]) => `${field} ${roller === undefined ? value : signedText(roller.world, field, value)}`);
        const text = taken.length === 0 ? diceRoll.text : `${rolled}${diceRoll.text.slice(diceRoll.notation.length)} (${taken.join(", ")})`;
        const sheet = taken.length === 0 ? {} : { sheet: named.taken };
        const keeping = keeper === undefined ? {} : { kept: { field: keeper.field, values: diceRoll.faces } };
        const using = used === undefined ? {} : { used: { from: used.page.name, field: used.field, value: used.value } };
        const checked = input.check === undefined ? {} : { check: input.check };
        const data = { notation: input.notation, total: diceRoll.total, result: text, ...sheet, why: input.why, who: input.who, ...checked, physical, ...keeping, ...using, dice: diceRoll.dice };
        const entry = newDatedLogEntry(root, context, "roll", hidden ? "hidden" : "public", data);
        const shownFingerprint = hidden ? sealHiddenRoll(entry, text, context) : undefined;

        // The page first: a page that cannot be written leaves no line in the log saying it was (KEP-2, KEP-3).
        const kept = keeper !== undefined ? keepFaces(keeper, diceRoll.faces) : used !== undefined ? takeKept(used) : undefined;
        appendLogEntry(root, entry);
        // A roll of a dying party member is their death save, which the engine writes (DIE-4, D-460).
        // A hidden roll writes nothing the player would see (review of 17 October).
        const said = input.who === undefined || hidden ? { lines: [] } : systemRolled(root, context, { who: input.who, notation: diceRoll.notation, total: diceRoll.total, dice: diceRoll.dice });
        const own = said.lines.length > 0 ? said.lines.join("\n") : roller === undefined ? undefined : rollerNote(roller.world, system, roller.page);
        const note = [own, said.problem].filter((line) => line !== undefined && line !== "").join("\n") || undefined;
        const shown = { kind: "roll" as const, id: entry.id, text, total: diceRoll.total, why: input.why, who: input.who, check: input.check, physical, hidden, fingerprint: shownFingerprint, note, kept };
        // A who of no page may be a party member named wrongly: the master is told how to undo the screen (review of 25 October).
        const stranger = screened && input.who !== undefined && namesNoOne(root, context, input.who) ? { stranger: true as const } : {};
        return screened ? { ...shown, screened: true, ...stranger } : shown;
    },

    format(output)
    {
        if (output.kind === "reveal") {
            const tell = "Tell the player what it was for and what came out, in the story's words; give the proof only if they ask how to check it.";
            return `Hidden roll ${output.id} revealed: ${output.text}. ${tell}\nProof: ${output.proof}\nSHA-256 of the proof: ${output.sha256} (it starts with the fingerprint ${output.fingerprint})`;
        }

        const note = [output.kept, output.note].filter((line) => line !== undefined).map((line) => `\n${line}`).join("");

        if (output.hidden) {
            const screen = output.screened === true ? ". Behind the screen, as master-rolls says: tell only the outcome, in the story." : "";
            const stranger = output.stranger === true
                ? `\n${output.who} names no page nor copy in the scene: hidden as a stranger's. If ${output.who} is of the party, roll --reveal ${output.id}, and give who as their page's name.`
                : "";
            return `Hidden roll ${output.id}, only for the master: ${output.text}${screen}${stranger}\nIts fingerprint, only if the player asks for it: ${output.fingerprint}${note}`;
        }

        const label = [output.who, output.check, output.why].filter(Boolean).join(", ");
        return `${output.id} ${label ? label + ": " : ""}${output.text}${output.physical ? " (physical dice)" : ""}${note}`;
    },
});

/** A roll on a page's random table or of the oracle (D-503): logged as any roll, hidden or shown as any roll; the row or the answer is for the master to tell. */
function answerRoll(input: { table?: string; oracle?: string; why?: string; who?: string; check?: string; values?: number[]; hidden?: boolean; keep?: string; use?: string; double?: boolean; }, root: string, context: Context): RollOutput
{
    if (input.keep !== undefined || input.use !== undefined || input.double === true) {
        throw new Error("keep, use and double go with dice to roll, not with a table or the oracle. Nothing rolled.");
    }

    if (input.oracle !== undefined && (input.why === undefined || input.why.trim() === "")) {
        throw new Error('Give the question asked as why, such as oracle likely, why "is the ferryman awake?". Nothing rolled.');
    }

    const physical = input.values !== undefined;
    const source = input.values ? { values: input.values } : { random: context.random };
    const answer = input.table !== undefined ? tableAnswer(root, context, input.table, source) : oracleAnswer(input.oracle ?? "", source);
    // A table or the oracle is the master's own roll, behind the screen as master-rolls says, but for a party member's (D-287); a secret's table is never shown.
    const masters = input.who === undefined || !ofTheParty(root, context, input.who);
    const screened = answer.secret || (input.hidden === undefined && !physical && masters && screenUp(root));
    const hidden = input.hidden === true || screened;
    const checked = input.check === undefined ? {} : { check: input.check };
    const data = { notation: answer.notation, total: answer.total, result: answer.text, ...answer.data, why: input.why, who: input.who, ...checked, physical, dice: answer.dice };
    const entry = newDatedLogEntry(root, context, "roll", hidden ? "hidden" : "public", data);
    const shownFingerprint = hidden ? sealHiddenRoll(entry, answer.text, context) : undefined;
    appendLogEntry(root, entry);
    const shown = { kind: "roll" as const, id: entry.id, text: answer.text, total: answer.total, why: input.why, who: input.who, check: input.check, physical, hidden, fingerprint: shownFingerprint };
    return screened ? { ...shown, screened: true } : shown;
}

/** A roll that answers: its die, the number read, its text, the dice thrown and what the log keeps of the table or the oracle. */
interface Answer
{
    /** It comes from a secret block, the master's alone. */
    secret: boolean;
    notation: string;
    total: number;
    text: string;
    dice: ThrownDie[];
    data: Record<string, unknown>;
}

/** The row of a page's table that the roll lands on, with the table and the row for the log. */
function tableAnswer(root: string, context: Context, table: string, source: FaceSource): Answer
{
    const rolled = rollPageTable(root, context, table, source);
    return { secret: rolled.secret, notation: rolled.die, total: rolled.result, text: rolled.text, dice: rolled.roll.dice, data: { table: rolled.table, row: rolled.row.label } };
}

/** The oracle's answer, with its odds and the answer for the log. */
function oracleAnswer(odds: string, source: FaceSource): Answer
{
    try {
        const asked = askOracle(odds, source);
        return { secret: false, notation: "d100", total: asked.roll.total, text: asked.text, dice: asked.roll.dice, data: { oracle: asked.odds, odds: asked.chance, answer: `${asked.extreme ? "extreme " : ""}${asked.yes ? "yes" : "no"}` } };
    } catch (error) {
        throw error instanceof DiceError ? new Error(`${error.message} Nothing rolled.`) : error;
    }
}

/** A field that keeps rolls for later on a page (KEP-1): what keep writes to, or use takes from. */
interface KeptField
{
    world: World;
    page: Page;
    field: string;
    values: number[];
}

/** A notation with twice its dice and the same numbers, as a critical hit's damage (D-449): 1d8+3 is 2d8+3, d6+1d4 is 2d6+2d4. */
function doubledDice(notation: string): string
{
    // Any case, as the dice read: 1D8 is 1d8.
    return notation.replace(/(^|[^\w-])(\d*)(d)(\d+|%|F)/gi, (_whole, before: string, count: string, d: string, faces: string) => `${before}${(count === "" ? 1 : Number(count)) * 2}${d}${faces}`);
}

/** The field of who rolls that keep writes to (KEP-2): a page's, declared as kept rolls. */
function keptField(root: string, context: Context, who: string | undefined, field: string): KeptField
{
    if (who === undefined) {
        throw new Error(`Give who rolls, whose ${field} keeps the dice, such as who Elara. Nothing rolled.`);
    }

    return keptOn(campaignWorld(root, context), who, field);
}

/** The kept roll that use names, such as portent=3, on who keeps it (KEP-3); refused, with the numbers the field holds, when it holds no such number. */
function keptRoll(root: string, context: Context, holder: string | undefined, use: string): KeptField & { value: number; }
{
    const match = /^\s*([^=]+?)\s*=\s*([+-]?\d+)\s*$/.exec(use);

    if (match === null) {
        throw new Error(`Give use as the field and the kept number, such as portent=3, not "${use}". Nothing rolled.`);
    }

    if (holder === undefined) {
        throw new Error(`Give who keeps the roll, with from or who, such as from Elara. Nothing rolled.`);
    }

    const world = campaignWorld(root, context);
    const kept = keptOn(world, holder, match[1]);
    const value = Number(match[2]);

    if (!kept.values.includes(value)) {
        throw new Error(`${kept.page.name} keeps no ${value} in ${kept.field}: it keeps ${kept.values.length === 0 ? "none" : kept.values.join(", ")}.${otherKeepers(world, kept, value)} Nothing rolled.`);
    }

    return { ...kept, value };
}

/**
 * A page's field of kept rolls, with the numbers it holds; refused for a copy in the scene, for a field the system does not declare as kept rolls, and for one
 * that holds something other than numbers.
 */
function keptOn(world: World, name: string, field: string): KeptField
{
    const page = findPage(world, name);

    if (page === undefined) {
        throw new Error(`There is no page named ${name} to keep rolls: kept rolls go on a character's page, not on a copy in the scene. Nothing rolled.`);
    }

    const written = Object.entries(effectiveFields(world, page)).find(([key]) => comparableText(key) === comparableText(field));

    if (declaredKind(world, field) !== "rolls") {
        throw new Error(`${notRollsText(world, field, written?.[1])} Nothing rolled.`);
    }

    const items = Array.isArray(written?.[1]) ? written[1] : written?.[1] === undefined ? [] : [written[1]];
    const wrong = items.find((item) => !Number.isFinite(numberOf(item)));

    if (wrong !== undefined) {
        throw new Error(`${field} on ${page.name} holds ${JSON.stringify(wrong)}, which is no roll: write its numbers only, such as ${field}=[14, 3]. Nothing rolled.`);
    }

    return { world, page, field: written?.[0] ?? field, values: items.map((item) => numberOf(item) as number) };
}

/** Why a field keeps no rolls: a counter or another field of the system is something else; a field of no system must first be declared as kept rolls (KEP-1). */
function notRollsText(world: World, field: string, value: unknown): string
{
    if (world.system === undefined) {
        return `${field} keeps no rolls, and the campaign has no installed game system to declare it in.${missingSystemHint(world)}`;
    }

    const kind = declaredKind(world, field) ?? (readCounter(value) === undefined ? undefined : "counter");
    return kind === undefined
        ? `${field} keeps no rolls: declare it so first, such as config, setting fields, value "${field}: rolls".`
        : `${field} is ${kind === "counter" ? "a counter" : `a field of kind ${kind}`}, not kept rolls: keep and use take a field declared as rolls, such as portent.`;
}

/** " Elara keeps 3, 4 in portent: give from Elara.": the characters whose field holds the number use asked for, when the page asked does not (KEP-3). */
function otherKeepers(world: World, kept: KeptField, value: number): string
{
    const others = world.pages.filter((page) => page !== kept.page && page.system === undefined).flatMap((page) => {
        const written = valueNamed(page.fields, kept.field);
        const values = (Array.isArray(written) ? written : written === undefined ? [] : [written]).map(numberOf).filter((number) => number !== undefined);
        return values.includes(value) ? [`${page.name} keeps ${values.join(", ")} in ${kept.field}: give from ${page.name}.`] : [];
    });
    return others.length === 0 ? "" : ` ${others.join(" ")}`;
}

/** The roll, with a kept number in place of its one die when use gives one (KEP-3). */
function rollWith(notation: string, used: { value: number; } | undefined, source: { values: number[]; } | { random(sides: number): number; }): DiceRoll
{
    if (used === undefined) {
        return rollDice(notation, source);
    }

    try {
        return rollDice(notation, { values: [used.value] });
    } catch (error) {
        // A kept number is not a face rolled now: there is nothing to roll again.
        const why = (error instanceof DiceError ? error.message : String(error)).replace(/: ask the player to roll it again\.$/, "");
        throw new Error(`A kept roll takes the place of one die, of the kind it was rolled with: give a notation with that one die, such as 1d20+2 (${why}). Nothing rolled.`);
    }
}

/** Writes the dice rolled in the field of kept rolls, in place of what it held (KEP-2), and says so. */
function keepFaces(kept: KeptField, faces: number[]): string
{
    writePage(kept.world, kept.page.name, undefined, { set: { [kept.field]: faces } });
    return `${kept.page.name} keeps in ${kept.field}: ${faces.join(", ")}${kept.values.length === 0 ? "" : `, in place of ${kept.values.join(", ")}`}.`;
}

/** Takes the kept number used from its field (KEP-3), and says what is left. */
function takeKept(kept: KeptField & { value: number; }): string
{
    const left = [...kept.values];
    left.splice(left.indexOf(kept.value), 1);
    writePage(kept.world, kept.page.name, undefined, left.length === 0 ? { unset: [kept.field] } : { set: { [kept.field]: left } });
    return `${kept.value} from ${kept.page.name}'s ${kept.field} took the place of the die; ${left.length === 0 ? "none is left" : `left: ${left.join(", ")}`}.`;
}

/**
 * The page of who rolls, a character or a copy in the open scene, with its world; undefined when who names neither, as a free label does. Without names to
 * read, a name two pages share is a label too: the roll needs no sheet.
 */
export function rollerOf(root: string, context: Context, who: string | undefined, readsSheet: boolean): { world: World; page: Page; } | undefined
{
    if (who === undefined) {
        return undefined;
    }

    const world = campaignWorld(root, context);
    const named = pagesWithName(world, who);
    const page = readsSheet ? findPage(world, who) : named.length === 1 ? named[0] : undefined;

    if (page !== undefined) {
        return { world, page };
    }

    const { scene } = readOpenScene(root);
    const copy = scene === undefined ? undefined : sameName(Object.keys(scene.copies), who);
    return scene === undefined || copy === undefined ? undefined : { world, page: copyPage(copy, scene.copies[copy]) };
}

/** Whether a notation names a field, such as athletics in 1d20+athletics (DAT-8). */
export function hasNames(notation: string): boolean
{
    return [...notation.matchAll(namePattern)].some((match) => !diePattern.test(notation.slice((match.index ?? 0) + match[1].length + match[2].length)));
}

/** The notation with each name of a field as 0, to tell whether it is dice before a sheet is read: 1d20+athletics as 1d20+0. */
export function namesAsZero(notation: string): string
{
    return notation.replace(namePattern, (whole: string, sign: string, space: string, name: string, offset: number) => (diePattern.test(notation.slice(offset + sign.length + space.length)) ? whole : whole.replace(name, "0")));
}

/** The notation with each name of a field replaced by its value on the sheet of who rolls, effects and formulas included, and the values taken (DAT-8). */
export function withSheetValues(notation: string, roller: { world: World; page: Page; } | undefined, who: string | undefined, system: GameSystem | undefined): { notation: string; taken: Record<string, number>; }
{
    const taken: Record<string, number> = {};
    const fields = roller === undefined ? undefined : effectiveFields(roller.world, roller.page);
    const replaced = notation.replace(namePattern, (whole: string, sign: string, space: string, name: string, offset: number) => {
        if (diePattern.test(notation.slice(offset + sign.length + space.length))) {
            return whole;
        }

        // "sleight of hand": a name of several words, which a notation cannot hold.
        const words = /^\s+[A-Za-z]/.test(notation.slice(offset + whole.length));
        checkNotScore(roller, system, fields, name);
        const value = sheetValue(roller, fields, name, who, words);
        taken[name] = value;
        const negative = (sign === "-") !== (value < 0);
        return `${negative ? "-" : sign === "" ? "" : "+"}${Math.abs(value)}`;
    });
    return { notation: replaced, taken };
}

/** Refuses a score the system shows with a modifier beside it, such as str with str-mod (DAT-2): a roll adds the modifier, and 1d20+str would add the score. */
function checkNotScore(roller: { world: World; page: Page; } | undefined, system: GameSystem | undefined, fields: Record<string, unknown> | undefined, name: string): void
{
    // Only a score with its modifier beside it, as str with str-mod; not a speed with the one written beside it (SPD-1).
    const entry = system?.sheet.flatMap((group) => group.entries).find((candidate) =>
        candidate.beside !== undefined && comparableText(candidate.field) === comparableText(name) && roller !== undefined && declaredKind(roller.world, candidate.beside) === "modifier"
    );
    const read = (field: string): unknown => Object.entries(fields ?? {}).find(([key]) => comparableText(key) === comparableText(field))?.[1];
    const modifier = entry?.beside === undefined ? undefined : numberOf(read(entry.beside));

    if (roller !== undefined && entry?.beside !== undefined && modifier !== undefined) {
        const worked = `${entry.beside} ${signedText(roller.world, entry.beside, modifier)}`;
        throw new Error(`${name} ${String(read(name))} is a score: the system ${system?.name ?? ""} works out ${worked} from it, which is what a roll adds, such as 1d20+${entry.beside}. Nothing rolled.`);
    }
}

/** The whole number a field holds on the sheet of who rolls; refused, with the numbers it has, when there is no sheet or it holds none. */
function sheetValue(roller: { world: World; page: Page; } | undefined, fields: Record<string, unknown> | undefined, name: string, who: string | undefined, words: boolean): number
{
    const page = roller?.page;

    if (roller === undefined || fields === undefined || page === undefined) {
        throw new Error(
            who === undefined
                ? `"${name}" is no die: to take it from a sheet, give who rolls, such as who Bruna; or give the number, such as 1d20+5.`
                : `There is no page named ${who}, nor a copy of that name in the open scene, to take ${name} from: give who as the name of a character, or the number in the notation.`,
        );
    }

    const value = valueNamed(fields, name);
    const number = numberOf(value);

    if (value === undefined) {
        // Only numbers: a class's martial-arts 1d6 or its features are no bonus (PRO-2).
        const numbers = workedFields(roller.world, fields).filter((worked) => numberOf(worked.value) !== undefined).map((worked) => `${worked.field} ${signedText(roller.world, worked.field, worked.value)}`);
        const has = numbers.length === 0 ? "" : ` Its numbers: ${numbers.join(", ")}.`;
        const subtraction = /-\d+$/.test(name) ? " To subtract, put spaces around the minus, such as 1d20+athletics - 1." : "";
        const hyphens = words ? " A name of several words is written with hyphens, such as sleight-of-hand." : "";
        throw new Error(`${page.name} has no ${name}.${has} Give one of them, or the number, such as 1d20+5.${subtraction}${hyphens}${missingSystemHint(roller.world)}`);
    }

    // One value for each item of a list, as the attacks of two weapons (PRO-5): the roll takes the number of the one used.
    const list = itemList(roller.world, name);
    const first = typeof value === "string" ? /[+-]\d+/.exec(value)?.[0] : undefined;

    if (number === undefined && list !== undefined && first !== undefined) {
        throw new Error(`${name} on ${page.name} is ${JSON.stringify(value)}, one for each item in its ${list}: give the number of the one used, such as 1d20${first}.`);
    }

    if (number === undefined || !Number.isInteger(number)) {
        throw new Error(`${name} on ${page.name} is ${JSON.stringify(value)}, not a whole number: give the number in the notation.`);
    }

    return number;
}

/**
 * "Lena has Poisoned, Bless, exhaustion 1: see whether they change this roll.": the effects on who rolls that are not already in their numbers, being no more
 * than a name, and the conditions (DAT-6); then the fields of their line written with ?, when they are not at zero (DAT-8).
 */
function rollerNote(world: World, system: GameSystem | undefined, page: Page): string | undefined
{
    const fields = effectiveFields(world, page);
    const effects = effectsOf(page).filter((effect) => effect.values.length === 0 || sameName(system?.conditions ?? [], effect.name) !== undefined);
    // Kept rolls are no number that changes a roll: use takes them.
    const marked = (system?.statusLine ?? []).filter((entry) => entry.whenSet && declaredKind(world, entry.field) !== "rolls").flatMap((entry) => {
        const value = valueNamed(fields, entry.field);
        const number = readCounter(value)?.value ?? numberOf(value);
        return number === undefined || number === 0 ? [] : [`${entry.field} ${number}`];
    });
    const all = [...effects.map((effect) => effect.name), ...marked];
    return all.length === 0
        ? undefined
        : `${page.name} has ${all.join(", ")}: if they change this roll, complete it: roll only what they add, such as one more die, and keep this one; never roll it again; a reroll of one die rolls that die alone and keeps the rest.`;
}

function revealHiddenRoll(rollId: string, root: string, context: Context): RollOutput
{
    const log = readLog(root);
    const hiddenRoll = log.find((entry) => entry.id === rollId && entry.type === "roll" && entry.visibility === "hidden");

    if (!hiddenRoll) {
        throw new Error(`There is no hidden roll with id ${rollId}.`);
    }

    const proof = String(hiddenRoll.data.proof);
    const alreadyRevealed = log.some((entry) => entry.type === "roll-revealed" && entry.data.roll === rollId);

    if (!alreadyRevealed) {
        appendLogEntry(root, newDatedLogEntry(root, context, "roll-revealed", "public", { roll: rollId, proof }));
    }

    return { kind: "reveal", id: rollId, text: String(hiddenRoll.data.result), proof, sha256: sha256(proof), fingerprint: String(hiddenRoll.data.fingerprint) };
}
