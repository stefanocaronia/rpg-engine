// Another character's view, for the agent voicing them
import { firstSentence, withArticle } from "../../core/text.ts";
import { isPlayerCharacter, locate, type Page, pagesWithNameOrAlias, parsePageReference, playerCharacters, type World } from "../../pages/index.ts";
import { formatGameDate } from "../../time/index.ts";
import { discoveredSecrets, knownIntroduction, knowsPage, scenesLivedBy } from "../shared/characters/knowledge.ts";
import { quotedOrders, standingOrders } from "../shared/characters/orders.ts";
import { keepsDiary, thoughtsIn, thoughtsRule, thoughtsShown } from "../shared/characters/thoughts.ts";
import { readOpenScene } from "../shared/scene/scene.ts";
import { sheetText } from "../shared/sheet/sheet.ts";
import { readPresent } from "../shared/time/time.ts";
import { shownName, shownPage } from "./page.ts";
import { type PlaceSight, sceneLine } from "./place.ts";
import type { ViewResult } from "./result.ts";

// How a player character is played while their player is away (D-480 (4)).
const awayRule = "You play while your player is away: no big decision, nothing precious spent, no needless risk.";

/**
 * What a character other than the player's knows and lived, for the character agent voicing them (VIEW-10): their page as they know it, with their sheet; now; the pages they know,
 * each in a line; the secrets of other pages they discovered; the scenes they were in.
 */
export function memoryOf(sight: PlaceSight): Extract<ViewResult, { kind: "memory"; }>
{
    const { root, context, world, knowledge } = sight;
    const self = knowledge.pc;
    // A lone player character's player is never away.
    const away = isPlayerCharacter(self) && self.fields.status !== "dead" && playerCharacters(world).filter((one) => one.fields.status !== "dead").length > 1;
    // The player's standing orders, for a living companion and a player character played as one (D-563).
    const orders = (away || self.fields.role === "companion") && self.fields.status !== "dead" ? standingOrders(root) : [];
    const own = shownPage(root, context, world, knowledge, self, true);
    const now = readPresent(root).date;
    const { scene } = readOpenScene(root);
    const inScene = scene !== undefined && scene.with.some((link) => pagesWithNameOrAlias(world, parsePageReference(link).name)[0] === self);
    const line = inScene ? sceneLine(sight, (name) => shownName(world, knowledge, name), self) : undefined;
    const known = [...knowledge.pages].filter((page) => page !== self && page.system === undefined).map((page) => {
        const introduction = firstSentence(knownIntroduction(world, knowledge, page).split("\n")[0]);
        return `${page.name} (${page.type ?? "page"})${introduction === "" ? "" : `: ${introduction}`}`;
    });
    return {
        kind: "memory",
        title: own.title,
        sheet: own.sheet,
        text: own.text,
        ...(now === undefined ? {} : { now: formatGameDate(now) }),
        place: locate(world, self).chain.filter((holder) => knowsPage(knowledge, holder)).map((holder) => holder.name),
        ...(line === undefined ? {} : { scene: line }),
        known,
        discovered: discoveredSecrets(world, knowledge).map((secret) => `${secret.page}#${secret.name}: ${secret.text.replace(/\s*\n\s*/g, " ")}`),
        lived: scenesLivedBy(root, world, self).map((one) => `${one.date === undefined ? "" : `${one.date} · `}${one.title}${one.summary === "" ? "" : `: ${one.summary}`}`),
        // Their own last lines, hidden or public alike (DIA-3).
        ...(keepsDiary(self)
            ? {
                thoughts: thoughtsIn(root, world, self).slice(-thoughtsShown).map((one) => `${one.date === undefined ? "" : `${one.date} · `}${one.text}`),
                thoughtsRule: thoughtsRule(self.fields.role === "companion"),
            }
            : {}),
        ...(away ? { away: awayRule } : {}),
        ...(orders.length === 0 ? {} : { orders }),
    };
}

/** What a character knows and lived, as the character agent voicing them reads it in the chat (VIEW-10). */
export function memoryText(result: Extract<ViewResult, { kind: "memory"; }>): string
{
    const list = (title: string, lines: string[]): string => (lines.length === 0 ? "" : `${title}:\n${lines.map((line) => `- ${line}`).join("\n")}`);
    const where = result.place.length === 0 ? "" : `in ${result.place.join(" › ")}`;
    const now = [result.now ?? "", where].filter((part) => part !== "").join(", ");
    return [
        result.title,
        sheetText(result.sheet).join("\n"),
        result.text,
        now === "" ? "" : `Now: ${now}`,
        result.scene === undefined ? "" : `Scene: ${result.scene}`,
        list("Known", result.known),
        list("Discovered", result.discovered),
        list("Lived", result.lived),
        result.thoughts === undefined ? "" : thoughtsText(result.thoughts, result.thoughtsRule ?? thoughtsRule(true)),
        result.away ?? "",
        // Last, where it is read just before the character speaks.
        result.orders === undefined
            ? ""
            : `Your party's standing orders: ${quotedOrders(result.orders)}. Keep them; if your character would balk, say so in the open rather than break one silently.`,
    ].filter((block) => block !== "").join("\n\n");
}

/** A character's last lines of their diary, and what to write in it (DIA-3). */
function thoughtsText(lines: string[], whatToWrite: string): string
{
    const rule = `When you write in it: ${whatToWrite}.`;
    return lines.length === 0 ? `Your diary: nothing yet. ${rule}` : `Your diary, the last lines:\n${lines.map((line) => `- ${line}`).join("\n")}\n${rule}`;
}

/** The character a character agent's view is for (VIEW-10), by name or alias; stops the command for any other page. */
export function characterNamed(world: World, name: string): Page
{
    if (name.trim() === "") {
        throw new Error("Give as the name of a character's page, such as as Varro: whose view it is.");
    }

    const page = pagesWithNameOrAlias(world, parsePageReference(name).name)[0];

    if (page?.type !== "character") {
        throw new Error(
            page === undefined
                ? `There is no character named ${name.trim()}: give as the name of a character's page, such as as Varro.`
                : `${page.name} is ${withArticle(page.type ?? "free page")}: as takes a character, whose view it is.`,
        );
    }

    return page;
}
