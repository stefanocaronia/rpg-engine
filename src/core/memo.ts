// Work repeated on the same texts, such as the names of the pages or the links of their text, done once while the server runs (step 11, D-194).
import { frozen } from "./frozen.ts";

/** `compute` remembered for the texts it has seen, up to `limit` of them, after which they are all forgotten at once; what it gives is frozen. */
export function rememberedByText<T>(compute: (text: string) => T, limit = 50_000): (text: string) => T
{
    const seen = new Map<string, T>();

    return (text) => {
        if (seen.has(text)) {
            return seen.get(text) as T;
        }

        if (seen.size >= limit) {
            seen.clear();
        }

        const value = frozen(compute(text));
        seen.set(text, value);
        return value;
    };
}
