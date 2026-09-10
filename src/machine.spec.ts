import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { branch } from './branch.js';
import { Result, result } from './result.js';
import * as machine from './machine.js';

/*
  a union that knows what follows what

  a state machine is usually a class with a `state` field and methods that guard on it, or a table of
  callbacks keyed by state and event: the first hides the legal transitions in the method bodies, the
  second hides flow behind data.

  a branch is already a state: a tag, plus the value that state carries. what a `Union` cannot say is
  which branches may follow which, so that goes in a lifecycle, written as one factory per state. the
  factory states two things and nothing else: its parameter is what that state carries, and what it
  returns is where that state can go. nothing is declared twice, because going to a state takes the
  value that state already declared.

  a function is what it is written as because one function does both jobs at once: the parameter is
  the only place a value declaration can state a type, and the result is real data, read at runtime
  to build the machine. a type beside a value would name every state twice and let the two drift.

  `machine.init` walks it. it takes the lifecycle, a state to enter at, and that state's value if it
  carries one, and hands back the machine in that state: the branch it is on, plus a `to` holding one
  function per state it may become. each of those takes the value of the state it leads to and hands
  back that state, with its own `to`.

  the state you enter at is any state the lifecycle declares, not a designated first one. a lifecycle
  can have several ways in, and a machine can be resumed where something else left it, which is the
  same call either way.

  so the tags never leave the lifecycle. `loader.to.loading({ at: 1 })` is the whole transition, and
  a state that ends the lifecycle has no `to` at all, which is where walking stops.

  a lifecycle that ends in `success` and `error` ends in a `Result`: the same two tags carrying the
  same two values, so a settled load goes wherever a result goes without being unwrapped first. what
  that change of type costs is `to`, since a result says nothing about where a load can go next, so
  reading a state as a result is how you leave the machine.

  everything else stays flow: no dispatcher, you branch on the state you were handed back, and what
  it can do is the object in front of you.
*/

// one factory per state: the parameter is what it carries, the result is where it can go
const loader = machine.init({
  idle: () => ['loading'],
  loading: (value: { at: number; }) => ['success', 'error'],
  success: (value: string[]) => [],
  error: (value: unknown) => ['loading']
}, 'idle');

test('walk a machine to its end', () => {
  assert.equal(loader.branch, 'idle');

  // a transition takes the value of the state it leads to, because that state declared it
  const loading = loader.to.loading({ at: 1 });
  const loaded = loading.to.success(['a', 'b']);

  assert.equal(loading.value.at, 1);
  assert.deepEqual(loaded.value, ['a', 'b']);

  // and where the lifecycle ends the state is exactly a branch, with no `to` on it at all
  assert.deepEqual(loaded, branch('success', ['a', 'b']));
});

test('enter a lifecycle wherever you left it', () => {
  const walked = loader.to.loading({ at: 1 }).to.error(new Error('down'));

  // `init` takes any state the lifecycle declares, not a designated first one, so the same state
  // can be entered directly: a machine picked up mid-flight is the one that walked there
  const resumed = machine.init({
    idle: () => ['loading'],
    loading: (value: { at: number; }) => ['success', 'error'],
    success: (value: string[]) => [],
    error: (value: unknown) => ['loading']
  }, 'error', new Error('down'));

  assert.deepEqual(Object.keys(resumed), Object.keys(walked));
  assert.deepEqual(Object.keys(resumed.to), ['loading']);

  assert.equal(resumed.to.loading({ at: 2 }).branch, 'loading');
});

test('let an event choose which transition to take', () => {
  const loading = loader.to.loading({ at: 1 });

  // the two transitions out of `loading` carry what a result carries, so what the work came back
  // with picks one of them and hands it straight over
  const settle = (x: typeof loading, out: Result<string[], unknown>) => {
    if (out.branch === 'error') return x.to.error(out.value);

    return x.to.success(out.value);
  };

  const failed = settle(loading, result.error(new Error('down')));
  if (failed.branch !== 'error') assert.fail();

  assert.ok(failed.value instanceof Error);

  // a cycle is a transition like any other, so a failed load goes back to loading and tries again
  const again = failed.to.loading({ at: 2 });
  assert.equal(settle(again, result.success(['a'])).branch, 'success');
});

test('settle a load into a result', () => {
  const loading = loader.to.loading({ at: 1 });

  const settle = (x: typeof loading, out: Result<string[], unknown>) => {
    if (out.branch === 'error') return x.to.error(out.value);

    return x.to.success(out.value);
  };

  // where the machine ends it is a result already: same tags, same values, nothing wrapping
  // anything, so a settled load goes wherever a result goes
  const done: Result<string[], unknown> = settle(loading, result.success(['a']));
  if (done.branch !== 'success') assert.fail();

  assert.deepEqual(done.value, ['a']);

  // what the change of type costs is `to`. the object still carries it when the state it came from
  // had one, but a result says nothing about where a load can go, so the walk ends at the widening
  // @ts-expect-error and reading a state as a result is how you leave the machine on purpose
  const next = done.to;
});

test('refuse a transition the machine does not have', () => {
  const loading = loader.to.loading({ at: 1 });
  const loaded = loading.to.success(['a']);

  // @ts-expect-error a load cannot go straight from idle to success
  const jump = loader.to.success;

  // @ts-expect-error `success` ends the lifecycle, so it has no `to` to reach for
  const undo = loaded.to;

  // @ts-expect-error and a transition takes the value of the state it leads to
  const wrong = () => loader.to.loading({ at: 'soon' });

  assert.deepEqual(Object.keys(loading.to), ['success', 'error']);
});

test('refuse a lifecycle that does not hold together', () => {
  const stray = machine.init({
    idle: () => ['loading'],
    // @ts-expect-error a state can only go where the lifecycle declares a state
    loading: (value: { at: number; }) => ['nope']
  }, 'idle');

  // @ts-expect-error and a state that carries something cannot be entered without it
  const missing = machine.init({
    idle: () => ['loading'],
    loading: (value: { at: number; }) => []
  }, 'loading');

  assert.equal(stray.branch, 'idle');
});
