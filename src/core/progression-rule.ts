// How a game system says that the classes of a character give the rows of their tables (D-219): shared by the system that declares it and the world that reads it.

/**
 * The list whose items give the row of their page's table at their number, such as classes; the column of the features, the columns that give nothing, and the
 * list of the pages that add features by level in the item they name in a field, such as subclasses with their class (D-219, PRO-1–PRO-3).
 */
export interface ProgressionRule
{
    list: string;
    features: string;
    skip: string[];
    parts?: { list: string; field: string; };
    /** What write says when an item rises to a new level, such as raising hp-base (D-226). */
    levelUp?: string;
    /** Fields whose value on an item's page is a formula worked out on the character, one value for each item, such as spell-save-dc (PRO-5, D-227). */
    formulas?: string[];
}
