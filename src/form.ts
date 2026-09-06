import { Flat } from './flat.js';
import * as is from './is.js';
import * as iso from './iso.js';

/** the two forms one value takes, plus the guard that proves the encoded one */
export type Field<E extends is.Json, D> = {
  is: is.TypeGuard<E>,
  decode: (x: E) => D,
  encode: (x: D) => E;
};

/**
 * any field at all, meant as a constraint
 * a parameter is contravariant, so `never` there is what accepts every field there is
 */
export type Fields = Record<string, {
  is: is.TypeGuard<unknown>,
  decode: (x: never) => unknown,
  encode: (x: never) => is.Json;
}>;

/** the encoded form: what travels and what gets stored */
export type Encoded<T extends Fields> = Flat<{ [K in keyof T]: T[K] extends Field<infer E, infer _> ? E : never }>;

/** the decoded form: what you carry in memory */
export type Decoded<T extends Fields> = Flat<{ [K in keyof T]: T[K] extends Field<infer _, infer D> ? D : never }>;

/** a field that already reads the same on both sides */
export const plain = <E extends is.Json>(guard: is.TypeGuard<E>) => ({
  is: guard,
  decode: (x: E) => x,
  encode: (x: E) => x
});

/** a field that stores an instant the way a zone writes it down, rather than the way utc does */
export const zoned = (zone: iso.Zone) => ({
  is: (x: unknown): x is iso.Local & iso.Unambiguous => iso.local(x) && iso.unambiguous(x, zone),
  decode: (x: iso.Local & iso.Unambiguous) => iso.fromLocal(x, zone),
  encode: (x: iso.DateTime & iso.Unambiguous) => iso.localOf(x, zone)
});

export const model = <T extends Fields>(x: unknown, forms: T): x is Encoded<T> => {
  if (!is.record(x)) return false;
  if (is.array(x)) return false;

  for (const key in forms) if (!forms[key].is(x[key])) return false;
  return true;
};

export const decode = <T extends Fields>(x: Encoded<T>, forms: T) => {
  const out = {} as Decoded<T>;

  for (const key in forms) out[key] = forms[key].decode(x[key] as never) as Decoded<T>[typeof key];
  return out;
};

export const encode = <T extends Fields>(x: Decoded<T>, forms: T) => {
  const out = {} as Encoded<T>;

  for (const key in forms) out[key] = forms[key].encode(x[key] as never) as Encoded<T>[typeof key];
  return out;
};

/** a field for a model nested in another */
export const nest = <T extends Fields>(forms: T) => ({
  is: (x: unknown): x is Encoded<T> => model(x, forms),
  decode: (x: Encoded<T>) => decode(x, forms),
  encode: (x: Decoded<T>) => encode(x, forms)
});
