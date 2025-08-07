import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import * as defer from './defer';

/*
  this is cutting-edge stuff

  js/ts have an approved proposal for the `using` keyword,
  but its implementation is still not widespread

  see also: use.ts
*/

test('defer cleanup', async () => {
  // here i have some variables
  let a: number, b: number;

  {
    // i want to clean them up when the scope ends
    using _resetA = defer.sync(() => a = 0);
    await using _resetB = defer.async(async () => b = 0);

    // now i can do whatever i want with them
    a = b = 42;
    assert.equal(a, 42);
    assert.equal(b, 42);
  }

  // resources will be cleaned up right after
  assert.equal(a, 0);
  assert.equal(b, 0);
});
