/**
 * How a game system declares one of its fields (SYS-8): a counter, a number that is never counted, a number the pages of the bonus lists raise to at least
 * theirs (FOR-5), a number shown with its sign (a modifier), a bonus that effects add up (FOR-5), a factor that effects multiply, a length the system works
 * out in its unit (SPD-1), a weight in the unit of its loads, a duration in minutes, text, a list, or rolls kept to take the place of a later roll (KEP-1).
 */
export const fieldKinds = ["counter", "number", "at-least", "modifier", "bonus", "factor", "length", "weight", "duration", "text", "list", "rolls"] as const;

export type FieldKind = (typeof fieldKinds)[number];
