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

  // a foreign spelling still points at an instant, so normalising it loses nothing;
  // it just has to be asked for, rather than let through a guard
  assert.equal(iso.parse('2024-01-02T04:04:05.006+01:00'), '2024-01-02T03:04:05.006Z');
  assert.equal(iso.parse('2024-01-02T03:04:05Z'), '2024-01-02T03:04:05.000Z');

  // and a spelling that points at nothing is absent, not an error worth explaining
  assert.ok(is.absent(iso.parse('the day before yesterday')));
});

test('read the calendar in a zone', () => {
  // an instant is absolute, but the day it falls on is not:
  // that question has no answer until someone names a zone
  const x = '2024-01-01T23:30:00.000Z';
  if (!iso.datetime(x)) assert.fail();

  // so the operations that need one take it as an argument, the way a schema is taken;
  // note the zone has to be a variable: narrowing applies to references, not to literals
  const rome = 'Europe/Rome';
  if (!iso.zone(rome)) assert.fail();

  // in rome it is already the second, half an hour past midnight
  assert.equal(iso.dateOf(x, rome), '2024-01-02');
  assert.equal(iso.timeOf(x, rome), '00:30:00.000');

  // while leaving the zone out answers in utc, which is the only answer that needs no decision
  assert.equal(iso.dateOf(x), '2024-01-01');
  assert.equal(iso.timeOf(x), '23:30:00.000');

  // a zone this runtime does not know never gets past the guard
  assert.ok(!iso.zone('Middle/Earth'));
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

test('refuse a local spelling the zone does not name once', () => {
  const rome = 'Europe/Rome';
  if (!iso.zone(rome)) assert.fail();

  // a local date and time is a spelling with no zone in it, so it is not an instant yet
  const x = '2024-01-02T00:30:00.000';
  if (!iso.local(x)) assert.fail();

  // the zone is what turns it into one, and only the guard can say whether it does
  if (!iso.unambiguous(x, rome)) assert.fail();
  assert.equal(iso.fromLocal(x, rome), '2024-01-01T23:30:00.000Z');

  // when the clock goes forward that spelling never happened
  const skipped = '2024-03-31T02:30:00.000';
  if (!iso.local(skipped)) assert.fail();
  assert.ok(!iso.unambiguous(skipped, rome));

  // and when it goes back the same spelling happens twice, which is a choice this library declines
  const twice = '2024-10-27T02:30:00.000';
  if (!iso.local(twice)) assert.fail();
  assert.ok(!iso.unambiguous(twice, rome));

  // an hour later it is one spelling again
  const once = '2024-10-27T03:30:00.000';
  if (!iso.local(once)) assert.fail();
  assert.ok(iso.unambiguous(once, rome));
  assert.equal(iso.fromLocal(once, rome), '2024-10-27T02:30:00.000Z');

  // and a spelling with a zone already in it is not a local one
  assert.ok(!iso.local('2024-01-02T00:30:00.000Z'));
});

test('write an instant down the way a zone writes it', () => {
  const rome = 'Europe/Rome';
  if (!iso.zone(rome)) assert.fail();

  const x = '2024-01-01T23:30:00.000Z';
  if (!iso.datetime(x)) assert.fail();

  // the same guard reads the other way round: this instant is the only one rome spells like that
  if (!iso.unambiguous(x, rome)) assert.fail();
  assert.equal(iso.localOf(x, rome), '2024-01-02T00:30:00.000');

  // so the two are inverses, and the brand is what says they are
  assert.equal(iso.fromLocal(iso.localOf(x, rome), rome), x);

  // an instant inside the repeated hour has no spelling that names it back
  const repeated = '2024-10-27T00:30:00.000Z';
  if (!iso.datetime(repeated)) assert.fail();
  assert.ok(!iso.unambiguous(repeated, rome));

  // reading a part of it is still fine: a reading is not a round trip
  assert.equal(iso.timeOf(repeated, rome), '02:30:00.000');
});
