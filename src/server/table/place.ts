// Where a campaign's table is found (D-582): a small file for each campaign in the engine's data folder on this computer, never in a campaign, with the
// socket the chats knock at and the token they knock with. A place nobody answers at is stale: whoever finds it takes it away.
import { createHash, randomBytes } from "node:crypto";
import { chmodSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { connect, type Socket } from "node:net";
import { join } from "node:path";
import { samePath } from "../../library/index.ts";

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

/** The socket of a campaign's table: a named pipe on Windows, else a socket file beside its place. */
export function tableSocket(home: string, root: string, platform: string): string
{
    const key = tableKey(root);
    return platform === "win32" ? `\\\\.\\pipe\\rpg-table-${key}` : join(tablesFolder(home), `${key}.sock`);
}

/** A new token, at each start of a table: only who reads its place knocks right. */
export function newToken(): string
{
    return randomBytes(16).toString("hex");
}

/**
 * The place of a campaign's table; undefined where there is none, it does not read, or it is another campaign's, whose folder differs only by case where the
 * case counts.
 */
export function readPlace(home: string, root: string): TablePlace | undefined
{
    try {
        const read = JSON.parse(readFileSync(placeFile(home, root), "utf8")) as Partial<TablePlace>;
        const texts = [read.root, read.version, read.socket, read.token, read.url].every((one) => typeof one === "string");
        return texts && typeof read.pid === "number" && samePath(read.root as string, root) ? read as TablePlace : undefined;
    } catch {
        return undefined;
    }
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
    const folder = tablesFolder(home);
    mkdirSync(folder, { recursive: true, mode: 0o700 });
    chmodSync(folder, 0o700);
    // A new file, so that its mode is the one given.
    rmSync(file, { force: true });
    writeFileSync(file, `${JSON.stringify(content, null, 2)}\n`, { mode: 0o600 });
}

/** Takes a table's place away, only while it is the one with this token: a table started since keeps its own. */
export function removePlace(home: string, root: string, token: string): void
{
    if (readPlace(home, root)?.token === token) {
        rmSync(placeFile(home, root), { force: true });
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
