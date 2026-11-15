// Antigravity's approval of the rpg tools: `rpg --approve`, the hook init writes before each tool, lets the rpg server's tools run without asking, and the
// reading of their descriptions, which Antigravity keeps in its own folder; every other tool asks the player, as the app would.

/** Reads the hook's input and answers it on its output. */
export async function approveHere(): Promise<void>
{
    let input = "";

    for await (const chunk of process.stdin) {
        input += String(chunk);
    }

    process.stdout.write(JSON.stringify(approval(input)));
}

/** Antigravity's decision for a tool call, as its hook gives it: auto_approve for the rpg server's tools and their descriptions, else ask. */
export function approval(input: string): { decision: "auto_approve" | "ask"; }
{
    const call = toolCall(input);
    const args = call.args ?? {};
    const rpgTool = call.name === "call_mcp_tool" && args.ServerName === "rpg";
    // The description of an rpg tool, which Antigravity reads before it calls one.
    const rpgDescription = call.name === "read_file" && typeof args.Path === "string" && /[\\/]antigravity-cli[\\/]mcp[\\/]rpg[\\/][\w-]+\.(?:json|md)$/i.test(args.Path);
    return { decision: rpgTool || rpgDescription ? "auto_approve" : "ask" };
}

function toolCall(input: string): { name?: unknown; args?: Record<string, unknown>; }
{
    try {
        const call = (JSON.parse(input) as { toolCall?: unknown; }).toolCall;
        return call !== null && typeof call === "object" ? call as { name?: unknown; args?: Record<string, unknown>; } : {};
    } catch {
        return {};
    }
}
