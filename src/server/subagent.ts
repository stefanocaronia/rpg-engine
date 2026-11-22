// The calls of the character agent where the host starts it as a subagent that has every rpg tool, as Codex and Antigravity do (D-580): it may only look.

/** The answer to a subagent's call of any tool but view. */
export const subagentRefusal = "You voice one character here: only view is yours, with as and your character's name. Answer with what you know.";

// The keys of the call's metadata by which Codex and Antigravity say who calls.
const codexTurnKey = "x-codex-turn-metadata";
const antigravityParentKey = "antigravity.google/parent_conversation_id";

/** Whether a tool call comes from a subagent, by its metadata: Codex's turn with thread_source subagent, as an object or as JSON, or Antigravity's parent conversation. */
export function fromSubagent(meta: unknown): boolean
{
    if (!isObject(meta)) {
        return false;
    }

    const parent = meta[antigravityParentKey];
    return (typeof parent === "string" && parent !== "") || codexTurn(meta[codexTurnKey])?.thread_source === "subagent";
}

// Codex's turn metadata, which comes as an object or as a JSON string; undefined when it is neither.
function codexTurn(value: unknown): Record<string, unknown> | undefined
{
    if (typeof value !== "string") {
        return isObject(value) ? value : undefined;
    }

    try {
        const parsed: unknown = JSON.parse(value);
        return isObject(parsed) ? parsed : undefined;
    } catch {
        return undefined;
    }
}

function isObject(value: unknown): value is Record<string, unknown>
{
    return typeof value === "object" && value !== null && !Array.isArray(value);
}
