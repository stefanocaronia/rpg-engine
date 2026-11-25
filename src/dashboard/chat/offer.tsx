// What the open chat offers the player in place of writing (D-582): to begin a new story, to take up one the master remembers, to pick up one cut as the
// game was closed. A click sends the master a sentence as the player's own words, out of the game, in the page's language; who would rather write, writes.
// To take up and to pick up are a quiet word of the table's at the end of the messages, or alone where there are none; to begin is an invitation in the
// middle of the empty chat, with the gold button of what the player does next.
import { Icon } from "../parts/icons.tsx";
import { t } from "../text.ts";
import { type ChatOffer, speaker } from "./chat.ts";

/** What an offer says, its button's words, and the sentence the click sends. */
function offerWords(offer: ChatOffer): { says: string; button: string; sends: string; }
{
    if (offer === "begin") {
        return { says: t("The master is ready."), button: t("Begin"), sends: t("[OOC: let's begin]") };
    }

    return offer === "take-up"
        ? {
            says: t("The master remembers the story so far: ask them where you were, or write to them yourself."),
            button: t("Take up the story"),
            sends: t("[OOC: let's take the game up again: tell me in a few lines where we were]"),
        }
        : {
            says: t("The game was closed in the middle of the story: ask the master to pick up from here, or write to them yourself."),
            button: t("Pick up from here"),
            sends: t("[OOC: the game was closed halfway: pick up from where we were, and ask me again any question you had left open]"),
        };
}

/**
 * An offer, drawn: `busy` while something is on its way, its button there and taking no click; `alone` with no message over it, where it is no item of
 * their list.
 */
export function ChatOffering({ offer, busy, alone = false, onSend }: { offer: ChatOffer; busy: boolean; alone?: boolean; onSend(words: string): void; })
{
    const words = offerWords(offer);
    const button = (
        <button type="button" class={offer === "begin" ? "button gold" : "button"} aria-disabled={busy} onClick={() => !busy && onSend(words.sends)}>
            {words.button}
        </button>
    );

    if (offer === "begin") {
        return (
            <div class="chat-begin">
                <p>{words.says}</p>
                {button}
            </div>
        );
    }

    const Frame = alone ? "div" : "li";
    return (
        <Frame class={alone ? "chat-message from-table offering alone" : "chat-message from-table offering"}>
            <span class="visually-hidden">{speaker("table")}</span>
            <Icon name="info" />
            <div class="chat-offering">
                <p>{words.says}</p>
                {button}
            </div>
        </Frame>
    );
}
