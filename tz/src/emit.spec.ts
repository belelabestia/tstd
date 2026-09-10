import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { emit } from './emit.js';

/*
  what the emitter is

  typezig is typescript with most of typescript taken away plus a few constructs, and this
  turns the constructs back into typescript. it never parses typescript; it lexes it, finds
  the constructs at token positions, and rewrites those spans.

  the one rule everything else obeys is that a line in makes a line out, so the line number
  is the whole source map and a tsc diagnostic already knows where it belongs.
*/

const out = (x: string) => {
  const written = emit(x);
  if (written.branch === 'err') assert.fail(written.value.message);

  return written.value.code;
};

const refused = (x: string) => {
  const written = emit(x);
  if (written.branch === 'ok') assert.fail('this should not have compiled');

  return written.value.message;
};

test('turn a guard into the if it inverts', () => {
  // a guard states what must hold, so the emit tests the negation

  assert.equal(
    out('const f = (n?: number) => {\n  guard (is.some(n));\n  use(n);\n};'),
    'const f = (n?: number) => {\n  if (!(is.some(n))) return;\n  use(n);\n};'
  );

  // with nothing to say it says nothing, and with something it says err

  assert.equal(
    out('const f = (n: number) => {\n  guard (n > 0) err \'not positive\';\n};'),
    'const f = (n: number) => {\n  if (!(n > 0)) return result.err(\'not positive\');\nreturn result.ok(); };'
  );

  // the tail of a fallible body is an implied ok, so falling off the end can't be undefined
});

test('keep one line for one line, whatever the tail is', () => {
  // a tail that isn't an exit gets braces and the return that a guard implies

  assert.equal(
    out('const f = () => {\n  guard (ok1) log(1);\n};'),
    'const f = () => {\n  if (!(ok1)) { log(1); return; }\n};'
  );

  // and a braced tail carries it on the closing line, so the count still holds

  assert.equal(
    out('const f = () => {\n  guard (ok1) {\n    log(1);\n  }\n};'),
    'const f = () => {\n  if (!(ok1)) {\n    log(1);\n  return; }\n};'
  );
});

test('write the propagation a try stands for', () => {
  assert.equal(
    out('const f = (id: string) => {\n  const user = try db.get(id);\n  ok user;\n};'),
    'const f = (id: string) => {\n  const $0 = db.get(id); if ($0.branch === \'err\') return $0; const user = $0.value;\n  return result.ok(user);\n};'
  );

  // temps are numbered per body, and an await in the body puts the async on the arrow

  assert.equal(
    out('const f = (id: string) => {\n  const a = try await one(id);\n  const b = try two(a);\n  ok b;\n};'),
    'const f = async (id: string) => {\n  const $0 = await one(id); if ($0.branch === \'err\') return $0; const a = $0.value;\n  const $1 = two(a); if ($1.branch === \'err\') return $1; const b = $1.value;\n  return result.ok(b);\n};'
  );
});

test('decline a result without leaving the function', () => {
  // whatever follows the tag is inlined, which is why err in it leaves the function

  assert.equal(
    out('const f = (id: string) => {\n  const conn = connect(id) on:err;\n  return conn;\n};'),
    'const f = (id: string) => {\n  const $0 = connect(id); if ($0.branch === \'err\') return; const conn = $0.value;\n  return conn;\n};'
  );

  // the binding is optional, and where it's used it becomes the temp

  assert.equal(
    out('const f = (id: string) => {\n  const user = db.get(id) on:err (e) err e;\n  ok user;\n};'),
    'const f = (id: string) => {\n  const $0 = db.get(id); if ($0.branch === \'err\') { const e = $0.value; return result.err(e); } const user = $0.value;\n  return result.ok(user);\n};'
  );
});

test('answer with a fallback, and never with a closure', () => {
  // the expression form is a ternary, so there's no allocation and no iife

  assert.equal(
    out('const f = () => {\n  const port = read() on:err (e) => 8080;\n  return port;\n};'),
    'const f = () => {\n  const $0 = read(); const port = $0.branch === \'err\' ? 8080 : $0.value;\n  return port;\n};'
  );

  // absence is the third decline, and it takes the same two shapes

  assert.equal(
    out('const f = () => {\n  const zone = env() any:none => \'utc\';\n  return zone;\n};'),
    'const f = () => {\n  const $0 = env(); const zone = is.none($0) ? \'utc\' : $0;\n  return zone;\n};'
  );
});

test('decline any branch of any union, and chain the refusals', () => {
  // on: names the branch you refuse, so it is not tied to a result at all

  assert.equal(
    out('const f = (x: unknown) => {\n  const c = pick(x) on:idle on:loading;\n  return c;\n};'),
    'const f = (x: unknown) => {\n  const $0 = pick(x); if ($0.branch === \'idle\' || $0.branch === \'loading\') return; const c = $0.value;\n  return c;\n};'
  );

  // and a chain is one condition, so typescript narrows what is left in one step

  assert.equal(
    out('const f = () => {\n  const r = look() any:none on:err;\n  return r;\n};'),
    'const f = () => {\n  const $0 = look(); if (is.none($0) || $0.branch === \'err\') return; const r = $0.value;\n  return r;\n};'
  );
});

test('refuse a value that is there, which is a decline and never an answer', () => {
  assert.equal(
    out('const f = (id: string) => {\n  cache[id] any:some err \'taken\';\n  ok id;\n};'),
    'const f = (id: string) => {\n  const $0 = cache[id]; if (is.some($0)) return result.err(\'taken\');\n  return result.ok(id);\n};'
  );

  assert.match(refused('const f = () => {\n  const x = c[1] any:some => 1;\n  return x;\n};'), /never answers/);
  assert.match(refused('const f = () => {\n  const x = c[1] any:json;\n  return x;\n};'), /some or none/);
  assert.match(refused('const f = () => {\n  const x = c[1] any:none (e);\n  return x;\n};'), /absence carries no value/);
});

test('read a branch in a match, and bind what it carries', () => {
  // a quoted arm matches a value; an arm that starts with : matches a branch

  assert.equal(
    out('const r = match (out) {\n  :ok (user) => keep(user),\n  :err => 0,\n  _ (e) => drop(e)\n};'),
    'const r = (() => { switch (out.branch) {\n  case \'ok\': { const user = out.value; return keep(user); }\n  case \'err\': return 0;\n  default: { const e = out.value; return drop(e); }\n} })();'
  );

  // an expression subject gets a temp, because the payload has to have a name to reach

  assert.equal(
    out('const r = match (load(id)) {\n  :ok (rows) => rows,\n  _ => none\n};'),
    'const r = (() => { const $0 = load(id); switch ($0.branch) {\n  case \'ok\': { const rows = $0.value; return rows; }\n  default: return none;\n} })();'
  );

  assert.match(refused('const r = match (out) {\n  :ok => 1,\n  \'two\' => 2,\n  _ => 3\n};'), /branches or reads values/);
});

test('replace the ternary with words', () => {
  assert.equal(
    out('const n = if (is.number(raw)) raw else 42;'),
    'const n = is.number(raw) ? raw : 42;'
  );

  // chains nest the way you'd expect, and == is the only equality you can type

  assert.equal(
    out('const l =\n  if (n < 0) \'neg\'\n  else if (n == 0) \'zero\'\n  else \'pos\';'),
    'const l =\n  n < 0 ? \'neg\'\n  : n === 0 ? \'zero\'\n  : \'pos\';'
  );
});

test('match on identity, with the default that is always required', () => {
  assert.equal(
    out('const r = match (name) {\n  \'root\' => admin,\n  _ => deny(name)\n};'),
    'const r = (() => { switch (name) {\n  case \'root\': return admin;\n  default: return deny(name);\n} })();'
  );
});

test('refuse what the language does not have', () => {
  // the ban list is a lexer walk, so it costs nothing and can't be switched off

  assert.match(refused('const f = () => { class A { } };'), /class is refused/);
  assert.match(refused('const f = (x: unknown) => x === 1;'), /=== is refused/);
  assert.match(refused('const f = (x: unknown) => x == null;'), /null or undefined/);
  assert.match(refused('const f = (x: boolean) => x ? 1 : 2;'), /the if expression is the one conditional/);
  assert.match(refused('const f = () => { return; };'), /a bare return is refused/);
  assert.match(refused('const f = async () => { use(); };'), /the async modifier is refused/);
});

test('refuse the two lies the discipline check exists for', () => {
  // a body answers one way, so mixing return with ok would infer Result<S, E> | S

  assert.match(refused('const f = (x: number) => {\n  guard (x > 0) err \'no\';\n  return x;\n};'), /mixes them/);

  // and a guard that declines with nothing inside a fallible body is the same union again

  assert.match(refused('const f = (xs: string[], i: number) => {\n  guard (i < xs.length);\n  ok xs[i];\n};'), /say how it failed/);
});

test('carry a column home', () => {
  // the line is already right, so only the column moves, and the anchors say by how much

  const written = emit('const f = (n: number) => {\n  guard (n > 0) err \'no\';\n};');
  if (written.branch === 'err') assert.fail();

  const anchors = written.value.lines[1];
  assert.ok(anchors.length > 0);
  assert.equal(anchors[0].was, 0);
});
