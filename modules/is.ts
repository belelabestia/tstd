// This module is all about types.
// We have a few general definitions followed by a collection of branded types and a bunch of built-in type guards.
// Extend this collection by creating your own branded types and respective guards in your project.

import { Brand } from "./brand";

/** A type-narrowing function. */
export type TypeGuard<T> = (x: unknown) => x is T;

/** An object describing a structure. */
export type Schema = Record<string, TypeGuard<unknown>>;

/** The actual type coming out of a schema validation. */
export type Model<T extends Schema> = { [K in keyof T]: T[K] extends TypeGuard<infer U> ? U : never };

export type Truthy = Brand<'Truthy'>;
export type DateString = Branded<string>;

export type JsonValue =
  | string
  | number
  | boolean
  | null
  | undefined
  | JsonObject
  | JsonArray;

export type JsonObject = { [key: string]: JsonValue };
export type JsonArray = JsonValue[];
export type Json = JsonObject | JsonArray;

export const record = (x: unknown): x is Record<string, unknown> =>
  typeof x === 'object' &&
  x !== null;

export const array = (x: unknown): x is unknown[] =>
  Array.isArray(x);

export const model = <T extends Schema>(x: unknown, schema: T): x is { [K in keyof Model<T>]: Model<T>[K] } => {
  if (!record(x)) return false;

  for (const key in schema)
    if (!schema[key](x[key])) return false;

  return true;
};

export const or = <T extends TypeGuard<unknown>[]>(...guards: T) => (x: unknown): x is T[number] extends TypeGuard<infer U> ? U : never => {
  for (let i = 0; i < guards.length; i++)
    if (guards[i](x)) return true;

  return false;
};

export const and = <T extends TypeGuard<unknown>[]>(...guards: T) => (x: unknown): x is T[number] extends TypeGuard<infer U> ? U : never => {
  for (let i = 0; i < guards.length; i++)
    if (!guards[i](x)) return false;

  return true;
}

export const jsonValue = (x: unknown): x is JsonValue =>
  typeof x === 'string' ||
  typeof x === 'number' ||
  typeof x === 'boolean' ||
  x === null ||
  x === undefined ||
  jsonObject(x) ||
  jsonArray(x);

export const jsonObject = (x: unknown): x is JsonObject =>
  record(x) &&
  Object.entries(x).every(([k, v]) =>
    typeof k === 'string' &&
    jsonValue(v)
  );

export const jsonArray = (x: unknown): x is JsonArray =>
  Array.isArray(x) &&
  x.every(jsonValue);

export const json = (x: unknown): x is Json =>
  jsonObject(x) ||
  jsonArray(x);

export const truthyString = (x: unknown): x is string & Brand<'truthy'> =>
  typeof x === 'string' &&
  x.length > 0;

export const truthyNumber = (x: unknown): x is number & Brand<'truthy'> =>
  typeof x === 'number' &&
  x !== 0 &&
  !Number.isNaN(x);

export const dateString = (x: unknown): x is DateString => {
  if (!truthyString(x)) return false;

  const regex = /^\d{4}-\d{2}-\d{2}$/;
  if (!regex.test(x)) return false;

  const [year, month, day] = x.split('-').map(Number);
  const date = new Date(year, month - 1, day);

  return date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day;
};

export const $undefined = (x: unknown) => x === undefined;
