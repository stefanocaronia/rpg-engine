// The player's dashboard (D-269, D-272, D-276): the master and the campaign on top, the party's strip, what the master asks, the sheet of whom the address
// names and the rolls beside it (D-279), read again whenever the server says something changed.
import { render } from "preact";
import { useEffect, useRef, useState } from "preact/hooks";
import { readAsked, readView } from "./api.ts";
import { AskedBanner } from "./asked.tsx";
import type { Asked, Member, SheetGroup, ShownRoll } from "./data.ts";
import { DiceTray, type SheetThrow } from "./dice/tray.tsx";
import { Master } from "./master.tsx";
import { PartyStrip } from "./party.tsx";
import { RollLog } from "./rolls.tsx";
import { MemberSheet } from "./sheet.tsx";

/** The product's name, as the page writes it: here only (D-276). */
const productName = "RPG Engine";

/** What the page shows: the campaign and its time, the party, whom the address names and their sheet, the rolls and what the master asks, as of when it was read. */
interface Shown
{
    campaign?: string;
    now?: string;
    party: Member[];
    chosen?: string;
    sheet: SheetGroup[];
    text: string;
    rolls: ShownRoll[];
    asked?: Asked;
    /** How many times it was read: what was explained is told again after each. */
    version: number;
    readAt?: Date;
    noCharacter?: boolean;
    problem?: string;
}

function App()
{
    const [shown, setShown] = useState<Shown>({ party: [], sheet: [], text: "", rolls: [], version: 0 });
    const [live, setLive] = useState(false);
    const reading = useRef(0);
    // The rolls already read, from the first reading on: a check rolled after it is thrown on the page; the rolls new at a reading flash in the list.
    const seen = useRef<Set<string>>();
    const [thrown, setThrown] = useState<ShownRoll>();
    const [fresh, setFresh] = useState<Set<string>>(new Set());
    // A number of the sheet rolled for fun, from its explanation (D-280): each a throw of its own, even of the same number.
    const [sheetThrow, setSheetThrow] = useState<SheetThrow>();

    // Reads view again for whom the address names, or the player character, and what the master asks; an answer that comes after a newer one is left out.
    const read = async (): Promise<void> => {
        const number = ++reading.current;

        try {
            const [overview, asked] = await Promise.all([readView(), readAsked().catch(() => undefined)]);
            const party = overview.kind === "overview" ? overview.party : [];
            const rolls = overview.kind === "overview" ? overview.rolls : [];
            const member = party.find((candidate) => candidate.name === addressedName()) ?? party[0];
            const page = member === undefined ? undefined : await readView(member.name);

            if (number === reading.current) {
                const added = seen.current === undefined ? [] : rolls.filter((roll) => seen.current?.has(roll.id) !== true);
                const asking = added.filter((roll) => roll.by === "player" && roll.check !== undefined).at(-1);
                seen.current = new Set(rolls.map((roll) => roll.id));
                setFresh(new Set(added.map((roll) => roll.id)));

                if (asking !== undefined) {
                    setThrown(asking);
                }

                setShown((before) => ({
                    campaign: overview.kind === "overview" ? overview.campaign : undefined,
                    now: overview.kind === "overview" ? overview.now : undefined,
                    party,
                    chosen: member?.name,
                    sheet: page?.kind === "page" ? page.sheet : [],
                    text: page?.kind === "page" ? page.text : "",
                    rolls,
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

    useEffect(() => {
        const events = new EventSource("/events");

        events.onopen = () => {
            setLive(true);
            void read();
        };

        events.addEventListener("changed", () => void read());
        events.onerror = () => setLive(false);
        const followAddress = (): void => void read();
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
    const when = [shown.now, lead?.place?.replace(/^in /, "")].filter((part) => part !== undefined && part !== "").join(" · ");
    return (
        <div class={live ? "page" : "page stale"}>
            <header class="top">
                <Master />
                <div class="titles">
                    <h1>{shown.campaign ?? productName}</h1>
                    {shown.campaign !== undefined && <p class="product">{productName}</p>}
                </div>
                {when !== "" && <p class="when">{when}</p>}
                <span class={live ? "live on" : "live"}>{live ? "live" : "waiting for the game"}</span>
            </header>
            <PartyStrip party={shown.party} chosen={shown.chosen} />
            {live && shown.asked && <AskedBanner asked={shown.asked} onAnswered={() => void read()} />}
            <div class="body">
                <main>
                    {!live && shown.readAt !== undefined && <p class="notice" role="status">Not connected: the sheet as of {shown.readAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}. It comes back when the game does.</p>}
                    {shown.problem && <p class="notice problem" role="alert">{shown.problem}</p>}
                    {shown.noCharacter && <p class="notice">There is no player character yet: the sheet comes when the master writes one.</p>}
                    {member && (
                        <MemberSheet
                            key={member.name}
                            member={member}
                            sheet={shown.sheet}
                            text={shown.text}
                            version={shown.version}
                            onRoll={(roll, label) => setSheetThrow((before) => ({ number: (before?.number ?? 0) + 1, roll, label }))}
                        />
                    )}
                </main>
                <RollLog rolls={shown.rolls} party={shown.party} fresh={fresh} />
            </div>
            <DiceTray requested={thrown} sheetThrow={sheetThrow} />
        </div>
    );
}

/** Whom the address names, as in #/character/Ettore (D-276); undefined for any other address. */
function addressedName(): string | undefined
{
    const match = /^#\/character\/(.+)$/.exec(window.location.hash);

    try {
        return match === null ? undefined : decodeURIComponent(match[1]);
    } catch {
        return undefined;
    }
}

const root = document.getElementById("app");

if (root !== null) {
    render(<App />, root);
}
