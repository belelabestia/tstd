import { result } from '@belelabestia/tstd';
import { Token, lex } from './lex.js';
import { scan, keyword } from './scan.js';
import { ban } from './ban.js';
import { refusal } from './refusal.js';

/** where a column of the emit sat in the source it came from */
export type Anchor = { at: number, was: number; };

type Edit = { from: number, to: number, text: string; };

type Landing = { open: string, close: string; };

const wraps: Record<string, Landing> = {
  ok: { open: 'return result.ok(', close: ')' },
  err: { open: 'return result.err(', close: ')' },
  async: { open: 'return Promise.resolve(', close: ')' },
  return: { open: 'return ', close: '' }
};

/** the constructs tz adds, with the role they play and the handler that rewrites them */
export const roles: { name: string, role: 'expression' | 'statement' | 'both', handler: string, match: string }[] = [
  { name: '=>',       role: 'expression', handler: 'arrowing',    match: '=>' },
{ name: '?none',    role: 'both',       handler: 'matcherTail', match: '?none' },
  { name: '?some',    role: 'both',       handler: 'matcherTail', match: '?some' },
  { name: '?true',    role: 'both',       handler: 'matcherTail', match: '?true' },
  { name: '?false',   role: 'both',       handler: 'matcherTail', match: '?false' },
  { name: '?:tag',    role: 'both',       handler: 'matcherTail', match: '?:' },
  { name: '?literal', role: 'both',       handler: 'matcherTail', match: '?' },
  { name: '?(cond)',  role: 'both',       handler: 'matcherTail', match: '?(' },
  { name: '? {}',     role: 'both',       handler: 'questioning', match: '? {' },
  { name: ':tag',     role: 'expression', handler: 'construct',   match: ':err' },
  { name: 'try',      role: 'statement',  handler: 'propagate',   match: 'try' },
  { name: 'scope',    role: 'statement',  handler: 'scoping',     match: 'scope' },
  { name: 'call',     role: 'both',       handler: 'calling',     match: 'call' },
  { name: 'make',     role: 'both',       handler: 'making',      match: 'make' },
  { name: 'form',     role: 'statement',  handler: 'forming',     match: 'form' },
  { name: 'protocol', role: 'statement',  handler: 'protocoling', match: 'protocol' },
  { name: 'return',   role: 'statement',  handler: 'exit',        match: 'return' },
  { name: 'ok',       role: 'statement',  handler: 'exit',        match: 'ok' },
  { name: 'err',      role: 'statement',  handler: 'exit',        match: 'err' },
  { name: 'async',    role: 'statement',  handler: 'exit',        match: 'async' },
  { name: 'break',    role: 'statement',  handler: 'exit',        match: 'break' },
  { name: 'continue', role: 'statement',  handler: 'exit',        match: 'continue' }
];

const exits = ['return', 'ok', 'err', 'async', 'break', 'continue'];

const carries = ['(', '[', '{'];

const closes = [')', ']', '}'];

const goes = [';', ')', ']', ',', '.', '?.', ':', '=>', '+', '-', '*', '/', '&&', '||', '?', '==', '!=', '<', '>', '<=', '>='];

const apply = (source: string, edits: Edit[]) => {
  const sorted = [...edits].sort((a, b) => a.from - b.from || a.to - b.to);
  const lines: Anchor[][] = [[]];
  const out: string[] = [];

  let at = 0;
  let column = 0;
  let was = 0;

  const copy = (to: number) => {
    while (at < to) {
      const end = source.indexOf('\n', at);

      if (end < 0 || end >= to) {
        lines[lines.length - 1].push({ at: column, was });
        out.push(source.slice(at, to));
        column += to - at;
        was += to - at;
        at = to;
        return;
      }

      lines[lines.length - 1].push({ at: column, was });
      out.push(source.slice(at, end + 1));
      lines.push([]);
      column = 0;
      was = 0;
      at = end + 1;
    }
  };

  for (const edit of sorted) {
    if (edit.from < at) continue;

    copy(edit.from);
    out.push(edit.text);
    column += edit.text.length;
    was += edit.to - edit.from;
    at = edit.to;
  }

  copy(source.length);
  return { code: out.join(''), lines };
};

const rewrite = (source: string, tokens: Token[], read: ReturnType<typeof scan>) => {
  const { frames, owner, body, twin, starts, before, after, holds, matcher, tagged } = read;

  const edits: Edit[] = [];
  const taken: number[] = [];
  const consumed: boolean[] = [];
  const sealed: boolean[] = [];
  const scoped: boolean[] = [];
  const dropped: Array<{ from: number, to: number }> = [];

  const no = (at: number, message: string) => result.err(refusal(tokens[at].line, tokens[at].column, message));

  type Failure = ReturnType<typeof no>;

  const temp = (i: number) => {
    const f = body[i];
    taken[f] = (taken[f] ?? 0) + 1;

    return `$${taken[f] - 1}`;
  };

  const jump = (j: number) => (carries.includes(tokens[j].text) && twin[j] >= 0 ? twin[j] + 1 : j + 1);

  const ends = (i: number) => {
    let j = i;

    while (j < tokens.length) {
      const t = tokens[j];

      if (t.kind === 'comment') { j++; continue; }
      if (t.text === '(' || t.text === '[') { j = jump(j); continue; }

      if (t.text === '{') {
        const close = twin[j];
        if (close < 0) return j;

        const n = after[close];
        if (n < 0) return close;
        if (tokens[n].text === ';') return n;
        if (goes.includes(tokens[n].text)) { j = close + 1; continue; }

        return close;
      }

      if (t.text === ';') return j;
      if (closes.includes(t.text)) return before[j];

      j++;
    }

    return tokens.length - 1;
  };

  const find = (from: number, to: number, names: string[]) => {
    let j = from;

    while (j >= 0 && j <= to) {
      const t = tokens[j];

      if (t.kind === 'comment') { j++; continue; }
      if (carries.includes(t.text)) { j = jump(j); continue; }
      if (t.kind === 'word' && names.includes(t.text) && keyword(tokens, before, j)) return j;
      if (t.kind === 'punct' && names.includes(t.text)) return j;

      j++;
    }

    return -1;
  };

  const mark = (from: number, to: number) => {
    let j = from;

    while (j >= 0 && j <= to) {
      const t = tokens[j];

      if (t.kind === 'comment') { j++; continue; }
      if (carries.includes(t.text)) { j = jump(j); continue; }
      if (matcher[j] >= 0 && !consumed[j]) return j;

      j++;
    }

    return -1;
  };

  const subjStart = (at: number, floor: number) => {
    let s = at;
    let depth = 0;
    const delims = ['(', ',', '[', '=', ':', ';', '{', '}', 'return', 'ok', 'err', '=>'];

    while (s >= floor) {
      const t = tokens[s];
      if (t.kind === 'comment') { s = before[s]; continue; }
      if (closes.includes(t.text)) { depth++; s = before[s]; continue; }
      if (carries.includes(t.text)) {
        if (depth === 0) return after[s];
        depth--;
        s = before[s];
        continue;
      }
      if (depth === 0) {
        if (matcher[s] >= 0) return after[s];
        if (delims.includes(t.text) && (t.kind !== 'word' || keyword(tokens, before, s))) return after[s];
      }

      s = before[s];
    }

    return floor;
  };

  const plain = ['none', 'some'];

  const check = (word: string, name: string) => {
    if (word === 'none') return `is.none(${name})`;
    if (word === 'some') return `is.some(${name})`;

    return `${name}.branch === '${word}'`;
  };

  const kept = (unwraps: boolean, name: string) => unwraps ? `${name}.value` : name;

  const mend = (qq: number) => {
    const a = matcher[qq];
    if (a < 0) return -1;
    if (tokens[a].text === '(') return twin[a];
    const b = after[a];
    if ((tokens[a].text === '-' || tokens[a].text === '+') && b >= 0 && tokens[b].kind === 'number' && tokens[a].to === tokens[b].from) return b;
    return a;
  };

  const literal = (qq: number) => {
    const a = matcher[qq];
    return source.slice(tokens[a].from, tokens[mend(qq)].to);
  };

  const reserved = ['else', 'if', 'match', 'try', 'scope', 'protocol', 'form', 'call', 'make', 'ok', 'err', 'async', 'return', 'break', 'continue', 'none', 'some', 'true', 'false'];

  const holes = (text: string, bound: string) => {
    const spans: Array<{ from: number, to: number }> = [];
    if (bound === '') return spans;

    const word = (c: string | undefined) =>
      c !== undefined && (c === '_' || c === '$' || (c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z') || (c >= '0' && c <= '9') || c.charCodeAt(0) > 126);

    const quoted = (k: number, end: number): number => {
      const q = text[k];
      let j = k + 1;

      while (j < end) {
        const c = text[j];
        if (c === '\\') { j += 2; continue; }
        if (q === '`' && c === '$' && text[j + 1] === '{') {
          const shut = braced(j + 1, end);
          if (shut < 0) return -1;
          j = shut;
          continue;
        }
        if (c === q) return j + 1;
        j++;
      }

      return -1;
    };

    const braced = (k: number, end: number): number => {
      let depth = 0;
      let j = k;

      while (j < end) {
        const c = text[j];
        if (c === '\'' || c === '"' || c === '`') {
          const shut = quoted(j, end);
          if (shut < 0) return -1;
          j = shut;
          continue;
        }
        if (c === '/' && text[j + 1] === '/') { while (j < end && text[j] !== '\n') j++; continue; }
        if (c === '/' && text[j + 1] === '*') {
          const shut = text.indexOf('*/', j + 2);
          if (shut < 0 || shut + 2 > end) return -1;
          j = shut + 2;
          continue;
        }
        if (c === '{') depth++;
        if (c === '}') {
          depth--;
          if (depth === 0) return j + 1;
        }
        j++;
      }

      return -1;
    };

    const body = (at: number, close: number) => {
      let k = at;

      while (k < close) {
        const c = text[k];
        if (c === '\'' || c === '"' || c === '`') {
          const shut = quoted(k, close);
          k = shut < 0 ? k + 1 : shut;
          continue;
        }
        if (c === '/' && text[k + 1] === '/') { while (k < close && text[k] !== '\n') k++; continue; }
        if (c === '/' && text[k + 1] === '*') {
          const shut = text.indexOf('*/', k + 2);
          k = shut < 0 || shut + 2 > close ? k + 1 : shut + 2;
          continue;
        }
        if (c === '$' && text[k + 1] === '{') {
          const shut = braced(k + 1, close);
          if (shut < 0) { k++; continue; }
          body(k + 2, shut - 1);
          k = shut;
          continue;
        }
        if (text.startsWith(bound, k) && !word(text[k - 1]) && !word(text[k + bound.length])) {
          let m = k + bound.length;
          while (m < close && (text[m] === ' ' || text[m] === '\t' || text[m] === '\n' || text[m] === '\r')) m++;
          if (text[m] !== ':' && text[k - 1] !== '.') spans.push({ from: k, to: k + bound.length });
        }
        k++;
      }
    };

    let i = 0;

    while (i < text.length) {
      if (text[i] === '$' && text[i + 1] === '{') {
        const shut = braced(i + 1, text.length);
        if (shut < 0) return spans;
        body(i + 2, shut - 1);
        i = shut;
        continue;
      }
      i++;
    }

    return spans;
  };

  const spell = (from: number, to: number, bound: string, name: string) => {
    let out = '';
    let at = tokens[from].from;

    const spliced = (text: string) => {
      const spans = holes(text, bound);
      let built = '';
      let cut = 0;

      for (const span of spans) {
        built += text.slice(cut, span.from) + name;
        cut = span.to;
      }

      return built + text.slice(cut);
    };

    for (let j = from; j >= 0 && j <= to; j++) {
      const t = tokens[j];

      if (t.kind === 'comment') {
        out += source.slice(at, t.to);
        at = t.to;
        continue;
      }

      if (t.kind === 'punct' && (t.text === '==' || t.text === '!=')) {
        out += source.slice(at, t.from) + (t.text === '==' ? '===' : '!==');
        at = t.to;
        continue;
      }

      if (bound !== '' && t.kind === 'template') {
        out += source.slice(at, t.from) + spliced(t.text);
        at = t.to;
        continue;
      }

      if (bound !== '' && t.kind === 'word' && t.text === bound && keyword(tokens, before, j)) {
        const n = after[j];
        if (n < 0 || tokens[n].text !== ':') {
          out += source.slice(at, t.from) + name;
          at = t.to;
        }
      }
    }

    return out + source.slice(at, tokens[to].to);
  };

  const leaves = (i: number) => i >= 0 && tokens[i].kind === 'word' && exits.includes(tokens[i].text);

  const loose = (i: number) => body[i] === 0;

  const head = (open: number) => {
    const arrow = before[open];
    if (arrow < 0 || tokens[arrow].text !== '=>') return -1;

    const p = before[arrow];
    if (p < 0) return -1;

    let at = p;
    if (tokens[p].text === ')') { const o = twin[p]; if (o < 0) return -1; at = o; }

    const g = before[at];
    if (g >= 0 && tokens[g].text === '>') {
      let depth = 0;

      for (let j = g; j >= 0; j--) {
        if (tokens[j].text === '>') depth++;

        if (tokens[j].text === '<') {
          depth--;
          if (depth === 0) { at = j; break; }
        }
      }
    }

    return tokens[at].from;
  };

  const rename = (from: number, to: number, name: string, held: string) => {
    if (name === '') return;

    for (let j = from; j <= to && j < tokens.length; j++) {
      const t = tokens[j];
      if (t.kind === 'comment') continue;
      if (t.kind === 'template') {
        const spans = holes(t.text, name);
        if (spans.length === 0) continue;

        let text = t.text;
        for (let s = spans.length - 1; s >= 0; s--) {
          text = text.slice(0, spans[s].from) + held + text.slice(spans[s].to);
        }

        edits.push({ from: t.from, to: t.to, text });
        continue;
      }
      if (t.kind !== 'word' || t.text !== name || !keyword(tokens, before, j)) continue;
      if (after[j] >= 0 && tokens[after[j]].text === ':') continue;

      edits.push({ from: t.from, to: t.to, text: held });
    }
  };

  const uses = (from: number, to: number, name: string) => {
    let count = 0;
    if (name === '') return count;

    for (let j = from; j >= 0 && j <= to; j++) {
      const t = tokens[j];
      if (t.kind === 'comment') continue;
      if (t.kind === 'template') { count += holes(t.text, name).length; continue; }
      if (t.kind !== 'word' || t.text !== name || !keyword(tokens, before, j)) continue;
      if (after[j] >= 0 && tokens[after[j]].text === ':') continue;
      count++;
    }

    return count;
  };
  const conditional = (i: number) => no(i, 'an if expression is refused; answer with ?true => ... else ...');

  const questioning = (q: number) => {
    const open = after[q];
    const end = twin[open];
    if (end < 0) return no(q, 'a ? {} block has no closing brace');

    let s = before[q];
    let depth = 0;
    let start = -1;
    const delims = ['(', ',', '[', '=', ':', ';', '{', '}', 'return', 'ok', 'err', '=>'];

    while (s >= 0) {
      const t = tokens[s];
      if (t.kind === 'comment') { s = before[s]; continue; }
      if (closes.includes(t.text)) { depth++; s = before[s]; continue; }
      if (carries.includes(t.text)) {
        if (depth === 0) { start = after[s]; break; }
        depth--;
        s = before[s];
        continue;
      }
      if (depth === 0) {
        if (matcher[s] >= 0) return no(q, 'matchers do not nest; bind the inner value first');
        if (delims.includes(t.text) && (t.kind !== 'word' || keyword(tokens, before, s))) { start = after[s]; break; }
      }

      s = before[s];
    }

    if (start < 0) start = 0;

    const stop = before[q];
    if (start > stop) return no(q, 'a ? {} tests a value');

    const landed = before[start];
    const sits = landed >= 0 && ['(', ',', '[', '=', ':', '=>', 'return', 'ok', 'err'].includes(tokens[landed].text) && (tokens[landed].kind !== 'word' || keyword(tokens, before, landed));
    if (!sits) return no(q, 'an expression must always be captured; a ? {} statement runs an expression or a block');

    const arms: number[] = [];

    for (let j = after[open]; j >= 0 && j < end;) {
      arms.push(j);

      const comma = find(j, end - 1, [',', ';']);
      if (comma < 0) break;

      j = after[comma];
    }

    let branching = false;
    let hasCond = false;
    for (const arm of arms) {
      if (tokens[arm].text === ':') branching = true;
      if (tokens[arm].text === '?' && matcher[arm] >= 0 && tokens[matcher[arm]].text === ':') branching = true;
      if (tokens[arm].text === '(') hasCond = true;
    }

    const one = start === stop;
    const named = one && tokens[start].kind === 'word';
    const needTemp = (branching || hasCond) && !named;
    const name = needTemp ? temp(q) : '';
    const subject = named ? tokens[start].text : name;
    const subjWord = named ? tokens[start].text : '';

    if (hasCond && !named) {
      const badSubject = arms.some((arm) => tokens[arm].text === '(');
      if (badSubject) return no(q, 'a condition tests a name; bind the value first');
    }

    if (hasCond && named) edits.push({ from: tokens[start].from, to: tokens[open].from, text: '(() => { switch (true) ' });
    else if (!branching || named) edits.push({ from: tokens[start].from, to: tokens[start].from, text: '(() => { switch (' });
    else edits.push({ from: tokens[start].from, to: tokens[start].from, text: `(() => { const ${name} = ` });

    if (hasCond && named) { }
    else if (branching && named) edits.push({ from: tokens[stop].to, to: tokens[open].from, text: '.branch) ' });
    else if (branching) edits.push({ from: tokens[stop].to, to: tokens[open].from, text: `; switch (${name}.branch) ` });
    else edits.push({ from: tokens[stop].to, to: tokens[open].from, text: ') ' });

    edits.push({ from: tokens[end].from, to: tokens[end].to, text: '} })()' });

    const carried = named ? `${subject}.value` : `${name}.value`;

    for (const arm of arms) {
      const stop = find(arm, end - 1, [',']);
      const arrow = find(arm, (stop >= 0 ? stop : end) - 1, ['=>']);
      if (arrow < 0) return no(arm, 'a ? {} arm answers with =>');

      const answer = after[arrow];
      if (answer < 0 || answer >= end) return no(arrow, 'a ? {} arm needs an answer');

      if (tokens[answer].kind === 'word' && exits.includes(tokens[answer].text) && keyword(tokens, before, answer)) {
        return no(answer, 'a ? {} arm answers with a value; hoist the exit out');
      }

      const wildcard = tokens[arm].text === '_';
      const branch = tokens[arm].text === ':';
      const cond = tokens[arm].text === '(';

      if (tokens[arm].kind === 'word' && (tokens[arm].text === 'none' || tokens[arm].text === 'some')) {
        return no(arm, 'none and some test presence; use a ?none matcher or a statement ? {}');
      }

      if (!hasCond) {
        if (branching && !wildcard && !branch) return no(arm, 'a ? {} reads branches or reads values, never both');
        if (!branching && branch) return no(arm, 'a :tag arm needs a subject that carries branches');
      }

      let label = '';
      let bind = -1;
      let condSpan: { from: number, to: number } | undefined = undefined;

      if (cond) {
        const shut = twin[arm];
        if (shut < 0 || shut >= end) return no(arm, 'a condition has no closing paren');
        if (after[arm] === shut) return no(arm, 'a condition tests something');
        if (nested(after[arm], before[shut])) return no(arm, 'matchers do not nest; bind the inner value first');
        condSpan = { from: after[arm], to: before[shut] };
        const afterCond = after[shut];
        if (afterCond >= 0 && afterCond < arrow && tokens[afterCond].text === '(') return no(afterCond, 'a condition binds nothing; the subject is already named');
        label = `case (${spell(after[arm], before[shut], subjWord, subject)}):`;
      }
      else if (branch) {
        const tag = after[arm];
        if (tag < 0 || tokens[tag].kind !== 'word') return no(arm, 'a : arm names a branch');

        label = hasCond ? `case (${subject}.branch === '${tokens[tag].text}'):` : `case '${tokens[tag].text}':`;
        bind = after[tag];
      }

      if (wildcard) { label = 'default:'; bind = after[arm]; }

      let bound = '';

      if (bind >= 0 && bind < arrow && tokens[bind].text === '(') {
        if (condSpan !== undefined) return no(bind, 'a condition binds nothing; the subject is already named');
        if (!branching && !hasCond) return no(bind, 'only a branch arm binds a value');

        const shut = twin[bind];
        const inner = after[bind];
        if (shut < 0 || inner < 0 || inner >= shut) return no(bind, 'an arm binds a name, or nothing at all');

        bound = tokens[inner].text;
        if (reserved.includes(bound)) return no(inner, 'a binding names a value, not a keyword');
      }

      if (label === '' && tokens[before[arrow]].text === ')') return no(arm, 'only a branch arm binds a value');

      const block = tokens[answer].text === '{';

      if (label === '') {
        if (hasCond) {
          const val = spell(arm, before[arrow], '', '');
          edits.push({ from: tokens[arm].from, to: tokens[before[arrow]].to, text: `case (${subject} === ${arm === before[arrow] ? val : `(${val})`}):` });
          edits.push({ from: tokens[before[arrow]].to, to: tokens[arrow].to, text: '' });
        }
        else {
          edits.push({ from: tokens[arm].from, to: tokens[arm].from, text: 'case ' });
          edits.push({ from: tokens[before[arrow]].to, to: tokens[arrow].to, text: ':' });
        }
      }
      else {
        const opens = block || bound === '' ? `${label} ` : `${label} { const ${bound} = ${carried}; return `;
        edits.push({ from: tokens[arm].from, to: tokens[answer].from, text: opens });
      }

      const comma = find(answer, end - 1, [',']);

      if (bound !== '' && uses(answer, block ? twin[answer] : comma >= 0 ? before[comma] : before[end], bound) === 0) {
        return no(bind, `(${bound}) is never used; drop the binding`);
      }

      if (!block) {
        const bound = comma >= 0 ? comma : end;
        const bad = calling(answer, comma >= 0 ? before[comma] : before[end], -1);
        if (bad !== undefined) return bad;

        for (let st = answer; st >= 0 && st <= bound; st++) {
          if (tokens[st].kind === 'comment') continue;
          if (tokens[st].text === '{') { st = twin[st] >= 0 ? twin[st] : st; continue; }
          if (tokens[st].text === ':') {
            const raised = construct(st, true);
            if (raised !== undefined) return raised;
          }
        }
      }

      if (block) {
        const shut = twin[answer];
        if (shut < 0 || shut >= end) return no(answer, 'a ? {} arm block has no closing brace');

        let deep = 0;

        for (let st = after[answer]; st >= 0 && st < shut; st++) {
          const u = tokens[st];
          if (u.kind === 'comment') continue;
          if (u.text === '(' || u.text === '[' || u.text === '{') { if (twin[st] >= 0) deep++; continue; }
          if (u.text === ')' || u.text === ']' || u.text === '}') { deep--; continue; }
          if (u.kind !== 'word' || !starts[st] || !keyword(tokens, before, st)) continue;

          if (u.text === 'ok' || u.text === 'err' || u.text === 'async') return no(st, 'a ? {} arm answers with a value; hoist the exit out');
          if (deep === 0 && (u.text === 'break' || u.text === 'continue')) return no(st, 'a break in an arm block leaves the ? {}, not the loop; hoist it out');
        }

        if (bound !== '') edits.push({ from: tokens[answer].to, to: tokens[answer].to, text: ` const ${bound} = ${carried};` });
        if (comma >= 0) edits.push({ from: tokens[comma].from, to: tokens[comma].to, text: '' });

        continue;
      }

      if (label === '' || bound === '') edits.push({ from: tokens[answer].from, to: tokens[answer].from, text: 'return ' });

      const shut = bound === '' ? ';' : '; }';

      if (comma >= 0) edits.push({ from: tokens[comma].from, to: tokens[comma].to, text: shut });
      else {
        const last = before[end];
        edits.push({ from: tokens[last].to, to: tokens[last].to, text: shut });
      }
    }

    consumed[q] = true;
    return undefined;
  };

  const scoping = (i: number) => {
    const t = tokens[i];
    const p = after[i];
    const close = twin[p];

    const inner = after[p];
    if (inner < 0 || inner >= close) return no(i, 'a scope binds one name');
    if (tokens[inner].kind !== 'word' || after[inner] !== close) return no(i, 'a scope binds one name');

    const arrow = after[close];
    const open = after[arrow];
    const end = twin[open];
    if (end < 0) return no(i, 'a scope has no closing brace');

    const f = holds[open];
    const binding = source.slice(tokens[inner].from, tokens[inner].to);

    scoped[f] = true;

    const opens = frames[f].suspends ? '.async(async ' : '.sync(';
    edits.push({ from: t.to, to: tokens[arrow].to, text: `${opens}${binding} =>` });
    edits.push({ from: tokens[end].to, to: tokens[end].to, text: ')' });
  };

  const protocoling = (i: number) => {
    const name = after[i];
    if (name < 0 || tokens[name].kind !== 'word') return;

    const angles = (at: number, until: number) => {
      let depth = 0;

      for (let s = at; s >= 0 && s < until; s++) {
        const t = tokens[s];
        if (t.kind === 'comment') continue;

        if (t.text === '<' || t.text === '<<') depth += t.text.length;
        if (t.text === '>' || t.text === '>>' || t.text === '>>>') depth -= t.text.length;

        if (depth <= 0) return s;
      }

      return -1;
    };

    const word = tokens[name].text;
    const g = after[name];
    if (g < 0) return no(i, 'a protocol declares a block after its name');

    let generic = '';
    let block = g;

    if (tokens[g].text === '<') {
      const close = angles(g, tokens.length);
      if (close < 0) return no(g, 'a protocol generic has no closing angle');

      generic = source.slice(tokens[g].from + 1, tokens[close].to - 1);
      block = after[close];
    }
    else if (tokens[g].text === '(') return no(g, 'a protocol declares its parameters in angle brackets');

    if (block < 0 || tokens[block].text !== '{') return no(i, 'a protocol declares a block after its name');

    const end = twin[block];
    if (end < 0) return no(i, 'a protocol has no closing brace');

    for (let s = after[block]; s >= 0 && s < end; s++) sealed[s] = true;

    const head = before[i];
    const exported = head >= 0 && tokens[head].text === 'export';
    const at = exported ? head : i;
    const typeName = word[0].toUpperCase() + word.slice(1);

    if (generic === '') {
      const before = exported ? 'export const' : 'const';
      edits.push({ from: tokens[at].from, to: tokens[block].from, text: `${before} ${word} = protocol.init(` });
      edits.push({ from: tokens[end].to, to: tokens[end].to, text: `); ${exported ? 'export type' : 'type'} ${typeName} = Union<protocol.Model<typeof ${word}>>;` });
    }
    else {
      edits.push({ from: tokens[at].from, to: tokens[block].from, text: `const $${word} = <${generic}>() => (` });

      const model = `Union<protocol.Model<typeof $${word}<${generic}>>>`;

      edits.push({
        from: tokens[end].to,
        to: tokens[end].to,
        text: `); ${exported ? 'export type' : 'type'} ${typeName}<${generic}> = ${model}; ${exported ? 'export const' : 'const'} ${word} = protocol.init($${word}());`
      });
    }

    let j = after[block];

    while (j >= 0 && j < end) {
      if (tokens[j].kind !== 'word') return no(j, 'an entry names a branch');

      let p = after[j];
      while (p >= 0 && p < end && tokens[p].kind === 'comment') p = after[p];

      let close = -1;

      if (p >= 0 && p < end) {
        if (tokens[p].text === '<') {
          close = angles(p, end);
          if (close < 0) return no(p, 'an entry has no closing angle');
          if (after[p] === close) return no(p, 'an angle needs a type');
        }
        else if (tokens[p].text === '(') {
          const shut = twin[p];
          if (shut < 0) return no(p, 'an entry has no closing paren');

          return no(p, after[p] === shut ? 'nothing to carry spells nothing' : 'an entry declares a payload in angle brackets');
        }
        else if (tokens[p].text !== ',' && tokens[p].text !== '=>') return no(p, 'an entry declares a payload in angle brackets or nothing');
      }

      edits.push({ from: tokens[j].to, to: tokens[j].to, text: close < 0 ? ': ()' : ': ' });

      if (close >= 0) {
        edits.push({ from: tokens[p].from, to: tokens[p].to, text: '(' });
        edits.push({ from: tokens[p].to, to: tokens[p].to, text: 'value: ' });

        const chars = tokens[close].text.length;
        edits.push({ from: tokens[close].from, to: tokens[close].to, text: `${'>'.repeat(chars - 1)})` });
      }

      const scan = close >= 0 ? close + 1 : p;
      const comma = find(scan, end, [',']);
      const stop = comma >= 0 ? comma : end;
      const arrow = find(scan, stop - 1, ['=>']);

      if (arrow < 0) {
        const tail = close >= 0 ? tokens[close].to : tokens[j].to;
        edits.push({ from: tail, to: tail, text: ' => {}' });
        j = comma >= 0 ? after[comma] : end;

        continue;
      }

      const first = after[arrow];
      if (first < 0 || first >= stop) return no(arrow, 'a transition names a branch');

      const names: string[] = [];
      let want = true;
      let sig = first;
      let pipe = -1;
      let lastAt = first;

      while (sig >= 0 && sig < stop) {
        const tk = tokens[sig];
        if (tk.kind === 'comment') { sig++; continue; }
        if (tk.text === '|') {
          if (want) return no(sig, 'a transition is a list of branch names separated by |');

          want = true;
          pipe = sig;
          lastAt = sig;
          sig++;
          continue;
        }
        if (tk.kind !== 'word' || !want) return no(sig, 'a transition is a list of branch names separated by |');

        names.push(tk.text);
        want = false;
        lastAt = sig;
        sig++;
      }

      if (want) return no(pipe >= 0 ? pipe : arrow, 'a transition is a list of branch names separated by |');

      edits.push({ from: tokens[first].from, to: tokens[lastAt].to, text: `[${names.map((n) => `'${n}'`).join(', ')}]` });

      j = comma >= 0 ? after[comma] : end;
    }
  };

  const calling = (from: number, to: number, skip: number) => {
    const walk: (a: number, b: number) => undefined | Failure = (a, b) => {
      let j = a;

      while (j >= 0 && j <= b) {
        const t = tokens[j];

        if (t.kind === 'comment') { j++; continue; }
        if (t.text === '(' || t.text === '[') {
          const close = twin[j];
          if (close < 0) { j++; continue; }

          const bad = walk(j + 1, close - 1);
          if (bad !== undefined) return bad;

          j = close + 1;
          continue;
        }

        if (t.text === '{') {
          const f = holds[j];
          const close = twin[j];

          if (f >= 0 && frames[f].kind === 'object' && close >= 0) {
            const bad = walk(j + 1, close - 1);
            if (bad !== undefined) return bad;

            j = close + 1;
            continue;
          }

          j = close >= 0 ? close + 1 : j + 1;
          continue;
        }

        if (t.kind === 'word' && t.text === 'call' && keyword(tokens, before, j) && j !== skip) {
          const bad = wrapping(j);
          if (bad !== undefined) return bad;

          j = after[j] >= 0 ? after[j] : j + 1;
          continue;
        }

        if (t.kind === 'word' && t.text === 'make' && keyword(tokens, before, j) && j !== skip) {
          const bad = making(j);
          if (bad !== undefined) return bad;

          j = after[j] >= 0 ? after[j] : j + 1;
          continue;
        }

        j++;
      }

      return undefined;
    };

    return walk(from, to);
  };

  const wrapping = (at: number, box?: { suspends: boolean }) => {
    let n = after[at];
    if (n < 0) return no(at, 'call needs an expression');

    const async = before[at] >= 0 && tokens[before[at]].text === 'await' && tokens[before[at]].kind === 'word' && keyword(tokens, before, before[at]) && after[before[at]] === at;
    const open = async ? 'call.async(' : 'call.sync(';

    if (async) {
      const aw = before[at];
      const arr = before[aw];
      const arrows = arr >= 0 && tokens[arr].text === '=>' && keyword(tokens, before, arr) && (frames[owner[arr]].kind === 'body' || frames[owner[arr]].kind === 'file');
      const p = arrows ? before[arr] : -1;
      const params = p >= 0 && (tokens[p].kind === 'word' || tokens[p].text === ')' || tokens[p].text === ']' || tokens[p].text === '}');
      const o = params && tokens[p].text !== ')' && tokens[p].text !== ']' && tokens[p].text !== '}' ? -1 : p >= 0 ? twin[p] : -1;
      const q = params && o >= 0 ? before[o] : -1;
      const plain = params && (tokens[p].kind === 'word' ? tokens[p].text !== 'call' && tagged[p] < 0 : q < 0 || (tokens[q].kind !== 'word' || (tokens[q].text !== 'scope' && tokens[q].text !== 'call')) && tagged[q] < 0);

      if (plain) edits.push({ from: tokens[aw].from, to: tokens[aw].to, text: '' });
    }

    if (tokens[n].text === '=>' && keyword(tokens, before, n)) {
      const block = after[n];
      if (block < 0) return no(n, 'call needs an expression');
      if (tokens[block].text !== '{') {
        n = block;
      }
      else {
        const close = twin[block];
        if (close < 0) return no(block, 'a call block has no closing brace');

        const f = holds[block];
        if (f >= 0) {
          if (frames[f].fallible || frames[f].promises) return no(block, 'try, ok and err stay outside a call block');

          if (frames[f].suspends) scoped[f] = true;
          if (frames[f].suspends && box !== undefined) box.suspends = true;

          const lastReturn = frames[f].last;
          if (lastReturn < 0 || tokens[lastReturn].text !== 'return' || after[lastReturn] < 0 || tokens[after[lastReturn]].text === ';') {
            return no(block, 'a call block answers with return');
          }

          if (frames[f].suspends && !async) {
            edits.push({ from: tokens[at].from, to: tokens[block].from, text: 'call.async(async () => ' });
            edits.push({ from: tokens[close].to, to: tokens[close].to, text: ')' });
            return undefined;
          }
        }

        edits.push({ from: tokens[at].from, to: tokens[block].from, text: `${open}${async ? 'async ' : ''}() => ` });
        edits.push({ from: tokens[close].to, to: tokens[close].to, text: ')' });
        return undefined;
      }
    }

    const word = tokens[n].text;
    if (word === ';' || word === ',' || word === ':' || word === '.' || word === '?.' || word === '=>' || closes.includes(word)) return no(n, 'call needs an expression');
    if (word === '{') return no(n, 'a call block takes =>; return answers the closure it opens');

    let j = n;

    while (j < tokens.length) {
      const t = tokens[j];

      if (t.kind === 'comment') { j++; continue; }
      if (t.text === '(' || t.text === '[' || t.text === '{') {
        const close = twin[j];
        if (close < 0) return no(j, 'a call expression never ends');

        j = close + 1;
        continue;
      }

      if (t.text === ';' || t.text === ',' || closes.includes(t.text)) break;
      if (t.kind === 'word' && (t.text === '=>' || t.text === 'else') && keyword(tokens, before, j)) return no(j, 'a call takes one expression');

      j++;
    }

    const end = j >= tokens.length ? tokens.length - 1 : before[j];
    if (end < n) return no(n, 'call needs an expression');

    let suspends = false;

    for (let k = n; k >= 0 && k <= end; k++) {
      const t = tokens[k];
      if (t.kind === 'comment') continue;
      if (t.kind === 'word' && t.text === 'await' && keyword(tokens, before, k)) { suspends = true; break; }
    }

    if (!suspends) {
      let k = n;
      while (k >= 0 && k <= end && tokens[k].kind === 'comment') k++;
      const first = k;

      let spot = -1;

      const construct = new Set([...reserved, 'await', 'if', 'for', 'while', 'satisfies', 'as', 'of', 'in', 'typeof', 'new', 'extends']);

      while (k >= 0 && k <= end) {
        const t = tokens[k];
        if (t.kind === 'comment') { k++; continue; }
        if (t.kind === 'word' && !(keyword(tokens, before, k) && construct.has(t.text))) { k++; continue; }
        if (t.text === '.') { k++; continue; }
        if (t.text === '(') { spot = k; break; }
        break;
      }

      if (spot > first && twin[spot] === end) {
        const close = twin[spot];
        const inner = source.slice(tokens[spot].to, tokens[close].from);
        const callee = source.slice(tokens[first].from, tokens[spot].from).trim();
        const name = async ? 'call.async' : 'call.sync';

        if (inner.trim() === '') {
          edits.push({ from: tokens[at].from, to: tokens[close].to, text: `${name}(${callee})` });
        }
        else {
          edits.push({ from: tokens[at].from, to: tokens[spot].to, text: `${name}(${callee}, ` });
        }

        return undefined;
      }
    }

    if (suspends && box !== undefined) box.suspends = true;

    edits.push({ from: tokens[at].from, to: tokens[n].from, text: suspends ? 'call.async(async () => ' : `${open}() => ` });
    edits.push({ from: tokens[end].to, to: tokens[end].to, text: ')' });
    return undefined;
  };

  const making = (at: number) => {
    const aw = before[at];
    if (aw >= 0 && tokens[aw].kind === 'word' && tokens[aw].text === 'await' && keyword(tokens, before, aw) && after[aw] === at) {
      return no(at, 'make is sync; an await adds nothing');
    }

    let n = after[at];
    if (n < 0) return no(at, 'make takes =>; name the constructor after it');
    if (tokens[n].text !== '=>' || !keyword(tokens, before, n)) return no(at, 'make takes =>; name the constructor after it');

    let m = after[n];
    while (m >= 0 && tokens[m].kind === 'comment') m = after[m];
    const first = m;
    if (first < 0) return no(n, 'a constructor follows make =>');

    while (m >= 0) {
      const t = tokens[m];
      if (t.kind === 'comment') { m = after[m]; continue; }
      if (t.text === '(') break;
      if (t.text === '{') return no(m, 'a make block cannot build a constructor');
      if (t.text === '=>' && keyword(tokens, before, m)) return no(m, 'a make takes the constructor and its arguments');
      if (t.text === ';' || t.text === ',' || t.text === ':' || t.text === '?' || closes.includes(t.text)) return no(m, 'a make takes the constructor and its arguments');
      m = after[m];
    }

    if (m < 0) return no(first, 'a make takes the constructor and its arguments');

    const open = m;
    const close = twin[open];
    if (close < 0) return no(open, 'a make call has no closing paren');

    const callee = source.slice(tokens[first].from, tokens[open].from).trim();
    const inner = source.slice(tokens[open].to, tokens[close].from);

    if (inner.trim() === '') {
      edits.push({ from: tokens[at].from, to: tokens[close].to, text: `make(${callee})` });
    }
    else {
      edits.push({ from: tokens[at].from, to: tokens[open].to, text: `make(${callee}, ` });
    }

    return undefined;
  };

  const propagate = (i: number, init: number, land?: Landing) => {
    if (loose(i)) return no(i, 'a file has no body to leave; wrap it in an arrow');
    if (land === undefined) return no(init, 'try drops the ok branch; void it, bind it, or return it');

    const kind = frames[body[init]].kind;
    if (kind === 'iife') return no(init, 'try would leave the iife rather than the function; hoist it out');
    if (kind === 'match') return no(init, 'try would leave the match rather than the function; hoist it out');

    const name = temp(i);
    const last = ends(init);
    if (tokens[last].text !== ';') return no(init, 'a try statement needs a semicolon');

    if (mark(after[init], last) >= 0) return no(init, 'try already declines; match the value after it');

    let n = after[init];
    if (n < 0) return no(init, 'try needs an expression');

    let waited = false;

    if (tokens[n].text === 'await' && tokens[n].kind === 'word' && keyword(tokens, before, n)) {
      const m = after[n];
      if (m < 0) return no(init, 'try needs an expression');

      if (tokens[m].line === tokens[init].line) {
        edits.push({ from: tokens[i].from, to: tokens[m].from, text: `const ${name} = await ` });
      }
      else {
        edits.push({ from: tokens[i].from, to: tokens[init].to, text: `const ${name} = ` });
      }

      waited = true;
      n = m;
    }
    else {
      const cut = tokens[n].line === tokens[init].line ? tokens[n].from : tokens[init].to;
      edits.push({ from: tokens[i].from, to: cut, text: `const ${name} = ` });
    }

    if (tokens[n].text === 'call' && keyword(tokens, before, n)) {
      const arrow = after[n];
      if (arrow < 0 || tokens[arrow].text !== '=>' || !keyword(tokens, before, arrow)) {
        return no(n, 'try call takes =>; the unwrap yields left');
      }

      const box = { suspends: false };
      const bad = wrapping(n, box);
      if (bad !== undefined) return bad;

      if (box.suspends && !waited) edits.push({ from: tokens[n].from, to: tokens[n].from, text: 'await ' });
    }

    if (tokens[n].text === 'make' && keyword(tokens, before, n)) {
      const bad = making(n);
      if (bad !== undefined) return bad;
    }

    const lands = land === undefined ? '' : ` ${land.open}${name}.value${land.close};`;
    edits.push({ from: tokens[last].to, to: tokens[last].to, text: ` if (${name}.branch === 'err') return ${name};${lands}` });
  };

  const nested = (from: number, to: number, freshOnly = false) => {
    const walk = (a: number, b: number): boolean => {
      for (let j = a; j >= 0 && j <= b; j++) {
        const t = tokens[j];
        if (t.kind === 'comment') continue;
        if (matcher[j] >= 0 && (!freshOnly || !consumed[j])) return true;
        if (carries.includes(t.text) && twin[j] >= 0) {
          if (walk(j + 1, twin[j] - 1)) return true;
          j = twin[j];
        }
      }

      return false;
    };

    return walk(from, to);
  };

  const matcherTail = (j: number) => {
    const operand = (p: number): boolean => {
      if (p < 0) return false;

      const t = tokens[p];
      if (t.kind === 'comment') return operand(before[p]);
      if (t.text === '?') return matcher[p] >= 0;
      if (t.text === ')') {
        const open = twin[p];
        if (open >= 0 && operand(before[open])) return true;
        return false;
      }
      if (t.text === '(' || t.text === '{' || t.text === '[' || t.text === '}' || t.text === ']' || t.text === ';' || t.text === ',' || t.text === '=') return false;
      return operand(before[p]);
    };

    return operand(before[j]);
  };

  const falls = (from: number, to: number) => {
    let depth = 0;

    for (let j = from; j >= 0 && j <= to; j++) {
      const t = tokens[j];
      if (t.kind === 'comment') continue;
      if (carries.includes(t.text)) { depth++; continue; }
      if (closes.includes(t.text)) { depth--; continue; }
      if (depth === 0 && t.kind === 'word' && t.text === 'else' && keyword(tokens, before, j)) {
        const n = after[j];
        if (n >= 0 && n <= to && tokens[n].kind === 'word' && ['return', 'ok', 'err', 'break', 'continue'].includes(tokens[n].text) && keyword(tokens, before, n)) return true;
      }
    }

    return false;
  };

  const elsewhere = (at: number, floor: number) => {
    const delims = [';', ',', '{', '}', '(', ')', '[', ']', ':', '=>', 'return', 'ok', 'err'];

    let k = before[at];
    let depth = 0;

    while (k >= floor) {
      const t = tokens[k];
      if (t.kind === 'comment') { k = before[k]; continue; }
      if (closes.includes(t.text)) { depth++; k = before[k]; continue; }
      if (carries.includes(t.text)) {
        if (depth === 0) return false;
        depth--;
        k = before[k];
        continue;
      }
      if (depth === 0) {
        if (t.kind === 'word' && t.text === 'else' && keyword(tokens, before, k)) return true;
        if (delims.includes(t.text)) return false;
      }

      k = before[k];
    }

    return false;
  };

  const chain: (i: number, from: number, last: number, span: { from: number, to: number }, box?: { temp: string }) => string | undefined | Failure = (i, from, last, span, box) => {
    const q = mark(from, last);
    if (q < 0) {
      if (box === undefined) return undefined;

      const t = tokens[from];
      if (t.kind !== 'word' || !['return', 'ok', 'err', 'break', 'continue'].includes(t.text) || !keyword(tokens, before, from)) {
        return no(from, 'a chain that declines ends with an exit');
      }

      const n = after[from];
      const body = n >= 0 && n <= last && tokens[n].text !== ';' ? spell(n, before[last], '', '') : '';
      span.from = from;
      span.to = before[last];
      dropped.push({ from, to: before[last] });
      return t.text === 'break' || t.text === 'continue'
        ? `${t.text}${body === '' ? '' : ` ${body}`};`
        : `${wraps[t.text].open}${body}${wraps[t.text].close};`;
    }

    const sub = temp(i);
    const subject = spell(from, before[q], '', '');

    if (nested(from, before[q])) return no(q, 'matchers do not nest; bind the inner value first');

    const tests: string[] = [];
    let tip = q;
    let cursor = q;
    let unwraps = false;
    let bindable = true;

    const conds: Array<{ from: number, to: number }> = [];
    const subjStop = before[q];
    const subjName = from === subjStop && from >= 0 && tokens[from].kind === 'word' && !reserved.includes(tokens[from].text) ? tokens[from].text : '';
    const subj = subjName === '' ? sub : subjName;
    const lead = subjName === '' ? '; ' : '';

    while (cursor >= 0 && matcher[cursor] >= 0) {
      const tag = matcher[cursor];

      if (tokens[tag].text === '(') {
        const shut = twin[tag];
        if (shut < 0) return no(tag, 'a condition has no closing paren');
        if (after[tag] === shut) return no(tag, 'a condition tests something');
        if (subjName === '') return no(tag, '?(...) tests a name; bind the value first');
        if (nested(after[tag], before[shut])) return no(tag, 'matchers do not nest; bind the inner value first');
        conds.push({ from: after[tag], to: before[shut] });
        tests.push(`(${spell(after[tag], before[shut], subjName, subj)}) === true`);
        bindable = false;
        consumed[cursor] = true;
        tip = tag;
        cursor = after[shut];
        continue;
      }

      const word = tokens[tag].text;

      if (tokens[tag].kind === 'number' || tokens[tag].kind === 'string' || word === '-' || word === '+' || word === 'true' || word === 'false') {
        tests.push(`${subj} === ${literal(cursor)}`);
        bindable = false;
        consumed[cursor] = true;
        tip = tag;
        cursor = after[mend(cursor)];
        continue;
      }

      tests.push(check(word, subj));
      if (!plain.includes(word)) unwraps = true;
      if (word === 'none') bindable = false;
      consumed[cursor] = true;
      tip = tag;
      cursor = after[tag];
    }

    const test = tests.join(' || ');
    const hold = kept(unwraps, subj);

    let bound = '';
    let bindAt = -1;

    if (cursor >= 0 && tokens[cursor].text === '(') {
      if (!bindable) {
        if (conds.length > 0) return no(cursor, '?(...) binds nothing; the subject is already named');
        return no(cursor, `?${tokens[tip].text} binds nothing; there is no value to name`);
      }

      const close = twin[cursor];
      if (close < 0) return no(tip, 'the binding has no closing paren');

      const inner = after[cursor];
      if (inner < 0 || inner >= close || tokens[inner].kind !== 'word') return no(tip, 'a decline binds a name, or nothing at all');
      if (after[inner] !== close) return no(tip, 'a decline binds a name, or nothing at all');

      bound = tokens[inner].text;
      if (reserved.includes(bound)) return no(inner, 'a binding names a value, not a keyword');
      bindAt = cursor;
      cursor = after[close];
    }

    for (const c of conds) if (bound !== '' && uses(c.from, c.to, bound) > 0) return no(c.from, 'a binding belongs to the tail; narrow the subject in the condition instead');

    if (cursor < 0 || tokens[cursor].text !== '=>') return no(cursor < 0 ? tip : cursor, 'an else branch answers with =>');

    const arrow = cursor;
    const answer = after[arrow];
    if (answer < 0) return no(arrow, 'a fallback needs a value');

    const ahead = tokens[answer].text;
    if (ahead === 'return' || ahead === 'ok' || ahead === 'err' || ahead === 'break' || ahead === 'continue' || ahead === 'async') {
      return no(answer, 'an else branch answers with a value; decline before it');
    }

    let yielded = '';
    let tail = -1;
    let other = -1;

    if (tokens[answer].text === '{') {
      const close = twin[answer];
      if (close < 0) return no(answer, 'a fallback block has no closing brace');
      if (nested(answer, close)) return no(answer, 'a block manages its own matchers; bind the value first');
      if (bound !== '' && uses(answer, close, bound) === 0) {
        return no(bindAt, `(${bound}) is never used; drop the binding`);
      }

      const opens = frames[holds[answer]].suspends ? 'await (async () => ' : '(() => ';
      yielded = `${opens}${spell(answer, close, bound, hold)})()`;
      tail = close;

      const k = after[close];
      if (k >= 0 && tokens[k].kind === 'word' && tokens[k].text === 'else' && keyword(tokens, before, k)) other = k;
      else if (k < 0 || (tokens[k].text !== ';' && tokens[k].text !== ',' && !closes.includes(tokens[k].text))) {
        return no(k < 0 ? answer : k, 'a fallback needs a semicolon');
      }
    }
    else {
      let j = answer;
      let end = -1;

      while (j >= 0 && j <= last) {
        const t = tokens[j];
        if (t.kind === 'comment') { j++; continue; }
        if (carries.includes(t.text)) { j = jump(j); continue; }
        if (matcher[j] >= 0 && !consumed[j]) return no(j, 'a matcher follows its subject; chain with else');
        if (t.kind === 'word' && t.text === 'else' && keyword(tokens, before, j)) { other = j; tail = before[j]; break; }
        if (t.text === ';' || t.text === ',' || closes.includes(t.text)) { end = j; tail = before[j]; break; }
        j++;
      }

      if (other < 0 && end < 0) return no(arrow, 'a fallback needs a semicolon');
      if (other < 0 && nested(answer, tail)) return no(q, 'matchers do not nest; bind the inner value first');
      if (other < 0 && bound !== '' && uses(answer, tail, bound) === 0) {
        return no(bindAt, `(${bound}) is never used; drop the binding`);
      }

      yielded = spell(answer, tail, bound, hold);
    }

    let code = '';
    let chainTo = tail;

    if (other >= 0) {
      consumed[other] = true;
      const inner = { from: -1, to: -1 };
      const r = chain(i, after[other], last, inner, box);
      if (r !== undefined && typeof r !== 'string') return r;

      if (typeof r === 'string') {
        code = r;
        chainTo = inner.to;
        if (bound !== '' && uses(answer, tail, bound) === 0) {
          return no(bindAt, `(${bound}) is never used; drop the binding`);
        }
      }
      else {
        const n = after[other];
        if (n >= 0 && tokens[n].text === '=>') {
          const answer = after[n];
          if (answer < 0) return no(n, 'an else branch answers with =>; it needs a value');

          if (tokens[answer].text === '{') {
            const close = twin[answer];
            if (close < 0) return no(answer, 'an else block has no closing brace');
            if (nested(answer, close)) return no(answer, 'a block manages its own matchers; bind the value first');
            const opens = frames[holds[answer]].suspends ? 'await (async () => ' : '(() => ';
            code = `${opens}${spell(answer, close, '', '')})()`;
            chainTo = close;
          }
          else {
            let k = answer;
            let eend = -1;

            while (k >= 0 && k <= last) {
              const u = tokens[k];
              if (u.kind === 'comment') { k++; continue; }
              if (carries.includes(u.text)) { k = jump(k); continue; }
              if (u.kind === 'word' && u.text === 'else' && keyword(tokens, before, k)) {
                return no(k, 'else chains a => answer; one else per answer');
              }
              if (u.text === ',') {
                return no(k, 'an else branch is one value');
              }
              if (u.text === ';' || closes.includes(u.text)) { eend = k; break; }
              k++;
            }

            if (eend < 0) return no(other, 'a fallback needs a semicolon');
            if (nested(answer, before[eend])) return no(other, 'matchers do not nest; bind the inner value first');
            code = spell(answer, before[eend], '', '');
            chainTo = before[eend];
          }
        }
        else if (n >= 0 && tokens[n].kind === 'word' && ['return', 'ok', 'err', 'break', 'continue'].includes(tokens[n].text) && keyword(tokens, before, n)) {
          return no(other, 'a chain that declines cannot be a value here; bind it or keep the funnel');
        }
        else {
          return no(other, 'a bare value answers nothing; answer with => or an exit');
        }
      }
    }
    else {
      code = hold;
    }

    let suspends = false;

    for (let j = from; j >= 0 && j <= tail; j++) {
      if (tokens[j].kind === 'word' && tokens[j].text === 'await' && keyword(tokens, before, j) && body[j] === body[i]) {
        suspends = true;
        break;
      }
    }

    const opens = suspends ? 'await (async () => ' : '(() => ';
    span.from = from;
    span.to = chainTo;
    dropped.push({ from, to: chainTo });

    if (box !== undefined) {
      return subjName === '' ? `const ${sub} = ${subject}${lead}if (${test}) { ${box.temp} = ${yielded}; } else { ${code} }` : `${lead}if (${test}) { ${box.temp} = ${yielded}; } else { ${code} }`;
    }

    return subjName === '' ? `${opens}{ const ${sub} = ${subject}; return ${test} ? ${yielded} : ${code}; })()` : `${opens}{ return ${test} ? ${yielded} : ${code}; })()`;
  };

  const declining = (i: number, init: number, at: number, last: number, land?: Landing) => {
    const tails = ['return', 'ok', 'err', 'break', 'continue'];
    const name = temp(i);

    consumed[at] = true;

    if (nested(init, before[at], true)) return no(at, 'matchers do not nest; bind the inner value first');

    const subjStop = before[at];
    const subjName = init === subjStop && init >= 0 && tokens[init].kind === 'word' && !reserved.includes(tokens[init].text) ? tokens[init].text : '';
    const subj = subjName === '' ? name : subjName;
    const lead = subjName === '' ? '; ' : '';

    edits.push(subjName === ''
      ? { from: tokens[i].from, to: tokens[init].from, text: `const ${name} = ` }
      : { from: tokens[i].from, to: tokens[before[at]].to, text: '' });
    if (subjName !== '') dropped.push({ from: init, to: subjStop });

    let anchor = tokens[before[at]].to;
    let cursor: number = at;

    while (true) {
      const tests: string[] = [];
      let tip = cursor;
      let unwraps = false;
      let bindable = true;
      let kind = '';
      const conds: Array<{ from: number, to: number }> = [];

      while (cursor >= 0 && matcher[cursor] >= 0) {
        const tag = matcher[cursor];

        if (tokens[tag].text === '(') {
          const shut = twin[tag];
          if (shut < 0) return no(tag, 'a condition has no closing paren');
          if (after[tag] === shut) return no(tag, 'a condition tests something');
          if (subjName === '') return no(tag, '?(...) tests a name; bind the value first');
          if (nested(after[tag], before[shut])) return no(tag, 'matchers do not nest; bind the inner value first');
          conds.push({ from: after[tag], to: before[shut] });
tests.push(`(${spell(after[tag], before[shut], subjName, subj)}) === true`);
          bindable = false;
          if (kind === '') kind = 'cond';
          consumed[cursor] = true;
          tip = tag;
          cursor = after[shut];
          continue;
        }

        const word = tokens[tag].text;

        if (tokens[tag].kind === 'number' || tokens[tag].kind === 'string' || word === '-' || word === '+' || word === 'true' || word === 'false') {
          tests.push(`${subj} === ${literal(cursor)}`);
          bindable = false;
          if (kind === '') kind = 'literal';
          consumed[cursor] = true;
          tip = tag;
          cursor = after[mend(cursor)];
          continue;
        }

tests.push(check(word, subj));
        if (!plain.includes(word)) unwraps = true;
        if (word === 'none') bindable = false;
        if (kind === '') kind = word;
        consumed[cursor] = true;
        tip = tag;
        cursor = after[tag];
      }

      const test = tests.join(' || ');
      const hold = kept(unwraps, subj);

      let bound = '';
      let bindAt = -1;

      if (cursor >= 0 && tokens[cursor].text === '(') {
        if (!bindable) {
          if (conds.length > 0) return no(cursor, '?(...) binds nothing; the subject is already named');
          if (kind === 'none') return no(cursor, `?${kind} binds nothing; absence carries no value`);
          if (kind === 'some') return no(cursor, `?${kind} binds nothing; mixed with ?none it names no one value`);
          if (kind === 'literal') return no(cursor, 'a literal binds nothing; there is no value to name');
          return no(cursor, `?${kind} binds nothing; a boolean carries no value`);
        }

        const close = twin[cursor];
        if (close < 0) return no(tip, 'the binding has no closing paren');

        const inner = after[cursor];
        if (inner < 0 || inner >= close || tokens[inner].kind !== 'word') return no(tip, 'a decline binds a name, or nothing at all');
        if (after[inner] !== close) return no(tip, 'a decline binds a name, or nothing at all');

        bound = tokens[inner].text;
        if (reserved.includes(bound)) return no(inner, 'a binding names a value, not a keyword');
        bindAt = cursor;
        cursor = after[close];
      }

      for (const c of conds) if (bound !== '' && uses(c.from, c.to, bound) > 0) return no(c.from, 'a binding belongs to the tail; narrow the subject in the condition instead');

      if (cursor < 0) return no(tip, 'a matcher needs a tail: an exit, an expression, or a block');

      const tail = tokens[cursor].text;

      if (tail === '=>') {
        if (land === undefined) return no(cursor, 'an expression must always be captured; a statement runs an expression or a block');
        const arrow = cursor;
        const answer = after[arrow];
        if (answer < 0) return no(arrow, 'a fallback needs a value');

        const ahead = tokens[answer].text;
        if (tails.includes(ahead)) return no(answer, 'a => answers with a value; to decline, use an exit');
        if (ahead === 'async') return no(answer, 'async states a promise body, not a matcher tail');

        if (tokens[answer].text === '{') {
          const close = twin[answer];
          if (close < 0) return no(answer, 'a fallback block has no closing brace');
          if (land === undefined) return no(answer, 'a block yields its value; bind it or return it');

          const opens = frames[holds[answer]].suspends ? 'await (async () => ' : '(() => ';
          const k = after[close];
          const kIsElse = k >= 0 && tokens[k].kind === 'word' && tokens[k].text === 'else' && keyword(tokens, before, k);
          const eAfterK = kIsElse ? after[k] : -1;
          if (kIsElse && land !== undefined && eAfterK >= 0 && tails.includes(tokens[eAfterK].text)) {
            consumed[k] = true;
            let eend = -1;
            let m = after[eAfterK];
            while (m >= 0 && m <= last) {
              const u = tokens[m];
              if (u.kind === 'comment') { m++; continue; }
              if (carries.includes(u.text)) { m = jump(m); continue; }
              if (u.text === ';' || u.text === ',' || closes.includes(u.text)) { eend = m; break; }
              m++;
            }
            if (eend < 0) return no(eAfterK, `an ${tokens[eAfterK].text} tail needs a semicolon`);
            if (bound !== '' && uses(answer, close, bound) === 0) {
              return no(bindAt, `(${bound}) is never used; drop the binding`);
            }
            if (bound !== '' && uses(after[eAfterK], before[eend], bound) > 0) {
              return no(after[eAfterK], `the else branch runs on miss, where (${bound}) names nothing`);
            }
            const msg = after[eAfterK] > before[eend] ? '' : spell(after[eAfterK], before[eend], '', '');
            const exitTail = tokens[eAfterK].text;
            const exitCode = exitTail === 'break' || exitTail === 'continue'
              ? `${exitTail}${msg === '' ? '' : ` ${msg}`};`
              : `${wraps[exitTail].open}${msg}${wraps[exitTail].close};`;
            edits.push({ from: anchor, to: tokens[answer].from, text: `${lead}if (!(${test})) ${exitCode} ${land.open}${opens}` });
            edits.push({ from: tokens[close].to, to: tokens[close].to, text: `)()${land.close}` });
            edits.push({ from: tokens[before[eAfterK]].to, to: tokens[eend].from, text: '' });
            dropped.push({ from: k, to: eend });
            if (bound !== '') rename(answer, close, bound, hold);
            return undefined;
          }
          edits.push({ from: anchor, to: tokens[answer].from, text: `${lead}${land.open}${test} ? ${opens}` });

          let missAt = -1;
          if (kIsElse) {
            consumed[k] = true;
            const inner = { from: -1, to: -1 };
            const r = chain(i, after[k], last, inner);
            if (r !== undefined && typeof r !== 'string') return r;

            if (typeof r === 'string') {
              edits.push({ from: inner.from, to: inner.to, text: r });
            }
            else {
              if (find(after[k], last, [',']) >= 0) return no(k, 'an else branch is one value');
              if (nested(after[k], before[last])) return no(k, 'matchers do not nest; bind the inner value first');
              missAt = after[k];
            }

            const code = typeof r === 'string' ? r : source.slice(tokens[after[k]].from, tokens[before[last]].to);
            edits.push({ from: tokens[k].from, to: tokens[k].to, text: '' });
            edits.push({ from: tokens[close].to, to: tokens[close].to, text: `)() : ${code}${land.close}` });
          }
          else if (k >= 0 && tokens[k].text === ';') {
            edits.push({ from: tokens[close].to, to: tokens[close].to, text: `)() : ${hold}${land.close}` });
          }
          else if (k >= 0 && matcher[k] >= 0 && !consumed[k]) {
            return no(k, 'a matcher follows its subject; chain with else');
          }
          else return no(k < 0 ? answer : k, 'a fallback needs a semicolon');

          if (bound !== '') {
            if (uses(answer, close, bound) === 0) {
              if (missAt >= 0 && uses(missAt, before[last], bound) > 0) {
                return no(missAt, `the else branch runs on miss, where (${bound}) names nothing`);
              }
              return no(bindAt, `(${bound}) is never used; drop the binding`);
            }
            rename(answer, close, bound, hold);
          }
          return undefined;
        }

        let j = answer;
        let end = -1;
        let other = -1;

        while (j >= 0 && j <= last) {
          const t = tokens[j];
          if (t.kind === 'comment') { j++; continue; }
          if (carries.includes(t.text)) { j = jump(j); continue; }
          if (matcher[j] >= 0 && !consumed[j]) return no(j, 'a matcher follows its subject; chain with else or start a new statement');
          if (t.kind === 'word' && t.text === 'else' && keyword(tokens, before, j)) { other = j; break; }
          if (t.text === ';' || t.text === ',' || closes.includes(t.text)) { end = j; break; }
          j++;
        }

        if (other < 0 && end < 0) return no(arrow, 'a fallback needs a semicolon');

        if (other >= 0) {
          consumed[other] = true;
          const eAfter = after[other];
          if (land !== undefined && eAfter >= 0 && tails.includes(tokens[eAfter].text)) {
            let eend = -1;
            let m = after[eAfter];
            while (m >= 0 && m <= last) {
              const u = tokens[m];
              if (u.kind === 'comment') { m++; continue; }
              if (carries.includes(u.text)) { m = jump(m); continue; }
              if (u.text === ';' || u.text === ',' || closes.includes(u.text)) { eend = m; break; }
              m++;
            }
            if (eend < 0) return no(eAfter, `an ${tokens[eAfter].text} tail needs a semicolon`);
            if (bound !== '' && uses(answer, before[other], bound) === 0) {
              return no(bindAt, `(${bound}) is never used; drop the binding`);
            }
            if (bound !== '' && uses(after[eAfter], before[eend], bound) > 0) {
              return no(after[eAfter], `the else branch runs on miss, where (${bound}) names nothing`);
            }
            const msg = after[eAfter] > before[eend] ? '' : spell(after[eAfter], before[eend], '', '');
            const exitTail = tokens[eAfter].text;
            const exitCode = exitTail === 'break' || exitTail === 'continue'
              ? `${exitTail}${msg === '' ? '' : ` ${msg}`};`
              : `${wraps[exitTail].open}${msg}${wraps[exitTail].close};`;
            edits.push({ from: anchor, to: tokens[answer].from, text: `${lead}if (!(${test})) ${exitCode} ${land.open}` });
            edits.push({ from: tokens[before[other]].to, to: tokens[eend].from, text: `${land.close === '' ? '' : land.close}` });
            dropped.push({ from: other, to: eend });
            if (bound !== '') rename(answer, before[other], bound, hold);
            return undefined;
          }
          if (falls(after[other], last)) {
            if (bound !== '' && uses(after[other], last, bound) > 0) {
              return no(after[other], `the else branch runs on miss, where (${bound}) names nothing`);
            }

            const value = temp(i);
            const inner = { from: -1, to: -1 };
            const r = chain(i, after[other], last, inner, { temp: value });
            if (r !== undefined && typeof r !== 'string') return r;
            if (r === undefined) return no(other, 'a chain that declines ends with an exit');

            edits.push({ from: tokens[i].from, to: tokens[i].from, text: `let ${value}; ` });
            edits.push({ from: anchor, to: tokens[answer].from, text: `${lead}if (${test}) { ${value} = ` });
            edits.push({ from: tokens[before[other]].to, to: tokens[before[other]].to, text: `; } else { ` });
            edits.push({ from: tokens[other].from, to: tokens[other].to, text: '' });
            edits.push({ from: tokens[inner.from].from, to: tokens[inner.to].to, text: r });
            edits.push({ from: tokens[before[last]].to, to: tokens[before[last]].to, text: ` } ${land.open}${value}${land.close}` });
            dropped.push({ from: other, to: last });
            if (bound !== '') rename(answer, before[other], bound, hold);
            return undefined;
          }
          const inner = { from: -1, to: -1 };
          const r = chain(i, after[other], last, inner);
          if (r !== undefined && typeof r !== 'string') return r;
          if (typeof r === 'string') edits.push({ from: tokens[inner.from].from, to: tokens[inner.to].to, text: r });

          const missAt = typeof r === 'string' ? -1 : after[other];

          if (bound !== '' && uses(answer, before[other], bound) === 0) {
            if (missAt >= 0 && uses(missAt, before[last], bound) > 0) {
              return no(missAt, `the else branch runs on miss, where (${bound}) names nothing`);
            }
            return no(bindAt, `(${bound}) is never used; drop the binding`);
          }

          if (land === undefined) {
            edits.push({ from: anchor, to: tokens[answer].from, text: `${lead}if (${test}) ` });

            if (bound !== '') rename(answer, before[other], bound, hold);
            return undefined;
          }

          edits.push({ from: anchor, to: tokens[answer].from, text: `${lead}${land.open}${test} ? ` });
          edits.push({ from: tokens[before[other]].to, to: tokens[before[other]].to, text: ' : ' });
          edits.push({ from: tokens[other].from, to: tokens[other].to, text: '' });

          if (land.close !== '') edits.push({ from: tokens[before[last]].to, to: tokens[before[last]].to, text: land.close });

          if (bound !== '') rename(answer, before[other], bound, hold);
          return undefined;
        }

        if (tokens[end].text !== ';' && tokens[end].text !== ',') return no(arrow, 'a fallback needs a semicolon');
        if (land === undefined && tokens[end].text !== ';') return no(arrow, 'a trigger is a statement of its own');

        if (bound !== '' && uses(answer, before[end], bound) === 0) {
          return no(bindAt, `(${bound}) is never used; drop the binding`);
        }

        if (land === undefined) {
          edits.push({ from: anchor, to: tokens[answer].from, text: `${lead}if (${test}) ` });

          if (bound !== '') rename(answer, before[end], bound, hold);
          return undefined;
        }

        edits.push({ from: anchor, to: tokens[answer].from, text: `${lead}${land.open}${test} ? ` });
        edits.push({ from: tokens[end].from, to: tokens[end].from, text: ` : ${hold}${land.close}` });

        if (bound !== '') rename(answer, before[end], bound, hold);
        return undefined;
      }

      if (tail === '{') {
        const open = cursor;
        const close = twin[open];
        if (close < 0) return no(open, 'a tail block has no closing brace');

        if (bound !== '' && uses(open, close, bound) === 0) {
          return no(bindAt, `(${bound}) is never used; drop the binding`);
        }

        edits.push({ from: anchor, to: tokens[open].from, text: `${lead}if (${test}) ` });
        if (bound !== '') edits.push({ from: tokens[open].to, to: tokens[open].to, text: ` const ${bound} = ${hold};` });

        if (land !== undefined && !leaves(frames[holds[open]].last)) {
          return no(open, 'a block that never leaves yields nothing to land on');
        }

        const semi = after[close] >= 0 && tokens[after[close]].text === ';' ? after[close] : -1;
        const k = semi >= 0 ? after[semi] : after[close];

        if (k >= 0 && matcher[k] >= 0 && !consumed[k]) {
          return no(k, 'a statement with two sides uses else; a longer match uses ? {}');
        }

        if (k >= 0 && tokens[k].kind === 'word' && tokens[k].text === 'else' && keyword(tokens, before, k)) {
          if (land !== undefined) return no(k, 'a trigger chain juxtaposes; else is for answers');
          consumed[k] = true;
          const e = after[k];
          if (e < 0) return no(k, 'an else branch needs an expression, a block, or an exit');
          if (tails.includes(tokens[e].text)) {
            let m = after[e];
            let end = -1;
            while (m >= 0 && m <= last) {
              const u = tokens[m];
              if (u.kind === 'comment') { m++; continue; }
              if (carries.includes(u.text)) { m = jump(m); continue; }
              if (u.text === ';' || u.text === ',' || closes.includes(u.text)) { end = m; break; }
              m++;
            }
            if (end < 0) return no(e, `an ${tokens[e].text} tail needs a semicolon`);
            if (bound !== '' && uses(after[e], before[end], bound) > 0) {
              return no(after[e], `the else branch runs on miss, where (${bound}) names nothing`);
            }
            return undefined;
          }
          if (tokens[e].text === '{') {
            const eclose = twin[e];
            if (eclose < 0) return no(e, 'an else block has no closing brace');
            if (bound !== '' && uses(e, eclose, bound) > 0) {
              return no(e, `the else branch runs on miss, where (${bound}) names nothing`);
            }
            return undefined;
          }
          if (tokens[e].text === ';' || tokens[e].text === ',' || closes.includes(tokens[e].text)) {
            return no(e, 'an else branch needs an expression, a block, or an exit');
          }
          let m = e;
          let end = -1;
          while (m >= 0 && m <= last) {
            const u = tokens[m];
            if (u.kind === 'comment') { m++; continue; }
            if (carries.includes(u.text)) { m = jump(m); continue; }
            if (matcher[m] >= 0 && !consumed[m]) return no(m, 'one decline per statement; start a new one');
            if (u.text === ';' || u.text === ',' || closes.includes(u.text)) { end = m; break; }
            m++;
          }
          if (end < 0) return no(e, 'an else branch needs a semicolon');
          if (bound !== '' && uses(e, before[end], bound) > 0) {
            return no(e, `the else branch runs on miss, where (${bound}) names nothing`);
          }
          if (bound !== '') rename(e, before[end], bound, hold);
          return undefined;
        }

        if (k >= 0 && k <= last && tokens[k].text !== ';' && tokens[k].text !== ',' && !closes.includes(tokens[k].text)) {
          return no(k, 'a tail block needs a semicolon');
        }

        if (k < 0) {
          if (land !== undefined) edits.push({ from: tokens[close].to, to: tokens[close].to, text: ` ${land.open}${hold}${land.close};` });
          return undefined;
        }

        if (land !== undefined) {
          if (semi >= 0) edits.push({ from: tokens[semi].from, to: tokens[semi].to, text: `;${land.open}${hold}${land.close};` });
          else edits.push({ from: tokens[close].to, to: tokens[close].to, text: ` ${land.open}${hold}${land.close};` });
        }

        return undefined;
      }

      if (tails.includes(tail)) {
        let m = after[cursor];
        let end = -1;
        let other = -1;

        while (m >= 0 && m <= last) {
          const u = tokens[m];
          if (u.kind === 'comment') { m++; continue; }
          if (carries.includes(u.text)) { m = jump(m); continue; }
          if (matcher[m] >= 0 && !consumed[m]) return no(m, 'one decline per statement; start a new one');
          if (u.kind === 'word' && u.text === 'else' && keyword(tokens, before, m)) { other = m; break; }
          if (u.text === ';' || u.text === ',' || closes.includes(u.text)) { end = m; break; }
          m++;
        }

        if (end < 0 && other < 0) return no(cursor, `a ${tail} tail needs a semicolon`);

        const boundEnd = other >= 0 ? before[other] : before[end];
        if (bound !== '' && uses(after[cursor], boundEnd, bound) === 0) {
          return no(bindAt, `(${bound}) is never used; drop the binding`);
        }

        edits.push({ from: anchor, to: tokens[cursor].from, text: bound === '' ? `${lead}if (${test}) ` : `${lead}if (${test}) { const ${bound} = ${hold}; ` });
        if (bound !== '') edits.push({ from: tokens[other >= 0 ? before[other] : end].to, to: tokens[other >= 0 ? before[other] : end].to, text: ' }' });

        if (other < 0) {
          if (land !== undefined) edits.push({ from: tokens[end].to, to: tokens[end].to, text: ` ${land.open}${hold}${land.close};` });
          if (mark(after[end], last) >= 0) return no(after[end], 'one decline per statement; start a new one');
          return undefined;
        }

        const exitMsg = after[cursor] > before[other] ? '' : spell(after[cursor], before[other], bound, hold);
        const exitCode = tail === 'break' || tail === 'continue'
          ? `${tail}${exitMsg === '' ? '' : ` ${exitMsg}`};`
          : tail === 'return' && exitMsg === '' ? 'return;'
          : `${wraps[tail].open}${exitMsg}${wraps[tail].close};`;
        edits.push({ from: tokens[cursor].from, to: tokens[before[other]].to, text: `${exitCode} ` });
        dropped.push({ from: cursor, to: before[other] });

        consumed[other] = true;
        let k = after[other];
        let vbind = '';
        if (k >= 0 && tokens[k].text === '(') {
          const close = twin[k];
          const inner = k >= 0 && close >= 0 ? after[k] : -1;
          if (close < 0) return no(k, 'the binding has no closing paren');
          if (inner < 0 || inner >= close || tokens[inner].kind !== 'word' || after[inner] !== close) return no(k, 'the miss binds a name, or nothing at all');
          vbind = tokens[inner].text;
          if (reserved.includes(vbind)) return no(inner, 'a binding names a value, not a keyword');
          k = after[close];
        }
        if (k >= 0 && tokens[k].text === '=>') {
          const n = after[k];
          edits.push({ from: tokens[before[other]].to, to: tokens[k].to, text: vbind === '' ? '' : `const ${vbind} = ${hold}; ` });
          const at2 = mark(n, last);
          if (at2 >= 0) return declining(n, n, at2, last, land);
          edits.push({ from: tokens[n].from, to: tokens[before[last]].to, text: `${land !== undefined ? `${land.open}${spell(n, before[last], '', '')}${land.close}` : `${spell(n, before[last], '', '')}`}` });
          dropped.push({ from: n, to: before[last] });
          return undefined;
        }
        return no(k < 0 ? other : k, 'a miss after else answers with => or declines');
      }

      if (land === undefined && tail !== 'async' && tail !== 'else' && tail !== ':' && tail !== ';' && tail !== ',' && !closes.includes(tail)) {
        let j = cursor;
        let end = -1;
        let other = -1;
        while (j >= 0 && j <= last) {
          const t = tokens[j];
          if (t.kind === 'comment') { j++; continue; }
          if (carries.includes(t.text)) { j = jump(j); continue; }
          if (matcher[j] >= 0 && !consumed[j]) return no(j, 'one decline per statement; start a new one');
          if (t.kind === 'word' && t.text === 'else' && keyword(tokens, before, j)) { other = j; break; }
          if (t.text === ';' || t.text === ',' || closes.includes(t.text)) { end = j; break; }
          j++;
        }
        if (other < 0 && end < 0) return no(cursor, 'a statement tail needs a semicolon');
        if (nested(cursor, other >= 0 ? before[other] : before[end])) return no(cursor, 'matchers do not nest; bind the inner value first');
        if (bound !== '' && uses(cursor, other >= 0 ? before[other] : before[end], bound) === 0) {
          return no(bindAt, `(${bound}) is never used; drop the binding`);
        }
        edits.push({ from: anchor, to: tokens[cursor].from, text: `${lead}if (${test}) ` });
        if (bound !== '') rename(cursor, other >= 0 ? before[other] : before[end], bound, hold);
        if (other < 0) return undefined;
        consumed[other] = true;
        edits.push({ from: tokens[before[other]].to, to: tokens[before[other]].to, text: ';' });
        const e = after[other];
        if (e < 0) return no(other, 'an else branch needs an expression, a block, or an exit');
        if (tails.includes(tokens[e].text)) {
          let m = after[e];
          let eend = -1;
          while (m >= 0 && m <= last) {
            const u = tokens[m];
            if (u.kind === 'comment') { m++; continue; }
            if (carries.includes(u.text)) { m = jump(m); continue; }
            if (u.text === ';' || u.text === ',' || closes.includes(u.text)) { eend = m; break; }
            m++;
          }
          if (eend < 0) return no(e, `an ${tokens[e].text} tail needs a semicolon`);
          if (bound !== '' && uses(after[e], before[eend], bound) > 0) {
            return no(after[e], `the else branch runs on miss, where (${bound}) names nothing`);
          }
          return undefined;
        }
        if (tokens[e].text === '{') {
          const eclose = twin[e];
          if (eclose < 0) return no(e, 'an else block has no closing brace');
          if (bound !== '' && uses(e, eclose, bound) > 0) {
            return no(e, `the else branch runs on miss, where (${bound}) names nothing`);
          }
          return undefined;
        }
        if (tokens[e].text === ';' || tokens[e].text === ',' || closes.includes(tokens[e].text)) {
          return no(e, 'an else branch needs an expression, a block, or an exit');
        }
        let m = e;
        let eend = -1;
        while (m >= 0 && m <= last) {
          const u = tokens[m];
          if (u.kind === 'comment') { m++; continue; }
          if (carries.includes(u.text)) { m = jump(m); continue; }
          if (matcher[m] >= 0 && !consumed[m]) return no(m, 'one decline per statement; start a new one');
          if (u.text === ';' || u.text === ',' || closes.includes(u.text)) { eend = m; break; }
          m++;
        }
        if (eend < 0) return no(e, 'an else branch needs a semicolon');
        if (bound !== '' && uses(e, before[eend], bound) > 0) {
          return no(e, `the else branch runs on miss, where (${bound}) names nothing`);
        }
        return undefined;
      }

      if (tail === 'async') return no(cursor, 'async states a promise body, not a matcher tail');
      if (tail === 'else') return no(cursor, 'else chains a => answer; use ?true ... else ... for statements');
      if (tail === ':') return no(cursor, '?: is refused; answer with ?true => ... else ...');
      if (tail === ';' || tail === ',' || closes.includes(tail)) return no(cursor, 'a matcher needs a tail: an exit, an expression, or a block');

      return no(cursor, 'an expression must always be captured; to decline, use an exit');
    }
  };

  const hoisted = (from: number, to: number) => {
    const walk = (a: number, b: number): boolean => {
      for (let j = a; j >= 0 && j <= b; j++) {
        if (tokens[j].kind === 'comment') continue;
        if (matcher[j] >= 0 && !consumed[j]) return true;
        if ((tokens[j].text === '(' || tokens[j].text === '[') && twin[j] >= 0) {
          if (walk(j + 1, twin[j] - 1)) return true;
          j = twin[j];
          continue;
        }
        if (tokens[j].text === '{' && twin[j] >= 0) {
          const f = holds[j];
          if (f >= 0 && frames[f].kind === 'object') {
            if (walk(j + 1, twin[j] - 1)) return true;
          }
          j = twin[j];
        }
      }

      return false;
    };

    return walk(from, to);
  };

  const bodyEnd = (j: number, b: number) => {
    let k = j + 1;
    let depth = 0;

    while (k <= b) {
      const u = tokens[k];
      if (u.kind === 'comment') { k++; continue; }
      if (u.text === '(' || u.text === '[' || u.text === '{') { depth++; k++; continue; }
      if (u.text === ')' || u.text === ']' || u.text === '}') {
        if (depth === 0) return before[k];
        depth--;
        k++;
        continue;
      }
      if (depth === 0 && (u.text === ',' || u.text === ';')) return before[k];
      k++;
    }

    return b;
  };

  const linkBody: (i: number, from: number, to: number, bound: string, hold: string, box?: { top: boolean, ladder: boolean }) => string | Failure = (i, from, to, bound, hold, box) => {
    if (box !== undefined && box.ladder) {
      const t = tokens[from];
      if (t.kind === 'word' && ['return', 'ok', 'err', 'break', 'continue'].includes(t.text) && keyword(tokens, before, from)) {
        const n = after[from];
        const body = n >= 0 && n <= to ? spell(n, to, '', '') : '';
        return t.text === 'break' || t.text === 'continue'
          ? `${t.text}${body === '' ? '' : ` ${body}`};`
          : `${wraps[t.text].open}${body}${wraps[t.text].close};`;
      }
    }

    const parts: string[] = [];
    let pos = from;
    let j = from;

    const flush = (to: number) => {
      if (to >= pos) {
        parts.push(spell(pos, to, bound, hold));
        pos = to + 1;
      }
    };

    while (j >= 0 && j <= to) {
      const t = tokens[j];

      if (t.kind === 'comment') { j++; continue; }

      if (t.text === '(' || t.text === '[') {
        const close = twin[j];
        if (close < 0 || close > to) { j++; continue; }

        flush(j - 1);
        parts.push(tokens[j].text);

        const inner = linkBody(i, j + 1, close - 1, bound, hold, { top: false, ladder: false });
        if (typeof inner !== 'string') return inner;

        parts.push(inner);
        parts.push(tokens[close].text);
        pos = close + 1;
        j = close + 1;
        continue;
      }

      if (t.text === '{') {
        const f = holds[j];
        const close = twin[j];

        if (f >= 0 && frames[f].kind === 'object' && close >= 0 && close <= to) {
          flush(j - 1);
          parts.push(tokens[j].text);

          const inner = linkBody(i, j + 1, close - 1, bound, hold, { top: false, ladder: false });
          if (typeof inner !== 'string') return inner;

          parts.push(inner);
          parts.push(tokens[close].text);
          pos = close + 1;
          j = close + 1;
          continue;
        }

        if (close >= 0 && hoisted(j, close)) return no(j, 'a block manages its own matchers; bind the value first');

        j = close >= 0 ? close + 1 : j + 1;
        continue;
      }

      if (t.text === '=>' && keyword(tokens, before, j)) {
        const n = after[j];

        if (n < 0 || n > to || tokens[n].text === '{') {
          if (n >= 0 && n <= to && tokens[n].text === '{' && matcherTail(j) && twin[n] >= 0) {
            const close = twin[n];
            if (close >= 0 && close <= to && !hoisted(n, close)) {
              const opens = frames[holds[n]].suspends ? 'await (async () => ' : '(() => ';
              flush(j - 1);
              parts.push(`${opens}${spell(n, close, bound, hold)})()`);
              pos = close + 1;
              j = close + 1;
              continue;
            }
          }
          if (n >= 0 && n <= to && tokens[n].text === '{' && twin[n] >= 0 && hoisted(n, twin[n])) {
            return no(n, 'a block manages its own matchers; bind the value first');
          }

          j++;
          continue;
        }

        const isTail = matcherTail(j);
        flush(isTail ? j - 1 : j);
        if (!isTail) parts.push(tokens[j].text);

        const end = bodyEnd(j, to);
        const inner = linkBody(i, n, end, bound, hold, { top: false, ladder: false });
        if (typeof inner !== 'string') return inner;

        parts.push(inner);
        pos = end + 1;
        j = end + 1;
        continue;
      }

      if (t.kind === 'word' && t.text === 'else' && keyword(tokens, before, j)) {
        const p = after[j] >= 0 && tokens[after[j]].text === ':' && frames[owner[j]].kind === 'object';
        if (!p) return no(j, 'else chains a => answer; one else per answer');
        j++;
        continue;
      }

      if (matcher[j] >= 0 && !consumed[j]) {
        const link = { code: '', end: j, start: j };
        const bad = linkOne(i, j, to, from, link, box);
        if (bad !== undefined) return bad;

        flush(link.start - 1);
        parts.push(link.code);
        pos = link.end + 1;
        j = link.end + 1;
        continue;
      }

      j++;
    }

    flush(to);
    return parts.join('');
  };

  const linkOne = (i: number, at: number, last: number, floor: number, out: { code: string, end: number, start: number }, box?: { top: boolean, ladder: boolean }) => {
    const sub = temp(i);

    let s = before[at];
    let depth = 0;
    let start = -1;
    const delims = ['(', ',', '[', '=', ':', ';', '{', '}', 'return', 'ok', 'err'];

    while (s >= floor) {
      const t = tokens[s];
      if (t.kind === 'comment') { s = before[s]; continue; }
      if (closes.includes(t.text)) { depth++; s = before[s]; continue; }
      if (carries.includes(t.text)) {
        if (depth === 0) { start = after[s]; break; }
        depth--;
        s = before[s];
        continue;
      }
      if (depth === 0) {
        if (t.text === '=>') return no(at, 'an arrow body answers with =>');
        if (matcher[s] >= 0) return no(at, 'matchers do not nest; bind the inner value first');
        if (delims.includes(t.text) && (t.kind !== 'word' || keyword(tokens, before, s))) { start = after[s]; break; }
      }

      s = before[s];
    }

    if (start < 0) start = floor;

    const stop = before[at];
    if (start > stop) return no(at, 'a matcher tests a value');
    if (nested(start, stop)) return no(at, 'matchers do not nest; bind the inner value first');

    const subject = spell(start, stop, '', '');

    const tests: string[] = [];
    let tip = at;
    let cursor = at;
    let unwraps = false;
    let bindable = true;
    const conds: Array<{ from: number, to: number }> = [];
    const subjName = start === stop && start >= 0 && tokens[start].kind === 'word' && !reserved.includes(tokens[start].text) ? tokens[start].text : '';
    const subj = subjName === '' ? sub : subjName;
    const lead = subjName === '' ? '; ' : '';

    while (cursor >= 0 && matcher[cursor] >= 0) {
      const tag = matcher[cursor];

      if (tokens[tag].text === '(') {
        const shut = twin[tag];
        if (shut < 0) return no(tag, 'a condition has no closing paren');
        if (after[tag] === shut) return no(tag, 'a condition tests something');
        if (subjName === '') return no(tag, '?(...) tests a name; bind the value first');
        if (nested(after[tag], before[shut])) return no(tag, 'matchers do not nest; bind the inner value first');
        conds.push({ from: after[tag], to: before[shut] });
        tests.push(`(${spell(after[tag], before[shut], subjName, subj)}) === true`);
        bindable = false;
        consumed[cursor] = true;
        tip = tag;
        cursor = after[shut];
        continue;
      }

      const word = tokens[tag].text;

      if (tokens[tag].kind === 'number' || tokens[tag].kind === 'string' || word === '-' || word === '+' || word === 'true' || word === 'false') {
        tests.push(`${subj} === ${literal(cursor)}`);
        bindable = false;
        consumed[cursor] = true;
        tip = tag;
        cursor = after[mend(cursor)];
        continue;
      }

      tests.push(check(word, subj));
      if (!plain.includes(word)) unwraps = true;
      if (word === 'none') bindable = false;
      consumed[cursor] = true;
      tip = tag;
      cursor = after[tag];
    }

    const test = tests.join(' || ');
    const hold = kept(unwraps, subj);

    let bound = '';
    let bindAt = -1;

    if (cursor >= 0 && tokens[cursor].text === '(') {
      if (!bindable) {
        if (conds.length > 0) return no(cursor, '?(...) binds nothing; the subject is already named');
        return no(cursor, `?${tokens[tip].text} binds nothing; there is no value to name`);
      }

      const close = twin[cursor];
      if (close < 0) return no(tip, 'the binding has no closing paren');

      const inner = after[cursor];
      if (inner < 0 || inner >= close || tokens[inner].kind !== 'word') return no(tip, 'a decline binds a name, or nothing at all');
      if (after[inner] !== close) return no(tip, 'a decline binds a name, or nothing at all');

      bound = tokens[inner].text;
      if (reserved.includes(bound)) return no(inner, 'a binding names a value, not a keyword');
      bindAt = cursor;
      cursor = after[close];
    }

    for (const c of conds) if (bound !== '' && uses(c.from, c.to, bound) > 0) return no(c.from, 'a binding belongs to the tail; narrow the subject in the condition instead');

    const exits = ['return', 'ok', 'err', 'break', 'continue'];

    if (cursor < 0 || tokens[cursor].text !== '=>') {
      if (cursor >= 0 && exits.includes(tokens[cursor].text)) return no(cursor, 'an arrow body answers; decline in a block');
      if (cursor >= 0 && tokens[cursor].text === 'async') return no(cursor, 'async states a promise body, not a matcher tail');
      if (cursor >= 0 && tokens[cursor].text === 'else') return no(cursor, 'else chains a => answer');
      if (cursor >= 0 && tokens[cursor].text === ':') return no(cursor, '?: is refused; answer with ?true => ... else ...');
      return no(cursor < 0 ? tip : cursor, 'an arrow body answers with =>');
    }

    const arrow = cursor;
    const answer = after[arrow];
    if (answer < 0) return no(arrow, 'a fallback needs a value');

    const ahead = tokens[answer].text;
    if (exits.includes(ahead) || ahead === 'async') return no(answer, 'an arrow body answers; decline in a block');

    let yielded = '';
    let tail = -1;
    let other = -1;

    if (tokens[answer].text === '{') {
      const close = twin[answer];
      if (close < 0) return no(answer, 'a fallback block has no closing brace');
      if (nested(answer, close)) return no(answer, 'a block manages its own matchers; bind the value first');

      const opens = frames[holds[answer]].suspends ? 'await (async () => ' : '(() => ';
      yielded = `${opens}${spell(answer, close, bound, hold)})()`;
      tail = close;

      const k = after[close];
      if (k >= 0 && k <= last && tokens[k].kind === 'word' && tokens[k].text === 'else' && keyword(tokens, before, k)) other = k;
      else if (k >= 0 && k <= last && matcher[k] >= 0 && !consumed[k]) {
        return no(k, 'a matcher follows its subject; chain with else');
      }
      else if (k < 0 || k > last || (tokens[k].text !== ';' && tokens[k].text !== ',' && !closes.includes(tokens[k].text))) {
        return no(k < 0 ? answer : k, 'a fallback needs a semicolon');
      }
    }
    else {
      let j = answer;

      while (j >= 0 && j <= last) {
        const t = tokens[j];
        if (t.kind === 'comment') { j++; continue; }
        if (carries.includes(t.text)) { j = jump(j); continue; }
        if (matcher[j] >= 0 && !consumed[j]) return no(j, 'a matcher follows its subject; chain with else');
        if (t.kind === 'word' && t.text === 'else' && keyword(tokens, before, j)) { other = j; tail = before[j]; break; }
        if (t.text === ';' || t.text === ',' || closes.includes(t.text)) { tail = before[j]; break; }
        j++;
      }

      if (j > last) tail = last;

      const inner = linkBody(i, answer, tail, bound, hold, { top: false, ladder: false });
      if (typeof inner !== 'string') return inner;

      yielded = inner;
    }

    let code = hold;
    let end = tail;
    let rend = -1;
    let ladder = false;

    if (other >= 0) {
      consumed[other] = true;
      let k = after[other];
      let bound2 = last;

      while (k >= 0 && k <= last) {
        const t = tokens[k];
        if (t.kind === 'comment') { k++; continue; }
        if (carries.includes(t.text)) { k = jump(k); continue; }
        if (t.text === ';' || t.text === ',' || closes.includes(t.text)) { bound2 = before[k]; break; }
        k++;
      }

      if ((box !== undefined && box.ladder) || falls(after[other], bound2)) {
        if (box !== undefined && box.top === false) {
          return no(after[other], 'a chain that declines cannot be a value here; bind it or keep the funnel');
        }

        const rest = linkBody(i, after[other], bound2, '', '', { top: true, ladder: true });
        if (typeof rest !== 'string') return rest;

        code = rest;
        end = bound2;
        rend = bound2;
        ladder = true;
      }
      else {
        const n = after[other];
        if (n < 0 || (tokens[n].text !== '=>' && mark(n, bound2) < 0)) {
          return no(other, 'a bare value answers nothing; answer with => or an exit');
        }

        const rest = linkBody(i, after[other], bound2, '', '', box);
        if (typeof rest !== 'string') return rest;

        code = rest;
        end = bound2;
        rend = bound2;
      }
    }

    if (bound !== '' && uses(answer, tail, bound) === 0) {
      if (rend >= 0 && uses(after[other], rend, bound) > 0) {
        return no(after[other], `the else branch runs on miss, where (${bound}) names nothing`);
      }
      return no(bindAt, `(${bound}) is never used; drop the binding`);
    }

    const ladderCode = subjName === '' ? `const ${sub} = ${subject}${lead}if (${test}) return ${yielded}; ${code}` : `${lead}if (${test}) return ${yielded}; ${code}`;
    out.code = ladder && (box === undefined || !box.ladder) ? `{ ${ladderCode} }` : (ladder ? ladderCode : subjName === '' ? `((${sub}) => ${test} ? ${yielded} : ${code})(${subject})` : `(${test} ? ${yielded} : ${code})`);
    out.end = end;
    out.start = start;
    return undefined;
  };

  const arrowing = (i: number, j: number, b: number, out: { end: number }) => {
    if (matcherTail(j)) {
      out.end = j;
      return undefined;
    }

    const n = after[j];
    if (n < 0 || n > b || tokens[n].text === '{') {
      out.end = j;
      return undefined;
    }

    const end = bodyEnd(j, b);
    out.end = end;

    if (!hoisted(n, end)) return undefined;

    const code = linkBody(i, n, end, '', '', { top: true, ladder: false });
    if (typeof code !== 'string') return code;

    edits.push({ from: tokens[n].from, to: tokens[end].to, text: code });
    dropped.push({ from: n, to: end });
    return undefined;
  };

  const hoist = (i: number, from: number, to: number) => {
    const anchor = tokens[i].from;

    const walk: (a: number, b: number, top: boolean) => undefined | Failure = (a, b, top) => {
      let j = a;

      while (j >= 0 && j <= b) {
        const t = tokens[j];

        if (t.kind === 'comment') { j++; continue; }

        if (t.text === '(' || t.text === '[') {
          const close = twin[j];
          if (close < 0) { j++; continue; }

          const bad = walk(j + 1, close - 1, false);
          if (bad !== undefined) return bad;

          j = close + 1;
          continue;
        }

        if (t.text === '{') {
          const f = holds[j];
          const close = twin[j];

          if (f >= 0 && frames[f].kind === 'object' && close >= 0) {
            const bad = walk(j + 1, close - 1, false);
            if (bad !== undefined) return bad;
          }

          j = close >= 0 ? close + 1 : j + 1;
          continue;
        }

        if (t.text === '=>' && keyword(tokens, before, j)) {
          const box = { end: j };
          const bad = arrowing(i, j, b, box);
          if (bad !== undefined) return bad;

          j = box.end + 1;
          continue;
        }

        if (!top && matcher[j] >= 0 && !consumed[j]) {
          if (elsewhere(j, a)) { j++; continue; }

          const next = { at: -1 };
          const bad = lift(i, j, anchor, a, next);
          if (bad !== undefined) return bad;

          j = next.at;
          continue;
        }

        j++;
      }

      return undefined;
    };

    return walk(from, to, true);
  };

  const lift = (i: number, at: number, anchor: number, floor: number, out: { at: number }) => {
    const delims = ['(', ',', '[', '=', ':', ';', '{', '}', 'return', 'ok', 'err'];

    let s = before[at];
    let depth = 0;
    let start = -1;

    while (s >= floor) {
      const t = tokens[s];
      if (t.kind === 'comment') { s = before[s]; continue; }
      if (closes.includes(t.text)) { depth++; s = before[s]; continue; }
      if (carries.includes(t.text)) {
        if (depth === 0) { start = after[s]; break; }
        depth--;
        s = before[s];
        continue;
      }
      if (depth === 0) {
        if (t.text === '=>') return no(at, 'a matcher needs a statement of its own; give the body braces');
        if (matcher[s] >= 0) return no(at, 'matchers do not nest; bind the inner value first');
        if (delims.includes(t.text) && (t.kind !== 'word' || keyword(tokens, before, s))) { start = after[s]; break; }
      }

      s = before[s];
    }

    if (start < 0) start = floor;

    const stop = before[at];
    if (start > stop) return no(at, 'a matcher tests a value');
    if (nested(start, stop)) return no(at, 'matchers do not nest; bind the inner value first');

    const subject = spell(start, stop, '', '');

    const name = temp(i);

    const tests: string[] = [];
    let tip = at;
    let cursor = at;
    let unwraps = false;
    let bindable = true;
    const conds: Array<{ from: number, to: number }> = [];
    const subjName = start === stop && start >= 0 && tokens[start].kind === 'word' && !reserved.includes(tokens[start].text) ? tokens[start].text : '';
    const subj = subjName === '' ? name : subjName;
    const lead = subjName === '' ? '; ' : '';

    while (cursor >= 0 && matcher[cursor] >= 0) {
      const tag = matcher[cursor];

      if (tokens[tag].text === '(') {
        const shut = twin[tag];
        if (shut < 0) return no(tag, 'a condition has no closing paren');
        if (after[tag] === shut) return no(tag, 'a condition tests something');
        if (subjName === '') return no(tag, '?(...) tests a name; bind the value first');
        if (nested(after[tag], before[shut])) return no(tag, 'matchers do not nest; bind the inner value first');
        conds.push({ from: after[tag], to: before[shut] });
        tests.push(`(${spell(after[tag], before[shut], subjName, subj)}) === true`);
        bindable = false;
        consumed[cursor] = true;
        tip = tag;
        cursor = after[shut];
        continue;
      }

      const word = tokens[tag].text;

if (tokens[tag].kind === 'number' || tokens[tag].kind === 'string' || word === '-' || word === '+' || word === 'true' || word === 'false') {
        tests.push(`${subj} === ${literal(cursor)}`);
        bindable = false;
        consumed[cursor] = true;
        tip = tag;
        cursor = after[mend(cursor)];
        continue;
      }

      tests.push(check(word, subj));
      if (!plain.includes(word)) unwraps = true;
      if (word === 'none') bindable = false;
      consumed[cursor] = true;
      tip = tag;
      cursor = after[tag];
    }

    const test = tests.join(' || ');
    const hold = kept(unwraps, subj);

    let bound = '';
    let bindAt = -1;

    if (cursor >= 0 && tokens[cursor].text === '(') {
      if (!bindable) {
        if (conds.length > 0) return no(cursor, '?(...) binds nothing; the subject is already named');
        return no(cursor, `?${tokens[tip].text} binds nothing; there is no value to name`);
      }

      const close = twin[cursor];
      if (close < 0) return no(tip, 'the binding has no closing paren');

      const inner = after[cursor];
      if (inner < 0 || inner >= close || tokens[inner].kind !== 'word') return no(tip, 'a decline binds a name, or nothing at all');
      if (after[inner] !== close) return no(tip, 'a decline binds a name, or nothing at all');

      bound = tokens[inner].text;
      if (reserved.includes(bound)) return no(inner, 'a binding names a value, not a keyword');
      bindAt = cursor;
      cursor = after[close];
    }

    for (const c of conds) if (bound !== '' && uses(c.from, c.to, bound) > 0) return no(c.from, 'a binding belongs to the tail; narrow the subject in the condition instead');

    const tails = ['return', 'ok', 'err', 'break', 'continue'];

    if (cursor < 0) return no(tip, 'a matcher needs a tail: an exit, =>, or a block');

    const tail = tokens[cursor].text;

    const flat = (from: number, to: number) => {
      if (nested(from, to)) return no(at, 'matchers do not nest; bind the inner value first');
      return undefined;
    };

    if (tails.includes(tail)) {
      let j = after[cursor];
      let end = -1;

      while (j < tokens.length) {
        const t = tokens[j];
        if (t.kind === 'comment') { j++; continue; }
        if (carries.includes(t.text)) { j = jump(j); continue; }
        if (t.text === ',' || t.text === ';' || closes.includes(t.text)) { end = before[j]; break; }
        j++;
      }

      if (end < 0 || end < after[cursor]) return no(cursor, `a ${tail} tail needs a value or nothing at all`);

      const bad = flat(after[cursor], end);
      if (bad !== undefined) return bad;

      if (bound !== '' && uses(after[cursor], end, bound) === 0) {
        return no(bindAt, `(${bound}) is never used; drop the binding`);
      }

      const message = after[cursor] > end ? '' : spell(after[cursor], end, bound, hold);
      const exit = tail === 'break' || tail === 'continue' ? `${tail}${message === '' ? '' : ` ${message}`}` : `${wraps[tail].open}${message}${wraps[tail].close}`;

      edits.push({ from: anchor, to: anchor, text: subjName === '' ? `const ${name} = ${subject}${lead}if (${test}) ${exit}; ` : `${lead}if (${test}) ${exit}; ` });
      edits.push({ from: tokens[start].from, to: tokens[end].to, text: hold });
      dropped.push({ from: start, to: end });

      out.at = end + 1;
      return undefined;
    }

    if (tail === '=>') {
      const arrow = cursor;
      const answer = after[arrow];
      if (answer < 0) return no(arrow, 'a fallback needs a value');

      const ahead = tokens[answer].text;
      if (tails.includes(ahead)) return no(answer, 'a => answers with a value; to decline, use an exit');
      if (ahead === 'async') return no(answer, 'async states a promise body, not a matcher tail');

      const ending = (j: number) => {
        while (j < tokens.length) {
          const t = tokens[j];
          if (t.kind === 'comment') { j++; continue; }
          if (carries.includes(t.text)) { j = jump(j); continue; }
          if (t.text === ',' || t.text === ';' || closes.includes(t.text)) return j;
          j++;
        }

        return -1;
      };

      if (tokens[answer].text === '{') {
        const close = twin[answer];
        if (close < 0) return no(answer, 'a fallback block has no closing brace');

        const bad = flat(answer, close);
        if (bad !== undefined) return bad;

        if (bound !== '' && uses(answer, close, bound) === 0) {
          return no(bindAt, `(${bound}) is never used; drop the binding`);
        }

        const opens = frames[holds[answer]].suspends ? 'await (async () => ' : '(() => ';
        const yielded = `${opens}${spell(answer, close, bound, hold)})()`;

        const k = after[close];
        if (k >= 0 && tokens[k].kind === 'word' && tokens[k].text === 'else' && keyword(tokens, before, k)) {
          consumed[k] = true;
          const inner = { from: -1, to: -1 };
          const r = chain(i, after[k], tokens.length - 1, inner);
          if (r !== undefined && typeof r !== 'string') return r;

          let code = '';
          let stop = close;

          if (typeof r === 'string') {
            code = r;
            const e = ending(inner.to + 1);
            stop = e >= 0 ? before[e] : inner.to;
          }
          else {
            const e = ending(after[k]);
            if (e < 0) return no(k, 'a fallback needs a semicolon');
            stop = before[e];
            if (uses(after[k], stop, bound) > 0 && bound !== '') {
              return no(after[k], `the else branch runs on miss, where (${bound}) names nothing`);
            }
            code = spell(after[k], stop, '', '');
          }

          edits.push({ from: anchor, to: anchor, text: subjName === '' ? `const ${name} = ${subject}; ` : '' });
          edits.push({ from: tokens[start].from, to: tokens[stop].to, text: `(${test} ? ${yielded} : ${code})` });
          dropped.push({ from: start, to: stop });

          out.at = stop + 1;
          return undefined;
        }

        const value = `(${test} ? ${yielded} : ${hold})`;

        edits.push({ from: anchor, to: anchor, text: subjName === '' ? `const ${name} = ${subject}; ` : '' });
        edits.push({ from: tokens[start].from, to: tokens[close].to, text: value });
        dropped.push({ from: start, to: close });

        out.at = close + 1;
        return undefined;
      }

      let j = answer;
      let end = -1;
      let other = -1;

      while (j < tokens.length) {
        const t = tokens[j];
        if (t.kind === 'comment') { j++; continue; }
        if (carries.includes(t.text)) { j = jump(j); continue; }
        if (t.kind === 'word' && t.text === 'else' && keyword(tokens, before, j)) { other = j; end = before[j]; break; }
        if (t.text === ',' || t.text === ';' || closes.includes(t.text)) { end = before[j]; break; }
        j++;
      }

      if (end < 0) return no(arrow, 'a fallback needs a semicolon');

      const bad = flat(answer, end);
      if (bad !== undefined) return bad;

      const vused = bound === '' || uses(answer, end, bound) > 0;
      if (!vused && other < 0) return no(bindAt, `(${bound}) is never used; drop the binding`);

      if (other >= 0) {
        consumed[other] = true;
        const eAfter = after[other];
        if (eAfter >= 0 && tokens[eAfter].kind === 'word' && ['return', 'ok', 'err', 'break', 'continue'].includes(tokens[eAfter].text) && keyword(tokens, before, eAfter)) {
          return no(other, 'a chain that declines cannot be a value here; bind it or keep the funnel');
        }
        if (falls(after[other], tokens.length - 1)) {
          return no(other, 'a chain that declines cannot be a value here; bind it or keep the funnel');
        }

        const inner = { from: -1, to: -1 };
        const r = chain(i, after[other], tokens.length - 1, inner);
        if (r !== undefined && typeof r !== 'string') return r;

        let code = '';
        let stop = end;

        if (typeof r === 'string') {
          code = r;
          if (!vused) return no(bindAt, `(${bound}) is never used; drop the binding`);
          const k = ending(inner.to + 1);
          stop = k >= 0 ? before[k] : inner.to;
          edits.push({ from: tokens[other].from, to: tokens[stop].to, text: '' });
        }
        else {
          const n = after[other];
          if (n >= 0 && tokens[n].text === '=>') {
            const answer = after[n];
            const k = ending(answer);
            if (k < 0) return no(other, 'a fallback needs a semicolon');
            stop = before[k];
            code = spell(answer, stop, '', '');
            edits.push({ from: tokens[other].from, to: tokens[stop].to, text: '' });
          }
          else {
            return no(other, 'a bare value answers nothing; answer with => or an exit');
          }

          if (bound !== '' && uses(answer, end, bound) === 0) {
            return no(bindAt, `(${bound}) is never used; drop the binding`);
          }
        }

        edits.push({ from: anchor, to: anchor, text: subjName === '' ? `const ${name} = ${subject}; ` : '' });
        edits.push({ from: tokens[start].from, to: tokens[end].to, text: `(${test} ? ${spell(answer, end, bound, hold)} : ${code})` });
        dropped.push({ from: start, to: stop });

        out.at = stop + 1;
        return undefined;
      }

      if (!vused) return no(bindAt, `(${bound}) is never used; drop the binding`);

      edits.push({ from: anchor, to: anchor, text: subjName === '' ? `const ${name} = ${subject}; ` : '' });
      edits.push({ from: tokens[start].from, to: tokens[end].to, text: `(${test} ? ${spell(answer, end, bound, hold)} : ${hold})` });
      dropped.push({ from: start, to: end });

      out.at = end + 1;
      return undefined;
    }

    if (tail === '{') {
      const open = cursor;
      const close = twin[open];
      if (close < 0) return no(open, 'a tail block has no closing brace');

      const bad = flat(open, close);
      if (bad !== undefined) return bad;

      if (bound !== '' && uses(open, close, bound) === 0) {
        return no(bindAt, `(${bound}) is never used; drop the binding`);
      }

      const binds = bound === '' ? '' : ` const ${bound} = ${hold};`;
      edits.push({ from: anchor, to: anchor, text: subjName === '' ? `const ${name} = ${subject}${lead}if (${test}) {${binds}${spell(after[open], close, bound, hold)}; ` : `${lead}if (${test}) {${binds}${spell(after[open], close, bound, hold)}; ` });
      edits.push({ from: tokens[start].from, to: tokens[close].to, text: hold });
      dropped.push({ from: start, to: close });

      out.at = close + 1;
      return undefined;
    }

    if (tail === 'async') return no(cursor, 'async states a promise body, not a matcher tail');
    if (tail === 'else') return no(cursor, 'else chains a => answer; juxtapose blocks');
    if (tail === ':') return no(cursor, '?: is refused; answer with ?true => ... else ...');
    if (tail === ';' || tail === ',' || closes.includes(tail)) return no(cursor, 'a matcher needs a tail: an exit, =>, or a block');

    return no(cursor, 'a => answers with a value; to decline, use an exit');
  };

  const exit = (i: number) => {
    if (loose(i)) return no(i, 'a file has no body to leave; wrap it in an arrow');

    const t = tokens[i];
    const land = wraps[t.text];
    const kind = frames[body[i]].kind;

    const held = kind === 'match' ? 'a match arm' : 'a fallback';
    if (kind === 'match' || kind === 'iife') return no(i, `${t.text} would leave the iife rather than the function; ${held} answers with return`);

    const n = after[i];

    if (n < 0 || tokens[n].text === ';') {
      edits.push({ from: t.from, to: t.to, text: `${land.open}${land.close}` });
      return;
    }

    const last = ends(i);
    if (tokens[last].text !== ';') return no(i, `${t.text} needs a semicolon`);

    const cut = tokens[n].line === t.line ? tokens[n].from : t.to;
    edits.push({ from: t.from, to: cut, text: land.open });
    edits.push({ from: tokens[last].from, to: tokens[last].from, text: land.close });
  };

  const openers = ['(', ',', '[', '=', '=>', ':', 'return', 'ok', 'err'];

  const construct = (i: number, arms: boolean) => {
    const p = before[i];
    if (p < 0 || !openers.includes(tokens[p].text)) return undefined;

    const tag = after[i];
    if (tag < 0 || tokens[tag].kind !== 'word') return undefined;
    if (!arms && frames[owner[i]].kind === 'match') return undefined;

    if (!arms) {
      const own = owner[i];
      const o = own >= 0 ? frames[own].open : -1;
      const qq = o >= 0 ? before[o] : -1;
      if (o >= 0 && (frames[own].kind === 'block' || frames[own].kind === 'object') && qq >= 0 && tokens[qq].text === '?' && matcher[qq] < 0) return undefined;
    }

    const word = tokens[tag].text;
    const n = after[tag];

    if (n >= 0 && tokens[n].text === '(') {
      const close = twin[n];
      if (close < 0) return no(n, 'a :tag value has no closing paren');
      if (after[n] === close) return no(n, 'a :tag carries one value or nothing at all');

      const comma = find(after[n], close - 1, [',']);
      if (comma >= 0) return no(comma, 'a branch carries one value');

      edits.push({ from: tokens[i].from, to: tokens[n].to, text: `branch('${word}', ` });
      return undefined;
    }

    edits.push({ from: tokens[i].from, to: tokens[tag].to, text: `branch('${word}')` });
    return undefined;
  };

  const formed: boolean[] = [];

  const forming = (i: number) => {
    const name = after[i];
    if (name < 0 || tokens[name].kind !== 'word') return undefined;

    const g = after[name];
    if (g < 0) return no(i, 'a form declares a block after its name');
    if (tokens[g].text === '<') return no(g, 'a form takes no generics; declare them where the form is used');
    if (tokens[g].text !== '{') return no(i, 'a form declares a block after its name');

    const end = twin[g];
    if (end < 0) return no(i, 'a form has no closing brace');

    formed[holds[g]] = true;

    const head = before[i];
    const exported = head >= 0 && tokens[head].text === 'export';
    const at = exported ? head : i;
    const word = tokens[name].text;
    const typeName = word[0].toUpperCase() + word.slice(1);

    edits.push({ from: tokens[at].from, to: tokens[g].from, text: `${exported ? 'export const' : 'const'} ${word} = ` });
    edits.push({ from: tokens[end].to, to: tokens[end].to, text: `; ${exported ? 'export type' : 'type'} ${typeName}Form = form.Encoded<typeof ${word}>; ${exported ? 'export type' : 'type'} ${typeName} = form.Decoded<typeof ${word}>;` });

    let j = after[g];

    while (j >= 0 && j < end) {
      if (tokens[j].kind === 'comment') { j = after[j]; continue; }

      const comma = find(j, end - 1, [',', ';']);
      const stop = comma >= 0 ? before[comma] : before[end];

      if (tokens[j].kind !== 'word') return no(j, 'a field names a key');

      const colon = after[j];
      if (colon < 0 || tokens[colon].text !== ':') return no(j, 'a field is key: guard, key: triple, or key: triple as name');

      const rest = after[colon];
      if (rest < 0 || rest > stop) return no(j, 'a field needs a guard or a triple after its key');

      const bad = calling(rest, stop, -1);
      if (bad !== undefined) return bad;

      const first = tokens[rest].text;
      const dot = after[rest];
      const member = dot >= 0 && tokens[dot].text === '.' ? after[dot] : -1;
      const paren = member >= 0 && tokens[member].kind === 'word' ? after[member] : -1;

      if (first === 'form' && dot >= 0 && member >= 0 && paren >= 0 && tokens[paren].text === '(') {
        j = comma >= 0 ? after[comma] : end;
        continue;
      }

      if (first === '{') {
        const shut = twin[rest];
        if (shut < 0 || shut > stop) return no(rest, 'a field block has no closing brace');

        const renaming = after[shut];
        if (renaming >= 0 && tokens[renaming].kind === 'word' && tokens[renaming].text === 'as' && keyword(tokens, before, renaming)) {
          const renamed = after[renaming];
          if (renamed < 0 || renamed > stop || tokens[renamed].kind !== 'word') return no(renaming, 'as renames with a key');

          const tail = after[renamed];
          if (tail >= 0 && tail <= stop) return no(tail, 'a field ends with its rename');

          edits.push({ from: tokens[rest].from, to: tokens[rest].from, text: 'form.as(' });
          edits.push({ from: tokens[shut].to, to: tokens[shut].to, text: `, '${tokens[renamed].text}')` });
          edits.push({ from: tokens[shut].to, to: tokens[renamed].to, text: '' });
        }
        else {
          const tail = after[shut];
          if (tail >= 0 && tail <= stop) return no(tail, 'a field ends with its block');
        }

        j = comma >= 0 ? after[comma] : end;
        continue;
      }

      let k = rest;

      while (k >= 0 && k <= stop) {
        const t = tokens[k];
        if (t.kind === 'comment') { k++; continue; }
        if (carries.includes(t.text)) { k = jump(k); continue; }
        if (t.text === '=>') return no(k, '=> is retired in forms; write the triple and rename it with as');
        k++;
      }

      edits.push({ from: tokens[rest].from, to: tokens[rest].from, text: 'form.plain(' });
      edits.push({ from: tokens[stop].to, to: tokens[stop].to, text: ')' });

      j = comma >= 0 ? after[comma] : end;
    }

    return undefined;
  };

  const within = (from: number, to: number) => {
    const heads = ['scope', 'protocol', 'form'];

    for (const word of heads) {
      let idx = find(from, to, [word]);

      while (idx >= 0) {
        if (keyword(tokens, before, idx)) {
          const n = after[idx];

          if (word === 'form' && n >= 0 && tokens[n].kind === 'word') return true;
          if (word === 'protocol' && n >= 0 && (tokens[n].kind === 'word' || tokens[n].text === '<')) return true;

          if (word === 'scope' && n >= 0 && tokens[n].text === '(' && twin[n] >= 0) {
            if (after[twin[n]] >= 0 && tokens[after[twin[n]]].text === '=>') return true;
          }
        }

        idx = after[idx] >= 0 ? find(after[idx], to, [word]) : -1;
      }
    }

    return false;
  };

  const statement = (i: number) => {
    const t = tokens[i];

    if (t.text === 'import') return undefined;
    if (formed[owner[i]]) return undefined;

    const f = owner[i];
    if (f > 0) {
      const open = frames[f].open;
      const head = open >= 0 ? before[open] : -1;
      if (head >= 0 && (tokens[head].text === 'import' || tokens[head].text === 'export')) return undefined;
    }

    for (const span of dropped) {
      if (i >= span.from && i <= span.to) return undefined;
    }

    let init = i;
    let land: Landing | undefined = undefined;

    if (t.text === 'const' || t.text === 'let') {
      const last = ends(i);
      const eq = find(after[i], last, ['=']);
      if (eq < 0) return undefined;

      init = after[eq];
      if (init < 0) return undefined;

      const binder = source.slice(tokens[after[i]].from, tokens[before[eq]].to);
      land = { open: `${t.text} ${binder} = `, close: '' };
    }
    else if (wraps[t.text] !== undefined) {
      init = after[i];
      if (init < 0) return exit(i);

      land = wraps[t.text];
    }
    else if (t.text === 'void') {
      const n = after[i];
      if (n >= 0 && tokens[n].kind === 'word' && tokens[n].text === 'try' && keyword(tokens, before, n)) {
        init = n;
        land = { open: 'void ', close: '' };
      }
    }

    const last = ends(init);

    if (land === undefined) {
      let atCall = -1;
      let what = 'call';

      if (tokens[init].kind === 'word' && tokens[init].text === 'call' && keyword(tokens, before, init)) atCall = init;
      else if (tokens[init].kind === 'word' && tokens[init].text === 'make' && keyword(tokens, before, init)) { atCall = init; what = 'make'; }
      else if (tokens[init].kind === 'word' && tokens[init].text === 'await' && keyword(tokens, before, init)) {
        const m = after[init];
        if (m >= 0 && tokens[m].kind === 'word' && tokens[m].text === 'call' && keyword(tokens, before, m)) atCall = m;
        else if (m >= 0 && tokens[m].kind === 'word' && tokens[m].text === 'make' && keyword(tokens, before, m)) { atCall = m; what = 'make'; }
      }

      if (atCall >= 0) return no(atCall, `a ${what} answers; capture it with try or bind it`);
    }

    let skip = -1;

    if (tokens[init].text === 'try' && keyword(tokens, before, init)) {
      let n = after[init];
      if (n >= 0 && tokens[n].kind === 'word' && tokens[n].text === 'await' && keyword(tokens, before, n)) n = after[n];
      if (n >= 0 && tokens[n].kind === 'word' && (tokens[n].text === 'call' || tokens[n].text === 'make') && keyword(tokens, before, n)) skip = n;
    }

    const called = calling(init, last, skip);
    if (called !== undefined) return called;

    const lifted = hoist(i, init, last);
    if (lifted !== undefined) return lifted;

    if (tokens[init].text === 'try' && keyword(tokens, before, init)) return propagate(i, init, land);

    const exhaustive = (i: number, init: number, last: number, land?: Landing) => {
      let q = -1;
      for (let j = init; j >= 0 && j <= last; j++) {
        const t = tokens[j];
        if (t.kind === 'comment') continue;
        if (t.text === '?' && matcher[j] < 0 && !consumed[j]) {
          const n = after[j];
          if (n >= 0 && tokens[n].text === '{') { q = j; break; }
        }
        if (t.text === '{') break;
      }
      if (q < 0) return undefined;

      const stop = before[q];
      if (stop < 0) return undefined;

      const open = after[q];
      const close = twin[open];
      if (close < 0) return no(open, 'a ? {} block has no closing brace');
      if (nested(init, stop)) return no(q, 'matchers do not nest; bind the inner value first');

      const subjectStart = subjStart(stop, init);
      const whole = subjectStart !== init && before[subjectStart] >= 0 && tokens[before[subjectStart]].text === '=>';
      const mode: 'statement' | 'captured' | 'body' | 'nested' = subjectStart === init
        ? (land !== undefined ? 'captured' : 'statement')
        : (whole ? 'body' : 'nested');

      const arms: Array<{ start: number, end: number }> = [];
      for (let j = after[open]; j >= 0 && j < close;) {
        const comma = find(j, close - 1, [',', ';']);
        if (comma < 0) { arms.push({ start: j, end: close }); break; }
        arms.push({ start: j, end: comma });
        j = after[comma];
      }
      if (arms.length === 0) return no(open, 'a ? {} block names at least one branch');

      if (mode !== 'statement') {
        const quick = arms.some((arm) => {
          for (let j = arm.start; j >= 0 && j < arm.end; j++) {
            const u = tokens[j];
            if (u.kind === 'comment') continue;
            if (u.text === ':' && j === arm.start) { j = after[j]; continue; }
            if (u.text === '{' || u.text === '?') return true;
            if (carries.includes(u.text)) { j = jump(j) - 1; continue; }
            if (u.kind === 'word' && (u.text === 'return' || u.text === 'ok' || u.text === 'err' || u.text === 'break' || u.text === 'continue') && keyword(tokens, before, j)) return true;
          }
          return false;
        });
        if (!quick) return undefined;
      }

      const subject = spell(subjectStart, stop, '', '');
      const name = temp(i);
      const subjName = subjectStart === stop && tokens[subjectStart].kind === 'word' && !reserved.includes(tokens[subjectStart].text) ? tokens[subjectStart].text : '';
      const subj = subjName === '' ? name : subjName;
      const held = kept(true, subj);
      const captured = mode === 'captured';
      const letTemp = captured && (tokens[i].text === 'const' || tokens[i].text === 'let');
      const t2 = temp(i);

      type Arm = {
        start: number, end: number,
        kind: 'branch' | 'cond' | 'presence' | 'value' | 'wild',
        matcher: boolean,
        tags: string[],
        expr: string,
        value: string,
        bind: string,
        bindAt: number,
        tailAt: number,
        tail: '=>' | 'exit' | '{' | 'expr',
        exit: string,
        declines: boolean;
      };

      const parsed: Arm[] = [];

      for (const arm of arms) {
        let k = arm.start;
        const info: Arm = {
          start: arm.start, end: arm.end, kind: 'value', matcher: false,
          tags: [], expr: '', value: '', bind: '', bindAt: -1, tailAt: -1,
          tail: 'expr', exit: '', declines: false
        };

        if (tokens[k].text === ':') {
          const tag = after[k];
          if (tag < 0 || tag >= close || tokens[tag].kind !== 'word') return no(k, 'a ? {} arm names a literal, true, false, none, some, or :tag');
          info.kind = 'branch';
          info.tags = [tokens[tag].text];
          info.expr = `${subj}.branch === '${tokens[tag].text}'`;
          info.value = tokens[tag].text;
          k = after[tag];
        }
        else if (tokens[k].text === '?' && after[k] >= 0 && tokens[after[k]].text === ':' && after[after[k]] >= 0 && tokens[after[after[k]]].kind === 'word') {
          info.kind = 'branch';
          info.matcher = true;
          info.declines = true;
          const ors: string[] = [];
          while (k >= 0 && k < close && tokens[k].text === '?' && after[k] >= 0 && tokens[after[k]].text === ':' && after[after[k]] >= 0 && tokens[after[after[k]]].kind === 'word') {
            const w = after[after[k]];
            info.tags.push(tokens[w].text);
            ors.push(`${subj}.branch === '${tokens[w].text}'`);
            k = after[w];
          }
          info.expr = ors.join(' || ');
          info.value = info.tags.join(',');
        }
        else if (tokens[k].kind === 'word' && (tokens[k].text === 'none' || tokens[k].text === 'some')) {
          info.kind = 'presence';
          info.expr = `is.${tokens[k].text}(${subj})`;
          info.value = tokens[k].text;
          if (tokens[k].text !== 'some') info.declines = true;
          k = after[k];
        }
        else if (tokens[k].text === '(') {
          const shut = twin[k];
          if (shut < 0 || shut >= close) return no(k, 'a condition has no closing paren');
          if (after[k] === shut) return no(k, 'a condition tests something');
          if (nested(after[k], before[shut])) return no(k, 'matchers do not nest; bind the inner value first');
          info.kind = 'cond';
          info.expr = spell(after[k], before[shut], subjName, subj);
          k = after[shut];
        }
        else if (tokens[k].kind === 'number' || tokens[k].kind === 'string' || tokens[k].kind === 'template' || (tokens[k].kind === 'word' && (tokens[k].text === 'true' || tokens[k].text === 'false')) || ((tokens[k].text === '-' || tokens[k].text === '+') && after[k] >= 0 && after[k] < close && tokens[after[k]].kind === 'number')) {
          const end = (tokens[k].text === '-' || tokens[k].text === '+') ? after[k] : k;
          info.kind = 'value';
          info.value = source.slice(tokens[k].from, tokens[end].to);
          info.expr = `${subj} === ${info.value}`;
          k = after[end];
        }
        else if (tokens[k].kind === 'word' && tokens[k].text === '_') {
          info.kind = 'wild';
          k = after[k];
        }
        else if (tokens[k].kind === 'word' && tokens[k].text === 'else') {
          return no(k, 'else belongs in a ?true ... else ... statement, not in ? {}');
        }
        else {
          let m = k;
          let found = -1;
          while (m >= 0 && m < arm.end) {
            const u = tokens[m];
            if (u.kind === 'comment') { m++; continue; }
            if (carries.includes(u.text)) { m = jump(m); continue; }
            if (u.text === '=>' || u.text === '{' || u.text === ';' || u.text === ',') { found = m; break; }
            if (u.kind === 'word' && ['return', 'ok', 'err', 'break', 'continue'].includes(u.text) && keyword(tokens, before, m)) { found = m; break; }
            m++;
          }
          if (found < 0) return no(k, 'a ? {} arm needs an expression, a block, or an exit');
          const val = spell(k, before[found], '', '');
          info.kind = 'value';
          info.value = val;
          info.expr = `${subj} === ${val}`;
          k = found;
        }

        if (k >= 0 && k < close && tokens[k].text === '(') {
          if (info.kind === 'presence' && info.value !== 'some') return no(k, '?none binds nothing; absence carries no value');
          if (info.kind !== 'branch' && info.kind !== 'presence' && info.kind !== 'wild') return no(k, 'a ? {} arm binds nothing; there is no value to name');
          const shut = twin[k];
          if (shut < 0) return no(k, 'the binding has no closing paren');
          const inner = after[k];
          if (inner < 0 || inner >= shut || tokens[inner].kind !== 'word') return no(k, 'a ? {} arm binds a name, or nothing at all');
          if (after[inner] !== shut) return no(k, 'a ? {} arm binds a name, or nothing at all');
          info.bind = tokens[inner].text;
          if (reserved.includes(info.bind)) return no(inner, 'a binding names a value, not a keyword');
          info.bindAt = k;
          k = after[shut];
        }

        if (k < 0 || k >= close) return no(arm.start, 'a ? {} arm needs an expression, a block, or an exit');
        info.tailAt = k;

        const tailTok = tokens[k];
        if (tailTok.text === '=>') info.tail = '=>';
        else if (tailTok.kind === 'word' && ['return', 'ok', 'err', 'break', 'continue'].includes(tailTok.text) && keyword(tokens, before, k)) {
          info.tail = 'exit';
          info.exit = tailTok.text;
          info.declines = true;
        }
        else if (tailTok.text === '{') {
          info.tail = '{';
          const bclose = twin[k];
          if (bclose < 0 || bclose >= close) return no(k, 'a ? {} arm block has no closing brace');
          info.declines = leaves(frames[holds[k]].last);
        }
        else {
          info.tail = 'expr';
        }

        if (info.tail === '{' || info.tail === 'expr') {
          if (info.bind !== '' && uses(k, info.end, info.bind) === 0) {
            return no(info.bindAt, `(${info.bind}) is never used; drop the binding`);
          }
        }
        else if (info.tail === 'exit' && info.bind !== '' && uses(after[k], info.end, info.bind) === 0) {
          return no(info.bindAt, `(${info.bind}) is never used; drop the binding`);
        }
        else if (info.tail === '=>' && info.bind !== '' && uses(k, info.end, info.bind) === 0) {
          return no(info.bindAt, `(${info.bind}) is never used; drop the binding`);
        }

        parsed.push(info);
      }

      let hasBranch = false;
      let hasCond = false;
      let hasDecline = false;
      for (const info of parsed) {
        if (info.kind === 'branch') hasBranch = true;
        if (info.kind === 'cond' || info.kind === 'presence') hasCond = true;
        if (info.declines) hasDecline = true;
      }
      if (hasBranch && parsed.some((a) => a.kind === 'value')) return no(parsed.find((a) => a.kind === 'value')!.start, 'a ? {} reads branches or reads values, never both');
      if (hasBranch && parsed.some((a) => a.kind === 'presence')) return no(parsed.find((a) => a.kind === 'presence')!.start, 'a ? {} reads branches or reads values, never both');

      for (const info of parsed) {
        if (info.matcher && info.tail !== 'exit' && !(info.tail === '{' && info.declines)) {
          return no(info.tailAt, 'a matcher arm declines; matched branches leave');
        }
        if (info.tail === '=>' && mode === 'statement') return no(info.tailAt, 'an expression must always be captured; a ? {} arm runs an expression or a block');
        if (info.kind === 'presence' && mode !== 'statement') return no(info.start, 'none and some test presence; use a ?none matcher or a statement ? {}');
        if (mode === 'statement' && info.kind === 'wild') return no(info.start, 'a ? {} block names every branch; _ answers a captured one');
        if (mode !== 'statement' && info.tail !== '=>' && !info.declines) return no(info.tailAt, 'a ? {} arm answers with a value or declines');
      }

      if (mode !== 'statement' && !hasDecline) return undefined;

      const switchOn = hasCond ? 'true' : hasBranch ? `${subj}.branch` : subj;
      consumed[q] = true;

      if (mode === 'nested') {
        const guards: string[] = [];
        const answers: Arm[] = [];
        for (const info of parsed) {
          const hold = hasBranch ? held : subj;
          if (info.declines) {
            const armEnd = info.end < close ? before[info.end] : before[close];
            const payload = after[info.tailAt];
            const msg = payload > armEnd ? '' : spell(payload, armEnd, info.bind, hold);
            const exitCode = info.exit === 'break' || info.exit === 'continue'
              ? `${info.exit}${msg === '' ? '' : ` ${msg}`};`
              : info.exit === 'return' && msg === '' ? 'return;'
              : `${wraps[info.exit].open}${msg}${wraps[info.exit].close};`;
            guards.push(`if (${info.expr}) ${exitCode} `);
          }
          else {
            answers.push(info);
          }
        }
        let value: string;
        if (answers.length === 0) {
          value = hasBranch ? held : subj;
        }
        else if (answers.length === 1) {
          const a = answers[0];
          const hold = hasBranch ? held : subj;
          const armEnd = a.end < close ? before[a.end] : before[close];
          value = spell(after[a.tailAt], armEnd, a.bind, hold);
        }
        else {
          const parts: string[] = [];
          let base = '';
          for (const a of answers) {
            const hold = hasBranch ? held : subj;
            const armEnd = a.end < close ? before[a.end] : before[close];
            if (a.kind === 'wild') { base = spell(after[a.tailAt], armEnd, a.bind, hold); continue; }
            parts.push(`(${a.expr} ? ${spell(after[a.tailAt], armEnd, a.bind, hold)} : `);
          }
          value = parts.join('') + base + ')'.repeat(parts.length);
        }
        edits.push({ from: tokens[i].from, to: tokens[i].from, text: guards.join('') });
        edits.push({ from: tokens[subjectStart].from, to: tokens[close].to, text: value });
        dropped.push({ from: subjectStart, to: close });
        return undefined;
      }
      edits.push({
        from: mode === 'body' ? tokens[subjectStart].from : tokens[i].from, to: tokens[open].to,
        text: mode === 'body'
          ? `{ ${subjName === '' ? `const ${name} = ${subject}; ` : ''}switch (${switchOn}) {`
          : captured
            ? letTemp
              ? `let ${t2}; ${subjName === '' ? `const ${name} = ${subject}; ` : ''}switch (${switchOn}) {`
              : `${subjName === '' ? `const ${name} = ${subject}; ` : ''}switch (${switchOn}) {`
            : `${subjName === '' ? `const ${name} = ${subject}; ` : ''}switch (${switchOn}) {`
      });
      dropped.push({ from: subjectStart === init ? init : subjectStart, to: stop });

      if (mode === 'body') {
        const semi = find(close, last, [';']);
        edits.push({ from: tokens[close].to, to: semi >= 0 ? tokens[semi].from : tokens[close].to, text: ' }' });
      }
      else if (captured && letTemp) {
        const semi = find(close, last, [';']);
        edits.push({ from: tokens[close].to, to: semi >= 0 ? tokens[semi].from : tokens[close].to, text: ` ${land!.open}${t2}${land!.close}` });
      }
      else if (captured && !letTemp) {
        const semi = find(close, last, [';']);
        if (semi >= 0) edits.push({ from: tokens[semi].from, to: tokens[semi].to, text: '' });
      }

      const caseLabel = (info: Arm) => {
        if (info.kind === 'wild') return 'default: ';
        if (hasCond) return `case (${info.expr}): `;
        if (hasBranch) return info.tags.map((t) => `case '${t}':`).join(' ') + ' ';
        return `case ${info.value}: `;
      };

      for (const info of parsed) {
        const label = caseLabel(info);
        const hold = hasBranch ? held : subj;
        const armTo = info.end < close ? tokens[info.end].to : tokens[close].from;
        const armEnd = info.end < close ? before[info.end] : before[close];

        if (info.tail === '=>') {
          const a = after[info.tailAt];
          if (a >= 0 && a < info.end && tokens[a].kind === 'word' && ['return', 'ok', 'err', 'break', 'continue', 'async'].includes(tokens[a].text) && keyword(tokens, before, a)) {
            return no(a, 'a => answers with a value; to decline, use an exit');
          }
          if (a >= 0 && a < info.end && tokens[a].text === '{') {
            const bclose = twin[a];
            for (let s = after[a]; s >= 0 && s < bclose; s = after[s]) {
              const u = tokens[s];
              if (u.kind === 'comment') continue;
              if (u.kind !== 'word' || !starts[s] || !keyword(tokens, before, s)) continue;
              if (u.text === 'ok' || u.text === 'err' || u.text === 'async') return no(s, 'a ? {} arm answers with a value; hoist the exit out');
            }
            const opens = frames[holds[a]].suspends ? 'await (async () => ' : '(() => ';
            const iife = `${opens}${spell(a, bclose, info.bind, hold)})()`;
            edits.push({ from: tokens[info.start].from, to: armTo, text: letTemp ? `${label}${t2} = ${iife}; break;` : `${label}return ${iife};` });
          }
          else {
            const value = spell(a, armEnd, info.bind, hold);
            edits.push({ from: tokens[info.start].from, to: armTo, text: letTemp ? `${label}${t2} = ${value}; break;` : `${label}return ${value};` });
          }
          continue;
        }

        if (info.tail === 'exit') {
          const payload = after[info.tailAt];
          const msg = payload > armEnd ? '' : spell(payload, armEnd, info.bind, hold);
          const exitCode = info.exit === 'break' || info.exit === 'continue'
            ? `${info.exit}${msg === '' ? '' : ` ${msg}`};`
            : info.exit === 'return' && msg === '' ? 'return;'
            : `${wraps[info.exit].open}${msg}${wraps[info.exit].close};`;
          edits.push({ from: tokens[info.start].from, to: armTo, text: `${label}${exitCode}` });
          continue;
        }

        if (info.tail === '{') {
          const bclose = twin[info.tailAt];
          edits.push({ from: tokens[info.start].from, to: tokens[info.tailAt].from, text: label });
          if (info.bind !== '') edits.push({ from: tokens[info.tailAt].to, to: tokens[info.tailAt].to, text: ` const ${info.bind} = ${hold};` });
          if (!info.declines) {
            if (info.end < close) edits.push({ from: tokens[info.end].from, to: tokens[info.end].to, text: ' break;' });
            else edits.push({ from: tokens[bclose].to, to: tokens[bclose].to, text: ' break;' });
          }
          continue;
        }

        edits.push({ from: tokens[info.start].from, to: armTo, text: `${label}${spell(info.tailAt, armEnd, info.bind, hold)}; break;` });
      }

      return undefined;
    };

    const whole = exhaustive(i, init, last, land);
    if (whole !== undefined) return whole;

    if (!within(init, last)) {
      const at = mark(init, last);
      if (at >= 0) return declining(i, init, at, last, land);
    }

    if (wraps[t.text] !== undefined && t.text !== 'return') return exit(i);

    return undefined;
  };

  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    if (t.kind === 'comment') continue;

    if (t.kind === 'punct') {
      if (t.text === '==') edits.push({ from: t.from, to: t.to, text: '===' });
      if (t.text === '!=') edits.push({ from: t.from, to: t.to, text: '!==' });

      if (t.text === ':') {
        const bad = construct(i, false);
        if (bad !== undefined) return bad;
      }

      if (t.text === '?' && matcher[i] < 0 && !consumed[i] && after[i] >= 0 && tokens[after[i]].text === '{') {
        const bad = questioning(i);
        if (bad !== undefined) return bad;
      }

      continue;
    }

    if (sealed[i]) continue;

    if (t.kind !== 'word' || !keyword(tokens, before, i)) continue;

    if (t.text === 'else' && !consumed[i]) return no(i, 'else after an if statement is refused; the funnel is the flow');

    if (t.text === 'if' && !starts[i]) {
      const bad = conditional(i);
      if (bad !== undefined) return bad;

      continue;
    }

    if (t.text === 'scope' && after[i] >= 0 && tokens[after[i]].text === '(' && twin[after[i]] >= 0 && after[twin[after[i]]] >= 0 && tokens[after[twin[after[i]]]].text === '=>' && after[after[twin[after[i]]]] >= 0 && tokens[after[after[twin[after[i]]]]].text === '{') {
      if (starts[i] && frames[owner[i]].kind !== 'object') return no(i, 'a scope hands back its exit; bind it');

      const bad = scoping(i);
      if (bad !== undefined) return bad;

      continue;
    }

    if (t.text === 'protocol' && after[i] >= 0 && (tokens[after[i]].kind === 'word' || tokens[after[i]].text === '<')) {
      const bad = protocoling(i);
      if (bad !== undefined) return bad;

      continue;
    }

    if (t.text === 'form' && after[i] >= 0 && tokens[after[i]].kind === 'word') {
      const bad = forming(i);
      if (bad !== undefined) return bad;

      continue;
    }

    if (!starts[i]) continue;
    if (frames[owner[i]].kind === 'object') continue;

    const bad = statement(i);
    if (bad !== undefined) return bad;
  }

  for (let i = 0; i < tokens.length; i++) {
    if (matcher[i] >= 0 && !consumed[i]) {
      return no(i, 'a matcher tests one value in a statement; bind it before the match or give the body braces');
    }
  }

  for (let f = 1; f < frames.length; f++) {
    const frame = frames[f];
    if (frame.kind !== 'body') continue;

    if (frame.fallible && frame.answers) return no(frame.open, 'a body answers with one of return, ok and err, or async; this one mixes them');
    if (frame.promises && (frame.fallible || frame.answers)) return no(frame.open, 'a body answers with one of return, ok and err, or async; this one mixes them');
    if (frame.promises && frame.suspends) return no(frame.open, 'a body that awaits is a promise already; async x is for one that does not');

    if (frame.suspends && !scoped[f]) {
      const at = head(frame.open);
      if (at >= 0) edits.push({ from: at, to: at, text: 'async ' });
    }

    if (frame.fallible && !leaves(frame.last) && frame.close >= 0) {
      edits.push({ from: tokens[frame.close].from, to: tokens[frame.close].from, text: 'return result.ok(); ' });
    }
  }

  return result.ok(edits);
};

/** the typescript a tz source emits, one line for one line */
export const emit = (source: string) => {
  const lexed = lex(source);
  if (lexed.branch === 'err') return lexed;

  const read = scan(lexed.value);

  const banned = ban(lexed.value, read);
  if (banned.branch === 'err') return banned;

  const written = rewrite(source, lexed.value, read);
  if (written.branch === 'err') return written;

  return result.ok(apply(source, written.value));
};
