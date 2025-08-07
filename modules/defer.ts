/** Returns a disposable that can be used with `using` to schedule cleanup work at the end of the scope. */
export const sync = (cleanup: () => unknown) => ({ [Symbol.dispose]: () => { cleanup() } });

/** Returns an async disposable that can be used with `await using` to schedule cleanup work at the end of the scope. */
export const async = (cleanup: () => Promise<unknown>) => ({ [Symbol.asyncDispose]: async () => { await cleanup() } });
