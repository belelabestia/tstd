import { branch, Branch } from './branch.js';
import { Flat } from './flat.js';
import * as is from './is.js';

type Declares<T> = T extends (...args: never[]) => infer D ? D : T;

type Carries<D> = { [K in keyof D]: Parameters<Extract<D[K], (...args: never[]) => unknown>> extends [infer V] ? V : void };

type Protocol<B> = { [K in keyof B]: (value: never) => readonly [keyof B, ...(keyof B)[]] | void };

type Tag<K> = Extract<K, string | symbol>;

type Goes<B, K extends keyof B> = Extract<Extract<ReturnType<Extract<B[K], (...args: never[]) => unknown>>, readonly unknown[]>[number], keyof B>;

type To<B extends Protocol<B>, K extends keyof B> = { [E in Goes<B, K>]: (value: Carries<B>[E]) => State<B, E> };

type State<B extends Protocol<B>, K extends keyof B, V = Carries<B>[K]> = Flat<Branch<Tag<K>, V> & ([Goes<B, K>] extends [never] ? {} : { to: Flat<To<B, K>>; })>;

type Takes<B extends Protocol<B>, K extends keyof B> = Carries<B>[K] extends void ? [] : [value: Carries<B>[K]];

type Factory<B extends Protocol<B>, K extends keyof B> = unknown extends Carries<B>[K] ? <X = void>(value?: X) => State<B, K, X> : (...value: Takes<B, K>) => State<B, K>;

/** the type a declaration describes, written as an object or as a function returning one */
export type Model<T> = Carries<Declares<T>>;

/** what a set of factories builds, all of it or the one named */
export type Of<F extends Record<string | symbol, (...args: never[]) => unknown>, K extends keyof F = keyof F> = ReturnType<F[K]>;

/** a factory per branch, entering the union or machine at that branch */
export const init = <B extends Protocol<B>>(protocol: B) => {
  const all = protocol as Record<string, (value: never) => readonly string[] | undefined>;

  const at = (tag: string, value: unknown) => {
    const goes = all[tag](value as never);

    if (is.none(goes)) return branch(tag, value);

    const to: Record<string, unknown> = {};

    for (const next of goes) to[next] = (value: unknown) => at(next, value);
    return { ...branch(tag, value), to };
  };

  const out: Record<string, unknown> = {};

  for (const key in protocol) out[key] = (value: unknown) => at(key, value);
  return out as Flat<{ [K in keyof B]: Factory<B, K> }>;
};
