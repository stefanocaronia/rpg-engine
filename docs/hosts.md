# Playing in each AI host

rpg-engine plays with any AI host that runs MCP servers. The campaign lives in its files: the host must keep nothing of the game outside them, or a save you go
back to would still be remembered.

## Memory

- **Claude Code**: nothing to do. The campaign turns off its auto memory (`.claude/settings.json`).
- **Claude Desktop and claude.ai**: their memory belongs to your account, and no file in the campaign can turn it off. For the game's chats, turn memory off from
  the "+" menu before the first message, or use an incognito chat; or in Settings > Memory turn off memory and "Search and reference chats". Do not play in a
  Project that keeps memory.
- **Codex**: trust the campaign folder when Codex asks, or the campaign's settings (`.codex/config.toml`, memories off) are ignored. In the desktop app, check
  that memories are off for the game's chats too.
- **Gemini CLI**: trust the campaign folder when Gemini asks: its settings (`.gemini/settings.json`) give it the rpg server and the game's instructions, and
  keep it from writing files by itself.

## After going back to a save

The chat you were playing in remembers what is gone. Open a new chat with the master (`/clear` in Claude Code, a new conversation elsewhere) and write
"continua"; then press **I opened a new chat** in the dashboard's Saves, or tell the master in the new chat. Never resume the old chat: the master would remember
what the save took away.
