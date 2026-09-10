import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { branch, Union } from './branch.js';
import { Result, result } from './result.js';
import * as protocol from './protocol.js';

/*
  declaring a union

  a value can't state a type; a function parameter can, so we declare with functions:
  one per branch, its parameter is what that branch carries, its result is where it can go.

  init walks that literal and gives back a factory per branch.
  declare nothing after a branch and you get a plain union, like result;
  name other branches and each state carries the factories for those, which is a machine.

  the same literal is read twice, once by ts for the types and once at runtime for the tags.
*/

// nothing follows anything here, so these are just branches
const payment = protocol.init({
  success: (value: number) => {},
  rejected: () => {},
  pending: (value: { id: string; }) => {}
});

test('declare a union once and get its factories', () => {
  const done = payment.success(42);

  assert.deepEqual(done, branch('success', 42));

  // they're ordinary branches, so narrowing works as usual
  const held: protocol.Of<typeof payment> = payment.pending({ id: 'a' });
  if (held.branch !== 'pending') assert.fail();

  assert.equal(held.value.id, 'a');
});

test('carry nothing where nothing is declared', () => {
  const no = payment.rejected();

  assert.deepEqual(no, branch('rejected'));

  // and it's the union you'd have written by hand
  const both: Union<{ success: number, rejected: void, pending: { id: string; }; }> = no;

  assert.equal(both.branch, 'rejected');
});

test('stay generic where a branch carries unknown', () => {
  // a declared value is fixed, so unknown is how you say "whatever the caller brings"
  const lookup = protocol.init({ found: (value: unknown) => {}, missing: () => {} });
  const kept: number = lookup.found(42).value;

  assert.equal(kept, 42);

  // result is built that way, so its payloads still travel
  const rows: string[] = result.ok(['a']).value;

  assert.deepEqual(rows, ['a']);
});

// here every branch says what may follow it, or nothing when it ends the machine
const loader = protocol.init({
  idle: () => ['loading'],
  loading: (value: { at: number; }) => ['ok', 'err'],
  ok: (value: string[]) => {},
  err: (value: unknown) => ['loading']
});

test('walk a machine to its end', () => {
  const idle = loader.idle();

  assert.equal(idle.branch, 'idle');

  // going to a state takes the value that state declared
  const loading = idle.to.loading({ at: 1 });
  const loaded = loading.to.ok(['a', 'b']);

  assert.equal(loading.value.at, 1);

  // and where it ends there's no to at all, so a state is just a branch again
  assert.deepEqual(loaded, branch('ok', ['a', 'b']));
});

test('enter a machine wherever you left it', () => {
  const walked = loader.idle().to.loading({ at: 1 }).to.err(new Error('down'));

  // every state is a factory, so you can start where something else stopped
  const resumed = loader.err(new Error('down'));

  assert.deepEqual(Object.keys(resumed), Object.keys(walked));
  assert.equal(resumed.to.loading({ at: 2 }).branch, 'loading');
});

test('hold a machine in any of its states', () => {
  // whatever holds a machine holds all of them, and that's one name
  const held: protocol.Of<typeof loader> = loader.idle().to.loading({ at: 1 });
  if (held.branch !== 'loading') assert.fail();

  assert.equal(held.to.ok(['a']).branch, 'ok');
});

test('let an event choose which transition to take', () => {
  const loading = loader.loading({ at: 1 });

  // the two ways out of loading carry what a result carries, so the result is the event
  const settle = (x: protocol.Of<typeof loader, 'loading'>, out: Result<string[], unknown>) => {
    if (out.branch === 'err') return x.to.err(out.value);

    return x.to.ok(out.value);
  };

  const failed = settle(loading, result.err(new Error('down')));
  if (failed.branch !== 'err') assert.fail();

  assert.ok(failed.value instanceof Error);

  // a cycle is a transition like any other, so a failed load goes back and tries again
  const again = failed.to.loading({ at: 2 });

  // and a settled load is a result, same tags and same values, nothing wrapping anything
  const done: Result<string[], unknown> = settle(again, result.ok(['a']));

  assert.equal(done.branch, 'ok');
});

test('put a machine away as the data it is', () => {
  const loading = loader.loading({ at: 1 });

  // a state carries closures, so you store the branch under it
  const stored: Union<protocol.Model<typeof loader>> = branch(loading.branch, loading.value);

  assert.deepEqual(stored, branch('loading', { at: 1 }));

  // and coming back is entering at the state you stored
  if (stored.branch !== 'loading') assert.fail();

  assert.equal(loader.loading(stored.value).to.ok(['a']).branch, 'ok');
});

test('refuse what a declaration does not say', () => {
  const loaded = loader.loading({ at: 1 }).to.ok(['a']);

  // @ts-expect-error the value is whatever the parameter said
  const wrong = () => payment.success('42');

  // @ts-expect-error a branch that carries nothing takes nothing
  const extra = () => payment.rejected(1);

  // @ts-expect-error a load can't go straight from idle to ok
  const jump = loader.idle().to.ok;

  // @ts-expect-error ok ends the machine, so there's no to on it
  const undo = loaded.to;

  // @ts-expect-error and you can only go where the declaration names a state
  const stray = protocol.init({ idle: () => ['nope'], loading: (value: { at: number; }) => {} });

  assert.deepEqual(Object.keys(payment), ['success', 'rejected', 'pending']);
});
