// A refusal the player may meet on the dashboard (T-162): the engine's words, which the master reads as they are, and a code with its values, which the page
// says in its own language. A code the page does not know shows the engine's words.

/** An error with a code and its values beside its message, for the dashboard to say in the page's language. */
export class Refusal extends Error
{
    readonly code: string;
    readonly values: Record<string, string>;

    constructor(message: string, code: string, values: Record<string, string> = {})
    {
        super(message);
        this.code = code;
        this.values = values;
    }
}

/** What the dashboard sends of an error: its words, and its code and values when it is a refusal. */
export function refusalBody(error: unknown): { error: string; code?: string; values?: Record<string, string>; }
{
    const message = error instanceof Error ? error.message : String(error);
    return error instanceof Refusal ? { error: message, code: error.code, ...(Object.keys(error.values).length === 0 ? {} : { values: error.values }) } : { error: message };
}
