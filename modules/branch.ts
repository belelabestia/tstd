import { Prettify } from './prettify';

/** the building block of our branching technique */
export type Branch<B extends string, V> = { branch: B, value: V };

/** a utility to represent unions of branches in a way that looks like a c union */
export type Union<T extends Record<string, unknown>> = Prettify<{ [P in keyof T]: Branch<Extract<P, string>, T[P]> }[keyof T]>;

/**
 * typescript is not smart enough to infer that a missing optional parameter makes `V = undefined`
 * it will just consider `V = unknown` and `value: unknown | undefined`
 */
type BranchSignature = {
  <B extends string, V>(branch: B, value: V): { branch: B, value: V },
  <B extends string>(branch: B): { branch: B, value: undefined },
};

/** creates a branch object */
export const branch: BranchSignature = <B extends string, V>(branch: B, value?: V) => ({ branch, value });
