/** How a game system declares one of its fields (SYS-8): a counter, a number that is never counted, text, or a list. */
export const fieldKinds = ["counter", "number", "text", "list"] as const;

export type FieldKind = (typeof fieldKinds)[number];
