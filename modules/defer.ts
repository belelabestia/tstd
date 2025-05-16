/** Returns a disposable that can be used with the `using` keyword to schedule cleanup work at the end of the scope. */
export const defer = (cleanup: () => void | Promise<void>) => ({ [Symbol.dispose]: cleanup });
