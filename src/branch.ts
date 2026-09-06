import { Flat } from './flat.js';

/** the building block of our branching technique */
export type Branch<B extends string | symbol, V = void> = { branch: B, value: V; };

/** a utility to represent unions of branches in a way that looks like a c union */
export type Union<T extends Record<string | symbol, unknown>> = Flat<{ [P in keyof T]: Branch<Extract<P, string | symbol>, T[P]> }[keyof T]>;

/** creates a branch object */
export const branch = <B extends string | symbol, V = void>(branch: B, value?: V) => ({ branch, value: value as V });
