import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { highlight } from './highlight.js';

/*
  the editor borrows typescript's grammar, and tz breaks its assumptions

  a `?` is never a ternary here and a `{` after a quest is never an object
  literal, but typescript reads both that way and never recovers: from the
  first `? {` on, `export const` degrades to plain variables, and a `?:err`
  capture block swallows `console.log` whole. this spec tokenizes the example
  files the way vs code does, words injected, so a regression fails the build
  instead of showing up as a wrong color.
*/

const tz = await highlight();

const scopes = (file: string, line: number, text: string) => {
  const tokens = tz.line(file, line);
  const exact = tokens.filter((t) => t.text === text);
  const hits = exact.length > 0 ? exact : tokens.filter((t) => t.text.includes(text));

  assert.ok(hits.length > 0, `${file}:${line} has no ${text}`);

  return hits[hits.length - 1].scopes;
};

const has = (file: string, line: number, text: string, scope: string) => {
  assert.ok(
    scopes(file, line, text).includes(scope),
    `${file}:${line} ${text} misses ${scope}, has ${scopes(file, line, text).join(' ')}`
  );
};

const lacks = (file: string, line: number, text: string, scope: string) => {
  assert.ok(
    !scopes(file, line, text).includes(scope),
    `${file}:${line} ${text} should not carry ${scope}`
  );
};

test('a :tag builds the same whatever precedes it', () => {
  // `= :idle` has a gap the old branch rule refused, so only the glued
  // `:inner` colored as a tag while the rest took typescript's reading

  has('examples/branches.tz', 5, 'idle', 'entity.name.tag.tz');
  has('examples/branches.tz', 7, 'failed', 'entity.name.tag.tz');
  has('examples/branches.tz', 9, 'outer', 'entity.name.tag.tz');
  has('examples/branches.tz', 9, 'inner', 'entity.name.tag.tz');
});

test('a ? {} block does not corrupt what follows it', () => {
  // typescript read `out ? {` as a ternary with an object literal and never
  // closed the stack, so every `export const` below degraded to variables

  has('examples/chains.tz', 47, 'export', 'keyword.control.export.ts');
  has('examples/chains.tz', 47, 'const', 'storage.type.ts');
  has('examples/chains.tz', 47, 'grade', 'variable.other.constant.ts');
  has('examples/chains.tz', 43, 'ok', 'keyword.control.flow.tz');
});

test('a quest capture block stays a block', () => {
  // `?:err (e) {` opened an object literal, so `console.log(e);` carried no
  // scope at all and read as plain white

  has('examples/fallback.tz', 41, 'found', 'variable.other.constant.ts');
  has('examples/fallback.tz', 42, 'log', 'entity.name.function.ts');
  lacks('examples/fallback.tz', 42, 'log', 'meta.objectliteral.ts');
});

test('a == arm names its comparison', () => {
  // the arm lookahead only allowed `(`, `=>`, `,` or `;` after the head, so a
  // value operand like `== 200` matched nothing

  has('examples/chains.tz', 32, '==', 'keyword.operator.comparison.tz');
  has('examples/chains.tz', 33, '>', 'keyword.operator.comparison.tz');
});

test('a keyword is not what a value namespace spells', () => {
  // `form.model` read as the keyword, so the value and the declaration
  // colored alike; the rule now stops at the dot

  has('examples/forms.tz', 4, 'form', 'keyword.control.form.tz');
  lacks('examples/forms.tz', 21, 'form', 'keyword.control.form.tz');
});

test('an arrow-assigned name is a function only when it is one', () => {
  // `const out = call => ...` held a value under a function color, since
  // typescript reads `call =>` as an arrow; the example names the closure
  // instead, so the value binds under a value color

  has('examples/calls.tz', 26, 'parse', 'entity.name.function.ts');
  has('examples/calls.tz', 27, 'body', 'variable.other.constant.ts');
  lacks('examples/calls.tz', 27, 'body', 'entity.name.function.ts');
});

test('a bare ? block with statements takes an else tail', () => {
  // the tutorial statement form: `? {` holds plain statements, and `else`
  // holds the miss side. neither brace may read as an object literal

  const run = tz.snippet(`export const run = (cond: boolean) => {
  log('start');
  cond ? {
    a();
    b();
  } else {
    c();
    d();
  };
  log('done');
};`);

  const at = (n: number, text: string) => {
    const tokens = run[n - 1];
    const exact = tokens.filter((t) => t.text === text);
    const hits = exact.length > 0 ? exact : tokens.filter((t) => t.text.includes(text));

    assert.ok(hits.length > 0, `snippet:${n} has no ${text}`);

    return hits[hits.length - 1].scopes;
  };

  assert.ok(at(6, 'else').includes('keyword.control.flow.tz'), 'snippet:6 else misses tz scope');
  assert.ok(at(7, 'c').includes('entity.name.function.ts'), 'snippet:7 c misses function scope');
  assert.ok(!at(7, 'c').includes('meta.objectliteral.ts'), 'snippet:7 c sits in an object literal');
  assert.ok(at(10, 'log').includes('entity.name.function.ts'), 'snippet:10 log misses function scope');
});
