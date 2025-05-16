import { Prettify } from "./prettify";

/** C-like union type with one property per branch, so that it can be very easily pattern-matched. */
export type Union<T extends Record<string, unknown>> = Prettify<{
  // [K in keyof T]: { [V in keyof Branch<T, K>]: Branch<T, K>[V] }
  [K in keyof T]:
  & { [P in K]: T[P] }
  & { [P in Exclude<keyof T, K>]?: undefined }
}[keyof T]>;
