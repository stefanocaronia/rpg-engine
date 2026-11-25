// The launcher: a light process apart from any campaign that lists the campaigns of this computer, makes one and opens one by starting its table, and whose
// page opens in a window of its own, from the command line or from an icon. Its server loads only when asked for: who only finds it starts without it.
import type { LauncherOpened, LauncherOptions, LauncherRunOptions } from "./serve.ts";

export { campaignsFolder, campaignsFolderName, type CampaignShown, forgetCampaign, holdsCampaign, listCampaigns, rememberCampaign } from "./campaigns.ts";
export { type CampaignWish, folderName, makeCampaign, type MakeWhere, windowsNameProblem } from "./make.ts";
export { openCampaign, type Reached, type TableStarter } from "./open.ts";
export { type LauncherPlace, readLauncher, removeLauncher, writeLauncher } from "./place.ts";
export { launcherRoutes } from "./routes.ts";
export type { Launcher, LauncherOpened, LauncherOptions, LauncherRunOptions } from "./serve.ts";
export { findLauncher, type LauncherProbed, type LauncherStarter, type LauncherThere, launcherWay, probeLauncher, reachLauncher } from "./start.ts";

/** `rpg launcher`, as serve.ts says it. */
export async function runLauncher(given?: LauncherRunOptions): Promise<number>
{
    const launcher = await import("./serve.ts");
    return launcher.runLauncher(given);
}

/** Opens the launcher, as serve.ts says it. */
export async function openLauncher(options: LauncherOptions): Promise<LauncherOpened>
{
    const launcher = await import("./serve.ts");
    return launcher.openLauncher(options);
}
