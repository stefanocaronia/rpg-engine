// The player's dashboard (D-269, D-272): the party and the sheet of whom the player chooses, read again whenever the server says a file changed.
import { render } from "preact";
import { useEffect, useRef, useState } from "preact/hooks";
import { readView } from "./api.ts";
import type { Member, SheetGroup } from "./data.ts";
import { PartyStrip } from "./party.tsx";
import { MemberSheet } from "./sheet.tsx";

/** What the page shows: the campaign, the party, whom the player chose and their sheet, as of when it was read. */
interface Shown
{
    campaign?: string;
    party: Member[];
    chosen?: string;
    sheet: SheetGroup[];
    /** How many times it was read: the pictures are asked for again each time. */
    version: number;
    readAt?: Date;
    noCharacter?: boolean;
    problem?: string;
}

function App()
{
    const [shown, setShown] = useState<Shown>({ party: [], sheet: [], version: 0 });
    const [live, setLive] = useState(false);
    const chosen = useRef<string | undefined>(undefined);
    const reading = useRef(0);

    // Reads view again; an answer that comes after a newer one is left out.
    const read = async (): Promise<void> => {
        const number = ++reading.current;

        try {
            const overview = await readView();
            const party = overview.kind === "overview" ? overview.party : [];
            const member = party.find((candidate) => candidate.name === chosen.current) ?? party[0];
            const page = member === undefined ? undefined : await readView(member.name);

            if (number === reading.current) {
                setShown((before) => ({
                    campaign: overview.kind === "overview" ? overview.campaign : undefined,
                    party,
                    chosen: member?.name,
                    sheet: page?.kind === "page" ? page.sheet : [],
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
        return () => events.close();
    }, []);

    useEffect(() => {
        document.title = shown.campaign ?? "rpg-engine";
    }, [shown.campaign]);

    const choose = (name: string): void => {
        chosen.current = name;
        void read();
    };

    const member = shown.party.find((candidate) => candidate.name === shown.chosen);
    return (
        <div class={live ? "page" : "page stale"}>
            <header class="top">
                <h1>{shown.campaign ?? "rpg-engine"}</h1>
                <span class={live ? "live on" : "live"}>{live ? "live" : "waiting for the game"}</span>
            </header>
            {!live && shown.readAt !== undefined && <p class="notice" role="status">Not connected: the sheet as of {shown.readAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}. It comes back when the game does.</p>}
            {shown.problem && <p class="notice problem" role="alert">{shown.problem}</p>}
            {shown.noCharacter && <p class="notice">There is no player character yet: the sheet comes when the master writes one.</p>}
            <PartyStrip party={shown.party} chosen={shown.chosen} version={shown.version} onChoose={choose} />
            {member && <MemberSheet member={member} sheet={shown.sheet} version={shown.version} />}
        </div>
    );
}

const root = document.getElementById("app");

if (root !== null) {
    render(<App />, root);
}
