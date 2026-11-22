// The player's action as their own sentence to the master (D-495, D-573, D-581): a thing of the sheet opens on itself, what it is and its verbs, each of which
// goes to the master; someone at the place opens the words to say to them. No rule here.
import type { ShownPlace, ShownScene } from "../data.ts";
import type { ActStart } from "./acts.ts";
import { TalkSheet } from "./talk.tsx";
import { ThingSheet } from "./thing.tsx";

/** How the sentence goes: told to the master, or as the answer to what the master asks (ASK-10). */
export type ActReply = "tell" | "answer";

/** The card of an action: a thing's (D-573) or talking to someone's. A card in the middle, wider with the map; a sheet from the foot on a phone. */
export function ActSheet(
    { start, self, place, scene, companions, reply, asked, onSend, onClose }: {
        start: ActStart;
        /** The player character who acts, with more than one: the others are people to act on (VIEW-12). */
        self?: string | undefined;
        place?: ShownPlace;
        scene?: ShownScene;
        companions: string[];
        reply: ActReply;
        /** The master's open question the words answer, and whether it has buttons, as a roll, the words take the place of (ASK-10). */
        asked?: { question: string; buttons: boolean; } | undefined;
        /** Sends or copies the sentence: undefined when done, else what went wrong. */
        onSend(text: string): Promise<string | undefined>;
        onClose(): void;
    },
)
{
    return "talk" in start
        ? <TalkSheet name={start.talk} self={self} reply={reply} asked={asked} onSend={onSend} onClose={onClose} />
        : <ThingSheet start={start} self={self} place={place} scene={scene} companions={companions} reply={reply} onSend={onSend} onClose={onClose} />;
}
