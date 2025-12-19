/**
 * in tstd we only care about json types
 * everything else is considered custom 
 */
export type Json =
  | string
  | number
  | boolean
  | null
  | undefined
  | { [key: string]: Json; }
  | Json[];

/** a type-narrowing function */
export type TypeGuard<T> = (x: unknown) => x is T;

/** an object describing a structure */
export type Schema = Record<string, TypeGuard<unknown>>;

/** the actual validated type */
export type Model<T extends Schema> = { [K in keyof T]: T[K] extends TypeGuard<infer U> ? U : never };

export const present = (x: unknown): x is {} =>
  x !== undefined &&
  x !== null;

export const absent = (x: unknown): x is undefined | null =>
  x === undefined ||
  x === null;

export const boolean = (x: unknown): x is boolean =>
  typeof x === 'boolean';

export const number = (x: unknown): x is number =>
  typeof x === 'number' &&
  Number.isFinite(x);

export const string = (x: unknown): x is string =>
  typeof x === 'string';

export const record = (x: unknown): x is Record<string, unknown> =>
  typeof x === 'object' &&
  x !== null;

export const array = (x: unknown): x is unknown[] =>
  Array.isArray(x);

export const json = (x: unknown): x is Json =>
  typeof x === 'string' ||
  typeof x === 'number' ||
  typeof x === 'boolean' || (
    record(x) &&
    Object.values(x).every(json)
  ) || (
    array(x) &&
    x.every(json)
  ) ||
  absent(x);

export const model = <T extends Schema>(x: unknown, schema: T): x is { [K in keyof Model<T>]: Model<T>[K] } => {
  if (!record(x)) return false;

  for (const key in schema) if (!schema[key](x[key])) return false;
  return true;
};

export const models = <T extends Schema>(x: unknown, schema: T): x is { [K in keyof Model<T>]: Model<T>[K] }[] => {
  if (!array(x)) return false;

  for (let i = 0; i < x.length; i++) if (!model(x[i], schema)) return false;
  return true;
};
