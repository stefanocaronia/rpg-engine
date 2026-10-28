// The random tables of the world's pages (D-503): the first table under a heading, rolled with the die it states or its rows give.
import type { Context } from "../../core/context.ts";
import { comparableText } from "../../core/text.ts";
import { DiceError, type FaceSource, readRandomTable, rollOnTable, type TableRoll } from "../../dice/index.ts";
import { baseChain, findPage, firstTable, pageNamed, parsePageReference, readSection, secretNames, sectionTitles } from "../../pages/index.ts";
import { campaignWorld, missingSystemHint } from "../shared/world.ts";

/** A roll on the table of a page's section, given as Page#Section; refused, saying what to fix, before anything is rolled. */
export function rollPageTable(root: string, context: Context, reference: string, source: FaceSource): TableRoll & { table: string; secret: boolean; }
{
    const { name, section } = parsePageReference(reference);

    if (name.trim() === "") {
        throw new Error(`Give the page before #, such as Colli di Vallerana#${section ?? "Incontri"}. Nothing rolled.`);
    }

    if (section === undefined || section === "") {
        throw new Error(`Give the section that holds the table after #, such as ${name || "Colli di Vallerana"}#Incontri. Nothing rolled.`);
    }

    const world = campaignWorld(root, context);
    const page = findPage(world, name) ?? pageNamed(world, name);

    if (page === undefined) {
        throw new Error(`There is no page named ${name}: give the page and the section of its table, such as Colli di Vallerana#Incontri; look for the page with the find command.${missingSystemHint(world)} Nothing rolled.`);
    }

    // The page's own section, or its nearest base's (INH-13).
    const text = [page, ...baseChain(world, page)].map((holder) => readSection(holder.body, section)).find((found) => found !== undefined);

    if (text === undefined) {
        const titles = sectionTitles(page.body);
        throw new Error(`${page.name} has no section "${section}". ${titles.length === 0 ? "It has no sections." : `Its sections are: ${titles.join(", ")}.`} Nothing rolled.`);
    }

    const table = firstTable(text);

    if (table === undefined) {
        throw new Error(
            `${page.name}#${section} holds no table: write one under its heading, the die in the first header cell and each row's numbers in the first column, such as | d8 | Encounter |, |---|---|, | 1–2 | Wolves |. Nothing rolled.`,
        );
    }

    try {
        // A table in a secret, or a secret named after #, is the master's alone.
        const secret = table.secret || secretNames(page.body).some((one) => comparableText(one) === comparableText(section));
        return { ...rollOnTable(readRandomTable(table.rows), source), table: `${page.name}#${section}`, secret };
    } catch (error) {
        if (error instanceof DiceError) {
            throw new Error(`The table of ${page.name}#${section}: ${error.message} Nothing rolled.`);
        }

        throw error;
    }
}
