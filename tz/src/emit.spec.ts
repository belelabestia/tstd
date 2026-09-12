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

  a matcher is the same technique one level down: a postfix ? names what failed, and what
  follows it decides whether the scope is left, a value is yielded, or a block runs.
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

test('decline with a matcher, and bind what it refuses', () => {
  // a matcher tests one value, so the emit holds it in a temp and tests that

  assert.equal(
    out('const f = (id: string) => {\n  const found = table[id] ?none err `no row`;\n  ok found;\n};'),
    'const f = (id: string) => {\n  const $0 = table[id]; if (is.none($0)) return result.err(`no row`); const found = $0;\n  return result.ok(found);\n};'
  );

  // booleans are strict: ?false is === false, never falsiness

  assert.equal(
    out('const f = (n: number) => {\n  n > 0 ?false return 0;\n  return n;\n};'),
    'const f = (n: number) => {\n  const $0 = n > 0; if ($0 === false) return 0;\n  return n;\n};'
  );

  // a branch test unwraps, and the binding is optional, renaming to the temp

  assert.equal(
    out('const f = (id: string) => {\n  const user = db.get(id) ?:err (e) err e;\n  ok user;\n};'),
    'const f = (id: string) => {\n  const $0 = db.get(id); if ($0.branch === \'err\') { const e = $0.value; return result.err(e); } const user = $0.value;\n  return result.ok(user);\n};'
  );
});

test('combine refusals before the tail', () => {
  // several matchers, one tail: the tests join with ||, so typescript narrows once

  assert.equal(
    out('const f = (id: string) => {\n  const c = pick(id) ?:idle ?:loading return `no`;\n  return c;\n};'),
    'const f = (id: string) => {\n  const $0 = pick(id); if ($0.branch === \'idle\' || $0.branch === \'loading\') return `no`; const c = $0.value;\n  return c;\n};'
  );

  // but a matcher after a consumed tail belongs to no subject, so it is refused

  assert.match(refused('const f = (id: string) => {\n  const c = pick(id) ?:idle err `a` ?:loading err `b`;\n  return c;\n};'), /one decline per statement/);
  assert.match(refused('const f = (id: string) => {\n  cache[id] ?none (e) err `taken`;\n  ok id;\n};'), /absence carries no value/);
  assert.match(refused('const f = (n: number) => {\n  n > 0 ?true (ok) return n;\n  return n;\n};'), /a literal binds nothing/);
});

test('answer with a fallback, and never with a closure', () => {
  // the expression form is a ternary, so there's no allocation and no iife

  assert.equal(
    out('const f = () => {\n  const zone = env.TZ ?none => `utc`;\n  return zone;\n};'),
    'const f = () => {\n  const $0 = env.TZ; const zone = is.none($0) ? `utc` : $0;\n  return zone;\n};'
  );

  // a block after the => is an iife, which is the one allocation the form allows

  assert.equal(
    out('const f = (read: () => string) => {\n  const found = read() ?:err (e) => {\n    log(e);\n    return `local`;\n  };\n  return found;\n};'),
    'const f = (read: () => string) => {\n  const $0 = read(); const found = $0.branch === \'err\' ? (() => {\n    log($0.value);\n    return `local`;\n  })() : $0.value;\n  return found;\n};'
  );

  // an exit after => would leave while answering, and a bare value answers nothing

  assert.match(refused('const f = () => {\n  const x = c[1] ?none => err `taken`;\n  return x;\n};'), /answers with a value/);

  // but an else may exit, leaving the value to the answer side

  assert.equal(
    out('const f = (cond: boolean) => {\n  const a = cond ?true => 4 else err `nope`;\n  ok a;\n};'),
    'const f = (cond: boolean) => {\n  if (!(cond === true)) return result.err(`nope`); const a = 4;\n  return result.ok(a);\n};'
  );
});

test('match a literal, and test a condition in parens', () => {
  // a literal is strict identity, the ?true rule generalized past booleans

  assert.equal(
    out('const f = (x: number) => {\n  const a = x ?0 => -1;\n  return a;\n};'),
    'const f = (x: number) => {\n  const a = x === 0 ? -1 : x;\n  return a;\n};'
  );

  assert.equal(
    out('const f = (x: number) => {\n  const a = x ?-1.5 => 0;\n  return a;\n};'),
    'const f = (x: number) => {\n  const a = x === -1.5 ? 0 : x;\n  return a;\n};'
  );

  assert.equal(
    out('const f = (s: string) => {\n  const a = s ?\'ok\' => 1 else 0;\n  return a;\n};'),
    'const f = (s: string) => {\n  const a = s === \'ok\' ? 1 :   0;\n  return a;\n};'
  );

  // literals chain and mix like any other matcher, and decline like one too

  assert.equal(
    out('const f = (x: number, d: number) => {\n  x ?0 ?1 return d;\n  return x;\n};'),
    'const f = (x: number, d: number) => {\n  if (x === 0 || x === 1) return d;\n  return x;\n};'
  );

  // a literal declines like any other matcher, and so does a condition in parens

  assert.equal(
    out('const f = (x: number) => {\n  x ?0 err `zero`;\n  x ?(x < 0) err `neg`;\n  ok x;\n};'),
    'const f = (x: number) => {\n  if (x === 0) return result.err(`zero`);\n  if ((x < 0) === true) return result.err(`neg`);\n  return result.ok(x);\n};'
  );

  // a bare return after a condition is a decline too, so ban lets it through

  assert.equal(
    out('const f = (x: number) => {\n  x ?(x <= 0) return;\n  return x;\n};'),
    'const f = (x: number) => {\n  if ((x <= 0) === true) return;\n  return x;\n};'
  );

  assert.equal(
    out('const f = (x: string | undefined, d: string) => {\n  const a = x ?none ?\'a\' => d;\n  ok a;\n};'),
    'const f = (x: string | undefined, d: string) => {\n  const a = is.none(x) || x === \'a\' ? d : x;\n  return result.ok(a);\n};'
  );

  // a condition in parens tests strictly: the hit is === true, never truthiness

  assert.equal(
    out('const f = (n: number) => {\n  const a = n ?(n < 0) => 0;\n  return a;\n};'),
    'const f = (n: number) => {\n  const a = (n < 0) === true ? 0 : n;\n  return a;\n};'
  );

  // effects plus an exit spell inline, the subject landing on a miss

  assert.equal(
    out('const f = (x: number) => {\n  const a = x ?(x <= 0) {\n    log(x);\n    err `bad ${x}`;\n  };\n  ok a;\n};'),
    'const f = (x: number) => {\n  if ((x <= 0) === true) {\n    log(x);\n    return result.err(`bad ${x}`);\n  };const a = x;\n  return result.ok(a);\n};'
  );

  // literals never bind, and conditions bind nothing either

  assert.match(refused('const f = (x: number) => {\n  const a = x ?0 (v) => v;\n  return a;\n};'), /a literal binds nothing/);
  assert.match(refused('const f = (x: number) => {\n  const a = x ?(x > 0) (v) => v;\n  return a;\n};'), /binds nothing; the subject is already named/);

  // a condition tests a bare name, needs something to test, and owns no templates

  assert.match(refused('const f = (a: number) => {\n  const v = f(a) ?(f(a) > 0) => 1;\n  return v;\n};'), /tests a name/);
  assert.match(refused('const f = (x: number) => {\n  const v = x ?() => 1;\n  return v;\n};'), /tests something/);
  assert.match(refused('const f = (x: string) => {\n  const v = x ?`lit` => 1;\n  return v;\n};'), /static spelling/);

  // a condition binds nothing, so a binding after one is refused

  assert.match(refused('const f = (x: X) => {\n  const v = x ?:err ?(e > 0) (e) => 1;\n  return v;\n};'), /binds nothing/);
});

test('answer conditions together in ? {}, with switch (true) only then', () => {
  // a condition arm tests strictly in an expression block, which switches on true

  assert.equal(
    out('const f = (x: number) => {\n  const a = x ? {\n    (x < 0) => -1,\n    _ => 0\n  };\n  return a;\n};'),
    'const f = (x: number) => {\n  const a = (() => { switch (true) {\n    case (x < 0): return -1;\n    default: return 0;\n  } })();\n  return a;\n};'
  );

  // literals beside conditions become boolean cases too, first hit winning

  assert.equal(
    out('const f = (x: number) => {\n  const a = x ? {\n    0 => `zero`,\n    (x > 0) => `pos`,\n    _ => `other`\n  };\n  return a;\n};'),
    'const f = (x: number) => {\n  const a = (() => { switch (true) {\n    case (x === 0): return `zero`;\n    case (x > 0): return `pos`;\n    default: return `other`;\n  } })();\n  return a;\n};'
  );

  // a value arm beside conditions is an expression, so it is spelled strictly and keeps its own parens

  assert.equal(
    out('const f = (x: number, d: number) => {\n  const a = x ? {\n    d == 0 => `zero`,\n    (x > 0) => `pos`,\n    _ => `other`\n  };\n  return a;\n};'),
    'const f = (x: number, d: number) => {\n  const a = (() => { switch (true) {\n    case (x === (d === 0)): return `zero`;\n    case (x > 0): return `pos`;\n    default: return `other`;\n  } })();\n  return a;\n};'
  );

  // statement arms switch on true, so overlapping conditions run once

  assert.equal(
    out('const f = (x: number, log: (s: string) => void) => {\n  x ? {\n    (x < 0) log(`neg`);\n    (x > 0) log(`pos`);\n  };\n  return x;\n};'),
    'const f = (x: number, log: (s: string) => void) => {\n  switch (true) {\n    case (x < 0): log(`neg`); break;\n    case (x > 0): log(`pos`); break;\n  };\n  return x;\n};'
  );

  // a condition tests a bare name, needs something to test, and binds nothing

  assert.match(refused('const f = (a: number) => {\n  const v = f(a) ? {\n    (f(a) > 0) => 1,\n    _ => 0\n  };\n  return v;\n};'), /tests a name/);
  assert.match(refused('const f = (x: number) => {\n  const a = x ? {\n    () => 1,\n    _ => 0\n  };\n  return a;\n};'), /tests something/);
  assert.match(refused('const f = (x: number) => {\n  const a = x ? {\n    (x > 0) (v) => v,\n    _ => 0\n  };\n  return a;\n};'), /binds nothing/);
});

test('rename through template holes, and drop bindings nothing uses', () => {
  // a bound name inside ${} renames like any other, holes and all

  assert.equal(
    out('const f = (read: Read) => {\n  const v = read() ?:err (e) => `got ${e}`;\n  return v;\n};'),
    'const f = (read: Read) => {\n  const $0 = read(); const v = $0.branch === \'err\' ? `got ${$0.value}` : $0.value;\n  return v;\n};'
  );

  // a binding nothing uses is refused everywhere it can appear

  assert.match(refused('const f = (read: Read) => {\n  const v = read() ?:err (e) => `local`;\n  return v;\n};'), /never used; drop the binding/);
  assert.match(refused('const f = (read: Read) => {\n  read() ?:err (e) err `bad`;\n  ok 1;\n};'), /never used; drop the binding/);
  assert.match(refused('const f = (cond: boolean) => {\n  cond ?true (ok) { log(); };\n  return 0;\n};'), /binds nothing/);
  assert.match(refused('const r = out ? {\n  :ok (user) => 1,\n  _ => 2\n};'), /never used; drop the binding/);

  // and the miss branch cannot borrow what only the answer owns

  assert.match(refused('const f = (x: X) => {\n  const v = x ?:e (e) => 1 else f(e);\n  return v;\n};'), /runs on miss, where \(e\) names nothing/);

  // a binding names a value, so keywords are refused as names

  assert.match(refused('const f = (x: X) => {\n  const v = x ?:e (else) => 1;\n  return v;\n};'), /not a keyword/);
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

  // try already declines, so a matcher in the same statement has nothing to do

  assert.match(refused('const f = (id: string) => {\n  const user = try db.get(id) ?:err (e) err e;\n  ok user;\n};'), /already declines/);
});

test('call the foreign boundary by keyword', () => {
  // call wraps one throwing expression, and try propagates it as usual

  assert.equal(
    out('const f = (body: string) => {\n  const raw = try call => JSON.parse(body);\n  ok raw;\n};'),
    'const f = (body: string) => {\n  const $0 = call.sync(() => JSON.parse(body)); if ($0.branch === \'err\') return $0; const raw = $0.value;\n  return result.ok(raw);\n};'
  );

  // a block holds several lines, and await picks the async boundary

  assert.equal(
    out('const f = (url: string) => {\n  const r = try await call => fetch(url);\n  ok r;\n};'),
    'const f = async (url: string) => {\n  const $0 = await call.async(() => fetch(url)); if ($0.branch === \'err\') return $0; const r = $0.value;\n  return result.ok(r);\n};'
  );

  assert.equal(
    out('const r = call JSON.parse(x);'),
    'const r = call.sync(() => JSON.parse(x));'
  );

  // try unwraps left, so it takes => like a side matcher does; without try the whole result is wrapped

  assert.match(refused('const f = (body: string) => {\n  const raw = try call JSON.parse(body);\n  ok raw;\n};'), /try call takes =>/);

  // call always takes => too: without try it is the same closure, answered straight back

  assert.equal(
    out('const r = call => JSON.parse(x);'),
    'const r = call.sync(() => JSON.parse(x));'
  );

  assert.equal(
    out('const parse = (raw: string) => call => JSON.parse(raw);'),
    'const parse = (raw: string) => call.sync(() => JSON.parse(raw));'
  );

  // an arrow with no block cannot lift, so await forwards the promise itself

  assert.equal(
    out('export const get = (url: string) => await call => fetch(url);'),
    'export const get = (url: string) =>  call.async(() => fetch(url));'
  );

  // a call block opens its closure with =>, so return answers it and nothing else

  assert.equal(
    out('const f = (file: { read: () => string }) => {\n  const out = try call => {\n    const content = file.read();\n    return JSON.parse(content);\n  };\n  ok out;\n};'),
    'const f = (file: { read: () => string }) => {\n  const $0 = call.sync(() => {\n    const content = file.read();\n    return JSON.parse(content);\n  }); if ($0.branch === \'err\') return $0; const out = $0.value;\n  return result.ok(out);\n};'
  );

  // an await inside the closure picks call.async, writes the async itself, and is awaited from the body

  assert.equal(
    out('const f = (url: string) => {\n  const r = try call => {\n    return await fetch(url);\n  };\n  ok r;\n};'),
    'const f = async (url: string) => {\n  const $0 = await call.async(async () => {\n    return await fetch(url);\n  }); if ($0.branch === \'err\') return $0; const r = $0.value;\n  return result.ok(r);\n};'
  );

  assert.equal(
    out('const f = () => {\n  const r = try call => await g();\n  ok r;\n};'),
    'const f = async () => {\n  const $0 = await call.async(async () => await g()); if ($0.branch === \'err\') return $0; const r = $0.value;\n  return result.ok(r);\n};'
  );

  // a bare block is refused, and a falling body never answers

  assert.match(refused('const f = (file: string) => {\n  const raw = try call {\n    const c = file.read();\n  };\n  ok raw;\n};'), /takes =>/);
  assert.match(refused('const f = (file: string) => {\n  const raw = try call => {\n    const c = file.read();\n  };\n  ok raw;\n};'), /answers with return/);

  // a call answers, so an uncaptured one dangles and is refused

  assert.match(refused('const f = (file: { read: () => string }) => {\n  call => {\n    return 1;\n  };\n  return 0;\n};'), /capture it with try or bind it/);
  assert.match(refused('const f = (x: string) => {\n  call JSON.parse(x);\n  return 0;\n};'), /capture it with try or bind it/);

  // an explicit void discards on purpose, and passes through

  assert.equal(
    out('const f = (x: string) => {\n  void call JSON.parse(x);\n  return 0;\n};'),
    'const f = (x: string) => {\n  void call.sync(() => JSON.parse(x));\n  return 0;\n};'
  );

  // a call that yields nothing spells void, in a fallible body too

  assert.equal(
    out('const f = (save: (x: string) => void, x: string) => {\n  void call => save(x);\n  ok `saved`;\n};'),
    'const f = (save: (x: string) => void, x: string) => {\n  void call.sync(() => save(x));\n  return result.ok(`saved`);\n};'
  );

  // try lands its ok, so the bare drop is refused and the deliberate one spells void try

  assert.equal(
    out('const f = (g: () => void) => {\n  void try call => g();\n  ok 1;\n};'),
    'const f = (g: () => void) => {\n  const $0 = call.sync(() => g()); if ($0.branch === \'err\') return $0; void $0.value;\n  return result.ok(1);\n};'
  );

  assert.match(refused('const f = (g: () => void) => {\n  try call => g();\n  ok 1;\n};'), /drops the ok branch/);
});

test('answer with a chain, decline with a statement', () => {
  // an expression answers with =>, and else names the miss branch

  assert.equal(
    out('export const label = (n: number) =>\n  n < 0 ?true => `below` else => `above`;'),
    'export const label = (n: number) =>\n  (($0) => $0 === true ? `below` : `above`)(n < 0);'
  );

  // an else branch holds another chain, each subject evaluated only on its miss

  assert.equal(
    out('export const label = (n: number) =>\n  n < 0 ?true => `below` else n == 0 ?true => `nothing` else => `above`;'),
    'export const label = (n: number) =>\n  (($0) => $0 === true ? `below` : (($1) => $1 === true ? `nothing` : `above`)(n === 0))(n < 0);'
  );

  // a bare value answers nothing; the miss answers with => or an exit

  assert.match(refused('export const label = (n: number) =>\n  n < 0 ?true => `below` else `above`;'), /bare value answers nothing/);
  assert.match(refused('export const label = (n: number) =>\n  n < 0 ?true `below` else => `above`;'), /answers with =>/);
  assert.match(refused('export const label = (n: number) =>\n  n < 0 ?true => `below` ?false => `above`;'), /chain with else/);
});

test('a chain declines as a ladder, captured as a let', () => {
  // a captured chain stays a ternary while every answer is a value

  assert.equal(
    out('const f = (c: boolean, o: boolean) => {\n  const a = c ?true => 4 else o ?true => 6 else => 8;\n  return a;\n};'),
    'const f = (c: boolean, o: boolean) => {\n  const a = c === true ? 4 :   (() => { return o === true ? 6 : 8; })();\n  return a;\n};'
  );

  // an exit in the final else flips the whole chain to a funnel: the value branches
  // assign to a temp, the decline branch leaves, and the binding reads the temp

  assert.equal(
    out('const f = (c: boolean, o: boolean) => {\n  const a = c ?true => 4 else o ?true => 6 else return 8;\n  return a;\n};'),
    'const f = (c: boolean, o: boolean) => {\n  let $1; if (c === true) { $1 = 4; } else {   if (o === true) { $1 = 6; } else { return 8; } } const a = $1;\n  return a;\n};'
  );

  // as a body there is no temp: the whole chain is the decline ladder

  assert.equal(
    out('export const level = (n: number) =>\n  n < 0 ?true => `below`\n  else n == 0 ?true => `nothing`\n  else return `above`;'),
    'export const level = (n: number) =>\n  { const $0 = n < 0; if ($0 === true) return `below`; const $1 = n === 0; if ($1 === true) return `nothing`; return `above`; };'
  );

  // a chain inside an expression declines nowhere: there is no scope for the exit

  assert.match(refused('const f = (c: boolean) => {\n  const r = g(c ?true => 4 else return 8);\n  ok r;\n};'), /cannot be a value here/);

  // but a value chain nests anywhere, the else-compile reused

  assert.equal(
    out('const f = (c: boolean, o: boolean) => {\n  const r = g(c ?true => 4 else o ?true => 6 else => 8);\n  ok r;\n};'),
    'const f = (c: boolean, o: boolean) => {\n  const r = g((c === true ? 4 : (() => { return o === true ? 6 : 8; })()) );\n  return result.ok(r);\n};'
  );
});

test('run one side as a statement, and exit from a block', () => {
  // a statement runs an expression, no =>, no capture

  assert.equal(
    out('const f = (cond: boolean) => {\n  status ?true log(`up`);\n  return 0;\n};'),
    'const f = (cond: boolean) => {\n  if (status === true) log(`up`);\n  return 0;\n};'
  );

  // presence binds what was there, the way a branch binds what it carries

  assert.equal(
    out('const f = () => {\n  request.body.email ?some (email) sendMail(email);\n  return 1;\n};'),
    'const f = () => {\n  const $0 = request.body.email; if (is.some($0)) sendMail($0);\n  return 1;\n};'
  );

  // two sides use else, one line or one block per side, like an if

  assert.equal(
    out('const f = (cond: boolean) => {\n  log(`start`);\n  cond ?true seen(`yes`) else seen(`no`);\n  log(`done`);\n};'),
    'const f = (cond: boolean) => {\n  log(`start`);\n  if (cond === true) seen(`yes`); else seen(`no`);\n  log(`done`);\n};'
  );

  assert.equal(
    out('const f = (cond: boolean) => {\n  log(`start`);\n  cond ?true {\n      a();\n      b();\n    } else {\n      c();\n      d();\n    };\n  log(`done`);\n};'),
    'const f = (cond: boolean) => {\n  log(`start`);\n  if (cond === true) {\n      a();\n      b();\n    } else {\n      c();\n      d();\n    };\n  log(`done`);\n};'
  );

  assert.match(refused('const f = (cond: boolean) => {\n  status ?true => log(`up`);\n  return 0;\n};'), /must always be captured/);
  assert.match(refused('const f = (cond: boolean) => {\n  cond ?true {\n      a();\n    } ?false {\n      c();\n    };\n  return 0;\n};'), /uses else/);

  // and ? {} lists every side, one arm per line, the statement form of an answer

  assert.equal(
    out('const f = (cond: boolean, seen: (x: string) => void) => {\n  cond ? {\n    true seen(`yes`);\n    false seen(`no`);\n  };\n  return cond;\n};'),
    'const f = (cond: boolean, seen: (x: string) => void) => {\n  switch (cond) {\n    case true: seen(`yes`); break;\n    case false: seen(`no`); break;\n  };\n  return cond;\n};'
  );

  // presence arms bind what was there, the way ?some does for one value

  assert.equal(
    out('const f = (email: string | undefined) => {\n  email ? {\n    some (v) sendMail(v);\n  };\n  return 0;\n};'),
    'const f = (email: string | undefined) => {\n  switch (true) {\n    case (is.some(email)): sendMail(email); break;\n  };\n  return 0;\n};'
  );

  // an arm block binds what its branch carries, with no => in sight

  assert.equal(
    out('const f = (x: X) => {\n  x ? {\n    :ok (v) { log(v); }\n  };\n  return 0;\n};'),
    'const f = (x: X) => {\n  switch (x.branch) {\n    case \'ok\': { const v = x.value; log(v); } break;\n  };\n  return 0;\n};'
  );

  // and a block that exits is the inline decline, effects first and value or not

  assert.equal(
    out('const f = (cond: boolean) => {\n  cond ?true {\n    log();\n    return 6;\n  }\n  return 0;\n};'),
    'const f = (cond: boolean) => {\n  if (cond === true) {\n    log();\n    return 6;\n  }\n  return 0;\n};'
  );

  // a block that never leaves yields nothing, so with a land it is refused

  assert.match(refused('const f = (cond: boolean) => {\n  const v = cond ?true {\n    log();\n  };\n  return v;\n};'), /yields nothing to land on/);
  assert.match(refused('const f = (cond: boolean) => {\n  cond ?true => log(`up`);\n  return 0;\n};'), /must always be captured/);
});

test('unwrap inside argument lists, where a statement never could', () => {
  // each failure is hoisted before the call in source order, sharing no temp

  assert.equal(
    out('const f = () => {\n  const r = processPayment(\n    cart[userId] ?none err `empty`,\n    token ?none err `missing`\n  ) ?:err (e) err `failed: ${e}`;\n  ok r;\n};'),
    'const f = () => {\n  const $0 = cart[userId]; if (is.none($0)) return result.err(`empty`); if (is.none(token)) return result.err(`missing`); const $2 = processPayment(\n    $0,\n    token\n  ); if ($2.branch === \'err\') { const e = $2.value; return result.err(`failed: ${e}`); } const r = $2.value;\n  return result.ok(r);\n};'
  );

  // matchers do not nest: the inner value gets a name first

  assert.match(refused('const f = () => {\n  const r = pay(f(a ?none => b) ?none err `empty`);\n  ok r;\n};'), /do not nest/);
});

test('read a branch in ? {}, and bind what it carries', () => {
  // a quoted arm matches a value; an arm that starts with : matches a branch

  assert.equal(
    out('const r = out ? {\n  :ok (user) => keep(user),\n  :err => 0,\n  _ (e) => drop(e)\n};'),
    'const r = (() => { switch (out.branch) {\n  case \'ok\': { const user = out.value; return keep(user); }\n  case \'err\': return 0;\n  default: { const e = out.value; return drop(e); }\n} })();'
  );

  // an expression subject gets a temp, because the payload has to have a name to reach

  assert.equal(
    out('const r = load(id) ? {\n  :ok (rows) => rows,\n  _ => none\n};'),
    'const r = (() => { const $0 = load(id); switch ($0.branch) {\n  case \'ok\': { const rows = $0.value; return rows; }\n  default: return none;\n} })();'
  );

  assert.match(refused('const r = out ? {\n  :ok => 1,\n  \'two\' => 2,\n  _ => 3\n};'), /branches or reads values/);
});

test('answer exhaustively with ? {}, over values as well as branches', () => {
  // a quoted arm matches a value, with the default that is always required

  assert.equal(
    out('const r = code ? {\n  200 => `ok`,\n  _ => `other`\n};'),
    'const r = (() => { switch (code) {\n  case 200: return `ok`;\n  default: return `other`;\n} })();'
  );

  assert.equal(
    out('const r = name ? {\n  \'root\' => admin,\n  _ => deny(name)\n};'),
    'const r = (() => { switch (name) {\n  case \'root\': return admin;\n  default: return deny(name);\n} })();'
  );

  // no _, no mixing, and never uncaptured; tsc owns totality, so a missing
// branch lands as | undefined instead of a transpiler refusal

  assert.match(refused('const r = out ? {\n  :ok => 1,\n  `two` => 2,\n  _ => 3\n};'), /branches or reads values/);
  assert.equal(
    out('const r = out ? {\n  :ok => 1\n};'),
    'const r = (() => { switch (out.branch) {\n  case \'ok\': return 1;\n} })();'
  );
  assert.match(refused('const f = (x: X) => {\n  x ? {\n    :ok => 1,\n    _ => 2\n  };\n  return 0;\n};'), /must always be captured/);

  // an arm answers with a value, so exits are refused however they arrive

  assert.match(refused('const r = out ? {\n  :ok => return 1,\n  _ => 0\n};'), /hoist the exit out/);
  assert.match(refused('const f = (out: X) => {\n  const r = out ? {\n    :ok (v) => { ok v; },\n    _ => 0\n  };\n  ok r;\n};'), /hoist the exit out/);

  // presence words are matchers, not arms; and a block answer still needs its =>

  assert.match(refused('const r = x ? {\n  none => -1,\n  _ => 0\n};'), /none and some test presence/);
  assert.match(refused('const r = out ? {\n  :ok { log(1); },\n  _ => 0\n};'), /answers with a value or declines/);
});

test('an arm may decline, and the captured block becomes a let-temp switch', () => {
  // a captured ? {} with a declining arm turns into the funnel: answer arms
  // land in a temp, decline arms leave the function, the binding reads the temp

  assert.equal(
    out('const f = (out: X) => {\n  const r = out ? {\n    :ok (u) => u,\n    :err (e) err e\n  };\n  return r;\n};'),
    'const f = (out: X) => {\n  let $1; switch (out.branch) {\n    case \'ok\': $1 = out.value; break;\n    case \'err\': return result.err(out.value);} const r = $1;\n  return r;\n};'
  );

  // as the whole body there is no temp: the switch returns leave the function

  assert.equal(
    out('const f = (out: X) => out ? {\n  :ok (u) => u,\n  :err (e) err e\n};'),
    'const f = (out: X) => { switch (out.branch) {\n  case \'ok\': return out.value;\n  case \'err\': return result.err(out.value);} };'
  );

  // nested in an argument the funnel hoists before the statement, no iife

  assert.equal(
    out('const f = (x: X) => {\n  handle(x ? {\n    :err err \'no error\',\n    _ (v) => v\n  });\n  return 0;\n};'),
    'const f = (x: X) => {\n  if (x.branch === \'err\') return result.err(\'no error\'); handle(x.value);\n  return 0;\n};'
  );

  // the ? {} parallel of the multi-tag chain: matcher arms decline, the
  // remainder extracts the survivor

  assert.equal(
    out('const f = (x: X) => {\n  const rows = x ? {\n    ?:idle return,\n    ?:err return,\n    _ => x.value\n  };\n  return rows;\n};'),
    'const f = (x: X) => {\n  let $1; switch (x.branch) {\n    case \'idle\': return;\n    case \'err\': return;\n    default: $1 = x.value; break;} const rows = $1;\n  return rows;\n};'
  );

  // a matcher arm only declines, and an all-answers block stays the iife

  assert.match(refused('const r = out ? {\n  ?:idle => 1,\n  _ => 0\n};'), /a matcher arm declines/);
});

test('a decline tail answers on the miss, binding the survivor', () => {
  // a matcher chain declines on match, and the else binds the survivor and
  // continues into a new subject, mixing declines and fallbacks

  assert.equal(
    out('const f = (x: X, y: boolean) => {\n  const a = x ?:a ?:b ?:c err \'no\' else (v) => y ?true err v else => 1;\n  ok a;\n};'),
    'const f = (x: X, y: boolean) => {\n  if (x.branch === \'a\' || x.branch === \'b\' || x.branch === \'c\') return result.err(\'no\'); const v = x.value;  if (y === true) return result.err(v);  const a = 1;\n  return result.ok(a);\n};'
  );

  // the miss may answer plainly, with no binding and no continuation

  assert.equal(
    out('const f = (x: X) => {\n  const a = x ?:err return else => 5;\n  return a;\n};'),
    'const f = (x: X) => {\n  if (x.branch === \'err\') return;  const a = 5;\n  return a;\n};'
  );
});

test('construct a branch with a colon', () => {
  // :tag is the literal notation for a branch, with or without its value

  assert.equal(out('const x = :idle;'), 'const x = branch(\'idle\');');
  assert.equal(out('const y = :err(1);'), 'const y = branch(\'err\', 1);');

  // and an answer can build one where a ? {} arm binds one

  assert.equal(
    out('const f = (code: number) => code ? {\n  200 => :ok,\n  _ => :err(`bad`)\n};'),
    'const f = (code: number) => (() => { switch (code) {\n  case 200: return branch(\'ok\');\n  default: return branch(\'err\', `bad`);\n} })();'
  );

  // one value or nothing: empty parens and pairs are both refused

  assert.match(refused('const y = :err();'), /one value or nothing/);
  assert.match(refused('const y = :err(1, 2);'), /one value/);
});

test('declare a form once, and read it twice', () => {
  // a plain field reads the same on both sides, so the guard is wrapped

  assert.equal(
    out('export form user {\n  id: is.string\n}'),
    'export const user = {\n  id: form.plain(is.string)\n}; export type UserForm = form.Encoded<typeof user>; export type User = form.Decoded<typeof user>;'
  );

  // a semicolon separates fields too, the way an object literal accepts it

  assert.equal(
    out('export form user {\n  id: is.string;\n  seen: is.number\n}'),
    'export const user = {\n  id: form.plain(is.string);\n  seen: form.plain(is.number)\n}; export type UserForm = form.Encoded<typeof user>; export type User = form.Decoded<typeof user>;'
  );

  // a triple is already a field, so it passes through untouched

  assert.equal(
    out('export form user {\n  id: is.string,\n  seen: {\n    is: iso.timestamp,\n    decode: (x: iso.Timestamp) => x,\n    encode: (x: iso.Timestamp) => x\n  }\n}'),
    'export const user = {\n  id: form.plain(is.string),\n  seen: {\n    is: iso.timestamp,\n    decode: (x: iso.Timestamp) => x,\n    encode: (x: iso.Timestamp) => x\n  }\n}; export type UserForm = form.Encoded<typeof user>; export type User = form.Decoded<typeof user>;'
  );

  // as renames the memory key, the way form.as does underneath

  assert.equal(
    out('export form user {\n  id: is.string,\n  created_at: {\n    is: iso.timestamp,\n    decode: iso.fromTimestamp,\n    encode: iso.toTimestamp\n  } as createdAt\n}'),
    'export const user = {\n  id: form.plain(is.string),\n  created_at: form.as({\n    is: iso.timestamp,\n    decode: iso.fromTimestamp,\n    encode: iso.toTimestamp\n  }, \'createdAt\')\n}; export type UserForm = form.Encoded<typeof user>; export type User = form.Decoded<typeof user>;'
  );

  // a nested form delegates through nest, which is already a field

  assert.equal(
    out('export form user {\n  id: is.string,\n  address: form.nest(address)\n}'),
    'export const user = {\n  id: form.plain(is.string),\n  address: form.nest(address)\n}; export type UserForm = form.Encoded<typeof user>; export type User = form.Decoded<typeof user>;'
  );

  // no generics, no arrows, no rename without a key: the shape is fixed

  assert.match(refused('export form user<T> {\n  id: is.string\n}'), /no generics/);
  assert.match(refused('export form user {\n  id: is.string => name\n}'), /retired in forms/);
  assert.match(refused('export form user {\n  id: is.string,\n  seen: {\n    is: iso.timestamp\n  } as\n}'), /renames with a key/);
});

test('refuse the if expression, and pass the statement through', () => {
  // answering is the matchers' job now; an if without else is just flow

  assert.match(refused('const n = if (is.number(raw)) raw else 42;'), /an if expression is refused/);

  assert.equal(
    out('const f = (n: number) => {\n  if (n < 0) return 0;\n  return n;\n};'),
    'const f = (n: number) => {\n  if (n < 0) return 0;\n  return n;\n};'
  );
});

test('match is retired; ? {} answers exhaustively', () => {
  assert.match(refused('const r = match (name) {\n  \'root\' => admin,\n  _ => deny(name)\n};'), /match is refused/);
});

test('refuse what the language does not have', () => {
  // the ban list is a lexer walk, so it costs nothing and can't be switched off

  assert.match(refused('const f = () => { class A { } };'), /class is refused/);
  assert.match(refused('const f = (x: unknown) => x === 1;'), /=== is refused/);
  assert.match(refused('const f = (x: unknown) => x == null;'), /null or undefined/);
  assert.match(refused('const f = (x: boolean) => x ? 1 : 2;'), /answer with \?true/);
  assert.match(refused('const f = () => { return; };'), /it is a matcher/);
  assert.match(refused('const f = async () => { use(); };'), /the async modifier is refused/);
  assert.match(refused('const f = (x: unknown) => x ?? y;'), /none =>/);
  assert.match(refused('const f = (x: number) => {\n  guard (x > 0);\n  return x;\n};'), /guard is refused/);
  assert.match(refused('const f = () => {\n  const c = pick() on:err;\n  return c;\n};'), /on: is retired/);
  assert.match(refused('const f = () => {\n  const c = pick() any:none;\n  return c;\n};'), /any: is retired/);
});

test('refuse the lie the discipline check exists for', () => {
  // a body answers one way, so mixing an err decline with a return answers twice

  assert.match(refused('const f = (x: number) => {\n  x > 0 ?false err \'no\';\n  return x;\n};'), /mixes them/);
});

test('hold resources in a scope, one line for one line', () => {
  // sync is the case with no await; the binding keeps its name and the close gains );
  assert.equal(
    out('const copy = (from: string, to: string) => scope (hold) => {\n  const src = try hold(openRead(from));\n  const dst = try hold(openWrite(to));\n  ok pump(src, dst);\n};'),
    'const copy = (from: string, to: string) => scope.sync(hold => {\n  const $0 = hold(openRead(from)); if ($0.branch === \'err\') return $0; const src = $0.value;\n  const $1 = hold(openWrite(to)); if ($1.branch === \'err\') return $1; const dst = $1.value;\n  return result.ok(pump(src, dst));\n});'
  );

  // an await in the body picks scope.async and an async callback, by the same count as the lifts

  assert.equal(
    out('const f = (x: string) => scope (hold) => {\n  const a = try await hold(open(x));\n  ok a;\n};'),
    'const f = (x: string) => scope.async(async hold => {\n  const $0 = await hold(open(x)); if ($0.branch === \'err\') return $0; const a = $0.value;\n  return result.ok(a);\n});'
  );

  // a scope binds one name, the way a matcher binds one

  assert.match(refused('const f = () => scope (a, b) => {\n  ok 1;\n};'), /binds one name/);
  assert.match(refused('const f = () => scope () => {\n  ok 1;\n};'), /binds one name/);

  // a scope hands back its exit, so an uncaptured one dangles and is refused

  assert.match(refused('const f = () => {\n  scope (hold) => {\n    ok 1;\n  };\n  return 0;\n};'), /hands back its exit/);
});

test('declare a union or a machine, and name the three things a protocol makes', () => {
  // a transition list after => makes a machine; its absence makes a union,
  // and a branch with nothing to carry spells nothing
  assert.equal(
    out('protocol loader {\n  idle => loading,\n  loading<{ at: number }> => success | error,\n  success<string[]>,\n  error<unknown> => loading\n}'),
    'const loader = protocol.init({\n  idle: () => [\'loading\'],\n  loading: (value: { at: number }) => [\'success\', \'error\'],\n  success: (value: string[]) => {},\n  error: (value: unknown) => [\'loading\']\n}); type Loader = Union<protocol.Model<typeof loader>>;'
  );

  // the same absence at the end of a one-branch union, which is just a name with a comma
  assert.equal(
    out('protocol quiet {\n  idle\n}'),
    'const quiet = protocol.init({\n  idle: () => {}\n}); type Quiet = Union<protocol.Model<typeof quiet>>;'
  );

  // generics get shape functions, because only an inline object keeps its tuples typed;
  // the parameters take angle brackets in the declaration, exactly as the branches do
  assert.equal(
    out('export protocol result<S, E> {\n  ok<S>,\n  err<E>\n}'),
    'const $result = <S, E>() => ({\n  ok: (value: S) => {},\n  err: (value: E) => {}\n}); export type Result<S, E> = Union<protocol.Model<typeof $result<S, E>>>; export const result = protocol.init($result());'
  );

  // a parameter and a concrete type can share a protocol, each in the same angle brackets;
  // a nested generic reads `>>` as two closes, so the last one becomes the factory's paren
  assert.equal(
    out('protocol thing<S> {\n  a<S>,\n  b<number>,\n  c<Array<string>>\n}'),
    'const $thing = <S>() => ({\n  a: (value: S) => {},\n  b: (value: number) => {},\n  c: (value: Array<string>) => {}\n}); type Thing<S> = Union<protocol.Model<typeof $thing<S>>>; const thing = protocol.init($thing());'
  );

  assert.match(refused('protocol loader (idle)'), /angle brackets/);
  assert.match(refused('protocol loader <idle }'), /no closing angle/);
  assert.match(refused('protocol loader {\n  idle now\n}'), /angle brackets/);
  assert.match(refused('protocol loader {\n  idle(string)\n}'), /angle brackets/);
  assert.match(refused('protocol loader {\n  idle()\n}'), /spells nothing/);
  assert.match(refused('protocol loader {\n  idle<number\n}'), /no closing angle/);
  assert.match(refused('protocol loader {\n  idle<>\n}'), /needs a type/);
  assert.match(refused('protocol loader {\n  idle =>\n}'), /names a branch/);
});

test('keep a keyword as a branch name', () => {
  // the first entry follows a {, which is a statement start; sealing keeps it a name
  assert.equal(
    out('export protocol job<S, E> {\n  ok<S>,\n  err<E>\n}'),
    'const $job = <S, E>() => ({\n  ok: (value: S) => {},\n  err: (value: E) => {}\n}); export type Job<S, E> = Union<protocol.Model<typeof $job<S, E>>>; export const job = protocol.init($job());'
  );
});

test('carry a column home', () => {
  // the line is already right, so only the column moves, and the anchors say by how much

  const written = emit('const f = (n: number) => {\n  n > 0 ?false err \'no\';\n};');
  if (written.branch === 'err') assert.fail();

  const anchors = written.value.lines[1];
  assert.ok(anchors.length > 0);
  assert.equal(anchors[0].was, 0);
});
