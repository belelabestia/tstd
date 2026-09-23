import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { smells } from './smell.js';

/*
  the library spelling, warned

  tz cannot ban the standard library: interop needs it, and it is the same
  language written plainly. so the editor warns instead, naming the tz form a
  library spelling should have been, and the language keeps one spelling.

  this check reads tokens, not types, so it is the ban pass one level softer.
  a spelling in keyword position is warned; the same word after a dot is
  somebody else's property and stays quiet.
*/

test('warn each library spelling with its tz form', () => {
  const flagged = smells(`protocol.init({});
branch('idle');
result.ok(1);
result.err('down');
scope.sync(hold => {});
scope.async(hold => {});
call.sync(f);
call.async(f);
make(URL, href);`);

  assert.deepEqual(
    flagged.map((note) => note.message),
    [
      'protocol.init is the library spelling; declare with protocol { ... }',
      'branch is the library spelling; construct with :tag(...)',
      'result.ok is the library spelling; construct with :ok(...)',
      'result.err is the library spelling; construct with :err(...)',
      'scope.sync is the library spelling; use scope (hold) => { ... }',
      'scope.async is the library spelling; use scope (hold) => { ... }',
      'call.sync is the library spelling; use call',
      'call.async is the library spelling; use call',
      'make is the library spelling; use make => ...'
    ]
  );

  for (const note of flagged) {
    assert.equal(note.level, 'warning');
    assert.equal(note.code, 'TZL0005');
  }
});

test('warn where the spelling sits', () => {
  const flagged = smells('const a = 1;\nresult.ok(a);');

  assert.deepEqual(flagged.map((note) => [note.line, note.column]), [[2, 1]]);
});

test('stay silent on the tz forms and on a property', () => {
  assert.deepEqual(
    smells(`const idle = :idle;
protocol load {
  idle => done
}
const rows = x.branch;
const made = y.make;
scope (hold) => {};
const url = make => URL(href);
const r = call => JSON.parse(raw);
const done = :ok(1);`),
    []
  );
});

test('stay silent on a buffer that never lexes', () => {
  assert.deepEqual(smells('const x = "unterminated;'), []);
});
