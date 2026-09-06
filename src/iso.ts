import { Brand } from './brand.js';
import * as is from './is.js';
import { make } from './result.js';

/** a calendar date, as `yyyy-mm-dd` */
export type Date = string & Brand<'Date'>;

/** a wall clock time, as `hh:mm:ss.sss` */
export type Time = string & Brand<'Time'>;

/** an instant, as `yyyy-mm-ddThh:mm:ss.sssZ` */
export type DateTime = string & Brand<'DateTime'>;

/** an amount of time, in milliseconds */
export type Duration = number & Brand<'Duration'>;

/** a number of milliseconds since the epoch that an instant can be built from */
export type Timestamp = number & Brand<'Timestamp'>;

/** the name of a time zone this runtime knows */
export type Zone = string & Brand<'Zone'>;

/** the canonical instant a timestamp points at, or nothing if there is none */
const canonical = (ms: number) => {
  if (!is.number(ms)) return;
  if (Math.abs(ms) > 8.64e15) return;

  const instance = make(Date, ms);
  if (instance.branch === 'error') return;

  return instance.value.toISOString();
};

export const timestamp = (x: unknown): x is Timestamp =>
  is.number(x) &&
  is.present(canonical(x));

export const datetime = (x: unknown): x is DateTime =>
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

export const zone = (x: unknown): x is Zone =>
  is.string(x) &&
  Intl.supportedValuesOf('timeZone').includes(x);

/** the instant a foreign spelling points at, or nothing if there is none */
export const parse = (x: string) => canonical(Date.parse(x)) as DateTime | undefined;

/** the instant a timestamp points at */
export const fromTimestamp = (x: Timestamp) => canonical(x) as DateTime;

/** the instant this code is running at */
export const now = () => fromTimestamp(Date.now() as Timestamp);

/** the milliseconds since the epoch an instant points at */
export const toTimestamp = (x: DateTime) => Date.parse(x) as Timestamp;

/**
 * the parts an instant is made of, as a zone reads them
 * the brand proves the zone is known, so building the formatter cannot fail
 */
const parts = (x: DateTime, zone: Zone) => {
  const format = make(Intl.DateTimeFormat, 'en-US', {
    timeZone: zone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    fractionalSecondDigits: 3
  }).value as Intl.DateTimeFormat;

  const out: Record<string, string> = {};

  for (const part of format.formatToParts(toTimestamp(x))) out[part.type] = part.value;
  return out;
};

/** the calendar date an instant falls on, in utc unless a zone says otherwise */
export const dateOf = (x: DateTime, zone?: Zone) => {
  if (is.absent(zone)) return x.slice(0, 10) as Date;

  const part = parts(x, zone);
  return `${part.year}-${part.month}-${part.day}` as Date;
};

/** the wall clock time an instant falls at, in utc unless a zone says otherwise */
export const timeOf = (x: DateTime, zone?: Zone) => {
  if (is.absent(zone)) return x.slice(11, 23) as Time;

  const part = parts(x, zone);
  return `${part.hour}:${part.minute}:${part.second}.${part.fractionalSecond}` as Time;
};

/** the instant a duration away from another, or nothing if there is none */
export const add = (x: DateTime, d: Duration) => canonical(toTimestamp(x) + d) as DateTime | undefined;

/** how long it takes to get from one instant to another */
export const diff = (from: DateTime, to: DateTime) => (toTimestamp(to) - toTimestamp(from)) as Duration;

export const millis = (x: number) => x as Duration;

export const seconds = (x: number) => x * 1000 as Duration;

export const minutes = (x: number) => x * 60000 as Duration;

export const hours = (x: number) => x * 3600000 as Duration;

export const days = (x: number) => x * 86400000 as Duration;

export const weeks = (x: number) => x * 604800000 as Duration;
