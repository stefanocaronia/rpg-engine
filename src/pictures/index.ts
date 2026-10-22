// Pictures made from words (D-308, D-390): what makes them on the player's computer, chosen by the chat in use, injected through Context so that tests never
// spend: Codex's painted ones, else Claude's SVG ones; and the two programs themselves, found, installed and signed in with the player's yes (D-424).
export { creatureBrief, paintedBrief, placeBrief, portraitBrief, questBrief, svgBrief } from "./briefs.ts";
export { codexClient, hostPictures, hostReader, hostWriter } from "./chosen.ts";
export { claudePictures, claudeReader, claudeSays, claudeWriter } from "./claude.ts";
export { codexPictures, codexReader, codexSays, codexWriter } from "./codex.ts";
export { computerHelpers, helperChanges, helperCommand, helperEnvironment, helperLine, helperState, queueInCodex, toolsFolder } from "./helpers.ts";
export { stopProcess } from "./stop.ts";
export { cleanSvg, svgIn } from "./svg.ts";
