import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { branch, Union } from './branch';
import { no } from './yes-no';

/*
  a little bit of theory

  branching is a technique that never really got popularized enough in the js world;
  sure, we have many kinds of runtime type checks but they aren't really ergonomic at all.

  branching simplifies pattern matching by creating a flexible return type
  that makes it easy for ts to infer types while still relying on very basic runtime checks.

  branch is a factory function used to make single branches of tagged union types;
  it's designed to work with the Union generic type.

  this design aims at staying very close to vanilla ts while significanly improving its ergonomics.
*/

test('branch everything', () => {
  // in ts we often struggle to leverage the flexibility of a dynamic language without compromising safety;
  // `branch` is a very simple utility that enables type-safe dynamic tagged unions as a return type.

  // here we have an operation that might return in different ways:
  const toughDecision = (n: number) => {
    if (n < 0.2) return branch('xs', { a: 1 });
    if (n < 0.4) return branch('s', 'hello');
    if (n < 0.6) return branch('m', 2);
    if (n < 0.8) return branch('l', [1, 2, 3]);
    return branch('xl', null);
  };

  // see how ts has inferred the return type of `toughDecision`;
  // this inferred type signature can be assigned to a union-typed variable:
  type Res = Union<{ xs: { a: number }, s: string, m: number, l: number[], xl: null }>;
  const res: Res = toughDecision(0.3);

  assert.deepEqual(res, { branch: 's', value: 'hello' });

  // or passed as a union-typed argument
  const branchIsL = (res: Res) => res.branch === 'l';
  assert.ok(branchIsL(toughDecision(0.6)));
});

test('branch something', () => {
  // sometimes you don't need to qualify a branch for a void return;
  // so you can decide to only qualify some branches:
  const onlyQualifySomeBranches = (n: number) => {
    if (n > 0.8) return branch('big', n);
    if (n < 0.2) return branch('small', n);
  };

  const res = onlyQualifySomeBranches(0.1);
  assert.deepEqual(res, { branch: 'small', value: 0.1 });

  // now res might be undefined so you need to check;
  // use yes/no to perform safe nullish checks:
  if (no(res)) assert.fail();

  // now ts will easily scaffold a switch statement:
  switch (res.branch) {
    case 'big':
      assert.fail();
    case 'small':
      return;
  }
});
