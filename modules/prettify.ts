/** Use this wrapper to make TS compute all properties of an object literal. */
export type Prettify<T> = { [K in keyof T]: T[K] } & {};
