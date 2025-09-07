import { Prettify } from './prettify';

/** the building block of our branching technique */
export type Branch<B extends string, V> = { branch: B, value: V; };

/** a utility to represent unions of branches in a way that looks like a c union */
export type Union<T extends Record<string, unknown>> = Prettify<{ [P in keyof T]: Branch<Extract<P, string>, T[P]> }[keyof T]>;

/** creates a branch object */
export const branch = <B extends string, V = void>(branch: B, value?: V) => ({ branch, value: value as V });
