// Who makes the pictures, by the chat in use (D-390): in Codex, Codex; elsewhere Codex where it is ready, else Claude's SVG. Gemini's own pictures wait for
// Stefano's word on their cost; until then a Gemini chat goes the same way. Without any, the page shows its own picture all the same (D-389).
import type { PictureMaker } from "../core/context.ts";
import { claudePictures } from "./claude.ts";
import { codexPictures } from "./codex.ts";

/** The chat whose own pictures are Codex's, as its MCP client names itself. */
const codexClient = "codex-mcp-client";

/** The pictures of this computer for the chat `host` names, read when a picture is asked, as the MCP client said it at its start; Codex first, then Claude. */
export function hostPictures(host: () => string | undefined, codex: PictureMaker = codexPictures(), claude: PictureMaker = claudePictures()): PictureMaker
{
    const makers = (): PictureMaker[] => (host() === codexClient ? [codex] : [codex, claude]);
    const chosen = (again?: boolean): PictureMaker | undefined => makers().find((maker) => maker.ready(again).ready);
    return {
        ready: (again) => chosen(again)?.ready(again) ?? codex.ready(again),
        make: (subject) => (chosen() ?? codex).make(subject),
    };
}
