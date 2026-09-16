import { API, SignatureKind, type Checker, type Type } from 'typescript/unstable/sync';
import { call, is } from '@belelabestia/tstd';
import { lex, Token } from './lex.js';
import { keyword, scan } from './scan.js';

/** a diagnostic on a tz line, shaped the way lsp notes are */
type Note = { line: number, column: number, level: 'warning', code: string, message: string; };

/** a tz line range a ? {} owns, head line through close line */
type Owned = { from: number, to: number; };

/** where one tz question looks for its answer in the mirror */
type Ask = { subject: string, covered: string[], branch: boolean, line: number, column: number; };

/** one guard testing a condition outside a ? {} */
type Guard = { text: string, trigger: boolean, line: number, column: number; };

const rowAt = (code: string, at: number) => {
  const from = code.lastIndexOf('\n', at - 1) + 1;
  const end = code.indexOf('\n', at);

  return code.slice(from, end < 0 ? code.length : end);
};

const hits = (code: string, text: string) => {
  const out: number[] = [];
  if (text === '') return out;

  let at = code.indexOf(text);
  while (at >= 0) {
    out.push(at);
    at = code.indexOf(text, at + 1);
  }

  return out;
};

/** the checker behind one run, with the files it may read */
const behind = (mirrored: string[]) => {
  const made = call.sync(() => new API());
  if (made.branch === 'err') return null;

  const api = made.value;
  const shot = call.sync(() => api.updateSnapshot({ openFiles: mirrored }));
  if (shot.branch === 'err') {
    api.close();

    return null;
  }

  const snap = shot.value;
  const close = () => {
    snap.dispose();
    api.close();
  };

  /** the type living at one mirror offset, or nothing when it never answers */
  const at = (checker: Checker, file: string, pos: number) => {
    const got = call.sync(() => checker.getTypeAtPosition(file, pos));
    if (got.branch === 'err') return undefined;

    return got.value;
  };

  /** the checker reading one mirror file, or nothing when the file never loads */
  const reader = (file: string) => {
    const project = snap.getDefaultProjectForFile(file);
    if (is.none(project)) return undefined;

    return project.checker;
  };

  /** a union member read as the literal it matches, or nothing when it never is one */
  const literal = (member: Type) => {
    if (member.isStringLiteralType()) return member.value;
    if (member.isNumberLiteralType()) return String(member.value);
    if (member.isBooleanLiteralType()) return String(member.value);

    return undefined;
  };

  /** the condition type behind a guard: through one call when it tests one */
  const facing = (checker: Checker, file: string, pos: number, through: boolean) => {
    const type = at(checker, file, pos);
    if (is.none(type)) return undefined;
    if (type.isErrorType()) return undefined;
    if (!through) return type;

    const sigs = call.sync(() => checker.getSignaturesOfType(type, SignatureKind.Call));
    if (sigs.branch === 'err' || sigs.value.length === 0) return undefined;

    const returned = call.sync(() => checker.getReturnTypeOfSignature(sigs.value[0]));
    if (returned.branch === 'err' || is.none(returned.value)) return undefined;
    if (returned.value.isErrorType()) return undefined;

    return returned.value;
  };

  /** whether a guard condition reads boolean, sparing any, params and the error type */
  const ranks = (type: Type | undefined) => {
    if (is.none(type)) return true;
    if (type.isBooleanLiteralType()) return true;
    if (type.isTypeParameter()) return true;
    if (type.isIntrinsicType()) {
      if (type.intrinsicName === 'boolean') return true;
      if (type.intrinsicName === 'any') return true;

      return false;
    }
    if (type.isUnionType()) {
      for (const member of type.getTypes()) if (!member.isBooleanLiteralType()) return false;

      return true;
    }

    return false;
  };

  /** what a union still misses, shown the way the checker spells it */
  const missing = (checker: Checker, type: Type, covered: string[]) => {
    if (!type.isUnionType()) return [];

    const out: string[] = [];
    for (const member of type.getTypes()) {
      const read = literal(member);
      if (is.none(read)) return [];
      if (covered.includes(read)) continue;

      const shown = call.sync(() => checker.typeToString(member));
      out.push(shown.branch === 'err' ? read : shown.value);
    }

    return out;
  };

  /** what a type spells as, or unknown when it never says */
  const shown = (checker: Checker, type: Type | undefined) => {
    if (is.none(type)) return 'unknown';

    const said = call.sync(() => checker.typeToString(type));

    return said.branch === 'err' ? 'unknown' : said.value;
  };

  return { at, reader, facing, ranks, missing, shown, close };
};

/** the { a ? head opens, same line or next, with the line it shuts on */
const opening = (rows: string[], toks: Token[], read: ReturnType<typeof scan>, i: number) => {
  let j = i + 1;
  while (j < toks.length && toks[j].kind === 'comment') j++;

  if (j < toks.length && toks[j].text === '{' && toks[j].line === toks[i].line) {
    const shut = read.twin[j];
    if (shut < 0) return undefined;

    return { open: j, close: toks[shut].line };
  }

  if (j < toks.length && toks[j].line === toks[i].line) return undefined;

  let k = 0;
  while (k < toks.length && toks[k].line < toks[i].line + 1) k++;
  while (k < toks.length && toks[k].kind === 'comment') k++;
  if (k >= toks.length || toks[k].line !== toks[i].line + 1 || toks[k].text !== '{') return undefined;

  const shut = read.twin[k];
  if (shut < 0) return undefined;

  const tail = rows[toks[i].line].slice(toks[i].column + 1).replace(/\/\*.*\*\//, '').replace(/\/\/.*$/, '').trim();
  if (tail !== '') return undefined;

  return { open: k, close: toks[shut].line };
};

/** the expression holding a marker: the same-line tokens back to a stopper */
const holding = (text: string, toks: Token[], read: ReturnType<typeof scan>, at: number) => {
  const stops = ['=>', '=', '(', '[', '{', ',', ';', ':', 'return'];
  let start = at;
  let p = read.before[at];
  while (p >= 0 && toks[p].line === toks[at].line) {
    if (toks[p].kind === 'comment') { p = read.before[p]; continue; }
    if (toks[p].text === ')' || toks[p].text === ']' || toks[p].text === '}') {
      const open = read.twin[p];
      if (open < 0) break;
      start = open;
      p = read.before[open];
      continue;
    }
    if (stops.includes(toks[p].text)) break;
    start = p;
    p = read.before[p];
  }

  let q = read.before[at];
  while (q >= 0 && toks[q].line === toks[at].line && toks[q].kind === 'comment') q = read.before[q];
  if (q < 0 || toks[q].line !== toks[at].line) return '';

  return text.slice(toks[start].from, toks[q].to).trim();
};

/** whether one arm answers with => outside any brackets on its line */
const tailed = (toks: Token[], read: ReturnType<typeof scan>, line: number, from: number, to: number) => {
  let k = 0;
  while (k < toks.length && toks[k].line < line) k++;

  while (k < toks.length && toks[k].line === line && toks[k].from < to) {
    const word = toks[k];
    if ((word.text === '(' || word.text === '[' || word.text === '{') && word.from >= from) {
      const shut = read.twin[k];
      if (shut >= 0) { k = shut + 1; continue; }
    }
    if (word.kind === 'punct' && word.text === '=>' && word.from >= from) return true;
    k++;
  }

  return false;
};

const inside = (ranges: Owned[], line: number) => {
  for (const range of ranges) if (line >= range.from && line <= range.to) return true;

  return false;
};

/** the protocol and form blocks a buffer declares, where => draws edges */
const declared = (text: string) => {
  const out: Owned[] = [];
  const lexed = lex(text);
  if (lexed.branch === 'err') return out;

  const toks = lexed.value;
  const read = scan(toks);

  for (let i = 0; i < toks.length; i++) {
    if (toks[i].kind !== 'punct' || toks[i].text !== '{') continue;

    const shut = read.twin[i];
    if (shut < 0) continue;

    let p = read.before[i];
    if (p >= 0 && (toks[p].text === '>' || toks[p].text === '>>' || toks[p].text === '>>>')) {
      let depth = 0;
      while (p >= 0) {
        const word = toks[p].text;
        if (word === '>' || word === '>>' || word === '>>>') depth += word.length;
        if (word === '<' || word === '<<') depth -= word.length;
        if (depth <= 0) { p = read.before[p]; break; }
        p = read.before[p];
      }
    }

    if (p < 0 || toks[p].kind !== 'word' || !keyword(toks, read.before, p)) continue;
    if (toks[p].text !== 'protocol' && toks[p].text !== 'form') {
      const q = read.before[p];
      if (q < 0 || toks[q].kind !== 'word' || (toks[q].text !== 'protocol' && toks[q].text !== 'form') || !keyword(toks, read.before, q)) continue;
    }

    out.push({ from: toks[i].line, to: toks[shut].line });
  }

  return out;
};

/** one arm line read as the literal or branch it covers; else names the miss */
const arm = (line: string) => {
  const cut = line.trim().replace(/,$/, '').trim();
  if (cut.startsWith('==')) {
    const to = cut.indexOf('=>');
    if (to < 0) return undefined;

    const value = cut.slice(2, to).trim().replace(/^(`|'|")(.*)\1$/, '$2');

    return { kind: 'value', cover: value };
  }

  if (cut.startsWith(':')) {
    const tag = /^:([A-Za-z0-9_]+)/.exec(cut);
    if (is.none(tag)) return undefined;

    return { kind: 'branch', cover: tag[1] };
  }

  if (cut === 'else' || cut.startsWith('else ') || cut.startsWith('else{')) return { kind: 'else', cover: '' };

  return undefined;
};

/** every answerable ? {} in a buffer: literal arms over values, tag arms over branches */
const questioned = (text: string) => {
  const asks: Ask[] = [];
  const ranges: Owned[] = [];
  const rows = text.split('\n');
  const lexed = lex(text);
  if (lexed.branch === 'err') return { asks, ranges };

  const toks = lexed.value;
  const read = scan(toks);
  const starts: number[] = [0];
  for (let i = 0; i < text.length; i++) if (text[i] === '\n') starts.push(i + 1);

  for (let i = 0; i < toks.length; i++) {
    if (toks[i].kind === 'comment' || toks[i].text !== '?') continue;

    const open = opening(rows, toks, read, i);
    if (is.none(open)) continue;

    const head = toks[i].line;
    const close = open.close;
    const subject = holding(text, toks, read, i);
    if (subject === '') continue;

    const covering: { kind: string, cover: string, valued: boolean }[] = [];
    let miss = false;
    let shutDown = false;

    const readArm = (line: number, from: number, to: number) => {
      if (shutDown || miss) return;
      const cut = text.slice(from, to).trim();
      if (cut === '') return;
      const found = arm(cut);
      if (is.none(found)) { shutDown = true; return; }
      if (found.kind === 'else') { miss = true; return; }
      covering.push({ kind: found.kind, cover: found.cover, valued: tailed(toks, read, line, from, to) });
    };

    const openLine = toks[open.open].line;
    const openFrom = toks[open.open].to;
    if (openLine === close) {
      const shut = rows[close].indexOf('}', toks[open.open].column + 1);
      if (shut < 0) continue;
      if (rows[close].slice(toks[open.open].column + 1, shut).includes(',')) continue;
      readArm(close, starts[close] + toks[open.open].column + 1, starts[close] + shut);
    }
    else {
      readArm(openLine, openFrom, starts[openLine] + rows[openLine].length);
      for (let line = openLine + 1; line < close; line++) readArm(line, starts[line], starts[line] + rows[line].length);
      const shut = rows[close].indexOf('}');
      if (shut >= 0) readArm(close, starts[close], starts[close] + shut);
    }

    if (shutDown || covering.length === 0) continue;

    const branch = covering[0].kind === 'branch';
    for (const cover of covering) if ((cover.kind === 'branch') !== branch) { shutDown = true; break; }
    if (shutDown) continue;

    ranges.push({ from: head, to: close });
    if (miss) continue;

    let valued = false;
    for (const cover of covering) valued = valued || cover.valued;
    if (!valued) continue;

    const covered: string[] = [];
    for (const cover of covering) covered.push(cover.cover);

    asks.push({ subject, covered, branch, line: head, column: toks[i].column });
  }

  return { asks, ranges };
};

/** the final (...) group stripped off a call, or nothing when it never is one */
const uncalled = (cond: string) => {
  if (!cond.endsWith(')')) return undefined;

  let depth = 0;
  for (let i = cond.length - 1; i >= 0; i--) {
    if (cond[i] === ')') depth++;
    if (cond[i] === '(') depth--;
    if (depth === 0) return cond.slice(0, i).trim();
  }

  return undefined;
};

/** every guard or trigger testing a condition outside a ? {} */
const guards = (text: string) => {
  const out: Guard[] = [];
  const ranges = questioned(text).ranges;
  const shells = declared(text);
  const lexed = lex(text);
  if (lexed.branch === 'err') return out;

  const toks = lexed.value;
  const read = scan(toks);

  for (let ti = 0; ti < toks.length; ti++) {
    const token = toks[ti];
    if (token.kind === 'comment') continue;
    if (inside(ranges, token.line)) continue;

    if (token.text === '?') {
      if (read.matcher[ti] >= 0 && read.matcher[ti] !== ti) continue;
      if (nested(toks, read, ti)) continue;
      let prev = read.before[ti];
      while (prev >= 0 && toks[prev].kind === 'comment') prev = read.before[prev];
      if (prev >= 0 && toks[prev].kind === 'word' && toks[prev].text === 'else' && keyword(toks, read.before, prev)) continue;
      const cond = holding(text, toks, read, ti).replace(/!$/, '').trim();
      if (cond === '' || cond.startsWith('!')) continue;
      if (cond.includes('=>') || cond.includes('{') || cond.includes('}') || cond.includes(';')) continue;
      if (cond.replace(/\?\./g, '').includes('?')) continue;
      if (/==|!=|<=|>=|&&|\|\||instanceof|[<>]/.test(cond)) continue;

      out.push({ text: cond, trigger: false, line: token.line, column: token.column });
    }

    if (token.text === '=>') {
      if (inside(shells, token.line)) continue;
      if (nested(toks, read, ti)) continue;
      if (chained(toks, read, ti)) continue;

      let tail = read.after[ti];
      while (tail >= 0 && toks[tail].kind === 'comment') tail = read.after[tail];
      if (tail >= 0 && toks[tail].text === '{') continue;

      const cond = holding(text, toks, read, ti);
      if (cond === '') continue;
      if (cond.includes('?') || cond.includes('=>') || cond.includes('{') || cond.includes('}') || cond.includes(';')) continue;

      const bare = cond.replace(/==|!=|<=|>=/g, '');
      if (bare.includes('=')) continue;

      const called = uncalled(cond);
      if (!is.none(called) && (called === '' || /(async|=|,|\(|!)$/.test(called))) continue;

      out.push({ text: cond, trigger: true, line: token.line, column: token.column });
    }
  }

  return out;
};

/** the mirror lines carrying a switch, with the discriminant each one reads */
const switches = (code: string) => {
  const out: { at: number, read: string }[] = [];

  for (const at of hits(code, 'switch (')) {
    let depth = 1;
    let end = at + 8;
    while (end < code.length && depth > 0) {
      if (code[end] === '(') depth++;
      if (code[end] === ')') depth--;
      end++;
    }
    if (depth !== 0) continue;

    out.push({ at: at + 8, read: code.slice(at + 8, end - 1) });
  }

  return out;
};

/** the offsets where one guard text is tested, in file order */
const tested = (code: string, text: string) => {
  const out: number[] = [];
  const search = text.replace(/(?<![=!])==(?![=])/g, '===').replace(/!=(?![=])/g, '!==');

  for (const at of hits(code, search)) {
    const before = at === 0 ? '' : code[at - 1];
    const after = code[at + search.length] ?? '';
    if (/[A-Za-z0-9_$.]/.test(before)) continue;
    if (/[A-Za-z0-9_$.]/.test(after)) continue;

    const row = rowAt(code, at);
    if (!/if\s*\(|while\s*\(|for\s*\(|\?/.test(row)) continue;
    out.push(at);
  }

  return out;
};

/** whether a => answers a guard instead of triggering: a ? or else holds its left */
const chained = (toks: Token[], read: ReturnType<typeof scan>, ti: number) => {
  let p = read.before[ti];
  while (p >= 0 && toks[p].line === toks[ti].line) {
    if (toks[p].kind === 'comment') { p = read.before[p]; continue; }
    if (toks[p].text === ')' || toks[p].text === ']' || toks[p].text === '}') {
      const open = read.twin[p];
      if (open < 0) return false;
      p = read.before[open];
      continue;
    }
    if (toks[p].text === '?' || toks[p].text === 'else' || toks[p].text === '=>' || toks[p].text === ':') return true;
    if (['=', '(', '[', '{', ',', ';', 'return'].includes(toks[p].text)) return false;
    p = read.before[p];
  }

  return false;
};

/** whether a marker sits inside brackets on its line: a lambda arrow, never a guard */
const nested = (toks: Token[], read: ReturnType<typeof scan>, ti: number) => {
  let s = ti;
  while (s > 0 && toks[s - 1].line === toks[ti].line) s--;

  let depth = 0;
  for (let k = s; k < ti; k++) {
    const text = toks[k].text;
    if (text === '(' || text === '[' || text === '{') {
      const shut = read.twin[k];
      if (shut < 0) depth++;
      else if (shut > ti) return true;
      else k = shut;
      continue;
    }
    if (text === ')' || text === ']' || text === '}') depth--;
  }

  return depth > 0;
};

/** a guard without its outer parens, with the columns they covered */
const unwrapped = (expr: string) => {
  if (!expr.startsWith('(') || !expr.endsWith(')')) return undefined;

  let depth = 0;
  for (let i = 0; i < expr.length; i++) {
    if (expr[i] === '(') depth++;
    if (expr[i] === ')') depth--;
    if (depth === 0 && i < expr.length - 1) return undefined;
  }
  if (depth !== 0) return undefined;

  const inner = expr.slice(1, -1);
  const skip = 1 + inner.length - inner.trimStart().length;

  return { text: inner.trim(), skip };
};

/** the checker-backed half of a session: boolean guards and exhaustive ladders */
export const openCheck = (mirrored: string[]) => {
  const api = behind(mirrored);
  if (is.none(api)) return null;

  /** every guard testing a non-boolean, one note per miss */
  const booleans = (file: string, text: string, code: string) => {
    const notes: Note[] = [];
    const checker = api.reader(file);
    if (is.none(checker)) return notes;

    const seen: Record<string, number> = {};
    for (const guard of guards(text)) {
      const count = seen[guard.text] ?? 0;
      seen[guard.text] = count + 1;

      const found = tested(code, guard.text);
      if (count >= found.length) continue;

      let expr = guard.text;
      let base = found[count];
      for (;;) {
        const inner = unwrapped(expr);
        if (is.none(inner)) break;
        expr = inner.text;
        base += inner.skip;
      }
      if (expr === '') continue;

      const called = expr.endsWith(')') ? uncalled(expr) : undefined;
      const call = !is.none(called) && called !== '';
      const pos = base + (call && !is.none(called) ? called.length - 1 : expr.length - 1);
      const type = api.facing(checker, file, pos, call);
      if (api.ranks(type)) continue;

      const word = guard.trigger ? 'a trigger tests a boolean' : 'a ? tests a boolean';
      notes.push({ line: guard.line + 1, column: guard.column + 1, level: 'warning', code: 'TZL0002', message: `${word}; ${guard.text} is ${api.shown(checker, type)}` });
    }

    return notes;
  };

  /** every answerable ladder missing a member, one note per miss */
  const ladders = (file: string, text: string, code: string) => {
    const notes: Note[] = [];
    const checker = api.reader(file);
    if (is.none(checker)) return notes;

    const dials = switches(code);
    const seen: Record<string, number> = {};
    for (const ask of questioned(text).asks) {
      const key = `${ask.branch ? 'branch' : 'value'} ${ask.subject}`;
      const count = seen[key] ?? 0;
      seen[key] = count + 1;

      const matching: { at: number, read: string }[] = [];
      for (const dial of dials) {
        if (ask.branch) {
          if (!dial.read.endsWith('.branch')) continue;
          const base = dial.read.replace(/\.branch$/, '');
          if (base !== ask.subject) {
            const at = rowAt(code, dial.at).indexOf(`const ${base} = ${ask.subject}`);
            if (at < 0 || rowAt(code, dial.at)[at + `const ${base} = ${ask.subject}`.length] !== ';') continue;
          }
        }
        else if (dial.read !== ask.subject) {
          const row = rowAt(code, dial.at);
          const at = row.indexOf(`const ${dial.read} = ${ask.subject}`);
          if (at < 0 || row[at + `const ${dial.read} = ${ask.subject}`.length] !== ';') continue;
        }
        matching.push(dial);
      }
      if (count >= matching.length) continue;

      const dial = matching[count];
      const pos = ask.branch ? dial.at + dial.read.indexOf('.branch') + 1 : dial.at;
      const type = api.at(checker, file, pos);
      if (is.none(type)) continue;

      if (!ask.branch && type.isIntrinsicType() && type.intrinsicName === 'boolean') {
        const missing: string[] = [];
        for (const member of ['true', 'false']) if (!ask.covered.includes(member)) missing.push(member);
        if (missing.length > 0) notes.push({ line: ask.line + 1, column: ask.column + 1, level: 'warning', code: 'TZL0004', message: `a ? {} answers every member; missing ${missing.join(', ')}` });
        continue;
      }

      const missed = api.missing(checker, type, ask.covered);
      if (missed.length === 0) continue;

      const shown: string[] = [];
      for (const miss of missed) shown.push(ask.branch ? `:${miss.replace(/^(['"])(.*)\1$/, '$2')}` : miss);
      const word = ask.branch ? 'a ? {} answers every branch' : 'a ? {} answers every member';
      notes.push({ line: ask.line + 1, column: ask.column + 1, level: 'warning', code: 'TZL0004', message: `${word}; missing ${shown.join(', ')}` });
    }

    return notes;
  };

  return { booleans, ladders, close: api.close };
};
