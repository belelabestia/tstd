import { Prettify } from './prettify';

export type Branch<B extends string, V> = { branch: B, value: V };
export type Union<T extends Record<string, unknown>> = Prettify<{ [P in keyof T]: Branch<Extract<P, string>, T[P]> }[keyof T]>;

export const branch = <B extends string, V>(branch: B, value: V) => ({ branch, value });
