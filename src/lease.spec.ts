import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { Lease, lease } from './lease.js';

/*
  the lifetime of a resource

  `make` and `scope` cover the two things that throw: building something and calling it.
  neither says anything about a resource that has to be given back — a connection,
  a handle, a transaction. that lifetime has four steps, and every one of them can throw:
  you open it, you use it, you close it when the use worked,
  and you still have to let it go when the use didn't.

  zig writes the last two as `defer` and `errdefer`; here they are just two arguments,
  named `close` and `abort`. there is deliberately no single `finally`-shaped release:
  the two paths are different decisions — a transaction commits or rolls back,
  a pooled connection goes back or gets thrown away — and a lease that took one function
  would be deciding they are the same on your behalf.
  when they really are the same, you pass the same function twice, and it says so.

  since four steps can fail in four ways, the lease branches five ways instead of two.
  that is the whole point: a failed `use` is a domain problem, while a failed `close`
  is a resource you no longer hold and no longer own, which is a different day entirely.
*/

// say we have an sdk connecting us to something; a boolean picks failure, as usual
const sdk = {
  connect: (x: boolean) => {
    if (x) throw new Error('cannot connect');

    return {
      query: (x: boolean) => {
        if (x) throw new Error('cannot query');
        return 'rows';
      },
      close: (x: boolean) => {
        if (x) throw new Error('cannot close');
      }
    };
  }
};

test('lease a resource', () => {
  // the four steps read top to bottom, in the order they run
  const res = lease.sync({
    open: () => sdk.connect(false),
    use: conn => conn.query(false),
    close: conn => conn.close(false),
    abort: conn => conn.close(false)
  });

  // the lease branches five ways, one per step that can throw, and it infers the used value
  const protocol: Lease<string> = res;
  assert.equal(protocol.branch, 'success');

  if (res.branch !== 'success') assert.fail();

  // now res.value is the string the use returned, not the connection
  assert.equal(res.value, 'rows');
});

test('never open what you cannot use', () => {
  // when opening throws there is nothing to release, so the lease stops there
  const res = lease.sync({
    open: () => sdk.connect(true),
    use: conn => conn.query(false),
    close: conn => conn.close(false),
    abort: conn => conn.close(false)
  });

  assert.equal(res.branch, 'open');
});

test('release what a failed use leaves behind', () => {
  // the resource is released on the way out too, and we can watch it happen
  let released = false;

  const res = lease.sync({
    open: () => sdk.connect(false),
    use: conn => conn.query(true),
    close: conn => conn.close(false),
    abort: conn => {
      released = true;
      conn.close(false);
    }
  });

  // the branch names the step that threw, so a failed use is still a failed use
  assert.equal(res.branch, 'use');
  assert.ok(released);
});

test('tell a leak from a failure', () => {
  // the use worked, the release didn't: you have a value you cannot trust to be settled
  const kept = lease.sync({
    open: () => sdk.connect(false),
    use: conn => conn.query(false),
    close: conn => conn.close(true),
    abort: conn => conn.close(true)
  });

  assert.equal(kept.branch, 'close');

  // and when both the use and the release fail, the release wins the branch:
  // the failed call is over, while the resource is still out there
  const lost = lease.sync({
    open: () => sdk.connect(false),
    use: conn => conn.query(true),
    close: conn => conn.close(true),
    abort: conn => conn.close(true)
  });

  assert.equal(lost.branch, 'abort');

  // there is no `finally` here: a lease without both releases does not typecheck
  // @ts-expect-error
  lease.sync({
    open: () => sdk.connect(false),
    use: conn => conn.query(false),
    close: conn => conn.close(false)
  });
});

test('lease something asynchronous', async () => {
  // the async half is the same four steps, each of them a promise
  const res = await lease.async({
    open: async () => sdk.connect(false),
    use: async conn => conn.query(false),
    close: async conn => conn.close(false),
    abort: async conn => conn.close(false)
  });

  if (res.branch !== 'success') assert.fail();
  assert.equal(res.value, 'rows');

  // a rejected promise is a throw like any other, so it branches like one
  const failed = await lease.async({
    open: async () => sdk.connect(false),
    use: async () => { throw new Error('cannot query'); },
    close: async conn => conn.close(false),
    abort: async conn => conn.close(false)
  });

  assert.equal(failed.branch, 'use');
});
