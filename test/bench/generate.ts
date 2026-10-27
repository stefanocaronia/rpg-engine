// Campaigns and game systems of any size for the performance bench (step 11): written straight to files, the same for the same size.
import { appendFileSync, cpSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const text = "La nebbia sale dal fiume ogni sera e porta con sé l'odore del fango e della legna bagnata. Chi abita qui la conosce e non ne parla volentieri.";

/**
 * Writes the world of a campaign with about `size` pages into `folder`, which init has made: places in a tree four wide, characters in them, half of them derived
 * from a creature of the system, items in their inventories, creatures, quests, planned events with dates, places, clocks and conditions, effects, some of
 * which end at 18:05; the player character and two companions at the inn; three house rules; and a log of `size` times six lines.
 */
export function generateWorld(folder: string, size: number): void
{
    const count = (share: number): number => Math.max(1, Math.round(size * share));
    const places = Array.from({ length: count(0.25) }, (_, index) => `Luogo ${index + 1}`);
    const characters = Array.from({ length: count(0.45) }, (_, index) => `Abitante ${index + 1}`);
    const items = Array.from({ length: count(0.15) }, (_, index) => `Oggetto ${index + 1}`);
    const held = new Map<string, string[]>();

    const hold = (holder: string, link: string): void => {
        held.set(holder, [...(held.get(holder) ?? []), link]);
    };

    places.slice(1).forEach((place, index) => hold(places[Math.floor(index / 4)], place));
    characters.forEach((character, index) => hold(places[(index * 7) % places.length], character));
    ["Ennio", "Lena", "Bruno"].forEach((name) => hold(places[0], name));
    items.forEach((item, index) => hold(index % 3 === 0 ? "Ennio" : characters[(index * 5) % characters.length], item));

    for (const place of places) {
        page(folder, "places", place, { contains: links(held.get(place)) });
    }

    characters.forEach((character, index) => {
        const derived = index % 2 === 0 ? { creature: '"[[Commoner]]"' } : { hp: `${(index % 9) + 1}/9` };
        const effects = index % 10 === 0 ? { effects: ['"Benedetto until day 3, 10:00"'] } : index % 10 === 5 ? { effects: ['"Stordito until day 1, 18:05"'] } : {};
        page(folder, "characters", character, { role: "npc", ...derived, inventory: links(held.get(character)), knows: links([characters[(index + 1) % characters.length]]), ...effects });
    });

    page(folder, "characters", "Ennio", { role: "pc", level: "3", hp: "21/27", ac: "15", "hit-dice": "3/3", "slots-1": "4/4", "slots-2": "2/2", inventory: links(held.get("Ennio")) });
    page(folder, "characters", "Lena", { role: "companion", creature: '"[[Commoner]]"', hp: "3/4" });
    page(folder, "characters", "Bruno", { role: "companion", creature: '"[[Wolf]]"' });
    items.forEach((item, index) => page(folder, "items", item, index % 4 === 0 ? { uses: "3/3" } : {}));
    Array.from({ length: count(0.03) }, (_, index) => page(folder, "creatures", `Bestia ${index + 1}`, { creature: '"[[Wolf]]"' }));
    Array.from({ length: count(0.05) }, (_, index) => page(folder, "quests", `Missione ${index + 1}`, { status: index % 2 === 0 ? "open" : "planned", progress: `${index % 4}/4` }));
    Array.from({ length: count(0.07) }, (_, index) => {
        const clock = index % 3 === 0 ? { clock: "0/4" } : { date: `"day ${(index % 20) + 2}, 18:00"` };
        // Some wait for someone's death, as Abitante 9's sets one off.
        const when = index % 5 === 1 ? { when: [`"[[${characters[(index * 4 + 8) % characters.length]}]] dead"`], by: `"[[${characters[index % characters.length]}]]"` } : {};
        page(folder, "events", `Evento ${index + 1}`, { status: "planned", place: `"[[${places[(index * 3) % places.length]}]]"`, ...clock, ...when });
    });

    mkdirSync(join(folder, "rules"), { recursive: true });
    ["Fatica", "Veleni", "Viaggi"].forEach((rule) =>
        writeFileSync(
            join(folder, "rules", `${rule}.md`),
            `# ${rule}

${text}

## Eccezioni

${text}
`,
        )
    );
    appendFileSync(join(folder, "log.jsonl"), Array.from({ length: size * 6 }, (_, index) => logLine(index, characters[index % characters.length])).join(""));
}

/**
 * Copies a game system into `target` with its pages and rules repeated `times` times under new names and titles, so that it reaches the size of a whole SRD:
 * 22 pages and 7 chapters times 45 are about 1000 pages and 2.4 MB of rules.
 */
export function enlargeSystem(source: string, target: string, times: number): void
{
    // A system's repository holds its packages and its history too: never copied.
    cpSync(source, target, { recursive: true, filter: (path) => !/[\\/](node_modules|\.git)([\\/]|$)/.test(path.slice(source.length)) });

    for (const entry of readdirSync(join(source, "world"), { recursive: true, withFileTypes: true }).filter((candidate) => candidate.isFile() && candidate.name.endsWith(".md"))) {
        const content = readFileSync(join(entry.parentPath, entry.name), "utf8");
        const folder = join(target, entry.parentPath.slice(source.length));

        for (let copy = 2; copy <= times; copy++) {
            writeFileSync(join(folder, entry.name.replace(/\.md$/, ` ${copy}.md`)), content);
        }
    }

    for (const chapter of readdirSync(join(source, "rules")).filter((name) => name.endsWith(".md"))) {
        const content = readFileSync(join(source, "rules", chapter), "utf8");

        for (let copy = 2; copy <= Math.ceil(times / 3); copy++) {
            writeFileSync(join(target, "rules", chapter.replace(/\.md$/, ` ${copy}.md`)), content.replace(/^(#+ .*)$/gm, `$1 ${copy}`));
        }
    }
}

function page(folder: string, type: string, name: string, fields: Record<string, string | string[] | undefined>): void
{
    const lines = Object.entries(fields).filter(([, value]) => value !== undefined && value.length > 0).map(([field, value]) => (Array.isArray(value) ? `${field}:\n${value.map((item) => `  - ${item}`).join("\n")}` : `${field}: ${value}`));
    const frontmatter = lines.length === 0 ? "" : `---\n${lines.join("\n")}\n---\n\n`;
    mkdirSync(join(folder, "world", type), { recursive: true });
    writeFileSync(join(folder, "world", type, `${name}.md`), `${frontmatter}${text}\n\n## Note\n\n${text}\n\n> [!secret]\n> ${text}\n`);
}

/** A line of the log, as change writes one. */
function logLine(index: number, page: string): string
{
    const data = { page, field: "hp", before: "5/9", after: "4/9", by: -1 };
    return `${JSON.stringify({ id: `bench${index}`, at: "2026-10-02T10:00:00.000Z", date: "day 1, 18:00", type: "counter-changed", by: "master", visibility: "hidden", data })}\n`;
}

function links(names: string[] | undefined): string[] | undefined
{
    return names?.map((name) => `"[[${name}]]"`);
}
