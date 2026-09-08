import { test } from 'node:test';
import { make, Result, result, call } from './result.js';
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
    return result.success();
  };

  // you can assign the result to a protocol-typed variable
  type R = Result<string | void, string>;
  const res: R = dangerousAction(15);
  assert.deepEqual(res, result.success('incredible'));
});

/*
  in tstd we try to get rid of some useless keywords that involve language magic
  one of them is the whole this/new/class/extends/super family

  plus, constructors often throw, which is another thing we don't like
*/

test('init safely with the make api', () => {
  // i have a module that needs to be instantiated as a class
  // but constructors can explode so i use the make utility instead of new
  assert.equal(make(URL, '').branch, 'error');

  // if everything's fine, i can work with the instance
  const href = 'https://example.com/';
  const url = make(URL, href);
  assert.equal(url.branch, 'success');
  assert.equal(url.value.href, href);
});

test('execute safely with the call api', () => {
  // this function needs an error boundary
  const div = (x: number, y: number) => {
    if (y === 0) throw new RangeError('div by zero');
    return x / y;
  };

  const res = call.sync(div, 1, 0);
  assert.deepEqual(res.branch, 'error');
});

test('do resource management with the call api', () => {
  // say we have an sdk connecting us to something
  const sdk = {
    connect: (x: boolean) => {
      if (x) throw new Error();

      return {
        query: (x: boolean) => {
          if (x) throw new Error();
        },
        close: (x: boolean) => {
          if (x) throw new Error();
        }
      };
    }
  };

  // we want to safely get a connection instance
  let conn = call.sync(sdk.connect, true);
  assert.equal(conn.branch, 'error');

  // we can retry if it fails
  conn = call.sync(sdk.connect, false);
  assert.equal(conn.branch, 'success');

  // we can then use it; a method bound to `this` has to be wrapped,
  // as call invokes it detached: one more reason not to write classes
  const res = call.sync(() => conn.value.query(true));
  assert.equal(res.branch, 'error');

  // and make sure we clean everything up
  const cleanup = call.sync(conn.value.close, false);
  assert.equal(cleanup.branch, 'success');
});
