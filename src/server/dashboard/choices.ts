// The choices waiting for the player on the dashboard (D-556): what the page shows of them, the player's answers as they make them, the rolls an option makes,
// and the confirm, which the master hears at their next call with the answers, while the player's own sentence rings for them.
import type { IncomingMessage, ServerResponse } from "node:http";
import { z } from "zod";
import { type ChoiceItem, type ChoiceSet, findCampaign, readChoices, readSettings, writeChoices } from "../../campaign/index.ts";
import { confirmedNotes, offeredPages, optionParts } from "../../commands/choices.ts";
import { campaignSystem, campaignWorld } from "../../commands/shared/campaign/world.ts";
import { type Knowledge, knownIntroduction, knowsPage, playerKnowledge, withPagesKnown } from "../../commands/shared/characters/knowledge.ts";
import { newDatedLogEntry } from "../../commands/shared/time/time.ts";
import { isLayered } from "../../commands/view/layers.ts";
import { appendLogEntry } from "../../core/log.ts";
import { withFiles } from "../../core/store.ts";
import { firstSentence } from "../../core/text.ts";
import { rollDice } from "../../dice/index.ts";
import { findPage, introductionText, withoutComments, type World } from "../../pages/index.ts";
import { actText } from "../player-acts.ts";
import { mostSaid, readBody, sendJson } from "./files.ts";
import type { Served } from "./index.ts";
import { deliverActs } from "./news.ts";

/** An option as the page shows it: the master's words, its label without dice, its dice when it is a roll, the pages it names with their titles and first sentences. */
export interface ShownOption
{
    text: string;
    label: string;
    notation?: string;
    pages?: OptionPage[];
}

/** A page an option names: its name, its title in the campaign's language, its first sentence as the character may read it. */
export interface OptionPage
{
    name: string;
    title: string;
    opening: string;
    /** It is, or derives from, a page of the game system the campaign changed with a layer (SYS-11). */
    layered?: true;
}

/** A set of choices as the page shows it. */
export interface ShownChoices
{
    id: string;
    title: string;
    who: string;
    made: string;
    confirmed?: string;
    items: { question: string; least: number; most: number; options: ShownOption[]; answer: string[]; rolled?: string; }[];
}

const answerBody = z.union([
    z.object({ id: z.string().min(1).max(64), item: z.number().int().min(0), answer: z.array(z.string().max(mostSaid)).max(200) }).strict(),
    z.object({ id: z.string().min(1).max(64), item: z.number().int().min(0), roll: z.string().max(mostSaid), faces: z.array(z.number().int()).max(100).optional() }).strict(),
    z.object({ id: z.string().min(1).max(64), confirm: z.literal(true), said: z.string().max(mostSaid) }).strict(),
]);

/** GET: the choices waiting, as the page shows them, and whether the player rolls their own dice. POST: an answer, a roll, or the confirm. */
export async function choicesRequest(request: IncomingMessage, response: ServerResponse, served: Served): Promise<void>
{
    const root = withFiles(served.session, () => findCampaign(served.context.folder));

    if (root === undefined) {
        sendJson(response, 404, { error: "No campaign here." });
        return;
    }

    if (request.method === "GET") {
        sendJson(response, 200, withFiles(served.session, () => shownChoices(root, served)));
        return;
    }

    const parsed = answerBody.safeParse(await readBody(request));

    if (!parsed.success) {
        sendJson(response, 400, { error: "Send { id, item, answer } with the options picked, { id, item, roll } with the option that rolls, or { id, confirm: true, said }." });
        return;
    }

    try {
        const body = parsed.data;
        withFiles(served.session, () => {
            if ("confirm" in body) {
                confirm(root, served, body.id, body.said);
            } else if ("roll" in body) {
                roll(root, served, body.id, body.item, body.roll, body.faces);
            } else {
                answer(root, body.id, body.item, body.answer);
            }
        });
        served.notify();
        sendJson(response, 200, withFiles(served.session, () => shownChoices(root, served)));
    } catch (error) {
        sendJson(response, 409, { error: error instanceof Error ? error.message : String(error) });
    }
}

/**
 * What the master hears at the head of their next call of the choices the player confirmed (D-556): the answers to write, with the part of the game system on
 * what a level gives, once in a chat, as the call's told keeps it; a call that never answers keeps nothing it told, so the next one tells them again.
 */
export function choicesNews(served: Served, told?: Set<string>): { lines: string[]; restore(): void; }
{
    const root = withFiles(served.session, () => findCampaign(served.context.folder));
    const context = told === undefined ? served.context : { ...served.context, told };
    const lines = root === undefined ? [] : withFiles(served.session, () => confirmedNotes(root, context, campaignWorld(root, served.context), campaignSystem(root, served.context)));
    return { lines, restore: () => undefined };
}

function shownChoices(root: string, served: Served): { sets: ShownChoices[]; physical: boolean; }
{
    const world = campaignWorld(root, served.context);
    // The options' pages as the player reads them to choose (VIEW-2, VIEW-3).
    const known = playerKnowledge(root, world);
    const knowledge = known === undefined ? undefined : withPagesKnown(known, offeredPages(root, world));
    const sets = readChoices(root).map((set) => ({
        id: set.id,
        title: set.title,
        who: set.who,
        made: set.made,
        ...(set.confirmed === undefined ? {} : { confirmed: set.confirmed }),
        items: set.items.map((item) => ({
            question: item.question,
            least: item.pick.least,
            most: item.pick.most,
            options: item.options.map((option) => shownOption(world, knowledge, option)),
            answer: item.answer ?? [],
            ...(item.rolled === undefined ? {} : { rolled: item.rolled }),
        })),
    }));
    return { sets, physical: readSettings(root).dice === "physical" };
}

function shownOption(world: World, knowledge: Knowledge | undefined, option: string): ShownOption
{
    const parts = optionParts(option);
    const found = parts.pages.map((name) => findPage(world, name)).filter((page) => page !== undefined);
    const pages = found.filter((page, index) => found.findIndex((other) => other.name === page.name) === index).map((page) => {
        const introduction = knowledge === undefined ? withoutComments(introductionText(page.translated ?? page.body)) : knownIntroduction(world, knowledge, page);
        const layered = isLayered(world, page, (base) => knowledge === undefined || knowsPage(knowledge, base)) ? { layered: true as const } : {};
        return { name: page.name, title: page.title ?? page.name, opening: firstSentence(linkWords(world, introduction).replace(/\s+/g, " ").trim()), ...layered };
    });
    return {
        text: option,
        label: linkWords(world, parts.label).trim(),
        ...(parts.notation === undefined ? {} : { notation: parts.notation }),
        ...(pages.length === 0 ? {} : { pages }),
    };
}

/** A text's links as their words; one without words as its page's name in the campaign's language, a system page's title (D-542). */
function linkWords(world: World, text: string): string
{
    return text.replace(/\[\[([^\]|#]+)(?:#[^\]|]*)?(?:\|([^\]]*))?\]\]/g, (_, name: string, words?: string) => words ?? findPage(world, name)?.title ?? name);
}

/** The player's pick for an item, before the confirm: options of the item, as many as it allows; never one that rolls, nor in place of a roll made. */
function answer(root: string, id: string, index: number, picked: string[]): void
{
    const { sets, set, item } = waiting(root, id, index);
    const unique = [...new Set(picked)];

    if (item.rolled !== undefined) {
        throw new Error("A roll made stays: this choice is answered.");
    }

    if (unique.some((option) => !item.options.includes(option) || optionParts(option).notation !== undefined)) {
        throw new Error("Pick among the options of this choice; one that rolls is rolled.");
    }

    if (unique.length > item.pick.most) {
        throw new Error(`This choice takes at most ${item.pick.most}.`);
    }

    write(root, sets, set, index, { ...item, answer: unique });
}

/** An option that rolls, picked: the engine rolls it, or reads the player's own dice, logs it as the player's roll, and keeps it as the answer. */
function roll(root: string, served: Served, id: string, index: number, option: string, faces: number[] | undefined): void
{
    const { sets, set, item } = waiting(root, id, index);
    const notation = item.options.includes(option) ? optionParts(option).notation : undefined;

    if (notation === undefined) {
        throw new Error("That option does not roll.");
    }

    if (item.rolled !== undefined) {
        throw new Error("A roll made stays: this choice is answered.");
    }

    const physical = readSettings(root).dice === "physical";

    if (physical !== (faces !== undefined)) {
        throw new Error(physical ? "The player rolls their own dice here: send the faces." : "The engine rolls the dice here: send no faces.");
    }

    const diceRoll = rollDice(notation, faces === undefined ? { random: served.context.random } : { values: faces });
    // The roll reads by its question, as Hit points, on the dashboard's list of rolls.
    const why = `${item.question}: ${optionParts(option).label}`;
    const data = { notation: diceRoll.notation, total: diceRoll.total, result: diceRoll.text, why, check: item.question, who: set.who, physical, dice: diceRoll.dice };
    appendLogEntry(root, newDatedLogEntry(root, { ...served.context, actor: "player" }, "roll", "public", data));
    write(root, sets, set, index, { ...item, answer: [option], rolled: diceRoll.text });
}

/** The confirm: every choice answered as it allows; the set waits for the master with its answers, and the player's sentence rings for them. */
function confirm(root: string, served: Served, id: string, said: string): void
{
    const { sets, set } = waiting(root, id, 0);
    const open = set.items.find((item) => (item.answer ?? []).length < item.pick.least || (optionParts(item.answer?.[0] ?? "").notation !== undefined && item.rolled === undefined));

    if (open !== undefined) {
        throw new Error(`${open.question} still waits for an answer.`);
    }

    const confirmed = { ...set, confirmed: served.context.now().toISOString().slice(0, 10) };
    writeChoices(root, sets.map((other) => (other.id === id ? confirmed : other)));
    appendLogEntry(root, newDatedLogEntry(root, { ...served.context, actor: "player" }, "choices-confirmed", "public", { who: set.who, title: set.title }));
    const text = actText(said);

    if (text !== "") {
        served.acts.pending.push({ id: served.context.newId(), text });
        deliverActs(served);
    }
}

/** A set still waiting for the player, by its id, with one of its items. */
function waiting(root: string, id: string, index: number): { sets: ChoiceSet[]; set: ChoiceSet; item: ChoiceItem; }
{
    const sets = readChoices(root);
    const set = sets.find((candidate) => candidate.id === id);

    if (set === undefined) {
        throw new Error("These choices are no longer there: the master took them away or heard them.");
    }

    if (set.confirmed !== undefined) {
        throw new Error("These choices are confirmed: they are the master's now.");
    }

    const item = set.items[index];

    if (item === undefined) {
        throw new Error("No such choice in this set.");
    }

    return { sets, set, item };
}

function write(root: string, sets: ChoiceSet[], set: ChoiceSet, index: number, item: ChoiceItem): void
{
    writeChoices(root, sets.map((other) => (other.id === set.id ? { ...set, items: set.items.map((one, at) => (at === index ? item : one)) } : other)));
}
