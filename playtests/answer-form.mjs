// Claude Code's Elicitation hook in a playtest (D-246): the form the rpg server shows goes to the AI player, who presses one of its buttons, as in a chat with buttons.
// Started by Claude Code for the master's turn, with the run's output folder and the session's folder as arguments; it reads the form on its standard input.
import { spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { notYetRead, oneAnswer } from "./one-answer.mjs";

const [out, folder, profile, model] = process.argv.slice(2);
const environment = Object.fromEntries(Object.entries(process.env).filter(([name]) => !name.toUpperCase().startsWith("CLAUDE")));
// A form refused faster than a person could read it is taken for one never shown, and the server stops showing forms (tooFastForPerson in src/server/mcp.ts).
const personReads = 1600;
const started = Date.now();

try {
    const form = JSON.parse(readFileSync(0, "utf8"));
    const labels = form.requested_schema?.properties?.choice?.enum ?? [];

    if (labels.length === 0) {
        throw new Error("the form has no buttons");
    }

    // The page may have asked the player first: then its answer, by index, as the form lists the same choices in the same order with other words.
    const answer = await oneAnswer({ folder, question: form.message, side: "form", ask: () => ({ index: labels.indexOf(press(form, labels)) }) });
    const choice = labels[answer.index ?? -1];
    const from = answer.from === undefined ? "" : ` (the player's answer on the ${answer.from})`;

    if (choice === undefined) {
        // An answer the form cannot give, as the player's own words on the page: the page has already given it, so the form steps aside, never too fast.
        await new Promise((done) => setTimeout(done, Math.max(0, personReads - (Date.now() - started))));
        appendFileSync(join(folder, "dialogue.md"), `**Buttons** (${form.message})\n\n${labels.join(" · ")} → none: answered on the page\n\n`);
        console.log(JSON.stringify({ hookSpecificOutput: { hookEventName: "Elicitation", action: "cancel" } }));
        process.exit(0);
    }

    appendFileSync(join(folder, "dialogue.md"), `**Buttons** (${form.message})\n\n${labels.join(" · ")} → ${choice}${from}\n\n`);
    console.log(JSON.stringify({ hookSpecificOutput: { hookEventName: "Elicitation", action: "accept", content: { choice } } }));
} catch (error) {
    appendFileSync(join(folder, "forms-errors.txt"), `${new Date().toISOString()} ${error.message}\n`);
    console.log(JSON.stringify({ hookSpecificOutput: { hookEventName: "Elicitation", action: "cancel" } }));
}

/** The button the player presses, after reading what the master wrote in this turn so far, in the player's own chat. */
function press(form, labels)
{
    // The player's chat starts here when the master shows buttons before the player has answered once.
    const chatFile = join(out, "player-session.txt");
    const resume = existsSync(chatFile);
    const id = resume ? readFileSync(chatFile, "utf8").trim() : randomUUID();
    mkdirSync(join(out, "player"), { recursive: true });
    // Only what the player has not read yet of this turn: an earlier question may have shown the rest.
    const prompt = [notYetRead(folder, mastersTextSoFar(form.transcript_path)), `(The app shows you buttons under the master's message: ${form.message}) Press one of them: ${labels.join(" · ")}.`].filter(Boolean).join("\n\n");
    const schema = JSON.stringify({ type: "object", required: ["choice"], properties: { choice: { type: "string", enum: labels, description: "the button you press" } } });
    const args = ["-p", "--model", model, "--system-prompt-file", resolve(profile), "--system-prompt-snapshot", "off", "--tools", "", "--setting-sources", "project,local", "--strict-mcp-config"];
    const run = spawnSync("claude", [...args, "--output-format", "json", "--json-schema", schema, ...(resume ? ["--resume", id] : ["--session-id", id])], { cwd: join(out, "player"), input: prompt, encoding: "utf8", env: environment });
    writeFileSync(chatFile, id);
    appendFileSync(join(out, "player-turns.jsonl"), run.stdout.trim() + "\n");
    const choice = JSON.parse(run.stdout).structured_output?.choice;

    if (!labels.includes(choice)) {
        throw new Error(`the player pressed no button: ${run.stdout || run.stderr}`);
    }

    return choice;
}

/** What the master has written to the player in this turn before the form: the assistant's text after the last prompt of the transcript. */
function mastersTextSoFar(transcript)
{
    if (!transcript || !existsSync(transcript)) {
        return "";
    }

    const events = readFileSync(transcript, "utf8").split("\n").filter(Boolean).map((line) => JSON.parse(line));
    const last = events.findLastIndex((event) => event.type === "user" && typeof event.message?.content === "string");
    return events.slice(last + 1).filter((event) => event.type === "assistant").flatMap((event) => event.message?.content ?? []).filter((block) => block.type === "text").map((block) => block.text.trim()).join("\n\n");
}
