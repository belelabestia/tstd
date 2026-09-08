import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import * as is from './is.js';

/*
  schema validation doesn't have to be a complicated task;
  thanks to ts type narrowing we can use type guards as lightweight schema validators
*/

test('safely navigate the unknown', () => {
  // here's a bunch of unknown variables
  const a: unknown = 1;
  const b: unknown = '_';

  // let's narrow them down
  if (!is.number(a)) assert.fail();
  if (!is.string(b)) assert.fail();

  // now a is a number, and b is a string
  assert.equal(a, 1);
  assert.equal(b, '_');
});

test('demand a finite number', () => {
  // is.number rejects nan and infinity, so what comes out of it is branded;
  // that way a function can demand a number that has actually been checked
  const half = (x: is.Finite) => x / 2;

  const a: unknown = 1;
  if (!is.number(a)) assert.fail();

  assert.equal(half(a), 0.5);
  assert.ok(!is.number(NaN));
  assert.ok(!is.number(Infinity));
});

test('refuse what json notation cannot express', () => {
  // `Json` is a notation, so the guard asks what the notation can spell,
  // not what JSON.stringify happens to tolerate
  assert.ok(is.json({ a: 1, b: ['_', true, null] }));

  // a date does not break stringify, it comes back a string;
  // that is not a value the notation can spell, so it is not json
  assert.ok(!is.json(new Date()));
  assert.ok(!is.json({ a: new Date() }));

  // the same goes for anything else carrying a prototype of its own,
  // which stringify quietly flattens to `{}`
  assert.ok(!is.json(new Map()));
  assert.ok(!is.json(new Set([1])));

  // nan and infinity come back as null, which is why is.number refuses them too
  assert.ok(!is.json(NaN));
  assert.ok(!is.json(Infinity));

  // a record with no prototype at all still spells a plain object
  const bare = Object.create(null);
  bare.a = 1;
  assert.ok(is.json(bare));
});

test('validate model schemas', () => {
  // here's a more complex unknown variable
  const a: unknown = {
    a: 1,
    b: {
      a: '_',
      b: false
    }
  };

  // let's validate it
  const schema = {
    a: is.number,
    b: (x: unknown) => is.model(x, {
      a: is.string,
      b: is.boolean
    })
  } satisfies is.Schema;

  if (!is.model(a, schema)) assert.fail();

  // look at the type of a
  assert.equal(a.a, 1);
  assert.equal(a.b.b, false);

  // you can also validate an array of models
  assert.ok(is.models([a], schema));

  // an array is never a model, even though `typeof [] === 'object'`
  assert.ok(!is.model([], schema));
});

test('validate combined types', () => {
  // in typescript you can algebraically combine types
  type Union = string | number;

  // there isn't a built-in `union` in tstd
  // however, combining type guards is straightforward
  const isUnion = (x: unknown): x is Union => is.string(x) || is.number(x);
  assert.ok(isUnion('a'));
  assert.ok(isUnion(1));
  assert.ok(!isUnion(false));

  // same goes for literals
  // you're free to implement as you wish
  // typescript will infer this
  const isAbc = (x: unknown) => x === 'a' || x === 'b' || x === 'c';
  assert.ok(isAbc('a'));
  assert.ok(!isAbc('d'));

  // this won't be inferred
  const isAbcIncl = (x: unknown): x is 'a' | 'b' | 'c' => is.string(x) && ['a', 'b', 'c'].includes(x);
  assert.ok(isAbcIncl('a'));
  assert.ok(!isAbcIncl('d'));

  // you can combine as you wish
  // as long as you use boolean logic, typescript will infer
  const isCombined = (x: unknown) =>
    x === null || (
      is.model(x, { message: is.string }) &&
      is.model(x, {
        payload: x => is.models(x, { data: is.number })
      })
    );

  assert.ok(isCombined(null));
  assert.ok(isCombined({ message: 'hello', payload: [{ data: 1 }, { data: 2 }] }));
  assert.ok(!isCombined({ message: 1 }));
  assert.ok(!isCombined({ message: 'hello', payload: [{ data: [1, 2] }] }));
});
