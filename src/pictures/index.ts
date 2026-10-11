// Pictures made from words (D-308): what makes them on the player's computer, injected through Context so that tests never spend; Codex's, the one there is.
export { codexPictures } from "./codex.ts";

/**
 * The brief of a place's picture (D-308): only what the party sees arriving, wide, without people, creatures or writing, the style the same for the campaign;
 * never what the table's lines and veils keep out of sight.
 */
export function placeBrief(name: string, seen: string, unseen: string[] = []): string
{
    return [
        "Use your built-in image generation tool to make exactly one new image from the brief below. Do not copy, save or edit any file and run no commands: "
        + 'the caller collects the image itself. If you cannot make it, reply with one line saying why; otherwise reply with only "done".',
        "",
        "Use case: illustration-story",
        "Asset type: wide banner for the location screen of a tabletop role-playing game, landscape, 21:9",
        `Primary request: ${name}, as adventurers see it arriving: ${seen}`,
        "Style/medium: painterly digital illustration, fantasy concept art, muted natural colours, soft brushwork",
        "Composition/framing: wide establishing shot at eye level, the subject in the middle third, edges that can be cropped",
        "Constraints: show only what is described; no people or creatures; no text, letters, numbers, signs, captions, logos, watermark or frame",
        ...(unseen.length === 0 ? [] : [`Never show: ${unseen.join("; ")}`]),
    ].join("\n");
}

/**
 * The brief of a quest's picture (D-388): the quest as the character knows it, as the banner of its card, wide and low, its subject in the middle third; people
 * and creatures only as small figures, no writing; never what the table's lines and veils keep out of sight.
 */
export function questBrief(name: string, known: string, unseen: string[] = []): string
{
    return [
        "Use your built-in image generation tool to make exactly one new image from the brief below. Do not copy, save or edit any file and run no commands: "
        + 'the caller collects the image itself. If you cannot make it, reply with one line saying why; otherwise reply with only "done".',
        "",
        "Use case: illustration-story",
        "Asset type: wide low banner for a quest card of a tabletop role-playing game, landscape, 16:6",
        `Primary request: the quest ${name}, as an emblem of what it is about: ${known}`,
        "Style/medium: painterly digital illustration, fantasy concept art, muted natural colours, soft brushwork",
        "Composition/framing: the subject in the middle third, half of the height shown, edges that can be cropped",
        "Constraints: people or creatures only as small distant figures, never faces; no text, letters, numbers, signs, captions, logos, watermark or frame",
        ...(unseen.length === 0 ? [] : [`Never show: ${unseen.join("; ")}`]),
    ].join("\n");
}
