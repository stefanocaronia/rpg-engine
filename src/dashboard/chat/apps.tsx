// What an AI app needs before the master plays in it (T-290), with what does it from the page: to install it, which the engine does with a click or the app's
// own site where it cannot; to sign in to it, in the browser; and the wait for either. Where a chat is opened, in place of the model,
// and in a list of the apps, in the chat and in the launcher, while none is ready. Beside an app that is not ready, a button looks at the apps again now.
import { useEffect, useState } from "preact/hooks";
import type { HostWish } from "../api.ts";
import type { ChatHost } from "../data.ts";
import { Icon } from "../parts/icons.tsx";
import { installWhy, signInWhy } from "../parts/refusals.ts";
import { t, tParts } from "../text.ts";
import { hostFacts, type HostState, hostState, hostStateWords, installSiteWords } from "./chat.ts";

/**
 * What an app needs, and the controls that do it, by how it stands: `row` in a list of apps, where its name and what it needs stand before, and only the
 * controls and the lines under them are drawn here.
 */
export function HostNeed({ host, onWish, row = false }: { host: ChatHost; onWish(wish: HostWish): void; row?: boolean; })
{
    const state = hostState(host);
    const name = host.name;

    if (state === "installing") {
        return <Waiting words={row ? t("Installing…") : t("Installing {name}: it can take a minute…", { name })} />;
    }

    if (state === "signingIn") {
        return (
            <>
                <Waiting words={row ? t("Waiting for the browser…") : t("Waiting for you to sign in to {name}, in the browser…", { name })} />
                <div class="chat-need-buttons">
                    {!row && host.signInLink !== undefined && <a class="button quiet" href={host.signInLink} target="_blank" rel="noopener noreferrer">{t("Open the sign-in page again")}</a>}
                    <button type="button" class="button quiet" onClick={() => onWish({ signIn: { host: host.id, cancel: true } })}>{t("Cancel")}</button>
                </div>
            </>
        );
    }

    if (state === "install") {
        return <Install host={host} row={row} onWish={onWish} />;
    }

    if (state === "signIn") {
        return <SignIn host={host} row={row} onWish={onWish} />;
    }

    return null;
}

/** Where a chat is opened, the part that takes the model's place while the app chosen is not ready: what it needs, then what does it. */
export function ChatNeed({ host, onWish }: { host: ChatHost; onWish(wish: HostWish): void; })
{
    const state = hostState(host);
    const failed = (state === "install" && installFailed(host) !== undefined) || (state === "signIn" && signInFailed(host) !== undefined);
    return (
        <div class={failed ? "chat-need problem" : "chat-need"}>
            <HostNeed host={host} onWish={onWish} />
            {(state === "install" || state === "signIn") && <HostNeeds id={host.id} />}
        </div>
    );
}

/**
 * The apps to install or set up, one row each: its name with how it stands, what it needs and whose terms, and what does it. Where no app is ready: in the
 * chat, and in the launcher's home before anything else. The apps the page cannot drive yet are left out.
 */
export function HostRows({ hosts, onWish }: { hosts: ChatHost[]; onWish(wish: HostWish): void; })
{
    const listed = hosts.filter((host) => hostState(host) !== "later");
    // Whose the apps the engine installs are, and where they come from and go, said once above them: each row keeps only its maker's terms.
    const installs = listed.some((host) => host.install?.engine === true && ["install", "installing"].includes(hostState(host)));
    return (
        <>
            {installs && <p class="chat-hint chat-terms">{t("They are other companies' programs, not RPG Engine's: when you install one, we download it from npm into RPG Engine's folder on this computer.")}</p>}
            <ul class="chat-apps">
                {listed.map((host) => {
                    const state = hostState(host);
                    return (
                        <li key={host.id} class={`chat-app state-${state}`}>
                            <span class="chat-app-name">
                                {host.name}
                                <TrialMark id={host.id} />
                                {/* Waiting, the row's own line says it, with its light. */}
                                {state !== "installing" && state !== "signingIn" && <StateWords state={state} />}
                            </span>
                            <HostNeeds id={host.id} />
                            <div class="chat-app-act">
                                <HostNeed host={host} row onWish={onWish} />
                            </div>
                        </li>
                    );
                })}
            </ul>
            {/* Once, under the apps, for an app installed or signed in to outside the page: the page looks again now. */}
            {listed.some((host) => ["install", "signIn"].includes(hostState(host))) && (
                <div class="chat-apps-again">
                    <LookAgain onWish={onWish} />
                </div>
            )}
        </>
    );
}

// How long the button that looks at the apps again says it is looking: the table looks in the background, and the page reads it when it changes.
const lookingFor = 1500;

/** A quiet button that has the apps looked at again now, past the minute of coming back to the window; for a moment, it says it is looking. */
export function LookAgain({ onWish }: { onWish(wish: HostWish): void; })
{
    const [looking, setLooking] = useState(false);

    useEffect(() => {
        if (!looking) {
            return;
        }

        const timer = setTimeout(() => setLooking(false), lookingFor);
        return () => clearTimeout(timer);
    }, [looking]);

    return (
        <button
            type="button"
            class="button quiet chat-look-again"
            aria-busy={looking}
            onClick={() => {
                if (!looking) {
                    setLooking(true);
                    onWish({ hosts: true });
                }
            }}
        >
            <Icon name="update" />
            {looking ? t("Checking…") : t("Check again")}
        </button>
    );
}

/** What an app needs, written to stay true, and the link to its maker's plans and prices; nothing for an app the page does not know. */
export function HostNeeds({ id }: { id: string; })
{
    const facts = hostFacts(id);
    return facts === undefined ? null : (
        <span class="chat-app-needs">
            {facts.needs} <a href={facts.plans} target="_blank" rel="noopener noreferrer">{t("Plans and prices")}</a>
            {facts.trial !== undefined && <span class="chat-app-trial">{facts.trial}</span>}
        </span>
    );
}

/** After an app's name, quiet: that it is still on trial at the table; nothing for the others. */
export function TrialMark({ id }: { id: string; })
{
    return hostFacts(id)?.trial === undefined ? null : <span class="host-trial">{t("on trial")}</span>;
}

/** Once, under the apps: that the project is no maker's. */
export function Independent()
{
    return <p class="chat-independent">{t("RPG Engine is an independent project, not affiliated with or endorsed by Anthropic, OpenAI, Google or the OpenCode team.")}</p>;
}

/** An app's state in two words, after its name, quiet: none for one that is ready, but that it is paid by the answer, on an API key (`metered`). */
export function StateWords({ state, metered = false }: { state: HostState; metered?: boolean; })
{
    const words = hostStateWords(state) ?? (metered && state === "ready" ? t("Pay per use") : undefined);
    return words === undefined ? null : <span class={`host-state state-${state}`}>{words}</span>;
}

/**
 * To install: the engine does it, with a click, saying why the last time failed, or quietly that another window of RPG Engine is installing it; else the
 * app's own site, said before the click.
 */
function Install({ host, row, onWish }: { host: ChatHost; row: boolean; onWish(wish: HostWish): void; })
{
    const name = host.name;
    const failed = installFailed(host);
    const elsewhere = host.installCode === "elsewhere";

    if (host.install?.engine === true) {
        return (
            <>
                {!row && <p class="chat-need-what">{t("{name} is not on this computer.", { name })}</p>}
                {elsewhere && <Said calm words={t("{name} is being installed from another window of RPG Engine: once it is done, check again.", { name })} />}
                {failed !== undefined && <Said words={t("It did not install: {why}", { why: failed })} />}
                <div class="chat-need-buttons">
                    <button type="button" class={row || elsewhere ? "button" : "button gold"} onClick={() => onWish({ install: { host: host.id } })}>
                        <Icon name="download" />
                        {failed !== undefined ? t("Try again") : row ? t("Install") : t("Install {name}", { name })}
                    </button>
                    {!row && <LookAgain onWish={onWish} />}
                </div>
                <Terms host={host} row={row} />
            </>
        );
    }

    const page = host.install?.page;
    return (
        <>
            {!row && <p class="chat-need-what">{t("{name} is not on this computer.", { name })}</p>}
            {page !== undefined && (
                <div class="chat-need-buttons">
                    <a class={row ? "button" : "button gold"} href={page} target="_blank" rel="noopener noreferrer" aria-describedby={`install-site-${host.id}`}>
                        {row ? t("Get it") : t("Get {name}", { name })}
                    </a>
                    {!row && <LookAgain onWish={onWish} />}
                </div>
            )}
            <p id={`install-site-${host.id}`} class="chat-hint">{page === undefined ? t("Install it, then come back here.") : installSiteWords(host)}</p>
        </>
    );
}

/**
 * To sign in: a button that opens the app's sign-in page in the browser. What it needs is the button's description too: the focus lands on it when an
 * opening is refused as the player is not signed in. A sign-in under way in another window of RPG Engine is said quietly.
 */
function SignIn({ host, row, onWish }: { host: ChatHost; row: boolean; onWish(wish: HostWish): void; })
{
    const name = host.name;
    const failed = signInFailed(host);
    const elsewhere = host.signInCode === "elsewhere";
    const what = `sign-in-what-${host.id}`;
    return (
        <>
            {!row && <p id={what} class="chat-need-what">{t("{name} asks you to sign in first.", { name })}</p>}
            {elsewhere && <Said calm words={t("The sign-in to {name} is under way in another window of RPG Engine: finish it there, then come back here.", { name })} />}
            {failed !== undefined && <Said words={t("The sign-in did not finish: {why}", { why: failed })} />}
            <div class="chat-need-buttons">
                <button type="button" class={row || elsewhere ? "button" : "button gold"} aria-describedby={row ? undefined : what} onClick={() => onWish({ signIn: { host: host.id } })}>
                    {row ? t("Sign in") : t("Sign in to {name}", { name })}
                </button>
                {!row && <LookAgain onWish={onWish} />}
            </div>
            <p class="chat-hint">
                {t("{maker}'s sign-in page opens in your browser. {name} keeps your sign-in on this computer: RPG Engine never sees or stores passwords. Playing uses your plan's limits.", {
                    maker: hostFacts(host.id)?.maker ?? name,
                    name,
                })}
            </p>
        </>
    );
}

/**
 * Before the click that installs an app: whose it is, where it comes from and goes, and that its maker's terms apply, with the link to them. In a list of
 * apps, which says the rest once above them, only the terms, the link on their name.
 */
function Terms({ host, row }: { host: ChatHost; row: boolean; })
{
    const facts = hostFacts(host.id);
    const maker = facts?.maker ?? host.name;

    if (row) {
        const terms = t("{maker}'s terms", { maker });
        return (
            <p class="chat-hint chat-terms">
                {tParts("By using it you accept {terms}.", { terms: facts?.terms === undefined ? terms : <a href={facts.terms} target="_blank" rel="noopener noreferrer">{terms}</a> })}
            </p>
        );
    }

    return (
        <p class="chat-hint chat-terms">
            {t("{name} is made by {maker}, not by RPG Engine: we download it from npm into RPG Engine's folder on this computer.", { name: host.name, maker })}{" "}
            {facts?.terms === undefined ? t("By using it you accept {maker}'s terms.", { maker }) : <a href={facts.terms} target="_blank" rel="noopener noreferrer">{t("By using it you accept {maker}'s terms.", { maker })}</a>}
        </p>
    );
}

/** The wait for the browser or the install: the still light that waits, and the words. */
function Waiting({ words }: { words: string; })
{
    return (
        <p class="chat-need-wait" role="status">
            <span class="chat-waits" aria-hidden="true" />
            {words}
        </p>
    );
}

/** What became of the last try: why it failed, with the warning's mark; `calm`, that it goes on in another window, with the mark of a note. */
function Said({ words, calm = false }: { words: string; calm?: boolean; })
{
    return (
        <p class={calm ? "chat-need-said calm" : "chat-need-said"} dir="auto">
            <Icon name={calm ? "info" : "alert"} />
            <span>{words}</span>
        </p>
    );
}

/** Why the app's last install failed, in the page's words by its code, else as the engine said it; none where it did not, or goes on in another window. */
function installFailed(host: ChatHost): string | undefined
{
    return host.installCode === "elsewhere" ? undefined : installWhy(host.installCode, host.installValues) ?? host.installWhy;
}

/** Why the app's last sign-in failed, in the page's words by its code, else as the engine said it; none where it did not, or goes on in another window. */
function signInFailed(host: ChatHost): string | undefined
{
    return host.signInCode === "elsewhere" ? undefined : signInWhy(host.signInCode, host.signInValues, host.name) ?? host.signInWhy;
}
