import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { keywords } from './scan.js';
import { banned, absent } from './ban.js';
import { roles } from './emit.js';
import { puncts } from './lex.js';

/*
  the docs and the code drift, and nothing caught it

  an `if` expression stayed in the docs for several rounds because nobody compared the
  claim against the code. this spec does the comparison mechanically, so drift becomes a
  failing test: every backticked identifier in the docs is a known construct, every role
  claim matches the handler, and every construct has a spec and a design entry.
*/

const docs = ['README.md', 'DESIGN.md', 'TUTORIAL.md'];

const read = (file: string) => readFileSync(new URL(`../${file}`, import.meta.url), 'utf8');

const words = [...keywords.words, ...keywords.tails, ...keywords.matchers];

const known = new Set([...words, ...banned, ...absent, ...roles.map((r) => r.name), ...puncts]);

const doc = (name: string, text: string) => {
  const lines = text.split('\n');
  return { name, lines };
};

const docTexts = docs.map((file) => doc(file, read(file)));

test('every backticked identifier in the docs is a known construct', () => {
  const id = /`([a-zA-Z_][a-zA-Z0-9_]*)/g;

  // a name in a code example or a prose aside is not a construct; the vocabulary lists
  // the ones the language owns, and everything else that legitimately appears is here
  const prose = new Set([
    'a', 'abort', 'address', 'already', 'andThen', 'answer', 'arrow', 'await', 'body', 'branch',
    'buf', 'c', 'close', 'cond', 'const', 'constructor', 'created', 'db', 'decline', 'decode',
    'e', 'editor', 'Either', 'else', 'exit', 'export', 'f', 'failed', 'fallback', 'fetch', 'fs',
    'g', 'get', 'git', 'hold', 'id', 'import', 'init', 'invalid', 'is', 'iso', 'JSON', 'leaked',
    'let', 'Loader', 'main', 'map', 'matcher', 'n', 'name', 'no', 'on', 'open',
    'outcome', 'panic', 'pay', 'postfix', 'Promise', 'raw', 'read', 'refuse', 'result', 'row',
    'rows', 'scratch', 'seen', 'serve', 'set', 'side', 'source', 'src', 'string', 'table',
    'task', 'tmp', 'to', 'ts', 'tsc', 'tstd', 'tsx', 'type', 'typescript', 'tz', 'tzc', 'tzx',
    'Union', 'unknown', 'unwrap', 'User', 'UserForm', 'val', 'void', 'x', 'claude', 'LanguageService',
    'DateTime', 'Payment', 'A', '_', 'Result', 'Branch', 'loader', 'roles', 'npm'
  ]);

  const misses: string[] = [];

  for (const { name, lines } of docTexts) {
    for (let i = 0; i < lines.length; i++) {
      let m;
      id.lastIndex = 0;
      while ((m = id.exec(lines[i])) !== null) {
        const word = m[1];
        if (known.has(word) || prose.has(word)) continue;
        misses.push(`${name}:${i + 1}: ${word} is not a known construct`);
      }
    }
  }

  assert.deepEqual(misses, []);
});

test('a role claim matches the construct it names', () => {
  const claim = /(?:the|an|a) `([a-zA-Z_]+)` (expression|statement)/g;

  const byName = new Map(roles.map((r) => [r.name, r.role]));
  const misses: string[] = [];

  for (const { name, lines } of docTexts) {
    for (let i = 0; i < lines.length; i++) {
      let m;
      claim.lastIndex = 0;
      while ((m = claim.exec(lines[i])) !== null) {
        const id = m[1];
        const wanted = m[2];
        const role = byName.get(id);
        if (role === undefined) continue;
        if (wanted === 'expression' && (role === 'statement')) misses.push(`${name}:${i + 1}: ${id} is not an expression`);
        if (wanted === 'statement' && role === 'expression') misses.push(`${name}:${i + 1}: ${id} is not a statement`);
      }
    }
  }

  assert.deepEqual(misses, []);
});

test('every construct has a spec entry', () => {
  const emitSpec = read('src/emit.spec.ts');
  const lexSpec = read('src/lex.spec.ts');
  const combined = emitSpec + lexSpec;

  const orphans = roles
    .filter((r) => !combined.includes(r.match))
    .map((r) => `${r.name} has no spec`);

  assert.deepEqual(orphans, []);
});

test('every construct is mentioned in DESIGN.md', () => {
  const design = read('DESIGN.md');

  const orphans = roles
    .filter((r) => !design.includes(r.name))
    .map((r) => `${r.name} is not in DESIGN.md`);

  assert.deepEqual(orphans, []);
});