// Money as its coins (D-431): each coin a small disc of its metal, its count, and its short name, which tells it apart where the colours look alike and
// is what a screen reader says. The metal is the game system's (`coin-metals`), a generic name the page has a colour for; a coin without one, or of a
// metal the page does not know, has a plain disc.
import type { SheetValue } from "./data.ts";
import { shownText } from "./labels.ts";

/** The coins of a value that is money, from the one worth most. */
export function Coins({ coins }: { coins: NonNullable<SheetValue["coins"]>; })
{
    return (
        <span class="coins">
            {coins.map(({ coin, count, metal }) => {
                const name = shownText(coin);
                return (
                    <span key={coin} class="coin" data-metal={metal} title={`${count} ${name}`}>
                        <CoinDisc />
                        <span class="num">{count}</span>
                        <span class="coin-name">{name}</span>
                    </span>
                );
            })}
        </span>
    );
}

/** A coin's disc: its face and rim in the colours of its metal, a ring stamped inside and a glint. */
function CoinDisc()
{
    return (
        <svg class="coin-disc" viewBox="0 0 16 16" aria-hidden="true">
            <circle class="coin-face" cx="8" cy="8" r="6.9" />
            <circle class="coin-ring" cx="8" cy="8" r="4.1" />
            <path class="coin-glint" d="M4.6 6.1a3.9 3.9 0 0 1 2.3-2.2" />
        </svg>
    );
}
