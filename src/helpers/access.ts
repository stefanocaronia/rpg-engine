// How each AI host's account stands on this computer and how the player gets there: Claude Code's and Codex's asked of their own status in the background,
// their sign-in started and cancelled from the page, their installation by the engine; the other hosts sign in and install from their own app or page.
import type { HelperFailure, HelperLogin, HelperName, Helpers, HelperState } from "../core/context.ts";
import { type HostId, hosts } from "../core/hosts.ts";
import { type RefusalBody, refusalWords } from "../core/refusal.ts";
import { hostHelper, type InstallCode, type SignInCode } from "./programs.ts";

/** A host's account as the page shows it, how its sign-in and installation are reached, and how one under way or failed stands. */
export interface HostAccess
{
    /** Signed in, out, or not known: a host that cannot tell without opening a chat, or one not looked at yet. */
    account: "in" | "out" | "unknown";
    /** Signed in with an API key: each answer is paid apart. */
    metered?: true;
    /** The sign-in starts from the page. */
    signIn?: "page";
    /** The host's own install page, and whether the engine installs it with a click. */
    install?: { page: string; engine?: true; };
    signingIn?: true;
    /** The sign-in's own link while it waits, for when the browser did not open by itself. */
    signInLink?: string;
    /**
     * Why the last sign-in failed, in English, with its code and the code's values beside it, for the page to say it in its language; with `elsewhere`, it
     * did not fail but goes on in another window of the engine.
     */
    signInWhy?: string;
    signInCode?: SignInCode;
    signInValues?: Record<string, string>;
    installing?: true;
    /** Why the last installation failed, with its code and values; with `elsewhere`, as for the sign-in. */
    installWhy?: string;
    installCode?: InstallCode;
    installValues?: Record<string, string>;
}

/**
 * The hosts' accounts, kept, and what the page asks of them. A program's status is asked once, at the first request of a page, then only when the page asks
 * again, as it shows the apps or the player comes back to its window, a sign-in or installation started here ends, or a chat ends signed out: never on a
 * timer, never while a chat of that host is open or its sign-in runs.
 */
export interface AccessKeeper
{
    /** How a host stands as last known, never waiting: looked at in the background the first time only. */
    access(host: HostId): HostAccess;
    /** How a host stands as last known, looking at nothing. */
    known(host: HostId): HostAccess;
    /** Looks again, in the background, at a host or every host that can tell: at most every fifteen seconds each, and not while its chat is open. */
    lookAgain(host?: HostId): void;
    /** Starts the player's sign-in to a host, once however often it is asked: why not, in the player's words, else undefined. */
    signIn(host: HostId): string | undefined;
    /** Stops a host's sign-in under way: why not, else undefined. */
    cancelSignIn(host: HostId): string | undefined;
    /** Installs a host in the engine's folder, once however often it is asked: why not, else undefined. */
    install(host: HostId): string | undefined;
    /** As signIn, cancelSignIn and install: why not as a refusal, the words with their code and values for the page to say in its language. */
    trySignIn(host: HostId): RefusalBody | undefined;
    tryCancelSignIn(host: HostId): RefusalBody | undefined;
    tryInstall(host: HostId): RefusalBody | undefined;
}

export interface AccessOptions
{
    helpers: Helpers;
    /** A host's account or what is under way changed: the pages read again. */
    changed(): void;
    /** Whether a chat of the host is open, or opening: its program's status is not asked meanwhile, as the chat tells by itself when the player is signed out. */
    busy?: (host: HostId) => boolean;
    /** A host's account changed, signed in or out, or installed: told before `changed`. */
    accountChanged?: (host: HostId) => void;
    /** Where each look is said, with its time, as it starts and as it ends: in, out or not known, nothing of what the program printed. */
    log?: (line: string) => void;
    now?: () => number;
}

// Each host's own install page.
const installPages: Record<HostId, string> = {
    claudeCode: "https://code.claude.com/docs/en/setup",
    codex: "https://learn.chatgpt.com/docs/codex/cli",
    antigravity: "https://antigravity.google/download",
    openCode: "https://opencode.ai/download",
};

// What the page reads where a host signs in elsewhere: with an account its own app asks for, or with none.
const ownSignIn: Partial<Record<HostId, RefusalBody>> = {
    antigravity: refusalWords("Antigravity signs in from its own app, not from here: open Antigravity, sign in with your Google account there, then look again.", "signin-in-app-account", {
        host: hosts.antigravity.name,
        account: "Google",
    }),
    openCode: refusalWords("OpenCode plays without signing in. To use an account of a provider, sign in from OpenCode itself, then look again.", "signin-not-needed", { host: hosts.openCode.name }),
};

// The least time between two looks at a program the page asks for: short, as a player who signed out or in outside the page comes back to it at once.
const askedEvery = 15_000;

// The host behind each program.
const helperHost = new Map(Object.entries(hostHelper).map(([host, name]) => [name, host as HostId]));

/**
 * A keeper that asks each program at most once at a time, and tells the pages only what changed. A look is the first, asked by the player, or after a
 * sign-in or installation ended, which waits for one under way and never for the minute.
 */
export function accessKeeper(options: AccessOptions): AccessKeeper
{
    const now = options.now ?? Date.now;
    const kept = new Map<HelperName, Kept>();

    const busy = (name: HelperName): boolean => {
        const host = helperHost.get(name);
        return host !== undefined && options.busy?.(host) === true;
    };

    const entry = (name: HelperName): Kept => {
        const found = kept.get(name) ?? { state: undefined, looking: false, attempt: 0 };
        kept.set(name, found);
        return found;
    };

    const log = (line: string): void => options.log?.(`${new Date(now()).toISOString()} ${line}`);

    // What the page sees changed: it reads again, and a change of the account is told first.
    const shown = (name: HelperName, change: (one: Kept) => void): void => {
        const one = entry(name);
        const before = shownOf(one);
        const state = one.state;
        change(one);
        const host = helperHost.get(name);

        // The first look tells no change: it finds how the account stood all along.
        if (host !== undefined && state !== undefined && state !== one.state) {
            options.accountChanged?.(host);
        }

        if (JSON.stringify(shownOf(one)) !== JSON.stringify(before)) {
            options.changed();
        }
    };

    const look = (name: HelperName, why: "first" | "asked" | "ended"): void => {
        const one = entry(name);

        // While its chat is open or its sign-in or installation runs, the last known stands: what ends them looks again.
        if (busy(name) || one.signingIn === true || one.installing === true) {
            return;
        }

        // A look after a sign-in ended, asked while one is under way, comes after it: the first may have asked too early.
        if (one.looking) {
            one.again ||= why === "ended";
            return;
        }

        if ((why === "first" && one.at !== undefined) || (why === "asked" && one.at !== undefined && now() - one.at < askedEvery)) {
            return;
        }

        one.looking = true;
        one.at = now();
        log(`${name} is asked how its account stands.`);

        // A status that said nothing, as one too slow, keeps what was known.
        const heard = (state: HelperState | undefined): void => {
            const account = state === undefined ? "not known" : state === "missing" ? "not installed" : state === "logged out" ? "out" : "in";
            log(`${name} said how its account stands: ${account}.`);
            shown(name, (them) => {
                them.looking = false;

                // The account changed: what another window had under way ended there, and is no longer said.
                if (state !== undefined && them.state !== undefined && state !== them.state) {
                    dropElsewhere(them);
                }

                them.state = state ?? them.state;
            });

            if (one.again === true) {
                one.again = false;
                look(name, "ended");
            }
        };

        // A look that throws at once fails as one that rejects, and keeps what was known.
        new Promise<HelperState>((resolve) => resolve(options.helpers.look(name))).then(heard, () => heard(undefined));
    };

    const signInEnded = (name: HelperName, attempt: number, login: HelperLogin): void => {
        if (login.state === "waiting" || entry(name).attempt !== attempt || entry(name).signingIn !== true) {
            return;
        }

        shown(name, (one) => {
            delete one.signingIn;
            delete one.signInLink;

            if (login.state === "failed") {
                one.signInFailed = { why: login.why, ...(login.code === undefined ? {} : { code: login.code }), ...(login.values === undefined ? {} : { values: login.values }) };
            }
        });
        look(name, "ended");
    };

    const linkGiven = (name: HelperName, attempt: number, link: string | undefined): void => {
        if (link !== undefined && entry(name).attempt === attempt && entry(name).signingIn === true) {
            shown(name, (one) => {
                one.signInLink = link;
            });
        }
    };

    // How a host stands as last known.
    const known = (host: HostId): HostAccess => {
        const name = hostHelper[host];
        return name === undefined
            ? { account: "unknown", install: { page: installPages[host] } }
            : { ...shownOf(entry(name)), signIn: "page", install: { page: installPages[host], engine: true } };
    };

    const trySignIn = (host: HostId): RefusalBody | undefined => {
        const name = hostHelper[host];
        const app = hosts[host].name;

        if (name === undefined) {
            return ownSignIn[host] ?? refusalWords(`${app} signs in from its own app, not from here: sign in there, then look again.`, "signin-in-app", { host: app });
        }

        const one = entry(name);

        if (one.state === "missing") {
            return refusalWords(`${app} is not on this computer: install it first, then sign in.`, "signin-not-installed", { host: app });
        }

        if (one.signingIn === true) {
            return undefined;
        }

        const attempt = ++one.attempt;
        shown(name, (them) => {
            them.signingIn = true;
            delete them.signInFailed;
        });
        const ended = (login: HelperLogin): void => signInEnded(name, attempt, login);
        // The first answer, while the player is in the browser, gives the link; how it ends comes later, or now where it ended already.
        const answered = (login: HelperLogin): void => (login.state === "waiting" ? linkGiven(name, attempt, login.link) : ended(login));
        options.helpers.login(name, ended).then(answered, (error: unknown) => ended({ state: "failed", why: error instanceof Error ? error.message : String(error) }));
        return undefined;
    };

    const tryCancelSignIn = (host: HostId): RefusalBody | undefined => {
        const name = hostHelper[host];
        const app = hosts[host].name;

        if (name === undefined) {
            return refusalWords(`${app} signs in from its own app: there is no sign-in here to cancel.`, "signin-none-to-cancel", { host: app });
        }

        if (entry(name).signingIn !== true) {
            return undefined;
        }

        entry(name).attempt++;
        options.helpers.cancel(name);
        shown(name, (one) => {
            delete one.signingIn;
            delete one.signInLink;
        });
        return undefined;
    };

    const tryInstall = (host: HostId): RefusalBody | undefined => {
        const name = hostHelper[host];
        const app = hosts[host].name;
        const page = installPages[host];

        if (name === undefined) {
            return refusalWords(`RPG Engine does not install ${app}: install it from ${page}, then look again.`, "install-from-page", { host: app, page });
        }

        if (entry(name).installing === true) {
            return undefined;
        }

        shown(name, (one) => {
            one.installing = true;
            delete one.installFailed;
        });

        const installed = (failed: HelperFailure | undefined): void => {
            shown(name, (one) => {
                delete one.installing;

                if (failed !== undefined) {
                    one.installFailed = failed;
                }
            });
            look(name, "ended");
        };

        // Why not with its code, where these helpers say it; else their words alone, as an error's are.
        const install = async (): Promise<HelperFailure | undefined> => {
            if (options.helpers.tryInstall !== undefined) {
                return options.helpers.tryInstall(name);
            }

            const why = await options.helpers.install(name);
            return why === undefined ? undefined : { why };
        };

        install().then(installed, (error: unknown) => installed({ why: error instanceof Error ? error.message : String(error) }));
        return undefined;
    };

    return {
        access: (host) => {
            const name = hostHelper[host];

            if (name !== undefined) {
                look(name, "first");
            }

            return known(host);
        },
        known,
        lookAgain: (host) => {
            const names = host === undefined ? Object.values(hostHelper) : [hostHelper[host]];
            names.forEach((name) => name !== undefined && look(name, "asked"));
        },
        signIn: (host) => trySignIn(host)?.error,
        cancelSignIn: (host) => tryCancelSignIn(host)?.error,
        install: (host) => tryInstall(host)?.error,
        trySignIn,
        tryCancelSignIn,
        tryInstall,
    };
}

/** What the keeper holds of a program: how it stood when last looked at; whether it is looked at now; the sign-in and installation under way or failed. */
interface Kept
{
    state: HelperState | undefined;
    /** When the last look began. */
    at?: number;
    looking: boolean;
    /** Another look was asked while this one was under way. */
    again?: boolean;
    /** Counts the sign-ins started, so that the end of one cancelled is not heard. */
    attempt: number;
    signingIn?: true;
    signInLink?: string;
    /** Why the last sign-in and the last installation failed, as whoever ran them told it. */
    signInFailed?: HelperFailure;
    installing?: true;
    installFailed?: HelperFailure;
}

// Another window of the engine has a sign-in or an installation under way: nothing failed, it goes on there.
const elsewhere = "elsewhere";

/** Forgets a sign-in's or an installation's why where it said another window had one under way. */
function dropElsewhere(one: Kept): void
{
    if (one.signInFailed?.code === elsewhere) {
        delete one.signInFailed;
    }

    if (one.installFailed?.code === elsewhere) {
        delete one.installFailed;
    }
}

/** A failure's code and values as the page gets them: those it came with; where it came with words alone, as an error's, `otherwise` with the words as `why`. */
function coded<Code extends string>(failed: HelperFailure, otherwise: Code): { code: Code; values?: Record<string, string>; }
{
    const values = failed.code === undefined ? { why: failed.why } : failed.values;
    return { code: (failed.code ?? otherwise) as Code, ...(values === undefined ? {} : { values }) };
}

/** What the page sees of a program: its account, from how it stood, and what is under way or failed. */
function shownOf(one: Kept): Omit<HostAccess, "signIn" | "install">
{
    const signIn = one.signInFailed === undefined ? undefined : coded<SignInCode>(one.signInFailed, "signin-failed");
    const install = one.installFailed === undefined ? undefined : coded<InstallCode>(one.installFailed, "app-install-failed");
    // The chat uses the player's login as it is: an API key signs in too, and is paid by the answer; a program missing tells nothing, as `found` says it.
    const account = one.state === "logged out" ? "out" : one.state === "ready" || one.state === "api key" ? "in" : "unknown";
    return {
        account,
        ...(one.state === "api key" ? { metered: true } : {}),
        ...(one.signingIn === true ? { signingIn: true } : {}),
        ...(one.signingIn === true && one.signInLink !== undefined ? { signInLink: one.signInLink } : {}),
        ...(signIn === undefined ? {} : { signInWhy: one.signInFailed?.why, signInCode: signIn.code, ...(signIn.values === undefined ? {} : { signInValues: signIn.values }) }),
        ...(one.installing === true ? { installing: true } : {}),
        ...(install === undefined ? {} : { installWhy: one.installFailed?.why, installCode: install.code, ...(install.values === undefined ? {} : { installValues: install.values }) }),
    };
}
