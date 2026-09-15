import { test, after } from 'node:test';
import * as assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { emit } from './emit.js';
import { openCheck } from './check.js';

/*
  the checker-backed half without an editor

  the same buffer goes through emit the way a session sends it, lands in a
  mirror file, and the interim compiler api reads the types off the mirror.
  a guard must test a boolean and an answerable ladder must cover every
  member; anything the api cannot decide stays silent instead of guessing.
  both checks are warnings: they rank nothing, they only point.
*/

const typed = `export const shout = (cond: string, log: (x: string) => void) => {
  cond ? log('yes');
  return 0;
};
export const scold = (cond: string, log: (x: string) => void) => {
  cond ?! log('no');
  return 0;
};
export const whisper = (good: boolean, log: (x: string) => void) => {
  good ? log('yes');
  return 0;
};
export const shrug = (good: boolean, log: (x: string) => void) => {
  good ?! log('no');
  return 0;
};
export const same = (x: number, log: (x: string) => void) => {
  x == 1 ? log('one');
  return x;
};
export const withFlag = (o: { flag: boolean }, log: (x: string) => void) => {
  o.flag ? log('yes');
  return 0;
};
export const withName = (o: { name: string }, log: (x: string) => void) => {
  o.name ? log('yes');
  return 0;
};
export const yes = () => true;
export const no = () => \`no\`;
export const callGood = (log: (x: string) => void) => {
  yes() ? log('yes');
  return 0;
};
export const callBad = (log: (x: string) => void) => {
  no() ? log('yes');
  return 0;
};
export const vague = (u: unknown, log: (x: string) => void) => {
  u ? log('yes');
  return 0;
};
type U = \`a\` | \`b\` | \`c\`;
export const rank = (u: U) => u ? {
  == \`a\` => 1,
  == \`b\` => 2,
  else => 0
};
export const short = (u: U) => u ? {
  == \`a\` => 1,
  == \`b\` => 2
};
export const first = (u: U) => u;
export const wrap = (u: U) => first(u) ? {
  == \`a\` => 1,
  == \`b\` => 2
};
type Outcome = { branch: \`ok\`, value: number } | { branch: \`err\`, value: string };
export const pick = (out: Outcome) => out ? {
  :ok (v) => v,
  else => -1
};
export const drop = (out: Outcome) => out ? {
  :ok (v) => v
};
export const partial = (cond: boolean, seen: (x: string) => void) => {
  cond ? {
    == true seen('yes');
  };
  return 0;
};
export const boxed = (s: string, log: (x: string) => void) => {
  s ? {
    log('in');
  };
  return 0;
};`;

const dir = join(tmpdir(), 'tz-check-spec');
mkdirSync(dir, { recursive: true });

const written = emit(typed);
if (written.branch === 'err') throw new Error(`the fixture never emits: ${written.value.message}`);
const mirror = join(dir, 'typed.ts');
writeFileSync(mirror, written.value.code);

const checking = openCheck([mirror]);
if (checking === null) throw new Error('the checker never starts');
after(() => checking.close());

const booleanNotes = checking.booleans(mirror, typed, written.value.code);
const ladderNotes = checking.ladders(mirror, typed, written.value.code);

test('flag a string guard and spare the boolean ones', () => {
  assert.equal(booleanNotes.length, 6);
  assert.equal(booleanNotes[0].code, 'TZL0002');
  assert.equal(booleanNotes[0].line, 2);
  assert.match(booleanNotes[0].message, /a \? tests a boolean; cond is string/);
  assert.equal(booleanNotes[1].line, 6);
  assert.match(booleanNotes[1].message, /a \? tests a boolean; cond is string/);
  assert.equal(booleanNotes[2].line, 26);
  assert.match(booleanNotes[2].message, /a \? tests a boolean; o\.name is string/);
  assert.equal(booleanNotes[3].line, 36);
  assert.match(booleanNotes[3].message, /a \? tests a boolean; no\(\) is string/);
  assert.equal(booleanNotes[4].line, 40);
  assert.match(booleanNotes[4].message, /a \? tests a boolean; u is unknown/);
  assert.equal(booleanNotes[5].line, 73);
  assert.match(booleanNotes[5].message, /a \? tests a boolean; s is string/);
});

test('flag a missing value and spare the covered ladder', () => {
  const missed = ladderNotes.filter((note) => note.code === 'TZL0004' && note.message.includes('member'));
  assert.equal(missed.length, 2);
  assert.equal(missed[0].line, 49);
  assert.equal(missed[1].line, 54);
  for (const note of missed) assert.match(note.message, /a \? \{\} answers every member; missing "c"/);
});

test('spare a statement ladder missing an arm', () => {
  assert.equal(ladderNotes.filter((note) => note.line === 67).length, 0);
  assert.equal(ladderNotes.filter((note) => note.code === 'TZL0004').length, 3);
});

test('flag a missing branch through a call subject', () => {
  const missed = ladderNotes.filter((note) => note.code === 'TZL0004' && note.message.includes('branch'));
  assert.equal(missed.length, 1);
  assert.equal(missed[0].line, 63);
  assert.match(missed[0].message, /a \? \{\} answers every branch; missing :err/);
});

test('stay silent on an empty buffer and an unknown file', () => {
  assert.deepEqual(checking.booleans(mirror, '', ''), []);
  assert.deepEqual(checking.ladders(mirror, '', ''), []);
  assert.deepEqual(checking.booleans(join(dir, 'missing.ts'), 'a ? b;', ''), []);
});
