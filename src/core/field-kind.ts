/**
 * How a game system declares one of its fields (SYS-8): a counter, a number that is never counted, a number shown with its sign (a modifier), a bonus that
 * effects add up (FOR-5), text, or a list.
 */
export const fieldKinds = ["counter", "number", "modifier", "bonus", "text", "list"] as const;

export type FieldKind = (typeof fieldKinds)[number];
