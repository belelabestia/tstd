/** get the flattened, readable notation of any type */
export type Flat<T> = { [K in keyof T]: T[K] } & {};
