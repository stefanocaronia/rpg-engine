// The campaign shared as an adventure, from the Adventures card: who wrote it, its licence, and the link to download it.
import { useEffect, useRef, useState } from "preact/hooks";
import { exportCampaign } from "../api.ts";
import { Icon } from "../parts/icons.tsx";
import { t } from "../text.ts";

/**
 * The campaign shared as an adventure (D-483), the last row of Adventures (D-486): Export… opens who wrote it and its licence, each optional, and whose it is
 * to share; then the link to download it.
 */
export function ShareCampaign()
{
    const [open, setOpen] = useState(false);
    const [author, setAuthor] = useState("");
    const [license, setLicense] = useState("");
    const [exporting, setExporting] = useState(false);
    const [made, setMade] = useState<Awaited<ReturnType<typeof exportCampaign>>>();
    const ready = useRef<HTMLAnchorElement>(null);
    const first = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (made !== undefined && "download" in made) {
            ready.current?.focus();
        }
    }, [made]);

    // The button stays where the focus is while the export goes: a second press waits for the first.
    const share = async (): Promise<void> => {
        if (exporting) {
            return;
        }

        setExporting(true);
        setMade(undefined);
        const credits = { ...(author.trim() === "" ? {} : { author: author.trim() }), ...(license.trim() === "" ? {} : { license: license.trim() }) };
        setMade(await exportCampaign(credits));
        setExporting(false);
    };

    return (
        <div class="package-export">
            <span class="package-tile plain" aria-hidden="true">
                <Icon name="share" />
            </span>
            <span class="package-text">
                <strong class="package-title" id="package-export-title">{t("This campaign, as an adventure")}</strong>
                <span class="package-about">{t("The world as it was at the start, without the player characters: a .zip to give to others.")}</span>
            </span>
            <span class="package-actions">
                <button
                    type="button"
                    class="button package-button"
                    aria-expanded={open}
                    aria-controls="package-credits"
                    onClick={() => {
                        setOpen(!open);

                        if (!open) {
                            requestAnimationFrame(() => first.current?.focus());
                        }
                    }}
                >
                    <Icon name="share" />
                    {t("Export…")}
                </button>
            </span>
            {open && (
                <form
                    class="package-credits"
                    id="package-credits"
                    aria-labelledby="package-export-title"
                    onSubmit={(event) => {
                        event.preventDefault();
                        void share();
                    }}
                >
                    <label>
                        <span>{t("Author")}</span>
                        <input ref={first} type="text" value={author} maxLength={200} placeholder={t("Optional")} autocomplete="name" onInput={(event) => setAuthor(event.currentTarget.value)} />
                    </label>
                    <label>
                        <span>{t("Licence")}</span>
                        <input
                            type="text"
                            value={license}
                            maxLength={200}
                            list="package-licences"
                            placeholder={t("Optional")}
                            aria-describedby="package-license-about"
                            onInput={(event) => setLicense(event.currentTarget.value)}
                        />
                    </label>
                    <datalist id="package-licences">
                        <option value="CC BY 4.0" />
                        <option value="CC BY-SA 4.0" />
                        <option value="CC0 1.0" />
                    </datalist>
                    <p class="package-why" id="package-license-about">{t("Without a licence, all rights are reserved.")}</p>
                    <p class="package-rights">
                        <Icon name="licence" />
                        {t("Share it only if you have the right to: a world taken from a book or from someone else's adventure is not yours to give.")}
                    </p>
                    <button type="submit" class="button package-button" aria-disabled={exporting}>
                        <Icon name="share" />
                        {exporting ? t("Exporting…") : t("Export")}
                    </button>
                    {made !== undefined && "download" in made && (
                        <p class="package-said package-ready" role="status">
                            <span>{`✓ ${t("{file} is ready.", { file: made.file })}`}</span>
                            <a ref={ready} class="button gold package-button" href={made.download} download={made.file}>
                                <Icon name="download" />
                                {t("Download")}
                            </a>
                        </p>
                    )}
                    {made !== undefined && "error" in made && <p class="package-said problem" role="status">{made.error}</p>}
                </form>
            )}
        </div>
    );
}
