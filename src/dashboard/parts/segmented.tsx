// Two to five values of one thing to choose among, as a radio group: the control of a setting, and of what a chat with the master opens with.
import type { ComponentChildren } from "preact";
import { arrowStep } from "../text.ts";
import { nextOn } from "./choosing.ts";

/**
 * A value to choose, with what it means when chosen, a picture before its name and words after it, as how it stands; `off` for one that cannot be chosen
 * now, which stays in sight, dimmed.
 */
export interface Option
{
    value: string;
    label: string;
    means?: string;
    picture?: ComponentChildren;
    after?: ComponentChildren;
    off?: boolean;
}

/**
 * Values to choose one of, as a radio group: the arrows move among them and choose, passing over those that cannot be chosen, one stop of Tab; the chosen
 * one in gold. Named, and described, by the ids given.
 */
export function Segmented({ label, described, options, value, onPick }: {
    label: string;
    described?: string | undefined;
    options: Option[];
    value?: string | undefined;
    onPick(value: string, byKey: boolean): void;
})
{
    const at = options.findIndex((option) => option.value === value);

    const move = (event: KeyboardEvent): void => {
        const step = arrowStep(event.key);

        if (step === 0) {
            return;
        }

        event.preventDefault();
        // From the value the focus is on, which a quick key reaches before the page draws the last choice.
        const buttons = [...(event.currentTarget as HTMLElement).querySelectorAll<HTMLElement>("button")];
        const from = buttons.indexOf(event.target as HTMLElement);
        const next = nextOn(options, from >= 0 ? from : Math.max(at, 0), step);

        if (next !== undefined) {
            onPick(options[next].value, true);
            buttons[next]?.focus();
        }
    };

    return (
        <span class="segmented" role="radiogroup" aria-labelledby={label} aria-describedby={described} onKeyDown={move}>
            {options.map((option, index) => (
                <button
                    key={option.value}
                    type="button"
                    role="radio"
                    aria-checked={option.value === value}
                    aria-disabled={option.off === true ? true : undefined}
                    tabIndex={index === Math.max(at, 0) ? 0 : -1}
                    onClick={() => option.value !== value && option.off !== true && onPick(option.value, false)}
                >
                    {option.picture}
                    {option.label}
                    {option.after}
                </button>
            ))}
        </span>
    );
}
