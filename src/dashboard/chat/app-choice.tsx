// The AI apps to choose one of, where a chat is opened (T-307): a row each, its name at the start and, at the row's end, how it stands in words, out of
// any button's shape; the light that waits while it installs or signs in. A radio group: the arrows move among the rows and choose, passing over an app
// the page cannot open yet, one stop of Tab.
import type { ChatHost } from "../data.ts";
import { nextOn } from "../parts/choosing.ts";
import { arrowStep } from "../text.ts";
import { StateWords } from "./apps.tsx";
import { type HostState, hostState } from "./chat.ts";

/** The rows. `value` is the app chosen; named, and described, by the ids given. */
export function AppChoice({ hosts, value, label, described, onPick }: {
    hosts: ChatHost[];
    value: string | undefined;
    label: string;
    described?: string;
    onPick(id: string): void;
})
{
    const states = hosts.map((host): HostState => hostState(host));
    const options = hosts.map((_host, index) => ({ off: states[index] === "later" }));
    const at = hosts.findIndex((host) => host.id === value);

    const move = (event: KeyboardEvent): void => {
        const step = arrowStep(event.key);

        if (step === 0) {
            return;
        }

        event.preventDefault();
        const rows = [...(event.currentTarget as HTMLElement).querySelectorAll<HTMLElement>("button")];
        const from = rows.indexOf(event.target as HTMLElement);
        const next = nextOn(options, from >= 0 ? from : Math.max(at, 0), step);

        if (next !== undefined) {
            onPick(hosts[next].id);
            rows[next]?.focus();
        }
    };

    return (
        <div class="app-choice" role="radiogroup" aria-labelledby={label} aria-describedby={described} onKeyDown={move}>
            {hosts.map((host, index) => {
                const state = states[index];
                return (
                    <button
                        key={host.id}
                        type="button"
                        role="radio"
                        class="app-row"
                        aria-checked={host.id === value}
                        aria-disabled={state === "later" ? true : undefined}
                        tabIndex={index === Math.max(at, 0) ? 0 : -1}
                        onClick={() => host.id !== value && state !== "later" && onPick(host.id)}
                    >
                        <span class="app-radio" aria-hidden="true" />
                        <span class="app-name">{host.name}</span>
                        <span class="app-state">
                            {(state === "installing" || state === "signingIn") && <span class="chat-waits" aria-hidden="true" />}
                            <StateWords state={state} metered={host.metered === true} />
                        </span>
                    </button>
                );
            })}
        </div>
    );
}
