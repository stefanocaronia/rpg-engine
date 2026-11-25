// Two to five values of one thing to choose among, as a radio group: the control of a setting, and of what a chat with the master opens with.
import type { ComponentChildren } from "preact";
import { arrowStep } from "../text.ts";

/** A value to choose, with what it means when chosen, and a picture before its name. */
export interface Option
{
    value: string;
    label: string;
    means?: string;
    picture?: ComponentChildren;
}

/** Values to choose one of, as a radio group: the arrows move among them and choose, one stop of Tab; the chosen one in gold. Named, and described, by the ids given. */
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
        const next = ((from >= 0 ? from : Math.max(at, 0)) + step + options.length) % options.length;
        onPick(options[next].value, true);
        buttons[next]?.focus();
    };

    return (
        <span class="segmented" role="radiogroup" aria-labelledby={label} aria-describedby={described} onKeyDown={move}>
            {options.map((option, index) => (
                <button
                    key={option.value}
                    type="button"
                    role="radio"
                    aria-checked={option.value === value}
                    tabIndex={index === Math.max(at, 0) ? 0 : -1}
                    onClick={() => option.value !== value && onPick(option.value, false)}
                >
                    {option.picture}
                    {option.label}
                </button>
            ))}
        </span>
    );
}
