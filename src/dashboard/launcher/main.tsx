// The launcher's page, an entry of its own beside the dashboard's (D-582): the campaigns of this computer, served by the launcher apart from any campaign.
import { render } from "preact";
import { restoreTheme } from "../shell/theme.ts";
import { startTooltips } from "../shell/tooltip.ts";
import { fitOpenedWindow } from "../shell/window.ts";
import { browserLanguage, pageDirection, setLanguage } from "../text.ts";
import { Launcher } from "./page.tsx";

// The window the icon opened, small and centred; the campaign its address asks to open at once, as a page that lost its table asks.
const asked = fitOpenedWindow("launcher");
restoreTheme();
startTooltips();

// The page's words in the browser's language, where the page ships it: no campaign says another here.
const language = browserLanguage();
await setLanguage(language);
document.documentElement.lang = language ?? "en";
document.documentElement.dir = pageDirection();

const root = document.getElementById("app");

if (root !== null) {
    render(<Launcher asked={asked.open} />, root);
}
