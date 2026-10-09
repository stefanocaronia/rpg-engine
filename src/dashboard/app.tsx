// The player's dashboard (D-269, D-272, D-276): the master and the campaign on top, the party's strip, what the master asks, the sheet of whom the address
// names and the rolls beside it (D-279), read again whenever the server says something changed.
import { render } from "preact";
import { useEffect, useRef, useState } from "preact/hooks";
import { type Address, readAddress } from "./address.ts";
import { readAsked, readView } from "./api.ts";
import { AskedBanner } from "./asked.tsx";
import type { Asked, Member, Moment, Mood, SheetCards, SheetGroup, ShownRoll } from "./data.ts";
import { DiceTray, type SheetThrow } from "./dice/tray.tsx";
import { phraseLabel } from "./labels.ts";
import { type Notice, Notices } from "./notices.tsx";
import { About, Upcoming } from "./pages.tsx";
import { PartyStrip } from "./party.tsx";
import { rollReaction } from "./reactions.ts";
import { RollLog } from "./rolls.tsx";
import { MemberSheet } from "./sheet.tsx";
import { restoreTheme } from "./theme.ts";
import { Top } from "./top.tsx";

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
    party: Member[];
    chosen?: string;
    /** The line under the chosen one's name, such as Level 3 Cleric. */
    headline?: string;
    sheet: SheetGroup[];
    cards?: SheetCards;
    text: string;
    rolls: ShownRoll[];
    /** How many public rolls the log has, past those read. */
    rollsTotal: number;
    /** The master's mood, on the robot (D-305). */
    masterMood?: Mood;
    asked?: Asked;
    /** How many times it was read: what was explained is told again after each. */
    version: number;
    readAt?: Date;
    noCharacter?: boolean;
    problem?: string;
}

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

    // Reads view again for whom the address names, or the player character, and what the master asks; an answer that comes after a newer one is left out.
    const read = async (): Promise<void> => {
        const number = ++reading.current;

        try {
            const [overview, asked] = await Promise.all([readView(undefined, rollsAsked.current), readAsked().catch(() => undefined)]);
            const party = overview.kind === "overview" ? overview.party : [];
            const rolls = overview.kind === "overview" ? overview.rolls : [];
            const member = party.find((candidate) => candidate.name === readAddress(window.location.hash).name) ?? party[0];
            const page = member === undefined ? undefined : await readView(member.name);

            if (number === reading.current) {
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

                setShown((before) => ({
                    campaign: overview.kind === "overview" ? overview.campaign : undefined,
                    system: overview.kind === "overview" ? overview.system : undefined,
                    now: overview.kind === "overview" ? overview.now : undefined,
                    party,
                    chosen: member?.name,
                    headline: page?.kind === "page" ? page.headline : undefined,
                    sheet: page?.kind === "page" ? page.sheet : [],
                    cards: page?.kind === "page" ? page.cards : undefined,
                    text: page?.kind === "page" ? page.text : "",
                    rolls,
                    rollsTotal: overview.kind === "overview" ? overview.rollsTotal ?? rolls.length : 0,
                    masterMood: overview.kind === "overview" ? overview.master?.mood : undefined,
                    asked,
                    version: before.version + 1,
                    readAt: new Date(),
                    noCharacter: overview.kind === "none",
                }));
            }
        } catch (error) {
            if (number === reading.current) {
                setShown((before) => ({ ...before, problem: error instanceof Error ? error.message : String(error) }));
            }
        }
    };

    // A new roll's face on the robot, for a moment, when the roll is remarkable (D-305, 7).
    const react = (roll: ShownRoll, party: Member[]): void => {
        const reaction = rollReaction(roll, party.map((member) => member.name));

        if (reaction !== undefined) {
            setMoment(reaction);
        }
    };

    useEffect(() => {
        const events = new EventSource("/events");

        events.onopen = () => {
            setLive(true);
            void read();
        };

        events.addEventListener("changed", () => void read());
        events.onerror = () => setLive(false);

        const followAddress = (): void => {
            setAddress(readAddress(window.location.hash));
            void read();
        };

        window.addEventListener("hashchange", followAddress);

        return () => {
            events.close();
            window.removeEventListener("hashchange", followAddress);
        };
    }, []);

    // The tab tells that the master asks something, when the page is behind another.
    useEffect(() => {
        const title = shown.campaign === undefined ? productName : `${shown.campaign} · ${productName}`;
        document.title = shown.asked === undefined ? title : `🎲 ${title}`;
    }, [shown.campaign, shown.asked === undefined]);

    const member = shown.party.find((candidate) => candidate.name === shown.chosen);
    const lead = shown.party.find((candidate) => candidate.role === "pc");
    const place = lead?.place?.replace(/^in /, "");
    // The page's own messages, over it (D-298): a problem, the game away, a word to know.
    const notices: Notice[] = [
        ...(shown.problem === undefined ? [] : [{ kind: "problem" as const, text: shown.problem }]),
        ...(!live && shown.readAt !== undefined
            ? [{ kind: "away" as const, text: `Not connected: the sheet as of ${shown.readAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}. It comes back when the game does.` }]
            : []),
        ...(shown.noCharacter ? [{ kind: "info" as const, text: "There is no player character yet: the sheet comes when the master writes one." }] : []),
    ];
    return (
        <div class={live ? "page" : "page stale"}>
            <Top
                campaign={shown.campaign}
                product={productName}
                system={shown.system?.name}
                now={shown.now}
                place={place === "" ? undefined : place}
                live={live}
                mood={shown.masterMood}
                moment={moment}
                asleep={!live && shown.readAt !== undefined}
                section={address.section}
            />
            <Notices notices={notices} />
            {live && shown.asked && <AskedBanner asked={shown.asked} onAnswered={() => void read()} />}
            <PartyStrip party={shown.party} chosen={address.section === "character" ? shown.chosen : undefined} />
            <div class="body">
                <main>
                    {address.section === "about" && <About product={productName} system={shown.system} />}
                    {address.section !== "character" && address.section !== "about" && <Upcoming section={address.section} />}
                    {address.section === "character" && member && (
                        <MemberSheet
                            key={member.name}
                            member={member}
                            headline={shown.headline}
                            sheet={shown.sheet}
                            cards={shown.cards}
                            text={shown.text}
                            version={shown.version}
                            onRoll={(roll, label) => setSheetThrow((before) => ({ number: (before?.number ?? 0) + 1, roll, label }))}
                        />
                    )}
                </main>
                {/* Each campaign's rolls as the player cleared them there: the list starts again when the campaign is known. */}
                <RollLog
                    key={shown.campaign}
                    rolls={held === undefined ? shown.rolls : shown.rolls.filter((roll) => roll.id !== held)}
                    unread={shown.rollsTotal > shown.rolls.length}
                    campaign={shown.campaign}
                    party={shown.party}
                    fresh={fresh}
                    onMore={() => {
                        rollsAsked.current += firstRolls;
                        void read();
                    }}
                />
            </div>
            {shown.system && (
                <footer class="credits">
                    <span>
                        {shown.system.name} · {phraseLabel(shown.system.title)}
                    </span>
                    {shown.system.attribution && (
                        <details>
                            <summary>Credits</summary>
                            <p>{shown.system.attribution}</p>
                        </details>
                    )}
                </footer>
            )}
            <DiceTray
                requested={thrown}
                sheetThrow={sheetThrow}
                party={shown.party}
                onShown={(id) => {
                    setHeld((now) => (now === id ? undefined : now));

                    if (thrown?.id === id) {
                        react(thrown, shown.party);
                    }
                }}
            />
        </div>
    );
}

// The theme the player picked before, from the start (D-300).
restoreTheme();

const root = document.getElementById("app");

if (root !== null) {
    render(<App />, root);
}
