// The player's dashboard (D-269, D-272, D-276): the master and the campaign on top, the party's strip, what the master asks, the sheet of whom the address
// names and the table beside it, the turns of a fight, the followed quest and the rolls (D-279), read again whenever the server says something changed.
import { render } from "preact";
import { useEffect, useMemo, useRef, useState } from "preact/hooks";
import { type PlayerActs, PlayerActsContext } from "./act-names.tsx";
import { type ActReply, ActSheet } from "./act-sheet.tsx";
import { ActStrip } from "./act-strip.tsx";
import { type ActStart, type SaidAct, saidStates, setSystemVerbs, type SheetActions } from "./acts.ts";
import { type Address, readAddress, sectionAddress } from "./address.ts";
import { answer, closeCard, readActs, readAsked, readModules, readView, readWidgets, sayAct, sendSeen, withdrawAct } from "./api.ts";
import { AskCard } from "./ask-card.tsx";
import { AskedDice } from "./asked-dice.tsx";
import { AskedBanner } from "./asked.tsx";
import { useMedia } from "./card.tsx";
import type { ActsShown, Asked, AskedNow, CalendarDay, Member, Moment, Mood, SheetCards, SheetGroup, ShownImport, ShownModule, ShownPlace, ShownRoll, ShownScene, ShownWidget } from "./data.ts";
import { DiceTray, type SheetThrow } from "./dice/tray.tsx";
import { WidgetCards, WidgetsContext } from "./extension-widgets.tsx";
import { PageFoot } from "./footer.tsx";
import { type PageRoll, readFree, withFree, writeFree } from "./free-rolls.ts";
import { Help } from "./help.tsx";
import { Icon } from "./icons.tsx";
import { FollowedQuests, JournalView, QuestEndings } from "./journal.tsx";
import { checkOf, systemNameLabel } from "./labels.ts";
import { gameNotices, importNotices, type Notice, Notices } from "./notices.tsx";
import { inCard, nextPackCard, type PackCard } from "./pack-card.ts";
import { PackagePage } from "./package-page.tsx";
import { PackagesPage } from "./packages.tsx";
import { codeOfModule, ModulesContext, ownKey, preloadModules, useNavPages } from "./page-code.tsx";
import { About } from "./pages.tsx";
import { PartyStrip, type Tokened } from "./party.tsx";
import { PeopleContext } from "./people.ts";
import { rollReaction } from "./reactions.ts";
import { requestedOf, RequestedRoll } from "./requested.ts";
import { RollLog } from "./rolls.tsx";
import { SavesView } from "./saves.tsx";
import { SceneView } from "./scene.tsx";
import { SettingsView } from "./settings.tsx";
import { SetupView, useSetup } from "./setup.tsx";
import { type FreeRoll, MemberSheet } from "./sheet.tsx";
import { PlayTable, tableBeside, TableTab, useTableAway } from "./table.tsx";
import { browserLanguage, pageDirection, setLanguage, setSystemWords, t } from "./text.ts";
import { restoreTheme } from "./theme.ts";
import { SetupCorner, Top } from "./top.tsx";
import { hasTurns, TurnsCard, turnWords } from "./turns.tsx";
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
    /** With more than one player character, the one in the foreground, whose place the page shows (VIEW-12). */
    foreground?: string;
    chosen?: string;
    /** The line under the chosen one's name, such as Level 3 Cleric. */
    headline?: string;
    sheet: SheetGroup[];
    cards?: SheetCards;
    text: string;
    /** The text's secrets that only some of the player characters discovered, each with who (D-480 (7)). */
    knownBy?: { secret: string; who: string[]; }[] | undefined;
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
    /** The card of a package's question, which stays through the questions of its attempt and after them, until closed (D-507). */
    pack?: PackCard | undefined;
    /** How many times it was read: what was explained is told again after each. */
    version: number;
    readAt?: Date;
    noCharacter?: boolean;
    /** How many problems the campaign's files have, which the master fixes (validate). */
    problems?: number;
    /** An import under way (D-491 (11)). */
    importing?: ShownImport;
    problem?: string;
    /** What a roll from a card, or a die of a rest, changed, kept back while its dice are in the air (D-461, D-492). */
    pending?: Steady;
}

/** What a roll changes of the sheet and the fight, which the page shows only once its dice land. */
type Steady = Pick<Shown, "party" | "chosen" | "headline" | "sheet" | "cards" | "text" | "knownBy" | "story" | "openScene" | "pack">;

// How long at most what a roll from a card or a die of a rest changed waits for its dice, when they never land.
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
    // Whose sheet the Party section opened by itself, kept until the address changes.
    const opened = useRef<string>();
    // Whose card the player chose at hand in a fight, with more than one player character (D-480 (7)): kept through that turn alone.
    const handed = useRef<{ who: string; turn: string; }>();
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
    // The roll that answers a card, or a die of a rest, while its dice fly: what it changes of the sheet waits for them (D-461).
    const holding = useRef<{ roll: ShownRoll; timer: number; }>();
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
    // The widgets of the campaign's extensions (D-502), read beside the rest and shown as they come, so that a slow hook never holds the page back; kept as they
    // were when a reading of them fails, and an answer older than one shown left out.
    const [widgets, setWidgets] = useState<ShownWidget[]>([]);
    const [modules, setModules] = useState<ShownModule[]>([]);
    const widgetReading = useRef({ asked: 0, shown: 0 });
    const moduleReading = useRef({ asked: 0, shown: 0 });
    // The card of a package's question as last read, even while the dice that changed it fly; the attempts the player let go, with the question then (D-507).
    const packNow = useRef<PackCard>();
    const packsGone = useRef(new Map<string, string | undefined>());
    // In the card of a rest's dice, how many dice were rolled as the player pressed one, until its roll lands.
    const restSent = useRef<number>();
    // The widgets as read while a card's dice fly, which show only once they land, as the rest of what the roll changed: a panel on the party never tells the
    // outcome of a death save before its die (D-461).
    const widgetsHeld = useRef<ShownWidget[]>();

    // Reads view again for whom the address names, or the player character the master calls, and what the master asks; an answer that comes after a newer one
    // is left out.
    const read = async (): Promise<void> => {
        const number = ++reading.current;
        const widgetsAsked = ++widgetReading.current.asked;
        void readWidgets().then((read) => {
            if (widgetsAsked > widgetReading.current.shown) {
                widgetReading.current.shown = widgetsAsked;
                // Their extensions' page code comes before a card of a roll needs it (D-510).
                preloadModules(read);

                if (holding.current !== undefined || packNow.current?.sent !== undefined) {
                    widgetsHeld.current = read;
                } else {
                    widgetsHeld.current = undefined;
                    setWidgets(read);
                }
            }
        }, () => undefined);
        // The page modules of the system and the extensions, for their cards in the pages and their own pages (D-511).
        const modulesAsked = ++moduleReading.current.asked;
        void readModules().then((read) => {
            if (modulesAsked <= moduleReading.current.shown) {
                return;
            }

            moduleReading.current.shown = modulesAsked;
            preloadModules(read.map(codeOfModule));
            setModules((before) => (JSON.stringify(before) === JSON.stringify(read) ? before : read));
        }, () => undefined);

        try {
            const [first, askedNow, actsNow] = await Promise.all([readView(undefined, rollsAsked.current), readAsked().catch(() => undefined), readActs().catch(() => undefined)]);
            const asked = askedNow === undefined ? undefined : askedNow.asked ?? undefined;
            // With more than one player character, a question for one elsewhere puts them in the foreground: the place, the map and the squares are theirs (VIEW-12).
            const here = first.kind === "overview" && (first.place?.here ?? []).some((one) => one.name === asked?.who);
            const focus = first.kind === "overview" && first.foreground !== undefined && asked?.who !== first.foreground && !here ? playerNamed(first.party, asked?.who)?.name : undefined;
            const overview = focus === undefined ? first : await readView(undefined, rollsAsked.current, focus).catch(() => first);
            const party = overview.kind === "overview" ? overview.party : [];
            const rolls = overview.kind === "overview" ? overview.rolls : [];
            const address = readAddress(window.location.hash);
            const scene = overview.kind === "overview" ? overview.openScene : undefined;
            const foreground = overview.kind === "overview" ? overview.foreground : undefined;
            // The sheet the Party section opens without a name stays while the player reads it, until they leave the section (D-480 (7)).
            const kept = address.section === "party" ? party.find((candidate) => candidate.name === opened.current) : undefined;

            // The card handed to another stays through that turn of that fight alone, while they are still in it; a fight reopened by the same title in the same minute counts as one.
            if (handed.current !== undefined && (handed.current.turn !== turnKey(scene) || !(scene?.fighters ?? []).some((one) => one.name === handed.current?.who))) {
                handed.current = undefined;
            }

            const atHand = address.section !== "party" ? playerNamed(party, handed.current?.who) : undefined;
            const member = (address.section === "party" ? party.find((candidate) => candidate.name === address.name) : undefined) ?? kept ?? atHand
                ?? calledOf(party, address.section, asked, scene, foreground);

            if (address.section === "party" && address.name === undefined) {
                opened.current = member?.name;
            }

            const page = member === undefined ? undefined : await readView(member.name);
            // The page's words in the campaign's language (D-394), its file read once; its dates and screen readers follow the language too.
            const language = (overview.kind === "overview" || overview.kind === "none" ? overview.language : undefined) ?? browserLanguage();
            await setLanguage(language);
            setSystemWords(overview.kind === "overview" ? overview.words : undefined);
            setSystemVerbs(overview.kind === "overview" ? overview.verbs : undefined);

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

                // A roll from a package's card, as a death save, holds back what it changes until its dice land, its marks too (D-461, D-507); so does a die of a
                // rest the player spends (D-492).
                const spent = asked?.spend?.rolls.some((roll) => roll.id === asking?.id) === true;
                const packRolled = packNow.current?.sent !== undefined;
                const next = askedNow === undefined ? packNow.current : packOf(askedNow);
                // The roll that answers a card is its last, for its drawing to tell (D-510).
                const pack = packRolled && asking !== undefined && next !== undefined ? { ...next, rolled: { total: asking.total, faces: asking.dice.map((die) => die.value) } } : next;
                packNow.current = pack;

                // A die of a rest's card whose roll came with none to wait for, as with no dice to throw: its buttons free at once.
                if (restSent.current !== undefined && (pack?.asked?.spend?.rolls.length ?? 0) > restSent.current && !spent) {
                    window.setTimeout(unpressRest);
                }

                if (asking !== undefined && (spent || packRolled) && holding.current === undefined) {
                    holding.current = { roll: asking, timer: window.setTimeout(() => land(asking.id), longestHold) };
                }

                setShown((before) =>
                    withHeld(before, {
                        campaign: overview.kind === "overview" ? overview.campaign : undefined,
                        system: overview.kind === "overview" ? overview.system : undefined,
                        now: overview.kind === "overview" ? overview.now : undefined,
                        calendar: overview.kind === "overview" ? overview.calendar : undefined,
                        party,
                        foreground,
                        chosen: member?.name,
                        headline: page?.kind === "page" ? page.headline : undefined,
                        sheet: page?.kind === "page" ? page.sheet : [],
                        cards: page?.kind === "page" ? page.cards : undefined,
                        text: page?.kind === "page" ? page.text : "",
                        knownBy: page?.kind === "page" ? page.knownBy : undefined,
                        story: page?.kind === "page" ? page.story : undefined,
                        rolls,
                        rollsTotal: overview.kind === "overview" ? overview.rollsTotal ?? rolls.length : 0,
                        masterMood: overview.kind === "overview" ? overview.master?.mood : undefined,
                        place: overview.kind === "overview" ? overview.place : undefined,
                        openScene: overview.kind === "overview" ? overview.openScene : undefined,
                        asked,
                        pack,
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

    // The card of a package's question after a reading (D-507): an attempt asked again is no longer let go; one whose card went unanswered is.
    const packOf = (told: AskedNow): PackCard | undefined => {
        const key = told.asked?.card?.key;

        if (key !== undefined && packsGone.current.has(key) && packsGone.current.get(key) !== told.asked?.id) {
            packsGone.current.delete(key);
        }

        const next = nextPackCard(packNow.current, told, packsGone.current);

        if (next.let !== undefined) {
            packsGone.current.set(next.let, undefined);
        }

        packNow.current = next.card;
        return next.card;
    };

    // The card shown, and as last read, the same: pressed, closed.
    const setPack = (pack: PackCard | undefined): void => {
        packNow.current = pack;
        setShown((before) => ({ ...before, pack, ...(before.pending === undefined ? {} : { pending: { ...before.pending, pack } }) }));
    };

    // A button of a package's card (D-507): the card waits with it pressed while the answer goes; the core's change of mind takes the card away with it.
    const answerPack = async (index: number): Promise<void> => {
        const card = packNow.current;
        const asked = card?.asked;

        if (card === undefined || asked === undefined || card.ended === true || card.sent !== undefined) {
            return;
        }

        if (asked.spend !== undefined) {
            await spendFromCard(card, asked, index);
            return;
        }

        const leaves = checkOf(asked.labels[index] ?? "", asked.title) === undefined && (asked.buttons?.[index] ?? undefined) === undefined;

        if (leaves) {
            packsGone.current.set(card.key, asked.id);
        }

        setPack(leaves ? undefined : { ...card, sent: index });

        try {
            await answer(asked.id, index);
        } catch {
            packsGone.current.delete(card.key);
            setPack({ ...card, sent: undefined });
        }

        void read();
    };

    // A button of the card of a rest's dice (ASK-14): a die of a counter, which the question keeps; the last, the end, which takes the card away with it.
    const spendFromCard = async (card: PackCard, asked: Asked, index: number): Promise<void> => {
        const dice = asked.spend?.dice[index];

        // The die's button waits, pressed, until its roll lands (or the engine refuses it).
        if (dice !== undefined) {
            restSent.current = asked.spend?.rolls.length;
            setPack({ ...card, sent: index });

            if (!await answerSpend(asked.id, { spend: dice.field })) {
                restSent.current = undefined;
                setPack(packNow.current === undefined ? undefined : { ...packNow.current, sent: undefined });
            }

            return;
        }

        const focused = (document.activeElement?.closest(".ask-card") ?? null) !== null;
        packsGone.current.set(card.key, asked.id);
        setPack(undefined);

        if (await answerSpend(asked.id, 0)) {
            if (focused) {
                focusAfterCard();
            }

            return;
        }

        packsGone.current.delete(card.key);
        setPack(card);
    };

    // The player's own words in place of a button (ASK-10): taken, the card goes with its question, as the master hears them.
    const sayPack = async (text: string, focused: boolean): Promise<boolean> => {
        const card = packNow.current;
        const asked = card?.asked;

        if (card === undefined || asked === undefined || card.ended === true || card.sent !== undefined) {
            return false;
        }

        const taken = await answer(asked.id, text).catch(() => false);

        if (taken) {
            packsGone.current.set(card.key, asked.id);
            setPack(undefined);

            if (focused) {
                focusAfterCard();
            }
        }

        void read();
        return taken;
    };

    const closePack = (focused: boolean): void => {
        const key = packNow.current?.key;

        if (key !== undefined) {
            packsGone.current.set(key, undefined);
            // Closed for the server too: no reading, here or on another page, brings it back.
            void closeCard(key);
        }

        setPack(undefined);

        if (focused) {
            focusAfterCard();
        }
    };

    // The dice of a card's roll, or a rest's die, have landed: the card and the sheet as the roll left them (D-461, D-492).
    const land = (roll: string): void => {
        const held = holding.current;

        if (held === undefined || held.roll.id !== roll) {
            return;
        }

        window.clearTimeout(held.timer);
        holding.current = undefined;
        setShown((before) => (before.pending === undefined ? before : { ...before, ...before.pending, pending: undefined }));
        unpressRest();
    };

    // The card of a rest's dice, its die landed: its buttons free again, and the widgets read meanwhile shown.
    const unpressRest = (): void => {
        const card = packNow.current;
        restSent.current = undefined;
        showHeldWidgets();

        if (card?.asked?.spend !== undefined && card.sent !== undefined) {
            setPack({ ...card, sent: undefined });
        }
    };

    // The widgets read while a card's dice flew, once they have landed.
    const showHeldWidgets = (): void => {
        const held = widgetsHeld.current;
        widgetsHeld.current = undefined;

        if (held !== undefined) {
            setWidgets(held);
        }
    };

    // A card of the master's closed, the focus goes to the notice of the turn, or else to the page (D-461, D-492).
    const focusAfterCard = (): void => {
        requestAnimationFrame(() => {
            const page = document.querySelector<HTMLElement>("main");
            page?.setAttribute("tabindex", "-1");
            (document.querySelector<HTMLElement>(".turn-notice") ?? page)?.focus({ preventScroll: true });
        });
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
            opened.current = undefined;
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
    const players = shown.party.filter((candidate) => candidate.role === "pc");
    // With more than one living player character the page names each one, never "you" (D-480 (7)); the view gives the foreground then alone.
    const several = shown.foreground !== undefined;
    // What a dead one carried, knew or may be gone back from stays theirs: those pages name each player character, the dead too (D-480 (1), (2)).
    const many = players.length > 1;
    // The one in the foreground, whose place the page shows; and whose card is at hand in a fight, the one whose sheet was read.
    const lead = playerNamed(shown.party, shown.foreground) ?? players[0];
    const actor = member?.role === "pc" ? member : lead;
    // Who acts from a sheet acts where they are: the place of one not in the foreground, read for them (VIEW-12).
    const actsElsewhere = acting !== undefined && several && member?.role === "pc" && member.name !== shown.foreground ? member.name : undefined;
    const [actPlace, setActPlace] = useState<{ who: string; place?: ShownPlace; }>();

    useEffect(() => {
        if (actsElsewhere === undefined) {
            return;
        }

        let current = true;
        void readView(undefined, 1, actsElsewhere).then((view) => {
            if (current) {
                setActPlace({ who: actsElsewhere, ...(view.kind === "overview" && view.place !== undefined ? { place: view.place } : {}) });
            }
        }, () => undefined);

        return () => {
            current = false;
        };
    }, [actsElsewhere, shown.version]);
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

    // The packages' own pages, as tabs or in their menu (D-512).
    const ownPages = useNavPages(modules);
    // Whose portraits an extension's drawing may show (D-510): the party, then those at the place.
    const people: Tokened[] = [...shown.party, ...(shown.place?.here ?? []).filter((one) => !shown.party.some((member) => member.name === one.name))];
    // A package's question is answered from its card alone (D-507).
    const requested = live ? requestedOf(answering === shown.asked?.id || inCard(shown.asked) ? undefined : shown.asked, (index) => void answerFrom(index)) : undefined;
    // The open scene goes by turns, as a fight, and whether the turn is a player character's (D-314, D-315, D-444); whose, by name, when there are more.
    const fight = hasTurns(shown.openScene);
    const turnOf = fight ? playerNamed(shown.party, shown.openScene?.turn) : undefined;
    const yourTurn = turnOf !== undefined;
    const turnName = several ? turnOf?.name : undefined;
    // The player character the master's question is for, named on it when there are more (D-480 (7)).
    const asker = several ? playerNamed(shown.party, shown.asked?.who) : undefined;

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
    const question = shown.asked !== undefined && shown.asked.spend === undefined && shown.asked.forced !== true ? shown.asked : undefined;
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

    const playerActs: PlayerActs | undefined = actions === undefined || players.length === 0 ? undefined : { actions, start: (start, opener) => setActing({ start, opener }) };

    // The tab's title: the campaign's name and the product's; a question that waits marks it, to be seen from another tab (D-455).
    useEffect(() => {
        const name = shown.campaign === undefined ? productName : `${shown.campaign} · ${productName}`;
        document.title = shown.asked === undefined ? name : `● ${shown.asked.title} · ${name}`;
    }, [shown.campaign, shown.asked?.id]);

    const setup = useSetup(shown.version);
    // While a package's card is there, its widget beside the page would show the same twice (D-507); the same list until either changes, as the cards that
    // read their widget's data read it again when it does.
    const packWidget = shown.pack?.widget;
    const pageWidgets = useMemo(() => (packWidget === undefined ? widgets : widgets.filter((widget) => widget.id !== packWidget)), [widgets, packWidget]);
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
            several={several}
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
        <ModulesContext.Provider value={modules}>
            <PeopleContext.Provider value={people}>
                <RequestedRoll.Provider value={requested}>
                    <WidgetsContext.Provider value={pageWidgets}>
                        <PlayerActsContext.Provider value={playerActs}>
                            <div class={live ? "page" : "page stale"}>
                                {!inSetup && (
                                    <Top
                                        campaign={shown.campaign}
                                        product={productName}
                                        system={shown.system === undefined ? undefined : systemNameLabel(shown.system.name)}
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
                                        turnName={turnName}
                                        ownPages={ownPages}
                                        ownShown={address.section === "pkg" && address.tab !== undefined && address.name !== undefined ? ownKey({ package: address.tab, name: address.name }) : undefined}
                                    />
                                )}
                                {inSetup && <SetupCorner live={live} />}
                                <Notices notices={notices} />
                                {live && shown.pack !== undefined && (
                                    <AskCard
                                        key={shown.pack.key}
                                        card={shown.pack}
                                        name={several ? playerNamed(shown.party, shown.pack.asked?.who)?.name ?? turnName : undefined}
                                        widget={widgets.find((widget) => widget.id === shown.pack?.widget)}
                                        onAnswer={(index) => void answerPack(index)}
                                        onWords={sayPack}
                                        onClose={closePack}
                                    />
                                )}
                                {/* A package's question waits for its card, which comes a moment after it; the question alone when its widget gives none (D-507). */}
                                {/* The dice of a rest asked with no card of a package: a button for each counter of dice, and the one that ends it (ASK-14). */}
                                {live && shown.pack === undefined && shown.asked?.spend !== undefined && !inCard(shown.asked) && (
                                    <AskedDice
                                        key={shown.asked.id}
                                        asked={shown.asked}
                                        spend={shown.asked.spend}
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
                                {live && shown.pack === undefined && shown.asked && shown.asked.spend === undefined && !inCard(shown.asked) && (
                                    <AskedBanner
                                        asked={shown.asked}
                                        yourTurn={yourTurn && (asker === undefined || asker.name === turnOf?.name)}
                                        who={asker}
                                        turnName={turnName}
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
                                            {
                                                /* The player's turn, seen from another section (D-315, D-444): a notice that leads to the Scene, once no question nor a package's card
                                                is there; the page never goes there by itself. */
                                            }
                                            {live && yourTurn && address.section !== "scene" && shown.asked === undefined && shown.pack === undefined && (
                                                <a class="turn-notice" href={sectionAddress("scene")}>
                                                    <Icon name="combat" />
                                                    <span>{[turnWords(turnName), shown.openScene?.round === undefined ? "" : t("Round {round}", { round: shown.openScene.round })].filter((part) => part !== "").join(" · ")}</span>
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
                                                            actor={actor}
                                                            foreground={shown.foreground}
                                                            several={several}
                                                            party={shown.party}
                                                            turnsBeside={table}
                                                            onShowCard={(name) => {
                                                                handed.current = { who: name, turn: turnKey(shown.openScene) };
                                                                void read();
                                                            }}
                                                            own={{
                                                                sheet: shown.chosen === actor?.name ? shown.sheet : [],
                                                                cards: shown.cards,
                                                                version: shown.version,
                                                                onRoll: throwFromSheet,
                                                            }}
                                                        />
                                                    )}
                                                    {address.section === "world" && <WorldView version={shown.version} lead={lead} players={many ? players : undefined} tab={address.tab} item={address.name} />}
                                                    {address.section === "settings" && <SettingsView version={shown.version} several={many} />}
                                                    {address.section === "saves" && <SavesView version={shown.version} campaign={shown.campaign} several={many} />}
                                                    {address.section === "packages" && <PackagesPage version={shown.version} tab={address.tab} />}
                                                    {address.section === "pkg" && <PackagePage name={address.tab} page={address.name} />}
                                                    {address.section === "journal" && <JournalView version={shown.version} campaign={shown.campaign} tab={address.tab} item={address.name} />}
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
                                                                knownBy={shown.knownBy}
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
                                                            {fight && <TurnsCard scene={shown.openScene} party={shown.party} several={several} beside />}
                                                            <QuestEndings version={shown.version} campaign={shown.campaign} beside />
                                                            <FollowedQuests version={shown.version} campaign={shown.campaign} beside />
                                                            <WidgetCards place="side" />
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
                                                    : (
                                                        <>
                                                            <WidgetCards place="side" />
                                                            {rolls}
                                                        </>
                                                    )}
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
                                        self={several ? member?.name : undefined}
                                        place={actsElsewhere === undefined ? shown.place : actPlace?.who === actsElsewhere ? actPlace.place : undefined}
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
                    </WidgetsContext.Provider>
                </RequestedRoll.Provider>
            </PeopleContext.Provider>
        </ModulesContext.Provider>
    );
}

/** The player character of the party by their name; undefined for anyone else, or none. */
function playerNamed(party: Member[], name: string | undefined): Member | undefined
{
    return name === undefined ? undefined : party.find((member) => member.role === "pc" && member.name === name);
}

/**
 * Whose sheet the page reads when the address names no one (D-480 (7)): in the Party section the player character the master asks, then whose turn it is;
 * elsewhere whose turn it is first, for the card at hand in a fight; else the one in the foreground, else the first.
 */
function calledOf(party: Member[], section: string, asked: Asked | undefined, scene: ShownScene | undefined, foreground: string | undefined): Member | undefined
{
    const asking = playerNamed(party, asked?.who);
    const acting = hasTurns(scene) ? playerNamed(party, scene.turn) : undefined;
    return (section === "party" ? asking ?? acting : acting ?? asking) ?? playerNamed(party, foreground) ?? party[0];
}

/** The turn of a scene that goes by them, as the round and who acts; empty outside turns. */
function turnKey(scene: ShownScene | undefined): string
{
    return hasTurns(scene) ? `${scene.title} ${scene.since ?? ""} ${scene.round ?? ""} ${scene.turn ?? ""}` : "";
}

/** The page as read now; while a card's dice fly, with the sheet and the fight as they were, what the roll changed kept until they land (D-461). */
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
        knownBy: shown.knownBy,
        story: shown.story,
        openScene: shown.openScene,
        pack: shown.pack,
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
