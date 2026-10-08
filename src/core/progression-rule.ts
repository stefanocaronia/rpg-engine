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
    /** `lists`: the character's lists a part's page adds to by the level of its item, written as its features, such as a domain's spells always prepared (PRO-7). */
    parts?: { list: string; field: string; lists?: string[]; };
    /** What write says when an item rises to a new level, such as raising hp-base (D-226). */
    levelUp?: string;
    /** The field of the experience points, the table of the points each level needs, and the rule to read when they reach a new one (PRO-6). */
    experience?: { field: string; table: string; rules?: string; };
}
