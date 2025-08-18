import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import * as is from './is';

/*
  schema validation doesn't have to be a complicated task;
  thanks to ts type narrowing we can use type guards as lightweight schema validators
*/

test('safely navigate the unknown', () => {
  // here's a bunch of unknown variables
  const a: unknown = 1, b: unknown = '_';

  // let's narrow them down
  if (!is.number(a)) assert.fail();
  if (!is.string(b)) assert.fail();

  // now a is a number, and b is a string
  assert.equal(a, 1);
  assert.equal(b, '_');
});

test('validate model schemas', () => {
  // here's a more complex unkown variable
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
  };

  if (!is.model(a, schema)) assert.fail();

  // look at the type of a
  assert.equal(a.a, 1);
  assert.equal(a.b.b, false);

  // you can also validate an array of models
  assert.ok(is.models([a], schema));
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
  const isBBool = (x: unknown) => x === 'a' || x === 'b' || x === 'c';
  assert.ok(isBBool('a'));
  assert.ok(!isBBool('d'));

  // this won't be inferred
  const isBArrIncl = (x: unknown): x is 'a' | 'b' | 'c' => is.string(x) && ['a', 'b', 'c'].includes(x);
  assert.ok(isBArrIncl('a'));
  assert.ok(!isBArrIncl('d'));

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
