// The fake system's code, for the core's tests (D-513 (3), D-514): its down point counts one side. At 0 grit one of the party falls and is Down; at the start of
// each of their turns they mark one fading; a roll of 10 or more with two dice for them, or grit given back, brings them back; Steadied clears what they marked.
// As any package's code, it gives a command the player may run too, a line when time passes and a widget, which is the card a rally is asked in.
import type { CounterChange, Game, GameView, PackageEntry, Rolled, Widget } from "rpg-engine";

const grit = "grit";
const fading = { field: "fading", most: 3 };
const down = "Down";
const steadied = "Steadied";
const rally = "2d6";

const fake: PackageEntry = ({ z }) => ({
    commands: [{
        name: "fake-fading",
        description: "Tells how far someone Down has faded, as fading of the most. Example: fake-fading Ettore.",
        input: z.object({ who: z.string().trim().min(1) }),
        readOnly: true,
        positionals: ["who"],
        player: true,
        run: ({ who }, game) => fadingText(who, game),
    }],
    timePassed: ({ from, to }, game) => turned(from.day, to.day, game),
    widgets: { rally: (game, asked) => rallyWidget(game, asked?.key ?? asked?.who), down: (game, asked) => downWidget(game, asked?.who) },
    counterChanged: (change, game) => fell(change, game),
    turnStarted: ({ who }, game) => faded(who, game),
    rolled: (roll, game) => rallied(roll, game),
    effectAdded: ({ page, effect }, game) => (game.sameName(effect, steadied) ? cleared(page, game) : []),
    // A rally of one Down is asked in the card of its widget, with no button to turn it down; the stamina dice of a breather with their rule.
    asking: ({ who, notations, recipe }, game) =>
        recipe === "breather"
            ? { rule: "Each die adds the might bonus" }
            : game.page(who)?.has(down) === true && notations.length > 0 && notations.every((notation) => notation.replace(/\s+/g, "") === rally)
            ? { card: { widget: "rally", key: who }, decline: false, rule: "10 or more rallies" }
            : undefined,
});

export default fake;

/** One of the party whose grit came to 0 from above falls; given grit back, they rise, with what they marked cleared. */
function fell(change: CounterChange, game: Game): string[]
{
    if (change.field !== grit || game.page(change.page)?.party !== true) {
        return [];
    }

    if (change.before > 0 && change.after <= 0) {
        game.addEffect(change.page, down, "fell at 0 grit");
        return [`${change.page} falls: one fading at the start of each of their turns, ${fading.most} and they are gone. Read rules Falling.`];
    }

    if (change.before <= 0 && change.after > 0 && game.page(change.page)?.has(down) === true) {
        game.endEffect(change.page, down, "grit given back");
        setCounters(game, change.page, { [fading.field]: 0 }, "grit given back");
        return [`${change.page} rises: Down ended, fading 0.`];
    }

    return [];
}

/** Who is Down marks one fading as their turn starts. */
function faded(who: string, game: Game): string[]
{
    const page = game.page(who);
    const marked = page?.counter(fading.field)?.value ?? 0;

    if (page === undefined || !page.has(down) || marked >= fading.most) {
        return [];
    }

    setCounters(game, who, { [fading.field]: marked + 1 }, "fading at the start of the turn");
    return [`${who} fades: ${fading.field} ${marked + 1}/${fading.most}.`];
}

/** Two dice of 10 or more for who is Down bring them back with 1 grit. */
function rallied(roll: Rolled & { who: string; }, game: Game): string[]
{
    const page = game.page(roll.who);

    if (page === undefined || !page.has(down) || roll.notation.replace(/\s+/g, "") !== rally || roll.total < 10) {
        return [];
    }

    game.endEffect(roll.who, down, "rallied with a roll of 10 or more");
    setCounters(game, roll.who, { [grit]: 1, [fading.field]: 0 }, "rallied");
    return [`${roll.who} rallies: grit 1, fading 0.`];
}

/** Steadied clears the fading marked. */
function cleared(page: string, game: Game): string[]
{
    setCounters(game, page, { [fading.field]: 0 }, "steadied");
    return [`${page} is steadied: fading 0.`];
}

/** How far someone has faded, for the command. */
function fadingText(who: string, game: Game): string
{
    const page = game.page(who);

    if (page === undefined) {
        throw new Error(`No page alone is named ${who}: give the name of one of the party.`);
    }

    return page.has(down) ? `${page.name} is Down: ${fading.field} ${page.counter(fading.field)?.value ?? 0}/${fading.most}.` : `${page.name} is not Down.`;
}

/** A new day with someone of the party Down: a line for each, the day kept in the system's state, and a line in the log. */
function turned(from: number, to: number, game: Game): string[]
{
    const fallen = to > from ? (game.party()?.members ?? []).filter((member) => game.page(member.name)?.has(down) === true).map((member) => member.name) : [];

    if (fallen.length === 0) {
        return [];
    }

    game.state.write({ day: to, down: fallen });
    game.log(`a new day with ${fallen.join(", ")} Down`);
    return fallen.map((who) => `${who} is still Down on day ${to}.`);
}

/** The one a card asks for or shows, or the first of the party who is Down, with their fading; nothing in the column while no one is. */
function rallyWidget(game: GameView, key: string | undefined): Widget | undefined
{
    const who = key ?? game.party()?.members.find((member) => game.page(member.name)?.has(down) === true)?.name;
    const page = who === undefined ? undefined : game.page(who);

    // A card shows the one it asks for, risen or not; the column only who is Down.
    if (page === undefined || (key === undefined && !page.has(down))) {
        return undefined;
    }

    const marked = page.counter(fading.field)?.value ?? 0;
    // For its page code's card and page, who it shows and how far they faded.
    return { says: `${page.name} is Down`, data: { who: page.name, fading: marked }, parts: [{ who: page.name, does: "fades" }, { track: { label: "Fading", value: marked, max: fading.most } }] };
}

/** One of the party who is Down, on them (D-514): the word of their state, and how far they faded, the counter that leaves the line of values; nothing else. */
function downWidget(game: GameView, who: string | undefined): Widget | undefined
{
    const page = who === undefined ? undefined : game.page(who);

    if (page === undefined || !page.has(down)) {
        return undefined;
    }

    const marked = page.counter(fading.field)?.value ?? 0;
    return {
        icon: "fade",
        chip: "Down",
        says: { text: "{who} is Down, fading {marked} of {most}", values: { who: page.name, marked, most: fading.most } },
        parts: [{ lead: "Down", tone: "bad" }, { track: { label: "Fading", value: marked, max: fading.most, tone: "bad", stage: "end", field: fading.field } }],
    };
}

/** Counters changed as the change command changes them, one by one, each to its value (D-514). */
function setCounters(game: Game, page: string, values: Record<string, number>, why: string): void
{
    for (const [field, value] of Object.entries(values)) {
        game.change(page, field, { to: value }, why);
    }
}
