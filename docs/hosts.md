# Hosts

The master is an AI agent that works in the campaign's folder. Four are supported, each from its terminal and from its desktop app: Claude Code, Codex, Antigravity and OpenCode. `rpg init` sets a campaign up for all four. This page says what works in each today; where a cell is not green, the note under the table says what you will see.

Tried on Windows only. ✅ works · 🟡 works in part · ❌ not there · ❔ not tried yet

| | Claude Code<br>terminal | Claude Code<br>app | Codex<br>terminal | Codex<br>app | Antigravity<br>terminal | Antigravity<br>app | OpenCode<br>terminal | OpenCode<br>app |
|---|---|---|---|---|---|---|---|---|
| The campaign and its tools from the first message | ✅ | ✅ | ✅ | 🟡 <sup>1</sup> | ✅ | ✅ | ✅ | ✅ |
| The game's tools run without asking permission | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| The dashboard starts with the chat, and the master gives its link | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| A click on the dashboard reaches the chat | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Writing in the chat, or stopping it, while the master waits for a click | ✅ | ✅ | ✅ | ✅ | ✅ | 🟡 <sup>2</sup> | ✅ | ✅ |
| Pictures made by the chat in use | ✅ | ✅ | ✅ | ✅ | 🟡 <sup>3</sup> | 🟡 <sup>3</sup> | ✅ <sup>4</sup> | ✅ <sup>4</sup> |
| Importing an adventure from a document | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| The dashboard translated into a language that is not shipped | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| A system's rules translated as you read them | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Characters voiced by an agent of their own | ✅ | ✅ | ❌ <sup>5</sup> | ❌ <sup>5</sup> | ❌ <sup>5</sup> | ❌ <sup>5</sup> | 🟡 <sup>6</sup> | 🟡 <sup>6</sup> |
| The agent's own memory of past chats turned off | ✅ | ✅ | ✅ | ✅ | ❌ <sup>7</sup> | ❌ <sup>7</sup> | ❔ | ❔ |
| The master never writes the campaign's files by hand | ✅ | ✅ | ❔ | ❔ | 🟡 <sup>8</sup> | ❔ | ✅ | ✅ |
| The master's effort chosen in Settings | ✅ | ✅ | ✅ | ✅ | ❌ <sup>9</sup> | ❌ <sup>9</sup> | ❌ <sup>9</sup> | ❌ <sup>9</sup> |

## Notes

1. At the first message the master may tell you to close another chat of the campaign when there is none, and the app offers to import Claude Code's settings into the folder: decline.
2. A message you write while the master waits goes through in a few seconds. After Stop, a click on the dashboard waits for your next message in the chat.
3. Antigravity's own image tool fails on the free plan; the master then draws the picture itself. That second way is written and not yet tried on the real program.
4. The master draws the picture itself; a small local model draws a poor one.
5. The master voices every character itself.
6. The agent answers in the background and the master writes a line while it waits; a small local model may not call it by itself.
7. Antigravity's memory cannot be turned off for one folder; the master is told not to read it.
8. Any tool outside the game asks you first, but in a run without a screen the master ran commands that only read.
9. Set the effort in the agent itself.
