import { Brand } from './brand.js';
import * as is from './is.js';

/** a calendar date, as `yyyy-mm-dd` */
export type Date = string & Brand<'Date'>;

/** a wall clock time, as `hh:mm:ss.sss` */
export type Time = string & Brand<'Time'>;

/** an instant, as `yyyy-mm-ddThh:mm:ss.sssZ` */
export type Datetime = string & Brand<'Datetime'>;

/** an amount of time, in milliseconds */
export type Duration = number & Brand<'Duration'>;

/** a number of milliseconds since the epoch that an instant can be built from */
export type Timestamp = number & Brand<'Timestamp'>;

/** the canonical instant a timestamp points at, or nothing if there is none */
const canonical = (ms: number) => {
  if (!is.number(ms)) return;
  if (Math.abs(ms) > 8.64e15) return;

  return new Date(ms).toISOString();
};

export const timestamp = (x: unknown): x is Timestamp =>
  is.number(x) &&
  is.present(canonical(x));

export const datetime = (x: unknown): x is Datetime =>
  is.string(x) &&
  canonical(Date.parse(x)) === x;

export const date = (x: unknown): x is Date =>
  is.string(x) &&
  canonical(Date.parse(x)) === `${x}T00:00:00.000Z`;

export const time = (x: unknown): x is Time =>
  is.string(x) &&
  canonical(Date.parse(`1970-01-01T${x}Z`)) === `1970-01-01T${x}Z`;

export const duration = (x: unknown): x is Duration =>
  is.number(x);

/** the instant this code is running at */
export const now = () => new Date().toISOString() as Datetime;

/** the instant a timestamp points at */
export const fromTimestamp = (x: Timestamp) => new Date(x).toISOString() as Datetime;

/** the milliseconds since the epoch an instant points at */
export const toTimestamp = (x: Datetime) => Date.parse(x) as Timestamp;

/** the calendar date an instant falls on */
export const dateOf = (x: Datetime) => x.slice(0, 10) as Date;

/** the wall clock time an instant falls at */
export const timeOf = (x: Datetime) => x.slice(11, 23) as Time;

/** the instant a duration away from another, or nothing if there is none */
export const add = (x: Datetime, d: Duration) => canonical(toTimestamp(x) + d) as Datetime | undefined;

/** how long it takes to get from one instant to another */
export const diff = (from: Datetime, to: Datetime) => (toTimestamp(to) - toTimestamp(from)) as Duration;

export const millis = (x: number) => x as Duration;

export const seconds = (x: number) => x * 1000 as Duration;

export const minutes = (x: number) => x * 60000 as Duration;

export const hours = (x: number) => x * 3600000 as Duration;

export const days = (x: number) => x * 86400000 as Duration;
