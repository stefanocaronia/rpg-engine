// Counts the numbers of a playtest run (checklist B12 and the items computable in part), the same way for every session and every run.
// Usage, after the run (see README.md): node playtests/count-playtest.mjs <results folder> <scenario's world folder>
// It prints a table to paste in the report, and writes the details next to the results folder, in numbers.json.
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, dirname, join } from "node:path";

const [results, scenarioWorld] = process.argv.slice(2);

if (results === undefined || scenarioWorld === undefined || !existsSync(results) || !existsSync(scenarioWorld)) {
    console.error("Usage: node playtests/count-playtest.mjs <results folder> <scenario's world folder>, such as F:\\sviluppo\\runs\\rpg-engine\\2026-10-05\\3\\results playtests/01-guadoscuro/world");
    process.exit(1);
}

const sessions = readdirSync(results).filter((name) => /^session-\d+$/.test(name) && existsSync(join(results, name, "end.json"))).sort((a, b) => sessionNumber(a) - sessionNumber(b));
const details = {};
let before = { pages: pageCount(scenarioWorld), log: {}, playerCost: 0 };

for (const name of sessions) {
    details[name] = countSession(join(results, name), before);
    before = { pages: details[name].pages.after, log: details[name].logWhole, playerCost: details[name].end.playerRunCost };
}

details.questionnaire = { playerCost: round(lastPlayerCost(join(results, "player-turns.jsonl")) - before.playerCost) };
writeFileSync(join(dirname(results), "numbers.json"), JSON.stringify(details, null, 2) + "\n");
console.log(markdown(details));

function countSession(folder, before)
{
    const meta = readJson(join(folder, "meta.json"));
    const end = readJson(join(folder, "end.json"));
    const campaignAfter = join(folder, "campaign-after");
    const eventPages = pageNames(join(campaignAfter, "world", "events"));
    const playerCharacters = pagesWith(join(campaignAfter, "world"), /^role:[ \t]*["']?pc["']?[ \t]*$/m);
    const turnFiles = readdirSync(join(folder, "turns")).filter((name) => /^M\d+\.jsonl$/.test(name)).sort((a, b) => turnNumber(a) - turnNumber(b));
    const turns = turnFiles.map((name) => ({ label: name.replace(".jsonl", ""), events: readLines(join(folder, "turns", name)) }));
    const player = playerMessages(join(folder, "dialogue.md"));
    const counts = {
        turns: turns.length,
        apiRounds: 0,
        calls: {},
        callsPerTurn: [],
        turnsWithoutCalls: [],
        toolSearch: [],
        otherTools: [],
        denials: [],
        errors: [],
        showWithSecret: 0,
        shows: 0,
        compactions: [],
        handshake: [],
        masterWords: [],
        masterWordsOutsideBrackets: [],
        playerWords: player.map(words),
        firstMessageQuestionMarks: 0,
        rolls: { total: 0, hidden: 0, physical: 0, reveals: 0, byWho: {} },
        scenes: {},
        advances: [],
        changes: {},
        clockSteps: [],
        effects: [],
        due: [],
        eventsByHand: [],
        newDays: [],
        playerMoves: [],
        learned: { reveal: 0, write: 0 },
        writes: 0,
        costs: [],
        durations: [],
        contextFirstTurn: 0,
        contextLargest: { tokens: 0, turn: "" },
    };
    let previousCost = 0;
    let handshakePending = true;

    for (const turn of turns) {
        const result = turn.events.find((event) => event.type === "result");
        const assistant = turn.events.filter((event) => event.type === "assistant");
        const toolUses = assistant.flatMap((event) => event.message.content.filter((block) => block.type === "tool_use").map((block) => ({ ...block, subagent: Boolean(event.parent_tool_use_id) })));
        const toolResults = new Map(turn.events.filter((event) => event.type === "user").flatMap((event) => Array.isArray(event.message.content) ? event.message.content : []).filter((block) => block.type === "tool_result").map((block) => [block.tool_use_id, block]));
        const text = assistant.filter((event) => !event.parent_tool_use_id).flatMap((event) => event.message.content).filter((block) => block.type === "text").map((block) => block.text.trim()).join("\n\n");
        counts.apiRounds += result?.num_turns ?? 0;
        counts.callsPerTurn.push({ turn: turn.label, calls: toolUses.length });

        if (toolUses.length === 0) {
            counts.turnsWithoutCalls.push(turn.label);
        }

        for (const [index, event] of turn.events.entries()) {
            if (event.type === "system" && /compact/i.test(event.subtype ?? "")) {
                const after = turn.events.slice(index + 1).filter((later) => later.type === "assistant").flatMap((later) => later.message.content).filter((block) => block.type === "tool_use").slice(0, 2).map((block) => shortName(block.name));
                counts.compactions.push({ turn: turn.label, subtype: event.subtype, nextCalls: after });
            }
        }

        if (handshakePending && toolUses.length > 0) {
            counts.handshake = toolUses.slice(0, 3).map((block) => shortName(block.name));
            handshakePending = false;
        }

        for (const use of toolUses) {
            const name = shortName(use.name);
            const output = toolResults.get(use.id);
            const outputText = resultText(output);
            counts.calls[name] = (counts.calls[name] ?? 0) + 1;

            if (output?.is_error) {
                counts.errors.push({ turn: turn.label, tool: name, input: use.input, error: outputText.slice(0, 400) });
            }

            if (name === "ToolSearch") {
                counts.toolSearch.push({ turn: turn.label, query: use.input?.query });
            } else if (!use.name.startsWith("mcp__rpg__")) {
                counts.otherTools.push({ turn: turn.label, tool: use.name, subagent: use.subagent, input: JSON.stringify(use.input).slice(0, 300) });
            }

            countRpgCall(counts, turn.label, name, use.input ?? {}, outputText, { eventPages, playerCharacters });
        }

        counts.denials.push(...(result?.permission_denials ?? []).map((denial) => ({ turn: turn.label, ...denial })));
        counts.masterWords.push({ turn: turn.label, words: words(text) });
        counts.masterWordsOutsideBrackets.push({ turn: turn.label, words: words(outsideBrackets(text)) });

        if (turn.label === "M1") {
            counts.firstMessageQuestionMarks = (text.match(/\?/g) ?? []).length;
        }

        const cost = result?.total_cost_usd ?? previousCost;
        counts.costs.push({ turn: turn.label, cost: round(cost - previousCost) });
        previousCost = cost;
        counts.durations.push(result?.duration_ms ?? 0);

        for (const event of assistant) {
            const usage = event.message.usage ?? {};
            const tokens = (usage.input_tokens ?? 0) + (usage.cache_read_input_tokens ?? 0) + (usage.cache_creation_input_tokens ?? 0);

            if (turn.label === "M1" && counts.contextFirstTurn === 0 && !event.parent_tool_use_id) {
                counts.contextFirstTurn = tokens;
            }

            if (tokens > counts.contextLargest.tokens && !event.parent_tool_use_id) {
                counts.contextLargest = { tokens, turn: turn.label };
            }
        }
    }

    const dueNames = new Set(counts.due.map((item) => item.event));
    counts.eventsByHand = counts.eventsByHand.filter((item) => !dueNames.has(item.event));
    counts.logWhole = {};

    for (const entry of readLines(join(campaignAfter, "log.jsonl"))) {
        counts.logWhole[entry.type] = (counts.logWhole[entry.type] ?? 0) + 1;
    }

    counts.log = Object.fromEntries(Object.entries(counts.logWhole).map(([type, count]) => [type, count - (before.log[type] ?? 0)]).filter(([, count]) => count > 0));
    counts.masterCost = round(end.masterCost);
    counts.playerCost = round(end.playerRunCost - before.playerCost);
    counts.eventsWithDateAndClock = pagesWith(join(campaignAfter, "world", "events"), /^date:/m).filter((page) => pagesWith(join(campaignAfter, "world", "events"), /^clock:/m).includes(page));
    counts.pages = { before: before.pages, after: pageCount(join(campaignAfter, "world")) };
    counts.time = { started: meta.started, ended: end.at, minutes: round((Date.parse(end.at) - Date.parse(meta.started)) / 60000), masterWorkMinutes: round(counts.durations.reduce((total, value) => total + value, 0) / 60000) };
    counts.end = end;
    return counts;
}

/** What the rpg tools did: rolls, scenes, time, counters, clocks, effects, moves of the player's character and events that came. */
function countRpgCall(counts, turn, name, input, output, campaign)
{
    if (name === "roll" && input.reveal !== undefined) {
        counts.rolls.reveals++;
    } else if (name === "roll") {
        counts.rolls.total++;
        counts.rolls.hidden += input.hidden ? 1 : 0;
        counts.rolls.physical += input.values !== undefined ? 1 : 0;
        const who = input.who ?? "(none)";
        counts.rolls.byWho[who] = (counts.rolls.byWho[who] ?? 0) + 1;
    }

    if (name === "scene") {
        const action = input.action ?? "(none)";
        counts.scenes[action] = (counts.scenes[action] ?? 0) + 1;
    }

    if (name === "advance") {
        counts.advances.push({ turn, by: input.by, to: input.to, why: input.why, stopped: /stopped|Due:/.test(output) });
    }

    if (name === "change") {
        const field = String(input.field ?? "(none)");
        counts.changes[field] = (counts.changes[field] ?? 0) + 1;

        if (field === "clock") {
            counts.clockSteps.push({ turn, page: input.page, by: input.by, to: input.to, why: input.why });
        }
    }

    if (name === "effect") {
        counts.effects.push({ turn, action: input.action, page: input.page, name: input.name, for: input.for, until: input.until, by: input.by, set: input.set, duration: effectDuration(input) });
    }

    if (name === "move") {
        const moved = JSON.stringify(input.page ?? "");

        for (const character of campaign.playerCharacters.filter((candidate) => moved.includes(candidate))) {
            counts.playerMoves.push({ turn, character, to: input.to, how: "move" });
        }
    }

    if (name === "reveal") {
        counts.learned.reveal++;
    }

    if (name === "write") {
        counts.writes++;
        const added = JSON.stringify(input.add ?? "");
        const set = JSON.stringify(input.set ?? "");
        counts.learned.write += added.includes("knows") ? 1 : 0;

        for (const character of campaign.playerCharacters) {
            if (added.includes("contains") && added.includes(`[[${character}]]`)) {
                counts.playerMoves.push({ turn, character, to: input.page, how: "write" });
            }
        }

        if (campaign.eventPages.includes(input.page) && /status\W+happened/.test(set)) {
            counts.eventsByHand.push({ turn, event: input.page });
        }
    }

    if (name === "show") {
        counts.shows++;
        counts.showWithSecret += output.includes("[!secret]") ? 1 : 0;
    }

    for (const line of output.split("\n")) {
        const due = line.match(/^(Now due|Due): (.*)$/);

        if (due) {
            for (const item of due[2].matchAll(/(?:^|· )([^·()]+?) \(([^()]*)\)(?:, since ([^.·]+))?/g)) {
                counts.due.push({ turn, tool: name, kind: due[1], event: item[1].trim(), when: item[2], cause: item[3] ?? "date" });
            }
        }

        if (/^(A new day|\d+ new days)/.test(line)) {
            counts.newDays.push({ turn, line: line.slice(0, 300) });
        }
    }
}

function effectDuration(input)
{
    if (input.action !== "add") {
        return "end";
    }

    if (input.until) {
        return "until a turn";
    }

    if (!input.for) {
        return "until ended";
    }

    if (/scene/i.test(input.for)) {
        return "scene";
    }

    return /round/i.test(input.for) ? "rounds" : "time";
}

function markdown(details)
{
    const names = Object.keys(details).filter((name) => name.startsWith("session-"));
    const rows = [
        ["Player messages = master turns", (s) => s.turns],
        ["API rounds", (s) => s.apiRounds],
        ["Calls", (s) => `${sum(Object.values(s.calls))}: ${Object.entries(s.calls).sort((a, b) => b[1] - a[1]).map(([name, count]) => `${name} ${count}`).join(", ")}`],
        ["Calls per turn: median (max)", (s) => `${median(s.callsPerTurn.map((turn) => turn.calls))} (${maxOf(s.callsPerTurn, "calls")})`],
        ["Turns without calls", (s) => s.turnsWithoutCalls.length],
        ["First calls of the session", (s) => s.handshake.join(" → ")],
        ["Compactions (next two calls)", (s) => s.compactions.map((c) => `${c.turn}: ${c.nextCalls.join(" → ") || "none"}`).join("; ") || "0"],
        ["ToolSearch queries", (s) => s.toolSearch.map((search) => `${search.turn} ${String(search.query).replace(/mcp__rpg__/g, "")}`).join("; ")],
        ["Other tools (non-rpg)", (s) => s.otherTools.length],
        ["Denials", (s) => s.denials.length],
        ["Tool errors", (s) => s.errors.map((error) => `${error.turn} ${error.tool}`).join(", ") || "0"],
        ["show with a secret block", (s) => `${s.showWithSecret} of ${s.shows}`],
        ["Master words: median, max, above 150", (s) => wordsLine(s.masterWords)],
        ["The same outside [ ]", (s) => wordsLine(s.masterWordsOutsideBrackets)],
        ["Player words: median (max)", (s) => `${median(s.playerWords)} (${Math.max(0, ...s.playerWords)})`],
        ["Question marks in M1", (s) => s.firstMessageQuestionMarks],
        ["Rolls (hidden, physical); reveals", (s) => `${s.rolls.total} (${s.rolls.hidden}, ${s.rolls.physical}); ${s.rolls.reveals}`],
        ["Rolls by who", (s) => Object.entries(s.rolls.byWho).map(([who, count]) => `${who} ${count}`).join(", ")],
        ["Scenes by action", (s) => Object.entries(s.scenes).map(([action, count]) => `${action} ${count}`).join(", ") || "0"],
        ["advance (stopped at an event)", (s) => `${s.advances.length} (${s.advances.filter((a) => a.stopped).length})`],
        ["Moves of the player's character (move, write)", (s) => `${s.playerMoves.length} (${s.playerMoves.filter((m) => m.how === "move").length}, ${s.playerMoves.filter((m) => m.how === "write").length})`],
        ["What characters learned (reveal, write knows)", (s) => `${s.learned.reveal}, ${s.learned.write}`],
        ["change by field", (s) => Object.entries(s.changes).map(([field, count]) => `${field} ${count}`).join(", ") || "0"],
        ["Clock steps", (s) => s.clockSteps.length],
        ["Events that came by the engine (by cause)", (s) => s.due.length ? countBy(uniqueDue(s.due), (d) => d.cause) : "0"],
        ["Events set happened by hand, never due", (s) => s.eventsByHand.map((item) => `${item.turn} ${item.event}`).join(", ") || "0"],
        ["Events with a date and a clock", (s) => s.eventsWithDateAndClock.length],
        ["New days", (s) => s.newDays.length],
        ["effect calls by duration", (s) => s.effects.length ? countBy(s.effects, (e) => e.duration) : "0"],
        ["Master cost: total, median per turn, highest", (s) => `${s.masterCost} $, ${median(s.costs.map((c) => c.cost))} $, ${maxOf(s.costs, "cost")}`],
        ["Player cost", (s) => `${s.playerCost} $`],
        ["Duration: total (master work)", (s) => `${s.time.minutes} min (${s.time.masterWorkMinutes} min)`],
        ["Context: first turn, largest", (s) => `${s.contextFirstTurn}, ${s.contextLargest.tokens} (${s.contextLargest.turn})`],
        ["Pages", (s) => `${s.pages.before} → ${s.pages.after}`],
        ["Log lines of the session by type", (s) => Object.entries(s.log).map(([type, count]) => `${type} ${count}`).join(", ")],
        ["Stop", (s) => `${s.end.stop} after ${s.end.count}`],
    ];
    const header = `| Number | ${names.join(" | ")} |\n|---|${names.map(() => "---|").join("")}`;
    const table = [header, ...rows.map(([label, value]) => `| ${label} | ${names.map((name) => String(value(details[name])).replace(/\|/g, "\\|")).join(" | ")} |`)].join("\n");
    return `${table}\n\nQuestionnaire, player cost: ${details.questionnaire.playerCost} $`;
}

function uniqueDue(due)
{
    const seen = new Map();

    for (const item of due) {
        if (!seen.has(item.event)) {
            seen.set(item.event, item);
        }
    }

    return [...seen.values()];
}

function playerMessages(dialogueFile)
{
    const text = existsSync(dialogueFile) ? readFileSync(dialogueFile, "utf8") : "";
    const parts = text.split(/^\*\*(P\d+|M\d+|Organizer)\*\*$/m);
    const messages = [];

    for (let index = 1; index < parts.length; index += 2) {
        if (parts[index].startsWith("P")) {
            messages.push(parts[index + 1].trim());
        }
    }

    return messages;
}

function lastPlayerCost(file)
{
    const lines = readLines(file);
    return lines.length > 0 ? lines[lines.length - 1].total_cost_usd ?? 0 : 0;
}

function resultText(block)
{
    if (!block) {
        return "";
    }

    if (typeof block.content === "string") {
        return block.content;
    }

    return (block.content ?? []).filter((part) => part.type === "text").map((part) => part.text).join("\n");
}

function markdownFiles(folder)
{
    return existsSync(folder) ? readdirSync(folder, { recursive: true, withFileTypes: true }).filter((entry) => entry.isFile() && /\.md$/i.test(entry.name)).map((entry) => join(entry.parentPath, entry.name)) : [];
}

function pageCount(world)
{
    return markdownFiles(world).length;
}

function pageNames(folder)
{
    return markdownFiles(folder).map((file) => basename(file, ".md"));
}

function pagesWith(folder, pattern)
{
    return markdownFiles(folder).filter((file) => pattern.test(frontmatter(readFileSync(file, "utf8")))).map((file) => basename(file, ".md"));
}

function frontmatter(text)
{
    return text.replace(/\r\n/g, "\n").match(/^﻿?---[ \t]*\n([\s\S]*?)\n---[ \t]*(?:\n|$)/)?.[1] ?? "";
}

function wordsLine(list)
{
    const values = list.map((item) => item.words);
    return `${median(values)}, ${maxOf(list, "words")}, ${values.filter((value) => value > 150).length}`;
}

function maxOf(list, key)
{
    const top = list.reduce((best, item) => item[key] > (best?.[key] ?? -Infinity) ? item : best, undefined);
    return top ? `${top[key]} ${top.turn}` : "-";
}

function countBy(list, keyOf)
{
    const counts = {};

    for (const item of list) {
        counts[keyOf(item)] = (counts[keyOf(item)] ?? 0) + 1;
    }

    return Object.entries(counts).map(([key, count]) => `${key} ${count}`).join(", ");
}

/** The text outside square brackets, nested ones included. */
function outsideBrackets(text)
{
    let depth = 0;
    let outside = "";

    for (const character of text) {
        if (character === "[") {
            depth++;
            outside += " ";
        } else if (character === "]" && depth > 0) {
            depth--;
            outside += " ";
        } else if (depth === 0) {
            outside += character;
        }
    }

    return outside;
}

function words(text)
{
    return text.split(/\s+/).filter(Boolean).length;
}

function median(values)
{
    const sorted = [...values].sort((a, b) => a - b);

    if (sorted.length === 0) {
        return 0;
    }

    const middle = Math.floor(sorted.length / 2);
    return round(sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2);
}

function sum(values)
{
    return values.reduce((total, value) => total + value, 0);
}

function round(value)
{
    return Math.round(value * 1000) / 1000;
}

function shortName(name)
{
    return name.replace(/^mcp__rpg__/, "");
}

function sessionNumber(name)
{
    return Number(name.match(/session-(\d+)/)?.[1] ?? 0);
}

function turnNumber(name)
{
    return Number(name.match(/\d+/)[0]);
}

function readJson(file)
{
    return JSON.parse(readFileSync(file, "utf8"));
}

function readLines(file)
{
    return existsSync(file) ? readFileSync(file, "utf8").split("\n").filter((line) => line.trim()).map((line) => {
        try {
            return JSON.parse(line);
        } catch {
            return undefined;
        }
    }).filter(Boolean) : [];
}
