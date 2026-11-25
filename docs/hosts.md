# Hosts

The master is an AI agent that works in the campaign's folder. Four are supported, each from its terminal, from its desktop app and from the chat inside the dashboard: Claude Code, Codex, Antigravity and OpenCode. `rpg init` sets a campaign up for all four. This page says what works in each today; where a cell is not green, the note under the table says what you will see.

Tried on Windows only. ✅ works · 🟡 works in part · ❌ not there · ❔ not tried yet

| | Claude Code<br>terminal | Claude Code<br>app | Claude Code<br>dashboard | Codex<br>terminal | Codex<br>app | Codex<br>dashboard | Antigravity<br>terminal | Antigravity<br>app | Antigravity<br>dashboard | OpenCode<br>terminal | OpenCode<br>app | OpenCode<br>dashboard |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| The campaign and its tools from the first message | ✅ | ✅ | ✅ | ✅ | 🟡 <sup>1</sup> | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| The game's tools run without asking permission | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| The dashboard starts with the chat, and the master gives its link | ✅ | ✅ | ✅ <sup>10</sup> | ✅ | ✅ | ✅ <sup>10</sup> | ✅ | ✅ | ✅ <sup>10</sup> | ✅ | ✅ | ✅ <sup>10</sup> |
| A click on the dashboard reaches the chat | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Writing in the chat, or stopping it, while the master waits for a click | ✅ | ✅ | ✅ <sup>12</sup> | ✅ | ✅ | ✅ <sup>12</sup> | ✅ | 🟡 <sup>2</sup> | ✅ <sup>12</sup> | ✅ | ✅ | ✅ <sup>12</sup> |
| Pictures made by the chat in use | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ <sup>14</sup> | ✅ <sup>3</sup> | ✅ <sup>3</sup> | ✅ <sup>3</sup> | ✅ <sup>4</sup> | ✅ <sup>4</sup> | ✅ <sup>4</sup> |
| Importing an adventure from a document | ✅ | ✅ | ✅ <sup>15</sup> | ✅ | ✅ | ❔ | ✅ | ✅ | ❔ | ✅ | ✅ | ❔ |
| The dashboard translated into a language that is not shipped | ✅ | ✅ | ✅ <sup>13</sup> | ✅ | ✅ | ✅ <sup>13</sup> | ✅ | ✅ | ✅ <sup>13</sup> | ✅ | ✅ | ✅ <sup>13</sup> |
| A system's rules translated as you read them | ✅ | ✅ | ❔ | ✅ | ✅ | ❔ | ✅ | ✅ | ❔ | ✅ | ✅ | ❔ |
| Characters voiced by an agent of their own | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ <sup>5</sup> | ✅ <sup>5</sup> | ✅ <sup>5</sup> | ✅ <sup>6</sup> | ✅ <sup>6</sup> | ✅ <sup>5</sup> |
| The agent's own memory of past chats turned off | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ <sup>7</sup> | ❌ <sup>7</sup> | ❌ <sup>7</sup> | ✅ <sup>16</sup> | ✅ <sup>16</sup> | ✅ <sup>16</sup> |
| The master never writes the campaign's files by hand | ✅ | ✅ | ✅ | ❔ | ❔ | ✅ | 🟡 <sup>8</sup> | ❔ | ✅ | ✅ | ✅ | ✅ |
| The master's effort chosen in Settings | ✅ | ✅ | ✅ <sup>11</sup> | ✅ | ✅ | ✅ <sup>11</sup> | ❌ <sup>9</sup> | ❌ <sup>9</sup> | 🟡 <sup>17</sup> | ❌ <sup>9</sup> | ❌ <sup>9</sup> | 🟡 <sup>17</sup> |

## Notes

1. At the first message the master may tell you to close another chat of the campaign when there is none, and the app offers to import Claude Code's settings into the folder: decline.
2. A message you write while the master waits goes through in a few seconds. After Stop, a click on the dashboard waits for your next message in the chat.
3. Antigravity paints them with its own image tool on a paid Google plan. On the free plan that tool fails, and the master draws a simple vector picture itself; that second way is not yet tried on the real program.
4. The master draws the picture itself; a small local model draws a poor one.
5. The master writes a line of the story, and the character's answer comes a moment later.
6. As in Antigravity: a line of the story, then the character's answer. A small local model may not call the agent by itself.
7. Antigravity's memory cannot be turned off for one folder; the master is told not to read it.
8. Any tool outside the game asks you first, but in a run without a screen the master ran commands that only read.
9. Set the effort in the agent itself.
10. The chat is in the dashboard itself: there is no link to give.
11. Chosen beside the model, as the chat opens.
12. A message written while the master waits for a click goes through, and the question is left; stopping while a question waits is not tried yet.
13. Tried with no chat open: the translation is made outside the chat, by the AI app the engine finds on this computer.
14. Codex paints the picture and hands it to the game at medium effort; at low effort a small model paints it and forgets to hand it over.
15. Tried from a chat that sat at the table by hand; Claude Code read the document.
16. OpenCode keeps no memory between chats.
17. Only for the model the agent would play by itself; any other plays at the agent's own effort.
