import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { scope } from './scope.js';
import { call, result } from './result.js';

/*
  holding things you have to give back

  usually a resource is held by a block. java and c# write `try`/`finally`, python writes `with`,
  go writes `defer`, zig writes `defer` and `errdefer`. one resource, one block, and the block is
  also where the failure is caught, so the two questions get answered in the same construct.

  the callback version of that block is the one javascript reaches for, and it is worse:
  `withConnection(conn => withLock(lock => withFile(file => ...)))` puts every resource one lambda
  deeper than the last, so by the third one you are indenting more than you are working.
  the shape of the code follows the number of things you hold rather than what you are doing.

  here it is one call. the work is handed `hold`, and it holds what it needs one line at a time:
  `hold` takes a resource (`open`, `close`, `abort`), runs the open through `call`, and gives you
  back a `Result` you branch on the way you branch on anything else. a second resource is a second
  line, not a second level, so resources nest without scopes nesting.

  the scope keeps the list and gives everything back in reverse when the work returns, choosing
  `close` when the work succeeded and `abort` when it did not: zig's `defer` and `errdefer`, decided
  from the result instead of from where the callback sits. there is deliberately no single release,
  since a transaction commits or rolls back and one function would decide that for you.

  what comes out is two facts, not one, because two independent things happened. `exit` says how the
  work left: `done` with the result you returned, whatever it says, or `panic` with the throw nobody
  caught. `leaked` lists every release that threw on the way out. unwinding never stops early, so a
  release that throws costs you that one resource and not the rest of the list.
*/

// say we have an sdk connecting us to something; a boolean picks failure, as usual
const sdk = {
  connect: (name: string, x: boolean) => {
    if (x) throw new Error('cannot connect');

    return {
      name,
      query: (x: boolean) => {
        if (x) throw new Error('cannot query');
        return 'rows';
      }
    };
  }
};

type Conn = ReturnType<typeof sdk.connect>;

const held: string[] = [];

// a resource is a value: three functions naming one lifetime, declared once and held wherever
const first = {
  open: () => sdk.connect('first', false),
  close: (conn: Conn) => held.push(conn.name),
  abort: (conn: Conn) => held.push(conn.name)
};

const second = { ...first, open: () => sdk.connect('second', false) };

test('hold two resources side by side', () => {
  const res = scope.sync(hold => {
    // one line per resource, and a branch you take yourself: no second level anywhere
    const one = hold(first);
    if (one.branch === 'error') return result.error('cannot hold the first' as const);

    const two = hold(second);
    if (two.branch === 'error') return result.error('cannot hold the second' as const);

    return result.success(one.value.name + ' and ' + two.value.name);
  });

  // the exit carries your own result, exactly as the work returned it
  if (res.exit.branch !== 'done') assert.fail();
  if (res.exit.value.branch !== 'success') assert.fail();

  assert.equal(res.exit.value.value, 'first and second');

  // what was taken out last goes back first, and nothing leaked
  assert.deepEqual(held, ['second', 'first']);
  assert.equal(res.leaked.length, 0);
});

test('give back what you took when the next one refuses', () => {
  // the case a single merged open gets wrong: the second refuses, the first is already held
  held.length = 0;

  const refuses = { ...first, open: () => sdk.connect('second', true) };

  const res = scope.sync(hold => {
    const one = hold(first);
    if (one.branch === 'error') return result.error('cannot hold the first' as const);

    const two = hold(refuses);
    if (two.branch === 'error') return result.error('cannot hold the second' as const);

    return result.success(two.value.name);
  });

  // the work named its own failure, so the exit is that result and the first resource is back
  if (res.exit.branch !== 'done') assert.fail();
  if (res.exit.value.branch !== 'error') assert.fail();

  assert.equal(res.exit.value.value, 'cannot hold the second');
  assert.deepEqual(held, ['first']);
});

test('roll back what a failed work was holding', () => {
  const settled: string[] = [];

  const transaction = {
    open: () => sdk.connect('tx', false),
    close: () => settled.push('commit'),
    abort: () => settled.push('rollback')
  };

  // a failure the work names is still a failure, so the release takes the abort path
  const named = scope.sync(hold => {
    const conn = hold(transaction);
    if (conn.branch === 'error') return result.error('cannot hold' as const);

    const rows = call.sync(() => conn.value.query(true));
    if (rows.branch === 'error') return result.error('cannot query' as const);

    return result.success(rows.value);
  });

  if (named.exit.branch !== 'done') assert.fail();

  assert.equal(named.exit.value.branch, 'error');
  assert.deepEqual(settled, ['rollback']);

  // and a throw nobody caught rolls back too, but leaves as a panic instead of as your result
  const thrown = scope.sync(hold => {
    const conn = hold(transaction);
    if (conn.branch === 'error') return result.error('cannot hold' as const);

    return result.success(conn.value.query(true));
  });

  assert.equal(thrown.exit.branch, 'panic');
  assert.deepEqual(settled, ['rollback', 'rollback']);
});

test('lose one resource without losing the rest', () => {
  // a release that throws does not end the unwinding: the rest of the list still goes back,
  // and every throw lands on `leaked` without touching what the work returned
  held.length = 0;

  const sticks = {
    ...first,
    close: (conn: Conn) => {
      held.push(conn.name);
      throw new Error('cannot close the first');
    }
  };

  const res = scope.sync(hold => {
    const one = hold(sticks);
    if (one.branch === 'error') return result.error('cannot hold the first' as const);

    const two = hold(second);
    if (two.branch === 'error') return result.error('cannot hold the second' as const);

    return result.success(two.value.name);
  });

  // the work is untouched by any of it: its result is exactly what it returned
  if (res.exit.branch !== 'done') assert.fail();
  if (res.exit.value.branch !== 'success') assert.fail();

  assert.equal(res.exit.value.value, 'second');

  // both releases were tried, in reverse, and the one that threw is on the list
  assert.deepEqual(held, ['second', 'first']);
  assert.equal(res.leaked.length, 1);
  assert.ok(res.leaked[0] instanceof Error);
});

test('hold something asynchronous', async () => {
  // the async half is the same scope with promises in it: the work awaits, and so does every step
  const listening: string[] = [];

  const socket = {
    open: async () => sdk.connect('socket', false),
    close: async (conn: Conn) => { listening.push(conn.name); },
    abort: async (conn: Conn) => { listening.push(conn.name); }
  };

  const res = await scope.async(async hold => {
    const conn = await hold(socket);
    if (conn.branch === 'error') return result.error('cannot hold the socket' as const);

    return result.success(conn.value.query(false));
  });

  if (res.exit.branch !== 'done') assert.fail();
  if (res.exit.value.branch !== 'success') assert.fail();

  assert.equal(res.exit.value.value, 'rows');
  assert.deepEqual(listening, ['socket']);

  // a rejected promise is a throw like any other, so it leaves as a panic and still releases
  const failed = await scope.async(async hold => {
    const conn = await hold(socket);
    if (conn.branch === 'error') return result.error('cannot hold the socket' as const);

    return result.success(await Promise.reject(new Error('gone')));
  });

  assert.equal(failed.exit.branch, 'panic');
  assert.deepEqual(listening, ['socket', 'socket']);
});
