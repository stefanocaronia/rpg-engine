// The player's standing orders to the companions (D-38, D-563): kept in the campaign's settings, said to the master and to who voices a companion
import { readListSetting } from "../../../campaign/index.ts";

/** The standing orders the player gave the companions, in their words; none when there are none or the settings cannot be read. */
export function standingOrders(root: string): string[]
{
    return readListSetting(root, "orders");
}

/** The orders as the master reads them: the player's words in quotes, so that they are never taken for the engine's: "Leave one alive"; "…". */
export function quotedOrders(orders: string[]): string
{
    return orders.map((order) => `"${order}"`).join("; ");
}
