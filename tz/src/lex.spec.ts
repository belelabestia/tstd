import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { lex } from './lex.js';

/*
  the lexer is the whole reason this is cheap

  typescript's grammar is enormous and none of it is ours, so we never write one. we split
  the source into tokens, which is a few hundred lines and doesn't go out of date when
  typescript grows a feature, and then we look at token positions.

  what a lexer has to get right is the four places where a character means two things:
  a slash is a divide or a regex, a brace is a block or a hole in a template, a quote runs
  to its twin, and a comment is neither.
*/

const tokens = (x: string) => {
  const out = lex(x);
  if (out.branch === 'err') assert.fail(out.value.message);

  return out.value;
};

test('tell a regex from a divide', () => {
  // after a value a slash divides, and after an operator or nothing it opens a pattern

  assert.equal(tokens('a / b')[1].kind, 'punct');
  assert.equal(tokens('a = /b+/g')[2].kind, 'regex');
  assert.equal(tokens('return /[a/b]/.test(x)')[1].kind, 'regex');
});

test('take a template whole, holes and all', () => {
  // the hole can hold anything, including another template, so the scan nests

  const one = tokens('const x = `a ${ b(`c ${ d }`) } e`;');

  assert.equal(one[3].kind, 'template');
  assert.equal(one[3].text, '`a ${ b(`c ${ d }`) } e`');
  assert.equal(one[4].text, ';');
});

test('say where every token came from', () => {
  // the line and column are the map, so they're on the token and not computed later

  const three = tokens('const a = 1;\nconst b = 2;');
  const second = three[5];

  assert.equal(second.text, 'const');
  assert.equal(second.line, 1);
  assert.equal(second.column, 0);
});

test('keep comments as tokens and skip them everywhere else', () => {
  // they're kept because the emit copies them through, and skipped because they say nothing

  const out = tokens('a /* b */ c\n// d\ne');

  assert.equal(out[1].kind, 'comment');
  assert.equal(out[3].kind, 'comment');
  assert.equal(out[4].text, 'e');
  assert.equal(out[4].line, 2);
});

test('refuse a source that does not close what it opened', () => {
  const out = lex('const x = \'a;');
  if (out.branch === 'ok') assert.fail('this should not have lexed');

  assert.match(out.value.message, /unterminated string/);
});
