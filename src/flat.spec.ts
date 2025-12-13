import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { Flat } from './flat';

test('flatten complex types', () => {
  // collapse comples types to readable object literals
  type Complicated<T> = Pick<Record<number, T[]>, 1 | 2 | 3>;
  interface A extends Complicated<{ a: number, b: string; }> { }

  const a: Flat<A> = { 1: [], 2: [{ a: 1, b: 'hello' }], 3: [] };

  assert.ok(a);
});
