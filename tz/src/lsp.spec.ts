import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { checkVoid, session } from './lsp.js';

/*
  the editor path without an editor

  a session holds open buffers the way an extension would, transpiles each one
  in memory with emit, checks them all with the same tsc flags tzc uses, and
  moves every diagnostic back onto the tz line it came from. you open a buffer
  on every keystroke and diagnose the whole session with one tsc run.

  the void check needs no types: any expression statement whose head is not a
  tz trigger, block, exit or declaration must carry an explicit void prefix.
  without a checker there is nothing to rank the message with, so every drop
  is a warning. triggers stay bare by ruling: the ? head already marks the
  effect, so void is only for naked statements with no tz head.
*/

const read = (file: string) => readFileSync(new URL(`../${file}`, import.meta.url), 'utf8');

const drop = `import { result } from '@belelabestia/tstd';
export const f = (x: string) => {
  result.ok(x);
  ok 'done';
};`;

const wrong = `export const f = () => {
  function g() {}
  return 1;
};`;

const err = `export const f = (x: string) => {
  const n: number = x;
  return n;
};`;

const trigger = `export const f = (cond: boolean, log: (x: string) => void) => {
  cond ? log('up');
  cond ?! log('down');
  cond ? log('yes') else log('no');
  cond ? {
    log('one');
  } else {
    log('two');
  };
  return cond;
};`;

const s = session();
s.open('scratch/chains.tz', read('scratch/chains.tz'));
s.open('drop.tz', drop);
s.open('wrong.tz', wrong);
s.open('err.tz', err);
s.open('trigger.tz', trigger);

const reports = s.diagnoseAll();
const notes = (origin: string) => reports.find((report) => report.origin === origin)?.notes ?? [];

test('refuse what tz refuses, on tz lines', () => {
  // a ban is a tzc refusal first, so the session reports it without tsc

  assert.deepEqual(notes('wrong.tz'), [
    { line: 2, column: 3, level: 'error', code: 'TZ0001', message: 'function is refused; use an arrow const' }
  ]);
});

test('typecheck the virtual typescript on tz lines', () => {
  // scratch is clean under tzc, so the session shows nothing there either

  assert.deepEqual(notes('scratch/chains.tz'), []);
});

test('move a type error back onto its tz line', () => {
  // the same flags and the same column walk as tzc, so parity holds by construction

  assert.deepEqual(notes('err.tz'), [
    { line: 2, column: 9, level: 'error', code: 'TS2322', message: `Type 'string' is not assignable to type 'number'.` }
  ]);
});

test('flag a dropped Result without void', () => {
  // unranked without types, so the drop lands as a warning on its own line

  assert.deepEqual(notes('drop.tz'), [
    { line: 3, column: 3, level: 'warning', code: 'TZL0003', message: 'a dropped value needs void' }
  ]);
});

test('keep quest triggers bare', () => {
  // triggers stay bare by ruling, so no side of any trigger shape is a drop

  assert.deepEqual(notes('trigger.tz'), []);
});

test('flag a dropped call and spare the rest', () => {
  // the pure check, no tsc involved: naked drops warn, tz heads do not

  const dropped = `export const f = (x: string, save: (x: string) => void) => {
  save(x);
  ok 'done';
};`;
  assert.deepEqual(checkVoid(dropped).map((note) => [note.line, note.code]), [[2, 'TZL0003']]);

  const kept = `export const f = (x: string, save: (x: string) => void) => {
  void save(x);
  ok 'done';
};`;
  assert.deepEqual(checkVoid(kept), []);

  const quest = `export const f = (cond: boolean, save: (x: string) => void) => {
  cond ? save('up');
  cond ?! save('down');
  return cond;
};`;
  assert.deepEqual(checkVoid(quest), []);

  const plain = `export const f = (c: boolean, save: () => void) => {
  if (c) save();
  return c;
};`;
  assert.deepEqual(checkVoid(plain).map((note) => [note.line, note.code]), [[2, 'TZL0003']]);

  const made = `export const o = {
  run: () => 1
};`;
  assert.deepEqual(checkVoid(made), []);
});
