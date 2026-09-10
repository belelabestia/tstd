import { Branch } from './branch.js';
import { Flat } from './flat.js';

type Value<B, K extends keyof B> = Parameters<Extract<B[K], (...args: never[]) => unknown>> extends [infer V] ? V : void;

type Goes<B, K extends keyof B> = Extract<ReturnType<Extract<B[K], (...args: never[]) => readonly unknown[]>>[number], keyof B>;

type To<B extends Lifecycle<B>, K extends keyof B> = { [E in Goes<B, K>]: (value: Value<B, E>) => State<B, E> };

type State<B extends Lifecycle<B>, K extends keyof B> = Flat<Branch<Extract<K, string | symbol>, Value<B, K>> & ([Goes<B, K>] extends [never] ? {} : { to: Flat<To<B, K>>; })>;

type Entry<B extends Lifecycle<B>, K extends keyof B> = Value<B, K> extends void ? [] : [value: Value<B, K>];

/** the blueprint of a machine, meant as a constraint: one factory per state, its parameter naming what that state carries and its result naming where it can go */
export type Lifecycle<B> = { [K in keyof B]: (value: never) => readonly (keyof B)[] };

/** the machine a lifecycle describes, entered at any state it declares */
export const init = <B extends Lifecycle<B>, K extends keyof B>(lifecycle: B, branch: K, ...value: Entry<B, K>) => {
  const all = lifecycle as Record<string, (value: never) => readonly string[]>;

  const at = (branch: string, value: unknown) => {
    const goes = all[branch](value as never);

    if (goes.length === 0) return { branch, value };

    const to: Record<string, unknown> = {};

    for (const next of goes) to[next] = (value: unknown) => at(next, value);
    return { branch, value, to };
  };

  return at(branch as string, (value as unknown[])[0]) as State<B, K>;
};
