// The launcher's page (D-582): the campaigns of this computer on one side, a click or Enter opens one; on the other the robot, the product and what starts
// a campaign: a new one, or a folder that holds one. Small and centred in its window, as a chooser. A campaign opens in a window of its own, which the
// launcher opens, and this one closes; where the launcher could open none, this window goes to its page, which sizes it. The launcher's own words are the
// browser's language, where the page ships it.
import { useEffect, useRef, useState } from "preact/hooks";
import { Confirm } from "../parts/confirm.tsx";
import { Master } from "../shell/master.tsx";
import { productName } from "../shell/product.ts";
import { ThemeCorner } from "../shell/theme-switch.tsx";
import { markedAddress } from "../shell/window.ts";
import { t } from "../text.ts";
import { addCampaign, type CampaignWish, createCampaign, forgetCampaign, type LauncherNow, type ListedCampaign, openCampaign, pickFolder, readLauncher } from "./api.ts";
import { folderName, listedAt } from "./campaigns.ts";
import { NewCampaignForm } from "./create.tsx";
import { CampaignList } from "./list.tsx";

/** What the page is doing: a campaign being opened, by its folder, or one being made or added; with the words that say so. */
interface Doing
{
    what: "opening" | "creating" | "adding";
    root?: string;
    words: string;
}

// How long a window that asked to close itself waits before it takes it that the browser keeps it open.
const closeWait = 300;

/** The launcher's page; `asked` is the campaign its address asked to open at once, by its folder. */
export function Launcher({ asked }: { asked?: string | undefined; })
{
    const [launcher, setLauncher] = useState<LauncherNow>();
    // The launcher does not answer: said in place of the list.
    const [away, setAway] = useState<string>();
    const [view, setView] = useState<"list" | "new">("list");
    const [doing, setDoing] = useState<Doing>();
    // What went wrong: with a campaign of the list, by its folder; else with what the page was asked beside it.
    const [problem, setProblem] = useState<{ root?: string; text: string; }>();
    const [removing, setRemoving] = useState<ListedCampaign>();
    // What a screen reader is told, once, as something starts.
    const [told, setTold] = useState("");
    const reads = useRef(0);
    const askedOnce = useRef(asked);
    const heading = useRef<HTMLHeadingElement>(null);
    const creates = useRef<HTMLButtonElement>(null);
    const viewed = useRef(view);

    const read = (): void => {
        const reading = ++reads.current;
        void readLauncher().then((now) => {
            if (reading === reads.current) {
                setLauncher(now);
                setAway(undefined);
            }
        }, (error: unknown) => reading === reads.current && setAway(error instanceof Error ? error.message : String(error)));
    };

    useEffect(() => {
        const events = new EventSource("/events");
        events.addEventListener("changed", read);
        events.onopen = read;
        read();

        // The player came back with the browser's Back from a campaign's page: nothing is being opened any more, and the list may have changed.
        const back = (event: PageTransitionEvent): void => {
            if (event.persisted) {
                setDoing(undefined);
                read();
            }
        };

        window.addEventListener("pageshow", back);

        return () => {
            events.close();
            window.removeEventListener("pageshow", back);
        };
    }, []);

    useEffect(() => {
        document.title = productName;
    }, []);

    // Back from the form, the focus goes to what opened it.
    useEffect(() => {
        if (viewed.current === "new" && view === "list") {
            creates.current?.focus();
        }

        viewed.current = view;
    }, [view]);

    const start = (next: Doing): void => {
        setProblem(undefined);
        setDoing(next);
        setTold(next.words);
    };

    /**
     * Leaves for a campaign's page: this window closes where the launcher opened that page in a window of its own, and stays, the list read again, where the
     * browser keeps it open; else it goes there, sized as a campaign's unless the window was the campaign's already, as when it is opened again.
     */
    const leave = (opened: { url: string; window?: boolean; }, sized: boolean): void => {
        if (opened.window !== true) {
            // The page leaves: the row waits until it has.
            window.location.assign(sized ? markedAddress(opened.url) : opened.url);
            return;
        }

        window.close();
        window.setTimeout(() => {
            setDoing(undefined);
            setView("list");
            read();
        }, closeWait);
    };

    /** Opens a campaign, then leaves for its page. */
    const open = async (root: string, name: string, sized = true): Promise<void> => {
        start({ what: "opening", root, words: t("Opening {name}: it can take a few seconds…", { name }) });
        const opened = await openCampaign(root);

        if ("url" in opened) {
            leave(opened, sized);
        } else {
            setDoing(undefined);
            setProblem({ root, text: opened.error });
        }
    };

    // The campaign the address asked for, once, and only one of the list: a page that lost its table sends its window here to have it opened again. Any
    // other folder is left to the player, who sees the list.
    useEffect(() => {
        const root = askedOnce.current;

        if (root !== undefined && launcher !== undefined) {
            askedOnce.current = undefined;
            const campaign = listedAt(launcher.campaigns, root);

            if (campaign !== undefined) {
                void open(campaign.root, campaign.name, false);
            }
        }
    }, [launcher !== undefined]);

    /** A folder the player chooses in the system's window, titled with `words`; none when they chose none, or it could not be asked, which is said. */
    const pick = async (words: string): Promise<string | undefined> => {
        const picked = await pickFolder(words, launcher?.folder);

        if ("error" in picked) {
            setProblem({ text: picked.error });
        }

        return "folder" in picked ? picked.folder : undefined;
    };

    /** A folder that holds a campaign: chosen, listed, then opened. */
    const openFolder = async (): Promise<void> => {
        start({ what: "adding", words: "" });
        const folder = await pick(t("Open a folder…"));
        const added = folder === undefined ? undefined : await addCampaign(folder);

        if (folder === undefined || added === undefined) {
            setDoing(undefined);
        } else if ("error" in added) {
            setDoing(undefined);
            setProblem({ text: added.error });
        } else {
            setLauncher((before) => (before === undefined ? before : { ...before, campaigns: added.campaigns }));
            const listed = added.campaigns.find((campaign) => campaign.root === folder);
            await open(listed?.root ?? folder, listed?.name ?? folderName(folder));
        }
    };

    const create = async (wish: CampaignWish): Promise<void> => {
        start({ what: "creating", words: t("Creating {name}: it can take a few seconds…", { name: wish.name }) });
        const made = await createCampaign(wish);

        if ("url" in made) {
            leave(made, true);
            return;
        }

        setDoing(undefined);
        setProblem({ ...(made.root === undefined ? {} : { root: made.root }), text: made.error });

        // Made, but its page did not open: it is in the list now, where what went wrong is said under it.
        if (made.root !== undefined) {
            read();
            setView("list");
        }
    };

    const forget = async (campaign: ListedCampaign): Promise<void> => {
        const left = await forgetCampaign(campaign.root);
        setRemoving(undefined);

        if ("error" in left) {
            setProblem({ root: campaign.root, text: left.error });
        } else {
            setProblem(undefined);
            setLauncher((before) => (before === undefined ? before : { ...before, campaigns: left.campaigns }));
            // The row that had the focus is gone with the question: the list's own heading takes it, once both have left the page.
            requestAnimationFrame(() => heading.current?.focus());
        }
    };

    const campaigns = launcher?.campaigns ?? [];
    const listed = (root: string | undefined): boolean => root !== undefined && campaigns.some((campaign) => campaign.root === root);
    const busy = doing !== undefined;
    // What went wrong with no campaign of the list: said beside what was asked.
    const aside = problem !== undefined && !listed(problem.root) ? problem.text : undefined;
    return (
        <main class="launcher">
            <p class="visually-hidden" role="status">{told}</p>
            <section class="launcher-list" aria-labelledby="launcher-campaigns">
                <h2 id="launcher-campaigns" ref={heading} tabIndex={-1}>{t("Campaigns")}</h2>
                {doing?.what === "opening" && !listed(doing.root) && <p class="launcher-busy">{doing.words}</p>}
                {away !== undefined && launcher === undefined && <p class="launcher-problem" role="alert">{away}</p>}
                {launcher !== undefined && campaigns.length === 0 && <p class="launcher-empty">{t("No campaigns yet: create your first one.")}</p>}
                {campaigns.length > 0 && (
                    <CampaignList
                        campaigns={campaigns}
                        standing={{
                            opening: doing?.what === "opening" && doing.root !== undefined ? { root: doing.root, words: doing.words } : undefined,
                            busy,
                            problem: problem?.root === undefined ? undefined : { root: problem.root, text: problem.text },
                        }}
                        now={new Date()}
                        onOpen={(campaign) => void open(campaign.root, campaign.name)}
                        onRemove={setRemoving}
                    />
                )}
            </section>
            <section class="launcher-side" aria-labelledby={view === "new" ? "launcher-new" : "launcher-title"}>
                {view === "new" && launcher !== undefined
                    ? (
                        <NewCampaignForm
                            launcher={launcher}
                            busy={doing?.what === "creating" ? doing.words : undefined}
                            problem={aside}
                            onCreate={(wish) => void create(wish)}
                            onBack={() => {
                                setProblem(undefined);
                                setView("list");
                            }}
                            onPick={pick}
                        />
                    )
                    : (
                        <div class="launcher-home">
                            <div class="launcher-robot">
                                <Master mood="happy" />
                            </div>
                            <h1 id="launcher-title">{productName}</h1>
                            {launcher !== undefined && <p class="launcher-version" dir="ltr">{launcher.version}</p>}
                            <div class="launcher-actions">
                                <button
                                    ref={creates}
                                    type="button"
                                    class="button gold"
                                    aria-describedby="launcher-create-is"
                                    aria-disabled={busy || launcher === undefined}
                                    onClick={() => {
                                        if (!busy && launcher !== undefined) {
                                            setProblem(undefined);
                                            setView("new");
                                        }
                                    }}
                                >
                                    {t("New campaign")}
                                </button>
                                <p id="launcher-create-is" class="launcher-hint">{t("Its name, its language and its game system: the master makes the rest with you.")}</p>
                                <button
                                    type="button"
                                    class="button"
                                    aria-describedby="launcher-folder-is"
                                    aria-disabled={busy || launcher === undefined}
                                    aria-busy={doing?.what === "adding"}
                                    onClick={() => !busy && launcher !== undefined && void openFolder()}
                                >
                                    {t("Open a folder…")}
                                </button>
                                <p id="launcher-folder-is" class="launcher-hint">{t("A campaign you already have on this computer.")}</p>
                            </div>
                            {aside !== undefined && <p class="launcher-problem" role="alert" dir="auto">{aside}</p>}
                        </div>
                    )}
            </section>
            <ThemeCorner />
            {removing !== undefined && <RemoveQuestion campaign={removing} onClose={() => setRemoving(undefined)} onRemove={() => void forget(removing)} />}
        </main>
    );
}

/** Asks before a campaign leaves the list: its files stay, and it can be listed again. Cancel has the focus. */
function RemoveQuestion({ campaign, onClose, onRemove }: { campaign: ListedCampaign; onClose(): void; onRemove(): void; })
{
    return (
        <Confirm title={t("Remove {name} from the list?", { name: campaign.name })} onClose={onClose}>
            <p>{t("Its files stay where they are: you can add it again with Open a folder.")}</p>
            <p class="confirm-note launcher-where">
                <bdi dir="ltr">{campaign.root}</bdi>
            </p>
            <div class="confirm-buttons">
                <button type="button" class="button" onClick={(event) => event.currentTarget.closest("dialog")?.close()}>{t("Cancel")}</button>
                <button type="button" class="button" onClick={onRemove}>{t("Remove from the list")}</button>
            </div>
        </Confirm>
    );
}
