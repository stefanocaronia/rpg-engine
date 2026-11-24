/** The AI hosts the engine knows, each with its names: the one place where they are written. */
export const hosts = {
    // In the order `rpg --listen` lists them.
    claudeCode: { name: "Claude Code", client: "claude-code", hook: "claude" },
    codex: { name: "Codex", client: "codex-mcp-client", hook: "codex" },
    antigravity: { name: "Antigravity", client: "antigravity-client", hook: "antigravity" },
    openCode: { name: "OpenCode", client: "opencode", hook: "opencode" },
} as const satisfies Record<string, Host>;

/** A host's names. */
export interface Host
{
    /** Its name for the player. */
    name: string;
    /** How its MCP client names itself to the server. */
    client: string;
    /** The argument of `rpg --listen` in its hook files, written into campaigns: it never changes. */
    hook: string;
}

export type HostId = keyof typeof hosts;

export const hostIds = Object.keys(hosts) as HostId[];

/** The host whose MCP client names itself so; undefined for any other chat. */
export function hostOfClient(client: string | undefined): HostId | undefined
{
    return hostIds.find((id) => hosts[id].client === client);
}
