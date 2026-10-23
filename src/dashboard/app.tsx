// The player's dashboard (D-269, D-272, D-276): the master and the campaign on top, the party's strip, what the master asks, the sheet of whom the address
// names and the table beside it, the turns of a fight, the followed quest and the rolls (D-279), read again whenever the server says something changed.
import { render } from "preact";
import { useEffect, useRef, useState } from "preact/hooks";
import { type PlayerActs, PlayerActsContext } from "./act-names.tsx";
import { type ActReply, ActSheet } from "./act-sheet.tsx";
import { ActStrip } from "./act-strip.tsx";
import { type ActStart, type SaidAct, saidStates, type SheetActions } from "./acts.ts";
import { type Address, readAddress, sectionAddress } from "./address.ts";
import { answer, readActs, readAsked, readView, sayAct, sendSeen, withdrawAct } from "./api.ts";
import { AskedBanner } from "./asked.tsx";
import { useMedia } from "./card.tsx";
import type { ActsShown, Asked, CalendarDay, Member, Moment, Mood, SheetCards, SheetGroup, ShownImport, ShownPlace, ShownRoll, ShownScene } from "./data.ts";
import { DeathSaveCard } from "./death-save.tsx";
import { DiceTray, type SheetThrow } from "./dice/tray.tsx";
import { PageFoot } from "./footer.tsx";
import { type PageRoll, readFree, withFree, writeFree } from "./free-rolls.ts";
import { Help } from "./help.tsx";
import { Icon } from "./icons.tsx";
import { FollowedQuests, JournalView, QuestEndings } from "./journal.tsx";
import { gameNotices, importNotices, type Notice, Notices } from "./notices.tsx";
import { PackagesPage } from "./packages.tsx";
import { About, Upcoming } from "./pages.tsx";
import { PartyStrip } from "./party.tsx";
import { rollReaction } from "./reactions.ts";
import { requestedOf, RequestedRoll } from "./requested.ts";
import { RollLog } from "./rolls.tsx";
import { type SaveAsked, type SaveOutcome, saveOutcome } from "./save-outcome.ts";
import { SavesView } from "./saves.tsx";
import { SceneView } from "./scene.tsx";
import { SettingsView } from "./settings.tsx";
import { SetupView, useSetup } from "./setup.tsx";
import { type FreeRoll, MemberSheet } from "./sheet.tsx";
import { SpendCard } from "./spend.tsx";
import { PlayTable, tableBeside, TableTab, useTableAway } from "./table.tsx";
import { pageDirection, setLanguage, setSystemWords, t } from "./text.ts";
import { restoreTheme } from "./theme.ts";
import { SetupCorner, Top } from "./top.tsx";
import { hasTurns, TurnsCard } from "./turns.tsx";
import { WorldView } from "./world.tsx";

/** The product's name, as the page writes it: here only (D-276). */
const productName = "RPG Engine";

// How many of the last rolls the page reads at first, and how many more each time the player asks for older ones (D-302).
const firstRolls = 20;

/** What the page shows: the campaign, its system and its time, the party, whom the address names and their sheet, the rolls and what the master asks, as of when it was read. */
interface Shown
{
    campaign?: string;
    system?: { name: string; title: string; attribution?: string; };
    now?: string;
    calendar?: CalendarDay;
    party: Member[];
    chosen?: string;
    /** The line under the chosen one's name, such as Level 3 Cleric. */
    headline?: string;
    sheet: SheetGroup[];
    cards?: SheetCards;
    text: string;
    /** The player character's opening text, when the player may write it (D-373). */
    story?: string;
    rolls: ShownRoll[];
    /** How many public rolls the log has, past those read. */
    rollsTotal: number;
    /** The master's mood, on the robot (D-305). */
    masterMood?: Mood;
    /** Where the party is, and the open scene (VIEW-6). */
    place?: ShownPlace;
    openScene?: ShownScene;
    asked?: Asked;
    /** How many times it was read: what was explained is told again after each. */
    version: number;
    readAt?: Date;
    noCharacter?: boolean;
    /** How many problems the campaign's files have, which the master fixes (validate). */
    problems?: number;
    /** An import under way (D-491 (11)). */
    importing?: ShownImport;
    problem?: string;
    /** What a death save's roll, or a die of a rest, changed, kept back while its dice are in the air (D-461, D-492). */
    pending?: Steady;
}

/** What a roll changes of the sheet and the fight, which the page shows only once its dice land. */
type Steady = Pick<Shown, "party" | "chosen" | "headline" | "sheet" | "cards" | "text" | "story" | "openScene">;

// How long at most what a death save or a die of a rest changed waits for its dice, when they never land.
const longestHold = 15_000;
// How long a sentence the master heard, or one copied for the chat, stays in the strip (D-495).
const heardTime = 6000;

function App()
{
    const [shown, setShown] = useState<Shown>({ party: [], sheet: [], text: "", rolls: [], rollsTotal: 0, version: 0 });
    const [live, setLive] = useState(false);
    // The section the address names, and whose sheet (D-276, D-309).
    const [address, setAddress] = useState<Address>(() => readAddress(window.location.hash));
    const reading = useRef(0);
    // The rolls already read, from the first reading on: a check rolled after it is thrown on the page; the rolls new since come into the list as new.
    const seen = useRef<Set<string>>();
    const [thrown, setThrown] = useState<ShownRoll>();
    // The roll whose dice are in the air: its line comes into the rolls only as they go (D-300).
    const [held, setHeld] = useState<string>();
    const [fresh, setFresh] = useState<Set<string>>(new Set());
    // How many of the last rolls the page reads: more when the player asks for older ones (D-302).
    const rollsAsked = useRef(firstRolls);
    // The robot's face for a moment (D-305): the master's last moment once it is new, or a new roll's reaction, whichever came last.
    const [moment, setMoment] = useState<Moment>();
    const toldMoment = useRef<string>();
    // A number of the sheet rolled for fun, from its explanation (D-280): each a throw of its own, even of the same number.
    const [sheetThrow, setSheetThrow] = useState<SheetThrow>();
    // The question answered from the sheet or the tray, while the engine rolls it (D-330); the free rolls, in this browser alone.
    const [answering, setAnswering] = useState<string>();
    // The death save asked of the player, a card that stays until its outcome is told (D-461): the question, whether the player rolled, its roll once landed
    // with what the system's code wrote of it.
    const [saving, setSaving] = useState<{ asked: Asked; save: SaveAsked; sent?: boolean; roll?: ShownRoll; outcome?: SaveOutcome | undefined; }>();
    const savingNow = useRef(saving);
    savingNow.current = saving;
    // The roll that answers it while its dice fly: what it changes of the sheet waits for them (D-461).
    const holding = useRef<{ roll: ShownRoll; timer: number; }>();
    // The party as last read, never held back: what a death save's roll left of them.
    const partyNow = useRef<Member[]>([]);
    const [free, setFree] = useState<PageRoll[]>([]);
    // On a wide screen the table stands beside the page, unless the player folded it; folded, or under that width, the turns and the followed quest go back to
    // the page.
    const wide = useMedia(tableBeside);
    const [tableAway, setTableAway] = useTableAway();
    const table = wide && !tableAway;
    // Whether the player has just opened or folded the table, which slides it in and gives the focus to what folds it, or to its tab; at the first reading it
    // is simply there.
    const [tableMoved, setTableMoved] = useState(false);
    // The player's actions (D-495): the verbs of the player character's sheet, the sentences said or copied for the chat and how the server holds them,
    // and the action the player is writing, with what started it, which has the focus back.
    const [actions, setActions] = useState<SheetActions>();
    const [acts, setActs] = useState<ActsShown>();
    const [said, setSaid] = useState<SaidAct[]>([]);
    const [actProblem, setActProblem] = useState<string>();
    const [acting, setActing] = useState<{ start: ActStart; opener: HTMLElement | SVGElement; }>();

    // Reads view again for whom the address names, or the player character, and what the master asks; an answer that comes after a newer one is left out.
    const read = async (): Promise<void> => {
        const number = ++reading.current;

        try {
            const [overview, asked, actsNow] = await Promise.all([readView(undefined, rollsAsked.current), readAsked().catch(() => undefined), readActs().catch(() => undefined)]);
            const party = overview.kind === "overview" ? overview.party : [];
            partyNow.current = party;
            const rolls = overview.kind === "overview" ? overview.rolls : [];
            const member = party.find((candidate) => candidate.name === readAddress(window.location.hash).name) ?? party[0];
            const page = member === undefined ? undefined : await readView(member.name);
            // The page's words in the campaign's language (D-394), its file read once; its dates and screen readers follow the language too.
            const language = overview.kind === "overview" || overview.kind === "none" ? overview.language : undefined;
            await setLanguage(language);
            setSystemWords(overview.kind === "overview" ? overview.words : undefined);

            if (number === reading.current) {
                document.documentElement.lang = language ?? "en";
                document.documentElement.dir = pageDirection();
                setActs(actsNow);

                // The verbs come with the player character's page alone: another's sheet leaves them as they were.
                if (member?.role === "pc") {
                    setActions(page?.kind === "page" ? page.actions : undefined);
                }

                // New are only the rolls after the newest one read before: older ones read at a Load more are not (D-302).
                const newestSeen = rolls.findLastIndex((roll) => seen.current?.has(roll.id) === true);
                const added = seen.current === undefined ? [] : rolls.slice(newestSeen + 1);
                const asking = added.filter((roll) => roll.by === "player" && roll.check !== undefined).at(-1);
                seen.current = new Set(rolls.map((roll) => roll.id));
                // A roll stays new through the readings that come while its dice roll, until it shows (D-303); the list draws it new once.
                const addedIds = new Set(added.map((roll) => roll.id));
                setFresh((before) => new Set(rolls.map((roll) => roll.id).filter((id) => before.has(id) || addedIds.has(id))));
                // The robot reacts to a new roll as it comes in, to a check of the player's as its dice go; the master's own moment comes after it (D-305).
                const coming = added.filter((roll) => roll.id !== asking?.id).at(-1);

                if (coming !== undefined) {
                    react(coming, party);
                }

                const told = overview.kind === "overview" ? overview.master?.moment : undefined;

                if (told !== undefined && told.id !== toldMoment.current) {
                    toldMoment.current = told.id;
                    setMoment(told);
                }

                if (asking !== undefined) {
                    setThrown(asking);
                    setHeld(asking.id);
                }

                // A death save asked becomes its card; another question takes its place. The roll that answers it holds back what it changes (D-461).
                const card = asked?.save === undefined ? (asked === undefined ? savingNow.current : undefined) : savingNow.current?.asked.id === asked.id ? savingNow.current : { asked, save: asked.save };
                // Dice landed before what the system's code wrote was read: the outcome as soon as it is.
                const shownCard = card?.roll !== undefined && card.outcome === undefined ? toldCard(card, party) : card;
                savingNow.current = shownCard;
                setSaving(shownCard);

                // So does a die of a rest the player spends, whose card shows it once it lands (D-492).
                const spent = asked?.spend?.rolls.some((roll) => roll.id === asking?.id) === true;

                if (asking !== undefined && ((card !== undefined && card.roll === undefined) || spent) && holding.current === undefined) {
                    holding.current = { roll: asking, timer: window.setTimeout(() => land(asking.id), longestHold) };
                }

                setShown((before) =>
                    withHeld(before, {
                        campaign: overview.kind === "overview" ? overview.campaign : undefined,
                        system: overview.kind === "overview" ? overview.system : undefined,
                        now: overview.kind === "overview" ? overview.now : undefined,
                        calendar: overview.kind === "overview" ? overview.calendar : undefined,
                        party,
                        chosen: member?.name,
                        headline: page?.kind === "page" ? page.headline : undefined,
                        sheet: page?.kind === "page" ? page.sheet : [],
                        cards: page?.kind === "page" ? page.cards : undefined,
                        text: page?.kind === "page" ? page.text : "",
                        story: page?.kind === "page" ? page.story : undefined,
                        rolls,
                        rollsTotal: overview.kind === "overview" ? overview.rollsTotal ?? rolls.length : 0,
                        masterMood: overview.kind === "overview" ? overview.master?.mood : undefined,
                        place: overview.kind === "overview" ? overview.place : undefined,
                        openScene: overview.kind === "overview" ? overview.openScene : undefined,
                        asked,
                        version: before.version + 1,
                        readAt: new Date(),
                        noCharacter: overview.kind === "none",
                        problems: overview.kind === "overview" ? overview.problems : undefined,
                        importing: overview.kind === "overview" || overview.kind === "none" ? overview.importing : undefined,
                    }, holding.current !== undefined)
                );
            }
        } catch (error) {
            if (number === reading.current) {
                setShown((before) => ({ ...before, problem: error instanceof Error ? error.message : String(error) }));
            }
        }
    };

    // The death save's dice, or a rest's die, have landed: its outcome on the card, and the sheet as the roll left it (D-461, D-492).
    const land = (roll: string): void => {
        const held = holding.current;

        if (held === undefined || held.roll.id !== roll) {
            return;
        }

        window.clearTimeout(held.timer);
        holding.current = undefined;
        setSaving((before) => {
            if (before === undefined || before.roll !== undefined) {
                return before;
            }

            return { ...toldCard(before, partyNow.current), roll: held.roll };
        });
        setShown((before) => (before.pending === undefined ? before : { ...before, ...before.pending, pending: undefined }));
    };

    // A card of the master's closed, the focus goes to the notice of the turn, or else to the page (D-461, D-492).
    const focusAfterCard = (): void => {
        requestAnimationFrame(() => {
            const page = document.querySelector<HTMLElement>("main");
            page?.setAttribute("tabindex", "-1");
            (document.querySelector<HTMLElement>(".turn-notice") ?? page)?.focus({ preventScroll: true });
        });
    };

    const closeSave = (): void => {
        setSaving(undefined);
        focusAfterCard();
    };

    // The player rolls the death save from its card, as from a check's button.
    const rollSave = async (): Promise<void> => {
        const id = saving?.asked.id;

        if (id === undefined) {
            return;
        }

        setSaving((before) => (before === undefined ? before : { ...before, sent: true }));

        try {
            await answer(id, 0);
        } catch {
            setSaving((before) => (before === undefined ? before : { ...before, sent: false }));
        }

        void read();
    };

    // A new roll's face on the robot, for a moment, when the roll is remarkable (D-305, 7).
    const react = (roll: ShownRoll, party: Member[]): void => {
        const reaction = rollReaction(roll, party.map((member) => member.name));

        if (reaction !== undefined) {
            setMoment(reaction);
        }
    };

    useEffect(() => {
        // This page's own id, so that the server knows whether it is seen, and a question on pages no one sees goes to the chat (D-455).
        const pageId = Math.random().toString(36).slice(2, 12);
        const events = new EventSource(`/events?page=${pageId}`);
        const tellSeen = (): void => void sendSeen(pageId, document.visibilityState === "visible");

        events.onopen = () => {
            setLive(true);
            tellSeen();
            void read();
        };

        document.addEventListener("visibilitychange", tellSeen);

        events.addEventListener("changed", () => void read());
        events.onerror = () => setLive(false);

        const followAddress = (): void => {
            redirectCombat();
            setAddress(readAddress(window.location.hash));
            void read();
        };

        window.addEventListener("hashchange", followAddress);
        // Combat's old address leads to the Scene, which shows the turns now (D-444): the address says so too.
        redirectCombat();

        return () => {
            events.close();
            document.removeEventListener("visibilitychange", tellSeen);
            window.removeEventListener("hashchange", followAddress);
        };
    }, []);

    // Each campaign's free rolls, as this browser kept them.
    useEffect(() => setFree(readFree(shown.campaign)), [shown.campaign]);

    const member = shown.party.find((candidate) => candidate.name === shown.chosen);
    const lead = shown.party.find((candidate) => candidate.role === "pc");
    // A number of a sheet thrown for fun, each a throw of its own (D-280).
    const throwFromSheet: FreeRoll = (roll, label, who) => setSheetThrow((before) => ({ number: (before?.number ?? 0) + 1, roll, label, ...(who === undefined ? {} : { who }) }));

    // A check answered from its row of the sheet or the tray's dice (D-330): as its button, the engine rolls it; the banner folds away meanwhile.
    const answerFrom = async (index: number): Promise<void> => {
        const asked = shown.asked;

        if (asked === undefined) {
            return;
        }

        setAnswering(asked.id);

        try {
            await answer(asked.id, index);
        } catch {
            setAnswering(undefined);
        }

        void read();
    };

    // A die of a rest spent, or the rest's question ended, from its card (D-492): whether the engine took it; the page read again.
    const answerSpend = async (id: string | undefined, reply: 0 | { spend: string; }): Promise<boolean> => {
        const taken = id === undefined ? false : await answer(id, reply).catch(() => false);
        void read();
        return taken;
    };

    const requested = live ? requestedOf(answering === shown.asked?.id ? undefined : shown.asked, (index) => void answerFrom(index)) : undefined;
    // The open scene goes by turns, as a fight, and whether the turn is the player's character's (D-314, D-315, D-444).
    const fight = hasTurns(shown.openScene);
    const yourTurn = fight && lead !== undefined && shown.openScene?.turn === lead.name;

    // The game gone, what the master had not heard is lost with the chat: the strip says so, even once the game is back (D-495).
    useEffect(() => {
        if (!live) {
            setSaid((before) => before.map((one) => (acts?.heard.includes(one.id) === true ? one : { ...one, lost: true })));
        }
    }, [live]);

    const strip = saidStates(said, acts, live);
    const leaving = strip.filter((entry) => entry.state === "heard" || entry.state === "copied").map((entry) => entry.act.id).join();

    // A sentence heard, or copied, goes from the strip after a while.
    useEffect(() => {
        if (leaving === "") {
            return;
        }

        const timer = window.setTimeout(() => dismissAct(...leaving.split(",")), heardTime);
        return () => window.clearTimeout(timer);
    }, [leaving]);

    const dismissAct = (...ids: string[]): void => {
        setSaid((before) => before.filter((one) => !ids.includes(one.id)));
        setActProblem(undefined);
    };

    // With a question of the master's open, the sentence answers it (ASK-10); else it rings the master, or, in a chat that hears nothing by itself, is copied.
    const question = saving === undefined && shown.asked !== undefined && shown.asked.spend === undefined && shown.asked.save === undefined ? shown.asked : undefined;
    const reply: ActReply = question !== undefined ? "answer" : acts?.bell === true ? "tell" : "copy";

    const sendAct = async (text: string): Promise<string | undefined> => {
        setActProblem(undefined);

        if (reply === "answer" && question !== undefined) {
            const taken = await answer(question.id, text).catch(() => false);
            void read();
            return taken ? undefined : t("The answer did not reach the game: try again.");
        }

        if (reply === "copy") {
            return await copyAct(text) ? undefined : t("Copy did not work: select the words and copy them yourself.");
        }

        const result = await sayAct(text);

        if ("error" in result) {
            return result.error;
        }

        setSaid((before) => [...before, { id: result.id, text }]);
        setActs(result.shown);
        return undefined;
    };

    const copyAct = async (text: string): Promise<boolean> => {
        try {
            await navigator.clipboard.writeText(text);
            setSaid((before) => [...before.filter((one) => one.copied !== true || one.text !== text), { id: `copied ${Date.now()}`, text, copied: true }]);
            return true;
        } catch {
            return false;
        }
    };

    const withdraw = async (id: string): Promise<void> => {
        const result = await withdrawAct(id);

        if (result === "heard") {
            setActProblem(t("The master has already heard it."));
            void read();
        } else if (result === undefined) {
            setActProblem(t("It did not reach the game: try again."));
        } else {
            setActs(result);
            dismissAct(id);
        }
    };

    // The sheet closed, the focus goes back to what started the action.
    const closeAct = (): void => {
        const opener = acting?.opener;
        setActing(undefined);
        requestAnimationFrame(() => opener?.isConnected === true && opener.focus());
    };

    const playerActs: PlayerActs | undefined = actions === undefined || lead === undefined ? undefined : { actions, start: (start, opener) => setActing({ start, opener }) };

    // The tab's title: the campaign's name and the product's; a question that waits marks it, to be seen from another tab (D-455).
    useEffect(() => {
        const name = shown.campaign === undefined ? productName : `${shown.campaign} · ${productName}`;
        document.title = shown.asked === undefined ? name : `● ${shown.asked.title} · ${name}`;
    }, [shown.campaign, shown.asked?.id]);

    const setup = useSetup(shown.version);
    // While the campaign is in its setup, the page is its first configuration, as a portal's (D-370).
    const inSetup = setup?.mode === "setup";

    // The page's own messages, over it (D-298): a problem, the game away, a word to know.
    const notices: Notice[] = [
        ...(shown.problem === undefined ? [] : [{ kind: "problem" as const, text: shown.problem }]),
        ...(!live && shown.readAt !== undefined
            ? [{ kind: "away" as const, text: t("Not connected: the sheet as of {time}. It comes back when the game does.", { time: shown.readAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) }) }]
            : []),
        ...(shown.noCharacter && !inSetup ? [{ kind: "info" as const, text: t("There is no player character yet: the sheet comes when the master writes one.") }] : []),
        ...gameNotices(shown.problems),
        // In the setup an import under way is with the page's other notices, in the column of its card (D-491 (11)).
        ...(inSetup ? importNotices(shown.importing) : []),
    ];
    // In play, under the player's turn, which counts more in a fight.
    const importing = inSetup ? [] : importNotices(shown.importing);
    // Each campaign's rolls as the player cleared them there: the list starts again when the campaign is known.
    const rolls = (
        <RollLog
            key={shown.campaign}
            rolls={held === undefined ? shown.rolls : shown.rolls.filter((roll) => roll.id !== held)}
            free={free}
            unread={shown.rollsTotal > shown.rolls.length}
            campaign={shown.campaign}
            party={shown.party}
            fresh={fresh}
            onMore={() => {
                rollsAsked.current += firstRolls;
                void read();
            }}
            onClearFree={() => {
                setFree([]);
                writeFree(shown.campaign, []);
            }}
        />
    );
    return (
        <RequestedRoll.Provider value={requested}>
            <PlayerActsContext.Provider value={playerActs}>
                <div class={live ? "page" : "page stale"}>
                    {!inSetup && (
                        <Top
                            campaign={shown.campaign}
                            product={productName}
                            system={shown.system?.name}
                            now={shown.now}
                            calendar={shown.calendar}
                            path={shown.place === undefined ? undefined : [...shown.place.within, shown.place.name]}
                            live={live}
                            mood={shown.masterMood}
                            moment={moment}
                            asleep={!live && shown.readAt !== undefined}
                            section={address.section}
                            fight={fight}
                            yourTurn={yourTurn}
                        />
                    )}
                    {inSetup && <SetupCorner live={live} />}
                    <Notices notices={notices} />
                    {live && saving !== undefined && (
                        <DeathSaveCard
                            key={saving.asked.id}
                            asked={saving.asked}
                            save={saving.save}
                            member={lead}
                            roll={saving.roll}
                            outcome={saving.outcome}
                            rolling={saving.sent === true || answering === saving.asked.id || shown.asked?.id !== saving.asked.id}
                            onRoll={() => void rollSave()}
                            onClose={closeSave}
                        />
                    )}
                    {live && saving === undefined && shown.asked?.spend !== undefined && (
                        <SpendCard
                            key={shown.asked.id}
                            asked={shown.asked}
                            spend={shown.asked.spend}
                            member={shown.party.find((candidate) => candidate.name === shown.asked?.spend?.who)}
                            flying={holding.current?.roll.id}
                            onSpend={(field) => answerSpend(shown.asked?.id, { spend: field })}
                            onDone={async (focused) => {
                                const taken = await answerSpend(shown.asked?.id, 0);

                                if (taken && focused) {
                                    focusAfterCard();
                                }

                                return taken;
                            }}
                        />
                    )}
                    {live && saving === undefined && shown.asked && shown.asked.spend === undefined && (
                        <AskedBanner
                            asked={shown.asked}
                            yourTurn={yourTurn}
                            map={shown.place?.map}
                            place={shown.place?.name}
                            answered={answering === shown.asked.id}
                            onAnswered={() => void read()}
                        />
                    )}
                    {inSetup
                        ? <SetupView setup={setup} />
                        : (
                            <>
                                {/* The player's turn, seen from another section (D-315, D-444): a notice that leads to the Scene; the page never goes there by itself. */}
                                {live && yourTurn && address.section !== "scene" && shown.asked === undefined && saving === undefined && (
                                    <a class="turn-notice" href={sectionAddress("scene")}>
                                        <Icon name="combat" />
                                        <span>{shown.openScene?.round === undefined ? t("Your turn") : `${t("Your turn")} · ${t("Round {round}", { round: shown.openScene.round })}`}</span>
                                        <span class="turn-notice-go">{t("Go to the scene")}</span>
                                    </a>
                                )}
                                <Notices notices={importing} />
                                {/* A followed quest that ends is told here for a moment, beside the page over the quests' card when the table holds them. */}
                                {!table && <QuestEndings version={shown.version} campaign={shown.campaign} />}
                                {/* The party's strip is the Party section's own (D-310): it leads to each one's sheet. */}
                                {address.section === "party" && <PartyStrip party={shown.party} chosen={shown.chosen} scene={shown.openScene} />}
                                <div class="body">
                                    <main>
                                        {address.section === "about" && <About product={productName} system={shown.system} />}
                                        {address.section === "help" && <Help />}
                                        {/* The quest the player follows, small, where the story goes on (D-367), when the table does not hold it. */}
                                        {!table && address.section === "scene" && <FollowedQuests version={shown.version} campaign={shown.campaign} />}
                                        {address.section === "scene" && (
                                            <SceneView
                                                place={shown.place}
                                                scene={shown.openScene}
                                                lead={lead}
                                                party={shown.party}
                                                turnsBeside={table}
                                                own={{
                                                    sheet: shown.chosen === lead?.name ? shown.sheet : [],
                                                    cards: shown.cards,
                                                    version: shown.version,
                                                    onRoll: throwFromSheet,
                                                }}
                                            />
                                        )}
                                        {address.section === "world" && <WorldView version={shown.version} lead={lead} />}
                                        {address.section === "settings" && <SettingsView version={shown.version} />}
                                        {address.section === "saves" && <SavesView version={shown.version} campaign={shown.campaign} />}
                                        {address.section === "packages" && <PackagesPage version={shown.version} tab={address.tab} />}
                                        {address.section === "journal" && <JournalView version={shown.version} campaign={shown.campaign} />}
                                        {!["party", "scene", "journal", "world", "about", "help", "settings", "saves", "packages"].includes(address.section) && <Upcoming section={address.section} />}
                                        {address.section === "party" && member && (
                                            // A companion's things are not the player's to act with: only the player character's sheet has its verbs (D-495).
                                            <PlayerActsContext.Provider value={member.role === "pc" || playerActs === undefined ? playerActs : { ...playerActs, actions: {} }}>
                                                <MemberSheet
                                                    key={member.name}
                                                    member={member}
                                                    headline={shown.headline}
                                                    sheet={shown.sheet}
                                                    cards={shown.cards}
                                                    text={shown.text}
                                                    story={shown.story}
                                                    version={shown.version}
                                                    onRoll={throwFromSheet}
                                                    scene={shown.openScene}
                                                />
                                            </PlayerActsContext.Provider>
                                        )}
                                    </main>
                                    {table
                                        ? (
                                            <PlayTable
                                                entering={tableMoved}
                                                onFold={() => {
                                                    setTableMoved(true);
                                                    setTableAway(true);
                                                }}
                                            >
                                                {fight && <TurnsCard scene={shown.openScene} party={shown.party} beside />}
                                                <QuestEndings version={shown.version} campaign={shown.campaign} beside />
                                                <FollowedQuests version={shown.version} campaign={shown.campaign} beside />
                                                {rolls}
                                            </PlayTable>
                                        )
                                        : wide
                                        ? (
                                            <TableTab
                                                fight={fight}
                                                focused={tableMoved}
                                                onOpen={() => {
                                                    setTableMoved(true);
                                                    setTableAway(false);
                                                }}
                                            />
                                        )
                                        : rolls}
                                </div>
                                <PageFoot product={productName} system={shown.system} />
                            </>
                        )}
                    <DiceTray
                        requested={thrown}
                        sheetThrow={sheetThrow}
                        party={shown.party}
                        onLanded={land}
                        onShown={(id) => {
                            setHeld((now) => (now === id ? undefined : now));

                            if (thrown?.id === id) {
                                react(thrown, shown.party);
                            }
                        }}
                        onFree={(roll) => {
                            setFree((before) => withFree(shown.campaign, before, roll));
                            setFresh((before) => new Set([...before, roll.id]));
                        }}
                    />
                    {acting !== undefined && (
                        <ActSheet
                            start={acting.start}
                            place={shown.place}
                            scene={shown.openScene}
                            companions={shown.party.filter((one) => one.role === "companion").map((one) => one.name)}
                            reply={reply}
                            onSend={sendAct}
                            onClose={closeAct}
                        />
                    )}
                    <ActStrip
                        entries={strip}
                        problem={actProblem}
                        onWithdraw={(id) => void withdraw(id)}
                        onCopy={(id, text) => void copyAct(text).then((done) => (done ? dismissAct(id) : setActProblem(t("Copy did not work: select the words and copy them yourself."))))}
                        onDismiss={dismissAct}
                    />
                </div>
            </PlayerActsContext.Provider>
        </RequestedRoll.Provider>
    );
}

/** A death save's card with its outcome, as what the system's code wrote left who rolled it, in the party as last read (D-461). */
function toldCard<Card extends { asked: Asked; save: SaveAsked; outcome?: SaveOutcome | undefined; }>(card: Card, party: Member[]): Card
{
    const who = card.asked.who;
    const after = party.find((member) => (who === undefined ? member.role === "pc" : member.name === who));
    return { ...card, outcome: after === undefined ? undefined : saveOutcome(card.save, after) };
}

/** The page as read now; while a death save's dice fly, with the sheet and the fight as they were, what the roll changed kept until they land (D-461). */
function withHeld(before: Shown, next: Shown, hold: boolean): Shown
{
    if (!hold) {
        return { ...next, pending: undefined };
    }

    const steady = (shown: Shown): Steady => ({
        party: shown.party,
        chosen: shown.chosen,
        headline: shown.headline,
        sheet: shown.sheet,
        cards: shown.cards,
        text: shown.text,
        story: shown.story,
        openScene: shown.openScene,
    });
    return { ...next, ...steady(before), pending: steady(next) };
}

/** Writes the Scene's address over Combat's old one, without a step in the history. */
function redirectCombat(): void
{
    if (/^#\/combat(\/|$)/.test(window.location.hash)) {
        history.replaceState(null, "", sectionAddress("scene"));
    }
}

// The theme the player picked before, from the start (D-300).
restoreTheme();

const root = document.getElementById("app");

if (root !== null) {
    render(<App />, root);
}
