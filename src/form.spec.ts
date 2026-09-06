import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import * as form from './form.js';
import * as is from './is.js';
import * as iso from './iso.js';

/*
  the third job of a codec

  a codec like `DateFromNumber` bundles three jobs: it validates, it converts forward,
  and it remembers how to convert back. pulling validation out is what makes everything
  downstream total, and `is` already owns that job.

  the other two are inverses of each other, and two functions that must stay inverses
  have to be declared in one place, or they drift apart the first time a field is renamed.
  that pairing is a form.

  a form is not a codec, because failure does not live in it: by the time `decode` runs,
  the value has already been narrowed, so it cannot fail and returns unboxed.
  that is also why there is no `Either` here, no error accumulation
  and none of the combinator tower those two things force on a library.
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

test('nest by calling, not by combining', () => {
  // a form for a whole model is just a form whose two directions call the walkers
  const session = {
    at: instant,
    by: {
      is: (x: unknown): x is form.Encoded<typeof user> => form.model(x, user),
      decode: (x: form.Encoded<typeof user>) => form.decode(x, user),
      encode: (x: form.Decoded<typeof user>) => form.encode(x, user)
    }
  } satisfies form.Fields;

  const x: unknown = JSON.parse('{"at":0,"by":{"id":"a","seen":0}}');
  if (!form.model(x, session)) assert.fail();

  const held = form.decode(x, session);
  assert.equal(held.by.seen, '1970-01-01T00:00:00.000Z');
  assert.deepEqual(form.encode(held, session), x);
});
