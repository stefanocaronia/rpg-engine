// Antigravity's approval of the rpg tools: `rpg --approve`, the hook init writes before each tool, lets the rpg server's tools run without asking, and the
// reading of their descriptions, which Antigravity keeps in its own folder; every other tool asks the player, as the app would. As it approves an rpg tool,
// it notes which campaign the conversation plays, for the router of Antigravity's app (D-578).
import { findCampaign } from "../campaign/index.ts";
import { userDataFolder } from "../core/context.ts";
import { noteConversation } from "./route/index.ts";

/** Reads the hook's input and answers it on its output, then notes the conversation's campaign. */
export async function approveHere(home = userDataFolder()): Promise<void>
{
    let input = "";

    for await (const chunk of process.stdin) {
        input += String(chunk);
    }

    process.stdout.write(JSON.stringify(approval(input)));
    noteCampaign(input, home);
}

/** Antigravity's decision for a tool call, as its hook gives it: auto_approve for the rpg server's tools and their descriptions, else ask. */
export function approval(input: string): { decision: "auto_approve" | "ask"; }
{
    const call = toolCall(input);
    const args = call.args ?? {};
    // The description of an rpg tool, which Antigravity reads before it calls one.
    const rpgDescription = call.name === "read_file" && typeof args.Path === "string" && /[\\/]antigravity-cli[\\/]mcp[\\/]rpg[\\/][\w-]+\.(?:json|md)$/i.test(args.Path);
    return { decision: isRpgTool(input) || rpgDescription ? "auto_approve" : "ask" };
}

/** For a call of an rpg tool, notes in `home` the campaign of the hook's folder as the one its conversation plays; nothing outside a campaign. */
export function noteCampaign(input: string, home: string): void
{
    const { conversationId, cwd } = hookFields(input);
    const root = isRpgTool(input) && typeof conversationId === "string" ? findCampaign(typeof cwd === "string" ? cwd : process.cwd()) : undefined;

    if (root !== undefined && typeof conversationId === "string") {
        noteConversation(home, conversationId, root);
    }
}

function isRpgTool(input: string): boolean
{
    const call = toolCall(input);
    return call.name === "call_mcp_tool" && call.args?.ServerName === "rpg";
}

function toolCall(input: string): { name?: unknown; args?: Record<string, unknown>; }
{
    const call = hookFields(input).toolCall;
    return call !== null && typeof call === "object" ? call as { name?: unknown; args?: Record<string, unknown>; } : {};
}

function hookFields(input: string): { toolCall?: unknown; conversationId?: unknown; cwd?: unknown; }
{
    try {
        const parsed = JSON.parse(input) as unknown;
        return parsed !== null && typeof parsed === "object" ? parsed as { toolCall?: unknown; conversationId?: unknown; cwd?: unknown; } : {};
    } catch {
        return {};
    }
}
