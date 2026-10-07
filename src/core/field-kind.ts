/**
 * How a game system declares one of its fields (SYS-8): a counter, a number that is never counted, a number shown with its sign (a modifier), a bonus that
 * effects add up (FOR-5), text, a list, or rolls kept to take the place of a later roll (KEP-1).
 */
export const fieldKinds = ["counter", "number", "modifier", "bonus", "text", "list", "rolls"] as const;

export type FieldKind = (typeof fieldKinds)[number];
