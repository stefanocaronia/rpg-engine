// What is read from the files is never changed in place (step 11): once the server keeps it for later calls, a change there would last and spread.

/** The value made read-only with all it holds, as it is: a command that tried to change it fails at once, in the tests first. */
export function frozen<T>(value: T): T
{
    if (typeof value === "object" && value !== null && !Object.isFrozen(value)) {
        Object.freeze(value);

        for (const inner of Object.values(value)) {
            frozen(inner);
        }
    }

    return value;
}
