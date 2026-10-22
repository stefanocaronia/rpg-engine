// Counts the numbers of a playtest run (checklist B12 and the items computable in part), the same way for every session and every run.
// Usage, after the run (see README.md): node playtests/count-playtest.mjs <results folder> <scenario's world folder>
// It prints a table to paste in the report, and writes the details next to the results folder, in numbers.json.
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, dirname, join } from "node:path";

const [results, scenarioWorld] = process.argv.slice(2);

if (results === undefined || scenarioWorld === undefined || !existsSync(results) || !existsSync(scenarioWorld)) {
    console.error("Usage: node playtests/count-playtest.mjs <results folder> <scenario's world folder>, such as <runs>\\2026-10-05\\3\\results playtests/01-guadoscuro/world");
    process.exit(1);
}

const sessions = readdirSync(results).filter((name) => /^session-\d+$/.test(name) && existsSync(join(results, name, "end.json"))).sort((a, b) => sessionNumber(a) - sessionNumber(b));
const details = {};
let before = startingPoint(sessions[0]);

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
    const worldPages = pageNames(join(campaignAfter, "world"));
    const counts = {
        turns: turns.length,
        apiRounds: 0,
        calls: {},
        callsPerTurn: [],
        turnsWithoutCalls: [],
        toolSearch: [],
        otherTools: [],
        characterAgent: [],
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
        turnUses: [],
        partyTurns: [],
        typedDamage: [],
        untypedDamage: [],
        dying: [],
        rests: [],
        upkeep: { rations: 0, hungry: 0, lifestylePaid: 0, lifestyleAsked: 0, lifestyleShort: 0, lifestyleSet: 0 },
        attuned: [],
        recharge: { effects: [], rolls: 0 },
        stabilizing: [],
        positions: { moves: 0, refused: 0, opportunities: [], difficult: 0, beyond: [] },
        due: [],
        eventsByHand: [],
        newDays: [],
        playerMoves: [],
        learned: { reveal: 0, write: 0 },
        writes: 0,
        costs: [],
        durations: [],
        speed: [],
        contextFirstTurn: 0,
        contextLargest: { tokens: 0, turn: "" },
    };
    let previousCost = 0;
    let handshakePending = true;

    for (const turn of turns) {
        const result = turn.events.find((event) => event.type === "result");
        const assistant = turn.events.filter((event) => event.type === "assistant" && !event.parent_tool_use_id);
        // The master's own calls: those of the character agent it calls are counted apart (D-490).
        const toolUses = assistant.flatMap((event) => event.message.content.filter((block) => block.type === "tool_use"));
        const toolResults = new Map(turn.events.filter((event) => event.type === "user").flatMap(contentOf).filter((block) => block.type === "tool_result").map((block) => [block.tool_use_id, block]));
        const text = assistant.flatMap((event) => event.message.content).filter((block) => block.type === "text").map((block) => block.text.trim()).join("\n\n");
        counts.characterAgent.push(...characterCalls(turn, toolUses.filter(isCharacterCall), worldPages));
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
            } else if (!use.name.startsWith("mcp__rpg__") && !isCharacterCall(use)) {
                counts.otherTools.push({ turn: turn.label, tool: use.name, input: JSON.stringify(use.input).slice(0, 300) });
            }

            countRpgCall(counts, turn.label, name, use.input ?? {}, outputText, { eventPages, playerCharacters }, Boolean(output?.is_error));
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
        counts.speed.push({ turn: turn.label, seconds: (result?.duration_ms ?? 0) / 1000, steps: result?.num_turns ?? 0, calls: toolUses.length });

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
    counts.logWhole = logCounts(join(campaignAfter, "log.jsonl"));
    counts.log = Object.fromEntries(Object.entries(counts.logWhole).map(([type, count]) => [type, count - (before.log[type] ?? 0)]).filter(([, count]) => count > 0));
    counts.masterCost = round(end.masterCost);
    counts.playerCost = round(end.playerRunCost - before.playerCost);
    counts.eventsWithDateAndClock = pagesWith(join(campaignAfter, "world", "events"), /^date:/m).filter((page) => pagesWith(join(campaignAfter, "world", "events"), /^clock:/m).includes(page));
    counts.pages = { before: before.pages, after: pageCount(join(campaignAfter, "world")) };
    counts.time = { started: meta.started, ended: end.at, minutes: round((Date.parse(end.at) - Date.parse(meta.started)) / 60000), masterWorkMinutes: round(counts.durations.reduce((total, value) => total + value, 0) / 60000) };
    counts.end = end;
    delete counts.partyTurnNow;
    return counts;
}

/** What the rpg tools did: rolls, scenes, time, counters, clocks, effects, moves of the player's character and events that came. */
function countRpgCall(counts, turn, name, input, output, campaign, refused)
{
    countSheetTools(counts, turn, name, input, output, refused);

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

/**
 * What the master did with the counts of D-449, D-453 and D-454: the uses of a turn and the turns of the party that had one, damage with a type, the dying, rests,
 * the day's upkeep, attunement, and the powers that recharge.
 */
function countSheetTools(counts, turn, name, input, output, refused)
{
    // A party member's turn starts where scene says to mark its uses (TRN-1); any other turn, or the scene's end, ends it.
    if (name === "scene" && ["open", "order", "next", "close"].includes(input.action)) {
        const started = /Mark with scene use what (.+?) uses of the turn/.exec(output);
        counts.partyTurnNow = started === null ? undefined : counts.partyTurns.push({ turn, who: started[1], uses: 0 }) - 1;
    }

    if (name === "scene" && input.action === "use") {
        counts.turnUses.push({ turn, who: input.who, uses: input.uses, by: input.by, refused });
        const now = counts.partyTurns[counts.partyTurnNow ?? -1];

        if (!refused && now !== undefined && [input.who].flat().map(String).includes(now.who)) {
            now.uses++;
        }
    }

    if (name === "change" && input.damage !== undefined) {
        counts.typedDamage.push({ turn, page: input.page, by: input.by, damage: input.damage, refused });
    }

    if (name === "change" && output.includes("if this damage has a type, give it with damage")) {
        counts.untypedDamage.push({ turn, page: input.page, by: input.by });
    }

    if (name === "change" && input.recipe !== undefined) {
        counts.rests.push({ turn, recipe: input.recipe, page: input.page, field: input.field, spend: input.spend, refused, again: /gains nothing from another/.test(output) });
    }

    if (name === "write" && /lifestyle/.test(JSON.stringify(input.set ?? ""))) {
        counts.upkeep.lifestyleSet++;
    }

    if (name === "write" && /attuned/.test(JSON.stringify(input.add ?? ""))) {
        counts.attuned.push({ turn, page: input.page, add: input.add, refused });
    }

    if (name === "effect" && input.action === "add" && / \d+$/.test(String(input.page ?? "")) && String(input.name ?? "").includes("(")) {
        counts.recharge.effects.push({ turn, page: input.page, name: input.name });
    }

    // Keeping the dying from dying (DIE): a Medicine check, a healer's kit, Spare the Dying, or a stable condition, as the master names them.
    const said = `${input.why ?? ""} ${input.check ?? ""} ${input.question ?? ""} ${JSON.stringify(input.options ?? "")} ${input.name ?? ""}`;

    if (["roll", "ask", "effect", "change"].includes(name) && /stabil|medicin|morent|spare the dying|healer|cerusic/i.test(said) && !(name === "change" && input.field === "hp")) {
        counts.stabilizing.push({ turn, tool: name, what: said.trim().slice(0, 120), refused });
    }

    // Positions on a place's map (GRD, POS): a move to a square, refused or not, and what the engine says of it.
    if (name === "move" && input.at !== undefined) {
        counts.positions.moves++;
        counts.positions.refused += refused ? 1 : 0;
        counts.positions.difficult += /difficult ground/.test(output) ? 1 : 0;

        if (/Opportunity Attacks/.test(output)) {
            counts.positions.opportunities.push({ turn, page: input.page, at: input.at });
        }

        if (/beyond the .* speed/.test(output)) {
            counts.positions.beyond.push({ turn, page: input.page, at: input.at });
        }
    }

    if (name === "roll" && /recharge|ricaric/i.test(`${input.why ?? ""} ${input.check ?? ""}`)) {
        counts.recharge.rolls++;
    }

    for (const line of output.split("\n")) {
        const dying = / is no longer dying/.test(line) ? "ended" : / dies at once/.test(line) ? "instant death" : /: damage at /.test(line) ? "failure from damage" : / is \S+ while \S+ is /.test(line) ? "fell" : undefined;

        if (dying !== undefined) {
            counts.dying.push({ turn, tool: name, kind: dying, line: line.slice(0, 200) });
        }

        counts.upkeep.rations += (line.match(/ eats a day's food/g) ?? []).length;
        counts.upkeep.hungry += (line.match(/ has no \S+: \S+ \d+, (of|past) /g) ?? []).length;
        counts.upkeep.lifestylePaid += (line.match(/ pays a \S+ day: /g) ?? []).length;
        counts.upkeep.lifestyleAsked += (line.match(/ has no \S+ to pay a day in a settlement/g) ?? []).length;
        counts.upkeep.lifestyleShort += (line.match(/ cannot pay a \S+ day/g) ?? []).length;
    }
}

/**
 * The master's calls in a turn to the character agent (D-490): whom it voiced, the name the message begins with; whether its view was theirs; in the background or
 * not; how long it took and its tokens; whether it answered with Says and Does; the names it said that neither the message nor its view gave it.
 */
function characterCalls(turn, calls, worldPages)
{
    return calls.map((call) => {
        const own = turn.events.filter((event) => event.parent_tool_use_id === call.id);
        const started = systemEvent(turn, "task_started", call.id);
        const notified = systemEvent(turn, "task_notification", call.id);
        const returned = turn.events.find((event) => event.type === "user" && !event.parent_tool_use_id && contentOf(event).some((block) => block.tool_use_id === call.id));
        const result = returned === undefined ? undefined : contentOf(returned).find((block) => block.tool_use_id === call.id);
        // Its last message is streamed only when it ran in the background: otherwise it comes back whole, in the call's result.
        const said = textOf(own.filter((event) => event.type === "assistant").flatMap(contentOf));
        const answer = said || textOf(returned?.tool_use_result?.content ?? []) || (notified?.summary ?? "");
        const prompt = String(call.input?.prompt ?? "");
        const uses = own.filter((event) => event.type === "assistant").flatMap(contentOf).filter((block) => block.type === "tool_use");
        const views = uses.filter((block) => shortName(block.name) === "view");
        const known = [prompt, ...own.filter((event) => event.type === "user").flatMap(contentOf).filter((block) => block.type === "tool_result").map(resultText)].join("\n");
        const milliseconds = notified?.usage?.duration_ms ?? returned?.tool_use_result?.totalDurationMs;
        return {
            turn: turn.label,
            who: firstName(prompt),
            as: views.map((view) => view.input?.as ?? "(none)"),
            otherCalls: uses.filter((block) => shortName(block.name) !== "view").map((block) => shortName(block.name)),
            background: started?.is_backgrounded === true || call.input?.run_in_background === true,
            failed: Boolean(result?.is_error) || (notified !== undefined && notified.status !== "completed") || answer === "",
            seconds: milliseconds === undefined ? undefined : round(milliseconds / 1000),
            tokensRead: tokensRead(own, said === "" ? returned?.tool_use_result?.usage : undefined),
            tokens: notified?.usage?.total_tokens ?? returned?.tool_use_result?.totalTokens,
            saysAndDoes: /^\W*(Says|Dice)\W*:/im.test(answer) && /^\W*(Does|Fa)\W*:/im.test(answer),
            unknownNames: unknownNames(answer, known, worldPages),
            answer: answer.slice(0, 600),
        };
    });
}

/** Whether a tool use is the master calling the character agent (D-490). */
function isCharacterCall(use)
{
    return ["Agent", "Task"].includes(use.name) && use.input?.subagent_type === "rpg-character";
}

/**
 * What a call's subagent read over its model calls, cached or not: each message streamed counted once, and `last`, the usage of the message that came back whole.
 * What it wrote the stream does not tell: its usage is taken as a message begins.
 */
function tokensRead(events, last)
{
    const messages = new Map(events.filter((event) => event.type === "assistant" && event.message?.usage).map((event) => [event.message.id, event.message.usage]));
    const usages = [...messages.values(), ...(last === undefined ? [] : [last])];
    return sum(usages.map((usage) => (usage.input_tokens ?? 0) + (usage.cache_read_input_tokens ?? 0) + (usage.cache_creation_input_tokens ?? 0)));
}

function textOf(blocks)
{
    return blocks.filter((block) => block.type === "text").map((block) => block.text).join("\n").trim();
}

/** The name the master's message to the character agent begins with, as Voices asks: «Ermanno. Sei all'aia…» gives Ermanno. */
function firstName(prompt)
{
    return prompt.trim().match(/^[^.,:;!?\n«"“(—–]+/)?.[0].trim() ?? "";
}

/** Whether the view was the voiced character's own: `as` the name the message begins with, or its first words, as Lucia for «Lucia la Gazza». */
function viewIsTheirs(as, who)
{
    const [view, name] = [as, who].map((text) => text.toLocaleLowerCase().trim());
    return view !== "" && (view === name || name.startsWith(`${view} `));
}

/**
 * The names an answer says that what the character was given never says: the world's page names, and the capitalized words that do not begin a sentence, such as
 * a name it made up. Only a hint to read the answer by: a name may be known in other words.
 */
function unknownNames(answer, known, worldPages)
{
    const knownText = known.toLocaleLowerCase();
    const pages = worldPages.filter((page) => answer.includes(page));
    const capitalized = [...answer.matchAll(/\p{Lu}[\p{L}'’]+/gu)].filter((match) => !beginsSentence(answer.slice(0, match.index))).map((match) => match[0]);
    const labels = ["Says", "Does", "Keeps", "Dice", "Fa", "Tiene"];
    return [...new Set([...pages, ...capitalized])].filter((name) => !labels.includes(name) && !knownText.includes(name.toLocaleLowerCase()));
}

/** Whether a word after this text begins a sentence, a line or a quotation. */
function beginsSentence(before)
{
    return /(^|[\n.!?:;…«"“(—–-])[\s*_]*$/.test(before);
}

/** A system event of Claude Code about a subagent call, such as task_started. */
function systemEvent(turn, subtype, toolUseId)
{
    return turn.events.find((event) => event.type === "system" && event.subtype === subtype && event.tool_use_id === toolUseId);
}

/** The content blocks of an event's message, or none when its content is a string. */
function contentOf(event)
{
    return Array.isArray(event.message?.content) ? event.message.content : [];
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
        ["Character agent: calls (in the background, failed); its calls other than view", (s) => characterCallsLine(s.characterAgent)],
        ["Character agent: calls per turn, median (max); by character", (s) => characterTurnsLine(s.characterAgent, s.callsPerTurn.map((turn) => turn.turn))],
        ["Character agent: the same character more than once in a turn", (s) => repeatedCalls(s.characterAgent).join(", ") || "0"],
        ["Character agent: seconds per call, median (max); tokens per call, read over its model calls and Claude Code's count (medians)", (s) => characterCostLine(s.characterAgent)],
        ["Character agent: view as the name the message begins with; otherwise", (s) => characterViewsLine(s.characterAgent)],
        ["Character agent: answers with Says and Does", (s) => `${s.characterAgent.filter((call) => call.saysAndDoes).length} of ${s.characterAgent.length}`],
        ["Character agent: names it said that neither the message nor its view gave it", (s) => s.characterAgent.filter((call) => call.unknownNames.length > 0).map((call) => `${call.turn} ${call.who}: ${call.unknownNames.join(", ")}`).join("; ") || "0"],
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
        ["scene use (refused); with by", (s) => `${s.turnUses.length} (${s.turnUses.filter((u) => u.refused).length}); ${s.turnUses.filter((u) => u.by !== undefined).map((u) => `${u.turn} ${u.who} ${u.by}`).join(", ") || "none"}`],
        ["scene use by what is used", (s) => s.turnUses.length ? countBy(s.turnUses.filter((u) => !u.refused), (u) => u.uses) : "0"],
        ["Party turns in a fight with a scene use", (s) => `${s.partyTurns.filter((t) => t.uses > 0).length} of ${s.partyTurns.length}`],
        ["Damage with a type (refused; applies, does not apply)", (s) => `${s.typedDamage.length} (${s.typedDamage.filter((d) => d.refused).length}; ${s.typedDamage.filter((d) => /\(applies\)/i.test(d.damage)).length}, ${s.typedDamage.filter((d) => /does not apply/i.test(d.damage)).length})`],
        ["Damage with a type, by type", (s) => s.typedDamage.length ? countBy(s.typedDamage.filter((d) => !d.refused), (d) => String(d.damage).replace(/\s*\(.*\)$/, "")) : "0"],
        ["Damage without a type on a page with damage lists", (s) => s.untypedDamage.map((d) => `${d.turn} ${d.page}`).join(", ") || "0"],
        ["Dying: the engine's lines; death saves written", (s) => `${s.dying.length ? countBy(s.dying, (d) => d.kind) : "0"}; ${Object.entries(s.changes).filter(([field]) => /^death-/.test(field)).map(([field, count]) => `${field} ${count}`).join(", ") || "0"}`],
        ["Rests by recipe (refused, a second within its time)", (s) => s.rests.length ? `${countBy(s.rests, (r) => `${r.recipe}${r.spend === undefined ? "" : " with hit dice"}`)} (${s.rests.filter((r) => r.refused).length}, ${s.rests.filter((r) => r.again).length})` : "0"],
        ["Upkeep: rations eaten, days without food; lifestyle paid, asked, short, set", (s) => `${s.upkeep.rations}, ${s.upkeep.hungry}; ${s.upkeep.lifestylePaid}, ${s.upkeep.lifestyleAsked}, ${s.upkeep.lifestyleShort}, ${s.upkeep.lifestyleSet}`],
        ["Attunement writes (refused)", (s) => s.attuned.length ? `${s.attuned.map((a) => `${a.turn} ${a.page}`).join(", ")} (${s.attuned.filter((a) => a.refused).length})` : "0"],
        ["Recharge: effects on copies, rolls", (s) => `${s.recharge.effects.map((e) => `${e.turn} ${e.page} «${e.name}»`).join(", ") || "0"}; ${s.recharge.rolls}`],
        ["Stabilizing: calls that name it", (s) => s.stabilizing.map((c) => `${c.turn} ${c.tool}`).join(", ") || "0"],
        ["Moves to a square (refused); onto difficult ground", (s) => `${s.positions.moves} (${s.positions.refused}); ${s.positions.difficult}`],
        ["Moves past an enemy's side (opportunity); beyond the speed", (s) => `${s.positions.opportunities.map((m) => `${m.turn} ${m.page}`).join(", ") || "0"}; ${s.positions.beyond.map((m) => `${m.turn} ${m.page}`).join(", ") || "0"}`],
        ["Master cost: total, median per turn, highest", (s) => `${s.masterCost} $, ${median(s.costs.map((c) => c.cost))} $, ${maxOf(s.costs, "cost")}`],
        ["Player cost", (s) => `${s.playerCost} $`],
        ["Duration: total (master work)", (s) => `${s.time.minutes} min (${s.time.masterWorkMinutes} min)`],
        ["Speed: seconds and model steps per master turn (medians); seconds and calls per step", (s) => speedLine(s.speed)],
        ["Context: first turn, largest", (s) => `${s.contextFirstTurn}, ${s.contextLargest.tokens} (${s.contextLargest.turn})`],
        ["Pages", (s) => `${s.pages.before} → ${s.pages.after}`],
        ["Log lines of the session by type", (s) => Object.entries(s.log).map(([type, count]) => `${type} ${count}`).join(", ")],
        ["Stop", (s) => `${s.end.stop} after ${s.end.count}`],
    ];
    const header = `| Number | ${names.join(" | ")} |\n|---|${names.map(() => "---|").join("")}`;
    const table = [header, ...rows.map(([label, value]) => `| ${label} | ${names.map((name) => String(value(details[name])).replace(/\|/g, "\\|")).join(" | ")} |`)].join("\n");
    return `${table}\n\nQuestionnaire, player cost: ${details.questionnaire.playerCost} $`;
}

/** How fast the master answers: the median seconds and model steps of a turn, and over the session the seconds and the tool calls of one step. */
function speedLine(speed)
{
    const steps = sum(speed.map((turn) => turn.steps));
    const perStep = (value) => (steps === 0 ? 0 : round(sum(speed.map((turn) => turn[value])) / steps));
    return `${median(speed.map((turn) => turn.seconds))} s, ${median(speed.map((turn) => turn.steps))} steps; ${perStep("seconds")} s and ${perStep("calls")} calls a step`;
}

function characterCallsLine(calls)
{
    const others = calls.flatMap((call) => call.otherCalls.map((name) => `${call.turn} ${name}`));
    return `${calls.length} (${calls.filter((call) => call.background).length}, ${calls.filter((call) => call.failed).length}); ${others.join(", ") || "none"}`;
}

/** The calls of each master turn, the turns without one included, and how many each character had. */
function characterTurnsLine(calls, turns)
{
    const perTurn = turns.map((turn) => ({ turn, calls: calls.filter((call) => call.turn === turn).length }));
    return calls.length ? `${median(perTurn.map((turn) => turn.calls))} (${maxOf(perTurn, "calls")}); ${countBy(calls, (call) => call.who || "(no name)")}` : "0";
}

/** The characters called more than once in one master turn: one moment asked twice, or, with voices important or always, each line they spoke. */
function repeatedCalls(calls)
{
    const byTurn = {};

    for (const call of calls) {
        const key = `${call.turn} ${call.who || "(no name)"}`;
        byTurn[key] = (byTurn[key] ?? 0) + 1;
    }

    return Object.entries(byTurn).filter(([, count]) => count > 1).map(([key, count]) => `${key} ${count}`);
}

function characterCostLine(calls)
{
    const timed = calls.filter((call) => call.seconds !== undefined).map((call) => ({ turn: `${call.turn} ${call.who}`, seconds: call.seconds }));
    const counted = calls.filter((call) => call.tokens !== undefined).map((call) => call.tokens);
    return calls.length ? `${median(timed.map((call) => call.seconds))} s (${maxOf(timed, "seconds")}); ${median(calls.map((call) => call.tokensRead))}, ${median(counted)}` : "-";
}

function characterViewsLine(calls)
{
    const theirs = calls.filter((call) => call.as.length > 0 && call.as.every((as) => viewIsTheirs(as, call.who)));
    const others = calls.filter((call) => !theirs.includes(call)).map((call) => `${call.turn} ${call.who}: ${call.as.length ? `as ${call.as.join(", ")}` : "no view"}`);
    return `${theirs.length} of ${calls.length}; ${others.join(", ") || "none"}`;
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

/** Where the run's first session started: the scenario's pages, or the saved campaign a run from a save copied (--from). */
function startingPoint(name)
{
    const from = name === undefined ? undefined : readJson(join(results, name, "meta.json")).options?.from;
    const campaign = from === undefined ? undefined : join(from, "campaign-after");
    return { pages: pageCount(campaign === undefined ? scenarioWorld : join(campaign, "world")), log: campaign === undefined ? {} : logCounts(join(campaign, "log.jsonl")), playerCost: 0 };
}

/** How many entries of each type a campaign's log holds. */
function logCounts(file)
{
    const counts = {};

    for (const entry of readLines(file)) {
        counts[entry.type] = (counts[entry.type] ?? 0) + 1;
    }

    return counts;
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
