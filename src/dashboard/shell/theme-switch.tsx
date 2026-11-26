// The switch between the light and the dark mode (D-300, D-310): the window's corner, for the campaigns' page, which has no settings, and the theme it goes
// to for whatever else switches it.
import { Icon } from "../parts/icons.tsx";
import { t } from "../text.ts";
import { usePrefChange } from "./prefs.ts";
import { pickTheme, shownTheme } from "./theme.ts";

/** The switch in the window's corner, with the mode it goes to. */
export function ThemeCorner()
{
    const [theme, flip] = useTheme();
    return (
        <button type="button" class="theme-corner tip-left" aria-label={theme.name} data-tip={theme.name} onClick={flip}>
            <Icon name={theme.next === "dark" ? "moon" : "sun"} />
        </button>
    );
}

/** The mode the switch goes to, with its name, and what switches to it; read again at each drawing, as the menu and the switch both change it. */
export function useTheme(): [{ next: "light" | "dark"; name: string; }, () => void]
{
    usePrefChange();
    const next = shownTheme() === "dark" ? "light" : "dark";
    const flip = (): void => pickTheme(next);

    return [{ next, name: next === "dark" ? t("Dark mode") : t("Light mode") }, flip];
}
