import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { Brand } from './brand';

test('brand stuff', () => {
  // type branding is a very clever technique, but it's usually overengineered;
  // all we really need is the brand, not the branded type

  // this decouples the trait or requirement you're trying to mark from the runtime type
  // and makes it easier to involve brands in type algebra:
  type Truthy = Brand<'Truthy'>;
  type Trimmed = string & Brand<'Trimmed'>;
  type Valid = (number | Trimmed) & Truthy;

  // usually, branded types are used together with type assertions (using 'as')
  // but in tstd we prefer using brands together with type guards
  const number = (x: unknown) => typeof x === 'number';
  const truthy = (x: unknown): x is Truthy => Boolean(x);
  const trimmed = (x: unknown): x is Trimmed => typeof x === 'string' && x.trim() === x;

  // this way, boolean algebra and type algebra match perfectly:
  const valid = (x: unknown): x is Valid => (number(x) || trimmed(x)) && truthy(x);

  // now you can be very specific about function parameter types:
  const veryStrictFunction = (_: Valid) => { };

  // and you can only pass runtime-validated values without ever doing a type assertion:
  const x1 = 2;
  if (valid(x1)) veryStrictFunction(x1);
  else assert.fail();

  if (valid(0)) assert.fail();
  if (valid('')) assert.fail();
  if (valid(new Date())) assert.fail();
});
