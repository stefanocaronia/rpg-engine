// The shape of a table of the page's words for what the engine says by a code: each code with what says it, from the values that came with it.

/** The values of a code, as the server gives them: what is not the engine's own, as an app's words, a path or a model's id, is in one of them as it came. */
export type Values = Record<string, string>;

/** The page's words for each code of a kind. */
export type Phrases = Record<string, (values: Values) => string>;
