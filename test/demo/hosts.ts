// The AI apps of the demo's chat and launcher (T-290), kept in memory, with how each stands and what the page asks of them, as a table and the launcher
// answer (src/helpers/access.ts): the engine installs and signs in to Claude Code and Codex, the other two install from their own site and sign in by
// themselves, their account never known. An install takes a few seconds, and Codex's first fails; a sign-in waits for the browser a few seconds, its link
// coming a moment after it starts, and Codex's first does not finish. OpenCode, as the hosts that speak ACP, says the efforts of a model only once it is
// chosen. The states to look at, by --hosts:
//   ready  (the default) Claude Code ready, Codex to set up, Antigravity to install from its site, OpenCode ready with a long list of models
//   none   nothing installed: the engine installs Claude Code and Codex; Antigravity and OpenCode from their sites
//   out    Claude Code and Codex to set up in the browser, Antigravity ready, OpenCode to install from its site
//   key    as ready, but Claude Code signed in with an API key, each answer paid apart
//   busy   as none, but Claude Code's first install and first sign-in say they are under way from another window of RPG Engine, with the table's code
//          `elsewhere`; looking at the apps again a moment later finds that window's install or sign-in done
// Not part of the tests.

/** The states the demo's apps start in. */
export type DemoHostsState = "ready" | "none" | "out" | "key" | "busy";

/** The state a word asks for, as --hosts gives it: ready for any other. */
export function hostsState(word: string | undefined): DemoHostsState
{
    return word === "none" || word === "out" || word === "key" || word === "busy" ? word : "ready";
}

// Why a first try fails where another window of RPG Engine does the same, as the table says it.
const elsewhere = {
    install: "it is already being installed from another window of RPG Engine: wait for it to finish there, then look again.",
    signIn: "a sign-in is already under way from another window of RPG Engine: finish it there, then look again.",
};

/** An app as the page reads it. */
export interface DemoHost
{
    id: string;
    name: string;
    ready: boolean;
    found: boolean;
    model: string;
    efforts: string[];
    models: { id: string; name: string; about?: string; efforts: string[]; advised?: true; metered?: true; group?: string; }[];
    account?: "in" | "out" | "unknown";
    metered?: true;
    signIn?: "page";
    signingIn?: true;
    signInWhy?: string;
    signInCode?: "elsewhere";
    signInLink?: string;
    install?: { page: string; engine?: true; };
    installing?: true;
    installWhy?: string;
    installCode?: "elsewhere";
}

/** What the page asks of an app. */
export type DemoHostWish = { signIn: { host: string; cancel?: boolean; }; } | { install: { host: string; }; } | { hosts: true; };

/** The demo's apps, which tell whoever listens when they change. */
export interface DemoHosts
{
    list(): DemoHost[];
    find(id: string): DemoHost | undefined;
    /** Does what the page asks of an app; why not, in the table's words, where it cannot. */
    wish(wish: DemoHostWish): string | undefined;
    /** Adds what is told when they change. */
    onChange(listener: () => void): void;
}

export const efforts = ["low", "medium", "high", "xhigh", "max"];

// The models the demo's Claude Code offers, as the host lists them.
export const demoModels = [
    { id: "opus", name: "Opus 5.5", about: "For complex work and everyday tasks", efforts, advised: true as const },
    { id: "claude-fable-5-2", name: "Fable 5.2", about: "For your toughest challenges", efforts },
    { id: "sonnet", name: "Sonnet 5.5", about: "Most efficient for simpler tasks", efforts },
    { id: "claude-haiku-4-5-20251001", name: "Haiku 4.5", about: "Fastest for quick answers", efforts: [] },
];

// OpenCode's long list, two hundred models: its own free ones, then those of providers, paid apart for each answer; the efforts of none known until
// it is chosen.
const openCodeModels: DemoHost["models"] = [
    ...["Big Pickle", "Grok Code Fast", "Qwen3 Coder", "Kimi K2", "Beam Free", "DeepSeek V4.1 Flash Free", "Flint 40B Free", "Hy4 Flash Free", "Tidepool Alpha Free", "Nova Mini Free", "Larch Free", "Pebble 12B Free", "Mica Free"]
        .map((name) => ({ id: `opencode/${slug(name)}`, name, efforts: [], group: "OpenCode Zen" })),
    { id: "anthropic/claude-opus-5-5", name: "Claude Opus 5.5", about: "Anthropic's most capable model", efforts: [], advised: true, metered: true, group: "Anthropic" },
    ...["Claude Sonnet 5.5", "Claude Haiku 4.5", "Claude Fable 5.2"].map((name) => ({ id: `anthropic/${slug(name)}`, name, efforts: [], metered: true as const, group: "Anthropic" })),
    ...["GPT-5.5", "GPT-5.5 mini", "GPT-5.5 nano", "o5", "o5 mini", "GPT-4.1", "GPT-4.1 mini", "GPT-4o", "GPT-4o mini", "o3", "o4 mini"].map((name) => ({
        id: `openai/${slug(name)}`,
        name,
        efforts: [],
        metered: true as const,
        group: "OpenAI",
    })),
    ...["Gemini 3 Pro", "Gemini 3 Flash", "Gemini 2.5 Pro", "Gemini 2.5 Flash"].map((name) => ({ id: `google/${slug(name)}`, name, efforts: [], metered: true as const, group: "Google" })),
    ...paidModels("DeepSeek", ["DeepSeek V4 Pro", "DeepSeek V4.1 Flash", "DeepSeek V4 Reasoner", "DeepSeek V3.5", "DeepSeek Coder 3"]),
    ...paidModels("Mistral", ["Mistral Large 3", "Mistral Medium 4", "Mistral Small 4", "Codestral 3", "Devstral 2", "Pixtral Large 2", "Ministral 8B", "Magistral Medium"]),
    ...paidModels("xAI", ["Grok 5", "Grok 5 Fast", "Grok Code Fast 2", "Grok 4.5", "Grok 4.5 Mini"]),
    ...paidModels("Groq", madeNames(12, 0)),
    ...paidModels("Together", madeNames(28, 5)),
    ...paidModels("Fireworks", madeNames(24, 9)),
    ...paidModels("OpenRouter", madeNames(86, 2)),
];

/** A provider's models, each paid apart. */
function paidModels(group: string, names: string[]): DemoHost["models"]
{
    return names.map((name) => ({ id: `${group.toLowerCase()}/${slug(name)}`, name, efforts: [], metered: true as const, group }));
}

/** So many names of models, made of a family and a kind, each once. */
function madeNames(count: number, from: number): string[]
{
    const families = [
        "Llama 5 70B",
        "Qwen3 Coder 32B",
        "DeepSeek V4",
        "Gemma 4 27B",
        "Mistral Large 3",
        "Kimi K2",
        "GLM 5",
        "Hermes 5",
        "Phi 5",
        "Command R3",
        "Nemotron 2",
        "Granite 4",
        "Yi Lightning",
        "MiniMax M3",
        "Sonar Pro",
        "WizardLM 3",
    ];
    const kinds = ["", " Turbo", " Instruct", " Fast", " Mini", " Thinking", " Preview"];
    return Array.from({ length: count }, (_, index) => families[(index + from) % families.length] + kinds[Math.floor((index + from) / families.length) % kinds.length]);
}

// The efforts OpenCode says of a model once it is chosen, none for the others.
const openCodeEfforts: Record<string, string[]> = {
    "anthropic/claude-opus-5-5": ["low", "high", "max"],
    "openai/gpt-5.5": ["minimal", "low", "medium", "high"],
};

// How long an install and a sign-in take in the demo, and the sign-in's link after it starts.
const installTime = 2500;
const signInTime = 4000;
const linkTime = 800;
// How long looking at the apps again takes.
const lookTime = 700;

// Where the hosts that sign in by themselves are told to, as the table says it.
const ownSignIn: Record<string, string> = {
    antigravity: "Antigravity signs in from its own app, not from here: open Antigravity, sign in with your Google account there, then look again.",
    openCode: "OpenCode plays without signing in. To use an account of a provider, sign in from OpenCode itself, then look again.",
};

/** The efforts an app says of a model only once it is chosen, as OpenCode; none where its list says them. */
export function effortsOnceChosen(host: string, model: string): string[] | undefined
{
    return host === "openCode" ? openCodeEfforts[model] ?? [] : host === "antigravity" ? [] : undefined;
}

/** The demo's apps, as they start in `state`. */
export function demoHosts(state: DemoHostsState = "ready"): DemoHosts
{
    const hosts = startingHosts(state);
    const tries = new Map<string, number>();
    const listeners = new Set<() => void>();
    const changed = (): void => listeners.forEach((listener) => listener());

    const later = (time: number, does: () => void): void => {
        setTimeout(() => {
            does();
            changed();
        }, time);
    };

    // Each app's first try of a kind, where Codex's fails, and Claude Code's where another window does the same.
    const firstTry = (kind: string, id: string): boolean => {
        const key = `${kind}:${id}`;
        tries.set(key, (tries.get(key) ?? 0) + 1);
        return tries.get(key) === 1 && (id === "codex" || (state === "busy" && id === "claudeCode"));
    };

    const install = (host: DemoHost): string | undefined => {
        if (host.install?.engine !== true) {
            return `RPG Engine does not install ${host.name}: install it from ${host.install?.page ?? "its site"}, then look again.`;
        }

        if (host.found) {
            return `${host.name} is on this computer already: choose it, and open the chat.`;
        }

        if (host.installing === true) {
            return undefined;
        }

        delete host.installWhy;
        delete host.installCode;
        host.installing = true;
        later(installTime, () => {
            delete host.installing;

            if (firstTry("install", host.id)) {
                Object.assign(host, host.id === "codex" ? { installWhy: "npm could not reach the registry (ETIMEDOUT): check the connection, then try again." } : { installWhy: elsewhere.install, installCode: "elsewhere" });
            } else {
                Object.assign(host, { found: true, account: "out" });
            }
        });
        return undefined;
    };

    const signIn = (host: DemoHost, cancel: boolean): string | undefined => {
        if (host.signIn === undefined) {
            return cancel ? `${host.name} signs in from its own app: there is no sign-in here to cancel.` : ownSignIn[host.id];
        }

        if (cancel) {
            delete host.signingIn;
            delete host.signInLink;
            return undefined;
        }

        if (!host.found) {
            return `${host.name} is not on this computer: install it first, then sign in.`;
        }

        if (host.signingIn === true) {
            return undefined;
        }

        delete host.signInWhy;
        delete host.signInCode;
        host.signingIn = true;
        // The link comes with the app's first answer, while the player is in the browser.
        later(linkTime, () => {
            if (host.signingIn === true) {
                host.signInLink = `https://example.org/sign-in/${host.id}`;
            }
        });
        later(signInTime, () => {
            if (host.signingIn !== true) {
                return;
            }

            delete host.signingIn;
            delete host.signInLink;

            if (firstTry("signIn", host.id)) {
                Object.assign(host, host.id === "codex" ? { signInWhy: "the browser was closed before the sign-in ended." } : { signInWhy: elsewhere.signIn, signInCode: "elsewhere" });
            } else {
                signedIn(host);
            }
        });
        return undefined;
    };

    // Looking again finds done, a moment later, what another window had under way, as the table forgets its why once the account changed.
    const lookAgain = (): void => {
        later(lookTime, () => {
            hosts.forEach((host) => {
                if (host.installCode === "elsewhere") {
                    Object.assign(host, { found: true, account: "out" });
                    delete host.installWhy;
                    delete host.installCode;
                } else if (host.signInCode === "elsewhere") {
                    signedIn(host);
                    delete host.signInWhy;
                    delete host.signInCode;
                }
            });
        });
    };

    return {
        list: () => hosts.map((host) => structuredClone(host)),
        find: (id) => hosts.find((host) => host.id === id),
        onChange: (listener) => void listeners.add(listener),
        wish: (wish) => {
            if ("hosts" in wish) {
                lookAgain();
                return undefined;
            }

            const id = "install" in wish ? wish.install.host : wish.signIn.host;
            const host = hosts.find((one) => one.id === id);

            if (host === undefined) {
                return `No app ${id} here.`;
            }

            const refused = "install" in wish ? install(host) : signIn(host, wish.signIn.cancel === true);
            changed();
            return refused;
        },
    };
}

/** An app signed in to, which lists its models. */
function signedIn(host: DemoHost): void
{
    const models = host.id === "codex" ? codexModels() : host.id === "claudeCode" ? demoModels : host.models;
    Object.assign(host, { account: "in", models, model: host.id === "codex" ? "gpt-5.5" : host.model });
}

/** The apps as the demo starts them. */
function startingHosts(state: DemoHostsState): DemoHost[]
{
    const claude: DemoHost = {
        id: "claudeCode",
        name: "Claude Code",
        ready: true,
        found: true,
        model: "sonnet",
        efforts,
        models: demoModels,
        account: "in",
        signIn: "page",
        install: { page: "https://code.claude.com/docs/en/setup", engine: true },
    };
    const codex: DemoHost = {
        id: "codex",
        name: "Codex",
        ready: true,
        found: true,
        model: "",
        efforts: efforts.slice(0, 4),
        models: [],
        account: "out",
        signIn: "page",
        install: { page: "https://learn.chatgpt.com/docs/codex/cli", engine: true },
    };
    const antigravity: DemoHost = {
        id: "antigravity",
        name: "Antigravity",
        ready: true,
        found: false,
        model: "",
        efforts: [],
        models: [],
        account: "unknown",
        install: { page: "https://antigravity.google/download" },
    };
    const openCode: DemoHost = {
        id: "openCode",
        name: "OpenCode",
        ready: true,
        found: true,
        model: "opencode/big-pickle",
        efforts: [],
        models: openCodeModels,
        account: "unknown",
        install: { page: "https://opencode.ai/download" },
    };

    if (state === "none" || state === "busy") {
        return [{ ...claude, found: false, models: [] }, { ...codex, found: false }, antigravity, { ...openCode, found: false, models: [] }];
    }

    if (state === "out") {
        return [{ ...claude, account: "out", models: [] }, codex, { ...antigravity, found: true, model: "gemini-3-pro", models: antigravityModels() }, { ...openCode, found: false, models: [] }];
    }

    return [state === "key" ? { ...claude, metered: true } : claude, codex, antigravity, openCode];
}

// Antigravity's models, the efforts of each known only once it is chosen; here none takes any.
function antigravityModels(): DemoHost["models"]
{
    return [
        { id: "gemini-3-pro", name: "Gemini 3 Pro", efforts: [], advised: true },
        { id: "gemini-3-flash", name: "Gemini 3 Flash", efforts: [] },
        { id: "claude-sonnet-5-5", name: "Claude Sonnet 5.5", efforts: [] },
    ];
}

function codexModels(): DemoHost["models"]
{
    // Ten models, as Codex lists them: more than the list shows whole, so it has its search.
    const levels = [...efforts, "ultra"];
    return [
        { id: "gpt-5.5", name: "GPT-5.5", about: "Latest frontier agentic coding model.", efforts: levels, advised: true },
        { id: "gpt-5.5-mini", name: "GPT-5.5 mini", about: "Smaller and faster.", efforts: efforts.slice(0, 3) },
        ...["GPT-6.2-Sol", "GPT-6.2-Astra", "GPT-6.1 Terra", "GPT-6.1-Sol", "GPT-6-Astra", "GPT-6-Sol", "GPT-6-Luna", "GPT-5.6-Sol"].map((name) => ({ id: slug(name), name, efforts: levels })),
    ];
}

function slug(name: string): string
{
    return name.toLowerCase().replaceAll(/[^a-z0-9.]+/g, "-");
}
