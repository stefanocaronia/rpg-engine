// A test extension's code that must never run: it is not ours (D-441).
import type { PackageEntry } from "rpg-engine";

const rumors: PackageEntry = ({ z }) => ({
    commands: [{ name: "rumors", description: "A rumor.", input: z.object({}), run: () => "a rumor" }],
});

export default rumors;
