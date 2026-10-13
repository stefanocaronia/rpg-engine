// The briefs of the pictures (D-308, D-388, D-390): a painted one for Codex, an SVG one for Claude, the same subject, never what the table keeps out of sight.
import type { PictureSubject } from "../core/context.ts";

/** The painted brief of a place's or a quest's picture, or a portrait, as Codex makes it. */
export function paintedBrief(subject: PictureSubject): string
{
    if (subject.kind === "portrait") {
        return portraitBrief(subject.name, subject.seen, subject.unseen, subject.who);
    }

    return subject.kind === "quest" ? questBrief(subject.name, subject.seen, subject.unseen) : placeBrief(subject.name, subject.seen, subject.unseen);
}

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

/**
 * The brief of a portrait of one of the party (D-408): the face, close, for the round token of the dashboard, exactly what the game says they are, their
 * people above all, with the look described, alone on a plain background, without writing; never what the table's lines and veils keep out of sight.
 */
export function portraitBrief(name: string, seen: string, unseen: string[] = [], who?: string): string
{
    return [
        "Use your built-in image generation tool to make exactly one new image from the brief below. Do not copy, save or edit any file and run no commands: "
        + 'the caller collects the image itself. If you cannot make it, reply with one line saying why; otherwise reply with only "done".',
        "",
        "Use case: illustration-story",
        "Asset type: square portrait for the round token of a character of a tabletop role-playing game, 1:1",
        ...portraitRequest(name, seen, who),
        "Style/medium: painterly digital illustration, fantasy concept art, muted natural colours, soft brushwork",
        "Composition/framing: a close-up of the face, centred, from the top of the head to the chin and only a hint of the shoulders, the face filling most of the picture; a plain softly lit background, nothing that matters near the corners, which a circle crops",
        "Constraints: this one figure alone; no text, letters, numbers, signs, captions, logos, watermark or frame",
        ...(unseen.length === 0 ? [] : [`Never show: ${unseen.join("; ")}`]),
    ].join("\n");
}

// The SVG drawing as Elena's probe proved it (12 October): depth from layers and gradients, a sober palette, and only the elements the engine keeps.
const svgOpening = "Draw exactly one picture as SVG code from the brief below. Reply with the SVG alone, from <svg to </svg>: no words, no code fence.";
const svgStyle = "Style/medium: vector illustration with depth: layered shapes from far to near, gradients for sky, light and water, far layers paler and bluer, "
    + "a few soft blurred shapes for mist and glow; a sober palette of muted natural colours";
const svgRules = "SVG rules: one <svg> root with only the viewBox above and xmlns; only the elements svg, g, defs, path, rect, circle, ellipse, polygon, polyline, line, "
    + "linearGradient, radialGradient, stop, clipPath, mask, filter, feGaussianBlur; no script, style, text, image, use, a, foreignObject or animation, "
    + "no event attributes, no href, no url() other than url(#id) of this file; under 40 KB";

/** The SVG brief of a place's or a quest's picture, or a portrait, as Claude draws it (D-342, D-390): the same subject as the painted one, in shapes the engine keeps. */
export function svgBrief(subject: PictureSubject): string
{
    const never = subject.unseen.length === 0 ? [] : [`Never show: ${subject.unseen.join("; ")}`];
    const portrait = [
        'Asset type: square portrait for the round token of a character of a tabletop role-playing game, viewBox="0 0 1024 1024" (1:1)',
        ...portraitRequest(subject.name, subject.seen, subject.who),
        svgStyle,
        "Composition/framing: a close-up of the face, centred, from the top of the head to the chin and only a hint of the shoulders, the face filling most of the picture; a plain softly lit background, nothing that matters near the corners, which a circle crops",
        "Constraints: this one figure alone; no text, letters, numbers, signs, logos or frame",
    ];
    const lines = subject.kind === "portrait"
        ? portrait
        : subject.kind === "quest"
        ? [
            'Asset type: wide low banner for a quest card of a tabletop role-playing game, viewBox="0 0 1600 600" (16:6)',
            `Primary request: the quest ${subject.name}, as an emblem of what it is about: ${subject.seen}`,
            svgStyle,
            "Composition/framing: the subject in the middle third, edges that can be cropped; the lower left corner and the top corners plain and darker, where the card writes over it",
            "Constraints: people or creatures only as small distant figures, never faces; no text, letters, numbers, signs, logos or frame",
        ]
        : [
            'Asset type: wide banner for the location screen of a tabletop role-playing game, viewBox="0 0 2100 900" (21:9)',
            `Primary request: ${subject.name}, as adventurers see it arriving: ${subject.seen}`,
            svgStyle,
            "Composition/framing: wide establishing shot at eye level, the subject in the middle third, edges that can be cropped",
            "Constraints: show only what is described; no people or creatures; no text, letters, numbers, signs, logos or frame",
        ];
    return [svgOpening, "", ...lines, ...never, svgRules].join("\n");
}

/** A portrait's request: who it is, what the game says they are, and the look described; faithful to their people as the game has them (D-408). */
function portraitRequest(name: string, seen: string, who: string | undefined): string[]
{
    return who === undefined || who === ""
        ? [`Primary request: a portrait of ${name}: ${seen}`]
        : [
            `Primary request: a portrait of ${name}, ${who}: ${seen}`,
            `Faithfulness: exactly what the game says they are (${who}), first their people as this game world has them, its build, features and colouring, `
            + "then the look described; nothing of another people",
        ];
}
