# 12 Altri host: the gorge of 06 with Codex as the master

The scene of `06-la-forra-dell-orso` (the party at 3rd level, an owlbear in a gorge with a map), played with Codex as the master's host instead of Claude Code: `--master-host codex` ([codex-master.mjs](../codex-master.mjs)). Codex runs as a new user would have it, with only the campaign: a Codex home of its own in the run's output folder, holding the login and the campaign's trust, so that it reads the AGENTS.md and the `.codex/config.toml` that `rpg init` writes, and the rpg server they name. It shows whether the start lines and the tools work in another host: `instructions` then `status` first, the turns, the rolls, the map, the dying point if it comes, the buttons (Codex in `exec` shows no forms, so `ask` falls back to words). The player is the same, Claude with `players/marco.md`. Codex's tokens are limited: one short evening.

## The campaign

As `06-la-forra-dell-orso/start.md` says, from its `world/`, with its settings and `rpg advance --to "day 1, 10:00"`, in a new folder such as `<runs>\2026-10-18\1\forra`.

## The session

One evening: «Ciao! Siamo all'imbocco della forra, cominciamo?», with `--prepared playtests\06-la-forra-dell-orso\brief.md --master-host codex --max 12`, no `--dashboard`: each Codex turn starts a new rpg server, so the page would not live from one turn to the next. Then the checklist, against 06 played by Claude Code.

## What to watch

| | Moment | What should happen |
|---|---|---|
| H1 | The first turn | `instructions`, then `status`, before the first narration; the campaign read with `show` |
| H2 | Every turn | Only the rpg server's tools; no shell command that writes |
| H3 | The fight | `scene` open, order, next; `move --at` on the map; damage with `change … --damage`; the player's rolls asked with `ask`, in words when no form shows |
| H4 | The craft | Checklist A as for Claude Code: behind the scenes, stakes before a roll, short messages, the player's choices |
| H5 | Speed and cost | Seconds and steps per turn; Codex's tokens per turn, from `turns/M*.codex.jsonl` |
