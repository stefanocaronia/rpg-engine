// Takes a package out of the campaign, or off this computer
import { join } from "node:path";
import { changeExtensions, requireCampaign } from "../../campaign/index.ts";
import type { Context } from "../../core/context.ts";
import { appendLogEntry } from "../../core/log.ts";
import { Refusal } from "../../core/refusal.ts";
import { files } from "../../core/store.ts";
import { comparableText } from "../../core/text.ts";
import { dropConsent, installedExtensions, shortName } from "../../extensions/index.ts";
import { isPackageName } from "../../packages/index.ts";
import { listedExtensions } from "../shared/packages/extensions.ts";
import { findUnpacked, unpackedName } from "../shared/packages/unpacked.ts";
import { newDatedLogEntry } from "../shared/time/time.ts";
import { installedExtensionFolder, languagesHere, systemsHere } from "./here.ts";
import { dataLanguageUninstalled } from "./language.ts";
import type { PackageResult } from "./result.ts";
import { themeUninstalled } from "./theme.ts";

/** Takes an extension out of the campaign; it stays on this computer, for other campaigns. */
export function removed(root: string, context: Context, name: string): PackageResult
{
    const listed = listedExtensions(root);
    const found = Object.keys(listed).find((candidate) => candidate === name || comparableText(shortName(candidate)) === comparableText(name));

    if (found === undefined) {
        const names = Object.keys(listed).map(shortName);
        throw new Refusal(`The campaign does not use ${name}${names.length === 0 ? ": it uses no package" : `; it uses ${names.join(", ")}`}. Nothing changed.`, "not-used", { name });
    }

    const rest = Object.fromEntries(Object.entries(listed).filter(([candidate]) => candidate !== found));
    changeExtensions(root, rest);
    appendLogEntry(root, newDatedLogEntry(root, context, "package-removed", "public", { package: found }));
    return { kind: "removed", name: shortName(found) };
}

/**
 * Takes a package off this computer with npm, and out of the campaign when it uses it (D-442); other campaigns that list it ask to install it again. A theme
 * or a language of data alone goes by its folder, when no npm package has its name: theme:<id> and language:<code> name them alone. Outside a campaign, only a
 * theme goes.
 */
export async function uninstalled(campaign: string | undefined, context: Context, name: string): Promise<PackageResult>
{
    const packages = context.packages;
    const npmName = name.startsWith("npm:") ? name.slice(4) : name;
    const unpacked = findUnpacked(context, name);
    const system = systemsHere(campaign ?? context.folder, context).find((one) => one.package !== undefined && (one.package === npmName || comparableText(one.name) === comparableText(npmName)));
    const other = system?.package
        ?? languagesHere(context).find((one) => one.unpacked !== true && (one.package === npmName || comparableText(one.code) === comparableText(npmName)))?.package;
    const found = other === undefined
        ? installedExtensions(context.extensionFolders ?? []).find((one) => one.package === npmName || comparableText(shortName(one.package)) === comparableText(npmName))
        : { package: other };
    // A package that reads as nothing, as a system whose system.yaml is broken, is still npm's to take away by its folder, under its npm name.
    const unread = found === undefined && packages !== undefined && isPackageName(npmName)
        && (context.extensionFolders ?? []).some((folder) => files().entries(join(folder, ...npmName.split("/"))).length > 0);
    const npm = unpacked !== undefined && /^(theme|language):/i.test(name) ? undefined : (found?.package ?? (unread ? npmName : undefined));

    // A theme or a language of data alone goes only when no npm package has its name; when both have it, the player says which.
    if (unpacked !== undefined && npm !== undefined) {
        const npmAs = npm.startsWith("@") ? npm : `npm:${npm}`;
        throw new Refusal(
            `${name} names two packages on this computer: ${npm} from npm, and the ${unpacked.kind} ${unpacked.kind === "theme" ? (unpacked.theme.theme?.name ?? unpacked.theme.id) : unpacked.pack.name}. `
                + `Say which: ${npmAs} for the one from npm, ${unpackedName(unpacked)} for the ${unpacked.kind}. Nothing changed.`,
            "ambiguous-name",
            { name, npm: npmAs, unpacked: unpackedName(unpacked) },
        );
    }

    if (unpacked?.kind === "theme") {
        return themeUninstalled(campaign, context, unpacked.theme);
    }

    const root = campaign ?? requireCampaign(context.folder);

    if (unpacked !== undefined) {
        return dataLanguageUninstalled(root, context, unpacked.pack);
    }

    if (system?.used === true) {
        throw new Refusal(`The campaign plays ${system.name}: it stays on this computer. Nothing changed.`, "system-played", { name: system.name });
    }

    if (unread && packages !== undefined) {
        const why = await packages.uninstall(npmName);

        if (why !== undefined) {
            throw new Refusal(`${npmName} could not be taken off this computer: ${why}. Nothing changed.`, "uninstall-failed", { name: npmName, why });
        }

        return { kind: "uninstalled", name: npmName, wasUsed: false, extension: false };
    }

    if (found === undefined) {
        const here = installedExtensions(context.extensionFolders ?? []).map((one) => shortName(one.package));
        throw new Refusal(`${name} is not on this computer${here.length === 0 ? ": no package is" : `; these are: ${here.join(", ")}`}. Nothing changed.`, "not-here", { name });
    }

    if (packages === undefined) {
        throw new Error("Packages are uninstalled only by the game's server or the command line, which reach npm.");
    }

    const folder = installedExtensionFolder(context, found.package);
    const why = await packages.uninstall(found.package);

    if (why !== undefined) {
        throw new Refusal(`${found.package} could not be uninstalled: ${why}. Nothing changed.`, "uninstall-failed", { name: found.package, why });
    }

    // Off this computer, its yes goes with it: installed again, it is asked again.
    if (folder !== undefined) {
        dropConsent(folder, found.package);
    }

    [...context.systemFolders, ...(context.extensionFolders ?? [])].forEach((folder) => files().refresh(folder));
    const listed = listedExtensions(root);
    const wasUsed = Object.hasOwn(listed, found.package);

    if (wasUsed) {
        changeExtensions(root, Object.fromEntries(Object.entries(listed).filter(([candidate]) => candidate !== found.package)));
    }

    appendLogEntry(root, newDatedLogEntry(root, context, "package-uninstalled", "public", { package: found.package }));
    return { kind: "uninstalled", name: shortName(found.package), wasUsed, extension: other === undefined };
}
