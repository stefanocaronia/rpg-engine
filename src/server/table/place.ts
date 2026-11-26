// Where a campaign's table is found (D-582): a small file for each campaign in the engine's data folder on this computer, never in a campaign, with the
// socket the chats knock at and the token they knock with. A place nobody answers at is stale: whoever finds it takes it away.
import { createHash, randomBytes } from "node:crypto";
import { chmodSync, existsSync, mkdirSync, readdirSync, rmSync } from "node:fs";
import { connect, type Socket } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { readDataFile, removeDataFile, writeDataFile } from "../../core/data-file.ts";
import { isPageAddress } from "../../core/page-address.ts";
import { samePath } from "../../core/paths.ts";

/** A table as its place file says it: its campaign, its process and engine, the socket and token a chat knocks with, its page's link. */
export interface TablePlace
{
    root: string;
    pid: number;
    version: string;
    socket: string;
    token: string;
    url: string;
}

// The longest path a socket file may have where the system counts fewest (macOS: 104 bytes with its end), kept a little under.
const longestSocketPath = 100;

/**
 * The socket of a campaign's table: a named pipe on Windows, else a socket file beside its place; where that path is longer than a socket's may be, as in a
 * home with a long name, a file of the system's temporary folder. Only the table works it out: the others read it in the table's place.
 */
export function tableSocket(home: string, root: string, platform: string, temporary: string = tmpdir()): string
{
    const key = tableKey(root);

    if (platform === "win32") {
        return `\\\\.\\pipe\\rpg-table-${key}`;
    }

    const beside = join(tablesFolder(home), `${key}.sock`);
    return Buffer.byteLength(beside) <= longestSocketPath ? beside : join(temporary, `rpg-table-${key}.sock`);
}

/** A new token, at each start of a table: only who reads its place knocks right. */
export function newToken(): string
{
    return randomBytes(16).toString("hex");
}

/**
 * The place of a campaign's table; undefined where there is none, it does not read, its link is no page of this computer's, or it is another campaign's,
 * whose folder differs only by case where the case counts.
 */
export function readPlace(home: string, root: string): TablePlace | undefined
{
    const read = (readDataFile(placeFile(home, root)) ?? {}) as Partial<TablePlace>;
    const texts = [read.root, read.version, read.socket, read.token, read.url].every((one) => typeof one === "string");
    return texts && typeof read.pid === "number" && isPageAddress(read.url as string) && samePath(read.root as string, root) ? read as TablePlace : undefined;
}

/** Writes a table's place, its token for the player alone to read: the folder and the file are only theirs where the system has modes. */
export function writePlace(home: string, place: TablePlace): void
{
    writeTableFile(home, placeFile(home, place.root), place);
}

/** A file of a campaign's table beside its place, by what ends its name, as ".chat.json". */
export function tableFile(home: string, root: string, ending: string): string
{
    return join(tablesFolder(home), `${tableKey(root)}${ending}`);
}

/** Writes a file of the tables' folder as JSON: the folder and the file are only the player's where the system has modes. */
export function writeTableFile(home: string, file: string, content: unknown): void
{
    makeTablesFolder(home);
    writeDataFile(file, content);
}

/** Makes the tables' folder, the player's alone where the system has modes: a table's socket lives there off Windows, so it is there before the table listens. */
export function makeTablesFolder(home: string): void
{
    const folder = tablesFolder(home);
    mkdirSync(folder, { recursive: true, mode: 0o700 });
    chmodSync(folder, 0o700);
}

/** The places of every table this computer has, as their files say them, those that read: tables on or left by one that ended without its cleanup. */
export function tablePlaces(home: string): TablePlace[]
{
    const names = existsSync(tablesFolder(home)) ? readdirSync(tablesFolder(home)) : [];
    return names.filter((name) => /^[0-9a-f]{16}\.json$/.test(name)).flatMap((name) => {
        const root = (readDataFile(join(tablesFolder(home), name)) as { root?: unknown; } | null | undefined)?.root;
        const place = typeof root === "string" ? readPlace(home, root) : undefined;
        return place === undefined ? [] : [place];
    });
}

/** Takes a table's place away, only while it is the one with this token: a table started since keeps its own. */
export function removePlace(home: string, root: string, token: string): void
{
    if (readPlace(home, root)?.token === token) {
        removeDataFile(placeFile(home, root));
    }
}

/** Takes away a socket file left by a table that ended without its cleanup, once nothing answers there; a named pipe goes with its process. */
export function removeSocketFile(socket: string, platform: string): void
{
    if (platform !== "win32") {
        rmSync(socket, { force: true });
    }
}

/** Knocks at a table's socket: the connection, "nobody" where nothing listens there, as a stale place, "slow" where it did not answer within `wait` ms. */
export function knock(socket: string, wait: number): Promise<Socket | "nobody" | "slow">
{
    return new Promise((done) => {
        const knocked = connect(socket);
        const timer = setTimeout(() => {
            knocked.destroy();
            done("slow");
        }, wait);

        knocked.once("connect", () => {
            clearTimeout(timer);
            done(knocked);
        });
        knocked.once("error", () => {
            clearTimeout(timer);
            knocked.destroy();
            done("nobody");
        });
    });
}

function tablesFolder(home: string): string
{
    return join(home, "tables");
}

function placeFile(home: string, root: string): string
{
    return tableFile(home, root, ".json");
}

/** A campaign's key, from its folder as its ports read it: the same however the path is written. */
function tableKey(root: string): string
{
    return createHash("sha256").update(root.replaceAll("\\", "/").toLowerCase()).digest("hex").slice(0, 16);
}
