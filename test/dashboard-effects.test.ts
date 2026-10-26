// Someone's effects as chips where few fit (D-516): past the most shown, how many more, written left to right in a page from right to left too, the others in its tooltip.
import { describe, expect, it } from "vitest";

type Node = { props: { class?: string; dir?: string; "data-tip"?: string; children?: unknown; }; };

// The page's .tsx modules are typed by the page's own tsconfig, which has JSX, not by the tests': loaded by their address, with their functions' types.
const { Effects } = await import(new URL("../src/dashboard/widgets.tsx", import.meta.url).href) as {
    Effects: (props: { effects: { name: string; text: string; icon?: string; }[]; most?: number; }) => Node;
};

describe("the effects where few fit", () => {
    it("say how many more as +1 left to right, the others' names in its tooltip", () => {
        const effects = [{ name: "Benedizione", text: "Benedizione", icon: "M12 3v18" }, { name: "Prono", text: "Prono" }, { name: "Afferrato", text: "Afferrato" }];
        const more = (Effects({ effects, most: 1 }).props.children as unknown[]).flat().find((child): child is Node => (child as Node | undefined)?.props?.class === "effect more");
        expect(more?.props).toMatchObject({ dir: "ltr", "data-tip": "Prono, Afferrato", children: "+2" });
    });
});
