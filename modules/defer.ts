/** Returns a disposable that can be used with `using` to schedule cleanup work at the end of the scope. */
export const sync = (cleanup: () => void) => ({ [Symbol.dispose]: cleanup });

/** Returns an async disposable that can be used with `await using` to schedule cleanup work at the end of the scope. */
export const async = (cleanup: () => Promise<void>) => ({ [Symbol.asyncDispose]: cleanup });
