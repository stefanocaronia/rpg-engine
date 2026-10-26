// The examples in the commands' descriptions (D-518): a description writes {{counter}} where an example names a game's thing, filled with the names of the
// campaign's system where the MCP server runs in one, else with neutral names, as the command line and the reference have them.

/** What the descriptions' examples name, by placeholder. */
export interface Examples
{
    /** The counter damage takes from, as hp. */
    counter: string;
    /** A roll of a number of the sheet, as 1d20+str-save. */
    roll: string;
    /** Two checks of ask, each with its name and its dice, as Atletica 1d20+athletics. */
    check: string;
    otherCheck: string;
    /** A coin and a smaller one, as gp and sp. */
    coin: string;
    smallCoin: string;
    /** Three uses of a turn, as action, bonus action, reaction. */
    uses: string;
    /** A rest, as long rest. */
    rest: string;
    /** A counter of a pool of dice spent in a rest, as hit-dice-d6. */
    pool: string;
    /** A field an effect adds to, as bonus-ac. */
    bonus: string;
}

/** The examples of a game without a system, or with one that does not name them. */
export const neutralExamples: Examples = {
    counter: "health",
    roll: "2d6+wits",
    check: "Forza 2d6+strength",
    otherCheck: "Agilità 2d6+agility",
    coin: "gold",
    smallCoin: "silver",
    uses: "action, move, reaction",
    rest: "night's rest",
    pool: "stamina-d6",
    bonus: "bonus-armor",
};

/** A description with its {{placeholders}} filled from the examples; one the examples lack stays as written. */
export function withExamples(text: string, examples: Examples = neutralExamples): string
{
    return text.replace(/\{\{(\w+)\}\}/g, (whole, name: string) => (Object.hasOwn(examples, name) ? examples[name as keyof Examples] : whole));
}
