import { Flat } from './flat.js';
import * as is from './is.js';

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
  as?: string;
}>;

/** the encoded form: what travels and what gets stored */
export type Encoded<T extends Fields> = Flat<{ [K in keyof T]: T[K] extends Field<infer E, infer _> ? E : never }>;

/** the decoded form: what you carry in memory, under the keys it carries there */
export type Decoded<T extends Fields> = Flat<{ [K in keyof T as T[K] extends { as: infer A extends string } ? A : K]: T[K] extends Field<infer _, infer D> ? D : never }>;

/** a field that already reads the same on both sides */
export const plain = <E extends is.Json>(guard: is.TypeGuard<E>) => ({
  is: guard,
  decode: (x: E) => x,
  encode: (x: E) => x
});

/** a field that lands under another key in memory than on the wire */
export const as = <E extends is.Json, D, A extends string>(field: Field<E, D>, as: A) => ({ ...field, as });

/** whether a value is the encoded form of a record of fields */
export const model = <T extends Fields>(x: unknown, forms: T): x is Encoded<T> => {
  if (!is.record(x)) return false;
  if (is.array(x)) return false;

  for (const key in forms) if (!forms[key].is(x[key])) return false;
  return true;
};

/** whether a value is a list of the encoded form, every element of it */
export const models = <T extends Fields>(x: unknown, forms: T): x is Encoded<T>[] => {
  if (!is.array(x)) return false;

  for (let i = 0; i < x.length; i++) if (!model(x[i], forms)) return false;
  return true;
};

/** the key a field carries in memory, which is its wire key unless renamed */
const memory = (field: Fields[string], wire: string) =>
  'as' in field && is.string(field.as) ? field.as : wire;

/** the decoded form of an encoded one, which cannot fail because the guard already ran */
export const decode = <T extends Fields>(x: Encoded<T>, forms: T) => {
  const out: Record<string, unknown> = {};

  for (const key in forms) out[memory(forms[key], key)] = forms[key].decode(x[key] as never);
  return out as Decoded<T>;
};

/** the encoded form of a decoded one, ready for json */
export const encode = <T extends Fields>(x: Decoded<T>, forms: T) => {
  const out: Record<string, unknown> = {};
  const held = x as Record<string, unknown>;

  for (const key in forms) out[key] = forms[key].encode(held[memory(forms[key], key)] as never);
  return out as Encoded<T>;
};

/** a field for a model nested in another */
export const nest = <T extends Fields>(forms: T) => ({
  is: (x: unknown): x is Encoded<T> => model(x, forms),
  decode: (x: Encoded<T>) => decode(x, forms),
  encode: (x: Decoded<T>) => encode(x, forms)
});
