// The view command
import { basename } from "node:path";
import { z } from "zod";
import { readSettings, requireCampaign } from "../../campaign/index.ts";
import { readLog } from "../../core/log.ts";
import { defineCommand } from "../../core/registry.ts";
import { comparableText } from "../../core/text.ts";
import { isPartyMember, isPlayerCharacter, locate, type Page, parsePageReference, playerCharacters, secretNames, type World } from "../../pages/index.ts";
import type { SystemWords } from "../../systems/index.ts";
import { formatGameDate } from "../../time/index.ts";
import { offeredPages } from "../choices.ts";
import { type PlayerSetting, setupQuestions, shownPlayerSettings } from "../config/dashboard.ts";
import { importShown } from "../import/import.ts";
import { translatingTexts, wantTexts } from "../shared/books/system-texts.ts";
import { shownImage } from "../shared/campaign/images.ts";
import { blockingMode, campaignMode, modes } from "../shared/campaign/mode.ts";
import { campaignCoins } from "../shared/campaign/money.ts";
import { campaignProblems } from "../shared/campaign/problems.ts";
import { campaignSystem, campaignWorld, systemWordsOf } from "../shared/campaign/world.ts";
import { type Knowledge, knowledgeOf, knownPart, knowsPage, pageKnownBy, playerKnowledge, secretKnownBy, withPagesKnown } from "../shared/characters/knowledge.ts";
import { lastMoment, livingMood, masterMood } from "../shared/characters/moods.ts";
import { thoughtsIn } from "../shared/characters/thoughts.ts";
import { readJourney } from "../shared/places/journey.ts";
import { measuresOf } from "../shared/places/roads.ts";
import { readOpenScene } from "../shared/scene/scene.ts";
import { countersText, lineCounters } from "../shared/sheet/counters.ts";
import { effectsOf } from "../shared/sheet/effect-layer.ts";
import { sheetGroup, sheetHeadline, sheetText, tokenIcon } from "../shared/sheet/sheet.ts";
import { calendarDayOf, readPresent } from "../shared/time/time.ts";
import { fuelLeft } from "../shared/time/upkeep.ts";
import { questText, shownJournal } from "./journal.ts";
import { shownLayers } from "./layers.ts";
import { mapText, shownMap } from "./map.ts";
import { characterNamed, memoryOf, memoryText } from "./memory.ts";
import { knownNamedPage, knownPage, lineValues, placeLook, shownName, shownPage, valueCoins } from "./page.ts";
import { isDown, sceneLine, seenEffect, shownPlace, shownScene, strangerImage } from "./place.ts";
import type { PartyMember, ShownRoll, ViewResult } from "./result.ts";
import { shownSaves } from "./saves.ts";
import { diaryCount, diaryLine, diaryLines, isCopyName, rollCount, rollsShown, seenByRoll, shownRoll, storyFact } from "./story.ts";
import { knownDocuments, knownEntries, knownEntryText, shownCalendar } from "./world.ts";

export const view = defineCommand({
    name: "view",
    description: "What the player may see, without spoilers: use it, not show, when the player asks what their character knows, remembers or carries. "
        + "Alone, it gives the player character and the companions, where they are and their numbers, the open quests, the open scene and the diary, without your reasons. "
        + "With a page, the page as the player character knows it: its introduction and public sections, only the secrets they discovered, and the whole sheet of the character or a companion; "
        + "a page they do not know reads as one that does not exist. "
        + "With as, the same for another character, for the character agent voicing them: alone, their page, now, the pages they know in a line, the secrets they discovered and the scenes they lived. "
        + "Example: page Varro; or diary 30.",
    group: "game",
    readOnly: true,
    positionals: ["page"],
    input: z.object({
        page: z.string().optional().describe("a page as the player character knows it, or Page#Name for one section or discovered secret; none for the whole view"),
        diary: z.string().optional().describe(`how many lines of the diary, from the last; ${diaryLines} if left out; all only when the player asks for the whole story`),
        rolls: z.string().optional().describe(`for the dashboard: how many of the last public rolls; ${rollsShown} if left out`),
        map: z.boolean().optional().describe("the world map as the player character knows it: the places it knows, nearest first, with kind, distance and direction, and the regions"),
        settings: z.boolean().optional().describe("for the dashboard: the player's settings and what each value means"),
        saves: z.boolean().optional().describe("for the dashboard: the saves, and what the player may do with each"),
        setup: z.boolean().optional().describe("for the dashboard: the campaign's mode and name, what the next mode needs, and the setup's questions"),
        journal: z.boolean().optional().describe("for the dashboard: the quests the character knows, with goals, counters, clock and deadline, and the story by scenes"),
        world: z.boolean().optional().describe("for the dashboard: the pages the character knows, each with the opening of its text, the documents it has or read, and the calendar with the deadlines it knows"),
        as: z.string().optional().describe("for a character agent: the character whose view this is, other than the player's; alone or with page"),
        focus: z.string().optional().describe("for the dashboard, with more than one player character: the one in the foreground, whose place, map and squares it gives; if left out, whose turn it is, else one in the open scene"),
    }),

    run(input, context): ViewResult
    {
        const root = requireCampaign(context.folder);

        if (input.as !== undefined && [input.diary, input.rolls, input.map, input.settings, input.saves, input.setup, input.journal, input.world].some((given) => given !== undefined)) {
            throw new Error("Give as alone or with page: it is what that character knows, apart from the diary, the rolls, the map, the settings, the saves, the setup, the journal and the world.");
        }

        // The player's settings, with or without a player character (D-341).
        if (input.settings === true) {
            if ([input.page, input.diary, input.rolls, input.map, input.journal, input.world].some((given) => given !== undefined)) {
                throw new Error("Give settings alone: they are the player's settings, apart from the page, the diary, the rolls, the map, the journal and the world.");
            }

            return { kind: "settings", settings: shownPlayerSettings(root, context) };
        }

        // The setup, with or without a player character (D-370).
        if (input.setup === true) {
            if ([input.page, input.diary, input.rolls, input.map, input.settings, input.saves, input.journal, input.world].some((given) => given !== undefined)) {
                throw new Error("Give setup alone: it is the campaign's setup, apart from the page, the diary, the rolls, the map, the settings, the saves, the journal and the world.");
            }

            const world = campaignWorld(root, context);
            const mode = campaignMode(root, world);
            const next = modes[modes.indexOf(mode) + 1];
            const blocked = next === undefined ? undefined : blockingMode(next, root, context, world);
            const name = readSettings(root).name;
            return {
                kind: "setup",
                mode,
                name,
                folderName: comparableText(name) === comparableText(basename(root)),
                missing: blocked?.missing ?? [],
                questions: setupQuestions(root, context, world.pages.length > 0),
            };
        }

        if (input.saves === true) {
            if ([input.page, input.diary, input.rolls, input.map, input.settings, input.journal, input.world].some((given) => given !== undefined)) {
                throw new Error("Give saves alone: they are the campaign's saves, apart from the page, the diary, the rolls, the map, the settings, the journal and the world.");
            }

            return shownSaves(root, context);
        }

        if (input.as !== undefined && input.focus !== undefined) {
            throw new Error("Give as or focus, not both: focus is the player character in the foreground of the player's view, as another character's view.");
        }

        const world = campaignWorld(root, context);
        // Whose view it is: the player characters', with one in the foreground (VIEW-12), or another character's for the character agent voicing them (VIEW-10).
        const knowledge = input.as === undefined ? playerKnowledge(root, world, input.focus) : knowledgeOf(root, world, characterNamed(world, input.as));

        // An import under way, which the dashboard tells the player (D-491 (11)); never the character agent.
        const importing = input.as === undefined ? importShown(root) : undefined;

        if (knowledge === undefined) {
            const language = readSettings(root).language;
            return { kind: "none", ...(language === undefined ? {} : { language }), ...(importing === undefined ? {} : { importing }) };
        }

        const pc = knowledge.pc;
        // Who of the party the view gives: the player characters, the living first, or the one whose view it is for a character agent, and the companions (VIEW-12).
        const players = input.as === undefined ? playerCharacters(world).toSorted((one, other) => Number(one.fields.status === "dead") - Number(other.fields.status === "dead")) : [pc];

        // What the character knows and the calendar (VIEW-11).
        if (input.world === true) {
            if ([input.page, input.diary, input.rolls, input.map, input.journal].some((given) => given !== undefined)) {
                throw new Error("Give world alone: it is what the character knows and the calendar, apart from the page, the diary, the rolls, the map and the journal.");
            }

            const known = (name: unknown): string | undefined => shownName(world, knowledge, name);
            const journal = shownJournal(root, world, knowledge, readPresent(root).date, () => undefined, known, () => ({}));
            return {
                kind: "world",
                known: knownEntries(root, context, world, knowledge),
                documents: knownDocuments(root, context, world, knowledge),
                calendar: shownCalendar(root, context, journal),
            };
        }

        // The journal (D-367, VIEW-8, VIEW-9).
        if (input.journal === true) {
            if ([input.page, input.diary, input.rolls, input.map].some((given) => given !== undefined)) {
                throw new Error("Give journal alone: it is the quests and the story, apart from the page, the diary, the rolls and the map.");
            }

            const present = readPresent(root).date;
            const known = (name: unknown): string | undefined => shownName(world, knowledge, name);
            return {
                kind: "journal",
                ...(present === undefined ? {} : { now: formatGameDate(present) }),
                ...shownJournal(root, world, knowledge, present, (entry) => storyFact(world, entry, known), known, (name) => placeLook(root, context, world, knowledge, name)),
                // The diaries the player reads, the last line first: never a hidden line, as another character's (DIA-4).
                thoughts: thoughtsIn(root, world).filter((one) => !one.hidden).reverse().map((one) => ({ who: known(one.page.name) ?? "someone", ...(one.date === undefined ? {} : { date: one.date }), text: one.text })),
            };
        }

        if (input.map === true && [input.page, input.diary, input.rolls].some((given) => given !== undefined)) {
            throw new Error("Give map alone: it is the world map, apart from the page, the diary and the rolls.");
        }

        if (input.page !== undefined && input.page.trim() !== "") {
            if (input.diary !== undefined) {
                throw new Error("Give page or diary, not both: diary goes with the whole view.");
            }

            const reference = parsePageReference(input.page);
            // The player reads the pages their choices waiting offer, to choose (VIEW-2); never a character agent.
            const readable = input.as === undefined ? withPagesKnown(knowledge, offeredPages(root, world)) : knowledge;
            const page = knownPage(world, readable, reference.name);
            const system = campaignSystem(root, context);

            if (page === undefined) {
                return { kind: "unknown", text: `${knowerText(readable)} ${reference.name}.` };
            }

            // The sheet of the one whose view it is, and of the party when they are of it (VIEW-3, VIEW-10).
            const party = page === pc || (isPartyMember(pc) && isPartyMember(page));

            if (reference.section !== undefined && reference.section !== "") {
                const part = knownPart(world, readable, page, reference.section);
                // A group of the sheet of the character or a companion, as show gives it (DAT-2).
                const group = part === undefined && party ? sheetGroup(world, system, page, reference.section) : undefined;

                if (part === undefined && group === undefined) {
                    return { kind: "unknown", text: `${readable.each === undefined ? `${pc.name} knows nothing` : "No player character knows anything"} of ${page.name} called ${reference.section}.` };
                }

                // Who knows the secret, or the page, when not all the player characters do (VIEW-12).
                const secret = secretNames(page.body).find((name) => comparableText(name) === comparableText(reference.section ?? ""));
                const knownBy = part === undefined ? undefined : secret === undefined ? pageKnownBy(readable, page) : secretKnownBy(readable, page, secret);
                return { kind: "section", title: `${page.name}#${group?.name ?? reference.section}`, lines: group?.lines ?? [], text: part ?? "", ...(knownBy === undefined ? {} : { knownBy }) };
            }

            // The system's pages it shows, in the campaign's language where the system has no translation (D-539).
            wantTexts(root, context, world, [page]);
            return shownPage(root, context, world, readable, page, party);
        }

        const { coins } = campaignCoins(root, context);
        const system = campaignSystem(root, context);

        const open = readJourney(root)?.at !== undefined;
        const companions = world.pages.filter((page) => page.type === "character" && page.fields.role === "companion");
        const language = readSettings(root).language;
        const memberWords = system === undefined || language === undefined ? undefined : systemWordsOf(root, system, language, context);
        const sight = { root, context, world, knowledge, party: [...players, ...companions], ...(memberWords === undefined ? {} : { words: memberWords.words }) };

        if (input.as !== undefined) {
            return memoryOf({ ...sight, party: isPartyMember(pc) ? world.pages.filter((page) => page.type === "character" && isPartyMember(page)) : [pc] });
        }

        if (input.map === true) {
            return { kind: "map", ...shownMap(sight, measuresOf(root, system), readSettings(root).name) };
        }

        // Where someone is, as far as the character knows the places: elsewhere when it knows none of them (D-254).
        const member = (page: Page): PartyMember => {
            const chain = locate(world, page).chain;
            const where = chain.filter((holder) => knowsPage(knowledge, holder)).map((holder) => holder.name);
            // In no place at all while a journey stopped in the open (TRV-13).
            const place = where.length > 0 ? where : chain.length > 0 ? "elsewhere" : open ? "open" : undefined;
            const image = shownImage(root, context, world, page, (base) => knowsPage(knowledge, base));
            const mood = livingMood(page);
            const down = isDown(world, system, page);
            const headline = sheetHeadline(world, system, page, memberWords);
            const icon = tokenIcon(world, system, page);
            return {
                name: page.name,
                role: isPlayerCharacter(page) ? "pc" : "companion",
                dead: page.fields.status === "dead",
                ...(image === undefined ? {} : { image }),
                ...(icon === undefined ? {} : { icon }),
                ...(place === undefined ? {} : { place }),
                counters: lineValues(world, page, lineCounters(world, page, coins, system)).map((value) => valueCoins(value, coins, system)),
                effects: effectsOf(page).map((effect) => {
                    const burns = fuelLeft(system, world, page, effect.name);
                    return { ...seenEffect(sight, effect), ...(burns === undefined ? {} : { burns }) };
                }),
                ...(mood === "neutral" ? {} : { mood }),
                ...(down ? { down: true as const } : {}),
                ...(headline === undefined ? {} : { headline }),
            };
        };

        const now = readPresent(root).date;
        const named = (name: unknown): string | undefined => shownName(world, knowledge, name);

        // The picture of someone the log names, as the player character knows them; of a stranger, as the scene shows them, a copy by its creature (D-420, D-421).
        const picture = (name: unknown): ShownRoll["image"] => {
            const page = knownNamedPage(world, knowledge, name);
            const who = String(name ?? "").trim();
            return page !== undefined
                ? shownImage(root, context, world, page, (base) => knowsPage(knowledge, base))
                : strangerImage(root, context, world, isCopyName(world, who) ? who.replace(/ \d+$/, "") : who);
        };

        const log = readLog(root);
        const seenAt = seenByRoll(log, readOpenScene(root).scene?.seen);
        const shownLines = log.filter((entry) => entry.visibility === "public");
        const moment = lastMoment(shownLines);
        const diary = shownLines.flatMap((entry) => diaryLine(world, entry, named));
        const shown = input.diary?.trim().toLowerCase() === "all" ? diary.length : diaryCount(input.diary);
        const shownRolls = shownLines.filter((entry) => entry.type === "roll");
        const place = shownPlace(sight);
        const openScene = shownScene(sight);
        const settings = readSettings(root);
        const today = now === undefined ? undefined : calendarDayOf(root, context, now.day);
        const words = system === undefined || settings.language === undefined ? undefined : systemWordsOf(root, system, settings.language, context);
        const titled = withPageTitles(words, world);
        // The system's pages of the party's sheets, in the campaign's language where the system has no translation (D-539).
        wantTexts(root, context, world, [...players, ...companions]);
        const textsTranslating = translatingTexts(context, world);
        const layers = shownLayers(world, knowledge);
        return {
            kind: "overview",
            campaign: settings.name,
            ...(settings.language === undefined ? {} : { language: settings.language }),
            ...(titled === undefined ? {} : { words: titled }),
            ...(system === undefined || Object.keys(system.sheetVerbs).length === 0 ? {} : { verbs: system.sheetVerbs }),
            ...(system === undefined ? {} : { system: { name: system.name, title: system.title, ...(system.attribution === undefined ? {} : { attribution: system.attribution }) } }),
            ...(now === undefined ? {} : { now: formatGameDate(now) }),
            ...(today === undefined ? {} : { calendar: today }),
            master: { mood: masterMood(root), ...(moment === undefined ? {} : { moment }) },
            party: [...players, ...companions].map(member),
            // The page speaks of them by name while more than one lives; with one living, as of one (VIEW-12).
            ...(players.filter((page) => page.fields.status !== "dead").length > 1 ? { foreground: pc.name } : {}),
            ...(place === undefined ? {} : { place }),
            ...(openScene === undefined ? {} : { openScene }),
            quests: world.pages.filter((page) => page.type === "quest" && page.fields.status === "open").map((page) => page.name),
            scene: sceneLine(sight, named),
            diary: diary.slice(Math.max(0, diary.length - shown)),
            total: diary.length,
            rolls: shownRolls.slice(-rollCount(input.rolls)).map((entry) => shownRoll(world, entry, named, picture, seenAt.get(entry.id))),
            rollsTotal: shownRolls.length,
            problems: campaignProblems(root, world, context).length,
            ...(importing === undefined ? {} : { importing }),
            ...(textsTranslating === undefined ? {} : { textsTranslating }),
            ...(layers.length === 0 ? {} : { layers }),
        };
    },

    format(result)
    {
        switch (result.kind) {
            case "none":
                return "There is no player character yet: the player's view starts with one.";
            case "unknown":
                return result.text;
            case "page":
                return [
                    result.title,
                    sheetText(result.sheet).join("\n"),
                    result.text,
                    result.whoKnows === undefined ? "" : whoKnowsText(result.whoKnows, result.unaware ?? []),
                    ...(result.knownBy ?? []).map((one) => `Secret ${one.secret}: known to ${one.who.join(" and ")} alone.`),
                ].filter((block) => block !== "").join("\n\n");
            case "section":
                return [result.title, result.lines.join("\n"), result.text, result.knownBy === undefined ? "" : `Known to ${result.knownBy.join(" and ")} alone.`].filter((block) => block !== "").join("\n\n");
            case "memory":
                return memoryText(result);
            case "map":
                return mapText(result);
            case "settings":
                return result.settings.map((setting) => `${setting.name}: ${settingText(setting)}`).join("\n");
            case "setup":
                return [
                    `${result.name}: ${result.mode}${result.missing.length === 0 ? "" : `; still missing: ${result.missing.join(", ")}`}`,
                    ...result.questions.map((question) => `${question.name}: ${question.items === undefined ? (question.value ?? "(not chosen)") : question.items.length === 0 ? "(none)" : question.items.join(", ")}`),
                ].join("\n");
            case "journal":
                return [
                    ...(result.quests.length === 0 ? ["No quests yet."] : result.quests.map(questText)),
                    ...result.chapters.map((chapter) => `${chapter.title ?? "Between scenes"}${chapter.date === undefined ? "" : `, ${chapter.date}`}${chapter.summary === undefined ? "" : `: ${chapter.summary}`}`),
                    ...result.thoughts.map((thought) => `${thought.who}'s diary${thought.date === undefined ? "" : `, ${thought.date}`}: ${thought.text}`),
                ].join("\n");
            case "world":
                return [
                    ...(result.known.length === 0 ? ["Known: nothing yet."] : ["Known:", ...result.known.map((entry) => `- ${knownEntryText(entry)}`)]),
                    ...result.documents.map((document) =>
                        `Document: ${document.name} (${document.document}${document.carried ? `, carried${document.carrier === undefined ? "" : ` by ${document.carrier}`}` : ""})${knownByText(document.knownBy)}`
                    ),
                    ...result.calendar.deadlines.map((deadline) => `Deadline of ${deadline.quest}: ${deadline.date}`),
                ].join("\n");
            case "saves":
                return [
                    ...result.saves.map((save) => `${save.number} - ${save.label}${save.place === undefined ? "" : `, in ${save.place}`}${save.point === undefined ? "" : ` (${save.point})`}${save.load ? "" : " (not to go back to)"}`),
                    result.rule,
                ].join("\n");

            default: {
                const more = result.diary.length < result.total ? ` (the last ${result.diary.length} of ${result.total}: view, diary all gives every one)` : "";
                return [
                    result.party.map((member) => memberLine(member, result.party.filter((one) => one.role === "pc").length > 1)).join("\n"),
                    result.quests.length === 0 ? "" : `Open quests: ${result.quests.join(" · ")}`,
                    result.scene === undefined ? "" : `Scene: ${result.scene}`,
                    result.diary.length === 0 ? "Diary: nothing yet." : `Diary${more}:\n${result.diary.map((line) => `- ${line}`).join("\n")}`,
                ].filter((block) => block !== "").join("\n\n");
            }
        }
    },
});

/**
 * The system's words for the page, with the names its translation gives its pages, as Palla di fuoco for Fireball, where its words do not name them (D-542):
 * those translated on this computer too, where the system has no words in the language (D-539).
 */
function withPageTitles(words: SystemWords | undefined, world: World): SystemWords | undefined
{
    const titles = Object.fromEntries((world.system?.pages ?? []).flatMap((page) => (page.title === undefined ? [] : [[page.name, page.title]])));
    return Object.keys(titles).length === 0 ? words : { groups: {}, fields: {}, ...words, words: { ...titles, ...words?.words } };
}

/** "Known to Bruna alone: Ettore plays as not knowing it, though all at the screen may read it.": who knows a page, and how the others are played (VIEW-12). */
function whoKnowsText(who: string[], unaware: string[]): string
{
    const others = unaware.length === 0 ? "" : `: ${unaware.join(" and ")} ${unaware.length === 1 ? "plays" : "play"} as not knowing it, though all at the screen may read it`;
    return `Known to ${who.join(" and ")} alone${others}.`;
}

/** "; known to Ettore alone": who of the player characters knows something, when not all of them do (VIEW-12). */
function knownByText(who: string[] | undefined): string
{
    return who === undefined ? "" : `; known to ${who.join(" and ")} alone`;
}

/** "Ettore does not know": who the view is of, for a page it does not know; no player character, when it is of more than one. */
function knowerText(knowledge: Knowledge): string
{
    return knowledge.each === undefined ? `${knowledge.pc.name} does not know` : "No player character knows";
}

/** "Lena (companion, worried), in Locanda: hp 9/15 · Poisoned until day 2, 14:20": someone of the party as the chat reads them. */
function memberLine(member: PartyMember, players: boolean): string
{
    // A dead companion's line says so, and with more than one player character a dead one's (VIEW-12); a lone player character's never did.
    const told = [member.role === "pc" ? "" : "companion", member.dead && (member.role === "companion" || players) ? "dead" : member.mood ?? ""].filter((part) => part !== "");
    const role = told.length === 0 ? "" : ` (${told.join(", ")})`;
    const counters = countersText(Object.fromEntries(member.counters.map((value) => [value.field, value.beside === undefined ? value.text : `${value.text} (${value.beside})`])));
    const shown = [counters, ...member.effects.map((effect) => effect.text)].filter((part) => part !== "");
    const place = member.place === undefined ? "" : `, ${Array.isArray(member.place) ? `in ${member.place.join(" › ")}` : member.place === "open" ? "in the open" : "elsewhere"}`;
    return `${member.name}${role}${place}${shown.length === 0 ? "" : `: ${shown.join(" · ")}`}`;
}

/** A setting of the player's in the chat: a list's items, none for an empty one, or its value; not chosen while it has none. */
function settingText(setting: PlayerSetting): string
{
    return setting.items === undefined ? (setting.value ?? "(not chosen)") : setting.items.length === 0 ? "(none)" : setting.items.join(", ");
}
