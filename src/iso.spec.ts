import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import * as is from './is.js';
import * as iso from './iso.js';

/*
  narrow, then map

  schema validation gets complicated when a library tries to validate and transform in one step;
  a codec like `NumberFromString` answers two very different questions at once:
  is this string parseable, and what is the number.

  in tstd those are two steps, and the brand is the receipt the first one hands to the second:
  narrowing owns every failure, so mapping receives a value that has already been proven
  and can return it unboxed.

  that leaves nothing to transform for a date: an instant is a string, both on the wire and in memory,
  and the only thing a date module owes you is functions that manipulate it without ever mutating it.

  `iso` is named after the notation, exactly like `Json` is: these are all iso 8601 lexical forms.

  the global `Date` never escapes this module: it gets built with `make`, which owns every
  instantiation there is, and only its canonical string comes back out.
*/

test('narrow before you map', () => {
  // here's something that just came in from outside
  const x: unknown = '2024-01-02T03:04:05.006Z';

  // narrowing is where every failure lives
  if (!iso.datetime(x)) assert.fail();

  // from here on nothing can fail, so nothing gets boxed
  assert.equal(iso.dateOf(x), '2024-01-02');
  assert.equal(iso.timeOf(x), '03:04:05.006');
});

test('reject anything that is not canonical', () => {
  // an instant has exactly one spelling, so an offset is not one of ours
  assert.ok(!iso.datetime('2024-01-02T04:04:05.006+01:00'));

  // neither is a missing millisecond
  assert.ok(!iso.datetime('2024-01-02T03:04:05Z'));

  // nor a date that never happened
  assert.ok(!iso.date('2024-02-31'));
  assert.ok(!iso.time('25:00:00.000'));

  // the canonical forms pass
  assert.ok(iso.datetime('2024-01-02T03:04:05.006Z'));
  assert.ok(iso.date('2024-01-02'));
  assert.ok(iso.time('03:04:05.006'));

  // to accept a foreign spelling, parse it into a timestamp and narrow that
  const parsed = Date.parse('2024-01-02T04:04:05.006+01:00');
  if (!iso.timestamp(parsed)) assert.fail();

  assert.equal(iso.fromTimestamp(parsed), '2024-01-02T03:04:05.006Z');
});

test('measure and move in time', () => {
  const from = '2024-01-02T00:00:00.000Z';
  const to = '2024-01-03T06:00:00.000Z';

  if (!iso.datetime(from)) assert.fail();
  if (!iso.datetime(to)) assert.fail();

  // a duration is milliseconds, so it is a number you can read
  assert.equal(iso.diff(from, to), iso.hours(30));
  assert.equal(iso.days(1), 86400000);
  assert.equal(iso.weeks(1), iso.days(7));

  // and moving is total except at the very edge of representable time,
  // which is absence, not an error worth explaining
  assert.equal(iso.add(from, iso.days(1)), '2024-01-03T00:00:00.000Z');
  assert.ok(is.absent(iso.add(from, iso.days(1e12))));
});

test('carry instants in models, never dates', () => {
  // an iso guard is just a type guard, so it drops into a schema
  const schema = {
    id: is.string,
    created: iso.datetime,
    every: iso.duration
  } satisfies is.Schema;

  const x: unknown = JSON.parse('{"id":"a","created":"2024-01-02T03:04:05.006Z","every":86400000}');
  if (!is.model(x, schema)) assert.fail();

  // the model is `Json` by construction, so it survives a round trip untouched
  assert.deepEqual(JSON.parse(JSON.stringify(x)), x);

  // and it is still branded, so it maps without being validated again
  assert.equal(iso.dateOf(x.created), '2024-01-02');
});
