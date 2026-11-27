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

/** A refusal as it travels to the dashboard: the engine's words, and a code with its values where the page may say it in its language. */
export interface RefusalBody
{
    error: string;
    code?: string;
    values?: Record<string, string>;
}

/** A refusal told without throwing, as a function that answers why not: the engine's words with their code and values. */
export function refusalWords(error: string, code: string, values: Record<string, string> = {}): RefusalBody
{
    return { error, code, ...(Object.keys(values).length === 0 ? {} : { values }) };
}

/** What the dashboard sends of an error: its words, and its code and values when it is a refusal. */
export function refusalBody(error: unknown): RefusalBody
{
    const message = error instanceof Error ? error.message : String(error);
    return error instanceof Refusal ? { error: message, code: error.code, ...(Object.keys(error.values).length === 0 ? {} : { values: error.values }) } : { error: message };
}
