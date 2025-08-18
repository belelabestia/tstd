import { test } from 'node:test';
import { Result, result } from '../modules/result';
import * as assert from 'node:assert/strict';

/*
  since branches are between a function and its caller, you can usually do free-branching
  however, some forms of branching are very common, such as the result api
  which is still very flexible in tstd
*/

test('return a result', () => {
  // here we return a result
  const dangerousAction = (n: number) => {
    if (n < 5) return result.error('not enough');
    if (n > 10) return result.success('incredible');
    return result.success(n);
  };

  // you can assign the result to a protocol-typed variable
  type R = Result<number | string, string>;
  const res: R = dangerousAction(15);
  assert.deepEqual(res, result.success('incredible'));
});
