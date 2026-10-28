import { z } from "zod";
import { requireCampaign } from "../campaign/index.ts";
import { defineCommand } from "../core/registry.ts";
import { pageTypeNames, searchPages, searchSystemPages } from "../pages/index.ts";
import { skippedPagesNote } from "./game/notes.ts";
import { campaignWorld, foreignSystemLanguage, systemSearchHint } from "./game/world.ts";

// The pages of the game system that find lists for one text; the others are counted.
const listedSystemPages = 10;

export const find = defineCommand({
    name: "find",
    description: "Find pages of the world. "
        + "It looks for a text in their names, fields and text, or lists the pages of a type; the game system's pages only by their names and fields. "
        + "Use it when you do not know a page's exact name, and before creating a page, to check that it does not exist under another name. "
        + 'Example: text "lanterna"; or type place.',
    group: "game",
    readOnly: true,
    positionals: ["text"],
    input: z.object({
        text: z.string().optional().describe("text to look for, ignoring case; every page if left out"),
        type: z.enum(pageTypeNames).optional().describe(`only pages of this type: ${pageTypeNames.join(", ")}`),
    }),

    run(input, context)
    {
        const world = campaignWorld(requireCampaign(context.folder), context);
        const matches = searchPages(world, input).map(({ page, excerpt }) => ({ page: page.name, type: page.type, path: page.path, excerpt }));
        // The game system's pages are found by name only, and listed only for a text: there may be hundreds (SYS-3).
        const withText = (input.text?.trim() ?? "") !== "";
        const system = searchSystemPages(world, input);
        const listed = withText ? system.slice(0, listedSystemPages).map(({ page, excerpt }) => ({ page: page.name, type: page.type, excerpt })) : [];
        const byName = system.slice(listed.length).filter((match) => match.excerpt === undefined).length;
        const systemFound = { system: world.system?.name, systemMatches: listed, systemMore: system.length - listed.length, systemMoreByName: byName, withText, type: input.type };
        return { matches, ...systemFound, language: foreignSystemLanguage(world), searchHint: systemSearchHint(world).trim(), problems: world.problems };
    },

    format(result)
    {
        const lines = result.matches.map((match) => `${match.page} (${match.type ?? "free page"})${match.excerpt === undefined ? "" : `: ${match.excerpt}`}`);
        const system = result.systemMatches.map((match) => `${match.page} (${match.type ?? "page"}, system ${result.system ?? ""})${match.excerpt === undefined ? "" : `: ${match.excerpt}`}`);
        const found = [...lines, ...system];
        const note = systemNote(result, lines.length > 0);
        // A name said in play and never written is no page: the player who remembers it is right (D-266).
        const unwritten = result.withText ? " What was said in play and never written is not in the files: if the player remembers it, write it." : "";
        const none = `${note === "" || result.withText ? "No page matches." : "No page of the campaign matches."}${unwritten}`;
        return [found.length > 0 ? found.join("\n") : none, note, skippedPagesNote(result.problems)].filter((block) => block !== "").join("\n\n");
    },
});

/** What find says of the game system's pages it does not list: how many more there are and how to find them, or that it names them in another language. */
function systemNote(result: { system?: string; systemMatches: unknown[]; systemMore: number; systemMoreByName: number; withText: boolean; type?: string; language?: string; searchHint: string; }, listed: boolean): string
{
    if (result.system === undefined) {
        return "";
    }

    const named = result.language;

    if (!result.withText && result.systemMore > 0) {
        const what = `${result.type ?? "page"}${result.systemMore === 1 ? "" : "s"}`;
        const language = named === undefined ? "" : `, named in ${named}`;
        return `The system ${result.system} has ${result.systemMore}${listed ? " more" : ""} ${what}${language}: give part of a name${named === undefined ? "" : `, in ${named},`} to find them.`;
    }

    // Those by name come first: what is left beyond them is found only in fields, which more of a name will not narrow.
    if (result.systemMore > 0) {
        const fields = result.systemMore - result.systemMoreByName;
        const how = result.systemMoreByName > 0 ? "give more of the name" : "find takes one text: give a rarer one, or show a page that lists them";
        const which = result.systemMoreByName > 0 && fields > 0 ? ` (${result.systemMoreByName} by name, ${fields} in their fields)` : result.systemMoreByName === 0 ? " whose fields name it" : "";
        return `And ${result.systemMore} more of the system ${result.system}${which}: ${how}.`;
    }

    // Nothing of the system found: how find looks for its pages, when nothing at all was found or they are named in another language (D-165).
    return result.withText && result.systemMatches.length === 0 && (!listed || named !== undefined) ? result.searchHint : "";
}
