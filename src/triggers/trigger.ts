import { comparableText, linkTargetName } from "../core/text.ts";

/** What a condition names: a page, by the name its link gives, or the party, the player character and the living companions. */
export type Subject = { party: true; } | { page: string; };

/** A condition an event listens to (D-131, EVT-3): something inside something else, or a page in a status. */
export type Trigger =
    | { kind: "in"; what: Subject; where: Subject; }
    | { kind: "status"; page: string; status: string; };

/** What a condition asks of the world, answered by who evaluates it. */
export interface TriggerFacts
{
    /** The names of the party's members. */
    party: string[];
    /** Whether exactly one page has this name. */
    isPage(name: string): boolean;
    /** The names of the containers of a page, nearest first; empty when no single page has that name. */
    containersOf(name: string): string[];
    /** A page's status as the tools read it; undefined when no single page has that name, or its type has no status. */
    statusOf(name: string): string | undefined;
}

const link = String.raw`\[\[[^\]]*\]\]`;
const subject = `party|${link}`;
const insidePattern = new RegExp(`^(${subject})\\s+in\\s+(${subject})$`, "i");
const statusPattern = new RegExp(`^(${link})\\s+(\\p{L}+)$`, "iu");
const forms = '"party in [[Place]]", "[[Item]] in party", "[[Thing]] in [[Place]]" or "[[Page]] dead"';

/** The condition a text writes, such as party in [[Ossario]] or [[Varro]] dead; or why it is not one. */
export function readTrigger(text: string): { trigger: Trigger; } | { problem: string; }
{
    const written = text.trim();
    const inside = insidePattern.exec(written);

    if (inside !== null) {
        return insideTrigger(written, readSubject(inside[1]), readSubject(inside[2]));
    }

    const status = statusPattern.exec(written);

    if (status !== null) {
        const page = readPageLink(status[1]);
        return "problem" in page ? page : { trigger: { kind: "status", page: page.page, status: status[2].toLowerCase() } };
    }

    return { problem: notConditionProblem(written) };
}

/** The conditions a when field holds: one text, or a list of texts of which one is enough. Empty ones count as missing. */
export function readTriggers(value: unknown): { triggers: Trigger[]; } | { problem: string; }
{
    const items = Array.isArray(value) ? value : [value];

    if (items.some((item) => typeof item !== "string")) {
        return { problem: `when must be a condition or a list of conditions, as text: ${forms}.` };
    }

    const triggers: Trigger[] = [];

    for (const item of (items as string[]).filter((text) => text.trim() !== "")) {
        const read = readTrigger(item);

        if ("problem" in read) {
            return read;
        }

        triggers.push(read.trigger);
    }

    return { triggers };
}

/** A condition as it is written, with its pages as links ([[Ossario]]) or as names (Ossario). */
export function formatTrigger(trigger: Trigger, asLinks = true): string
{
    const named = (found: Subject): string => ("party" in found ? "party" : asLinks ? `[[${found.page}]]` : found.page);
    return trigger.kind === "status" ? `${named({ page: trigger.page })} ${trigger.status}` : `${named(trigger.what)} in ${named(trigger.where)}`;
}

/** Whether a condition holds in the world the facts describe (EVT-3). */
export function triggerHolds(trigger: Trigger, facts: TriggerFacts): boolean
{
    if (trigger.kind === "status") {
        return facts.statusOf(trigger.page) === trigger.status;
    }

    const { what, where } = trigger;
    const isMember = (name: string): boolean => facts.party.some((member) => sameText(member, name));

    if ("party" in what) {
        return "page" in where && facts.isPage(where.page) && facts.party.some((member) => facts.containersOf(member).some((holder) => sameText(holder, where.page)));
    }

    if ("party" in where) {
        return facts.isPage(what.page) && (isMember(what.page) || facts.containersOf(what.page).some(isMember));
    }

    return facts.isPage(where.page) && facts.containersOf(what.page).some((holder) => sameText(holder, where.page));
}

/** A condition of the form "A in B", once both sides read: nothing is inside itself. */
function insideTrigger(written: string, what: { subject: Subject; } | { problem: string; }, where: { subject: Subject; } | { problem: string; }): { trigger: Trigger; } | { problem: string; }
{
    if ("problem" in what) {
        return what;
    }

    if ("problem" in where) {
        return where;
    }

    if ("party" in what.subject ? "party" in where.subject : "page" in where.subject && sameText(what.subject.page, where.subject.page)) {
        return { problem: `"${written}" can never hold: nothing is inside itself.` };
    }

    return { trigger: { kind: "in", what: what.subject, where: where.subject } };
}

/** A subject as written: party, or a link to a page. */
function readSubject(text: string): { subject: Subject; } | { problem: string; }
{
    if (comparableText(text) === "party") {
        return { subject: { party: true } };
    }

    const page = readPageLink(text);
    return "problem" in page ? page : { subject: { page: page.page } };
}

/** The page a link names, as links are read everywhere: [[folder/Page.md|label]] names Page. A link to a part of a page is refused: a condition is on a whole page. */
function readPageLink(text: string): { page: string; } | { problem: string; }
{
    const target = text.slice(2, -2).split("|")[0];
    const part = /[#^]/.exec(target);
    const page = linkTargetName(part === null ? target : target.slice(0, part.index));

    if (page === "") {
        return { problem: `${text} names no page: write it as a link, such as [[Ossario]].` };
    }

    return part === null ? { page } : { problem: `${text} names a part of a page: a condition is on a whole page, such as [[${page}]].` };
}

/** Why a text is not a condition: more than one written together, or a form the engine does not read. */
function notConditionProblem(written: string): string
{
    const parts = written.split(/\s*,\s*|\s+or\s+/i).filter((part) => part !== "");

    if (parts.length > 1 && parts.every((part) => "trigger" in readTrigger(part))) {
        return `"${written}" holds more than one condition: give a list, of which one is enough, such as [${parts.map((part) => JSON.stringify(part)).join(", ")}].`;
    }

    return `"${written}" is not a condition: write ${forms}, with the pages as links.`;
}

function sameText(first: string, second: string): boolean
{
    return comparableText(first) === comparableText(second);
}
