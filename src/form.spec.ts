import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import * as form from './form.js';
import * as is from './is.js';
import * as iso from './iso.js';

/*
  the third job of a codec

  a codec like DateFromNumber does three things: it validates, it converts forward,
  and it remembers how to convert back. we pull validation out, since is already owns it.

  the other two are inverses, and inverses drift apart if you declare them apart;
  so a form is the pairing, written once.

  a form isn't a codec: by the time decode runs the value is already narrowed,
  so it can't fail and it returns unboxed. that's why there's no Either here, and no combinators.
*/

// on the wire an instant is a timestamp; in memory we would rather read it
const instant = {
  is: iso.timestamp,
  decode: (x: iso.Timestamp) => iso.fromTimestamp(x),
  encode: (x: iso.DateTime) => iso.toTimestamp(x)
} satisfies form.Field<iso.Timestamp, iso.DateTime>;

// declare the two forms of a model once, and both types come out of it
const user = {
  id: form.plain(is.string),
  seen: instant
} satisfies form.Fields;

test('declare a model once, get both of its forms', () => {
  // this is what you store and what you send
  type encoded = form.Encoded<typeof user>;

  // and this is what you work with
  type decoded = form.Decoded<typeof user>;

  const stored: encoded = { id: 'a', seen: 1704164645006 as iso.Timestamp };
  const held: decoded = { id: 'a', seen: '2024-01-02T03:04:05.006Z' as iso.DateTime };

  assert.equal(form.decode(stored, user).seen, held.seen);
  assert.deepEqual(form.encode(held, user), stored);
});

test('narrow first, then map both ways', () => {
  // here is something that just came out of a database
  const x: unknown = JSON.parse('{"id":"a","seen":1704164645006}');

  // narrowing is still the only step that can fail
  if (!form.model(x, user)) assert.fail();

  // so decoding is total: no result, no branch, just the value
  const held = form.decode(x, user);
  assert.equal(iso.dateOf(held.seen), '2024-01-02');

  // and encoding takes you back to something json can carry
  assert.deepEqual(JSON.parse(JSON.stringify(form.encode(held, user))), x);
});

test('refuse what does not fit the encoded form', () => {
  // a decoded value is not an encoded one, however similar it looks
  assert.ok(!form.model({ id: 'a', seen: '2024-01-02T03:04:05.006Z' }, user));

  // and a missing field is still a missing field
  assert.ok(!form.model({ id: 'a' }, user));
  assert.ok(!form.model([], user));
});

test('narrow a stored list, then map it', () => {
  // a database hands back rows, not one row
  const x: unknown = JSON.parse('[{"id":"a","seen":0},{"id":"b","seen":1704164645006}]');

  // `models` is to `model` what `is.models` is to `is.model`: the same guard, once per element
  if (!form.models(x, user)) assert.fail();

  // so every element is proven, and mapping the list is a loop over total calls
  const held = x.map(row => form.decode(row, user));

  assert.deepEqual(held, [
    { id: 'a', seen: '1970-01-01T00:00:00.000Z' },
    { id: 'b', seen: '2024-01-02T03:04:05.006Z' }
  ]);

  // one bad row refuses the whole list, and a row is still not a list
  assert.ok(!form.models([{ id: 'a', seen: 0 }, { id: 'b' }], user));
  assert.ok(!form.models({ id: 'a', seen: 0 }, user));
});

test('nest a model in another, twice over', () => {
  // a nested model is a field whose two directions call the walkers on the model;
  // that is always the same three lines with the same arguments, so `nest` writes them,
  // and nesting nests, because a nested model is a field like any other
  const audit = {
    when: instant,
    of: form.nest({
      at: instant,
      by: form.nest(user)
    })
  } satisfies form.Fields;

  // this is what a database gives back
  const x: unknown = JSON.parse(`{
    "when": 1704164645006,
    "of": {
      "at": 1704078245006,
      "by": { "id": "a", "seen": 1700000000000 }
    }
  }`);

  if (!form.model(x, audit)) assert.fail();

  // narrowing reached the bottom, so decoding still cannot fail
  const held = form.decode(x, audit);

  // and this is the same object with every instant readable, at every depth
  assert.deepEqual(held, {
    when: '2024-01-02T03:04:05.006Z',
    of: {
      at: '2024-01-01T03:04:05.006Z',
      by: { id: 'a', seen: '2023-11-14T22:13:20.000Z' }
    }
  });

  // inference reached the bottom too: this is a DateTime, three levels down
  assert.equal(iso.dateOf(held.of.by.seen), '2023-11-14');

  // and encoding puts it back exactly as it was stored
  assert.deepEqual(form.encode(held, audit), x);

  // one wrong field at the bottom is enough to refuse the whole thing
  const wrong = { when: 0, of: { at: 0, by: { id: 'a', seen: '1970-01-01T00:00:00.000Z' } } };
  assert.ok(!form.model(wrong, audit));
});

/*
  a field is four lines, so tstd ships none: here's the one for an instant stored
  the way a zone writes it down, rather than the way utc does.

  a zone is a value, so the factory takes one and closes over it; the guard is an ordinary
  function, which is how it knows about daylight saving, and the brand names the zone it checked.

  fromLocal admits absence, because a brand pins its zone only when that zone is a literal;
  here the guard ran against this very zone, so the closure is the proof and the cast says so.
*/
const zoned = <Z extends string>(zone: Z & iso.Zone) => ({
  is: (x: unknown): x is iso.Local & iso.Unambiguous<Z> => iso.local(x) && iso.unambiguous(x, zone),
  decode: (x: iso.Local & iso.Unambiguous<Z>) => iso.fromLocal(x, zone) as iso.DateTime & iso.Unambiguous<Z>,
  encode: (x: iso.DateTime & iso.Unambiguous<Z>) => iso.localOf(x, zone)
});

test('store an instant as a zone writes it, not as utc does', () => {
  const rome = 'Europe/Rome';
  if (!iso.zone(rome)) assert.fail();

  const booking = {
    id: form.plain(is.string),
    starts: zoned(rome)
  } satisfies form.Fields;

  // this is what the database holds: midnight and a half, as rome writes it
  const x: unknown = JSON.parse('{"id":"a","starts":"2024-01-02T00:30:00.000"}');
  if (!form.model(x, booking)) assert.fail();

  // decoding is total, so the instant comes out unboxed, and it is the day before in utc
  const held = form.decode(x, booking);
  assert.equal(held.starts, '2024-01-01T23:30:00.000Z');
  assert.equal(iso.dateOf(held.starts), '2024-01-01');

  // and encoding writes it back exactly as it was stored
  assert.deepEqual(form.encode(held, booking), x);
});

test('refuse a local spelling that the zone does not name once', () => {
  const rome = 'Europe/Rome';
  if (!iso.zone(rome)) assert.fail();

  const booking = { starts: zoned(rome) } satisfies form.Fields;

  // the guard owns every failure there is, so it is the guard that knows about daylight saving:
  // this hour never happened in rome, and this one happened twice
  assert.ok(!form.model({ starts: '2024-03-31T02:30:00.000' }, booking));
  assert.ok(!form.model({ starts: '2024-10-27T02:30:00.000' }, booking));

  // an instant is not a local spelling either, however similar it looks
  assert.ok(!form.model({ starts: '2024-01-02T00:30:00.000Z' }, booking));

  // what is left is a value already proven to name one instant, so decoding cannot fail
  const x: unknown = { starts: '2024-10-27T03:30:00.000' };
  if (!form.model(x, booking)) assert.fail();
  assert.equal(form.decode(x, booking).starts, '2024-10-27T02:30:00.000Z');
});

/*
  a wire key is not always a memory key

  databases love snake_case and memory loves camelCase, but the pairing still has to be
  declared once: form.as carries the memory key alongside the field, so Encoded keeps the
  wire spelling and Decoded answers under the memory one, and the two walkers rename both ways.
*/
const stored = {
  is: iso.timestamp,
  decode: (x: iso.Timestamp) => iso.fromTimestamp(x),
  encode: (x: iso.DateTime) => iso.toTimestamp(x)
};

const row = {
  id: form.plain(is.string),
  created_at: form.as(stored, 'createdAt')
} satisfies form.Fields;

test('carry a field under another key in memory', () => {
  // the wire spells it with an underscore and memory does not
  type encoded = form.Encoded<typeof row>;
  type decoded = form.Decoded<typeof row>;

  const wire: encoded = { id: 'a', created_at: 1704164645006 as iso.Timestamp };
  const held: decoded = { id: 'a', createdAt: '2024-01-02T03:04:05.006Z' as iso.DateTime };

  // the guard still reads the wire, so a decoded value is not an encoded one
  // @ts-expect-error it does not even typecheck as one
  const bad: encoded = held;
  assert.ok(!form.model(bad, row));

  if (!form.model(wire, row)) assert.fail();

  // decoding renames, and encoding puts the wire spelling back
  assert.deepEqual(form.decode(wire, row), held);
  assert.deepEqual(form.encode(held, row), wire);

  // the wire spelling does not survive decoding, which is also what keeps the rename honest:
  // were `as` widened to string, this access would typecheck through an index signature
  // @ts-expect-error there is no created_at in memory
  const kept = held.created_at;
  assert.ok(is.none(kept));

  // and the renamed key carries the domain type, not the wire one
  const at: iso.DateTime = form.decode(wire, row).createdAt;
  assert.equal(iso.dateOf(at), '2024-01-02');
});
