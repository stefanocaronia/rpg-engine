// The Packages section (D-475): what is added to the game, in three cards. The game system, only seen, as it is chosen in the setup, with the others of this
// computer for a new campaign; the packages the campaign uses, with those it lists and this computer lacks; those to add, from this computer and from npm, ours
// and, when the player asks, others', which are installed from the player's terminal until the page's yes cannot be forged. Each row opens on what it brings.
import { useEffect, useRef, useState } from "preact/hooks";
import { changePackage, type NpmPackage, type PackageAction, type PackagesView, readPackages } from "./api.ts";
import { CardHead } from "./card.tsx";
import { Icon, iconPath } from "./icons.tsx";
import { phraseLabel, systemTitleLabel } from "./labels.ts";
import { PageHead } from "./pages.tsx";
import { Confirm } from "./saves.tsx";
import { Command } from "./settings.tsx";
import { listText, t } from "./text.ts";

/** The scope of the packages RPG Engine publishes: one named by it, or by its name alone, is ours. */
const ourScope = "@rpgengine/";

/** A package as a row shows it: where it is, what it is, its versions and whether it is ours. */
interface Row
{
    package: string;
    name: string;
    where: "used" | "missing" | "here" | "npm" | "broken";
    title?: string;
    about?: string;
    version?: string;
    /** npm's newer version, when there is one. */
    newer?: string;
    author?: string;
    /** Whether it is published by RPG Engine; for one the campaign lists and this computer lacks, by its scope. */
    verified: boolean;
    broken?: string;
}

export function PackagesPage({ version }: { version: number; })
{
    const [view, setView] = useState<PackagesView>();
    const [npm, setNpm] = useState<{ asking: boolean; available?: NpmPackage[]; failed?: string; }>({ asking: true });
    const [problem, setProblem] = useState<string>();
    const [said, setSaid] = useState<{ problem: boolean; text: string; }>();
    const [sending, setSending] = useState<PackagesView["working"]>();
    const [others, setOthers] = useState(false);
    const [asking, setAsking] = useState<Row>();
    const reads = useRef(0);
    const npmReads = useRef(0);
    const saying = useRef<HTMLParagraphElement>(null);

    // Only the last reading counts, as after a change made here and the one the game sends.
    const read = (): void => {
        const reading = ++reads.current;
        void readPackages(false).then(
            (read) => {
                if (reading === reads.current) {
                    setView(read);
                    setProblem(undefined);
                }
            },
            (error: unknown) => setProblem(error instanceof Error ? error.message : String(error)),
        );
    };

    // What npm has, slower: the rows of this computer and the campaign do not wait for it.
    const askNpm = (): void => {
        const reading = ++npmReads.current;
        setNpm((before) => ({ ...before, asking: true }));
        void readPackages(true).then(
            (read) => reading === npmReads.current && setNpm({ asking: false, ...(read.available === undefined ? {} : { available: read.available }), ...(read.failed === undefined ? {} : { failed: read.failed }) }),
            (error: unknown) => reading === npmReads.current && setNpm({ asking: false, failed: error instanceof Error ? error.message : String(error) }),
        );
    };

    useEffect(read, [version]);
    useEffect(askNpm, []);

    // The row pressed may have gone to another card: what happened takes the focus, in view.
    useEffect(() => {
        if (said !== undefined) {
            saying.current?.focus({ preventScroll: true });
            saying.current?.scrollIntoView({ block: "nearest" });
        }
    }, [said]);

    const send = async (action: PackageAction, row: Row): Promise<void> => {
        setAsking(undefined);
        setSending({ name: row.package, action });
        const refused = await changePackage(action, row.package);
        setSending(undefined);
        setSaid(refused === undefined ? { problem: false, text: `✓ ${doneText(action, row.name)}` } : { problem: true, text: refused });
        read();
        askNpm();
    };

    const act = (action: PackageAction, row: Row): void => {
        if (action === "uninstall") {
            setAsking(row);
        } else {
            void send(action, row);
        }
    };

    const working = view?.working ?? sending;
    const rows = view === undefined ? undefined : packageRows(view, npm.available ?? []);
    const used = rows?.filter((row) => row.where === "used" || row.where === "missing") ?? [];
    const here = rows?.filter((row) => row.where === "here" || row.where === "broken") ?? [];
    const fromNpm = rows?.filter((row) => row.where === "npm") ?? [];
    const shownNpm = fromNpm.filter((row) => row.verified || others);
    const row = (one: Row) => <PackageRow key={one.package} row={one} working={isWorking(working, one) ? working : undefined} busy={working !== undefined} onAct={act} />;
    return (
        <section class="page-stack packages" aria-labelledby="packages-title">
            <PageHead section="packages" id="packages-title" />
            <p class="packages-lead">{t("What is added to the game. The master hears of each change at their next move.")}</p>
            {problem !== undefined && <p class="saves-said problem" role="alert">{problem}</p>}
            {said !== undefined && <p ref={saying} tabIndex={-1} class={said.problem ? "saves-said problem" : "saves-said"} role="status">{said.text}</p>}
            {view?.system && (
                <section class="package-card" aria-labelledby="packages-system">
                    <CardHead icon={iconPath("dice")} title={<h3 id="packages-system">{t("Game system")}</h3>} />
                    <div class="package-body">
                        <div class="package-system">
                            <span class="package-tile" aria-hidden="true">
                                <Icon name="dice" />
                            </span>
                            <span class="package-text">
                                <span class="package-name">
                                    <span class="system-chip">{view.system.name}</span>
                                </span>
                                <span class="package-about">{systemTitleLabel(view.system.title)}</span>
                            </span>
                            <span class="package-lock">
                                <Icon name="lock" />
                                {t("Chosen in the setup")}
                            </span>
                        </div>
                        {view.otherSystems !== undefined && view.otherSystems.length > 0 && (
                            <p class="package-note">{t("Also on this computer, for a new campaign: {systems}.", { systems: listText(view.otherSystems.map((system) => system.name)) })}</p>
                        )}
                    </div>
                </section>
            )}
            {rows !== undefined && (
                <section class="package-card" aria-labelledby="packages-used">
                    <CardHead icon={iconPath("packages")} title={<h3 id="packages-used">{t("In this campaign")}</h3>} {...(used.length === 0 ? {} : { note: String(used.length) })} />
                    <div class="package-body">
                        {used.length === 0 ? <p class="package-note">{t("No package: the campaign is played with its system alone.")}</p> : <ul class="package-list">{used.map(row)}</ul>}
                    </div>
                </section>
            )}
            {rows !== undefined && (
                <section class="package-card" aria-labelledby="packages-to-add">
                    <CardHead icon={iconPath("plus")} title={<h3 id="packages-to-add">{t("To add")}</h3>} />
                    <div class="package-body">
                        {here.length > 0 && (
                            <>
                                <h4 class="package-sub">{t("On this computer")}</h4>
                                <ul class="package-list">{here.map(row)}</ul>
                            </>
                        )}
                        <div class="package-sub-line">
                            <h4 class="package-sub">{t("On npm")}</h4>
                            {fromNpm.some((one) => !one.verified) && (
                                <label class="package-others">
                                    <input type="checkbox" role="switch" checked={others} onChange={(event) => setOthers(event.currentTarget.checked)} />
                                    {t("Others' too")}
                                </label>
                            )}
                        </div>
                        {npm.failed !== undefined
                            ? (
                                <div class="package-offline" role="status">
                                    <Icon name="offline" />
                                    <div>
                                        <p>
                                            <strong>{t("npm does not answer.")}</strong> {t("The packages already on this computer can be added all the same.")}
                                        </p>
                                        <p class="package-why">{npm.failed}</p>
                                        <button type="button" class="save-button package-button" disabled={npm.asking} onClick={askNpm}>
                                            <Icon name="update" />
                                            {t("Try again")}
                                        </button>
                                    </div>
                                </div>
                            )
                            : npm.asking && npm.available === undefined
                            ? <p class="package-note" role="status">{t("Asking npm…")}</p>
                            : shownNpm.length === 0
                            ? <p class="package-note">{others || fromNpm.length === 0 ? t("Nothing more to add from npm.") : t("Nothing more of ours to add from npm.")}</p>
                            : <ul class="package-list">{shownNpm.map(row)}</ul>}
                    </div>
                </section>
            )}
            {asking !== undefined && (
                <Confirm title={t("Uninstall {name} from this computer?", { name: asking.name })} onClose={() => setAsking(undefined)}>
                    <p>{t("It goes off this computer, and out of this campaign. Another campaign that uses it asks to install it again.")}</p>
                    <p class="confirm-note">{t("What it wrote in the campaign stays, and comes back if you install it again.")}</p>
                    <div class="confirm-buttons">
                        <button type="button" class="save-button" autoFocus onClick={() => setAsking(undefined)}>{t("Cancel")}</button>
                        <button type="button" class="save-button danger final" disabled={working !== undefined} onClick={() => void send("uninstall", asking)}>{t("Uninstall")}</button>
                    </div>
                </Confirm>
            )}
        </section>
    );
}

/**
 * One package: its tile, then the button that opens it, with its name, whether it is ours, what it is and its version; the action it asks for; for one of
 * someone else's, the command to install it from the terminal; while npm works on it, what it is doing; open, what it brings and what else can be done.
 */
function PackageRow({ row, working, busy, onAct }: { row: Row; working?: { action: PackageAction; }; busy: boolean; onAct(action: PackageAction, row: Row): void; })
{
    const [open, setOpen] = useState(false);
    const id = `package-${row.package.replace(/[^a-z0-9]+/gi, "-")}`;
    const action = rowAction(row);
    const terminal = !row.verified && row.where !== "used" && row.where !== "broken";
    const button = (kind: PackageAction, label: string, extra = "") => <button type="button" class={`save-button package-button ${extra}`.trim()} disabled={busy} onClick={() => onAct(kind, row)}>{label}</button>;
    return (
        <li class={open ? "package-row open" : "package-row"}>
            <span class="package-tile" aria-hidden="true">
                <Icon name={row.where === "broken" ? "alert" : "packages"} />
            </span>
            {/* Named by the package and whether it is ours; what it is and its version describe it. */}
            <button
                type="button"
                class="package-what"
                aria-expanded={open}
                aria-controls={id}
                aria-labelledby={`${id}-name ${id}-trust`}
                aria-describedby={row.title === undefined ? `${id}-meta` : `${id}-title ${id}-meta`}
                onClick={() => setOpen(!open)}
            >
                <span class="package-text">
                    <span class="package-name">
                        <span class="package-title" id={`${id}-name`}>{row.name}</span>
                        <span class={row.verified ? "package-trust" : "package-trust risky"} id={`${id}-trust`}>
                            <Icon name={row.verified ? "verified" : "unverified"} />
                            {row.verified ? t("Verified") : t("Not verified")}
                        </span>
                    </span>
                    {row.title !== undefined && <span class="package-about" id={`${id}-title`}>{row.title}</span>}
                    <span class={row.where === "missing" || row.where === "broken" ? "package-meta missing" : "package-meta"} id={`${id}-meta`}>{metaText(row)}</span>
                </span>
                <Icon name="fold" />
            </button>
            {action !== undefined && working === undefined && (
                <span class="package-actions">
                    <button
                        type="button"
                        class={action.kind === "add" && row.where === "missing" ? "save-button gold package-button" : "save-button package-button"}
                        aria-label={action.label}
                        disabled={busy}
                        onClick={() => onAct(action.kind, row)}
                    >
                        <Icon name={action.icon} />
                        {action.word}
                    </button>
                </span>
            )}
            {terminal && working === undefined && (
                <div class="package-terminal">
                    <span>
                        <Icon name="terminal" />
                        {t("From your terminal, in the campaign's folder:")}
                    </span>
                    <Command text={`rpg package install ${row.package}`} />
                </div>
            )}
            {working !== undefined && (
                <div class="package-progress" role="status">
                    <span class="package-bar" aria-hidden="true" />
                    <span>
                        <strong>{workingText(working.action)}</strong> {t("You can go to another page: it goes on by itself.")}
                    </span>
                </div>
            )}
            {open && (
                <div class="package-more" id={id}>
                    {row.about !== undefined && <p>{`${phraseLabel(row.about.replace(/\.$/, ""))}.`}</p>}
                    {row.broken !== undefined && <p class="package-why">{row.broken}</p>}
                    <dl class="package-facts">
                        <dt>{t("Package")}</dt>
                        <dd>
                            <code>{row.package}</code>
                        </dd>
                        {row.version !== undefined && (
                            <>
                                <dt>{t("Version")}</dt>
                                <dd>{row.newer === undefined ? row.version : t("{version}, on npm {newer}", { version: row.version, newer: row.newer })}</dd>
                            </>
                        )}
                        {row.author !== undefined && (
                            <>
                                <dt>{t("Author")}</dt>
                                <dd>{row.author}</dd>
                            </>
                        )}
                        <dt>{t("Origin")}</dt>
                        <dd>{row.verified ? t("Published by RPG Engine.") : t("Not published by RPG Engine: someone else's, at your own risk.")}</dd>
                    </dl>
                    {(row.where === "here" || row.where === "npm") && row.verified && <p class="package-when">{t("It can be added in the middle of play too: it counts from now on.")}</p>}
                    {working === undefined && row.where !== "npm" && (
                        <div class="package-more-actions">
                            {(row.where === "used" || row.where === "missing") && button("remove", t("Take out of the campaign"))}
                            {row.where !== "missing" && button("uninstall", t("Uninstall from this computer…"), "danger")}
                        </div>
                    )}
                </div>
            )}
        </li>
    );
}

/** The rows of each card, from what the server read and what npm has: npm's own only for those not on this computer nor listed by the campaign. */
function packageRows(view: PackagesView, available: NpmPackage[]): Row[]
{
    const onNpm = new Map(available.map((one) => [one.package, one]));
    const installed = view.installed.map((one): Row => {
        if ("broken" in one) {
            return { package: one.package, name: phraseLabel(one.name), where: "broken", verified: one.package.startsWith(ourScope), broken: one.broken };
        }

        const newer = onNpm.get(one.package);
        return {
            package: one.package,
            name: phraseLabel(one.name),
            where: one.used ? "used" : "here",
            title: phraseLabel(one.title),
            about: one.about,
            version: one.version,
            ...(newer?.update === true && one.verified ? { newer: newer.version } : {}),
            verified: one.verified,
        };
    });
    const missing = view.missing.map((name): Row => ({ package: name, name: phraseLabel(name.replace(/^@[^/]+\//, "")), where: "missing", verified: name.startsWith(ourScope) }));
    const known = new Set([...installed, ...missing].map((one) => one.package));
    const npm = available.filter((one) => !known.has(one.package) && one.installed === undefined).map((one): Row => ({
        package: one.package,
        name: phraseLabel(one.name),
        where: "npm",
        ...(one.description === undefined ? {} : { title: phraseLabel(one.description) }),
        version: one.version,
        ...(one.author === undefined ? {} : { author: one.author }),
        verified: one.verified,
    }));
    return [...installed, ...missing, ...npm];
}

/** The action a row asks for, ours only: an update, installing what the campaign lacks, adding, installing again what does not read. */
function rowAction(row: Row): { kind: PackageAction; word: string; label: string; icon: "update" | "download" | "plus"; } | undefined
{
    if (!row.verified) {
        return undefined;
    }

    if (row.where === "used" && row.newer !== undefined) {
        return { kind: "update", word: t("Update"), label: t("Update {name} to {version}", { name: row.name, version: row.newer }), icon: "update" };
    }

    if (row.where === "missing") {
        return { kind: "add", word: t("Install"), label: t("Install {name}", { name: row.name }), icon: "download" };
    }

    if (row.where === "here" || row.where === "npm") {
        return { kind: "add", word: t("Add"), label: t("Add {name}", { name: row.name }), icon: row.where === "npm" ? "download" : "plus" };
    }

    return row.where === "broken" ? { kind: "update", word: t("Install it again"), label: t("Install {name} again", { name: row.name }), icon: "download" } : undefined;
}

/** The row's small line: the version, with npm's newer one; or what is wrong. */
function metaText(row: Row): string
{
    if (row.where === "missing") {
        return t("Missing on this computer: the master does not use it until you install it.");
    }

    if (row.where === "broken") {
        return t("It does not read: install it again.");
    }

    const version = row.newer === undefined ? row.version ?? "" : `${row.version ?? ""} → ${row.newer}`;
    return row.author === undefined ? version : `${version} · ${row.author}`;
}

/** Whether npm works on this row's package, as the page or the server says. */
function isWorking(working: PackagesView["working"], row: Row): boolean
{
    return working !== undefined && (working.name === row.package || `${ourScope}${working.name}` === row.package);
}

/** What npm is doing, in words. */
function workingText(action: PackageAction): string
{
    const texts: Record<PackageAction, string> = {
        add: t("Installing from npm…"),
        update: t("Updating from npm…"),
        remove: t("Taking it out of the campaign…"),
        uninstall: t("Uninstalling…"),
    };
    return texts[action];
}

/** What a change did, once done. */
function doneText(action: PackageAction, name: string): string
{
    const texts: Record<PackageAction, string> = {
        add: t("{name} is in the campaign: it counts from now on.", { name }),
        update: t("{name} is updated.", { name }),
        remove: t("{name} is out of the campaign: it stays on this computer.", { name }),
        uninstall: t("{name} is off this computer.", { name }),
    };
    return texts[action];
}
