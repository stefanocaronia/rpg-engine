// The ports of the dashboard, apart from its server, so that the doorbell reads them without loading the server and its commands (D-495).

/**
 * The ports the dashboard tries in turn, taking the first that is free: the same link from one chat to the next (D-272). Windows may keep ranges of ports
 * from boot to boot (netsh int ipv4 show excludedportrange): then the next range, and at last any free port, whose link status gives all the same (D-338).
 */
export const dashboardPorts = [...[4747, 5747, 6747, 7747, 8747].flatMap((first) => Array.from({ length: 10 }, (_, index) => first + index)), 0];

/**
 * The ports for a campaign's dashboard: its own in each range first, worked out from its folder, then the others (D-353). Its link stays the same from one
 * chat to the next, as long as no other program holds that port, so that the player can keep it, and a page left open comes back by itself.
 */
export function campaignPorts(root: string): number[]
{
    const offset = [...root.replaceAll("\\", "/").toLowerCase()].reduce((sum, letter) => (sum * 31 + letter.charCodeAt(0)) % 100003, 0) % 10;
    const own = [4747, 5747, 6747, 7747, 8747].map((first) => first + offset);
    return [...own, ...dashboardPorts.filter((port) => !own.includes(port))];
}
